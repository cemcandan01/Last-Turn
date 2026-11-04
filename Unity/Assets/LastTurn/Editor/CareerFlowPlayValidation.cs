using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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
  // P1: gerçek menü → yarış → sonuç → kariyer, sonra Play kapat/aç; oyuncu kaydı korunur.
  [InitializeOnLoad]
  public static class CareerFlowPlayValidation
  {
    private const string Active="LastTurn.P1.Active",Reopen="LastTurn.P1.Reopen",PathKey="LastTurn.P1.Path";
    private static readonly string[] keys={"gp_1","rx_1","rl_1","dp_1","dg_1"};
    [Serializable]private sealed class Source{public string path,sha256;}
    [Serializable]private sealed class Proof{public string result,utc,error,state,profile;public List<string> checks=new List<string>();public Source[] sources,userFiles;}
    private static Proof proof;private static int phase,index,steps;private static double began,balance;private static RaceTestDriver driver;private static GtPrototype p;
    private static bool droveFree,abandoned;private static Keyboard keyboard;private static double kmBefore,pauseTime;private static int pauseTick;
    private static double resultAt;private static bool captured;
    private static string Project=>System.IO.Path.GetDirectoryName(Application.dataPath);
    private static string Running=>System.IO.Path.Combine(Project,"Logs/p1-running.json");
    static CareerFlowPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    [MenuItem("Last Turn/P1 Kariyer Kısa Play Doğrulaması")]
    public static void Start()
    {
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play'i durdurun.");
      GarageSceneBuilder.Open();SessionState.SetString(PathKey,System.IO.Path.Combine(Project,"Logs/P1Play/"+Guid.NewGuid().ToString("N")+"/garage.json"));
      var userRoot=System.IO.Path.GetDirectoryName(GarageSession.ProfilePath(false));
      proof=new Proof{userFiles=Directory.Exists(userRoot)?Directory.GetFiles(userRoot,"*",SearchOption.AllDirectories).Select(f=>new Source{path=f,sha256=Hash(f)}).ToArray():Array.Empty<Source>()};
      Directory.CreateDirectory(System.IO.Path.GetDirectoryName(Running));File.WriteAllText(Running,JsonUtility.ToJson(proof));
      SessionState.SetBool(Active,true);SessionState.SetBool(Reopen,false);EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active,false))
      {proof=JsonUtility.FromJson<Proof>(File.ReadAllText(Running));phase=SessionState.GetBool(Reopen,false)?90:0;index=0;droveFree=abandoned=false;began=EditorApplication.timeSinceStartup;EditorApplication.update+=Tick;}
      if(state==PlayModeStateChange.ExitingPlayMode)EditorApplication.update-=Tick;
      if(state==PlayModeStateChange.EnteredEditMode && SessionState.GetBool(Active,false) && SessionState.GetBool(Reopen,false))
        EditorApplication.delayCall+=()=>{if(SessionState.GetBool(Active,false))EditorApplication.EnterPlaymode();};
    }
    private static void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);proof.checks.Add(label);}
    private static void Tick()
    {
      try
      {
        if(EditorApplication.timeSinceStartup-began>120)throw new TimeoutException("P1 kısa Play süre sınırı.");
        var screen=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();
        if(phase==30)
        {
          if(!captured && EditorApplication.timeSinceStartup-resultAt>.2){ScreenCapture.CaptureScreenshot(System.IO.Path.Combine(Project,"Logs/p1-result-"+keys[index]+".png"));captured=true;}
          if(EditorApplication.timeSinceStartup-resultAt>.5){GameFlow.LeaveDrive();index++;phase=4;}return;
        }
        if(phase==10)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p || p.Race!=null)return;
          keyboard=InputSystem.AddDevice<Keyboard>("P1Test");InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.W));phase=11;return;
        }
        if(phase==11 && p.Simulation.Body.Steps>=120)
        {GameFlow.Pause(true);pauseTick=p.Simulation.Body.Steps;pauseTime=EditorApplication.timeSinceStartup;phase=12;return;}
        if(phase==12 && EditorApplication.timeSinceStartup-pauseTime>.2)
        {
          Check(p.Simulation.Body.Steps==pauseTick,"Gerçek Update duraklatmada fizik ilerlemedi");
          p.FlushProfileDistance();Check(GarageRace.ProfileStore().Load().Km>kmBefore,"Yarış dışı gerçek klavye sürüşü km kaydına işlendi");
          ScreenCapture.CaptureScreenshot(System.IO.Path.Combine(Project,"Logs/p1-pause.png"));pauseTime=EditorApplication.timeSinceStartup;phase=13;return;
        }
        if(phase==13 && EditorApplication.timeSinceStartup-pauseTime>.3)
        {
          if(keyboard!=null && keyboard.added)InputSystem.RemoveDevice(keyboard);keyboard=null;droveFree=true;GameFlow.LeaveDrive();phase=4;return;
        }
        if(phase==20)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.Race==null)return;p.ManualStepping=true;driver=RaceTestDriver.For("gp");
          while(p.Race.Session.State==RaceState.Countdown)p.StepRace(driver.Countdown(p.Race));for(int n=0;n<180;n++)p.StepRace(driver.Input(p.Race));
          // Gerçek geçici profilin atomik yazım yolunu kısa süre kapat: veri yazılamazsa sahneden çıkıp km'yi kaybetme.
          string blocked=System.IO.Path.Combine(GarageRace.ProfileStore().Directory,"races.json.tmp");
          Check(!File.Exists(blocked)&&!Directory.Exists(blocked),"Geçici hata yolu test profiline ait ve boş");
          Directory.CreateDirectory(blocked);
          try{GameFlow.LeaveDrive();Check(SceneManager.GetActiveScene().name=="RaceTest" && GameFlow.Message.Contains("Kilometre"),"I/O hatasında dönüş iptal, km bellekte ve hata görünür");}
          finally{Directory.Delete(blocked);}
          GameFlow.LeaveDrive();abandoned=true;phase=4;return;
        }
        if(phase==90 && screen)
        {
          Check(GameFlow.Home,"Play yeniden açılınca ana menü");GarageSession.Open(SessionState.GetString(PathKey,""),true);
          Check(GarageSession.State.Snapshot().ToString()==proof.state,"Play kapat/aç: XP, para, yıldız, araç ve parçalar aynı");
          Check(GarageRace.ProfileStore().Load().Snapshot().ToString()==proof.profile,"Play kapat/aç: ad, yarış, galibiyet, km ve kullanım aynı");
          Check(proof.userFiles.All(f=>File.Exists(f.path)&&Hash(f.path)==f.sha256),"Mevcut oyuncu dosyaları değişmedi");Finish(null);return;
        }
        if(phase==0 && screen)
        {
          Check(GameFlow.Home && UnityEngine.Object.FindFirstObjectByType<MainMenuScreen>(),"Gerçek ana menü bağlı");
          GarageSession.Open(SessionState.GetString(PathKey,""),true);Check(GameFlow.SaveName("  P1 Sürücü  "),"Profil adı kaydedildi");
          GameFlow.OpenProfile();Check(GameFlow.Menu().Name=="P1 Sürücü","Profil görünümünde ad");GameFlow.MainMenu();
          foreach(int tab in new[]{0,1,2,3,4}){GameFlow.Browse(tab);Check(screen.SelectedTab==tab && !GameFlow.Home,"Menüden bölüm "+tab);}
          string before=GarageSession.State.Snapshot().ToString();Check(!TestPanelActions.StartRace("gp_8") && before==GarageSession.State.Snapshot().ToString(),"Kilitli yarış ret ve kayıt değişmezliği");
          phase=1;
        }
        if(phase==1 && screen)
        {GameFlow.Browse(2);screen.SelectTrack(keys[index]);balance=GarageSession.State.Balance;Check(screen.StartSelectedRace(),"Menüden gerçek yarış başlat "+keys[index]);phase=2;return;}
        if(phase==2)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.Race==null)return;
          Check(p.RaceTrack==keys[index],"Gerçek yarış sahnesi "+keys[index]);p.ManualStepping=true;driver=RaceTestDriver.For(p.Race.Event.Type);driver.Digital=p.Race.Event.Type=="dp";steps=0;
          GameFlow.Pause(true);int tick=p.Simulation.Body.Steps;double time=p.Race.Session.Countdown;p.StepRace(new DrivingInput(1,0,0));
          Check(p.Simulation.Body.Steps==tick && p.Race.Session.Countdown==time,"Duraklat: fizik ve geri sayım donuk "+keys[index]);GameFlow.Pause(false);
          while(p.Race.Session.State==RaceState.Countdown)p.StepRace(driver.Countdown(p.Race));phase=3;return;
        }
        if(phase==3)
        {
          for(int k=0;k<900 && p.Race.Session.State==RaceState.Running;k++){p.StepRace(driver.Input(p.Race));steps++;driver.RespawnIfStuck(p.Race);}
          if(p.Race.Session.State==RaceState.Running){if(steps>40000)throw new Exception("Yarış bitmedi");return;}
          var s=p.Race.Session;Check(s.State==RaceState.Finished,"Gerçek fizikle sonuç "+keys[index]);
          var expected=GarageSession.Catalog.Reward(p.Race.Event.Type,1,s.Stars,0);
          Check(s.Xp==expected["xp"].N() && s.Money==expected["para"].N() && GarageSession.State.Balance==balance+s.Money,"TS ödül gerçek kayda işlendi "+keys[index]);
          double km=GarageRace.ProfileStore().Load().Km;p.FlushProfileDistance();p.FlushProfileDistance();Check(GarageRace.ProfileStore().Load().Km==km,"Tekrarlı flush km çoğaltmadı "+keys[index]);
          resultAt=EditorApplication.timeSinceStartup;captured=false;phase=30;return;
        }
        if(phase==4 && screen)
        {
          Check(screen.SelectedTab==2 && !GameFlow.Home,"Sonuçtan kariyere dönüş");
          GarageSession.Reload();var m=GameFlow.Menu();Check(m.Races==index && m.Km>0,"Yeniden yüklenen profil sayaçları "+index);
          if(index==1)Check(GarageSession.State.TrackOpen("gp",2),"İlk yarıştan sonraki kariyer kapısı açık");
          if(index<keys.Length){phase=1;return;}
          if(!droveFree){kmBefore=GarageRace.ProfileStore().Load().Km;Check(TestPanelActions.OpenScene("GTTest"),"Menüden yarış dışı sürüş");phase=10;return;}
          if(!abandoned){kmBefore=GarageRace.ProfileStore().Load().Km;balance=GarageSession.State.Balance;Check(TestPanelActions.StartRace("gp_1"),"Yarıda bırakılacak yarış açıldı");phase=20;return;}
          Check(GarageRace.ProfileStore().Load().Km>kmBefore && GarageSession.State.Balance==balance && GameFlow.Menu().Races==5,"Yarım yarışta yol korunur; ödül ve yarış bitiş sayacı artmaz");
          proof.state=GarageSession.State.Snapshot().ToString();proof.profile=GarageRace.ProfileStore().Load().Snapshot().ToString();
          File.WriteAllText(Running,JsonUtility.ToJson(proof));SessionState.SetBool(Reopen,true);EditorApplication.update-=Tick;EditorApplication.ExitPlaymode();phase=99;
        }
      }
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception error)
    {
      SessionState.SetBool(Active,false);SessionState.SetBool(Reopen,false);EditorApplication.update-=Tick;
      if(keyboard!=null && keyboard.added)InputSystem.RemoveDevice(keyboard);keyboard=null;GameFlow.Pause(false);
      proof.result=error==null?"p1-play-passed":"failed";proof.utc=DateTime.UtcNow.ToString("O");proof.error=error?.ToString()??"";
      proof.sources=Directory.GetFiles(System.IO.Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".meta",".json",".unity"}.Contains(System.IO.Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),sha256=Hash(f)}).ToArray();
      File.WriteAllText(System.IO.Path.Combine(Project,"Logs/p1-play.json"),JsonUtility.ToJson(proof,true));
      if(error==null)Debug.Log("P1 kariyer Play: "+proof.checks.Count+" kontrol; 5 yarış, ödül, profil ve Play kapat/aç geçti.");else Debug.LogException(error);
      EditorApplication.ExitPlaymode();
    }
    private static string Hash(string file){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(file))).Replace("-","").ToLowerInvariant();}
  }
}
