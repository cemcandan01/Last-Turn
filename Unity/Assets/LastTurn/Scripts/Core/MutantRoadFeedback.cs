#nullable enable
using System.Globalization;

namespace LastTurn.Core
{
  // Olayın uygulanmış tutarını sunar; ödül verme veya enerji hesabı yapmaz.
  public static class MutantRoadFeedback
  {
    private static string N(double value)=>value.ToString("0.#",CultureInfo.InvariantCulture);
    public static string Read(MutantSessionEvent e)
    {
      if(e.Kind!="gorev"||e.Mission==null)return "";
      if(e.Detail=="tamam")return "Yol görevi tamam · +"+N(e.AwardedMoney)+" para · +"+N(e.AwardedEnergy)+" enerji";
      if(e.Detail=="kacti")return "Yol görevi kaçtı.";
      return e.Detail=="basladi"?MutantRoadMissions.Name(e.Mission.Mission):"";
    }
  }
}
