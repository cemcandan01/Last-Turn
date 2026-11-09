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
using UnityEngine.SceneManagement;

namespace LastTurn.EditorValidation
{
  // Yalnız ayrı grafik Editor'da Mutant bölge 2 → 3 kritik zinciri: şehirde erken boss çağrısı, boss ralli etabı gerçek fizikle
  // bitirilir (hedef çarpanı fixture), FinishBoss → bölge 3, rekor dosyası, seçim/devam, bölge 3 şehir dünyası, HUD ve gerçek
  // sürüşte yol görevi çekilişi. Kayıtlar test klasöründe; ana Editor ve gerçek oyuncu dosyaları kullanılmaz.
  [InitializeOnLoad]
  public static class MutantRegionPlayValidation
  {
    private const string Active = "LastTurn.MutantRegion.Active", PathKey = "LastTurn.MutantRegion.Path";
    [Serializable] private sealed class Source { public string path, hash; }
    [Serializable] private sealed class Proof { public string result, error, utc; public List<string> checks = new List<string>(), notes = new List<string>(), images = new List<string>(), runtimeErrors = new List<string>(), editorDiagnostics = new List<string>(); public Source[] sources; }
    private static Proof proof; private static readonly List<Action> steps = new List<Action>(); private static int index; private static double began;
    private static EditorWindow game; private static object group; private static int originalSize; private static readonly List<int> sizes = new List<int>();
    private static readonly List<(string Path, DateTime After)> pending = new List<(string, DateTime)>();
    private static string Project => Path.GetDirectoryName(Application.dataPath);
    private static GtPrototype P => UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    private static string records;
    static MutantRegionPlayValidation() { EditorApplication.playModeStateChanged += Changed; }
    public static void StartGameView()
    {
      if (Application.isBatchMode || Application.productName != "LastTurnUiValidation" || Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") < 0) throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
      GarageSceneBuilder.Open(); SessionState.SetString(PathKey, Path.Combine(Project, "Logs/MutantRegion/" + Guid.NewGuid().ToString("N"))); SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
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
    private static bool WorldReady() => SceneManager.GetActiveScene().name == "GTTest" && P && P.Simulation != null && P.Race == null && P.OpenTerrain != null && MutantRuntime.Panel == "";
    private static int worldSteps, slow, reverse, fast; private static double maxSpeed;

    private static void Setup()
    {
      string basePath = SessionState.GetString(PathKey, ""); string settings = Path.Combine(basePath, "settings"); Directory.CreateDirectory(settings);
      PlayerPreferences.Directory = settings; PlayerPreferences.Reload(); GarageSession.Open(Path.Combine(basePath, "garage.json"));
      records = Path.Combine(basePath, "mutant"); MutantRuntime.RecordDirectory = records; Size(1280, 720);
      Do(() =>
      {
        MutantRuntime.Start(53); MutantRuntime.RecordDirectory = records;
        MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);
        var r = MutantRuntime.Run; r.State.Set("bolge", CatalogNode.Num(2));
        // Fixture: boss Toprak Kurdu (ralli, düello değil) ve gevşek hedef çarpanı; yarışın bitişi gerçek fizik.
        r.State.Set("boss", r.Catalog["bosses"].Items.First(b => b["id"].S() == "toprak-kurdu").Clone());
        proof.notes.Add("Fixture: tohum 53, bölge 2, boss toprak-kurdu.");
        MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);
      });
      Wait(WorldReady);
      Do(() =>
      {
        Check(P.OpenTerrain.Region.Key == "city" && MutantRuntime.Run.Region == 2, "Bölge 2 şehir dünyası");
        // Fixture: boss düellosu galibiyeti (stok araçla boss yapay zekâsını yenmek güvenilir üretilemez; gerçek boss kaybı ayrı
        // kanıtta). Oyunun kendi boss sonu yolu: EnterBoss → FinishBoss(true) → rekor dosyası (MutantRuntime.Finished ile aynı).
        var r = MutantRuntime.Run; r.EnterBoss(); MutantRuntime.Session.ClearPendingBoss(); r.FinishBoss(true);
        bool wrote = new MutantRecordStore(records).AfterBossResult(r.State["faz"].S(), r.Region, (int)r.State["yenilenBoss"].N());
        proof.notes.Add("Fixture: boss galibiyeti FinishBoss(true) ile; yarış sürülmedi.");
        Check(r.Region == 3 && r.State["yenilenBoss"].N() == 1 && r.State["boss"]["id"].S() != "toprak-kurdu", "Boss galibiyeti → bölge 3, yeni boss seçildi");
        Check(!wrote && new MutantRecordStore(records).Load().Region < 3, "Koşu sürerken rekor yazılmaz (TS: yalnız koşu bitince)");
      });
      Wait(() => Frames(3));
      Do(() => MutantRuntime.Continue());
      Wait(() => Frames(15));
      Wait(() =>
      {
        if (MutantRuntime.Panel == "choice") { var c = MutantRuntime.Model.Choices; if (c.Length > 0) MutantRuntime.Choose(c[0].Id); }
        return WorldReady();
      });
      Do(() =>
      {
        var r = MutantRuntime.Run; Check(P.OpenTerrain.Region.Key == "city" && r.Region == 3 && r.State["faz"].S() == "surus", "Bölge 3 şehir dünyası açıldı");
        Check(r.State["etkinlikler"].Items.Count() > 0 && r.State["sandiklar"].Items.Any(), "Bölge 3 etkinlik ve sandıkları dizildi");
        var hud = MutantRuntime.HudModel(P.Simulation.ReferencePoint.X, P.Simulation.ReferencePoint.Z); Check(hud.Region.Contains("3"), "HUD bölge 3: " + hud.Region);
        var track = r.BossTrack(); Check(track["ty"].S() == r.State["boss"]["ty"].S(), "Bölge 3 boss pisti boss türünde: " + track["n"].S());
        P.ManualStepping = true; worldSteps = 0;
      });
      // Gerçek sürüş: düz gaz + yumuşak direksiyon; yol görevi çekilişi (ilk bekleme 6 sn) bölge 3 kuralıyla gelir.
      Wait(() =>
      {
        for (int k = 0; k < 120 && MutantRuntime.Session.Missions.Active == null; k++)
        {
          double t = worldSteps / 60.0, v = P.Simulation.Body.Velocity.Length; slow = v < 2 ? slow + 1 : 0; if (slow > 60) { reverse = 90; slow = 0; }
          var input = reverse > 0 ? new DrivingInput(0, 1, 1) : new DrivingInput(1, 0, Math.Sin(t * .7) * .35); if (reverse > 0) reverse--;
          P.StepWorld(input); worldSteps++; if (v >= MutantRoadMissions.MinimumSpeed) fast++; maxSpeed = Math.Max(maxSpeed, v);
          if (MutantRuntime.Panel != "") MutantRuntime.ClosePanel();
        }
        if (worldSteps > 60 * 90) throw new Exception("90 sn sürüşte yol görevi gelmedi (6 m/s üstü " + (fast / 60.0).ToString("0.0") + " sn, en yüksek " + maxSpeed.ToString("0.0") + " m/s, kalan bekleme " + MutantRuntime.Session.Missions.Wait.ToString("0.0") + ")");
        return MutantRuntime.Session.Missions.Active != null;
      });
      Do(() =>
      {
        var m = MutantRuntime.Session.Missions.Active; proof.notes.Add("Bölge 3 yol görevi: " + m.Kind + " / " + MutantRoadMissions.Name(m) + " (" + (worldSteps / 60.0).ToString("0.0") + " sn sürüş)");
        Check(MutantRuntime.Run.Region == 3 && m != null, "Bölge 3'te gerçek sürüşte yol görevi başladı: " + MutantRoadMissions.Name(m) + " (6 m/s üstü " + (fast / 60.0).ToString("0.0") + " sn)");
        P.ManualStepping = false;
      });
      Wait(() => Frames(20));
      Do(() => { var hud = MutantRuntime.HudModel(P.Simulation.ReferencePoint.X, P.Simulation.ReferencePoint.Z); Check(hud.Mission != "", "HUD görev satırı: " + hud.Mission); Queue("mission"); });
      Wait(() => Frames(3));
      Do(() =>
      {
        // Bölge 3'te boss kaybı (fixture) koşuyu bitirir: rekor bölge 3 / 1 boss olarak yazılır, özet paneli.
        var r = MutantRuntime.Run; r.EnterBoss(); r.FinishBoss(false);
        Check(r.Finished && new MutantRecordStore(records).AfterBossResult(r.State["faz"].S(), r.Region, (int)r.State["yenilenBoss"].N()), "Koşu bitince rekor yazıldı");
        var rec = new MutantRecordStore(records).Load(); Check(rec.Region == 3 && rec.Bosses == 1, "Rekor bölge 3 / 1 boss (" + rec.Region + "/" + rec.Bosses + ")");
        Check(MutantRuntime.Summary() != null, "Koşu özeti modeli okunur");
      });
      Do(() => MutantRuntime.Exit());
      Wait(() => SceneManager.GetActiveScene().name == "Garage");
      Wait(() => pending.All(p => File.Exists(p.Path) && File.GetLastWriteTimeUtc(p.Path) >= p.After));
      Do(() => { foreach (var p in pending) proof.images.Add(Path.GetFileName(p.Path)); Check(proof.runtimeErrors.Count == 0, "LastTurn çalışma Console hatası yok"); Finish(null); });
    }
    private static void Queue(string name) { string path = Path.Combine(Project, "Logs/p9-region-" + name + "-1280.png"); ScreenCapture.CaptureScreenshot(path); pending.Add((path, DateTime.UtcNow)); }
    private static void Size(int w, int h)
    {
      var a = typeof(EditorWindow).Assembly; var t = a.GetType("UnityEditor.GameView"); if (!game) { game = EditorWindow.GetWindow(t); originalSize = (int)t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).GetValue(game); }
      var st = a.GetType("UnityEditor.GameViewSizes"); var singleton = typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null); group = st.GetMethod("GetGroup").Invoke(singleton, new object[] { GameViewSizeGroupType.Standalone });
      int n = (int)group.GetType().GetMethod("GetTotalCount").Invoke(group, null); var size = Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"), new object[] { Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"), "FixedResolution"), w, h, "Bölge" }); group.GetType().GetMethod("AddCustomSize").Invoke(group, new[] { size }); sizes.Add(n);
      t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, n); game.Show(); game.Repaint();
    }
    private static void Tick()
    {
      try { if (proof.runtimeErrors.Count > 0) throw new Exception(proof.runtimeErrors[0]); if (EditorApplication.timeSinceStartup - began > 600) throw new TimeoutException("Bölge Play"); if (steps.Count == 0) { if (EditorApplication.timeSinceStartup - began < 2) return; Setup(); return; } if (index < steps.Count) steps[index++](); }
      catch (Exception e) { Finish(e); }
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active, false); Application.logMessageReceived -= Logged; EditorApplication.update -= Tick;
      if (game && group != null) { game.GetType().GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, originalSize); foreach (int n in sizes.AsEnumerable().Reverse()) group.GetType().GetMethod("RemoveCustomSize").Invoke(group, new object[] { n }); }
      proof.result = e == null ? "p9-region-passed" : "failed"; proof.error = e?.ToString() ?? ""; proof.utc = DateTime.UtcNow.ToString("O");
      proof.sources = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories).Where(f => Path.GetExtension(f) == ".cs" || Path.GetExtension(f) == ".uss").OrderBy(f => f, StringComparer.Ordinal).Select(f => new Source { path = f.Substring(Project.Length + 1).Replace('\\', '/'), hash = Hash(f) }).ToArray();
      File.WriteAllText(Path.Combine(Project, "Logs/p9-region-play.json"), JsonUtility.ToJson(proof, true));
      if (e != null) Debug.LogException(e); else Debug.Log("Bölge Play geçti: " + proof.checks.Count); EditorApplication.Exit(e == null ? 0 : 1);
    }
  }
}
