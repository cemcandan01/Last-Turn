using System;
using System.Linq;

namespace LastTurn.Core
{
  // Yalnız sunum seçimi ve gruplama; erişim/yarış kuralları RaceViewModel'den gelir.
  public static class TestPanelModel
  {
    public static readonly string[] Tabs={"Garaj","Modifiye","Yarışlar","Test / Geliştirici","Ayarlar"};
    public static readonly string[] Types={"gp","rx","rl","dp","dg"};
    public static readonly string[] TypeNames={"Asfalt","Rallikros","Ralli","Drift","Drag"};
    public static RaceEventRow[] Tracks(RaceEventRow[] events,string type)
      => events.Where(e=>e.Key.StartsWith(type+"_",StringComparison.Ordinal)).OrderBy(e=>int.Parse(e.Key.Split('_')[1])).ToArray();
    public static int Columns(float width)=>width>=760?5:width>=480?3:2;
    public static float ContentWidth(float width)=>Math.Max(240,width-48);
  }
}
