using LastTurn.Core;
using System.Text.Json;
using System.Security.Cryptography;

internal static class MutantNavigationValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../.."));
    string Read(string name)=>File.ReadAllText(Path.Combine(root,"Unity/Assets/LastTurn/Resources",name));
    var catalog=CatalogNode.Parse(Read("mutant-catalog.json"));var vehicles=new VehicleCatalog(Read("vehicle-catalog.json"));var worlds=new MutantSkillWorldFactory(Read("mutant-skill-world.json"));
    int checks=0;void Check(bool value,string label){checks++;if(!value)throw new Exception("Etkinlik yönlendirmesi: "+label);}
    for(uint seed=1;seed<=64;seed++)
    {
      var run=new MutantRun(seed,catalog);run.Choose(run.State["secenekler"][0].S());
      for(int region=1;region<=3;region++)
      {
        var session=new MutantGameSession(run,vehicles,0,0,0);var abilities=new MutantAbilityDriver(run,worlds);
        var chest=MutantWorldMarkerModel.Read(run).First(m=>m.Kind=="chest");
        MutantHudModel Model(bool racing=false)=>MutantHudModel.Read(run,MutantMenuModel.Read(run,vehicles,0),abilities,session,chest.X,chest.Z,racing);
        string before=run.State.ToString();var markers=MutantWorldMarkerModel.ReadMap(run);var plain=Model();
        Check(markers.Length==10&&markers.All(m=>m.Kind!="chest"&&!m.Used),"Haritada yalnız 8 etkinlik + atölye + boss");
        Check(MutantWorldMarkerModel.Read(run).Count(m=>m.Kind=="chest")==3,"Keşfedilecek 3B sandıklar korunur");
        Check(plain.Navigation.StartsWith("Etkinlik ")&&!plain.Navigation.Contains("Sandık"),"Sandığın üstündeyken bile sır gizli");
        session.Missions.Active=new MutantRoadMission{Kind="drift",Target=3,Progress=1.5,Remaining=17};
        Check(Model().Navigation==plain.Navigation&&Model().Mission=="Drift 1.5 / 3 sn · 17 sn","Görev mesafeyi örtmez, kısa gerçek ilerleme");
        Check(Model(true).Navigation==""&&Model(true).Mission=="","Yarışta açık dünya bilgisi yok");
        Check(before==run.State.ToString(),"Render/harita kayıt ve RNG durumuna yazmaz");
        var first=run.State["etkinlikler"].Items.First();first.Set("yapildi",CatalogNode.Parse("true"));
        Check(MutantWorldMarkerModel.ReadMap(run).Length==9,"Biten etkinlik haritadan kalkar");
        foreach(var e in run.State["etkinlikler"].Items)e.Set("yapildi",CatalogNode.Parse("true"));
        Check(!Model().Navigation.StartsWith("Etkinlik ")&&Model().Navigation!="","Boş havuzda atölye/boss kalır");
        foreach(string kind in new[]{"drift","hiz","kilpayi","sicrama"})
        {
          session.Missions.Active=new MutantRoadMission{Kind=kind,Target=kind=="hiz"?115:3,Progress=1,Remaining=25};
          Check(Model().Mission.Length<45&&Model().Navigation!="","Dört görev türünde ayrı bilgi");
        }
        if(region<3){run.EnterBoss();run.FinishBoss(true);while(run.State["faz"].S()=="secim")run.Choose(run.State["secenekler"][0].S());}
      }
    }
    string[] paths={"Scripts/Core/MutantWorldMarkerModel.cs","Scripts/Core/MutantHudModel.cs","Scripts/Core/HudLayout.cs","Scripts/Ui/MutantHudView.cs","Scripts/Prototype/MiniMapView.cs","Resources/UI/mutant-hud.uss"};
    var proof=new{result="mutant-navigation-passed",utc=DateTime.UtcNow.ToString("O"),checks,seeds=64,regions=3,sources=paths.Select(p=>new{path=p,hash=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(root,"Unity/Assets/LastTurn",p))))})};
    File.WriteAllText(Path.Combine(root,"tests/cikti/mutant-navigation.json"),JsonSerializer.Serialize(proof,new JsonSerializerOptions{WriteIndented=true}));
    Console.WriteLine($"Etkinlik yönlendirmesi: {checks} kontrol; 64 tohum × 3 bölge, gizli sandık, görev+mesafe, boş havuz, salt sunum geçti.");
  }
}
