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

namespace LastTurn.EditorValidation
{
  [InitializeOnLoad]
  public static class MutantDamagePlayValidation
  {
    private const string Active="LastTurn.Damage.Play",PathKey="LastTurn.Damage.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{
      public string result,error,utc,unityVersion;public bool batch;
      public List<string> checks=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();
      public Source[] sources;
    }
    private static Proof proof;private static int phase;private static double began;private static string career,profile;
    private static Dictionary<string,string> files;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantDamagePlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartBatch()
    {
      if(!Application.isBatchMode||Application.companyName!="LastTurnProfileUiValidation"||Application.productName!="LastTurnUiValidation"||!Environment.GetCommandLineArgs().Contains("-lastTurnUiValidation"))throw new InvalidOperationException("Yalnız ayrı doğrulama projesi/ürünü/batch Editor.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Doğrulama Editor'ı zaten Play'de.");
      GarageSceneBuilder.Open();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/Damage/"+Guid.NewGuid().ToString("N")+"/garage.json"));
      SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if(s==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){
        proof=new Proof();phase=0;began=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;
      }
      if(s==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;}
    }
    private static void Logged(string m,string stack,LogType type)
    {
      if(type!=LogType.Error&&type!=LogType.Exception&&type!=LogType.Assert)return;
      if(stack.Contains("UnityEditor.Search.")&&!stack.Contains("LastTurn."))proof.editorDiagnostics.Add(m);else proof.runtimeErrors.Add(m+"\n"+stack);
    }
    private static string Hash(string p){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(p))).Replace("-","").ToLowerInvariant();}
    private static Dictionary<string,string> Files()=>new[]{"LastTurnGarage","LastTurnMutant","LastTurnSettings"}.Select(n=>Path.Combine(Application.persistentDataPath,n)).Where(Directory.Exists).SelectMany(p=>Directory.GetFiles(p,"*.json",SearchOption.AllDirectories)).ToDictionary(p=>p,Hash);
    private static void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);proof.checks.Add(label);}
    private static void Preserved()
    {
      Check(GarageSession.State.Snapshot().ToString()==career&&GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Kariyer/para/profil aynı");
      var now=Files();Check(now.Count==files.Count&&files.All(p=>now.TryGetValue(p.Key,out var h)&&h==p.Value),"İzole ürünün mevcut kalıcı JSON kayıtları aynı hash'te");
    }
    private static void Tick()
    {
      try{
        if(EditorApplication.timeSinceStartup-began>100)throw new TimeoutException("Dar hasar Play süresi aşıldı.");
        if(proof.runtimeErrors.Count>0)throw new InvalidOperationException(proof.runtimeErrors[0]);
        if(phase==0&&UnityEngine.Object.FindFirstObjectByType<GarageScreen>()){
          GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=Files();
          MutantRuntime.Start(53);int car=MutantRuntime.Model.StartingCarsCards[0].Id;MutantRuntime.SelectCar(car);
          Check(MutantRuntime.Choose(MutantRuntime.Run.State["secenekler"][0].S()),"Mevcut servisle koşu ve açık dünya başlar");phase=1;return;
        }
        if(phase==1){
          var p=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!p||p.OpenTerrain==null||p.Simulation==null)return;p.ManualStepping=true;
          var run=MutantRuntime.Run;var s=run.State;var observed=new List<MechanicEvent>();run.DamageEvents.Observe=e=>observed.Add(e);
          Check(ReferenceEquals(MutantRuntime.Abilities.Energy.Run,run),"Normal Runtime gerçek EnergyController ve aynı Run'ı kullanır");
          s.Set("pasifler",CatalogNode.Parse("[\"carpisma-pili\",\"ek-hasar-donusturucu\"]"));s["mek"].Set("enerji",CatalogNode.Num(0));
          run.Damage("carpma");var notice=s["bekleyenHasar"];var brake=new DrivingInput(0,1,0);
          long tick=p.Simulation.Body.Steps;p.StepWorld(brake);
          Check(p.Simulation.Body.Steps>tick&&Math.Abs(s["mek"]["enerji"].N()-27)<1e-9,"Gerçek fizik sonrası Runtime yolu hasarı 27 enerjiye çevirir");
          var root=observed.Single(e=>e.Kind=="HasarAlindi");Check(observed.Count(e=>e.Kind=="EnergyGained"&&e.Identity!=null&&e.Identity.Parent==root.Identity.Id)==2,"Runtime'da iki türevin kök/ebeveyni var");
          double seq=s["mek"]["sonSira"].N();s.Set("bekleyenHasar",notice);p.StepWorld(brake);
          Check(s["mek"]["sonSira"].N()>seq&&Math.Abs(s["mek"]["enerji"].N()-27)<1e-9&&run.DamageEvents.Replays==1,"Yeni fizik adımı/yeni Seq ile aynı hasar ikinci kez enerji üretmez");
          // Kontrollü çarpışma zaman damgası; gerçek engel çarpışması/tur performansı iddiası değildir.
          typeof(VehicleState).GetProperty("LastHitTime").SetValue(p.Simulation.Body,MutantRuntime.Session.LastHit+1);
          p.StepWorld(brake);
          Check(s["carpma"].N()==2&&Math.Abs(s["mek"]["enerji"].N()-54)<1e-9,"Session çarpışma sinyali farklı gerçek hasar köküyle bağımsız enerji üretir");
          Check(observed.Where(e=>e.Kind=="HasarAlindi").Select(e=>e.Identity.Root).Distinct().Count()==2,"Normal adaptörde iki ayrı hasar kökü");
          proof.checks.AddRange(MutantDamageScenarios.Verify(run.Catalog));proof.checks.AddRange(MutantDamageScenarios.VerifyGiven(run.Catalog));Preserved();MutantRuntime.Exit();phase=2;return;
        }
        if(phase==2&&UnityEngine.Object.FindFirstObjectByType<GarageScreen>()){
          Check(!MutantRuntime.Active,"Koşudan menüye dönüş");Preserved();Finish(null);
        }
      }catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);EditorApplication.update-=Tick;Application.logMessageReceived-=Logged;
      proof.result=e==null?"mutant-damage-play-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.unityVersion=Application.unityVersion;proof.batch=Application.isBatchMode;
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(p=>new[]{".cs",".uss",".json"}.Contains(Path.GetExtension(p))).OrderBy(p=>p,StringComparer.Ordinal).Select(p=>new Source{path=p.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(p)}).ToArray();
      Directory.CreateDirectory(Path.Combine(Project,"Logs"));File.WriteAllText(Path.Combine(Project,"Logs/mutant-damage-play.json"),JsonUtility.ToJson(proof,true));
      EditorApplication.Exit(e==null?0:1);
    }
  }
}
