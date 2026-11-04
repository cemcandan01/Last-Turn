using System;
using System.Collections.Generic;

namespace LastTurn.Core
{
  // TS 0.8.18 saf yarış kuralları: src/oyun/yaris-kurallari.ts (drift puanı, bonus, ters sürüş), src/oyun/piste-donus.ts
  // (pist konumu, pist dışı/piste dönüş, pist kesme algısı), src/oyun/yildiz.ts (eşik ve yıldız sayımı). Sabitler ve
  // formüller birebir; DOM/not/kayıt yok. Kariyer yarışında pist kesme yalnız algılanır (TS: bildirim); ceza MUTANT'a aittir.
  public static class JsMath
  {
    /// JS Math.round: en yakına, eşitlikte +∞ yönüne (C# Math.Round bankacı yuvarlamasıdır).
    public static double Round(double x) { double f = Math.Floor(x); return x - f >= 0.5 ? f + 1 : f; }
    public static double Hypot(double a, double b) => Math.Sqrt(a * a + b * b);
  }

  public enum DriftBonusKind { Long, NoSteer, OneSide, X6 }

  public readonly struct DriftEvent
  {
    public readonly DriftBonusKind Kind; public readonly double Points, Time;
    public DriftEvent(DriftBonusKind kind, double points, double time) { Kind = kind; Points = points; Time = time; }
    /// TS DriftOlay.ad metni.
    public string Name => Kind switch { DriftBonusKind.Long => "UZUN DRIFT", DriftBonusKind.NoSteer => "DİREKSİYONSUZ", DriftBonusKind.OneSide => "TEK YÖN", _ => "ÇARPAN x6" };
  }

  public enum DriftStepEvent { None, Burned, Multiplier, Banked }

  /// TS DriftSayaci + driftAdimi/driftBankala.
  public sealed class DriftCounter
  {
    public const double NoSteerDeadZone = 0.1, SideAngle = 0.1;
    public static readonly double MaxAngle = 60 * Math.PI / 180, MinAngle = 10 * Math.PI / 180;
    public const double SpeedLow = 4, SpeedFull = 12, TransitionTime = 0.6, TransitionSlip = 0.05, X6Ratio = 0.9, X6Multiplier = 6;
    private static readonly (double Points, double Start, bool Growing) Long = (100, 3, true), NoSteer = (100, 2, false), OneSide = (150, 3, false);

    public double Score, Combo, ComboTime, Multiplier = 1, Gap, Best, Bonus, LongTime, NoSteerTime, SideTime, Side;
    public readonly List<DriftEvent> Events = new();

    /// Anlık puan hızı (kombo çarpanından önce): clamp(|β|, 10°, 60°) × hız, düşük hızda yumuşak azalır.
    public static double Rate(double beta, double v)
    {
      double angle = Math.Min(Math.Max(Math.Abs(beta), MinAngle), MaxAngle);
      double t = Math.Min(1, Math.Max(0, (v - SpeedLow) / (SpeedFull - SpeedLow)));
      return 3 * v * angle * t * t * (3 - 2 * t);
    }

    private void ResetCombo() { Combo = 0; ComboTime = 0; Multiplier = 1; Gap = 0; Bonus = 0; }

    public double Bank()
    {
      double p = JsMath.Round(Combo * Multiplier) + Bonus;
      if (p > 0) { Score += p; Best = Math.Max(Best, p); }
      ResetCombo();
      return p;
    }

    public (DriftStepEvent Event, double Points) Step(bool active, double beta, bool lost, double v, bool wrongWay, double dt,
      double steer = 0.5, double time = 0, bool x6 = false)
    {
      bool lasts = active && !lost && !wrongWay;
      BonusStep(lasts, beta, steer, dt, time);
      if (Combo > 0 && lost) { ResetCombo(); return (DriftStepEvent.Burned, 0); }
      if (lasts)
      {
        Combo += Rate(beta, v) * dt; ComboTime += dt; Gap = 0;
        double m = x6 ? X6Multiplier : Math.Min(5, 1 + Math.Floor(ComboTime / 2.5));
        bool up = m > Multiplier; Multiplier = m;
        return (up ? DriftStepEvent.Multiplier : DriftStepEvent.None, 0);
      }
      if (Combo > 0)
      {
        Gap += dt;
        if (!lost && !wrongWay && Gap <= TransitionTime && Math.Abs(beta) > TransitionSlip) Combo += Rate(MinAngle, v) * dt;
        if (Gap > 0.8) return (DriftStepEvent.Banked, Bank());
      }
      return (DriftStepEvent.None, 0);
    }

    private void BonusStep(bool lasts, double beta, double steer, double dt, double time)
    {
      double side = Math.Abs(beta) > SideAngle ? Math.Sign(beta) : Side;
      if (!lasts) { LongTime = NoSteerTime = SideTime = 0; Side = 0; return; }
      void Give(double before, double now, DriftBonusKind kind, (double Points, double Start, bool Growing) b)
      {
        double n = Math.Floor(now + 1e-9);
        if (n > Math.Floor(before + 1e-9) && now >= b.Start - 1e-9)
        {
          double points = b.Growing ? (n - b.Start + 1) * b.Points : b.Points;
          Bonus += points; Events.Add(new DriftEvent(kind, points, time));
        }
      }
      double c = LongTime; LongTime += dt; Give(c, LongTime, DriftBonusKind.Long, Long);
      c = NoSteerTime; NoSteerTime = Math.Abs(steer) < NoSteerDeadZone ? NoSteerTime + dt : 0; Give(c, NoSteerTime, DriftBonusKind.NoSteer, NoSteer);
      c = SideTime; SideTime = Side != 0 && side != Side ? 0 : SideTime + dt; Side = side; Give(c, SideTime, DriftBonusKind.OneSide, OneSide);
    }
  }

  /// TS TersSayaci + tersAdimi: 1 sn ters → bayrak, 0,5 sn doğru → iner; 3 m/s altında yön değerlendirilmez.
  public sealed class WrongWayCounter
  {
    public const double Enter = 1, Exit = 0.5, MinSpeed = 3;
    public bool WrongWay; public double Timer;
    /// Döner: anlık ters (hız pist yönünden 90°'den fazla sapıyor).
    public bool Step(double vx, double vz, double tx, double tz, double dt)
    {
      double v = JsMath.Hypot(vx, vz), c = v > MinSpeed ? (vx * tx + vz * tz) / v : 0;
      bool back = c < -0.5, forward = c > 0.5;
      if (!WrongWay) { Timer = back ? Timer + dt : 0; if (Timer >= Enter) { WrongWay = true; Timer = 0; } }
      else { Timer = forward ? Timer + dt : 0; if (Timer >= Exit) { WrongWay = false; Timer = 0; } }
      return c < 0;
    }
  }

  public readonly struct TrackReturnPoint
  {
    public readonly double X, Z, Heading;
    public TrackReturnPoint(double x, double z, double heading) { X = x; Z = z; Heading = heading; }
  }

  public static class TrackRules
  {
    public const double OffTrackWait = 1, OffTrackCountdown = 5, CutMinimum = 15, CutTolerance = 10;

    /// Pist sınırı: kerbli pistte (asfalt, drift) kerb de pisttir.
    public static double Edge(TrackGeometry g, bool hasKerbs) => g.HalfWidth + (hasKerbs ? TrackGeometry.KerbWidth : 0);

    /// TS pistKonumu: en yakın noktanın iki yanındaki doğru parçalarına izdüşüm (uzaklık, dönüş noktası, pist ilerlemesi).
    public static (double Distance, TrackReturnPoint Point, double Progress) Locate(TrackGeometry g, double x, double z, int hint)
    {
      int i = g.Nearest(x, z, hint).Index, n = g.N;
      double best = double.PositiveInfinity, progress = g.S[i];
      var point = new TrackReturnPoint(g.X[i], g.Z[i], Math.Atan2(g.Tx[i], g.Tz[i]));
      foreach (int j in new[] { i - 1, i })
      {
        if (g.Open && (j < 0 || j >= n - 1)) continue;
        int a = (j + n) % n, b = (j + 1) % n;
        double dx = g.X[b] - g.X[a], dz = g.Z[b] - g.Z[a], q = dx * dx + dz * dz;
        double u = TrackGeometry.Clamp(((x - g.X[a]) * dx + (z - g.Z[a]) * dz) / (q == 0 ? 1 : q), 0, 1);
        double px = g.X[a] + u * dx, pz = g.Z[a] + u * dz, d = JsMath.Hypot(x - px, z - pz);
        if (d < best) { best = d; point = new TrackReturnPoint(px, pz, Math.Atan2(dx, dz)); progress = g.S[a] + u * JsMath.Hypot(dx, dz); }
      }
      return (best, point, progress);
    }
  }

  /// TS PistDisiSayaci + pistDisiAdimi: ilk çıkış noktası kilitlenir; 1 + 5 sn dışarıda kalınca o noktaya dönülür.
  public sealed class OffTrackCounter
  {
    public double Time; public TrackReturnPoint? First;
    public void Clear() { Time = 0; First = null; }
    public TrackReturnPoint? Step(TrackGeometry g, double edge, double x, double z, int hint, double dt)
    {
      var p = TrackRules.Locate(g, x, z, hint);
      if (p.Distance <= edge) { Clear(); return null; }
      First ??= p.Point;
      Time += dt;
      return Time > TrackRules.OffTrackWait + TrackRules.OffTrackCountdown + 1e-9 ? First : null;
    }
  }

  /// TS KesmeSayaci + kesmeAdimi: piste dönüşte atlanan pist mesafesi dışarıdaki yoldan 10 m'den fazla uzunsa kesme.
  public sealed class CutCounter
  {
    public double? Exit; public double Path, Px, Pz;
    public void Clear() { Exit = null; Path = 0; Px = 0; Pz = 0; }
    /// Döner: piste dönüş adımında kesme olduysa atlanan pist mesafesi (m), yoksa 0.
    public double Step(TrackGeometry g, double edge, double x, double z, int hint)
    {
      var p = TrackRules.Locate(g, x, z, hint); double s = p.Progress;
      if (p.Distance > edge)
      {
        if (Exit == null) { Exit = s; Path = 0; Px = x; Pz = z; }
        else { Path += JsMath.Hypot(x - Px, z - Pz); Px = x; Pz = z; }
        return 0;
      }
      if (Exit == null) return 0;
      double d = s - Exit.Value;
      if (!g.Open) d = (((d + g.Length / 2) % g.Length) + g.Length) % g.Length - g.Length / 2;
      double gain = d - Path;
      Clear();
      return d >= TrackRules.CutMinimum && gain > TrackRules.CutTolerance ? d : 0;
    }
  }

  /// TS yildiz.ts: [1★, 2★, 3★] eşikleri (zamanlı yarışta süre, drift yarışında puan) ve sayım.
  public static class RaceStars
  {
    public const int DriftLaps = 2;
    public static string TypeKey(string type) => type switch { "gp" => "asphalt", "rx" => "dirt", "dp" => "drift", "rl" => "rally", "dg" => "drag", _ => throw new ArgumentException("Yarış türü: " + type) };
    public static string Key(string type, int level) => TypeKey(type) + "_" + level;
    /// Drift rekor/hayalet anahtarının ön eki (kural sürümlü); yıldız anahtarı değişmez.
    public static string DriftRecordPrefix => TypeKey("dp") + "2";

    public static double[] Thresholds(TrackDefinition d)
    {
      var target = d.Raw[d.Type == "dp" ? "hp" : "tg"];
      var ys = d.Raw["ys"];
      // TS: hedef && ys ? [...] : [] (0 hedef de boş).
      if (!target.IsNumber || target.N() == 0 || !d.Raw.Has("ys")) return Array.Empty<double>();
      var list = new List<double> { target.N() }; foreach (var y in ys.Items) list.Add(y.N());
      return list.ToArray();
    }

    public static int Count(string type, double value, IEnumerable<double> thresholds)
    {
      int n = 0;
      foreach (double e in thresholds) if (type == "dp" ? value > 0 && value >= e : value <= e) n++;
      return n;
    }
  }
}
