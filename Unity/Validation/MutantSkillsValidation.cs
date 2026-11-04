using LastTurn.Core;

internal static class MutantSkillsValidation
{
  public static void Run()
  {
    var fixture=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-skills-0.8.18.json")));
    int checks=0,ticks=0,checkpoints=0;double worst=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException("Mutant skill: "+label);}
    void Same(CatalogNode actual,CatalogNode expected,string label)
    {
      if(expected.IsNumber){double delta=Math.Abs(actual.N(double.NaN)-expected.N());worst=Math.Max(worst,delta);Check(double.IsFinite(delta)&&delta<=1e-9*Math.Max(1,Math.Abs(expected.N())),label+" TS "+expected+" C# "+actual);return;}
      if(expected.ToString().StartsWith("{")){
        Check(actual.Fields.Select(p=>p.Key).OrderBy(k=>k).SequenceEqual(expected.Fields.Select(p=>p.Key).OrderBy(k=>k)),label+" nesne alanları TS "+string.Join(",",expected.Fields.Select(p=>p.Key))+" C# "+string.Join(",",actual.Fields.Select(p=>p.Key)));
        foreach(var p in expected.Fields)Same(actual[p.Key],p.Value,label+"."+p.Key);return;
      }
      if(expected.ToString().StartsWith("[")){var a=actual.Items.ToArray();var e=expected.Items.ToArray();Check(a.Length==e.Length,label+" dizi uzunluğu");for(int i=0;i<e.Length;i++)Same(a[i],e[i],label+"["+i+"]");return;}
      Check(actual.ToString()==expected.ToString(),label+" TS "+expected+" C# "+actual);
    }
    CatalogNode Bool(bool b)=>CatalogNode.Parse(b?"true":"false");
    CatalogNode Text(string? s)=>s==null?CatalogNode.Parse("null"):CatalogNode.Str(s);
    CatalogNode Point(double[]? p)=>p==null?CatalogNode.Parse("null"):CatalogNode.Arr(p.Select(CatalogNode.Num));
    MutantSkillWorld World(CatalogNode w)=>new MutantSkillWorld{
      Player=w["oyuncu"].Clone(),Targets=w["hedefler"].Clone(),Racing=w["yarista"].B(),Ground=w["zemin"].N(),Steering=w["direksiyon"].N(),
      Held=w.Has("basili")?w["basili"].Items.Select(x=>x.S()).ToArray():null,
      Link=(_,_)=>w.Has("link")?w["link"].Items.Select(x=>x.N()).ToArray():null,
      Corner=w.Has("corner")?_=>w["corner"].Clone():null,Sky=w.Has("sky")?()=>w["sky"].Clone():null};
    Check(fixture["baseline"].S()==VehicleCatalog.Baseline,"Sabit TS kaynak SHA");
    Same(MutantSkills.Initialize(),fixture["scenarios"][0]["initial"],"Başlangıç");
    foreach(var p in fixture["parameters"].Items)Same(MutantSkills.Parameters(p["skill"]["id"].S(),p["skill"]),p["parameters"],"Seviye parametresi "+p["skill"]);
    foreach(var c in fixture["charges"].Items)Same(CatalogNode.Num(MutantSkills.Charges(c["local"],c["parameters"])),c["value"],"Hak ilk dolum/seviye artışı/azalışı");
    foreach(var b in fixture["bars"].Items)Same(CatalogNode.Num(MutantSkills.Bar(b["id"].S(),b["local"],b["parameters"])),b["value"],"Dolum barı "+b["id"].S());
    var effects=new Dictionary<string,int>(StringComparer.Ordinal){["playerAcceleration"]=0,["targetAcceleration"]=0,["flight"]=0,["ghost"]=0,["power"]=0,["damage"]=0,["status"]=0,["nearMiss"]=0,["following"]=0,["cuts"]=0};
    double followingCredit=0;int observedNear=0,observedFollow=0;
    foreach(var scenario in fixture["scenarios"].Items)
    {
      var state=scenario["initial"].Clone();CatalogNode previous=CatalogNode.Arr(Array.Empty<CatalogNode>());
      double damageSum=0,maxPower=1,followSum=0;int flightCount=0,ghostCount=0,statusCount=0,nearCount=0,index=0;
      var equipped=scenario["equipped"].Items.ToArray();
      foreach(var frame in scenario["steps"].Items)
      {
        string label=scenario["name"].S()+" adım "+index++;var eq=frame.Has("equipped")?frame["equipped"].Items.ToArray():equipped;
        var world=World(frame["world"]);double dt=frame["dt"].N();var events=new List<CatalogNode>();if(frame["feedback"].B())events.AddRange(previous.Items);events.AddRange(frame["events"].Items);
        if(frame.Has("observe"))
        {
          var observation=frame["observe"];string before=state.ToString();var o=MutantSkills.ObserveProximity(state,world,observation["engeller"].Items,dt,observation["carpti"].B());
          Check(state.ToString()==before,label+" yakınlık girdiyi değiştirmez");state=o.State;events.AddRange(o.Events.Items);
          observedNear+=o.Events.Items.Count(e=>e["tur"].S()=="NearMiss");observedFollow+=o.Events.Items.Count(e=>e["tur"].S()=="YakinTakip");
          if(scenario["name"].S()=="takip-kredi-tukenme-dolum")followingCredit+=o.Events.Items.Where(e=>e["tur"].S()=="YakinTakip").Sum(e=>e["dt"].N());
          if(frame.Has("observation")){Same(state,frame["observation"]["d"],label+" gözlem durumu");Same(o.Events,frame["observation"]["olaylar"],label+" gözlem olayları");}
        }
        string stateBefore=state.ToString(),equippedBefore=CatalogNode.Arr(eq).ToString();
        string[] requests=MutantSkills.Requests(state,eq,world,frame["requests"].Items.Select(x=>x.S()));
        if(frame.Has("helpers"))
        {
          var h=frame["helpers"];Same(CatalogNode.Arr(MutantSkills.Normalize(eq)),h["normalized"],label+" normalize");Same(MutantSkills.Flags(state,eq),h["flags"],label+" bayraklar");
          Same(CatalogNode.Arr(requests.Select(CatalogNode.Str)),h["requests"],label+" istek filtresi");
          foreach(var p in h["blockers"].Fields)Same(Text(MutantSkills.Blocker(state,eq,world,p.Key)),p.Value,label+" engel "+p.Key);
          foreach(var p in h["ready"].Fields)Same(Bool(MutantSkills.Ready(state,eq,world,p.Key)),p.Value,label+" hazır "+p.Key);
          foreach(var p in h["targets"].Fields)Same(Point(MutantSkills.TargetPoint(state,eq,world,p.Key)),p.Value,label+" hedef noktası "+p.Key);
        }
        Check(state.ToString()==stateBefore,label+" HUD yardımcıları durumu değiştirmez");
        var requested=frame["unfiltered"].B()?frame["requests"].Items.Select(x=>x.S()):requests;
        var step=MutantSkills.Step(state,eq,world,dt,events,requested);
        Check(state.ToString()==stateBefore&&CatalogNode.Arr(eq).ToString()==equippedBefore,label+" yürütücü girdiyi değiştirmez");state=step.State;var output=step.Output;previous=output["olaylar"];
        if(frame.Has("expected")){Same(state,frame["expected"]["d"],label+" durum");Same(output,frame["expected"]["cikti"],label+" gerçek çıktı");checkpoints++;}
        double acceleration=Math.Sqrt(output["oyuncuIvme"]["x"].N()*output["oyuncuIvme"]["x"].N()+output["oyuncuIvme"]["z"].N()*output["oyuncuIvme"]["z"].N());
        Check(acceleration<=12+1e-9,label+" yatay oyuncu ivme tavanı");if(acceleration>0)effects["playerAcceleration"]++;
        bool targetAcceleration=false;foreach(var pair in output["hedefIvme"].Fields){double a=JsMath.Hypot(pair.Value["x"].N(),pair.Value["z"].N());Check(a<=12+1e-9,label+" rakip ivme tavanı");targetAcceleration|=a>0;}if(targetAcceleration)effects["targetAcceleration"]++;
        var flight=output["ucus"];if(flight.ToString()!="null")
        {flightCount++;effects["flight"]++;Check(JsMath.Hypot(flight["x"].N(),flight["z"].N())<=60+1e-9&&flight["y"].N()>=-60&&flight["y"].N()<=84,label+" 3B uçuş sınırları");if(flight.Has("ileri"))Check(flight["ileri"].N()<=60,label+" ileri itki tavanı");if(flight.Has("inis"))Check(flight["inis"].N()>=2,label+" süzülme alt sınırı");if(flight.Has("yalpa"))Check(Math.Abs(flight["yalpa"].N())<=4,label+" yalpa sınırı");}
        if(output["hayalet"].B()){ghostCount++;effects["ghost"]++;Check(output["saldiriKapali"].B(),label+" faz saldırıyı kapatır");}
        maxPower=Math.Max(maxPower,output["guc"].N());if(output["guc"].N()>1)effects["power"]++;
        var damages=output["olaylar"].Items.Where(e=>e["tur"].S()=="HasarVerildi").ToArray();damageSum+=damages.Sum(e=>e["miktar"].N());effects["damage"]+=damages.Length;
        Check(!output["saldiriKapali"].B()||damages.Length==0,label+" fazda hasar yok");
        foreach(var target in damages.GroupBy(e=>e["hedef"].S()))Check(target.Sum(e=>e["miktar"].N())<=10+1e-9,label+" hedef başına adım hasarı tavanı");
        int statuses=output["olaylar"].Items.Count(e=>e["tur"].S()=="DurumUygulandi");statusCount+=statuses;effects["status"]+=statuses;
        foreach(var target in state["hedefler"].Fields){Check(target.Value["govde"].N()>=0&&target.Value["govde"].N()<=100,label+" rakip gövdesi");foreach(var status in target.Value["durumlar"].Items)Check(status["kalan"].N()>0&&status["kalan"].N()<=3,label+" sonlu durum süresi");}
        Check(output["olaylar"].Items.Count()<=64,label+" olay işleme tavanı");if(output["olaylar"].Items.Count()==64)effects["cuts"]++;
        nearCount+=events.Count(e=>e["tur"].S()=="NearMiss");followSum+=events.Where(e=>e["tur"].S()=="YakinTakip").Sum(e=>e["dt"].N());effects["nearMiss"]+=events.Count(e=>e["tur"].S()=="NearMiss");effects["following"]+=events.Count(e=>e["tur"].S()=="YakinTakip");
        ticks++;
      }
      var summary=scenario["summary"];void Total(double actual,double expected,string name)=>Same(CatalogNode.Num(actual),CatalogNode.Num(expected),scenario["name"].S()+" toplam "+name);
      Total(damageSum,summary["totalDamage"].N(),"hasar");Total(maxPower,summary["maxPower"].N(),"güç");Total(flightCount,summary["flight"].N(),"uçuş");Total(ghostCount,summary["ghost"].N(),"faz");Total(statusCount,summary["status"].N(),"durum");Total(followSum,summary["follow"].N(),"takip");Total(nearCount,summary["near"].N(),"near-miss");
    }
    foreach(var effect in effects){Check(effect.Value>0,"Gerçek C# etki kapsamı: "+effect.Key);Check(effect.Value==fixture["coverage"]["effects"][effect.Key].N(),"TS etki sayısı "+effect.Key);}
    Check(observedNear>0&&observedFollow>0,"Gerçek yakınlık gözlemcisi iki olay türünü üretir");Check(followingCredit<=4.26&&followingCredit>=4,"Takip kredisi ilk4sn ve sınırlı dolum");
    Check(ticks==fixture["totalSteps"].N()&&checkpoints==fixture["coverage"]["checkpoints"].N(),"Bütün oracle adımları/noktaları çalıştı");
    Console.WriteLine($"Mutant skill: {checks} koşul, {ticks} adım, {checkpoints} tam TS durum/çıktı noktası, en büyük fark {worst:G3}; beş skill gerçek hasar/ivme/koruma/uçuş, seviye/evrim/eklenti, hak/bekleme ve yakınlık sınırları. Runtime/Play kabulü değildir.");
  }
}
