using System.IO;
using LastTurn.Prototype;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.EditorValidation
{
  [InitializeOnLoad]
  public static class GtPrototypeSceneBuilder
  {
    public const string ScenePath = "Assets/LastTurn/Scenes/GTTest.unity";
    static GtPrototypeSceneBuilder() { EditorApplication.delayCall += EnsureScene; }
    private static void EnsureScene()
    {
      if (EditorApplication.isCompiling || EditorApplication.isUpdating) { EditorApplication.delayCall += EnsureScene; return; }
      if (EditorApplication.isPlayingOrWillChangePlaymode || File.Exists(ScenePath)) return;
      var previous = SceneManager.GetActiveScene();
      // Unity adsız sahne açıkken additive sahne oluşturmaz. İçeriği kaybetmeden yerel kurtarma dosyasına al.
      if (string.IsNullOrEmpty(previous.path))
      {
        if(!AssetDatabase.IsValidFolder("Assets/LocalRecovery")) AssetDatabase.CreateFolder("Assets","LocalRecovery");
        string recovery = AssetDatabase.GenerateUniqueAssetPath("Assets/LocalRecovery/BeforeGT.unity");
        if(!EditorSceneManager.SaveScene(previous,recovery))throw new System.InvalidOperationException("Adsız sahne korunamadı; GT oluşturma durdu.");
      }
      var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Additive);
      SceneManager.SetActiveScene(scene);
      try
      {
        var root = new GameObject("Last Turn • GT Test"); var prototype = root.AddComponent<GtPrototype>(); prototype.BuildVisuals();
        if(!AssetDatabase.IsValidFolder("Assets/LastTurn/PrototypeMaterials")) AssetDatabase.CreateFolder("Assets/LastTurn","PrototypeMaterials");
        foreach (var renderer in root.GetComponentsInChildren<Renderer>())
        {
          var material = renderer.sharedMaterial;
          if (AssetDatabase.Contains(material)) continue;
          string path = "Assets/LastTurn/PrototypeMaterials/" + material.name + ".mat";
          var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
          if (existing) renderer.sharedMaterial = existing; else AssetDatabase.CreateAsset(material,path);
        }
        EditorSceneManager.SaveScene(scene,ScenePath);
        AssetDatabase.SaveAssets();
        Debug.Log("Last Turn GTTest sahnesi oluşturuldu: " + ScenePath);
      }
      finally { SceneManager.SetActiveScene(previous); EditorSceneManager.CloseScene(scene,true); }
    }
    [MenuItem("Last Turn/GT Test Sahnesini Aç %F7")]
    public static void Open()
    {
      EnsureScene();
      if (EditorApplication.isPlayingOrWillChangePlaymode) return;
      if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) EditorSceneManager.OpenScene(ScenePath,OpenSceneMode.Single);
    }
  }
}
