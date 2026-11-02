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
    public static int Car {get;private set;}=-1;
    public static string Panel {get;private set;}="";
    public static string Message {get;private set;}="";
    public static int MarkerId {get;private set;}
    public static bool Active=>Run!=null;
    public static string RecordDirectory {get;set;}="";
    public static bool InRace=>RacePlan!=null;
    public static bool Blocked=>Active&&(Panel!=""||GameFlow.Paused||Run.Finished||Run.State["faz"].S()=="secim");
    public static MutantMenuModel Model=>MutantMenuModel.Read(Run,GarageSession.Catalog,Car);
    private static BodyVector? returnPoint;private static double returnHeading;private static int refreshed;
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void Reset(){Run=null;Session=null;RacePlan=null;Car=-1;Panel="";Message="";returnPoint=null;refreshed=0;RecordDirectory="";}
    public static void Start(uint seed)
    {
      GarageSession.EnsureLoaded();var asset=Resources.Load<TextAsset>("mutant-catalog");
      if(!asset)throw new InvalidOperationException("Mutant verisi bulunamadı.");
      Run=new MutantRun(seed,CatalogNode.Parse(asset.text));Session=null;RacePlan=null;Car=-1;Panel="start";Message="";returnPoint=null;GameFlow.Pause(false);
    }
    public static void SelectCar(int car)
    {
      if(!MutantMenuModel.StartingCars((uint)Run.State["tohum"].N(),Run.Catalog).Contains(car))return;
      Car=car;var ramp=WorldData.Catalog.Region("hub").Teleports.First(t=>t.Name=="Zıplama rampası");
      Session=new MutantGameSession(Run,GarageSession.Catalog,car,ramp.X,ramp.Z);Panel="choice";
    }
    public static bool Choose(string id,string drop="")
    {if(Session==null||!Run.Choose(id,drop))return false;if(Run.State["faz"].S()=="secim")return true;OpenWorld();return true;}
    public static void OpenWorld()
    {
      RacePlan=null;Panel="";GameFlow.Pause(false);WorldData.PrepareMutantWorld(Run.Region>=2?"city":"hub");
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
    public static bool AfterPhysics(PowertrainVehicle vehicle,IVehicleWorld world,bool raceStarted=true)
    {
      if(!Active||Session==null)return true;
      var p=vehicle.ReferencePoint;var drift=RaceDrift.Detect(vehicle.Body,vehicle.Assist.On);
      var obstacles=world is IVehicleCollisionWorld collision?collision.Near(p.X,p.Z,vehicle.Body.Position.Y)
        .Where(o=>o.Type=="solid"||o.Type=="box").Select(o=>new MutantRoadObstacle("e:"+o.X.ToString("F1",CultureInfo.InvariantCulture)+","+o.Z.ToString("F1",CultureInfo.InvariantCulture),o.X,o.Z,o.Type=="box"?JsMath.Hypot(o.HalfX,o.HalfZ):o.Radius)).ToArray():Array.Empty<MutantRoadObstacle>();
      foreach(var e in Session.Step(new MutantSessionInput{X=p.X,Z=p.Z,Speed=drift.Speed,Hit=vehicle.Body.LastHitTime,Beta=drift.Beta,
        Racing=InRace,RaceStarted=raceStarted,HasSimulation=true,Drifting=drift.Active,Airborne=!vehicle.Body.Wheels.Any(w=>w.Contact),Obstacles=obstacles},PowertrainVehicle.FixedDelta))
      {
        if(e.Kind=="isaret"){Panel=e.Detail=="etkinlik"?"event":e.Detail=="sandik"?"chest":e.Detail=="atolye"?"shop":"boss";MarkerId=e.Id??0;if(Panel=="chest")Run.ChestOffer(MarkerId);}
        else if(e.Kind=="sureDoldu")Panel="boss";
        else if(e.Kind=="hasar"&&e.Wrecked)Panel="summary";
        else if(e.Kind=="gorev")Message=e.Detail=="tamam"?"Yol görevi tamamlandı.":e.Detail=="kacti"?"Yol görevi kaçtı.":MutantRoadMissions.Name(e.Mission.Mission);
      }
      Refresh(vehicle);return !Blocked;
    }
    public static void ClosePanel(){Panel="";Message="";}
    public static void Buy(string id){var row=Model.Stock.First(s=>s.Id==id);var part=Run.Catalog["parts"].Items.First(p=>p["id"].S()==id);if(Run.BuyPart(id,(int)part["sv"].N()))Session.SelectCar(Car);}
    public static void Repair(){if(Run.Repair())Session.SelectCar(Car);}
    public static void RefreshStock(){Run.RefreshStock();}
    public static void Chest(bool accept){var offer=Run.ChestOffer(MarkerId);if(accept&&offer!=null)Run.AcceptChest(MarkerId,offer);else Run.RejectChest(MarkerId);Session.SelectCar(Car);ClosePanel();}
    public static void StartRace(int eventId,int risk,bool boss=false)
    {
      var p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(p){returnPoint=p.Simulation.ReferencePoint;var f=p.Simulation.Body.Orientation.Rotate(new BodyVector(0,0,1));returnHeading=Math.Atan2(f.X,f.Z);}
      var data=RaceData.Load();RacePlan=MutantRacePlan.Create(Run,Car,eventId,risk,boss,data.Events,data.Tracks,WorldData.Catalog);
      if(boss)Run.EnterBoss();else Run.LockDeposit(eventId);
      Panel="";Message="";GameFlow.Pause(false);WorldData.Clear();SceneManager.LoadScene("RaceTest");
    }
    public static void Finished(RaceRun race,OpponentRacer opponent)
    {
      bool passed=RacePlan.Passed(race.Session,opponent);
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
    public static void Exit(){Reset();WorldData.Clear();GameFlow.MainMenu();SceneManager.LoadScene("Garage");}
  }
}
