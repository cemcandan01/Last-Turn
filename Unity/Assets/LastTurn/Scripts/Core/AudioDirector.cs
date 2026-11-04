#nullable enable
using System;
using System.Collections.Generic;

namespace LastTurn.Core
{
  /// Ses yönetmeninin bir karelik girdisi (TS ses.ts sesTick'in okuduğu oyun durumu).
  public sealed class AudioFrame
  {
    public string Mode="drive"; // menu | garage | result | pause | drive
    public bool Racing,Countdown,Cockpit,Airborne,Kerb,Drifting,Nitro,Hook,Ghost,Transform,Wind;
    public double Dt,Speed,Rpm,Gas,Vy,Beta,HitTime,SimTime,CountdownLeft,ShiftTimer,Turbo;
    public string RaceType="";
    /// TS dp: çarpan, kombo, puan; bitişte kazandı mı.
    public double Multiplier,Combo,Score;public bool Won;
    /// teker başına: temas, zemin (0-5), yanal tanA, boylamsal kayma.
    public (bool Contact,int Surface,double SlipAngle,double SlipRatio)[] Tires=Array.Empty<(bool,int,double,double)>();
    public int Refusals;
  }
  /// Sürekli ses hedefleri (yürütücü bunları katmanlara uygular).
  public sealed class AudioMix
  {
    public double Music,Effects,CockpitCutoff,EngineMix,Rpm,Gas,Speed,Slip,Spin,Loose;public bool ShiftCut,Airborne,Kerb,Cockpit;
    public double[] Surfaces=new double[6];
  }
  // TS ses.ts sesTick'in oyun mantığı: kanal seviyeleri, motor/lastik hedefleri ve olay tetikleri. Sentez (motor/efekt/müzik
  // tınısı) bu sınıfta değildir; yürütücü varlık yoksa olayı eksik varlık olarak raporlar.
  public sealed class AudioDirector
  {
    private readonly Queue<double> speeds=new Queue<double>();
    private double lastHit=-9,air,vy,lastMult,lastCombo,lastScore;private int count,refusals=-1;
    private bool nitro,hook,ghost,transform,wind,first=true;private string mode="",raceState="";
    public readonly List<(string Name,double Strength)> Events=new List<(string,double)>();
    /// TS seviye: kaydırıcı (0-100) → kazanç, algısal eğri.
    public static double Level(double v)=>Math.Pow(Math.Max(0,Math.Min(100,v))/100,1.6);
    public AudioMix Step(AudioFrame f,PlayerSettings s)
    {
      Events.Clear();var m=new AudioMix();
      double mh=f.Mode=="menu"?1:f.Mode=="garage"?.55:f.Mode=="result"?.8:f.Mode=="pause"?.35:0;
      m.Music=mh*Level(s["muz"])*.9;m.Effects=Level(s["ses"]);m.Cockpit=f.Cockpit&&f.Mode=="drive";m.CockpitCutoff=m.Cockpit?2400:20000;
      bool drive=f.Mode=="drive";m.EngineMix=f.Mode=="result"?.35:drive?1:0;
      m.Rpm=f.Rpm;m.Gas=f.Gas;m.ShiftCut=drive&&!f.Countdown&&f.ShiftTimer>0;m.Speed=drive?f.Speed:0;
      double kayma=0,gevsek=0;
      if(drive)foreach(var t in f.Tires)
      {
        if(!t.Contact)continue;m.Surfaces[t.Surface]+=.25;
        double yan=Math.Max(0,Math.Abs(t.SlipAngle)-.1)/.3,boy=Math.Max(0,Math.Abs(t.SlipRatio)-.12)/.5,x=Math.Min(1.5,Math.Sqrt(yan*yan+boy*boy))/4;
        if(t.Surface==1)kayma+=x;else gevsek+=x;
      }
      m.Slip=kayma*Math.Max(0,Math.Min(1,f.Speed/3+.3));m.Spin=(f.Drifting?1:Math.Max(0,Math.Min(1,(Math.Abs(f.Beta)-.25)/.4)))*m.Surfaces[1];
      m.Loose=gevsek*2;m.Airborne=f.Airborne;m.Kerb=f.Kerb;
      // olaylar: çarpma (son 12 karede hız kaybı), iniş (0,25 sn'den uzun havada)
      speeds.Enqueue(f.Speed);if(speeds.Count>12)speeds.Dequeue();
      if(drive)
      {
        if(f.HitTime>lastHit+.01&&f.SimTime-f.HitTime<.2){double max=0;foreach(var v in speeds)max=Math.Max(max,v);Fire("carpma",Clamp((max-f.Speed)/14+.2,.2,1));}
        if(f.Airborne){air+=f.Dt;vy=f.Vy;}else{if(air>.25)Fire("inis",Clamp(-vy/10,.25,1));air=0;}
      }
      lastHit=f.HitTime;
      if(f.Racing&&drive)
      {
        if(f.Countdown){int n=(int)Math.Ceiling(f.CountdownLeft);if(n>0&&n!=count)Fire("sayim",0);count=n;}
        else if(raceState=="count")Fire("basla",0);
        if(f.RaceType=="dp")
        {
          if(f.Multiplier>lastMult)Fire("kombo",f.Multiplier);
          if(lastCombo>0&&f.Combo==0)Fire(f.Score>lastScore?"kasa":"yandi",0);
        }
        raceState=f.Countdown?"count":"run";lastMult=f.Multiplier;lastCombo=f.Combo;lastScore=f.Score;
      }
      else{raceState="";count=0;}
      bool n2=drive&&f.Nitro;if(n2&&!nitro)Fire("nitro",0);else if(!n2&&nitro&&drive)Fire("nitroBitti",0);nitro=n2;
      if(drive)
      {
        if(f.Hook&&!hook)Fire("kanca",0);if(f.Ghost!=ghost)Fire(f.Ghost?"hayaletAc":"hayaletKapa",0);
        if(f.Transform!=transform)Fire(f.Transform?"donusumAc":"donusumKapa",0);if(f.Wind&&!wind)Fire("ruzgar",0);
        if(!first&&f.Refusals!=refusals)Fire("red",0);
      }
      refusals=f.Refusals;hook=f.Hook;ghost=f.Ghost;transform=f.Transform;wind=f.Wind;first=false;
      if(f.Mode=="result"&&mode=="drive"&&f.Racing)Fire("bitis",f.Won?1:0);
      mode=f.Mode;return m;
    }
    private void Fire(string name,double strength)=>Events.Add((name,strength));
    private static double Clamp(double v,double a,double b)=>Math.Max(a,Math.Min(b,v));
    /// Ses varlıkları (TS'de sentez; Unity'de henüz yok): Resources/Audio altında bu adlarla aranır.
    public static readonly string[] EventNames={"carpma","inis","sayim","basla","kombo","kasa","yandi","nitro","nitroBitti","kanca","hayaletAc","hayaletKapa","donusumAc","donusumKapa","ruzgar","red","bitis","tik"};
    public static readonly string[] LoopNames={"motor","lastik-asfalt","lastik-gevsek","savrulma","ruzgar-hiz","muzik"};
  }
}
