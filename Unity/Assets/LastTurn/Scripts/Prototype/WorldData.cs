using System;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;

namespace LastTurn.Prototype
{
  public static class WorldData
  {
    private static WorldCatalog catalog;private static OpponentCatalog opponents;
    public static string OpenKey{get;private set;}="";
    public static bool OpponentTest{get;private set;}
    public static WorldCatalog Catalog=>catalog??(catalog=new WorldCatalog(Text("world-catalog"),RaceData.Load().Tracks));
    public static OpponentCatalog Opponents=>opponents??(opponents=new OpponentCatalog(Text("opponent-catalog")));
    private static string Text(string name){var t=Resources.Load<TextAsset>(name);if(!t)throw new InvalidOperationException(name+" verisi eksik.");return t.text;}
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]private static void Reset(){OpenKey="";OpponentTest=false;catalog=null;opponents=null;}
    public static void Clear(){OpenKey="";OpponentTest=false;}
    public static void PrepareMutantWorld(string key){Catalog.Region(key);OpenKey=key;OpponentTest=false;}
    public static bool Open(string key)
    {
      Catalog.Region(key);OpenKey=key;OpponentTest=false;
      if(TestPanelActions.OpenScene("GTTest"))return true;Clear();return false;
    }
    public static bool StartOpponent(string key)
    {
      if(key.StartsWith("dp_",StringComparison.Ordinal))return false;
      OpenKey="";OpponentTest=true;
      if(TestPanelActions.StartRace(key))return true;Clear();return false;
    }
    public static bool StartCareer(string key){Clear();return TestPanelActions.StartRace(key);}
  }
}
