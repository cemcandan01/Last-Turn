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

namespace LastTurn.EditorValidation
{
  // Yalnız ayrı grafik Editor: F garaj/modifiye/mağaza ekranlarında TS garaj sahnesi (garaj-sahnesi.ts: beton otopark, kolonlar,
  // halka, hüzme, garajIsigi ışık/sis) ve aracın platformdaki yeri; F tasarımının arka-garaj arka planı.
  [InitializeOnLoad]
  public static class GarageScenePlayValidation
  {
    private const string Active="LastTurn.GarageScenePlay.Active",PathKey="LastTurn.GarageScenePlay.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc,environment;public List<string> checks=new(),images=new(),runtimeErrors=new(),editorDiagnostics=new(),outcomes=new(),fixtures=new();public Source[] sources;}
    private static Proof proof;private static double began,at,modeTime;private static Keyboard keyboard;private static Mouse mouse;
    private static string career,profile;private static Dictionary<string,string> files;
    private static string shot;private static int shotW,shotH;private static bool queued,initialized;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new();
    private static readonly Queue<(string,int,int)> shots=new();private static int mode,clickStage,refreshes;private static VisualElement pointer;private static Vector2 point;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static GarageScenePlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      foreach(var type in typeof(GarageScenePlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
      EditorApplication.isPaused=false;Time.timeScale=1;
      var gameType=typeof(EditorWindow).Assembly.GetType("UnityEditor.GameView");var playWindow=EditorWindow.GetWindow(gameType);playWindow.Show();playWindow.Focus();
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      InputSystem.settings.supportedDevices=new[]{"Keyboard","Mouse"};
      GarageSceneBuilder.Open();
      string backup=Path.Combine(Project,"Logs/GarageSceneBackup/"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(backup);
      foreach(var type in new[]{typeof(GtPrototypeSceneBuilder),typeof(RaceTestSceneBuilder)}){string path=(string)type.GetField("ScenePath").GetRawConstantValue();if(File.Exists(path))File.Move(path,Path.Combine(backup,Path.GetFileName(path)));type.GetMethod("EnsureScene",BindingFlags.Static|BindingFlags.NonPublic).Invoke(null,null);}
      AssetDatabase.SaveAssets();
      SessionState.SetString(PathKey,Path.Combine(Project,"Logs/GarageScenePlay/"+Guid.NewGuid().ToString("N")));SessionState.SetBool(Active,true);enterAfter=EditorApplication.timeSinceStartup+2;EditorApplication.update+=EnterWhenReady;
    }
    private static double enterAfter;
    private static void EnterWhenReady(){if(EditorApplication.isCompiling||EditorApplication.isUpdating){enterAfter=EditorApplication.timeSinceStartup+2;return;}if(EditorApplication.timeSinceStartup<enterAfter)return;EditorApplication.update-=EnterWhenReady;EditorApplication.EnterPlaymode();}
    private static void Changed(PlayModeStateChange s)
    {
      if(s==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){EditorApplication.isPaused=false;Time.timeScale=1;Application.runInBackground=true;proof=new Proof();initialized=false;mode=0;began=at=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;}
      if(s==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;}
    }
    private static void Logged(string message,string stack,LogType type)
    {if(type!=LogType.Error&&type!=LogType.Exception&&type!=LogType.Assert)return;if(!stack.Contains("LastTurn.")&&(stack.Contains("UnityEditor.Search.")||message.StartsWith("[Package Manager Window]",StringComparison.Ordinal)))proof.editorDiagnostics.Add(message);else proof.runtimeErrors.Add(message+"\n"+stack);}
    private static void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);proof.checks.Add(label);}
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","");}
    private static Dictionary<string,string> PlayerFiles()=>new[]{"LastTurnGarage","LastTurnMutant","LastTurnSettings"}.Select(n=>Path.Combine(Application.persistentDataPath,n)).Where(Directory.Exists).SelectMany(p=>Directory.GetFiles(p,"*",SearchOption.AllDirectories)).ToDictionary(p=>p,Hash);
    private static GtPrototype P=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    private static void Keys(params Key[] keys)=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(keys));
    private static void Pair(string name){Time.timeScale=0;shots.Enqueue((name,1280,720));shots.Enqueue((name,1920,1080));}
    private static void Next(int m){mode=m;modeTime=EditorApplication.timeSinceStartup;}
    private static double Age=>EditorApplication.timeSinceStartup-modeTime;
    private static GarageVehiclePreview Preview=>GarageView.Instance?GarageView.Instance.GetComponent<GarageVehiclePreview>():null;
    private static void Setup()
    {
      initialized=true;string basePath=SessionState.GetString(PathKey,"");PlayerPreferences.Directory=Path.Combine(basePath,"settings");PlayerPreferences.Reload();
      GarageSession.Open(Path.Combine(basePath,"garage.json"),true);files=PlayerFiles();keyboard=InputSystem.AddDevice<Keyboard>();Size(1280,720);GameFlow.Browse(0);Next(1);
    }
    private static void Advance()
    {
      switch(mode)
      {
        case 1: // F garaj: TS garaj sahnesi tam ekran arka plan
        {
          var g=GarageView.Instance;var p=Preview;if(!g||!g.Visible||p==null||Age<1.5)return;
          Check(p.SourceGarage,"TS garaj sahnesi yüklendi");Check(p.FullScreen&&p.Image.parent!=null&&p.Image.parent.name=="f-garage"&&p.Image.parent.IndexOf(p.Image)==0,"Tam ekran arka plan, panellerin altında");
          var scene=UnityEngine.Object.FindObjectsByType<SourceScene>(FindObjectsInactive.Include,FindObjectsSortMode.None).FirstOrDefault(s=>s.Data.key=="garage");Check(scene&&scene.RendererCount>=40,"Kaynak garaj düğümleri (kolon/halka/hüzme)");
          Check(scene.Data.lights.Length==5&&UnityEngine.Object.FindObjectsByType<Light>(FindObjectsSortMode.None).Count(l=>l.name.StartsWith("TS garaj ışığı"))>=5,"TS garaj ışıkları");
          var car=UnityEngine.Object.FindObjectsByType<SourceVehicleView>(FindObjectsSortMode.None).FirstOrDefault(v=>v.gameObject.layer==31);Check(car&&Mathf.Abs(car.transform.localPosition.y-.12f)<1e-4f,"Araç platformda");
          Check(!RenderSettings.fog||RenderSettings.fogEndDistance!=scene.Data.fogRange[1],"Garaj sisi yalnız vitrin çiziminde");Pair("garage");Next(2);return;
        }
        case 2: Keys(Key.M);Next(3);return;
        case 3:
          Keys();if(!GarageView.Instance.Modifying){if(Age>3)throw new TimeoutException("Modifiye açılmadı");return;}
          if(Age<1)return;Check(Preview.FullScreen&&Preview.Image.resolvedStyle.display==DisplayStyle.Flex,"Modifiyede garaj arka planı sürer");Pair("modify");Next(4);return;
        case 4:
          Keys(Key.Escape);Next(5);return;
        case 5:
          Keys();if(GarageView.Instance.Modifying)return;if(Age<.4)return;Keys(Key.E);Next(6);return;
        case 6:
        {
          Keys();var s=StoreView.Instance;if(!s||!s.Visible){if(Age>5)throw new TimeoutException("Mağaza açılmadı");return;}if(Age<1.5)return;
          Check(!Preview.FullScreen||!GarageView.Instance.Visible,"Garaj vitrini mağazada kapalı");Check(UnityEngine.Object.FindObjectsByType<SourceScene>(FindObjectsSortMode.None).Count(x=>x.Data.key=="garage")==1,"Mağaza kutusunda tek etkin garaj sahnesi");
          Pair("store");Next(7);return;
        }
        case 7:
          FinishSuccess();return;
      }
    }
    private static void FinishSuccess(){var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"Gerçek kalıcı kayıt hashleri aynı");Finish(null);}
    private static void Shot(string name,int w,int h){Time.timeScale=0;shot=name;shotW=w;shotH=h;queued=false;Size(w,h);}
    private static void Size(int w,int h)
    {
      var a=typeof(EditorWindow).Assembly;var t=a.GetType("UnityEditor.GameView");if(!game){game=EditorWindow.GetWindow(t);originalSize=(int)t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(game);}
      var st=a.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null);group=st.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int n=(int)group.GetType().GetMethod("GetTotalCount").Invoke(group,null);var size=Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"Garaj sahnesi"});group.GetType().GetMethod("AddCustomSize").Invoke(group,new[]{size});sizes.Add(n);
      t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,n);game.Show();game.Focus();game.Repaint();
    }
    private static void Capture()
    {
      string path=Path.Combine(Project,"Logs/p16-garage-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      proof.images.Add(Path.GetFileName(path));shot=null;Time.timeScale=shots.Count>0?0:1;
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>300)throw new TimeoutException("Garaj Play süre aşımı mode="+mode);if(EditorApplication.timeSinceStartup-at<.025)return;at=EditorApplication.timeSinceStartup;if(!initialized){if(!UiRoot.Instance)return;Setup();return;}if(shot!=null){Capture();return;}if(shots.Count>0){var q=shots.Dequeue();Shot(q.Item1,q.Item2,q.Item3);return;}if(Time.timeScale==0)Time.timeScale=1;Advance();File.WriteAllText(Path.Combine(Project,"Logs/p16-garage-progress.txt"),"mode="+mode+" scene="+SceneManager.GetActiveScene().name+" panel="+MutantRuntime.Panel);}catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);if(mouse!=null&&mouse.added)InputSystem.RemoveDevice(mouse);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.environment=Application.unityVersion+" | "+Application.platform+" | "+Application.productName+" | GameView | debug="+Debug.isDebugBuild;proof.result=e==null?"garage-scene-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png",".bytes",".shader"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/p16-garage-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("Garaj sahnesi Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
