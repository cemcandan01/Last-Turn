using LastTurn.Core;

// P5 bulut sözleşmesi: TS ilerlemeYukle/rekorBirlestir/ozet ve hesap değişim kuralı. Sağlayıcı (Firebase) yok; ağ sınanmaz.
internal static class CloudValidation
{
  public static void Run()
  {
    var f=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/cloud-0.8.18.json")));
    int checks=0;void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException("Bulut: "+label);}
    Check(f["baseline"].S()==VehicleCatalog.Baseline,"Sabit TS kaynak SHA");
    Check(CloudContract.RecordKeys().SequenceEqual(f["keys"].Items.Select(k=>k.S())),"TS rekor anahtarları (96)");
    int n=0;
    foreach(var m in f["merges"].Items)
    {
      string l="birleştirme "+n++;var b=m["before"];
      var d=new CloudDocument{Xp=b["xp"].N(),Kazanilan=b["kazanilan"].N(),EkAcik=b["ekAcik"].Items.Select(x=>x.S()).ToList()};
      foreach(var p in b["yildiz"].Fields)d.Yildiz[p.Key]=p.Value.N();foreach(var p in b["alimlar"].Fields)d.Alimlar[p.Key]=p.Value.N();
      CloudContract.MergeProgress(d,m["remote"]);var e=m["merged"];
      Check(d.Xp==e["xp"].N()&&d.Kazanilan==e["kazanilan"].N(),l+" XP/kazanç");
      Check(d.EkAcik.SequenceEqual(e["ekAcik"].Items.Select(x=>x.S())),l+" açık öğeler");
      Check(d.Alimlar.Count==e["alimlar"].Fields.Count()&&e["alimlar"].Fields.All(p=>d.Alimlar.TryGetValue(p.Key,out var v)&&v==p.Value.N()),l+" alımlar");
      Check(d.Yildiz.Count==e["yildiz"].Fields.Count()&&e["yildiz"].Fields.All(p=>d.Yildiz.TryGetValue(p.Key,out var v)&&v==p.Value.N()),l+" yıldızlar");
      var rec=new Dictionary<string,double>();foreach(var p in m["localRec"].Fields)rec[p.Key]=p.Value.N();
      CloudContract.MergeRecords(rec,m["remoteRec"]);
      foreach(var p in m["records"].Fields)Check((rec.TryGetValue(p.Key,out var v)?v:0)==p.Value.N(),l+" rekor "+p.Key);
      Check(!rec.ContainsKey("bilinmeyen_1"),l+" bilinmeyen rekor anahtarı alınmaz");
    }
    foreach(var s in f["summaries"].Items)Check(CloudContract.Summary(s["doc"])==s["ozet"].S(),"TS ozet "+s["ozet"].S());
    Check(CloudContract.Summary(f["summaries"][0]["doc"])==CloudContract.Summary(f["summaries"][1]["doc"]),"Zaman/sürüm ve sıra farkı değişiklik sayılmaz");
    // TS cek: baska = sahip var && sahip != uid && !(sahipAnonim && anonim)
    Check(!CloudContract.ReplacesLocal(null,false,"a",false)&&!CloudContract.ReplacesLocal("a",false,"a",false),"Sahipsiz/aynı hesap birleşir");
    Check(CloudContract.ReplacesLocal("a",false,"b",false)&&CloudContract.ReplacesLocal("a",false,"b",true)&&CloudContract.ReplacesLocal("a",true,"b",false),"Başka hesap yereli değiştirir");
    Check(!CloudContract.ReplacesLocal("a",true,"b",true),"Misafirden misafire kayıt geçer");
    Console.WriteLine($"Bulut: {checks} koşul; {n} TS ilerleme+rekor birleştirmesi (bozuk uzak değerler dahil), 96 rekor anahtarı, özet, hesap değişimi. Sağlayıcı/ağ yok (Firebase erişimi gerekli).");
  }
}
