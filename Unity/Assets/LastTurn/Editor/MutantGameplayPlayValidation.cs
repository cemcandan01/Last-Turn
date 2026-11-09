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
  // B /3A: izole üründe gerçek komutlar ve Game View; fiziksel/insan kabulü değildir.
  [InitializeOnLoad]
  public static class MutantGameplayPlayValidation
  {
    private const string Active="LastTurn.BGameplay.Active",PathKey="LastTurn.BGameplay.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc,environment;public uint seed;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;public List<Sample> samples=new List<Sample>();public List<string> outcomes=new List<string>();public List<float> frameMs=new List<float>();public string hardware;public List<float> realtimeFrameMs=new List<float>();}
    [Serializable]private sealed class Sample{public string phase,panel,track,car,skill,refusal;public double time,x,y,z,speed,heading,beta,steering,throttle,brake,body,energy,raceTime,drift;public bool handbrake,nitro,airborne,driftActive;public float cameraX,cameraY,cameraZ;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career,profile,initial;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantGameplayPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      // Kopyalanmış Editor oturumundan başka kabul sürücüsü etkin kalamaz.
      foreach(var type in typeof(MutantGameplayPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
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
      string backup=Path.Combine(Project,"Logs/GameplaySceneBackup/"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(backup);
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
    private static void Click(string name,Action after=null)=>Click(()=>name,after);
    private static void Click(Func<string> target,Action after=null)
    {
      steps.Add(()=>{var name=target();var element=UiRoot.Instance.Screen.Q(name)??UiRoot.Instance.Top.Q(name);Check(element!=null,"Fare hedefi var: "+name);point=element.worldBound.center;pointer=element.panel.Pick(point);Check(pointer==element||element.Contains(pointer),"Fare hit-test: "+name);});
      steps.Add(()=>{using(var e=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=point}))pointer.SendEvent(e);});
      steps.Add(()=>{using(var e=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=point}))pointer.SendEvent(e);after?.Invoke();});
    }
    private static double realBegan,realResumeAfter;private static bool realNitro;private static bool initialized;private static int mode,round,simSteps,nextShot,waitTicks;private static double simTime;private static MutantEventCard target;private static RaceTestDriver driver;private static bool actualGate;private static string recordDir,motorId;
    private static void Setup()
    {
      initialized=true;GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=PlayerFiles();proof.seed=53;proof.hardware=SystemInfo.operatingSystem+" | "+SystemInfo.processorType+" | "+SystemInfo.graphicsDeviceName+" | "+SystemInfo.systemMemorySize+" MB";Size(1280,720);recordDir=Path.Combine(Project,"Logs/GameplayRecords/"+Guid.NewGuid().ToString("N"));NewRun();
    }
    private static void NewRun(){if(MutantRuntime.Active)MutantRuntime.Exit();MutantRuntime.Start(53);MutantRuntime.RecordDirectory=recordDir;MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);var choices=MutantRuntime.Model.Choices;MutantRuntime.Choose(choices.First().Id);simSteps=0;simTime=0;nextShot=0;actualGate=false;mode=0;}
    private static MutantEventCard Event(bool duel)=>MutantRuntime.Model.Events.FirstOrDefault(e=>!e.Done&&e.Duel==duel&&MutantRuntime.Run.Catalog["tracks"].Items.First(t=>t["i"].N()==e.TrackIndex)["ty"].S()!="dp");
    private static DrivingInput Script(double t)=>t<4?new DrivingInput(1,0,0):t<6?new DrivingInput(0,1,0):t<10?new DrivingInput(1,0,.7,false,false,t<7):t<14?new DrivingInput(1,0,0):t<16?new DrivingInput(1,0,1,false,false,t<14.5):t<18?new DrivingInput(1,0,-.6):new DrivingInput(1,0,0);
    private static void SampleNow(string phase)
    {
      var p=P;var b=p.Simulation.Body;var q=p.Simulation.ReferencePoint;var v=b.Velocity;var f=b.Orientation.Rotate(new BodyVector(0,0,1));double heading=Math.Atan2(f.X,f.Z);var i=p.CurrentInput;var c=Camera.main;var n=MutantRuntime.Abilities.Nitro();proof.samples.Add(new Sample{phase=phase,panel=MutantRuntime.Panel,track=p.RaceTrack,car=MutantRuntime.Model.CarName,time=simTime,x=q.X,y=q.Y,z=q.Z,speed=JsMath.Hypot(v.X,v.Z),heading=heading,beta=TrackGeometry.AngleDelta(Math.Atan2(v.X,v.Z)-heading),steering=i.Steering,throttle=i.Throttle,brake=i.Brake,handbrake=i.Handbrake,body=MutantRuntime.Model.Body,energy=n.Energy,nitro=n.Open,airborne=b.Airborne,driftActive=RaceDrift.Detect(b,p.Simulation.Assist.On).Active,raceTime=p.Race?.Session.Time??0,drift=p.Race?.Session.Drift.Score??0,skill=string.Join(",",MutantRuntime.Abilities.Skills().Select(x=>x.Id+":"+x.Open+":"+x.Wait)),refusal=MutantRuntime.Abilities.Refusal.Reason,cameraX=c?c.transform.position.x:0,cameraY=c?c.transform.position.y:0,cameraZ=c?c.transform.position.z:0});
    }
    private static void BeginRace(bool entryFixture)
    {
      if(round<2){target=Event(round==1);if(target==null){proof.outcomes.Add("No matching event for round "+round);NextRound();return;}proof.outcomes.Add("Race entry round="+round+" id="+target.Id+" gate="+actualGate+" direct-entry-fixture="+entryFixture);MutantRuntime.StartRace(target.Id,0);}else{proof.outcomes.Add("Boss entry fixture: existing command, timer/result not injected");MutantRuntime.StartRace(-1,0,true);}mode=2;simSteps=0;simTime=0;nextShot=0;driver=null;
    }
    private static void NextRound(){round++;if(round<=2){if(MutantRuntime.Run.Finished)NewRun();else{mode=0;simSteps=0;simTime=0;nextShot=0;actualGate=false;}}else{NewRun();mode=5;}}
    private static void Advance()
    {
      if(mode==0){if(!WorldReady())return;P.ManualStepping=true;if(round==0){target=Event(false);mode=1;}else BeginRace(true);return;}
      if(mode==1)
      {
        if(MutantRuntime.Run.Finished){proof.outcomes.Add("World route ended by actual wreck at "+simTime);NewRun();mode=8;return;}
        if(MutantRuntime.Panel!=""){if(MutantRuntime.Panel=="event"&&MutantRuntime.MarkerId==target?.Id){actualGate=true;BeginRace(false);return;}proof.outcomes.Add("World marker encountered: "+MutantRuntime.Panel+" / "+MutantRuntime.MarkerId);if(MutantRuntime.Panel=="chest")MutantRuntime.Chest(false);else MutantRuntime.ClosePanel();}
        for(int k=0;k<6&&!MutantRuntime.Blocked;k++){
          var input=Script(simTime);if(simTime>=20&&target!=null){var b=P.Simulation.Body;var q=P.Simulation.ReferencePoint;var f=b.Orientation.Rotate(new BodyVector(0,0,1));double d=JsMath.Hypot(target.X-q.X,target.Z-q.Z),e=TrackGeometry.AngleDelta(Math.Atan2(target.X-q.X,target.Z-q.Z)-Math.Atan2(f.X,f.Z));double speed=JsMath.Hypot(b.Velocity.X,b.Velocity.Z),wanted=Math.Min(10,d*.45);input=new DrivingInput(speed<wanted?1:0,speed>wanted+1?1:0,Math.Max(-1,Math.Min(1,e*2)));}
          if(simSteps==120||simSteps==720)MutantRuntime.Abilities.PressNitro();P.StepWorld(input);simSteps++;simTime+=PowertrainVehicle.FixedDelta;if(simSteps%30==0)SampleNow("world");
        }
        if(simTime>=nextShot*20&&nextShot<6){Shot("world-"+nextShot,1280,720);nextShot++;return;}if(simTime>=120){proof.outcomes.Add("World approach timeout: no result injected, entry scope remains unverified");BeginRace(true);}return;
      }
      if(mode==8){if(WorldReady()){P.ManualStepping=true;BeginRace(true);}return;}
      if(mode==2)
      {
        if(!P||P.Race==null)return;P.ManualStepping=true;if(driver==null){Check(P.RaceTrack==MutantRuntime.RacePlan.Track.Key&&P.TrackVisuals.Built==MutantRuntime.RacePlan.Track.Key,"Gercek plan fizik gorsel pist kimligi ayni / "+round);driver=RaceTestDriver.For(P.Race.Event.Type);driver.Digital=true;proof.outcomes.Add("Physics race: "+P.RaceTrack+" type="+P.Race.Event.Type+" car="+MutantRuntime.Model.CarName+" opponent="+(P.Opponent!=null));}
        for(int k=0;k<6&&!MutantRuntime.Blocked&&P.Race.Session.State!=RaceState.Finished;k++){var r=P.Race;var input=r.Session.State==RaceState.Countdown?driver.Countdown(r):driver.Input(r);if(simSteps==300)MutantRuntime.Abilities.PressNitro();P.StepRace(input);simSteps++;simTime+=PowertrainVehicle.FixedDelta;if(simSteps%30==0)SampleNow("race-"+round);}
        if(simTime>=nextShot*30&&nextShot<12){Shot("race"+round+"-"+nextShot,1280,720);nextShot++;return;}
        if(P.Race.Session.State==RaceState.Finished||MutantRuntime.Run.Finished||simTime>=360){proof.outcomes.Add("Race outcome round="+round+" track="+P.RaceTrack+" state="+P.Race.Session.State+" physical-time="+P.Race.Session.Time+" sim-seconds="+simTime+" passed="+MutantRuntime.ResultPassed+" panel="+MutantRuntime.Panel+" body="+MutantRuntime.Model.Body+" teleports="+P.Race.Teleports+" opponent="+(P.Opponent!=null));Shot("result-"+round,1280,720);mode=3;waitTicks=0;}return;
      }
      if(mode==3){if(waitTicks++<20)return;if(MutantRuntime.Panel=="result"){MutantRuntime.Continue();mode=4;return;}NextRound();return;}
      if(mode==4){if(MutantRuntime.Panel=="choice"){proof.outcomes.Add("Actual earned level choice: "+MutantRuntime.Model.Choices.First().Id);MutantRuntime.Choose(MutantRuntime.Model.Choices.First().Id);return;}if(WorldReady()){P.ManualStepping=true;proof.outcomes.Add("Actual result/choice returned to world");Shot("return-"+round,1280,720);mode=11;waitTicks=0;}return;}
      if(mode==11){if(waitTicks++>5)NextRound();return;}
      if(mode==5)
      {
        if(!WorldReady())return;P.ManualStepping=true;var r=MutantRuntime.Run;r.State.Set("para",CatalogNode.Num(20));r.State.Set("govde",CatalogNode.Num(70));typeof(MutantRuntime).GetProperty(nameof(MutantRuntime.Panel)).SetValue(null,"shop");mode=15;proof.outcomes.Add("Explicit workshop fixture: 70 body / 20 cash, existing UI commands only");return;
      }
      if(mode==15){if(!MutantWorkshopView.Instance.Visible)return;Shot("partial-repair",1280,720);mode=16;return;}
      if(mode==16){MutantWorkshopView.Instance.Repair();Check(MutantRuntime.Model.Body==76&&MutantRuntime.Model.Money==2,"Atolye UI kismi tamir 6 govde 18 para");MutantRuntime.Run.State.Set("para",CatalogNode.Num(72));mode=17;waitTicks=0;return;}
      if(mode==17){if(waitTicks++<5)return;Shot("full-repair",1280,720);mode=18;return;}
      if(mode==18){MutantWorkshopView.Instance.Repair();Check(MutantRuntime.Model.Body==100&&MutantRuntime.Model.Money==0,"Atolye UI tam tamir 24 govde 72 para");var r=MutantRuntime.Run;var part=r.Catalog["parts"].Items.First(x=>x["kat"].S()=="motor"&&x["sv"].N()==1);motorId=part["id"].S();r.State.Set("para",CatalogNode.Num(500));r.State.Set("stok",CatalogNode.Arr(new[]{CatalogNode.Str(motorId)}));mode=19;waitTicks=0;return;}
      if(mode==19){if(waitTicks++<5)return;MutantWorkshopView.Instance.Purchase(motorId,MutantWorkshopView.Instance.StockStamp);Check(MutantRuntime.Session.BuildSetup().Parts.Contains(motorId),"Fixture motor mevcut UI Buy ile uygulanir");proof.outcomes.Add("Explicit setup fixture: 500 cash and stock motor "+motorId+"; UI Buy, unchanged normal physics inputs");mode=20;waitTicks=0;return;}
      if(mode==20){if(waitTicks++<2)return;MutantWorkshopView.Instance.Back();mode=6;return;}
      if(mode==6)
      {
        if(MutantRuntime.Blocked){proof.outcomes.Add("Setup drive stopped: "+MutantRuntime.Panel);mode=7;return;}
        for(int k=0;k<6&&!MutantRuntime.Blocked;k++){if(simSteps==120)MutantRuntime.Abilities.PressNitro();P.StepWorld(Script(simTime));simSteps++;simTime+=PowertrainVehicle.FixedDelta;if(simSteps%30==0)SampleNow("motor-fixture");}
        if(simTime>=nextShot*5&&nextShot<3){Shot("motor-"+nextShot,1280,720);nextShot++;return;}
        if(simTime>=20){var r=MutantRuntime.Run;r.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"flying-dutchman\",\"seviye\":1,\"evrim\":null,\"eklentiler\":[]},{\"id\":\"grappling-hook\",\"seviye\":1,\"evrim\":null,\"eklentiler\":[]},{\"id\":\"volt-kanat\",\"seviye\":1,\"evrim\":null,\"eklentiler\":[]}]"));r.State.Set("bec",MutantSkills.Initialize());r.State["mek"].Set("enerji",CatalogNode.Num(100));proof.outcomes.Add("Explicit skill fixture: three existing level1 skills and 100 energy; no successful effect assumed");MutantRuntime.StartRace(Event(false).Id,0);mode=14;simSteps=0;simTime=0;nextShot=0;}return;
      }
      if(mode==14){if(!P||P.Race==null)return;P.ManualStepping=true;driver=RaceTestDriver.For(P.Race.Event.Type);driver.Digital=true;proof.outcomes.Add("Explicit skill race entry fixture: real existing track/physics, no finish claim");mode=9;return;}
      if(mode==9)
      {
        if(MutantRuntime.Blocked){proof.outcomes.Add("Skill drive stopped: "+MutantRuntime.Panel);mode=7;return;}
        for(int k=0;k<6&&!MutantRuntime.Blocked;k++){if(simSteps==240||simSteps==360)MutantRuntime.Abilities.PressSkill(1);if(simSteps==540)MutantRuntime.Abilities.PressSkill(2);if(simSteps==900)MutantRuntime.Abilities.PressSkill(0);if(P.Simulation.Body.Airborne&&simSteps%15==0)MutantRuntime.Abilities.AirDrag(4,2);P.StepRace(P.Race.Session.State==RaceState.Countdown?driver.Countdown(P.Race):driver.Input(P.Race));simSteps++;simTime+=PowertrainVehicle.FixedDelta;if(simSteps%30==0)SampleNow("skills-fixture");}
        if(simTime>=nextShot*4&&nextShot<5){Shot("skill-"+nextShot,1280,720);nextShot++;return;}if(simTime>=20){NewRun();mode=12;}return;
      }
      if(mode==12){if(!WorldReady())return;P.ManualStepping=false;keyboard=InputSystem.AddDevice<Keyboard>();realBegan=EditorApplication.timeSinceStartup;realResumeAfter=realBegan+2;simTime=0;simSteps=0;nextShot=0;mode=13;proof.outcomes.Add("Realtime window: normal Keyboard InputSystem and rendering, no manual physics steps");return;}
      if(mode==13){simTime=EditorApplication.timeSinceStartup-realBegan;var keys=new List<Key>();if(simTime<4||simTime>=6)keys.Add(Key.W);else keys.Add(Key.S);if(simTime>=9&&simTime<11)keys.Add(Key.D);if(simTime>=14&&simTime<14.6)keys.Add(Key.Space);if(simTime>=2&&!realNitro){keys.Add(Key.N);realNitro=true;}InputSystem.QueueStateEvent(keyboard,new KeyboardState(keys.ToArray()));if(simTime>2&&EditorApplication.timeSinceStartup>realResumeAfter&&Time.unscaledDeltaTime>0)proof.realtimeFrameMs.Add(Time.unscaledDeltaTime*1000);if(simTime>=simSteps*.5){SampleNow("realtime-keyboard");simSteps++;}if(simTime>=nextShot*5&&nextShot<4){Shot("realtime-"+nextShot,1280,720);nextShot++;return;}if(simTime>=20){InputSystem.QueueStateEvent(keyboard,new KeyboardState());mode=7;}return;}
      if(mode==7){if(MutantRuntime.Active)MutantRuntime.Exit();Check(career==GarageSession.State.Snapshot().ToString()&&profile==GarageRace.ProfileStore().Load().Snapshot().ToString(),"Gameplay kariyer profil ayni");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"Gameplay kalici oyuncu dosyalari ayni");Finish(null);}
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
      string path=Path.Combine(Project,"Logs/b-gameplay-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      ValidateShot();
      proof.images.Add(Path.GetFileName(path));shot=null;Time.timeScale=1;realResumeAfter=EditorApplication.timeSinceStartup+.25;
    }
    private static void ValidateShot(){proof.checks.Add("Game View sequence / "+shot);}
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>720)throw new TimeoutException("Gameplay 720s: "+Status());if(EditorApplication.timeSinceStartup-at<.025)return;at=EditorApplication.timeSinceStartup;if(!initialized){if(!UiRoot.Instance)return;Setup();return;}if(shot!=null){Capture();return;}if(P&&P.Simulation!=null&&!MutantRuntime.Blocked&&Time.unscaledDeltaTime>0&&mode!=0&&mode!=5)proof.frameMs.Add(Time.unscaledDeltaTime*1000);Advance();if(simSteps%60<6)File.WriteAllText(Path.Combine(Project,"Logs/b-gameplay-progress.txt"),"mode="+mode+" round="+round+" sim="+simTime+" samples="+proof.samples.Count+" "+Status());}catch(Exception e){Finish(e);}
    }
    private static string Status()=>"index="+index+" steps="+steps.Count+" pause="+GameFlow.Paused+" editorPause="+EditorApplication.isPaused+" scale="+Time.timeScale+" scene="+UnityEngine.SceneManagement.SceneManager.GetActiveScene().name+" panel="+MutantRuntime.Panel+" phase="+(MutantRuntime.Run?.State["faz"].S()??"null")+" root="+(UiRoot.Instance!=null)+" hud="+(MutantHudView.Instance!=null)+" visible="+(MutantHudView.Instance?.Visible??false)+" settings="+SettingsScreen.Open+" sim="+(P?.Simulation!=null)+" race="+(P?.Race!=null)+" touch="+(Touchscreen.current!=null);
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.environment=Application.unityVersion+" | "+Application.platform+" | "+Application.productName+" | GameView";proof.result=e==null?"b-gameplay-observed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/b-gameplay-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Mutant F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
