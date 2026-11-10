#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  /// TS oyun/ilerleme.ts kilitTablosu/arasindaAcilan + arayuz/seviye-ui.ts ogeAdi/kutlamaGoster: seviye atlayınca açılan
  /// pist ve araçlar. Saf görünüm modeli; ödül/kilit kuralı GarageState/VehicleCatalog'da kalır.
  public sealed class CareerUnlock
  {
    public string Kind = "", Type = "", Name = ""; public int Level, Car = -1; public double Price;
  }

  public sealed class CareerLevelUp
  {
    private static readonly string[] Types = { "gp", "rx", "dp", "rl", "dg" };
    private static readonly Dictionary<string, string> TypeNames = new Dictionary<string, string> { ["gp"] = "Asfalt", ["rx"] = "Rallycross", ["rl"] = "Ralli", ["dp"] = "Drift", ["dg"] = "Drag" };
    public int Old, New; public CareerUnlock[] Unlocked = Array.Empty<CareerUnlock>();
    /// TS: pist ya da ücretsiz araç varsa “Açıldı”, yalnız satın alınabilir araçlar “Yeni”.
    public string Heading => Unlocked.Any(o => o.Kind == "pist" || o.Price <= 0) ? "Açıldı" : "Yeni";

    /// Eski seviyeden (hariç) yeni seviyeye (dahil) açılanlar; seviye artmadıysa null.
    public static CareerLevelUp? Between(VehicleCatalog vehicles, TrackCatalog tracks, int old, int now)
    {
      if (now <= old) return null;
      var unlocks = vehicles.Data["career"]["unlocks"]; var table = new List<(int Level, CareerUnlock Item)>();
      foreach (var type in Types)
      {
        int i = 0;
        foreach (var level in unlocks["pist"][type].Items)
        {
          int lv = ++i; var def = tracks.Tracks.FirstOrDefault(t => t.Type == type && t.Level == lv);
          int difficulty = def?.Difficulty ?? lv;
          table.Add(((int)level.N(), new CareerUnlock { Kind = "pist", Type = type, Level = lv, Name = TypeNames[type] + " · " + tracks.Levels[difficulty - 1].Name + " pisti" }));
        }
      }
      int car = 0;
      foreach (var level in unlocks["arac"].Items)
      {
        int no = car++;
        table.Add(((int)level.N(), new CareerUnlock { Kind = "arac", Car = no, Name = vehicles.Data["cars"][no]["n"].S() + " (araç)", Price = vehicles.Data["prices"]["cars"][no]["para"].N() }));
      }
      // TS Array.sort kararlı: aynı seviyede ekleme sırası korunur.
      return new CareerLevelUp { Old = old, New = now, Unlocked = table.OrderBy(t => t.Level).Where(t => t.Level > old && t.Level <= now).Select(t => t.Item).ToArray() };
    }
  }
}
