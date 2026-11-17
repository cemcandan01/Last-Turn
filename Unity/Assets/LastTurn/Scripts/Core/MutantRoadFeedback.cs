#nullable enable
using System.Globalization;

namespace LastTurn.Core
{
  // Olayın uygulanmış tutarını sunar; ödül verme veya enerji hesabı yapmaz.
  public static class MutantRoadFeedback
  {
    private static string Signed(double value)=>System.Math.Abs(value)>0&&System.Math.Abs(value)<.01
      ?(value>0?"+":"-")+"0.01'den az":(value>=0?"+":"")+value.ToString("0.##",CultureInfo.InvariantCulture);
    public static string Read(MutantSessionEvent e)
    {
      if(e.Kind!="gorev"||e.Mission==null)return "";
      if(e.Detail=="tamam")return "Yol görevi tamam · "+Signed(e.AwardedMoney)+" para · "+Signed(e.AwardedEnergy)+" enerji";
      if(e.Detail=="kacti")return "Yol görevi kaçtı.";
      return e.Detail=="basladi"?MutantRoadMissions.Name(e.Mission.Mission):"";
    }
  }
}
