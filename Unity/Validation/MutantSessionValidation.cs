using LastTurn.Core;

internal static class MutantSessionValidation
{
  public static void Run()
  {
    var data=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-session-0.8.18.json")));
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    var vehicles=new VehicleCatalog(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/vehicle-catalog.json")));
    var catalog=CatalogNode.Parse(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/mutant-catalog.json")));
    var career=new GarageState(vehicles);string untouched=career.Snapshot().ToString();
    int checks=0,steps=0,callbacks=0;double maxError=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("Mutant oturum: "+label);}
    Check(data["baseline"].S()==VehicleCatalog.Baseline,"Kaynak SHA");
    void Compare(CatalogNode actual,CatalogNode expected,string label)
    {
      if(expected.IsNumber){double error=Math.Abs(actual.N(double.NaN)-expected.N());maxError=Math.Max(maxError,error);Check(double.IsFinite(error)&&error<=1e-9,label+": "+actual+" != "+expected);return;}
      if(expected.ToString().StartsWith("{")){
        Check(actual.Fields.Select(p=>p.Key).OrderBy(k=>k).SequenceEqual(expected.Fields.Select(p=>p.Key).OrderBy(k=>k)),label+" alanları");foreach(var p in expected.Fields)Compare(actual[p.Key],p.Value,label+"."+p.Key);return;}
      if(expected.ToString().StartsWith("[")){var a=actual.Items.ToArray();var e=expected.Items.ToArray();Check(a.Length==e.Length,label+" dizi");for(int i=0;i<e.Length;i++)Compare(a[i],e[i],label+"["+i+"]");return;}
      Check(actual.ToString()==expected.ToString(),label+": "+actual+" != "+expected);
    }
    CatalogNode Json(object value)=>CatalogNode.Parse(System.Text.Json.JsonSerializer.Serialize(value));
    CatalogNode Mission(MutantRoadMission? m)=>m==null?CatalogNode.Parse("null"):Json(new{tur=m.Kind,hedef=m.Target,ilerleme=m.Progress,kalan=m.Remaining,para=m.Money,enerji=m.Energy});
    CatalogNode Snapshot(MutantGameSession session,int energyCalls)
    {
      var run=CatalogNode.Obj();foreach(string f in new[]{"faz","bolge","kalan","zaman","govde","para","carpma","spin","pert","bekleyenHasar","sonNefes"})run.Set(f,session.Run.State[f]);
      var nearby=CatalogNode.Obj();foreach(string id in session.Missions.Nearby)nearby.Set(id,CatalogNode.Parse("true"));
      var n=Json(new{energy=session.Run.State["mek"]["enerji"].N(),markers=new{inside=session.Markers.Inside,closed=session.Markers.Closed,wait=session.Markers.Wait},pendingBoss=session.PendingBoss,lastHit=session.LastHit,spinning=session.Spinning,refreshes=session.VehicleRefreshes,energyCalls});n.Set("run",run);
      var missions=Json(new{bekleme=session.Missions.Wait,tamamlanan=session.Missions.Completed});missions.Set("aktif",Mission(session.Missions.Active));missions.Set("yakin",nearby);n.Set("missions",missions);return n;
    }
    foreach(var scenario in data["runs"].Items)
    {
      var session=new MutantGameSession(new MutantRun((uint)scenario["seed"].N(),catalog,scenario["test"].B()),vehicles,(int)scenario["car"].N(),data["ramp"][1].N(),data["ramp"][2].N());int calls=0;
      session.EnergyAndSkills=(_,_,_,_)=>{calls++;callbacks++;return false;};Compare(Snapshot(session,calls),scenario["initial"],"Başlangıç");
      foreach(var row in scenario["steps"].Items)
      {
        var a=row["args"];CatalogNode result=CatalogNode.Parse("null");
        switch(row["name"].S())
        {
          case "choose":result=CatalogNode.Parse(session.Run.Choose(a[0].S())?"true":"false");break;
          case "enterBoss":session.Run.EnterBoss();break;
          case "boss":session.Run.FinishBoss(a[0].B());break;
          case "step":
            var i=a[0];var output=session.Step(new MutantSessionInput{
              X=i["x"].N(),Z=i["z"].N(),Speed=i["speed"].N(),Hit=i["hit"].N(),Beta=i["beta"].N(),Racing=i["racing"].B(),HasSimulation=i["hasSimulation"].B(),RaceStarted=i["raceStarted"].B(),Drifting=i["drifting"].B(),Airborne=i["airborne"].B(),
              Obstacles=i["obstacles"].Items.Select(o=>new MutantRoadObstacle(o["id"].S(),o["x"].N(),o["z"].N(),o["r"].N())).ToArray()},a[1].N());
            result=CatalogNode.Arr(output.Select(e=>{var ev=Json(new{kind=e.Kind,detail=e.Detail,id=e.Id,wrecked=e.Wrecked});if(e.Mission!=null)ev.Set("mission",Mission(e.Mission.Mission));return ev;}));break;
          default:throw new Exception("Bilinmeyen oturum komutu");
        }
        Compare(result,row["result"],"Sonuç "+steps);Compare(Snapshot(session,calls),row["state"],"Durum "+steps);steps++;
      }
      var setup=session.BuildSetup();foreach(var p in scenario["finalCar"].Fields)Compare(setup.Car[p.Key],p.Value,"Gerçek araç "+p.Key);
      var damaged=session.BuildPhysics();var fresh=vehicles.CreatePhysics(MutantVehicle.Configure(vehicles,vehicles.Setup(session.SelectedCar,Array.Empty<string>()),CatalogNode.Parse("{\"govde\":100,\"pasifler\":[]}")));
      Check(damaged.PeakTorque<fresh.PeakTorque,"Gövde kaybı gerçek motor torkunu düşürüyor");
      var car=new PowertrainVehicle(damaged);for(int tick=0;tick<30;tick++)car.Step(new DrivingInput(1,0,0));Check(car.Body.Steps==30,"Gerçek Powertrain 30 sabit adım");
      Check(career.Snapshot().ToString()==untouched,"Kariyer ekonomisi/profili korunur");
    }
    Check(callbacks>0,"P4 bağlama çağrı sınırı");Console.WriteLine($"Mutant oturum: {checks} koşul, {steps} kaynak işlem, {callbacks} P4 çağrı sınırı; en büyük fark {maxError:G3}. Gerçek araç parametreleri ve 4×30 fizik adımı. P4 yürütmesi kapsam dışı.");
  }
}
