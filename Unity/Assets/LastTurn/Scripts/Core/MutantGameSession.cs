#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  public sealed class MutantSessionInput
  {
    public double X,Z,Speed,Hit=-9,Beta;
    public bool Racing,HasSimulation,RaceStarted=true,Drifting,Airborne;
    public IReadOnlyList<MutantRoadObstacle> Obstacles=Array.Empty<MutantRoadObstacle>();
  }
  public sealed class MutantSessionEvent
  {
    public readonly string Kind;
    public readonly string Detail;
    public readonly int? Id;
    public readonly bool Wrecked;
    public readonly MutantRoadMissionEvent? Mission;
    public MutantSessionEvent(string kind,string detail="",int? id=null,bool wrecked=false,MutantRoadMissionEvent? mission=null)
    {Kind=kind;Detail=detail;Id=id;Wrecked=wrecked;Mission=mission;}
  }

  // mutant.ts mutantAdimi/yolGoreviAdimi: fizik sonrasındaki kaynak sıra korunur.
  // P4 enerji ve skill yürütücüsü callback sınırıdır; bu sınıf bunları taklit etmez.
  public sealed class MutantGameSession
  {
    public MutantRun Run {get;}
    public MutantMarkerState Markers {get;}=new MutantMarkerState{Inside="a",Closed="a"};
    public MutantRoadMissionState Missions {get;}=new MutantRoadMissionState();
    public bool PendingBoss {get;private set;}
    public double LastHit {get;private set;}=-9;
    public bool Spinning {get;private set;}
    public int SelectedCar {get;private set;}
    public int VehicleRefreshes {get;private set;}
    public Func<MutantGameSession,MutantSessionInput,double,bool,bool>? EnergyAndSkills;
    private readonly VehicleCatalog vehicles;
    private readonly double rampX,rampZ;
    public MutantGameSession(MutantRun run,VehicleCatalog vehicles,int selectedCar,double rampX,double rampZ)
    {Run=run;this.vehicles=vehicles;SelectedCar=selectedCar;this.rampX=rampX;this.rampZ=rampZ;}
    public void SelectCar(int index){SelectedCar=index;VehicleRefreshes++;}
    public void ClearPendingBoss(){PendingBoss=false;}
    public CatalogSetup BuildSetup()=>MutantVehicle.Configure(vehicles,vehicles.Setup(SelectedCar,Run.State["parcalar"].Items.Select(p=>p.S())),Run.State);
    public PowertrainParameters BuildPhysics()=>vehicles.CreatePhysics(BuildSetup());
    private string Phase=>Run.State["faz"].S();
    public IReadOnlyList<MutantSessionEvent> Step(MutantSessionInput input,double dt)
    {
      var events=new List<MutantSessionEvent>();bool hit=false;
      if(Phase=="surus"||Phase=="boss")
      {
        if(input.Hit<LastHit)LastHit=input.Hit;
        string? damage=null;
        if(input.Hit>LastHit+.25){LastHit=input.Hit;damage="carpma";}
        bool spin=Math.Abs(input.Beta)>1.3&&input.Speed>4;
        if(spin&&!Spinning&&damage==null)damage="spin";
        Spinning=Math.Abs(input.Beta)>.4&&(Spinning||spin);hit=damage=="carpma";
        if(damage!=null)
        {
          bool wrecked=Run.Damage(damage);VehicleRefreshes++;
          events.Add(new MutantSessionEvent("hasar",damage,wrecked:wrecked));if(wrecked)return events;
        }
        if(input.HasSimulation&&EnergyAndSkills?.Invoke(this,input,dt,hit)==true)VehicleRefreshes++;
      }
      if(Phase=="surus"&&Run.Advance(dt)=="boss")
      {
        if(input.Racing)PendingBoss=true;else events.Add(new MutantSessionEvent("sureDoldu"));return events;
      }
      if(input.Racing||Phase!="surus")return events;
      if(input.HasSimulation&&!Run.State["test"].B())
      {
        var mission=MutantRoadMissions.Step(Missions,new MutantRoadMissionInput{
          Speed=input.Speed,X=input.X,Z=input.Z,Airborne=input.Airborne,Drifting=input.Drifting,Hit=hit,
          Obstacles=Missions.Active?.Kind=="kilpayi"?input.Obstacles:Array.Empty<MutantRoadObstacle>()},dt,()=>{
          uint seed;unchecked{seed=((uint)Run.State["tohum"].N()^0x3c6ef372u)+(uint)(Missions.Completed*131)+(uint)Math.Floor(Run.State["zaman"].N()+.5);}
          var random=new SeededRandom(seed);double vmax=vehicles.Data["cars"][SelectedCar]["vmax"].N(150);
          return MutantRoadMissions.Draw(random.Next,Run.Region,vmax,JsMath.Hypot(input.X-rampX,input.Z-rampZ));
        });
        if(mission!=null)
        {
          if(mission.Kind=="tamam")
          {
            Run.State.Set("para",CatalogNode.Num(Run.State["para"].N()+mission.Mission.Money));var energy=Run.State["mek"];
            energy.Set("enerji",CatalogNode.Num(Math.Min(energy["kapasite"].N(),energy["enerji"].N()+mission.Mission.Energy)));
          }
          events.Add(new MutantSessionEvent("gorev",mission.Kind,mission:mission));
        }
      }
      bool city=Run.Region>=2;var shop=Run.Catalog[city?"cityWorkshop":"workshop"];var boss=Run.Catalog[city?"cityBoss":"bossPlace"];
      var marker=MutantMarkerGate.Step(Markers,new MutantMarkerInput{
        Racing=input.Racing,Phase=Phase,X=input.X,Z=input.Z,Speed=input.Speed,
        Events=Run.State["etkinlikler"].Items.Select(e=>new MutantMarkerPoint((int)e["id"].N(),e["x"].N(),e["z"].N(),e["yapildi"].B())).ToArray(),
        Chests=Run.State["sandiklar"].Items.Select(e=>new MutantMarkerPoint((int)e["id"].N(),e["x"].N(),e["z"].N(),e["acildi"].B())).ToArray(),
        WorkshopX=shop[0].N(),WorkshopZ=shop[1].N(),BossX=boss[0].N(),BossZ=boss[1].N()},dt);
      if(marker!=null)events.Add(new MutantSessionEvent("isaret",marker.Kind,marker.Id));return events;
    }
  }
}
