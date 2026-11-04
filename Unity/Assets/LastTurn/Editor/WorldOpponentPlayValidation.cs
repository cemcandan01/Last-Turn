using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Security.Cryptography;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEditor;
using UnityEngine.SceneManagement;

namespace LastTurn.EditorValidation
{
  [InitializeOnLoad]
  public static class WorldOpponentPlayValidation
  {
    private const string Active="LastTurn.P2.Active",PathKey="LastTurn.P2.Path";
    private static readonly string[] raceKeys={"gp_1","rx_1","rl_1","dg_1"},worldKeys={"hub","park","city"};
    [Serializable]private sealed class Source{public string path,sha256;}
    [Serializable]private sealed class Proof{public string result,error,utc,unityVersion;public bool batch;public List<string> checks=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources,userFiles;}
    private static Proof proof;private static int phase,index,ticks;private static double began,renderAt;private static string snapshot,profile;private static GtPrototype p;private static RaceTestDriver driver;
    private static string Project=>System.IO.Path.GetDirectoryName(Application.dataPath);
    static WorldOpponentPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    [MenuItem("Last Turn/P2 Dünya ve Rakip Kısa Play Doğrulaması")]
    public static void Start()
    {
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play'i durdurun.");
      GarageSceneBuilder.Open();var root=System.IO.Path.GetDirectoryName(GarageSession.ProfilePath(false));
      proof=new Proof{userFiles=Directory.Exists(root)?Directory.GetFiles(root,"*",SearchOption.AllDirectories).Select(f=>new Source{path=f,sha256=Hash(f)}).ToArray():Array.Empty<Source>()};
      SessionState.SetString(PathKey,System.IO.Path.Combine(Project,"Logs/P2Play/"+Guid.NewGuid().ToString("N")+"/garage.json"));
      Directory.CreateDirectory(System.IO.Path.Combine(Project,"Logs"));File.WriteAllText(System.IO.Path.Combine(Project,"Logs/p2-running.json"),JsonUtility.ToJson(proof));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    public static void StartBatch(){if(!Application.isBatchMode)throw new InvalidOperationException("Yalnız ayrı batch Editor doğrulaması.");Start();}
    private static void Changed(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active,false)){proof=JsonUtility.FromJson<Proof>(File.ReadAllText(System.IO.Path.Combine(Project,"Logs/p2-running.json")));phase=0;index=0;began=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;}
      if(state==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;SessionState.SetBool(Active,false);}
    }
    private static void Logged(string message,string stack,LogType type)
    {if(type!=LogType.Error&&type!=LogType.Exception&&type!=LogType.Assert)return;string detail=message+"\n"+stack;if(stack.Contains("LastTurn.")||!stack.Contains("UnityEditor.Search."))proof.runtimeErrors.Add(detail);else proof.editorDiagnostics.Add(detail);}
    private static void Check(bool ok,string text){if(!ok)throw new InvalidOperationException(text);proof.checks.Add(text);}
    private static void Tick()
    {
      try
      {
        if(proof.runtimeErrors.Count>0)throw new InvalidOperationException("Play çalışma hatası: "+proof.runtimeErrors[0]);
        if(EditorApplication.timeSinceStartup-began>180)throw new TimeoutException("P2 kısa Play sınırı");
        var screen=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();
        if(phase==0 && screen)
        {
          GarageSession.Open(SessionState.GetString(PathKey,""),true);GarageSession.Execute(GarageCommand.SetAssistLevel("real"));GameFlow.Browse(3);
          Check(WorldData.Catalog.Regions.Length==43,"Kaynak 43 bölge yüklendi");phase=1;
        }
        if(phase==1 && screen)
        {
          string key=raceKeys[index];int car=(int)GarageSession.Catalog.Data["career"]["starting"][key.Split('_')[0]].N();Check(GarageSession.Execute(GarageCommand.SelectCar(car)),"Kaynak başlangıç aracı seçildi "+key);
          snapshot=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();Check(WorldData.StartOpponent(key),key+" YZ yarış kısayolu");phase=2;return;
        }
        if(phase==2)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.Race==null)return;
          Check(p.Opponent!=null&&!p.Race.Session.Career,"Gerçek fiziksel YZ, kariyer ödülü yok "+raceKeys[index]);Check(p.EnvironmentVisuals.ObstacleCount==WorldData.Catalog.Region(raceKeys[index]).Objects.Length,"Kaynak nesneler çizildi "+raceKeys[index]);
          p.ManualStepping=true;driver=RaceTestDriver.For(p.Race.Event.Type);while(p.Race.Session.State==RaceState.Countdown)p.StepRace(driver.Countdown(p.Race));ticks=0;phase=3;return;
        }
        if(phase==3)
        {
          for(int k=0;k<900 && (p.Race.Session.State==RaceState.Running || !p.Opponent.FinishTime.HasValue);k++)
          {if(p.Race.Session.State==RaceState.Running){p.StepRace(driver.Input(p.Race));driver.RespawnIfStuck(p.Race);}else p.Opponent.Step();if(++ticks>36000)throw new Exception("YZ/oyuncu yarışı bitmedi: "+raceKeys[index]);}
          if(p.Race.Session.State==RaceState.Running || !p.Opponent.FinishTime.HasValue)return;
          Check(p.Race.Session.State==RaceState.Finished&&p.Opponent.FinishTime.HasValue,"Oyuncu ve fiziksel YZ bitti "+raceKeys[index]+" / YZ "+p.Opponent.Time.ToString("F2"));
          Check(p.Opponent.Vehicle.Body.Steps>300&&p.Opponent.Pilot.Progress>100,"YZ gerçek viraj/pist ilerlemesi "+raceKeys[index]);
          Check(p.OpponentText().Contains("önce bitir"),"Sonuç/sıralama bağlı "+raceKeys[index]);
          Check(snapshot==GarageSession.State.Snapshot().ToString()&&profile==GarageRace.ProfileStore().Load().Snapshot().ToString(),"YZ denemesi kariyer/profil/ödülü değiştirmedi "+raceKeys[index]);
          renderAt=EditorApplication.timeSinceStartup;phase=4;return;
        }
        if(phase==4 && EditorApplication.timeSinceStartup-renderAt>.2)
        {Capture(System.IO.Path.Combine(Project,"Logs/p2-race-"+raceKeys[index]+".png"));renderAt=EditorApplication.timeSinceStartup;phase=5;return;}
        if(phase==5 && EditorApplication.timeSinceStartup-renderAt>.3)
        {GameFlow.LeaveDrive();index++;phase=index<raceKeys.Length?1:10;index=index<raceKeys.Length?index:0;return;}
        if(phase==10 && screen){if(index==0)Check(GarageSession.Execute(GarageCommand.SelectCar(11)),"Açık dünya için kaynak RX seçildi");snapshot=GarageSession.State.Snapshot().ToString();Check(WorldData.Open(worldKeys[index]),"Açık dünya kısayolu "+worldKeys[index]);phase=11;return;}
        if(phase==11)
        {
          p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.OpenTerrain==null)return;GameFlow.Pause(true);
          Check(p.OpenTerrain.Region.Key==worldKeys[index]&&p.EnvironmentVisuals.ObstacleCount>0,"Gerçek açık dünya ve kaynak engeller "+worldKeys[index]);
          for(int i=0;i<p.OpenTerrain.Region.Teleports.Length;i++){p.TeleportWorld(i);var t=p.OpenTerrain.Region.Teleports[i];Check(Math.Abs(p.Simulation.ReferencePoint.X-t.X)<1e-8&&Math.Abs(p.Simulation.ReferencePoint.Z-t.Z)<1e-8,"Kaynak ışınlanma "+t.Name);}
          p.TeleportWorld(0);
          if(index==0)
          {
            var o=p.OpenTerrain.Region.Objects.First(v=>v.Type=="solid");p.Simulation.Place(o.X-o.Radius-8,o.Z,Math.PI/2);
            for(int n=0;n<600;n++)p.Simulation.Step(new DrivingInput(1,0,0));Check(p.Simulation.Body.CollisionCount>0&&p.Simulation.Body.LastHitTime>=0,"Gerçek araç çevre darbesi ve hit olayı");
            var b=p.OpenTerrain.CollisionBounds;p.Simulation.Place(b.MaxX-6,0,Math.PI/2);for(int n=0;n<120;n++)p.Simulation.Step(new DrivingInput(1,0,0));Check(p.Simulation.ReferencePoint.X<=b.MaxX-4.9,"Gerçek sınır duvarı aracı alanda tuttu");p.TeleportWorld(0);
          }
          renderAt=EditorApplication.timeSinceStartup;GameFlow.Pause(false);phase=12;return;
        }
        if(phase==12 && EditorApplication.timeSinceStartup-renderAt>.25){Capture(System.IO.Path.Combine(Project,"Logs/p2-world-"+worldKeys[index]+".png"));renderAt=EditorApplication.timeSinceStartup;phase=13;return;}
        if(phase==13 && EditorApplication.timeSinceStartup-renderAt>.3)
        {GameFlow.LeaveDrive(3);Check(snapshot==GarageSession.State.Snapshot().ToString(),"Açık dünya ekonomi/ilerlemeyi değiştirmedi");index++;phase=index<worldKeys.Length?10:20;return;}
        if(phase==20 && screen)
        {GarageSession.Execute(GarageCommand.SelectCar(10));snapshot=GarageSession.State.Snapshot().ToString();Check(WorldData.StartCareer("gp_1"),"Normal kariyer kısayolu");phase=21;return;}
        if(phase==21)
        {p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.Race==null)return;Check(p.Opponent==null&&p.Race.Session.Career,"Kariyer kaynaktaki gibi rakipsiz/ödüllü");p.ManualStepping=true;driver=RaceTestDriver.For("gp");while(p.Race.Session.State==RaceState.Countdown)p.StepRace(driver.Countdown(p.Race));ticks=0;phase=22;return;}
        if(phase==22)
        {
          for(int n=0;n<900&&p.Race.Session.State==RaceState.Running;n++){p.StepRace(driver.Input(p.Race));driver.RespawnIfStuck(p.Race);if(++ticks>36000)throw new Exception("Kariyer bitmedi");}
          if(p.Race.Session.State==RaceState.Running)return;var s=p.Race.Session;GarageSession.Reload();Check(GarageSession.State.Balance==s.Money && s.Money>0 && GarageSession.State.StarsOf("gp",1)==s.Stars,"Çevre sonrası kariyer ödülü/yıldız yeniden yüklendi");
          Check(proof.userFiles.All(f=>File.Exists(f.path)&&Hash(f.path)==f.sha256),"Oyuncu kayıtları korundu");Finish(null);
        }
      }
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception error)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;GameFlow.Pause(false);proof.result=error==null?"p2-play-passed":"failed";proof.error=error?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.unityVersion=Application.unityVersion;proof.batch=Application.isBatchMode;
      proof.sources=Directory.GetFiles(System.IO.Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".meta",".json",".unity"}.Contains(System.IO.Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),sha256=Hash(f)}).ToArray();
      File.WriteAllText(System.IO.Path.Combine(Project,"Logs/p2-play.json"),JsonUtility.ToJson(proof,true));if(error==null)Debug.Log("P2 Play geçti: "+proof.checks.Count+" kontrol.");else Debug.LogException(error);EditorApplication.ExitPlaymode();
      if(Application.isBatchMode)EditorApplication.delayCall+=()=>EditorApplication.Exit(error==null?0:1);
    }
    private static string Hash(string f){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(f))).Replace("-","").ToLowerInvariant();}
    private static void Capture(string path)
    {
      if(!Application.isBatchMode){ScreenCapture.CaptureScreenshot(path);return;}
      // Batch GameView yok: gerçek Unity kamerası render edilir; IMGUI/Editor ekranı kanıtı sayılmaz.
      var camera=Camera.main;if(!camera)throw new InvalidOperationException("Kanıt kamerası yok.");
      var target=new RenderTexture(960,540,24);var image=new Texture2D(960,540,TextureFormat.RGB24,false);var previous=RenderTexture.active;var oldTarget=camera.targetTexture;
      try{camera.targetTexture=target;camera.Render();RenderTexture.active=target;image.ReadPixels(new Rect(0,0,960,540),0,0);image.Apply();File.WriteAllBytes(path,image.EncodeToPNG());}
      finally{camera.targetTexture=oldTarget;RenderTexture.active=previous;target.Release();UnityEngine.Object.DestroyImmediate(target);UnityEngine.Object.DestroyImmediate(image);}
    }
  }
}
