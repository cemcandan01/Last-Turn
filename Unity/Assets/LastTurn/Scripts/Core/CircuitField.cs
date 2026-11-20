using System;

namespace LastTurn.Core
{
  // Araçlar aynı sabit adımda sürer. Sürücüler kararlarını adım başındaki görüntüden alır.
  public sealed class CircuitField
  {
    public readonly OpponentRacer[] Rivals;
    public readonly string[] Names;
    private readonly PowertrainVehicle[] cars;
    private readonly OpponentTrafficCar[] snapshot;
    private readonly double[] distance;
    private readonly double[] finish;
    public readonly int[] Order;
    public int PlayerRank { get; private set; }
    public int PlayerContacts { get; private set; }
    public double PassNoticeUntil { get; private set; }

    public bool Knockout {get;}
    public int Remaining {get;private set;}
    private readonly int[] completed,place;
    public bool IsOut(int id)=>place[id]>0;

    public CircuitField(PowertrainVehicle player, OpponentRacer[] rivals, string[] names,bool knockout=false)
    {
      Rivals=rivals; Names=names;
      int n=rivals.Length+1;
      cars=new PowertrainVehicle[n]; snapshot=new OpponentTrafficCar[n];
      distance=new double[n]; finish=new double[n]; Order=new int[n];
      Knockout=knockout;Remaining=n;completed=new int[n];place=new int[n];
      cars[0]=player;
      for(int i=1;i<n;i++) cars[i]=rivals[i-1].Vehicle;
      for(int i=0;i<n;i++) Order[i]=i;
    }

    public void Capture()
    {
      for(int i=0;i<cars.Length;i++) snapshot[i]=OpponentTrafficCar.Read(cars[i]);
    }

    public bool Drive()
    {
      for(int i=1;i<cars.Length;i++)
      {
        if(IsOut(i))continue;
        int nearest=0; double best=double.PositiveInfinity;
        var self=snapshot[i];
        for(int j=0;j<cars.Length;j++)
        {
          if(j==i || IsOut(j)) continue;
          var other=snapshot[j]; double dx=other.X-self.X,dz=other.Z-self.Z;
          double along=dx*Math.Sin(self.Heading)+dz*Math.Cos(self.Heading);
          if(along < -self.Length || Math.Abs(self.Y-other.Y)>2) continue;
          double separation=dx*dx+dz*dz;
          if(separation<best){best=separation;nearest=j;}
        }
        Rivals[i-1].Step(traffic:double.IsPositiveInfinity(best)?(OpponentTrafficCar?)null:snapshot[nearest],nearby:snapshot);
      }
      bool touched=false;
      for(int i=0;i<cars.Length;i++) for(int j=i+1;j<cars.Length;j++)
      {
        if(!IsOut(i) && !IsOut(j) && VehicleContact.Resolve(cars[i],cars[j]) && i==0) touched=true;
      }
      if(touched) PlayerContacts++;
      return touched;
    }

    internal static double Progress(TrackGeometry g, PowertrainVehicle car,int lap,int hint,bool armed)
    {
      var p=car.ReferencePoint;
      return OpponentRacer.TrackProgress(g,lap,hint,armed)+(p.X-g.X[hint])*g.Tx[hint]+(p.Z-g.Z[hint])*g.Tz[hint];
    }
    public void UpdateOrder(RaceRun race)
    {
      var s=race.Session; var g=race.World.Geometry;
      completed[0]=s.Lap;
      distance[0]=Progress(g,cars[0],s.Lap,race.World.Hint,s.Armed!=0);
      finish[0]=s.State==RaceState.Finished?s.Time:double.PositiveInfinity;
      for(int i=1;i<cars.Length;i++)
      {
        var rival=Rivals[i-1];
        completed[i]=rival.Lap;
        distance[i]=Progress(g,cars[i],rival.Lap,rival.Hint,rival.Armed);
        finish[i]=rival.FinishTime??double.PositiveInfinity;
      }
      // Eşit ilerlemede önceki sıra korunur.
      for(int i=1;i<Order.Length;i++)
      {
        int id=Order[i], j=i;
        while(j>0 && Ahead(id,Order[j-1])){Order[j]=Order[j-1];j--;}
        Order[j]=id;
      }
      if(Knockout && Remaining>2){
        int gate=Order.Length-Remaining+1, crossed=0;
        for(int i=0;i<Remaining;i++)if(completed[Order[i]]>=gate)crossed++;
        if(crossed>=Remaining-1){
          int last=Order[Remaining-1];place[last]=Remaining--;
          if(last==0)race.EndElimination();
        }
      }
      if(Knockout && Remaining==2 && completed[Order[0]]>=3)race.EndElimination();
      int rank=Array.IndexOf(Order,0)+1;
      if(PlayerRank>rank && s.State==RaceState.Running && s.Time>1) PassNoticeUntil=s.Time+1.5;
      PlayerRank=rank;
    }
    private bool Ahead(int a,int b) => place[a]!=place[b] ? place[a]<place[b] : Knockout && completed[a]!=completed[b] ? completed[a]>completed[b] : finish[a]!=finish[b] ? finish[a]<finish[b] :
      double.IsPositiveInfinity(finish[a]) && distance[a]>distance[b]+.05;
  }

  public static class VehicleContact
  {
    // Yönelimli gövde kutuları, yatay minimum ayrışma ekseni ve iki kütleye ortak darbe.
    public static bool Resolve(PowertrainVehicle first,PowertrainVehicle second)
    {
      var a=OpponentTrafficCar.Read(first); var b=OpponentTrafficCar.Read(second);
      double dx=b.X-a.X,dz=b.Z-a.Z;
      if(Math.Abs(a.Y-b.Y)>1.5 || dx*dx+dz*dz>Math.Pow((a.Length+b.Length+a.Width+b.Width)*.5,2)) return false;
      double ax=Math.Sin(a.Heading),az=Math.Cos(a.Heading),bx=Math.Sin(b.Heading),bz=Math.Cos(b.Heading);
      double depth=double.PositiveInfinity,nx=0,nz=0;
      bool Axis(double x,double z)
      {
        double ra=(Math.Abs(ax*x+az*z)*a.Length+Math.Abs(az*x-ax*z)*a.Width)*.5;
        double rb=(Math.Abs(bx*x+bz*z)*b.Length+Math.Abs(bz*x-bx*z)*b.Width)*.5;
        double d=dx*x+dz*z, overlap=ra+rb-Math.Abs(d);
        if(overlap<=0) return false;
        if(overlap<depth){depth=overlap;nx=d<0?-x:x;nz=d<0?-z:z;}
        return true;
      }
      if(!Axis(ax,az)||!Axis(az,-ax)||!Axis(bx,bz)||!Axis(bz,-bx)) return false;
      var normal=new BodyVector(nx,0,nz);
      double ia=1/first.Parameters.Chassis.Mass,ib=1/second.Parameters.Chassis.Mass;
      var correction=normal*((depth+.001)/(ia+ib));
      first.Body.Position-=correction*ia; second.Body.Position+=correction*ib;
      double speed=BodyVector.Dot(first.Body.Velocity-second.Body.Velocity,normal);
      if(speed>0)
      {
        var impulse=normal*(1.08*speed/(ia+ib));
        first.Body.Velocity-=impulse*ia; second.Body.Velocity+=impulse*ib;
        if(speed>2){Impact(first.Body,speed);Impact(second.Body,speed);}
      }
      return true;
    }
    private static void Impact(VehicleState state,double speed)
    {
      state.LastImpactSpeed=speed;
      state.LastHitTime=state.Steps*PowertrainVehicle.FixedDelta;
      state.CollisionCount++;
    }
  }
}
