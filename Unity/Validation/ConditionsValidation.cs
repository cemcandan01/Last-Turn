using LastTurn.Core;

// P5 hava/günün saati: TS temaları/condOf/havaTutusu, Unity bölge eşlemesi, hava tutuşlu gerçek fizik ve hayalet hava kaydı.
internal static class ConditionsValidation
{
  private sealed class World(double grip):IVehicleWorld{public double Height(double x,double z)=>0;public int Surface(double x,double z)=>1;public double GripMultiplier=>grip;}
  public static void Run()
  {
    var f=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/conditions-0.8.18.json")));
    var physics=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/weather-physics-0.8.18.json")));
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    int checks=0;double max=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException("Hava: "+label);}
    Check(f["baseline"].S()==VehicleCatalog.Baseline&&physics["baseline"].S()==VehicleCatalog.Baseline,"Sabit TS kaynak SHA");
    var world=CatalogNode.Parse(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/world-catalog.json")))["regions"].Items.ToArray();
    Check(world[0]["key"].S()=="hub","Unity açık dünya hub bölge dışı (TS applyEnv day)");
    foreach(var r in f["regions"].Items)
    {
      int i=(int)r["index"].N();Check(RaceConditions.Theme(i)==r["theme"].S(),"Bölge teması "+i);
      Check(world[i+1]["key"].S()==r["key"].S(),"Unity bölge anahtarı sırası "+r["key"].S());Check(RaceConditions.ThemeOf(r["key"].S())==r["theme"].S(),"Anahtardan tema "+r["key"].S());
    }
    Check(RaceConditions.ThemeOf("hub")=="day"&&RaceConditions.Theme(99)=="day","Tanımsız bölge day");
    Check(RaceConditions.TimesOfDay.Select(t=>t.Key+"="+t.Name).SequenceEqual(f["tods"].Fields.Select(p=>p.Key+"="+p.Value.S())),"Günün saati adları (TS TODS)");
    Check(RaceConditions.Weathers.Select(t=>t.Key+"="+t.Name).SequenceEqual(f["wxs"].Fields.Select(p=>p.Key+"="+p.Value.S())),"Hava adları (TS WXS)");
    foreach(var p in f["conds"].Fields){var c=RaceConditions.DefaultFor(p.Key);Check(c.TimeOfDay==p.Value["tod"].S()&&c.Weather==p.Value["wx"].S(),"condOf "+p.Key);}
    foreach(var p in f["grips"].Fields)foreach(var w in p.Value.Fields)Check(RaceConditions.Grip(p.Key,w.Key)==w.Value.N(),"havaTutusu "+p.Key+"/"+w.Key);
    // Hava tutuşu gerçek fizikte: TS model.ts mu × havaTutusu ile aynı iz.
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/vehicle-catalog.json")));
    PowertrainParameters Parameters(){var setup=catalog.Setup(10,Array.Empty<string>(),"real");foreach(string k in new[]{"grip","str","stm","tcs","abs","dft","ini"})setup.Assists.Set(k,CatalogNode.Num(0));setup.Assists.Set("acc",CatalogNode.Num(1));setup.Assists.Set("bra",CatalogNode.Num(1));return catalog.CreatePhysics(setup);}
    DrivingInput Input(string move,int n)=>move=="hizlan-fren"?new DrivingInput(n<150?1:0,n<150?0:1,0,false,false):new DrivingInput(1,0,n<90?0:1,false,false,n>=90&&n<130);
    var ends=new Dictionary<string,double>();
    foreach(var s in physics["scenarios"].Items)
    {
      var car=new PowertrainVehicle(Parameters(),world:new World(s["grip"].N()));car.Step(new DrivingInput(0,0,0,false,false));int tick=0;
      foreach(var row in s["rows"].Items)
      {
        while(tick<row[0].N()){car.Step(Input(s["move"].S(),tick));tick++;}
        var b=car.Body;var p=b.Position;var v=b.Velocity;var w=b.AngularVelocity;var q=b.Orientation;
        var values=new List<double>{p.X,p.Y,p.Z,v.X,v.Y,v.Z,w.X,w.Y,w.Z,q.X,q.Y,q.Z,q.W,car.Engine.Rpm,car.Engine.Gear};foreach(var t in b.Wheels)values.AddRange(new[]{t.Omega,t.Compression,t.Load});
        for(int i=0;i<values.Count;i++){double err=Math.Abs(values[i]-row[i+1].N());max=Math.Max(max,err);Check(double.IsFinite(err)&&err<=physics["tolerance"].N(),s["name"].S()+" adım "+tick+" alan "+i+" fark "+err);}
      }
      ends[s["name"].S()]=car.Body.Position.Z;
    }
    Check(ends["hizlan-fren-0.74"]>ends["hizlan-fren-0.84"]&&ends["hizlan-fren-0.84"]>ends["hizlan-fren-1"],"Kaygan zeminde fren mesafesi uzar (kar > yağmur > güneş)");
    // Hayalet hava kaydı: TS hava {tutus, karli}; eski kayıtta yok → güncel hava.
    var g=new GhostRecord{Key="gp_1",Car=0,Result=60,Inputs=new InputRecording()};for(int i=0;i<3;i++)g.Inputs.Record(new DrivingInput(1,0,0,false,false));
    g.Weather=new GhostWeather(.84,false);var back=GhostRecord.Restore(g.Snapshot(),"gp_1");Check(back!=null&&back.Weather?.Grip==.84&&back.Weather?.Snowy==false,"Hayalet hava kaydı gidiş-dönüş");
    var old=g.Snapshot();old.Remove("hava");Check(GhostRecord.Restore(old,"gp_1")?.Weather==null,"Eski hayalet kaydında hava yok");
    var bad=g.Snapshot();bad["hava"].Set("tutus",CatalogNode.Num(-1));Check(GhostRecord.Restore(bad,"gp_1")?.Weather==null,"Geçersiz hava tutuşu yok sayılır");
    var boss=CatalogNode.Parse("{\"hava\":\"rain\",\"gece\":true}");var day=RaceConditions.DefaultFor("day");var b2=day.ForBoss(boss);
    Check(b2.Weather=="rain"&&b2.Night&&day.Weather=="sun"&&!day.Night,"Boss havası/gecesi dayatılır, önceki koşul korunur (TS mutantBossKosulu)");
    Console.WriteLine($"Hava: {checks} koşul; {f["regions"].Items.Count()} bölge teması, condOf/havaTutusu, 4 tutuş × 2 manevra × 240 TS fizik adımı (en büyük fark {max:G3}), hayalet hava kaydı, boss koşulu.");
  }
}
