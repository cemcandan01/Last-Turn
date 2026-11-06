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
  // Yalnız ayrı grafik Editor'da F §7 Ayarlar: ana menüden ve yarış duraklatmasından açılış, klavye/fare ile değişiklik,
  // diske kayıt, Esc dönüşleri ve gerçek Game View görüntüleri. Ayar dosyası test klasöründedir.
  [InitializeOnLoad]
  public static class SettingsFPlayValidation
  {
    private const string Active = "LastTurn.P7Settings.Active", PathKey = "LastTurn.P7Settings.Path";
    [Serializable] private sealed class Source { public string path, hash; }
    [Serializable] private sealed class Proof { public string result, error, utc; public List<string> checks = new List<string>(), images = new List<string>(), runtimeErrors = new List<string>(), editorDiagnostics = new List<string>(); public Source[] sources; }
    private static Proof proof; private static readonly List<Action> steps = new List<Action>(); private static int index; private static double began, at; private static Keyboard keyboard;
    private static VisualElement pointer; private static Vector2 point; private static string shot; private static int shotW, shotH; private static bool queued; private static DateTime captureAfter;
    private static EditorWindow game; private static object group; private static int originalSize; private static readonly List<int> sizes = new List<int>();
    private static string dir, career; private static PlayerSettings before;
    private static string Project => Path.GetDirectoryName(Application.dataPath);
    private static SettingsView View => SettingsView.Instance;
    private static PlayerSettings Now => PlayerPreferences.Current;

    static SettingsFPlayValidation() { EditorApplication.playModeStateChanged += Changed; }
    public static void StartGameView()
    {
      if (Application.isBatchMode || Application.productName != "LastTurnUiValidation" || Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") < 0) throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Önce Play durmalı.");
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus; InputSystem.settings.editorInputBehaviorInPlayMode = InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      GarageSceneBuilder.Open(); SessionState.SetString(PathKey, Path.Combine(Project, "Logs/P7Settings/" + Guid.NewGuid().ToString("N"))); SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
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
    private static int RowOf(string key) => View.Rows.Select((r, i) => (r, i)).First(x => x.r.Key == key).i;
    private static void Click(string name)
    {
      Do(() => { var element = UiRoot.Instance.Screen.Q(name); Check(element != null, "Fare hedefi var: " + name); point = element.worldBound.center; pointer = element.panel.Pick(point); Check(pointer == element || element.Contains(pointer), "Fare hit-test: " + name); });
      Do(() => { using (var e = PointerDownEvent.GetPooled(new Event { type = EventType.MouseDown, button = 0, mousePosition = point })) pointer.SendEvent(e); });
      Do(() => { using (var e = PointerUpEvent.GetPooled(new Event { type = EventType.MouseUp, button = 0, mousePosition = point })) pointer.SendEvent(e); });
    }

    private static void Setup()
    {
      dir = Path.Combine(SessionState.GetString(PathKey, ""), "settings"); Directory.CreateDirectory(dir); PlayerPreferences.Directory = dir; PlayerPreferences.Reload();
      GarageSession.Open(Path.Combine(SessionState.GetString(PathKey, ""), "garage.json"), true); before = Now.Clone(); keyboard = InputSystem.AddDevice<Keyboard>("P7Ayarlar"); GameFlow.MainMenu();
      Tap(Key.Digit4);
      Do(() =>
      {
        Check(Touchscreen.current == null, "Dokunmatik ekran yok (Windows masaüstü)");
        Check(SettingsScreen.Open && View.Visible && SettingsView.CoversCurrentScreen, "Ana menü 4 → F Ayarlar açılır; IMGUI ayarlar geri dönüş olarak gizli");
        Check(View.Section == 0 && View.Rows[0].Key == "assist" && UiRoot.Instance.Screen.Q("settings-row-0").ClassListContains("sec"), "İlk bölüm Sürüş, ilk satır sürüş yardımı odakta");
        career = GarageSession.State.AssistLevel;
      });
      Do(() => Shot("drive", 1920, 1080));
      Tap(Key.RightArrow);
      Do(() => { Check(GarageSession.State.AssistLevel != career && View.Rows[0].Selected == Array.FindIndex(GarageViewModel.AssistLevels(GarageSession.State), l => l.Selected), "→ sürüş yardımını mevcut komutla değiştirir (" + career + " → " + GarageSession.State.AssistLevel + ")"); career = GarageSession.State.AssistLevel; });
      Tap(Key.DownArrow);
      Do(() => Check(View.Row == 1 && View.Rows[1].Key == "inv", "↓ sonraki satır"));
      Tap(Key.Enter);
      Do(() => Check(Now.On("inv") != before.On("inv"), "Enter açık/kapalıyı çevirir (direksiyon ters)"));
      Tap(Key.E);
      Do(() => Check(View.Section == 1 && View.Rows[0].Key == "cam", "E → Kamera bölümü"));
      Tap(Key.RightArrow);
      Do(() => Check(Now.Camera == Math.Min(before.Camera + 1, 3), "→ kamera biçimini değiştirir"));
      Do(() => Shot("camera", 1280, 720));
      Tap(Key.E);
      Do(() => Check(View.Section == 2 && View.Rows.Count == 1 && View.Rows[0].Key == "hud:harita", "Göstergeler: Windows'ta yalnız etkili harita biçimi"));
      Click("settings-row-0-c1");
      Do(() => Check(Now.Hud["harita"] == "yuvarlak" && UiRoot.Instance.Screen.Q("settings-row-0-c1").ClassListContains("sec"), "Fare harita biçimini seçer (yuvarlak)"));
      Tap(Key.E);
      Do(() => Check(View.Section == 3 && View.Rows.All(r => r.Slider), "E → Ses bölümü (sürgüler)"));
      Tap(Key.RightArrow);
      Do(() => Check(Now["ses"] == Math.Min(100, before["ses"] + 5), "→ oyun sesini %5 artırır"));
      Click("settings-row-1-down");
      Do(() => Check(Now["muz"] == Math.Max(0, before["muz"] - 5) && View.Row == 1, "Fare − müziği %5 azaltır"));
      Do(() => Shot("sound", 1920, 1080));
      Tap(Key.E);
      Do(() => Check(View.Section == 4 && View.Rows.Any(r => r.Key == "shd") && View.Rows.Any(r => r.Key == "perf"), "E → Grafik: gölgeler ve performans göstergesi"));
      Tap(Key.E);
      Do(() =>
      {
        int expected = GtKeyboardInput.Bindings().Length + 1;
        Check(View.Section == SettingsViewModel.Controls && View.KeyRowCount == expected && View.Rows.Any(r => r.Key == "steer"), "Kontroller: giriş biçimleri ve sürüş eşlemesinden " + expected + " satırlık tuş tablosu");
      });
      Do(() => Shot("controls", 1920, 1080));
      Do(() => Shot("controls", 2560, 1080));
      Do(() => Shot("controls", 1280, 720));
      Tap(Key.Q);
      Do(() => Check(View.Section == 4, "Q önceki bölüm"));
      Click("settings-section-0");
      Do(() => Check(View.Section == 0 && View.Row == 0, "Fare bölüm sekmesini açar"));
      Tap(Key.Escape);
      Do(() =>
      {
        var d = Disk();
        Check(!SettingsScreen.Open && !View.Visible, "Esc kaydedip kapatır");
        Check(d.On("inv") == Now.On("inv") && d.Camera == Now.Camera && d.Hud["harita"] == "yuvarlak" && d["ses"] == Now["ses"] && d["muz"] == Now["muz"], "Değişiklikler ayar dosyasına yazıldı");
        Check(SceneManager.GetActiveScene().name == "Garage" && GameFlow.Home && GameFlow.Hub == GameFlow.MenuHub.Home && !GameFlow.Paused, "Ana menüye döner, duraklatma açılmaz");
        GarageSession.Reload(); Check(GarageSession.State.AssistLevel == career, "Sürüş yardımı kariyer kaydından yeniden yüklenir");
        PlayerPreferences.Reload(); Check(Now.ToJson() == d.ToJson(), "Tercihler yeniden açılışta aynı");
        Check(TestPanelActions.StartRace("gp_1"), "Kariyer yarışı açıldı (gp_1)");
      });
      Wait(() => { var p = UnityEngine.Object.FindFirstObjectByType<GtPrototype>(); return p && p.Race != null && p.Simulation != null; });
      Do(() => { GameFlow.Pause(true); });
      Do(() => { Check(GameFlow.Paused, "Yarışta duraklatma"); GameFlow.Pause(false); SettingsScreen.Show(); });
      Do(() =>
      {
        Check(View.Visible && !UiRoot.Instance.GetComponent<RaceHudView>().Visible && SceneManager.GetActiveScene().name != "Garage", "Duraklatma → Ayarlar yarış sahnesinde F ekranı; HUD gizli");
      });
      Do(() => Shot("race", 1920, 1080));
      Tap(Key.Escape);
      Do(() => Check(!SettingsScreen.Open && GameFlow.Paused, "Yarışta Esc ayarları kapatıp duraklatma menüsüne döner (aynı Esc ikinci kez işlenmez)"));
      Tap(Key.Escape);
      Do(() => Check(!GameFlow.Paused, "Sonraki Esc yarışa devam ettirir"));
    }

    private static void Shot(string name, int w, int h) { shot = name; shotW = w; shotH = h; queued = false; Size(w, h); }
    private static void Size(int w, int h)
    {
      var a = typeof(EditorWindow).Assembly; var t = a.GetType("UnityEditor.GameView"); if (!game) { game = EditorWindow.GetWindow(t); originalSize = (int)t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).GetValue(game); }
      var st = a.GetType("UnityEditor.GameViewSizes"); var singleton = typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null); group = st.GetMethod("GetGroup").Invoke(singleton, new object[] { GameViewSizeGroupType.Standalone });
      int n = (int)group.GetType().GetMethod("GetTotalCount").Invoke(group, null); var size = Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"), new object[] { Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"), "FixedResolution"), w, h, "P7 ayarlar" }); group.GetType().GetMethod("AddCustomSize").Invoke(group, new[] { size }); sizes.Add(n);
      t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, n); game.Show(); game.Focus(); game.Repaint();
    }
    private static void Capture()
    {
      string path = Path.Combine(Project, "Logs/p7-settings-" + shot + "-" + shotW + ".png");
      if (!queued) { Check(Screen.width == shotW && Screen.height == shotH, "Game View çözünürlüğü " + shot + shotW); captureAfter = DateTime.UtcNow; ScreenCapture.CaptureScreenshot(path); queued = true; return; }
      if (!File.Exists(path) || File.GetLastWriteTimeUtc(path) < captureAfter) return;
      var png = new Texture2D(2, 2); try { png.LoadImage(File.ReadAllBytes(path)); Check(png.width == shotW && png.height == shotH, "PNG boyutu " + shot + shotW); } finally { UnityEngine.Object.DestroyImmediate(png); }
      var page = UiRoot.Instance.Screen.Q("f-settings"); var root = UiRoot.Instance.Root.layout; Rect main = page.Q(className: "st-main").worldBound, info = page.Q(className: "st-info").worldBound, list = page.Q(className: "st-sections").worldBound, back = page.Q("settings-back").worldBound, hints = page.Q(className: "ipuclari").worldBound;
      Check(info.xMax <= root.width && info.yMax < root.height - 60 && main.yMax < back.yMin && main.yMax < hints.yMin, "Ayarlar panelleri sınırlar içinde " + shot + shotW);
      Check(!main.Overlaps(info) && !main.Overlaps(list) && !back.Overlaps(hints), "Ayarlar panelleri çakışmaz " + shot + shotW);
      proof.images.Add(Path.GetFileName(path)); shot = null;
    }
    private static void Tick()
    {
      try
      {
        if (proof.runtimeErrors.Count > 0) throw new Exception(proof.runtimeErrors[0]); if (EditorApplication.timeSinceStartup - began > 180) throw new TimeoutException("P7 ayarlar kısa Play");
        if (steps.Count == 0) { if (!SettingsView.Instance || !UiRoot.Instance || GarageSession.State == null) return; Setup(); return; }
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
      proof.result = e == null ? "p7-settings-f-passed" : "failed"; proof.error = e?.ToString() ?? ""; proof.utc = DateTime.UtcNow.ToString("O");
      proof.sources = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories).Where(f => Path.GetExtension(f) == ".cs" || Path.GetExtension(f) == ".uss").OrderBy(f => f, StringComparer.Ordinal).Select(f => new Source { path = f.Substring(Project.Length + 1).Replace('\\', '/'), hash = Hash(f) }).ToArray();
      File.WriteAllText(Path.Combine(Project, "Logs/p7-settings-f-play.json"), JsonUtility.ToJson(proof, true));
      Debug.Log("P7 ayarlar F Play: " + proof.result + " (" + proof.checks.Count + " kontrol) " + proof.error);
      EditorApplication.ExitPlaymode(); EditorApplication.delayCall += () => EditorApplication.Exit(e == null ? 0 : 1);
    }
  }
}
