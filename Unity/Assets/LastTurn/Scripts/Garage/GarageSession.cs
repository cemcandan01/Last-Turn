using System;
using System.IO;
using LastTurn.Core;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.Garage
{
  public static class GarageSession
  {
    public static VehicleCatalog Catalog { get; private set; }
    public static GarageState State { get; private set; }
    public static GarageSaveStore Store { get; private set; }
    public static string Message { get; private set; } = "";
    public static bool DeveloperProfile { get; private set; }
    public static bool DriveActive { get; private set; }
    public static string RaceType { get; set; } = "";
    public static CatalogSetup DriveSetup { get; private set; }
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void ResetSession() { Catalog=null;State=null;Store=null;Message="";DriveActive=false;DriveSetup=null;RaceType="";DeveloperProfile=false; }
    public static string ProfilePath(bool developer) => Path.Combine(Application.persistentDataPath,"LastTurnGarage",developer?"developer-v1.json":"garage-v1.json");
    public static void EnsureLoaded() { if (State==null) Open(ProfilePath(false)); }
    public static void Open(string path, bool developer=false)
    {
      if(Catalog==null) { var asset=Resources.Load<TextAsset>("vehicle-catalog");if(!asset)throw new InvalidOperationException("Araç kataloğu bulunamadı.");Catalog=new VehicleCatalog(asset.text); }
      var store=new GarageSaveStore(path,Catalog);var state=store.Load();Store=store;State=state;DeveloperProfile=developer;DriveActive=false;DriveSetup=null;Message=store.Status;
    }
    // Bütün işlemler aday kopyada yapılır; disk yazılamazsa bakiye ve sahiplik de değişmez.
    public static bool Transact(Func<GarageState,bool> action,string success)
    {
      EnsureLoaded();if(Store.ReadOnly){Message=Store.Status;return false;}
      try
      {
        var candidate=GarageState.Restore(Catalog,State.Snapshot());
        if(!action(candidate)){Message="İşlem uygulanmadı: sahiplik, erişim veya bakiye uygun değil.";return false;}
        Store.Save(candidate);State=candidate;Message=success;return true;
      }
      catch(Exception e){Message="Kayıt yazılamadı; mevcut durum korundu. "+e.Message;return false;}
    }
    public static bool Save() => Transact(_=>true,"Garaj kaydedildi.");
    public static void Reload() { EnsureLoaded();Open(Store.FilePath,DeveloperProfile); }
    public static void SwitchProfile(bool developer)
    {
      Open(ProfilePath(developer),developer);
      // Bu ayrı profil yalnız geliştirici doğrulaması içindir; normal ekonomiye para aktarılmaz.
      if(developer && !File.Exists(Store.FilePath) && !File.Exists(Store.FilePath+".bak") && !File.Exists(Store.FilePath+".tmp") && !Store.ReadOnly)
        Transact(s=>{s.AddMoney(60000);s.AddXp(VehicleCatalog.LevelBase(15));return true;},"Ayrı TS işlem test profili oluşturuldu (60.000 / seviye 15).");
    }
    public static bool PrepareDrive()
    {
      EnsureLoaded();if(!State.OwnsCar(State.SelectedCar) || !Save())return false;
      DriveSetup=State.Setup(State.SelectedCar);DriveActive=true;return true;
    }
    public static void Launch(string scene)
    {
      if(!PrepareDrive())return;
      try{SceneManager.LoadScene(scene);}catch(Exception e){DriveActive=false;Message="Sürüş sahnesi açılamadı. "+e.Message;}
    }
    public static bool TryDriveParameters(bool terrain,out PowertrainParameters parameters)
    {
      parameters=null;
      if(!DriveActive || DriveSetup==null)return false;
      parameters=GarageDriveParameters.Create(Catalog,DriveSetup,terrain,RaceType);return true;
    }
    public static void ReturnToGarage(){DriveActive=false;DriveSetup=null;SceneManager.LoadScene("Garage");}
  }

  public sealed class GarageDriveOverlay : MonoBehaviour
  {
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Install(){SceneManager.sceneLoaded-=Loaded;SceneManager.sceneLoaded+=Loaded;Loaded(SceneManager.GetActiveScene(),LoadSceneMode.Single);}
    private static void Loaded(Scene scene,LoadSceneMode mode)
    {if(GarageSession.DriveActive && (scene.name=="GTTest" || scene.name=="TerrainTest"))new GameObject("Garaja dönüş").AddComponent<GarageDriveOverlay>();}
    private void OnGUI()
    {
      if(!GarageSession.DriveActive)return;
      GUILayout.BeginArea(new Rect(Screen.width-350,12,336,110),GUI.skin.box);
      GUILayout.Label(GarageSession.DriveSetup.Car["n"].S()+" • kayıtlı garaj kurulumu");
      GUILayout.Label("Takılı: "+(GarageSession.DriveSetup.Parts.Length==0?"Stok":string.Join(", ",GarageSession.DriveSetup.Parts)));
      if(GUILayout.Button("Garaja dön",GUILayout.Height(32)))GarageSession.ReturnToGarage();GUILayout.EndArea();
    }
  }
}
