using LastTurn.Core;

// Ralli kamerası: takip kamerası bütün ralli pistlerinde orta çizgi boyunca (yokuş/iniş/tepe/sıçrama rampası) eski mutlak
// y ≥ 1 tabanı ve TS zemin tabanıyla sürülür; 30/60/120 FPS'de açı birikmesi ve sıfırlama sınanır. Kanıt: tests/cikti/camera-proof.json.
internal static class CameraValidation
{
  public static void Run()
  {
    string root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../.."));
    string Res(string f) => File.ReadAllText(Path.Combine(root, "Assets/LastTurn/Resources/" + f));
    var tracks = new TrackCatalog(Res("track-catalog.json"));
    int checks = 0;
    void Check(bool ok, string label) { checks++; if (!ok) throw new Exception("Kamera: " + label); }
    var rows = new List<string>();
    const double Speed = 25;

    // Bir pistin orta çizgisini sabit hızda sür: (pitch dizisi, en düşük zemin, tabanın ittiği örnek sayısı, kameranın araca yüksekliği).
    (double[] Pitch, double MinGround, int Floored, double MaxRise) Drive(TrackWorld w, int fps, bool legacy, int mode = 0)
    {
      var cam = new ChaseCamera(); double dt = 1.0 / fps, len = w.Geometry.Length; int n = (int)(len / Speed * fps);
      var pitch = new double[n]; double minGround = double.MaxValue, maxRise = 0; int floored = 0;
      Func<double, double, double> ground = legacy ? (x, z) => 0 : (x, z) => w.Height(-x, z);
      for (int i = 0; i < n; i++)
      {
        double s = i * dt * Speed; var a = w.Geometry.At(s); var b = w.Geometry.At(Math.Min(len, s + 1));
        double h = w.Height(a.X, a.Z); minGround = Math.Min(minGround, h);
        // TS → Unity: x yansır.
        var p = cam.Step(-a.X, h + .35, a.Z, -(b.X - a.X), b.Z - a.Z, Speed, dt, mode, false, ground);
        pitch[i] = ChaseCamera.Pitch(p); if (cam.Floored) floored++; maxRise = Math.Max(maxRise, p.Y - (h + .35));
      }
      return (pitch, minGround, floored, maxRise);
    }

    double worstLegacy = 0, worstNew = 0, worstFps = 0;
    foreach (var t in tracks.Tracks.Where(t => t.Type == "rl"))
    {
      var w = new TrackWorld(t);
      var legacy = Drive(w, 60, true); var fixedCam = Drive(w, 60, false);
      var f30 = Drive(w, 30, false); var f120 = Drive(w, 120, false);
      // Aynı zaman noktalarında FPS farkı (60 FPS örneği her 2./yarım örnekte eşleşir).
      double fpsGap = 0;
      for (int i = 0; i < f30.Pitch.Length && 2 * i < fixedCam.Pitch.Length && 4 * i < f120.Pitch.Length; i++)
        fpsGap = Math.Max(fpsGap, Math.Max(Math.Abs(f30.Pitch[i] - fixedCam.Pitch[2 * i]), Math.Abs(f120.Pitch[4 * i] - fixedCam.Pitch[2 * i])));
      double lMax = legacy.Pitch.Skip(30).Max(), nMax = fixedCam.Pitch.Skip(30).Max(), nMin = fixedCam.Pitch.Skip(30).Min();
      int lSteep = legacy.Pitch.Count(p => p > 30), nSteep = fixedCam.Pitch.Count(p => p > 30);
      rows.Add(string.Create(System.Globalization.CultureInfo.InvariantCulture, $"{{\"key\":\"{t.Key}\",\"name\":\"{t.Name}\",\"minGround\":{legacy.MinGround:0.00},\"legacyMaxPitch\":{lMax:0.0},\"legacySteepPct\":{100.0 * lSteep / legacy.Pitch.Length:0.0},\"legacyMaxRise\":{legacy.MaxRise:0.0},\"fixedMaxPitch\":{nMax:0.0},\"fixedMinPitch\":{nMin:0.0},\"fixedSteepPct\":{100.0 * nSteep / fixedCam.Pitch.Length:0.0},\"fixedMaxRise\":{fixedCam.MaxRise:0.0},\"floored\":{fixedCam.Floored},\"fpsGapDeg\":{fpsGap:0.000}}}"));
      worstLegacy = Math.Max(worstLegacy, lMax); worstNew = Math.Max(worstNew, nMax); worstFps = Math.Max(worstFps, fpsGap);
      Check(nMax < 30 && nSteep == 0, t.Key + " yeni kamera 30°'den dik bakmaz: " + nMax.ToString("0.0"));
      Check(nMin > -5, t.Key + " yeni kamera yukarı devrilmez: " + nMin.ToString("0.0"));
      Check(fixedCam.MaxRise < 9, t.Key + " kamera aracın üstünde makul yükseklikte: " + fixedCam.MaxRise.ToString("0.0"));
      Check(fpsGap < 1.5, t.Key + " 30/60/120 FPS açı farkı küçük: " + fpsGap.ToString("0.00"));
      if (legacy.MinGround < -3) Check(lMax > 35, t.Key + " eski taban çukurda dik aşağı bakar (hata yeniden üretildi): " + lMax.ToString("0.0"));
    }
    Check(worstLegacy > 45 && worstNew < 30, "Ralli: eski en dik " + worstLegacy.ToString("0.0") + "°, yeni " + worstNew.ToString("0.0") + "°");

    // Düz zeminli türlerde (rx/dg) davranış birebir aynı: zemin 0 iken iki taban eşdeğer.
    foreach (var t in tracks.Tracks.Where(t => t.Type == "rx" || t.Type == "dg").Take(4))
    {
      var w = new TrackWorld(t); var a = Drive(w, 60, true); var b = Drive(w, 60, false);
      Check(a.Pitch.Zip(b.Pitch, (x, y) => Math.Abs(x - y)).Max() < 1e-9, t.Key + " düz türde eski/yeni aynı");
    }
    // Uzak takip de aynı tabanı kullanır.
    var deep = tracks.Tracks.Where(t => t.Type == "rl").Select(t => new TrackWorld(t)).OrderBy(w => Drive(w, 60, true).MinGround).First();
    Check(Drive(deep, 60, false, 1).Pitch.Skip(30).Max() < 30, "Uzak takip ralli çukurunda da dik bakmaz");

    // Sıfırlama: biriken durum kalmaz; ilk kare hedefe oturur (yarış başlangıcı/piste dönüş).
    var c = new ChaseCamera(); Func<double, double, double> flat = (x, z) => 0;
    for (int i = 0; i < 300; i++) c.Step(0, 40 - i * .2, i * .4, 0, 1, 25, 1.0 / 60, 0, false, flat);
    c.Reset(); var first = c.Step(100, 3, 100, 1, 0, 0, 1.0 / 60, 0, false, flat);
    Check(Math.Abs(c.Yaw - Math.PI / 2) < 1e-9 && Math.Abs(c.Vertical - 3) < 1e-9 && Math.Abs(ChaseCamera.Pitch(first) - ChaseCamera.Pitch(new ChaseCamera().Step(0, 3, 0, 1, 0, 0, 1.0 / 60, 0, false, flat))) < 1e-9, "Sıfırlama sonrası önceki yön/yükseklik taşınmaz");
    // Sıçrama: 3 m yükselip inen araçta açı iniş sonrası düz değerine döner (birikme yok).
    var j = new ChaseCamera(); double baseline = ChaseCamera.Pitch(j.Step(0, .35, 0, 0, 1, 25, 1.0 / 60, 0, false, flat)), after = 0;
    for (int i = 1; i < 600; i++) { double tt = i / 60.0, y = .35 + (tt > 1 && tt < 2 ? 3 * Math.Sin((tt - 1) * Math.PI) : 0); after = ChaseCamera.Pitch(j.Step(0, y, tt * 25, 0, 1, 25, 1.0 / 60, 0, false, flat)); }
    Check(Math.Abs(after - baseline) < .01, "Sıçrama/iniş sonrası açı düz değerine döner: " + (after - baseline).ToString("0.0000"));

    string outDir = Path.GetFullPath(Path.Combine(root, "../tests/cikti")); Directory.CreateDirectory(outDir);
    File.WriteAllText(Path.Combine(outDir, "camera-proof.json"), "{\"speed\":" + Speed + ",\"tracks\":[\n" + string.Join(",\n", rows) + "\n]}\n");
    Console.WriteLine($"Kamera: {checks} kontrol; {rows.Count} ralli pisti, eski en dik {worstLegacy:0.0}° → yeni {worstNew:0.0}°, 30/60/120 FPS en büyük fark {worstFps:0.00}°.");
  }
}
