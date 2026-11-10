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
  public static class SourcePresentationPlayValidation
  {
    private const string Active = "LastTurn.SourcePresentation.Active", PathKey = "LastTurn.SourcePresentation.Path";
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
    static SourcePresentationPlayValidation() { EditorApplication.playModeStateChanged += Changed; }
    public static void StartGameView()
    {
      if (Application.isBatchMode || Application.productName != "LastTurnUiValidation" || Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") < 0) throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Önce Play durmalı.");
      foreach(var type in typeof(SourcePresentationPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
      GarageSceneBuilder.Open(); SessionState.SetString(PathKey, Path.Combine(Project, "Logs/Camera/" + Guid.NewGuid().ToString("N"))); SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if (s == PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active, false)) { proof = new Proof(); steps.Clear(); index = 0; began = at = EditorApplication.timeSinceStartup; Application.logMessageReceived += Logged; EditorApplication.update += Tick; }
      if (s == PlayModeStateChange.ExitingPlayMode) { Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; }
    }
    private static void Logged(string message, string stack, LogType type)
    { if (type != LogType.Error && type != LogType.Exception && type != LogType.Assert) return; if(!stack.Contains("LastTurn.")&&(stack.Contains("UnityEditor.Search.")||message.StartsWith("[Package Manager Window]",StringComparison.Ordinal))) proof.editorDiagnostics.Add(message); else proof.runtimeErrors.Add(message + "\n" + stack); }
    private static void Check(bool ok, string label) { if (!ok) throw new InvalidOperationException(label); proof.checks.Add(label); }
    private static void Do(Action a) => steps.Add(a);
    private static void Wait(Func<bool> ready) { Do(() => { if (!ready()) index--; }); }
    private static string Hash(string path) { using (var h = SHA256.Create()) return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-", ""); }
    private static string F(double v) => v.ToString("0.###", CultureInfo.InvariantCulture);

    private static bool Ready(string type) { var p = P; return p && p.Race != null && p.Simulation != null && p.Race.Event.Type == type && SceneManager.GetActiveScene().name != "Garage"; }
    private static void Setup()
    {
      string basePath=SessionState.GetString(PathKey,"");PlayerPreferences.Directory=Path.Combine(basePath,"settings");PlayerPreferences.Reload();GarageSession.Open(Path.Combine(basePath,"garage.json"));GarageState.AdminMode=true;GameFlow.MainMenu();
      Do(()=>{Size(1280,720);Check(SourceScene.Create("missing-source",null)==null,"Missing graph returns null");});
      var catalog=GarageSession.Catalog;
      // All source graphs are loaded, not merely listed by filename.
      for(int id=0;id<15;id++){
        int car=id;Do(()=>{
          string key=catalog.Data["cars"][car]["k"].S();var root=new GameObject("Source graph audit");root.SetActive(false);var v=SourceVehicleView.Create(key,root.transform);
          Check(v!=null&&v.Scene.Data.id==car,"Car source identity "+key);Check(v.Scene.RendererCount>10,"Car geometry "+key);
          Check(v.Scene.Tags.ContainsKey("interior")&&v.Scene.Tags.ContainsKey("steering")&&v.Scene.Tags.ContainsKey("rpm-needle")&&v.Scene.Tags.ContainsKey("speed-needle"),"Cockpit bindings "+key);
          for(int i=0;i<4;i++)Check(v.Scene.Tags.ContainsKey("wheel-pivot-"+i)&&v.Scene.Tags.ContainsKey("wheel-spin-"+i),"Wheel bindings "+key+"/"+i);
          Check(v.Scene.MirrorFaces.Count>=3,"Mirror faces "+key);Check(v.GetComponentsInChildren<Collider>(true).Length==0,"No physics components "+key);UnityEngine.Object.Destroy(root);
        });
      }
      foreach(var track in RaceData.Load().Tracks.Tracks){string key=track.Key;Do(()=>AuditWorld(key));}
      foreach(string world in new[]{"hub","park","city"}){string key=world;Do(()=>AuditWorld(key));}
      Do(()=>Check(TestPanelActions.StartRace("gp_1"),"Start real race"));Wait(()=>Ready("gp"));
      Do(()=>{P.ManualStepping=true;while(P.Race.Session.State==RaceState.Countdown)P.StepRace(new DrivingInput(0,0,0));});
      Do(()=>AuditReadOnly());
      for(int id=0;id<15;id++){
        int car=id;Do(()=>{Check(GarageSession.State.SelectCar(car),"Select car "+car);Check(GarageSession.PrepareDrive(),"Prepare car "+car);P.InitializeRace("gp_1");P.ManualStepping=true;while(P.Race.Session.State==RaceState.Countdown)P.StepRace(new DrivingInput(0,0,0));PlayerPreferences.Current.Camera=0;});
        Wait(()=>Settle(8));Do(()=>{Check(P.SourceVehicle&&P.SourceVehicle.Scene.Data.id==car,"Live selected model "+car);for(int i=0;i<20;i++)P.StepRace(new DrivingInput(1,0,.4));});
        Do(()=>Queue("p11-source-car-"+car+"-1280.png"));Wait(()=>Settle(4));
        Do(()=>PlayerPreferences.Current.Camera=3);Wait(()=>Settle(8));
        Do(()=>{Check(P.SourceVehicle.MirrorFrames>0,"Actual mirror render "+car);Check(P.SourceVehicle.Scene.Tags["interior"].gameObject.activeSelf,"Live cockpit "+car);Queue("p11-source-cockpit-"+car+"-1280.png");});Wait(()=>Settle(4));
      }
      Do(()=>{Size(1920,1080);PlayerPreferences.Current.Camera=3;});Wait(()=>Settle(8));Do(()=>Queue("p11-source-cockpit-14-1920.png"));Wait(()=>Settle(4));Do(()=>Size(1280,720));
      foreach(string key in new[]{"gp_2","gp_5","gp_6","rx_3","rx_5","rl_2","rl_5","rl_6","rl_7","dp_4","dg_1"}){
        string track=key;Do(()=>{PlayerPreferences.Current.Camera=0;GameFlow.Conditions=RaceConditions.DefaultFor(RaceConditions.ThemeOf(track));P.InitializeRace(track);});Wait(()=>Settle(8));Do(()=>Queue("p11-source-world-"+track+"-1280.png"));Wait(()=>Settle(4));
      }
      foreach(var condition in new[]{("morning","sun"),("evening","rain"),("night","snow")}){
        var c=condition;Do(()=>{Size(1920,1080);GameFlow.Conditions=new RaceConditions{TimeOfDay=c.Item1,Weather=c.Item2};P.InitializeRace("gp_1");P.SourceEnvironment.Configure(P,"gp_1",P.Conditions);});Wait(()=>Settle(8));Do(()=>Queue("p11-source-weather-"+c.Item1+"-"+c.Item2+"-1920.png"));Wait(()=>Settle(4));
      }
      foreach(string key in new[]{"hub","park","city"}){string world=key;Do(()=>GameFlow.LeaveDrive());Wait(()=>SceneManager.GetActiveScene().name=="Garage");Do(()=>Check(WorldData.Open(world),"Open world command "+world));Wait(()=>P&&P.Simulation!=null&&P.Race==null&&P.OpenTerrain!=null);Do(()=>{P.ManualStepping=true;PlayerPreferences.Current.Camera=0;Size(1280,720);});Wait(()=>Settle(8));Do(()=>Queue("p11-source-open-"+world+"-1280.png"));Wait(()=>Settle(4));}
      Do(()=>GameFlow.LeaveDrive());Wait(()=>SceneManager.GetActiveScene().name=="Garage");Do(()=>{Size(1920,1080);GameFlow.Browse(0);});Wait(()=>Settle(12));Do(()=>Queue("p11-source-garage-1920.png"));Wait(()=>Settle(4));Wait(()=>pending.All(p=>File.Exists(p.Path)&&File.GetLastWriteTimeUtc(p.Path)>=p.After));
      Do(()=>{foreach(var p in pending){var png=new Texture2D(2,2);png.LoadImage(File.ReadAllBytes(p.Path));Check(png.width==(p.Path.Contains("1920")?1920:1280)&&png.height==(p.Path.Contains("1920")?1080:720),"Game View PNG "+Path.GetFileName(p.Path));proof.images.Add(Path.GetFileName(p.Path));UnityEngine.Object.Destroy(png);}Finish(null);});
    }
    private static void AuditWorld(string key){var root=new GameObject("World graph audit");root.SetActive(false);var scene=SourceScene.Create("world-"+key,root.transform);Check(scene&&scene.RendererCount>0,"World source geometry "+key);Check(scene.GetComponentsInChildren<Collider>(true).Length==0,"World presentation only "+key);UnityEngine.Object.Destroy(root);}
    private static void AuditReadOnly()
    {
      var ends=new List<double[]>();
      foreach(int fps in new[]{30,60,120}){
        var a=new PowertrainVehicle(P.Parameters);var b=new PowertrainVehicle(P.Parameters);var ra=new PowertrainFixedStepRunner(a);var rb=new PowertrainFixedStepRunner(b);
        DrivingInput Input(int step)=>new DrivingInput(1,0,step<120?.25:-.15,false,true);
        for(int frame=0;frame<fps*4;frame++){
          ra.Advance(1d/fps,Input);rb.Advance(1d/fps,Input);var before=RemoteSnapshots.Capture(a);P.SourceVehicle.Pose(GtPresentation.Position(a.ReferencePoint),GtPresentation.Rotation(a.Body.Orientation),a,ra.PreviousBody,ra.CurrentBody,(float)ra.Alpha,false);
          if(!before.SequenceEqual(RemoteSnapshots.Capture(a)))throw new Exception("Presentation mutated simulation");
        }
        Check(RemoteSnapshots.Capture(a).SequenceEqual(RemoteSnapshots.Capture(b)),"Presentation read-only twin trace "+fps);Check(a.Body.Steps==240,"Fixed 240 steps "+fps);ends.Add(RemoteSnapshots.Capture(a));
      }
      Check(ends.All(e=>e.SequenceEqual(ends[0])),"30/60/120 FPS same physics with source presentation");
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
      proof.result = e == null ? "p11-source-passed" : "failed"; proof.error = e?.ToString() ?? ""; proof.utc = DateTime.UtcNow.ToString("O");
      proof.sources = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories).Where(f => new[]{".cs",".uss",".json",".png",".wav",".bytes",".shader"}.Contains(Path.GetExtension(f))).OrderBy(f => f, StringComparer.Ordinal).Select(f => new Source { path = f.Substring(Project.Length + 1).Replace('\\', '/'), hash = Hash(f) }).ToArray();
      File.WriteAllText(Path.Combine(Project, "Logs/p11-source-play.json"), JsonUtility.ToJson(proof, true)); File.WriteAllText(Path.Combine(Project, "Logs/p11-source-telemetry.csv"), telemetry.ToString());
      if (e != null) Debug.LogException(e); else Debug.Log("Kaynak sunum Play geçti: " + proof.checks.Count); EditorApplication.Exit(e == null ? 0 : 1);
    }
  }
}
