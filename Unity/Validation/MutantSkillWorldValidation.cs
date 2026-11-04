using LastTurn.Core;

internal static class MutantSkillWorldValidation
{
  public static void Run()
  {
    string unity = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../.."));
    string Resource(string file) => File.ReadAllText(Path.Combine(unity, "Assets/LastTurn/Resources", file));
    var fixture = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference/mutant-skill-world-0.8.18.json")));
    var factory = new MutantSkillWorldFactory(Resource("mutant-skill-world.json"));
    var tracks = new TrackCatalog(Resource("track-catalog.json")); var world = new WorldCatalog(Resource("world-catalog.json"), tracks);
    var geometries = tracks.Tracks.ToDictionary(t => t.Key, t => t.Geometry);
    foreach (var street in world.Streets) geometries["sokak_" + street.Key] = street.Geometry;
    double[] Values(CatalogNode n) => n.Items.Select(x => x.N()).ToArray();
    foreach (var entry in fixture["synthetic"].Items)
    {
      var g = entry["geometry"]; geometries[entry["key"].S()] = new TrackGeometry(Values(g["P"]), Values(g["T"]), Values(g["S"]), g["len"].N(), g["hw"].N(), g["open"].B());
    }
    int checks = 0, caseCount = 0; double maximumError = 0; string where = "";
    void Check(bool ok, string label) { checks++; if (!ok) throw new Exception("Mutant skill dünyası " + where + ": " + label); }
    void Compare(CatalogNode expected, CatalogNode actual, string path)
    {
      if (expected.IsNumber)
      {
        double error = Math.Abs(expected.N() - actual.N()); maximumError = Math.Max(maximumError, error);
        Check(actual.IsNumber && error <= 1e-8, path + " sayı TS=" + expected + " C#=" + actual); return;
      }
      if (expected.Fields.Any())
      {
        Check(expected.Fields.Select(p => p.Key).ToHashSet().SetEquals(actual.Fields.Select(p => p.Key)), path + " nesne alanları");
        foreach (var pair in expected.Fields) Compare(pair.Value, actual[pair.Key], path + "." + pair.Key); return;
      }
      if (expected.Items.Any() || expected.ToString() == "[]")
      {
        var e = expected.Items.ToArray(); var a = actual.Items.ToArray(); Check(e.Length == a.Length, path + " dizi uzunluğu");
        for (int i = 0; i < e.Length; i++) Compare(e[i], a[i], path + "[" + i + "]"); return;
      }
      Check(expected.ToString() == actual.ToString(), path + " değer TS=" + expected + " C#=" + actual);
    }
    CatalogNode Null() => CatalogNode.Parse("null");
    CatalogNode Point(double[]? p) => p == null ? Null() : CatalogNode.Arr(p.Select(CatalogNode.Num));
    Check(fixture["baseline"].S() == VehicleCatalog.Baseline && factory.Data["baseline"].S() == VehicleCatalog.Baseline, "Sabit TS kaynağı");
    string dataBefore = factory.Data.ToString();
    foreach (var row in fixture["cases"].Items)
    {
      where = row["key"].S() + " case " + caseCount++;
      var player = row["player"].Clone(); var targets = row["targets"].Clone();
      string playerBefore = player.ToString(), targetsBefore = targets.ToString();
      string[]? held = row["held"].ToString() == "null" ? null : row["held"].Items.Select(x => x.S()).ToArray();
      geometries.TryGetValue(row["key"].S(), out var track);
      var actual = factory.Build(player, targets, track, row["racing"].B(), row["openWorld"].B(), row["ground"].N(), held, row["steering"].N());
      Check(actual.Racing == row["racing"].B() && actual.Ground == row["ground"].N() && actual.Steering == row["steering"].N(), "salt dünya alanları");
      Check(ReferenceEquals(actual.Player, player) && ReferenceEquals(actual.Targets, targets) && ReferenceEquals(actual.Held, held), "oyuncu/hedef/basılı girdileri kaynak gibi okunur");
      Check(factory.IsCity(player["x"].N(), player["z"].N()) == row["city"].B(), "şehir sınırı");
      Check((actual.Sky != null) == row["hasSky"].B(), "gökyüzü sorgusu var/yok");
      foreach (var link in row["links"].Items) Compare(link["value"], Point(actual.Link!(link["min"].N(), link["max"].N())), "bağlantı");
      foreach (var corner in row["corners"].Items) Compare(corner["value"], actual.Corner!(corner["direction"].N()) ?? Null(), "köşe");
      Compare(row["sky"], actual.Sky?.Invoke() ?? Null(), "gök bağlantısı");
      Check(player.ToString() == playerBefore && targets.ToString() == targetsBefore, "dünya girdileri değişmedi");
    }
    foreach (var row in fixture["roadCases"].Items)
    {
      where = "yol önceliği"; var points = row["points"].Items.Select(Values).ToArray();
      Compare(row["value"], Point(MutantSkillWorldFactory.RoadLink(points, row["player"], row["min"].N(), row["max"].N())), "yöne/uzaklığa göre hedef");
    }
    foreach (var row in fixture["obstacles"].Items)
    {
      where = "engel listesi";
      Compare(row["expected"], MutantSkillWorldFactory.Obstacles(row["objects"].Items.Select(WorldObstacle.Read)), "kaynak sıra/filtre/box yarıçapı/kimlik");
    }
    Check(factory.Data.ToString() == dataBefore, "dünya kataloğu değişmedi");
    foreach (string key in new[] { "links", "corners", "sky", "nullLinks", "nullCorners", "nullSky" }) Check(fixture["counts"][key].N() > 0, "dolu/boş dal kapsamı " + key);
    Console.WriteLine($"Mutant skill dünyası: {checks} koşul; {caseCount} dünya, 6 yol önceliği, 3 engel kümesi; en büyük fark {maximumError:G3}.");
  }
}
