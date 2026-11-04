using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // TS yz/yarisci.ts: oyuncuyla aynı fizik ve nicemlenmiş girdi, gerçek tur/bitiş ve kaynak takılma dönüşü.
  // Araç-araç çarpışması TS 0.8.18'de yoktur; bu sınıf yeni temas/hasar kuralı eklemez.
  public sealed class OpponentRacer
  {
    public const double GridOffset=4.5;
    public readonly PowertrainVehicle Vehicle;public readonly TrackDefinition Track;public readonly IVehicleWorld World;public readonly OpponentPlan Plan;
    public OpponentPilot Pilot {get;private set;}
    public readonly int Laps,OpenFinishBack;public int Lap {get;private set;}public int Hint {get;private set;}public bool Armed {get;private set;}
    public double Time {get;private set;}public double? FinishTime {get;private set;}public int Returns {get;private set;}
    public readonly List<double> LapTimes=new List<double>();
    private double lapStart,lastProgress,stalled,beta;private readonly uint seed;private readonly InputRecording recording=new InputRecording();
    // TS rakipKurulumu: kaynak motor sınırı ve yarışın stok lastiği; GTTest'e özel geri kesicisi uygulanmaz.
    public static PowertrainParameters CreateParameters(VehicleCatalog catalog,CatalogSetup setup,string type)
    {var copy=GarageDriveParameters.Configure(catalog,setup,false);copy.Tire=catalog.RaceTire(type,Array.Empty<string>());return catalog.CreatePhysics(copy);}
    // TS oyun/rakip.ts: Mutant'ta yarış lastiği kullanılmaz; parça/önayar lastiği ve pasif/toprak dengesi korunur.
    public static CatalogSetup CreateMutantSetup(VehicleCatalog catalog,CatalogSetup setup,IEnumerable<string> passives=null!)
    {
      var state=CatalogNode.Obj();state.Set("pasifler",CatalogNode.Arr((passives??Array.Empty<string>()).Select(CatalogNode.Str)));state.Set("govde",CatalogNode.Num(100));
      return MutantVehicle.Configure(catalog,setup,state);
    }
    public static PowertrainParameters CreateMutantParameters(VehicleCatalog catalog,CatalogSetup setup,IEnumerable<string> passives=null!)
      =>catalog.CreatePhysics(CreateMutantSetup(catalog,setup,passives));
    public OpponentRacer(PowertrainParameters parameters,IVehicleWorld world,TrackDefinition track,RaceEventInfo info,OpponentPlan plan,uint seed,double startX,double startZ,double startHeading)
    {
      if(plan.TrackKey!=track.Key)throw new ArgumentException("Rakip planı pistle uyuşmuyor.");
      this.seed=seed;Track=track;World=world;Plan=plan;Laps=info.Laps>0?info.Laps:1;OpenFinishBack=info.Type=="dg"?1:4;
      Vehicle=new PowertrainVehicle(parameters,world:world);Vehicle.Place(startX,startZ,startHeading);Pilot=new OpponentPilot(plan,seed,startX,startZ);Hint=track.Geometry.Nearest(startX,startZ,0,true).Index;
    }
    public DrivingInput Step(bool started=true)
    {
      var position=Vehicle.ReferencePoint;var s=Vehicle.Body;var f=s.Orientation.Rotate(new BodyVector(0,0,1));double heading=Math.Atan2(f.X,f.Z);
      var input=Pilot.Step(position.X,position.Z,heading,s.Velocity.X,s.Velocity.Z,beta,PowertrainVehicle.FixedDelta,started);
      if(FinishTime.HasValue){double speed=JsMath.Hypot(s.Velocity.X,s.Velocity.Z);input=new DrivingInput(speed>12?0:Math.Min(input.Throttle,.3),speed>16?.3:0,input.Steering,true,true,input.Handbrake);}
      Vehicle.Step(recording.Record(input));beta=RaceDrift.Detect(Vehicle.Body).Beta;
      if(!started)return input;
      Time+=PowertrainVehicle.FixedDelta;var g=Track.Geometry;int previous=Hint;position=Vehicle.ReferencePoint;Hint=g.Nearest(position.X,position.Z,previous).Index;
      if(FinishTime.HasValue)return input;ReturnIfStuck();
      if(g.Open){if(Hint>g.N*.5)Armed=true;if(Armed&&Hint>=g.N-OpenFinishBack){Lap=1;LapTimes.Add(Time);FinishTime=Time;}return input;}
      if(Hint>g.N*.4&&Hint<g.N*.6)Armed=true;
      if(previous>g.N*.8&&Hint<g.N*.2&&Armed){Armed=false;Lap++;LapTimes.Add(Time-lapStart);lapStart=Time;if(Lap>=Laps)FinishTime=Time;}return input;
    }
    private void ReturnIfStuck()
    {
      var d=Pilot;if(d.Progress>lastProgress+5){lastProgress=d.Progress;stalled=0;return;}stalled+=PowertrainVehicle.FixedDelta;if(stalled<8)return;
      var g=Track.Geometry;int j=g.Open?Math.Max(0,Hint-3):(Hint-3+g.N)%g.N;double x=g.X[j],z=g.Z[j];Vehicle.Place(x,z,Math.Atan2(g.Tx[j],g.Tz[j]));recording.Clear();beta=0;
      Pilot=new OpponentPilot(Plan,seed,x,z){Mode="yaris",Time=d.Time,Lap=d.Lap,Progress=d.Progress,Recoveries=d.Recoveries,Stuck=-1.5};
      Hint=g.Nearest(x,z,Hint).Index;lastProgress=d.Progress;stalled=0;Returns++;
    }
    public static double TrackProgress(TrackGeometry g,int lap,int hint,bool armed)=>g.Open?g.S[hint]:lap*g.Length+(lap==0&&!armed&&hint>g.N*.5?g.S[hint]-g.Length:g.S[hint]);
    public double Progress=>FinishTime.HasValue?double.PositiveInfinity:TrackProgress(Track.Geometry,Lap,Hint,Armed);
    public (int Rank,double Gap,bool Finished) Rank(int playerLap,int playerHint,bool playerArmed)
    {double gap=TrackProgress(Track.Geometry,playerLap,playerHint,playerArmed)-Progress;return(gap>=0?1:2,gap,FinishTime.HasValue);}
    public bool PlayerWon(double playerFinishTime)=>!FinishTime.HasValue||playerFinishTime<FinishTime.Value;
  }
}
