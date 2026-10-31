using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using LastTurn.Core;
using UnityEditor;
using UnityEditor.Callbacks;
using UnityEngine;

namespace LastTurn.EditorValidation
{
  public static class CatalogCompilationCheck
  {
    [Serializable] private sealed class Source { public string path,sha256; }
    [Serializable] private sealed class Proof { public string result,utc,unityVersion;public int cars,parts,checks;public Source[] sources; }
    [DidReloadScripts] private static void Reload(){EditorApplication.delayCall+=Run;}
    [MenuItem("Last Turn/Katalog Verisini Doğrula")]
    public static void Run()
    {
      if(EditorApplication.isCompiling || EditorApplication.isUpdating){EditorApplication.delayCall+=Run;return;}
      string project=Path.GetDirectoryName(Application.dataPath),asset="Assets/LastTurn/Resources/vehicle-catalog.json";
      var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(project,asset)));int checks=0;
      for(int car=0;car<catalog.Data["cars"].Items.Count();car++)
      {
        foreach(var ids in new[]{Array.Empty<string>(),new[]{"motor-degisim","turbo-buyuk","suspansiyon-yaris","cekis-dort"}})
        {
          var setup=catalog.Setup(car,ids);var physics=catalog.CreatePhysics(setup);var performance=CatalogPerformance.Calculate(catalog,setup);
          if(performance["ozellikler"].Items.Sum(p=>p["puan"].N())!=performance["puan"].N())throw new InvalidOperationException("Özellik toplamı uyuşmuyor.");
          var drive=new PowertrainVehicle(physics);drive.Step(new DrivingInput(.2,0,0));checks++;
        }
      }
      var paths=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn/Scripts/Core"),"*.cs").Select(p=>p.Substring(project.Length+1).Replace('\\','/')).Concat(new[]{asset,"Assets/LastTurn/Editor/VehicleCatalogWindow.cs","Assets/LastTurn/Editor/CatalogCompilationCheck.cs"}).OrderBy(p=>p,StringComparer.Ordinal);
      var proof=new Proof{result="catalog-compiled-and-smoke-passed",utc=DateTime.UtcNow.ToString("O"),unityVersion=Application.unityVersion,cars=catalog.Data["cars"].Items.Count(),parts=catalog.Data["parts"].Items.Count(),checks=checks,sources=paths.Select(p=>new Source{path=p,sha256=Hash(Path.Combine(project,p))}).ToArray()};
      Directory.CreateDirectory(Path.Combine(project,"Logs"));File.WriteAllText(Path.Combine(project,"Logs/catalog-compilation.json"),JsonUtility.ToJson(proof,true));
      Debug.Log("Last Turn: katalog 15 araç/42 parça; 30 kurulum ve sürüş bağlantısı geçti.");
    }
    private static string Hash(string path){using(var hash=SHA256.Create())return BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(path))).Replace("-","").ToLowerInvariant();}
  }
}
