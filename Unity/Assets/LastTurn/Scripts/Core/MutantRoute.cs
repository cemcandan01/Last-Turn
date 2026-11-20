using System;
using System.Linq;

namespace LastTurn.Core
{
  public sealed class MutantRoute
  {
    public int Risk,Bonus,Progress,Region,NextId=-1;
    public bool Chosen,Failed,Complete;
    public string Name="",Detail="",Status="";
    public int[] Ids=Array.Empty<int>();
    public static MutantRoute Read(MutantRun run)
    {
      var n=run.State["rota"];var m=new MutantRoute();
      if(!n.IsObject || n["region"].N()!=run.Region)return m;
      m.Chosen=true;m.Region=run.Region;m.Risk=(int)n["risk"].N();m.Bonus=m.Risk==0?60:120;
      m.Name=m.Risk==0?"Güvenli rota":"Meydan okuma";
      m.Ids=n["ids"].Items.Select(x=>(int)x.N()).ToArray();m.Progress=(int)n["progress"].N();
      m.Failed=n["failed"].B();m.Complete=n["paid"].B();
      if(!m.Failed && !m.Complete && m.Progress<m.Ids.Length)m.NextId=m.Ids[m.Progress];
      m.Status=m.Failed?"Rota sona erdi · Bonus kaçtı":m.Complete?"Rota tamam · +"+m.Bonus+" para":m.Name+" · "+m.Progress+"/2 · Risk "+m.Risk;
      return m;
    }
    public static MutantRoute Offer(MutantRun run,int risk)
    {
      var events=run.State["etkinlikler"].Items.Where(e=>!e["yapildi"].B()).GroupBy(e=>e["i"].N()).Select(g=>g.First());
      var chosen=(risk==0?events.OrderBy(e=>e["sev"].N()).ThenBy(e=>e["id"].N()):
        events.OrderByDescending(e=>e["sev"].N()).ThenByDescending(e=>e["id"].N())).Take(2).ToArray();
      var m=new MutantRoute{Risk=risk,Bonus=risk==0?60:120,Name=risk==0?"Güvenli rota":"Meydan okuma",Ids=chosen.Select(e=>(int)e["id"].N()).ToArray()};
      m.Detail=string.Join(" → ",chosen.Select(e=>run.Catalog["trackNames"][(int)e["i"].N()].S()));
      return m;
    }
    public static bool Choose(MutantRun run,int risk)
    {
      if((risk!=0 && risk!=2) || run.Finished || run.State["faz"].S()!="surus" || Read(run).Chosen)return false;
      var offer=Offer(run,risk);if(offer.Ids.Length!=2)return false;
      var n=CatalogNode.Obj();n.Set("region",CatalogNode.Num(run.Region));n.Set("risk",CatalogNode.Num(risk));
      n.Set("ids",CatalogNode.Arr(offer.Ids.Select(x=>CatalogNode.Num(x))));
      n.Set("progress",CatalogNode.Num(0));n.Set("failed",CatalogNode.Bool(false));n.Set("paid",CatalogNode.Bool(false));
      run.State.Set("rota",n);return true;
    }
    // FinishEvent'in tek kullanım kapısından sonra çağrılır. Tekrar edilen bitiş bonus üretemez.
    public static int Finish(MutantRun run,int id,bool passed,int risk)
    {
      var m=Read(run);
      if(!m.Chosen || m.Complete || m.Failed || !m.Ids.Contains(id))return 0;
      var n=run.State["rota"];
      if(id!=m.NextId || !passed || risk<m.Risk){n.Set("failed",CatalogNode.Bool(true));return 0;}
      n.Set("progress",CatalogNode.Num(m.Progress+1));
      if(m.Progress+1<m.Ids.Length)return 0;
      n.Set("paid",CatalogNode.Bool(true));return m.Bonus;
    }
  }
}
