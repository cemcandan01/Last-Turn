using System.Collections.Generic;
using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.Prototype
{
  // Geçici miniharita çizimi (TS mini-harita.ts davranışı MiniMap'te): pist çizgisi, Mutant işaretleri, rakip/hayalet, imleç.
  // Açık dünya yol ağı taban görüntüsü grafik fazındadır; işaretler ve araçlar her yerde çizilir. HUD "harita" parçası kapalıysa yok.
  public sealed class MiniMapView : MonoBehaviour
  {
    public readonly MiniMap Map = new MiniMap();
    public int Markers { get; private set; }
    public int Segments { get; private set; }
    public int Cars { get; private set; }
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Install() { SceneManager.sceneLoaded -= Loaded; SceneManager.sceneLoaded += Loaded; Loaded(SceneManager.GetActiveScene(), LoadSceneMode.Single); }
    private static void Loaded(Scene s, LoadSceneMode m) { new GameObject("Miniharita").AddComponent<MiniMapView>(); }
    private static void Dot(float x, float y, float r, Color c) { GUI.color = c; GUI.DrawTexture(new Rect(x - r, y - r, r * 2, r * 2), Texture2D.whiteTexture); }
    private readonly List<(double AX, double AY, double BX, double BY, double W)> track = new List<(double, double, double, double, double)>();
    private readonly List<(double X, double Y, Color C)> marks = new List<(double, double, Color)>();
    private readonly List<(double X, double Y, double R, Color C)> cars = new List<(double, double, double, Color)>();
    private bool visible;
    // görünüm modeli her karede (batch Editor'da OnGUI çalışmaz; çizim yalnız hazır listeleri kullanır)
    private void Update()
    {
      var p = FindFirstObjectByType<GtPrototype>(); track.Clear(); marks.Clear(); cars.Clear();
      visible = p && p.Simulation != null && !GameFlow.Paused && !SettingsScreen.Open && !MutantRuntime.Blocked && !LastTurn.Ui.ResultView.CoversCurrentScreen && Hud.TryGet(p, "Map", out _);
      if (!visible) { Markers = Segments = Cars = 0; return; }
      var b = p.Simulation.Body; var pt = p.Simulation.ReferencePoint; var f = b.Orientation.Rotate(new BodyVector(0, 0, 1)); double h = System.Math.Atan2(f.X, f.Z);
      Map.Frame(pt.X, pt.Z, System.Math.Sin(h), System.Math.Cos(h), JsMath.Hypot(b.Velocity.X, b.Velocity.Z), Time.deltaTime);
      if (p.Race != null)
      {
        var g = p.Race.World.Track.Geometry; var pts = new List<(double, double)>(); for (int i = 0; i < g.N; i++) pts.Add((g.X[i], g.Z[i])); if (!g.Open && g.N > 0) pts.Add((g.X[0], g.Z[0]));
        foreach (var s in Map.Track(pts)) track.Add((s.AX, s.AY, s.BX, s.BY, s.Scale * g.HalfWidth * 2));
      }
      if (MutantRuntime.Active && p.Race == null)
      {
        var st = MutantRuntime.Run.State; bool city = MutantRuntime.Run.Region >= 2; var cat = MutantRuntime.Run.Catalog;
        var all = st["etkinlikler"].Items.Where(e => !e["yapildi"].B()).Select(e => (e["x"].N(), e["z"].N(), new Color(1, .55f, .15f)))
          .Concat(st["sandiklar"].Items.Where(e => !e["acildi"].B()).Select(e => (e["x"].N(), e["z"].N(), new Color(1, .85f, .2f))))
          .Append((cat[city ? "cityWorkshop" : "workshop"][0].N(), cat[city ? "cityWorkshop" : "workshop"][1].N(), new Color(.3f, .8f, 1)))
          .Append((cat[city ? "cityBoss" : "bossPlace"][0].N(), cat[city ? "cityBoss" : "bossPlace"][1].N(), new Color(.9f, .2f, .3f)));
        foreach (var (x, z, c) in all) { var m = Map.Marker(x, z); marks.Add((m.X, m.Y, c)); }
      }
      if (p.Opponent != null) { var o = p.Opponent.Vehicle.ReferencePoint; var c = Map.Car(o.X, o.Z); if (c != null) cars.Add((c.Value.X, c.Value.Y, c.Value.Radius, new Color(1, .3f, .3f))); }
      var ghost = p.GhostShown ? p.Race.Ghost : null; if (ghost != null) { var o = ghost.Vehicle.ReferencePoint; var c = Map.Car(o.X, o.Z); if (c != null) cars.Add((c.Value.X, c.Value.Y, c.Value.Radius, new Color(1, 1, 1, .7f))); }
      Segments = track.Count; Markers = marks.Count; Cars = cars.Count;
    }
    private void OnGUI()
    {
      var p = FindFirstObjectByType<GtPrototype>(); if (!visible || !p || !Hud.TryGet(p, "Map", out var area)) return;
      float k = area.width / (float)MiniMap.Size; var old = GUI.color;
      GUI.color = new Color(0, 0, 0, .45f); GUI.DrawTexture(area, Texture2D.whiteTexture); GUI.BeginGroup(area);
      Vector2 P(double x, double y) => new Vector2((float)x * k, (float)y * k);
      foreach (var s in track)
      {
        var a = P(s.AX, s.AY); var c = P(s.BX, s.BY); float w = Mathf.Clamp((float)(s.W * k), 1.5f, 10); int n = Mathf.Max(1, (int)(Vector2.Distance(a, c) / 3));
        for (int i = 0; i <= n; i++) { var q = Vector2.Lerp(a, c, i / (float)n); Dot(q.x, q.y, w / 2, new Color(.85f, .88f, .92f, .8f)); }
      }
      foreach (var m in marks) { var q = P(m.X, m.Y); Dot(q.x, q.y, 6, Color.black); Dot(q.x, q.y, 5, m.C); }
      foreach (var c in cars) { var q = P(c.X, c.Y); Dot(q.x, q.y, (float)c.R * k, c.C); }
      // araç imleci: ortada sabit, hep yukarı
      var me = P(MiniMap.OX, MiniMap.OY); Dot(me.x, me.y, 7 * k + 2, new Color(1, .48f, .24f)); Dot(me.x, me.y - 6 * k, 3 * k + 1, Color.white);
      GUI.EndGroup(); GUI.color = old;
    }
  }
}
