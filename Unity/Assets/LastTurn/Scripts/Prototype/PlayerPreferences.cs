using System;
using System.IO;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Prototype
{
  // TS lt_ayar karşılığı: oyuncu tercihleri bir kez yüklenir, değişince kaydedilir. Kariyer/Mutant kayıtlarından ayrı dosya.
  public static class PlayerPreferences
  {
    private static PlayerPreferencesState state;
    private sealed class PlayerPreferencesState{public PlayerSettingsStore Store;public PlayerSettings Current;}
    public static string Directory {get;set;}="";
    public static event Action Changed;
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void Reset(){state=null;Directory="";Changed=null;}
    private static PlayerPreferencesState State
    {
      get
      {
        if(state!=null)return state;
        var store=new PlayerSettingsStore(Directory!=""?Directory:Path.Combine(Application.persistentDataPath,"LastTurnSettings"));
        state=new PlayerPreferencesState{Store=store,Current=store.Load()};return state;
      }
    }
    public static PlayerSettings Current=>State.Current;
    public static string LastError=>State.Store.LastError;
    /// Değişikliği kaydeder ve dinleyicilere (girdi, kamera, ses) bildirir.
    public static bool Save(){bool ok=State.Store.Save(State.Current);Changed?.Invoke();return ok;}
    /// Doğrulama ayrı dizin kullanınca yeniden yüklenir.
    public static void Reload(){state=null;Changed?.Invoke();}
    /// TS cihaz yönü (screen.orientation.angle); içerik dönüşü Unity'de yok.
    public static double Orientation=>Screen.orientation switch
    {
      ScreenOrientation.LandscapeLeft=>90,ScreenOrientation.LandscapeRight=>270,ScreenOrientation.PortraitUpsideDown=>180,_=>0
    };
  }
}
