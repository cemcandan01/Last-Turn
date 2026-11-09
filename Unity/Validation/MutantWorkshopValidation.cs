using System.Text.Json;
using System.Security.Cryptography;
using LastTurn.Core;

internal static class MutantWorkshopValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../.."));string Read(string n)=>File.ReadAllText(Path.Combine(root,"Unity/Assets/LastTurn/Resources",n));
    var catalog=CatalogNode.Parse(Read("mutant-catalog.json"));var vehicles=new VehicleCatalog(Read("vehicle-catalog.json"));int checks=0,tsOperations=0,replayed=0;double maxError=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("B atölye: "+label);}
    void Near(double a,double b,string label){double error=Math.Abs(a-b);maxError=Math.Max(maxError,error);Check(error<1e-9,label);}
    void Compare(CatalogNode a,CatalogNode b,string label){if(b.IsNumber){Near(a.N(double.NaN),b.N(),label);return;}if(b.Fields.Any()){Check(a.Fields.Select(p=>p.Key).Order().SequenceEqual(b.Fields.Select(p=>p.Key).Order()),label+" alanlar");foreach(var p in b.Fields)Compare(a[p.Key],p.Value,label+"."+p.Key);return;}if(b.Items.Any()||b.ToString()=="[]"){var aa=a.Items.ToArray();var bb=b.Items.ToArray();Check(aa.Length==bb.Length,label+" uzunluk");for(int i=0;i<bb.Length;i++)Compare(aa[i],bb[i],label+"["+i+"]");return;}Check(a.ToString()==b.ToString(),label+" değer");}
    var oracle=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-run-0.8.18.json")));Check(oracle["baseline"].S()==VehicleCatalog.Baseline,"TS sabit kaynak SHA");
    // RNG bağlamını korumak için kaynak dizisi yürütülür; yalnız 57 atölye işleminin sonucu/durumu karşılaştırılır.
    foreach(var scenario in oracle["runs"].Items){var r=new MutantRun((uint)scenario["seed"].N(),oracle["catalog"],scenario["test"].B());foreach(var step in scenario["steps"].Items){var a=step["args"];object? result=null;string name=step["name"].S();replayed++;
      switch(name){
        case "choose":result=r.Choose(a[0].S(),a[1].S());break;
        case "prepareChoice":r.State.Set("faz",CatalogNode.Str("secim"));r.State.Set("bekleyenSecim",CatalogNode.Num(1));r.State.Set("secenekler",CatalogNode.Arr(new[]{a[0]}));break;
        case "removeSkill":r.RemoveSkill(a[0].S());break;
        case "setNitro":r.State["mek"].Set("etkiKalan",a[0]);r.State["mek"].Set("etkiGuc",a[1]);break;
        case "setPassives":r.State.Set("pasifler",a[0].Clone());break;
        case "damage":result=r.Damage(a[0].S());break;case "cut":result=r.CutPenalty(a[0].N());break;case "repair":result=r.Repair();break;
        case "lockDeposit":result=r.LockDeposit((int)a[0].N());break;case "event":result=r.FinishEvent((int)a[0].N(),a[1].B(),(int)a[2].N(),a[3].IsNull?null:a[3].B());break;
        case "offer":result=r.ChestOffer((int)a[0].N());break;case "accept":result=r.AcceptChest((int)a[0].N(),a[1].S());break;case "reject":result=r.RejectChest((int)a[0].N());break;
        case "buy":result=r.BuyPart(a[0].S(),(int)a[1].N());break;case "refresh":result=r.RefreshStock();break;case "advance":result=r.Advance(a[0].N());break;
        case "enterBoss":r.EnterBoss();break;case "boss":r.FinishBoss(a[0].B());break;default:throw new Exception("Bilinmeyen kaynak adımı: "+name);
      }
      if(name=="buy"||name=="repair"||name=="refresh"){tsOperations++;Check(result is bool v&&v==step["result"].B(),"TS işlem sonucu "+tsOperations);Compare(r.State,step["state"],"TS "+tsOperations+" "+name);}
    }}
    Check(tsOperations==57,"12 tamir/30 alım/15 yenileme kaynak işlemi");
    foreach(var sample in new[]{(100d,500d,100d,0d,false),(70d,90d,100d,90d,true),(70d,20d,76d,18d,true),(99d,3d,100d,3d,true),(70d,2d,70d,0d,false),(99.2d,3d,100d,2.4d,true),(99.2d,2d,99.2d,0d,false),(40d,0d,40d,0d,false)}){
      var r=new MutantRun(53,catalog);r.State.Set("govde",CatalogNode.Num(sample.Item1));r.State.Set("para",CatalogNode.Num(sample.Item2));string before=r.State.ToString();var m=MutantMenuModel.Read(r,vehicles,0);var p=r.RepairPreview;
      Check(r.State.ToString()==before,"Tamir önizlemesi salt");Check(p.CanRepair==sample.Item5&&m.CanRepair==p.CanRepair,"Gerçek tamir uygunluğu");Near(p.Cost,sample.Item4,"Şimdiki bedel");Near(p.BodyAfter,sample.Item3,"Öngörülen gövde");Near(m.RepairCost,Math.Ceiling((100-sample.Item1)*3),"Tam tamir bedeli ayrı");
      Check(r.Repair()==p.CanRepair,"Önizleme/komut kabulü aynı");Near(r.State["govde"].N(),sample.Item3,"Gerçek gövde sonucu");Near(r.State["para"].N(),sample.Item2-sample.Item4,"Gerçek para sonucu");
    }
    var map=CatalogNode.Parse(Read("UI/MutantB/reward-icons.json"));
    foreach(var part in catalog["parts"].Items){string id=part["id"].S();int level=(int)part["sv"].N();foreach(int merchants in new[]{0,2}){
      var r=new MutantRun(77,catalog);r.State.Set("parcalar",CatalogNode.Arr(Array.Empty<CatalogNode>()));r.State.Set("stok",CatalogNode.Arr(new[]{CatalogNode.Str(id)}));r.State.Set("pasifler",CatalogNode.Arr(Enumerable.Repeat(CatalogNode.Str("tuccar"),merchants)));double price=r.PartPrice(level,id);r.State.Set("para",CatalogNode.Num(price));string before=r.State.ToString();var m=MutantMenuModel.Read(r,vehicles,0);var card=m.Stock.Single();
      Check(before==r.State.ToString()&&card.CanBuy&&card.Price==price,"Alım önizlemesi/indirim salt "+id);Check(map["entries"].Items.Any(e=>e["key"].S()==card.IconKey),"Kategori ikon kimliği "+id);
      Check(r.BuyPart(id,level),"Tam fiyatla alım "+id);Check(r.State["para"].N()==0&&!r.State["stok"].Items.Any()&&r.State["parcalar"].Items.Single().S()==id,"Stok/parça/para sonucu "+id);
      var afterSetup=MutantVehicle.Configure(vehicles,vehicles.Setup(0,r.State["parcalar"].Items.Select(p=>p.S())),r.State);Check(afterSetup.Parts.Contains(id),"Parça mevcut araç hesabına geçer "+id);
      string bought=r.State.ToString();Check(!r.BuyPart(id,level)&&r.State.ToString()==bought,"İkinci/eski alım değişiklik üretmez "+id);
      r.State.Set("stok",CatalogNode.Arr(new[]{CatalogNode.Str(id)}));r.State.Set("parcalar",CatalogNode.Arr(Array.Empty<CatalogNode>()));r.State.Set("para",CatalogNode.Num(price-1));string poor=r.State.ToString();Check(!MutantMenuModel.Read(r,vehicles,0).Stock.Single().CanBuy&&!r.BuyPart(id,level)&&r.State.ToString()==poor,"Yetersiz para "+id);
    }}
    var a1=new MutantRun(53,catalog);var a2=new MutantRun(53,catalog);a1.State.Set("para",CatalogNode.Num(100));a2.State.Set("para",CatalogNode.Num(100));string initial=a1.State.ToString();for(int i=0;i<5;i++)MutantMenuModel.Read(a1,vehicles,0);Check(initial==a1.State.ToString(),"Çizim/odak RNG tüketmez");Check(a1.RefreshStock()&&a2.RefreshStock()&&a1.State.ToString()==a2.State.ToString()&&a1.State["para"].N()==60,"Yenileme aynı RNG sonucu ve bedel");
    a1.State.Set("para",CatalogNode.Num(39));string low=a1.State.ToString();Check(!a1.RefreshStock()&&a1.State.ToString()==low,"Yetersiz yenileme salt");a1.State.Set("stok",CatalogNode.Arr(Array.Empty<CatalogNode>()));Check(MutantMenuModel.Read(a1,vehicles,0).Stock.Length==0,"Boş stok güvenli");
    var proof=new{result="mutant-workshop-passed",checks,tsOperations,replayed,maxError,utc=DateTime.UtcNow.ToString("O"),sources=Directory.GetFiles(Path.Combine(root,"Unity/Assets/LastTurn/Scripts/Core"),"*.cs").Order().Select(p=>new{path=Path.GetRelativePath(root,p).Replace('\\','/'),hash=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(p)))}).ToArray()};Directory.CreateDirectory(Path.Combine(root,"tests/cikti"));File.WriteAllText(Path.Combine(root,"tests/cikti/mutant-workshop-proof.json"),JsonSerializer.Serialize(proof,new JsonSerializerOptions{WriteIndented=true}));Console.WriteLine($"B atölye: {checks} dar kontrol;{tsOperations} TS atölye işlemi ({replayed} bağlam adımı), fark {maxError:G3};42 parça/indirim/tamir/yenileme/ikon.");
  }
}
