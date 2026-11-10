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
  // Yalnız ayrı grafik Editor: Ayarlar “Performans göstergesi” satırı ve gerçek kariyer gp_1 bitişinin ödülüyle seviye atlama
  // kutlaması (TS seviye-ui.ts kutlamaGoster: sonuçta 2,3 sn sonra, açılanlar, Enter ile kapatma). XP eşiği fixture.
  [InitializeOnLoad]
  public static class LevelUpPlayValidation
  {
    private const string Active="LastTurn.LevelUpPlay.Active",PathKey="LastTurn.LevelUpPlay.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc,environment;public List<string> checks=new(),images=new(),runtimeErrors=new(),editorDiagnostics=new(),outcomes=new(),fixtures=new();public Source[] sources;}
    private static Proof proof;private static double began,at,modeTime;private static Keyboard keyboard;private static Mouse mouse;
    private static string career,profile;private static Dictionary<string,string> files;
    private static string shot;private static int shotW,shotH;private static bool queued,initialized;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new();
    private static readonly Queue<(string,int,int)> shots=new();private static int mode,clickStage,refreshes;private static VisualElement pointer;private static Vector2 point;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static LevelUpPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      foreach(var type in typeof(LevelUpPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
      EditorApplication.isPaused=false;Time.timeScale=1;
      var gameType=typeof(EditorWindow).Assembly.GetType("UnityEditor.GameView");var playWindow=EditorWindow.GetWindow(gameType);playWindow.Show();playWindow.Focus();
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      InputSystem.settings.supportedDevices=new[]{"Keyboard","Mouse"};
      GarageSceneBuilder.Open();
      string backup=Path.Combine(Project,"Logs/LevelUpSceneBackup/"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(backup);
      foreach(var type in new[]{typeof(GtPrototypeSceneBuilder),typeof(RaceTestSceneBuilder)}){string path=(string)type.GetField("ScenePath").GetRawConstantValue();if(File.Exists(path))File.Move(path,Path.Combine(backup,Path.GetFileName(path)));type.GetMethod("EnsureScene",BindingFlags.Static|BindingFlags.NonPublic).Invoke(null,null);}
      AssetDatabase.SaveAssets();
      SessionState.SetString(PathKey,Path.Combine(Project,"Logs/LevelUpPlay/"+Guid.NewGuid().ToString("N")));SessionState.SetBool(Active,true);enterAfter=EditorApplication.timeSinceStartup+2;EditorApplication.update+=EnterWhenReady;
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
    private static RaceTestDriver driver;private static double xpBefore;private static int levelBefore;
    private static void Setup()
    {
      initialized=true;string basePath=SessionState.GetString(PathKey,"");PlayerPreferences.Directory=Path.Combine(basePath,"settings");PlayerPreferences.Reload();
      GarageSession.Open(Path.Combine(basePath,"garage.json"),true);files=PlayerFiles();keyboard=InputSystem.AddDevice<Keyboard>();Size(1280,720);
      PlayerPreferences.Current.Set["perf"]=1;Check(PlayerPreferences.Save(),"Performans göstergesi tercihi kaydedildi");GameFlow.MainMenu();Next(1);
    }
    private static void Advance()
    {
      var p=P;
      switch(mode)
      {
        case 1: // ana menüde performans satırı
        {
          var menu=UiRoot.Instance.GetComponent<MainMenuView>();if(!menu||!menu.Visible||Age<1.5||PerformanceOverlay.Text=="")return;
          Check(PerformanceOverlay.Text.Contains(" fps · kare ")&&PerformanceOverlay.Text.Contains(" çağrı · ")&&PerformanceOverlay.Text.EndsWith("k üçgen"),"Performans satırı TS biçiminde");
          Check(CareerLevelUps.Pending==0&&!LevelUpView.Open,"Seviye atlamadan kutlama yok");proof.outcomes.Add("Menü: "+PerformanceOverlay.Text);Pair("perf-menu");Next(2);return;
        }
        case 2: // XP seviye eşiğinin hemen altına (fixture), sonra gerçek gp_1 bitişi
        {
          var s=GarageSession.State;levelBefore=s.Level;double need=VehicleCatalog.LevelBase(levelBefore+1)-s.Xp-1;
          Check(GarageSession.Transact(g=>{g.AddXp(need);return true;},"Test XP"),"Fixture XP");Check(GarageSession.State.Level==levelBefore,"Fixture seviye atlatmadı");
          proof.fixtures.Add("XP "+(levelBefore+1)+". seviye eşiğinin 1 altına ("+need+" XP)");xpBefore=GarageSession.State.Xp;
          Check(TestPanelActions.StartRace("gp_1"),"Kariyer gp_1");Next(3);return;
        }
        case 3:
          if(p?.Race==null||SceneManager.GetActiveScene().name!="RaceTest")return;
          p.ManualStepping=true;driver=RaceTestDriver.For("gp");while(p.Race.Session.State==RaceState.Countdown)p.StepRace(driver.Countdown(p.Race));Next(4);return;
        case 4:
        {
          for(int k=0;k<900&&p.Race.Session.State==RaceState.Running;k++){p.StepRace(driver.Input(p.Race));driver.RespawnIfStuck(p.Race);}
          if(p.Race.Session.State==RaceState.Running){if(Age>120)throw new TimeoutException("gp_1 bitmedi");return;}
          Check(GarageSession.State.Xp>xpBefore,"Gerçek yarış ödülü XP");Check(GarageSession.State.Level>levelBefore,"Gerçek ödülle seviye atlandı");
          Check(CareerLevelUps.Pending==1,"Kutlama sırada");Check(!LevelUpView.Open,"Kutlama sonuç ekranında hemen açılmaz");p.ManualStepping=false;Next(5);return;
        }
        case 5:
        {
          if(!ResultView.Instance||!ResultView.Instance.Visible)return;
          if(!LevelUpView.Open){if(Age>8)throw new TimeoutException("Kutlama açılmadı");return;}
          Check(Age>=LevelUpView.ResultDelay-.1,"XP çubuğundan sonra (2,3 sn)");var m=LevelUpView.Instance.Shown;
          var expected=CareerLevelUp.Between(GarageSession.Catalog,RaceData.Load().Tracks,levelBefore,GarageSession.State.Level);
          Check(m.New==GarageSession.State.Level&&m.Unlocked.Select(u=>u.Name).SequenceEqual(expected.Unlocked.Select(u=>u.Name)),"Açılanlar saf modelle aynı");
          var page=UiRoot.Instance.Top.Q("seviye-kutlama");Check(page!=null&&page.Query<Label>().ToList().Any(l=>l.text=="Seviye "+m.New+"!"),"Seviye başlığı görünür");
          Check(page.Query<Label>(name:"seviye-acilan").ToList().Count==m.Unlocked.Length,"Açılan satırları");proof.outcomes.Add("Seviye "+levelBefore+"→"+m.New+", açılan: "+string.Join(", ",m.Unlocked.Select(u=>u.Name)));
          Pair("level-up");Next(6);return;
        }
        case 6: // gerçek klavye Enter kapatır, sonuç ekranı Enter'ı işlemez
          if(Age<.3)return;Keys(Key.Enter);Next(7);return;
        case 7:
          Keys();if(LevelUpView.Open){if(Age>3)throw new TimeoutException("Kutlama kapanmadı");return;}
          Check(ResultView.Instance.Visible&&SceneManager.GetActiveScene().name=="RaceTest","Kapatma sonuç ekranında kalır (Enter sonuca geçmedi)");Pair("result-after");Next(8);return;
        case 8:
          GameFlow.LeaveDrive();Next(9);return;
        case 9:
          if(SceneManager.GetActiveScene().name!="Garage")return;Check(CareerLevelUps.Pending==0,"Bekleyen kutlama kalmadı");FinishSuccess();return;
      }
    }
    private static void FinishSuccess(){var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"Gerçek kalıcı kayıt hashleri aynı");Finish(null);}
    private static void Shot(string name,int w,int h){Time.timeScale=0;shot=name;shotW=w;shotH=h;queued=false;Size(w,h);}
    private static void Size(int w,int h)
    {
      var a=typeof(EditorWindow).Assembly;var t=a.GetType("UnityEditor.GameView");if(!game){game=EditorWindow.GetWindow(t);originalSize=(int)t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(game);}
      var st=a.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null);group=st.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int n=(int)group.GetType().GetMethod("GetTotalCount").Invoke(group,null);var size=Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"Seviye kutlaması"});group.GetType().GetMethod("AddCustomSize").Invoke(group,new[]{size});sizes.Add(n);
      t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,n);game.Show();game.Focus();game.Repaint();
    }
    private static void Capture()
    {
      string path=Path.Combine(Project,"Logs/p15-levelup-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      proof.images.Add(Path.GetFileName(path));shot=null;Time.timeScale=shots.Count>0?0:1;
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>300)throw new TimeoutException("Seviye Play süre aşımı mode="+mode);if(EditorApplication.timeSinceStartup-at<.025)return;at=EditorApplication.timeSinceStartup;if(!initialized){if(!UiRoot.Instance)return;Setup();return;}if(shot!=null){Capture();return;}if(shots.Count>0){var q=shots.Dequeue();Shot(q.Item1,q.Item2,q.Item3);return;}if(Time.timeScale==0)Time.timeScale=1;Advance();File.WriteAllText(Path.Combine(Project,"Logs/p15-levelup-progress.txt"),"mode="+mode+" scene="+SceneManager.GetActiveScene().name+" panel="+MutantRuntime.Panel);}catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);if(mouse!=null&&mouse.added)InputSystem.RemoveDevice(mouse);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.environment=Application.unityVersion+" | "+Application.platform+" | "+Application.productName+" | GameView | debug="+Debug.isDebugBuild;proof.result=e==null?"levelup-perf-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png",".bytes",".shader"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/p15-levelup-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("Seviye/performans Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
