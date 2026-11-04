using System;
using System.Linq;

namespace LastTurn.Core
{
  // Salt sunum: hesap/ödül/kilit kuralları mevcut GarageState/VehicleCatalog'dadır.
  public sealed class CareerMenuModel
  {
    public string Name="", Favorite="";
    public int Level, Races, Wins, Stars, MaxStars;
    public double Money, Xp, NextLevelXp, Km;
    public RaceEventRow[] Events=Array.Empty<RaceEventRow>();
    public static CareerMenuModel Read(GarageState state,RaceProfile profile,RaceEventCatalog races)
    {
      var rows=RaceViewModel.Events(state,races);
      var favorite=profile.Use.OrderByDescending(p=>p.Value).ThenBy(p=>p.Key).FirstOrDefault();
      var cars=GarageViewModel.Cars(state);
      return new CareerMenuModel { Name=profile.Name,Level=state.Level,Money=state.Balance,Xp=state.Xp,
        NextLevelXp=VehicleCatalog.LevelBase(state.Level+1),Races=profile.Races,Wins=profile.Wins,Km=profile.Km,
        Favorite=profile.Use.Count>0 && favorite.Key>=0 && favorite.Key<cars.Length?cars[favorite.Key].Name:"—",
        Stars=rows.Sum(r=>r.BestStars),MaxStars=rows.Length*3,Events=rows };
    }
  }
}
