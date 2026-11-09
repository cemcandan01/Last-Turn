using LastTurn.Core;
internal static class MutantSummaryValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));var c=CatalogNode.Parse(File.ReadAllText(Path.Combine(root,"Assets/LastTurn/Resources/mutant-catalog.json")));int checks=0;
    void Check(bool yes){checks++;if(!yes)throw new Exception("Koşu özeti");}
    var r=new MutantRun(53,c);r.Choose(r.State["secenekler"][0].S());r.EnterBoss();r.FinishBoss(false);string before=r.State.ToString();var m=MutantSummaryModel.Read(r,new MutantRecord(3,2));Check(m.Region==1&&m.Bosses==0&&m.Reason=="Boss hedefi kaçırıldı."&&m.RecordText=="Bölge 3 · 2 boss");Check(before==r.State.ToString());
    var p=new MutantRun(53,c);p.Choose(p.State["secenekler"][0].S());for(int i=0;i<12;i++)p.Damage("carpma");Check(p.Finished&&MutantSummaryModel.Read(p,new MutantRecord()).Reason=="Araç pert oldu.");Check(MutantSummaryModel.Read(p,new MutantRecord()).RecordText=="Henüz kaydedilmiş rekor yok.");Check(MutantSummaryModel.Read(p,new MutantRecord(),"",false).RecordText.Contains("okunamadı"));
    string dir=Path.Combine(root,"Logs/SummaryCore",Guid.NewGuid().ToString("N"));var store=new MutantRecordStore(dir);Check(store.AfterBossResult("bitti",3,2));string saved=File.ReadAllText(store.FilePath);for(int i=0;i<10;i++)MutantSummaryModel.Read(r,store.Load());Check(saved==File.ReadAllText(store.FilePath));Console.WriteLine($"B koşu özeti: {checks} kontrol geçti; bitiş nedeni, gerçek rekor, salt kayıt.");
  }
}
