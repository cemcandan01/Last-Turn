using LastTurn.Core;
using LastTurn.EditorValidation;

// Yardım seviyelerinin sürüşe etkisi (gerçek fizik, sayısal rapor): düz asfaltta 0–100 ve 100–0, gp_1/rx_1 tur süresi,
// 8 drift pistinde gerçek drift puanı ve yıldız (drift sürücüsü analog ve klavye girdisiyle). Eşikler değiştirilmez.
internal static class AssistLevelsValidation
{
  public static void Run()
  {
    string unity = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..");
    string Res(string n) => File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", n));
    var vehicles = new VehicleCatalog(Res("vehicle-catalog.json")); var tracks = new TrackCatalog(Res("track-catalog.json")); var races = new RaceEventCatalog(Res("race-events.json"));
    bool driftOnly = Environment.GetEnvironmentVariable("DRIFT_ONLY") != null;
    foreach (string level in driftOnly ? Array.Empty<string>() : new[] { "real", "norm", "arc" })
    {
      var p = vehicles.CreatePhysics(vehicles.Setup(10, Array.Empty<string>(), level)); var v = new PowertrainVehicle(p); int n = 0;
      while (v.Body.Velocity.Length < 100 / 3.6 && n < 3000) { v.Step(new DrivingInput(1, 0, 0, false, false)); n++; }
      double t100 = n / 60.0, z0 = v.ReferencePoint.Z; int m = 0;
      while (v.Body.Velocity.Length > .1 && m < 3000) { v.Step(new DrivingInput(0, 1, 0, false, false)); m++; }
      Console.WriteLine($"{level}: araç 10 düz asfalt 0–100 {t100:F2} sn, 100–0 {v.ReferencePoint.Z - z0:F1} m");
    }
    RaceAllValidation.Level = "norm";
    foreach (string level in new[] { "real", "norm", "arc" })
    {
      RaceAllValidation.Level = level;
      foreach (var key in driftOnly ? Array.Empty<(string, int)>() : new[] { ("gp", 1), ("rx", 1) })
      {
        var o = RaceAllValidation.Drive(vehicles, tracks, races, races.Find(key.Item1, key.Item2), RaceTestDriver.For(key.Item1));
        Console.WriteLine($"{level}: {o.Key} {(o.Finished ? "bitti" : "KALDI")} {RaceSession.FormatTime(o.Time)} {o.Stars}★");
      }
      foreach (bool digital in new[] { false, true })
      {
        int stars = 0, finished = 0; var line = new List<string>();
        foreach (var e in races.Events.Where(e => e.Type == "dp"))
        {
          var d = RaceTestDriver.For("dp"); d.Digital = digital;
          var o = RaceAllValidation.Drive(vehicles, tracks, races, e, d);
          stars += o.Stars; if (o.Finished) finished++;
          line.Add($"{o.Key} {o.Score}/{e.Stars[0]}{(o.Stars > 0 ? " " + o.Stars + "★" : "")} (drift {o.DriftSteps} adım)");
        }
        Console.WriteLine($"{level} drift {(digital ? "klavye" : "analog")}: {finished}/8 bitti, toplam {stars}★ · " + string.Join(" · ", line));
      }
    }
  }
}
