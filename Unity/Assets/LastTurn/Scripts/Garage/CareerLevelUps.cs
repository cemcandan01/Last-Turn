using System.Collections.Generic;
using System.Linq;
using LastTurn.Core;

namespace LastTurn.Garage
{
  /// TS ilerleme.ts dinleyiciler + seviye-ui.ts bekleyen: kaydedilmiş XP artışında seviye atlandıysa olay sıraya girer
  /// (yarış ödülü, bulut birleştirme). Görünüm sırayı tüketir; kayıt/ödül kuralına yazmaz.
  public static class CareerLevelUps
  {
    private static readonly List<CareerLevelUp> pending = new List<CareerLevelUp>();
    public static int Pending => pending.Count;
    public static void Observe(int old, int now)
    {
      if (now <= old || GarageSession.Catalog == null) return;
      var m = CareerLevelUp.Between(GarageSession.Catalog, LastTurn.Prototype.RaceData.Load().Tracks, old, now); if (m != null) pending.Add(m);
    }
    /// Bekleyenleri tek kutlamada birleştirir (TS: en son yeni seviye, bütün açılanlar).
    public static CareerLevelUp Take()
    {
      if (pending.Count == 0) return null;
      var r = new CareerLevelUp { Old = pending[0].Old, New = pending[pending.Count - 1].New, Unlocked = pending.SelectMany(p => p.Unlocked).ToArray() };
      pending.Clear(); return r;
    }
    public static void Clear() => pending.Clear();
  }
}
