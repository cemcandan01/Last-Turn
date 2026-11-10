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
  // Yalnız ayrı grafik Editor'da (geliştirme yapısı): Mutant başlangıcında gerçek fare tıklamasıyla geliştirici modu,
  // ilk dünyada otomatik DEV paneli, panel komutlarıyla pasif/skill/parça kurulumu, gerçek MUTANT drift yarışında
  // yarış drift dalı ve tanı satırı (gerçek W/D/Boşluk girdisi), yarış içi yeniden başlatma, Kule Şehri'ne geçiş;
  // sonra kariyer gp_1'de rekor hayaleti ve gecikmeli geliştirici hayaletinin TS uzak araç görünümü.
  // IMGUI panel düğmeleri doğrudan aynı MutantRuntime.Lab* komutlarıyla çağrılır (görünüm sorgusu yok).
  [InitializeOnLoad]
  public static class MutantDevLabPlayValidation
  {
    private const string Active="LastTurn.MutantDevLab.Active",PathKey="LastTurn.MutantDevLab.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc,environment;public List<string> checks=new(),images=new(),runtimeErrors=new(),editorDiagnostics=new(),outcomes=new(),fixtures=new();public Source[] sources;}
    private static Proof proof;private static double began,at,modeTime;private static Keyboard keyboard;private static Mouse mouse;
    private static string career,profile;private static Dictionary<string,string> files;
    private static string shot;private static int shotW,shotH;private static bool queued,initialized;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new();
    private static readonly Queue<(string,int,int)> shots=new();private static int mode,clickStage,refreshes;private static VisualElement pointer;private static Vector2 point;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantDevLabPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      foreach(var type in typeof(MutantDevLabPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
      EditorApplication.isPaused=false;Time.timeScale=1;
      var gameType=typeof(EditorWindow).Assembly.GetType("UnityEditor.GameView");var playWindow=EditorWindow.GetWindow(gameType);playWindow.Show();playWindow.Focus();
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      InputSystem.settings.supportedDevices=new[]{"Keyboard","Mouse"};
      GarageSceneBuilder.Open();
      string backup=Path.Combine(Project,"Logs/DevLabSceneBackup/"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(backup);
      foreach(var type in new[]{typeof(GtPrototypeSceneBuilder),typeof(RaceTestSceneBuilder)}){string path=(string)type.GetField("ScenePath").GetRawConstantValue();if(File.Exists(path))File.Move(path,Path.Combine(backup,Path.GetFileName(path)));type.GetMethod("EnsureScene",BindingFlags.Static|BindingFlags.NonPublic).Invoke(null,null);}
      AssetDatabase.SaveAssets();
      SessionState.SetString(PathKey,Path.Combine(Project,"Logs/DevLab/"+Guid.NewGuid().ToString("N")));SessionState.SetBool(Active,true);enterAfter=EditorApplication.timeSinceStartup+2;EditorApplication.update+=EnterWhenReady;
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
    private static void Setup()
    {
      initialized=true;string basePath=SessionState.GetString(PathKey,"");PlayerPreferences.Directory=Path.Combine(basePath,"settings");PlayerPreferences.Reload();
      GarageSession.Open(Path.Combine(basePath,"garage.json"),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=PlayerFiles();
      keyboard=InputSystem.AddDevice<Keyboard>();Size(1280,720);
      Check(MutantRuntime.DevAvailable,"Geliştirme yapısı (Editor) DEV erişimi");
      MutantRuntime.Start(53);MutantRuntime.RecordDirectory=Path.Combine(basePath,"MutantRecords");Check(!MutantRuntime.Run.IsTest,"Normal koşu varsayılan");Next(1);
    }
    private static bool Click(string name)
    {
      var root=UiRoot.Instance.Screen;var e=root.Q(name);if(e==null||e.panel==null)return false;
      if(clickStage==0){point=e.worldBound.center;pointer=e.panel.Pick(point);Check(pointer==e||e.Contains(pointer),"Fare hit-test: "+name);using(var d=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=point}))pointer.SendEvent(d);clickStage=1;return false;}
      using(var u=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=point}))pointer.SendEvent(u);clickStage=0;return true;
    }
    private static void Advance()
    {
      var p=P;
      switch(mode)
      {
        case 1: // gerçek fare: geliştirici modu
          if(!MutantStartView.Instance||!MutantStartView.Instance.Visible||Screen.width!=1280||Age<1.5)return;
          if(!Click("mutant-dev-toggle"))return;Next(2);return;
        case 2:
          if(!MutantRuntime.Run.IsTest||UiRoot.Instance.Screen.Q("mutant-dev-cars")==null)return;
          Check((uint)MutantRuntime.Run.State["tohum"].N()==53,"Aynı tohumla test koşusu");Check(MutantRuntime.Model.StartingCarsCards.Length==(int)MutantRuntime.Run.Catalog["carsCount"].N(),"Testte bütün araçlar seçilebilir");
          Check(MutantRuntime.Run.State["kalan"].N()==90,"Test sayacı 90 sn");Pair("dev-start");Next(3);return;
        case 3:
          MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);Next(4);return;
        case 4: // ilk dünya girişinde panel kendiliğinden
          if(SceneManager.GetActiveScene().name!="GTTest"||p?.Simulation==null)return;Check(MutantRuntime.Panel=="lab","İlk dünyada DEV paneli açık");Check(MutantRuntime.Blocked,"Panel sürüşü duraklatır");
          Pair("dev-lab");Next(5);return;
        case 5:
        {
          var r=MutantRuntime.Run;refreshes=MutantRuntime.Session.VehicleRefreshes;string passive=r.Catalog["passives"][0]["id"].S();
          Check(MutantRuntime.LabSetup("pasif",passive),"Pasif ekle");Check(MutantRuntime.LabSkill("grappling-hook",3,r.Catalog["skills"].Items.First(s=>s["id"].S()=="grappling-hook")["evrimler"][0]["id"].S(),Array.Empty<string>()),"Kanca Sv3 + evrim");
          Check(!MutantRuntime.LabSkill("grappling-hook",2,r.Catalog["skills"].Items.First(s=>s["id"].S()=="grappling-hook")["evrimler"][0]["id"].S(),Array.Empty<string>()),"Seviye 3 altı evrim reddi");
          Check(MutantRuntime.LabSetup("parca","motor-sokak"),"Parça tak");Check(MutantRuntime.Session.VehicleRefreshes>refreshes,"Araç değerleri yenilenecek");
          Check(r.State["beceriler"].Items.Any(o=>o["id"].S()=="grappling-hook"&&o["seviye"].N()==3)&&r.State["parcalar"].Items.Any(x=>x.S()=="motor-sokak"),"Kurulum koşu durumunda");
          proof.outcomes.Add("Lab kurulumu: pasif "+passive+", kanca Sv3+evrim, motor-sokak");
          Check(MutantRuntime.LabDrift(),"Drift yarışına gir");Next(6);return;
        }
        case 6: // gerçek MUTANT dp yarışı
          if(SceneManager.GetActiveScene().name!="RaceTest"||p?.Race==null)return;
          Check(MutantRuntime.InRace&&p.Race.Event.Type=="dp","MUTANT drift yarışı açıldı");
          if(p.Race.Session.State!=RaceState.Running){Check(p.Simulation.DriftRace==null,"Geri sayımda yarış drift dalı kapalı");return;}
          Check(p.Simulation.DriftRace!=null,"Yarış çalışırken drift yarışı dalı");Next(7);return;
        case 7:
        {
          // gerçek girdi: hızlan, sonra sağ direksiyon + gaz (+ kısa el freni); tanı satırı gerçek DR durumundan
          double t=Age;if(t<2.5)Keys(Key.W);else if(t<3.0)Keys(Key.W,Key.D,Key.Space);else Keys(Key.W,Key.D);
          var d=MutantDevLab.Diagnosis(p);
          if(p.Simulation.Assist.On&&d!=null&&(d.State=="drift"||d.State=="sinir")){Check(p.Simulation.DriftRace!=null,"Drift yarış dalında açıldı");proof.outcomes.Add("Drift tanısı: "+d.Message+" açı "+d.Angle+"/"+d.Max+"°");Pair("dev-drift");Next(8);return;}
          if(t>20)throw new TimeoutException("Drift açılmadı: "+d?.State);return;
        }
        case 8: // yarış içi panel ve yeniden başlatma
          Keys();MutantRuntime.OpenLab();Check(MutantRuntime.Panel=="lab"&&MutantRuntime.Blocked,"Yarış ortasında panel");Pair("dev-lab-race");Next(9);return;
        case 9:
          MutantRuntime.Run.State.Set("kalan",CatalogNode.Num(40));proof.fixtures.Add("Yeniden başlatma öncesi sayaç 40 (90'a yenilendiğini görmek için)");
          Check(MutantRuntime.LabRestartRace(),"Bu yarışı yeniden başlat");Check(MutantRuntime.Run.State["kalan"].N()==90,"Sayaç yenilendi");Next(10);return;
        case 10:
          if(p?.Race==null||p.Race.Session.State!=RaceState.Countdown)return;Check(MutantRuntime.Panel=="","Yeniden başlatma panelden çıkar");Check(MutantRuntime.LabCity(),"Kule Şehri'ne git");Next(11);return;
        case 11:
          if(SceneManager.GetActiveScene().name!="GTTest"||p?.Simulation==null||p.OpenTerrain==null)return;
          Check(MutantRuntime.Run.Region==2&&p.OpenTerrain.Region.Key=="city","Test bölge 2 / şehir");Check(MutantRuntime.Run.State["yenilenBoss"].N()==1,"Bölge geçişi üretim boss zinciriyle");
          Check(MutantRuntime.LabReset(),"Tüm kurulumu sıfırla");Check(!MutantRuntime.Run.State["beceriler"].Items.Any()&&MutantRuntime.Run.State["mek"]["enerji"].N()==40,"Sıfırlama 40 enerji/boş kurulum");
          Pair("dev-city");Next(12);return;
        case 12: // kariyer: rekor ve geliştirici hayaleti
          MutantRuntime.Exit();Next(13);return;
        case 13:
          if(SceneManager.GetActiveScene().name!="Garage"||!UiRoot.Instance)return;
          PlayerPreferences.Current.Set["hayalet"]=1;PlayerPreferences.Current.Set["rh"]=1;Check(PlayerPreferences.Save(),"Hayalet tercihleri kaydedildi");
          Check(TestPanelActions.StartRace("gp_1"),"Kariyer gp_1");Next(14);return;
        case 14:
          if(p?.Race==null||SceneManager.GetActiveScene().name!="RaceTest")return;
          if(p.Race.Session.State!=RaceState.Running)return;Keys(Key.W);if(p.Race.Session.Time<4)return;
          {
            var dev=UnityEngine.Object.FindFirstObjectByType<DeveloperGhostView>();Check(dev&&dev.Visible,"Gecikmeli geliştirici hayaleti görünür (rekor yokken)");
            var view=dev.GetComponentInChildren<SourceVehicleView>();Check(view&&view.Scene.Translucent&&view.Scene.Data.key==p.SourceVehicle.Scene.Data.key,"Geliştirici hayaleti oyuncunun kaynak modeli, saydam");
            Check(view.GetComponentsInChildren<Renderer>().All(r=>r.sharedMaterials.All(m=>m.color.a<=.451f&&m.renderQueue>=3000)),"Malzemeler ×0,45 saydam");
            Pair("dev-ghost");Next(15);return;
          }
        case 15:
        {
          var rec=new InputRecording();for(int i=0;i<900;i++)rec.Record(new DrivingInput(1,0,0));var setup=GarageSession.State.Setup(GarageSession.State.SelectedCar);
          GarageRace.ProfileStore().SaveGhost(new GhostRecord{Key=p.Race.Session.RecordKey,Car=GarageSession.State.SelectedCar,RaceType="gp",AssistLevel=GarageSession.State.AssistLevel,Result=99,Parts=setup.Parts,Inputs=rec});
          proof.fixtures.Add("İzole profile gp_1 için 900 adım tam gaz rekor hayaleti kaydı");Keys();p.RestartRace();Next(16);return;
        }
        case 16:
        {
          if(p.Race.Ghost==null||p.Race.Session.State!=RaceState.Running){Keys();return;}Keys(Key.W);if(p.Race.Session.Time<4)return;
          Check(p.GhostShown,"Rekor hayaleti çizilir");var dev=UnityEngine.Object.FindFirstObjectByType<DeveloperGhostView>();Check(!dev.Visible,"Rekor hayaleti varken geliştirici hayaleti gizli");
          var ghost=p.GetComponentsInChildren<SourceVehicleView>(true).FirstOrDefault(v=>v!=p.SourceVehicle&&v.Scene.Translucent);Check(ghost&&ghost.gameObject.activeSelf&&!ghost.Scene.GhostMode,"Rekor hayaleti TS uzak araç saydamlığı (hayalet skill malzemesi değil)");
          Pair("record-ghost");Next(17);return;
        }
        case 17:
          Keys();GameFlow.LeaveDrive();Next(18);return;
        case 18:
          if(SceneManager.GetActiveScene().name!="Garage")return;FinishSuccess();return;
      }
    }
    private static void FinishSuccess(){Check(career==GarageSession.State.Snapshot().ToString(),"Kariyer kaydı aynı");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"Gerçek kalıcı kayıt hashleri aynı");Finish(null);}
    private static void Shot(string name,int w,int h){Time.timeScale=0;shot=name;shotW=w;shotH=h;queued=false;Size(w,h);}
    private static void Size(int w,int h)
    {
      var a=typeof(EditorWindow).Assembly;var t=a.GetType("UnityEditor.GameView");if(!game){game=EditorWindow.GetWindow(t);originalSize=(int)t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(game);}
      var st=a.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null);group=st.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int n=(int)group.GetType().GetMethod("GetTotalCount").Invoke(group,null);var size=Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"DEV lab"});group.GetType().GetMethod("AddCustomSize").Invoke(group,new[]{size});sizes.Add(n);
      t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,n);game.Show();game.Focus();game.Repaint();
    }
    private static void Capture()
    {
      string path=Path.Combine(Project,"Logs/p14-devlab-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      proof.images.Add(Path.GetFileName(path));shot=null;Time.timeScale=shots.Count>0?0:1;
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>(mode<=2?60:300))throw new TimeoutException("DEV lab 300s mode="+mode+" test="+(MutantRuntime.Run?.IsTest)+" cars="+(UiRoot.Instance?.Screen.Q("mutant-dev-cars")!=null)+" toggle="+(UiRoot.Instance?.Screen.Q("mutant-dev-toggle")!=null)+" starting="+MutantRuntime.Starting);if(EditorApplication.timeSinceStartup-at<.025)return;at=EditorApplication.timeSinceStartup;if(!initialized){if(!UiRoot.Instance)return;Setup();return;}if(shot!=null){Capture();return;}if(shots.Count>0){var q=shots.Dequeue();Shot(q.Item1,q.Item2,q.Item3);return;}if(Time.timeScale==0)Time.timeScale=1;Advance();File.WriteAllText(Path.Combine(Project,"Logs/p14-devlab-progress.txt"),"mode="+mode+" scene="+SceneManager.GetActiveScene().name+" panel="+MutantRuntime.Panel);}catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);if(mouse!=null&&mouse.added)InputSystem.RemoveDevice(mouse);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.environment=Application.unityVersion+" | "+Application.platform+" | "+Application.productName+" | GameView | debug="+Debug.isDebugBuild;proof.result=e==null?"mutant-devlab-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png",".bytes",".shader"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/p14-devlab-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("DEV lab Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
