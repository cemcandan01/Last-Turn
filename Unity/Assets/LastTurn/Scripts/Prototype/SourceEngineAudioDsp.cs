using System;
using UnityEngine;

namespace LastTurn.Prototype
{
  // Ses iş parçacığında yalnız yerel sayılar; oyun durumu, Unity RNG veya nesne sorgusu yok.
  public sealed class SourceEngineOscillator:MonoBehaviour
  {
    public sealed class State{public double turboHz,turbo,noiseHz,noise,compressorHz,compressor,gearHz,gear;}
    public volatile State Target=new State();private double sr,pt,pc,pg,x1,x2,y1,y2,cx1,cx2,cy1,cy2;private uint random=53;
    private void Awake(){sr=AudioSettings.outputSampleRate;}
    private static double Band(double input,double frequency,double q,double sr,ref double x1,ref double x2,ref double y1,ref double y2)
    {double w=2*Math.PI*Math.Min(sr*.49,frequency)/sr,a=Math.Sin(w)/(2*q),a0=1+a;double y=(a*input-a*x2+2*Math.Cos(w)*y1-(1-a)*y2)/a0;x2=x1;x1=input;y2=y1;y1=y;return y;}
    private void OnAudioFilterRead(float[] data,int channels)
    {
      var s=Target;if(sr<=0)return;
      for(int i=0;i<data.Length;i+=channels){pt=(pt+s.turboHz/sr)%1;pc=(pc+s.compressorHz/sr)%1;pg=(pg+s.gearHz/sr)%1;random=unchecked(random*1664525+1013904223);double noise=random/4294967296d*2-1;
        double sample=Math.Sin(pt*2*Math.PI)*s.turbo+Band(noise,s.noiseHz,4,sr,ref x1,ref x2,ref y1,ref y2)*s.noise+Band(pc*2-1,900,3,sr,ref cx1,ref cx2,ref cy1,ref cy2)*s.compressor+(1-4*Math.Abs(pg-.5))*s.gear;
        for(int c=0;c<channels;c++)data[i+c]+=(float)sample;
      }
    }
  }
  public sealed class SourceEngineFilter:MonoBehaviour
  {
    private sealed class Coeff{public double b0=1,b1,b2,a1,a2;}
    private sealed class Pair{public Coeff shelf,low;}
    private volatile Pair coefficients;private double sr,gain,cutoff=-1;private readonly double[,] history=new double[8,8];
    private void Awake(){sr=AudioSettings.outputSampleRate;}
    public void Configure(double db,double hz)
    {
      double next=gain+(db-gain)*(1-Math.Exp(-Time.unscaledDeltaTime/.025));if(Math.Abs(next-gain)<1e-6&&cutoff==hz&&coefficients!=null)return;gain=next;cutoff=hz;
      double w=2*Math.PI*1400/sr,a=Math.Pow(10,gain/40),cos=Math.Cos(w),alpha=Math.Sin(w)/Math.Sqrt(2),beta=2*Math.Sqrt(a)*alpha,den=(a+1)-(a-1)*cos+beta;
      var shelf=new Coeff{b0=a*((a+1)+(a-1)*cos+beta)/den,b1=-2*a*((a-1)+(a+1)*cos)/den,b2=a*((a+1)+(a-1)*cos-beta)/den,a1=2*((a-1)-(a+1)*cos)/den,a2=((a+1)-(a-1)*cos-beta)/den};
      w=2*Math.PI*Math.Min(sr*.49,hz)/sr;cos=Math.Cos(w);alpha=Math.Sin(w);den=1+alpha;var low=new Coeff{b0=(1-cos)/2/den,b1=(1-cos)/den,b2=(1-cos)/2/den,a1=-2*cos/den,a2=(1-alpha)/den};coefficients=new Pair{shelf=shelf,low=low};
    }
    private double Filter(double x,Coeff c,int channel,int offset){double y=c.b0*x+c.b1*history[channel,offset]+c.b2*history[channel,offset+1]-c.a1*history[channel,offset+2]-c.a2*history[channel,offset+3];history[channel,offset+1]=history[channel,offset];history[channel,offset]=x;history[channel,offset+3]=history[channel,offset+2];history[channel,offset+2]=y;return y;}
    private void OnAudioFilterRead(float[] data,int channels){var c=coefficients;if(c==null)return;for(int i=0;i<data.Length;i++)data[i]=(float)Filter(Filter(data[i],c.shelf,i%channels,0),c.low,i%channels,4);}
  }
}
