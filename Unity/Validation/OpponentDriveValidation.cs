using LastTurn.Core;
internal static class OpponentDriveValidation
{
  public static void Run()
  {
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));string Read(string n)=>File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources",n+".json"));
    var vehicles=new VehicleCatalog(Read("vehicle-catalog"));var tracks=new TrackCatalog(Read("track-catalog"));var worlds=new WorldCatalog(Read("world-catalog"),tracks);var events=new RaceEventCatalog(Read("race-events"));var plans=new OpponentCatalog(Read("opponent-catalog"));
    foreach(string type in new[]{"gp","rx","rl","dg"})
    {
      var info=events.Find(type,1);var track=tracks.Tracks[info.Index];int car=(int)vehicles.Data["career"]["starting"][type].N();var setup=vehicles.Setup(car,Array.Empty<string>(),"real");var param=OpponentRacer.CreateParameters(vehicles,setup,type);
      var world=new TrackWorld(track){Environment=worlds.Activate(track.Key)};int i=world.Geometry.Nearest(info.StartX,info.StartZ,0,true).Index;
      var r=new OpponentRacer(param,world,track,info,plans.Plan(track.Key),731,info.StartX+world.Geometry.Tz[i]*4.5,info.StartZ-world.Geometry.Tx[i]*4.5,info.StartHeading);
      int steps=0;while(!r.FinishTime.HasValue && steps++<36000)r.Step();
      Console.WriteLine($"{type}_1 gerçek YZ: bitiş {r.FinishTime?.ToString("F2")??"YOK"}; {steps} adım, dönüş {r.Returns}, temas {r.Vehicle.Body.CollisionCount}, pilot {r.Pilot.Mode}, ipucu {r.Hint}.");
      if(!r.FinishTime.HasValue)throw new Exception(type+"_1 YZ tamamlayamadı.");
    }
  }
}
