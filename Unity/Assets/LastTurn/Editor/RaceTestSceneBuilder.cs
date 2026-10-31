using System.IO;
using System.Linq;
using LastTurn.Prototype;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.EditorValidation
{
  // RaceTest: GT primitive aracı + TS gp_1 pist dünyası + yarış oturumu + geçici HUD. Pist ağları çalışma anında
  // TrackWorld'den üretilir (sahnede yalnız malzemeler).
  [InitializeOnLoad]
  public static class RaceTestSceneBuilder
  {
    public const string ScenePath = "Assets/LastTurn/Scenes/RaceTest.unity", Track = "gp_1";
    static RaceTestSceneBuilder() { EditorApplication.delayCall += EnsureScene; }
    private static void EnsureScene()
    {
      if (EditorApplication.isCompiling || EditorApplication.isUpdating) { EditorApplication.delayCall += EnsureScene; return; }
      if (EditorApplication.isPlayingOrWillChangePlaymode || File.Exists(ScenePath)) { AddToBuild(); return; }
      var previous = SceneManager.GetActiveScene();
      if (string.IsNullOrEmpty(previous.path)) return;
      var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive); SceneManager.SetActiveScene(scene);
      try
      {
        var root = new GameObject("Last Turn • Yarış Testi (" + Track + ")"); var prototype = root.AddComponent<GtPrototype>(); prototype.BuildVisuals();
        if (!AssetDatabase.IsValidFolder("Assets/LastTurn/RaceAssets")) AssetDatabase.CreateFolder("Assets/LastTurn", "RaceAssets");
        Material Mat(string name, Color color)
        {
          var m = new Material(Shader.Find("Standard")) { name = name, color = color }; m.SetFloat("_Glossiness", .1f);
          AssetDatabase.CreateAsset(m, "Assets/LastTurn/RaceAssets/" + name + ".mat"); return m;
        }
        var visuals = new GameObject("Pist · TS gp_1 (çalışma anında üretilir)").AddComponent<RaceTrackVisuals>(); visuals.transform.SetParent(root.transform, false);
        visuals.Configure(Mat("PistAsfalt", new Color(.2f, .21f, .23f)), Mat("PistCim", new Color(.24f, .42f, .2f)), Mat("PistKerbKirmizi", new Color(.8f, .1f, .08f)),
          Mat("PistKerbBeyaz", new Color(.92f, .92f, .9f)), Mat("PistCizgi", Color.white), Mat("PistTabela", new Color(.95f, .78f, .1f)));
        prototype.ConfigureRace(Track, visuals);
        root.AddComponent<RaceHud>();
        foreach (var renderer in root.GetComponentsInChildren<Renderer>(true))
        {
          var material = renderer.sharedMaterial; if (!material || AssetDatabase.Contains(material)) continue;
          var existing = AssetDatabase.LoadAssetAtPath<Material>("Assets/LastTurn/PrototypeMaterials/" + material.name + ".mat");
          if (existing) renderer.sharedMaterial = existing;
          else AssetDatabase.CreateAsset(material, AssetDatabase.GenerateUniqueAssetPath("Assets/LastTurn/RaceAssets/" + material.name + ".mat"));
        }
        // Uzak pist görünsün: takip kamerasının kırpma mesafesi.
        foreach (var cam in root.GetComponentsInChildren<Camera>(true)) cam.farClipPlane = Mathf.Max(cam.farClipPlane, 2500);
        EditorSceneManager.SaveScene(scene, ScenePath); AssetDatabase.SaveAssets(); Debug.Log("Last Turn RaceTest oluşturuldu.");
      }
      finally { SceneManager.SetActiveScene(previous); EditorSceneManager.CloseScene(scene, true); }
      AddToBuild();
    }
    private static void AddToBuild()
    {
      if (!File.Exists(ScenePath)) return;
      var scenes = EditorBuildSettings.scenes.ToList();
      if (scenes.Any(s => s.path == ScenePath)) return;
      scenes.Add(new EditorBuildSettingsScene(ScenePath, true)); EditorBuildSettings.scenes = scenes.ToArray();
    }
    [MenuItem("Last Turn/Yarış Test Sahnesini Aç (gp_1)")]
    public static void Open()
    {
      EnsureScene(); if (EditorApplication.isPlayingOrWillChangePlaymode) return;
      if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
    }
  }
}
