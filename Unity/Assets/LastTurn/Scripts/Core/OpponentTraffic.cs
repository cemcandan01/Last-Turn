using System;

namespace LastTurn.Core
{
  // Sabit adımın salt araç anlık görüntüsü; fizik durumuna erişim/yazma yetkisi taşımaz.
  public readonly struct OpponentTrafficCar
  {
    public readonly double X,Y,Z,Vx,Vz,Heading,Width,Length;
    public readonly bool Upright;
    public OpponentTrafficCar(double x,double y,double z,double vx,double vz,double heading,double width,double length,bool upright=true)
    {X=x;Y=y;Z=z;Vx=vx;Vz=vz;Heading=heading;Width=width;Length=length;Upright=upright;}
    public static OpponentTrafficCar Read(PowertrainVehicle car)
    {var p=car.ReferencePoint;var b=car.Body;var f=b.Orientation.Rotate(new BodyVector(0,0,1));return new OpponentTrafficCar(p.X,b.Position.Y,p.Z,b.Velocity.X,b.Velocity.Z,Math.Atan2(f.X,f.Z),car.Parameters.Chassis.Width,car.Parameters.Chassis.Wheelbase+1.69,!FlipCounter.Flipped(b.Orientation));}
    public bool Valid=>Finite(X)&&Finite(Y)&&Finite(Z)&&Finite(Vx)&&Finite(Vz)&&Finite(Heading)&&Finite(Width)&&Finite(Length)&&Width>0&&Length>0;
    private static bool Finite(double v)=>!double.IsNaN(v)&&!double.IsInfinity(v);
  }
  public readonly struct OpponentTrafficFrame
  {
    public readonly OpponentTrafficCar Self,Other;
    public OpponentTrafficFrame(OpponentTrafficCar self,OpponentTrafficCar other){Self=self;Other=other;}
  }

  // Yakın trafik için hedef çizgi ve fren sınırı. Tur/sıra farkı kullanmaz; güç veya konum yazmaz.
  public sealed class OpponentTraffic
  {
    public double Offset {get;private set;}
    public double SpeedLimit {get;private set;}=double.PositiveInfinity;
    public string State {get;private set;}="serbest";
    public int Side {get;private set;}
    public int SideChanges {get;private set;}
    private bool committed;
    private bool beside;
    private bool anchored;
    private double target;
    private readonly int preference;
    public OpponentTraffic(uint seed){preference=(seed&1)==0?1:-1;}
    private static double Clamp(double v,double lo,double hi)=>Math.Max(lo,Math.Min(hi,v));
    private void Move(double desired,double dt){double step=1.2*dt;Offset+=Clamp(desired-Offset,-step,step);if(Math.Abs(Offset)<1e-10)Offset=0;}
    private void Release(double dt){committed=false;beside=false;anchored=false;Side=0;target=0;Move(0,dt);State=Offset==0?"serbest":"cizgiye-donus";}
    private readonly struct RoadPoint
    {
      public readonly double Along,Lane,Tx,Tz;
      public RoadPoint(double along,double lane,double tx,double tz){Along=along;Lane=lane;Tx=tx;Tz=tz;}
    }
    // Her araç kendi yol kesitine izdüşer; virajda öndeki aracın yanal sapması sahte engel üretmez.
    private static RoadPoint Project(OpponentPlan p,OpponentTrafficCar car,int hint)
    {
      double best=double.PositiveInfinity;var point=default(RoadPoint);int count=p.Open?p.N-1:p.N;
      for(int i=0;i<count;i++)
      {
        double route=p.S[i]-p.S[hint];if(!p.Open){if(route>p.Length/2)route-=p.Length;else if(route < -p.Length/2)route+=p.Length;}if(Math.Abs(route)>65)continue;
        int j=(i+1)%p.N;double dx=p.CenterX[j]-p.CenterX[i],dz=p.CenterZ[j]-p.CenterZ[i],sq=dx*dx+dz*dz;if(sq<1e-12)continue;
        double t=Clamp(((car.X-p.CenterX[i])*dx+(car.Z-p.CenterZ[i])*dz)/sq,0,1),x=p.CenterX[i]+t*dx,z=p.CenterZ[i]+t*dz,d=(car.X-x)*(car.X-x)+(car.Z-z)*(car.Z-z);
        if(d>=best)continue;best=d;double nx=p.Nx[i]*(1-t)+p.Nx[j]*t,nz=p.Nz[i]*(1-t)+p.Nz[j]*t,n=JsMath.Hypot(nx,nz),length=Math.Sqrt(sq);if(n<1e-9){nx=dz/length;nz=-dx/length;}else{nx/=n;nz/=n;}
        double along=p.S[i]+(j==0?p.Length-p.S[i]:p.S[j]-p.S[i])*t;if(!p.Open&&along>=p.Length)along-=p.Length;
        point=new RoadPoint(along,(car.X-x)*nx+(car.Z-z)*nz,dx/length,dz/length);
      }
      return point;
    }
    public void Step(OpponentPlan plan,int index,OpponentTrafficFrame? frame,double dt,bool allowed=true)
    {
      SpeedLimit=double.PositiveInfinity;
      if(!(dt>0)||double.IsNaN(dt)||double.IsInfinity(dt))return;
      if(!allowed){Offset=0;Release(dt);return;}
      if(!frame.HasValue||!frame.Value.Self.Valid||!frame.Value.Other.Valid||!frame.Value.Self.Upright){Release(dt);return;}
      var a=frame.Value.Self;var b=frame.Value.Other;
      double dx=b.X-a.X,dz=b.Z-a.Z,distance=JsMath.Hypot(dx,dz);
      if(distance>55||Math.Abs(b.Y-a.Y)>2.5){Release(dt);return;}
      var own=Project(plan,a,index);var other=Project(plan,b,index);
      if(Math.Sin(a.Heading)*own.Tx+Math.Cos(a.Heading)*own.Tz<.5||Math.Sin(b.Heading)*other.Tx+Math.Cos(b.Heading)*other.Tz<.5){Release(dt);return;}
      double along=other.Along-own.Along;if(!plan.Open){if(along>plan.Length/2)along-=plan.Length;else if(along < -plan.Length/2)along+=plan.Length;}
      double selfLane=own.Lane,otherLane=other.Lane;
      double separation=(a.Width+b.Width)/2+.7,span=(a.Length+b.Length)/2;
      if(Math.Abs(selfLane)>plan.HalfWidth+.8||Math.Abs(otherLane)>plan.HalfWidth+b.Width/2+1||along < -span-7||along>45){Release(dt);return;}
      double speed=JsMath.Hypot(a.Vx,a.Vz),otherSpeed=Math.Max(0,b.Vx*other.Tx+b.Vz*other.Tz);
      // Geçiş kararı bütün bakış aralığında kenara pay bırakır; dar/sert virajda yeni yan seçilmez.
      double limit=Math.Max(0,plan.HalfWidth-a.Width/2-1.8),min=-limit,max=limit;
      bool gentle=true;
      double look=Math.Max(24,plan.Look+plan.LookSpeed*speed);
      for(double d=0;d<=look;d+=4){int j=plan.Ahead(index,d);min=Math.Max(min,-limit-plan.Offset[j]);max=Math.Min(max,limit-plan.Offset[j]);if(Math.Abs(plan.Curvature[j])>.006)gentle=false;}
      if(min>max){min=max=0;gentle=false;}
      if(Math.Abs(along)<=span+3||(beside&&Math.Abs(along)<=span+5))
      {
        // Yan yana iken yeni geçiş tarafı veya oyuncuya geç kapatma seçilmez.
        // İlk hizalama yeni şerit seçmez: hedefi aracın zaten bulunduğu yana koyar.
        if(!anchored&&!committed){target=selfLane-plan.Offset[index];Offset=target;anchored=true;}
        beside=true;
        State="yan-yana";Move(Clamp(target,min,max),dt);
      }
      else if(along>0)
      {
        beside=false;anchored=false;
        if(!committed&&gentle&&limit>separation&&Math.Abs(selfLane-otherLane)<separation&&otherSpeed<speed+2)
        {
          double passingSeparation=separation+.5;
          double first=otherLane+preference*passingSeparation-plan.Offset[index],second=otherLane-preference*passingSeparation-plan.Offset[index];
          bool Fits(double delta)=>delta>=min&&delta<=max;
          double selected=Fits(first)?first:Fits(second)?second:double.NaN;
          if(!double.IsNaN(selected)){target=selected;committed=true;int side=Math.Sign(target);if(side!=0&&side!=Side){SideChanges++;Side=side;}}
        }
        if(committed){Move(Clamp(target,min,max),dt);State="gecis";}
        else{Move(0,dt);target=0;State="takip";}
      }
      else{State=committed?"gecisi-tamamla":"cizgiyi-koru";Move(Clamp(target,min,max),dt);}
      // Yalnız öndeki yakın araçla aynı koridordayken fren: uzaktaki oyuncunun tur temposuna bağlanmaz.
      if(along>0&&Math.Abs(selfLane-otherLane)<separation)
      {
        double free=along-span,safe=2+speed*.45;
        SpeedLimit=Math.Max(0,otherSpeed+(free-safe)*.6);
      }
    }
  }
}
