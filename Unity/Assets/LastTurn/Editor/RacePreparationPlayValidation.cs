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
using UnityEngine.UIElements;

namespace LastTurn.EditorValidation
{
  // Yalnız ayrı grafik Editor'da F §4; gerçek komutlar ve Game View, yeni koşu kuralı yok.
  [InitializeOnLoad]
  public static class RacePreparationPlayValidation
  {
    private const string Active="LastTurn.P7Preparation.Active",PathKey="LastTurn.P7Preparation.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career;private static int car;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static RacePreparationPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      GarageSceneBuilder.Open();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/P7Preparation/"+Guid.NewGuid().ToString("N")+"/garage.json"));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if(s==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){proof=new Proof();steps.Clear();index=0;began=at=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;}
      if(s==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;}
    }
    private static void Logged(string message,string stack,LogType type)
    {if(type!=LogType.Error&&type!=LogType.Exception&&type!=LogType.Assert)return;if(stack.Contains("UnityEditor.Search.")&&!stack.Contains("LastTurn."))proof.editorDiagnostics.Add(message);else proof.runtimeErrors.Add(message+"\n"+stack);}
    private static void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);proof.checks.Add(label);}
    private static void Tap(Key key){steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(key)));steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState()));}
    private static void Wait(Func<bool> ready){steps.Add(()=>{if(!ready())index--;});}
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","");}
    private static Dictionary<string,string> PlayerFiles()=>new[]{"LastTurnGarage","LastTurnMutant","LastTurnSettings"}.Select(n=>Path.Combine(Application.persistentDataPath,n)).Where(Directory.Exists).SelectMany(p=>Directory.GetFiles(p,"*",SearchOption.AllDirectories)).ToDictionary(p=>p,Hash);
    private static void Click(string name)
    {
      steps.Add(()=>{var element=UiRoot.Instance.Screen.Q(name)??UiRoot.Instance.Top.Q(name);Check(element!=null,"Fare hedefi var: "+name);point=element.worldBound.center;pointer=element.panel.Pick(point);Check(pointer==element||element.Contains(pointer),"Fare hit-test: "+name);});
      steps.Add(()=>{using(var e=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=point}))pointer.SendEvent(e);});
      steps.Add(()=>{using(var e=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=point}))pointer.SendEvent(e);});
    }
    private static void Setup()
    {
      GarageSession.Open(SessionState.GetString(PathKey,""),true);files=PlayerFiles();keyboard=InputSystem.AddDevice<Keyboard>();
      var store=GarageRace.ProfileStore();var record=store.Load();record.Records[RaceData.Load().Event("gp_1").Key]="125.5";store.Save(record);GameFlow.MainMenu();
      Tap(Key.Enter);Tap(Key.Enter);
      steps.Add(()=>{Check(RacePreparationView.Instance.Visible&&UnityEngine.SceneManagement.SceneManager.GetActiveScene().name=="Garage","Pist kartı Enter hazırlığı açar; aynı tuş yarışı başlatmaz");var m=RacePreparationView.Instance.Model;Check(m.Key=="gp_1"&&m.Open&&m.Career,"Mevcut seçili piste uygun kariyer hazırlığı");Check(m.Record==RaceSession.FormatTime(125.5),"Gerçek kayıtlı kariyer rekoru gösterilir");Check(m.Targets.Length==3&&m.MapX.Length>20,"Üç yıldız hedefi ve gerçek pist geometrisi");});
      steps.Add(()=>Shot("ready",1920,1080));steps.Add(()=>Shot("ready",1280,720));
      Click("preparation-time-0");Click("preparation-weather-1");
      steps.Add(()=>Check(GameFlow.Conditions.TimeOfDay=="morning"&&GameFlow.Conditions.Weather=="rain","Fare saat ve hava seçimini gerçek koşullara yazar"));Tap(Key.Digit3);
      steps.Add(()=>Check(GameFlow.Conditions.TimeOfDay=="evening","3 akşam koşulunu seçer"));Tap(Key.C);
      steps.Add(()=>Check(GarageView.Instance.Visible&&!RacePreparationView.Instance.Visible,"C mevcut Garaj araç seçimine gider"));Tap(Key.RightArrow);Tap(Key.Enter);
      steps.Add(()=>{car=GarageSession.State.SelectedCar;Check(car!=10,"Garaj seçimi gerçek seçili aracı değiştirir");});Tap(Key.Enter);
      steps.Add(()=>{Check(RacePreparationView.Instance.Visible&&RacePreparationView.Instance.Model.Car.Name==GarageViewModel.Detail(GarageSession.State,car).Name,"Garaj seçili Enter aynı hazırlığa döner");Check(GameFlow.Conditions.TimeOfDay=="evening"&&GameFlow.Conditions.Weather=="rain"&&RacePreparationView.Instance.Model.Key=="gp_1","Araç değişiminde pist/saat/hava korunur");GarageSession.Reload();});
      steps.Add(()=>Check(GarageSession.State.SelectedCar==car,"Araç seçimi gerçek diskten yüklenir"));
      Tap(Key.C);Tap(Key.Escape);steps.Add(()=>Check(RacePreparationView.Instance.Visible,"Garaj iptal Esc hazırlığa döner"));Tap(Key.Escape);
      steps.Add(()=>Check(GameFlow.Home&&GameFlow.Hub==GameFlow.MenuHub.Race,"Hazırlık Esc kariyer kartlarına döner"));Tap(Key.Enter);
      steps.Add(()=>{GarageSession.Transact(s=>{s.AddXp(100000);s.AddMoney(100000);if(!s.OwnsCar(0))GarageCommand.BuyCar(0).Apply(s);return GarageCommand.SelectCar(0).Apply(s);},"Ayrı testte bütçe dışı araç");});
      steps.Add(()=>Check(RacePreparationView.Instance.Model.Open&&!RacePreparationView.Instance.Model.Career&&RacePreparationView.Instance.Model.Money==0,"Bütçe dışı araç ödülsüz deneme olarak sunulur"));steps.Add(()=>Shot("practice",1920,1080));
      Tap(Key.Digit5);Tap(Key.Enter);Wait(()=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>()?.Race!=null);
      steps.Add(()=>{var p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();Check(!p.Race.Session.Career&&p.Race.Session.RecordKey.StartsWith("deneme_"),"Bütçe dışı başlatma mevcut gerçek deneme yarışına gider");Check(Math.Abs(p.Race.World.GripMultiplier-.84)<1e-9,"Seçilen yağmur gerçek yarış tutuşuna aktarılır");GameFlow.LeaveDrive(2);});Wait(()=>UnityEngine.SceneManagement.SceneManager.GetActiveScene().name=="Garage");
      steps.Add(()=>{Check(GameFlow.Home&&GameFlow.Hub==GameFlow.MenuHub.Race,"Gerçek yarıştan mevcut kariyer dönüşü");Check(GarageRace.ProfileStore().Load().Best(RaceData.Load().Event("gp_1").Key)==125.5,"Deneme başlat/çık önceki kariyer rekorunu korur");GarageSession.Open(System.IO.Path.Combine(Project,"Logs/P7Preparation/"+Guid.NewGuid().ToString("N")+"/garage.json"),true);GameFlow.OpenRace("gp_8");});
      steps.Add(()=>{Check(!RacePreparationView.Instance.Model.Open&&!UiRoot.Instance.Screen.Q("preparation-start").enabledSelf,"Kilitli pistte başlatma düğmesi kapalıdır");career=GarageSession.State.Snapshot().ToString();Check(!RacePreparationView.Instance.StartRace(),"Kilitli pist doğrudan komutta da reddedilir");Check(GarageSession.State.Snapshot().ToString()==career&&UnityEngine.SceneManagement.SceneManager.GetActiveScene().name=="Garage","Kilitli deneme kayıt/sahne değiştirmez");});steps.Add(()=>Shot("locked",1280,720));
      steps.Add(()=>GameFlow.OpenRace("gp_1"));Tap(Key.Digit1);Tap(Key.Digit6);
      steps.Add(()=>{Check(RacePreparationView.Instance.Model.Career,"Uygun araç tekrar kariyer için hazır");career=GarageSession.State.Snapshot().ToString();});Click("preparation-start");Wait(()=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>()?.Race!=null);
      steps.Add(()=>{var p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();Check(p.Race.Session.Career&&!p.Race.Session.RecordKey.StartsWith("deneme_"),"Fare Başla gerçek ödüllü kariyer yarışını açar");Check(Math.Abs(p.Race.World.GripMultiplier-.74)<1e-9&&GameFlow.Conditions.TimeOfDay=="morning","Kar ve sabah gerçek yarışa aktarılır");Check(GarageSession.State.Snapshot().ToString()==career,"Hazırlık/yarış açılışı para/XP/sahiplik değiştirmez");GameFlow.LeaveDrive(2);});Wait(()=>UnityEngine.SceneManagement.SceneManager.GetActiveScene().name=="Garage");
      steps.Add(()=>{Check(GameFlow.Home&&GameFlow.Hub==GameFlow.MenuHub.Race,"Kariyer yarışından menüye dönülür");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(p=>now.TryGetValue(p.Key,out var hash)&&hash==p.Value),"İzole ürün oyuncu dosyaları aynı hash'te");Check(proof.runtimeErrors.Count==0,"LastTurn çalışma Console hatası yok");Finish(null);});
    }

    private static void Shot(string name,int w,int h){shot=name;shotW=w;shotH=h;queued=false;Size(w,h);}
    private static void Size(int w,int h)
    {
      var a=typeof(EditorWindow).Assembly;var t=a.GetType("UnityEditor.GameView");if(!game){game=EditorWindow.GetWindow(t);originalSize=(int)t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(game);}
      var st=a.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null);group=st.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int n=(int)group.GetType().GetMethod("GetTotalCount").Invoke(group,null);var size=Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"P7 hazirlik"});group.GetType().GetMethod("AddCustomSize").Invoke(group,new[]{size});sizes.Add(n);
      t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,n);game.Show();game.Focus();game.Repaint();
    }
    private static void Capture()
    {
      string path=Path.Combine(Project,"Logs/p7-preparation-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      var page=UiRoot.Instance.Screen.Q("f-race-preparation");var button=page.Q("preparation-start");Check(button.worldBound.xMax<=UiRoot.Instance.Root.layout.width&&button.worldBound.yMax<UiRoot.Instance.Root.layout.height-70,"Hazirlik baslatma dugmesi sinirlar icinde "+shot+shotW);
      proof.images.Add(Path.GetFileName(path));shot=null;
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("P7 hazirlik kısa Play");if(steps.Count==0){if(!MutantStartView.Instance)return;Setup();return;}if(EditorApplication.timeSinceStartup-at<.45)return;at=EditorApplication.timeSinceStartup;if(shot!=null){Capture();return;}if(index<steps.Count)steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.result=e==null?"p7-preparation-f-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>Path.GetExtension(f)==".cs"||Path.GetExtension(f)==".uss").OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/p7-preparation-f-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 hazirlik F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
