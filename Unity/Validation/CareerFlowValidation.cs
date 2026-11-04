using LastTurn.Core;

internal static class CareerFlowValidation
{
  public static void Run()
  {
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/vehicle-catalog.json")));
    var events=new RaceEventCatalog(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/race-events.json")));
    var oracle=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/career-flow-0.8.18.json")));
    int checks=0;double error=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException("P1: "+label);}
    void Near(double a,double b,string label){error=Math.Max(error,Math.Abs(a-b));Check(Math.Abs(a-b)<=1e-9,label);}
    var profile=new RaceProfile();
    foreach(var n in oracle["names"].Items){profile.Rename(n["input"].S());Check(profile.Name==n["name"].S(),"TS ad normalleştirme");}
    foreach(var n in oracle["drove"].Items){profile.Drove(n["vx"].N(),n["vz"].N(),n["dt"].N());Near(profile.Km,n["km"].N(),"TS yol sayacı");}
    string dir=Path.Combine(unity,"Logs/P1Storage",Guid.NewGuid().ToString("N"));
    var save=new GarageSaveStore(Path.Combine(dir,"garage.json"),catalog);var state=save.Load();
    var store=new RaceProfileStore(Path.Combine(dir,"profile"));store.Save(profile);
    Check(store.Load().Name==profile.Name,"Ad diskte kalıcı");
    var old=profile.Snapshot();old["prof"].Remove("name");
    Check(RaceProfile.Restore(old).Name=="Sürücü","Eski profile varsayılan ad");
    foreach(var step in oracle["steps"].Items)
    {
      var op=step["op"];var r=state.RaceFinished(op["type"].S(),(int)op["level"].N(),(int)op["stars"].N());
      Near(r.Xp,step["reward"]["xp"].N(),"TS XP");Near(r.Money,step["reward"]["para"].N(),"TS para");
      save.Save(state);state=save.Load();Near(state.Balance,step["money"].N(),"Yüklenen bakiye");Check(state.Level==step["level"].N(),"Seviye");
      Near(state.Xp,step["progress"]["xp"].N(),"Yüklenen XP");
      var rows=RaceViewModel.Events(state,events);
      foreach(var row in rows)Check(row.Open==step["open"][row.Key].B(),"TS kilit "+row.Key);
      foreach(var pair in step["progress"]["yildiz"].Fields)Check(state.Snapshot()["progress"]["yildiz"][pair.Key].N()==pair.Value.N(),"En iyi yıldız");
    }
    var menu=CareerMenuModel.Read(state,store.Load(),events);Check(menu.Stars==120 && menu.MaxStars==120,"Tüm kupaların yıldız toplamı");
    var fresh=new GarageState(catalog);string snapshot=fresh.Snapshot().ToString();Check(!fresh.BuyCar(0),"Yetersiz bakiye reddi");Check(fresh.Snapshot().ToString()==snapshot,"Ret durumu korudu");
    string profilePath=Path.Combine(dir,"profile/races.json");File.WriteAllText(profilePath,"{bozuk");var damaged=new RaceProfileStore(Path.Combine(dir,"profile"));damaged.Load();
    Check(damaged.ReadOnly,"Bozuk profil yazmaya kapalı");try{damaged.Save(profile);throw new Exception("Bozuk dosya ezildi");}catch(IOException){checks++;}
    Check(File.ReadAllText(profilePath)=="{bozuk","Bozuk kayıt korundu");
    Console.WriteLine($"P1: {checks} koşul; 60 TS ödül/yükleme geçişi, 40 etkinlik kapısı, ad/km/ret/bozuk kayıt; en büyük sayısal fark {error:G3}.");
  }
}
