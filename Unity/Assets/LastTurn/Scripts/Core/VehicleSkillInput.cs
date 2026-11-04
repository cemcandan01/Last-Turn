using System;

namespace LastTurn.Core
{
  public sealed class VehicleAirControl
  {
    public bool Held;
    public double Pitch,Yaw;
  }
  public sealed class VehicleFlightInput
  {
    public double Vertical,Balance;
    public double? Forward,Descent,Yaw;
    public VehicleAirControl Air=null!;
  }
  // TS FizikBaglami.dis/ucus. Yoksa eski fizik adımı aynı işlem sırasını korur.
  public sealed class VehicleSkillInput
  {
    public double X,Z;
    public bool Ghost;
    public VehicleFlightInput Flight=null!;
  }
  public static class VehicleFlightControl
  {
    private static double Clamp(double n,double lo,double hi)=>Math.Max(lo,Math.Min(hi,n));
    private static bool Finite(double? n)=>n.HasValue&&!double.IsNaN(n.Value)&&!double.IsInfinity(n.Value);
    // TS yeni/model.ts ucusDenetimi; açısal hız önce, ardından mevcut tork tümleştirmesi uygulanır.
    public static BodyVector Apply(VehicleFlightInput u,VehicleState state,BodyVector up,BodyVector forward,BodyVector left,
      double steering,double dt,int contacts,double height)
    {
      bool airborne=contacts==0&&height>1.3;double thrust=airborne&&Finite(u.Forward)?u.Forward.GetValueOrDefault():0;
      double vertical=!double.IsNaN(u.Vertical)&&!double.IsInfinity(u.Vertical)?u.Vertical:0;
      var acceleration=new BodyVector(forward.X*thrust,vertical+forward.Y*thrust,forward.Z*thrust);
      if(airborne&&u.Descent.HasValue&&u.Descent.Value!=0&&state.Velocity.Y < -u.Descent.Value)
        acceleration+=new BodyVector(0,Math.Min(60,(-u.Descent.Value-state.Velocity.Y)*6),0);
      var w=state.AngularVelocity;
      if(Finite(u.Yaw))w=new BodyVector(w.X,w.Y+(u.Yaw.GetValueOrDefault()-w.Y)*Math.Min(1,40*dt),w.Z);
      double balance=Clamp(double.IsNaN(u.Balance)?0:u.Balance,0,1);
      if(airborne&&u.Air!=null)
      {
        double approach=Math.Min(1,10*dt),fall=Math.Max(0,-state.Velocity.Y);bool landing=height<3+fall*.7;
        if(u.Air.Held)
        {
          double pitch=-Clamp(u.Air.Pitch,-6,6),yaw=Clamp(u.Air.Yaw,-6,6),roll=-3*left.Y;
          state.AngularVelocity=new BodyVector(w.X+(left.X*pitch+forward.X*roll-w.X)*approach,
            w.Y+(left.Y*pitch+yaw+forward.Y*roll-w.Y)*approach,w.Z+(left.Z*pitch+forward.Z*roll-w.Z)*approach);
          return acceleration;
        }
        if(!(balance>0)&&!landing)
        {
          state.AngularVelocity=new BodyVector(w.X-w.X*approach*.5,w.Y+(1.6*steering-w.Y)*approach*.3,w.Z-w.Z*approach*.5);
          return acceleration;
        }
      }
      double b=airborne&&u.Air!=null?Math.Max(balance,1):balance;
      if(b>0){double k=14*b*dt,c=5*b*dt;w=new BodyVector(w.X+k*-up.Z-c*w.X,
        airborne?w.Y+(1.6*steering-w.Y)*3*b*dt:w.Y,w.Z+k*up.X-c*w.Z);}
      state.AngularVelocity=w;return acceleration;
    }
  }
}
