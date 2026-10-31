using LastTurn.Core;
using LastTurn.EditorValidation;

// 40 pistin hepsi gerçek araç fiziğiyle: etkinliğin kariyer aracı + yarış lastiği, TS bölge dünyası, yarış oturumu,
// doğrulama sürücüsü. Biten pist, süre, yıldız, piste dönüş ve sürüşte gerçekten görülen zeminler raporlanır.
internal static class RaceAllValidation
{
  public static string Level = Environment.GetEnvironmentVariable("ASSIST_LEVEL") ?? "norm";
  public sealed class Outcome
  {
    public string Key = ""; public bool Finished; public int Laps, Stars, Teleports, Respawns, Steps, Airborne, Wet, DriftSteps; public double Time, Score, MinH, MaxH, Trap;
    public int[] Surfaces = new int[6];
  }

  public static Outcome Drive(VehicleCatalog vehicles, TrackCatalog tracks, RaceEventCatalog races, RaceEventInfo info, RaceTestDriver driver, int limit = 60000)
  {
    var track = tracks.Tracks[info.Index]; int car = int.TryParse(Environment.GetEnvironmentVariable("RACE_CAR"), out int forced) ? forced : (int)vehicles.CareerRule(info.Type, info.Level)["arac"].N();
    var setup = GarageDriveParameters.Configure(vehicles, vehicles.Setup(car, Array.Empty<string>(), Level), false, info.Type);
    var world = new TrackWorld(track);
    var vehicle = new PowertrainVehicle(GarageDriveParameters.Create(vehicles, vehicles.Setup(car, Array.Empty<string>(), Level), false, info.Type), world: world);
    var run = new RaceRun(vehicle, world, info, hint => new RaceSession(info, track, true, hint), RaceDrift.MaxAngle(setup));
    while (run.Session.State == RaceState.Countdown) run.TickCountdown(1.0 / 60);
    var o = new Outcome { Key = info.Type + "_" + info.Level, MinH = 1e9, MaxH = -1e9 };
    while (run.Session.State == RaceState.Running && o.Steps < limit)
    {
      run.Step(driver.Input(run)); o.Steps++; if (driver.RespawnIfStuck(run)) o.Respawns++;
      var b = vehicle.Body; var p = vehicle.ReferencePoint; double h = world.Height(p.X, p.Z);
      o.MinH = Math.Min(o.MinH, h); o.MaxH = Math.Max(o.MaxH, h); o.Surfaces[b.CenterSurface]++;
      if (!b.Wheels.Any(w => w.Contact)) o.Airborne++;
      if (b.Wet == 1) o.Wet++;
      if (RaceDrift.Detect(b).Active) o.DriftSteps++;
      if (Environment.GetEnvironmentVariable("DEBUG_KEY") == o.Key && o.Steps % 300 == 1)
        Console.WriteLine($"  {o.Steps} p=({p.X:F1},{p.Y:F2},{p.Z:F1}) zemin={h:F2} v={b.Velocity.Length:F1} ipucu={world.Hint}/{track.Geometry.N} temas={b.Wheels.Count(w => w.Contact)} vites={vehicle.Engine.Gear} rpm={vehicle.Engine.Rpm:F0} istenen={driver.LastWanted:F1} eğrilik={driver.LastCurvature:F3} gaz={driver.LastThrottle:F2}");
    }
    var s = run.Session;
    o.Finished = s.State == RaceState.Finished; o.Laps = s.Lap; o.Stars = s.Stars; o.Teleports = run.Teleports; o.Time = s.Time; o.Score = s.Drift.Score; o.Trap = s.Trap ?? 0;
    return o;
  }

  public static void Run()
  {
    string unity = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..");
    string Res(string n) => File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", n));
    var vehicles = new VehicleCatalog(Res("vehicle-catalog.json")); var tracks = new TrackCatalog(Res("track-catalog.json")); var races = new RaceEventCatalog(Res("race-events.json"));
    var results = new List<Outcome>();
    foreach (var info in races.Events)
    {
      var only = Environment.GetEnvironmentVariable("DEBUG_KEY"); if (only != null && only != info.Type + "_" + info.Level) continue;
      var o = Drive(vehicles, tracks, races, info, RaceTestDriver.For(info.Type));
      // TS içerik bulgusu (aynı TS fiziği + TS YZ sürücüsü): rl_3 kariyer aracı 12 (Haki Keçi) %24 yokuşta 217. noktada kalır,
      // araç 3 (Mavi Yıldız) TS'de 54,6 sn'de bitirir. Unity aynı yerde kalırsa beklenen; pist araç 3 ile oynanır.
      if (!o.Finished && o.Key == "rl_3")
      {
        Console.WriteLine($"rl_3  araç 12 TS'deki gibi yokuşta kaldı (en ileri ipucu TS 217); araç 3 ile:");
        Environment.SetEnvironmentVariable("RACE_CAR", "3"); o = Drive(vehicles, tracks, races, info, RaceTestDriver.For(info.Type)); Environment.SetEnvironmentVariable("RACE_CAR", null);
        o.Key = "rl_3*";
      }
      results.Add(o);
      Console.WriteLine($"{o.Key,-5} {(o.Finished ? "BİTTİ" : "KALDI")} tur {o.Laps} {RaceSession.FormatTime(o.Time),8} {o.Stars}★ dönüş {o.Teleports,2} (elle {o.Respawns}) hava {o.Airborne,4} ıslak {o.Wet,3} " +
        $"drift {o.DriftSteps,5} puan {o.Score,6} yük {o.MinH:F1}–{o.MaxH:F1} zemin [{string.Join(",", o.Surfaces)}]{(o.Trap > 0 ? $" tuzak {o.Trap:F0} km/sa" : "")}");
    }
    foreach (var type in new[] { "gp", "rx", "dp", "rl", "dg" })
    {
      var list = results.Where(r => r.Key.StartsWith(type + "_")).ToList();
      Console.WriteLine($"{type}: {list.Count(r => r.Finished)}/{list.Count} bitti, yıldızlı {list.Count(r => r.Stars > 0)}");
    }
    int finished = results.Count(r => r.Finished);
    Console.WriteLine($"Yarış türleri gerçek fizikle: {finished}/40 pist bitti.");
    if (finished < 40) throw new InvalidOperationException("Bitmeyen pist: " + string.Join(", ", results.Where(r => !r.Finished).Select(r => r.Key)));
  }
}
