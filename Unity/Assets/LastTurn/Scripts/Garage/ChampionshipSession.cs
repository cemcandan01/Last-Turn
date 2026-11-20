using LastTurn.Core;
using LastTurn.Prototype;

namespace LastTurn.Garage
{
  public static class ChampionshipSession
  {
    public static string Message {get;private set;}="";
    public static bool Start()
    {
      GarageSession.EnsureLoaded();
      var cup=GarageSession.State.Championship;
      if(!cup.Active || cup.Complete){
        if(!GarageSession.Transact(s=>{s.Championship.Begin(s.SelectedCar);return true;},"Şampiyona başladı."))return false;
        cup=GarageSession.State.Championship;
      }
      if(GarageSession.State.SelectedCar!=cup.Car){Message="Şampiyonaya başladığın aracı garajdan seç.";return false;}
      Message="";return WorldData.StartChampionship(cup.Track);
    }
    public static bool Finish(int round,int[] order)
    {
      bool saved=GarageSession.Transact(s=>s.Championship.Finish(round,order),"Şampiyona sonucu kaydedildi.");
      Message=saved?"":GarageSession.Message;
      return saved;
    }
    public static bool ApplyPrize()
    {
      return GarageSession.Transact(s=>{
        if(!s.Championship.Unlocked)return false;
        var style=s.Appearance(s.SelectedCar);
        style.Top=new DecalLayer{Shape=3,Surface=1,X=-5,Y=1,Color=0xE6BA48,Mirror=true,Size=1};
        return s.SetAppearance(s.SelectedCar,style);
      },"Şampiyonluk arması seçili araca uygulandı.");
    }
    public static string Table()
    {
      var c=GarageSession.State.Championship;var points=c.Points;
      string text=c.Complete?"ŞAMPİYONA SONUCU":"ŞAMPİYONA · "+c.Round+"/3 yarış";
      foreach(int id in c.Standings)text+="\n"+RivalChampionship.Names[id]+"     "+points[id]+" puan";
      return text;
    }
  }
}
