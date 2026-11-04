using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Security.Cryptography;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEditor;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using PlayerSettings = LastTurn.Core.PlayerSettings;

namespace LastTurn.EditorValidation
{
  // P5 kontrol kabulü: Input System sanal klavye/dokunmatik ekran/yerçekimi sensörü olayları gerçek kare döngüsünde okunur.
  // Bu Editor simülasyonudur; gerçek telefon dokunma ve sensör doğrulaması değildir.
  [InitializeOnLoad]
  public static class ControlsPlayValidation
  {
    private const string Active="LastTurn.P5C.Active",PathKey="LastTurn.P5C.Path";
    [Serializable]private sealed class Source{public string path,sha256;}
    [Serializable]private sealed class Proof
    {
      public string result,error,utc,unityVersion,screen,missingAudio;public bool batch;public int frames;
      public List<string> checks=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();
      public Source[] sources,userFiles;public string[] userRoots;
    }
    private static Proof proof;private static double began;private static string career,profile,dir;private static GtPrototype p;
    private static Keyboard kb;private static Touchscreen ts;private static GravitySensor gs;
    private static readonly Queue<(int Wait,Action Act)> steps=new Queue<(int,Action)>();private static int wait,phase,lastFrame;private static bool focusLost;private static long pressSteps;private static string panels="";private static float waitUntil;private static InputSettings.BackgroundBehavior background;private static InputSettings.EditorInputBehaviorInPlayMode editorBehavior;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    private static string TestPath=>SessionState.GetString(PathKey,"");
    static ControlsPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    [MenuItem("Last Turn/P5 Kontroller Kısa Play Doğrulaması")]
    public static void Start()
    {
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play'i durdurun.");
      GarageSceneBuilder.Open();string[] roots={Path.Combine(Application.persistentDataPath,"LastTurnGarage"),Path.Combine(Application.persistentDataPath,"LastTurnMutant"),Path.Combine(Application.persistentDataPath,"LastTurnSettings")};
      proof=new Proof{userRoots=roots,userFiles=Files(roots).Select(f=>new Source{path=f,sha256=Hash(f)}).ToArray()};
      string test=Path.Combine(Project,"Logs/P5Controls/"+Guid.NewGuid().ToString("N")+"/garage.json");SessionState.SetString(PathKey,test);Directory.CreateDirectory(Path.Combine(Project,"Logs"));
      File.WriteAllText(Path.Combine(Project,"Logs/p5-controls-running.json"),JsonUtility.ToJson(proof));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    public static void StartBatch(){if(!Application.isBatchMode)throw new InvalidOperationException("Ayrı batch Editor gerekir.");Start();}
    private static string[] Files(string[] roots)=>roots.Where(Directory.Exists).SelectMany(r=>Directory.GetFiles(r,"*",SearchOption.AllDirectories)).OrderBy(f=>f,StringComparer.Ordinal).ToArray();
    private static void Changed(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){
        proof=JsonUtility.FromJson<Proof>(File.ReadAllText(Path.Combine(Project,"Logs/p5-controls-running.json")));phase=0;steps.Clear();wait=0;focusLost=false;began=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;
      }
      if(state==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;SessionState.SetBool(Active,false);}
    }
    private static void Logged(string message,string stack,LogType type)
    {
      if(type!=LogType.Error&&type!=LogType.Exception&&type!=LogType.Assert)return;string detail=message+"\n"+stack;
      if(stack.Contains("LastTurn.")||!stack.Contains("UnityEditor.Search."))proof.runtimeErrors.Add(detail);else proof.editorDiagnostics.Add(detail);
    }
    private static void Check(bool ok,string name){if(!ok)throw new InvalidOperationException(name);proof.checks.Add(name);}
    private static void Preserved()
    {
      Check(GarageSession.State.Snapshot().ToString()==career&&GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Kariyer bakiyesi ilerlemesi ve profili değiştirmedi");
      var current=Files(proof.userRoots);Check(current.SequenceEqual(proof.userFiles.Select(f=>f.path))&&proof.userFiles.All(f=>File.Exists(f.path)&&Hash(f.path)==f.sha256),"Mevcut kariyer, Mutant ve ayar dosyaları aynı hash'te");
    }
    private static void Keys(params Key[] keys)=>InputSystem.QueueStateEvent(kb,new KeyboardState(keys));
    private static Vector2 At(string kind,int slot=0,float fx=.5f,float fy=.5f)
    {
      var o=p.GetComponent<TouchDrivingOverlay>();var r=o.ControlRect(kind,slot)??throw new InvalidOperationException("Dokunmatik kontrol yok: "+kind);
      return new Vector2(r.x+r.width*fx,Screen.height-(r.y+r.height*fy));
    }
    private static void Touch(int id,UnityEngine.InputSystem.TouchPhase phase,Vector2 at)=>InputSystem.QueueStateEvent(ts,new TouchState{touchId=id,phase=phase,position=at,pressure=1});
    private static void Gravity(Vector3 g)=>InputSystem.QueueDeltaStateEvent(gs.gravity,g);
    private static void Prefs(Action<PlayerSettings> change){change(PlayerPreferences.Current);PlayerPreferences.Save();p.ResetInput();}
    private static DrivingInput I=>p.CurrentInput;
    private static void Add(int frames,Action act)=>steps.Enqueue((frames,act));
    private static void Plan()
    {
      Add(3,()=>{Check(File.Exists(Path.Combine(dir,"ayarlar.json"))==false&&PlayerPreferences.Current.Steer=="btn"&&PlayerPreferences.Current.Gas=="btn","Yeni ayar dizininde TS varsayılan kontrolleri");Keys(Key.W);});
      Add(20,()=>{Check(I.Throttle==1&&!I.AnalogThrottle&&I.Brake==0,"Klavye W: tam dijital gaz (TS tuş gazı)"+(I.Throttle==1?"":" [teşhis w="+kb.wKey.isPressed+" focus="+Application.isFocused+" G="+p.Controls.G+" steps="+p.Simulation.Body.Steps+" panel="+MutantRuntime.Panel+" paused="+GameFlow.Paused+" manual="+p.ManualStepping+"]"));Keys(Key.UpArrow,Key.LeftArrow);});
      Add(6,()=>{Check(I.Throttle==1&&I.Steering==1&&!I.AnalogSteering,"Ok tuşları: gaz ve sola tam direksiyon (+ sol)");Keys(Key.C);});
      Add(4,()=>{Check(I.Handbrake&&I.Throttle==0,"C tuşu el freni (TS boşluk/C)");Keys(Key.Space,Key.D);});
      Add(4,()=>{Check(I.Handbrake&&I.Steering==-1,"Boşluk el freni + D sağ direksiyon");Keys();Prefs(s=>s.Set["inv"]=1);Keys(Key.A);});
      Add(4,()=>{Check(I.Steering==-1,"Ters direksiyon tercihi tuş yönünü çevirdi");Keys();Prefs(s=>{s.Set["inv"]=0;s.Gas="auto";});});
      Add(6,()=>{Check(I.Throttle==1&&I.Brake==0,"Otomatik gaz: tuşsuz tam gaz");Keys(Key.S);});
      Add(4,()=>{Check(I.Throttle==0&&I.Brake==1,"Otomatik gazda fren gazı keser");Keys();Prefs(s=>s.Gas="btn");});
      Add(3,()=>{Check(p.GetComponent<TouchDrivingOverlay>().ControlRect("Gas")!=null&&p.GetComponent<TouchDrivingOverlay>().ControlRect("Pedal")==null,"Gaz tuşu kipinde GAZ/FREN düğmeleri");Touch(1,UnityEngine.InputSystem.TouchPhase.Began,At("Gas"));});
      Add(4,()=>{Check(I.Throttle==1,"Dokunmatik GAZ tuşu tam gaz");Touch(2,UnityEngine.InputSystem.TouchPhase.Began,At("Left"));});
      Add(4,()=>{Check(I.Throttle==1&&I.Steering==1,"İki parmak: gaz + SOL aynı anda");Touch(1,UnityEngine.InputSystem.TouchPhase.Moved,At("Brake"));});
      Add(4,()=>{Check(I.Throttle==1&&I.Brake==0,"Parmak düğmeden kayınca bağlı kontrol değişmez (pointer capture)");Touch(1,UnityEngine.InputSystem.TouchPhase.Ended,At("Brake"));Touch(2,UnityEngine.InputSystem.TouchPhase.Ended,At("Left"));});
      Add(4,()=>{Check(I.Throttle==0&&I.Steering==0,"Parmaklar kalkınca girişler bırakıldı");Touch(3,UnityEngine.InputSystem.TouchPhase.Began,At("Handbrake"));});
      Add(4,()=>{Check(I.Handbrake,"Dokunmatik EL FRENİ");Touch(3,UnityEngine.InputSystem.TouchPhase.Ended,At("Handbrake"));Prefs(s=>s.Steer="wheel");});
      Add(3,()=>{Touch(4,UnityEngine.InputSystem.TouchPhase.Began,At("Wheel",0,1f,.5f));});
      Add(3,()=>{Touch(4,UnityEngine.InputSystem.TouchPhase.Moved,At("Wheel",0,.5f,0f));});
      Add(4,()=>{Check(I.AnalogSteering&&Math.Abs(I.Steering-.7479)<.01,"Ekran direksiyonu: çeyrek tur sola ≈ 0,75 analog direksiyon");Touch(4,UnityEngine.InputSystem.TouchPhase.Ended,At("Wheel",0,.5f,0f));});
      Add(4,()=>{Check(I.Steering==0&&p.Controls.WheelAngle==0,"Direksiyon bırakınca ortalandı");Prefs(s=>s.Gas="analog");});
      Add(3,()=>{Check(p.GetComponent<TouchDrivingOverlay>().ControlRect("Gas")==null,"Analog kipte gaz tuşu yerine pedal");Touch(5,UnityEngine.InputSystem.TouchPhase.Began,At("Pedal",0,.5f,.02f));});
      Add(4,()=>{Check(I.AnalogThrottle&&I.Throttle==1&&I.Brake==0,"Analog pedal üstte tam gaz");Touch(5,UnityEngine.InputSystem.TouchPhase.Moved,At("Pedal",0,.5f,.75f));});
      Add(4,()=>{Check(I.Throttle==0&&Math.Abs(I.Brake-.512)<.02,"Analog pedal aşağı yarım fren");Touch(5,UnityEngine.InputSystem.TouchPhase.Ended,At("Pedal",0,.5f,.75f));Prefs(s=>{s.Gas="btn";s.Steer="tilt";});Gravity(new Vector3(.5f,0,-.866f));});
      Add(6,()=>{var c=p.Controls;double expected=c.TiltSteer(PlayerPreferences.Current,PlayerPreferences.Orientation);
        Check(I.AnalogSteering&&Math.Abs(I.Steering-expected)<1e-9&&Math.Abs(I.Steering)>.3,"Yerçekimi sensörü eğim direksiyonuna (TS tiltSteer) gitti");Touch(6,UnityEngine.InputSystem.TouchPhase.Began,At("Calibrate"));});
      Add(3,()=>{Touch(6,UnityEngine.InputSystem.TouchPhase.Ended,At("Calibrate"));});
      Add(4,()=>{Check(Math.Abs(I.Steering)<1e-9,"Ortala düğmesi mevcut eğimi sıfır yaptı");Prefs(s=>s.Steer="btn");
        var a=MutantRuntime.Abilities;MutantRuntime.Run.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"volt-kanat\",\"seviye\":1,\"eklentiler\":[],\"evrim\":null}]"));
        MutantRuntime.Run.State["mek"].Set("enerji",CatalogNode.Num(MutantRuntime.Run.State["mek"]["kapasite"].N()));Keys(Key.W);});
      Add(60,()=>{Touch(7,UnityEngine.InputSystem.TouchPhase.Began,At("Nitro"));});
      Add(4,()=>{Check(MutantRuntime.Abilities.Nitro().Open,"Dokunmatik NİTRO tuşu nitroyu açtı");Touch(7,UnityEngine.InputSystem.TouchPhase.Ended,At("Nitro"));pressSteps=p.Simulation.Body.Steps;Touch(8,UnityEngine.InputSystem.TouchPhase.Began,At("Skill",0));});
      Add(3,()=>{Check(MutantRuntime.Run.State["bec"]["yerel"]["volt-kanat"]["kalan"].N()>0&&MutantRuntime.Abilities.Held.Contains("volt-kanat"),"Dokunmatik skill yuvası basılı: Volt Kanat açık"+" [held="+string.Join(",",MutantRuntime.Abilities.Held)+" red="+MutantRuntime.Abilities.Refusal.Reason+"/"+MutantRuntime.Abilities.Refusal.Count+" engel="+MutantRuntime.Run.State["becEngel"]+" yerel="+MutantRuntime.Run.State["bec"]["yerel"]+" rect="+p.GetComponent<TouchDrivingOverlay>().ControlRect("Skill",0)+" faz="+MutantRuntime.Run.State["faz"].S()+" adım="+(p.Simulation.Body.Steps-pressSteps)+" mouse="+(Mouse.current!=null&&Mouse.current.leftButton.isPressed)+" blocked="+MutantRuntime.Blocked+" panel="+MutantRuntime.Panel+" dt="+Time.deltaTime+" ts="+Time.timeScale+" ayar="+SettingsScreen.Open+" paused="+GameFlow.Paused+" bitti="+MutantRuntime.Run.Finished+" govde="+MutantRuntime.Run.State["govde"].N()+" panels="+panels+"]");Touch(8,UnityEngine.InputSystem.TouchPhase.Ended,At("Skill",0));});
      Add(4,()=>{Check(MutantRuntime.Run.State["bec"]["yerel"]["volt-kanat"]["kalan"].N()<=0&&!MutantRuntime.Abilities.Held.Contains("volt-kanat"),"Parmak kalkınca Volt Kanat bırakıldı");Keys(Key.W,Key.Digit1);});
      Add(4,()=>{Check(MutantRuntime.Abilities.Held.Contains("volt-kanat"),"Klavye 1 skill yuvası basılı");Keys(Key.W);});
      Add(4,()=>{Check(!MutantRuntime.Abilities.Held.Contains("volt-kanat"),"Klavye 1 bırakıldı");Keys(Key.W,Key.A);});
      Add(4,()=>{Check(I.Throttle==1&&I.Steering==1,"Odak öncesi tuşlar basılı");focusLost=true;p.SendMessage("OnApplicationFocus",false);});
      Add(3,()=>{Check(p.Controls.G==0&&p.Controls.L==0,"Odak kaybında ham girişler sıfırlandı (TS girdiSifirla)");focusLost=false;p.SendMessage("OnApplicationFocus",true);Keys();});
      int cam=0;Add(3,()=>{cam=PlayerPreferences.Current.Camera;Touch(9,UnityEngine.InputSystem.TouchPhase.Began,At("Camera"));});
      Add(3,()=>{Touch(9,UnityEngine.InputSystem.TouchPhase.Ended,At("Camera"));});
      Add(3,()=>{Check(PlayerPreferences.Current.Camera==(cam+1)%4,"KAMERA düğmesi kipi değiştirdi");Prefs(s=>{s.Camera=3;s.Set["fov"]=0;});});
      Add(240,()=>{var f=UnityEngine.Object.FindFirstObjectByType<GtFollowCamera>();var v=f.GetComponent<Camera>();
        Check(f.Mode==3&&Math.Abs(v.nearClipPlane-.15f)<1e-4&&Math.Abs(f.TargetFov-(Screen.width<Screen.height?64:54)-(MutantRuntime.Abilities.Nitro().Open?9:0))<.01f,"Kokpit kipi: araç içi kırpma 0,15 ve TS kokpit görüş açısı ("+f.TargetFov.ToString("0.0")+")");Prefs(s=>s.Camera=2);});
      Add(240,()=>{var f=UnityEngine.Object.FindFirstObjectByType<GtFollowCamera>();var v=f.GetComponent<Camera>();
        Check(Math.Abs(f.TargetFov-(Screen.width<Screen.height?84:68)-(MutantRuntime.Abilities.Nitro().Open?9:0))<.01f&&Math.Abs(v.nearClipPlane-.15f)<1e-4,"Kaput kipi: taban görüş +6 ("+f.TargetFov.ToString("0.0")+")");Prefs(s=>{s.Camera=1;s.Set["fov"]=1;});});
      Add(240,()=>{var f=UnityEngine.Object.FindFirstObjectByType<GtFollowCamera>();var v=f.GetComponent<Camera>();
        Check(f.Mode==1&&Math.Abs(v.nearClipPlane-.5f)<1e-4&&Vector3.Distance(v.transform.position,p.transform.position)>0,"Uzak takip kipi: dış kamera kırpma 0,5");Prefs(s=>s.Camera=0);});
      Add(3,()=>{Touch(10,UnityEngine.InputSystem.TouchPhase.Began,At("Respawn"));});
      Add(3,()=>{Touch(10,UnityEngine.InputSystem.TouchPhase.Ended,At("Respawn"));});
      Add(3,()=>{var v=p.Simulation.Body.Velocity;Check(JsMath.Hypot(v.X,v.Z)<.5,"↺ serbest sürüşte aracı durdurup yere koydu");Touch(11,UnityEngine.InputSystem.TouchPhase.Began,At("Pause"));});
      Add(3,()=>{Touch(11,UnityEngine.InputSystem.TouchPhase.Ended,At("Pause"));});
      Add(3,()=>{Check(GameFlow.Paused,"DURAKLAT düğmesi oyunu duraklattı");GameFlow.Pause(false);Touch(12,UnityEngine.InputSystem.TouchPhase.Began,At("Settings"));});
      Add(3,()=>{Touch(12,UnityEngine.InputSystem.TouchPhase.Ended,At("Settings"));});
      Add(3,()=>{Check(SettingsScreen.Open,"AYAR düğmesi ayarlar ekranını açtı");PlayerPreferences.Current.Set["ses"]=40;PlayerPreferences.Current.ApplyPreset("sade");SettingsScreen.Close();});
      Add(3,()=>{var back=new PlayerSettingsStore(dir).Load();Check(!SettingsScreen.Open&&back["ses"]==40&&back.HudLayout=="sade"&&back.Camera==PlayerPreferences.Current.Camera,"Ayarlar kapatınca dosyaya yazıldı ve yeniden yüklendi");
        PlayerPreferences.Reload();Check(PlayerPreferences.Current.ToJson()==back.ToJson(),"Tercihler yeniden açılışta aynı");
        Prefs(s=>{s.Set["ss"]=0;s.Set["sm"]=0;});Check(p.Simulation.SpeedSensitivePreference==false&&p.Simulation.SmoothSteeringPreference==false,"Hıza duyarlı direksiyon/yumuşatma tercihi canlı araca uygulandı");});
      Add(3,()=>{Check(GameAudio.Fired.TryGetValue("nitro",out int n)&&n>=1&&GameAudio.Fired.TryGetValue("tik",out int t)&&t>=1,"Nitro ve dokunmatik tık olayları ses yürütücüsüne ulaştı");
        Check(GameAudio.LastMix!=null&&Math.Abs(GameAudio.LastMix.Effects-AudioDirector.Level(40))<1e-9,"Oyun sesi tercihi (%40) TS seviye eğrisiyle kazanca uygulandı");
        Check(GameAudio.MissingAssets.Contains("motor")&&GameAudio.MissingAssets.Contains("nitro"),"Ses varlığı olmayan katman/olaylar eksik varlık olarak raporlandı");
        proof.missingAudio=string.Join(",",GameAudio.MissingAssets.OrderBy(x=>x));});
      Add(30,()=>{var r=Hud.Rects(p);var o=HudLayout.Overlaps(r).ToArray();var v=UnityEngine.Object.FindFirstObjectByType<MiniMapView>();
        Check(o.Length==0&&r.ContainsKey("MutantBar")&&r.ContainsKey("Map")&&!r.ContainsKey("Info"),"Mutant sürüş HUD'u bu ekranda çakışmasız (durum çubuğu + miniharita, telemetri yok)"+(o.Length>0?" ["+o[0].A+"-"+o[0].B+"]":""));
        Check(v!=null&&v.Markers>=4&&v.Map.Width>=180,"Miniharita Mutant etkinlik/sandık/atölye/boss işaretlerini çizdi ("+(v==null?0:v.Markers)+")");Prefs(s=>s.Hud["harita"]="kapali");});
      Add(3,()=>{Check(!Hud.Rects(p).ContainsKey("Map"),"HUD harita parçası kapalıyken miniharita yok");Prefs(s=>s.Hud["harita"]="kare");
        MutantRuntime.Run.Damage("spin");});
      Add(3,()=>{Check(MutantRuntime.Run.State["govde"].N()<100||MutantRuntime.Run.State["spin"].N()>=1,"Hasar bildirimi için gerçek gövde hasarı işlendi");});
    }
    private static void Tick()
    {
      try
      {
        if(proof.runtimeErrors.Count>0)throw new InvalidOperationException("Çalışma hatası: "+proof.runtimeErrors[0]);
        if(EditorApplication.timeSinceStartup-began>180)throw new TimeoutException("P5 kontrol Play sınırı");
        var garage=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();
        if(phase==0&&garage)
        {
          GarageSession.Open(TestPath,true);GameFlow.MainMenu();career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();
          dir=Path.Combine(Path.GetDirectoryName(TestPath),"settings");PlayerPreferences.Directory=dir;PlayerPreferences.Reload();
          MutantRuntime.RecordDirectory=Path.Combine(Path.GetDirectoryName(TestPath),"mutant");MutantRuntime.Start(54321);MutantRuntime.SelectCar(14);MutantRuntime.Choose("sonnefes");phase=1;return;
        }
        if(phase==1)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.OpenTerrain==null||p.Simulation==null)return;
          background=InputSystem.settings.backgroundBehavior;editorBehavior=InputSystem.settings.editorInputBehaviorInPlayMode;InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;kb=InputSystem.AddDevice<Keyboard>("P5Klavye");ts=InputSystem.AddDevice<Touchscreen>("P5Dokunmatik");gs=InputSystem.AddDevice<GravitySensor>("P5Yercekimi");
          proof.screen=Screen.width+"x"+Screen.height+" "+Screen.orientation+" batchOdak="+Application.isFocused;p.SendMessage("OnApplicationFocus",true);Check(p.GetComponent<TouchDrivingOverlay>()!=null,"Sürüş sahnesinde dokunmatik katman kuruldu");Plan();phase=2;return;
        }
        if(phase==2)
        {
          if(Time.frameCount==lastFrame)return;lastFrame=Time.frameCount;proof.frames++;if(!focusLost)p.SendMessage("OnApplicationFocus",true);if(MutantRuntime.Panel!=""&&MutantRuntime.Panel!="summary"){panels+=MutantRuntime.Panel+"@"+proof.frames+",";MutantRuntime.ClosePanel();}
          if(wait>0||Time.time<waitUntil){wait--;return;}
          if(steps.Count==0){Keys();Preserved();foreach(var d in new InputDevice[]{kb,ts,gs})InputSystem.RemoveDevice(d);MutantRuntime.Exit();phase=3;return;}
          var s=steps.Dequeue();s.Act();wait=s.Wait;waitUntil=Time.time+s.Wait/60f;return;
        }
        if(phase==3&&garage){Check(!MutantRuntime.Active,"Koşudan ana menüye dönüldü");Preserved();Finish(null);}
      }
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception error)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;GameFlow.Pause(false);
      foreach(var d in new InputDevice[]{kb,ts,gs})if(d!=null&&d.added)InputSystem.RemoveDevice(d);if(kb!=null){InputSystem.settings.backgroundBehavior=background;InputSystem.settings.editorInputBehaviorInPlayMode=editorBehavior;}
      proof.result=error==null?"controls-play-passed":"failed";proof.error=error?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.unityVersion=Application.unityVersion;proof.batch=Application.isBatchMode;
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".meta",".json",".unity"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),sha256=Hash(f)}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/p5-controls.json"),JsonUtility.ToJson(proof,true));if(error==null)Debug.Log("P5 kontroller Play geçti: "+proof.checks.Count+" kontrol.");else Debug.LogException(error);
      EditorApplication.ExitPlaymode();if(Application.isBatchMode)EditorApplication.delayCall+=()=>EditorApplication.Exit(error==null?0:1);
    }
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","").ToLowerInvariant();}
  }
}
