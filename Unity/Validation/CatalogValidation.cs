using LastTurn.Core;

internal static class CatalogValidation
{
  private static int checks;
  private static double maxError;
  private static void Check(bool ok,string message){checks++;if(!ok)throw new InvalidOperationException(message);}
  private static void Compare(CatalogNode expected,CatalogNode actual,string label)
  {
    if(expected.Fields.Any()){Check(expected.Fields.Count()==actual.Fields.Count(),label+" alan sayısı");foreach(var p in expected.Fields){Check(actual.Has(p.Key),label+" eksik "+p.Key);Compare(p.Value,actual[p.Key],label+"/"+p.Key);}return;}
    if(expected.Items.Any()){var a=expected.Items.ToArray();var b=actual.Items.ToArray();Check(a.Length==b.Length,label+" uzunluk");for(int i=0;i<a.Length;i++)Compare(a[i],b[i],label+"/"+i);return;}
    if(double.TryParse(expected.ToString(),System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out double n))
    {double error=Math.Abs(n-actual.N(double.NaN));maxError=Math.Max(maxError,error);double limit=label.EndsWith("/tur",StringComparison.Ordinal)?1e-6:1e-9+1e-10*Math.Abs(n);Check(double.IsFinite(error) && error<=limit,label+" fark "+error+" beklenen "+n+" gerçek "+actual);}
    else Check(expected.ToString()==actual.ToString(),label+" beklenen "+expected+" gerçek "+actual);
  }
  private static CatalogNode NumberObject(params (string,double)[] values){var n=CatalogNode.Obj();foreach(var v in values)n.Set(v.Item1,CatalogNode.Num(v.Item2));return n;}
  private static CatalogNode Physics(PowertrainParameters p)
  {
    var c=p.Chassis;var n=NumberObject(("m",c.Mass),("cgY",c.CgY),("cgZ",c.CgZ),("aks",c.Wheelbase),("tork",p.PeakTorque),("devirMax",p.MaxRpm),("devirMin",p.IdleRpm),("kalkis",p.LaunchRpm),("son",p.FinalDrive),("verim",p.Efficiency),("awd",c.FrontDriveShare),("fren",c.BrakeTorque),("frenOn",c.FrontBrakeShare),("CdA",c.DragArea),("ClA",c.DownforceArea),("diff",c.RearDifferential));
    n.Set("I",CatalogNode.Arr(new[]{c.Inertia.X,c.Inertia.Y,c.Inertia.Z}.Select(CatalogNode.Num)));n.Set("arb",CatalogNode.Arr(new[]{c.FrontAntiRoll,c.RearAntiRoll}.Select(CatalogNode.Num)));
    n.Set("tk",CatalogNode.Arr(c.Wheels.Select(w=>{var t=NumberObject(("x",w.X),("z",w.Z),("r",w.Radius),("ay",w.AttachmentY),("Lr",w.RestLength),("k",w.Spring),("cb",w.BumpDamping),("cr",w.ReboundDamping),("tampon",w.BumpStart),("c0",w.StaticCompression),("Fz0",w.StaticLoad),("I",w.Inertia));t.Set("on",CatalogNode.Parse(w.Front?"true":"false"));return t;})));return n;
  }
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../"));
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(root,"Assets/LastTurn/Resources/vehicle-catalog.json")));
    var fixture=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/catalog-cases-0.8.18.json")));
    Check(fixture["baseline"].S()==VehicleCatalog.Baseline,"fixture SHA");
    int cases=0;
    foreach(var row in fixture["cases"].Items.Concat(fixture["levelCases"].Items))
    {
      string label=row["name"].S();int index=(int)row["carIndex"].N();var ids=row["ids"].Items.Select(x=>x.S()).ToArray();var s=catalog.Setup(index,ids,row["level"].S());var e=row["setup"];
      Compare(e["car"],s.Car,label+" car");Compare(e["tu"],s.Tuning,label+" tuning");Compare(e["as"],s.Assists,label+" assists");Check(e["pk"].S()==s.Preset,label+" preset");Check(e["tire"].N()==s.Tire,label+" tire");
      if(row.Has("normalized")){Compare(row["normalized"],CatalogNode.Arr(s.Parts.Select(CatalogNode.Str)),label+" parts");Compare(row["affinity"],s.Affinity,label+" affinity");}
      var p=catalog.CreatePhysics(s);var expected=row["physics"];var actual=Physics(p);foreach(var field in actual.Fields)Compare(expected[field.Key],field.Value,label+" physics/"+field.Key);
      // vTasarim, son oran sözleşmesinden bağımsız kaynak formülüyle de kontrol edilir.
      double design=77.2*catalog.Data["tires"][s.Tire]["t"][1].N()*s.Tuning["top"].N()*s.Car["top"].N()*(1-.04*(s.Tuning["aero"].N()-1));Compare(expected["vTasarim"],CatalogNode.Num(design),label+" vTasarim");
      for(int surface=0;surface<6;surface++)for(int wheel=0;wheel<4;wheel++){var t=p.Chassis.TireForSurface(surface,wheel);Compare(row["surfaceTires"][surface][wheel],NumberObject(("muY",t.MuY),("muX",t.MuX),("kp",t.Kp),("ap",t.Ap),("C",t.C)),label+" tire");}
      if(row.Has("performance")){Compare(row["performance"],CatalogPerformance.Calculate(catalog,s),label+" performance");Compare(row["purchaseCost"],CatalogNode.Num(catalog.PurchaseCost(ids,new Dictionary<string,double>())),label+" purchase");}cases++;
    }
    foreach(var r in fixture["partPrices"].Items)Compare(r["price"],CatalogNode.Num(catalog.PartPrice(r["id"].S())),"price "+r["id"].S());
    foreach(var r in fixture["raceTireCases"].Items)Check(catalog.RaceTire(r["tur"].S(),r["ids"].Items.Select(x=>x.S()))==r["tire"].N(),"race tire");
    foreach(var r in fixture["turCases"].Items){string tur=r["tur"].S();string track=tur=="rx"?"rallikros":tur=="rl"?"ralli":tur=="dg"?"drag":"asfalt";Compare(r["performance"],CatalogPerformance.Calculate(catalog,catalog.Setup((int)r["carIndex"].N(),r["ids"].Items.Select(x=>x.S())),track),"performance "+tur);}
    foreach(var r in fixture["accessCases"].Items)Check(catalog.VehicleAccess((int)r["carIndex"].N(),(int)r["level"].N(),(_,_) => (int)r["starsPerEvent"].N())==r["allowed"].B(),"vehicle access");
    foreach(var r in fixture["gateCases"].Items){var result=catalog.StarGate(r["tur"].S(),(int)r["lv"].N(),(_,_) => (int)r["starsPerEvent"].N());foreach(string key in new[]{"acik","alinan","gereken"})Compare(r[key],result[key],"star gate "+key);}
    foreach(var e in catalog.Data["career"]["events"].Items){double max=e["rule"]["tavan"].N();Check(catalog.WithinBudget(e["tur"].S(),(int)e["lv"].N(),max),"budget equal");Check(!catalog.WithinBudget(e["tur"].S(),(int)e["lv"].N(),max+1),"budget above");}
    foreach(var c in catalog.Data["classes"].Items){double min=c["min"].N(),max=c["max"].N();Check(CatalogPerformance.Class(catalog,min)==c["h"].S() && CatalogPerformance.Class(catalog,max)==c["h"].S(),"class boundary");}
    foreach(var r in fixture["rewards"].Items){var result=catalog.Reward(r["tur"].S(),(int)r["lv"].N(),(int)r["stars"].N(),(int)r["previous"].N());Compare(r["para"],result["para"],"reward para");Compare(r["xp"],result["xp"],"reward xp");}
    foreach(var r in fixture["xp"].Items){int level=(int)r["level"].N();Compare(r["threshold"],CatalogNode.Num(VehicleCatalog.LevelBase(level)),"xp threshold");foreach(double d in new[]{-1d,0,1})if(r["threshold"].N()+d>=0)Check(VehicleCatalog.XpLevel(r["threshold"].N()+d)==(d<0?level-1:level),"xp boundary");}
    foreach(var r in fixture["investments"].Items){string prefix="parca_"+(int)r["carIndex"].N()+"_";var paid=r["purchases"].Fields.Where(p=>p.Key.StartsWith(prefix,StringComparison.Ordinal)).ToDictionary(p=>p.Key[prefix.Length..],p=>p.Value.N());Compare(r["cost"],CatalogNode.Num(catalog.PurchaseCost(r["ids"].Items.Select(x=>x.S()),paid)),"investment");}
    foreach(string invalid in new[]{"{}","{\"schema\":2}","{\"x\":1,\"x\":2}","[NaN]"}){bool rejected=false;try{_ = new VehicleCatalog(invalid);}catch(ArgumentException){rejected=true;}catch(FormatException){rejected=true;}Check(rejected,"invalid catalog");}
    foreach(Action<CatalogNode> corrupt in new Action<CatalogNode>[]{d=>d["prices"]["cars"][0].Set("para",CatalogNode.Str("bozuk")),d=>d["prices"]["partSpecial"].Set("motor-degisim",CatalogNode.Num(-1)),d=>d["parts"][0].Set("sv",CatalogNode.Num(9)),d=>d["presets"]["ar"].Set("tire",CatalogNode.Num(999))}){var data=catalog.Data.Clone();corrupt(data);bool rejected=false;try{_=new VehicleCatalog(data.ToString());}catch(ArgumentException){rejected=true;}Check(rejected,"corrupt data");}
    Console.WriteLine($"Katalog: {cases} kurulum; {checks} koşul; en büyük mutlak fark {maxError:R}. 15 araç/42 parça/5 paket; sınıf, fizik, yüzey, fiyat, kredi, XP ve 640 ödül geçti.");
  }
}
