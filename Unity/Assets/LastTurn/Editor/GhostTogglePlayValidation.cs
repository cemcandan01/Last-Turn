using System;
using System.Collections.Generic;
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
  // Yalnız ayrı grafik Editor'da: rekor hayaleti "rh" tercihi yarış ortasında açılıp kapanır (TS uzakAdimi). Kayıt varsa hayalet
  // her zaman yarışla eş adımlı oynar; görünürlük ve mini harita noktası anlık tercihe uyar; yeniden başlatma hayaleti baştan alır.
  [InitializeOnLoad]
  public static class GhostTogglePlayValidation
  {
    private const string Active = "LastTurn.GhostToggle.Active", PathKey = "LastTurn.GhostToggle.Path";
    [Serializable] private sealed class Source { public string path, hash; }
    [Serializable] private sealed class Proof { public string result, error, utc; public List<string> checks = new List<string>(), images = new List<string>(), runtimeErrors = new List<string>(), editorDiagnostics = new List<string>(); public Source[] sources; }
    private static Proof proof; private static readonly List<Action> steps = new List<Action>(); private static int index; private static double began;
    private static EditorWindow game; private static object group; private static int originalSize; private static readonly List<int> sizes = new List<int>();
    private static readonly List<(string Path, DateTime After)> pending = new List<(string, DateTime)>();
    private static string Project => Path.GetDirectoryName(Application.dataPath);
    private static GtPrototype P => UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    private static MiniMapView Map => UnityEngine.Object.FindFirstObjectByType<MiniMapView>();
    private static Transform GhostView => P.transform.Find("Rekor hayaleti");
    static GhostTogglePlayValidation() { EditorApplication.playModeStateChanged += Changed; }
    public static void StartGameView()
    {
      if (Application.isBatchMode || Application.productName != "LastTurnUiValidation" || Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") < 0) throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
      GarageSceneBuilder.Open(); SessionState.SetString(PathKey, Path.Combine(Project, "Logs/GhostToggle/" + Guid.NewGuid().ToString("N"))); SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
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
    private static int frames; private static bool Frames(int n) { if (++frames < n) return false; frames = 0; return true; }
    private static string Hash(string path) { using (var h = SHA256.Create()) return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-", ""); }
    private static RaceTestDriver driver; private static int baseCars;
    private static void Drive(int n) { for (int k = 0; k < n && P.Race.Session.State == RaceState.Running; k++) P.StepRace(driver.Input(P.Race)); }
    private static void Rh(bool on) { PlayerPreferences.Current.Set["rh"] = on ? 1 : 0; Check(PlayerPreferences.Save(), "Rekor hayaleti tercihi kaydedildi: " + on); }
    private static bool Visible => GhostView && GhostView.gameObject.activeSelf;

    private static void Setup()
    {
      string basePath = SessionState.GetString(PathKey, ""); string settings = Path.Combine(basePath, "settings"); Directory.CreateDirectory(settings);
      PlayerPreferences.Directory = settings; PlayerPreferences.Reload(); GarageSession.Open(Path.Combine(basePath, "garage.json")); GameFlow.MainMenu();
      Size(1280, 720);
      Do(() => { Rh(false); Check(TestPanelActions.StartRace("gp_1"), "Kariyer yarışı açıldı (gp_1)"); });
      Wait(() => P && P.Race != null && SceneManager.GetActiveScene().name != "Garage");
      Do(() =>
      {
        // İzole profile gp_1 rekoru için kısa gerçek kayıt: tam gaz 900 adım (oyuncu yarışından bağımsız hayalet).
        var rec = new InputRecording(); for (int i = 0; i < 900; i++) rec.Record(new DrivingInput(1, 0, 0));
        var setup = GarageSession.State.Setup(GarageSession.State.SelectedCar);
        GarageRace.ProfileStore().SaveGhost(new GhostRecord { Key = P.Race.Session.RecordKey, Car = GarageSession.State.SelectedCar, RaceType = "gp", AssistLevel = GarageSession.State.AssistLevel, Result = 99, Parts = setup.Parts, Inputs = rec });
        P.ManualStepping = true; P.RestartRace(); driver = RaceTestDriver.For("gp");
        while (P.Race.Session.State == RaceState.Countdown) P.StepRace(driver.Countdown(P.Race));
        Check(P.Race.Ghost != null && P.Race.Ghost.Index == 0, "Tercih kapalıyken de kayıtlı hayalet yarışla başlar (TS)");
        Drive(240);
      });
      Wait(() => Frames(4));
      Do(() => { baseCars = Map.Cars; Check(!Visible && !P.GhostShown && Map.Segments > 0 && baseCars == 0, "Kapalı: hayalet ve mini harita noktası çizilmez (harita açık, " + Map.Segments + " parça)"); Check(P.Race.Ghost.Index == 240, "Kapalıyken hayalet eş adımlı ilerler (" + P.Race.Ghost.Index + ")"); Queue("kapali"); });
      Wait(() => Frames(3));
      Do(() => { Rh(true); Drive(60); });
      Wait(() => Frames(4));
      Do(() =>
      {
        var g = P.Race.Ghost.Vehicle.Body.Position; var v = GhostView.position;
        Check(Visible && P.GhostShown && Map.Cars == baseCars + 1, "Yarış ortasında açılınca hayalet ve mini harita noktası görünür");
        Check(P.Race.Ghost.Index == 300 && Vector3.Distance(v, GtPresentation.Position(g)) < .01f && g.Z != 0, "Açılınca hayalet kaldığı yerden (adım 300) çizilir");
        Queue("acik");
      });
      Wait(() => Frames(3));
      Do(() => { Rh(false); Drive(60); });
      Wait(() => Frames(4));
      Do(() => Check(!Visible && Map.Cars == baseCars && P.Race.Ghost.Index == 360, "Yeniden kapanınca gizlenir, hayalet ilerlemeyi sürdürür"));
      Do(() => { Rh(true); P.RestartRace(); Check(P.Race.Ghost != null && P.Race.Ghost.Index == 0, "Yeniden başlatma hayaleti baştan alır"); });
      Wait(() => Frames(4));
      Do(() => { Check(Visible, "Yeniden başlatmada açık tercihle görünür"); P.ManualStepping = false; GameFlow.LeaveDrive(); });
      Wait(() => SceneManager.GetActiveScene().name == "Garage");
      Wait(() => pending.All(p => File.Exists(p.Path) && File.GetLastWriteTimeUtc(p.Path) >= p.After));
      Do(() => { foreach (var p in pending) proof.images.Add(Path.GetFileName(p.Path)); Check(proof.runtimeErrors.Count == 0, "LastTurn çalışma Console hatası yok"); Finish(null); });
    }
    private static void Queue(string name) { string path = Path.Combine(Project, "Logs/p9-ghost-" + name + "-1280.png"); ScreenCapture.CaptureScreenshot(path); pending.Add((path, DateTime.UtcNow)); }
    private static void Size(int w, int h)
    {
      var a = typeof(EditorWindow).Assembly; var t = a.GetType("UnityEditor.GameView"); if (!game) { game = EditorWindow.GetWindow(t); originalSize = (int)t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).GetValue(game); }
      var st = a.GetType("UnityEditor.GameViewSizes"); var singleton = typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null); group = st.GetMethod("GetGroup").Invoke(singleton, new object[] { GameViewSizeGroupType.Standalone });
      int n = (int)group.GetType().GetMethod("GetTotalCount").Invoke(group, null); var size = Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"), new object[] { Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"), "FixedResolution"), w, h, "Hayalet" }); group.GetType().GetMethod("AddCustomSize").Invoke(group, new[] { size }); sizes.Add(n);
      t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, n); game.Show(); game.Repaint();
    }
    private static void Tick()
    {
      try { if (proof.runtimeErrors.Count > 0) throw new Exception(proof.runtimeErrors[0]); if (EditorApplication.timeSinceStartup - began > 200) throw new TimeoutException("Hayalet Play"); if (steps.Count == 0) { if (EditorApplication.timeSinceStartup - began < 2) return; Setup(); return; } if (index < steps.Count) steps[index++](); }
      catch (Exception e) { Finish(e); }
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active, false); Application.logMessageReceived -= Logged; EditorApplication.update -= Tick;
      if (game && group != null) { game.GetType().GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, originalSize); foreach (int n in sizes.AsEnumerable().Reverse()) group.GetType().GetMethod("RemoveCustomSize").Invoke(group, new object[] { n }); }
      proof.result = e == null ? "p9-ghost-passed" : "failed"; proof.error = e?.ToString() ?? ""; proof.utc = DateTime.UtcNow.ToString("O");
      proof.sources = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories).Where(f => Path.GetExtension(f) == ".cs" || Path.GetExtension(f) == ".uss").OrderBy(f => f, StringComparer.Ordinal).Select(f => new Source { path = f.Substring(Project.Length + 1).Replace('\\', '/'), hash = Hash(f) }).ToArray();
      File.WriteAllText(Path.Combine(Project, "Logs/p9-ghost-play.json"), JsonUtility.ToJson(proof, true));
      if (e != null) Debug.LogException(e); else Debug.Log("Hayalet Play geçti: " + proof.checks.Count); EditorApplication.Exit(e == null ? 0 : 1);
    }
  }
}
