#nullable enable
using System;
using System.Collections.Generic;

namespace LastTurn.Core
{
  // TS arayuz/mini-harita.ts: araç yukarı bakar, imleç sabit (240×240 görüntüde 120,164); dünya eğik bakışla izdüşürülür,
  // görünen genişlik hıza göre 180→260 m, görüş dışı işaretler yönünü gösterecek biçimde kenara sabitlenir.
  public sealed class MiniMap
  {
    public const double Size=240,OX=120,OY=164,MinWidth=180,MaxWidth=260,WidthSpeed=60,CH=100,CB=10,GK=1.3;
    private static readonly double Tilt=55*Math.PI/180,SE=Math.Sin(Tilt),CE=Math.Cos(Tilt),D0=CH*SE+CB*CE,YN0=(CH*CE-CB*SE)/D0;
    public double X,Z,Fx,Fz=1,Scale=1;private double? width;
    public double Width=>width??MinWidth;
    /// TS miniHaritaCiz çerçevesi: (fx, fz) = (sin h, cos h); genişlik saniyede ~2 kat yaklaşır, ilk karede doğrudan.
    public void Frame(double x,double z,double fx,double fz,double speed,double dt)
    {
      double target=MinWidth+(MaxWidth-MinWidth)*Math.Min(1,speed/WidthSpeed);
      width=width==null?target:width+(target-width.Value)*Math.Min(1,dt*2);X=x;Z=z;Fx=fx;Fz=fz;Scale=Size/width.Value;
    }
    /// TS yerProj: araç çerçevesinde (sağ r, ileri f) → piksel; derinlik ≤ 0,2 ise null.
    public (double X,double Y)? Ground(double r,double f)
    {
      double d=CH*SE+(f+CB)*CE;if(d<.2)return null;double yn=(CH*CE-(f+CB)*SE)/d;
      return (OX+Scale*D0*r/d,OY+GK*Scale*D0*(yn-YN0));
    }
    /// TS mmDonustur: dünya noktası → piksel; kameranın arkasındaysa (−999, −999).
    public (double X,double Y) Project(double wx,double wz){double dx=wx-X,dz=wz-Z;return Ground(Fx*dz-Fz*dx,Fx*dx+Fz*dz)??(-999,-999);}
    /// TS işaret çizimi: görüş içi noktada, değilse imleçten işaretin yönünde 7 piksel kenar payına sabitlenir.
    public (double X,double Y,bool Edge) Marker(double wx,double wz)
    {
      var q=Project(wx,wz);if(q.X>=7&&q.X<=Size-7&&q.Y>=7&&q.Y<=Size-7)return (q.X,q.Y,false);
      double dx=wx-X,dz=wz-Z,r=Fx*dz-Fz*dx,f=Fx*dx+Fz*dz,l=Math.Sqrt(r*r+f*f);if(l==0)l=1;double rn=r/l,fn=f/l;
      double kX=rn>0?(Size-7-OX)/rn:rn<0?(OX-7)/-rn:double.PositiveInfinity,kY=fn>0?(OY-7)/fn:fn<0?(Size-7-OY)/-fn:double.PositiveInfinity,k=Math.Min(kX,kY);
      return (OX+rn*k,OY-fn*k,true);
    }
    /// TS öteki araç: görüntü dışındaysa çizilmez; yakın olan büyük (2,5–4,5 px).
    public (double X,double Y,double Radius)? Car(double wx,double wz)
    {
      var q=Project(wx,wz);if(q.X<-6||q.X>Size+6||q.Y<-6||q.Y>Size+6)return null;
      return (q.X,q.Y,Math.Max(2.5,Math.Min(4.5,4.5-Math.Max(0,OY-q.Y)/40)));
    }
    /// TS pist çizgisi: ileri ≤ 1,6 × genişlik, geri ≥ −0,45 × genişlik; her parça kendi derinliğinin ölçeğiyle (kalınlık).
    public List<(double AX,double AY,double BX,double BY,double Scale)> Track(IReadOnlyList<(double X,double Z)> points)
    {
      var list=new List<(double,double,double,double,double)>();(double X,double Y)? previous=null;double pf=0,fmax=Width*1.6,fmin=-Width*.45;
      foreach(var q in points)
      {
        double dx=q.X-X,dz=q.Z-Z,f=Fx*dx+Fz*dz;var p=f<fmin||f>fmax?null:Ground(Fx*dz-Fz*dx,f);
        if(p!=null&&previous!=null)list.Add((previous.Value.X,previous.Value.Y,p.Value.X,p.Value.Y,Scale*D0/(CH*SE+(Math.Max((f+pf)/2,0)+CB)*CE)));
        previous=p;pf=f;
      }
      return list;
    }
  }
}
