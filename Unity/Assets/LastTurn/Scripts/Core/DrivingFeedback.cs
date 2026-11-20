using System;

namespace LastTurn.Core
{
  // Sabit fizik adımından beslenir. Yalnız bildirim üretir.
  public sealed class DrivingFeedback
  {
    public string Text {get;private set;}="";
    public int Serial {get;private set;}
    private double time,until,cooldown,drift,clean;
    private bool wasDrifting,initialized;
    private int lastLap,lastRank;
    private readonly bool[] near=new bool[3];
    private readonly double[] previous=new double[3];
    public string Current => time<until?Text:"";
    public void Step(double dt,OpponentTrafficCar self,OpponentTrafficCar[] rivals,int rank,int lap,int laps,
      bool running,bool drifting,bool touched,bool wrongWay)
    {
      if(!running)return;
      time+=dt;clean=touched||wrongWay?0:clean+dt;
      if(touched || wrongWay)until=time;
      bool safe=clean>.8 && self.Vx*self.Vx+self.Vz*self.Vz>64;
      if(initialized && lap>lastLap && laps>1 && lap==laps-1)Emit("SON TUR · Şimdi zorla",3);
      if(initialized && rank<lastRank && safe && time>cooldown)Emit("TEMİZ SOLLAMA",1.6);
      if(drifting && safe)drift+=dt;
      else if(touched || wrongWay)drift=0;
      if(wasDrifting && !drifting){if(drift>1.2 && safe && time>cooldown)Emit("TEMİZ DRİFT ÇIKIŞI",1.8);drift=0;}
      for(int i=0;i<Math.Min(3,rivals.Length);i++){
        var r=rivals[i];double dx=r.X-self.X,dz=r.Z-self.Z;
        double along=dx*Math.Sin(self.Heading)+dz*Math.Cos(self.Heading);
        double across=Math.Abs(dx*Math.Cos(self.Heading)-dz*Math.Sin(self.Heading));
        bool close=Math.Abs(r.Y-self.Y)<1.5 && across>(r.Width+self.Width)*.5+.15 && across<(r.Width+self.Width)*.5+1.4;
        if(initialized && along>0 && along<12 && close)near[i]=true;
        if(initialized && near[i] && previous[i]>=0 && along<0){
          if(safe && time>cooldown)Emit("YAKIN GEÇİŞ",1.4);
          near[i]=false;
        }
        if(Math.Abs(along)>20 || !close)near[i]=false;
        previous[i]=along;
      }
      initialized=true;lastRank=rank;lastLap=lap;wasDrifting=drifting;
    }
    private void Emit(string text,double seconds){Text=text;until=time+seconds;cooldown=time+3;Serial++;}
  }
}
