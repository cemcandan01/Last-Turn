using LastTurn.Core;
using LastTurn.Prototype;
using UnityEngine;
namespace LastTurn.Garage
{
  public static class GarageTestSession
  {
    public static bool Active {get;private set;}
    public static bool Preview {get;private set;}
    public static CatalogSetup Before {get;private set;}
    public static CatalogSetup After {get;private set;}
    public static GarageBenchResult BeforeResult {get;private set;}
    public static GarageBenchResult AfterResult {get;private set;}
    public static CatalogSetup Setup=>Preview?After:Before;
    public static int Car {get;private set;}
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    public static void Clear(){Active=false;Before=After=null;BeforeResult=AfterResult=null;}
    public static bool Start(int car,string part,bool remove)
    {
      var state=GarageSession.State;if(!state.OwnsCar(car))return false;
      WorldData.Clear();Car=car;Before=state.Setup(car);
      After=part==""?state.Catalog.Setup(car,System.Array.Empty<string>(),state.AssistLevel):GarageViewModel.PreviewSetup(state,car,part,remove);
      BeforeResult=GarageBenchResult.Measure(state.Catalog,Before);AfterResult=GarageBenchResult.Measure(state.Catalog,After);
      Active=true;Preview=false;
      if(TestPanelActions.StartRace("gp_1"))return true;
      Clear();return false;
    }
    public static void Toggle(GtPrototype driver)
    {
      if(!Active || !driver)return;Preview=!Preview;driver.InitializeRace("gp_1");driver.Race.Session.TickCountdown(4);
    }
  }
}
