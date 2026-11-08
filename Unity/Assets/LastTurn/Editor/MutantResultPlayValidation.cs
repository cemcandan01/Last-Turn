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
  // B / 7A: gerçek sahne/Runtime, kontrollü RaceSession bitiş girdisi; fiziksel yarış sürücüsü değildir.
  [InitializeOnLoad]
  public static class MutantResultPlayValidation
  {
    private const string Active="LastTurn.BResult.Active",PathKey="LastTurn.BResult.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc;public uint seed;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career,profile,initial;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantResultPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
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
      keyboard=InputSystem.AddDevice<Keyboard>();proof.seed=53;MutantRuntime.Start(53);MutantRuntime.RecordDirectory=Path.Combine(Project,"Logs/BResult/"+Guid.NewGuid().ToString("N"));MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);
      Wait(WorldReady);steps.Add(()=>eventFixture=MutantRuntime.Run.State["etkinlikler"].Clone());
      NormalCase("passed",true,false,false);Tap(Key.Enter);Wait(WorldReady);steps.Add(()=>Check(!MutantResultView.Instance.Visible&&MutantRuntime.Panel=="","Enter normal sonuçtan dünyaya döner"));
      NormalCase("failed",false,false,false);
      Tap(Key.Escape);steps.Add(()=>Check(GameFlow.Paused&&!MutantResultView.Instance.Visible&&MutantRuntime.Run.State.ToString()==initial,"Sonuç Esc duraklatır; ödül değişmez"));Tap(Key.Escape);Wait(()=>MutantResultView.Instance.Visible);
      steps.Add(()=>Check(!GameFlow.Paused&&MutantRuntime.Run.State.ToString()==initial,"Duraklatmadan sonuç ekranına döner"));
      Click("mutant-result-continue");Wait(WorldReady);steps.Add(()=>Check(!MutantResultView.Instance.Visible,"Fare Devam dünyaya döner"));
      NormalCase("level",true,true,false);Tap(Key.Enter);Wait(()=>MutantChoiceView.Instance.Visible);
      steps.Add(()=>{Check(MutantRuntime.Panel=="choice"&&MutantRuntime.Run.State.ToString()==initial,"Devam mevcut beceri seçimine geçer; ödül tekrarlanmaz");Check(MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id),"Mevcut seçim komutu sonrası koşu sürer");});Wait(WorldReady);
      NormalCase("pending",false,false,true);Tap(Key.Enter);Wait(()=>MutantBossView.Instance.Visible);
      steps.Add(()=>{Check(MutantRuntime.Panel=="boss"&&MutantRuntime.Run.State.ToString()==initial,"Devam bekleyen boss'a geçer; ödül tekrarlanmaz");PrepareBoss();});
      Wait(RaceReady);steps.Add(()=>{Check(!MutantRuntime.Session.PendingBoss,"Boss girişinde bekleyen çağrı tüketilir");FinishRace(true);});Wait(()=>MutantResultView.Instance.Visible);
      steps.Add(()=>Check(MutantRuntime.Model.Region==2&&MutantRuntime.ResultPassed==true,"Boss galibiyetinde güncel bölge ve kaynak sonucu"));
      steps.Add(()=>Shot("boss",1920,1080));steps.Add(()=>Shot("boss",1280,720));
      Click("mutant-result-continue");Wait(()=>MutantChoiceView.Instance.Visible);
      steps.Add(()=>{Check(MutantRuntime.Run.State.ToString()==initial,"Boss sonrası Devam ödülü tekrar uygulamaz");Check(MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id),"Boss sonrası mevcut seçim tamamlanır");});Wait(WorldReady);
      steps.Add(()=>{Check(!MutantRuntime.Session.PendingBoss,"Yeni bölgede eski boss çağrısı kalmaz");PrepareBoss();});Wait(RaceReady);steps.Add(()=>FinishRace(false));
      steps.Add(()=>{Check(MutantRuntime.Panel=="summary"&&!MutantResultView.CoversCurrentScreen&&!MutantResultView.Instance.Visible&&MutantRuntime.ResultPassed==false,"Koşu bitişi mevcut özette kalır; 7A örtmez");MutantRuntime.Exit();});
      steps.Add(()=>{Check(MutantRuntime.ResultPassed==null,"Yeni koşuya taşınan eski sonuç yok");Check(GarageSession.State.Snapshot().ToString()==career&&GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Kariyer sahiplik para profil aynı");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"İzole ürün kalıcı kayıt hash'leri aynı");Finish(null);});
    }
    private static GtPrototype P=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    private static CatalogNode eventFixture;
    private static bool WorldReady()=>UnityEngine.SceneManagement.SceneManager.GetActiveScene().name=="GTTest"&&P?.Simulation!=null&&P.Race==null&&MutantRuntime.Panel=="";
    private static bool RaceReady()=>P?.Race!=null&&MutantRuntime.RacePlan!=null;
    private static void NormalCase(string label,bool passed,bool levelUp,bool pending)
    {
      steps.Add(()=>{
        var r=MutantRuntime.Run;r.State.Set("etkinlikler",eventFixture.Clone());r.State.Set("seviye",CatalogNode.Num(1));r.State.Set("xp",CatalogNode.Num(levelUp?MutantRun.LevelXp(2)-1:MutantRun.LevelXp(1)));r.State.Set("bekleyenSecim",CatalogNode.Num(0));r.State.Set("kalan",CatalogNode.Num(pending?0:300));r.State.Set("sonNefes",CatalogNode.Bool(true));
        var e=MutantRuntime.Model.Events.First(x=>!x.Done&&!x.Duel&&x.Type!="dp"&&x.Risks[0].Target>0&&x.Risks[0].Xp<MutantRun.LevelXp(2)-MutantRun.LevelXp(1));MutantRuntime.StartRace(e.Id,0);
      });Wait(RaceReady);
      steps.Add(()=>{Check(MutantRuntime.ResultPassed==null,"Yeni yarış eski sonuç kararını temizler "+label);if(pending){MutantRuntime.Session.Step(new MutantSessionInput{Racing=true},PowertrainVehicle.FixedDelta);Check(MutantRuntime.Session.PendingBoss,"Yarış sırasında boss beklemeye alınır");}FinishRace(passed);});
      Wait(()=>MutantResultView.Instance.Visible);
      steps.Add(()=>Check(MutantRuntime.ResultPassed==passed,"Tipli bitiş kararı gerçek Runtime'dan "+label));
      steps.Add(()=>Shot(label,1920,1080));steps.Add(()=>Shot(label,1280,720));
    }
    private static void PrepareBoss()
    {
      var r=MutantRuntime.Run;r.State.Set("boss",r.Catalog["bosses"].Items.First(b=>b["ty"].S()=="dp").Clone());r.State.Set("seviye",CatalogNode.Num(1));r.State.Set("xp",CatalogNode.Num(MutantRun.LevelXp(1)));r.State.Set("bekleyenSecim",CatalogNode.Num(0));MutantRuntime.StartRace(-1,0,true);
    }
    private static void FinishRace(bool passed)
    {
      // Kontrollü süre/puan girdisi; gerçek özel Finish ve Runtime bitiş yolu. Uzun sürüş simülasyonu yok.
      var s=P.Race.Session;Check(s.Mutant&&!s.Career,"Mutant sonucu kariyer yarışı değildir");s.TickCountdown(4);
      typeof(RaceSession).GetProperty(nameof(RaceSession.Time)).SetValue(s,s.IsDrift?1:passed?System.Math.Max(.1,s.Event.Limit*.5):s.Event.Limit+10);
      if(s.IsDrift)s.Drift.Score=passed?s.Event.Limit+1:0;
      typeof(RaceSession).GetMethod("Finish",BindingFlags.Instance|BindingFlags.NonPublic).Invoke(s,null);
      Check(s.State==RaceState.Finished,"Kontrollü RaceSession bitişi");MutantRuntime.Finished(P.Race,P.Opponent);initial=MutantRuntime.Run.State.ToString();
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
      string path=Path.Combine(Project,"Logs/b-result-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      var page=UiRoot.Instance.Screen.Q("b-mutant-result");var panel=page.Q(className:"mr-panel");var left=page.Q(className:"mr-left");var go=page.Q("mutant-result-continue");
      var m=MutantRuntime.Model;
      Check(page.Q<Label>("mutant-result-money").text==m.Money.ToString("N0")&&page.Q<Label>("mutant-result-xp").text==m.Xp.ToString("0")+" / "+m.NextLevelXp.ToString("0"),"Para ve XP gerçek modelde / "+shot+shotW);
      Check(page.Q<Label>("mutant-result-level").text==m.Level.ToString()&&page.Q<Label>("mutant-result-body").text=="%"+m.Body.ToString("0")&&page.Q<Label>("mutant-result-timer").text==m.Timer&&page.Q<Label>("mutant-result-region").text==m.Region.ToString(),"Koşu kaynakları gerçek modelde / "+shot+shotW);
      Check(page.Q<Label>("mutant-result-title").text==(MutantRuntime.ResultPassed==true?"Hedef geçildi.":"Hedef kaçırıldı."),"Başlık bitiş kararıyla aynı / "+shot+shotW);
      Check(!panel.worldBound.Overlaps(left.worldBound),"Result columns separate / "+shot+shotW);
      Check(go.worldBound.yMax<page.worldBound.yMax-90&&go.worldBound.xMax<page.worldBound.xMax-30,"Continue bounds / "+shot+shotW);
      foreach(var row in page.Query(className:"mr-row").ToList())Check(row.worldBound.xMin>=panel.worldBound.xMin&&row.worldBound.yMax<=go.worldBound.yMin,"Resource row bounds / "+shot+shotW);
      Check(MutantRuntime.Run.State.ToString()==initial,"Capture read-only / "+shot+shotW);
      proof.images.Add(Path.GetFileName(path));shot=null;
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("P7 Mutant kısa Play");if(steps.Count==0){if(!MutantResultView.Instance)return;Setup();return;}if(EditorApplication.timeSinceStartup-at<.45)return;at=EditorApplication.timeSinceStartup;if(shot!=null){Capture();return;}if(index<steps.Count)steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.result=e==null?"b-result-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/b-result-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Mutant F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
