using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using LastTurn.Ui;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;
using PlayerSettings = LastTurn.Core.PlayerSettings;

namespace LastTurn.EditorValidation
{
  // Yalnız ayrı grafik Editor'da F §8 Duraklatma + §9 Sonuç: kariyer yarışında duraklatma işlemleri ve hızlı ayar, gerçek fizikle
  // bitirilen Drag yarışının sonucu (Esc, Tekrar, Sıradaki), Mutant duraklatması ve gerçek Game View görüntüleri. Kayıtlar test klasöründedir.
  [InitializeOnLoad]
  public static class PauseResultFPlayValidation
  {
    private const string Active = "LastTurn.P7Pause.Active", PathKey = "LastTurn.P7Pause.Path";
    [Serializable] private sealed class Source { public string path, hash; }
    [Serializable] private sealed class Proof { public string result, error, utc; public List<string> checks = new List<string>(), images = new List<string>(), runtimeErrors = new List<string>(), editorDiagnostics = new List<string>(); public Source[] sources; }
    private static Proof proof; private static readonly List<Action> steps = new List<Action>(); private static int index; private static double began, at; private static Keyboard keyboard;
    private static VisualElement pointer; private static Vector2 point; private static string shot; private static int shotW, shotH; private static bool queued; private static DateTime captureAfter;
    private static EditorWindow game; private static object group; private static int originalSize; private static readonly List<int> sizes = new List<int>();
    private static string dir, career;
    private static string Project => Path.GetDirectoryName(Application.dataPath);
    private static PlayerSettings Now => PlayerPreferences.Current;

    static PauseResultFPlayValidation() { EditorApplication.playModeStateChanged += Changed; }
    public static void StartGameView()
    {
      if (Application.isBatchMode || Application.productName != "LastTurnUiValidation" || Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") < 0) throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Önce Play durmalı.");
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus; InputSystem.settings.editorInputBehaviorInPlayMode = InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      GarageSceneBuilder.Open(); SessionState.SetString(PathKey, Path.Combine(Project, "Logs/P7Pause/" + Guid.NewGuid().ToString("N"))); SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
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
    private static void Tap(Key key) { Do(() => InputSystem.QueueStateEvent(keyboard, new KeyboardState(key))); Do(() => InputSystem.QueueStateEvent(keyboard, new KeyboardState())); }
    private static void Wait(Func<bool> ready) { Do(() => { if (!ready()) index--; }); }
    private static string Hash(string path) { using (var h = SHA256.Create()) return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-", ""); }
    private static PlayerSettings Disk() => new PlayerSettingsStore(dir).Load();
    private static void Click(string name)
    {
      Do(() => { var element = UiRoot.Instance.Screen.Q(name); Check(element != null, "Fare hedefi var: " + name); point = element.worldBound.center; pointer = element.panel.Pick(point); Check(pointer == element || element.Contains(pointer), "Fare hit-test: " + name); });
      Do(() => { using (var e = PointerDownEvent.GetPooled(new Event { type = EventType.MouseDown, button = 0, mousePosition = point })) pointer.SendEvent(e); });
      Do(() => { using (var e = PointerUpEvent.GetPooled(new Event { type = EventType.MouseUp, button = 0, mousePosition = point })) pointer.SendEvent(e); });
    }

    private static GtPrototype P => UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    private static PauseView Pause => PauseView.Instance;
    private static ResultView Result => ResultView.Instance;
    private static RaceTestDriver driver; private static int stepped;

    private static bool Ready(string type) { var p = P; return p && p.Race != null && p.Simulation != null && p.Race.Event.Type == type; }
    private static void Countdown() { P.ManualStepping = true; stepped = 0; while (P.Race.Session.State == RaceState.Countdown) P.StepRace(driver.Countdown(P.Race)); }
    private static bool DriveToFinish()
    {
      for (int k = 0; k < 600 && P.Race.Session.State == RaceState.Running; k++) { P.StepRace(driver.Input(P.Race)); stepped++; }
      if (stepped > 30000) throw new Exception("Drag bitmedi"); return P.Race.Session.State == RaceState.Finished;
    }

    private static void Setup()
    {
      string basePath = SessionState.GetString(PathKey, "");
      dir = Path.Combine(basePath, "settings"); Directory.CreateDirectory(dir); PlayerPreferences.Directory = dir; PlayerPreferences.Reload();
      MutantRuntime.RecordDirectory = Path.Combine(basePath, "mutant");
      GarageSession.Open(Path.Combine(basePath, "garage.json")); keyboard = InputSystem.AddDevice<Keyboard>("P7Duraklatma"); GameFlow.MainMenu();
      Do(() => Check(TestPanelActions.StartRace("gp_1"), "Kariyer yarışı açıldı (gp_1)"));
      Wait(() => Ready("gp"));
      Do(() => { driver = RaceTestDriver.For("gp"); Countdown(); for (int k = 0; k < 900; k++) P.StepRace(driver.Input(P.Race)); });
      Tap(Key.Escape);
      Do(() =>
      {
        if (!(GameFlow.Paused && Pause.Visible && !Pause.Mutant && PauseView.CoversCurrentScreen)) throw new InvalidOperationException("Duraklatma açılmadı: paused=" + GameFlow.Paused + " visible=" + Pause.Visible + " mutant=" + MutantRuntime.Active + " settings=" + SettingsScreen.Open + " scene=" + SceneManager.GetActiveScene().name + " kb=" + (Keyboard.current == keyboard) + " state=" + P.Race.Session.State);
        Check(true, "Esc → F Duraklatma; IMGUI duraklatma geri dönüş olarak gizli");
        Check(Pause.ItemCount == 6 && Pause.FocusedName == "pause-continue", "Altı işlem, odak DEVAM ET");
        var stats = UiRoot.Instance.Screen.Q("f-pause").Query<Label>(className: "pz-value").ToList();
        Check(stats.Count == 3 && stats[0].text.Contains(":") && P.Race.Session.Time > 3, "Sağda süre, en iyi tur ve hedef (" + stats[0].text + ")");
        Check(UiRoot.Instance.Screen.Q("f-pause").Q<Label>(className: "pz-where").text.StartsWith(LastTurn.Ui.Ui.Upper(P.Race.Event.Name)), "Başlıkta pist adı ve tur");
      });
      Do(() => Shot("pause", 1920, 1080));
      Do(() => Shot("pause", 1280, 720));
      Tap(Key.DownArrow);
      Do(() => Check(Pause.FocusedName == "pause-restart", "↓ sonraki işlem"));
      Click("pause-cam-1");
      Do(() => Check(Now.Camera == 1 && Disk().Camera == 1 && Pause.Visible, "Hızlı ayar: fare kamerayı seçer ve hemen kaydeder"));
      Tap(Key.Escape);
      Do(() => Check(!GameFlow.Paused && !Pause.Visible, "Esc yarışa devam ettirir"));
      Tap(Key.Escape);
      Tap(Key.DownArrow); Tap(Key.DownArrow); Tap(Key.Enter);
      Do(() => Check(SettingsScreen.Open && SettingsView.Instance.Visible && !Pause.Visible, "↓↓ Enter → Ayarlar (F)"));
      Tap(Key.Escape);
      Do(() => Check(!SettingsScreen.Open && GameFlow.Paused && Pause.Visible && Pause.FocusedName == "pause-continue", "Ayarlardan Esc duraklatmaya döner"));
      Tap(Key.Enter);
      Do(() => Check(!GameFlow.Paused && !Pause.Visible, "Enter DEVAM ET"));

      // Sonuç: kısa Drag yarışı gerçek fizikle bitirilir (kariyer akışı testindeki sürücü).
      Do(() => GameFlow.LeaveDrive());
      Wait(() => SceneManager.GetActiveScene().name == "Garage" && GarageSession.State != null);
      Do(() => Check(TestPanelActions.StartRace("dg_1"), "Kariyer Drag yarışı açıldı (dg_1)"));
      Wait(() => Ready("dg"));
      Do(() => { driver = RaceTestDriver.For("dg"); Countdown(); });
      Wait(DriveToFinish);
      Wait(() => Result.Visible);
      Do(() =>
      {
        var s = P.Race.Session; var h = DriveMenuModel.Headline(s);
        Check(ResultView.CoversCurrentScreen && Result.ValueText.StartsWith(h.Value) && Result.StarsShown == s.Stars, "F Sonuç: büyük süre ve kazanılan yıldızlar (" + h.Value + ", " + s.Stars + "★)");
        Check(!UiRoot.Instance.GetComponent<RaceHudView>().Visible, "Sonuçta yarış HUD'u gizli");
        string reward = UiRoot.Instance.Screen.Q("f-result").Q<Label>(className: "rs-reward").text;
        Check(reward.Contains("+" + s.Xp.ToString("0") + " XP") && reward.Contains("+" + s.Money.ToString("N0") + " para"), "Kazanç yarış oturumunun XP ve parasıyla aynı (" + reward + ")");
        GameFlow.Refresh(); var next = DriveMenuModel.NextCareerEvent(GameFlow.Menu().Events, "dg_1");
        Check(Result.NextKey == (next?.Key ?? ""), "Sıradaki kariyer yarışı (" + (next?.Key ?? "yok") + ")" + (Result.NextKey == (next?.Key ?? "") ? "" : " ekranda=" + Result.NextKey + " kariyer=" + s.Career + " olaylar=" + string.Join(",", GameFlow.Menu().Events.Where(e => e.Key.StartsWith("dg")).Select(e => e.Key + (e.Open ? "+" : "-") + (e.Career ? "k" : "d")))));
      });
      Do(() => Shot("result", 1920, 1080));
      Do(() => Shot("result", 1280, 720));
      Do(() => Shot("result", 2560, 1080));
      Tap(Key.Escape);
      Do(() => Check(!GameFlow.Paused && !Pause.Visible, "Sonuçta Esc duraklatma açmaz"));
      Wait(() => SceneManager.GetActiveScene().name == "Garage" && GarageSession.State != null);
      Do(() => Check(GameFlow.Hub == GameFlow.MenuHub.Race && GameFlow.Home, "Sonuç Esc → yarış menüsü"));
      Do(() => Check(TestPanelActions.StartRace("dg_1"), "Drag yeniden açıldı"));
      Wait(() => Ready("dg"));
      Do(Countdown);
      Wait(DriveToFinish);
      Wait(() => Result.Visible);
      Click("result-again");
      Do(() => Check(P.Race.Session.State != RaceState.Finished && !Result.Visible, "TEKRAR yarışı baştan başlatır"));
      Do(Countdown);
      Wait(DriveToFinish);
      Wait(() => Result.Visible);
      Do(() => career = Result.NextKey);
      Tap(Key.Enter);
      Wait(() => SceneManager.GetActiveScene().name == "Garage" && (career == "" ? GameFlow.Home : RacePreparationView.CoversCurrentScreen));
      Do(() => Check(career == "" ? GameFlow.Hub == GameFlow.MenuHub.Race && GameFlow.Home : RacePreparationView.CoversCurrentScreen && GameFlow.LastRaceKey == career,
        "Enter → " + (career == "" ? "yarış menüsü (sıradaki yok)" : "sıradaki yarışın hazırlığı (" + career + ")")));

      // Mutant duraklatması: koşu dünyası açılır, Esc ile F duraklatma, koşudan çıkış.
      Do(() => { GameFlow.MutantMenu(); MutantRuntime.Start(54321); MutantRuntime.SelectCar(14); Check(MutantRuntime.Choose("sonnefes"), "Mutant koşusu dünyaya açıldı"); });
      Wait(() => { var p = P; return SceneManager.GetActiveScene().name == "GTTest" && p && p.Simulation != null && MutantRuntime.Panel == ""; });
      Tap(Key.Escape);
      Do(() => Check(GameFlow.Paused && Pause.Visible && Pause.Mutant && Pause.ItemCount == 3, "Mutant: Esc → F Duraklatma (Devam, Ayarlar, Koşudan çık)"));
      Do(() => Check(UiRoot.Instance.Screen.Q("f-pause").Query(className: "ipuclari").Where(e => e.resolvedStyle.display != DisplayStyle.None).ToList().Count == 1, "Mutant duraklatmada yalnız geçerli tuş ipuçları"));
      Do(() => Shot("mutant", 1920, 1080));
      Do(() => Pause.Run("pause-exit-run"));
      Wait(() => SceneManager.GetActiveScene().name == "Garage" && !MutantRuntime.Active);
      Do(() => Check(GameFlow.Hub == GameFlow.MenuHub.Mutant && !GameFlow.Paused, "Koşudan çık → Mutant menüsü"));
    }

    private static void Shot(string name, int w, int h) { shot = name; shotW = w; shotH = h; queued = false; Size(w, h); }
    private static void Size(int w, int h)
    {
      var a = typeof(EditorWindow).Assembly; var t = a.GetType("UnityEditor.GameView"); if (!game) { game = EditorWindow.GetWindow(t); originalSize = (int)t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).GetValue(game); }
      var st = a.GetType("UnityEditor.GameViewSizes"); var singleton = typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null); group = st.GetMethod("GetGroup").Invoke(singleton, new object[] { GameViewSizeGroupType.Standalone });
      int n = (int)group.GetType().GetMethod("GetTotalCount").Invoke(group, null); var size = Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"), new object[] { Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"), "FixedResolution"), w, h, "P7 duraklatma" }); group.GetType().GetMethod("AddCustomSize").Invoke(group, new[] { size }); sizes.Add(n);
      t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, n); game.Show(); game.Focus(); game.Repaint();
    }
    private static void Capture()
    {
      string path = Path.Combine(Project, "Logs/p7-pause-" + shot + "-" + shotW + ".png");
      if (!queued) { Check(Screen.width == shotW && Screen.height == shotH, "Game View çözünürlüğü " + shot + shotW); captureAfter = DateTime.UtcNow; ScreenCapture.CaptureScreenshot(path); queued = true; return; }
      if (!File.Exists(path) || File.GetLastWriteTimeUtc(path) < captureAfter) return;
      var png = new Texture2D(2, 2); try { png.LoadImage(File.ReadAllBytes(path)); Check(png.width == shotW && png.height == shotH, "PNG boyutu " + shot + shotW); } finally { UnityEngine.Object.DestroyImmediate(png); }
      var root = UiRoot.Instance.Root.layout; var page = UiRoot.Instance.Screen.Q(shot == "result" ? "f-result" : "f-pause");
      Rect left = page.Q(className: shot == "result" ? "rs-left" : "pz-left").worldBound, right = page.Q(className: shot == "result" ? "rs-right" : "pz-right").worldBound, hints = page.Query(className: "ipuclari").Where(e => e.resolvedStyle.display != DisplayStyle.None).First().worldBound;
      Check(right.xMax <= root.width && left.xMin >= 0 && right.yMax < hints.yMin && left.yMax < root.height - 60, "Paneller sınırlar içinde " + shot + shotW);
      Check(!left.Overlaps(right), "Sol ve sağ panel çakışmaz " + shot + shotW);
      if (shot == "result") { var actions = page.Q(className: "rs-actions").worldBound; Check(!actions.Overlaps(right) && !actions.Overlaps(hints) && actions.xMax <= root.width, "Sonuç tuşları çakışmaz " + shot + shotW); }
      proof.images.Add(Path.GetFileName(path)); shot = null;
    }
    private static void Tick()
    {
      try
      {
        if (proof.runtimeErrors.Count > 0) throw new Exception(proof.runtimeErrors[0]); if (EditorApplication.timeSinceStartup - began > 420) throw new TimeoutException("P7 duraklatma/sonuç kısa Play");
        if (steps.Count == 0) { if (!PauseView.Instance || !ResultView.Instance || !UiRoot.Instance || GarageSession.State == null) return; Setup(); return; }
        if (EditorApplication.timeSinceStartup - at < .35) return; at = EditorApplication.timeSinceStartup;
        if (shot != null) { Capture(); return; }
        if (index < steps.Count) steps[index++](); else Finish(null);
      }
      catch (Exception e) { Finish(e); }
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active, false); Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; if (keyboard != null && keyboard.added) InputSystem.RemoveDevice(keyboard);
      if (game && group != null) { game.GetType().GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, originalSize); foreach (int n in sizes.AsEnumerable().Reverse()) group.GetType().GetMethod("RemoveCustomSize").Invoke(group, new object[] { n }); }
      proof.result = e == null ? "p7-pause-result-f-passed" : "failed"; proof.error = e?.ToString() ?? ""; proof.utc = DateTime.UtcNow.ToString("O");
      proof.sources = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories).Where(f => Path.GetExtension(f) == ".cs" || Path.GetExtension(f) == ".uss").OrderBy(f => f, StringComparer.Ordinal).Select(f => new Source { path = f.Substring(Project.Length + 1).Replace('\\', '/'), hash = Hash(f) }).ToArray();
      File.WriteAllText(Path.Combine(Project, "Logs/p7-pause-result-f-play.json"), JsonUtility.ToJson(proof, true));
      Debug.Log("P7 duraklatma/sonuç F Play: " + proof.result + " (" + proof.checks.Count + " kontrol) " + proof.error);
      EditorApplication.ExitPlaymode(); EditorApplication.delayCall += () => EditorApplication.Exit(e == null ? 0 : 1);
    }
  }
}
