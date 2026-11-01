using System;
using LastTurn.Core;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.Garage
{
  // Menü/sahne yaşam döngüsü; fiyat, yıldız, ödül veya fizik kuralı içermez.
  public static class GameFlow
  {
    public static bool Home {get;private set;}=true;
    public static bool Profile {get;private set;}
    public static bool Paused {get;private set;}
    public static int GarageTab {get;private set;}
    public static string LastRaceKey {get;set;}="gp_1";
    public static string Message {get;private set;}="";
    private static CareerMenuModel cached;private static GarageState seen;
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void Reset(){Home=true;Profile=false;Paused=false;GarageTab=0;LastRaceKey="gp_1";Message="";cached=null;seen=null;}
    public static void MainMenu(){Home=true;Profile=false;Paused=false;cached=null;}
    public static void OpenProfile(){Home=false;Profile=true;cached=null;}
    public static void Browse(int tab)
    {
      Home=false;Profile=false;GarageTab=Mathf.Clamp(tab,0,4);Paused=false;
      var screen=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();
      if(screen)screen.SelectTab(GarageTab);
    }
    public static void Pause(bool value){Paused=value;}
    public static bool SaveName(string name)
    {
      try
      {
        GarageSession.EnsureLoaded();if(GarageSession.Store.ReadOnly){Message=GarageSession.Store.Status;return false;}
        var store=GarageRace.ProfileStore();var profile=store.Load();profile.Rename(name);store.Save(profile);cached=null;Message="Sürücü adı kaydedildi.";return true;
      }
      catch(Exception e){Message="Profil kaydedilemedi; mevcut kayıt korunuyor. "+e.Message;return false;}
    }
    public static CareerMenuModel Menu()
    {
      GarageSession.EnsureLoaded();if(cached!=null && seen==GarageSession.State)return cached;
      var store=GarageRace.ProfileStore();var profile=store.Load();
      if(store.Message!="")Message=store.Message;
      seen=GarageSession.State;return cached=CareerMenuModel.Read(seen,profile,RaceData.Load().Events);
    }
    public static void LeaveDrive(int tab=2,bool home=false)
    {
      var p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
      if(p && !p.FlushProfileDistance()){Message=GarageRace.LastMessage;return;}
      // İşlem başına disk yazılır; burada son bir güvenli yazım, başarısızsa açık hata.
      if(!GarageSession.Save()){Message=GarageSession.Message;return;}
      Home=home;Profile=false;GarageTab=tab;Paused=false;Message="";
      GarageSession.ReturnToGarage();
    }
  }
}
