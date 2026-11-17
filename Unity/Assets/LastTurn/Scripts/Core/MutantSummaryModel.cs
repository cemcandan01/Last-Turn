using System;
using System.Linq;
using System.Globalization;

namespace LastTurn.Core
{
  // Kaydı değiştirmeyen saf koşu sonu sunumu. Kaynakta yalnız pert veya boss yenilgisi bitirir.
  public sealed class MutantSummaryModel
  {
    public string Reason="",Notice="",RecordText="";
    public int Region,Bosses,RoadMissions;
    public string Stats="", NextAttempt="";
    public string[] Build=Array.Empty<string>();
    public static MutantSummaryModel Read(MutantRun run,MutantRecord record,string notice="",bool readable=true,int completedRoadMissions=0)
    {
      var s=run.State;var c=run.Catalog;
      string N(string key)=>s[key].N().ToString("0",CultureInfo.InvariantCulture);
      string Names(string key,string definitions,string name)=>string.Join(", ",s[key].Items.GroupBy(x=>x.S()).Select(g=>
        (c[definitions].Items.FirstOrDefault(d=>d["id"].S()==g.Key)?[name].S()??g.Key)+(g.Count()>1?" ×"+g.Count():"")));
      string passives=string.Join(", ",s["pasifler"].Items.GroupBy(x=>x.S()).Select(g=>
        (c["passives"].Items.Concat(c["addons"].Items).FirstOrDefault(d=>d["id"].S()==g.Key)?["ad"].S()??g.Key)+(g.Count()>1?" ×"+g.Count():"")));
      string skills=string.Join(", ",s["beceriler"].Items.Select(skill=>{
        var d=c["skills"].Items.FirstOrDefault(x=>x["id"].S()==skill["id"].S());
        var evo=d?["evrimler"].Items.FirstOrDefault(x=>x["id"].S()==skill["evrim"].S());
        string addons=string.Join(", ",skill["eklentiler"].Items.Select(a=>c["skillAddons"].Items.FirstOrDefault(x=>x["id"].S()==a.S())?["ad"].S()??a.S()));
        return (d?["ad"].S()??skill["id"].S())+" Sv"+skill["seviye"].N().ToString("0",CultureInfo.InvariantCulture)
          +(evo==null?"":" · "+evo["ad"].S())+(addons==""?"":" ("+addons+")");}));
      string parts=Names("parcalar","parts","n");
      var m=new MutantSummaryModel{Reason=s["pert"].B()?"Araç pert oldu.":run.Finished?"Boss hedefi kaçırıldı.":"Koşu sürüyor.",Notice=notice,Region=run.Region,Bosses=(int)s["yenilenBoss"].N(),RecordText=!readable?"Rekor okunamadı; mevcut dosya korundu.":record.Region==0?"Henüz kaydedilmiş rekor yok.":"Bölge "+record.Region+" · "+record.Bosses+" boss"};
      m.RoadMissions=Math.Max(0,completedRoadMissions);
      m.Stats=MutantMenuModel.Time(Math.Max(0,s["zaman"].N()))+" hazırlık süresi · "+N("tamamlanan")+" etkinlik · "+m.RoadMissions+" yol görevi · Sv "+N("seviye")
        +"\n"+N("carpma")+" çarpma · "+N("spin")+" spin";
      m.Build=new[]{"Pasifler: "+(passives==""?"Yok":passives),"Skill'ler: "+(skills==""?"Yok":skills),"Parçalar: "+(parts==""?"Stok kurulum":parts)};
      string weakness=s["boss"]["zayif"].S();
      m.NextAttempt=s["pert"].B()?"Sonraki denemede gövdeni koru; atölyede tamir bedelini ve kalan boss süresini birlikte değerlendir."
        :run.Finished?(weakness==""?"Sonraki denemede boss türüne uygun parçalarla hazırlan.":"Sonraki denemede boss'a hazırlan: "+weakness)
        :"Kurulumunu boss'un zayıflığına göre şekillendir.";
      return m;
    }
  }
}
