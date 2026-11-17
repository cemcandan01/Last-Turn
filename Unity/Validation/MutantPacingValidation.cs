using LastTurn.Core;
using System.Text.Json;
using System.Security.Cryptography;

internal static class MutantPacingValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../.."));
    string Read(string name)=>File.ReadAllText(Path.Combine(root,"Unity/Assets/LastTurn/Resources",name));
    var catalog=CatalogNode.Parse(Read("mutant-catalog.json"));var vehicles=new VehicleCatalog(Read("vehicle-catalog.json"));
    var worlds=new WorldCatalog(Read("world-catalog.json"),new TrackCatalog(Read("track-catalog.json")));
    int checks=0;void Check(bool value,string label){checks++;if(!value)throw new Exception("Dolaşım ölçümü: "+label);}
    MutantRun Region(uint seed,int region)
    {
      var r=new MutantRun(seed,catalog);r.Choose(r.State["secenekler"][0].S());
      while(r.Region<region){r.EnterBoss();r.FinishBoss(true);while(r.State["faz"].S()=="secim")r.Choose(r.State["secenekler"][0].S());}
      return r;
    }
    var geometry=new List<object>();
    for(int region=1;region<=3;region++)
      for(uint seed=1;seed<=64;seed++)
      {
        var r=Region(seed,region);var spawn=worlds.Region(region>=2?"city":"hub").Teleports[0];
        var markers=MutantWorldMarkerModel.Read(r);var events=markers.Where(m=>m.Kind=="event").ToList();
        double x=spawn.X,z=spawn.Z;var legs=new List<double>();
        while(events.Count>0){var next=events.OrderBy(m=>JsMath.Hypot(m.X-x,m.Z-z)).First();legs.Add(JsMath.Hypot(next.X-x,next.Z-z));x=next.X;z=next.Z;events.Remove(next);}
        Check(legs.Count==8&&legs.All(double.IsFinite),"8 etkinlik geometrisi");
        double nearest=legs[0];Check(nearest>0,"Başlangıç ve etkinlik çakışmıyor");
        int hiddenNearest=markers.Where(m=>!m.Used).OrderBy(m=>JsMath.Hypot(m.X-spawn.X,m.Z-spawn.Z)).First().Kind=="chest"?1:0;
        geometry.Add(new{region,seed,nearestMeters=nearest,geometricSecondsAt50=nearest/(50/3.6),greedyDistanceMeters=legs.Sum(),maximumLegMeters=legs.Max(),hiddenNearest});
      }
    // Kısa gerçek fizik yaklaşmaları: sabit bir nokta takipçisi, insan veya yarış kazanma ölçümü değildir.
    var drives=new List<object>();
    foreach(uint seed in new uint[]{7,53,83})for(int region=1;region<=3;region++)
    {
      var r=Region(seed,region);int selected=MutantMenuModel.StartingCars(seed,catalog)[0];
      var terrain=new OpenWorld(worlds,region>=2?"city":"hub");var spawn=terrain.Region.Teleports[0];var ramp=worlds.Region("hub").Teleports.First(t=>t.Name=="Zıplama rampası");
      var session=new MutantGameSession(r,vehicles,selected,ramp.X,ramp.Z);var car=new PowertrainVehicle(session.BuildPhysics(),world:terrain);car.Place(spawn.X,spawn.Z,spawn.Heading);
      var target=MutantWorldMarkerModel.Read(r).Where(m=>m.Kind=="event").OrderBy(m=>JsMath.Hypot(m.X-spawn.X,m.Z-spawn.Z)).First();
      double driven=0,active=0,withoutMission=0,firstMission=-1,lastX=spawn.X,lastZ=spawn.Z;int started=0,completed=0,missed=0,ticks=0;bool arrived=false;
      for(;ticks<60*90&&!r.Finished;ticks++)
      {
        var p=car.ReferencePoint;double distance=JsMath.Hypot(target.X-p.X,target.Z-p.Z);var forward=car.Body.Orientation.Rotate(new BodyVector(0,0,1));
        double heading=Math.Atan2(forward.X,forward.Z),error=Math.Atan2(Math.Sin(Math.Atan2(target.X-p.X,target.Z-p.Z)-heading),Math.Cos(Math.Atan2(target.X-p.X,target.Z-p.Z)-heading));
        double speed=car.Body.Velocity.Length,targetSpeed=Math.Min(20,Math.Sqrt(4*Math.Max(0,distance-3)))/(1+Math.Abs(error));
        car.Step(new DrivingInput(Math.Clamp((targetSpeed-speed)/2,0,1),Math.Clamp((speed-targetSpeed)/3,0,1),Math.Clamp(error*2.4,-1,1),true,true));
        p=car.ReferencePoint;driven+=JsMath.Hypot(p.X-lastX,p.Z-lastZ);lastX=p.X;lastZ=p.Z;
        var drift=RaceDrift.Detect(car.Body,car.Assist.On);
        var nearby=terrain.Near(p.X,p.Z,car.Body.Position.Y).Where(o=>o.Type=="solid"||o.Type=="box").Select(o=>new MutantRoadObstacle(o.X+","+o.Z,o.X,o.Z,o.Type=="box"?JsMath.Hypot(o.HalfX,o.HalfZ):o.Radius)).ToArray();
        var events=session.Step(new MutantSessionInput{X=p.X,Z=p.Z,Speed=drift.Speed,Hit=car.Body.LastHitTime,Beta=drift.Beta,HasSimulation=true,Drifting=drift.Active,Airborne=!car.Body.Wheels.Any(w=>w.Contact),Obstacles=nearby},1d/60);
        foreach(var e in events){if(e.Kind=="gorev"){if(e.Detail=="basladi"){started++;if(firstMission<0)firstMission=(ticks+1)/60d;}else if(e.Detail=="tamam")completed++;else missed++;}if(e.Kind=="isaret"&&e.Detail=="etkinlik"&&e.Id==int.Parse(target.Key[1..]))arrived=true;}
        if(session.Missions.Active!=null)active+=1d/60;else withoutMission+=1d/60;
        if(arrived)break;
      }
      Check(car.Body.Steps>0&&double.IsFinite(driven),"Gerçek fizik yaklaşması");
      drives.Add(new{seed,region,car=selected,target=target.Name,arrived,seconds=(ticks+1)/60d,drivenMeters=driven,remainingMeters=JsMath.Hypot(target.X-car.ReferencePoint.X,target.Z-car.ReferencePoint.Z),started,completed,missed,firstMissionSeconds=firstMission,missionActiveSeconds=active,withoutMissionSeconds=withoutMission,body=r.State["govde"].N()});
    }
    string[] sources={"MutantRun.cs","MutantGameSession.cs","MutantRoadMission.cs","MutantHudModel.cs","WorldCatalog.cs","MutantWorldMarkerModel.cs"};
    var report=new{result="mutant-pacing-measured",utc=DateTime.UtcNow.ToString("O"),checks,limits="192 sabit tohum/bölge geometrisi: kuş uçuşu alt sınır, rota ve insan süresi değil. 9 yaklaşma: gerçek fizik, basit nokta takipçisi, 90 sn sınırı; insan başarı/keyif kabulü değil. Yol görevi pasif beceri/enerji callback'i kapalı; süre/ödül değiştirilmedi.",geometry,drives,sources=sources.Select(s=>new{path=s,hash=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(root,"Unity/Assets/LastTurn/Scripts/Core",s))))})};
    Directory.CreateDirectory(Path.Combine(root,"tests/cikti"));File.WriteAllText(Path.Combine(root,"tests/cikti/mutant-pacing-baseline.json"),JsonSerializer.Serialize(report,new JsonSerializerOptions{WriteIndented=true}));
    Console.WriteLine($"Dolaşım: {checks} kontrol; 192 geometri / 9 gerçek fizik yaklaşması. Ayrıntı tests/cikti/mutant-pacing-baseline.json; süre/ödül aynı.");
  }
}
