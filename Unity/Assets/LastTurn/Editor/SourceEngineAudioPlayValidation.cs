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
using LastTurn.Ui;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.UIElements;
using UnityEngine.SceneManagement;

namespace LastTurn.EditorValidation
{
  // Yalnız ayrı grafik Editor'da ralli kamerası: aynı pist/araç/otomatik sürücü girdisiyle gerçek zamanlı iki geçiş (eski mutlak
  // y ≥ 1 tabanı, sonra zemin tabanı). Oyun kamerasının açısı her karede, aynı fizik izi 30/60/120 FPS kamera takvimleriyle
  // gölge kameralarda örneklenir. Aynı yarış saniyelerinde kare alınır; video değil, zamanlı karelerdir.
  [InitializeOnLoad]
  public static class SourceEngineAudioPlayValidation
  {
    private const string Active = "LastTurn.SourceEngineAudio.Active", PathKey = "LastTurn.SourceEngineAudio.Path";
    [Serializable] private sealed class Source { public string path, hash; }
    [Serializable] private sealed class Pass {public string car;public float listenerRms;public int sources;}
    [Serializable] private sealed class Shadow { public string track; public float legacyMax, legacySteepPct, legacyLongest, fixed30Max, fixed60Max, fixed120Max, fixedSteepPct, fixedLongest, fpsGap, fpsP95, fpsEnd; public int steps; }
    [Serializable] private sealed class Proof { public string result, error, utc; public List<string> checks = new List<string>(), images = new List<string>(), runtimeErrors = new List<string>(), editorDiagnostics = new List<string>(); public List<Pass> passes = new List<Pass>(); public List<Shadow> shadows = new List<Shadow>(); public Source[] sources; }
    private static Proof proof; private static readonly List<Action> steps = new List<Action>(); private static int index; private static double began, at;
    private static EditorWindow game; private static object group; private static int originalSize; private static readonly List<int> sizes = new List<int>();
    private static readonly List<(string Path, DateTime After)> pending = new List<(string, DateTime)>();
    private static readonly StringBuilder telemetry = new StringBuilder();
    private static string Project => Path.GetDirectoryName(Application.dataPath);
    private static GtPrototype P => UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    static SourceEngineAudioPlayValidation() { EditorApplication.playModeStateChanged += Changed; }
    public static void StartGameView()
    {
      if (Application.isBatchMode || Application.productName != "LastTurnUiValidation" || Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") < 0) throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Önce Play durmalı.");
      foreach(var type in typeof(SourceEngineAudioPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
      GarageSceneBuilder.Open(); SessionState.SetString(PathKey, Path.Combine(Project, "Logs/Camera/" + Guid.NewGuid().ToString("N"))); SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if (s == PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active, false)) { Application.runInBackground=true;proof = new Proof(); steps.Clear(); index = 0; began = at = EditorApplication.timeSinceStartup; Application.logMessageReceived += Logged; EditorApplication.update += Tick; }
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

    private static double waitUntil,measuredRms;private static string saved;private static Keyboard keys;
    private static SourceEngineAudio Engine=>UnityEngine.Object.FindFirstObjectByType<SourceEngineAudio>();
    private static void Setup()
    {
      string basePath=SessionState.GetString(PathKey,"");PlayerPreferences.Directory=Path.Combine(basePath,"settings");PlayerPreferences.Reload();GarageSession.Open(Path.Combine(basePath,"garage.json"));GarageState.AdminMode=true;GameFlow.Browse(0);keys=InputSystem.AddDevice<Keyboard>();
      Do(()=>Size(1280,720));Wait(()=>GarageView.Instance&&GarageView.Instance.Visible);
      Do(()=>Check(UnityEngine.Object.FindObjectsByType<AudioListener>(FindObjectsSortMode.None).Count(l=>l.enabled)==1,"Exactly one menu audio listener"));
      Do(()=>{GarageSession.State.SelectCar(0);Check(GarageSession.State.Equip(0,"turbo-kucuk"),"Existing turbo setup fixture");GarageView.Instance.ViewCar(0);});Wait(()=>Settle(4));
      Do(()=>{saved=GarageSession.State.Snapshot().ToString();var button=UiRoot.Instance.Screen.Q("garage-listen-engine");Check(button!=null,"Listen control exists");var point=button.worldBound.center;using(var e=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=point}))button.SendEvent(e);});
      Do(()=>{var button=UiRoot.Instance.Screen.Q("garage-listen-engine");using(var e=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=button.worldBound.center}))button.SendEvent(e);});
      Wait(()=>Engine&&Engine.Previewing);Do(()=>{Check(Engine.LayerSources==10,"Listen loads ten real layers");Check(Engine.EffectiveTurbo==.7,"Garage listen uses equipped turbo");Queue("p12-engine-listen-1280.png");waitUntil=EditorApplication.timeSinceStartup+5.3;});
      Wait(()=>EditorApplication.timeSinceStartup>=waitUntil);Do(()=>{Check(!Engine.Previewing,"Five real seconds listen ended");Check(saved==GarageSession.State.Snapshot().ToString(),"Listen does not change garage save");InputSystem.QueueStateEvent(keys,new KeyboardState(Key.L));});
      Do(()=>InputSystem.QueueStateEvent(keys,new KeyboardState()));Wait(()=>Engine.Previewing);
      Do(()=>{Check(Engine.Previewing,"L keyboard starts listen");Size(1920,1080);});Wait(()=>Settle(8));Do(()=>Queue("p12-engine-listen-1920.png"));Wait(()=>Settle(8));Do(()=>{GameFlow.MainMenu();});Wait(()=>!Engine.Previewing);Do(()=>Check(!Engine.Previewing,"Leaving garage cancels listen"));
      Do(()=>Check(TestPanelActions.StartRace("gp_1"),"Start real audio race"));Wait(()=>P&&P.Race!=null);
      for(int id=0;id<15;id++){
        int car=id;Do(()=>{GarageSession.State.SelectCar(car);GarageSession.PrepareDrive();P.InitializeRace("gp_1");P.ManualStepping=true;while(P.Race.Session.State==RaceState.Countdown)P.StepRace(new DrivingInput(0,0,0));for(int i=0;i<60;i++)P.StepRace(new DrivingInput(1,0,0));waitUntil=EditorApplication.timeSinceStartup+.3;measuredRms=0;});
        Wait(()=>{if(EditorApplication.timeSinceStartup<waitUntil)return false;var pcm=new float[512];AudioListener.GetOutputData(pcm,0);measuredRms=Math.Max(measuredRms,Math.Sqrt(pcm.Sum(v=>(double)v*v)/pcm.Length));if(measuredRms>1e-6)return true;if(EditorApplication.timeSinceStartup>waitUntil+3)throw new Exception("No actual engine output "+car);return false;});
        Do(()=>{Check(Engine.LoadedKey==P.AppliedGarageCarId,"Actual audio model "+car);Check(Engine.LayerSources==10,"Ten playing layer clips "+car);var sources=Engine.GetComponentsInChildren<AudioSource>();Check(sources.Count(s=>s.isPlaying&&s.clip&&s.clip.samples>0)>=10,"Audio subsystem playback "+car);Check(Engine.Mix.Gain>0,"Nonzero engine gain "+car);Check(measuredRms>1e-6,"Actual PCM output "+car);Check(UnityEngine.Object.FindObjectsByType<AudioListener>(FindObjectsSortMode.None).Count(l=>l.enabled)==1,"Exactly one race listener "+car);proof.passes.Add(new Pass{car=P.AppliedGarageCarId,listenerRms=(float)measuredRms,sources=Engine.LayerSources});});
      }
      Do(()=>{Size(1280,720);Queue("p12-engine-drive-1280.png");});Wait(()=>Settle(8));
      Do(()=>{PlayerPreferences.Current.Camera=3;});Wait(()=>Settle(8));Do(()=>Queue("p12-engine-cockpit-1280.png"));Wait(()=>Settle(8));
      Do(()=>{PlayerPreferences.Current.Set["ses"]=0;});Wait(()=>Settle(12));Do(()=>Check(Engine.Mix.Gain==0,"Volume zero mutes engine"));
      Do(()=>{PlayerPreferences.Current.Set["ses"]=85;GameFlow.Pause(true);});Wait(()=>Settle(8));Do(()=>Check(Engine.Mix.Gain==0,"Pause mutes engine"));Do(()=>{GameFlow.Pause(false);GameFlow.LeaveDrive();});Wait(()=>SceneManager.GetActiveScene().name=="Garage");
      Do(()=>{GameFlow.OpenStore();saved=GarageSession.State.Snapshot().ToString();});Wait(()=>StoreView.Instance&&StoreView.Instance.Visible);Do(()=>{StoreView.Instance.ViewCar(0);InputSystem.QueueStateEvent(keys,new KeyboardState(Key.L));});Do(()=>InputSystem.QueueStateEvent(keys,new KeyboardState()));Wait(()=>Engine.Previewing);Do(()=>{Check(Engine.LoadedKey==StoreView.Instance.ModelKey,"Store preview plays displayed car");Check(Engine.EffectiveTurbo==.7,"Store listen uses equipped turbo");Size(1280,720);});Wait(()=>Settle(8));Do(()=>Queue("p12-engine-store-1280.png"));Wait(()=>Settle(4));Do(()=>Size(1920,1080));Wait(()=>Settle(8));Do(()=>Queue("p12-engine-store-1920.png"));Wait(()=>Settle(4));Do(()=>{GameFlow.MainMenu();Check(saved==GarageSession.State.Snapshot().ToString(),"Store listen does not purchase or select");});Wait(()=>!Engine.Previewing);
      Wait(()=>pending.All(p=>File.Exists(p.Path)&&File.GetLastWriteTimeUtc(p.Path)>=p.After));Do(()=>{foreach(var p in pending)proof.images.Add(Path.GetFileName(p.Path));Check(GameAudio.MissingAssets.Count==0,"No missing sound assets");InputSystem.RemoveDevice(keys);Finish(null);});
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
      try { if (proof.runtimeErrors.Count > 0) throw new Exception(proof.runtimeErrors[0]); if (EditorApplication.timeSinceStartup - began > 840) throw new TimeoutException("Kaynak sunum Play"); if (steps.Count == 0) { if (EditorApplication.timeSinceStartup - began < 2) return; Setup(); return; } if (index < steps.Count) steps[index++](); }
      catch (Exception e) { Finish(e); }
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active, false); Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; GarageState.AdminMode = false;
      if (game && group != null) { game.GetType().GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, originalSize); foreach (int n in sizes.AsEnumerable().Reverse()) group.GetType().GetMethod("RemoveCustomSize").Invoke(group, new object[] { n }); }
      proof.result = e == null ? "p12-engine-passed" : "failed"; proof.error = e?.ToString() ?? ""; proof.utc = DateTime.UtcNow.ToString("O");
      proof.sources = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories).Where(f => new[]{".cs",".uss",".json",".png",".wav",".bytes",".shader"}.Contains(Path.GetExtension(f))).OrderBy(f => f, StringComparer.Ordinal).Select(f => new Source { path = f.Substring(Project.Length + 1).Replace('\\', '/'), hash = Hash(f) }).ToArray();
      File.WriteAllText(Path.Combine(Project, "Logs/p12-engine-play.json"), JsonUtility.ToJson(proof, true)); File.WriteAllText(Path.Combine(Project, "Logs/p12-engine-telemetry.csv"), telemetry.ToString());
      if (e != null) Debug.LogException(e); else Debug.Log("Kaynak sunum Play geçti: " + proof.checks.Count); EditorApplication.Exit(e == null ? 0 : 1);
    }
  }
}
