using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Security.Cryptography;
using LastTurn.Core;
using UnityEngine;
using UnityEditor;

namespace LastTurn.EditorValidation
{
  // P3 ara derleme kapısı. Gerçek Unity derlemesi ve fizik; oynanabilir Mutant/Play/UI kabulü değildir.
  public static class MutantCoreSmokeCheck
  {
    [Serializable]private sealed class Source{public string path,sha256;}
    [Serializable]private sealed class Proof{public string result,error,utc,unityVersion;public int checks;public Source[] sources;}
    [MenuItem("Last Turn/P3 Saf Mutant Derleme Kontrolü")]
    public static void Run()
    {
      var proof=new Proof();string project=Path.GetDirectoryName(Application.dataPath);
      try
      {
        void Check(bool value,string message){proof.checks++;if(!value)throw new InvalidOperationException(message);}
        string Text(string name){var asset=Resources.Load<TextAsset>(name);if(!asset)throw new InvalidOperationException(name+" eksik");return asset.text;}
        var catalog=CatalogNode.Parse(Text("mutant-catalog"));var vehicles=new VehicleCatalog(Text("vehicle-catalog"));
        Check(catalog["baseline"].S()==VehicleCatalog.Baseline,"Mutant kaynak SHA");
        var run=new MutantRun(42,catalog);Check(run.State["etkinlikler"].Items.Count()==8,"Sekiz gerçek etkinlik");
        Check(run.Choose(run.State["secenekler"][0].S()),"Başlangıç seçimi");
        var setup=vehicles.Setup(10,Array.Empty<string>());var initial=MutantVehicle.Configure(vehicles,setup,run.State);
        var car=new PowertrainVehicle(vehicles.CreatePhysics(initial));
        for(int i=0;i<120;i++)car.Step(new DrivingInput(1,0,0));
        Check(car.Body.Steps==120 && car.ReferencePoint.Z>1,"Mutant kurulumuyla gerçek fizik");
        run.Damage("carpma");var damaged=MutantVehicle.Configure(vehicles,setup,run.State);
        Check(damaged.Car["hp"].N()<initial.Car["hp"].N(),"Hasar gerçek motor gücünü azaltır");
        var original=run.State["etkinlikler"][0];Check(run.FinishEvent((int)original["id"].N(),true)!=null,"Etkinlik ödülü");
        Check(run.FinishEvent((int)original["id"].N(),true)==null,"İkinci ödül reddedilir");
        run.EnterBoss();run.FinishBoss(false);Check(run.Finished,"Kaynak koşu bitişi");
        proof.result="p3-core-passed";
      }
      catch(Exception e){proof.result="failed";proof.error=e.ToString();Debug.LogException(e);}
      proof.utc=DateTime.UtcNow.ToString("O");proof.unityVersion=Application.unityVersion;
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories)
        .Where(f=>new[]{".cs",".json",".meta"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal)
        .Select(f=>new Source{path=f.Substring(project.Length+1).Replace('\\','/'),sha256=Hash(f)}).ToArray();
      Directory.CreateDirectory(Path.Combine(project,"Logs"));File.WriteAllText(Path.Combine(project,"Logs/p3-core.json"),JsonUtility.ToJson(proof,true));
      if(proof.result!="p3-core-passed"){if(Application.isBatchMode)EditorApplication.Exit(1);else throw new InvalidOperationException(proof.error);}
      Debug.Log("P3 saf Mutant derleme kontrolü geçti: "+proof.checks);
    }
    private static string Hash(string file){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(file))).Replace("-","").ToLowerInvariant();}
  }
}
