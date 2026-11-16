#nullable enable
using System;
using System.Globalization;

namespace LastTurn.Core
{
  // Yalnız mevcut eşikleri açıklar; ödül, yıldız veya tahmini tur sonucu üretmez.
  public sealed class RaceObjectiveModel
  {
    public int Stars, NextStar;
    public bool Available;
    public double Target, Gap;
    public string Live = "", Result = "", NextTarget = "", Improvement = "";

    public static RaceObjectiveModel Read(RaceEventInfo race, double value, bool finished)
    {
      var m = new RaceObjectiveModel();
      if (race.Stars.Length == 0 || double.IsNaN(value) || double.IsInfinity(value)) return m;
      bool score = race.Type == "dp";
      m.Available = true;
      value = Math.Max(0, value);
      m.Stars = RaceStars.Count(race.Type, value, race.Stars);
      string Format(double n) => score ? Math.Ceiling(n).ToString(CultureInfo.InvariantCulture) + " puan"
        : n.ToString(race.Type == "dg" ? "0.000" : "0.0", CultureInfo.InvariantCulture) + " sn";
      string TargetFormat(double n) => score || race.Type == "dg" ? Format(n) : RaceSession.FormatTime(n);

      if (finished)
      {
        if (m.Stars >= race.Stars.Length) { m.Result = "Tüm yıldız hedefleri tamamlandı."; return m; }
        m.NextStar = m.Stars + 1; m.Target = race.Stars[m.Stars];
        m.Gap = Math.Max(0, score ? m.Target - value : value - m.Target);
        double minimum = race.Type == "dg" ? .001 : .1;
        string gap = !score && m.Gap < minimum ? "< " + Format(minimum) : Format(m.Gap);
        m.NextTarget = m.NextStar + "★ · " + TargetFormat(m.Target);
        m.Improvement = gap + (score ? " daha kazan" : " daha hızlı bitir");
        m.Result = m.NextTarget + " · " + m.Improvement;
      }
      else if (score)
      {
        if (m.Stars >= race.Stars.Length) { m.Live = race.Stars.Length + "★ puanı hazır · yarışı tamamla"; return m; }
        m.NextStar = m.Stars + 1; m.Target = race.Stars[m.Stars]; m.Gap = Math.Max(0, m.Target - value);
        m.Live = m.NextStar + "★ için " + Format(m.Gap) + " kaldı";
      }
      else
      {
        // Bu kalan yarış süresidir; hız/konumdan kazanma tahmini yapılmaz.
        if (m.Stars == 0) { m.Live = "Yıldız süresi aşıldı · yarışı tamamla"; return m; }
        m.NextStar = m.Stars; m.Target = race.Stars[m.Stars - 1]; m.Gap = Math.Max(0, m.Target - value);
        double unit = race.Type == "dg" ? .001 : .1;
        string remaining = m.Gap > 0 && m.Gap < unit ? "< " + Format(unit) : Format(Math.Floor(m.Gap / unit) * unit);
        m.Live = m.NextStar + "★ süre bütçesi · " + remaining;
      }
      return m;
    }
  }
}
