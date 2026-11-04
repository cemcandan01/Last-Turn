using LastTurn.Core;

internal static class GarageDriveValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../"));
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(root,"Assets/LastTurn/Resources/vehicle-catalog.json")));
    var fixture=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/garage-operations-0.8.18.json")));
    int checks=0,profiles=0;
    void Check(bool ok,string message){checks++;if(!ok)throw new InvalidOperationException(message);}
    void N(double expected,double actual,string key){Check(double.IsFinite(actual) && Math.Abs(expected-actual)<=1e-9+Math.Abs(expected)*1e-10,"Garaj sürüş "+key+" fark "+Math.Abs(expected-actual));}
    foreach(var row in fixture["driveProfiles"].Items)
    {
      var ids=row["ids"].Items.Select(n=>n.S()).ToArray();var raw=catalog.Setup((int)row["carIndex"].N(),ids);
      string before=raw.Car.ToString();var configured=GarageDriveParameters.Configure(catalog,raw,row["terrain"].B(),row["raceType"].S());
      var p=GarageDriveParameters.Create(catalog,raw,row["terrain"].B(),row["raceType"].S());var f=row["physics"];var c=p.Chassis;
      Check(before==raw.Car.ToString(),"Adaptör kaynak kurulumu değiştirdi");Check(configured.Tire==row["tire"].N(),"Adaptör lastik");
      for(int i=0;i<2;i++)N(row["car"]["gr"][i].N(),configured.Car["gr"][i].N(),"gr");
      foreach(var pair in new[]{("m",c.Mass),("cgY",c.CgY),("cgZ",c.CgZ),("aks",c.Wheelbase),("tork",p.PeakTorque),("devirMax",p.MaxRpm),("devirMin",p.IdleRpm),("kalkis",p.LaunchRpm),("son",p.FinalDrive),("verim",p.Efficiency),("awd",c.FrontDriveShare),("fren",c.BrakeTorque),("frenOn",c.FrontBrakeShare),("CdA",c.DragArea),("ClA",c.DownforceArea),("diff",c.RearDifferential)})N(f[pair.Item1].N(),pair.Item2,pair.Item1);
      for(int i=0;i<4;i++){var w=c.Wheels[i];var e=f["tk"][i];N(e["x"].N(),w.X,"wheel x");N(e["r"].N(),w.Radius,"wheel r");N(e["k"].N(),w.Spring,"wheel spring");N(e["Fz0"].N(),w.StaticLoad,"wheel load");}
      N(configured.Car["k"].S()=="gt" && p.LaunchRpm<=3000?3000:p.MaxRpm,p.ReverseMaxRpm,"geri profil istisnası");profiles++;
    }
    Check(profiles>0,"Sürüş fixture boş");
    var options=new[]{Array.Empty<string>()}.Concat(catalog.Data["parts"].Items.Select(p=>new[]{p["id"].S()})).Concat(catalog.Data["packages"].Items.Select(p=>p["parcalar"].Items.Select(x=>x.S()).ToArray())).ToArray();
    int builds=0;
    for(int car=0;car<catalog.Data["cars"].Items.Count();car++)foreach(var ids in options)foreach(bool terrain in new[]{false,true})
    {var p=GarageDriveParameters.Create(catalog,catalog.Setup(car,ids),terrain);var sim=new PowertrainVehicle(p,world:terrain?new TerrainTestWorld():FlatAsphaltWorld.Instance);sim.Step(new DrivingInput(.3,0,0));Check(double.IsFinite(sim.Body.Position.Y),"Garaj sürüş bağlantısı sonlu");builds++;}
    Console.WriteLine($"Garaj sürüş adaptörü: {profiles} özgün TS profil, {builds} araç/parça/paket/zemin bağlantısı; {checks} koşul geçti. Varsayılan prototip kabulü ayrı Play testlerinde sınanır.");
  }
}
