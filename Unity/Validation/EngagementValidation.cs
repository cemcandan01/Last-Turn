using LastTurn.Core;
using System.Text.Json;
using System.Security.Cryptography;

internal static class EngagementValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../.."));
    string Read(string name)=>File.ReadAllText(Path.Combine(root,"Unity/Assets/LastTurn/Resources",name));
    var events=new RaceEventCatalog(Read("race-events.json"));var tracks=new TrackCatalog(Read("track-catalog.json"));
    int checks=0;
    void Check(bool value,string label){checks++;if(!value)throw new Exception("Ustalık geri bildirimi: "+label);}
    foreach(var e in events.Events)
    {
      var original=e.Stars.ToArray();
      foreach(double threshold in e.Stars)
        foreach(double delta in new[]{-.001,0,.001})
        {
          double value=threshold+delta;var m=RaceObjectiveModel.Read(e,value,true);
          Check(m.Stars==RaceStars.Count(e.Type,value,e.Stars),e.Key+" gerçek yıldız sözleşmesi");
          Check(m.Stars==3?m.NextStar==0&&m.Result.Contains("tamamlandı"):m.NextStar==m.Stars+1&&m.Gap>0,e.Key+" sınırda sonraki hedef");
          if(m.NextStar>0)Check(!m.Result.Contains("· 0.0 sn"),e.Key+" küçük fark sıfır gösterilmez");
        }
      var race=new RaceSession(e,tracks.Tracks[e.Index],true,0);
      Check(RaceViewModel.Hud(race,0).Objective=="",e.Key+" geri sayımda yıldız yok");race.TickCountdown(4);
      double time=race.Time;int notes=race.Notes.Count;
      Check(RaceViewModel.Hud(race,0).Objective!=""&&race.Time==time&&race.Notes.Count==notes,e.Key+" HUD salt");
      Check(RaceViewModel.Result(race,0).Rows.Any(r=>r.Label=="Sonraki hedef"),e.Key+" sonuç bağlantısı");
      var mutant=new RaceSession(e,tracks.Tracks[e.Index],false,0,mutant:true);mutant.TickCountdown(4);
      Check(RaceViewModel.Hud(mutant,0).Objective==""&&!RaceViewModel.Result(mutant,0).Rows.Any(r=>r.Label=="Sonraki hedef"),e.Key+" MUTANT ayrımı");
      Check(original.SequenceEqual(e.Stars),e.Key+" eşikler aynı");
      if(e.Type=="dp")Check(RaceObjectiveModel.Read(e,0,false).NextStar==1,"Bankalanmamış kombo puan sayılmaz");
      else Check(RaceObjectiveModel.Read(e,e.Stars[0]+1,false).Live.Contains("aşıldı"),"Süre bittiğinde hayali hedef yok");
    }
    Check(RaceObjectiveModel.Read(new RaceEventInfo(),0,true).Result=="","Boş eşikler");
    Check(RaceObjectiveModel.Read(events.Events[0],double.NaN,true).Result=="","Geçersiz telemetri");
    var catalog=CatalogNode.Parse(Read("mutant-catalog.json"));var run=new MutantRun(53,catalog);
    var empty=MutantSummaryModel.Read(run,new MutantRecord());
    Check(empty.Build.Any(x=>x.Contains("Stok kurulum"))&&empty.Build.Any(x=>x=="Skill'ler: Yok"),"Boş kurulum");
    run.Choose(run.State["secenekler"][0].S());run.Advance(125);run.Damage("carpma");run.Damage("spin");
    run.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"grappling-hook\",\"seviye\":3,\"evrim\":\"ters-kanca\",\"eklentiler\":[\"sok-bobini\"]}]"));
    string passive=catalog["passives"].Items.First()["id"].S();
    run.State.Set("pasifler",CatalogNode.Arr(new[]{CatalogNode.Str(passive),CatalogNode.Str(passive)}));
    run.State.Set("parcalar",CatalogNode.Arr(catalog["parts"].Items.Select(x=>CatalogNode.Str(x["id"].S()))));
    run.EnterBoss();run.FinishBoss(false);string before=run.State.ToString();
    var summary=MutantSummaryModel.Read(run,new MutantRecord(3,2));
    Check(summary.Stats.Contains("2:05 hazırlık süresi")&&summary.Stats.Contains("1 çarpma · 1 spin"),"Gerçek sayaçlar");
    Check(summary.Build[0].Contains("×2")&&summary.Build[1].Contains("Sv3")&&summary.Build[1].Contains("Ters Kanca")&&summary.Build[1].Contains("Şok"),"Yığın, skill evrimi ve eklenti");
    Check(summary.Build[2].Contains(catalog["parts"].Items.Last()["n"].S()),"Uzun kurulum eksilmez");
    Check(summary.NextAttempt.Contains(run.State["boss"]["zayif"].S()),"Gerçek boss zayıflığı");
    for(int i=0;i<20;i++)MutantSummaryModel.Read(run,new MutantRecord());
    Check(before==run.State.ToString(),"Özet duruma yazmaz");
    var wreck=new MutantRun(53,catalog);for(int i=0;i<12;i++)wreck.Damage("carpma");
    Check(MutantSummaryModel.Read(wreck,new MutantRecord()).NextAttempt.Contains("tamir"),"Pert önerisi");
    // Tekrar okuma RNG'yi ilerletmez: aynı tohumda sonraki seçimler aynı kalır.
    var a=new MutantRun(83,catalog);var b=new MutantRun(83,catalog);
    for(int i=0;i<10;i++)MutantSummaryModel.Read(a,new MutantRecord());
    a.Choose(a.State["secenekler"][0].S());b.Choose(b.State["secenekler"][0].S());a.EnterBoss();b.EnterBoss();a.FinishBoss(true);b.FinishBoss(true);
    Check(a.State.ToString()==b.State.ToString(),"Sonraki bölge/RNG aynı");
    string[] sources={"Scripts/Core/RaceObjectiveModel.cs","Scripts/Core/RaceViewModel.cs","Scripts/Core/MutantSummaryModel.cs","Scripts/Ui/RaceHudView.cs","Scripts/Ui/MutantSummaryView.cs"};
    var proof=new{result="engagement-passed",checks,events=events.Events.Length,utc=DateTime.UtcNow.ToString("O"),sources=sources.Select(p=>new{path=p,sha256=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(root,"Unity/Assets/LastTurn",p))))})};
    Directory.CreateDirectory(Path.Combine(root,"tests/cikti"));File.WriteAllText(Path.Combine(root,"tests/cikti/engagement-core.json"),JsonSerializer.Serialize(proof,new JsonSerializerOptions{WriteIndented=true}));
    Console.WriteLine($"Ustalık geri bildirimi: {checks} kontrol, 40 etkinlik/5 tür; eşikler, salt sunum, kurulum, RNG geçti.");
  }
}
