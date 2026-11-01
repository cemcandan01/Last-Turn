using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // TS yz/cizgi.ts/pilot.ts/kisilik.ts. Çizgi ve hız profili sabit kaynaktan otomatik çıkarılır;
  // bu yürütücü yalnız sürüş niyeti üretir, araç konumu/hızı/tutuşunu değiştirmez.
  public sealed class OpponentCatalog
  {
    private readonly Dictionary<string,OpponentPlan> plans=new Dictionary<string,OpponentPlan>(StringComparer.Ordinal);
    public OpponentCatalog(string json)
    {
      var data=CatalogNode.Parse(json);if(data["baseline"].S()!=TrackCatalog.Baseline)throw new FormatException("Rakip kataloğu kaynağı farklı.");
      foreach(var row in data["plans"].Items){var p=new OpponentPlan(row,data["personalities"][row["personality"].S()]);plans.Add(p.TrackKey+":"+p.Personality,p);}
      if(plans.Count!=120)throw new FormatException("Rakip kataloğu 40 pist × 3 kişilik içermeli.");
    }
    public OpponentPlan Plan(string trackKey,string personality="deneyimli")=>plans.TryGetValue(trackKey+":"+personality,out var p)?p:throw new ArgumentException("Rakip planı yok: "+trackKey+" / "+personality);
  }

  public sealed class OpponentPlan
  {
    public readonly string TrackKey,Personality,Name;
    public readonly double[] X,Z,Offset,S,Curvature,CenterX,CenterZ,Nx,Nz,Speed;
    public readonly double Length,HalfWidth,Look,LookSpeed,Consistency,Reaction,Patience,SlipLimit;
    public readonly bool Open;public readonly int N;
    public OpponentPlan(CatalogNode row,CatalogNode personality)
    {
      TrackKey=row["key"].S();Personality=row["personality"].S();Name=personality["ad"].S();var c=row["line"];
      double[] Arr(string key)=>c[key].Items.Select(n=>n.N()).ToArray();
      X=Arr("x");Z=Arr("z");Offset=Arr("o");S=Arr("s");Curvature=Arr("k");CenterX=Arr("cx");CenterZ=Arr("cz");Nx=Arr("nx");Nz=Arr("nz");
      Speed=row["speed"].Items.Select(n=>n.N()).ToArray();N=X.Length;Length=c["len"].N();HalfWidth=c["hw"].N();Open=c["acik"].B();
      Look=personality["bakis"].N();LookSpeed=personality["bakisHiz"].N();Consistency=personality["tutarlilik"].N();Reaction=personality["tepki"].N();Patience=personality["sabir"].N();SlipLimit=personality["kaymaSiniri"].N();
      if(N<2 || new[]{Z,Offset,S,Curvature,CenterX,CenterZ,Nx,Nz,Speed}.Any(a=>a.Length!=N))throw new FormatException("Rakip çizgi uzunlukları uyuşmuyor.");
      foreach(var a in new[]{X,Z,Offset,S,Curvature,CenterX,CenterZ,Nx,Nz,Speed})foreach(double v in a)Numeric.Finite(v);
    }
    public int Nearest(double x,double z,int hint,bool full=false)
    {
      int best=hint;double distance=1e18;
      void Scan(int a,int b){for(int k=a;k<=b;k++){int i=Open?Math.Max(0,Math.Min(N-1,k)):((k%N)+N)%N;double q=(x-X[i])*(x-X[i])+(z-Z[i])*(z-Z[i]);if(q<distance){distance=q;best=i;}}}
      if(full)Scan(0,N-1);else{Scan(hint-12,hint+12);if(distance>900)Scan(0,N-1);}return best;
    }
    public int Ahead(int i,double distance)
    {
      int j=i;double travelled=0;
      while(travelled<distance){int next=j+1;if(Open&&next>=N)return N-1;int k=next%N;travelled+=k!=0?S[k]-S[j]:Length-S[j];j=k;}return j;
    }
    public double Variation(uint seed,int lap,int section)=>1+(1-Consistency)*.16*(Hash(seed,lap,section)-.5);
    public static double Hash(uint seed,int a,int b)
    {
      unchecked{uint h=seed^((uint)(a+1)*0x9e3779b1u)^((uint)(b+7)*0x85ebca6bu);h=(h^(h>>16))*0x7feb352du;h=(h^(h>>15))*0x846ca68bu;return (h^(h>>16))/4294967296.0;}
    }
  }

  public sealed class OpponentPilot
  {
    public string Mode="bekle";public int Index,Lap,Recoveries,EdgeCorrections,OffTrackSteps;
    public double Progress,Time,Stuck,ReverseTime,TargetSpeed;
    public readonly OpponentPlan Plan;public readonly uint Seed;
    public OpponentPilot(OpponentPlan plan,uint seed,double x,double z){Plan=plan;Seed=seed;Index=plan.Nearest(x,z,0,true);}
    private static double Clamp(double v,double a,double b)=>Math.Max(a,Math.Min(b,v));
    private static double Angle(double a)=>Math.Atan2(Math.Sin(a),Math.Cos(a));
    private static DrivingInput Input(double steering,double gas,double brake,bool handbrake=false)=>new DrivingInput(gas,brake,steering,true,true,handbrake);
    public DrivingInput Step(double x,double z,double heading,double vx,double vz,double beta,double dt,bool started)
    {
      var c=Plan;double speed=JsMath.Hypot(vx,vz),along=vx*Math.Sin(heading)+vz*Math.Cos(heading);int previous=Index,i=c.Nearest(x,z,previous);double ds=c.S[i]-c.S[previous];
      if(!c.Open){if(ds < -c.Length/2){ds+=c.Length;Lap++;}else if(ds>c.Length/2){ds-=c.Length;Lap--;}}Progress+=ds;Index=i;
      double Direction(int j)=>Angle(Math.Atan2(c.X[j]-x,c.Z[j]-z)-heading);
      if(started)Time+=dt;
      if(!started||Time<c.Reaction){Mode="bekle";TargetSpeed=0;return Input(0,0,0,true);}if(Mode=="bekle")Mode="yaris";
      double lateral=(x-c.CenterX[i])*c.Nx[i]+(z-c.CenterZ[i])*c.Nz[i],outward=Math.Sign(lateral)*(vx*c.Nx[i]+vz*c.Nz[i]);bool outside=Math.Abs(lateral)>c.HalfWidth+.8,edge=Math.Abs(lateral)>c.HalfWidth-1.5 && outward>.2;
      int ahead=c.Ahead(i,4);double course=Math.Atan2(c.X[ahead]-c.X[i],c.Z[ahead]-c.Z[i]),difference=Angle(course-heading);bool reversed=Math.Abs(difference)>1.9;
      if(Mode=="yaris"&&reversed&&speed<6){Mode="don";ReverseTime=0;Recoveries++;}
      if(Mode=="don")
      {
        int sign=Math.Sign(difference);if(sign==0)sign=1;TargetSpeed=0;
        if(Math.Abs(difference)<.9){Mode="yaris";Stuck=-1.5;}
        else{ReverseTime+=dt;bool reverse=ReverseTime<0;if(!reverse&&((edge&&along>.3)||ReverseTime>3))ReverseTime=-1.8;else if(reverse&&edge&&along<-.3)ReverseTime=0;
          return reverse?Input(-sign,0,along < -3?0:.8):Input(sign,along<3?.7:0,along>5?.5:0);}
      }
      if(Mode=="yaris"){if(speed<1)Stuck+=dt;else Stuck=Math.Max(Math.Min(Stuck,0),Stuck-2*dt);if(Stuck>c.Patience){Mode="geri";ReverseTime=1.6;Stuck=0;Recoveries++;}}
      if(Mode=="geri")
      {
        ReverseTime-=dt;double target=Direction(c.Ahead(i,10));if(ReverseTime<=0||(edge&&ReverseTime<1.2)){Mode="yaris";Stuck=-1.5;}TargetSpeed=0;return Input(-Math.Sign(target),0,1);
      }
      double look=outside?Clamp(1.3*Math.Abs(lateral),8,c.Look+c.LookSpeed*speed):c.Look+c.LookSpeed*speed;
      double angle=Direction(c.Ahead(i,look)),lockLimit=(speed<6?.45+.55*speed/6:1)*(outside?.55:1),counter=Math.Abs(beta)>.15&&speed>5?1.5*(beta-Math.Sign(beta)*.15):0;
      double steer=reversed?Math.Sign(angle):Clamp(Clamp(angle*2.4,-lockLimit,lockLimit)+counter,-1,1);
      int k=c.Ahead(i,2+speed*.25);double targetSpeed=c.Speed[k]*c.Variation(Seed,Lap,k/25);TargetSpeed=targetSpeed;double gap=targetSpeed-along;
      double gas=gap>0?Clamp(gap/2.5,0,1):0,brake=gap<-.8?Clamp(-gap/4,0,1):0;
      if(speed>8&&Math.Abs(beta)>(outside?.6:c.SlipLimit))gas*=.3;if(reversed)gas=Math.Min(gas,.4);double finalSteer=steer;
      if(outside){OffTrackSteps++;brake=speed>15&&gap < -3?Math.Min(brake,.4):0;if(speed<12&&!reversed)gas=Math.Max(gas,.6);}
      else{double over=(lateral-c.Offset[i])*Math.Sign(lateral);if(c.HalfWidth-Math.Abs(lateral)<.3&&over>.8&&outward>.5){gas=Math.Min(gas,.3);finalSteer=Clamp(steer-Math.Sign(lateral)*.35,-1,1);EdgeCorrections++;}}
      return Input(finalSteer,gas,brake);
    }
  }
}
