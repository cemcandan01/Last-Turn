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
  // Yalnız ayrı grafik Editor'da güvenli piste dönüş ve ters dönme (Cem kararı, 11 Kasım 2026): rl_2'de araç gerçek yarışta
  // sırtüstü konur, HUD 5…1 sayar (kareler), 0,5 + 5 sn sonra güvenli noktaya dik konur ve sürülür; rl_8 yokuşunda takılan araç
  // elle ↺ ile ileride güvenli noktaya alınır. Gerçek zamanlı, gerçek HUD.
  [InitializeOnLoad]
  public static class RecoveryPlayValidation
  {
    private const string Active = "LastTurn.Recovery.Active", PathKey = "LastTurn.Recovery.Path";
    [Serializable] private sealed class Source { public string path, hash; }
    [Serializable] private sealed class Proof { public string result, error, utc; public List<string> checks = new List<string>(), images = new List<string>(), notes = new List<string>(), runtimeErrors = new List<string>(), editorDiagnostics = new List<string>(); public Source[] sources; }
    private static Proof proof; private static readonly List<Action> steps = new List<Action>(); private static int index; private static double began;
    private static EditorWindow game; private static object group; private static int originalSize; private static readonly List<int> sizes = new List<int>();
    private static readonly List<(string Path, DateTime After)> pending = new List<(string, DateTime)>();
    private static string Project => Path.GetDirectoryName(Application.dataPath);
    private static GtPrototype P => UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    static RecoveryPlayValidation() { EditorApplication.playModeStateChanged += Changed; }
    public static void StartGameView()
    {
      if (Application.isBatchMode || Application.productName != "LastTurnUiValidation" || Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") < 0) throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
      GarageSceneBuilder.Open(); SessionState.SetString(PathKey, Path.Combine(Project, "Logs/Recovery/" + Guid.NewGuid().ToString("N"))); SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
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

    private static double clock; private static int stepped; private static readonly List<string> hud = new List<string>();
    private static void Start(string key)
    {
      Do(() => { if (SceneManager.GetActiveScene().name != "Garage") GameFlow.LeaveDrive(); });
      Wait(() => SceneManager.GetActiveScene().name == "Garage" && GarageSession.State != null);
      Do(() => { GameFlow.Conditions = RaceConditions.DefaultFor(RaceConditions.ThemeOf(key)); Check(TestPanelActions.StartRace(key), "Yarış açıldı: " + key); });
      Wait(() => P && P.Race != null && P.Simulation != null && SceneManager.GetActiveScene().name != "Garage");
      Do(() => { P.ManualStepping = true; var d = RaceTestDriver.For("rl"); while (P.Race.Session.State == RaceState.Countdown) P.StepRace(d.Countdown(P.Race)); clock = EditorApplication.timeSinceStartup; stepped = 0; });
    }
    /// Gerçek zamanlı sabit adım; until true olunca durur.
    private static void Run(Func<DrivingInput> input, Func<bool> until, Action each = null)
    {
      Wait(() =>
      {
        double now = EditorApplication.timeSinceStartup; int n = Math.Min(6, (int)((now - clock) / PowertrainVehicle.FixedDelta)); clock += n * PowertrainVehicle.FixedDelta; if (now - clock > .2) clock = now;
        for (int k = 0; k < n && !until(); k++) { P.StepRace(input()); stepped++; each?.Invoke(); }
        return until();
      });
    }
    private static void Setup()
    {
      string basePath = SessionState.GetString(PathKey, ""); string settings = Path.Combine(basePath, "settings"); Directory.CreateDirectory(settings);
      PlayerPreferences.Directory = settings; PlayerPreferences.Reload(); GarageSession.Open(Path.Combine(basePath, "garage.json")); GarageState.AdminMode = true; GameFlow.MainMenu(); Size(1280, 720);
      // 1) Ters dönme: 2 sn sür, sırtüstü koy, HUD sayımı ve dönüş.
      Start("rl_2");
      Run(() => new DrivingInput(1, 0, 0), () => stepped >= 120);
      Do(() =>
      {
        var b = P.Race.Vehicle.Body; var f = b.Orientation.Rotate(new BodyVector(0, 0, 1)); double yaw = Math.Atan2(f.X, f.Z);
        typeof(VehicleState).GetProperty("Orientation").SetValue(b, BodyRotation.Multiply(BodyRotation.Yaw(yaw), new BodyRotation(0, 0, 1, 0)));
        typeof(VehicleState).GetProperty("Position").SetValue(b, b.Position + new BodyVector(0, 1.2, 0)); typeof(VehicleState).GetProperty("Velocity").SetValue(b, new BodyVector(0, 0, 0));
        hud.Clear(); stepped = 0; Check(P.Race.Teleports == 0, "dönüş öncesi");
      });
      bool shot5 = false, shot2 = false;
      Run(() => new DrivingInput(0, 0, 0), () => P.Race.Teleports > 0 || stepped > 600, () =>
      {
        int left = P.Race.Session.Flip.Left; string text = left > 0 ? left + " · TERS DÖNDÜN" : ""; if (text != "" && (hud.Count == 0 || hud[hud.Count - 1] != text)) hud.Add(text);
        if (left == 5 && !shot5) { shot5 = true; Queue("p18-recovery-ters-5-1280.png"); }
        if (left == 2 && !shot2) { shot2 = true; Queue("p18-recovery-ters-2-1280.png"); }
      });
      Do(() =>
      {
        Check(P.Race.Teleports == 1 && stepped >= 320 && stepped <= 345, "sırtüstü araç ~5,5 sn sonra güvenli noktaya (" + stepped + " adım)");
        Check(string.Join("|", hud) == "5 · TERS DÖNDÜN|4 · TERS DÖNDÜN|3 · TERS DÖNDÜN|2 · TERS DÖNDÜN|1 · TERS DÖNDÜN", "HUD sayımı " + string.Join("|", hud));
        var v = P.Race.Vehicle; var g = P.Race.World.Geometry;
        Check(!FlipCounter.Flipped(v.Body.Orientation) && P.Race.Recovery.Safe[g.Nearest(v.ReferencePoint.X, v.ReferencePoint.Z, 0, true).Index], "dik ve güvenli noktada");
        Queue("p18-recovery-donus-1280.png"); stepped = 0;
      });
      Run(() => new DrivingInput(1, 0, 0), () => stepped >= 240);
      Do(() => { Check(P.Race.Vehicle.Body.Velocity.Length > 5, "dönüşten sonra sürülür (" + P.Race.Vehicle.Body.Velocity.Length.ToString("0.0", CultureInfo.InvariantCulture) + " m/s)"); Queue("p18-recovery-surus-1280.png"); });
      // 2) rl_8 yokuşunda takılma → elle ↺ (oyuncu tuşu RespawnAny) ileride güvenli noktaya.
      Start("rl_8");
      double before = 0;
      Do(() =>
      {
        var run = P.Race; var g = run.World.Geometry; int hill = Enumerable.Range(0, g.N).First(i => g.S[i] > 280 && !run.Recovery.Safe[i]);
        run.Vehicle.Place(g.X[hill], g.Z[hill], Math.Atan2(g.Tx[hill], g.Tz[hill])); run.World.ResetHint(g.X[hill], g.Z[hill]); stepped = 0;
      });
      Run(() => new DrivingInput(1, 0, 0), () => stepped >= 300);
      Do(() => { var g = P.Race.World.Geometry; var v = P.Race.Vehicle; before = g.S[g.Nearest(v.ReferencePoint.X, v.ReferencePoint.Z, 0, true).Index]; Check(v.Body.Velocity.Length < RaceRun.StuckSpeed, "yokuşta takıldı (" + v.Body.Velocity.Length.ToString("0.0", CultureInfo.InvariantCulture) + " m/s)"); Queue("p18-recovery-yokus-takili-1280.png"); });
      Do(() => { P.RespawnAny(); });
      Do(() =>
      {
        var g = P.Race.World.Geometry; var v = P.Race.Vehicle; int at = g.Nearest(v.ReferencePoint.X, v.ReferencePoint.Z, 0, true).Index;
        Check(g.S[at] > before && P.Race.Recovery.Safe[at], "elle ↺ ileride güvenli noktaya (" + before.ToString("0", CultureInfo.InvariantCulture) + " → " + g.S[at].ToString("0", CultureInfo.InvariantCulture) + " m)");
        Queue("p18-recovery-yokus-donus-1280.png"); stepped = 0;
      });
      Run(() => new DrivingInput(1, 0, 0), () => stepped >= 300);
      Do(() => Check(P.Race.Vehicle.Body.Velocity.Length > 5, "yokuş dönüşünden sonra ilerler (" + P.Race.Vehicle.Body.Velocity.Length.ToString("0.0", CultureInfo.InvariantCulture) + " m/s)"));
      Do(() => GameFlow.LeaveDrive());
      Wait(() => SceneManager.GetActiveScene().name == "Garage");
      Wait(() => pending.All(p => File.Exists(p.Path) && File.GetLastWriteTimeUtc(p.Path) >= p.After));
      Do(() => { foreach (var p in pending) proof.images.Add(Path.GetFileName(p.Path)); Check(proof.runtimeErrors.Count == 0, "LastTurn çalışma Console hatası yok"); Finish(null); });
    }    private static void Queue(string name) { string path = Path.Combine(Project, "Logs/" + name); ScreenCapture.CaptureScreenshot(path); pending.Add((path, DateTime.UtcNow)); }
    private static void Size(int w, int h)
    {
      var a = typeof(EditorWindow).Assembly; var t = a.GetType("UnityEditor.GameView"); if (!game) { game = EditorWindow.GetWindow(t); originalSize = (int)t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).GetValue(game); }
      var st = a.GetType("UnityEditor.GameViewSizes"); var singleton = typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null); group = st.GetMethod("GetGroup").Invoke(singleton, new object[] { GameViewSizeGroupType.Standalone });
      int n = (int)group.GetType().GetMethod("GetTotalCount").Invoke(group, null); var size = Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"), new object[] { Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"), "FixedResolution"), w, h, "Kurtarma" }); group.GetType().GetMethod("AddCustomSize").Invoke(group, new[] { size }); sizes.Add(n);
      t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, n); game.Show(); game.Repaint();
    }
    private static void Tick()
    {
      try { if (proof.runtimeErrors.Count > 0) throw new Exception(proof.runtimeErrors[0]); if (EditorApplication.timeSinceStartup - began > 900) throw new TimeoutException("Kurtarma Play"); if (steps.Count == 0) { if (EditorApplication.timeSinceStartup - began < 2) return; Setup(); return; } if (index < steps.Count) steps[index++](); }
      catch (Exception e) { Finish(e); }
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active, false); Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; GarageState.AdminMode = false;
      if (game && group != null) { game.GetType().GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, originalSize); foreach (int n in sizes.AsEnumerable().Reverse()) group.GetType().GetMethod("RemoveCustomSize").Invoke(group, new object[] { n }); }
      proof.result = e == null ? "p18-recovery-passed" : "failed"; proof.error = e?.ToString() ?? ""; proof.utc = DateTime.UtcNow.ToString("O");
      proof.sources = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories).Where(f => Path.GetExtension(f) == ".cs" || Path.GetExtension(f) == ".uss").OrderBy(f => f, StringComparer.Ordinal).Select(f => new Source { path = f.Substring(Project.Length + 1).Replace('\\', '/'), hash = Hash(f) }).ToArray();
      File.WriteAllText(Path.Combine(Project, "Logs/p18-recovery-play.json"), JsonUtility.ToJson(proof, true));
      if (e != null) Debug.LogException(e); else Debug.Log("Kurtarma Play geçti: " + proof.checks.Count); EditorApplication.Exit(e == null ? 0 : 1);
    }
  }
}
