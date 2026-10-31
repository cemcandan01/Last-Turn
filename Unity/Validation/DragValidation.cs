using LastTurn.Core;

// Drag'e özel manuel vites ve kalkış (Cem kararı; TS'de yok). Gerçek fizik: dg_1 kariyer aracı; otomatik referansla
// uygun/erken/geç/hiç vites, düşük/bant/yüksek kalkış devri, reddedilen istekler, kesici, hayalet tekrarı, 8 drag pisti.
internal static class DragValidation
{
  private static int checks;
  private static void Check(bool ok, string label) { checks++; if (!ok) throw new InvalidOperationException("Drag: " + label); }

  public sealed class Result { public bool Finished; public double Time, Trap, T20, MaxSlip; public int Up, Down, Rejected, Steps; public RaceRun Run = null!; }

  /// launch: geri sayımda tutulacak devir (0: gaz yok); shift: vites → geçiş devri (null: hiç); lateHold: eşikte bekleme (adım).
  public static Result Drive(VehicleCatalog vehicles, TrackCatalog tracks, RaceEventInfo info, bool manual, double launch,
    Func<PowertrainParameters, int, double>? shift, int lateHold = 0, Func<int, int>? extraShift = null, bool analog = false, int car = -1, string level = "norm")
  {
    var track = tracks.Tracks[info.Index]; if (car < 0) car = (int)vehicles.CareerRule(info.Type, info.Level)["arac"].N();
    var p = GarageDriveParameters.Create(vehicles, vehicles.Setup(car, Array.Empty<string>(), level), false, info.Type); p.ManualGearbox = manual;
    var world = new TrackWorld(track); var v = new PowertrainVehicle(p, world: world);
    var run = new RaceRun(v, world, info, hint => new RaceSession(info, track, true, hint));
    while (run.Session.State == RaceState.Countdown)
      run.TickCountdown(1.0 / 60, new DrivingInput(launch > 0 && v.Engine.Rpm < launch ? 1 : 0, 0, 0, false, false));
    var r = new Result { Run = run }; int atLimit = 0; double z0 = v.ReferencePoint.Z;
    while (run.Session.State == RaceState.Running && r.Steps < 6000)
    {
      int s = 0; var e = v.Engine;
      if (manual && shift != null && e.Gear < 6 && e.ShiftTimer <= 0)
      {
        double at = shift(p, e.Gear);
        atLimit = e.Rpm >= at ? atLimit + 1 : 0;
        if (atLimit > lateHold) { s = 1; atLimit = 0; }
      }
      if (extraShift != null && extraShift(r.Steps) != 0) s = extraShift(r.Steps);
      run.Step(new DrivingInput(1, 0, 0, analog, false, false, s)); r.Steps++;
      if (Environment.GetEnvironmentVariable("DRAG_DEBUG") != null && manual && r.Steps % 20 == 0) Console.WriteLine($"  {r.Steps} vites {v.Engine.Gear} devir {v.Engine.Rpm:F0} bağlı {v.Engine.CoupledRpm:F0} tutma {v.Engine.LaunchHold:F0} hız {v.Body.Velocity.Length * 3.6:F0} tork {v.Engine.EngineTorque:F0} eşik {(shift != null ? shift(p, v.Engine.Gear) : 0):F0}");
      if (r.T20 == 0 && v.ReferencePoint.Z - z0 >= 20) r.T20 = run.Session.Time;
      if (r.Steps <= 120) foreach (var w in v.Body.Wheels) r.MaxSlip = Math.Max(r.MaxSlip, Math.Abs(w.Kappa));
    }
    r.Finished = run.Session.State == RaceState.Finished; r.Time = run.Session.Time; r.Trap = run.Session.Trap ?? 0;
    r.Up = v.ShiftsUp; r.Down = v.ShiftsDown; r.Rejected = v.RejectedShifts;
    return r;
  }

  public static void Run()
  {
    string unity = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..");
    string Res(string n) => File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", n));
    var vehicles = new VehicleCatalog(Res("vehicle-catalog.json")); var tracks = new TrackCatalog(Res("track-catalog.json")); var races = new RaceEventCatalog(Res("race-events.json"));
    var dg1 = races.Find("dg", 1); int dgCar = (int)vehicles.CareerRule("dg", 1)["arac"].N();
    var probe = GarageDriveParameters.Create(vehicles, vehicles.Setup(dgCar, Array.Empty<string>()), false, "dg");
    var band = DragGearAdvisor.LaunchBand(probe); double mid = (band.Low + band.High) / 2;
    Func<PowertrainParameters, int, double> best = (p, g) => DragGearAdvisor.ShiftRpm(p, g);
    string Line(string name, Result r) => $"{name}: {(r.Finished ? "bitti" : "KALDI")} {r.Time:F3} sn, tuzak {r.Trap:F0} km/sa, 20 m {r.T20:F3} sn, kalkış kayması {r.MaxSlip:F2}, vites yukarı {r.Up} aşağı {r.Down} red {r.Rejected}";
    var auto = Drive(vehicles, tracks, dg1, false, 0, null);
    var opt = Drive(vehicles, tracks, dg1, true, mid, best);
    var early = Drive(vehicles, tracks, dg1, true, mid, (p, g) => .75 * best(p, g));
    var late = Drive(vehicles, tracks, dg1, true, mid, (p, g) => p.MaxRpm * .99, 15);
    var never = Drive(vehicles, tracks, dg1, true, mid, null);
    var low = Drive(vehicles, tracks, dg1, true, 0, best);
    var high = Drive(vehicles, tracks, dg1, true, probe.MaxRpm * 1.05, best);
    foreach (var (n, r) in new[] { ("otomatik (TS referans)", auto), ("manuel uygun", opt), ("erken (%75)", early), ("geç (kesicide 0,25 sn)", late), ("hiç vites yok", never), ("kalkış rölanti", low), ("kalkış kesici", high) })
      Console.WriteLine(Line(n, r));
    Check(new[] { auto, opt, early, late, low, high }.All(r => r.Finished), "otomatik ve manuel senaryolar biter");
    Check(opt.Time < early.Time && opt.Time < late.Time && (!never.Finished || opt.Time < never.Time), "uygun vites erken/geç/hiç vitesten hızlı (yalnız fizikten)");
    Check(opt.Up > 0 && never.Up == 0 && never.Trap < opt.Trap, "hiç vites yoksa tuzak hızı düşük (kesici)");
    Check(low.T20 > opt.T20 && high.T20 > opt.T20, "rölantide ve kesicide kalkış ilk 20 m'de yavaş");
    // Analog gaz (ileride mobil pedal): TS tuş kalkış sınırlayıcısı yok; patinaj lastik fiziğinden.
    // Güçlü drag aracı (9, 1200 hp), TCS'siz (real): kalkış devri patinajı ve süreyi belirler (lastik fiziği).
    var strong = GarageDriveParameters.Create(vehicles, vehicles.Setup(9, Array.Empty<string>(), "real"), false, "dg"); var sb = DragGearAdvisor.LaunchBand(strong);
    var rows = new[] { ("rölanti", 0.0), ("bant alt", sb.Low), ("bant orta", (sb.Low + sb.High) / 2), ("bant üst", sb.High), ("kesici", strong.MaxRpm * 1.0) }
      .Select(x => (x.Item1, Drive(vehicles, tracks, dg1, true, x.Item2, best, analog: true, car: 9, level: "real"))).ToArray();
    foreach (var (n, r) in rows) Console.WriteLine(Line("araç 9 real analog kalkış " + n, r));
    Check(rows.All(x => x.Item2.Finished) && rows[4].Item2.MaxSlip > rows[1].Item2.MaxSlip, "güçlü araçta yüksek kalkış devri daha çok patinaj");
    // Reddedilen istekler: geçiş sürerken yeniden yukarı, 1. viteste aşağı, 6. viteste yukarı.
    var reject = Drive(vehicles, tracks, dg1, true, mid, null, 0, n => n < 3 ? 1 : 0);
    Check(reject.Up == 1 && reject.Rejected == 2, $"geçiş sırasındaki istek reddedilir (yukarı {reject.Up} red {reject.Rejected})");
    var p6 = GarageDriveParameters.Create(vehicles, vehicles.Setup(14, Array.Empty<string>()), false, "dg"); p6.ManualGearbox = true;
    var v6 = new PowertrainVehicle(p6); for (int i = 0; i < 5; i++) for (int k = 0; k < 40; k++) v6.Step(new DrivingInput(1, 0, 0, false, false, false, k == 0 ? 1 : 0));
    Check(v6.Engine.Gear == 6, "6. vitese çıkılır");
    int before = v6.RejectedShifts; v6.Step(new DrivingInput(1, 0, 0, false, false, false, 1));
    Check(v6.Engine.Gear == 6 && v6.RejectedShifts == before + 1, "6. viteste yukarı reddedilir");
    var v1 = new PowertrainVehicle(p6); v1.Step(new DrivingInput(1, 0, 0, false, false, false, -1));
    Check(v1.Engine.Gear == 1 && v1.RejectedShifts == 1, "1. viteste aşağı reddedilir");
    // Yüksek hızda düşürme: devir kesiciye çıkar, tork kesilir (ceza/hasar yok, yalnız fizik).
    var vd = new PowertrainVehicle(p6);
    for (int k = 0; k < 900; k++) vd.Step(new DrivingInput(1, 0, 0, false, false, false, k % 120 == 0 && k < 600 ? 1 : 0));
    int g0 = vd.Engine.Gear;
    for (int k = 0; k < 3; k++) { vd.Step(new DrivingInput(1, 0, 0, false, false, false, -1)); for (int j = 0; j < 8; j++) vd.Step(new DrivingInput(1, 0, 0, false, false)); }
    Check(vd.Engine.Gear < g0 && (vd.Engine.EngineTorque <= 0 || vd.Engine.CoupledRpm >= p6.MaxRpm * .99), $"yüksek hızda düşürme kesiciye ({vd.Engine.CoupledRpm:F0}/{p6.MaxRpm:F0} devir, tork {vd.Engine.EngineTorque:F0})");
    // Otomatik kipte vites girdisi yok sayılır (drag dışı türler etkilenmez).
    var pa = GarageDriveParameters.Create(vehicles, vehicles.Setup(10, Array.Empty<string>()), false, "gp");
    var a1 = new PowertrainVehicle(pa); var a2 = new PowertrainVehicle(pa);
    for (int k = 0; k < 600; k++) { a1.Step(new DrivingInput(1, 0, .2, false, false)); a2.Step(new DrivingInput(1, 0, .2, false, false, false, k % 7 == 0 ? 1 : -1)); }
    Check(a1.Body.Position.Equals(a2.Body.Position) && a1.Engine.Gear == a2.Engine.Gear && a2.RejectedShifts == 0, "otomatikte vites girdisi etkisiz (bit düzeyinde)");
    // Hayalet: vites girdileri ve kalkış devri kayıtta; ayrı fizikte aynı yol.
    var rec = new GhostRecord { Key = opt.Run.Session.RecordKey, Car = dgCar, RaceType = "dg", Result = opt.Time, Inputs = opt.Run.Recording,
      Manual = true, StartGas = opt.Run.StartGas, StartRpm = opt.Run.StartRpm, StartHold = opt.Run.StartHold };
    GhostRecord loaded = GhostRecord.Restore(CatalogNode.Parse(rec.Snapshot().ToString()), rec.Key)!;
    var gpar = GarageDriveParameters.Create(vehicles, vehicles.Setup(loaded.Car, loaded.Parts), false, "dg"); gpar.ManualGearbox = loaded.Manual;
    var ghost = new GhostPlayer(loaded, gpar, tracks.Tracks[dg1.Index], dg1); while (!ghost.Done) ghost.Step();
    Check(loaded.Inputs.Count == opt.Steps && ghost.Vehicle.Body.Position.Equals(opt.Run.Vehicle.Body.Position) && ghost.Vehicle.ShiftsUp == opt.Up, "hayalet vites girdileriyle aynı yol (bit düzeyinde)");
    // 8 drag pisti: manuel uygun vitesle biter; otomatik referansla karşılaştırma.
    foreach (var e in races.Events.Where(x => x.Type == "dg"))
    {
      var m = Drive(vehicles, tracks, e, true, mid, best); var au = Drive(vehicles, tracks, e, false, 0, null);
      Check(m.Finished && au.Finished, e.Key + " biter");
      Console.WriteLine($"dg_{e.Level}: manuel {m.Time:F3} sn ({RaceStars.Count("dg", m.Time, e.Stars)}★, tuzak {m.Trap:F0}) · otomatik {au.Time:F3} sn ({RaceStars.Count("dg", au.Time, e.Stars)}★)");
    }
    Console.WriteLine($"Drag manuel vites: {checks} koşul geçti; kalkış bandı {band.Low:F0}–{band.High:F0} devir, 1→2 geçiş {DragGearAdvisor.ShiftRpm(probe, 1):F0} devir (azami {probe.MaxRpm:F0}).");
  }
}
