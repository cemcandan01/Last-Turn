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
  public static class MutantHudPlayValidation
  {
    private const string Active="LastTurn.BHud.Active",PathKey="LastTurn.BHud.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc;public uint seed;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career,profile,initial;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantHudPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      // Kopyalanmış Editor oturumundan başka kabul sürücüsü etkin kalamaz.
      foreach(var type in typeof(MutantHudPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
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
      string backup=Path.Combine(Project,"Logs/HudSceneBackup/"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(backup);
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
    private static void Click(string name)
    {
      steps.Add(()=>{var element=UiRoot.Instance.Screen.Q(name)??UiRoot.Instance.Top.Q(name);Check(element!=null,"Fare hedefi var: "+name);point=element.worldBound.center;pointer=element.panel.Pick(point);Check(pointer==element||element.Contains(pointer),"Fare hit-test: "+name);});
      steps.Add(()=>{using(var e=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=point}))pointer.SendEvent(e);});
      steps.Add(()=>{using(var e=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=point}))pointer.SendEvent(e);});
    }
    private static double nitroBefore;private static Mouse mouse;private static bool held;
    private static void Setup()
    {
      GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=PlayerFiles();
      keyboard=InputSystem.AddDevice<Keyboard>();mouse=InputSystem.AddDevice<Mouse>();proof.seed=53;MutantRuntime.Start(53);MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);
      Wait(WorldReady);steps.Add(()=>{Check(MutantHudView.OwnsDrive,"HUD gerçek dünyada sahip");Check(!UiRoot.Instance.PointerOverUi(new Vector2(Screen.width*.3f,Screen.height*.3f)),"HUD fare sürüşünü yakalamaz");});
      steps.Add(()=>Shot("empty",1920,1080));steps.Add(()=>Shot("empty",1280,720));
      steps.Add(()=>{MutantRuntime.Run.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"grappling-hook\",\"seviye\":3,\"evrim\":\"ters-kanca\",\"eklentiler\":[\"sok-bobini\"]},{\"id\":\"flying-dutchman\",\"seviye\":1,\"evrim\":null,\"eklentiler\":[]},{\"id\":\"slipstream-engine\",\"seviye\":2,\"evrim\":null,\"eklentiler\":[]}]"));MutantRuntime.Session.Missions.Active=new MutantRoadMission{Kind="drift",Target=40,Progress=12,Remaining=25};});
      steps.Add(()=>Shot("full",1920,1080));steps.Add(()=>Shot("full",1280,720));
      steps.Add(()=>{nitroBefore=MutantRuntime.Abilities.Nitro().Energy;Check(nitroBefore>=MutantRuntime.Abilities.Nitro().Cost,"Nitro için gerçek enerji var");});Tap(Key.N);
      steps.Add(()=>Check(MutantRuntime.Abilities.Nitro().Open&&MutantRuntime.Abilities.Nitro().Energy<nitroBefore,"N gerçek nitro enerji yoluna gider"));
      Tap(Key.Digit2);steps.Add(()=>Check(MutantRuntime.Abilities.Skills()[1].Open,"2 gerçek uçuş skillini açar"));
      // Kontrollü havada başlangıç: fare kontrolünün gerçek hava koşulunu sağlar; uçuş yüksekliğini varsaymaz.
      steps.Add(()=>{var b=P.Simulation.Body;typeof(VehicleState).GetProperty(nameof(VehicleState.Position)).SetValue(b,new BodyVector(b.Position.X,b.Position.Y+20,b.Position.Z));InputSystem.QueueStateEvent(mouse,new MouseState{buttons=1});});steps.Add(()=>{Check(P.Simulation.Body.Airborne,"Fare fixture gerçekten havada");InputSystem.QueueDeltaStateEvent(mouse.delta,new Vector2(3,4));});steps.Add(()=>{held=MutantRuntime.Abilities.Finger;InputSystem.QueueStateEvent(mouse,new MouseState());});
      steps.Add(()=>Check(held&&!MutantRuntime.Abilities.Finger,"Fare hava kontrolü bas ve bırak korunur"));
      Tap(Key.Digit1);Tap(Key.Digit3);
      steps.Add(()=>Shot("active",1920,1080));steps.Add(()=>Shot("active",1280,720));
      Tap(Key.Escape);steps.Add(()=>{Check(GameFlow.Paused&&!MutantHudView.OwnsDrive&&!MutantHudView.Instance.Visible,"Esc HUD'u gizler ve duraklatır");initial=MutantRuntime.Run.State.ToString();});steps.Add(()=>Check(MutantRuntime.Run.State.ToString()==initial,"Pause koşu durumunu ilerletmez"));Tap(Key.Escape);Wait(WorldReady);
      steps.Add(()=>{SettingsScreen.Show();});steps.Add(()=>Check(!MutantHudView.Instance.Visible,"Ayarlar HUD'u gizler"));Tap(Key.Escape);Wait(()=>GameFlow.Paused&&!SettingsScreen.Open);steps.Add(()=>Check(!MutantHudView.Instance.Visible,"Ayarlardan mevcut pause'a dönüş korunur"));Tap(Key.Escape);Wait(WorldReady);
      steps.Add(()=>{var r=MutantRuntime.Run;r.State.Set("kalan",CatalogNode.Num(300));r.State.Set("xp",CatalogNode.Num(MutantRun.LevelXp((int)r.State["seviye"].N()+1)-1));var e=MutantRuntime.Model.Events.First(x=>!x.Done&&!x.Duel&&x.Type!="dp");MutantRuntime.StartRace(e.Id,0);});Wait(()=>P?.Race!=null&&MutantHudView.Instance.Visible);
      steps.Add(()=>Shot("race",1920,1080));steps.Add(()=>Shot("race",1280,720));
      steps.Add(()=>{var s=P.Race.Session;s.TickCountdown(4);typeof(RaceSession).GetProperty(nameof(RaceSession.Time)).SetValue(s,s.Event.Limit*.5);typeof(RaceSession).GetMethod("Finish",BindingFlags.Instance|BindingFlags.NonPublic).Invoke(s,null);MutantRuntime.Finished(P.Race,P.Opponent);});Wait(()=>MutantResultView.Instance.Visible);
      steps.Add(()=>{Check(!MutantHudView.Instance.Visible,"Sonuç HUD'u örter");MutantRuntime.Continue();});
      Wait(()=>MutantRuntime.Panel=="choice"||WorldReady());steps.Add(()=>{Check(MutantRuntime.Panel=="choice","Yarış sonrası gerçek seviye seçimi");Check(!MutantHudView.Instance.Visible,"Ödül ekranında HUD gizli");Check(MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id,MutantRuntime.Model.OwnedSkills.FirstOrDefault()?.Id??""),"Mevcut ödül komutu korunur");});Wait(WorldReady);
      steps.Add(()=>{MutantRuntime.Run.State.Set("kalan",CatalogNode.Num(0));});Wait(()=>MutantBossView.Instance.Visible);steps.Add(()=>Check(!MutantHudView.Instance.Visible,"Süre bitince boss HUD'u örter"));
      steps.Add(()=>MutantRuntime.Exit());steps.Add(()=>{Check(!MutantHudView.Instance.Visible,"Çıkışta HUD gizli");MutantRuntime.Start(54);Check(MutantRuntime.HudFeedback.Text=="","Yeni koşu eski bildirimi taşımaz");MutantRuntime.Exit();});
      steps.Add(()=>{Check(GarageSession.State.Snapshot().ToString()==career&&GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Kariyer sahiplik para profil aynı");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"İzole ürün kalıcı kayıt hash'leri aynı");if(mouse!=null&&mouse.added)InputSystem.RemoveDevice(mouse);Finish(null);});
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
      string path=Path.Combine(Project,"Logs/b-hud-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      ValidateShot();
      proof.images.Add(Path.GetFileName(path));shot=null;Time.timeScale=1;
    }
    private static void ValidateShot()
    {
      var page=UiRoot.Instance.Hud.Q("b-mutant-hud");Check(MutantHudView.Instance.Visible,"HUD görünür / "+shot+shotW);
      var p=P.Simulation.ReferencePoint;var m=MutantRuntime.HudModel(p.X,p.Z);Check(page.Q<Label>("mh-boss").text==m.Boss&&page.Q<Label>("mh-resources").text==m.Resources,"Koşu verisi modelle aynı / "+shot+shotW);
      Check(page.Q<Label>("mh-nitro-text").text==m.NitroText,"Nitro modelle aynı / "+shot+shotW);
      Check(page.Q<Label>("mh-mission").text==m.Mission,"Görev modelle aynı / "+shot+shotW);
      var visible=page.Children().Where(e=>e.resolvedStyle.display!=DisplayStyle.None&&e.name!="mh-notice").ToArray();
      var clear=new Rect(Screen.width*.42f,Screen.height*.65f,Screen.width*.16f,Screen.height*.35f);float k=UiRoot.Instance.PixelToPanel;
      foreach(var e in visible){var b=e.worldBound;Check(b.xMin>=0&&b.yMin>=0&&b.xMax<=page.worldBound.xMax+1&&b.yMax<=page.worldBound.yMax+1,"HUD ekran içinde / "+e.name+shot+shotW);Check(!new Rect(b.x/k,b.y/k,b.width/k,b.height/k).Overlaps(clear),"Alt orta boş / "+e.name+shot+shotW);}
      for(int i=0;i<visible.Length;i++)for(int j=i+1;j<visible.Length;j++)Check(!visible[i].worldBound.Overlaps(visible[j].worldBound),"HUD kutuları çakışmaz / "+visible[i].name+visible[j].name+shot+shotW);
      for(int i=0;i<m.Slots.Length;i++){var slot=page.Q("mh-slot-"+i);Check(slot.Q<Label>("mh-detail").text==m.Slots[i].Detail&&slot.Q<Label>("mh-state").text==m.Slots[i].Text,"Skill modelle aynı / "+i+shot+shotW);Check(slot.Q(className:"mh-icon")!=null&&!slot.Q(className:"mh-icon").ClassListContains("mc-icon-fallback"),"Gerçek skill ikonu / "+i+shot+shotW);Check(slot.Children().Where(e=>e is Label).All(e=>e.worldBound.yMax<=slot.worldBound.yMax+1),"Skill metni sığar / "+i+shot+shotW);}
      foreach(var slot in page.Children().Where(e=>e.ClassListContains("mh-slot")&&e.resolvedStyle.display!=DisplayStyle.None))Check(slot.Q<Label>("mh-name").worldBound.xMax<=slot.Q(className:"mh-icon").worldBound.xMin,"Skill adı ve ikonu ayrık / "+slot.name+shot+shotW);
      Check(page.Q("mh-summary").Children().All(e=>e.worldBound.yMax<=page.Q("mh-summary").worldBound.yMax+1),"Özet metni sığar / "+shot+shotW);
      Check(UnityEngine.Object.FindFirstObjectByType<RaceHudView>().SpeedText!="","Gerçek hız göstergesi var / "+shot+shotW);
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("B HUD kısa Play: "+Status());if(EditorApplication.timeSinceStartup-at<.45)return;at=EditorApplication.timeSinceStartup;File.WriteAllText(Path.Combine(Project,"Logs/b-hud-progress.txt"),Status());if(steps.Count==0){if(!MutantHudView.Instance)return;Setup();return;}if(shot!=null){Capture();return;}if(index<steps.Count)steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static string Status()=>"index="+index+" steps="+steps.Count+" pause="+GameFlow.Paused+" editorPause="+EditorApplication.isPaused+" scale="+Time.timeScale+" scene="+UnityEngine.SceneManagement.SceneManager.GetActiveScene().name+" panel="+MutantRuntime.Panel+" phase="+(MutantRuntime.Run?.State["faz"].S()??"null")+" root="+(UiRoot.Instance!=null)+" hud="+(MutantHudView.Instance!=null)+" visible="+(MutantHudView.Instance?.Visible??false)+" settings="+SettingsScreen.Open+" sim="+(P?.Simulation!=null)+" race="+(P?.Race!=null)+" touch="+(Touchscreen.current!=null);
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.result=e==null?"b-hud-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/b-hud-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Mutant F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
