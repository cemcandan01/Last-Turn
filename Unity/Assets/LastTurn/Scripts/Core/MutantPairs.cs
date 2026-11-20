#nullable enable
using System;
using System.Linq;

namespace LastTurn.Core
{
  public sealed class MutantPairs
  {
    private static readonly (string First,string Second,string Name,string Effect)[] Pairs={
      ("temiz-cikis","aci","Viraj Çıkışı","Temiz driftten sonra direksiyonu düzeltip gaz ver. 8 enerji kısa itişe dönüşür."),
      ("fren","asfalt","Fren Dinamosu","Hızlı viraja frenle gir. Freni temiz bıraktığında 8 enerji kazan."),
      ("zirh","tamirci","Saha Onarımı","Darbe sonrası beş saniye temiz sürerek 6 gövde onar.")
    };
    public static string Preview(CatalogNode state,string offer,CatalogNode catalog,out string effect)
    {
      effect="";
      foreach(var p in Pairs){
        if(offer!=p.First && offer!=p.Second)continue;
        string other=offer==p.First?p.Second:p.First;
        bool owned=state["pasifler"].Items.Any(v=>v.S()==other);
        string label=catalog["passives"].Items.First(v=>v["id"].S()==other)["ad"].S();
        effect=p.Effect;
        return p.Name+" · "+label+(owned?" sende.":" ile eşleşir.");
      }
      return "";
    }

    private CatalogNode? lastItems;
    private readonly bool[] active=new bool[3];
    private double drift,charge,boost,braking,cooldown,repair;
    private bool dirty;
    public bool Boosting=>boost>0;
    public string Notice{get;private set;}="";
    public void Reset(){drift=charge=boost=braking=cooldown=repair=0;dirty=false;Notice="";}
    public bool Step(CatalogNode state,MutantAbilityContext c,double dt,bool impact,bool spin=false)
    {
      Notice="";
      if(c.Racing && !c.RaceRunning)return false;
      var items=state["pasifler"];
      if(items!=lastItems){
        lastItems=items;
        var ids=items.Items.Select(i=>i.S()).ToArray();
        for(int i=0;i<Pairs.Length;i++)active[i]=Array.IndexOf(ids,Pairs[i].First)>=0 && Array.IndexOf(ids,Pairs[i].Second)>=0;
      }
      if(!active[0] && !active[1] && !active[2])return false;
      var energy=state["mek"];double speed=JsMath.Hypot(c.Vx,c.Vz);
      if(active[0]){
        boost=Math.Max(0,boost-dt);charge=Math.Max(0,charge-dt);
        if(impact || spin){charge=boost=0;dirty=true;}
        if(c.DriftOn){if(speed>9 && !c.Airborne && Math.Abs(c.Beta)>.22)drift+=dt;}
        else{
          if(!dirty && c.DriftCool<=0 && drift>=1.5){charge=4;Notice="Viraj Çıkışı hazır";}
          drift=0;dirty=false;
          if(!impact && charge>0 && !c.Airborne && speed>7 && c.Throttle>.55 && Math.Abs(c.Steering)<.35 && energy["enerji"].N()>=8){
            energy.Set("enerji",CatalogNode.Num(energy["enerji"].N()-8));boost=.85;charge=0;Notice="Viraj Çıkışı · İtiş";
          }
        }
      }
      if(active[1]){
        cooldown=Math.Max(0,cooldown-dt);
        if(impact || spin || c.Airborne || speed<6)braking=0;
        else if(c.Brake>.2){if(speed>12 && Math.Abs(c.Steering)>.15)braking+=dt;}
        else{
          if(braking>=.3 && cooldown<=0){
            double old=energy["enerji"].N(),next=Math.Min(energy["kapasite"].N(),old+8);
            energy.Set("enerji",CatalogNode.Num(next));cooldown=4;
            if(next>old)Notice="Fren Dinamosu · +"+(next-old).ToString("0.#")+" enerji";
          }
          braking=0;
        }
      }
      if(active[2]){
        if(impact || (spin && repair>0))repair=5;
        else if(repair>0 && speed>4 && !c.Airborne){
          repair-=dt;
          if(repair<=0){
            double old=state["govde"].N(),next=Math.Min(100,old+6);
            state.Set("govde",CatalogNode.Num(next));
            if(next>old){Notice="Saha Onarımı · +"+(next-old).ToString("0.#")+" gövde";return true;}
          }
        }
      }
      return false;
    }
  }
}
