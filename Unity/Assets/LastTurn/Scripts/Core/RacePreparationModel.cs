using System;
using System.Linq;

namespace LastTurn.Core
{
  // F §4 için salt sunum. Kilit/bütçe/ödül/rekor mevcut servislerden; yeni kural yok.
  public sealed class RacePreparationModel
  {
    public string Key="",Name="",Description="",TypeName="",Budget="",Status="",Record="";
    public bool Open,Career,MapOpen;public int Stage,Laps,BestStars;
    public double Xp,Money;public string[] Targets=Array.Empty<string>();
    public double[] MapX=Array.Empty<double>(),MapZ=Array.Empty<double>();
    public GarageCarDetail Car=null!;
    public static RacePreparationModel Read(GarageState state,RaceProfile profile,RaceEventCatalog events,TrackDefinition track,string key)
    {
      var e=events.Events.First(x=>x.Type+"_"+x.Level==key);var row=RaceViewModel.Events(state,events).First(x=>x.Key==key);
      var rule=state.Catalog.CareerRule(e.Type,e.Level);var reward=state.Catalog.Reward(e.Type,e.Level,3,row.BestStars);
      string Format(double value)=>e.Type=="dp"?value.ToString("0")+" puan":e.Type=="dg"?value.ToString("0.000")+" sn":RaceSession.FormatTime(value);
      double best=profile.Best((row.Career?"":"deneme_")+e.Key);
      return new RacePreparationModel{
        Key=key,Name=e.Name,Description=e.Description,TypeName=row.TypeName,Stage=(int)rule["asama"].N(),Laps=e.Laps,
        Open=row.Open,Career=row.Career,BestStars=row.BestStars,Budget=rule["ad"].S(),
        Status=!row.Open?"Kilitli: XP seviyesi veya önceki kupa başarısı gerekli.":row.Career?"Kariyer için uygun; ödüllü yarış.":"Araç puan bütçesini aşıyor; ödülsüz deneme.",
        Record=best>0?Format(best):"Henüz yok",Targets=e.Stars.Select(Format).ToArray(),
        Xp=row.Open&&row.Career?reward["xp"].N():0,Money=row.Open&&row.Career?reward["para"].N():0,
        Car=GarageViewModel.Detail(state,state.SelectedCar),MapOpen=track.Open,MapX=(double[])track.Geometry.X.Clone(),MapZ=(double[])track.Geometry.Z.Clone()
      };
    }
  }
}
