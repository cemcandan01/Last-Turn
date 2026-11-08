using System.Text.Json;
using System.Security.Cryptography;
using LastTurn.Core;

internal static class MutantRewardValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../.."));
    string Resource(string n)=>File.ReadAllText(Path.Combine(root,"Unity/Assets/LastTurn/Resources",n));
    var catalog=CatalogNode.Parse(Resource("mutant-catalog.json"));string meta=Resource("mutant-reward-metadata.json");
    var rewards=new MutantRewards(catalog,meta);var cars=new VehicleCatalog(Resource("vehicle-catalog.json"));int checks=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("M2: "+label);}
    var run=new MutantRun(53,catalog);string state=run.State.ToString(),data=cars.Data.ToString(),source=catalog.ToString();
    Check(rewards.Definitions.Count==94&&rewards.Diagnostics.Count==0,"94 gerçek katalog tanımı / metadata kapsamı");
    var legacy=new MutantRewards(catalog);Check(legacy.Definitions.All(d=>d.Rarity==RewardRarity.Common),"Eski katalog metadata olmadan okunur");
    foreach(var invalid in new[]{"{", "{\"schema\":2,\"entries\":{}}", "{\"schema\":1,\"entries\":{\"passive/guc\":\"1\"}}", "{\"schema\":1,\"entries\":{\"passive/guc\":false}}", "{\"schema\":1,\"entries\":{\"passive/guc\":\"Ultra\"}}"}){
      var bad=new MutantRewards(catalog,invalid);Check(bad.Find("passive/guc")!.Rarity==RewardRarity.Common&&bad.Diagnostics.Count>0,"Geçersiz metadata güvenli varsayılan");
    }
    var missing=new MutantRewards(catalog,"{\"schema\":1,\"entries\":{}}");Check(missing.Find("skill/volt-kanat")!.Rarity==RewardRarity.Common,"Eksik kayıt Yaygın olur");
    foreach(var d in rewards.Definitions){
      string offer=d.Kind==RewardKind.Skill?"b:"+d.Id:d.Kind==RewardKind.Evolution?"v:"+d.Owner+":"+d.Id:d.Kind==RewardKind.SkillAddon?"e:"+d.Id+":grappling-hook":d.Id;
      var card=rewards.Read(run,offer,RewardSource.Level,cars,0);
      Check(card.Known&&card.Name==d.Name&&card.Description==d.Description&&card.Rarity==d.Rarity,"Gerçek katalog kartı "+d.Key);
      Check(card.IconKey==d.Key,"Sunum ikon kimliği gerçek katalog türünde "+d.Key);
    }
    Check(run.State.ToString()==state&&cars.Data.ToString()==data&&catalog.ToString()==source,"Model okuması koşu/katalog/kayıt verisini değiştirmez");
    Check(!rewards.Read(run,"x:volt-kanat",RewardSource.Level).Known&&!rewards.Read(run,"y",RewardSource.Level).Known,"Geçersiz teklif güvenli");
    run.State.Set("pasifler",CatalogNode.Parse("[\"guc\",\"guc\"]"));
    var common=rewards.Read(run,"guc",RewardSource.Level,cars,0);var legendary=rewards.Read(run,"sonnefes",RewardSource.Level,cars,0);
    Check(common.Level==3&&common.Rarity==RewardRarity.Common&&legendary.Level==1&&legendary.Rarity==RewardRarity.Legendary,"Seviye ve nadirlik bağımsız");
    Check(common.VehicleEffects.Any(e=>e.Name=="Güç"&&e.After>e.Before)&&legendary.VehicleEffects.Length==0,"Nadirlik otomatik araç gücü/fayda skoru değildir");
    run.State.Set("secenekler",CatalogNode.Parse("[\"guc\"]"));Check(run.Choose("guc"),"Gerçek pasif komutu");
    var actual=MutantVehicle.Configure(cars,cars.Setup(0,Array.Empty<string>()),run.State).Car["hp"].N();
    Check(Math.Abs(common.VehicleEffects.Single(e=>e.Name=="Güç").After-actual)<1e-9,"Kart önizlemesi gerçek Choose/araç sonucu ile aynı");
    Check(!rewards.Read(run,"guc",RewardSource.Level,cars,0).Compatible,"Pasif birikim sınırı");
    run.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"slipstream-engine\",\"seviye\":2,\"eklentiler\":[],\"evrim\":null},{\"id\":\"grappling-hook\",\"seviye\":1,\"eklentiler\":[],\"evrim\":null},{\"id\":\"flying-dutchman\",\"seviye\":1,\"eklentiler\":[],\"evrim\":null}]"));
    var upgrade=rewards.Read(run,"y:slipstream-engine",RewardSource.Level);
    Check(upgrade.Level==3&&upgrade.EffectText.Contains("1,25 → 1,3")&&upgrade.Rarity==RewardRarity.Uncommon,"Skill yükseltmesi gerçek seviye parametrelerini gösterir");
    var full=rewards.Read(run,"b:volt-kanat",RewardSource.Level);Check(full.Compatible&&full.NeedsReplacement,"Dolu3 yuva oyuncu seçimli değiştirmeyi gerektirir");
    run.State.Set("faz",CatalogNode.Str("secim"));run.State.Set("secenekler",CatalogNode.Parse("[\"b:volt-kanat\"]"));string fullBefore=run.State.ToString();
    Check(!run.Choose("b:volt-kanat")&&run.State.ToString()==fullBefore,"Dolu yuvada sessizce skill atılmaz");
    Check(run.Choose("b:volt-kanat","flying-dutchman"),"Açık değiştirme ile mevcut komut çalışır");
    Check(rewards.Read(run,"e:sok-bobini:grappling-hook",RewardSource.Level).Compatible&&!rewards.Read(run,"e:kor-cekirdegi:grappling-hook",RewardSource.Level).Compatible,"Uyumluluk mevcut SkillOffers servisinden gelir");
    run.State["beceriler"].Items.Single(s=>s["id"].S()=="grappling-hook").Set("seviye",CatalogNode.Num(3));
    var evolution=rewards.Read(run,"v:grappling-hook:ters-kanca",RewardSource.Level);
    Check(evolution.Compatible&&evolution.Level==3&&evolution.KindText=="Evrim"&&evolution.Rarity==RewardRarity.Legendary,"Evrim seviye artışı değildir; ayrı tanım ve nadirliktir");
    Check(!rewards.Read(run,"y:grappling-hook",RewardSource.Level).Compatible&&rewards.Read(run,"y:grappling-hook",RewardSource.Level).Level==3,"Son seviyeden sonra sahte4.seviye gösterilmez");
    Check(rewards.Read(run,"e:sok-bobini:grappling-hook",RewardSource.Level).Level==3,"Eklenti hedef skill seviyesini gösterir");
    run.State.Set("faz",CatalogNode.Str("secim"));run.State.Set("secenekler",CatalogNode.Parse("[\"v:grappling-hook:ters-kanca\"]"));
    Check(run.Choose("v:grappling-hook:ters-kanca")&&!rewards.Read(run,"v:grappling-hook:ters-kanca",RewardSource.Level).Compatible,"Gerçek evrim komutundan sonra aynı evrim teklif edilemez");
    var cursed=rewards.Read(run,"ek-cift-atesleme",RewardSource.Chest,cursed:true,curse:"govde");
    Check(cursed.Cursed&&cursed.Rarity==RewardRarity.Legendary&&cursed.CurseText.Contains("25"),"Lanet ve nadirlik bağımsız");
    var empty=catalog.Clone();empty.Set("passives",CatalogNode.Arr(Array.Empty<CatalogNode>()));empty.Set("skills",CatalogNode.Arr(Array.Empty<CatalogNode>()));empty.Set("addons",CatalogNode.Arr(Array.Empty<CatalogNode>()));
    var exhausted=new MutantRun(3,empty);Check(!exhausted.State["secenekler"].Items.Any(),"Tükenmiş seçim havuzu güvenli");
    exhausted.State.Set("faz",CatalogNode.Str("surus"));string fallback=exhausted.ChestOffer(0)!;
    Check(fallback.StartsWith("sandik-")&&new MutantRewards(empty,meta).Read(exhausted,fallback,RewardSource.Chest).Known,"Tükenmiş sandık mevcut kaynak ödülüne düşer");
    Check(exhausted.AcceptChest(0,fallback),"Mevcut kaynak ödülü alınır");string chestAfter=exhausted.State.ToString();
    Check(!exhausted.AcceptChest(0,fallback)&&exhausted.State.ToString()==chestAfter,"Sandık tekrar alınıp ödül üretilemez");
    var resourceIds=new HashSet<string>();
    for(uint seed=1;seed<=32&&resourceIds.Count<3;seed++){
      var r=new MutantRun(seed,empty);r.State.Set("faz",CatalogNode.Str("surus"));r.State.Set("govde",CatalogNode.Num(50));r.State["mek"].Set("enerji",CatalogNode.Num(20));
      string id=r.ChestOffer(0)!;var card=new MutantRewards(empty,meta).Read(r,id,RewardSource.Chest);
      double[] old={r.State["para"].N(),r.State["govde"].N(),r.State["mek"]["enerji"].N()};Check(r.AcceptChest(0,id),"Gerçek kaynak kabulü");
      double[] now={r.State["para"].N(),r.State["govde"].N(),r.State["mek"]["enerji"].N()};
      double delta=Enumerable.Range(0,3).Select(i=>now[i]-old[i]).Single(n=>n>0);
      Check(card.EffectText.Contains(delta.ToString("0.##",System.Globalization.CultureInfo.InvariantCulture)),"Kaynak kartının sayısı gerçek komut kazancıyla aynı");resourceIds.Add(id);
    }
    Check(resourceIds.Count==3,"Üç kaynak türünün sayısal doğrulaması");

    // Adaylar SADECE laboratuvarda: üretim Run/DrawChoices/RNG/ağırlıklarına bağlanmaz.
    var baseline=new int[4];var neutral=new int[4];var risk=new int[4];
    var rarityOf=rewards.Definitions.Where(d=>d.Kind==RewardKind.Passive||d.Kind==RewardKind.Skill).ToDictionary(d=>d.Kind==RewardKind.Skill?"b:"+d.Id:d.Id,d=>d.Rarity);
    string[] Sample(MutantRun r,uint seed,double[] weights){
      var pool=catalog["passives"].Items.Select(n=>n["id"].S()).Concat(r.SkillOffers()).ToList();var random=new SeededRandom(seed^0x6a09e667u);var output=new List<string>();
      for(int i=0;i<3&&pool.Count>0;i++){
        double Weight(string id)=>weights[(int)rarityOf[id]];double sum=pool.Sum(Weight);if(sum<=0)break;
        double at=random.Next()*sum;int n=0;while(n<pool.Count-1&&(at-=Weight(pool[n]))>=0)n++;
        output.Add(pool[n]);pool.RemoveAt(n);
      }return output.ToArray();
    }
    for(uint seed=1;seed<=128;seed++){
      var a=new MutantRun(seed,catalog);var b=new MutantRun(seed,catalog);string old=a.State.ToString();
      foreach(var o in a.State["secenekler"].Items){var card=rewards.Read(a,o.S(),RewardSource.Start);baseline[(int)card.Rarity]++;}
      Check(a.State.ToString()==old&&old==b.State.ToString(),"Metadata/RNG bağımsız tohum "+seed);
      foreach(var item in new[]{(weights:new[]{4d,2,1,.5},counts:neutral),(weights:new[]{4d,3,2,1},counts:risk)}){
        var sampled=Sample(a,seed,item.weights);Check(sampled.SequenceEqual(Sample(a,seed,item.weights))&&sampled.Distinct().Count()==3,"Aday tohum/tekrarsız seçim");
        foreach(string id in sampled)item.counts[(int)rewards.Read(a,id,RewardSource.Level).Rarity]++;
      }
      Check(a.Choose(a.State["secenekler"][0].S())&&b.Choose(b.State["secenekler"][0].S())&&a.State.ToString()==b.State.ToString(),"Metadata sonraki gerçek seçimi de değiştirmez");
    }
    string proof=Path.Combine(root,"tests/cikti/mutant-reward-proof.json");Directory.CreateDirectory(Path.GetDirectoryName(proof)!);
    var sources=new[]{"Unity/Assets/LastTurn/Scripts/Core/MutantRewards.cs","Unity/Assets/LastTurn/Resources/mutant-reward-metadata.json","Unity/Validation/MutantRewardValidation.cs","Unity/Assets/LastTurn/Resources/mutant-catalog.json"}.ToDictionary(p=>p,p=>Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(root,p)))).ToLowerInvariant());
    File.WriteAllText(proof,JsonSerializer.Serialize(new{result="passed",utc=DateTime.UtcNow,checks,seeds=128,definitions=94,productionUnchanged=true,sources,baseline,labNeutral=neutral,labRisk=risk,note="Lab candidates are not production probabilities; no driving/utility score."},new JsonSerializerOptions{WriteIndented=true}));
    Console.WriteLine($"M2 ödül: {checks} dar kontrol;94 tanım,128 tohum; üretim seçimi değişmedi. Kanıt {proof}");
  }
}
