using LastTurn.Core;

// Seviye atlama kutlaması: TS kilit tablosu/ogeAdi (export-level-up.mjs) ile CareerLevelUp bütün seviye aralıklarında.
internal static class LevelUpValidation
{
  public static void Run()
  {
    string unity = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..");
    var vehicles = new VehicleCatalog(File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", "vehicle-catalog.json")));
    var tracks = new TrackCatalog(File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", "track-catalog.json")));
    var f = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference/level-up-0.8.18.json")));
    int checks = 0; void Check(bool ok, string label) { checks++; if (!ok) throw new InvalidOperationException("Seviye kutlaması: " + label); }
    Check(CareerLevelUp.Between(vehicles, tracks, 5, 5) == null && CareerLevelUp.Between(vehicles, tracks, 6, 5) == null, "seviye artmadan kutlama yok");
    foreach (var c in f["cases"].Items)
    {
      int old = (int)c["eski"].N(), now = (int)c["yeni"].N(); var m = CareerLevelUp.Between(vehicles, tracks, old, now)!; var items = c["items"].Items.ToArray(); string label = old + "→" + now;
      Check(m.Heading == c["heading"].S(), label + " başlık " + m.Heading);
      Check(m.Unlocked.Length == items.Length, label + " sayı " + m.Unlocked.Length + "/" + items.Length);
      for (int i = 0; i < items.Length; i++)
      {
        var a = m.Unlocked[i]; var e = items[i];
        Check(a.Kind == e["tur"].S() && a.Name == e["name"].S() && a.Price == e["price"].N(), label + " öğe " + i + " " + a.Name + " / " + e["name"].S());
        if (a.Kind == "pist") Check(a.Type == e["ty"].S() && a.Level == (int)e["lv"].N(), label + " pist " + i); else Check(a.Car == (int)e["no"].N(), label + " araç " + i);
      }
    }
    Console.WriteLine($"Seviye kutlaması TS–C#: {f["cases"].Items.Count()} aralık, {checks} koşul, fark 0.");
  }
}
