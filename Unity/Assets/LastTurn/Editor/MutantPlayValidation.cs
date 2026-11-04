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

namespace LastTurn.EditorValidation
{
  // Otomatik kabul sürücüsü: yarış sonucu Run'a verilmez; gerçek sabit fizik + oyun bitiş callback'i kullanılır.
  [InitializeOnLoad]
  public static class MutantPlayValidation
  {
    private const string Active="LastTurn.P3.Active",PathKey="LastTurn.P3.Path";
    [Serializable]private sealed class Source{public string path,sha256;}
    [Serializable]private sealed class Proof
    {
      public string result,error,utc,unityVersion,eventName,bossName;public bool batch;
      public double eventSeconds,bossSeconds,eventBody,bossBody;public int eventPhysicsSteps,bossPhysicsSteps;
      public List<string> checks=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();
      public Source[] sources,userFiles;public string[] userRoots;
    }
    private static Proof proof;private static int phase,ticks,eventId;private static double began,renderAt,moneyBefore,xpBefore;private static string career,profile;private static GtPrototype p;private static RaceTestDriver driver;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    private static string TestPath=>SessionState.GetString(PathKey,"");
    static MutantPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    [MenuItem("Last Turn/P3 Mutant Kısa Play Doğrulaması")]
    public static void Start()
    {
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play'i durdurun.");
      GarageSceneBuilder.Open();string[] roots={Path.Combine(Application.persistentDataPath,"LastTurnGarage"),Path.Combine(Application.persistentDataPath,"LastTurnMutant")};
      proof=new Proof{userRoots=roots,userFiles=Files(roots).Select(f=>new Source{path=f,sha256=Hash(f)}).ToArray()};
      string test=Path.Combine(Project,"Logs/P3Play/"+Guid.NewGuid().ToString("N")+"/garage.json");SessionState.SetString(PathKey,test);Directory.CreateDirectory(Path.Combine(Project,"Logs"));
      File.WriteAllText(Path.Combine(Project,"Logs/p3-running.json"),JsonUtility.ToJson(proof));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    public static void StartBatch(){if(!Application.isBatchMode)throw new InvalidOperationException("Ayrı batch Editor gerekir.");Start();}
    private static string[] Files(string[] roots)=>roots.Where(Directory.Exists).SelectMany(r=>Directory.GetFiles(r,"*",SearchOption.AllDirectories)).OrderBy(f=>f,StringComparer.Ordinal).ToArray();
    private static void Changed(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){
        proof=JsonUtility.FromJson<Proof>(File.ReadAllText(Path.Combine(Project,"Logs/p3-running.json")));phase=0;ticks=0;began=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;
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
      Check(GarageSession.State.Snapshot().ToString()==career&&GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Mutant kariyer bakiyesi ilerlemesi ve profili değiştirmedi");
      var current=Files(proof.userRoots);Check(current.SequenceEqual(proof.userFiles.Select(f=>f.path))&&proof.userFiles.All(f=>File.Exists(f.path)&&Hash(f.path)==f.sha256),"Mevcut kariyer ve Mutant oyuncu dosyaları aynı hash'te");
    }
    // Yalnız test konumlandırmasıdır. İşareti açan gerçek fizik sonrası 0,5 sn kaynak kapısıdır.
    private static void Marker(double x,double z,string panel)
    {
      MutantRuntime.ClosePanel();p.Simulation.Place(x+35,z,0);p.StepWorld(new DrivingInput(0,0,0));p.Simulation.Place(x,z,0);
      for(int n=0;n<50&&MutantRuntime.Panel=="";n++)p.StepWorld(new DrivingInput(0,1,0));
      Check(MutantRuntime.Panel==panel,"Gerçek sabit fizik adımı işaret kapısını açtı: "+panel);
    }
    private static void Tick()
    {
      try
      {
        if(proof.runtimeErrors.Count>0)throw new InvalidOperationException("Mutant çalışma hatası: "+proof.runtimeErrors[0]);
        if(EditorApplication.timeSinceStartup-began>180)throw new TimeoutException("P3 kısa Play sınırı");
        var garage=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();
        if(phase==0&&garage)
        {
          GarageSession.Open(TestPath,true);GameFlow.MainMenu();Check(GameFlow.Home,"Ana menüden Mutant başlangıç komutu");
          career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();
          MutantRuntime.RecordDirectory=Path.Combine(Path.GetDirectoryName(TestPath),"mutant");MutantRuntime.Start(54321);
          Check(MutantRuntime.Active&&MutantRuntime.Panel=="start"&&MutantRuntime.Run.State["faz"].S()=="basla","Tohumlu doğal koşu başlangıcı");
          var cars=MutantMenuModel.StartingCars(54321,MutantRuntime.Run.Catalog);Check(cars.SequenceEqual(new[]{14,10,13}),"Kaynak üç başlangıç aracı");MutantRuntime.SelectCar(14);
          Check(MutantRuntime.Panel=="choice"&&MutantRuntime.Session!=null,"Başlangıç araç seçimi saf oturuma bağlandı");
          Check(MutantRuntime.Run.State["secenekler"].Items.First().S()=="sonnefes","Kaynak başlangıç pasif seçimi");
          Check(MutantRuntime.Choose("sonnefes"),"Doğal pasif seçimi dünyayı açtı");phase=1;return;
        }
        if(phase==1)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.OpenTerrain==null)return;p.ManualStepping=true;
          Check(p.OpenTerrain.Region.Key=="hub"&&p.EnvironmentVisuals.ObstacleCount>0,"Mutant açık dünyası gerçek çevre ve araç fiziğiyle açıldı");
          Check(MutantRuntime.Run.State["faz"].S()=="surus"&&p.Simulation.Body.Steps>=0,"Koşu sürüş fazında");
          // Tohum 54321'de başlangıç parası 150, en ucuz stok 170: kaynakta ilk ziyarette alım reddedilir; alım etkinlik dönüşünde sınanır.
          var shop=MutantRuntime.Run.Catalog["workshop"];Marker(shop[0].N(),shop[1].N(),"shop");
          var costly=MutantRuntime.Model.Stock.OrderBy(s=>s.Price).First();double held=MutantRuntime.Run.State["para"].N();MutantRuntime.Buy(costly.Id);
          Check(!costly.CanBuy&&MutantRuntime.Run.State["para"].N()==held&&!MutantRuntime.Run.State["parcalar"].Items.Any(id=>id.S()==costly.Id),"Atölye yetersiz koşu parasıyla satışı reddetti");
          var chest=MutantRuntime.Run.State["sandiklar"].Items.First();Marker(chest["x"].N(),chest["z"].N(),"chest");Check(chest["incelendi"].B()&&chest["secenekler"].Items.Count()==1,"Sandık tek kaynak ödülü sundu");
          MutantRuntime.Chest(true);Check(chest["acildi"].B()&&MutantRuntime.Run.ChestOffer((int)chest["id"].N())==null,"Sandık gerçek ödülü bir kez uyguladı");
          var e=MutantRuntime.Run.State["etkinlikler"].Items.First(v=>v["ty"].S()=="dg");eventId=(int)e["id"].N();Marker(e["x"].N(),e["z"].N(),"event");Check(MutantRuntime.MarkerId==eventId,"Dünya etkinlik işareti doğru yarış odasını seçti");
          moneyBefore=MutantRuntime.Run.State["para"].N();xpBefore=MutantRuntime.Run.State["xp"].N();MutantRuntime.StartRace(eventId,0);phase=2;return;
        }
        if(phase==2)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.Race==null)return;p.ManualStepping=true;
          Check(p.Race.Session.Mutant&&!p.Race.Session.Career&&p.Race.Ghost==null,"Etkinlik kariyer ödülü ve hayaletinden ayrı");Check(p.Opponent!=null,"Mutant etkinliğinde gerçek fiziksel rakip");
          driver=RaceTestDriver.For("dg");while(p.Race.Session.State==RaceState.Countdown)p.StepRace(driver.Countdown(p.Race));ticks=0;proof.eventName=p.Race.Event.Name;phase=3;return;
        }
        if(phase==3)
        {
          for(int n=0;n<600&&p.Race.Session.State==RaceState.Running;n++){p.StepRace(driver.Input(p.Race));driver.RespawnIfStuck(p.Race);if(++ticks>18000)throw new Exception("Mutant etkinliği bitmedi");}
          if(p.Race.Session.State==RaceState.Running)return;
          Check(p.Race.Session.State==RaceState.Finished&&MutantRuntime.Panel=="result","Gerçek etkinlik bitişi koşu sonuç ekranına döndü");
          Check(MutantRuntime.Run.State["etkinlikler"].Items.First(e=>e["id"].N()==eventId)["yapildi"].B()&&MutantRuntime.Run.State["tamamlanan"].N()==1,"Gerçek yarış bitiş callback'i etkinliği bir kez tamamladı");
          Check(MutantRuntime.Run.State["para"].N()>moneyBefore&&MutantRuntime.Run.State["xp"].N()>xpBefore,"Gerçek yarış sonucu koşu para ve XP ödülünü uyguladı");
          Check(p.Simulation.Body.Steps>300&&p.Race.Session.Time>5,"Etkinlik gerçek motor gövde adımlarıyla tamamlandı");proof.eventSeconds=p.Race.Session.Time;proof.eventPhysicsSteps=(int)p.Simulation.Body.Steps;proof.eventBody=MutantRuntime.Run.State["govde"].N();Preserved();renderAt=EditorApplication.timeSinceStartup;phase=4;return;
        }
        if(phase==4&&EditorApplication.timeSinceStartup-renderAt>.15){Capture(Path.Combine(Project,"Logs/p3-event.png"));MutantRuntime.Continue();
          while(MutantRuntime.Panel=="choice"){string id=MutantRuntime.Run.State["secenekler"].Items.First().S();Check(MutantRuntime.Choose(id),"Etkinlik sonrası doğal seviye seçimi");}phase=5;return;}
        if(phase==5)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.OpenTerrain==null||p.Race!=null)return;p.ManualStepping=true;
          Check(MutantRuntime.Run.State["faz"].S()=="surus","Etkinlikten açık dünya koşusuna dönüldü");
          var shop=MutantRuntime.Run.Catalog["workshop"];Marker(shop[0].N(),shop[1].N(),"shop");
          var part=MutantRuntime.Model.Stock.Where(s=>s.CanBuy).OrderBy(s=>s.Price).First();double before=MutantRuntime.Run.State["para"].N();var old=p.Simulation.Parameters;MutantRuntime.Buy(part.Id);
          Check(MutantRuntime.Run.State["parcalar"].Items.Any(id=>id.S()==part.Id)&&Math.Abs(MutantRuntime.Run.State["para"].N()-(before-part.Price))<1e-9,"Atölye gerçek koşu parasıyla parça sattı");
          MutantRuntime.ClosePanel();p.StepWorld(new DrivingInput(0,1,0));Check(p.Simulation.Parameters==p.Parameters&&!ReferenceEquals(old,p.Simulation.Parameters),"Atölye sonrası canlı fizik kurulumu güncellendi");
          var boss=MutantRuntime.Run.Catalog["bossPlace"];Marker(boss[0].N(),boss[1].N(),"boss");
          Check(MutantRuntime.Run.State["boss"]["id"].S()=="drag-canavari","Kaynak tohumlu boss korundu");MutantRuntime.StartRace(0,0,true);phase=6;return;
        }
        if(phase==6)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.Race==null)return;p.ManualStepping=true;
          Check(MutantRuntime.Run.State["faz"].S()=="boss"&&MutantRuntime.RacePlan.Boss&&p.Opponent!=null,"Boss gerçek kaynak araç ve YZ fiziğiyle başladı");
          driver=RaceTestDriver.For("dg");while(p.Race.Session.State==RaceState.Countdown)p.StepRace(driver.Countdown(p.Race));ticks=0;proof.bossName=MutantRuntime.Run.State["boss"]["ad"].S();phase=7;return;
        }
        if(phase==7)
        {
          // Oyuncu hatası: rakip bitirene kadar kalkışta fren, sonra normal sürüş. Sonuç elle verilmez.
          for(int n=0;n<600&&p.Race.Session.State==RaceState.Running;n++){
            p.StepRace(!p.Opponent.FinishTime.HasValue?new DrivingInput(0,1,0):driver.Input(p.Race));driver.RespawnIfStuck(p.Race);
            if(++ticks>18000)throw new Exception("Mutant boss yarışı bitmedi");
          }
          if(p.Race.Session.State==RaceState.Running)return;
          Check(p.Opponent.FinishTime.HasValue&&!p.Opponent.PlayerWon(p.Race.Session.Time),"Boss sonucu gerçek rakip bitiş sırasından kayıp oldu");
          Check(p.Race.Session.State==RaceState.Finished&&MutantRuntime.Run.Finished&&MutantRuntime.Panel=="summary","Doğal koşu boss kaybıyla başlangıçtan sona tamamlandı");
          Check(p.Simulation.Body.Steps>300&&p.Opponent.Vehicle.Body.Steps>300,"Boss oyuncu ve rakibi gerçek motor gövde adımlarıyla tamamladı");
          var record=new MutantRecordStore(MutantRuntime.RecordDirectory);var saved=record.Load();Check(File.Exists(record.FilePath)&&saved.Region==1&&saved.Bosses==0,"Koşu bitiş rekoru ayrı Mutant dosyasına yazılıp yeniden yüklendi");
          proof.bossSeconds=p.Race.Session.Time;proof.bossPhysicsSteps=(int)p.Simulation.Body.Steps;proof.bossBody=MutantRuntime.Run.State["govde"].N();Preserved();renderAt=EditorApplication.timeSinceStartup;phase=8;return;
        }
        if(phase==8&&EditorApplication.timeSinceStartup-renderAt>.15){Capture(Path.Combine(Project,"Logs/p3-summary.png"));MutantRuntime.Exit();phase=9;return;}
        if(phase==9&&garage){Check(!MutantRuntime.Active&&GameFlow.Home,"Koşu özetinden ana menüye dönüldü");Preserved();Finish(null);}
      }
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception error)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;GameFlow.Pause(false);
      proof.result=error==null?"mutant-play-passed":"failed";proof.error=error?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.unityVersion=Application.unityVersion;proof.batch=Application.isBatchMode;
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".meta",".json",".unity"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),sha256=Hash(f)}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/p3-play.json"),JsonUtility.ToJson(proof,true));if(error==null)Debug.Log("P3 Mutant Play geçti: "+proof.checks.Count+" kontrol.");else Debug.LogException(error);
      EditorApplication.ExitPlaymode();if(Application.isBatchMode)EditorApplication.delayCall+=()=>EditorApplication.Exit(error==null?0:1);
    }
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","").ToLowerInvariant();}
    private static void Capture(string path)
    {
      if(!Application.isBatchMode){ScreenCapture.CaptureScreenshot(path);return;}
      var camera=Camera.main;if(!camera)throw new InvalidOperationException("Kanıt kamerası yok.");var target=new RenderTexture(960,540,24);var img=new Texture2D(960,540,TextureFormat.RGB24,false);var previous=RenderTexture.active;var old=camera.targetTexture;
      try{camera.targetTexture=target;camera.Render();RenderTexture.active=target;img.ReadPixels(new Rect(0,0,960,540),0,0);img.Apply();File.WriteAllBytes(path,img.EncodeToPNG());}
      finally{camera.targetTexture=old;RenderTexture.active=previous;target.Release();UnityEngine.Object.DestroyImmediate(target);UnityEngine.Object.DestroyImmediate(img);}
    }
  }
}
