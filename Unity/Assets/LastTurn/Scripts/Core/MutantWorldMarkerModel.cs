using System.Linq;

namespace LastTurn.Core
{
  public sealed class MutantWorldMarkerModel
  {
    public string Key="",Name="",Kind="";
    public double X,Z;
    public bool Used;
    public static MutantWorldMarkerModel[] Read(MutantRun run)
    {
      var menu=run.State;bool city=run.Region>=2;var shop=run.Catalog[city?"cityWorkshop":"workshop"];var boss=run.Catalog[city?"cityBoss":"bossPlace"];
      return menu["etkinlikler"].Items.Select(e=>new MutantWorldMarkerModel{Key="e"+e["id"].N(),Kind="event",Name=run.Catalog["trackNames"][(int)e["i"].N()].S(),X=e["x"].N(),Z=e["z"].N(),Used=e["yapildi"].B()})
        .Concat(menu["sandiklar"].Items.Select(c=>new MutantWorldMarkerModel{Key="s"+c["id"].N(),Kind="chest",Name="Sandık",X=c["x"].N(),Z=c["z"].N(),Used=c["acildi"].B()}))
        .Concat(new[]{new MutantWorldMarkerModel{Key="a",Kind="shop",Name="Atölye",X=shop[0].N(),Z=shop[1].N()},new MutantWorldMarkerModel{Key="b",Kind="boss",Name=menu["boss"]["ad"].S(),X=boss[0].N(),Z=boss[1].N()}}).ToArray();
    }
  }
}
