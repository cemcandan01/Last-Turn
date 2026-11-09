using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;
namespace LastTurn.EditorValidation
{
  public static class FunctionalWindowsBuild
  {
    public static void Build()
    {
      if(Application.productName!="LastTurnUiValidation"||!Environment.GetCommandLineArgs().Contains("-lastTurnUiValidation"))throw new InvalidOperationException("Yalnız izole doğrulama projesi.");
      var project=Path.GetDirectoryName(Application.dataPath);var output=Path.GetFullPath(Path.Combine(project,"../../Builds/FunctionalWindows/LastTurn.exe"));Directory.CreateDirectory(Path.GetDirectoryName(output));
      var r=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Garage","GTTest","TerrainTest","RaceTest"}.Select(n=>"Assets/LastTurn/Scenes/"+n+".unity").ToArray(),target=BuildTarget.StandaloneWindows64,locationPathName=output,options=BuildOptions.Development});
      File.WriteAllText(Path.Combine(project,"Logs/functional-build-result.txt"),r.summary.result+" / errors="+r.summary.totalErrors+" / bytes="+r.summary.totalSize+" / path="+output);
      EditorApplication.Exit(r.summary.result==BuildResult.Succeeded?0:1);
    }
  }
}
