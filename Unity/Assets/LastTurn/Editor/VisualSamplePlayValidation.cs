using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;

namespace LastTurn.EditorValidation
{
  // Yalnız ayrı grafik Editor'da ilk görsel örnek (rl_2 Orman Etabı): aynı otomatik sürücüyle gerçek zamanlı iki geçiş
  // (örnek kapalı / açık), aynı yarış saniyelerinde 1280 ve 1920 kareleri, kare süresi ve çizim istatistiği; iki geçişin
  // fizik izi bit düzeyinde aynı olmalı (görsel katman fiziğe dokunmaz). rl_1'de örnek uygulanmaz.
  [InitializeOnLoad]
  public static class VisualSamplePlayValidation
  {
    private const string Active = "LastTurn.VisualSample.Active", PathKey = "LastTurn.VisualSample.Path";
    [Serializable] private sealed class Source { public string path, hash; }
    [Serializable] private sealed class Pass { public string name; public int frames, physicsSteps, posts, chevrons, trees, rocks; public float meanMs, p95Ms, p99Ms, maxMs, batches, triangles, setPass, minCamPitch, maxCamPitch; public string finalBits; }
    [Serializable] private sealed class Proof { public string result, error, utc; public List<string> checks = new List<string>(), images = new List<string>(), notes = new List<string>(), runtimeErrors = new List<string>(), editorDiagnostics = new List<string>(); public List<Pass> passes = new List<Pass>(); public Source[] sources; }
    private static Proof proof; private static readonly List<Action> steps = new List<Action>(); private static int index; private static double began;
    private static EditorWindow game; private static object group; private static int originalSize; private static readonly List<int> sizes = new List<int>();
    private static readonly List<(string Path, DateTime After)> pending = new List<(string, DateTime)>();
    private static string Project => Path.GetDirectoryName(Application.dataPath);
    private static GtPrototype P => UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    static VisualSamplePlayValidation() { EditorApplication.playModeStateChanged += Changed; }
    public static void StartGameView()
    {
      if (Application.isBatchMode || Application.productName != "LastTurnUiValidation" || Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") < 0) throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
      GarageSceneBuilder.Open(); SessionState.SetString(PathKey, Path.Combine(Project, "Logs/VisualSample/" + Guid.NewGuid().ToString("N"))); SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if (s == PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active, false)) { proof = new Proof(); steps.Clear(); index = 0; began = EditorApplication.timeSinceStartup; Application.logMessageReceived += Logged; EditorApplication.update += Tick; }
      if (s == PlayModeStateChange.ExitingPlayMode) { Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; }
    }
    private static void Logged(string message, string stack, LogType type)
    { if (type != LogType.Error && type != LogType.Exception && type != LogType.Assert) return; if (stack.Contains("UnityEditor.Search.") && !stack.Contains("LastTurn.")) proof.editorDiagnostics.Add(message); else proof.runtimeErrors.Add(message + "\n" + stack); }
    private static void Check(bool ok, string label) { if (!ok) throw new InvalidOperationException(label); proof.checks.Add(label); }
    private static void Do(Action a) => steps.Add(a);
    private static void Wait(Func<bool> ready) { Do(() => { if (!ready()) index--; }); }
    private static string Hash(string path) { using (var h = SHA256.Create()) return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-", ""); }
    private static string F(double v) => v.ToString("0.###", CultureInfo.InvariantCulture);

    private static RaceTestDriver driver; private static double clock; private static int stuck, nextShot, stepsDone; private static Pass pass; private static List<float> ms; private static double batches, tris, setPass;
    private static readonly float[] ShotTimes = { 5, 11, 17, 23, 29, 35 };
    private static readonly float[] BigShots = { 11, 23 };
    private static string label;

    private static void Start(string key, bool sample)
    {
      Do(() => { RallyVisualSample.Enabled = sample; if (SceneManager.GetActiveScene().name != "Garage") GameFlow.LeaveDrive(); });
      Wait(() => SceneManager.GetActiveScene().name == "Garage" && GarageSession.State != null);
      Do(() => Check(TestPanelActions.StartRace(key), "Yarış açıldı: " + key));
      Wait(() => P && P.Race != null && P.Simulation != null && SceneManager.GetActiveScene().name != "Garage");
      Do(() => { P.ManualStepping = true; driver = RaceTestDriver.For(key.Split('_')[0]); while (P.Race.Session.State == RaceState.Countdown) P.StepRace(driver.Countdown(P.Race)); clock = EditorApplication.timeSinceStartup; stuck = 0; });
    }
    private static void Drive(string key, bool sample, float seconds)
    {
      Start(key, sample);
      Do(() =>
      {
        label = sample ? "sonra" : "once"; nextShot = 0; stepsDone = 0; ms = new List<float>(); batches = tris = setPass = 0;
        var s = P.VisualSample; pass = new Pass { name = key + "-" + label, minCamPitch = 90, posts = s ? s.Posts : 0, chevrons = s ? s.Chevrons : 0, trees = s ? s.Trees : 0, rocks = s ? s.Rocks : 0 };
        Check((s != null) == sample, key + " örnek " + (sample ? "uygulandı" : "kapalı"));
        if (sample) Check(s.Trees > 300 && s.Rocks > 100 && s.Posts > 50 && s.Chevrons > 3 && RenderSettings.fog, "Örnek içerik: " + s.Trees + " ağaç, " + s.Rocks + " kaya, " + s.Posts + " direk, " + s.Chevrons + " viraj levhası, sis");
      });
      Wait(() =>
      {
        var run = P.Race; double now = EditorApplication.timeSinceStartup;
        // 1920 karesi: sürüş durur, çözünürlük değişir, kare alınır, sürüş kaldığı yerden sürer.
        if (freezeAt > 0)
        {
          frames++;
          if (frames == 12) Queue("p9-visual-" + label + "-" + freezeAt.ToString("00", CultureInfo.InvariantCulture) + "-1920.png");
          if (frames >= 16) { Size(1280, 720); freezeAt = 0; frames = 0; clock = now; }
          return false;
        }
        int n = Math.Min(6, (int)((now - clock) / PowertrainVehicle.FixedDelta)); clock += n * PowertrainVehicle.FixedDelta; if (now - clock > .2) clock = now;
        for (int k = 0; k < n && run.Session.State == RaceState.Running && run.Session.Time < seconds; k++)
        {
          P.StepRace(driver.Input(run)); stepsDone++;
          stuck = run.Vehicle.Body.Velocity.Length < 1 ? stuck + 1 : 0; if (stuck > 180) { P.RespawnRace(); stuck = 0; }
        }
        if (stepsDone > 30) { ms.Add(Time.unscaledDeltaTime * 1000); batches += UnityStats.batches; tris += UnityStats.triangles; setPass += UnityStats.setPassCalls; }
        float pitch = -Mathf.Asin(Mathf.Clamp(P.FollowCamera.transform.forward.y, -1, 1)) * Mathf.Rad2Deg; if (stepsDone > 60) { pass.minCamPitch = Math.Min(pass.minCamPitch, pitch); pass.maxCamPitch = Math.Max(pass.maxCamPitch, pitch); }
        if (nextShot < ShotTimes.Length && run.Session.Time >= ShotTimes[nextShot])
        {
          float t = ShotTimes[nextShot]; nextShot++;
          if (BigShots.Contains(t)) { freezeAt = t; frames = 0; Size(1920, 1080); return false; }
          Queue("p9-visual-" + label + "-" + t.ToString("00", CultureInfo.InvariantCulture) + "-1280.png");
        }
        return run.Session.Time >= seconds || run.Session.State != RaceState.Running;
      });
      Do(() =>
      {
        var b = P.Race.Vehicle.Body; pass.physicsSteps = stepsDone; pass.frames = ms.Count;
        var sorted = ms.OrderBy(x => x).ToList(); pass.meanMs = sorted.Average(); pass.p95Ms = sorted[(int)(sorted.Count * .95)]; pass.p99Ms = sorted[(int)(sorted.Count * .99)]; pass.maxMs = sorted.Last();
        pass.batches = (float)(batches / ms.Count); pass.triangles = (float)(tris / ms.Count); pass.setPass = (float)(setPass / ms.Count);
        pass.finalBits = string.Join(",", new[] { b.Position.X, b.Position.Y, b.Position.Z, b.Velocity.X, b.Velocity.Z }.Select(v => BitConverter.DoubleToInt64Bits(v).ToString(CultureInfo.InvariantCulture)));
        proof.passes.Add(pass);
      });
    }
    private static float freezeAt; private static int frames;

    private static void Setup()
    {
      string basePath = SessionState.GetString(PathKey, ""); string settings = Path.Combine(basePath, "settings"); Directory.CreateDirectory(settings);
      PlayerPreferences.Directory = settings; PlayerPreferences.Reload(); GarageSession.Open(Path.Combine(basePath, "garage.json")); GarageState.AdminMode = true; GameFlow.MainMenu(); Size(1280, 720);
      foreach (bool sample in new[] { false, true }) Drive("rl_2", sample, 40);
      Do(() =>
      {
        var a = proof.passes[0]; var b = proof.passes[1];
        Check(a.finalBits == b.finalBits && a.physicsSteps == b.physicsSteps, "İki geçişte fizik izi bit düzeyinde aynı (" + a.physicsSteps + " adım): görsel örnek fiziğe dokunmaz");
        proof.notes.Add("Kare süresi önce ort " + F(a.meanMs) + " / p95 " + F(a.p95Ms) + " / p99 " + F(a.p99Ms) + " ms; sonra ort " + F(b.meanMs) + " / p95 " + F(b.p95Ms) + " / p99 " + F(b.p99Ms) + " ms");
        proof.notes.Add("Çizim: önce " + F(a.batches) + " batch / " + F(a.setPass) + " SetPass / " + F(a.triangles / 1000) + " bin üçgen; sonra " + F(b.batches) + " / " + F(b.setPass) + " / " + F(b.triangles / 1000));
        Check(b.p95Ms < 33.4f, "Örnekte p95 kare süresi 30 FPS sınırının altında (" + F(b.p95Ms) + " ms; Editor ölçümü)");
        Check(b.minCamPitch > 3 && b.maxCamPitch < 30, "Kamera açısı normal (" + F(b.minCamPitch) + "–" + F(b.maxCamPitch) + "°)");
      });
      // Başka pistte örnek yok ve ortam ayarları geri döner.
      Start("rl_1", true);
      Do(() => Check(P.VisualSample == null && !RenderSettings.fog, "rl_1'de örnek uygulanmaz, sis kapalı"));
      Do(() => { RallyVisualSample.Enabled = true; GameFlow.LeaveDrive(); });
      Wait(() => SceneManager.GetActiveScene().name == "Garage");
      Wait(() => pending.All(p => File.Exists(p.Path) && File.GetLastWriteTimeUtc(p.Path) >= p.After));
      Do(() => { foreach (var p in pending) proof.images.Add(Path.GetFileName(p.Path)); Check(proof.runtimeErrors.Count == 0, "LastTurn çalışma Console hatası yok"); Finish(null); });
    }
    private static void Queue(string name) { string path = Path.Combine(Project, "Logs/" + name); ScreenCapture.CaptureScreenshot(path); pending.Add((path, DateTime.UtcNow)); }
    private static void Size(int w, int h)
    {
      var a = typeof(EditorWindow).Assembly; var t = a.GetType("UnityEditor.GameView"); if (!game) { game = EditorWindow.GetWindow(t); originalSize = (int)t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).GetValue(game); }
      var st = a.GetType("UnityEditor.GameViewSizes"); var singleton = typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null); group = st.GetMethod("GetGroup").Invoke(singleton, new object[] { GameViewSizeGroupType.Standalone });
      int n = (int)group.GetType().GetMethod("GetTotalCount").Invoke(group, null); var size = Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"), new object[] { Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"), "FixedResolution"), w, h, "Görsel" }); group.GetType().GetMethod("AddCustomSize").Invoke(group, new[] { size }); sizes.Add(n);
      t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, n); game.Show(); game.Repaint();
    }
    private static void Tick()
    {
      try { if (proof.runtimeErrors.Count > 0) throw new Exception(proof.runtimeErrors[0]); if (EditorApplication.timeSinceStartup - began > 600) throw new TimeoutException("Görsel örnek Play"); if (steps.Count == 0) { if (EditorApplication.timeSinceStartup - began < 2) return; Setup(); return; } if (index < steps.Count) steps[index++](); }
      catch (Exception e) { Finish(e); }
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active, false); Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; GarageState.AdminMode = false; RallyVisualSample.Enabled = true;
      if (game && group != null) { game.GetType().GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, originalSize); foreach (int n in sizes.AsEnumerable().Reverse()) group.GetType().GetMethod("RemoveCustomSize").Invoke(group, new object[] { n }); }
      proof.result = e == null ? "p9-visual-passed" : "failed"; proof.error = e?.ToString() ?? ""; proof.utc = DateTime.UtcNow.ToString("O");
      proof.sources = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories).Where(f => Path.GetExtension(f) == ".cs" || Path.GetExtension(f) == ".uss").OrderBy(f => f, StringComparer.Ordinal).Select(f => new Source { path = f.Substring(Project.Length + 1).Replace('\\', '/'), hash = Hash(f) }).ToArray();
      File.WriteAllText(Path.Combine(Project, "Logs/p9-visual-play.json"), JsonUtility.ToJson(proof, true));
      if (e != null) Debug.LogException(e); else Debug.Log("Görsel örnek Play geçti: " + proof.checks.Count); EditorApplication.Exit(e == null ? 0 : 1);
    }
  }
}
