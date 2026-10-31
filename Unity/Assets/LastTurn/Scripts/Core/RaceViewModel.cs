#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace LastTurn.Core
{
  // Yarış HUD'ı ve sonuç ekranı için saf görünüm modeli (TS src/arayuz/hud.ts olayPaneli, pisteDonusSayaci, ters,
  // drift satırı; sonuc.ts sonucGoster). Metinler TS'dekiyle aynıdır; simgeler (kronometre, yıldız) görünümün işidir.
  // Rekor (best/saveBest), rakip sırası ve MUTANT paneli henüz taşınmadı.
  public sealed class RaceHudModel
  {
    public string Title = "", Big = "", Sub = "", Countdown = "", Return = "", Note = "", Drift = "", X6 = "";
    public bool WrongWay;
  }

  public sealed class RaceResultModel
  {
    public string Header = "", BestStars = "";
    public int Stars; public double Xp, Money;
    public readonly List<(string Label, string Value)> Rows = new();
    public readonly List<(string Text, bool Earned)> StarRows = new();
  }

  public sealed class RaceEventRow
  {
    public string Key = "", Name = "", TypeName = "", Target = ""; public int Difficulty, BestStars; public bool Open, Career;
  }

  public static class RaceViewModel
  {
    /// Etkinlik listesi (TS menü kartları): kilit (pistAcikMi), seçili aracın kariyer uygunluğu (bütçe), en iyi yıldız, hedef.
    public static RaceEventRow[] Events(GarageState state, RaceEventCatalog races)
    {
      int car = state.SelectedCar; var parts = state.Equipped(car);
      return races.Events.Select(e => new RaceEventRow
      {
        Key = e.Type + "_" + e.Level, Name = e.Name, TypeName = races.Types[e.Type].Name, Difficulty = e.Difficulty,
        BestStars = state.StarsOf(e.Type, e.Level), Open = state.TrackOpen(e.Type, e.Level),
        Career = state.Catalog.CareerEligible(e.Type, e.Level, car, parts),
        Target = e.Type == "dp" ? e.Limit.ToString(CultureInfo.InvariantCulture) + " puan" : e.Type == "dg" ? F(e.Limit, 3) + " sn" : RaceSession.FormatTime(e.Limit),
      }).ToArray();
    }

    private static string F(double v, int digits) => v.ToString("F" + digits, CultureInfo.InvariantCulture);
    private static string Fmt3(double v) => F(v, 3) + " sn";

    /// hint: aracın şimdiki pist ipucu (TS ipucu.ti); lastNote: son bildirim (görünüm süresini kendisi tutar).
    public static RaceHudModel Hud(RaceSession s, int hint, string lastNote = "")
    {
      var e = s.Event; int n = s.Track.Geometry.N;
      var m = new RaceHudModel { Title = e.Name + " · " + e.Key, Note = lastNote, WrongWay = s.Wrong.WrongWay };
      if (s.State == RaceState.Countdown) m.Countdown = s.Countdown > 0 ? Math.Ceiling(s.Countdown).ToString(CultureInfo.InvariantCulture) : "";
      string over = s.Time > e.Limit ? " · SÜRE AŞILDI" : "";
      if (e.Type == "dp")
      {
        m.Big = s.Drift.Score.ToString(CultureInfo.InvariantCulture) + " puan";
        m.Sub = "Tur " + Math.Min(s.Lap + 1, Math.Max(1, e.Laps)) + "/" + e.Laps + " · Hedef " + e.Limit.ToString(CultureInfo.InvariantCulture);
      }
      else if (e.Type == "dg")
      {
        m.Big = F(s.Time, 2);
        m.Sub = "Hedef " + F(e.Limit, 1) + " sn · %" + JsMath.Round(100.0 * hint / (n - 1)) + over;
      }
      else
      {
        m.Big = RaceSession.FormatTime(s.Time);
        m.Sub = (e.Laps > 0 ? "Tur " + Math.Min(s.Lap + 1, e.Laps) + "/" + e.Laps : "%" + JsMath.Round(100.0 * hint / n))
          + (e.Limit > 0 ? " · Hedef " + RaceSession.FormatTime(e.Limit) + over : "");
      }
      // piste dönüş: ilk saniye sayım yok, sonra 5…1
      double off = s.State == RaceState.Running ? s.OffTrack.Time : 0;
      int left = off > TrackRules.OffTrackWait ? Math.Max(1, (int)Math.Ceiling(TrackRules.OffTrackWait + TrackRules.OffTrackCountdown - off)) : 0;
      if (left > 0) m.Return = left + " · PİSTE DÖNÜLÜYOR";
      if (e.Type == "dp")
      {
        if (s.Drift.Combo > 0) m.Drift = JsMath.Round(s.Drift.Combo) + " · x" + s.DriftMultiplier.ToString(CultureInfo.InvariantCulture);
        if (s.X6) m.X6 = "x6 ÇARPAN";
        else if (s.Lap == 0 && e.Laps > 1)
        {
          double o = TrackGeometry.Clamp(s.DriftRatio, 0, 1), rest = 1 - TrackGeometry.Clamp((double)hint / n, 0, 1);
          m.X6 = o >= DriftCounter.X6Ratio ? "x6 HAZIR" : o + rest < DriftCounter.X6Ratio ? "x6 KAÇTI" : "%" + JsMath.Round(o * 100);
        }
      }
      return m;
    }

    /// TS sonucGoster (rekor satırı hariç). bestStars: kariyerde kayıtlı en iyi yıldız.
    public static RaceResultModel Result(RaceSession s, int bestStars) => Result(s, bestStars, double.NaN, false);
    /// previousBest/newRecord: TS sonucGoster Rekor satırı (NaN: rekor bilgisi yok, satır yazılmaz).
    public static RaceResultModel Result(RaceSession s, int bestStars, double previousBest, bool newRecord)
    {
      var e = s.Event; var r = new RaceResultModel { Stars = s.Stars, Xp = s.Xp, Money = s.Money };
      string Value(double v) => e.Type == "dp" ? v.ToString(CultureInfo.InvariantCulture) + " puan" : e.Type == "dg" ? Fmt3(v) : RaceSession.FormatTime(v);
      for (int i = 0; i < e.Stars.Length; i++) r.StarRows.Add(((i + 1) + "★ " + Value(e.Stars[i]), i < s.Stars));
      r.BestStars = s.Career ? "En iyi: " + bestStars + " / 3" : "Kupa kaydı değişmez";
      if (e.Type == "dp")
      {
        bool passed = s.Drift.Score > 0 && s.Drift.Score >= e.Limit;
        r.Header = passed ? "Hedef geçildi" : "Hedefe ulaşılamadı";
        r.Rows.Add(("Toplam puan", s.Drift.Score.ToString(CultureInfo.InvariantCulture)));
        r.Rows.Add(("Hedef", e.Limit.ToString(CultureInfo.InvariantCulture) + " puan · " + (passed ? "geçti" : "kaldı")));
        r.Rows.Add(("En iyi kombo", s.Drift.Best.ToString(CultureInfo.InvariantCulture)));
      }
      else
      {
        bool ok = s.Time <= e.Limit;
        r.Header = ok ? (e.Laps > 0 ? "Yarış tamamlandı" : e.Type == "dg" ? "Hedef geçildi" : "Etap tamamlandı") : "Süre aşıldı";
        if (e.Type == "dg")
        {
          r.Rows.Add(("Süren", Fmt3(s.Time))); r.Rows.Add(("Hedef", Fmt3(e.Limit)));
          r.Rows.Add(("Bitiş hızı", JsMath.Round(s.Trap ?? 0) + " km/sa"));
        }
        else
        {
          r.Rows.Add(("Süren", RaceSession.FormatTime(s.Time))); r.Rows.Add(("Hedef", RaceSession.FormatTime(e.Limit)));
          if (e.Laps > 0) r.Rows.Add(("En iyi tur", RaceSession.FormatTime(s.BestLap)));
        }
      }
      if (!double.IsNaN(previousBest))
      {
        string rec;
        if (e.Type == "dp") rec = Math.Max(previousBest, s.Drift.Score).ToString(CultureInfo.InvariantCulture) + (newRecord ? " · YENİ" : "");
        else if (e.Type == "dg") rec = newRecord ? Fmt3(s.Time) + " · YENİ" : previousBest != 0 ? Fmt3(previousBest) : "—";
        else rec = newRecord ? RaceSession.FormatTime(s.Time) + " · YENİ" : previousBest != 0 ? RaceSession.FormatTime(previousBest) : "—";
        r.Rows.Add(("Rekor", rec));
      }
      return r;
    }
  }
}
