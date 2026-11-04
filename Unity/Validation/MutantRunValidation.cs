using LastTurn.Core;

internal static class MutantRunValidation
{
  public static void Run()
  {
    var oracle=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-run-0.8.18.json")));
    if(oracle["baseline"].S()!="df3549e709469f0b519ebfbeaa9f63c1040fee05")throw new InvalidOperationException("P3 kaynak SHA");
    int checks=0,operations=0;double maxError=0;
    void Check(bool condition,string label){checks++;if(!condition)throw new InvalidOperationException("P3 koşu: "+label);}
    void Compare(CatalogNode actual,CatalogNode expected,string label)
    {
      if(expected.IsNumber){double error=Math.Abs(actual.N(double.NaN)-expected.N());maxError=Math.Max(maxError,error);Check(double.IsFinite(error)&&error<=1e-9,label+" sayı "+actual+" != "+expected);return;}
      if(expected.ToString().StartsWith("{")){
        Check(actual.Fields.Select(p=>p.Key).OrderBy(x=>x).SequenceEqual(expected.Fields.Select(p=>p.Key).OrderBy(x=>x)),label+" alanlar");
        foreach(var p in expected.Fields)Compare(actual[p.Key],p.Value,label+"."+p.Key);return;
      }
      if(expected.ToString().StartsWith("[")){
        var a=actual.Items.ToArray();var e=expected.Items.ToArray();Check(a.Length==e.Length,label+" dizi uzunluğu "+a.Length+" != "+e.Length);for(int i=0;i<e.Length;i++)Compare(a[i],e[i],label+"["+i+"]");return;
      }
      Check(actual.ToString()==expected.ToString(),label+" değer "+actual+" != "+expected);
    }
    CatalogNode Result(object? value)=>value switch{null=>CatalogNode.Parse("null"),bool b=>CatalogNode.Parse(b?"true":"false"),double d=>CatalogNode.Num(d),string s=>CatalogNode.Str(s),CatalogNode n=>n,_=>throw new InvalidOperationException("Sonuç türü")};
    CatalogNode Proof(MutantRun run)
    {
      var p=run.BossTrack();var result=CatalogNode.Obj();result.Set("bossTrack",p["i"]);result.Set("bossTarget",CatalogNode.Num(run.BossTarget(p)));result.Set("bossOpponent",Result(run.BossOpponent()));
      result.Set("events",CatalogNode.Arr(run.State["etkinlikler"].Items.Select(e=>{
        var item=CatalogNode.Obj();item.Set("id",e["id"]);var track=run.Catalog["tracks"].Items.First(t=>t["i"].N()==e["i"].N());
        item.Set("risks",CatalogNode.Arr(Enumerable.Range(0,3).Select(r=>{var row=CatalogNode.Obj();row.Set("target",MutantRun.EventTarget(track,r));row.Set("opponent",Result(run.EventOpponent(e,r)));return row;})));return item;
      })));return result;
    }
    int finished=0;
    foreach(var scenario in oracle["runs"].Items)
    {
      var run=new MutantRun((uint)scenario["seed"].N(),oracle["catalog"],scenario["test"].B());Compare(run.State,scenario["initial"],"başlangıç "+scenario["seed"]);
      Compare(Proof(run),scenario["initialProof"],"başlangıç hedef/rakip");
      foreach(var step in scenario["steps"].Items){var a=step["args"];object? result=null;
        switch(step["name"].S()){
          case "choose":result=run.Choose(a[0].S(),a[1].S());break;
          case "prepareChoice":run.State.Set("faz",CatalogNode.Str("secim"));run.State.Set("bekleyenSecim",CatalogNode.Num(1));run.State.Set("secenekler",CatalogNode.Arr(new[]{a[0]}));break;
          case "removeSkill":run.RemoveSkill(a[0].S());break;
          case "setNitro":run.State["mek"].Set("etkiKalan",a[0]);run.State["mek"].Set("etkiGuc",a[1]);break;
          case "setPassives":run.State.Set("pasifler",a[0].Clone());break;
          case "damage":result=run.Damage(a[0].S());break;
          case "cut":result=run.CutPenalty(a[0].N());break;
          case "repair":result=run.Repair();break;
          case "lockDeposit":result=run.LockDeposit((int)a[0].N());break;
          case "event":result=run.FinishEvent((int)a[0].N(),a[1].B(),(int)a[2].N(),a[3].ToString()=="null"?null:a[3].B());break;
          case "offer":result=run.ChestOffer((int)a[0].N());break;
          case "accept":result=run.AcceptChest((int)a[0].N(),a[1].S());break;
          case "reject":result=run.RejectChest((int)a[0].N());break;
          case "buy":result=run.BuyPart(a[0].S(),(int)a[1].N());break;
          case "refresh":result=run.RefreshStock();break;
          case "advance":result=run.Advance(a[0].N());break;
          case "enterBoss":run.EnterBoss();break;
          case "boss":run.FinishBoss(a[0].B());break;
          default:throw new InvalidOperationException("Bilinmeyen işlem "+step["name"]);
        }
        string label=scenario["seed"].N()+" / "+operations+" "+step["name"].S();Compare(Result(result),step["result"],label+" dönüş");Compare(run.State,step["state"],label+" durum");Compare(Proof(run),step["proof"],label+" hedef/rakip");operations++;
      }
      if(run.Finished)finished++;
    }
    Check(finished>=5,"En az beş kaynak koşusu sonlandı");Check(operations>=600,"Oracle işlem kapsamı");
    Console.WriteLine($"P3 koşu: {checks} koşul, {operations} kaynak işlem, {finished} sonlanan koşu; en büyük fark {maxError:G3}.");
  }
}
