using LastTurn.Core;

internal static class MutantRacePlanValidation
{
  public static void Run()
  {
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));string Resource(string file)=>File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources",file));
    var data=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-race-plan-0.8.18.json")));
    var catalog=CatalogNode.Parse(Resource("mutant-catalog.json"));var vehicles=new VehicleCatalog(Resource("vehicle-catalog.json"));var tracks=new TrackCatalog(Resource("track-catalog.json"));
    var events=new RaceEventCatalog(Resource("race-events.json"));var worlds=new WorldCatalog(Resource("world-catalog.json"),tracks);var opponents=new OpponentCatalog(Resource("opponent-catalog.json"));
    var career=new GarageState(vehicles);var profile=new RaceProfile();string careerBefore=career.Snapshot().ToString(),profileBefore=profile.Snapshot().ToString();
    int checks=0,plans=0,boundaries=0;double error=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("Mutant yarış planı: "+label);}
    void Near(double actual,double expected,string label){double e=Math.Abs(actual-expected);error=Math.Max(error,e);Check(e<=1e-9,label+" "+actual+" != "+expected);}
    void Compare(CatalogNode actual,CatalogNode expected,string label)
    {
      if(expected.IsNumber){Near(actual.N(double.NaN),expected.N(),label);return;}
      if(expected.ToString().StartsWith("{")){Check(actual.Fields.Select(p=>p.Key).OrderBy(k=>k).SequenceEqual(expected.Fields.Select(p=>p.Key).OrderBy(k=>k)),label+" alanları");foreach(var p in expected.Fields)Compare(actual[p.Key],p.Value,label+"."+p.Key);return;}
      if(expected.ToString().StartsWith("[")){var a=actual.Items.ToArray();var e=expected.Items.ToArray();Check(a.Length==e.Length,label+" dizi");for(int i=0;i<e.Length;i++)Compare(a[i],e[i],label+"["+i+"]");return;}
      Check(actual.ToString()==expected.ToString(),label+" "+actual+" != "+expected);
    }
    Check(data["baseline"].S()==VehicleCatalog.Baseline,"Kaynak SHA");
    foreach(var row in data["plans"].Items)
    {
      bool boss=row["bossType"].S()!="";var run=new MutantRun((uint)row["seed"].N(),catalog);run.State.Set("bolge",row["region"]);run.State.Set("faz",CatalogNode.Str(boss?"boss":"surus"));
      if(boss)run.State.Set("boss",catalog["bosses"].Items.First(b=>b["ty"].S()==row["bossType"].S()).Clone());else run.State.Set("etkinlikler",CatalogNode.Arr(new[]{row["entry"].Clone()}));
      var plan=MutantRacePlan.Create(run,(int)row["player"].N(),(int)row["eventIndex"].N(),(int)row["risk"].N(),boss,events,tracks,worlds);var e=plan.Event;var meta=row["metadata"];string label="Plan "+plans+" pist "+e.Index;
      Check(e.Index==row["index"].N()&&plan.Boss==boss,label+" indeks/boss");Check(e.Key==meta["key"].S(),label+" kayıt anahtarı");
      Check(e.Type==meta["type"].S()&&e.Level==meta["level"].N()&&e.Difficulty==meta["difficulty"].N(),label+" tür/seviye/zorluk");
      Check(e.Name==meta["name"].S()&&e.Description==meta["description"].S(),label+" başlık/açıklama");Check(e.Region==meta["region"].N()&&e.Preset==meta["preset"].S(),label+" bölge/önayar "+e.Region+" != "+meta["region"]);
      Check(e.Laps==row["laps"].N(),label+" tur sayısı");Near(e.Limit,row["limit"].N(),label+" hedef");for(int i=0;i<3;i++)Near(e.Stars[i],meta["stars"][i].N(),label+" yıldız "+i);
      Near(e.StartX,meta["start"][0].N(),label+" başlangıç x");Near(e.StartZ,meta["start"][1].N(),label+" başlangıç z");Near(e.StartHeading,meta["start"][2].N(),label+" başlangıç yön");
      Compare(plan.Opponent??CatalogNode.Parse("null"),row["opponent"],label+" rakip");Check(plan.Duel==row["opponent"]["duello"].B(),label+" düello");
      OpponentRacer? opponent=null;
      if(plan.Opponent!=null)
      {
        var spawn=plan.OpponentStart();Near(spawn.X,row["spawn"]["x"].N(),label+" rakip spawn x");Near(spawn.Z,row["spawn"]["z"].N(),label+" rakip spawn z");Near(spawn.Heading,row["spawn"]["h"].N(),label+" rakip spawn yön");
        var p=vehicles.CreatePhysics(vehicles.Setup((int)plan.Opponent["arac"].N(),plan.Opponent["parca"].Items.Select(id=>id.S())));
        opponent=new OpponentRacer(p,plan.World,plan.Track,e,opponents.Plan(plan.Track.Key,plan.Opponent["kisilik"].S()),(uint)plan.Opponent["tohum"].N(),spawn.X,spawn.Z,spawn.Heading);
      }
      var race=new RaceSession(e,plan.Track,false,plan.Track.Geometry.Nearest(e.StartX,e.StartZ,0,true).Index,mutant:true);
      Check(!race.Career&&race.Mutant&&race.RecordKey=="mutant_"+meta["key"].S(),label+" ayrı kayıt/kariyer modu");
      foreach(var result in row["results"].Items)
      {
        if(result["result"].ToString()=="null"){Check(result["time"].N()<=0||result["state"].S()!="run",label+" source endEvent guard");continue;}
        typeof(RaceSession).GetProperty(nameof(RaceSession.Time))!.SetValue(race,result["time"].N());race.Drift.Score=result["score"].N();
        if(opponent!=null)typeof(OpponentRacer).GetProperty(nameof(OpponentRacer.FinishTime))!.SetValue(opponent,result["finish"].ToString()=="null"?null:result["finish"].N());
        var active=result["exists"].B()?opponent:null;
        Check(plan.Passed(race,active!)==result["result"]["passed"].B(),label+" sonuç/hedef/eşitlik");
        bool? expected=result["result"]["beat"].ToString()=="null"?null:result["result"]["beat"].B();Check(plan.BeatOpponent(race,active!)==expected,label+" rakip ek ödülü");boundaries++;
      }
      Check(career.Snapshot().ToString()==careerBefore&&profile.Snapshot().ToString()==profileBefore,label+" kariyer/profil değişmedi");plans++;
    }
    var invalid=new MutantRun(1,catalog);string before=invalid.State.ToString();
    try{MutantRacePlan.Create(invalid,0,-99,0,false,events,tracks,worlds);throw new Exception("Eksik etkinlik kabul edildi");}catch(InvalidOperationException){checks++;}
    Check(before==invalid.State.ToString(),"Eksik etkinlik ret durumunu korur");
    try{MutantRacePlan.Create(invalid,-1,0,0,false,events,tracks,worlds);throw new Exception("Araç seçilmeden yarış kabul edildi");}catch(ArgumentOutOfRangeException){checks++;}
    Check(before==invalid.State.ToString(),"Araç seçilmemiş ret durumu korur");
    Check(plans==324,"49 etkinlik ve bütün boss matris kapsamı");Console.WriteLine($"Mutant yarış planı: {checks} koşul, {plans} TS plan, {boundaries} sentetik sonuç sınırı; 49 etkinlik/3 risk/2 araç, 3 bölge/5 boss, kaynak spawn, kariyer ayrımı. En büyük fark {error:G3}. Bu test fiziksel yarış/Play kabulü değildir.");
  }
}
