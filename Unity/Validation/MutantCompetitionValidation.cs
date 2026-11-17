using LastTurn.Core;
using System.Text.Json;
using System.Security.Cryptography;

internal static class MutantCompetitionValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../.."));
    string Read(string name)=>File.ReadAllText(Path.Combine(root,"Unity/Assets/LastTurn/Resources",name));
    var vehicles=new VehicleCatalog(Read("vehicle-catalog.json"));var tracks=new TrackCatalog(Read("track-catalog.json"));
    var worlds=new WorldCatalog(Read("world-catalog.json"),tracks);var catalog=CatalogNode.Parse(Read("mutant-catalog.json"));
    var events=new RaceEventCatalog(Read("race-events.json"));var opponents=new OpponentCatalog(Read("opponent-catalog.json"));
    var results=new List<object>();int checks=0,finished=0,failed=0,skipped=0,totalReturns=0,totalHits=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("Rakip ölçümü: "+label);}
    foreach(uint seed in new uint[]{7,53,83})foreach(int region in new[]{1,2})
    {
      var run=new MutantRun(seed,catalog);run.Choose(run.State["secenekler"][0].S());if(region==2){run.EnterBoss();run.FinishBoss(true);while(run.State["faz"].S()=="secim")run.Choose(run.State["secenekler"][0].S());}
      int player=MutantMenuModel.StartingCars(seed,catalog)[0];
      foreach(string type in region==1?new[]{"gp","rx","rl"}:new[]{"tur","ab","kovala"})
      {
        var entry=run.State["etkinlikler"].Items.First(e=>e[region==1?"ty":"sokak"].S()==type);
        var plan=MutantRacePlan.Create(run,player,(int)entry["id"].N(),0,false,events,tracks,worlds);
        if(plan.Opponent==null){skipped++;results.Add(new{seed,region,type,track=plan.Track.Key,skipped="Kaynakta rakipsiz rampa/pist istisnası"});continue;}
        var spec=plan.Opponent;var setup=vehicles.Setup((int)spec["arac"].N(),spec["parca"].Items.Select(x=>x.S()));
        var physics=OpponentRacer.CreateMutantParameters(vehicles,setup,spec["pasif"].Items.Select(x=>x.S()));var spawn=plan.OpponentStart();
        var racer=new OpponentRacer(physics,plan.World,plan.Track,plan.Event,opponents.Plan(plan.Track.Key,spec["kisilik"].S()),(uint)spec["tohum"].N(),spawn.X,spawn.Z,spawn.Heading);
        int ticks=0;double maxStep=0;var previous=racer.Vehicle.ReferencePoint;
        for(;ticks<60*360&&!racer.FinishTime.HasValue;ticks++)
        {
          var input=racer.Step();Check(double.IsFinite(input.Steering)&&Math.Abs(input.Steering)<=1&&input.Throttle>=0&&input.Throttle<=1&&input.Brake>=0&&input.Brake<=1,"Girdi sınırı");
          var point=racer.Vehicle.ReferencePoint;double distance=JsMath.Hypot(point.X-previous.X,point.Z-previous.Z);maxStep=Math.Max(maxStep,distance);previous=point;
        }
        if(racer.FinishTime.HasValue)finished++;else failed++;totalReturns+=racer.Returns;totalHits+=racer.Vehicle.Body.CollisionCount;
        results.Add(new{seed,region,type,track=plan.Track.Key,personality=spec["kisilik"].S(),car=(int)spec["arac"].N(),finished=racer.FinishTime.HasValue,seconds=racer.FinishTime??360,returns=racer.Returns,hits=racer.Vehicle.Body.CollisionCount,pilotRecoveries=racer.Pilot.Recoveries,offTrackSteps=racer.Pilot.OffTrackSteps,maximumStepMeters=maxStep,ticks});
      }
    }
    string[] paths={"Scripts/Core/OpponentRacer.cs","Scripts/Core/OpponentPilot.cs","Scripts/Core/MutantRacePlan.cs","Resources/opponent-catalog.json"};
    var report=new{result="mutant-competition-measured",utc=DateTime.UtcNow.ToString("O"),checks,finished,failed,skipped,totalReturns,totalHits,limits="3 tohum, 18 temsilî etkinlik, Güvenli/Çaylak, güneşli kaynak kurulumlar. Tam yarış fizik bitişi; oyuncu/rakip temas modeli ve yan yana geçiş/savunma ölçülmedi. Kaynakta varsa otomatik piste dönüş açıkça sayılır. Ölçüm tamamlanması yarışların tümünün geçtiği anlamına gelmez.",results,sources=paths.Select(p=>new{path=p,hash=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(root,"Unity/Assets/LastTurn",p))))})};
    File.WriteAllText(Path.Combine(root,"tests/cikti/mutant-competition.json"),JsonSerializer.Serialize(report,new JsonSerializerOptions{WriteIndented=true}));
    Console.WriteLine($"Rakip ölçümü: {finished} bitiş, {failed} süre sınırı, {skipped} kaynak istisnası; {totalReturns} otomatik dönüş / {totalHits} temas / {checks} girdi kontrolü. tests/cikti/mutant-competition.json");
  }
}
