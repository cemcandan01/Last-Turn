using System;

namespace LastTurn.Core
{
  // Sabit adımın salt araç anlık görüntüsü; fizik durumuna erişim/yazma yetkisi taşımaz.
  public readonly struct OpponentTrafficCar
  {
    public readonly double X,Y,Z,Vx,Vz,Heading,Width,Length;
    public OpponentTrafficCar(double x,double y,double z,double vx,double vz,double heading,double width,double length)
    {X=x;Y=y;Z=z;Vx=vx;Vz=vz;Heading=heading;Width=width;Length=length;}
    public static OpponentTrafficCar Read(PowertrainVehicle car)
    {var p=car.ReferencePoint;var b=car.Body;var f=b.Orientation.Rotate(new BodyVector(0,0,1));return new OpponentTrafficCar(p.X,b.Position.Y,p.Z,b.Velocity.X,b.Velocity.Z,Math.Atan2(f.X,f.Z),car.Parameters.Chassis.Width,car.Parameters.Chassis.Wheelbase+1.69);}
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
    private double target;
    private readonly int preference;
    public OpponentTraffic(uint seed){preference=(seed&1)==0?1:-1;}
    private static double Clamp(double v,double lo,double hi)=>Math.Max(lo,Math.Min(hi,v));
    private void Move(double desired,double dt){double step=1.2*dt;Offset+=Clamp(desired-Offset,-step,step);if(Math.Abs(Offset)<1e-10)Offset=0;}
    private void Release(double dt){committed=false;beside=false;Side=0;target=0;Move(0,dt);State=Offset==0?"serbest":"cizgiye-donus";}
    public void Step(OpponentPlan plan,int index,OpponentTrafficFrame? frame,double dt,bool allowed=true)
    {
      SpeedLimit=double.PositiveInfinity;
      if(!(dt>0)||double.IsNaN(dt)||double.IsInfinity(dt))return;
      if(!allowed||!frame.HasValue||!frame.Value.Self.Valid||!frame.Value.Other.Valid){Release(dt);return;}
      var a=frame.Value.Self;var b=frame.Value.Other;
      double dx=b.X-a.X,dz=b.Z-a.Z,distance=JsMath.Hypot(dx,dz);
      if(distance>55||Math.Abs(b.Y-a.Y)>2.5||Math.Cos(b.Heading-a.Heading)<.5){Release(dt);return;}
      int ahead=plan.Ahead(index,4);double tx=plan.CenterX[ahead]-plan.CenterX[index],tz=plan.CenterZ[ahead]-plan.CenterZ[index],length=JsMath.Hypot(tx,tz);
      if(length<1e-6){Release(dt);return;}tx/=length;tz/=length;
      double along=dx*tx+dz*tz,nx=plan.Nx[index],nz=plan.Nz[index];
      double selfLane=(a.X-plan.CenterX[index])*nx+(a.Z-plan.CenterZ[index])*nz;
      double otherLane=(b.X-plan.CenterX[index])*nx+(b.Z-plan.CenterZ[index])*nz;
      double separation=(a.Width+b.Width)/2+.7,span=(a.Length+b.Length)/2;
      if(Math.Abs(otherLane)>plan.HalfWidth+b.Width/2+1||along < -span-7||along>45){Release(dt);return;}
      double speed=JsMath.Hypot(a.Vx,a.Vz),otherSpeed=Math.Max(0,b.Vx*tx+b.Vz*tz);
      // Geçiş kararı bütün bakış aralığında kenara pay bırakır; dar/sert virajda yeni yan seçilmez.
      double limit=Math.Max(0,plan.HalfWidth-a.Width/2-1.8),min=-limit,max=limit;
      bool gentle=true;
      double look=Math.Min(70,Math.Max(24,plan.Look+plan.LookSpeed*speed));
      for(double d=0;d<=look;d+=4){int j=plan.Ahead(index,d);min=Math.Max(min,-limit-plan.Offset[j]);max=Math.Min(max,limit-plan.Offset[j]);if(Math.Abs(plan.Curvature[j])>.006)gentle=false;}
      if(min>max){min=max=0;gentle=false;}
      if(Math.Abs(along)<=span+3)
      {
        // Yan yana iken yeni geçiş tarafı veya oyuncuya geç kapatma seçilmez.
        if(!beside&&!committed){target=Clamp(selfLane-plan.Offset[index],min,max);Offset=target;}
        beside=true;
        State="yan-yana";
      }
      else if(along>0)
      {
        beside=false;
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
      else{State=committed?"gecisi-tamamla":"cizgiyi-koru";}
      // Yalnız öndeki yakın araçla aynı koridordayken fren: uzaktaki oyuncunun tur temposuna bağlanmaz.
      if(along>0&&Math.Abs(selfLane-otherLane)<separation)
      {
        double free=along-span,safe=2+speed*.45;
        SpeedLimit=Math.Max(0,otherSpeed+(free-safe)*.6);
      }
    }
  }
}
