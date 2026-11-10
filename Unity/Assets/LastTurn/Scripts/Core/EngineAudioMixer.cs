#nullable enable
using System;

namespace LastTurn.Core
{
  // TS ses/motor.ts guncelle: yalnız ses hedefleri; fizik/ekonomi/RNG çalıştırmaz.
  public sealed class EngineAudioMixer
  {
    private double load,boost;
    public double Load=>load;
    public double Boost=>boost;
    public readonly double[] Gas=new double[5],Off=new double[5],Pitch=new double[5];
    public double Gain,VtecDb,TurboHz,TurboGain,NoiseHz,NoiseGain,CompressorHz,CompressorGain,GearHz,GearGain;
    public void Step(double time,double dt,double rpm,double gas,bool shift,double speed,double? physicalBoost,double volume,double maxRpm,double[] layers,double vtec,double turbo,double compressor,double gears)
    {
      double rev=Math.Max(600,rpm),u=Math.Min(1,rev/maxRpm),target=shift?.12:gas;
      bool limiter=rev>.975*maxRpm&&gas>.6;if(limiter)target=Math.Floor(time*17)%2!=0?1:.08;
      load+=(target-load)*Math.Min(1,dt*(limiter?40:14));var weights=new double[5];
      if(rev<=layers[0])weights[0]=1;else if(rev>=layers[4])weights[4]=1;else for(int i=0;i<4;i++)if(rev<layers[i+1]){double f=Math.Log(rev/layers[i])/Math.Log(layers[i+1]/layers[i]);weights[i]=Math.Cos(f*Math.PI/2);weights[i+1]=Math.Sin(f*Math.PI/2);break;}
      for(int i=0;i<5;i++){Pitch[i]=Math.Min(3,Math.Max(.3,rev/layers[i]));Gas[i]=weights[i]*Math.Sin(load*Math.PI/2);Off[i]=weights[i]*Math.Cos(load*Math.PI/2)*.75;}
      bool high=vtec>0&&u>=vtec&&load>.5;VtecDb=high?6:0;Gain=volume*(.42+.58*u)*(.6+.4*load)*(high?1.25:1);
      if(turbo>0){double x=Math.Max(0,Math.Min(1,(u-.25)/(.7-.25)));double desired=physicalBoost??gas*x*x*(3-2*x)*(shift?.6:1);boost+=(desired-boost)*Math.Min(1,dt/(physicalBoost.HasValue?.05:desired>boost?.45:.15));TurboHz=2000+4200*boost;TurboGain=.022*turbo*Math.Pow(boost,1.6);NoiseHz=TurboHz*.55;NoiseGain=.09*turbo*Math.Pow(boost,1.4);}else{TurboGain=NoiseGain=0;}
      CompressorHz=rev/60*5.5;CompressorGain=.11*compressor*(.25+.75*load)*u;GearHz=60+speed*42;GearGain=.035*gears*Math.Min(1,speed/25)*(.3+.7*load);
    }
    public void DischargeBoost()=>boost*=.2;
    public static bool ListenGas(double seconds)=>(seconds>.5&&seconds<.82)||(seconds>1.7&&seconds<3.1);
  }
}
