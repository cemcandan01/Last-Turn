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
  // Derleme sonrası Unity (Mono) içinde 40 pistin TS sorgu oracle'ıyla karşılaştırması; kanıt Logs/track-compilation.json.
  public static class TrackCompilationCheck
  {
    [Serializable] private sealed class Source { public string path,sha256; }
    [Serializable] private sealed class Proof { public string result,utc,unityVersion,error,maxErrorAt;public int tracks,points,samples,checks;public double maxError,tolerance;public Source[] sources; }
    public const string Asset="Assets/LastTurn/Resources/track-catalog.json",Fixture="Validation/Reference/track-queries-0.8.18.json";
    // Play'e girerken yeniden yüklemede koşmaz: kare süresine bağlı Play doğrulamalarını bekletmesin (kanıt derleme içindir).
    [DidReloadScripts] private static void Reload(){if(!EditorApplication.isPlayingOrWillChangePlaymode)EditorApplication.delayCall+=Run;}
    [MenuItem("Last Turn/Pist Verisini Doğrula")]
    public static void Run()
    {
      if(EditorApplication.isCompiling || EditorApplication.isUpdating){EditorApplication.delayCall+=Run;return;}
      string project=Path.GetDirectoryName(Application.dataPath);
      var proof=new Proof{unityVersion=Application.unityVersion,utc=DateTime.UtcNow.ToString("O"),tolerance=TrackReferenceComparison.Tolerance};
      try
      {
        var catalog=new TrackCatalog(File.ReadAllText(Path.Combine(project,Asset)));
        var result=TrackReferenceComparison.Run(catalog,CatalogNode.Parse(File.ReadAllText(Path.Combine(project,Fixture))));
        proof.result="tracks-compiled-and-matched";proof.tracks=result.Tracks;proof.samples=result.Samples;proof.checks=result.Checks;
        proof.points=catalog.Tracks.Sum(t=>t.Geometry.N);proof.maxError=result.MaxError;proof.maxErrorAt=result.MaxErrorAt;
        Debug.Log($"Last Turn: {result.Tracks} pist, {result.Samples} sorgu örneği TS ile eşleşti ({result.Checks} koşul, en büyük fark {result.MaxError:G3}).");
      }
      catch(Exception e){proof.result="failed";proof.error=e.ToString();Debug.LogException(e);}
      var paths=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn/Scripts/Core"),"Track*.cs").Select(p=>p.Substring(project.Length+1).Replace('\\','/'))
        .Concat(new[]{Asset,Fixture,"Assets/LastTurn/Editor/TrackReferenceComparison.cs","Assets/LastTurn/Editor/TrackCompilationCheck.cs","Assets/LastTurn/Editor/TrackCatalogWindow.cs"}).OrderBy(p=>p,StringComparer.Ordinal);
      proof.sources=paths.Select(p=>new Source{path=p,sha256=Hash(Path.Combine(project,p))}).ToArray();
      Directory.CreateDirectory(Path.Combine(project,"Logs"));File.WriteAllText(Path.Combine(project,"Logs/track-compilation.json"),JsonUtility.ToJson(proof,true));
    }
    private static string Hash(string path){using(var hash=SHA256.Create())return BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(path))).Replace("-","").ToLowerInvariant();}
  }
}
