using System.IO;
using System.Linq;
using LastTurn.Garage;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.EditorValidation
{
  [InitializeOnLoad]
  public static class GarageSceneBuilder
  {
    public const string ScenePath="Assets/LastTurn/Scenes/Garage.unity";
    static GarageSceneBuilder(){EditorApplication.delayCall+=EnsureScene;}
    public static void EnsureScene()
    {
      if(EditorApplication.isCompiling||EditorApplication.isUpdating){EditorApplication.delayCall+=EnsureScene;return;}
      if(EditorApplication.isPlayingOrWillChangePlaymode)return;
      if(!File.Exists(ScenePath))
      {
        var previous=SceneManager.GetActiveScene();
        if(string.IsNullOrEmpty(previous.path))return;
        var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Additive);SceneManager.SetActiveScene(scene);
        try
        {
          new GameObject("Last Turn Garaj",typeof(GarageScreen));
          var camera=new GameObject("Garaj kamera",typeof(Camera)).GetComponent<Camera>();camera.tag="MainCamera";
          camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.035f,.055f,.075f);camera.orthographic=true;
          EditorSceneManager.SaveScene(scene,ScenePath);AssetDatabase.SaveAssets();
        }
        finally{SceneManager.SetActiveScene(previous);EditorSceneManager.CloseScene(scene,true);}
      }
      // Mevcut girdileri koru; yalnız garajdan açılan üç sahnenin oyuncuda da yüklenmesini sağla.
      var scenes=EditorBuildSettings.scenes.ToList();
      foreach(string path in new[]{ScenePath,GtPrototypeSceneBuilder.ScenePath,TerrainTestSceneBuilder.ScenePath})
        if(!scenes.Any(s=>s.path==path))scenes.Add(new EditorBuildSettingsScene(path,true));
      EditorBuildSettings.scenes=scenes.ToArray();
      AssetDatabase.SaveAssets();
    }
    [MenuItem("Last Turn/Garaj Sahnesini Aç")]
    public static void Open()
    {EnsureScene();if(!EditorApplication.isPlayingOrWillChangePlaymode && EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())EditorSceneManager.OpenScene(ScenePath,OpenSceneMode.Single);}
    [MenuItem("Last Turn/Ana Menüyü Aç")]
    public static void OpenMainMenu()=>Open();
  }
}
