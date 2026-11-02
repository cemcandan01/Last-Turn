using LastTurn.Core;

internal static class MutantRecordValidation
{
  public static void Run()
  {
    var data=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-records-0.8.18.json")));
    int checks=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("Mutant rekor: "+label);}
    Check(data["baseline"].S()==VehicleCatalog.Baseline,"Kaynak SHA");
    string dir=Path.Combine(Path.GetTempPath(),"LastTurnMutantRecord-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(dir);
    string career=Path.Combine(dir,"races.json");File.WriteAllText(career,"kariyer-korunur");
    int number=0;
    foreach(var c in data["cases"].Items)
    {
      var store=new MutantRecordStore(Path.Combine(dir,"case-"+number++));Directory.CreateDirectory(Path.GetDirectoryName(store.FilePath)!);
      if(c["initial"].S("")!="")File.WriteAllText(store.FilePath,c["initial"].S());
      store.Load();
      foreach(var s in c["steps"].Items)
      {
        bool changed=store.AfterBossResult(s["phase"].S(),(int)s["region"].N(),(int)s["bosses"].N());
        Check(changed==s["changed"].B(),"TS yeni rekor kararı");
        var rec=store.Load();Check(rec.Region==s["record"]["bolge"].N() && rec.Bosses==s["record"]["boss"].N(),"TS disk yeniden yükleme");
        string? raw=File.Exists(store.FilePath)?File.ReadAllText(store.FilePath):null;
        Check(raw==s["raw"].S(null!),"TS sade rekor JSON");
      }
    }
    foreach(string bad in new[]{"{bozuk","{\"surum\":2,\"bolge\":4,\"boss\":3}","{\"bolge\":-1}","[]"})
    {
      var store=new MutantRecordStore(Path.Combine(dir,"bad-"+number++));Directory.CreateDirectory(Path.GetDirectoryName(store.FilePath)!);File.WriteAllText(store.FilePath,bad);store.Load();
      Check(store.ReadOnly,"Bozuk/gelecek biçim salt okunur");
      try{store.AfterBossResult("bitti",9,8);throw new Exception("Bozuk rekor ezildi");}catch(IOException){checks++;}
      Check(File.ReadAllText(store.FilePath)==bad,"Bozuk/gelecek dosya korundu");
    }
    var shared=new MutantRecordStore(Path.Combine(dir,"shared"));shared.Load();Directory.CreateDirectory(Path.GetDirectoryName(shared.FilePath)!);File.WriteAllText(shared.FilePath,"{\"bolge\":6,\"boss\":5}");
    try{shared.AfterBossResult("bitti",2,1);throw new Exception("Eşzamanlı rekor ezildi");}catch(IOException){checks++;}
    Check(File.ReadAllText(shared.FilePath).Contains(":6"),"Başka oturumun kaydı korundu");
    var pending=new MutantRecordStore(Path.Combine(dir,"pending"));pending.Load();Directory.CreateDirectory(Path.GetDirectoryName(pending.FilePath)!);File.WriteAllText(pending.FilePath+".tmp","yarım-kayıt");
    try{pending.AfterBossResult("bitti",1,0);throw new Exception("Geçici kayıt ezildi");}catch(IOException){checks++;}
    Check(File.ReadAllText(pending.FilePath+".tmp")=="yarım-kayıt","Geçici dosya korundu");
    Check(File.ReadAllText(career)=="kariyer-korunur","Ayrı kariyer dosyası korundu");
    Console.WriteLine($"Mutant rekor: {checks} koşul; 45 TS geçişi, eski/boş/bozuk/gelecek/çakışan disk kaydı ve kariyer ayrımı.");
  }
}
