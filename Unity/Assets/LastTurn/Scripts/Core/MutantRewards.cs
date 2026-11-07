#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace LastTurn.Core
{
  public enum RewardRarity { Common, Uncommon, Rare, Legendary }
  public enum RewardKind { Passive, Addon, Skill, SkillAddon, Part, Resource, Evolution }
  public enum RewardSource { Start, Level, Chest, Event, Boss, Workshop }
  public sealed class MutantRewardDefinition
  {
    public string Id="",Key="",Name="",Description="",Owner="";
    public RewardKind Kind;
    public RewardRarity Rarity;
    internal CatalogNode Data=CatalogNode.Null();
  }
  public sealed class MutantRewardCard
  {
    public string Offer="",Name="",Description="",KindText="",SourceText="",LevelText="",EffectText="",VehicleText="",Compatibility="",CurseText="";
    public string RarityText="",RarityColor="",RaritySymbol="";
    public RewardRarity Rarity;public int Level;public bool Known,Compatible,NeedsReplacement,Cursed;
    public RewardNumber[] VehicleEffects=Array.Empty<RewardNumber>();
  }
  public sealed class RewardNumber { public string Name="",Unit="";public double Before,After; }

  // Salt sunum: kaynak katalog değişmez, RNG tüketilmez, ödül alma/para kuralı çalıştırılmaz.
  public sealed class MutantRewards
  {
    private readonly Dictionary<string,MutantRewardDefinition> definitions=new Dictionary<string,MutantRewardDefinition>(StringComparer.Ordinal);
    private readonly List<string> diagnostics=new List<string>();
    public IReadOnlyCollection<MutantRewardDefinition> Definitions=>definitions.Values;
    public IReadOnlyList<string> Diagnostics=>diagnostics;
    public MutantRewards(CatalogNode catalog,string? metadata=null)
    {
      var entries=CatalogNode.Obj();
      if(!string.IsNullOrWhiteSpace(metadata))try{
        var m=CatalogNode.Parse(metadata!);if(m["schema"].N()==1&&m["entries"].IsObject)entries=m["entries"];else diagnostics.Add("Metadata sürümü/entries geçersiz; Yaygın varsayıldı.");
      }catch(FormatException){diagnostics.Add("Metadata JSON geçersiz; Yaygın varsayıldı.");}
       catch(ArgumentException){diagnostics.Add("Metadata sayısal verisi geçersiz; Yaygın varsayıldı.");}
      void Add(CatalogNode n,RewardKind kind,string group,string owner=""){
        string id=n["id"].S();if(id=="")return;string key=group+"/"+id;var rarity=RewardRarity.Common;
        var raw=n.Has("rarity")?n["rarity"]:entries[key];
        if(!raw.IsNull&&(!raw.IsString||!Enum.TryParse(raw.S(),false,out rarity)||!Enum.IsDefined(typeof(RewardRarity),rarity)||Enum.GetName(typeof(RewardRarity),rarity)!=raw.S())){rarity=RewardRarity.Common;diagnostics.Add(key+": geçersiz nadirlik; Yaygın varsayıldı.");}
        definitions[key]=new MutantRewardDefinition{Key=key,Id=id,Owner=owner,Kind=kind,Rarity=rarity,Name=n["ad"].S(n["n"].S()),Description=n["d"].S(),Data=n.Clone()};
      }
      foreach(var n in catalog["passives"].Items)Add(n,RewardKind.Passive,"passive");
      foreach(var n in catalog["addons"].Items)Add(n,RewardKind.Addon,"addon");
      foreach(var n in catalog["skills"].Items){Add(n,RewardKind.Skill,"skill");foreach(var e in n["evrimler"].Items)Add(e,RewardKind.Evolution,"evolution",n["id"].S());}
      foreach(var n in catalog["skillAddons"].Items)Add(n,RewardKind.SkillAddon,"skillAddon");
      foreach(var n in catalog["parts"].Items)Add(n,RewardKind.Part,"part");
      foreach(var n in catalog["chestResources"].Items)Add(n,RewardKind.Resource,"resource");
      foreach(var p in entries.Fields)if(!definitions.ContainsKey(p.Key))diagnostics.Add(p.Key+": katalogda yok; yok sayıldı.");
    }
    public MutantRewardDefinition? Find(string key)=>definitions.TryGetValue(key,out var d)?d:null;
    public static string RarityName(RewardRarity r)=>new[]{"Yaygın","Seyrek","Nadir","Efsanevi"}[(int)r];
    public static string RarityColor(RewardRarity r)=>new[]{"#A6ACB6","#4F9EED","#B078EF","#E2B247"}[(int)r];
    private static string SourceName(RewardSource s)=>new[]{"Başlangıç","Seviye atlama","Sandık","Yarış","Boss","Atölye"}[(int)s];
    private static string KindName(RewardKind k)=>new[]{"Pasif","Koşu eklentisi","Skill","Skill eklentisi","Araç parçası","Kaynak","Evrim"}[(int)k];
    private static string Number(double n)=>n.ToString("0.##",CultureInfo.InvariantCulture).Replace('.',',');
    public MutantRewardCard Read(MutantRun run,string offer,RewardSource source,VehicleCatalog? vehicles=null,int car=-1,bool cursed=false,string curse="")
    {
      var c=new MutantRewardCard{Offer=offer,SourceText=SourceName(source),Cursed=cursed,CurseText=cursed?"LANETLİ · "+run.Catalog["curses"][curse]["d"].S("Bedeli sandıkta gösterilir"):""};
      string[] p=offer.Split(':');string id=p.Length>1?p[1]:offer;
      MutantRewardDefinition? d=null;
      if(p.Length>1){bool valid=(p.Length==2&&(p[0]=="b"||p[0]=="y"))||(p.Length==3&&(p[0]=="e"||p[0]=="v"));
        if(valid){string group=p[0]=="e"?"skillAddon":p[0]=="v"?"evolution":"skill";d=Find(group+"/"+(p[0]=="v"?p[2]:id));}}
      else foreach(string group in new[]{"passive","addon","part","resource"}){d=Find(group+"/"+id);if(d!=null)break;}
      if(d==null){c.Name="Bilinmeyen ödül";c.Description="Katalogda bulunamadı.";c.Compatibility="Kullanılamıyor";c.RarityText=RarityName(RewardRarity.Common);c.RarityColor=RarityColor(RewardRarity.Common);c.RaritySymbol="[I]";return c;}
      c.Known=true;c.Name=d.Name;c.Description=d.Description;c.KindText=KindName(d.Kind);c.Rarity=d.Rarity;c.RarityText=RarityName(d.Rarity);c.RarityColor=RarityColor(d.Rarity);c.RaritySymbol=new[]{"[I]","[II]","[III]","[IV]"}[(int)d.Rarity];
      c.Compatible=true;c.VehicleText="Araç seçilince kurulum etkisi gösterilir.";c.EffectText=d.Description;
      string owner=p.Length==3&&p[0]=="e"?p[2]:id;
      var equipped=run.State["beceriler"].Items.FirstOrDefault(s=>s["id"].S()==owner);
      var projected=run.State.Clone();
      if(d.Kind==RewardKind.Passive||d.Kind==RewardKind.Addon){
        int count=run.State["pasifler"].Items.Count(x=>x.S()==id);c.Compatible=count<d.Data["en"].N(1);c.Level=c.Compatible?count+1:count;
        if(c.Compatible)projected.Set("pasifler",CatalogNode.Arr(projected["pasifler"].Items.Concat(new[]{CatalogNode.Str(id)})));
        c.LevelText="Seviye "+c.Level+" · birikim";
      }else if(d.Kind==RewardKind.Part){
        c.Level=(int)d.Data["sv"].N();c.LevelText="Parça basamağı "+c.Level;c.Compatible=!run.State["parcalar"].Items.Any(x=>x.S()==id);
        if(c.Compatible)projected.Set("parcalar",CatalogNode.Arr(projected["parcalar"].Items.Concat(new[]{CatalogNode.Str(id)})));
      }else if(d.Kind==RewardKind.Resource){c.Level=1;c.LevelText="Kaynak · seviye yok";c.VehicleText="Koşu kaynağı; doğrudan araç kurulumunu değiştirmez.";}
      else {
        c.Compatible=run.SkillOffers().Contains(offer);
        c.Level=p[0]=="y"?(int)(equipped?["seviye"].N()??0)+1:(int)(equipped?["seviye"].N()??1);
        if(!c.Compatible&&p[0]=="y")c.Level=(int)(equipped?["seviye"].N()??0);
        c.LevelText="Seviye "+c.Level+(p[0]=="y"?" · yükseltme":p[0]=="v"?" · evrim":p[0]=="e"?" · eklenti":" · yeni skill");
        c.NeedsReplacement=p[0]=="b"&&run.State["beceriler"].Items.Count()>=MutantSkills.Slots;
        if(d.Kind==RewardKind.Skill){
          var target=equipped?.Clone()??CatalogNode.Obj();target.Set("seviye",CatalogNode.Num(c.Level));
          var after=MutantSkills.Parameters(id,target);var before=equipped==null?CatalogNode.Obj():MutantSkills.Parameters(id,equipped);
          string Field(string key)=>key=="guc"?"Güç çarpanı":key=="tutus"?"Tutuş çarpanı":key=="bekleme"?"Bekleme (sn)":key=="sure"?"Süre (sn)":key=="enCok"?"Depo süresi (sn)":key=="sarj"?"Şarj":key=="menzil"?"Menzil (m)":key=="kalkis"?"Kalkış":key=="tirmanis"?"Tırmanış":key=="itki"?"İtki":key=="cekis"?"Çekiş":key=="fren"?"Frenleme":key=="kazanc"?"Kazanç çarpanı":key=="alev"?"Alev hasarı":key=="uzatmaUst"?"Uzatma sınırı (sn)":key;
          var values=after.Fields.Where(f=>f.Value.IsNumber&&(equipped==null||f.Value.N()!=before[f.Key].N())).ToArray();
          if(values.Length==0)values=after.Fields.Where(f=>f.Value.IsNumber).ToArray();
          c.EffectText=string.Join(" · ",values.Select(f=>Field(f.Key)+" "+(equipped==null||before[f.Key].N()==f.Value.N()?Number(f.Value.N()):Number(before[f.Key].N())+" → "+Number(f.Value.N()))));
          if(c.EffectText=="")c.EffectText=d.Description;
        }
        c.VehicleText="Etki sürüş koşuluna bağlı; tur süresi tahmini yapılmadı.";
      }
      if(vehicles!=null&&car>=0&&(d.Kind==RewardKind.Passive||d.Kind==RewardKind.Addon||d.Kind==RewardKind.Part)){
        CatalogNode Vehicle(CatalogNode state)=>MutantVehicle.Configure(vehicles,vehicles.Setup(car,state["parcalar"].Items.Select(x=>x.S())),state).Car;
        var before=Vehicle(run.State);var after=Vehicle(projected);var numbers=new List<RewardNumber>();var delta=new List<string>();
        foreach(var f in new[]{("hp","Güç"," HP"),("kg","Kütle"," kg"),("brk","Fren",""),("dmax","Direksiyon"," rad")})
          if(Math.Abs(after[f.Item1].N()-before[f.Item1].N())>1e-8){delta.Add(f.Item2+" "+Number(before[f.Item1].N())+" → "+Number(after[f.Item1].N())+f.Item3);numbers.Add(new RewardNumber{Name=f.Item2,Before=before[f.Item1].N(),After=after[f.Item1].N(),Unit=f.Item3});}
        for(int i=0;i<2;i++)if(Math.Abs(after["gr"][i].N()-before["gr"][i].N())>1e-8)delta.Add((i==0?"Toprak":"Asfalt")+" tutuşu "+Number(before["gr"][i].N())+" → "+Number(after["gr"][i].N()));
        c.VehicleText=delta.Count>0?string.Join(" · ",delta):"Bu araçta doğrudan güç/kütle/fren/tutuş farkı yok; koşullu etkiyi açıklamadan oku.";
        c.VehicleEffects=numbers.ToArray();
      }
      c.Compatibility=!c.Compatible?"Mevcut durumda uygun teklif değil / sınırda":c.NeedsReplacement?"3 yuva dolu · alınırken skill değiştirilir":"Uygun · keşif seçeneği; üstünlük garantisi yok";
      return c;
    }
  }
}
