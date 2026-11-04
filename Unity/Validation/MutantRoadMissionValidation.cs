using LastTurn.Core;

internal static class MutantRoadMissionValidation
{
  public static void Run()
  {
    var oracle = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference/mutant-missions-0.8.18.json")));
    int checks = 0;
    double maximumError = 0;
    void Check(bool ok, string label) { checks++; if (!ok) throw new Exception("Mutant yol görevi: " + label); }
    void Near(double expected, double actual, string label)
    {
      maximumError = Math.Max(maximumError, Math.Abs(expected - actual));
      Check(double.IsFinite(actual) && Math.Abs(expected - actual) < 1e-10, label + " TS=" + expected.ToString("R") + " C#=" + actual.ToString("R"));
    }
    Check(oracle["baseline"].S() == "df3549e709469f0b519ebfbeaa9f63c1040fee05", "Sabit kaynak SHA");
    var c = oracle["constants"];
    Near(c["sure"].N(), MutantRoadMissions.Duration, "süre");
    Near(c["aralik"].N(), MutantRoadMissions.Interval, "aralık");
    Near(c["ilkBekleme"].N(), MutantRoadMissions.InitialWait, "ilk bekleme");
    Near(c["rampaYakin"].N(), MutantRoadMissions.RampDistance, "rampa mesafesi");
    Near(c["enAzHiz"].N(), MutantRoadMissions.MinimumSpeed, "en az hız");
    Near(c["kilPayi"]["yakin"].N(), MutantRoadMissions.NearDistance, "yakın eşik");
    Near(c["kilPayi"]["uzak"].N(), MutantRoadMissions.FarDistance, "uzak eşik");
    Near(c["kilPayi"]["hiz"].N(), MutantRoadMissions.NearSpeed, "kıl payı hızı");
    MutantRoadMission ReadMission(CatalogNode n) => new MutantRoadMission
    {
      Kind = n["tur"].S(), Target = n["hedef"].N(), Progress = n["ilerleme"].N(),
      Remaining = n["kalan"].N(), Money = n["para"].N(), Energy = n["enerji"].N()
    };
    MutantRoadMissionState ReadState(CatalogNode n) => new MutantRoadMissionState
    {
      Active = n["aktif"].Has("tur") ? ReadMission(n["aktif"]) : null,
      Wait = n["bekleme"].N(), Completed = (int)n["tamamlanan"].N(),
      Nearby = n["yakin"].Fields.Select(p => p.Key).ToHashSet()
    };
    void CompareMission(CatalogNode expected, MutantRoadMission? actual, string label)
    {
      Check(expected.Has("tur") == (actual != null), label + " görev var/yok");
      if (actual == null) return;
      Check(expected["tur"].S() == actual.Kind, label + " tür");
      Near(expected["hedef"].N(), actual.Target, label + " hedef");
      Near(expected["ilerleme"].N(), actual.Progress, label + " ilerleme");
      Near(expected["kalan"].N(), actual.Remaining, label + " kalan");
      Near(expected["para"].N(), actual.Money, label + " para");
      Near(expected["enerji"].N(), actual.Energy, label + " enerji");
    }
    uint previousSeed = 0; SeededRandom? random = null;
    foreach (var draw in oracle["draws"].Items)
    {
      uint seed = (uint)draw["seed"].N();
      if (random == null || seed != previousSeed) { random = new SeededRandom(seed); previousSeed = seed; }
      var mission = MutantRoadMissions.Draw(random.Next, (int)draw["region"].N(), draw["vmax"].N(), draw["ramp"].N());
      CompareMission(draw["mission"], mission, "üretim " + seed);
      Check(MutantRoadMissions.Name(mission) == draw["name"].S(), "Türkçe görev metni");
      var reward = MutantRoadMissions.Reward((int)draw["region"].N());
      Near(draw["mission"]["para"].N(), reward.Money, "bölge para ödülü");
      Near(draw["mission"]["enerji"].N(), reward.Energy, "bölge enerji ödülü");
    }
    foreach (var scenario in oracle["cases"].Items)
    {
      string name = scenario["name"].S();
      var state = ReadState(scenario["initial"]);
      foreach (var row in scenario["rows"].Items)
      {
        var e = row["input"];
        var input = new MutantRoadMissionInput
        {
          Speed = e["v"].N(), X = e["x"].N(), Z = e["z"].N(), Airborne = e["havada"].B(),
          Drifting = e["drift"].B(), Hit = e["carpti"].B(),
          Obstacles = e["engeller"].Items.Select(o => new MutantRoadObstacle(o["id"].S(), o["x"].N(), o["z"].N(), o["r"].N())).ToArray()
        };
        var actual = MutantRoadMissions.Step(state, input, row["dt"].N(), () => ReadMission(scenario["next"]));
        var expectedEvent = row["event"];
        Check(expectedEvent.Has("tur") == (actual != null), name + " olay var/yok");
        if (actual != null)
        {
          Check(expectedEvent["tur"].S() == actual.Kind, name + " olay türü");
          CompareMission(expectedEvent["gorev"], actual.Mission, name + " olay görevi");
        }
        var expected = row["state"];
        CompareMission(expected["aktif"], state.Active, name + " aktif");
        Near(expected["bekleme"].N(), state.Wait, name + " bekleme");
        Check((int)expected["tamamlanan"].N() == state.Completed, name + " tamamlanan");
        Check(state.Nearby.SetEquals(expected["yakin"].Fields.Select(p => p.Key)), name + " yaklaşılmış engel kimlikleri");
      }
    }
    Console.WriteLine($"Mutant yol görevleri: {checks} koşul; 192 üretim, 8 senaryo/39 adım; en büyük fark {maximumError:G3}.");
  }
}
