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
  // Yalnız ayrı grafik Editor'da B / 6A; kontrollü boss paneli ve gerçek zaman aşımı/yarış komutları.
  [InitializeOnLoad]
  public static class MutantBossPlayValidation
  {
    private const string Active="LastTurn.BBoss.Active",PathKey="LastTurn.BBoss.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc;public uint seed;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career,profile,initial;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantBossPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
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
      GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=PlayerFiles();
      keyboard=InputSystem.AddDevice<Keyboard>();proof.seed=53;MutantRuntime.Start(53);MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);
      Wait(()=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>()?.Simulation!=null);
      for(int i=0;i<5;i++){
        int n=i;steps.Add(()=>ShowBoss(n));Wait(()=>MutantBossView.Instance.Visible);
        steps.Add(()=>{
          var m=MutantRuntime.Model;var page=UiRoot.Instance.Screen.Q("b-mutant-boss");
          var texture=page.Q("mutant-boss-emblem").style.backgroundImage.value.texture;
          Check(page.Q<Label>(className:"mb-title").text==m.BossName&&texture&&texture.name==m.BossId,"Boss adı ve arma gerçek modelde "+m.BossId);
          Check(page.Q<Label>(className:"mb-target").text.Contains(m.BossDuel?"Boss'u geç":m.BossTarget.ToString("0.##")),"Hedef gerçek Core kararında "+m.BossId);
          Check(page.Query<Label>(className:"mb-copy").ToList().Select(l=>l.text).Contains(string.Join("\n\n",m.BossAbilities)),"Yetenekler katalog görünümünde "+m.BossId);
        });
        steps.Add(()=>Shot(MutantRuntime.Model.BossId,1920,1080));steps.Add(()=>Shot(MutantRuntime.Model.BossId,1280,720));
      }
      steps.Add(()=>{UiRoot.Instance.Screen.Q("mutant-boss-challenge").Focus();});
      Tap(Key.RightArrow);steps.Add(()=>Check(MutantBossView.Instance.Focused==1,"Sağ ok tek düğme ilerler"));Tap(Key.LeftArrow);
      steps.Add(()=>Check(MutantBossView.Instance.Focused==0,"Sol ok meydan okumaya döner"));
      steps.Add(()=>{var e=UiRoot.Instance.Screen.Q("mutant-boss-challenge");using(var k=KeyDownEvent.GetPooled(new Event{type=EventType.KeyDown,keyCode=KeyCode.Tab,character='\t'}))e.SendEvent(k);});
      steps.Add(()=>Check(MutantBossView.Instance.Focused==1,"Tab Geri düğmesini seçer"));
      Tap(Key.Tab);steps.Add(()=>Check(MutantBossView.Instance.Focused==0,"InputSystem Tab tek düğme ilerler"));
      Click("mutant-boss-back");steps.Add(()=>Check(MutantRuntime.Panel==""&&!MutantBossView.Instance.Visible&&!GameFlow.Paused,"Fare Geri açık dünyaya döner"));
      steps.Add(()=>ShowBoss(0));Wait(()=>MutantBossView.Instance.Visible);Tap(Key.Escape);
      steps.Add(()=>Check(MutantRuntime.Panel==""&&!GameFlow.Paused,"Erken Esc yalnız geri döner; çift pause yok"));
      steps.Add(()=>ShowBoss(1));Wait(()=>MutantBossView.Instance.Visible);
      steps.Add(()=>{resources=ResourcesSnapshot();expectedTarget=MutantRuntime.Model.BossTarget;});
      Click("mutant-boss-challenge");Wait(()=>MutantRuntime.RacePlan!=null&&UnityEngine.Object.FindFirstObjectByType<GtPrototype>()?.Race!=null);
      steps.Add(()=>{Check(MutantRuntime.RacePlan.Boss&&MutantRuntime.Model.Phase=="boss"&&MutantRuntime.Panel==""&&!MutantBossView.Instance.Visible,"Fare meydan oku gerçek boss yarışını kurar");Check(!MutantRuntime.RacePlan.Duel&&System.Math.Abs(MutantRuntime.RacePlan.Event.Limit-expectedTarget)<1e-9,"Boss yarışı hedefi görünümle aynı");Check(ResourcesSnapshot()==resources,"Meydan okuma para XP araç ve RNG'yi korur");MutantRuntime.OpenWorld();});
      Wait(()=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>()?.Race==null&&UnityEngine.Object.FindFirstObjectByType<GtPrototype>()?.Simulation!=null);
      steps.Add(()=>{MutantRuntime.Run.State.Set("boss",MutantRuntime.Run.Catalog["bosses"][0].Clone());MutantRuntime.Run.State.Set("faz",CatalogNode.Str("surus"));MutantRuntime.Run.State.Set("kalan",CatalogNode.Num(0));});
      Wait(()=>MutantBossView.Instance.Visible);
      steps.Add(()=>{Check(MutantRuntime.Panel=="boss"&&!MutantRuntime.Model.CanLeaveBoss,"Gerçek fizik adımı zaman aşımını boss ekranına taşır");initial=MutantRuntime.Run.State.ToString();MutantBossView.Instance.Back();Check(MutantRuntime.Panel=="boss"&&MutantRuntime.Run.State.ToString()==initial,"Süre dolunca Geri çağrısı durumu değiştirmez");});
      steps.Add(()=>Shot("expired",1920,1080));steps.Add(()=>Shot("expired",1280,720));
      Tap(Key.Escape);steps.Add(()=>Check(GameFlow.Paused&&!MutantBossView.Instance.Visible&&MutantRuntime.Run.State.ToString()==initial,"Zorunlu boss Esc ile duraklar; kayıt ve RNG aynı"));
      Tap(Key.Escape);Wait(()=>MutantBossView.Instance.Visible);steps.Add(()=>Check(!GameFlow.Paused&&!MutantRuntime.Model.CanLeaveBoss&&MutantRuntime.Run.State.ToString()==initial,"Devam zorunlu boss ekranına döner"));
      Tap(Key.Enter);Wait(()=>MutantRuntime.RacePlan!=null&&UnityEngine.Object.FindFirstObjectByType<GtPrototype>()?.Race!=null);
      steps.Add(()=>{Check(MutantRuntime.RacePlan.Boss&&MutantRuntime.Model.Phase=="boss"&&MutantRuntime.Panel=="","Enter zorunlu boss yarışını kurar");Check(MutantRuntime.RacePlan.Duel&&MutantRuntime.RacePlan.Event.Limit==0&&MutantRuntime.Model.BossDuel,"Zorunlu düello boss hedefi bitiş sırası");Check(GarageSession.State.Snapshot().ToString()==career&&GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Kariyer sahiplik para profil aynı");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"İzole ürün kalıcı kayıt hash'leri aynı");MutantRuntime.Exit();});
      steps.Add(()=>Finish(null));
    }
    private static double expectedTarget;
    private static string resources;
    private static string ResourcesSnapshot()=>string.Join("|",new[]{"tohum","para","xp","pasifler","parcalar","beceriler","govde"}.Select(k=>MutantRuntime.Run.State[k].ToString()));
    private static void ShowBoss(int index)
    {
      // Erken işaretin yalnız sunum fixture'ı; kilitli durum aşağıda gerçek Runtime.Step ile açılır.
      var r=MutantRuntime.Run;r.State.Set("boss",r.Catalog["bosses"].Items.ElementAt(index).Clone());r.State.Set("faz",CatalogNode.Str("surus"));r.State.Set("kalan",CatalogNode.Num(180));MutantRuntime.Session.ClearPendingBoss();
      typeof(MutantRuntime).GetProperty(nameof(MutantRuntime.Panel)).SetValue(null,"boss");initial=r.State.ToString();
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
      string path=Path.Combine(Project,"Logs/b-boss-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      var page=UiRoot.Instance.Screen.Q("b-mutant-boss");var panel=page.Q(className:"mb-panel");var emblem=page.Q("mutant-boss-emblem");var go=page.Q("mutant-boss-challenge");
      Check(panel.worldBound.yMin>page.Q(className:"mb-title").worldBound.yMax,"Panel title separated / "+shot+shotW);
      Check(go.worldBound.yMax<page.worldBound.yMax-100&&go.worldBound.xMax<page.worldBound.xMax-30,"Challenge bounds / "+shot+shotW);
      Check(emblem.worldBound.yMin>=panel.worldBound.yMin&&emblem.worldBound.yMax<=panel.worldBound.yMax,"Emblem bounds / "+shot+shotW);
      Check(MutantBossView.Instance.Details.contentViewport.worldBound.height>100,"Scrollable details / "+shot+shotW);
      Check(page.Q("mutant-boss-back").resolvedStyle.display==(MutantRuntime.Model.CanLeaveBoss?DisplayStyle.Flex:DisplayStyle.None),"Back visibility / "+shot+shotW);
      Check(MutantRuntime.Run.State.ToString()==initial,"Capture read-only / "+shot+shotW);
      proof.images.Add(Path.GetFileName(path));shot=null;
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("P7 Mutant kısa Play");if(steps.Count==0){if(!MutantBossView.Instance)return;Setup();return;}if(EditorApplication.timeSinceStartup-at<.45)return;at=EditorApplication.timeSinceStartup;if(shot!=null){Capture();return;}if(index<steps.Count)steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.result=e==null?"b-boss-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/b-boss-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Mutant F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
