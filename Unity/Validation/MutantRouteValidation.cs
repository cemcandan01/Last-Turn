using LastTurn.Core;
internal static class MutantRouteValidation
{
  public static void Run()
  {
    int count=0;
    void Check(bool ok,string why){if(!ok)throw new Exception(why);count++;}
    var catalog=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"../../../../Assets/LastTurn/Resources/mutant-catalog.json")));
    MutantRun Run(uint seed){var r=new MutantRun(seed,catalog);r.Choose(r.State["secenekler"][0].S());return r;}
    for(uint seed=1;seed<=32;seed++){
      foreach(int risk in new[]{0,2}){
        var run=Run(seed);var offer=MutantRoute.Offer(run,risk);
        Check(offer.Ids.Length==2 && offer.Ids.Distinct().Count()==2,"İki farklı hedef");
        Check(MutantRoute.Choose(run,risk),"Rota seçimi");
        Check(!MutantRoute.Choose(run,2-risk),"Bölge başına tek rota");
        var first=run.FinishEvent(offer.Ids[0],true,risk);
        Check(MutantRoute.Read(run).Progress==1,"İlk hedef");
        var before=run.State["para"].N();
        run.FinishEvent(offer.Ids[1],true,risk);
        Check(MutantRoute.Read(run).Complete,"İkinci hedef tamam");
        Check(run.State["para"].N()>=before+offer.Bonus,"Gerçek bonus");
        double money=run.State["para"].N();run.FinishEvent(offer.Ids[1],true,risk);
        Check(run.State["para"].N()==money,"Tekrarlı bitişte bonus katlanmaz");
      }
      var failed=Run(seed);MutantRoute.Choose(failed,2);var route=MutantRoute.Read(failed);
      failed.FinishEvent(route.NextId,false,2);
      Check(MutantRoute.Read(failed).Failed && !MutantRoute.Read(failed).Complete,"Başarısızlık");
      var wrong=Run(seed);MutantRoute.Choose(wrong,2);route=MutantRoute.Read(wrong);wrong.FinishEvent(route.NextId,true,0);
      Check(MutantRoute.Read(wrong).Failed,"Düşük risk bonusu bitirir");
      wrong.EnterBoss();wrong.FinishBoss(true);
      Check(!MutantRoute.Read(wrong).Chosen,"Yeni bölge rota sıfırlar");
    }
    for(uint seed=1;seed<=8;seed++){
      var city=Run(seed);
      for(int region=2;region<=3;region++){
        city.EnterBoss();city.FinishBoss(true);
        while(city.State["faz"].S()=="secim")city.Choose(city.State["secenekler"][0].S());
        string snapshot=city.Snapshot().ToString();
        var offer=MutantRoute.Offer(city,2);
        Check(city.Snapshot().ToString()==snapshot,"Önizleme koşuya yazmaz");
        Check(offer.Ids.Length==2,"Şehirde iki hedef");
        Check(MutantRoute.Choose(city,2),"Şehirde rota seçimi");
        city.FinishEvent(offer.Ids[1],true,2);
        Check(MutantRoute.Read(city).Failed,"Sırasız tamamlama bonus vermez");
      }
    }
    Console.WriteLine("MUTANT rota "+count+" kontrol geçti.");
  }
}
