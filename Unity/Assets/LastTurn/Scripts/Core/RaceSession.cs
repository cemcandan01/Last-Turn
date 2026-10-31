#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace LastTurn.Core
{
  // TS 0.8.18 yarış tanımları (src/oyun/yarislar.ts TYP/EVENTS) export-race-session.mjs ile race-events.json'a aktarılır.
  public sealed class RaceTypeInfo
  {
    public string Type = "", RecordKey = "", Preset = "", Name = "", Description = ""; public int Laps; public double ReferenceSpeed;
  }

  public sealed class RaceEventInfo
  {
    public int Index, Level, Difficulty, Region, Laps;
    public string Key = "", Type = "", Name = "", Description = "", Preset = "";
    public double Limit, StartX, StartZ, StartHeading;
    public double[] Stars = Array.Empty<double>();
  }

  public sealed class RaceEventCatalog
  {
    public readonly IReadOnlyDictionary<string, RaceTypeInfo> Types;
    public readonly RaceEventInfo[] Events;
    public RaceEventCatalog(string json)
    {
      var d = CatalogNode.Parse(json);
      if (d["baseline"].S() != TrackCatalog.Baseline) throw new FormatException("Yarış kataloğu farklı TS kaynağından.");
      Types = d["types"].Fields.ToDictionary(p => p.Key, p => new RaceTypeInfo
      {
        Type = p.Key, RecordKey = p.Value["k"].S(), Preset = p.Value["pk"].S(), Laps = (int)p.Value["laps"].N(), ReferenceSpeed = p.Value["v"].N(),
        Name = p.Value["n"].S(), Description = p.Value["d"].S(),
      }, StringComparer.Ordinal);
      Events = d["events"].Items.Select((e, i) =>
      {
        if ((int)e["i"].N(-1) != i) throw new FormatException("Etkinlik sırası bozuk.");
        return new RaceEventInfo
        {
          Index = i, Key = e["k"].S(), Type = e["ty"].S(), Level = (int)e["lv"].N(), Difficulty = (int)e["sev"].N(), Name = e["n"].S(), Description = e["d"].S(),
          Region = (int)e["reg"].N(), Preset = e["pk"].S(), Laps = (int)e["laps"].N(), Limit = e["limit"].N(),
          Stars = e["ys"].Items.Select(x => x.N()).ToArray(), StartX = e["g"][0].N(), StartZ = e["g"][1].N(), StartHeading = e["g"][2].N(),
        };
      }).ToArray();
    }
    public RaceEventInfo Find(string type, int level) => Events.First(e => e.Type == type && e.Level == level);
  }

  public enum RaceState { Countdown, Running, Finished }

  public enum RaceNoteKind { Start, Cut, Returned, ComboBurned, Multiplier, Banked, X6, Lap }

  public readonly struct RaceNote
  {
    public readonly RaceNoteKind Kind; public readonly double Value; public readonly int Lap, Laps;
    public RaceNote(RaceNoteKind kind, double value = 0, int lap = 0, int laps = 0) { Kind = kind; Value = value; Lap = lap; Laps = laps; }
    /// TS note() metni (yarislar.ts / dongu.ts).
    public string Text => Kind switch
    {
      RaceNoteKind.Start => "BAŞLA!", RaceNoteKind.Cut => "PİST KESME", RaceNoteKind.Returned => "PİSTE DÖNDÜN", RaceNoteKind.ComboBurned => "KOMBO YANDI",
      RaceNoteKind.Multiplier => "x" + Value.ToString(CultureInfo.InvariantCulture), RaceNoteKind.Banked => "+" + Value.ToString(CultureInfo.InvariantCulture),
      RaceNoteKind.X6 => "ÇARPAN x6", _ => "Tur " + Lap + "/" + Laps + " · " + RaceSession.FormatTime(Value),
    };
  }

  /// Bir fizik adımının yarışa giren sonucu (TS evTick'in okuduğu sim.S, ipucu.ti, sim.d.D, AdimSonucu).
  public struct RaceStepInput
  {
    public double X, Z, Vx, Vz, Speed;
    /// Fizik adımından sonraki pist ipucu (son yüzey sorgusu: araç merkezi).
    public int Hint;
    /// Drift yarışı: drift bayrağı, kayma açısı, çimdeki teker, son çarpmadan beri süre, direksiyon, sim zamanı ve
    /// TS driftYarisProfili(kurulum).azami + 0,12 (bunu aşan açı komboyu yakar).
    public bool DriftActive; public double Beta, Steer, SimTime, SinceHit, BetaLimit; public int GrassWheels;
  }

  /// TS Yaris durumu + evTick/endEvent kuralları (DOM, hayalet, rakip, MUTANT, profil sayaçları yok).
  public sealed class RaceSession
  {
    public readonly RaceEventInfo Event;
    public readonly TrackDefinition Track;
    public readonly bool Career;
    public readonly string RecordKey;
    private readonly TrackGeometry g;
    private readonly double edge;
    private readonly Func<string, int, int, (double Xp, double Money)>? reward;

    public RaceState State { get; private set; } = RaceState.Countdown;
    public double Countdown { get; private set; } = 3;
    public double Time { get; private set; }
    public int Lap { get; private set; }
    public int Armed { get; private set; }
    public double LapStart { get; private set; }
    public double? BestLap { get; private set; }
    public int Previous { get; private set; }
    public readonly WrongWayCounter Wrong = new();
    public readonly DriftCounter Drift = new();
    public readonly OffTrackCounter OffTrack = new();
    public readonly CutCounter Cut = new();
    public double DriftRatio { get; private set; }
    public double DriftDistance { get; private set; }
    public bool X6 { get; private set; }
    public double DriftMultiplier { get; private set; } = 1;
    public double? Trap { get; private set; }
    public int Stars { get; private set; }
    public double Xp { get; private set; }
    public double Money { get; private set; }
    public bool Won { get; private set; }
    public readonly List<RaceNote> Notes = new();

    /// startHint: başlangıç noktasında tam taramalı en yakın nokta (TS reset). career: kariyere uygun (TS kariyereUygun);
    /// değilse rekor anahtarı deneme_ ve ödül yok. reward: kariyerde (tür, seviye, yıldız) → kazanılan (TS yarisBitti).
    public RaceSession(RaceEventInfo info, TrackDefinition track, bool career, int startHint, Func<string, int, int, (double, double)>? reward = null)
    {
      if (info.Type != track.Type || info.Level != track.Level) throw new ArgumentException("Etkinlik ve pist uyuşmuyor.");
      Event = info; Track = track; Career = career; g = track.Geometry; edge = TrackRules.Edge(g, track.Layout.Kerbs.Length > 0);
      RecordKey = career ? info.Key : "deneme_" + info.Key; this.reward = career ? reward : null; Previous = startHint;
    }

    public bool IsDrift => Event.Type == "dp";
    /// TS: drift yarışında puan, diğerlerinde süre.
    public double Result => IsDrift ? Drift.Score : Time;

    /// TS dongu.ts: geri sayımda fizik donar; sayaç 0'a inince yarış başlar.
    public void TickCountdown(double dt)
    {
      if (State != RaceState.Countdown) return;
      Countdown -= dt;
      if (Countdown <= 0) { State = RaceState.Running; Notes.Add(new RaceNote(RaceNoteKind.Start)); }
    }

    /// TS evTick (her fizik adımından sonra). Pist dışında 1 + 5 sn kalınca dönüş noktası döner: araç oraya konur.
    public TrackReturnPoint? Step(in RaceStepInput s, double dt)
    {
      if (State != RaceState.Running) return null;
      int ti = s.Hint;
      Time += dt;
      // Kariyerde pist kesme yalnız bildirilir; ceza (gövde) MUTANT kuralıdır.
      if (Cut.Step(g, edge, s.X, s.Z, ti) > 0) Notes.Add(new RaceNote(RaceNoteKind.Cut));
      var back = OffTrack.Step(g, edge, s.X, s.Z, ti, dt);
      if (back != null) { ReturnToTrack(back.Value); Notes.Add(new RaceNote(RaceNoteKind.Returned)); return back; }
      if (OffTrack.First != null)
      {
        // Pist dışında ilerleyerek tur/bitiş ya da drift puanı kazanılmaz.
        Drift.Step(false, 0, true, 0, false, dt); DriftMultiplier = 1; return null;
      }
      bool backward = Wrong.Step(s.Vx, s.Vz, g.Tx[ti], g.Tz[ti], dt);
      if (IsDrift)
      {
        bool lost = s.GrassWheels == 4 || s.SinceHit < 0.05 || Math.Abs(s.Beta) > s.BetaLimit;
        var r = Drift.Step(s.DriftActive, s.Beta, lost, s.Speed, Wrong.WrongWay || backward, dt, s.Steer, s.SimTime, X6);
        if (Lap == 0 && s.DriftActive && !lost && !Wrong.WrongWay && !backward)
        {
          double ds = g.S[ti] - g.S[Previous];
          if (ds < -g.Length / 2) ds += g.Length;
          if (ds > 0) DriftDistance += ds;
          DriftRatio = Math.Min(1, DriftDistance / g.Length);
        }
        DriftMultiplier = Drift.Multiplier;
        if (r.Event == DriftStepEvent.Burned) Notes.Add(new RaceNote(RaceNoteKind.ComboBurned));
        else if (r.Event == DriftStepEvent.Multiplier) Notes.Add(new RaceNote(RaceNoteKind.Multiplier, Drift.Multiplier));
        else if (r.Event == DriftStepEvent.Banked && r.Points > 0) Notes.Add(new RaceNote(RaceNoteKind.Banked, r.Points));
      }
      int n = g.N;
      if (Event.Laps > 0)
      {
        if (ti > n * 0.4 && ti < n * 0.6) Armed = 1;
        if (Previous > n * 0.8 && ti < n * 0.2 && Armed == 1)
        {
          Armed = 0; Lap++;
          if (IsDrift && Lap == 1 && DriftRatio >= DriftCounter.X6Ratio)
          {
            X6 = true; DriftMultiplier = DriftCounter.X6Multiplier;
            Drift.Events.Add(new DriftEvent(DriftBonusKind.X6, 0, s.SimTime)); Notes.Add(new RaceNote(RaceNoteKind.X6));
          }
          double lt = Time - LapStart; LapStart = Time;
          BestLap = BestLap == null ? lt : Math.Min(BestLap.Value, lt);
          if (Lap >= Event.Laps)
          {
            if (IsDrift) { double p = Drift.Bank(); if (p > 0) Notes.Add(new RaceNote(RaceNoteKind.Banked, p)); }
            Finish();
          }
          else Notes.Add(new RaceNote(RaceNoteKind.Lap, lt, Lap + 1, Event.Laps));
        }
        Previous = ti;
      }
      else
      {
        if (ti > n * 0.5) Armed = 1;
        if (Armed == 1 && ti >= n - (Event.Type == "dg" ? 1 : 4)) { Trap = JsMath.Hypot(s.Vx, s.Vz) * 3.6; Finish(); }
      }
      return null;
    }

    /// TS yaristaPisteDon: süre/tur/puan korunur; sayaçlar ve kombo sıfırlanır; ipucu dönüş noktasında tam taramayla.
    private void ReturnToTrack(TrackReturnPoint p)
    {
      Previous = g.Nearest(p.X, p.Z, 0, true).Index;
      OffTrack.Clear(); Cut.Clear(); Wrong.WrongWay = false; Wrong.Timer = 0;
      Drift.Step(false, 0, true, 0, false, 0); DriftMultiplier = 1;
    }

    /// TS endEvent: yıldız, kariyer ödülü (yarisBitti), hedefe göre kazanma.
    private void Finish()
    {
      if (State != RaceState.Running || !(Time > 0)) return;
      State = RaceState.Finished;
      Stars = RaceStars.Count(Event.Type, Result, Event.Stars);
      if (reward != null) (Xp, Money) = reward(Event.Type, Event.Level, Stars);
      Won = Career && (IsDrift ? Drift.Score > 0 && Drift.Score >= Event.Limit : Time <= Event.Limit);
    }

    /// TS fmt: 1:23.4
    public static string FormatTime(double? t) => t == null ? "—"
      : Math.Floor(t.Value / 60).ToString(CultureInfo.InvariantCulture) + ":" + (t.Value % 60).ToString("F1", CultureInfo.InvariantCulture).PadLeft(4, '0');
  }
}
