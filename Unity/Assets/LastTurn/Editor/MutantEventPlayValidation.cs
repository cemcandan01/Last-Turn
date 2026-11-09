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
  // B HUD: gerçek sahne/Runtime, kontrollü RaceSession bitiş girdisi; fiziksel yarış sürücüsü değildir.
  [InitializeOnLoad]
  public static class MutantEventPlayValidation
  {
    private const string Active="LastTurn.BEvent.Active",PathKey="LastTurn.BEvent.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc,environment;public uint seed;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career,profile,initial;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantEventPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      // Kopyalanmış Editor oturumundan başka kabul sürücüsü etkin kalamaz.
      foreach(var type in typeof(MutantEventPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
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
      string backup=Path.Combine(Project,"Logs/EventSceneBackup/"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(backup);
      foreach(var type in new[]{typeof(GtPrototypeSceneBuilder),typeof(RaceTestSceneBuilder)}){
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
    private static void Click(string name,Action after=null)
    {
      steps.Add(()=>{var element=UiRoot.Instance.Screen.Q(name)??UiRoot.Instance.Top.Q(name);Check(element!=null,"Fare hedefi var: "+name);point=element.worldBound.center;pointer=element.panel.Pick(point);Check(pointer==element||element.Contains(pointer),"Fare hit-test: "+name);});
      steps.Add(()=>{using(var e=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=point}))pointer.SendEvent(e);});
      steps.Add(()=>{using(var e=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=point}))pointer.SendEvent(e);after?.Invoke();});
    }
    private static int eventId,riskId,bodySteps;private static CatalogNode trackNames,riskDefinitions;private static bool expectDuel;private static string expectedTarget;
    private static void Setup()
    {
      GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=PlayerFiles();
      keyboard=InputSystem.AddDevice<Keyboard>();proof.seed=53;MutantRuntime.Start(53);MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);
      Wait(WorldReady);steps.Add(()=>{var e=MutantRuntime.Model.Events.First(r=>!r.Done&&!r.Duel&&r.Type!="dp");eventId=e.Id;P.Simulation.Place(e.X,e.Z,0);});
      Wait(()=>MutantEventView.Instance.Visible);steps.Add(()=>{Check(MutantRuntime.MarkerId==eventId,"Gerçek işaret/dwell etkinliği açar");Check(!MutantHudView.Instance.Visible&&MutantRuntime.Blocked,"Panel sürüş/HUD sahipliğini alır");initial=MutantRuntime.Run.State.ToString();bodySteps=P.Simulation.Body.Steps;});
      steps.Add(()=>Shot("time",1920,1080));steps.Add(()=>Shot("time",1280,720));
      Click("mutant-event-risk-2");steps.Add(()=>Check(MutantEventView.Instance.Selected==2&&MutantEventView.Instance.Focused==2,"Fare yalnız seçer; odak riskle aynı"));
      Tap(Key.LeftArrow);steps.Add(()=>Check(MutantEventView.Instance.Selected==1&&MutantEventView.Instance.Focused==1,"Ok risk seçer"));Tap(Key.Tab);steps.Add(()=>Check(MutantEventView.Instance.Selected==2&&MutantEventView.Instance.Focused==2,"Tab iki girdi yolunda bir kez ilerler"));Tap(Key.Tab);steps.Add(()=>Check(MutantEventView.Instance.Focused==3&&MutantEventView.Instance.Selected==2,"Başlat odağında seçili risk korunur"));
      Tap(Key.W);steps.Add(()=>Check(P.Simulation.Body.Steps==bodySteps&&MutantRuntime.Run.State.ToString()==initial,"Çizim/odak/sürüş girdisi RNG/timer/ödül değiştirmez"));
      Tap(Key.Escape);steps.Add(()=>Check(GameFlow.Paused&&!MutantEventView.Instance.Visible,"Esc yalnız mevcut pause yoluna gider"));Tap(Key.Escape);Wait(()=>MutantEventView.Instance.Visible);steps.Add(()=>Check(MutantEventView.Instance.Selected==2&&MutantRuntime.Run.State.ToString()==initial,"Pause dönüşü panel/seçim ve durum korunur"));
      steps.Add(()=>SettingsScreen.Show());steps.Add(()=>Check(!MutantEventView.Instance.Visible,"Settings paneli örter"));Tap(Key.Escape);Wait(()=>GameFlow.Paused&&!SettingsScreen.Open);Tap(Key.Escape);Wait(()=>MutantEventView.Instance.Visible);steps.Add(()=>Check(MutantEventView.Instance.Selected==2&&MutantRuntime.Run.State.ToString()==initial,"Settings/pause dönüşü seçim ve durum korunur"));
      Click("mutant-event-back",()=>Check(MutantRuntime.Run.State.ToString()==initial&&MutantRuntime.Panel=="","Fare Geri koşu durumunu değiştirmez"));Wait(WorldReady);
      steps.Add(()=>{Panel(eventId);});Wait(()=>MutantEventView.Instance.Visible);steps.Add(()=>{MutantEventView.Instance.Focus(1);PrepareExpected();});Tap(Key.Enter);RaceCheck("time");
      Case("duel",()=>Fixture("duel"),false);Case("chase",()=>Fixture("chase"),true);Case("drift",()=>Fixture("drift"),false);
      steps.Add(()=>{Fixture("time");var c=MutantRuntime.Run.Catalog;trackNames=c["trackNames"].Clone();riskDefinitions=c["risks"].Clone();var names=c["trackNames"].Items.ToArray();int at=MutantRuntime.Model.FindEvent(eventId).TrackIndex;names[at]=CatalogNode.Str(string.Concat(Enumerable.Repeat("İstanbul kıyılarında çetin mücadele: gölgeli geçitler, dönüşler ve zorlu yokuşlar. ",4)));c.Set("trackNames",CatalogNode.Arr(names));c["risks"][0].Set("ad",CatalogNode.Str(string.Concat(Enumerable.Repeat("Ölçülü cesaret, güçlü rakipler ve keskin dönüşler · ",4))));initial=MutantRuntime.Run.State.ToString();});
      Wait(()=>MutantEventView.Instance.Visible);steps.Add(()=>Shot("long",1920,1080));steps.Add(()=>Shot("long",1280,720));Tap(Key.PageDown);steps.Add(()=>{Check(MutantEventView.Instance.Info.scrollOffset.y>0||MutantEventView.Instance.Risks.scrollOffset.y>0,"Uzun Türkçe içerik klavyeyle kayar");Check(MutantRuntime.Run.State.ToString()==initial,"Uzun metin/kaydırma salt sunum");MutantRuntime.Run.Catalog.Set("trackNames",trackNames);MutantRuntime.Run.Catalog.Set("risks",riskDefinitions);MutantEventView.Instance.Back();});Wait(WorldReady);
      steps.Add(()=>{Fixture("duel");});Wait(()=>MutantEventView.Instance.Visible);steps.Add(()=>{MutantRuntime.Run.State["etkinlikler"].Items.First().Set("yapildi",CatalogNode.Parse("true"));initial=MutantRuntime.Run.State.ToString();MutantEventView.Instance.Confirm();Check(MutantRuntime.RacePlan==null&&MutantRuntime.Run.State.ToString()==initial,"Eski/tamamlanmış etkinlik onay anında reddedilir");});
      steps.Add(()=>Shot("invalid",1920,1080));steps.Add(()=>Shot("invalid",1280,720));Tap(Key.Tab);Tap(Key.Enter);Wait(WorldReady);
      steps.Add(()=>{Panel(int.MaxValue);});Wait(()=>MutantEventView.Instance.Visible);steps.Add(()=>{initial=MutantRuntime.Run.State.ToString();MutantEventView.Instance.Confirm();Check(MutantRuntime.RacePlan==null&&MutantRuntime.Run.State.ToString()==initial,"Bulunamayan etkinlik eski yarışı başlatmaz");MutantEventView.Instance.Back();Check(MutantRuntime.Run.State.ToString()==initial,"Geçersiz etkinlikten güvenli Geri");});Wait(WorldReady);
      steps.Add(()=>{MutantRuntime.Exit();Check(GarageSession.State.Snapshot().ToString()==career&&GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Kariyer sahiplik para profil aynı");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"İzole ürün kalıcı kayıt hash'leri aynı");Finish(null);});
    }
    private static void Panel(int id){typeof(MutantRuntime).GetProperty(nameof(MutantRuntime.MarkerId)).SetValue(null,id);typeof(MutantRuntime).GetProperty(nameof(MutantRuntime.Panel)).SetValue(null,"event");}
    private static void Fixture(string kind)
    {
      var run=MutantRuntime.Run;var track=run.Catalog["tracks"].Items.First(t=>kind=="chase"?t["sokak"].S()=="kovala":kind=="drift"?t["ty"].S()=="dp"&&t["sokak"].S()=="":t["ty"].S()=="gp"&&t["sokak"].S()=="");
      var entry=CatalogNode.Obj();foreach(var key in new[]{"i","ty","sev"})entry.Set(key,track[key].Clone());if(track.Has("sokak"))entry.Set("sokak",track["sokak"].Clone());entry.Set("id",CatalogNode.Num(77));entry.Set("rakip",CatalogNode.Parse(kind=="duel"?"true":"false"));entry.Set("yapildi",CatalogNode.Parse("false"));entry.Set("x",CatalogNode.Num(0));entry.Set("z",CatalogNode.Num(0));run.State.Set("etkinlikler",CatalogNode.Arr(new[]{entry}));Panel(77);eventId=77;
    }
    private static void PrepareExpected(){var row=MutantRuntime.Model.FindEvent(eventId);riskId=row.Risks[MutantEventView.Instance.Selected].Risk;expectedTarget=row.Risks[MutantEventView.Instance.Selected].TargetText;expectDuel=row.Duel;}
    private static void Case(string name,Action fixture,bool mouse)
    {
      steps.Add(fixture);Wait(()=>MutantEventView.Instance.Visible);steps.Add(()=>initial=MutantRuntime.Run.State.ToString());steps.Add(()=>Shot(name,1920,1080));steps.Add(()=>Shot(name,1280,720));
      Click("mutant-event-risk-1");steps.Add(()=>{Check(MutantRuntime.Run.State.ToString()==initial,"Fare seçimi salt sunum / "+name);PrepareExpected();});
      if(mouse)Click("mutant-event-start",()=>{var first=MutantRuntime.RacePlan;string state=MutantRuntime.Run.State.ToString();MutantEventView.Instance.Confirm();MutantEventView.Instance.Confirm();Check(ReferenceEquals(first,MutantRuntime.RacePlan)&&state==MutantRuntime.Run.State.ToString(),"Çift onay ikinci yarış/işlem üretmez");});else Tap(Key.Enter);
      RaceCheck(name);
    }
    private static void RaceCheck(string name)
    {
      Wait(()=>P?.Race!=null&&MutantRuntime.RacePlan!=null&&MutantHudView.Instance.Visible);steps.Add(()=>{var p=MutantRuntime.RacePlan;Check(p.EventId==eventId&&p.Risk==riskId&&p.Duel==expectDuel,"Gerçek yarış oturumuna doğru kimlik/risk / "+name);Check(expectedTarget==(p.Duel?"Rakipten önce bitir":p.Event.Limit.ToString("0.##",System.Globalization.CultureInfo.InvariantCulture)+(p.Event.Type=="dp"?" puan":" sn")),"Gerçek oturum hedefi sunumla aynı / "+name);Check(P.Race.Session.Mutant&&!P.Race.Session.Career&&!MutantEventView.Instance.Visible,"Etkinlik paneli kapanır; kariyer yarışı açılmaz / "+name);Check(MutantHudView.Instance.Visible,"Yarış HUD'u geri gelir / "+name);MutantRuntime.OpenWorld();});Wait(WorldReady);
    }
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
      string path=Path.Combine(Project,"Logs/b-event-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      ValidateShot();
      proof.images.Add(Path.GetFileName(path));shot=null;Time.timeScale=1;
    }
    private static void ValidateShot()
    {
      var page=UiRoot.Instance.Screen.Q("b-mutant-event");var m=MutantRuntime.Model;var row=m.FindEvent(MutantRuntime.MarkerId);var view=MutantEventView.Instance;
      Check(view.Visible&&!MutantHudView.Instance.Visible,"Tek etkinlik görünümü / "+shot+shotW);var go=page.Q("mutant-event-start");var back=page.Q("mutant-event-back");
      Check(back.worldBound.xMin>=0&&back.worldBound.yMax<page.worldBound.yMax-80&&go.worldBound.xMax<=page.worldBound.xMax-30,"İşlemler ekran içinde / "+shot+shotW);
      Check(!view.Info.worldBound.Overlaps(view.Risks.worldBound)&&!view.Risks.worldBound.Overlaps(go.worldBound),"B iki sütun ve eylemler ayrık / "+shot+shotW);
      Check(view.Risks.contentContainer.childCount==(row?.Risks.Length??0),"Gerçek risk sayısı / "+shot+shotW);
      if(row==null){Check(!go.enabledInHierarchy&&view.Focused==1,"Geçersiz etkinlikte yalnız Geri / "+shot+shotW);return;}
      Check(page.Q<Label>("mutant-event-name").text==row.Name&&page.Q<Label>("mutant-event-type").text==row.TypeName&&page.Q<Label>("mutant-event-level").text==row.Title+" / "+row.LevelName,"Etkinlik adı/türü/seviyesi modelle aynı / "+shot+shotW);
      string state=MutantRuntime.Run.State.ToString();string N(double n)=>n.ToString("0.##",System.Globalization.CultureInfo.InvariantCulture);
      for(int i=0;i<row.Risks.Length;i++){var card=page.Q("mutant-event-risk-"+i);var r=row.Risks[i];Check(card.Q<Label>("risk-name").text==r.Name&&card.Q<Label>("risk-target").text=="HEDEF · "+r.TargetText,"Risk/gerçek hedef metni / "+i+shot+shotW);
        Check(card.Q<Label>("risk-reward").text==N(r.Money)+" para · "+N(r.Xp)+" XP"&&card.Q<Label>("risk-penalty").text=="Kaçırınca: "+N(r.Penalty)+" sn ceza · "+N(r.Consolation)+" para teselli","Ödül/ceza/teselli modelle aynı / "+i+shot+shotW);
        Check(card.ClassListContains("mc-selected")== (i==view.Selected),"Seçili risk açık / "+i+shot+shotW);
        foreach(var l in card.Query<Label>().ToList())Check(l.worldBound.xMin>=card.worldBound.xMin&&l.worldBound.xMax<=card.worldBound.xMax+1&&l.worldBound.yMax<=card.worldBound.yMax+1,"Kart metni yatay/dikey sığar / "+l.name+i+shot+shotW);
        if(shot!="long")Check(card.worldBound.yMin>=view.Risks.contentViewport.worldBound.yMin-1&&card.worldBound.yMax<=view.Risks.contentViewport.worldBound.yMax+1,"Normal riskler kaydırmadan görünür / "+i+shot+shotW);
      }
      Check(MutantRuntime.Run.State.ToString()==state,"Görüntü/model okuması salt / "+shot+shotW);
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("B etkinlik kısa Play: "+Status());if(EditorApplication.timeSinceStartup-at<.45)return;at=EditorApplication.timeSinceStartup;File.WriteAllText(Path.Combine(Project,"Logs/b-event-progress.txt"),Status());if(steps.Count==0){if(!MutantEventView.Instance)return;Setup();return;}if(shot!=null){Capture();return;}if(index<steps.Count)steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static string Status()=>"index="+index+" steps="+steps.Count+" pause="+GameFlow.Paused+" editorPause="+EditorApplication.isPaused+" scale="+Time.timeScale+" scene="+UnityEngine.SceneManagement.SceneManager.GetActiveScene().name+" panel="+MutantRuntime.Panel+" phase="+(MutantRuntime.Run?.State["faz"].S()??"null")+" root="+(UiRoot.Instance!=null)+" hud="+(MutantHudView.Instance!=null)+" visible="+(MutantHudView.Instance?.Visible??false)+" settings="+SettingsScreen.Open+" sim="+(P?.Simulation!=null)+" race="+(P?.Race!=null)+" touch="+(Touchscreen.current!=null);
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.environment=Application.unityVersion+" | "+Application.platform+" | "+Application.productName+" | GameView";proof.result=e==null?"b-event-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/b-event-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Mutant F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
