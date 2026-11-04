using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  public sealed class CatalogSetup
  {
    public CatalogNode Car = CatalogNode.Obj(), Tuning = CatalogNode.Obj(), Assists = CatalogNode.Obj(), Affinity = CatalogNode.Obj();
    public int Tire;
    public string Preset = "";
    public string[] Parts = Array.Empty<string>();
  }

  // Sürüş sahnelerinden bağımsız veri sınırı. Kabul edilmiş GT/arazi fabrikalarını değiştirmez.
  public sealed class VehicleCatalog
  {
    public const string Baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05";
    public CatalogNode Data { get; }
    private readonly Dictionary<string,CatalogNode> parts;
    public VehicleCatalog(string json)
    {
      Data=CatalogNode.Parse(json);
      if(Data["schema"].N()!=1 || Data["baseline"].S()!=Baseline)throw new ArgumentException("Katalog sürümü/kaynak SHA geçersiz.");
      parts=new Dictionary<string,CatalogNode>(StringComparer.Ordinal);
      var categories=Data["categories"].Items.Select(c=>c[0].S()).ToArray();
      if(categories.Length==0 || categories.Distinct().Count()!=categories.Length)throw new ArgumentException("Kategori kimlikleri geçersiz.");
      foreach(var p in Data["parts"].Items){if(p["id"].S()=="" || parts.ContainsKey(p["id"].S()) || !categories.Contains(p["kat"].S()))throw new ArgumentException("Parça kimliği/kategorisi geçersiz.");parts.Add(p["id"].S(),p);}
      var cars=Data["cars"].Items.ToArray();
      if(cars.Length==0 || cars.Select(c=>c["k"].S()).Distinct().Count()!=cars.Length)throw new ArgumentException("Araç kimlikleri geçersiz.");
      if(Data["prices"]["cars"].Items.Count()!=cars.Length || Data["surfaces"].Items.Count()!=6)throw new ArgumentException("Fiyat/yüzey kapsamı eksik.");
      void Number(CatalogNode n,double min,double max){if(!n.IsNumber || n.N()<min || n.N()>max)throw new ArgumentException("Katalog sayısı/aralığı geçersiz.");}
      foreach(var price in Data["prices"]["cars"].Items){Number(price["para"],0,double.MaxValue);Number(price["seviye"],1,int.MaxValue);}
      foreach(var p in Data["prices"]["partSpecial"].Fields){if(!parts.ContainsKey(p.Key))throw new ArgumentException("Özel fiyat parçası yok.");Number(p.Value,0,double.MaxValue);}
      foreach(var p in Data["prices"]["partBase"].Items)Number(p,0,double.MaxValue);
      foreach(var category in categories)Number(Data["prices"]["categoryMultiplier"][category],0,double.MaxValue);
      foreach(var p in parts.Values){Number(p["sv"],0,3);if(p["sv"].N()%1!=0)throw new ArgumentException("Parça seviyesi tam sayı olmalı.");if(p["e"].Has("lastik"))Number(p["e"]["lastik"],0,Data["tires"].Items.Count()-1);}
      foreach(var p in Data["presets"].Fields){Number(p.Value["tire"],0,Data["tires"].Items.Count()-1);foreach(string key in new[]{"pow","susp","top","brk","bb","bal","lch","thr","lock","sens","aero","diff","tpf","tpr"})Number(p.Value["v"][key],0,double.MaxValue);}
      foreach(string key in new[]{"norm","arc","real"}){if(!Data["levels"].Has(key))throw new ArgumentException("Yardım seviyesi eksik.");foreach(string field in new[]{"acc","bra","grip","tcs","abs"})Number(Data["levels"][key]["v"][field],0,double.MaxValue);}
      if(Data["packages"].Items.Select(p=>p["id"].S()).Distinct().Count()!=Data["packages"].Items.Count())throw new ArgumentException("Paket kimliği tekrarlı.");
      foreach(var p in Data["packages"].Items)foreach(var id in p["parcalar"].Items.Concat(p["oneri"].Items))if(!parts.ContainsKey(id.S()))throw new ArgumentException("Paket parçası bulunamadı.");
      double previous=99;foreach(var c in Data["classes"].Items){if(c["min"].N()!=previous+1 || c["max"].N()<c["min"].N())throw new ArgumentException("Sınıf aralığı geçersiz.");previous=c["max"].N();}if(previous!=999)throw new ArgumentException("Sınıf tavanı eksik.");
      for(int i=0;i<cars.Length;i++)CreatePhysics(Setup(i,Array.Empty<string>()));
    }
    public string[] Normalize(IEnumerable<string> ids)
    {
      var selected=new Dictionary<string,string>();foreach(string id in ids)if(parts.TryGetValue(id,out var p))selected[p["kat"].S()]=id;
      return Data["categories"].Items.Select(c=>c[0].S()).Where(selected.ContainsKey).Select(c=>selected[c]).ToArray();
    }
    public CatalogSetup Setup(int car,IEnumerable<string> ids,string level="norm")
    {
      if(car<0 || car>=Data["cars"].Items.Count())throw new ArgumentOutOfRangeException(nameof(car));
      if(!Data["levels"].Has(level))throw new ArgumentException("Yardım seviyesi bulunamadı.");
      var stock=Data["cars"][car];var c=stock.Clone();var selected=Normalize(ids);var ayar=CatalogNode.Obj();string pk=c["pk"].S();int tire=(int)Data["presets"][pk]["tire"].N();
      foreach(string id in selected)
      {
        var e=parts[id]["e"];
        if(e.Has("motorHp")){c.Set("hp",e["motorHp"]);c.Set("tb",CatalogNode.Num(0));c.Remove("tbs");c.Remove("tbu");}
        foreach(var pair in e["carp"].Fields)c.Set(pair.Key,CatalogNode.Num(c[pair.Key].N()*pair.Value.N()));
        var add=e["ekle"];double hcgShare=1;
        if(add["lift"].N()!=0){double before=c["lift"].N(),lift=add["lift"].N();double after=lift>0?Math.Max(before,lift):before+lift;c.Set("lift",CatalogNode.Num(after));if(lift>0)hcgShare=(after-before)/lift;}
        if(add["hcg"].N()!=0)c.Set("hcg",CatalogNode.Num(c["hcg"].N(.48)+add["hcg"].N()*(add["hcg"].N()>0?hcgShare:1)));
        if(e.Has("gr"))c.Set("gr",CatalogNode.Arr(new[]{CatalogNode.Num(c["gr"][0].N()*e["gr"][0].N()),CatalogNode.Num(c["gr"][1].N()*e["gr"][1].N())}));
        if(e.Has("awd")){if(e["awd"].N()>0 && stock["awd"].N()==0)c.Set("kg",CatalogNode.Num(c["kg"].N()*1.05));c.Set("awd",e["awd"]);}
        foreach(string key in new[]{"dmax","dk","fq"})if(e.Has(key))c.Set(key,e[key]);
        if(e.Has("lastik"))tire=(int)e["lastik"].N();foreach(var pair in e["ayar"].Fields)ayar.Set(pair.Key,pair.Value);
      }
      var turbo=selected.Select(id=>parts[id]["e"]).FirstOrDefault(e=>e.Has("turbo"));
      if(turbo!=null){var t=turbo["turbo"];c.Set("hp",CatalogNode.Num(c["hp"].N()*t["guc"].N()));if(t.Has("tbs")){c.Set("tb",CatalogNode.Num(1-(1-c["tb"].N())/t["guc"].N()));c.Set("tbs",t["tbs"]);if(t.Has("tbu"))c.Set("tbu",t["tbu"]);else if(stock.Has("tbu"))c.Set("tbu",stock["tbu"]);}}
      var affinity=CatalogNode.Obj();string dominant="";double best=0;
      var families=new Dictionary<string,string>{{"gp","ar"},{"rx","tr"},{"rl","rl"},{"dp","dr"},{"dg","dg"}};
      foreach(var p in Data["packages"].Items){double f=(double)p["parcalar"].Items.Count(id=>selected.Contains(id.S()))/p["parcalar"].Items.Count();string type=p["tur"].S();if(f>0)affinity.Set(type,CatalogNode.Num(f));if(f>=2.0/3 && (dominant=="" || f>best)){dominant=type;best=f;}}
      if(dominant!="")pk=families[dominant];var preset=Data["presets"][pk];if(!Data["presets"].Has(pk))throw new ArgumentException("Önayar bulunamadı.");
      var tuning=preset["v"].Clone();foreach(var p in ayar.Fields)tuning.Set(p.Key,p.Value);
      var assists=Data["levels"][level]["v"].Clone();foreach(var p in preset["ast"].Fields)assists.Set(p.Key,CatalogNode.Num(Math.Max(assists[p.Key].N(),p.Value.N())));foreach(var p in preset["cap"].Fields)assists.Set(p.Key,CatalogNode.Num(Math.Min(assists[p.Key].N(),p.Value.N())));
      return new CatalogSetup{Car=c,Tuning=tuning,Assists=assists,Preset=pk,Tire=tire,Parts=selected,Affinity=affinity};
    }
    public int RaceTire(string type,IEnumerable<string> ids)
    {
      int quality=0;foreach(string id in ids)if(parts.TryGetValue(id,out var p) && p["kat"].S()=="lastik")quality=(int)p["sv"].N();
      var types=new Dictionary<string,int>{{"gp",0},{"rx",1},{"rl",1},{"dp",3},{"dg",6}};if(!types.ContainsKey(type))throw new ArgumentException("Yarış türü geçersiz.");int b=types[type];return quality>0?7+b*3+quality-1:b;
    }
    public double PartPrice(string id)
    {
      if(!parts.TryGetValue(id,out var p))return 0;var prices=Data["prices"];return prices["partSpecial"].Has(id)?prices["partSpecial"][id].N():JsRound(prices["partBase"][(int)p["sv"].N()].N()*prices["categoryMultiplier"][p["kat"].S()].N(1)/50)*50;
    }
    // purchases: bu aracın parça kimliği -> gerçekten ödenmiş net bedel; diğer aracın kayıtları buraya girmez.
    public double PurchaseCost(IEnumerable<string> ids,IReadOnlyDictionary<string,double> purchases)
    {
      var investment=new Dictionary<string,double>();foreach(var pair in purchases)if(parts.TryGetValue(pair.Key,out var p)){string k=p["kat"].S();investment[k]=(investment.TryGetValue(k,out var x)?x:0)+pair.Value;}
      double total=0;var seen=new HashSet<string>();foreach(string id in ids){if(!seen.Add(id) || !parts.TryGetValue(id,out var p) || purchases.ContainsKey(id) || PartPrice(id)<=0)continue;string k=p["kat"].S();double credit=investment.TryGetValue(k,out var x)?x:0;double cost=Math.Max(0,PartPrice(id)-credit);total+=cost;investment[k]=credit+cost;}return total;
    }
    public static double JsRound(double n)=>Math.Floor(n+.5);
    public static double LevelBase(int n)=>(n-1)*40+15.0*(n-1)*(n-2);
    public static int XpLevel(double xp){Numeric.NonNegative(xp);int n=1;while(xp>=LevelBase(n+1))n++;return n;}
    public CatalogNode CareerRule(string type,int level) => Data["career"]["events"].Items.FirstOrDefault(e=>e["tur"].S()==type && e["lv"].N()==level)?["rule"] ?? CatalogNode.Obj();
    public bool WithinBudget(string type,int level,double points){var rule=CareerRule(type,level);return rule.Has("tavan") && points<=rule["tavan"].N();}
    public bool CareerEligible(string type,int level,int car,IEnumerable<string> ids)=>WithinBudget(type,level,CatalogPerformance.Calculate(this,Setup(car,ids))["puan"].N());
    public CatalogNode StarGate(string type,int level,Func<string,int,int> stars)
    {
      var rule=CareerRule(type,level);int stage=(int)rule["asama"].N(),earned=0,required=0;bool open=rule.Has("asama");
      if(stage>1){var previous=Data["career"]["events"].Items.Where(e=>e["tur"].S()==type && e["rule"]["asama"].N()==stage-1).ToArray();earned=previous.Sum(e=>stars(type,(int)e["lv"].N()));required=(int)Math.Ceiling(previous.Length*3*.6);open=previous.Length>0 && earned>=required;}
      var r=CatalogNode.Obj();r.Set("acik",CatalogNode.Parse(open?"true":"false"));r.Set("alinan",CatalogNode.Num(earned));r.Set("gereken",CatalogNode.Num(required));return r;
    }
    public bool VehicleAccess(int car,int level,Func<string,int,int> stars)
    {
      if(car<0 || car>=Data["cars"].Items.Count())throw new ArgumentOutOfRangeException(nameof(car));
      return level>=Data["prices"]["cars"][car]["seviye"].N() || Data["career"]["events"].Items.Any(e=>e["tur"].S()==Data["cars"][car]["ty"].S() && e["rule"]["asama"].N()>=Data["career"]["vehicleStages"][car].N() && StarGate(e["tur"].S(),(int)e["lv"].N(),stars)["acik"].B());
    }
    public CatalogNode Reward(string type,int level,int stars,int previous)
    {
      var e=Data["career"]["events"].Items.FirstOrDefault(x=>x["tur"].S()==type && x["lv"].N()==level);var r=CatalogNode.Obj();double factor=(stars>0?1:.35)+Math.Max(0,Math.Min(3,Math.Max(0,stars))-Math.Min(3,Math.Max(0,previous)))*.5;
      foreach(string k in new[]{"para","xp"})r.Set(k,CatalogNode.Num(JsRound((e==null?0:e["baseReward"][k].N())*factor)));return r;
    }
    public PowertrainParameters CreatePhysics(CatalogSetup s)
    {
      var c=s.Car;var tu=s.Tuning;var a=s.Assists;var w=c["wh"];var constants=Data["constants"];double g=constants["gravity"].N(24),vmax=constants["vmax"].N(77.2),rho=constants["rho"].N(1.2);
      double m=c["kg"].N(),ff=c["ff"].N(.55),aks=w["zf"].N()-w["zr"].N(),fn=c["fq"].N(Data["frequencies"][c["k"].S()].N(1.9))/Math.Sqrt(tu["susp"].N());var wheels=new WheelGeometry[4];
      for(int i=0;i<4;i++){bool front=i<2;double mc=m*(front?ff:1-ff)/2,k=mc*Math.Pow(2*Math.PI*fn,2),c0=mc*g/k,r=front?w["r"].N():w["rr"].N(w["r"].N()),lr=c0+.1,kr=2*Math.Sqrt(k*mc);wheels[i]=new WheelGeometry((i%2==0?1:-1)*(front?w["x"].N():w["rx"].N(w["x"].N())),front?w["zf"].N():w["zr"].N(),r,front,r+lr-c0,lr,k,.35*kr,.55*kr,c0+.12,c0,mc*g,1.2+4*r*r);}
      var tire=Data["tires"][s.Tire];if(s.Tire<0 || s.Tire>=Data["tires"].Items.Count())throw new ArgumentException("Lastik bulunamadı.");double maxRpm=c["dv"].N(7500),wm=maxRpm*2*Math.PI/60,power=c["hp"].N()*745.7*tu["pow"].N()*a["acc"].N();double design=vmax*tire["t"][1].N()*tu["top"].N()*c["top"].N()*(1-.04*(tu["aero"].N()-1)),vs=design*.92;
      var surfaceTires=new TireParameters[6][];
      for(int surface=0;surface<6;surface++){surfaceTires[surface]=new TireParameters[4];var sf=Data["surfaces"][surface];int ti=(int)sf["ti"].N();bool loose=surface!=1;for(int i=0;i<4;i++){bool front=i<2;double tp=tu[front?"tpf":"tpr"].N(),mu=sf["a"].N()/30*tire["g"][ti].N()*c["gr"][ti].N()*(1+.25*a["grip"].N())*constants["grip"].N(1.15)*(1-(loose?.35:.15)*(tp-1));mu*=c[front?"fb":"rb"].N();if(loose)mu*=constants["looseGrip"].N(.75)*(front?1:constants["looseRear"].N(.92));double b=tire["B"][ti].N()*(surface==3?.85:1)*tp,shape=loose?Math.Max(tire["C"][ti].N(),constants["looseC"].N(1.55)):tire["C"][ti].N(),ap=Math.Tan(Math.PI/(2*Math.Max(1.05,shape)))/b;surfaceTires[surface][i]=new TireParameters(mu,mu*tire["lg"][ti].N(1),loose?.18:.11,loose?Math.Min(ap,constants["loosePeak"].N(.24)):ap,shape);}}
      var chassis=new VehicleParameters(m,new BodyVector(.28*m*aks*aks,.3*m*aks*aks*Math.Sqrt(c["iz"].N()),.32*m),c["hcg"].N(.48)+c["lift"].N(),w["zr"].N()+ff*aks,aks,wheels,surfaceTires[1],wheels[0].Spring*.7*tu["bal"].N(),wheels[2].Spring*.7*(2-tu["bal"].N()),c["awd"].N(),30*a["bra"].N()*tu["brk"].N()*c["brk"].N()*m*w["r"].N()*1.05,tu["bb"].N(),Math.Max(.25,2*(.9*power-.012*m*g*vs)/(rho*Math.Pow(vs,3))),(.5*tu["aero"].N()*c["ae"].N()*m*g)/(.5*rho*vmax*vmax),Math.Min(1,tu["diff"].N()),c["dk"].N(220),c["w"].N(),c["lift"].N(),c["dmax"].N(.8),surfaceTires);
      var result=new PowertrainParameters(chassis,power/(wm*.747),maxRpm,900,1800+2600*tu["lch"].N(),wm*w["rr"].N(w["r"].N())/(.88*design*1.02),.9,tu["thr"].N(),tu["lch"].N(),tu["lock"].N(),tu["sens"].N(),c["tb"].N(),c["tbs"].N(1),c["tbu"].N(.6),a["tcs"].N(),a["abs"].N());
      result.Assists=new DrivingAssists{Str=a["str"].N(),Stm=a["stm"].N(),Dft=a["dft"].N(),Ini=a["ini"].N(),DriftPreset=s.Preset=="dr"||s.Preset=="fd"||s.Preset=="fa",DesignSpeed=design,AeroFactor=tu["aero"].N()*c["ae"].N()};
      return result;
    }
  }
}
