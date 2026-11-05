#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  public readonly struct HudRect
  {
    public readonly double X,Y,W,H;
    public HudRect(double x,double y,double w,double h){X=x;Y=y;W=w;H=h;}
    public double Right=>X+W;public double Bottom=>Y+H;
    public bool Overlaps(HudRect o)=>X<o.Right&&o.X<Right&&Y<o.Bottom&&o.Y<Bottom;
    public bool Inside(double w,double h)=>X>=0&&Y>=0&&Right<=w+1e-9&&Bottom<=h+1e-9;
  }
  /// Yerleşim girdisi: ekran (piksel, sol üst köşe) ve hangi parçaların görünür olduğu.
  public sealed class HudLayoutInput
  {
    public double Width=844,Height=390;
    public string Steer="btn",Gas="btn",Map="kare";public bool Handbrake=true,Manual,Racing,Mutant,Opponent,DesktopHint,DragBar,Info;
    /// false: dokunmatik ekran yok (Windows/klavye). Sürüş ve üst simge tuşları yerleşmez; F düzeni (DesktopLayout).
    public bool Touch=true;
    public string[] Skills=Array.Empty<string>(); // yuva sırasıyla tür: aktif | tetikli
  }
  // Geçici sürüş HUD'unun tek yerleşim kaynağı (TS stil.css --cL/--cR mantığı: göstergeler tuşların üstüne yerleşir).
  // Dokunmatik tuşlar, üst düğmeler, bilgi panelleri, miniharita, drag çubuğu ve ipucu satırı birbirine binmez.
  public static class HudLayout
  {
    private static readonly HashSet<string> RightGroup=new HashSet<string>{"Gas","Pedal","Brake","Handbrake","ShiftUp","ShiftDown"};
    public static double Unit(double w,double h)=>Math.Max(54,Math.Min(140,Math.Min(w,h)/6.5));
    public static Dictionary<string,HudRect> Compute(HudLayoutInput i)
    {
      if(!i.Touch)return Desktop(i);
      var r=new Dictionary<string,HudRect>(StringComparer.Ordinal);double W=i.Width,H=i.Height,u=Unit(W,H),m=u*.25,bottom=H-m-u;
      // sol alt: direksiyon grubu
      if(i.Steer=="btn"){r["Left"]=new HudRect(m,bottom,u,u);r["Right"]=new HudRect(m*2+u,bottom,u,u);}
      else if(i.Steer=="wheel")r["Wheel"]=new HudRect(m,bottom-u*1.2,u*2.2,u*2.2);
      else r["Calibrate"]=new HudRect(m,bottom,u*1.6,u);
      double leftTop=r.Values.Min(v=>v.Y),leftRight=r.Values.Max(v=>v.Right);
      // sağ alt: pedallar
      double right=W-m-u;
      if(i.Gas=="btn")r["Gas"]=new HudRect(right,bottom-u*.6,u,u*1.6);
      if(i.Gas=="analog")r["Pedal"]=new HudRect(right,bottom-u*1.4,u,u*2.4);
      double brakeX=i.Gas=="auto"?right:right-m-u;
      if(i.Gas!="analog")r["Brake"]=new HudRect(brakeX,bottom,u,u);
      double groupX=i.Gas=="analog"?right:brakeX;
      if(i.Handbrake)r["Handbrake"]=new HudRect(i.Gas=="analog"?right-m-u:brakeX,bottom-m-u*.7,u,u*.7);
      if(i.Manual&&i.Racing){double x=r.Where(p=>RightGroup.Contains(p.Key)).Min(p=>p.Value.X)-m-u*.8;r["ShiftUp"]=new HudRect(x,bottom-u*.9,u*.8,u*.8);r["ShiftDown"]=new HudRect(x,bottom,u*.8,u*.8);}
      double rightLeft=r.Where(p=>RightGroup.Contains(p.Key)).Min(p=>p.Value.X),rightTop=r.Where(p=>RightGroup.Contains(p.Key)).Min(p=>p.Value.Y);
      // Mutant: NİTRO ve skill yuvaları sol grubun üstünde (TS); tetikli skill gösterge kutusu (dokunulmaz)
      if(i.Mutant)
      {
        // sağ grubun sol kenarına ve üstüne değmeyecek kadar; sığmayan yuva bir üst satıra sarar (dar/dikey ekran)
        double h=u*.8,y=leftTop-m-h,limit=rightLeft-m;
        r["Nitro"]=new HudRect(m,y,u*1.4,h);double x=m+u*1.4+m,widest=x-m,n0=i.Skills.Length;
        double slot=n0==0?u*1.3:Math.Min(u*1.3,(limit-x-m*(n0-1))/n0);if(slot<u*.9)slot=u*1.3;
        for(int n=0;n<i.Skills.Length;n++)
        {
          if(x+slot>limit+1e-6){y-=h+m;x=m;}
          r[(i.Skills[n]=="aktif"?"Skill":"Passive")+n]=new HudRect(x,y,slot,h);x+=slot+m;widest=Math.Max(widest,x-m);
        }
        leftTop=y;leftRight=Math.Max(leftRight,widest);
      }
      // alt orta: drag devir çubuğu ve masaüstü ipucu iki tuş grubunun arasında; dar ekranda çubuk grupların üstüne çıkar
      double gapX=leftRight+m,gapW=rightLeft-m-gapX;
      if(i.DragBar)
      {
        if(gapW>u*4)r["DragBar"]=new HudRect(gapX,H-m-u*1.25,gapW,u*1.25);
        else if(rightLeft-m*3>u*3){double y=leftTop-m-u*1.25;r["DragBar"]=new HudRect(m,y,rightLeft-m*3,u*1.25);leftTop=y;}
        else{double y=Math.Min(leftTop,rightTop)-m-u*1.25;r["DragBar"]=new HudRect(m,y,W-m*2,u*1.25);leftTop=y;rightTop=y;}
      }
      if(i.DesktopHint&&gapW>u*4)r["Hint"]=new HudRect(gapX,r.TryGetValue("DragBar",out var bar)&&bar.Y>H/2&&bar.X==gapX?bar.Y-m-u*.45:H-m-u*.45,gapW,u*.45);
      // üst sağ düğmeler
      double b=u*.62,bw=b*1.6;string[] top={"Settings","Pause","Respawn","Camera"};
      for(int n=0;n<top.Length;n++)r[top[n]]=new HudRect(W-m-(n+1)*(bw+m*.5),m,bw,b);
      double buttonsLeft=r["Camera"].X,buttonsBottom=m+b;
      // miniharita (TS hud harita parçası): üst sağ düğmelerin altında, sağ grubun üstünde
      double mapSize=i.Map=="kapali"?0:Math.Min((i.Map=="kucuk"?.28:.4)*Math.Min(W,H)*1.6,rightTop-buttonsBottom-m*2);
      if(r.TryGetValue("DragBar",out var drag)&&drag.Y<H-m-u*1.25-1e-9&&drag.Right>W-m-mapSize)mapSize=Math.Min(mapSize,drag.Y-m-(buttonsBottom+m));
      if(W-m-mapSize<leftRight+m){double beside=W-m-(leftRight+m),above=leftTop-m-(buttonsBottom+m);mapSize=Math.Max(Math.Min(mapSize,beside),Math.Min(mapSize,above));}
      if(mapSize>u)r["Map"]=new HudRect(W-m-mapSize,buttonsBottom+m,mapSize,mapSize);
      double rightColumn=r.TryGetValue("Map",out var map)?Math.Min(map.X,buttonsLeft):buttonsLeft;
      // sol üst bilgi: Mutant durum + yarış paneli + skill/geliştirici bilgisi; üst düğmelere ve miniharitaya değmez
      double infoW=Math.Min(460,rightColumn-m*3),y0=m;
      if(i.Mutant){r["MutantBar"]=new HudRect(m,y0,infoW,u*.9);y0+=u*.9+m*.5;}
      if(i.Racing){double rh=Math.Min(i.Opponent?u*3.6:u*2.8,leftTop-m-y0);r["RacePanel"]=new HudRect(m,y0,infoW,rh);y0+=rh+m*.5;}
      if(i.Info){double ih=Math.Max(u,leftTop-m-y0);r["Info"]=new HudRect(m,y0,infoW,ih);y0+=ih;}
      return r;
    }
    /// F (masaüstü) düzeni, docs/tasarim/ekranlar-f.html: dokunmatik tuş yok. Sol üst pist adı (Mutant'ta durum çubuğunun
    /// altında), üst orta süre, sağ üst miniharita, sağ alt hız; alt orta (araç) boş kalır. Mutant NİTRO/skill yuvaları sol
    /// altta gösterge, drag devir çubuğu hızın üstünde, ipucu satırı sol altta.
    private static Dictionary<string,HudRect> Desktop(HudLayoutInput i)
    {
      var r=new Dictionary<string,HudRect>(StringComparer.Ordinal);double W=i.Width,H=i.Height,u=Unit(W,H),m=Math.Max(12,Math.Min(W,H)*.03);
      double line=Math.Max(16,u*.3),side=W*.38;
      // sağ üst: miniharita
      double map=i.Map=="kapali"?0:Math.Min(H*(i.Map=="kucuk"?.15:.2),W*.2);
      if(map>0)r["Map"]=new HudRect(W-m-map,m,map,map);
      double rightEdge=map>0?W-m-map-m:W-m;
      // üst orta: süre (puan) ve hedef satırı
      double tw=Math.Min(W*.3,Math.Max(220,u*3.2)),th=u*.95;
      if(i.Racing)r["Timer"]=new HudRect((W-tw)/2,m,tw,th);
      double leftW=Math.Min(side,(W-tw)/2-m*2),y=m;
      if(i.Mutant){r["MutantBar"]=new HudRect(m,y,leftW,u*.9);y+=u*.9+m*.5;}
      if(i.Racing){r["Title"]=new HudRect(m,y,leftW,line);y+=line+m*.5;}
      // sağ alt: hız + vites
      double sw=Math.Min(W*.16,u*2.4),sh=u*1.15;r["Speed"]=new HudRect(W-m-sw,H-m-sh,sw,sh);
      // sol alt: ipucu satırı, üstünde Mutant yuvaları
      double bottom=H-m;
      if(i.DesktopHint){r["Hint"]=new HudRect(m,bottom-line,side,line);bottom-=line+m*.5;}
      if(i.Mutant)
      {
        double h=u*.62,x=m,yy=bottom-h,slot=u*1.3;r["Nitro"]=new HudRect(x,yy,u*1.4,h);x+=u*1.4+m*.5;
        for(int n=0;n<i.Skills.Length;n++)
        {
          if(x+slot>m+side+1e-6){yy-=h+m*.5;x=m;}
          r[(i.Skills[n]=="aktif"?"Skill":"Passive")+n]=new HudRect(x,yy,slot,h);x+=slot+m*.5;
        }
        bottom=yy-m*.5;
      }
      // sağ alt: drag devir çubuğu hızın üstünde (alt orta araçta kalır)
      if(i.DragBar){double bw=Math.Min(W*.3,Math.Max(sw,u*4));r["DragBar"]=new HudRect(W-m-bw,H-m-sh-m*.5-u,bw,u);}
      // sol üst serbest sürüş/telemetri bilgisi: başlığın altından sol alt göstergelere kadar
      if(i.Info){double ih=Math.Max(u,bottom-m-y);r["Info"]=new HudRect(m,y,Math.Min(Math.Min(460,side),rightEdge-m*2),ih);}
      return r;
    }
    /// Çakışan parça çiftleri (doğrulama).
    public static IEnumerable<(string A,string B)> Overlaps(Dictionary<string,HudRect> r)
    {
      var k=r.Keys.ToArray();for(int a=0;a<k.Length;a++)for(int b=a+1;b<k.Length;b++)if(r[k[a]].Overlaps(r[k[b]]))yield return (k[a],k[b]);
    }
  }
}
