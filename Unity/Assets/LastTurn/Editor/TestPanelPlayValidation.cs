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

namespace LastTurn.EditorValidation
{
  [InitializeOnLoad]
  public static class TestPanelPlayValidation
  {
    private const string Active="LastTurn.Panel.Play";
    private static readonly string[] keys={"dg_1","gp_1","rx_1","rl_1","dp_1"};
    private static readonly string[] scenes={"GTTest","TerrainTest","RaceTest"};
    private static int phase,index;private static double began;private static string snapshot;
    private static readonly List<string> checks=new List<string>();
    [Serializable]private sealed class Source{public string path,sha256;}
    [Serializable]private sealed class Proof{public string result,utc,error;public string[] checks;public Source[] sources;}
    static TestPanelPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    [MenuItem("Last Turn/Test Paneli Kısa Play Doğrulaması")]
    public static void Start()
    {
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play'i durdurun.");
      GarageSceneBuilder.Open();SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active,false)){phase=0;index=0;checks.Clear();began=EditorApplication.timeSinceStartup;EditorApplication.update+=Tick;}
      if(state==PlayModeStateChange.ExitingPlayMode){EditorApplication.update-=Tick;SessionState.SetBool(Active,false);}
    }
    private static void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);checks.Add(label);}
    private static void Tick()
    {
      try
      {
        if(EditorApplication.timeSinceStartup-began>90)throw new TimeoutException("Panel kısa test süre sınırı.");
        var screen=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();
        if(phase==0)
        {
          if(!screen)return;
          GarageSession.Open(Path.Combine(Path.GetDirectoryName(Application.dataPath),"Logs/PanelPlay/"+Guid.NewGuid().ToString("N")+"/profile.json"),true);
          snapshot=GarageSession.State.Snapshot().ToString();
          for(int tab=0;tab<5;tab++){screen.SelectTab(tab);Check(screen.SelectedTab==tab,"Bölüm seçimi "+TestPanelModel.Tabs[tab]);}
          foreach(string type in TestPanelModel.Types)Check(TestPanelModel.Tracks(TestPanelActions.Events(),type).Length==8,type+" sekiz görünür pist");
          Check(!TestPanelActions.StartRace("yok_1") && TestPanelActions.Error.Length>0,"Geçersiz yarış ekranda açıklanıyor");
          var locked=TestPanelActions.Events().First(r=>!r.Open);Check(!TestPanelActions.StartRace(locked.Key)&&TestPanelActions.Error.Contains("kilitli"),"Kilitli yarış açıklaması");
          Check(!TestPanelActions.OpenScene("BulunmayanTestSahnesi")&&TestPanelActions.Error.Length>0,"Eksik sahne açıklaması");
          Check(snapshot==GarageSession.State.Snapshot().ToString(),"Gezinme/hatalı açılış kaydı değiştirmedi");
          screen.SelectTab(2);phase=1;
        }
        if(phase==1 && screen)
        {
          screen.SelectRaceType(keys[index].Split('_')[0]);screen.SelectTrack(keys[index]);
          Check(screen.SelectedRaceKey==keys[index],"Panel pist seçimi "+keys[index]);Check(screen.StartSelectedRace(),"Panel Yarışı Başlat "+keys[index]);phase=2;return;
        }
        if(phase==2)
        {
          var p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p || p.Race==null)return;
          Check(SceneManager.GetActiveScene().name=="RaceTest"&&p.RaceTrack==keys[index] && p.Race.Event.Type+"_"+p.Race.Event.Level==keys[index],"Gerçek yarış açıldı "+keys[index]);
          Check(p.Parameters.ManualGearbox==(keys[index]=="dg_1"),"Mevcut vites kuralı "+keys[index]);
          GarageSession.ReturnToGarage();index++;phase=index<keys.Length?1:3;index=index<keys.Length?index:0;return;
        }
        if(phase==3 && screen)
        {bool ok=scenes[index]=="RaceTest"?TestPanelActions.StartRace("gp_1"):TestPanelActions.OpenScene(scenes[index]);Check(ok,"Kısayol başlat "+scenes[index]);phase=4;return;}
        if(phase==4)
        {if(SceneManager.GetActiveScene().name!=scenes[index])return;Check(true,"Kısayol gerçek sahne "+scenes[index]);GarageSession.ReturnToGarage();index++;phase=index<scenes.Length?3:5;return;}
        if(phase==5 && screen)
        {Check(snapshot==GarageSession.State.Snapshot().ToString(),"Tüm erişim testleri ekonomi ve yardım kaydını korudu");Finish(null);}
      }
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception error)
    {
      EditorApplication.update-=Tick;SessionState.SetBool(Active,false);
      string project=Path.GetDirectoryName(Application.dataPath),root=Path.Combine(Application.dataPath,"LastTurn");
      var proof=new Proof{result=error==null?"panel-play-passed":"failed",utc=DateTime.UtcNow.ToString("O"),error=error?.ToString()??"",checks=checks.ToArray(),
        sources=Directory.GetFiles(root,"*",SearchOption.AllDirectories).Where(p=>new[]{".cs",".json",".meta",".unity"}.Contains(Path.GetExtension(p))).OrderBy(p=>p,StringComparer.Ordinal).Select(p=>new Source{path=p.Substring(project.Length+1).Replace('\\','/'),sha256=Hash(p)}).ToArray()};
      Directory.CreateDirectory(Path.Combine(project,"Logs"));File.WriteAllText(Path.Combine(project,"Logs/panel-play.json"),JsonUtility.ToJson(proof,true));
      if(error==null)Debug.Log("Last Turn test paneli: "+checks.Count+" kontrol, dg_1 ve beş tür/sahne erişimi geçti.");else Debug.LogException(error);EditorApplication.ExitPlaymode();
    }
    private static string Hash(string p){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(p))).Replace("-","").ToLowerInvariant();}
  }
}
