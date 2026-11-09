namespace LastTurn.Core
{
  // Kaydı değiştirmeyen saf koşu sonu sunumu. Kaynakta yalnız pert veya boss yenilgisi bitirir.
  public sealed class MutantSummaryModel
  {
    public string Reason="",Notice="",RecordText="";
    public int Region,Bosses;
    public static MutantSummaryModel Read(MutantRun run,MutantRecord record,string notice="",bool readable=true)
      =>new MutantSummaryModel{Reason=run.State["pert"].B()?"Araç pert oldu.":run.Finished?"Boss hedefi kaçırıldı.":"Koşu sürüyor.",Notice=notice,Region=run.Region,Bosses=(int)run.State["yenilenBoss"].N(),RecordText=!readable?"Rekor okunamadı; mevcut dosya korundu.":record.Region==0?"Henüz kaydedilmiş rekor yok.":"Bölge "+record.Region+" · "+record.Bosses+" boss"};
  }
}
