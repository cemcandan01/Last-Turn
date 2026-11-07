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
  // Yalnız ayrı grafik Editor'da F §5a–d; gerçek komutlar ve Game View, yeni koşu kuralı yok.
  [InitializeOnLoad]
  public static class MutantFPlayValidation
  {
    private const string Active="LastTurn.P7Mutant.Active",PathKey="LastTurn.P7Mutant.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc;public uint seed;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career,profile,initial,choices,passive,passiveName;private static int car;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantFPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      GarageSceneBuilder.Open();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/P7Mutant/"+Guid.NewGuid().ToString("N")+"/garage.json"));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
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
      GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();
      new MutantRecordStore(Path.Combine(Application.persistentDataPath,"LastTurnMutant")).AfterBossResult("bitti",3,2);files=PlayerFiles();
      keyboard=InputSystem.AddDevice<Keyboard>();GameFlow.MainMenu();
      Tap(Key.RightArrow);Tap(Key.Enter);
      steps.Add(()=>Check(GameFlow.Hub==GameFlow.MenuHub.Mutant&&!MutantRuntime.Active,"Ana menüden Mutant ayrı menüsü"));
      steps.Add(()=>Check(MutantRuntime.Record().Region==3&&MutantRuntime.Record().Bosses==2,"Mutant en iyi koşu mevcut kayıt servisinden"));
      steps.Add(()=>Shot("menu",1920,1080));steps.Add(()=>Shot("menu",1280,720));
      Tap(Key.H);steps.Add(()=>Check(UnityEngine.Object.FindFirstObjectByType<MainMenuView>().MutantHelpOpen,"H nasıl oynanır açılır"));Tap(Key.H);
      Tap(Key.Enter);steps.Add(()=>Check(!MutantRuntime.Active&&UnityEngine.Object.FindFirstObjectByType<MainMenuView>().ConfirmOpen,"Başlama onayı koşuyu henüz oluşturmaz"));
      steps.Add(()=>Shot("confirm",1920,1080));steps.Add(()=>Shot("confirm",1280,720));Tap(Key.Escape);
      steps.Add(()=>Check(!MutantRuntime.Active&&!UnityEngine.Object.FindFirstObjectByType<MainMenuView>().ConfirmOpen,"Esc yeni koşu onayını iptal eder"));Tap(Key.Enter);Tap(Key.Enter);
      steps.Add(()=>{
        var m=MutantRuntime.Model;proof.seed=(uint)MutantRuntime.Run.State["tohum"].N();initial=MutantRuntime.Run.State.ToString();choices=string.Join("|",m.Choices.Select(c=>c.Id));
        Check(MutantStartView.Instance.Visible&&!MutantStartView.Instance.ChoosingSkill&&MutantRuntime.Car==-1,"Onay sonrası F araç adımı; aynı Enter aracı seçmez");
        Check(m.StartingCarsCards.Length==3&&m.StartingCarsCards.Select(c=>c.Id).SequenceEqual(MutantMenuModel.StartingCars(proof.seed,MutantRuntime.Run.Catalog)),"Üç başlangıç aracı mevcut seed/RNG listesinden");
        Check(m.Remaining==MutantRun.FirstBossSeconds,"Araç seçiminde boss süresi akmaz");
      });
      Tap(Key.Digit2);steps.Add(()=>{Check(MutantStartView.Instance.Focused==1&&MutantRuntime.Car==-1,"2 yalnız araç odağını değiştirir");car=MutantRuntime.Model.StartingCarsCards[1].Id;});
      steps.Add(()=>Shot("car",1920,1080));steps.Add(()=>Shot("car",1280,720));Tap(Key.Enter);
      steps.Add(()=>{Check(MutantStartView.Instance.ChoosingSkill&&MutantRuntime.Car==car,"Enter mevcut servisle aracı seçer ve yeteneğe geçer");var before=CatalogNode.Parse(initial);Check(new[]{"tohum","boss","kalan","secenekler","stok","etkinlikler","sandiklar"}.All(k=>MutantRuntime.Run.State[k].ToString()==before[k].ToString()),"Araç seçimi RNG/koşu tekliflerini değiştirmez");initial=MutantRuntime.Run.State.ToString();});
      Tap(Key.Digit3);steps.Add(()=>Check(MutantStartView.Instance.Focused==2,"3 pasif yetenek odağını değiştirir"));
      steps.Add(()=>Shot("skill",1920,1080));steps.Add(()=>Shot("skill",1280,720));Tap(Key.LeftArrow);
      steps.Add(()=>Check(!MutantStartView.Instance.ChoosingSkill&&MutantRuntime.Run.State.ToString()==initial,"Sola dön araç adımı; süre/RNG/teklif korunur"));
      Click("mutant-option-0");steps.Add(()=>Check(MutantStartView.Instance.Focused==0&&MutantRuntime.Car==car,"Fare kartı odağı değiştirir; hemen başlamaz"));Click("mutant-continue");
      steps.Add(()=>{var m=MutantRuntime.Model;car=m.StartingCarsCards[0].Id;Check(MutantRuntime.Car==car&&MutantStartView.Instance.ChoosingSkill,"Fare Devam yeni aracı seçer");Check(string.Join("|",m.Choices.Select(c=>c.Id))==choices,"Aracı değiştirmek yetenekleri yeniden çekmez");passive=m.Choices[0].Id;passiveName=m.Choices[0].Name;Check(m.Choices[0].Type=="Pasif","Başlangıç pasifi mevcut katalogdan");});
      Tap(Key.Digit1);Tap(Key.Enter);Wait(()=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>()?.Simulation!=null);
      steps.Add(()=>{Check(!MutantRuntime.Starting&&!MutantStartView.Instance.Visible&&MutantRuntime.Panel==""&&!MutantRuntime.Blocked,"Yetenek sonrası gerçek sürüşe geçer; F başlangıç kapanır");Check(MutantRuntime.Session.SelectedCar==car&&MutantRuntime.Model.PassiveNames.Contains(passiveName),"Seçilen araç ve pasif gerçek koşuda uygulanır");Check(MutantRuntime.Run.State["pasifler"].Items.Any(p=>p.S()==passive),"Seçilen pasif kimliği kaynak koşu durumunda");});
      steps.Add(()=>Check(MutantRuntime.Model.Remaining<MutantRun.FirstBossSeconds,"Boss süresi sürüş başlayınca akar"));Tap(Key.Escape);
      steps.Add(()=>{Check(GameFlow.Paused,"Sürüş Esc mevcut duraklatmayı açar");MutantRuntime.Exit();});Wait(()=>UnityEngine.SceneManagement.SceneManager.GetActiveScene().name=="Garage");
      steps.Add(()=>{Check(!MutantRuntime.Active&&GameFlow.Hub==GameFlow.MenuHub.Mutant,"Mevcut çıkış komutu Mutant menüsüne döner");Check(MutantRuntime.Record().Region==3&&MutantRuntime.Record().Bosses==2,"Başlama/çıkış önceki rekoru değiştirmez");});
      Tap(Key.Enter);Tap(Key.Enter);Tap(Key.Escape);
      steps.Add(()=>{Check(!MutantRuntime.Active&&GameFlow.Hub==GameFlow.MenuHub.Mutant,"Araç adımından Esc Mutant menüsüne çıkar");Check(GarageSession.State.Snapshot().ToString()==career&&GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Kariyer sahiplik/para/profil değişmedi");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(p=>now.TryGetValue(p.Key,out var hash)&&hash==p.Value),"İzole ürün oyuncu kayıtları aynı hash'te");Check(proof.runtimeErrors.Count==0,"LastTurn çalışma Console hatası yok");Finish(null);});
    }
    private static void Shot(string name,int w,int h){shot=name;shotW=w;shotH=h;queued=false;Size(w,h);}
    private static void Size(int w,int h)
    {
      var a=typeof(EditorWindow).Assembly;var t=a.GetType("UnityEditor.GameView");if(!game){game=EditorWindow.GetWindow(t);originalSize=(int)t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(game);}
      var st=a.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null);group=st.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int n=(int)group.GetType().GetMethod("GetTotalCount").Invoke(group,null);var size=Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"P7 Mutant"});group.GetType().GetMethod("AddCustomSize").Invoke(group,new[]{size});sizes.Add(n);
      t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,n);game.Show();game.Focus();game.Repaint();
    }
    private static void Capture()
    {
      string path=Path.Combine(Project,"Logs/p7-mutant-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      if(shot=="car"||shot=="skill"){var page=UiRoot.Instance.Screen.Q("f-mutant-start");var button=page.Q("mutant-continue");Check(button.worldBound.xMax<=UiRoot.Instance.Root.layout.width&&button.worldBound.yMax<UiRoot.Instance.Root.layout.height-60,"Adım düğmesi görünür "+shot+shotW);var boss=page.Q(className:"m-boss");var lower=page.Q(className:"m-lower");Check(boss.worldBound.yMax<lower.worldBound.yMin,"Boss ve kartlar çakışmaz "+shot+shotW);}
      proof.images.Add(Path.GetFileName(path));shot=null;
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("P7 Mutant kısa Play");if(steps.Count==0){if(!MutantStartView.Instance)return;Setup();return;}if(EditorApplication.timeSinceStartup-at<.45)return;at=EditorApplication.timeSinceStartup;if(shot!=null){Capture();return;}if(index<steps.Count)steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.result=e==null?"p7-mutant-f-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>Path.GetExtension(f)==".cs"||Path.GetExtension(f)==".uss").OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/p7-mutant-f-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Mutant F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
