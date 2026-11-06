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
    /// Menü merkezi (Cem, 2026-11-05): ana menü yalnız Yarış/Mutant/Profil/Ayarlar; Yarış ve Mutant'ın kendi menüsü var.
    public enum MenuHub{Home,Race,Mutant}
    public static MenuHub Hub {get;private set;}=MenuHub.Home;
    public static bool Home {get;private set;}=true;
    public static bool Profile {get;private set;}
    public static bool Paused {get;private set;}
    public static int GarageTab {get;private set;}
    public static string LastRaceKey {get;set;}="gp_1";
    public static string Message {get;private set;}="";
    private static CareerMenuModel cached;private static GarageState seen;
    private static bool preparationReturn;
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void Reset(){Hub=MenuHub.Home;Home=true;Profile=false;Paused=false;GarageTab=0;LastRaceKey="gp_1";Message="";cached=null;seen=null;preparationReturn=false;}
    public static void MainMenu(){preparationReturn=false;Hub=MenuHub.Home;Home=true;Profile=false;Paused=false;cached=null;}
    /// Yarış menüsü: kariyer pist kartları; Garaj ve Mağaza yalnız buradan açılır.
    public static void RaceMenu(){preparationReturn=false;Hub=MenuHub.Race;Home=true;Profile=false;Paused=false;cached=null;}
    /// Mutant menüsü: koşu onayla başlar; koşudan çıkınca buraya dönülür.
    public static void MutantMenu(){preparationReturn=false;Hub=MenuHub.Mutant;Home=true;Profile=false;Paused=false;cached=null;}
    /// Geçici ekranların geri düğmesi: açıldığı menüye döner.
    public static void Back(){if(preparationReturn){ResumePreparation();return;}if(Hub==MenuHub.Race)RaceMenu();else MainMenu();}
    public static void OpenProfile(){preparationReturn=false;Home=false;Profile=true;cached=null;}
    public static void Browse(int tab)
    {
      Home=false;Profile=false;GarageTab=Mathf.Clamp(tab,0,4);Paused=false;
      var screen=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();
      if(screen)screen.SelectTab(GarageTab);
    }
    /// F ana menüsü pist kartı: kariyer ekranı o pist seçili açılır (hava/saat ve başlat orada).
    public static void OpenRace(string key)
    {
      preparationReturn=false;
      Hub=MenuHub.Race;LastRaceKey=key;Browse(2);
      var screen=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();if(screen)screen.SelectTrack(key);
    }
    /// F MAĞAZA sekmesi: garaj ekranı satın alınabilir araçlar listesiyle açılır.
    public static void OpenStore()
    {
      preparationReturn=false;
      Hub=MenuHub.Race;Browse(0);var screen=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();if(screen)screen.SelectShop(true);
    }
    // Yalnız gezinme: araç seçiminden dönünce pist/saat/hava aynen tutulur.
    public static void ChangePreparationCar()
    {
      Browse(0);var screen=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();
      if(screen){screen.SelectShop(false);screen.ViewCar(GarageSession.State.SelectedCar);}preparationReturn=true;
    }
    private static void ResumePreparation(){preparationReturn=false;Browse(2);}
    public static void FinishGarageSelection(){if(preparationReturn)ResumePreparation();else RaceMenu();}
    public static void Pause(bool value){Paused=value;}
    /// Kayıt dışarıdan değişti (bulut): menü özeti yeniden okunur.
    public static void Refresh(){cached=null;}
    /// TS COND: oturumluk günün saati ve hava (kalıcı değil). Etkinlik seçilince bölge temasının varsayılanına döner.
    public static RaceConditions Conditions {get;set;}=new RaceConditions();
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
      // "Kariyere dön" (tab 2): yarış menüsünün pist kartları; garaj/geliştirici bölümleri geçici ekranda.
      Hub=home||tab==3?MenuHub.Home:MenuHub.Race;Home=home||tab==2;Profile=false;GarageTab=tab;Paused=false;Message="";
      GarageSession.ReturnToGarage();
    }
  }
}
