using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.SceneManagement;

namespace LastTurn.Prototype
{
  // Yalnız açık bayraklı Development Player kabulü. Normal oyuncu yoluna veya buluta yazmaz.
  // Build'in kendi Validation dizini iki ayrı süreçte yeniden kullanılır.
  public sealed class OfflineValidationRuntime : MonoBehaviour
  {
    public static bool Active {get;private set;}
    private static string root,pass;
    private readonly List<string> checks=new List<string>(),errors=new List<string>();
    private Dictionary<string,string> before;
    private Keyboard keyboard;private int stage,car;private double at,started,stockTorque;
    private long beginStep;private Vector2 origin;private bool paused,focused;
    [Serializable]private sealed class Proof{public string result,error,utc,unity,platform,pass,saveHash;public List<string> checks,errors;public double distance,stockTorque,upgradedTorque;}
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]private static void Reset(){Active=false;root=pass=null;}
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    private static void Prepare()
    {
      if(!Debug.isDebugBuild||!Environment.GetCommandLineArgs().Contains("-lastTurnOfflineValidation"))return;
      Active=true;pass=Environment.GetCommandLineArgs().Contains("-lastTurnReload")?"reload":"write";
      root=Path.GetFullPath(Path.Combine(Application.dataPath,"../Validation"));Directory.CreateDirectory(root);
      PlayerPreferences.Directory=Path.Combine(root,"settings");PlayerPreferences.Reload();
      GarageSession.Open(Path.Combine(root,"garage.json"),true);MutantRuntime.RecordDirectory=Path.Combine(root,"mutant");
      var go=new GameObject("Yerel bağımsız ürün doğrulaması");DontDestroyOnLoad(go);go.AddComponent<OfflineValidationRuntime>();
    }
    private static string Hash(string f){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(f))).Replace("-","");}
    private static Dictionary<string,string> UserFiles()
    {
      // Unity ana ürününün gerçek kayıt kökü (ProjectSettings: DefaultCompany/Unity).
      string low=Path.GetFullPath(Path.Combine(Application.persistentDataPath,"../../DefaultCompany/Unity"));
      return Directory.Exists(low)?Directory.GetFiles(low,"*",SearchOption.AllDirectories).ToDictionary(f=>f,Hash):new Dictionary<string,string>();
    }
    private void Awake(){before=UserFiles();started=Time.realtimeSinceStartupAsDouble;Application.logMessageReceived+=Logged;Application.runInBackground=true;InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;keyboard=InputSystem.AddDevice<Keyboard>();}
    private void Logged(string m,string s,LogType t){if(t==LogType.Error||t==LogType.Exception||t==LogType.Assert)errors.Add(m+"\n"+s);}
    private void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);checks.Add(label);}
    private void QueueKeys(params Key[] keys)=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(keys));
    private void Update()
    {
      try{
        if(errors.Count>0)throw new Exception(errors[0]);
        if(Time.realtimeSinceStartupAsDouble-started>70)throw new TimeoutException("Player kabulü / stage="+stage);
        var p=FindFirstObjectByType<GtPrototype>();
        if(stage==0){
          if(SceneManager.GetActiveScene().name!="Garage"||!LastTurn.Ui.UiRoot.Instance)return;
          Check(GameFlow.Home,"Bağımsız ürün ana menüsü");Check(CloudRuntime.Account==null,"Gerçek bulut kapalı");
          Check(GarageSession.Store.FilePath.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase),"Kayıt yalnız build Validation dizininde");
          car=GarageSession.State.SelectedCar;
          if(pass=="reload"){
            Check(File.Exists(Path.Combine(root,"expected.json")),"İlk süreç kanıtı var");
            Check(GarageSession.State.Snapshot().ToString()==File.ReadAllText(Path.Combine(root,"expected.json")),"Yeni süreç aynı garajı yükledi");
            Check(PlayerPreferences.Current["ses"]==40&&PlayerPreferences.Current["muz"]==0,"Yeni süreç ayarları yükledi");
            Check(GarageRace.ProfileStore().Load().Km>0,"Yeni süreç sürüş mesafesini yükledi");
            Check(GarageSession.State.OwnsPart(car,"motor-sokak"),"Yeni süreç satın alınan parçayı yükledi");
          }else{
            Check(GarageSession.Transact(s=>{s.AddMoney(60000);s.AddXp(VehicleCatalog.LevelBase(15));return true;},"Ayrı test bütçesi"),"İzole bütçe fixture'ı");
            Check(GarageSession.Execute(GarageCommand.Stock(car)),"Stok kurulum komutu");
            PlayerPreferences.Current.Set["ses"]=40;PlayerPreferences.Current.Set["muz"]=0;Check(PlayerPreferences.Save(),"Ayar kaydı");
          }
          GameFlow.RaceMenu();Check(GarageSession.TryLaunch("GTTest"),"Menü oturumundan gerçek sürüş sahnesi");stage=1;return;
        }
        if(stage==1){if(!p||p.Simulation==null)return;Check(p.OpenTerrain==null,"Düz GT stok/yükseltme karşılaştırması");stockTorque=p.Simulation.Parameters.PeakTorque;beginStep=p.Simulation.Body.Steps;origin=new Vector2((float)p.Simulation.Body.Position.X,(float)p.Simulation.Body.Position.Z);stage=2;QueueKeys(Key.W);return;}
        if(stage==2){
          if(p.Simulation.Body.Steps-beginStep<180){QueueKeys(Key.W);return;}
          QueueKeys();double distance=Vector2.Distance(origin,new Vector2((float)p.Simulation.Body.Position.X,(float)p.Simulation.Body.Position.Z));Check(distance>2,"Normal InputSystem tuşuyla gerçek sürüş");
          Check(p.Simulation.Body.Steps>beginStep,"Gerçek sabit fizik adımları");
          Check(GameAudio.MissingAssets.Count==0,"Ses klipleri eksiksiz yüklendi");
          var sources=FindFirstObjectByType<GameAudio>().GetComponents<AudioSource>();Check(sources.Any(s=>s.clip&&s.isPlaying&&s.volume>0),"AudioSource gerçek klip oynatıyor");
          Check(GameAudio.LastMix.Effects>0&&Math.Abs(GameAudio.LastMix.Effects-AudioDirector.Level(40))<1e-6,"Ses tercihi canlı kazanca uygulandı");
          if(pass=="reload"){Finish(null,distance,p.Simulation.Parameters.PeakTorque);return;}
          Check(p.FlushProfileDistance(),"Gerçek mesafe diske işlendi");GameFlow.LeaveDrive();stage=3;return;
        }
        if(stage==3){
          if(SceneManager.GetActiveScene().name!="Garage")return;
          double money=GarageSession.State.Balance;Check(GarageSession.Execute(GarageCommand.BuyAndEquipPart(car,"motor-sokak")),"Parça satın al/tak komutu");
          Check(GarageSession.State.Balance<money,"Parça maliyeti gerçek bakiyeden düştü");
          Check(GarageSession.TryLaunch("GTTest"),"Yükseltilmiş araç sürüşe aktarıldı");stage=4;return;
        }
        if(stage==4){if(!p||p.Simulation==null)return;Check(p.Simulation.Parameters.PeakTorque>stockTorque,"Yükseltme gerçek fizik torkuna aktarıldı");beginStep=p.Simulation.Body.Steps;at=Time.realtimeSinceStartupAsDouble;stage=5;QueueKeys(Key.W);return;}
        if(stage==5){
          if(p.Simulation.Body.Steps-beginStep<120){QueueKeys(Key.W);return;}
          QueueKeys();GameFlow.Pause(true);beginStep=p.Simulation.Body.Steps;at=Time.realtimeSinceStartupAsDouble;stage=6;return;
        }
        if(stage==6){if(Time.realtimeSinceStartupAsDouble-at<.3)return;Check(p.Simulation.Body.Steps==beginStep,"Pause sırasında fizik ilerlemedi");GameFlow.Pause(false);p.SendMessage("OnApplicationFocus",false);beginStep=p.Simulation.Body.Steps;at=Time.realtimeSinceStartupAsDouble;stage=7;return;}
        if(stage==7){if(Time.realtimeSinceStartupAsDouble-at<.3)return;Check(p.Simulation.Body.Steps==beginStep,"Odak kaybında giriş ve fizik durdu (sentetik callback)");p.SendMessage("OnApplicationFocus",true);Check(p.FlushProfileDistance(),"Yükseltilmiş sürüş mesafesi kayıtlı");Check(GarageSession.Save(),"Son garaj kaydı");File.WriteAllText(Path.Combine(root,"expected.json"),GarageSession.State.Snapshot().ToString());Finish(null,GarageRace.ProfileStore().Load().Km,p.Simulation.Parameters.PeakTorque);}
      }catch(Exception e){Finish(e,0,0);}
    }
    private void Finish(Exception e,double distance,double torque)
    {
      QueueKeys();var after=UserFiles();if(after.Count!=before.Count||before.Any(f=>!after.TryGetValue(f.Key,out var hash)||hash!=f.Value))e=new Exception("Gerçek oyuncu dosyası hash farkı",e);
      var proof=new Proof{result=e==null?"player-passed":"failed",error=e?.ToString()??"",utc=DateTime.UtcNow.ToString("O"),unity=Application.unityVersion,platform=Application.platform.ToString(),pass=pass,checks=checks,errors=errors,distance=distance,stockTorque=stockTorque,upgradedTorque=torque,saveHash=File.Exists(GarageSession.Store.FilePath)?Hash(GarageSession.Store.FilePath):""};
      File.WriteAllText(Path.Combine(root,"player-"+pass+"-proof.json"),JsonUtility.ToJson(proof,true));Application.logMessageReceived-=Logged;Application.Quit(e==null?0:1);enabled=false;
    }
  }
}
