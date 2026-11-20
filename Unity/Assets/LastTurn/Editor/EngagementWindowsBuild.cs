using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace LastTurn.EditorValidation
{
  public static class EngagementWindowsBuild
  {
    [Serializable] private sealed class Source {public string path,hash;}
    [Serializable] private sealed class Proof {public string result,utc,path;public int errors;public Source[] sources;}
    public static void Build()=>BuildFor("EngagementWindows-20261116","engagement-build.json");
    public static void BuildPacing()=>BuildFor("EngagementWindows-20261117","pacing-build.json");
    public static void BuildQuality()=>BuildFor("KaliteWindows-20261120","quality-build.json");
    public static void BuildWorldLife()=>BuildFor("RotaWindows-20261120","worldlife-build.json");
    public static void BuildChampionship()=>BuildFor("KupaWindows-20261120","championship-build.json");
    public static void BuildDrivingFeel()=>BuildFor("SurusWindows-20261120","driving-feel-build.json");
    public static void BuildChoices()=>BuildFor("ElemeWindows-20261120","choices-build.json");
    public static void BuildAtelier()=>BuildFor("AtelierWindows-20261120","atelier-build.json");
    public static void BuildGrid()=>BuildFor("CircuitWindows-20261120","circuit-build.json");
    public static void BuildDuel()=>BuildFor("DuelWindows-20261120","duel-build.json");
    public static void BuildTraffic()=>BuildFor("TrafficWindows-20261117","traffic-build.json");
    private static void BuildFor(string folder,string proofName)
    {
      if(Application.productName!="LastTurnUiValidation"||Application.companyName!="LastTurnPitUiValidation"||!Environment.GetCommandLineArgs().Contains("-lastTurnUiValidation"))throw new InvalidOperationException("Yalnız ayrı doğrulama ürünü.");
      string project=Path.GetDirectoryName(Application.dataPath);
      string output=Path.GetFullPath(Path.Combine(project,"../../Builds",folder,"LastTurn.exe"));Directory.CreateDirectory(Path.GetDirectoryName(output));
      var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Garage","GTTest","TerrainTest","RaceTest"}.Select(n=>"Assets/LastTurn/Scenes/"+n+".unity").ToArray(),target=BuildTarget.StandaloneWindows64,locationPathName=output,options=BuildOptions.Development});
      var proof=new Proof{result=report.summary.result.ToString(),errors=report.summary.totalErrors,utc=DateTime.UtcNow.ToString("O"),path=output};
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".jpg",".shader"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>{using(var hash=SHA256.Create())return new Source{path=f.Substring(project.Length+1).Replace('\\','/'),hash=BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(f))).Replace("-","")};}).ToArray();
      File.WriteAllText(Path.Combine(project,"Logs",proofName),JsonUtility.ToJson(proof,true));EditorApplication.Exit(report.summary.result==BuildResult.Succeeded?0:1);
    }
  }
}
