using LastTurn.Core;

internal static class MutantOpponentValidation
{
  public static void Run()
  {
    string unity = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../.."));
    string Resource(string file) => File.ReadAllText(Path.Combine(unity, "Assets/LastTurn/Resources", file));
    var opponents = new OpponentCatalog(Resource("opponent-catalog.json"));
    var vehicles = new VehicleCatalog(Resource("vehicle-catalog.json"));
    var tracks = new TrackCatalog(Resource("track-catalog.json"));
    var worlds = new WorldCatalog(Resource("world-catalog.json"), tracks);
    var fixture = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference/mutant-opponents-0.8.18.json")));
    int checks = 0; double maximumError = 0; string where = "";
    void Check(bool ok, string label) { checks++; if (!ok) throw new Exception("Mutant rakip " + where + ": " + label); }
    void Near(double expected, double actual, string label, double tolerance = 1e-9)
    {
      double error = Math.Abs(expected - actual); maximumError = Math.Max(maximumError, error);
      Check(double.IsFinite(actual) && error <= tolerance, label + " TS=" + expected.ToString("R") + " C#=" + actual.ToString("R"));
    }
    void Compare(CatalogNode expected, CatalogNode actual, string label)
    {
      if (expected.IsNumber) { Check(actual.IsNumber, label + " sayı türü"); Near(expected.N(), actual.N(), label); return; }
      if (expected.Fields.Any()) { foreach (var p in expected.Fields) Compare(p.Value, actual[p.Key], label + "." + p.Key); return; }
      if (expected.Items.Any() || expected.ToString() == "[]")
      {
        var e = expected.Items.ToArray(); var a = actual.Items.ToArray(); Check(e.Length == a.Length, label + " dizi uzunluğu");
        for (int i = 0; i < e.Length; i++) Compare(e[i], a[i], label + "[" + i + "]"); return;
      }
      Check(expected.ToString() == actual.ToString(), label + " değer");
    }
    void Input(CatalogNode e, DrivingInput d, double tolerance = 1e-9)
    {
      Near(e["tg"].N(), d.Steering, "direksiyon", tolerance); Near(e["g"].N(), d.Throttle, "gaz", tolerance); Near(e["b"].N(), d.Brake, "fren", tolerance); Check(e["dbr"].B() == d.Handbrake, "el freni");
    }
    void Pilot(CatalogNode e, OpponentPilot d, double tolerance = 1e-9)
    {
      Check(e["mod"].S() == d.Mode, "pilot modu"); Check(e["i"].N() == d.Index && e["tur"].N() == d.Lap, "pilot indeks/tur");
      Near(e["ilerleme"].N(), d.Progress, "ilerleme", tolerance); Near(e["sure"].N(), d.Time, "süre", tolerance); Near(e["takili"].N(), d.Stuck, "takılı", tolerance);
      Near(e["geriT"].N(), d.ReverseTime, "geri süre", tolerance); Near(e["hedefHiz"].N(), d.TargetSpeed, "hedef hız", tolerance);
      Check(e["toparlanma"].N() == d.Recoveries && e["kenar"].N() == d.EdgeCorrections && e["pistDisi"].N() == d.OffTrackSteps, "taktik sayaçları");
    }
    Check(fixture["baseline"].S() == TrackCatalog.Baseline, "Sabit kaynak SHA");
    foreach (var street in worlds.Streets)
      foreach (string personality in new[] { "caylak", "deneyimli", "boss" })
      {
        var plan = opponents.Plan("sokak_" + street.Key, personality);
        Check(plan.N == street.Geometry.N && plan.Open == street.Geometry.Open, "dokuz sokak × üç kişilik geometri eşlemesi");
      }
    foreach (var row in fixture["setups"].Items)
    {
      int car = (int)row["car"].N(); string[] ids = row["ids"].Items.Select(x => x.S()).ToArray(); string[] passives = row["passives"].Items.Select(x => x.S()).ToArray();
      var setup = vehicles.Setup(car, ids, row["level"].S()); string before = setup.Car.ToString();
      var actual = OpponentRacer.CreateMutantSetup(vehicles, setup, passives); var expected = row["expected"];
      Compare(expected["car"], actual.Car, "kaynak Mutant rakip aracı"); Compare(expected["tu"], actual.Tuning, "ayar"); Compare(expected["as"], actual.Assists, "yardım");
      Check(expected["tire"].N() == actual.Tire && expected["pk"].S() == actual.Preset, "parça/önayar lastiği");
      Check(setup.Car.ToString() == before, "stok/garaj aracı korunur");
      var parameters = OpponentRacer.CreateMutantParameters(vehicles, setup, passives);
      Check(!parameters.ManualGearbox && parameters.ReverseMaxRpm == parameters.MaxRpm, "Mutant rakibinde kaynak otomatik vites ve geri kesici");
    }
    foreach (var scenario in fixture["pilots"].Items)
    {
      var plan = opponents.Plan(scenario["key"].S(), scenario["personality"].S());
      var pilot = new OpponentPilot(plan, (uint)scenario["seed"].N(), scenario["start"][0].N(), scenario["start"][1].N());
      int tick=0;foreach (var row in scenario["rows"].Items)
      {
        where=scenario["key"].S()+"/"+scenario["personality"].S()+" pilot "+tick++;
        var a = row["a"]; var input = pilot.Step(a["x"].N(), a["z"].N(), a["h"].N(), a["vx"].N(), a["vz"].N(), a["beta"].N(), 1d / 60, row["started"].B());
        Input(row["input"], input); Pilot(row["state"], pilot);
      }
    }
    foreach (var scenario in fixture["races"].Items)
    {
      int routeIndex = (int)scenario["routeIndex"].N(); var track = TrackDefinition.FromStreet(worlds.Streets[routeIndex], 40 + routeIndex);
      var info = new RaceEventInfo { Type = scenario["type"].S(), Laps = (int)scenario["laps"].N() };
      var parameters = OpponentRacer.CreateMutantParameters(vehicles, vehicles.Setup((int)scenario["car"].N(), scenario["ids"].Items.Select(x => x.S()), scenario["level"].S()), scenario["passives"].Items.Select(x => x.S()));
      var start = scenario["start"]; var racer = new OpponentRacer(parameters, FlatAsphaltWorld.Instance, track, info,
        opponents.Plan(track.Key, scenario["personality"].S()), (uint)scenario["seed"].N(), start["x"].N(), start["z"].N(), start["h"].N());
      int tick = 0;
      foreach (var row in scenario["rows"].Items)
      {
        where=track.Key+" fizik "+row["step"].N();
        DrivingInput input = default; while (tick < row["step"].N()) { input = racer.Step(tick >= 6); tick++; }
        Input(row["input"], input, 1e-6); Pilot(row["pilot"], racer.Pilot, 1e-6);
        var p = racer.Vehicle.ReferencePoint; var forward = racer.Vehicle.Body.Orientation.Rotate(new BodyVector(0, 0, 1));
        double[] values = { p.X, p.Z, Math.Atan2(forward.X, forward.Z), racer.Vehicle.Body.Velocity.X, racer.Vehicle.Body.Velocity.Z };
        for (int i = 0; i < values.Length; i++) Near(row["body"][i].N(), values[i], "gerçek fizik " + track.Key + " gövde " + i, 1e-5);
        Check(racer.Lap == row["lap"].N() && racer.Hint == row["hint"].N() && racer.Armed == row["armed"].B() && racer.Returns == row["returns"].N(), "yarış sayaçları");
        Near(row["time"].N(), racer.Time, "yarış süresi"); Check(racer.FinishTime.HasValue == row["finish"].IsNumber, "bitiş boş/dolu");
        if (racer.FinishTime.HasValue) Near(row["finish"].N(), racer.FinishTime.Value, "bitiş süresi");
      }
      Check(racer.Vehicle.Body.Steps == 600 && Math.Abs(racer.Vehicle.ReferencePoint.X - start["x"].N()) + Math.Abs(racer.Vehicle.ReferencePoint.Z - start["z"].N()) > 1, "rakip gerçekten sürer");
    }
    Console.WriteLine($"Mutant rakip: {checks} koşul; 27 sokak planı, 3240 pilot ve 1800 gerçek fizik adımı, 165 kaynak kurulum; en büyük fark {maximumError:G3}.");
  }
}
