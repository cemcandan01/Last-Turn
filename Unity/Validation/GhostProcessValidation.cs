using System.Diagnostics;
using LastTurn.Core;
using LastTurn.EditorValidation;

// Hayalet/profil kayıtlarının yeni süreçte yüklenmesi: bir alt süreç gp_1'i gerçek fizikle bitirip rekor, profil sayacı ve
// hayaleti RaceProfileStore ile diske yazar (oyunun GarageRace.Finished yolu); ayrı ikinci alt süreç aynı dizini açar,
// rekoru/sayaçları okur, hayaleti kendi kurulumuyla ayrı fizikte oynatır ve bitiş noktasını bit düzeyinde karşılaştırır.
internal static class GhostProcessValidation
{
  private static string Res(string n) => File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Assets", "LastTurn", "Resources", n));

  public static void Run()
  {
    string dir = Path.Combine(Path.GetTempPath(), "lastturn-ghost-" + Guid.NewGuid().ToString("N"));
    Directory.CreateDirectory(dir);
    try
    {
      int writer = Child("--ghost-write", dir), reader = Child("--ghost-read", dir);
      if (writer == reader) throw new Exception("Hayalet süreci: iki alt süreç aynı PID");
      Console.WriteLine($"Hayalet/profil yeni süreç: yazan PID {writer}, okuyan PID {reader}; rekor, sayaç ve hayalet yeniden yüklendi, bitiş bit düzeyinde aynı.");
    }
    finally { Directory.Delete(dir, true); }
  }

  private static int Child(string flag, string dir)
  {
    var start = new ProcessStartInfo(Environment.ProcessPath!, (Environment.ProcessPath!.EndsWith("dotnet.exe", StringComparison.OrdinalIgnoreCase) ? "\"" + typeof(GhostProcessValidation).Assembly.Location + "\" " : "") + flag + " \"" + dir + "\"")
    { RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false };
    using var p = Process.Start(start)!;
    string output = p.StandardOutput.ReadToEnd(), error = p.StandardError.ReadToEnd(); p.WaitForExit();
    Console.Write(output);
    if (p.ExitCode != 0) throw new Exception("Hayalet alt süreci başarısız (" + flag + "): " + error);
    return p.Id;
  }

  private static (VehicleCatalog V, TrackCatalog T, RaceEventCatalog R) Data() => (new VehicleCatalog(Res("vehicle-catalog.json")), new TrackCatalog(Res("track-catalog.json")), new RaceEventCatalog(Res("race-events.json")));

  public static void Write(string dir)
  {
    var (vehicles, tracks, races) = Data(); var garage = new GarageState(vehicles);
    int car = garage.SelectedCar; var setup = garage.Setup(car); var info = races.Find("gp", 1); var track = tracks.Tracks[info.Index]; var world = new TrackWorld(track);
    var vehicle = new PowertrainVehicle(GarageDriveParameters.Create(vehicles, setup, false, "gp"), world: world);
    var run = new RaceRun(vehicle, world, info, hint => new RaceSession(info, track, true, hint, garage.RaceFinished), RaceDrift.MaxAngle(GarageDriveParameters.Configure(vehicles, setup, false, "gp")));
    while (run.Session.State == RaceState.Countdown) run.TickCountdown(PowertrainVehicle.FixedDelta);
    var driver = new RaceTestDriver(); int steps = 0;
    while (run.Session.State == RaceState.Running && steps < 40000) { run.Step(driver.Input(run)); steps++; }
    if (run.Session.State != RaceState.Finished) throw new Exception("gp_1 bitmedi");
    var store = new RaceProfileStore(dir); var profile = store.Load(); profile.Rename("Süreç Testi"); bool record = profile.Finished(run.Session, out _); store.Save(profile);
    if (!record || !GhostRecord.ShouldSave(store.LoadGhost(run.Session.RecordKey), run.Session.Result, run.Recording, false)) throw new Exception("İlk koşu rekor/hayalet kuralını geçmedi");
    store.SaveGhost(new GhostRecord { Key = run.Session.RecordKey, Car = car, RaceType = "gp", AssistLevel = garage.AssistLevel, Result = run.Session.Result, Parts = setup.Parts, Inputs = run.Recording });
    var b = run.Vehicle.Body.Position;
    File.WriteAllText(Path.Combine(dir, "expected.txt"), string.Join(" ", run.Session.RecordKey, BitConverter.DoubleToInt64Bits(run.Session.Result), BitConverter.DoubleToInt64Bits(b.X), BitConverter.DoubleToInt64Bits(b.Y), BitConverter.DoubleToInt64Bits(b.Z), run.Recording.Count));
    Console.WriteLine($"  yazan süreç: gp_1 {run.Session.Time:F3} sn, {run.Recording.Count} girdi; rekor ve hayalet kaydedildi.");
  }

  public static void Read(string dir)
  {
    var e = File.ReadAllText(Path.Combine(dir, "expected.txt")).Split(' ');
    string key = e[0]; double result = BitConverter.Int64BitsToDouble(long.Parse(e[1]));
    var (vehicles, tracks, races) = Data(); var store = new RaceProfileStore(dir); var profile = store.Load();
    if (profile.Name != "Süreç Testi" || profile.Races != 1 || profile.Best(key) <= 0 || Math.Abs(profile.Best(key) - result) > .01) throw new Exception("Yeni süreç profili/rekoru yüklemedi: " + profile.Best(key));
    var g = store.LoadGhost(key) ?? throw new Exception("Yeni süreç hayaleti yüklemedi");
    if (g.Inputs.Count != int.Parse(e[5]) || BitConverter.DoubleToInt64Bits(g.Result) != long.Parse(e[1])) throw new Exception("Hayalet kaydı eksik yüklendi");
    var info = races.Find("gp", 1); var parameters = GarageDriveParameters.Create(vehicles, vehicles.Setup(g.Car, g.Parts, g.AssistLevel), false, g.RaceType);
    var ghost = new GhostPlayer(g, parameters, tracks.Tracks[info.Index], info);
    while (!ghost.Done) ghost.Step();
    var p = ghost.Vehicle.Body.Position;
    if (BitConverter.DoubleToInt64Bits(p.X) != long.Parse(e[2]) || BitConverter.DoubleToInt64Bits(p.Y) != long.Parse(e[3]) || BitConverter.DoubleToInt64Bits(p.Z) != long.Parse(e[4]))
      throw new Exception("Yeni süreçte hayalet farklı noktada bitti");
    Console.WriteLine($"  okuyan süreç: profil/rekor {profile.Best(key):F3} sn yüklendi; hayalet {g.Inputs.Count} girdiyle aynı noktada bitti.");
  }
}
