using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;

namespace LastTurn.EditorValidation
{
  // Yalnız ayrı grafik Editor'da ralli kamerası: aynı pist/araç/otomatik sürücü girdisiyle gerçek zamanlı iki geçiş (eski mutlak
  // y ≥ 1 tabanı, sonra zemin tabanı). Oyun kamerasının açısı her karede, aynı fizik izi 30/60/120 FPS kamera takvimleriyle
  // gölge kameralarda örneklenir. Aynı yarış saniyelerinde kare alınır; video değil, zamanlı karelerdir.
  [InitializeOnLoad]
  public static class CameraPlayValidation
  {
    private const string Active = "LastTurn.Camera.Active", PathKey = "LastTurn.Camera.Path";
    [Serializable] private sealed class Source { public string path, hash; }
    [Serializable] private sealed class Pass { public string track, floor; public float duration, maxPitch, maxPitchAt, minPitch, steepPct, longestSteep, maxRise, minGround, maxSlope, maxCarPitch; public int frames, airFrames, respawns, flooredFrames; public List<string> steepMoments = new List<string>(); }
    [Serializable] private sealed class Shadow { public string track; public float legacyMax, legacySteepPct, legacyLongest, fixed30Max, fixed60Max, fixed120Max, fixedSteepPct, fixedLongest, fpsGap, fpsP95, fpsEnd; public int steps; }
    [Serializable] private sealed class Proof { public string result, error, utc; public List<string> checks = new List<string>(), images = new List<string>(), runtimeErrors = new List<string>(), editorDiagnostics = new List<string>(); public List<Pass> passes = new List<Pass>(); public List<Shadow> shadows = new List<Shadow>(); public Source[] sources; }
    private static Proof proof; private static readonly List<Action> steps = new List<Action>(); private static int index; private static double began, at;
    private static EditorWindow game; private static object group; private static int originalSize; private static readonly List<int> sizes = new List<int>();
    private static readonly List<(string Path, DateTime After)> pending = new List<(string, DateTime)>();
    private static readonly StringBuilder telemetry = new StringBuilder();
    private static string Project => Path.GetDirectoryName(Application.dataPath);
    private static GtPrototype P => UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    static CameraPlayValidation() { EditorApplication.playModeStateChanged += Changed; }
    public static void StartGameView()
    {
      if (Application.isBatchMode || Application.productName != "LastTurnUiValidation" || Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") < 0) throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Önce Play durmalı.");
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
      GarageSceneBuilder.Open(); SessionState.SetString(PathKey, Path.Combine(Project, "Logs/Camera/" + Guid.NewGuid().ToString("N"))); SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if (s == PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active, false)) { proof = new Proof(); steps.Clear(); index = 0; began = at = EditorApplication.timeSinceStartup; Application.logMessageReceived += Logged; EditorApplication.update += Tick; }
      if (s == PlayModeStateChange.ExitingPlayMode) { Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; }
    }
    private static void Logged(string message, string stack, LogType type)
    { if (type != LogType.Error && type != LogType.Exception && type != LogType.Assert) return; if (stack.Contains("UnityEditor.Search.") && !stack.Contains("LastTurn.")) proof.editorDiagnostics.Add(message); else proof.runtimeErrors.Add(message + "\n" + stack); }
    private static void Check(bool ok, string label) { if (!ok) throw new InvalidOperationException(label); proof.checks.Add(label); }
    private static void Do(Action a) => steps.Add(a);
    private static void Wait(Func<bool> ready) { Do(() => { if (!ready()) index--; }); }
    private static string Hash(string path) { using (var h = SHA256.Create()) return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-", ""); }
    private static string F(double v) => v.ToString("0.###", CultureInfo.InvariantCulture);

    private static bool Ready(string type) { var p = P; return p && p.Race != null && p.Simulation != null && p.Race.Event.Type == type && SceneManager.GetActiveScene().name != "Garage"; }
    private static void Start(string key)
    {
      Do(() => { if (SceneManager.GetActiveScene().name != "Garage") GameFlow.LeaveDrive(); });
      Wait(() => SceneManager.GetActiveScene().name == "Garage" && GarageSession.State != null);
      Do(() => Check(TestPanelActions.StartRace(key), "Yarış açıldı: " + key + " " + TestPanelActions.Error));
      Wait(() => Ready(key.Split('_')[0]));
      Do(() =>
      {
        P.ManualStepping = true; driver = RaceTestDriver.For(key.Split('_')[0]);
        while (P.Race.Session.State == RaceState.Countdown) P.StepRace(driver.Countdown(P.Race));
        clock = EditorApplication.timeSinceStartup; stuck = 0;
      });
    }

    // ---------- gerçek zamanlı sürüş ve ölçüm
    private static RaceTestDriver driver; private static double clock; private static int stuck; private static float steepSince = -1, longest;
    private static float Pct(List<float> a) => 100f * a.Skip(30).Count(p => p > 30) / Math.Max(1, a.Count - 30);
    private static int Longest(List<float> a) { int run = 0, best = 0; foreach (var p in a.Skip(30)) { run = p > 30 ? run + 1 : 0; best = Math.Max(best, run); } return best; }
    private static Pass pass; private static List<float> pitches;
    private static ChaseCamera legacy60, fixed30, fixed60, fixed120; private static List<float> l60, f30, f60, f120; private static Vector3 lastOrigin; private static int physicsSteps;
    private static readonly float[] ShotTimes = { 6, 12, 18, 24, 30, 36, 42, 48, 54 };
    private static int nextShot; private static string label;

    private static (Vector3 O, Vector3 F) Pose()
    {
      var b = P.Simulation.Body; var f = b.Orientation.Rotate(new BodyVector(0, 0, 1));
      return (GtPresentation.Position(b.Position), new Vector3((float)-f.X, 0, (float)f.Z));
    }
    private static double Ground(double ux, double uz) => P.RaceWorld.Height(-ux, uz);
    private static float Pitch((double X, double Y, double Z, double TX, double TY, double TZ) p) => (float)ChaseCamera.Pitch(p);
    private static void ShadowStep()
    {
      var (o, f) = Pose(); float speed = (float)P.Simulation.Body.Velocity.Length; physicsSteps++;
      Func<double, double, double> flat = (x, z) => 0, real = Ground;
      l60.Add(Pitch(legacy60.Step(o.x, o.y, o.z, f.x, f.z, speed, 1.0 / 60, 0, false, flat)));
      f60.Add(Pitch(fixed60.Step(o.x, o.y, o.z, f.x, f.z, speed, 1.0 / 60, 0, false, real)));
      var mid = Vector3.Lerp(lastOrigin, o, .5f);
      f120.Add(Pitch(fixed120.Step(mid.x, mid.y, mid.z, f.x, f.z, speed, 1.0 / 120, 0, false, real)));
      f120.Add(Pitch(fixed120.Step(o.x, o.y, o.z, f.x, f.z, speed, 1.0 / 120, 0, false, real)));
      if (physicsSteps % 2 == 0) f30.Add(Pitch(fixed30.Step(o.x, o.y, o.z, f.x, f.z, speed, 1.0 / 30, 0, false, real)));
      lastOrigin = o;
    }

    private static void Drive(string key, bool legacyFloor, float seconds, bool shadows, bool shots)
    {
      Start(key);
      Do(() =>
      {
        P.FollowCamera.LegacyAbsoluteFloor = legacyFloor; P.FollowCamera.ResetFollow();
        pass = new Pass { track = key, floor = legacyFloor ? "eski mutlak y>=1" : "zemin+1", minPitch = 90, minGround = 999 }; pitches = new List<float>(); nextShot = 0; steepSince = -1; longest = 0; label = key + "-" + (legacyFloor ? "once" : "sonra");
        if (shadows) { legacy60 = new ChaseCamera(); fixed30 = new ChaseCamera(); fixed60 = new ChaseCamera(); fixed120 = new ChaseCamera(); l60 = new List<float>(); f30 = new List<float>(); f60 = new List<float>(); f120 = new List<float>(); physicsSteps = 0; lastOrigin = Pose().O; }
      });
      Wait(() =>
      {
        var run = P.Race; double now = EditorApplication.timeSinceStartup;
        int n = Math.Min(6, (int)((now - clock) / PowertrainVehicle.FixedDelta)); clock += n * PowertrainVehicle.FixedDelta; if (now - clock > .2) clock = now;
        for (int k = 0; k < n && run.Session.State == RaceState.Running; k++)
        {
          P.StepRace(driver.Input(run)); if (shadows) ShadowStep();
          stuck = run.Vehicle.Body.Velocity.Length < 1 ? stuck + 1 : 0;
          if (stuck > 180) { P.RespawnRace(); pass.respawns++; stuck = 0; if (shadows) { legacy60.Reset(); fixed30.Reset(); fixed60.Reset(); fixed120.Reset(); lastOrigin = Pose().O; } }
        }
        Sample();
        if (shots && nextShot < ShotTimes.Length && run.Session.Time >= ShotTimes[nextShot]) { Queue("p9-camera-" + label + "-" + ShotTimes[nextShot].ToString("00", CultureInfo.InvariantCulture) + "-1280.png"); nextShot++; }
        return run.Session.Time >= seconds || run.Session.State != RaceState.Running;
      });
      Do(() =>
      {
        pass.frames = pitches.Count; var settled = pitches.Skip(20).ToList(); pass.steepPct = 100f * settled.Count(p => p > 30) / Math.Max(1, settled.Count); pass.duration = (float)P.Race.Session.Time; pass.longestSteep = longest;
        proof.passes.Add(pass);
        if (shadows)
        {
          var gaps = new List<float>(); for (int i = 0; i < f30.Count && 2 * i + 1 < f60.Count && 4 * i + 3 < f120.Count; i++) gaps.Add(Math.Max(Math.Abs(f30[i] - f60[2 * i + 1]), Math.Abs(f120[4 * i + 3] - f60[2 * i + 1])));
          float gap = gaps.Max(), p95 = gaps.OrderBy(g => g).ElementAt((int)(gaps.Count * .95)), end = gaps.Skip(gaps.Count - 30).Max();
          var sh = new Shadow { track = key, steps = physicsSteps, legacyMax = l60.Skip(30).Max(), fixed30Max = f30.Skip(15).Max(), fixed60Max = f60.Skip(30).Max(), fixed120Max = f120.Skip(60).Max(), fpsGap = gap,
            legacySteepPct = Pct(l60), legacyLongest = Longest(l60) / 60f, fixedSteepPct = Pct(f60), fixedLongest = Longest(f60) / 60f, fpsP95 = p95, fpsEnd = end };
          proof.shadows.Add(sh);
          Check(sh.fixedSteepPct < 2 && sh.fixedLongest < 1 && Longest(f30) / 30f < 1 && Longest(f120) / 120f < 1, key + " gölge kamera 30/60/120 FPS'de kalıcı dik bakmaz: dik %" + F(sh.fixedSteepPct) + ", en uzun " + F(sh.fixedLongest) + " sn, en dik " + F(sh.fixed30Max) + "/" + F(sh.fixed60Max) + "/" + F(sh.fixed120Max) + "°");
          Check(sh.fpsP95 < 1 && sh.fpsEnd < .5f, key + " 30/60/120 FPS açı birikmesi yok: %95 fark " + F(sh.fpsP95) + "°, son saniye " + F(sh.fpsEnd) + "°, anlık en büyük " + F(sh.fpsGap) + "°");
          Check(sh.legacyMax > 35 && sh.legacySteepPct > 5 * Math.Max(.1f, sh.fixedSteepPct), key + " aynı izde eski taban dik aşağı bakar: en dik " + F(sh.legacyMax) + "°, dik %" + F(sh.legacySteepPct) + ", en uzun " + F(sh.legacyLongest) + " sn");
        }
      });
    }
    private static void Sample()
    {
      var cam = P.FollowCamera.transform; var b = P.Simulation.Body; var f = b.Orientation.Rotate(new BodyVector(0, 0, 1));
      float camPitch = -Mathf.Asin(Mathf.Clamp(cam.forward.y, -1, 1)) * Mathf.Rad2Deg, carPitch = (float)(Math.Asin(Math.Max(-1, Math.Min(1, f.Y))) * 180 / Math.PI);
      double hx = Math.Sqrt(f.X * f.X + f.Z * f.Z) > .01 ? f.X / Math.Sqrt(f.X * f.X + f.Z * f.Z) : 0, hz = Math.Sqrt(f.X * f.X + f.Z * f.Z) > .01 ? f.Z / Math.Sqrt(f.X * f.X + f.Z * f.Z) : 1;
      double g = P.RaceWorld.Height(b.Position.X, b.Position.Z), slope = Math.Atan2(P.RaceWorld.Height(b.Position.X + hx * 1.6, b.Position.Z + hz * 1.6) - P.RaceWorld.Height(b.Position.X - hx * 1.6, b.Position.Z - hz * 1.6), 3.2) * 180 / Math.PI;
      double camGround = Ground(cam.position.x, cam.position.z); bool air = !b.Wheels.Any(w => w.Contact); float rise = cam.position.y - (float)b.Position.Y;
      float t = (float)P.Race.Session.Time; pitches.Add(camPitch);
      if (pitches.Count > 20)
      {
        if (camPitch > 30) { if (steepSince < 0) { steepSince = t; if (pass.steepMoments.Count < 12) pass.steepMoments.Add(F(t) + " sn: kamera " + F(camPitch) + "°, " + (air ? "havada" : "yerde") + ", eğim " + F(slope) + "°, gövde " + F(carPitch) + "°, zemin " + F(g) + " m, taban " + (P.FollowCamera.Chase.Floored ? "itti" : "yok")); } longest = Math.Max(longest, t - steepSince); }
        else steepSince = -1;
        if (camPitch > pass.maxPitch) { pass.maxPitch = camPitch; pass.maxPitchAt = t; }
        pass.minPitch = Math.Min(pass.minPitch, camPitch); pass.maxRise = Math.Max(pass.maxRise, rise);
      }
      pass.minGround = Math.Min(pass.minGround, (float)g); pass.maxSlope = Math.Max(pass.maxSlope, Math.Abs((float)slope)); pass.maxCarPitch = Math.Max(pass.maxCarPitch, Math.Abs(carPitch));
      if (air) pass.airFrames++; if (P.FollowCamera.Chase.Floored) pass.flooredFrames++;
      telemetry.Append(string.Join(",", label, F(t), F(P.RaceWorld.Geometry.Project(b.Position.X, b.Position.Z, P.RaceWorld.Hint).S), F(g), F(slope), F(carPitch), air ? 1 : 0, F(cam.position.y), F(camGround), F(camPitch), F(rise), P.FollowCamera.Chase.Floored ? 1 : 0)).Append('\n');
    }

    // ---------- akış
    private static void Setup()
    {
      string basePath = SessionState.GetString(PathKey, ""); string settings = Path.Combine(basePath, "settings"); Directory.CreateDirectory(settings);
      PlayerPreferences.Directory = settings; PlayerPreferences.Reload();
      GarageSession.Open(Path.Combine(basePath, "garage.json")); GarageState.AdminMode = true; GameFlow.MainMenu();
      telemetry.Append("gecis,t,s,zemin,egimDer,aracPitchDer,havada,kameraY,kameraAltiZemin,kameraPitchDer,kameraAracUstu,tabanItti\n");
      Do(() => { Size(1280, 720); Check(PlayerPreferences.Current.Camera == 0, "Varsayılan yakın takip kamerası"); });
      foreach (var key in new[] { "rl_2", "rl_5" })
      {
        Drive(key, true, 55, false, true);
        Do(() => { var p = proof.passes.Last(); Check(p.maxPitch > 35, key + " gerçek sürüşte eski kamera dik aşağı bakar: " + F(p.maxPitch) + "° (" + F(p.maxPitchAt) + " sn), çukur " + F(p.minGround) + " m"); });
        Drive(key, false, 55, true, true);
        Do(() =>
        {
          var p = proof.passes.Last(); var old = proof.passes[proof.passes.Count - 2];
          Check(p.steepPct < 2 && p.longestSteep < 1 && old.steepPct > 5 * Math.Max(.1f, p.steepPct), key + " gerçek sürüşte yeni kamera kalıcı dik bakmaz: dik kare %" + F(p.steepPct) + " (eski %" + F(old.steepPct) + "), en uzun " + F(p.longestSteep) + " sn (eski " + F(old.longestSteep) + "), en dik " + F(p.maxPitch) + "° (eski " + F(old.maxPitch) + "°)");
          Check(p.minPitch > -5 && p.maxRise < 10, key + " kamera yukarı devrilmez ve araca yakın kalır (en az " + F(p.minPitch) + "°, en yüksek " + F(p.maxRise) + " m)");
          Check(Math.Abs(p.minGround - old.minGround) < .5f, key + " iki geçiş aynı pist kesitinden geçti (en düşük zemin " + F(old.minGround) + "/" + F(p.minGround) + ")");
        });
        // Aynı an, aynı durum: yalnız taban farklı (1920).
        Do(() => { Size(1920, 1080); P.FollowCamera.LegacyAbsoluteFloor = true; });
        Wait(() => Settle(30)); Do(() => Queue("p9-camera-" + key + "-ayni-an-once-1920.png")); Wait(() => Settle(5));
        Do(() => { P.FollowCamera.LegacyAbsoluteFloor = false; }); Wait(() => Settle(30)); Do(() => Queue("p9-camera-" + key + "-ayni-an-sonra-1920.png")); Wait(() => Settle(5));
        // Piste dönüş ve yeniden başlatma: kamera durumu sıfırlanır, açı normal.
        Do(() => { Size(1280, 720); P.RespawnRace(); Check(P.FollowCamera.Chase.Initialized, key + " piste dönüşte kamera aynı karede yeniden oturur"); });
        Wait(() => Settle(10)); Do(() => Check(CamPitch() > 3 && CamPitch() < 30, key + " piste dönüş sonrası açı normal: " + F(CamPitch())));
        Do(() => P.RestartRace()); Wait(() => Settle(10)); Do(() => Check(CamPitch() > 3 && CamPitch() < 30, key + " yeniden başlatma sonrası açı normal: " + F(CamPitch())));
      }
      // Diğer türler kısa kontrol: yeni taban düz zeminde eskisiyle aynı davranır.
      foreach (var key in new[] { "gp_1", "rx_1", "dp_1", "dg_1" })
      {
        Drive(key, false, 8, false, false);
        Do(() => { var p = proof.passes.Last(); Check(p.steepPct < 2 && p.minPitch > 0, key + " kamera açısı normal (" + F(p.minPitch) + "–" + F(p.maxPitch) + "°, dik %" + F(p.steepPct) + ")"); });
      }
      Do(() => { P.FollowCamera.LegacyAbsoluteFloor = false; GameFlow.LeaveDrive(); });
      Wait(() => SceneManager.GetActiveScene().name == "Garage");
      Wait(() => pending.All(p => File.Exists(p.Path) && File.GetLastWriteTimeUtc(p.Path) >= p.After));
      Do(() =>
      {
        foreach (var p in pending) { var png = new Texture2D(2, 2); try { png.LoadImage(File.ReadAllBytes(p.Path)); Check(png.width >= 1280 && png.height >= 720, "PNG " + Path.GetFileName(p.Path)); } finally { UnityEngine.Object.DestroyImmediate(png); } proof.images.Add(Path.GetFileName(p.Path)); }
        Check(proof.runtimeErrors.Count == 0, "LastTurn çalışma Console hatası yok");
        Finish(null);
      });
    }
    private static int settle;
    private static bool Settle(int frames) { if (++settle < frames) return false; settle = 0; return true; }
    private static float CamPitch() => -Mathf.Asin(Mathf.Clamp(P.FollowCamera.transform.forward.y, -1, 1)) * Mathf.Rad2Deg;
    private static void Queue(string name) { string path = Path.Combine(Project, "Logs/" + name); ScreenCapture.CaptureScreenshot(path); pending.Add((path, DateTime.UtcNow)); }
    private static void Size(int w, int h)
    {
      var a = typeof(EditorWindow).Assembly; var t = a.GetType("UnityEditor.GameView"); if (!game) { game = EditorWindow.GetWindow(t); originalSize = (int)t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).GetValue(game); }
      var st = a.GetType("UnityEditor.GameViewSizes"); var singleton = typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null); group = st.GetMethod("GetGroup").Invoke(singleton, new object[] { GameViewSizeGroupType.Standalone });
      int n = (int)group.GetType().GetMethod("GetTotalCount").Invoke(group, null); var size = Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"), new object[] { Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"), "FixedResolution"), w, h, "Kamera" }); group.GetType().GetMethod("AddCustomSize").Invoke(group, new[] { size }); sizes.Add(n);
      t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, n); game.Show(); game.Repaint();
    }
    private static void Tick()
    {
      try { if (proof.runtimeErrors.Count > 0) throw new Exception(proof.runtimeErrors[0]); if (EditorApplication.timeSinceStartup - began > 840) throw new TimeoutException("Kamera Play"); if (steps.Count == 0) { if (EditorApplication.timeSinceStartup - began < 2) return; Setup(); return; } if (index < steps.Count) steps[index++](); }
      catch (Exception e) { Finish(e); }
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active, false); Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; GarageState.AdminMode = false;
      if (game && group != null) { game.GetType().GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, originalSize); foreach (int n in sizes.AsEnumerable().Reverse()) group.GetType().GetMethod("RemoveCustomSize").Invoke(group, new object[] { n }); }
      proof.result = e == null ? "p9-camera-passed" : "failed"; proof.error = e?.ToString() ?? ""; proof.utc = DateTime.UtcNow.ToString("O");
      proof.sources = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories).Where(f => Path.GetExtension(f) == ".cs" || Path.GetExtension(f) == ".uss").OrderBy(f => f, StringComparer.Ordinal).Select(f => new Source { path = f.Substring(Project.Length + 1).Replace('\\', '/'), hash = Hash(f) }).ToArray();
      File.WriteAllText(Path.Combine(Project, "Logs/p9-camera-play.json"), JsonUtility.ToJson(proof, true)); File.WriteAllText(Path.Combine(Project, "Logs/p9-camera-telemetry.csv"), telemetry.ToString());
      if (e != null) Debug.LogException(e); else Debug.Log("Kamera Play geçti: " + proof.checks.Count); EditorApplication.Exit(e == null ? 0 : 1);
    }
  }
}
