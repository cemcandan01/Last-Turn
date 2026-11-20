using System.Linq;
namespace LastTurn.Core
{
  public sealed class CareerMilestone
  {
    public string Name="",Reward="";
    public int Progress,Target,Graphic;
    public bool Unlocked=>Progress>=Target;
  }
  public static class CareerMilestones
  {
    public static CareerMilestone[] Read(GarageState state)
    {
      var scores=new[]{"gp","rx","rl","dp","dg"}.SelectMany(type=>Enumerable.Range(1,8).Select(level=>state.StarsOf(type,level))).ToArray();
      return new[]{
        new CareerMilestone{Name="İlk İmza",Reward="İmza şeridi",Progress=scores.Count(s=>s>0),Target=3,Graphic=4},
        new CareerMilestone{Name="Kupa Avcısı",Reward="Zafer daması",Progress=scores.Sum(),Target=18,Graphic=5},
        new CareerMilestone{Name="Pist Efsanesi",Reward="Efsane deseni",Progress=scores.Count(s=>s==3),Target=12,Graphic=6}
      };
    }
    public static bool CanUse(GarageState state,int graphic)=>graphic<=3 || Read(state).Any(m=>m.Graphic==graphic && m.Unlocked);
    public static string NextEvent(GarageState state,RaceEventRow[] events)
    {
      var goal=Next(state);
      var next=events.Where(e=>e.Open && e.Career && e.BestStars<3)
        .OrderBy(e=>goal.Graphic==6?(e.BestStars>0?0:1):(e.BestStars==0?0:1)).FirstOrDefault();
      return next?.Key??"";
    }
    public static CareerMilestone Next(GarageState state)=>Read(state).FirstOrDefault(m=>!m.Unlocked)??Read(state).Last();
  }
}
