using LastTurn.Core;
internal static class MutantForcesValidation
{
  public static void Run()
  {
    var d=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-forces-0.8.18.json")));
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/vehicle-catalog.json")));
    int checks=0;double max=0;
    void Check(bool ok,string msg){checks++;if(!ok)throw new Exception("P4 kuvvet: "+msg);}
    Check(d["baseline"].S()==VehicleCatalog.Baseline,"Kaynak SHA");
    PowertrainParameters Parameters(){var setup=catalog.Setup(10,Array.Empty<string>(),"real");foreach(string k in new[]{"grip","str","stm","tcs","abs","dft","ini"})setup.Assists.Set(k,CatalogNode.Num(0));setup.Assists.Set("acc",CatalogNode.Num(1));setup.Assists.Set("bra",CatalogNode.Num(1));return catalog.CreatePhysics(setup);}
    foreach(var s in d["scenarios"].Items)
    {
      var car=new PowertrainVehicle(Parameters());car.Step(new DrivingInput(0,0,0,false,false));car.Body.Position+=new BodyVector(0,s["height"].N(),0);int tick=0;
      VehicleFlightInput? f=null;
      if(s.Has("flight")){var n=s["flight"];f=new VehicleFlightInput{Vertical=n["y"].N(),Balance=n["denge"].N(),Forward=n.Has("ileri")?n["ileri"].N():null,Descent=n.Has("inis")?n["inis"].N():null,Yaw=n.Has("yalpa")?n["yalpa"].N():null};if(n.Has("hava"))f.Air=new VehicleAirControl{Held=n["hava"]["parmak"].B(),Pitch=n["hava"]["yunus"].N(),Yaw=n["hava"]["yalpa"].N()};}
      foreach(var row in s["rows"].Items)
      {
        while(tick<row[0].N()){car.SkillInput=new VehicleSkillInput{X=tick<180?s["external"]["x"].N():0,Z=tick<180?s["external"]["z"].N():0,Flight=f!};car.Step(new DrivingInput(1,0,tick<60?0:.12,false,false));tick++;}
        var b=car.Body;var p=b.Position;var v=b.Velocity;var w=b.AngularVelocity;var q=b.Orientation;
        var values=new List<double>{p.X,p.Y,p.Z,v.X,v.Y,v.Z,w.X,w.Y,w.Z,q.X,q.Y,q.Z,q.W,car.Engine.Rpm,car.Engine.Gear};foreach(var tire in b.Wheels)values.AddRange(new[]{tire.Omega,tire.Compression,tire.Load});
        for(int i=0;i<values.Count;i++){double err=Math.Abs(values[i]-row[i+1].N());max=Math.Max(max,err);Check(double.IsFinite(err)&&err<=d["tolerance"].N(),s["name"].S()+" adım "+tick+" alan "+i+" fark "+err);}
      }
    }
    var a=new PowertrainVehicle(Parameters());var b2=new PowertrainVehicle(Parameters());
    for(int i=0;i<120;i++){var input=new DrivingInput(1,0,.1);a.Step(input);b2.Step(input);Check(a.Body.Position.X==b2.Body.Position.X&&a.Body.Position.Y==b2.Body.Position.Y&&a.Body.Position.Z==b2.Body.Position.Z,"Skill yokken aynı tekrar");}
    Console.WriteLine($"P4 kuvvet: {checks} koşul; 1440 kaynak fizik adımı, en büyük fark {max:G3}.");
  }
}
