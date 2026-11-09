using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using LastTurn.Core;

internal static class MutantEventValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../.."));
    string Read(string name)=>File.ReadAllText(Path.Combine(root,"Unity/Assets/LastTurn/Resources",name));
    var catalog=CatalogNode.Parse(Read("mutant-catalog.json"));var vehicles=new VehicleCatalog(Read("vehicle-catalog.json"));var events=new RaceEventCatalog(Read("race-events.json"));var tracks=new TrackCatalog(Read("track-catalog.json"));var worlds=new WorldCatalog(Read("world-catalog.json"),tracks);
    var fixture=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-race-plan-0.8.18.json")));
    int checks=0,plans=0;bool duel=false,chase=false,drift=false,timed=false;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("B etkinlik: "+label);}
    var samples=fixture["plans"].Items.Where(r=>r["bossType"].S()=="").GroupBy(r=>r["entry"]["i"].N()+"/"+r["entry"]["rakip"].B()+"/"+r["entry"]["sokak"].S()).Select(g=>g.First());
    foreach(var sample in samples)
    {
      var run=new MutantRun((uint)sample["seed"].N(),catalog);run.State.Set("bolge",sample["region"]);run.State.Set("faz",CatalogNode.Str("surus"));var entry=sample["entry"].Clone();run.State.Set("etkinlikler",CatalogNode.Arr(new[]{entry}));string state=run.State.ToString(),source=catalog.ToString();
      int id=(int)entry["id"].N();var menu=MutantMenuModel.Read(run,vehicles,0);var card=menu.FindEvent(id)!;
      bool opponent=entry["rakip"].B()||entry["sokak"].S()=="kovala";
      Check(card!=null&&card.Risks.Length==(opponent?2:3),"Gerçek risk sayısı "+id);Check(card!.TypeName!=""&&card.LevelName!="","Tür ve seviye "+id);
      foreach(var risk in card.Risks)
      {
        var plan=MutantRacePlan.Create(run,0,id,risk.Risk,false,events,tracks,worlds);plans++;
        string expected=plan.Duel?"Rakipten önce bitir":plan.Event.Limit.ToString("0.##",CultureInfo.InvariantCulture)+(plan.Event.Type=="dp"?" puan":" sn");
        Check(risk.TargetText==expected,"Gerçek yarış planıyla hedef birimi "+id+"/"+risk.Risk);Check(risk.Target==plan.Event.Limit,"Ham hedef değişmez "+id+"/"+risk.Risk);
        var definition=catalog["risks"][risk.Risk];var reward=catalog["eventRewards"][(int)entry["sev"].N()-1];
        double Round(double n)=>Math.Floor(n+.5);
        Check(risk.Xp==Round(reward["xp"].N()*definition["odul"].N())&&risk.Money==Round(reward["para"].N()*definition["odul"].N()),"Mevcut XP/para sunumu "+id+"/"+risk.Risk);
        Check(risk.Penalty==definition["ceza"].N()&&risk.Consolation==Round(reward["para"].N()*definition["kacirma"].N()),"Mevcut ceza/teselli sunumu "+id+"/"+risk.Risk);
        duel|=entry["rakip"].B();chase|=entry["sokak"].S()=="kovala";drift|=!plan.Duel&&plan.Event.Type=="dp";timed|=!plan.Duel&&plan.Event.Type!="dp";
      }
      Check(state==run.State.ToString()&&source==catalog.ToString(),"Model/plan okuması RNG/timer/ödül durumunu değiştirmez "+id);
      Check(menu.FindEvent(int.MaxValue)==null,"Geçersiz kimlik güvenli "+id);
      entry.Set("yapildi",CatalogNode.Parse("true"));Check(MutantMenuModel.Read(run,vehicles,0).FindEvent(id)==null,"Tamamlanmış etkinlik seçilmez "+id);
    }
    Check(duel&&chase&&drift&&timed,"Düello/kovalamaca/Drift/süre kapsamı");
    var proof=new{result="mutant-event-passed",checks,plans,utc=DateTime.UtcNow.ToString("O"),duel,chase,drift,timed,sources=Directory.GetFiles(Path.Combine(root,"Unity/Assets/LastTurn/Scripts/Core"),"*.cs").Order().Select(p=>new{path=Path.GetRelativePath(root,p).Replace('\\','/'),hash=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(p)))}).ToArray()};
    Directory.CreateDirectory(Path.Combine(root,"tests/cikti"));File.WriteAllText(Path.Combine(root,"tests/cikti/mutant-event-proof.json"),JsonSerializer.Serialize(proof,new JsonSerializerOptions{WriteIndented=true}));Console.WriteLine($"B etkinlik: {checks} dar kontrol;{plans} gerçek plan, düello/kovalamaca/Drift/süre; salt model ve ödül değerleri geçti.");
  }
}
