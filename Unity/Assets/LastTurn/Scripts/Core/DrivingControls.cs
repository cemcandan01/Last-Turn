#nullable enable
using System;

namespace LastTurn.Core
{
  // TS oyun/girdi.ts + arayuz/kontroller.ts: ham girişler (I), telefon eğimi, ekran direksiyonu, analog pedal ve fizikGirdisi.
  // Klavye, dokunma ve sensör adaptörleri yalnız bu ham değerleri yazar; fiziğe giden girdi tek yerden hesaplanır.
  public sealed class DrivingControls
  {
    /// ham girişler: sol, sağ, gaz, fren (0-1), ekran direksiyonu (-1..1), el freni (0/1)
    public double L,R,G,B,Sa,Dbr;
    /// eğim: son okuma (derece), sıfır noktası ve son okuma zamanı (sn)
    public double TiltBeta,TiltGamma,TiltZero,TiltTime=-1e9;
    /// ekran direksiyonunun açısı (rad, ±2,1)
    public double WheelAngle {get;private set;}
    public const double WheelLimit=2.1,PedalDeadZone=.08,PedalFull=.9,TiltDeadZone=2.5;
    private static double Cl(double v,double a,double b)=>Math.Max(a,Math.Min(b,v));
    /// TS matematik.ts ad (kaynak 6,2832 sabitini kullanır).
    public static double Ad(double a)=>((((a+Math.PI)%6.2832)+6.2832)%6.2832)-Math.PI;
    /// TS girdiSifirla: yarış başı/sonu, ayar ve panel değişimi, odak kaybı.
    public void Reset(){L=R=G=B=Dbr=0;Sa=0;}
    /// TS tiltRoll: ekran düzleminde yana yatma (derece; sağ kenar aşağı +). orientation = (cihaz yönü + içerik dönüşü) mod 360.
    public static double TiltRoll(double beta,double gamma,double orientation)
    {
      double b=beta*Math.PI/180,g=gamma*Math.PI/180,gx=Math.Sin(g)*Math.Cos(b),gy=-Math.Sin(b);
      double o=((orientation%360)+360)%360;double sx=o==90?-gy:o==270?gy:o==180?-gx:gx;
      return Math.Asin(Cl(sx,-1,1))*57.3;
    }
    public double TiltSteer(PlayerSettings s,double orientation)
    {
      double a=Ad((TiltRoll(TiltBeta,TiltGamma,orientation)-TiltZero)/57.3)*57.3;
      a=Math.Abs(a)<TiltDeadZone?0:a-Math.Sign(a)*TiltDeadZone;
      double x=Cl(a/(s["tlt"]-TiltDeadZone),-1,1);return -Math.Sign(x)*Math.Pow(Math.Abs(x),1.35);
    }
    /// TS "Ortala": son okuma 1,5 sn'den eskiyse sensör yok/izin yok (false), değilse sıfır noktası alınır.
    public bool Calibrate(double now,double orientation){if(now-TiltTime>1.5)return false;TiltZero=TiltRoll(TiltBeta,TiltGamma,orientation);return true;}
    /// TS bindWheel pointermove: parmağın merkeze göre açı değişimi.
    public void WheelTurn(double delta){WheelAngle=Cl(WheelAngle+Ad(delta),-WheelLimit,WheelLimit);Sa=-WheelAngle/WheelLimit;}
    public void WheelRelease(){WheelAngle=0;Sa=0;}
    /// TS bindPedal: y merkezden yukarı +1, aşağı −1 (pedal yarı yüksekliğine göre).
    public void Pedal(double y)
    {double m=Math.Abs(y)<PedalDeadZone?0:Cl((Math.Abs(y)-PedalDeadZone)/(PedalFull-PedalDeadZone),0,1);G=y>0?m:0;B=y<0?m:0;}
    public void PedalRelease(){G=B=0;}
    /// TS dongu.ts: otomatik gazda sürüşte fren yoksa tam gaz.
    public void AutoGas(PlayerSettings s,bool driving){if(s.Gas=="auto"&&driving)G=B!=0?0:1;}
    /// TS fizikGirdisi.
    public DrivingInput Physics(PlayerSettings s,double orientation=0,int shift=0)
    {
      double tg=(s.Steer=="btn"?L-R:s.Steer=="tilt"?TiltSteer(s,orientation):Sa)*(s.On("inv")?-1:1);
      return new DrivingInput(G,B,Cl(tg,-1,1),s.Gas=="analog",s.Steer!="btn",Dbr>0,shift);
    }
  }
}
