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
  // Yalnız ayrı grafik Editor'da yol kenarı direkleri ve viraj levhaları (bütün yarış pistleri, kaynak pist dünyasının üstünde):
  // rl_2'de aynı otomatik sürücüyle iki gerçek zamanlı geçiş (öğeler kapalı / açık) fizik izi bit düzeyinde aynı olmalı;
  // her pist türünde ve gece koşulunda öğeler kurulur, çarpışmasızdır, sürüş karesi alınır; kare süresi ve çizim ölçülür.
  [InitializeOnLoad]
  public static class RoadsideMarkersPlayValidation
  {
    private const string Active = "LastTurn.RoadsideMarkers.Active", PathKey = "LastTurn.RoadsideMarkers.Path";
    [Serializable] private sealed class Source { public string path, hash; }
    [Serializable] private sealed class Pass { public string name; public int frames, physicsSteps, posts, chevrons, skipped; public float meanMs, p95Ms, p99Ms, batches, triangles; public string finalBits; }
    [Serializable] private sealed class Proof { public string result, error, utc; public List<string> checks = new List<string>(), images = new List<string>(), notes = new List<string>(), runtimeErrors = new List<string>(), editorDiagnostics = new List<string>(); public List<Pass> passes = new List<Pass>(); public Source[] sources; }
    private static Proof proof; private static readonly List<Action> steps = new List<Action>(); private static int index; private static double began;
    private static EditorWindow game; private static object group; private static int originalSize; private static readonly List<int> sizes = new List<int>();
    private static readonly List<(string Path, DateTime After)> pending = new List<(string, DateTime)>();
    private static string Project => Path.GetDirectoryName(Application.dataPath);
    private static GtPrototype P => UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    static RoadsideMarkersPlayValidation() { EditorApplication.playModeStateChanged += Changed; }
    public static void StartGameView()
    {
      if (Application.isBatchMode || Application.productName != "LastTurnUiValidation" || Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") < 0) throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
      GarageSceneBuilder.Open(); SessionState.SetString(PathKey, Path.Combine(Project, "Logs/RoadsideMarkers/" + Guid.NewGuid().ToString("N"))); SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if (s == PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active, false)) { proof = new Proof(); steps.Clear(); index = 0; began = EditorApplication.timeSinceStartup; Application.logMessageReceived += Logged; EditorApplication.update += Tick; }
      if (s == PlayModeStateChange.ExitingPlayMode) { Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; }
    }
    private static void Logged(string message, string stack, LogType type)
    { if (type != LogType.Error && type != LogType.Exception && type != LogType.Assert) return; if (stack.Contains("UnityEditor.") && !stack.Contains("LastTurn.")) proof.editorDiagnostics.Add(message); else proof.runtimeErrors.Add(message + "\n" + stack); }
    private static void Check(bool ok, string label) { if (!ok) throw new InvalidOperationException(label); proof.checks.Add(label); }
    private static void Do(Action a) => steps.Add(a);
    private static void Wait(Func<bool> ready) { Do(() => { if (!ready()) index--; }); }
    private static string Hash(string path) { using (var h = SHA256.Create()) return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-", ""); }
    private static string F(double v) => v.ToString("0.###", CultureInfo.InvariantCulture);

    private static RaceTestDriver driver; private static double clock; private static int stuck, nextShot, stepsDone; private static Pass pass; private static List<float> ms; private static double batches, tris;

    private static void Start(string key, bool markers, RaceConditions conditions)
    {
      Do(() => { RoadsideMarkers.Enabled = markers; if (SceneManager.GetActiveScene().name != "Garage") GameFlow.LeaveDrive(); });
      Wait(() => SceneManager.GetActiveScene().name == "Garage" && GarageSession.State != null);
      Do(() => { GameFlow.Conditions = conditions; Check(TestPanelActions.StartRace(key), "Yarış açıldı: " + key + " (" + conditions.Label + ")"); });
      Wait(() => P && P.Race != null && P.Simulation != null && SceneManager.GetActiveScene().name != "Garage");
      Do(() => { P.ManualStepping = true; driver = RaceTestDriver.For(key.Split('_')[0]); while (P.Race.Session.State == RaceState.Countdown) P.StepRace(driver.Countdown(P.Race)); clock = EditorApplication.timeSinceStartup; stuck = 0; });
    }
    /// Gerçek zamanlı sürüş; shots yarış saniyelerinde 1280 karesi.
    private static void Drive(string key, string label, bool markers, RaceConditions conditions, float seconds, params float[] shots)
    {
      Start(key, markers, conditions);
      Do(() =>
      {
        nextShot = 0; stepsDone = 0; ms = new List<float>(); batches = tris = 0;
        var m = P.Markers; pass = new Pass { name = key + "-" + label, posts = m ? m.Posts : 0, chevrons = m ? m.Chevrons : 0, skipped = m ? m.Skipped : 0 };
        Check((m != null) == markers, key + " kenar öğeleri " + (markers ? "kuruldu" : "kapalı"));
        if (!markers) return;
        bool straight = key.StartsWith("dg", StringComparison.Ordinal);
        // İki yanı duvarlı şehir sokak pisti ve tribünlü drag pistinde öğe yeri yoktur: hepsi atlanır.
        if (RaceConditions.ThemeOf(key) == "city" || straight) Check(m.Posts == 0 && m.Chevrons == 0 && m.Skipped > 10, key + ": duvarlı pistte öğe yok (" + m.Skipped + " yer duvar üstünde)");
        else
        {
          Check(m.Posts > 20 && (straight || m.Chevrons > 0), key + ": " + m.Posts + " direk, " + m.Chevrons + " viraj levhası (" + m.Skipped + " yer engel/yol üstünde olduğu için atlandı)");
          Check(m.Skipped < m.Posts, key + ": atlanan öğe kurulanlardan az");
        }
        Check(m.GetComponentsInChildren<Collider>(true).Length == 0, key + ": kenar öğelerinde collider yok");
      });
      Wait(() =>
      {
        var run = P.Race; double now = EditorApplication.timeSinceStartup;
        int n = Math.Min(6, (int)((now - clock) / PowertrainVehicle.FixedDelta)); clock += n * PowertrainVehicle.FixedDelta; if (now - clock > .2) clock = now;
        for (int k = 0; k < n && run.Session.State == RaceState.Running && run.Session.Time < seconds; k++)
        {
          P.StepRace(driver.Input(run)); stepsDone++;
          stuck = run.Vehicle.Body.Velocity.Length < 1 ? stuck + 1 : 0; if (stuck > 180) { P.RespawnRace(); stuck = 0; }
        }
        if (stepsDone > 30) { ms.Add(Time.unscaledDeltaTime * 1000); batches += UnityStats.batches; tris += UnityStats.triangles; }
        if (nextShot < shots.Length && run.Session.Time >= shots[nextShot])
        {
          Queue("p17-markers-" + key + "-" + label + "-" + shots[nextShot].ToString("00", CultureInfo.InvariantCulture) + "-1280.png"); nextShot++;
        }
        return run.Session.Time >= seconds || run.Session.State != RaceState.Running;
      });
      Do(() =>
      {
        var b = P.Race.Vehicle.Body; pass.physicsSteps = stepsDone; pass.frames = ms.Count;
        var sorted = ms.OrderBy(x => x).ToList(); pass.meanMs = sorted.Average(); pass.p95Ms = sorted[(int)(sorted.Count * .95)]; pass.p99Ms = sorted[(int)(sorted.Count * .99)];
        pass.batches = (float)(batches / ms.Count); pass.triangles = (float)(tris / ms.Count);
        pass.finalBits = string.Join(",", new[] { b.Position.X, b.Position.Y, b.Position.Z, b.Velocity.X, b.Velocity.Z }.Select(v => BitConverter.DoubleToInt64Bits(v).ToString(CultureInfo.InvariantCulture)));
        proof.passes.Add(pass);
      });
    }
    private static RaceConditions Day(string key) => RaceConditions.DefaultFor(RaceConditions.ThemeOf(key));

    private static void Setup()
    {
      string basePath = SessionState.GetString(PathKey, ""); string settings = Path.Combine(basePath, "settings"); Directory.CreateDirectory(settings);
      PlayerPreferences.Directory = settings; PlayerPreferences.Reload(); GarageSession.Open(Path.Combine(basePath, "garage.json")); GarageState.AdminMode = true; GameFlow.MainMenu(); Size(1280, 720);
      // Fizik: aynı sürüş öğeler kapalı/açık.
      Drive("rl_2", "once", false, Day("rl_2"), 30, 8, 20, 29);
      Drive("rl_2", "sonra", true, Day("rl_2"), 30, 8, 20, 29);
      Do(() =>
      {
        var a = proof.passes[0]; var b = proof.passes[1];
        Check(a.finalBits == b.finalBits && a.physicsSteps == b.physicsSteps, "İki geçişte fizik izi bit düzeyinde aynı (" + a.physicsSteps + " adım): kenar öğeleri fiziğe dokunmaz");
        proof.notes.Add("rl_2 kare süresi önce ort " + F(a.meanMs) + " / p95 " + F(a.p95Ms) + " / p99 " + F(a.p99Ms) + " ms; sonra " + F(b.meanMs) + " / " + F(b.p95Ms) + " / " + F(b.p99Ms) + " ms (Editor)");
        proof.notes.Add("rl_2 çizim önce " + F(a.batches) + " batch / " + F(a.triangles / 1000) + " bin üçgen; sonra " + F(b.batches) + " / " + F(b.triangles / 1000));
        Check(b.p95Ms < 33.4f, "Öğeler açıkken p95 kare süresi 30 FPS sınırının altında (" + F(b.p95Ms) + " ms; Editor)");
      });
      // Her tür ve gece/yağmur: kurulum, collider yok, sürüş karesi.
      foreach (var key in new[] { "rl_5", "gp_2", "gp_5", "rx_3", "dp_4", "dg_1" }) Drive(key, "gun", true, Day(key), 14, 6, 13);
      Drive("rl_5", "gece", true, new RaceConditions { TimeOfDay = "evening", Weather = "rain", Night = true }, 14, 6, 13);
      Do(() => Check(P.Conditions.Night, "Gece koşulu uygulandı"));
      Do(() => { RoadsideMarkers.Enabled = true; GameFlow.LeaveDrive(); });
      Wait(() => SceneManager.GetActiveScene().name == "Garage");
      Wait(() => pending.All(p => File.Exists(p.Path) && File.GetLastWriteTimeUtc(p.Path) >= p.After));
      Do(() => { foreach (var p in pending) proof.images.Add(Path.GetFileName(p.Path)); Check(proof.runtimeErrors.Count == 0, "LastTurn çalışma Console hatası yok"); Finish(null); });
    }
    private static void Queue(string name) { string path = Path.Combine(Project, "Logs/" + name); ScreenCapture.CaptureScreenshot(path); pending.Add((path, DateTime.UtcNow)); }
    private static void Size(int w, int h)
    {
      var a = typeof(EditorWindow).Assembly; var t = a.GetType("UnityEditor.GameView"); if (!game) { game = EditorWindow.GetWindow(t); originalSize = (int)t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).GetValue(game); }
      var st = a.GetType("UnityEditor.GameViewSizes"); var singleton = typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null); group = st.GetMethod("GetGroup").Invoke(singleton, new object[] { GameViewSizeGroupType.Standalone });
      int n = (int)group.GetType().GetMethod("GetTotalCount").Invoke(group, null); var size = Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"), new object[] { Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"), "FixedResolution"), w, h, "Kenar" }); group.GetType().GetMethod("AddCustomSize").Invoke(group, new[] { size }); sizes.Add(n);
      t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, n); game.Show(); game.Repaint();
    }
    private static void Tick()
    {
      try { if (proof.runtimeErrors.Count > 0) throw new Exception(proof.runtimeErrors[0]); if (EditorApplication.timeSinceStartup - began > 900) throw new TimeoutException("Kenar öğeleri Play"); if (steps.Count == 0) { if (EditorApplication.timeSinceStartup - began < 2) return; Setup(); return; } if (index < steps.Count) steps[index++](); }
      catch (Exception e) { Finish(e); }
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active, false); Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; GarageState.AdminMode = false; RoadsideMarkers.Enabled = true;
      if (game && group != null) { game.GetType().GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, originalSize); foreach (int n in sizes.AsEnumerable().Reverse()) group.GetType().GetMethod("RemoveCustomSize").Invoke(group, new object[] { n }); }
      proof.result = e == null ? "p17-markers-passed" : "failed"; proof.error = e?.ToString() ?? ""; proof.utc = DateTime.UtcNow.ToString("O");
      proof.sources = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories).Where(f => Path.GetExtension(f) == ".cs" || Path.GetExtension(f) == ".uss").OrderBy(f => f, StringComparer.Ordinal).Select(f => new Source { path = f.Substring(Project.Length + 1).Replace('\\', '/'), hash = Hash(f) }).ToArray();
      File.WriteAllText(Path.Combine(Project, "Logs/p17-markers-play.json"), JsonUtility.ToJson(proof, true));
      if (e != null) Debug.LogException(e); else Debug.Log("Kenar öğeleri Play geçti: " + proof.checks.Count); EditorApplication.Exit(e == null ? 0 : 1);
    }
  }
}
