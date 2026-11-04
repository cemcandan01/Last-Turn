using System;
using LastTurn.Core;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.Garage
{
  // Panelin sahne/hata sınırı. Kural değiştirmez; mevcut görünüm modeli ve oturumu çağırır.
  public static class TestPanelActions
  {
    public static string Error {get;private set;}="";
    private static GarageState seen;
    private static RaceEventRow[] rows;
    public static RaceEventRow[] Events()
    {
      try {GarageSession.EnsureLoaded();if(seen==GarageSession.State && rows!=null)return rows;rows=RaceViewModel.Events(GarageSession.State,RaceData.Load().Events);seen=GarageSession.State;return rows;}
      catch(Exception e){Error="Yarış listesi okunamadı: "+e.Message;return Array.Empty<RaceEventRow>();}
    }
    public static bool StartRace(string key)
    {
      Error="";
      var row=Array.Find(Events(),e=>e.Key==key);
      if(row==null){Error="Yarış bulunamadı: "+key;return false;}
      if(!row.Open){Error=row.Name+" ("+key+") kilitli. XP seviyesi veya önceki kupa başarısı gerekli. Ayrı test profili Test / Geliştirici bölümündedir.";return false;}
      string old=RaceData.Selected;RaceData.Selected=key;
      if(OpenScene("RaceTest")){GameFlow.LastRaceKey=key;return true;}RaceData.Selected=old;return false;
    }
    public static bool OpenScene(string scene)
    {
      Error="";
      try
      {
        if(!Application.CanStreamedLevelBeLoaded(scene)){Error=scene+" sahnesi yükleme listesinde bulunamadı. Last Turn menüsünden ilgili test sahnesini açıp yeniden deneyin.";return false;}
        if(GarageSession.TryLaunch(scene))return true;
        Error=string.IsNullOrEmpty(GarageSession.Message)?"Sahne açılamadı: "+scene:GarageSession.Message;return false;
      }
      catch(Exception e){Error="Sahne açılamadı ("+scene+"): "+e.Message;return false;}
    }
    public static void ClearError(){Error="";}
  }
}
