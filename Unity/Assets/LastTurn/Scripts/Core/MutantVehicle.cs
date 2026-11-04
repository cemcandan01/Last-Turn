using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // TS mutant-kosu.ts kosuAraci/toprakDengesi. Kurulumun kopyası değişir; kariyer aracı korunur.
  public static class MutantVehicle
  {
    public static CatalogNode Apply(CatalogNode stock, IEnumerable<string> passives, double body=100,
      double nitroRemaining=0, double nitroPower=1, double skillPower=1, double skillGrip=1)
    {
      var car=stock.Clone();var ids=passives.ToArray();
      int Count(string id)=>ids.Count(p=>p==id);
      void Multiply(string field,double factor)=>car.Set(field,CatalogNode.Num(car[field].N()*factor));
      void Grip(int index,double factor)
      {
        double a=car["gr"][0].N(),b=car["gr"][1].N();
        car.Set("gr",CatalogNode.Arr(new[]{CatalogNode.Num(index==0?a*factor:a),CatalogNode.Num(index==1?b*factor:b)}));
      }
      foreach(string id in ids)
      {
        switch(id)
        {
          case "guc":Multiply("hp",1.1);break;
          case "hafif":Multiply("kg",.94);break;
          case "asfalt":Grip(1,1.07);break;
          case "toprak":Grip(0,1.1);break;
          case "fren":Multiply("brk",1.15);break;
          case "aci":car.Set("dmax",CatalogNode.Num(car["dmax"].N(.8)+.08));break;
        }
      }
      body=Math.Max(0,Math.Min(100,body));
      double rule=(1+.25*Count("camtop"))*(body<50?1+.15*Count("adrenalin"):1);
      double hp=Math.Min(car["hp"].N()*rule,stock["hp"].N()*1.9);
      hp*=1-.3*(1-body/100);
      hp*=Math.Min(1.9,(nitroRemaining>0?nitroPower:1)*skillPower);
      car.Set("hp",CatalogNode.Num(hp));
      double grip=Math.Min(1.3,skillGrip);Grip(0,grip);Grip(1,grip);
      return car;
    }

    public static CatalogNode DirtBalance(CatalogNode car,double tireGrip)
    {
      double combined=tireGrip*car["gr"][0].N();
      if(combined>=1)return car;
      var copy=car.Clone();copy.Set("gr",CatalogNode.Arr(new[]{CatalogNode.Num((1-(1-combined)*.55)/tireGrip),car["gr"][1]}));
      return copy;
    }

    public static CatalogSetup Configure(VehicleCatalog catalog,CatalogSetup setup,CatalogNode run)
    {
      var effect=run["becCikti"];var energy=run["mek"];
      bool hasTire=setup.Parts.Any(id=>catalog.Data["parts"].Items.Any(p=>p["id"].S()==id && p["e"].Has("lastik")));
      int tire=hasTire?setup.Tire:(int)catalog.Data["presets"][setup.Preset]["tire"].N();
      var car=Apply(setup.Car,run["pasifler"].Items.Select(p=>p.S()),run["govde"].N(100),
        energy["etkiKalan"].N(),energy["etkiGuc"].N(1),effect["guc"].N(1),effect["tutus"].N(1));
      car=DirtBalance(car,catalog.Data["tires"][tire]["g"][0].N(1));
      return new CatalogSetup{Car=car,Tuning=setup.Tuning,Assists=setup.Assists,Parts=setup.Parts,
        Preset=setup.Preset,Tire=tire,Affinity=setup.Affinity};
    }
  }
}
