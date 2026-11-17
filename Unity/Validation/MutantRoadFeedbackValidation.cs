using LastTurn.Core;
using System.Text.Json;
using System.Security.Cryptography;

internal static class MutantRoadFeedbackValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../.."));
    string Read(string name)=>File.ReadAllText(Path.Combine(root,"Unity/Assets/LastTurn/Resources",name));
    var catalog=CatalogNode.Parse(Read("mutant-catalog.json"));var vehicles=new VehicleCatalog(Read("vehicle-catalog.json"));
    int checks=0;void Check(bool ok,string label){checks++;if(!ok)throw new Exception("Yol görevi geri bildirimi: "+label);}
    foreach(int region in new[]{1,2,3})foreach(double capacity in new[]{100d,200})foreach(double missing in new[]{0d,10,100})foreach(double callbackGain in new[]{0d,5})
    {
      var run=new MutantRun(53,catalog);run.Choose(run.State["secenekler"][0].S());while(run.Region<region){run.EnterBoss();run.FinishBoss(true);while(run.State["faz"].S()=="secim")run.Choose(run.State["secenekler"][0].S());}
      var energy=run.State["mek"];energy.Set("kapasite",CatalogNode.Num(capacity));energy.Set("enerji",CatalogNode.Num(capacity-missing));
      var session=new MutantGameSession(run,vehicles,0,0,0);var reward=MutantRoadMissions.Reward(region);
      session.Missions.Active=new MutantRoadMission{Kind="hiz",Target=20,Remaining=25,Money=reward.Money,Energy=reward.Energy};
      session.EnergyAndSkills=(_,_,_,_)=>{energy.Set("enerji",CatalogNode.Num(Math.Min(capacity,energy["enerji"].N()+callbackGain)));return false;};
      double beforeMoney=run.State["para"].N(),expectedEnergy=Math.Min(20,Math.Max(0,missing-callbackGain));
      var e=session.Step(new MutantSessionInput{X=10000,Z=10000,Speed=10,HasSimulation=true},1d/60).Single(x=>x.Kind=="gorev");
      Check(e.Detail=="tamam"&&e.AwardedMoney==reward.Money&&e.AwardedEnergy==expectedEnergy,"Yalnız görevden gerçek kapasite farkı");
      Check(run.State["para"].N()==beforeMoney+reward.Money&&energy["enerji"].N()==Math.Min(capacity,capacity-missing+callbackGain+20),"Kaynak ödül hesabı aynı");
      string state=run.State.ToString(),text=MutantRoadFeedback.Read(e);
      Check(text.Contains("+"+reward.Money+" para")&&text.Contains("+"+expectedEnergy+" enerji"),"Bildirimin tutarı uygulananla aynı");
      for(int i=0;i<60;i++)MutantRoadFeedback.Read(e);
      Check(state==run.State.ToString()&&session.Missions.Completed==1,"Tekrar render ödül üretmez");
      Check(MutantSummaryModel.Read(run,new MutantRecord(),completedRoadMissions:session.Missions.Completed).Stats.Contains("1 yol görevi"),"Özet gerçek görev sayısını alır");
      double afterMoney=run.State["para"].N();var next=session.Step(new MutantSessionInput{X=10000,Z=10000,Speed=10,HasSimulation=true},1d/60);
      Check(next.All(x=>x.Kind!="gorev")&&run.State["para"].N()==afterMoney,"Sonraki adımda çift ödeme yok");
      session.Missions.Active=new MutantRoadMission{Kind="drift",Target=3,Remaining=.001,Money=reward.Money,Energy=20};
      var missed=session.Step(new MutantSessionInput{X=10000,Z=10000,Speed=0,HasSimulation=true},1d/60).Single(x=>x.Kind=="gorev");
      Check(missed.Detail=="kacti"&&missed.AwardedMoney==0&&missed.AwardedEnergy==0&&MutantRoadFeedback.Read(missed)=="Yol görevi kaçtı.","Kaçan göreve ödül bildirimi yok");
    }
    Check(MutantRoadFeedback.Read(new MutantSessionEvent("hasar"))=="","Görev dışı olay");
    Check(MutantSummaryModel.Read(new MutantRun(1,catalog),new MutantRecord(),completedRoadMissions:-1).RoadMissions==0,"Negatif sunum sayacı");
    string[] sources={"Scripts/Core/MutantGameSession.cs","Scripts/Core/MutantRoadFeedback.cs","Scripts/Core/MutantSummaryModel.cs","Scripts/Prototype/MutantRuntime.cs"};
    var proof=new{result="mutant-road-feedback-passed",utc=DateTime.UtcNow.ToString("O"),checks,sources=sources.Select(p=>new{path=p,hash=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(root,"Unity/Assets/LastTurn",p))))})};
    File.WriteAllText(Path.Combine(root,"tests/cikti/mutant-road-feedback.json"),JsonSerializer.Serialize(proof,new JsonSerializerOptions{WriteIndented=true}));
    Console.WriteLine($"Yol görevi geri bildirimi: {checks} kontrol; 3 bölge, dolu/kısmi/boş enerji, aynı adım başka enerji kaynağı, çift ödeme ve özet geçti.");
  }
}
