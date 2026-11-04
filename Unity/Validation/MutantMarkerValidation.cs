using LastTurn.Core;

internal static class MutantMarkerValidation
{
  public static void Run()
  {
    var fixture = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference/mutant-markers-0.8.18.json")));
    int checks = 0, steps = 0;
    double maximumError = 0;
    void Check(bool ok, string label) { checks++; if (!ok) throw new Exception("Mutant işaret: " + label); }
    void Near(double expected, double actual, string label)
    {
      maximumError = Math.Max(maximumError, Math.Abs(expected - actual));
      Check(double.IsFinite(actual) && Math.Abs(expected - actual) < 1e-12, label);
    }
    Check(fixture["baseline"].S() == "df3549e709469f0b519ebfbeaa9f63c1040fee05", "Sabit kaynak SHA");
    foreach (var scenario in fixture["cases"].Items)
    {
      string name = scenario["name"].S();
      var initial = scenario["initial"];
      var state = new MutantMarkerState { Inside = initial["inside"].S(), Closed = initial["closed"].S(), Wait = initial["wait"].N() };
      foreach (var row in scenario["rows"].Items)
      {
        var input = row["input"];
        MutantMarkerPoint Point(CatalogNode n) => new MutantMarkerPoint((int)n["id"].N(), n["x"].N(), n["z"].N(), n["used"].B());
        var e = new MutantMarkerInput
        {
          HasRun = input["hasRun"].B(), Racing = input["racing"].B(), Phase = input["phase"].S(),
          X = input["x"].N(), Z = input["z"].N(), Speed = input["v"].N(),
          Events = input["events"].Items.Select(Point).ToArray(), Chests = input["chests"].Items.Select(Point).ToArray(),
          WorkshopX = input["workshop"][0].N(), WorkshopZ = input["workshop"][1].N(),
          BossX = input["boss"][0].N(), BossZ = input["boss"][1].N()
        };
        var actual = MutantMarkerGate.Step(state, e, row["dt"].N());
        var expected = row["event"];
        Check(expected.Has("tur") == (actual != null), name + " olay var/yok");
        if (actual != null)
        {
          Check(actual.Kind == expected["tur"].S(), name + " olay türü");
          Check(actual.Id.HasValue == expected.Has("id"), name + " olay kimlik alanı");
          if (actual.Id.HasValue) Check(actual.Id.Value == (int)expected["id"].N(), name + " olay kimliği");
        }
        Check(state.Inside == row["state"]["inside"].S(), name + " içindeki işaret");
        Check(state.Closed == row["state"]["closed"].S(), name + " kapalı işaret");
        Near(row["state"]["wait"].N(), state.Wait, name + " bekleme");
        steps++;
      }
    }
    Console.WriteLine($"Mutant işaret kapısı: {checks} koşul; {fixture["cases"].Items.Count()} senaryo/{steps} adım; en büyük fark {maximumError:G3}.");
  }
}
