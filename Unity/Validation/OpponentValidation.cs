using LastTurn.Core;

internal static class OpponentValidation
{
  public static void Run()
  {
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    string Resource(string file)=>File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources",file));
    var catalog=new OpponentCatalog(Resource("opponent-catalog.json"));var tracks=new TrackCatalog(Resource("track-catalog.json"));
    var vehicles=new VehicleCatalog(Resource("vehicle-catalog.json"));var events=new RaceEventCatalog(Resource("race-events.json"));
    var fixture=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/opponent-0.8.18.json")));
    int checks=0;double error=0;string where="";
    void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException("Rakip "+where+": "+label);}
    void Near(double expected,double actual,string label,double tolerance=1e-9){error=Math.Max(error,Math.Abs(expected-actual));Check(Math.Abs(expected-actual)<=tolerance,"TS "+label+" "+expected.ToString("R")+" C# "+actual.ToString("R"));}
    void State(CatalogNode e,OpponentPilot d,double tolerance=1e-9){Check(e["mod"].S()==d.Mode,"pilot modu");Check(e["i"].N()==d.Index && e["tur"].N()==d.Lap,"pilot indeks/tur");Near(e["ilerleme"].N(),d.Progress,"ilerleme",tolerance);Near(e["sure"].N(),d.Time,"süre",tolerance);Near(e["takili"].N(),d.Stuck,"takılma",tolerance);Near(e["geriT"].N(),d.ReverseTime,"geri süre",tolerance);Near(e["hedefHiz"].N(),d.TargetSpeed,"hedef hız",tolerance);Check(e["toparlanma"].N()==d.Recoveries && e["kenar"].N()==d.EdgeCorrections && e["pistDisi"].N()==d.OffTrackSteps,"taktik sayaçları");}
    void Input(CatalogNode e,DrivingInput d,double tolerance=1e-9){Near(e["tg"].N(),d.Steering,"direksiyon",tolerance);Near(e["g"].N(),d.Throttle,"gaz",tolerance);Near(e["b"].N(),d.Brake,"fren",tolerance);Check(e["dbr"].B()==d.Handbrake,"el freni");}
    Check(fixture["baseline"].S()==TrackCatalog.Baseline,"sabit kaynak");
    foreach(var track in tracks.Tracks)foreach(string personality in new[]{"caylak","deneyimli","boss"}){var plan=catalog.Plan(track.Key,personality);Check(plan.N==track.Geometry.N,"40×3 plan/pist eşlemesi");}
    foreach(var sc in fixture["pilots"].Items)
    {
      where=sc["key"].S()+"/"+sc["personality"].S();var plan=catalog.Plan(sc["key"].S(),sc["personality"].S());var d=new OpponentPilot(plan,(uint)sc["seed"].N(),sc["start"][0].N(),sc["start"][1].N());
      foreach(var row in sc["rows"].Items){var a=row["a"];var input=d.Step(a["x"].N(),a["z"].N(),a["h"].N(),a["vx"].N(),a["vz"].N(),a["beta"].N(),1.0/60,row["started"].B());Input(row["input"],input);State(row["state"],d);}
    }
    foreach(var sc in fixture["races"].Items)
    {
      where="gerçek fizik "+sc["key"].S();var info=events.Events.Single(e=>e.Type+"_"+e.Level==sc["key"].S());var track=tracks.Tracks[info.Index];
      var setup=vehicles.Setup((int)sc["car"].N(),Array.Empty<string>(),sc["level"].S());var parameters=OpponentRacer.CreateParameters(vehicles,setup,info.Type);
      var start=sc["start"];var r=new OpponentRacer(parameters,FlatAsphaltWorld.Instance,track,info,catalog.Plan(track.Key,sc["personality"].S()),(uint)sc["seed"].N(),start["x"].N(),start["z"].N(),start["h"].N());
      int tick=0;foreach(var row in sc["rows"].Items)
      {
        DrivingInput input=default;while(tick<row["step"].N()){input=r.Step(tick>=6);tick++;}
        Input(row["input"],input,1e-6);State(row["pilot"],r.Pilot,1e-6);
        var p=r.Vehicle.ReferencePoint;var f=r.Vehicle.Body.Orientation.Rotate(new BodyVector(0,0,1));double[] values={p.X,p.Z,Math.Atan2(f.X,f.Z),r.Vehicle.Body.Velocity.X,r.Vehicle.Body.Velocity.Z};
        for(int i=0;i<values.Length;i++)Near(row["body"][i].N(),values[i],"gövde "+i,1e-5);
        Check(r.Lap==row["lap"].N() && r.Hint==row["hint"].N() && r.Armed==row["armed"].B() && r.Returns==row["returns"].N(),"yarış sayaçları");Near(row["time"].N(),r.Time,"yarış süresi");
        Check(row["finish"].IsNumber==r.FinishTime.HasValue,"bitiş boş/dolu");if(r.FinishTime.HasValue)Near(row["finish"].N(),r.FinishTime.Value,"bitiş süresi");
      }
      Check(r.Vehicle.Body.Steps>0 && r.Vehicle.ReferencePoint.X!=start["x"].N(),"rakip gerçek fizikle ilerledi");
    }
    Console.WriteLine($"Rakip TS–C#: {checks} koşul, 120 otomatik plan; 10800 sentetik pilot ve 4800 gerçek fizik adımı. En büyük fark {error:G3}.");
  }
}
