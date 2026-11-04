using LastTurn.Core;
using LastTurn.EditorValidation;

// Pist aktarımı 1. aşama: TS 0.8.18 pist tanımı + geometri + sorgular (export-tracks.mjs oracle'ı).
internal static class TrackValidation
{
  private static int checks;
  private static void Check(bool condition, string label)
  {
    checks++;
    if (!condition) throw new InvalidOperationException("Pist doğrulaması: " + label);
  }
  private static void Rejects(Action action, string label)
  {
    try { action(); } catch (FormatException) { checks++; return; }
    throw new InvalidOperationException("Pist doğrulaması reddetmedi: " + label);
  }

  public static void Run()
  {
    string unity = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..");
    string json = File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", "track-catalog.json"));
    var catalog = new TrackCatalog(json);
    var fixture = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference", "track-queries-0.8.18.json")));

    // TS tests/birim/pistler.test.ts düzeni: 5 tür × 8 pist, numaralar 1-8, açık pist yalnız ralli/drag.
    Check(catalog.Tracks.Length == 40 && catalog.Levels.Length == 6, "40 pist, 6 zorluk seviyesi");
    foreach (var type in new[] { "gp", "rx", "dp", "rl", "dg" })
    {
      var list = catalog.Tracks.Where(t => t.Type == type).ToArray();
      Check(list.Select(t => t.Level).OrderBy(l => l).SequenceEqual(Enumerable.Range(1, 8)), type + " numaraları 1-8");
      Check(list.All(t => t.Open == (type == "rl" || type == "dg")), type + " açık/kapalı");
    }
    var gp1 = catalog.Find("gp", 1);
    Check(gp1.Index == 0 && gp1.Name == "Yeşil Vadi" && gp1.Raw["tarif"].S().StartsWith("D250 ") && !gp1.Open, "ilk referans pist gp_1");

    var result = TrackReferenceComparison.Run(catalog, fixture);
    Check(result.Tracks == 40 && result.Samples == fixture["tracks"].Items.Sum(t => t["samples"].Items.Count()), "bütün pistler ve örnekler karşılaştırıldı");

    // Bozuk veri reddi.
    Rejects(() => new TrackCatalog(json.Replace(TrackCatalog.Baseline, new string('0', 40))), "farklı TS kaynağı");
    var broken = CatalogNode.Parse(json); var g = broken["tracks"][0]["geometry"];
    g.Set("S", CatalogNode.Arr(g["S"].Items.Skip(1)));
    Rejects(() => new TrackCatalog(broken.ToString()), "eksik pist noktası");
    var wrongOpen = CatalogNode.Parse(json); wrongOpen["tracks"][0].Set("open", CatalogNode.Parse("true"));
    Rejects(() => new TrackCatalog(wrongOpen.ToString()), "kapalı pist açık işaretli");

    var layout = gp1.Layout; var geo = gp1.Geometry;
    Console.WriteLine($"Pist aktarımı: {catalog.Tracks.Length} pist, {catalog.Tracks.Sum(t => t.Geometry.N)} nokta, {result.Samples} sorgu örneği; " +
      $"{result.Checks + checks} koşul geçti. En büyük TS–C# farkı {result.MaxError:G3} ({result.MaxErrorAt}); tolerans {TrackReferenceComparison.Tolerance:G}.");
    Console.WriteLine($"gp_1 {gp1.Name}: N={geo.N}, uzunluk {geo.Length:F3} m, yarı genişlik {geo.HalfWidth} m, kerb noktası {layout.Kerbs.Count(k => k)}, " +
      $"fren tabelası {layout.BrakeBoards.Count}, başlangıç ({layout.StartX:F2}, {layout.StartZ:F2}) yön {layout.StartHeading:F4}.");
  }
}
