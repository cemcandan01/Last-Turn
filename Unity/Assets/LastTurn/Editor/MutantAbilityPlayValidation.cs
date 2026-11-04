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
  public static class MutantAbilityPlayValidation
  {
    private const string Active="LastTurn.P4.Active",PathKey="LastTurn.P4.Path";
    [Serializable]private sealed class Source{public string path,sha256;}
    [Serializable]private sealed class Proof
    {
      public string result,error,utc,unityVersion,eventName;public bool batch;
      public double nitroSpeedGain,flightHeight,airNitroForward,ghostPassMetres,riskPower,hookPull,slipstreamStored,eventSeconds;
      public bool riskAssists;public int followRange,followCone,followRelative,followSpeed;public double followMinAngle=9,followMinRelative=99,followCredit=-1;public List<string> followTrace=new List<string>();public double riskBeta,riskSpeed,riskBar;public int riskDriftSteps,ghostCollisions,flightSteps,riskSteps,hookSteps,eventPhysicsSteps,refusals;
      public List<string> panels=new List<string>(),checks=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();
      public Source[] sources,userFiles;public string[] userRoots;
    }
    private static Proof proof;private static int phase,ticks;private static double began;private static string career,profile;
    private static GtPrototype p;private static RaceTestDriver driver;private static bool hooked,pulled,stored,released,unhooked;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    private static string TestPath=>SessionState.GetString(PathKey,"");
    private static MutantAbilityDriver A=>MutantRuntime.Abilities;
    private static CatalogNode S=>MutantRuntime.Run.State;
    static MutantAbilityPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    [MenuItem("Last Turn/P4 Mutant Nitro ve Skill Play Doğrulaması")]
    public static void Start()
    {
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play'i durdurun.");
      GarageSceneBuilder.Open();string[] roots={Path.Combine(Application.persistentDataPath,"LastTurnGarage"),Path.Combine(Application.persistentDataPath,"LastTurnMutant")};
      proof=new Proof{userRoots=roots,userFiles=Files(roots).Select(f=>new Source{path=f,sha256=Hash(f)}).ToArray()};
      string test=Path.Combine(Project,"Logs/P4Play/"+Guid.NewGuid().ToString("N")+"/garage.json");SessionState.SetString(PathKey,test);Directory.CreateDirectory(Path.Combine(Project,"Logs"));
      File.WriteAllText(Path.Combine(Project,"Logs/p4-running.json"),JsonUtility.ToJson(proof));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    public static void StartBatch(){if(!Application.isBatchMode)throw new InvalidOperationException("Ayrı batch Editor gerekir.");Start();}
    private static string[] Files(string[] roots)=>roots.Where(Directory.Exists).SelectMany(r=>Directory.GetFiles(r,"*",SearchOption.AllDirectories)).OrderBy(f=>f,StringComparer.Ordinal).ToArray();
    private static void Changed(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){
        proof=JsonUtility.FromJson<Proof>(File.ReadAllText(Path.Combine(Project,"Logs/p4-running.json")));phase=0;ticks=0;began=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;
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
    private static void Tick()
    {
      try
      {
        if(proof.runtimeErrors.Count>0)throw new InvalidOperationException("Mutant çalışma hatası: "+proof.runtimeErrors[0]);
        if(EditorApplication.timeSinceStartup-began>240)throw new TimeoutException("P4 kısa Play sınırı");
        var garage=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();
        if(phase==0&&garage)
        {
          GarageSession.Open(TestPath,true);GameFlow.MainMenu();career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();
          MutantRuntime.RecordDirectory=Path.Combine(Path.GetDirectoryName(TestPath),"mutant");MutantRuntime.Start(54321);MutantRuntime.SelectCar(14);
          Check(A!=null&&MutantRuntime.Session.EnergyAndSkills!=null,"Enerji/skill yürütücüsü Mutant oturumuna bağlandı");
          Check(MutantRuntime.Choose("sonnefes"),"Doğal pasif seçimi dünyayı açtı");phase=1;return;
        }
        if(phase==1)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.OpenTerrain==null)return;p.ManualStepping=true;
          var spawn=p.OpenTerrain.Region.Teleports[0];
          // Nitro: N komutu → mekanik enerji harcar, güç çarpanı canlı fiziği yeniden kurar, hız kazancı ölçülür.
          Equip();Fill();Settle(spawn.X,spawn.Z,spawn.Heading);Drive(90,Gas);double v0=Speed,e0=S["mek"]["enerji"].N();var hp0=p.Simulation.Parameters;
          A.PressNitro();Step(Gas);var n=A.Nitro();
          Check(n.Open&&Math.Abs(S["mek"]["enerji"].N()-(e0-n.Cost))<1.5&&!ReferenceEquals(hp0,p.Simulation.Parameters),"N komutu nitroyu açtı, enerjiyi harcadı ve canlı fizik gücü yeniden kurdu");
          Drive(60,Gas);double withNitro=Speed-v0;
          for(int i=0;i<900&&A.Nitro().Open;i++)Step(Coast);Check(!A.Nitro().Open,"Nitro süresi doldu");
          Settle(spawn.X,spawn.Z,spawn.Heading);Drive(90,Gas);double v1=Speed;Drive(61,Gas);double without=Speed-v1;proof.nitroSpeedGain=withNitro-without;
          Check(withNitro>without+.2,"Nitro gerçek fizikte aynı sürüşe göre ek hız kazandırdı ("+withNitro.ToString("0.00")+" / "+without.ToString("0.00")+" m/s)");
          S["mek"].Set("enerji",CatalogNode.Num(0));A.PressNitro();Step(Gas);Check(!A.Nitro().Open&&!A.Nitro().Ready,"Enerji yetmeyince nitro açılmadı");
          // Volt Kanat + havada nitro (kombinasyon): basılı tuttukça kalkış ve burun itkisi, bırakınca süzülerek iniş.
          Equip("volt-kanat");Fill();Settle(spawn.X,spawn.Z,spawn.Heading);Drive(90,Gas);
          A.PressSkill(0);int air=0;double top=0,forward=0;
          for(int i=0;i<150;i++){Step(Gas);if(p.Simulation.Body.Airborne)air++;top=Math.Max(top,Height);
            if(i==40){A.PressNitro();A.AirDrag(0,40);}
            var u=p.Simulation.SkillInput?.Flight;if(u!=null&&u.Forward.HasValue)forward=Math.Max(forward,u.Forward.Value);}
          proof.flightHeight=top;proof.flightSteps=air;proof.airNitroForward=forward;
          Check(top>3&&air>60,"Volt Kanat basılıyken araç gerçek fizikte yükseldi ("+top.ToString("0.0")+" m, "+air+" havada adım)");
          Check(forward>=MutantAbilityDriver.AirNitro+9-1e-9,"Uçuşta nitro burun itkisine HAVA_NITRO ekledi (kombinasyon)");
          Check(p.Simulation.SkillInput.Flight.Air.Held,"Havada sürükleme burun denetimine verildi");A.AirRelease();
          A.ReleaseSkill(0);int landed=-1;for(int i=0;i<600&&landed<0;i++){Step(Coast);if(!p.Simulation.Body.Airborne&&Height<1.5)landed=i;}
          Check(landed>=0&&!S["pert"].B(),"Tuş bırakılınca Volt Kanat süzülerek indi");
          // Flying Dutchman: hayalet fazı katı engelin içinden geçirir, hasarı KorumaEngelledi'ye çevirir.
          Equip("flying-dutchman");var tree=LoneSolid();Settle(tree.X,tree.Z-42,0);for(int i=0;i<600&&p.Simulation.ReferencePoint.Z<tree.Z-16;i++)Step(Gas);int hits=p.Simulation.Body.CollisionCount;double body=S["govde"].N();
          A.PressSkill(0);A.ReleaseSkill(0);Step(Gas);Check(S["becCikti"]["hayalet"].B()&&p.Simulation.SkillInput.Ghost,"Hayalet fazı fiziğe katı engel geçişi olarak verildi");
          bool blocked=!MutantRuntime.Run.Damage("carpma")&&S["govde"].N()==body&&S["bekleyenBeceri"].Items.Any(e=>e["tur"].S()=="KorumaEngelledi");
          Check(blocked,"Hayalet fazında çarpma hasarı engellendi (KorumaEngelledi)");
          for(int i=0;i<140&&S["becCikti"]["hayalet"].B();i++)Step(Gas);
          proof.ghostPassMetres=p.Simulation.ReferencePoint.Z-tree.Z;proof.ghostCollisions=p.Simulation.Body.CollisionCount-hits;
          Check(proof.ghostPassMetres>2&&proof.ghostCollisions==0,"Hayalet araç katı engelin içinden çarpmadan geçti ("+proof.ghostPassMetres.ToString("0.0")+" m)");
          Check(S["govde"].N()==body,"Hayalet geçişi gövde hasarı vermedi");
          // Risk Taker: bar test düzenlemesiyle 97'den başlar (~15 nitelikli drift adımı); dönüşüm yalnız gerçek el freni driftinin nitelikli adımlarıyla tetiklenir.
          Equip("risk-taker");Settle(spawn.X,spawn.Z,spawn.Heading);Drive(200,Gas);proof.riskAssists=p.Simulation.Parameters.Assists!=null;
          S["bec"]["yerel"].Set("risk-taker",CatalogNode.Parse("{\"kalan\":0,\"bekleme\":0,\"deger\":97,\"uzatma\":0,\"sayac\":0,\"hedef\":null,\"nokta\":null,\"iz\":[]}"));
          var before=p.Simulation.Parameters;int k=0;
          proof.riskSpeed=Speed;
          for(;k<240&&S["bec"]["yerel"]["risk-taker"]["kalan"].N()<=0;k++){var dr=p.Simulation.Assist;
            // El freniyle kaydır; drift penceresi açılınca direksiyonu nötre yakın tut (savrulma spin cezasıyla pencereyi kapatır).
            Step(dr.On?new DrivingInput(.7,0,.15*dr.Dir):new DrivingInput(1,0,1,true,true,k<45));
            if(p.Simulation.Assist.On)proof.riskDriftSteps++;proof.riskBeta=Math.Max(proof.riskBeta,Math.Abs(RaceDrift.Detect(p.Simulation.Body,p.Simulation.Assist.On).Beta));proof.riskBar=Math.Max(proof.riskBar,S["bec"]["yerel"]["risk-taker"]["deger"].N());}
          // Kaynak sırası: dönüşüm bu adımda açılır, güç çarpanı sonraki skill adımında çıkar ve araç yenilenir.
          proof.riskSteps=k;before=p.Simulation.Parameters;Step(Gas);proof.riskPower=S["becCikti"]["guc"].N(1);
          Check(S["bec"]["yerel"]["risk-taker"]["kalan"].N()>0&&proof.riskPower>1&&!ReferenceEquals(before,p.Simulation.Parameters),"Gerçek kontrollü drift Risk Taker dönüşümünü açtı ve güç fiziğe geçti");
          // Kanca + Slipstream kombinasyonu gerçek rakipli Drag etkinliğinde.
          Equip("grappling-hook","slipstream-engine");Settle(spawn.X,spawn.Z,spawn.Heading);Drive(5,Gas);int seen=A.Refusal.Count;
          Check(A.Skills()[0].Blocker=="hedef"&&MutantSkillSlot.Read(A.Skills()[0]).Text=="HEDEF YOK","Hub'da köşe/rakip yokken kanca yuvası HEDEF YOK gösterdi");
          A.PressSkill(0);A.ReleaseSkill(0);Step(Gas);
          Check(A.Refusal.Count==seen+1&&A.Refusal.Reason=="hedef"&&S["bec"]["yerel"]["grappling-hook"]["kalan"].N(0)<=0,"Hedefsiz kanca isteği reddedildi, enerji/hak harcanmadı");proof.refusals=A.Refusal.Count;
          var e=S["etkinlikler"].Items.First(v=>v["ty"].S()=="dg");MutantRuntime.ClosePanel();MutantRuntime.StartRace((int)e["id"].N(),0);phase=2;return;
        }
        if(phase==2)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.Race==null)return;p.ManualStepping=true;
          Check(p.Opponent!=null&&MutantRuntime.OpponentLink!=null,"Mutant etkinliğinde rakip skill etkisine bağlandı");
          driver=RaceTestDriver.For("dg");
          while(p.Race.Session.State==RaceState.Countdown)p.StepRace(driver.Countdown(p.Race));
          ticks=0;proof.eventName=p.Race.Event.Name;phase=3;return;
        }
        if(phase==3)
        {
          for(int n=0;n<600&&p.Race.Session.State==RaceState.Running;n++)
          {
            // Rakip öne geçene dek bekle; sonra tam gaz, kanca hazırsa at (hedef rakip olmalı).
            var o=p.Opponent.Vehicle.ReferencePoint;var me=p.Simulation.ReferencePoint;double gap=JsMath.Hypot(o.X-me.X,o.Z-me.Z);
            bool wait=ticks<70;var hook=A.Skills()[0];
            // Kombinasyon: açılan rakibe kancayla çekil, yaklaşınca yeniden basıp bırak, sonra yakın takipte Slipstream depola.
            bool attached=S["bec"]["yerel"]["grappling-hook"]["kalan"].N(0)>0;
            if(!wait&&!hooked&&gap>13&&hook.Ready&&hook.TargetPoint!=null){A.PressSkill(0);A.ReleaseSkill(0);}
            else if(hooked&&attached&&!unhooked&&gap<9){A.PressSkill(0);A.ReleaseSkill(0);unhooked=true;}
            // Yan şeritten takip konisi (0,35 rad, 3–12 m) geometrik olarak tutmaz: rakibin şeridine geç (+ direksiyon sola).
            var body=p.Simulation.Body;var left=body.Orientation.Rotate(new BodyVector(1,0,0));
            double side=(o.X-me.X)*left.X+(o.Z-me.Z)*left.Z,drift=body.Velocity.X*left.X+body.Velocity.Z*left.Z;
            var auto=driver.Input(p.Race);double steer=Math.Max(-1,Math.Min(1,.12*side-.08*drift));
            // Takip bandında (3–12 m, bağıl hız < 8) kal: 7 m hedefle yaklaşma hızına göre gaz.
            var ov2=p.Opponent.Vehicle.Body.Velocity;double closing=((body.Velocity.X-ov2.X)*(o.X-me.X)+(body.Velocity.Z-ov2.Z)*(o.Z-me.Z))/Math.Max(gap,.1);
            bool keep=(!hooked||unhooked)&&!released;
            double gas=keep&&gap<20?Math.Max(0,Math.Min(1,.55+.12*(gap-7)-.25*closing)):auto.Throttle,brake=keep&&gap<20&&closing>5?.4:auto.Brake;
            p.StepRace(wait?new DrivingInput(0,0,0):new DrivingInput(gas,brake,steer));ticks++;
            var y=S["bec"]["yerel"];{var me2=p.Simulation.ReferencePoint;var o2=p.Opponent.Vehicle.ReferencePoint;var v=p.Simulation.Body.Velocity;var ov=p.Opponent.Vehicle.Body.Velocity;
              double dx=o2.X-me2.X,dz=o2.Z-me2.Z,m=JsMath.Hypot(dx,dz),ang=Math.Abs(Math.Atan2(Math.Sin(Math.Atan2(dx,dz)-Math.Atan2(v.X,v.Z)),Math.Cos(Math.Atan2(dx,dz)-Math.Atan2(v.X,v.Z)))),rel=JsMath.Hypot(v.X-ov.X,v.Z-ov.Z);
              if(m>=3&&m<=12){proof.followRange++;proof.followMinAngle=Math.Min(proof.followMinAngle,ang);if(ang<.35)proof.followCone++;proof.followMinRelative=Math.Min(proof.followMinRelative,rel);if(rel<8)proof.followRelative++;if(JsMath.Hypot(v.X,v.Z)>15)proof.followSpeed++;}
              if(ticks%30==0)proof.followTrace.Add(ticks+": m="+m.ToString("0.0")+" a="+ang.ToString("0.00")+" rel="+rel.ToString("0.0")+" v="+JsMath.Hypot(v.X,v.Z).ToString("0.0")+" kredi="+S["bec"]["takipKredi"]["rakip"]);}
            if(y["grappling-hook"]["kalan"].N()>0&&y["grappling-hook"]["hedef"].S()=="rakip"){hooked=true;proof.hookSteps++;}
            var a=S["becCikti"]["hedefIvme"]["rakip"];if(a.Has("x")&&p.Opponent.Vehicle.SkillInput!=null){pulled=true;proof.hookPull=Math.Max(proof.hookPull,JsMath.Hypot(a["x"].N(),a["z"].N()));}
            if(y["slipstream-engine"]["deger"].N()>0){stored=true;proof.slipstreamStored=Math.Max(proof.slipstreamStored,y["slipstream-engine"]["deger"].N());}
            if(y["slipstream-engine"]["kalan"].N()>0)released=true;
            if(ticks>18000)throw new Exception("Mutant etkinliği bitmedi");
          }
          if(p.Race.Session.State==RaceState.Running)return;
          Check(hooked,"Kanca gerçek rakibe atıldı ("+proof.hookSteps+" adım bağlı)");
          Check(unhooked&&proof.hookSteps<240,"Yeniden basış kancayı süre dolmadan bıraktı");
          Check(pulled,"Kanca çekişi rakip fiziğine dış ivme olarak uygulandı");
          Check(stored,"Slipstream gerçek rakip arkasında yakın takipte depoladı ("+proof.slipstreamStored.ToString("0.00")+" sn)");
          Check(p.Race.Session.State==RaceState.Finished&&MutantRuntime.Panel=="result","Skill'li gerçek etkinlik bitişi koşu sonuç ekranına döndü");
          proof.eventSeconds=p.Race.Session.Time;proof.eventPhysicsSteps=(int)p.Simulation.Body.Steps;
          if(released)proof.checks.Add("Slipstream depo takipten çıkınca güç olarak boşaldı");
          Preserved();MutantRuntime.Exit();phase=4;return;
        }
        if(phase==4&&garage){Check(!MutantRuntime.Active&&GameFlow.Home,"Koşudan ana menüye dönüldü");Preserved();Finish(null);}
      }
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception error)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;GameFlow.Pause(false);
      proof.result=error==null?"mutant-ability-play-passed":"failed";proof.error=error?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.unityVersion=Application.unityVersion;proof.batch=Application.isBatchMode;
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".meta",".json",".unity"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),sha256=Hash(f)}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/p4-play.json"),JsonUtility.ToJson(proof,true));if(error==null)Debug.Log("P4 Mutant nitro/skill Play geçti: "+proof.checks.Count+" kontrol.");else Debug.LogException(error);
      EditorApplication.ExitPlaymode();if(Application.isBatchMode)EditorApplication.delayCall+=()=>EditorApplication.Exit(error==null?0:1);
    }
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","").ToLowerInvariant();}
  }
}
