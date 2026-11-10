using System.Diagnostics;
using Unity.Profiling;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.Prototype
{
  // TS cekirdek/performans.ts: Ayarlar → “Performans göstergesi” açıkken alt ortada kare hızı, kare süresi (en kötü),
  // fizik/çizim süresi, çizim çağrısı ve üçgen; ortalamalar 0,08 üstel, yazı yarım saniyede bir. Oyun durumuna yazmaz.
  // Çizim süresi/çağrı/üçgen Unity profil sayaçlarından; sayaç bu yapıda yoksa 0 görünür.
  public sealed class PerformanceOverlay : MonoBehaviour
  {
    private static readonly Stopwatch physics = new Stopwatch(); private static double physicsMs;
    /// GtPrototype sabit adım ilerletmesini sarar (fizik + yarış/Mutant adımları).
    public static void PhysicsBegin() => physics.Restart();
    public static void PhysicsEnd() { physics.Stop(); physicsMs += physics.Elapsed.TotalMilliseconds; }
    public static float Fps { get; private set; } = 60; public static string Text { get; private set; } = "";
    private float frame = 16.7f, physicsAvg, render, worst, lastWrite; private GUIStyle style;
    private ProfilerRecorder draws, triangles, camera;
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Install() { if (FindFirstObjectByType<PerformanceOverlay>()) return; var go = new GameObject("Performans göstergesi"); DontDestroyOnLoad(go); go.AddComponent<PerformanceOverlay>(); }
    private void OnEnable()
    {
      draws = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Draw Calls Count"); triangles = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Triangles Count");
      camera = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Camera.Render");
    }
    private void OnDisable() { draws.Dispose(); triangles.Dispose(); camera.Dispose(); }
    private static float Ema(float a, float b) => a + (b - a) * .08f;
    private void LateUpdate()
    {
      float ms = Time.unscaledDeltaTime * 1000; frame = Ema(frame, ms); Fps = 1000 / Mathf.Max(frame, 1);
      physicsAvg = Ema(physicsAvg, (float)physicsMs); physicsMs = 0;
      render = Ema(render, camera.Valid ? camera.LastValue / 1e6f : 0); worst = Mathf.Max(worst, ms);
      if (!PlayerPreferences.Current.On("perf") || Time.unscaledTime - lastWrite < .5f) return;
      lastWrite = Time.unscaledTime;
      long calls = draws.Valid ? draws.LastValue : 0, tris = triangles.Valid ? triangles.LastValue : 0;
      Text = Fps.ToString("0") + " fps · kare " + frame.ToString("0.0", Inv) + " ms (en kötü " + worst.ToString("0", Inv) + ") · fizik " + physicsAvg.ToString("0.00", Inv) +
        " ms · çizim " + render.ToString("0.0", Inv) + " ms · " + calls + " çağrı · " + (tris / 1000f).ToString("0", Inv) + "k üçgen";
      worst = 0;
    }
    private static readonly System.Globalization.CultureInfo Inv = System.Globalization.CultureInfo.InvariantCulture;
    private void OnGUI()
    {
      if (!PlayerPreferences.Current.On("perf") || Text == "") return;
      if (style == null) { style = new GUIStyle(GUI.skin.label) { fontSize = 11, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter }; style.normal.textColor = Color.white; }
      float k = Screen.height / 720f; style.fontSize = Mathf.RoundToInt(11 * k);
      var size = style.CalcSize(new GUIContent(Text)); var r = new Rect((Screen.width - size.x) / 2 - 8 * k, Screen.height - size.y - 8 * k, size.x + 16 * k, size.y + 4 * k);
      var c = GUI.color; GUI.color = new Color(0, 0, 0, .55f); GUI.DrawTexture(r, Texture2D.whiteTexture); GUI.color = c; GUI.Label(r, Text, style);
    }
  }
}
