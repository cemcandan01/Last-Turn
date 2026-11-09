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
  // B /4A: izole üründe gerçek komutlar ve Game View; fiziksel/insan kabulü değildir.
  [InitializeOnLoad]
  public static class MutantChestPlayValidation
  {
    private const string Active="LastTurn.BChest.Active",PathKey="LastTurn.BChest.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc,environment;public uint seed;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career,profile,initial;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantChestPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      // Kopyalanmış Editor oturumundan başka kabul sürücüsü etkin kalamaz.
      foreach(var type in typeof(MutantChestPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
      EditorApplication.isPaused=false;Time.timeScale=1;
      var gameType=typeof(EditorWindow).Assembly.GetType("UnityEditor.GameView");var playWindow=EditorWindow.GetWindow(gameType);playWindow.Show();playWindow.Focus();
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      InputSystem.settings.supportedDevices=new[]{"Keyboard","Mouse"};
      GarageSceneBuilder.Open();RebuildFixtureScenes();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/P7Mutant/"+Guid.NewGuid().ToString("N")+"/garage.json"));SessionState.SetBool(Active,true);enterAfter=EditorApplication.timeSinceStartup+2;EditorApplication.update+=EnterWhenReady;
    }
    private static double enterAfter;
    private static void EnterWhenReady(){if(EditorApplication.isCompiling||EditorApplication.isUpdating){enterAfter=EditorApplication.timeSinceStartup+2;return;}if(EditorApplication.timeSinceStartup<enterAfter)return;EditorApplication.update-=EnterWhenReady;EditorApplication.EnterPlaymode();}
    private static void RebuildFixtureScenes()
    {
      // Yalnız yukarıdaki izole ürün/komut satırı korumasından sonra: kopya sahneleri saklayıp mevcut üreticilerle yenile.
      string backup=Path.Combine(Project,"Logs/ChestSceneBackup/"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(backup);
      foreach(var type in new[]{typeof(GtPrototypeSceneBuilder)}){
        string path=(string)type.GetField("ScenePath").GetRawConstantValue();if(File.Exists(path))File.Move(path,Path.Combine(backup,Path.GetFileName(path)));
        type.GetMethod("EnsureScene",BindingFlags.Static|BindingFlags.NonPublic).Invoke(null,null);
      }
      AssetDatabase.SaveAssets();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if(s==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){EditorApplication.isPaused=false;Time.timeScale=1;Application.runInBackground=true;proof=new Proof();steps.Clear();index=0;began=at=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;}
      if(s==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;}
    }
    private static void Logged(string message,string stack,LogType type)
    {if(type!=LogType.Error&&type!=LogType.Exception&&type!=LogType.Assert)return;if(stack.Contains("UnityEditor.Search.")&&!stack.Contains("LastTurn."))proof.editorDiagnostics.Add(message);else proof.runtimeErrors.Add(message+"\n"+stack);}
    private static void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);proof.checks.Add(label);}
    private static void Tap(Key key){steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(key)));steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState()));}
    private static void Wait(Func<bool> ready){steps.Add(()=>{if(!ready())index--;});}
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","");}
    private static Dictionary<string,string> PlayerFiles()=>new[]{"LastTurnGarage","LastTurnMutant","LastTurnSettings"}.Select(n=>Path.Combine(Application.persistentDataPath,n)).Where(Directory.Exists).SelectMany(p=>Directory.GetFiles(p,"*",SearchOption.AllDirectories)).ToDictionary(p=>p,Hash);
    private static void Click(string name,Action after=null)=>Click(()=>name,after);
    private static void Click(Func<string> target,Action after=null)
    {
      steps.Add(()=>{var name=target();var element=UiRoot.Instance.Screen.Q(name)??UiRoot.Instance.Top.Q(name);Check(element!=null,"Fare hedefi var: "+name);point=element.worldBound.center;pointer=element.panel.Pick(point);Check(pointer==element||element.Contains(pointer),"Fare hit-test: "+name);});
      steps.Add(()=>{using(var e=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=point}))pointer.SendEvent(e);});
      steps.Add(()=>{using(var e=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=point}))pointer.SendEvent(e);after?.Invoke();});
    }
    private static string before,expected,offer;private static int chestId;private static MutantRun shadow;
    private static void Setup()
    {
      GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=PlayerFiles();keyboard=InputSystem.AddDevice<Keyboard>();proof.seed=53;
      MutantRuntime.Start(53);MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);
      Wait(WorldReady);steps.Add(()=>{var c=MutantRuntime.Model.Chests.First(x=>!x.Cursed);P.Simulation.Place(c.X+40,c.Z+40,0);});Wait(()=>MutantRuntime.Session.Markers.Closed!="c:0");steps.Add(()=>{var c=MutantRuntime.Model.Chests.First(x=>!x.Cursed);P.Simulation.Place(c.X,c.Z,0);});Wait(()=>MutantChestView.Instance.Visible);
      steps.Add(()=>{P.ManualStepping=true;Check(MutantRuntime.Model.Chests.First(c=>c.Id==MutantRuntime.MarkerId).Inspected,"Gercek isaret teklifi hazirlar");before=MutantRuntime.Run.State.ToString();});
      steps.Add(()=>Shot("normal",1920,1080));steps.Add(()=>Shot("normal",1280,720));Tap(Key.RightArrow);Tap(Key.LeftArrow);Tap(Key.Tab);Tap(Key.Tab);Tap(Key.N);Tap(Key.Digit1);steps.Add(()=>Check(before==MutantRuntime.Run.State.ToString(),"Cizim gezinme nitro skill salt"));
      Tap(Key.Escape);steps.Add(()=>Check(GameFlow.Paused&&!MutantChestView.Instance.Visible,"Esc pause"));Tap(Key.Escape);Wait(()=>MutantChestView.Instance.Visible);steps.Add(()=>SettingsScreen.Show());Tap(Key.Escape);Wait(()=>GameFlow.Paused&&!SettingsScreen.Open);Tap(Key.Escape);Wait(()=>MutantChestView.Instance.Visible);steps.Add(()=>Check(before==MutantRuntime.Run.State.ToString(),"Pause Settings donusu salt"));
      steps.Add(()=>Prepare(true));Click("chest-accept",()=>{Check(Canonical(MutantRuntime.Run.State)==expected,"Kabul Core durumuyla ayni");string once=MutantRuntime.Run.State.ToString();Check(!MutantRuntime.ResolveChest(chestId,offer,true)&&once==MutantRuntime.Run.State.ToString(),"Tek teklif ikinci kez uygulanmaz");});Wait(WorldReady);
      steps.Add(()=>Open(2));Wait(()=>MutantChestView.Instance.Visible);steps.Add(()=>before=MutantRuntime.Run.State.ToString());steps.Add(()=>Shot("cursed",1920,1080));steps.Add(()=>Shot("cursed",1280,720));steps.Add(()=>{Check(before==MutantRuntime.Run.State.ToString(),"Lanet cizimi teklif uretmez");Prepare(false);});Tap(Key.RightArrow);Tap(Key.Enter);steps.Add(()=>Check(Canonical(MutantRuntime.Run.State)==expected&&MutantRuntime.Panel=="","Ret yalniz sandigi kapatir"));Wait(WorldReady);
      steps.Add(()=>Open(1));Wait(()=>MutantChestView.Instance.Visible);steps.Add(()=>{var c=MutantRuntime.Run.State["sandiklar"].Items.First(x=>x["id"].N()==1);c.Set("acildi",CatalogNode.Bool(true));before=MutantRuntime.Run.State.ToString();MutantChestView.Instance.Resolve(true);Check(before==MutantRuntime.Run.State.ToString(),"Eski acilmis teklif guvenli");});steps.Add(()=>Shot("invalid",1920,1080));steps.Add(()=>Shot("invalid",1280,720));Click("chest-reject");Wait(WorldReady);
      steps.Add(()=>{Open(2);var c=MutantRuntime.Run.State["sandiklar"][2];c.Set("acildi",CatalogNode.Bool(false));var def=MutantRuntime.Run.Catalog["addons"].Items.First(x=>x["id"].S()==c["secenekler"][0].S());def.Set("d",CatalogNode.Str(string.Concat(Enumerable.Repeat("Uzun aciklama: mevcut teklif ve bedel korunur. ",45))));});Wait(()=>MutantChestView.Instance.Visible);steps.Add(()=>Shot("long",1920,1080));steps.Add(()=>Shot("long",1280,720));steps.Add(()=>Prepare(true));Click("chest-accept",()=>Check(Canonical(MutantRuntime.Run.State)==expected,"Lanetli kabul mevcut bedeli uygular"));Wait(WorldReady);
      steps.Add(()=>{MutantRuntime.Exit();Check(career==GarageSession.State.Snapshot().ToString()&&profile==GarageRace.ProfileStore().Load().Snapshot().ToString(),"Kariyer profil ayni");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"Kalici dosyalar ayni");Finish(null);});
    }
    private static void Open(int id){MutantRuntime.Run.ChestOffer(id);typeof(MutantRuntime).GetProperty(nameof(MutantRuntime.MarkerId)).SetValue(null,id);typeof(MutantRuntime).GetProperty(nameof(MutantRuntime.Panel)).SetValue(null,"chest");}
    private static string Canonical(CatalogNode n)=>n.IsObject?"{"+string.Join(",",n.Fields.OrderBy(p=>p.Key,StringComparer.Ordinal).Select(p=>CatalogNode.Str(p.Key)+":"+Canonical(p.Value)))+"}":n.IsArray?"["+string.Join(",",n.Items.Select(Canonical))+"]":n.ToString();
    private static void Prepare(bool yes){chestId=MutantRuntime.MarkerId;offer=MutantRuntime.Model.Chests.First(c=>c.Id==chestId).Offer;shadow=new MutantRun(53,MutantRuntime.Run.Catalog);foreach(var p in MutantRuntime.Run.State.Fields)shadow.State.Set(p.Key,p.Value.Clone());Check(yes?shadow.AcceptChest(chestId,offer):shadow.RejectChest(chestId),"Kontrol komutu uygulanabilir");expected=Canonical(shadow.State);}
    private static GtPrototype P=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    private static bool WorldReady()=>UnityEngine.SceneManagement.SceneManager.GetActiveScene().name=="GTTest"&&P?.Simulation!=null&&P.Race==null&&MutantRuntime.Panel==""&&MutantHudView.Instance.Visible;
    private static void Shot(string name,int w,int h){Time.timeScale=0;shot=name;shotW=w;shotH=h;queued=false;Size(w,h);}
    private static void Size(int w,int h)
    {
      var a=typeof(EditorWindow).Assembly;var t=a.GetType("UnityEditor.GameView");if(!game){game=EditorWindow.GetWindow(t);originalSize=(int)t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(game);}
      var st=a.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null);group=st.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int n=(int)group.GetType().GetMethod("GetTotalCount").Invoke(group,null);var size=Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"P7 Mutant"});group.GetType().GetMethod("AddCustomSize").Invoke(group,new[]{size});sizes.Add(n);
      t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,n);game.Show();game.Focus();game.Repaint();
    }
    private static void Capture()
    {
      string path=Path.Combine(Project,"Logs/b-chest-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      ValidateShot();
      proof.images.Add(Path.GetFileName(path));shot=null;Time.timeScale=1;
    }
    private static void ValidateShot()
    {
      var page=UiRoot.Instance.Screen.Q("b-mutant-chest");var c=MutantRuntime.Model.Chests.First(x=>x.Id==MutantRuntime.MarkerId);
      Check(MutantChestView.Instance.Visible&&!MutantHudView.Instance.Visible,"Tek gorunum / "+shot+shotW);
      Check(page.Q<Label>("chest-name").text==c.Name&&page.Q<Label>("chest-description").text==c.Description,"Gercek teklif / "+shot+shotW);
      Check(page.Q("chest-accept").enabledInHierarchy==c.CanAccept,"Gercek uygunluk / "+shot+shotW);
      if(c.Cursed)Check(page.Q<Label>("chest-cost-description").text==(c.Opened?"Bu teklif artık kullanılamıyor. Reddet ile sürüşe dönebilirsin.":c.CurseDescription),"Gercek lanet / "+shot+shotW);
      foreach(string id in new[]{"chest-accept","chest-reject","chest-cost"}){var e=page.Q(id);Check(e.worldBound.xMin>=0&&e.worldBound.xMax<=page.worldBound.xMax&&e.worldBound.yMax<page.worldBound.yMax-90,"Eylem ekranda / "+id+shot+shotW);}
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("B etkinlik kısa Play: "+Status());if(EditorApplication.timeSinceStartup-at<.45)return;at=EditorApplication.timeSinceStartup;File.WriteAllText(Path.Combine(Project,"Logs/b-chest-progress.txt"),Status());if(steps.Count==0){if(!MutantWorkshopView.Instance)return;Setup();return;}if(shot!=null){Capture();return;}if(index<steps.Count)steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static string Status()=>"index="+index+" steps="+steps.Count+" pause="+GameFlow.Paused+" editorPause="+EditorApplication.isPaused+" scale="+Time.timeScale+" scene="+UnityEngine.SceneManagement.SceneManager.GetActiveScene().name+" panel="+MutantRuntime.Panel+" phase="+(MutantRuntime.Run?.State["faz"].S()??"null")+" root="+(UiRoot.Instance!=null)+" hud="+(MutantHudView.Instance!=null)+" visible="+(MutantHudView.Instance?.Visible??false)+" settings="+SettingsScreen.Open+" sim="+(P?.Simulation!=null)+" race="+(P?.Race!=null)+" touch="+(Touchscreen.current!=null);
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.environment=Application.unityVersion+" | "+Application.platform+" | "+Application.productName+" | GameView";proof.result=e==null?"b-chest-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/b-chest-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Mutant F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
