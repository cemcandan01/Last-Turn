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
  // Kanca pilotu: izole üründe gerçek komutlar ve Game View; fiziksel/insan kabulü değildir.
  [InitializeOnLoad]
  public static class MutantClosurePlayValidation
  {
    private const string Active="LastTurn.BClosure.Active",PathKey="LastTurn.BClosure.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Row{public string phase,state,kind,reason,blocker,target,cornerReason;public long step;public double vy,hookHeight,rope,pullY;public double time,x,y,z,heading,speed,wait,charges,ax,az,opAx,opAz,appliedX,appliedZ,flightX,flightZ,grip,turn,radius,requestedSide;public bool open,ready;public MutantHookCandidate[] candidates;}
    [Serializable]private sealed class Proof{public string result,error,utc,environment;public uint seed;public List<string> checks=new(),images=new(),runtimeErrors=new(),editorDiagnostics=new();public Source[] sources;public List<Row> samples=new(),attempts=new();public List<string> outcomes=new();}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career,profile,initial;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantClosurePlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      // Kopyalanmış Editor oturumundan başka kabul sürücüsü etkin kalamaz.
      foreach(var type in typeof(MutantClosurePlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
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
      string backup=Path.Combine(Project,"Logs/ClosureSceneBackup/"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(backup);
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
    {if(type!=LogType.Error&&type!=LogType.Exception&&type!=LogType.Assert)return;if(!stack.Contains("LastTurn.")&&(stack.Contains("UnityEditor.Search.")||message.StartsWith("[Package Manager Window]",StringComparison.Ordinal)))proof.editorDiagnostics.Add(message);else proof.runtimeErrors.Add(message+"\n"+stack);}
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
    private static bool initialized,pulse,firstRelease,secondRelease,armAfterShots,firstAim,secondAim,cooldownSeen,noneSeen;private static int mode,simSteps,links,releases;private static long seenAttempt,linkedAt,naturalStep;private static double beganNatural,lastSample;private static string pendingPhase="",firstKind="",secondKind="";private static readonly Queue<(string,int,int)> shots=new();
    private static MutantSkillHud Hook=>MutantRuntime.Abilities.Skills().First(s=>s.Id=="grappling-hook");
    private static void Setup()
    {
      initialized=true;GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=PlayerFiles();keyboard=InputSystem.AddDevice<Keyboard>();proof.seed=53;MutantRuntime.Start(53);timerStart=MutantRuntime.Run.State["kalan"].N();runStart=MutantRuntime.Run.State["zaman"].N();MutantRuntime.RecordDirectory=Path.Combine(Project,"Logs/ClosureRecords/"+Guid.NewGuid().ToString("N"));MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);Size(1280,720);
    }
    private static Row ReadRow(string phase,MutantHookAttempt attempt=null)
    {
      var h=Hook;var q=attempt?.Query??h.Hook;var b=P.Simulation.Body;var p=P.Simulation.ReferencePoint;var a=MutantRuntime.Run.State["becCikti"]["oyuncuIvme"];var op=MutantRuntime.Abilities.OpponentAcceleration;
      return new Row{vy=b.Velocity.Y,hookHeight=MutantRuntime.Run.State["bec"]["yerel"]["grappling-hook"]["deger"].N(),rope=MutantRuntime.Run.State["bec"]["yerel"]["grappling-hook"]["sayac"].N(),pullY=MutantRuntime.Run.State["becCikti"]["ucus"]["y"].N(),phase=phase,step=attempt?.Step??(long)MutantRuntime.Run.State["bec"]["adim"].N(),time=P.Race?.Session.Time??P.Simulation.Body.Steps/60d,x=attempt?.X??p.X,y=attempt?.Y??p.Y,z=attempt?.Z??p.Z,heading=attempt?.Heading??Math.Atan2(b.Orientation.Rotate(new BodyVector(0,0,1)).X,b.Orientation.Rotate(new BodyVector(0,0,1)).Z),speed=JsMath.Hypot(b.Velocity.X,b.Velocity.Z),state=MutantSkillSlot.Read(h).Text,kind=q?.Kind??"",reason=q?.Reason??"",blocker=attempt?.Blocker??h.Blocker,target=h.Target?.S()??q?.Id??"",open=attempt?.Linked??h.Open,ready=h.Ready,wait=h.Wait,charges=h.Charges,ax=a["x"].N(),az=a["z"].N(),opAx=op?.X??0,opAz=op?.Z??0,appliedX=P.Simulation.SkillInput?.X??0,appliedZ=P.Simulation.SkillInput?.Z??0,flightX=MutantRuntime.Run.State["becCikti"]["ucus"]["x"].N(),flightZ=MutantRuntime.Run.State["becCikti"]["ucus"]["z"].N(),grip=MutantRuntime.Run.State["becCikti"]["tutus"].N(),candidates=q?.Candidates.ToArray()??Array.Empty<MutantHookCandidate>(),turn=q?.Corner?.Turn??0,radius=q?.Corner?.Radius??0,requestedSide=q?.Corner?.RequestedSide??0,cornerReason=q?.Corner?.Reason??""};
    }
    private static void Pair(string name){Time.timeScale=0;shots.Enqueue((name,1280,720));shots.Enqueue((name,1920,1080));}
    private static DrivingInput Script(double t)=>t<4?new DrivingInput(1,0,0):t<6?new DrivingInput(0,1,0):t<10?new DrivingInput(1,0,.7,false,false,t<7):t<14?new DrivingInput(1,0,0):t<16?new DrivingInput(1,0,1,false,false,t<14.5):t<18?new DrivingInput(1,0,-.6):new DrivingInput(1,0,0);
    private static void ObserveAttempt()
    {
      var a=MutantRuntime.Abilities.LastHookAttempt;if(a==null||a.Sequence==seenAttempt)return;seenAttempt=a.Sequence;var row=ReadRow(pendingPhase,a);proof.attempts.Add(row);
      if(mode==2){Check(!a.Linked&&a.Blocker=="hedef","Eski istek gercek hedef reddi / "+pendingPhase);return;}
      if(a.Linked){links++;linkedAt=P.Simulation.Body.Steps;proof.outcomes.Add("Gercek baglanma / "+a.Query.Kind+" / fizik adimi "+a.Step);if(links==1){firstKind=a.Query.Kind;Pair("bound-first");}else{secondKind=a.Query.Kind;Pair("bound-reuse");}}
      else if(row.phase=="release-first"||row.phase=="release-second"){releases++;proof.outcomes.Add("Gercek tekrar tusu birakma / "+releases);Pair(releases==1?"cooldown":"cooldown-reuse");}
    }
    private static void Keys(DrivingInput input,bool press)
    {
      var keys=new List<Key>();if(input.Throttle>=.5)keys.Add(Key.W);if(input.Brake>=.5)keys.Add(Key.S);if(input.Steering>.33)keys.Add(Key.D);if(input.Steering<-.33)keys.Add(Key.A);if(input.Handbrake)keys.Add(Key.Space);if(press)keys.Add(Key.Digit1);if(P&&P.Simulation.Body.Steps<voltUntil)keys.Add(Key.Digit2);InputSystem.QueueStateEvent(keyboard,new KeyboardState(keys.ToArray()));
    }
    private static RaceTestDriver driver;
    private static long voltUntil;private static double timerStart,runStart;private static long cityStep;private static int flightCount,forceSteps,landSteps;private static bool force1,force2,landed,launched;
    private static void FlightKey(Key key){if(key==Key.Digit2)voltUntil=P.Simulation.Body.Steps+120;Keys(default,key==Key.Digit1);pulse=true;}
    private static void NewCity()
    {
      MutantRuntime.Exit();MutantRuntime.Start(53);MutantRuntime.RecordDirectory=Path.Combine(Project,"Logs/ClosureRecords");
      MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Run.State.Set("bolge",CatalogNode.Num(2));
      MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);mode=2;
    }
    private static void Advance()
    {
      if(mode==0){if(!WorldReady())return;P.ManualStepping=true;Check(timerStart==MutantRun.FirstBossSeconds,"Dogal baslangic 900 saniye kisaltilmadi");mode=1;return;}
      if(mode==1){
        for(int k=0;k<240;k++){
          if(MutantRuntime.Panel!=""&&MutantRuntime.Panel!="boss"){proof.outcomes.Add("Panel kapatma / "+MutantRuntime.Panel);MutantRuntime.ClosePanel();}
          if(MutantRuntime.Panel=="boss")break;
          P.StepWorld(new DrivingInput(0,1,0));simSteps++;
        }
        if(MutantRuntime.Panel!="boss")return;
        Check(MutantRuntime.Run.State["kalan"].N()==0,"Dogal sayac sifir boss paneli");
        double elapsed=MutantRuntime.Run.State["zaman"].N()-runStart;
        Check(Math.Abs(elapsed-timerStart)<.04,"900 saniye gercek sabit adim gecisi");
        proof.outcomes.Add("Natural timer / initial="+timerStart+" elapsed="+elapsed+" physics steps="+simSteps+"; no remaining-time write, accelerated manual fixed steps, not 900 wall seconds");
        Pair("natural-boss");mode=10;return;
      }
      if(mode==10){NewCity();return;}
      if(mode==2){
        if(!WorldReady())return;P.ManualStepping=false;Check(P.OpenTerrain.Region.Key=="city","Uretim sehir dunyasi");
        var r=MutantRuntime.Run;r.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"grappling-hook\",\"seviye\":1,\"evrim\":null,\"eklentiler\":[]},{\"id\":\"volt-kanat\",\"seviye\":1,\"evrim\":null,\"eklentiler\":[]}]"));r.State.Set("bec",MutantSkills.Initialize());r.State["mek"].Set("enerji",CatalogNode.Num(100));
        proof.outcomes.Add("City fixture: region2, default production spawn, stock car, lv1 Hook/Volt; no target/position/linked-state/force injected");
        cityStep=P.Simulation.Body.Steps;mode=3;return;
      }
      if(mode!=3)return;
      if(MutantRuntime.Panel!=""){proof.outcomes.Add("City panel close / "+MutantRuntime.Panel);MutantRuntime.ClosePanel();}
      if(MutantRuntime.Run.Finished)throw new Exception("City run ended");
      var h=Hook;var q=h.Hook;var body=P.Simulation.Body;long age=body.Steps-cityStep;
      if(EditorApplication.timeSinceStartup-lastSample>.1){lastSample=EditorApplication.timeSinceStartup;proof.samples.Add(ReadRow("realtime-city"));}
      var attempt=MutantRuntime.Abilities.LastHookAttempt;
      if(attempt!=null&&attempt.Sequence!=seenAttempt){seenAttempt=attempt.Sequence;proof.attempts.Add(ReadRow(pendingPhase,attempt));if(attempt.Linked){Check(attempt.Query.Kind=="gok","Gercek bina secildi");links++;linkedAt=body.Steps;forceSteps=0;Pair(links==1?"bound-first":"bound-reuse");}else if(pendingPhase.StartsWith("release")){releases++;Pair(releases==1?"cooldown":"cooldown-reuse");}}
      var u=MutantRuntime.Run.State["becCikti"]["ucus"];
      if(h.Open&&(Math.Abs(u["x"].N())+Math.Abs(u["z"].N()))>1e-6){forceSteps++;if(links==1)force1=true;else force2=true;}
      if(releases>=2&&!body.Airborne){landSteps++;if(landSteps>10)landed=true;}else landSteps=0;
      if(shots.Count>0){Keys(default,false);return;}
      if(pulse){pulse=false;Keys(default,false);return;}
      if(links>=2&&releases>=2&&landed){Check(force1&&force2,"Iki gercek sarkac fizik ciktisi");Check(landed,"Ucustan gercek yere temas");FinishSuccess();return;}
      if(h.Open&&body.Steps-linkedAt>=24&&forceSteps>=6){pendingPhase=links==1?"release-first":"release-second";FlightKey(Key.Digit1);return;}
      if(!h.Open&&h.Ready&&q?.Kind=="gok"&&(links==0||body.Velocity.Y>0)){
        if(!launched){pendingPhase=links==0?"bind-first":"bind-reuse";Pair(links==0?"target-building":"target-reuse");launched=true;return;}
        launched=false;pendingPhase=links==0?"bind-first":"bind-reuse";FlightKey(Key.Digit1);return;
      }
      var volt=MutantRuntime.Abilities.Skills().First(x=>x.Id=="volt-kanat");
      if(!h.Open&&h.Charges>0&&volt.Ready&&age>120&&flightCount<=links){flightCount++;FlightKey(Key.Digit2);return;}
      // Standard road approach; after launch coast, no orientation/velocity writes.
      Keys(new DrivingInput(0,1,0),false);
      if(age>3600)throw new TimeoutException("City hook links="+links+" releases="+releases+" kind="+q?.Kind+" y="+body.Position.Y+" charges="+h.Charges);
    }
    private static void FinishSuccess(){MutantRuntime.Exit();Check(career==GarageSession.State.Snapshot().ToString()&&profile==GarageRace.ProfileStore().Load().Snapshot().ToString(),"Kariyer profil ayni");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"Kalici kayit hashleri ayni");Finish(null);}
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
      string path=Path.Combine(Project,"Logs/b-closure-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      ValidateShot();
      proof.images.Add(Path.GetFileName(path));shot=null;Time.timeScale=shots.Count>0?0:1;
    }
    private static void ValidateShot()
    {
      if(shot=="natural-boss"){Check(MutantRuntime.Panel=="boss","Dogal boss panel gorunumu / "+shotW);return;}
      var slot=UiRoot.Instance.Hud.Q("mh-slot-0");var h=Hook;var model=MutantRuntime.HudModel(P.Simulation.ReferencePoint.X,P.Simulation.ReferencePoint.Z).Slots.First(x=>x.Id=="grappling-hook");Check(slot.Q<Label>("mh-state").text==model.Text,"HUD gercek durum / "+shot+shotW);Check(slot.Q<Label>("mh-detail").text==model.Detail,"HUD hak ve hedef / "+shot+shotW);var label=slot.Q<Label>("mh-state");Check(label.worldBound.xMin>=0&&label.worldBound.xMax<=UiRoot.Instance.Root.worldBound.xMax&&label.worldBound.yMax<=UiRoot.Instance.Root.worldBound.yMax,"HUD ekranda / "+shot+shotW);proof.samples.Add(ReadRow("shot-"+shot+shotW));
      if(shot.StartsWith("bound"))Check(h.Open&&h.Target?.S()=="#bina"&&model.State=="on","Bina bagli gorunum / "+shot+shotW);
      if(shot.StartsWith("target"))Check(h.Ready&&h.Hook?.Kind=="gok","Bina gercek uygun hedef / "+shot+shotW);

    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>240)throw new TimeoutException("Closure 240s "+Status());if(EditorApplication.timeSinceStartup-at<.025)return;at=EditorApplication.timeSinceStartup;if(!initialized){if(!UiRoot.Instance)return;Setup();return;}if(shot!=null){Capture();return;}if(shots.Count>0){var q=shots.Dequeue();Shot(q.Item1,q.Item2,q.Item3);return;}Advance();File.WriteAllText(Path.Combine(Project,"Logs/b-closure-progress.txt"),"mode="+mode+" step="+simSteps+" links="+links+" releases="+releases+" "+Status());}catch(Exception e){Finish(e);}
    }
    private static string Status()=>"index="+index+" steps="+steps.Count+" pause="+GameFlow.Paused+" editorPause="+EditorApplication.isPaused+" scale="+Time.timeScale+" scene="+UnityEngine.SceneManagement.SceneManager.GetActiveScene().name+" panel="+MutantRuntime.Panel+" phase="+(MutantRuntime.Run?.State["faz"].S()??"null")+" root="+(UiRoot.Instance!=null)+" hud="+(MutantHudView.Instance!=null)+" visible="+(MutantHudView.Instance?.Visible??false)+" settings="+SettingsScreen.Open+" sim="+(P?.Simulation!=null)+" race="+(P?.Race!=null)+" touch="+(Touchscreen.current!=null);
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.environment=Application.unityVersion+" | "+Application.platform+" | "+Application.productName+" | GameView";proof.result=e==null?"b-closure-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/b-closure-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Mutant F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
