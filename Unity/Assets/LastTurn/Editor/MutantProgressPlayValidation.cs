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
  // P4 kabul sürücüsü: nitro + beş skill + kombinasyon gerçek sabit fizik, gerçek tuş komutu ve gerçek rakip ile.
  // Test düzenlemesi (TS testBeceriAyarla gibi): takılı skill listesi ve gerekirse enerji/bar başlangıcı doğrudan yazılır;
  // etkinin kendisi (kalkış, hayalet, dönüşüm, kanca, takip) yalnız gerçek adımlardan gözlenir.
  [InitializeOnLoad]
  public static class MutantProgressPlayValidation
  {
    private const string Active="LastTurn.P5F.Active",PathKey="LastTurn.P5F.Path";
    [Serializable]private sealed class Source{public string path,sha256;}
    [Serializable]private sealed class Proof
    {
      public string result,error,utc,unityVersion,bossName,bossTrack,cityHook;public bool batch,bossWon;
      public double bossSeconds,opponentSeconds,raceGrip,opponentGrip,evolvedGrip,regionAfter;public int bossSteps,hookAttempts,evolvedStatus;
      public List<string> panels=new List<string>(),checks=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();
      public Source[] sources,userFiles;public string[] userRoots;
    }
    private static Proof proof;private static int phase,ticks;private static double began;private static string career,profile;
    private static GtPrototype p;private static RaceTestDriver driver;private static bool hooked,pulled,stored,released,unhooked;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    private static string TestPath=>SessionState.GetString(PathKey,"");
    private static MutantAbilityDriver A=>MutantRuntime.Abilities;
    private static CatalogNode S=>MutantRuntime.Run.State;
    static MutantProgressPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    [MenuItem("Last Turn/P5 Mutant İlerleme Play Doğrulaması")]
    public static void Start()
    {
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play'i durdurun.");
      GarageSceneBuilder.Open();string[] roots={Path.Combine(Application.persistentDataPath,"LastTurnGarage"),Path.Combine(Application.persistentDataPath,"LastTurnMutant")};
      proof=new Proof{userRoots=roots,userFiles=Files(roots).Select(f=>new Source{path=f,sha256=Hash(f)}).ToArray()};
      string test=Path.Combine(Project,"Logs/P5Progress/"+Guid.NewGuid().ToString("N")+"/garage.json");SessionState.SetString(PathKey,test);Directory.CreateDirectory(Path.Combine(Project,"Logs"));
      File.WriteAllText(Path.Combine(Project,"Logs/p5-progress-running.json"),JsonUtility.ToJson(proof));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    public static void StartBatch(){if(!Application.isBatchMode)throw new InvalidOperationException("Ayrı batch Editor gerekir.");Start();}
    private static string[] Files(string[] roots)=>roots.Where(Directory.Exists).SelectMany(r=>Directory.GetFiles(r,"*",SearchOption.AllDirectories)).OrderBy(f=>f,StringComparer.Ordinal).ToArray();
    private static void Changed(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){
        proof=JsonUtility.FromJson<Proof>(File.ReadAllText(Path.Combine(Project,"Logs/p5-progress-running.json")));phase=0;ticks=0;began=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;
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
    private static void Equip(params string[] ids)
    {
      S.Set("beceriler",CatalogNode.Arr(ids.Select(id=>CatalogNode.Parse("{\"id\":\""+id+"\",\"seviye\":1,\"eklentiler\":[],\"evrim\":null}"))));
      S.Set("bec",MutantSkills.Initialize());S.Set("becCikti",CatalogNode.Parse("null"));S.Set("becEngel",CatalogNode.Obj());S.Set("becHedef",CatalogNode.Obj());
    }
    private static void Fill(){S["mek"].Set("enerji",CatalogNode.Num(S["mek"]["kapasite"].N()));}
    private static double Speed=>JsMath.Hypot(p.Simulation.Body.Velocity.X,p.Simulation.Body.Velocity.Z);
    private static double Height=>p.Simulation.Body.Position.Y-p.OpenTerrain.Height(p.Simulation.ReferencePoint.X,p.Simulation.ReferencePoint.Z);
    private static readonly DrivingInput Gas=new DrivingInput(1,0,0),Coast=new DrivingInput(0,0,0),Brake=new DrivingInput(0,1,0);
    // İşaret paneli (atölye/etkinlik/sandık) testin konusu değil: açılırsa kaydedilir, kapatılır, adım yeniden verilir.
    private static void Step(DrivingInput input){Unblock();p.StepWorld(input);Unblock();}
    private static void Unblock(){if(MutantRuntime.Panel=="")return;proof.panels.Add(MutantRuntime.Panel+"@"+p.Simulation.Body.Steps);MutantRuntime.ClosePanel();}
    private static void Drive(int steps,DrivingInput input){for(int i=0;i<steps;i++)Step(input);}
    private static void Settle(double x,double z,double h){p.Simulation.Place(x,z,h);Drive(30,Brake);}
    // Yakınında başka engel olmayan tek katı engel: önünde 44 m düz ve boş bir yaklaşma.
    private static WorldObstacle LoneSolid()
    {
      var w=(IVehicleCollisionWorld)p.OpenTerrain;var spawn=p.OpenTerrain.Region.Teleports[0];
      for(int r=20;r<600;r+=10)for(int a=0;a<36;a++)
      {
        double x=spawn.X+r*Math.Sin(a*Math.PI/18),z=spawn.Z+r*Math.Cos(a*Math.PI/18);
        foreach(var o in w.Near(x,z,p.OpenTerrain.Height(x,z)+1).Where(o=>o.Type=="solid"&&o.Radius<1.6))
        {
          bool alone=true;for(double d=-46;d<=10;d+=2)alone&=w.Near(o.X,o.Z+d,p.OpenTerrain.Height(o.X,o.Z+d)+1).All(q=>(q.X==o.X&&q.Z==o.Z)||q.Type=="water"||Math.Abs(q.X-o.X)>6);
          double h0=p.OpenTerrain.Height(o.X,o.Z-44),h1=p.OpenTerrain.Height(o.X,o.Z+8);
          if(alone&&Math.Abs(h0-h1)<1.5&&Math.Abs(p.OpenTerrain.Height(o.X,o.Z)-h0)<1)return o;
        }
      }
      throw new InvalidOperationException("Hayalet sınaması için yalnız katı engel bulunamadı.");
    }
    // P5-F: süre dolması → boss, yağmurlu gerçek boss yarışı, galibiyet → bölge 2 şehir, şehirde kanca, evrimli Slipstream.
    // Sonuç elle verilmez (RacePlan.Passed); test düzenlemeleri: kalan süre, takılı skill/evrim, enerji.
    private static void Tick()
    {
      try
      {
        if(proof.runtimeErrors.Count>0)throw new InvalidOperationException("Mutant çalışma hatası: "+proof.runtimeErrors[0]);
        if(EditorApplication.timeSinceStartup-began>300)throw new TimeoutException("P5 ilerleme Play sınırı");
        var garage=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();
        if(phase==0&&garage)
        {
          GarageSession.Open(TestPath,true);GameFlow.MainMenu();career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();
          MutantRuntime.RecordDirectory=Path.Combine(Path.GetDirectoryName(TestPath),"mutant");MutantRuntime.Start(54321);MutantRuntime.SelectCar(14);
          Check(MutantRuntime.Choose("sonnefes"),"Doğal pasif seçimi dünyayı açtı");phase=1;return;
        }
        if(phase==1)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.OpenTerrain==null)return;p.ManualStepping=true;
          Check(MutantRuntime.Run.Region==1&&p.OpenTerrain.Region.Key=="hub","Bölge 1 hub dünyası");
          // "Son Nefes" pasifi süre ilk dolunca bir kez 90 sn verir (TS zamanAkis); ikinci dolumda boss.
          S.Set("kalan",CatalogNode.Num(1));for(int i=0;i<120&&!S["sonNefes"].B();i++){if(MutantRuntime.Panel!="")MutantRuntime.ClosePanel();p.StepWorld(Gas);}
          Check(S["sonNefes"].B()&&S["kalan"].N()>85&&MutantRuntime.Panel=="","Son Nefes: süre ilk dolunca bir kez 90 sn eklendi");
          S.Set("kalan",CatalogNode.Num(1));for(int i=0;i<120&&MutantRuntime.Panel!="boss";i++){if(MutantRuntime.Panel!=""&&MutantRuntime.Panel!="boss")MutantRuntime.ClosePanel();p.StepWorld(Gas);}
          Check(MutantRuntime.Panel=="boss"&&S["kalan"].N()<=0,"Süre dolunca boss paneli açıldı (TS sureDoldu)"+(MutantRuntime.Panel=="boss"?"":" [panel="+MutantRuntime.Panel+" kalan="+S["kalan"].N()+" faz="+S["faz"].S()+" adım="+p.Simulation.Body.Steps+" blocked="+MutantRuntime.Blocked+"]"));
          proof.bossName=S["boss"]["ad"].S();GameFlow.Conditions=new RaceConditions{Weather="rain"};
          Equip("grappling-hook","slipstream-engine","volt-kanat");S["beceriler"].Items.First().Set("seviye",CatalogNode.Num(3));S["beceriler"].Items.ElementAt(1).Set("evrim",CatalogNode.Str("ruzgar-kirici"));S["beceriler"].Items.ElementAt(2).Set("evrim",CatalogNode.Str("firtina-kanadi"));Fill();
          MutantRuntime.StartRace(0,0,true);phase=2;return;
        }
        if(phase==2)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.Race==null)return;p.ManualStepping=true;
          proof.bossTrack=p.Race.Event.Key;proof.raceGrip=p.Race.World.GripMultiplier;proof.opponentGrip=p.Opponent!=null?((TrackWorld)p.Opponent.World).GripMultiplier:-1;
          string wx=S["boss"]["hava"].S()!=""?S["boss"]["hava"].S():"rain";double expected=RaceConditions.Grip(RaceConditions.Theme(p.Race.Event.Region),wx);
          Check(Math.Abs(proof.raceGrip-expected)<1e-12&&(p.Opponent==null||proof.opponentGrip==proof.raceGrip)&&proof.raceGrip<1,"Hava tutuşu boss yarışı ve rakip dünyasına uygulandı ("+proof.raceGrip+")");
          Check(S["faz"].S()=="boss","Boss yarışı başladı: "+proof.bossName+" / "+proof.bossTrack);
          driver=RaceTestDriver.For(p.Race.Event.Type);while(p.Race.Session.State==RaceState.Countdown)p.StepRace(driver.Countdown(p.Race));ticks=0;phase=3;return;
        }
        if(phase==3)
        {
          for(int n=0;n<600&&p.Race.Session.State==RaceState.Running;n++)
          {
            var hook=A.Skills()[0];if(p.Opponent!=null&&hook.Ready&&hook.TargetPoint!=null){A.PressSkill(0);A.ReleaseSkill(0);proof.hookAttempts++;}
            // Evrimli skill: Fırtına Kanadı ile kalkışta yan şeritteki rakibin 8 m içinden uçuş (TS: rakibe 1,5 sn elektrik).
            if(ticks==0)A.PressSkill(2);if(ticks==45)A.ReleaseSkill(2);
            if(ticks>45&&A.Nitro().Ready)A.PressNitro();
            p.StepRace(driver.Input(p.Race));driver.RespawnIfStuck(p.Race);ticks++;
            if(S["becCikti"]["olaylar"].Items.Any(e=>e["tur"].S()=="DurumUygulandi"&&e["durum"].S()=="elektrik"&&e["hedef"].S()=="rakip"))proof.evolvedStatus++;
            if(S["bec"]["yerel"]["slipstream-engine"]["kalan"].N()>0)proof.evolvedGrip=Math.Max(proof.evolvedGrip,S["becCikti"]["tutus"].N(1));
            if(ticks>18000)throw new Exception("Boss yarışı bitmedi");
          }
          if(p.Race.Session.State==RaceState.Running)return;
          proof.bossSeconds=p.Race.Session.Time;proof.opponentSeconds=p.Opponent?.FinishTime??-1;proof.bossSteps=(int)p.Simulation.Body.Steps;proof.bossWon=MutantRuntime.Run.Region==2;
          Check(proof.evolvedStatus>0,"Evrimli Volt Kanat (Fırtına Kanadı) uçarken rakibe elektrik uyguladı");
          Check(p.Race.Session.State==RaceState.Finished,"Boss yarışı gerçek fizikte bitti ("+proof.bossSeconds.ToString("0.00")+" sn, rakip "+proof.opponentSeconds.ToString("0.00")+")");
          if(!proof.bossWon){Preserved();Finish(new Exception("Boss gerçek yarışta kazanılamadı: oyuncu "+proof.bossSeconds.ToString("0.00")+" sn, rakip "+proof.opponentSeconds.ToString("0.00")+" sn; kanca "+proof.hookAttempts));return;}
          Check(MutantRuntime.Run.Region==2&&S["yenilenBoss"].N()==1&&S["boss"]["ad"].S()!=proof.bossName,"Boss galibiyeti: bölge 2, yeni boss, sayaç");
          MutantRuntime.Continue();while(MutantRuntime.Panel=="choice"){string id=S["secenekler"].Items.First().S();Check(MutantRuntime.Choose(id),"Bölge geçişi seçimi");}
          if(MutantRuntime.Panel!=""){MutantRuntime.ClosePanel();MutantRuntime.OpenWorld();}
          phase=4;return;
        }
        if(phase==4)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.OpenTerrain==null||p.Race!=null)return;p.ManualStepping=true;
          proof.regionAfter=MutantRuntime.Run.Region;Check(p.OpenTerrain.Region.Key=="city"&&S["faz"].S()=="surus","Bölge 2: Kule Şehri açık dünyası açıldı");
          Equip("grappling-hook");S["beceriler"].Items.First().Set("seviye",CatalogNode.Num(3));
          var t=p.OpenTerrain.Region.Teleports[0];Settle(t.X,t.Z,t.Heading);
          proof.cityHook="";for(int i=0;i<900&&proof.cityHook=="";i++)
          {
            var hook=A.Skills()[0];if(hook.Ready&&hook.TargetPoint!=null){A.PressSkill(0);A.ReleaseSkill(0);proof.hookAttempts++;}
            Step(new DrivingInput(1,0,i%240<120?.5:-.5));var y=S["bec"]["yerel"]["grappling-hook"];
            if(y["kalan"].N()>0&&y["hedef"].ToString()!="null")proof.cityHook=y["hedef"].ToString();
          }
          Check(proof.cityHook!="","Şehirde kanca gerçek dünya bağlantısına atıldı ("+proof.cityHook+")");
          Preserved();MutantRuntime.Exit();phase=9;return;
        }
        if(phase==9&&garage){Check(!MutantRuntime.Active,"Koşudan ana menüye dönüldü");Preserved();Finish(null);}
      }
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception error)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;GameFlow.Pause(false);
      proof.result=error==null?"mutant-progress-play-passed":"failed";proof.error=error?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.unityVersion=Application.unityVersion;proof.batch=Application.isBatchMode;
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".meta",".json",".unity"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),sha256=Hash(f)}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/p5-progress.json"),JsonUtility.ToJson(proof,true));if(error==null)Debug.Log("P5 Mutant ilerleme Play geçti: "+proof.checks.Count+" kontrol.");else Debug.LogException(error);
      EditorApplication.ExitPlaymode();if(Application.isBatchMode)EditorApplication.delayCall+=()=>EditorApplication.Exit(error==null?0:1);
    }
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","").ToLowerInvariant();}
  }
}
