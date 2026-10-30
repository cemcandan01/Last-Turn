using System.IO;
using LastTurn.Prototype;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.EditorValidation
{
  [InitializeOnLoad]
  public static class TerrainTestSceneBuilder
  {
    public const string ScenePath="Assets/LastTurn/Scenes/TerrainTest.unity";
    static TerrainTestSceneBuilder(){EditorApplication.delayCall+=EnsureScene;}
    private static void EnsureScene()
    {
      if(EditorApplication.isCompiling||EditorApplication.isUpdating){EditorApplication.delayCall+=EnsureScene;return;}
      if(EditorApplication.isPlayingOrWillChangePlaymode||File.Exists(ScenePath))return;
      var previous=SceneManager.GetActiveScene();
      if(string.IsNullOrEmpty(previous.path))return;
      var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Additive);SceneManager.SetActiveScene(scene);
      try
      {
        var root=new GameObject("Last Turn • Arazi Testi");var prototype=root.AddComponent<GtPrototype>();prototype.BuildVisuals();prototype.ConfigureTerrain();
        if(!AssetDatabase.IsValidFolder("Assets/LastTurn/TerrainAssets"))AssetDatabase.CreateFolder("Assets/LastTurn","TerrainAssets");
        var mesh=TerrainCourseMesh.Build();AssetDatabase.CreateAsset(mesh,"Assets/LastTurn/TerrainAssets/TerrainMesh.asset");
        var ground=new GameObject("Asfalt ve toprak · saf H ile aynı zemin",typeof(MeshFilter),typeof(MeshRenderer));ground.transform.SetParent(root.transform,false);
        ground.GetComponent<MeshFilter>().sharedMesh=mesh;
        Material Mat(string name,Color color)
        {
          var m=new Material(Shader.Find("Standard")){name=name,color=color};m.SetFloat("_Glossiness",.1f);
          AssetDatabase.CreateAsset(m,"Assets/LastTurn/TerrainAssets/"+name+".mat");return m;
        }
        ground.GetComponent<MeshRenderer>().sharedMaterials=new[]{Mat("AraziAsfalt",new Color(.12f,.14f,.16f)),Mat("AraziToprak",new Color(.43f,.29f,.15f))};
        // GT primitive materyallerini mevcut kabul edilmiş asset'lerle paylaş.
        foreach(var renderer in root.GetComponentsInChildren<Renderer>(true))
        {
          var material=renderer.sharedMaterial;if(AssetDatabase.Contains(material))continue;
          var existing=AssetDatabase.LoadAssetAtPath<Material>("Assets/LastTurn/PrototypeMaterials/"+material.name+".mat");
          if(existing)renderer.sharedMaterial=existing;
          else AssetDatabase.CreateAsset(material,AssetDatabase.GenerateUniqueAssetPath("Assets/LastTurn/TerrainAssets/"+material.name+".mat"));
        }
        EditorSceneManager.SaveScene(scene,ScenePath);AssetDatabase.SaveAssets();Debug.Log("Last Turn TerrainTest oluşturuldu.");
      }
      finally{SceneManager.SetActiveScene(previous);EditorSceneManager.CloseScene(scene,true);}
    }
    [MenuItem("Last Turn/Arazi Test Sahnesini Aç")]
    public static void Open()
    {
      EnsureScene();if(EditorApplication.isPlayingOrWillChangePlaymode)return;
      if(EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())EditorSceneManager.OpenScene(ScenePath,OpenSceneMode.Single);
    }
  }
}
