using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // TS fizik/anlik.ts; sıra ağ/kayıt sözleşmesidir. Bu tampon fizik veya RNG çalıştırmaz.
  public sealed class RemoteSnapshots
  {
    public static readonly string[] Fields={"t","x","y","z","h","qx","qy","qz","qw","vx","vy","vz","delta","w0","w1","w2","w3","d0","d1","d2","d3","s0","s1","s2","s3","rpm","vites","gaz"};
    private readonly List<double[]> buffer=new List<double[]>();
    public double[] Show {get;}=Empty();public double[] WheelAngles {get;}=new double[4];
    public double Clock {get;private set;}public double Delay {get;}public bool Ready {get;private set;}
    public int Count=>buffer.Count;
    public RemoteSnapshots(double delay=.12){Delay=delay;}
    public static double[] Empty(){var a=new double[28];a[8]=1;return a;}
    private static double Wrap(double a)=>(((a+Math.PI)%6.2832+6.2832)%6.2832)-Math.PI;
    public static double[] Interpolate(double[] a,double[] b,double k)
    {
      var o=new double[28];for(int i=0;i<28;i++)o[i]=a[i]+(b[i]-a[i])*k;
      o[4]=a[4]+Wrap(b[4]-a[4])*k;
      double dot=0;for(int i=5;i<=8;i++)dot+=a[i]*b[i];double sign=dot<0?-1:1;
      for(int i=5;i<=8;i++)o[i]=a[i]+(sign*b[i]-a[i])*k;
      double norm=JsMath.Hypot(JsMath.Hypot(o[5],o[6]),JsMath.Hypot(o[7],o[8]));if(norm==0)norm=1;for(int i=5;i<=8;i++)o[i]/=norm;
      o[26]=k<.5?a[26]:b[26];for(int i=17;i<=20;i++)o[i]=b[i];return o;
    }
    public void Clear(){buffer.Clear();Ready=false;}
    public bool Add(double[] a)
    {
      if(a==null||a.Length!=28||a.Any(v=>double.IsNaN(v)||double.IsInfinity(v)))return false;
      if(buffer.Count>0&&a[0]<=buffer[buffer.Count-1][0]){if(a[0]<buffer[buffer.Count-1][0]-1)Clear();else return false;}
      buffer.Add((double[])a.Clone());if(buffer.Count>32)buffer.RemoveAt(0);
      if(!Ready){Ready=true;Clock=a[0]-Delay;Array.Copy(a,Show,28);}return true;
    }
    public void Step(double dt)
    {
      if(buffer.Count==0||double.IsNaN(dt)||double.IsInfinity(dt)||dt<0)return;
      double target=buffer[buffer.Count-1][0]-Delay;Clock+=dt;double delta=target-Clock;
      if(Math.Abs(delta)>1)Clock=target;else Clock+=delta*Math.Min(1,dt*2);
      while(buffer.Count>2&&buffer[1][0]<=Clock)buffer.RemoveAt(0);
      var a=buffer[0];var b=buffer.Count>1?buffer[1]:null;
      if(b!=null&&Clock>a[0]&&Clock<b[0])Array.Copy(Interpolate(a,b,(Clock-a[0])/(b[0]-a[0])),Show,28);
      else{var s=b!=null&&Clock>=b[0]?b:a;double t=Math.Max(0,Math.Min(.3,Clock-s[0]));Array.Copy(s,Show,28);for(int i=1;i<=3;i++)Show[i]+=s[i+8]*t;}
      for(int i=0;i<4;i++)WheelAngles[i]+=Show[i+13]*dt;
    }
    public static double[] Capture(PowertrainVehicle v)
    {
      var a=Empty();var p=v.ReferencePoint;var b=v.Body;var q=b.Orientation;var f=q.Rotate(new BodyVector(0,0,1));
      a[0]=b.Steps*PowertrainVehicle.FixedDelta;a[1]=p.X;a[2]=p.Y;a[3]=p.Z;a[4]=Math.Atan2(f.X,f.Z);
      a[5]=q.X;a[6]=q.Y;a[7]=q.Z;a[8]=q.W;a[9]=b.Velocity.X;a[10]=b.Velocity.Y;a[11]=b.Velocity.Z;a[12]=v.Engine.SteeringAngle;
      for(int i=0;i<4;i++){var w=b.Wheels[i];a[13+i]=w.Omega;a[17+i]=Wrap(w.Angle);a[21+i]=w.Contact?Math.Max(-.12,Math.Min(.16,w.Compression-v.Parameters.Chassis.Wheels[i].StaticCompression)):-.1;}
      a[25]=v.Engine.Rpm;a[26]=v.Engine.Gear;a[27]=v.Engine.Gas;return a;
    }
  }
  // TS oyun/uzak.ts geliştirici denemesi: her4 fizik adımı,2 sn teslim gecikmesi.
  public sealed class DelayedGhostFeed
  {
    private readonly Queue<(double At,double[] Frame)> pending=new Queue<(double,double[])>();private int steps;
    public RemoteSnapshots Remote {get;}=new RemoteSnapshots();
    public void Clear(){pending.Clear();Remote.Clear();}
    public void Observe(double[] frame)
    {
      if(++steps%4==0)pending.Enqueue((frame[0]+2,(double[])frame.Clone()));
      while(pending.Count>0&&pending.Peek().At<=frame[0])Remote.Add(pending.Dequeue().Frame);
    }
  }
}
