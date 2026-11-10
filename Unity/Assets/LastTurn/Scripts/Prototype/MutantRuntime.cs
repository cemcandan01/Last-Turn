using System;
using System.IO;
using System.Linq;
using System.Globalization;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.Prototype
{
  // Unity sahne/disk sınırı. Koşu kuralları MutantGameSession/Run/RacePlan içinde kalır.
  public static class MutantRuntime
  {
    public static MutantRun Run {get;private set;}
    public static MutantGameSession Session {get;private set;}
    public static MutantRacePlan RacePlan {get;private set;}
    /// P4: nitro/skill tuşları, enerji adımı, fizik girdisi ve HUD görünüm modeli (kural durumu Run.State'te).
    public static MutantAbilityDriver Abilities {get;private set;}
    /// Yarışta rakibe skill ivmesi ve gövde güç kaybı (GtPrototype rakibi kurunca bağlar).
    public static MutantOpponentLink OpponentLink {get;set;}
    private static MutantSkillWorldFactory worlds;
    private static MutantRewards rewards;
    public static MutantRewardCard Reward(string offer,RewardSource source,bool cursed=false,string curse="")
    {
      if(!Active)throw new InvalidOperationException("Ödül görünümü için koşu gerekir.");
      if(rewards==null){var meta=Resources.Load<TextAsset>("mutant-reward-metadata");rewards=new MutantRewards(Run.Catalog,meta?meta.text:null);}
      return rewards.Read(Run,offer,source,GarageSession.Catalog,Car,cursed,curse);
    }
    public static int Car {get;private set;}=-1;
    public static string Panel {get;private set;}="";
    public static string Message {get;private set;}="";
    // Sunum için son gerçek bitiş kararı; oyuncu kaydına yazılmaz ve ödül üretmez.
    public static bool? ResultPassed {get;private set;}
    public static int MarkerId {get;private set;}
    public static bool Active=>Run!=null;
    public static string RecordDirectory {get;set;}="";
    public static bool InRace=>RacePlan!=null;
    public static bool Starting {get;private set;}
    public static bool Blocked=>Active&&(Panel!=""||GameFlow.Paused||Run.Finished||Run.State["faz"].S()=="secim");
    public static MutantMenuModel Model=>MutantMenuModel.Read(Run,GarageSession.Catalog,Car);
    public static MutantHudFeedback HudFeedback {get;private set;}=new MutantHudFeedback();
    public static MutantHudModel HudModel(double x,double z)=>MutantHudModel.Read(Run,Active?Model:null,Abilities,Session,x,z,InRace);
    private static BodyVector? returnPoint;private static double returnHeading;private static int refreshed;
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void Reset(){Run=null;Session=null;RacePlan=null;Abilities=null;OpponentLink=null;Car=-1;Panel="";Message="";ResultPassed=null;returnPoint=null;refreshed=0;RecordDirectory="";Starting=false;rewards=null;HudFeedback=new MutantHudFeedback();}
    public static void Start(uint seed,bool test=false)
    {
      GarageSession.EnsureLoaded();var asset=Resources.Load<TextAsset>("mutant-catalog");
      if(!asset)throw new InvalidOperationException("Mutant verisi bulunamadı.");
      Run=new MutantRun(seed,CatalogNode.Parse(asset.text),test&&DevAvailable);rewards=null;Session=null;RacePlan=null;Car=-1;Panel="start";Message="";ResultPassed=null;returnPoint=null;Starting=true;HudFeedback=new MutantHudFeedback();GameFlow.Pause(false);
    }
    // Yalnız ilk seçim ekranında gezinme; koşu/RNG/seçenekler yeniden üretilmez.
    public static void BackToStartingCars(){if(Starting&&Panel=="choice")Panel="start";}
    public static void SelectCar(int car)
    {
      if(!MutantMenuModel.StartingCars((uint)Run.State["tohum"].N(),Run.Catalog,Run.IsTest).Contains(car))return;
      Car=car;var ramp=WorldData.Catalog.Region("hub").Teleports.First(t=>t.Name=="Zıplama rampası");
      Session=new MutantGameSession(Run,GarageSession.Catalog,car,ramp.X,ramp.Z);Panel="choice";
      if(worlds==null){var asset=Resources.Load<TextAsset>("mutant-skill-world");if(!asset)throw new InvalidOperationException("Mutant skill dünyası bulunamadı.");worlds=new MutantSkillWorldFactory(asset.text);}
      Abilities=new MutantAbilityDriver(Run,worlds);Session.EnergyAndSkills=Abilities.Step;HudFeedback.Observe(Run,Abilities);
    }
    public static bool Choose(string id,string drop="")
    {if(Session==null||!Run.Choose(id,drop))return false;if(Run.State["faz"].S()=="secim")return true;bool first=Starting;OpenWorld();if(first&&TestRun)Panel="lab";return true;}

    // ---- TS mutant-ui.ts DEV test laboratuvarı: yalnız geliştirme yapısında (TS import.meta.env.DEV || /dev/).
    public static bool DevAvailable=>Debug.isDebugBuild;
    public static bool TestRun=>Active&&Run.IsTest;
    /// TS drift ölçümleri (driftDevGoster): test koşusundaki MUTANT drift yarışında tanı satırı.
    public static bool DriftDiagnostics=true;
    /// Başlangıç ekranında aynı tohumla test/normal koşuya geçiş (TS mDevSec).
    public static void ToggleTest(){if(!Active||!Starting||!DevAvailable)return;Start((uint)Run.State["tohum"].N(),!Run.IsTest);}
    public static void OpenLab(){if(TestRun&&!Starting&&(Panel==""||Panel=="lab"))Panel="lab";}
    /// TS mutantKurulumUygula: lab değişikliği aracın değerlerine sonraki adımda işlenir.
    private static void Apply(){Session?.SelectCar(Car);}
    public static bool LabSetup(string kind,string id){if(!TestRun||!Run.TestSetup(kind,id))return false;Apply();return true;}
    public static bool LabSkill(string id,int level,string evolution,string[] addons){if(!TestRun||!Run.TestSkill(id,level,evolution,addons))return false;Apply();return true;}
    public static bool LabReset(){if(!TestRun||!Run.TestReset())return false;Abilities?.Energy.ResetObservation();Apply();return true;}
    public static bool LabTimer(){if(!TestRun||!Run.TestTimer())return false;Session?.ClearPendingBoss();return true;}
    /// TS labBolge: sonraki bölge, haritaya dönüş, panel açık kalır.
    public static bool LabNextRegion(){if(!TestRun||!Run.TestRegion(Math.Min(3,Run.Region+1)))return false;returnPoint=null;Apply();OpenWorld();Panel="lab";return true;}
    /// TS labSehir: Kule Şehri girişine (bölge 2'ye atlar) ve sürüşe devam.
    public static bool LabCity(){if(!TestRun||(Run.Region<2&&!Run.TestRegion(2)))return false;returnPoint=null;Apply();OpenWorld();return true;}
    /// TS labDrift: bölgenin drift etkinliğini yeniden açıp risk 0 ile başlatır.
    public static bool LabDrift()
    {
      if(!TestRun)return false;var e=Run.State["etkinlikler"].Items.FirstOrDefault(x=>x["ty"].S()=="dp");
      if(e==null){Message="Bu bölgede drift etkinliği yok";return false;}
      e.Set("yapildi",CatalogNode.Parse("false"));if(e.Has("kapora"))e.Remove("kapora");Run.TestTimer();Session?.ClearPendingBoss();
      // Yarıştan açıldıysa dönüş noktası açık dünyadaki son konumda kalır (TS haritayaDon → mutant.donus).
      StartRace((int)e["id"].N(),0,false,InRace);return true;
    }
    /// TS labTekrar: test sayacı yenilenir, aynı MUTANT yarışı baştan.
    public static bool LabRestartRace(){if(!TestRun||!InRace)return false;Run.TestTimer();Session?.ClearPendingBoss();Panel="";var p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(p)p.RestartRace();return true;}
    public static void OpenWorld()
    {
      Starting=false;RacePlan=null;Panel="";GameFlow.Pause(false);WorldData.PrepareMutantWorld(Run.Region>=2?"city":"hub");
      SceneManager.LoadScene("GTTest");
    }
    public static void PlaceWorld(PowertrainVehicle vehicle)
    {
      if(returnPoint.HasValue){var p=returnPoint.Value;vehicle.Place(p.X,p.Z,returnHeading);return;}
      var p2=WorldData.Catalog.Region(Run.Region>=2?"city":"hub").Teleports[0];vehicle.Place(p2.X,p2.Z,p2.Heading);
    }
    public static void Refresh(PowertrainVehicle vehicle)
    {
      if(Session==null||refreshed==Session.VehicleRefreshes)return;
      vehicle.Reconfigure(Session.BuildPhysics());refreshed=Session.VehicleRefreshes;
    }
    private static double Heading(VehicleState body){var f=body.Orientation.Rotate(new BodyVector(0,0,1));return Math.Atan2(f.X,f.Z);}
    public static bool AfterPhysics(PowertrainVehicle vehicle,IVehicleWorld world,bool raceStarted=true,OpponentRacer opponent=null)
    {
      if(!Active||Session==null)return true;
      var p=vehicle.ReferencePoint;var drift=RaceDrift.Detect(vehicle.Body,vehicle.Assist.On);
      var near=world is IVehicleCollisionWorld collision?collision.Near(p.X,p.Z,vehicle.Body.Position.Y).ToArray():Array.Empty<WorldObstacle>();
      var obstacles=near.Where(o=>o.Type=="solid"||o.Type=="box").Select(o=>new MutantRoadObstacle("e:"+o.X.ToString("F1",CultureInfo.InvariantCulture)+","+o.Z.ToString("F1",CultureInfo.InvariantCulture),o.X,o.Z,o.Type=="box"?JsMath.Hypot(o.HalfX,o.HalfZ):o.Radius)).ToArray();
      var b=vehicle.Body;CatalogNode rival=null;
      if(opponent!=null)
      {
        var o=opponent.Vehicle.ReferencePoint;var ob=opponent.Vehicle.Body;rival=CatalogNode.Obj();rival.Set("id",CatalogNode.Str("rakip"));
        foreach(var (k,v) in new[]{("x",o.X),("z",o.Z),("h",Heading(ob)),("vx",ob.Velocity.X),("vz",ob.Velocity.Z)})rival.Set(k,CatalogNode.Num(v));
      }
      Abilities?.BeginStep(new MutantAbilityContext{X=p.X,Z=p.Z,Heading=Heading(b),Vx=b.Velocity.X,Vz=b.Velocity.Z,Y=b.Position.Y,Vy=b.Velocity.Y,
        Ground=world.Height(p.X,p.Z),Steering=vehicle.Engine.Steering,Beta=drift.Beta,Airborne=b.Airborne,DriftOn=vehicle.Assist.On,
        DriftDirection=vehicle.Assist.Dir,DriftCool=vehicle.Assist.Cool,Racing=InRace,RaceRunning=raceStarted,Track=RacePlan?.Track.Geometry,Opponent=rival,Obstacles=near});
      string hudNote="";
      foreach(var e in Session.Step(new MutantSessionInput{X=p.X,Z=p.Z,Speed=drift.Speed,Hit=vehicle.Body.LastHitTime,Beta=drift.Beta,
        Racing=InRace,RaceStarted=raceStarted,HasSimulation=true,Drifting=drift.Active,Airborne=!vehicle.Body.Wheels.Any(w=>w.Contact),Obstacles=obstacles},PowertrainVehicle.FixedDelta))
      {
        if(e.Kind=="isaret"){Panel=e.Detail=="etkinlik"?"event":e.Detail=="sandik"?"chest":e.Detail=="atolye"?"shop":"boss";MarkerId=e.Id??0;if(Panel=="chest")Run.ChestOffer(MarkerId);}
        else if(e.Kind=="sureDoldu")Panel="boss";
        else if(e.Kind=="hasar"){if(e.Wrecked)Panel="summary";else {hudNote=(e.Detail=="carpma"?"Çarpma":"Spin")+" · Gövde "+Math.Round(Run.State["govde"].N()).ToString("0");if(!LastTurn.Ui.MutantHudView.OwnsDrive)TouchDrivingOverlay.Note(hudNote,1.4f);}}
        else if(e.Kind=="gorev"){Message=e.Detail=="tamam"?"Yol görevi tamamlandı.":e.Detail=="kacti"?"Yol görevi kaçtı.":MutantRoadMissions.Name(e.Mission.Mission);hudNote=Message;}
      }
      if(Abilities!=null)
      {
        if(opponent!=null&&OpponentLink!=null&&Abilities.OpponentEffect)OpponentLink.Apply(opponent.Vehicle,Abilities.OpponentAcceleration,Abilities.OpponentBody);
        vehicle.SkillInput=Abilities.Physics(PowertrainVehicle.FixedDelta);
      }
      HudFeedback.Observe(Run,Abilities);if(hudNote!="")HudFeedback.Note(hudNote);
      Refresh(vehicle);return !Blocked;
    }
    public static void ClosePanel(){Panel="";Message="";}
    public static bool Buy(string id){if(!Active||Session==null)return false;var part=Run.Catalog["parts"].Items.FirstOrDefault(p=>p["id"].S()==id);if(part==null||!Run.BuyPart(id,(int)part["sv"].N()))return false;Session.SelectCar(Car);return true;}
    public static bool Repair(){if(!Active||Session==null||!Run.Repair())return false;Session.SelectCar(Car);return true;}
    public static bool RefreshStock()=>Active&&Run.RefreshStock();
    public static void Chest(bool accept){var offer=Run.ChestOffer(MarkerId);if(accept&&offer!=null)Run.AcceptChest(MarkerId,offer);else Run.RejectChest(MarkerId);Session.SelectCar(Car);ClosePanel();}
    // Yeni görünüm teklif üretmez; gerçek işarette önceden hazırlanmış aynı teklif tüketilir.
    public static bool ResolveChest(int id,string offer,bool accept)
    {
      if(!Active||Session==null||Panel!="chest"||MarkerId!=id)return false;
      var row=Model.Chests.FirstOrDefault(c=>c.Id==id);
      if(row==null||row.Opened||!row.Inspected||row.Offer!=offer)return false;
      bool done=accept?Run.AcceptChest(id,offer):Run.RejectChest(id);
      if(done){Session.SelectCar(Car);ClosePanel();}return done;
    }
    public static void StartRace(int eventId,int risk,bool boss=false,bool keepReturn=false)
    {
      var p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(p&&!keepReturn){returnPoint=p.Simulation.ReferencePoint;var f=p.Simulation.Body.Orientation.Rotate(new BodyVector(0,0,1));returnHeading=Math.Atan2(f.X,f.Z);}
      var data=RaceData.Load();RacePlan=MutantRacePlan.Create(Run,Car,eventId,risk,boss,data.Events,data.Tracks,WorldData.Catalog);
      if(boss){Run.EnterBoss();Session.ClearPendingBoss();}else Run.LockDeposit(eventId);
      Panel="";Message="";ResultPassed=null;GameFlow.Pause(false);WorldData.Clear();SceneManager.LoadScene("RaceTest");
    }
    public static void Finished(RaceRun race,OpponentRacer opponent)
    {
      bool passed=RacePlan.Passed(race.Session,opponent);
      ResultPassed=passed;
      if(RacePlan.Boss)
      {
        int region=Run.Region;Run.FinishBoss(passed);if(Run.Region!=region)returnPoint=null;
        try{new MutantRecordStore(RecordDirectory!=""?RecordDirectory:Path.Combine(Application.persistentDataPath,"LastTurnMutant")).AfterBossResult(Run.State["faz"].S(),Run.Region,(int)Run.State["yenilenBoss"].N());}
        catch(Exception e){Message="Mutant rekoru yazılamadı: "+e.Message;}
      }
      else Run.FinishEvent(RacePlan.EventId,passed,RacePlan.Risk,RacePlan.BeatOpponent(race.Session,opponent));
      Message=(passed?"Hedef geçildi.":"Hedef kaçırıldı.")+" "+Message;Panel=Run.Finished?"summary":"result";
    }
    public static void Continue()
    {
      if(Run.Finished){Exit();return;}
      if(Run.State["faz"].S()=="secim"){Panel="choice";return;}
      if(Session.PendingBoss){Panel="boss";return;}
      OpenWorld();
    }
    public static void Exit(){Reset();WorldData.Clear();GameFlow.MutantMenu();SceneManager.LoadScene("Garage");}
    /// Mutant menüsü: en iyi koşu (bölge, yenilen boss).
    public static MutantRecord Record(){try{return new MutantRecordStore(RecordDirectory!=""?RecordDirectory:Path.Combine(Application.persistentDataPath,"LastTurnMutant")).Load();}catch(Exception){return new MutantRecord();}}
    public static MutantSummaryModel Summary()
    {
      try{var store=new MutantRecordStore(RecordDirectory!=""?RecordDirectory:Path.Combine(Application.persistentDataPath,"LastTurnMutant"));var record=store.Load();return MutantSummaryModel.Read(Run,record,Message,!store.ReadOnly);}
      catch(Exception){return MutantSummaryModel.Read(Run,new MutantRecord(),Message,false);}
    }
  }
}
