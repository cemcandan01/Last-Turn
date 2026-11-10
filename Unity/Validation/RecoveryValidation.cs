using System.Globalization;
using LastTurn.Core;

// Güvenli piste dönüş ve ters dönme (Cem kararı, 11 Kasım 2026). Ralli/rallikros pist orta çizgisinin her 10 m'sine stok araç
// sıfır hızla konur, tam gazla pist yönünü izleyerek 6 sn sürülür: güvenli noktaların hepsinden ilerlenir; ilerlenemeyen her
// noktadan dönüş güvenli ve ilerlenebilir bir noktaya alınır. Düz türlerde dönüş TS ile aynı. Ters dönen araç 0,5 + 5 sn sonra
// güvenli noktaya konur, HUD sayar. Kanıt: tests/cikti/recovery-proof.json.
internal static class RecoveryValidation
{
  private static int checks;
  private static void Check(bool ok, string label) { checks++; if (!ok) throw new InvalidOperationException("Kurtarma: " + label); }
  private static string F(double v) => v.ToString("0.0", CultureInfo.InvariantCulture);

  public static void Run()
  {
    string root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../.."));
    string Res(string f) => File.ReadAllText(Path.Combine(root, "Assets/LastTurn/Resources/" + f));
    var vehicles = new VehicleCatalog(Res("vehicle-catalog.json")); var tracks = new TrackCatalog(Res("track-catalog.json")); var races = new RaceEventCatalog(Res("race-events.json"));
    var garage = new GarageState(vehicles);
    PowertrainVehicle Car(TrackWorld w, string type) => new PowertrainVehicle(GarageDriveParameters.Create(vehicles, garage.Setup(garage.SelectedCar), false, type), world: w);
    var rows = new List<string>();
    // Duruştan 6 sn tam gaz: pist boyunca kazanılan ilerleme.
    double Climb(PowertrainVehicle v, TrackWorld w, TrackReturnPoint at)
    {
      var g = w.Geometry; v.Place(at.X, at.Z, at.Heading); w.ResetHint(at.X, at.Z);
      double s0 = TrackRules.Locate(g, v.ReferencePoint.X, v.ReferencePoint.Z, w.Hint).Progress;
      for (int k = 0; k < 360; k++)
      {
        var p = v.ReferencePoint; var ahead = g.At(Math.Min(g.Length, TrackRules.Locate(g, p.X, p.Z, w.Hint).Progress + 10));
        var f = v.Body.Orientation.Rotate(new BodyVector(0, 0, 1));
        double d = TrackGeometry.AngleDelta(Math.Atan2(ahead.X - p.X, ahead.Z - p.Z) - Math.Atan2(f.X, f.Z));
        v.Step(new DrivingInput(1, 0, Math.Clamp(d * 2.2, -1, 1)));
      }
      var e = v.ReferencePoint; double gained = TrackRules.Locate(g, e.X, e.Z, w.Hint).Progress - s0;
      if (!g.Open && gained < -g.Length / 2) gained += g.Length;
      return gained;
    }

    int stuckBefore = 0, stuckAfter = 0; double maxSkip = 0;
    foreach (var t in tracks.Tracks)
    {
      var w = new TrackWorld(t); var g = w.Geometry; var rec = new TrackRecovery(w);
      int safe = rec.Safe.Count(x => x);
      if (t.Type != "rl" && t.Type != "rx") { Check(safe == g.N, t.Key + " asfalt/drift/drag türünde her nokta güvenli (dönüş TS ile aynı)"); continue; }
      var v = Car(w, t.Type); int fails = 0, fixedFails = 0, total = 0; double worstSafe = 1e9, skip = 0;
      for (double s = 20; s < g.Length - 50; s += 10)
      {
        var a = g.At(s); var at = new TrackReturnPoint(a.X, a.Z, a.Heading); total++;
        var chosen = rec.Choose(at); bool moved = chosen.X != at.X || chosen.Z != at.Z;
        double gain = g.S[g.Nearest(chosen.X, chosen.Z, 0, true).Index] - s; if (!g.Open && gain < -g.Length / 2) gain += g.Length;
        double raw = moved ? Climb(v, w, at) : double.NaN, got = Climb(v, w, chosen);
        if (!moved) worstSafe = Math.Min(worstSafe, got); else skip = Math.Max(skip, gain);
        if (moved && raw < 15) fails++;
        if (got < 15) { fixedFails++; Console.WriteLine(t.Key + " " + F(s) + " m: dönüş noktasından 6 sn'de yalnız " + F(got) + " m" + (moved ? " (ileri alındı)" : "") + " hız " + F(v.Body.Velocity.Length) + " uzunluk " + F(g.Length)); }
        if (moved) Check(gain > 0, t.Key + " " + F(s) + " m dönüş ileride");
      }
      stuckBefore += fails; stuckAfter += fixedFails; maxSkip = Math.Max(maxSkip, skip);
      rows.Add(string.Create(CultureInfo.InvariantCulture, $"{{\"key\":\"{t.Key}\",\"points\":{total},\"safePct\":{100.0 * safe / g.N:0.0},\"movedStuck\":{fails},\"stuckAfter\":{fixedFails},\"worstSafeGain\":{worstSafe:0.0},\"maxSkip\":{skip:0.0}}}"));
    }
    Check(stuckBefore > 20 && stuckAfter == 0, "eski dönüşte takılan " + stuckBefore + " nokta, yeni dönüşte " + stuckAfter);
    Check(maxSkip <= TrackRecovery.MaxSkip, "en uzun ileri alma " + F(maxSkip) + " m ≤ 300 m");

    // Kapalı pist: çizginin önündeki çamurda takılan araç çizginin ötesine konur ve tur sayılır (rx_6).
    {
      var info = races.Find("rx", 6); var t = tracks.Tracks[info.Index]; var w = new TrackWorld(t); var g = w.Geometry; var v = Car(w, "rx");
      var run = new RaceRun(v, w, info, hint => new RaceSession(info, t, false, hint)); var driver = LastTurn.EditorValidation.RaceTestDriver.For("rx");
      while (run.Session.State == RaceState.Countdown) run.TickCountdown(1 / 60.0);
      int guard = 0; while (!(run.Session.Armed == 1 && g.S[w.Hint] > 900 && g.S[w.Hint] < 960) && guard++ < 60 * 300) { run.Step(driver.Input(run)); driver.RespawnIfStuck(run); }
      Check(run.Session.Armed == 1 && run.Session.Lap == 0, "rx_6 ilk tur sonuna gelindi");
      var mud = g.At(990); v.Place(mud.X, mud.Z, mud.Heading); w.ResetHint(mud.X, mud.Z);
      for (int k = 0; k < 120; k++) run.Step(new DrivingInput(1, 0, 0));
      Check(run.Respawn(), "çamurda elle dönüş"); run.Step(new DrivingInput(1, 0, 0));
      int at = g.Nearest(v.ReferencePoint.X, v.ReferencePoint.Z, 0, true).Index;
      Check(run.Session.Lap == 1 && at < g.N * 0.2, "çizginin ötesine konuldu ve tur sayıldı (tur " + run.Session.Lap + ", nokta " + F(g.S[at]) + " m)");
    }
    // Ters dönme sayacı.
    var c = new FlipCounter(); Check(!c.Step(true, .4) && c.Left == 0, "ilk 0,5 sn sayım yok");
    Check(!c.Step(true, .2) && c.Left == 5, "sonra 5"); c.Step(true, 4.0); Check(c.Left == 1, "1'e iner");
    Check(!c.Step(false, 1 / 60.0) && c.Time == 0, "doğrulunca sıfırlanır");
    c.Clear(); bool fired = false; int steps = 0; while (!fired && steps < 1000) { fired = c.Step(true, 1 / 60.0); steps++; }
    Check(steps == 331, "0,5 + 5 sn'de (331. adım) dönüş: " + steps);

    // Gerçek yarış: rl_2'de araç sırtüstü konur → HUD 5…1 → güvenli noktaya, dik.
    {
      var info = races.Find("rl", 2); var t = tracks.Tracks[info.Index]; var w = new TrackWorld(t); var v = Car(w, "rl");
      var run = new RaceRun(v, w, info, hint => new RaceSession(info, t, false, hint));
      while (run.Session.State == RaceState.Countdown) run.TickCountdown(1 / 60.0);
      for (int k = 0; k < 120; k++) run.Step(new DrivingInput(1, 0, 0));
      var b = v.Body; var fw = b.Orientation.Rotate(new BodyVector(0, 0, 1)); double yaw = Math.Atan2(fw.X, fw.Z);
      typeof(VehicleState).GetProperty("Orientation")!.SetValue(b, BodyRotation.Multiply(BodyRotation.Yaw(yaw), new BodyRotation(0, 0, 1, 0)));
      typeof(VehicleState).GetProperty("Position")!.SetValue(b, b.Position + new BodyVector(0, 1.2, 0));
      typeof(VehicleState).GetProperty("Velocity")!.SetValue(b, new BodyVector(0, 0, 0));
      var seen = new List<string>(); int k2 = 0;
      while (run.Teleports == 0 && k2 < 600) { run.Step(new DrivingInput(0, 0, 0)); k2++; var r = RaceViewModel.Hud(run.Session, w.Hint).Return; if (r != "" && (seen.Count == 0 || seen[^1] != r)) seen.Add(r); }
      Check(run.Teleports == 1 && k2 >= 320 && k2 <= 345, "sırtüstü araç ~5,5 sn sonra dönüşe alındı (" + k2 + " adım)");
      Check(string.Join("|", seen) == "5 · TERS DÖNDÜN|4 · TERS DÖNDÜN|3 · TERS DÖNDÜN|2 · TERS DÖNDÜN|1 · TERS DÖNDÜN", "HUD sayımı: " + string.Join("|", seen));
      Check(!FlipCounter.Flipped(v.Body.Orientation) && run.Recovery.Safe[t.Geometry.Nearest(v.ReferencePoint.X, v.ReferencePoint.Z, 0, true).Index], "dönüşte araç dik ve güvenli noktada");
      for (int k = 0; k < 240; k++) run.Step(new DrivingInput(1, 0, 0));
      Check(v.Body.Velocity.Length > 5, "dönüşten sonra sürülebilir (" + F(v.Body.Velocity.Length) + " m/s)");
    }

    // Elle ↺: yokuşta takılan araç ileride güvenli noktaya.
    {
      var info = races.Find("rl", 8); var t = tracks.Tracks[info.Index]; var w = new TrackWorld(t); var g = w.Geometry; var v = Car(w, "rl");
      var run = new RaceRun(v, w, info, hint => new RaceSession(info, t, false, hint));
      while (run.Session.State == RaceState.Countdown) run.TickCountdown(1 / 60.0);
      int hill = Enumerable.Range(0, g.N).First(i => g.S[i] > 280 && !run.Recovery.Safe[i]);
      v.Place(g.X[hill], g.Z[hill], Math.Atan2(g.Tx[hill], g.Tz[hill])); w.ResetHint(g.X[hill], g.Z[hill]);
      for (int k = 0; k < 360; k++) run.Step(new DrivingInput(1, 0, 0));
      double before = TrackRules.Locate(g, v.ReferencePoint.X, v.ReferencePoint.Z, w.Hint).Progress;
      Check(run.Respawn(), "elle dönüş");
      double after = TrackRules.Locate(g, v.ReferencePoint.X, v.ReferencePoint.Z, w.Hint).Progress;
      Check(after > before && run.Recovery.Safe[g.Nearest(v.ReferencePoint.X, v.ReferencePoint.Z, 0, true).Index], "rl_8 yokuşunda elle dönüş ileride güvenli noktaya (" + F(before) + " → " + F(after) + " m)");
      Check(run.Session.Previous == g.Nearest(v.ReferencePoint.X, v.ReferencePoint.Z, 0, true).Index, "oturum ipucu konulan yerden");
      // Hızlı giden araç elle ↺ ile ileri alınamaz (TS gibi en yakın noktaya; yol kısaltılamaz).
      int ramp = Enumerable.Range(0, g.N).First(i => g.S[i] > 600 && !run.Recovery.Safe[i]);
      v.Place(g.X[ramp], g.Z[ramp], Math.Atan2(g.Tx[ramp], g.Tz[ramp])); w.ResetHint(g.X[ramp], g.Z[ramp]);
      typeof(VehicleState).GetProperty("Velocity")!.SetValue(v.Body, v.Body.Orientation.Rotate(new BodyVector(0, 0, 15)));
      Check(run.Respawn(), "hızlı elle dönüş");
      int near = g.Nearest(v.ReferencePoint.X, v.ReferencePoint.Z, 0, true).Index;
      Check(Math.Abs(g.S[near] - g.S[ramp]) < 6, "15 m/s'de elle dönüş yerinde kalır (" + F(g.S[ramp]) + " → " + F(g.S[near]) + " m)");
    }

    string json = "{\"result\":\"recovery-passed\",\"checks\":" + checks + ",\"stuckBefore\":" + stuckBefore + ",\"stuckAfter\":" + stuckAfter + ",\"maxSkip\":" + F(maxSkip) + ",\"tracks\":[" + string.Join(",", rows) + "]}";
    string outDir = Path.GetFullPath(Path.Combine(root, "../tests/cikti")); Directory.CreateDirectory(outDir); File.WriteAllText(Path.Combine(outDir, "recovery-proof.json"), json);
    Console.WriteLine("Kurtarma: " + checks + " kontrol geçti; eski dönüşte takılan " + stuckBefore + " nokta → 0; en uzun ileri alma " + F(maxSkip) + " m");
  }
}
