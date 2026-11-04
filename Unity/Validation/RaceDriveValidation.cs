using LastTurn.Core;
using LastTurn.EditorValidation;

// Paket B sürüş bağı: gerçek araç fiziği + TS bölge dünyası (yükseklik/yüzey/ipucu) + yarış oturumu + garaj ödülü.
// gp_1'de başlangıç aracıyla geri sayım, 3 tur, bitiş, yıldız, ödül; piste dönüş; belirlenimcilik.
internal static class RaceDriveValidation
{
  private static int checks;
  private static void Check(bool ok, string label) { checks++; if (!ok) throw new InvalidOperationException("Yarış sürüşü: " + label); }

  private sealed class Setup
  {
    public VehicleCatalog Vehicles = null!; public TrackCatalog Tracks = null!; public RaceEventCatalog Races = null!; public GarageState Garage = null!;
    public RaceRun Run = null!;
  }

  private static Setup Create(string type, int level)
  {
    string unity = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..");
    string Res(string n) => File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", n));
    var s = new Setup { Vehicles = new VehicleCatalog(Res("vehicle-catalog.json")), Tracks = new TrackCatalog(Res("track-catalog.json")), Races = new RaceEventCatalog(Res("race-events.json")) };
    s.Garage = new GarageState(s.Vehicles);
    int car = s.Garage.SelectedCar; var setup = s.Garage.Setup(car);
    var info = s.Races.Find(type, level); var track = s.Tracks.Tracks[info.Index];
    var world = new TrackWorld(track);
    var vehicle = new PowertrainVehicle(GarageDriveParameters.Create(s.Vehicles, setup, false, type), world: world);
    bool career = s.Vehicles.CareerEligible(type, level, car, s.Garage.Equipped(car));
    s.Run = new RaceRun(vehicle, world, info, hint => new RaceSession(info, track, career, hint, s.Garage.RaceFinished), RaceDrift.MaxAngle(GarageDriveParameters.Configure(s.Vehicles, setup, false, type)));
    return s;
  }

  private static (int Steps, double MinHeight, double MaxHeight, int Asphalt, int Grass) Drive(Setup s, RaceTestDriver driver, int limit)
  {
    int steps = 0, asphalt = 0, grass = 0; double lo = 1e9, hi = -1e9;
    while (s.Run.Session.State == RaceState.Running && steps < limit)
    {
      s.Run.Step(driver.Input(s.Run)); steps++;
      var p = s.Run.Vehicle.ReferencePoint; double h = s.Run.World.BaseHeight(p.X, p.Z);
      lo = Math.Min(lo, h); hi = Math.Max(hi, h);
      if (s.Run.Vehicle.Body.CenterSurface == 1) asphalt++; else grass++;
    }
    return (steps, lo, hi, asphalt, grass);
  }

  public static void Run()
  {
    var a = Create("gp", 1);
    Check(a.Run.Session.Career && a.Run.Session.RecordKey == "kariyer1_asphalt_1", "başlangıç aracı gp_1 kariyerine uygun");
    var start = a.Run.Vehicle.Body.Position;
    var groundAtStart = a.Run.World.Height(a.Run.Event.StartX, a.Run.Event.StartZ);
    Check(groundAtStart > 1 && Math.Abs(a.Run.Vehicle.ReferencePoint.Y - groundAtStart) < 0.3, $"başlangıçta araç pist yüksekliğinde ({groundAtStart:F3} m)");
    int countdown = 0;
    while (a.Run.Session.State == RaceState.Countdown) { Check(!a.Run.Step(new DrivingInput(1, 0, 0)), "geri sayımda fizik donuk"); a.Run.TickCountdown(1.0 / 60); countdown++; }
    Check(countdown == 181 && a.Run.Vehicle.Body.Position.Equals(start), "3 sn geri sayım, araç kıpırdamadı");
    var driver = new RaceTestDriver();
    var drive = Drive(a, driver, 40000);
    var session = a.Run.Session;
    Check(session.State == RaceState.Finished && session.Lap == 3, $"3 tur tamamlandı (tur {session.Lap}, {drive.Steps} adım)");
    Check(a.Run.Teleports == 0, "temiz sürüşte piste dönüş yok");
    Check(drive.MaxHeight - drive.MinHeight > 3, $"pist yüksekliği sürüşe girdi ({drive.MinHeight:F2}–{drive.MaxHeight:F2} m)");
    Check(drive.Asphalt > drive.Grass * 20, $"araç çoğunlukla asfaltta ({drive.Asphalt}/{drive.Grass})");
    Check(session.BestLap > 0 && session.BestLap < session.Time / 2.5, "en iyi tur");
    Check(session.Stars == RaceStars.Count("gp", session.Time, a.Run.Event.Stars), "yıldız süreden");
    var expected = a.Vehicles.Reward("gp", 1, session.Stars, 0);
    Check(session.Xp == expected["xp"].N() && session.Money == expected["para"].N() && a.Garage.Balance == session.Money && a.Garage.Xp == session.Xp
      && a.Garage.StarsOf("gp", 1) == session.Stars, "ödül garaja işlendi (TS yarisBitti)");
    string summary = $"gp_1 {session.Time:F2} sn ({RaceSession.FormatTime(session.Time)}), en iyi tur {RaceSession.FormatTime(session.BestLap)}, {session.Stars}★, +{session.Xp} XP +{session.Money} para";

    // Hayalet (TS rekorHayaleti): kayıt kesintisiz, kaydetme kuralı, kayıt gidiş-dönüş, ayrı fizikle adım adım aynı yol.
    Check(!a.Run.Recording.Cut && a.Run.Recording.Count == drive.Steps, $"girdi kaydı kesintisiz ({a.Run.Recording.Count} adım)");
    var ghostRecord = new GhostRecord { Key = session.RecordKey, Car = a.Garage.SelectedCar, RaceType = "gp", Result = session.Time, Inputs = a.Run.Recording, Parts = a.Garage.Equipped(a.Garage.SelectedCar) };
    Check(GhostRecord.ShouldSave(null, session.Time, a.Run.Recording, false), "hayalet kaydedilir");
    GhostRecord loaded = GhostRecord.Restore(CatalogNode.Parse(ghostRecord.Snapshot().ToString()), session.RecordKey)!;
    Check(loaded.Inputs.Count == drive.Steps && loaded.Car == ghostRecord.Car && loaded.Result == session.Time, "hayalet kayıt gidiş-dönüş");
    Check(GhostRecord.Restore(CatalogNode.Parse(ghostRecord.Snapshot().ToString()), "baska") == null, "yanlış anahtarlı hayalet reddedilir");
    var ghostParams = GarageDriveParameters.Create(a.Vehicles, a.Vehicles.Setup(loaded.Car, loaded.Parts), false, loaded.RaceType);
    var ghost = new GhostPlayer(loaded, ghostParams, a.Tracks.Tracks[a.Run.Event.Index], a.Run.Event);
    while (!ghost.Done) ghost.Step();
    Check(ghost.Vehicle.Body.Position.Equals(a.Run.Vehicle.Body.Position) && ghost.Vehicle.Body.Velocity.Equals(a.Run.Vehicle.Body.Velocity), "hayalet ayrı fizikle aynı yolu bitirdi (bit düzeyinde)");

    // Belirlenimcilik: aynı girdiler aynı sonuç (bit düzeyinde).
    var b = Create("gp", 1);
    // İkinci yarışta hayalet oyuncuyla eş adımlı: oyuncunun her fizik adımında bir girdi; geri sayımda bekler.
    b.Run.GhostFactory = () => new GhostPlayer(loaded, ghostParams, b.Tracks.Tracks[b.Run.Event.Index], b.Run.Event); b.Run.StartGhost();
    while (b.Run.Session.State == RaceState.Countdown) b.Run.TickCountdown(1.0 / 60);
    Check(b.Run.Ghost!.Index == 0, "geri sayımda hayalet bekler");
    Drive(b, new RaceTestDriver(), 40000);
    Check(b.Run.Ghost!.Done && b.Run.Ghost.Vehicle.Body.Position.Equals(b.Run.Vehicle.Body.Position), "aynı sürüşte hayalet ve oyuncu aynı noktada bitirdi");
    Check(BitConverter.DoubleToInt64Bits(b.Run.Session.Time) == BitConverter.DoubleToInt64Bits(session.Time) && b.Run.Vehicle.Body.Position.Equals(a.Run.Vehicle.Body.Position), "tekrar koşu bit düzeyinde aynı");

    // Piste dönüş gerçek fizikle: aracı 40 m dışarı koy, 6 sn fren; oturum dönüş noktasına taşır, tur sayılmaz.
    var c = Create("gp", 1);
    while (c.Run.Session.State == RaceState.Countdown) c.Run.TickCountdown(1.0 / 60);
    for (int i = 0; i < 300; i++) c.Run.Step(driver.Input(c.Run));
    var gg = c.Run.World.Geometry; int hi0 = c.Run.World.Hint;
    var off = gg.AtTrack(hi0, 40);
    c.Run.Vehicle.Place(off.X, off.Z, 0);
    int waited = 0;
    while (c.Run.Teleports == 0 && waited < 600) { c.Run.Step(new DrivingInput(0, 1, 0)); waited++; }
    var back = c.Run.Vehicle.ReferencePoint;
    Check(c.Run.Teleports == 1 && waited >= 360 && waited <= 362 && c.Run.Session.Lap == 0, $"1+5 sn sonra piste dönüş ({waited} adım)");
    Check(TrackRules.Locate(gg, back.X, back.Z, c.Run.World.Hint).Distance < 1 && c.Run.World.Surface(back.X, back.Z) == 1, "dönüş noktası pistte, asfalt");
    Check(c.Run.Recording.Cut && !GhostRecord.ShouldSave(null, 100, c.Run.Recording, false), "piste dönüş kaydı keser: hayalet kaydedilmez (TS kesik)");
    Drive(c, driver, 40000);
    Check(c.Run.Session.State == RaceState.Finished && c.Run.Session.Time > 0, "dönüşten sonra yarış bitti");
    Console.WriteLine($"Yarış sürüşü (gerçek fizik + pist dünyası): {summary}; geri sayım 181 kare; yükseklik {drive.MinHeight:F2}–{drive.MaxHeight:F2} m; " +
      $"asfalt/çim adım {drive.Asphalt}/{drive.Grass}; piste dönüş {waited} adımda; {checks} koşul geçti.");
  }
}
