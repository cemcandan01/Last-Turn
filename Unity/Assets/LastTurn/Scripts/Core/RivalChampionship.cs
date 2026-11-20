using System;
using System.Linq;

namespace LastTurn.Core
{
  // Sabit kimlikli üç rakip, üç yarış ve 10/6/3/1 puan. Eşit puanda en çok galibiyet, sonra son yarış.
  public sealed class RivalChampionship
  {
    public static readonly string[] Tracks = { "gp_1", "gp_2", "gp_3" };
    public static readonly string[] Names = { "SEN", "DORUK", "ECE", "BORA" };
    private readonly int[] points = new int[4], wins = new int[4], last = {0,1,2,3};
    public int Round {get;private set;}
    public bool Active {get;private set;}
    public bool Unlocked {get;private set;}
    public int Car {get;private set;}
    public int[] Points => (int[])points.Clone();
    public int[] Standings => Enumerable.Range(0,4).OrderByDescending(i=>points[i]).ThenByDescending(i=>wins[i]).ThenBy(i=>Array.IndexOf(last,i)).ToArray();
    public bool Complete => Active && Round==Tracks.Length;
    public string Track => Active && !Complete ? Tracks[Round] : "";
    public void Begin(int car)
    {
      Car=car;Round=0;Active=true;
      Array.Clear(points,0,4);Array.Clear(wins,0,4);
      for(int i=0;i<4;i++)last[i]=i;
    }
    public bool Finish(int round,int[] order)
    {
      if(!Active || Complete || round!=Round || order==null || order.Length!=4 ||
          order.Distinct().Count()!=4 || order.Any(i=>i<0 || i>3))return false;
      int[] score={10,6,3,1};
      for(int i=0;i<4;i++){points[order[i]]+=score[i];last[i]=order[i];}
      wins[order[0]]++;Round++;
      if(Complete && Standings[0]==0)Unlocked=true;
      return true;
    }
    public CatalogNode Save()
    {
      var n=CatalogNode.Obj();n.Set("active",CatalogNode.Bool(Active));n.Set("round",CatalogNode.Num(Round));
      n.Set("car",CatalogNode.Num(Car));n.Set("unlocked",CatalogNode.Bool(Unlocked));
      n.Set("points",CatalogNode.Arr(points.Select(x=>CatalogNode.Num(x))));
      n.Set("wins",CatalogNode.Arr(wins.Select(x=>CatalogNode.Num(x))));
      n.Set("last",CatalogNode.Arr(last.Select(x=>CatalogNode.Num(x))));return n;
    }
    public static RivalChampionship Load(CatalogNode n)
    {
      var c=new RivalChampionship();if(!n.IsObject)return c;
      c.Active=n["active"].B();c.Unlocked=n["unlocked"].B();
      c.Round=(int)n["round"].N();c.Car=(int)n["car"].N();
      if(c.Round<0 || c.Round>3 || c.Car<0)throw new ArgumentException("Şampiyona kaydı geçersiz.");
      var p=n["points"].Items.Select(x=>x.N()).ToArray();var w=n["wins"].Items.Select(x=>x.N()).ToArray();
      var l=n["last"].Items.Select(x=>(int)x.N()).ToArray();
      if(p.Length!=4 || w.Length!=4 || l.Length!=4 || l.Distinct().Count()!=4 || l.Any(x=>x<0||x>3)
        || p.Any(x=>x<0 || x>30 || x!=(int)x) || w.Any(x=>x<0 || x>3 || x!=(int)x))
        throw new ArgumentException("Şampiyona sıralaması geçersiz.");
      for(int i=0;i<4;i++){c.points[i]=(int)p[i];c.wins[i]=(int)w[i];c.last[i]=l[i];}
      return c;
    }
  }
}
