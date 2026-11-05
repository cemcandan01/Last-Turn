using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using LastTurn.Garage;
using LastTurn.Prototype;
using LastTurn.Ui;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;

namespace LastTurn.EditorValidation
{
  // P7-1: F arayüzü gerçek Play'de. Ana menü (sekmeler, pist kartları, klavye seçimi) ve panelsiz yarış HUD'u görünür;
  // dokunmatik ekran yokken sürüş/üst simge tuşları yerleşmez. Ekran görüntüleri Logs/p7-*.png (bakmak için).
  [InitializeOnLoad]
  public static class FUiPlayValidation
  {
    private const string Active = "LastTurn.P7.Active", PathKey = "LastTurn.P7.Path", BatchKey = "LastTurn.P7.Batch";
    [Serializable] private sealed class Proof { public string result, utc, error, menuKey, hudTimer, hudSpeed; public List<string> checks = new List<string>(); }
    private static Proof proof; private static int phase; private static double began, at; private static Keyboard keyboard; private static string before;
    private static string Project => Path.GetDirectoryName(Application.dataPath);
    static FUiPlayValidation() { EditorApplication.playModeStateChanged += Changed; }

    public static void StartBatch()
    {
      if (!Application.isBatchMode) throw new InvalidOperationException("Ayrı batch Editor gerekir.");
      SessionState.SetBool(BatchKey, true);
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
      InputSystem.settings.editorInputBehaviorInPlayMode = InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      Start();
    }

    [MenuItem("Last Turn/P7 F Arayüzü Play Doğrulaması")]
    public static void Start()
    {
      if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Önce Play'i durdurun.");
      GarageSceneBuilder.Open();
      SessionState.SetString(PathKey, Path.Combine(Project, "Logs/P7Play/" + Guid.NewGuid().ToString("N") + "/garage.json"));
      SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
    }

    private static void Changed(PlayModeStateChange state)
    {
      if (state == PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active, false)) { proof = new Proof(); phase = 0; began = EditorApplication.timeSinceStartup; EditorApplication.update += Tick; }
      if (state == PlayModeStateChange.ExitingPlayMode) EditorApplication.update -= Tick;
    }

    private static void Check(bool ok, string label) { if (!ok) throw new InvalidOperationException(label); proof.checks.Add(label); }
    private static void Press(params Key[] keys) => InputSystem.QueueStateEvent(keyboard, new KeyboardState(keys));
    // Batch Editor'da oyun penceresi yok: UI Toolkit paneli geçici olarak 1920×1080 dokuya çizilir, kamera görüntüsüyle
    // birleştirilir (IMGUI parçaları — miniharita, Mutant yuvaları — bu görüntüde yok). Etkileşimli Editor'da ekran görüntüsü.
    private static string pending; private static double shotAt; private static RenderTexture panelTarget;
    private static void Shot(string name)
    {
      if (!Application.isBatchMode) { ScreenCapture.CaptureScreenshot(Path.Combine(Project, "Logs/p7-" + name + ".png")); return; }
      panelTarget = new RenderTexture(1920, 1080, 24, RenderTextureFormat.ARGB32);
      var s = UiRoot.Instance.Settings; s.clearColor = true; s.colorClearValue = new Color(0, 0, 0, 0); s.targetTexture = panelTarget;
      Hud.SizeOverride = new Vector2(1920, 1080); pending = name; shotAt = EditorApplication.timeSinceStartup;
    }
    private static bool ShotPending()
    {
      if (pending == null) return false;
      if (EditorApplication.timeSinceStartup - shotAt < .35) return true;
      var camera = Camera.main; var scene = new RenderTexture(1920, 1080, 24); var a = new Texture2D(1920, 1080, TextureFormat.RGBA32, false); var b = new Texture2D(1920, 1080, TextureFormat.RGBA32, false);
      var previous = RenderTexture.active;
      try
      {
        if (camera) { var old = camera.targetTexture; camera.targetTexture = scene; camera.Render(); camera.targetTexture = old; RenderTexture.active = scene; a.ReadPixels(new Rect(0, 0, 1920, 1080), 0, 0); }
        RenderTexture.active = panelTarget; b.ReadPixels(new Rect(0, 0, 1920, 1080), 0, 0);
        var pa = a.GetPixels32(); var pb = b.GetPixels32();
        for (int i = 0; i < pa.Length; i++) { float t = pb[i].a / 255f; pa[i] = new Color32((byte)Mathf.Min(255, pa[i].r * (1 - t) + pb[i].r), (byte)Mathf.Min(255, pa[i].g * (1 - t) + pb[i].g), (byte)Mathf.Min(255, pa[i].b * (1 - t) + pb[i].b), 255); }
        a.SetPixels32(pa); a.Apply(); File.WriteAllBytes(Path.Combine(Project, "Logs/p7-" + pending + ".png"), a.EncodeToPNG());
      }
      finally
      {
        RenderTexture.active = previous; UiRoot.Instance.Settings.targetTexture = null; Hud.SizeOverride = null;
        scene.Release(); panelTarget.Release(); UnityEngine.Object.DestroyImmediate(scene); UnityEngine.Object.DestroyImmediate(panelTarget);
        UnityEngine.Object.DestroyImmediate(a); UnityEngine.Object.DestroyImmediate(b); pending = null;
      }
      return true;
    }
    private static int Count(string key) => key == "" ? -1 : LastTurn.Core.TestPanelModel.Tracks(GameFlow.Menu().Events, key.Split('_')[0]).Length;
    private static bool Wait(double s) => EditorApplication.timeSinceStartup - at > s;
    private static void Next() { phase++; at = EditorApplication.timeSinceStartup; }

    private static readonly List<(double Wait, Func<GtPrototype, bool> Act)> steps = new List<(double, Func<GtPrototype, bool>)>(); private static int step;
    private static void Add(double wait, Func<GtPrototype, bool> act) => steps.Add((wait, act));
    private static void Do(double wait, Action<GtPrototype> act) => steps.Add((wait, p => { act(p); return true; }));
    /// Tuşa bas ve bırak (wasPressedThisFrame için iki ayrı kare).
    private static void Tap(Key key) { Do(.3, _ => Press(key)); Do(.15, _ => Press()); }
    private static void Plan(MainMenuView menu, RaceHudView hud)
    {
      steps.Clear(); step = 0;
      Do(1.2, _ =>
      {
        Check(Touchscreen.current == null, "Dokunmatik ekran yok (Windows masaüstü)");
        Check(menu.Visible && menu.Showing == GameFlow.MenuHub.Home && menu.HomeItemCount == 4, "Ana menü: yalnız YARIŞ, MUTANT, PROFİL, AYARLAR");
        Check(menu.CardCount == 0, "Ana menüde pist kartı yok");
        Shot("menu");
      });
      Tap(Key.Enter);
      Do(.3, _ =>
      {
        Check(menu.Showing == GameFlow.MenuHub.Race && menu.CardCount == Count(menu.SelectedKey) && menu.SelectedKey != "", "Enter → yarış menüsü; kariyer pist kartları (" + menu.SelectedKey + ")");
        before = menu.SelectedKey; Shot("yaris-menu");
      });
      Tap(Key.DownArrow);
      Do(.3, _ => { Check(menu.SelectedKey.Split((char)95)[0] != before.Split((char)95)[0] && menu.CardCount == Count(menu.SelectedKey), "↓ ile tür değişti (" + before + " → " + menu.SelectedKey + ")"); before = menu.SelectedKey; });
      Tap(Key.RightArrow);
      Do(.3, _ => { proof.menuKey = menu.SelectedKey; Check(menu.SelectedKey != before, "→ ile sonraki pist kartı (" + before + " → " + menu.SelectedKey + ")"); });
      Tap(Key.E);
      Do(.4, _ => { Check(!GameFlow.Home && GameFlow.Hub == GameFlow.MenuHub.Race && UnityEngine.Object.FindFirstObjectByType<GarageScreen>().SelectedTab == 0, "E → yarış menüsünden Garaj (geçici ekran)"); GameFlow.Back(); });
      Do(.3, _ => Check(menu.Showing == GameFlow.MenuHub.Race && menu.Visible, "Garaj geri düğmesi yarış menüsüne döner"));
      Tap(Key.Escape);
      Do(.3, _ => Check(menu.Showing == GameFlow.MenuHub.Home && menu.Visible, "Esc → ana menü"));
      Tap(Key.RightArrow);
      Tap(Key.Enter);
      Do(.3, _ => { Check(menu.Showing == GameFlow.MenuHub.Mutant && !MutantRuntime.Active && !menu.ConfirmOpen, "→ + Enter → Mutant menüsü (koşu başlamadı)"); Shot("mutant-menu"); });
      Tap(Key.Enter);
      Do(.3, _ => { Check(menu.ConfirmOpen && !MutantRuntime.Active, "Enter → \"Yeni koşu başlasın mı?\" onayı"); Shot("mutant-onay"); });
      Tap(Key.Escape);
      Do(.3, _ => Check(!menu.ConfirmOpen && !MutantRuntime.Active && menu.Showing == GameFlow.MenuHub.Mutant, "Esc → onay kapandı, koşu başlamadı"));
      Tap(Key.Enter); Tap(Key.Enter);
      Add(.3, _ => MutantRuntime.Active);
      Do(.5, _ => { Check(MutantRuntime.Active && MutantRuntime.Panel == "start", "Onay → koşu başı (araç seçimi)"); MutantRuntime.Exit(); });
      Add(.5, _ => UnityEngine.SceneManagement.SceneManager.GetActiveScene().name == "Garage" && menu.Visible);
      Do(.2, _ => { Check(menu.Showing == GameFlow.MenuHub.Mutant, "Koşudan çıkınca Mutant menüsü"); Check(TestPanelActions.StartRace("gp_1"), "Kariyer yarışı açıldı (gp_1)"); });
      Add(.2, p => p && p.Race != null && p.Simulation != null);
      Do(1.0, _ => { Check(hud.Visible, "Panelsiz yarış HUD'u geri sayımda görünür"); Shot("hud-sayim"); Press(Key.W); });
      Do(6.5, p =>
      {
        var r = Hud.Rects(p);
        foreach (var key in new[] { "Gas", "Brake", "Left", "Right", "Handbrake", "Pause", "Camera", "Respawn", "Settings" })
          Check(!r.ContainsKey(key) && p.GetComponent<TouchDrivingOverlay>().ControlRect(key) == null, "Dokunmatik tuş yok: " + key);
        Check(r.ContainsKey("Timer") && r.ContainsKey("Speed") && r.ContainsKey("Title") && r.ContainsKey("Map"), "F yerleşimi: süre, hız, pist adı, miniharita");
        proof.hudTimer = hud.TimerText; proof.hudSpeed = hud.SpeedText;
        Check(hud.Visible && hud.TimerText.Contains(":") && int.Parse(hud.SpeedText) > 20, "Sürüşte süre ve hız akıyor (" + hud.TimerText + ", " + hud.SpeedText + " km/sa)");
        Shot("hud"); Press();
      });
      Do(.5, _ => { });
    }

    private static void Tick()
    {
      try
      {
        if (EditorApplication.timeSinceStartup - began > 90) throw new TimeoutException("P7 Play süre sınırı.");
        var p = UnityEngine.Object.FindFirstObjectByType<GtPrototype>(); if (p) p.SendMessage("OnApplicationFocus", true);
        if (ShotPending()) { at = EditorApplication.timeSinceStartup; return; }
        var ui = UiRoot.Instance; var menu = ui ? ui.GetComponent<MainMenuView>() : null; var hud = ui ? ui.GetComponent<RaceHudView>() : null;
        if (phase == 0)
        {
          if (!UnityEngine.Object.FindFirstObjectByType<GarageScreen>() || !ui) return;
          GarageSession.Open(SessionState.GetString(PathKey, ""), true); GameFlow.MainMenu();
          keyboard = InputSystem.AddDevice<Keyboard>("P7Test"); Plan(menu, hud); Next(); return;
        }
        // adım listesi: (bekleme sn, iş); iş false dönerse koşul sağlanana kadar beklenir
        if (step >= steps.Count) { Finish(null); return; }
        if (!Wait(steps[step].Wait)) return;
        if (steps[step].Act(p)) { step++; at = EditorApplication.timeSinceStartup; }
      }
      catch (Exception e) { Finish(e); }
    }

    private static void Finish(Exception error)
    {
      SessionState.SetBool(Active, false); EditorApplication.update -= Tick;
      if (keyboard != null && keyboard.added) InputSystem.RemoveDevice(keyboard); keyboard = null;
      proof.result = error == null ? "p7-ui-play-passed" : "failed"; proof.utc = DateTime.UtcNow.ToString("O"); proof.error = error?.ToString() ?? "";
      File.WriteAllText(Path.Combine(Project, "Logs/p7-ui-play.json"), JsonUtility.ToJson(proof, true));
      if (error == null) Debug.Log("P7 F arayüzü Play: " + proof.checks.Count + " kontrol geçti."); else Debug.LogException(error);
      EditorApplication.ExitPlaymode();
      if (SessionState.GetBool(BatchKey, false)) { SessionState.SetBool(BatchKey, false); EditorApplication.delayCall += () => EditorApplication.Exit(error == null ? 0 : 1); }
    }
  }
}
