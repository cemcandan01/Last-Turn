using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Security.Cryptography;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEditor;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;

namespace LastTurn.EditorValidation
{
  [InitializeOnLoad]
  public static class GaragePlayValidation
  {
    private const string Active="LastTurn.Garage.Test.Active",Stage="LastTurn.Garage.Test.Stage",PathKey="LastTurn.Garage.Test.Path",ProofKey="LastTurn.Garage.Test.Proof";
    [Serializable] private sealed class Source{public string path,sha256;}
    [Serializable] private sealed class Proof{public string result,utc,unityVersion,error;public string[] checks;public Source[] sources;public double balance,gtMass,terrainMass;public int gtSteps,terrainSteps;}
    private static readonly List<string> checks=new List<string>();
    private static Proof proof;private static int phase,startTick;private static double began;private static Keyboard keyboard;
    static GaragePlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    [MenuItem("Last Turn/Garaj Kısa Play Doğrulaması")]
    public static void Start()
    {
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play'i durdurun.");
      GarageSceneBuilder.Open();if(SceneManager.GetActiveScene().path!=GarageSceneBuilder.ScenePath)return;
      string project=Path.GetDirectoryName(Application.dataPath),path=System.IO.Path.Combine(project,"Logs/GaragePlay/"+Guid.NewGuid().ToString("N")+"/profile.json");
      SessionState.SetString(PathKey,path);SessionState.SetInt(Stage,0);SessionState.SetString(ProofKey,"");SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active,false))
      {
        string saved=SessionState.GetString(ProofKey,"");proof=saved==""?new Proof{unityVersion=Application.unityVersion,result="running"}:JsonUtility.FromJson<Proof>(saved);
        checks.Clear();if(proof.checks!=null)checks.AddRange(proof.checks);phase=0;began=EditorApplication.timeSinceStartup;EditorApplication.update+=Tick;
      }
      if(state==PlayModeStateChange.ExitingPlayMode)Cleanup();
      if(state==PlayModeStateChange.EnteredEditMode && SessionState.GetBool(Active,false) && SessionState.GetInt(Stage,0)==1)
        EditorApplication.delayCall+=()=>{if(SessionState.GetBool(Active,false))EditorApplication.EnterPlaymode();};
    }
    private static void Require(bool ok,string label){if(!ok)throw new InvalidOperationException(label);checks.Add(label);}
    private static void Queue(params Key[] keys){InputSystem.QueueStateEvent(keyboard,new KeyboardState(keys));}
    private static void Tick()
    {
      try
      {
        if(EditorApplication.timeSinceStartup-began>65)throw new TimeoutException("Garaj Play kontrolü süre sınırını aştı.");
        string path=SessionState.GetString(PathKey,"");
        if(phase==0)
        {
          var screen=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();if(!screen)return;
          GarageSession.Open(path);var catalog=GarageSession.Catalog;
          if(SessionState.GetInt(Stage,0)==0)
          {
            Require(GarageSession.State.Balance==0 && GarageSession.State.SelectedCar==10,"Gerçek başlangıç: 0 para / kaynak başlangıç aracı");
            Require(!GarageSession.Transact(s=>s.BuyCar(0),""),"Yetersiz erişim/bakiye alımı reddedildi");
            Require(GarageSession.Transact(s=>{
              s.AddMoney(60000);s.AddXp(VehicleCatalog.LevelBase(15));
              return s.BuyCar(0) && s.BuyParts(0,new[]{"motor-spor"}) && s.Equip(0,"motor-spor") &&
                s.BuyParts(11,new[]{"fren-spor"}) && s.Equip(11,"fren-spor") && s.SelectCar(0);
            },"Play test kurulumu"),"Gerçek oturum işlem/kayıt bağlantısı");
            Require(File.Exists(path),"Gerçek disk dosyası oluşturuldu");proof.balance=GarageSession.State.Balance;
            Require(GarageSession.State.Equipped(0).SequenceEqual(new[]{"motor-spor"}) && GarageSession.State.Equipped(11).SequenceEqual(new[]{"fren-spor"}),"İki araç ayrı takılı liste tutuyor");
            string failurePath=path+".io";GarageSession.Open(failurePath);string beforeFailure=GarageSession.State.Snapshot().ToString();
            Directory.CreateDirectory(failurePath+".tmp");
            Require(!GarageSession.Transact(s=>{s.AddMoney(100);return true;},""),"Gerçek dosya yazma hatası oturum işlemini reddetti");
            Require(beforeFailure==GarageSession.State.Snapshot().ToString(),"Dosya hatasında aktif ekonomi geri alındı");GarageSession.Open(path);
            proof.checks=checks.ToArray();SessionState.SetString(ProofKey,JsonUtility.ToJson(proof));SessionState.SetInt(Stage,1);EditorApplication.ExitPlaymode();return;
          }
          Require(GarageSession.State.OwnsCar(0) && GarageSession.State.SelectedCar==0,"Play kapat/aç sonrası satın alınmış araç ve seçim");
          Require(GarageSession.State.Balance==proof.balance,"Play kapat/aç sonrası bakiye");
          Require(GarageSession.State.Equipped(0).SequenceEqual(new[]{"motor-spor"}) && GarageSession.State.Equipped(11).SequenceEqual(new[]{"fren-spor"}),"Play kapat/aç sonrası iki aracın parçaları");
          string before=GarageSession.State.Snapshot().ToString();Require(!GarageSession.Transact(s=>s.BuyCar(0),""),"Tekrarlı araç alımı reddedildi");Require(before==GarageSession.State.Snapshot().ToString(),"Geçersiz işlem aktif durumu değiştirmedi");
          GarageSession.RaceType="";GarageSession.Launch("GTTest");phase=1;return;
        }
        var prototype=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
        if(phase==1)
        {
          if(!prototype || prototype.TerrainMode || prototype.Simulation==null)return;
          Require(prototype.AppliedGarageCarId=="gt","GTTest gerçek garaj aracını aldı");
          var expected=GarageDriveParameters.Create(GarageSession.Catalog,GarageSession.State.Setup(0),false);
          Require(prototype.Parameters.PeakTorque==expected.PeakTorque && prototype.Parameters.Chassis.Mass==expected.Chassis.Mass,"GTTest modifiye motor/kütle parametreleri");
          proof.gtMass=prototype.Parameters.Chassis.Mass;keyboard=InputSystem.AddDevice<Keyboard>("GaragePlayValidation");startTick=prototype.Simulation.Body.Steps;Queue(Key.UpArrow);phase=2;return;
        }
        if(phase==2 && prototype && prototype.Simulation.Body.Steps-startTick>=120)
        {
          Require(prototype.CurrentInput.Throttle==1 && prototype.Simulation.Body.Velocity.Length>5,"Garaj seçimi gerçek Input System ile GT sürüşünde");proof.gtSteps=prototype.Simulation.Body.Steps-startTick;
          Queue();GarageSession.RaceType="rl";GarageSession.Launch("TerrainTest");phase=3;return;
        }
        if(phase==3)
        {
          if(!prototype || !prototype.TerrainMode || prototype.Simulation==null)return;
          Require(prototype.AppliedGarageCarId=="gt","TerrainTest gerçek garaj aracını aldı");
          var expected=GarageDriveParameters.Create(GarageSession.Catalog,GarageSession.State.Setup(0),true,"rl");
          Require(prototype.Parameters.PeakTorque==expected.PeakTorque && prototype.Parameters.Chassis.TireForSurface(0,0).MuY==expected.Chassis.TireForSurface(0,0).MuY,"TerrainTest modifiye ve otomatik yarış lastiği");
          proof.terrainMass=prototype.Parameters.Chassis.Mass;startTick=prototype.Simulation.Body.Steps;Queue(Key.UpArrow);phase=4;return;
        }
        if(phase==4 && prototype && prototype.Simulation.Body.Steps-startTick>=120)
        {
          Require(prototype.CurrentInput.Throttle==1 && prototype.Simulation.Body.Velocity.Length>3,"Garaj seçimi gerçek arazi sürüşünde");proof.terrainSteps=prototype.Simulation.Body.Steps-startTick;
          Queue();GarageSession.ReturnToGarage();phase=5;return;
        }
        if(phase==5 && UnityEngine.Object.FindFirstObjectByType<GarageScreen>())
        {
          Require(!GarageSession.DriveActive && GarageSession.State.SelectedCar==0,"Sürüşten çalışan garaja dönüş");
          Require(GarageSession.State.Balance==proof.balance,"Sürüş satın alma/ödül üretmedi");
          Finish(null);
        }
      }
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception error)
    {
      Cleanup();proof.result=error==null?"garage-play-passed":"failed";proof.error=error?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.checks=checks.ToArray();
      string project=Path.GetDirectoryName(Application.dataPath),root=Path.Combine(Application.dataPath,"LastTurn");
      proof.sources=Directory.GetFiles(root,"*",SearchOption.AllDirectories).Where(p=>new[]{".cs",".unity",".meta",".json"}.Contains(Path.GetExtension(p))).OrderBy(p=>p,StringComparer.Ordinal).Select(p=>new Source{path=p.Substring(project.Length+1).Replace('\\','/'),sha256=Hash(p)}).ToArray();
      File.WriteAllText(Path.Combine(project,"Logs/garage-play.json"),JsonUtility.ToJson(proof,true));SessionState.SetBool(Active,false);
      if(error==null)Debug.Log("Last Turn garaj Play geçti: "+checks.Count+" kontrol; gerçek Play kapat/aç ve iki sürüş sahnesi.");else Debug.LogException(error);
      EditorApplication.ExitPlaymode();
    }
    private static void Cleanup(){EditorApplication.update-=Tick;if(keyboard!=null && keyboard.added)InputSystem.RemoveDevice(keyboard);keyboard=null;}
    private static string Hash(string path){using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(path))).Replace("-","").ToLowerInvariant();}
  }
}
