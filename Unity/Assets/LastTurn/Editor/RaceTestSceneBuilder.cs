using System.IO;
using System.Linq;
using LastTurn.Prototype;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.EditorValidation
{
  // RaceTest: GT primitive aracı + TS pist dünyası (varsayılan gp_1; garajdan seçilen etkinlik) + yarış oturumu + geçici HUD. Pist ağları çalışma anında
  // TrackWorld'den üretilir (sahnede yalnız malzemeler).
  [InitializeOnLoad]
  public static class RaceTestSceneBuilder
  {
    public const string ScenePath = "Assets/LastTurn/Scenes/RaceTest.unity", Track = "gp_1";
    static RaceTestSceneBuilder() { EditorApplication.delayCall += EnsureScene; }
    private static Material Mat(string name, Color color)
    {
      string path = "Assets/LastTurn/RaceAssets/" + name + ".mat";
      var existing = AssetDatabase.LoadAssetAtPath<Material>(path); if (existing) return existing;
      var m = new Material(Shader.Find("Standard")) { name = name, color = color }; m.SetFloat("_Glossiness", .1f);
      AssetDatabase.CreateAsset(m, path); return m;
    }
    private static void Configure(RaceTrackVisuals visuals)
    {
      if (!AssetDatabase.IsValidFolder("Assets/LastTurn/RaceAssets")) AssetDatabase.CreateFolder("Assets/LastTurn", "RaceAssets");
      visuals.Configure(Mat("PistAsfalt", new Color(.2f, .21f, .23f)), Mat("PistCim", new Color(.24f, .42f, .2f)), Mat("PistKerbKirmizi", new Color(.8f, .1f, .08f)),
        Mat("PistKerbBeyaz", new Color(.92f, .92f, .9f)), Mat("PistCizgi", Color.white), Mat("PistTabela", new Color(.95f, .78f, .1f)),
        Mat("PistToprak", new Color(.52f, .37f, .22f)), Mat("PistKar", new Color(.86f, .89f, .93f)), Mat("PistCamur", new Color(.29f, .2f, .13f)), Mat("PistSu", new Color(.36f, .55f, .72f)), Mat("PistHayalet", new Color(.45f, .8f, 1f)));
    }
    private static void EnsureScene()
    {
      if (EditorApplication.isCompiling || EditorApplication.isUpdating) { EditorApplication.delayCall += EnsureScene; return; }
      if (EditorApplication.isPlayingOrWillChangePlaymode) return;
      var previous = SceneManager.GetActiveScene();
      if (string.IsNullOrEmpty(previous.path)) return;
      if (File.Exists(ScenePath))
      {
        // Yükseltme kontrolü sahneyi açar: yalnız düzenleme kipinde ve Editor oturumunda bir kez (Play geçişlerinde değil).
        if (!EditorApplication.isPlaying && !SessionState.GetBool("LastTurn.RaceTest.Upgraded2", false)) { SessionState.SetBool("LastTurn.RaceTest.Upgraded2", true); Upgrade(previous); }
        AddToBuild(); return;
      }
      var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive); SceneManager.SetActiveScene(scene);
      try
      {
        var root = new GameObject("Last Turn • Yarış Testi"); var prototype = root.AddComponent<GtPrototype>(); prototype.BuildVisuals();
        var visuals = new GameObject("Pist · TS bölgesi (çalışma anında üretilir)").AddComponent<RaceTrackVisuals>(); visuals.transform.SetParent(root.transform, false);
        Configure(visuals);
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
    // Var olan sahnede yeni zemin malzemeleri eksikse yalnız onları bağla (sahne ve GUID korunur).
    private static void Upgrade(Scene previous)
    {
      bool open = previous.path == ScenePath;
      var scene = open ? previous : EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Additive);
      try
      {
        var visuals = scene.GetRootGameObjects().SelectMany(g => g.GetComponentsInChildren<RaceTrackVisuals>(true)).FirstOrDefault();
        var so = visuals ? new SerializedObject(visuals) : null;
        if (so == null || so.FindProperty("ghost").objectReferenceValue) return;
        Configure(visuals); EditorUtility.SetDirty(visuals); EditorSceneManager.SaveScene(scene); AssetDatabase.SaveAssets(); Debug.Log("Last Turn RaceTest zemin malzemeleri bağlandı.");
      }
      finally { if (!open) EditorSceneManager.CloseScene(scene, true); }
    }
    private static void AddToBuild()
    {
      if (!File.Exists(ScenePath)) return;
      var scenes = EditorBuildSettings.scenes.ToList();
      if (scenes.Any(s => s.path == ScenePath)) return;
      scenes.Add(new EditorBuildSettingsScene(ScenePath, true)); EditorBuildSettings.scenes = scenes.ToArray();
    }
    [MenuItem("Last Turn/Yarış Test Sahnesini Aç")]
    public static void Open()
    {
      EnsureScene(); if (EditorApplication.isPlayingOrWillChangePlaymode) return;
      if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
    }
  }
}
