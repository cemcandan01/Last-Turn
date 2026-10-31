using System.IO;
using System.Linq;
using LastTurn.Core;
using UnityEditor;
using UnityEngine;

namespace LastTurn.EditorValidation
{
  // Geçici geliştirici görünümü (nihai tasarım değil): TS'den aktarılan pistleri üstten çizer ve fare altındaki noktada
  // pist sorgularını (en yakın nokta, izdüşüm, kerb/rampa yüksekliği, çamur) TrackGeometry/TrackLayout'tan gösterir.
  public sealed class TrackCatalogWindow : EditorWindow
  {
    private TrackCatalog catalog;
    private int selected;
    private Vector2 listScroll;
    private string error = "";
    private int hint;

    [MenuItem("Last Turn/Pist Kataloğu")]
    public static void Open() => GetWindow<TrackCatalogWindow>("Pist Kataloğu");

    private void OnEnable()
    {
      wantsMouseMove = true;
      try
      {
        string project = Path.GetDirectoryName(Application.dataPath);
        catalog = new TrackCatalog(File.ReadAllText(Path.Combine(project, TrackCompilationCheck.Asset)));
        selected = catalog.Find("gp", 1).Index;
      }
      catch (System.Exception e) { error = e.Message; }
    }

    private void OnGUI()
    {
      if (catalog == null) { EditorGUILayout.HelpBox("Pist kataloğu açılamadı: " + error, MessageType.Error); return; }
      if (Event.current.type == EventType.MouseMove) Repaint();
      EditorGUILayout.BeginHorizontal();
      listScroll = EditorGUILayout.BeginScrollView(listScroll, GUILayout.Width(230));
      foreach (var t in catalog.Tracks)
      {
        var label = $"{t.Key}  {t.Name}  (sv {t.Difficulty})";
        if (GUILayout.Toggle(t.Index == selected, label, "Button")) selected = t.Index;
      }
      EditorGUILayout.EndScrollView();

      var d = catalog.Tracks[selected]; var g = d.Geometry; var layout = d.Layout;
      EditorGUILayout.BeginVertical();
      EditorGUILayout.LabelField($"{d.Key} • {d.Name} • {catalog.Levels[d.Difficulty - 1].Name}", EditorStyles.boldLabel);
      EditorGUILayout.LabelField(d.Description, EditorStyles.wordWrappedMiniLabel);
      string target = d.Raw.Has("hp") ? "hedef puan " + d.Raw["hp"].N() : "hedef süre " + d.Raw["tg"].N() + " sn";
      EditorGUILayout.LabelField($"{(d.Open ? "Açık (A→B)" : "Kapalı")} • N {g.N} • uzunluk {g.Length:F1} m • yarı genişlik {g.HalfWidth} m • {target} • " +
        $"kerb {layout.Kerbs.Count(k => k)} • tabela {layout.BrakeBoards.Count} • rampa {layout.Jumps.Length} • çamur {layout.Mud.Length} • su {layout.Water.Length}");
      EditorGUILayout.LabelField("Tarif: " + (d.Raw.Has("tarif") ? d.Raw["tarif"].S() : "kontrol noktaları"), EditorStyles.wordWrappedMiniLabel);

      var rect = GUILayoutUtility.GetRect(10, 10, GUILayout.ExpandWidth(true), GUILayout.ExpandHeight(true));
      DrawMap(rect, d);
      EditorGUILayout.EndVertical();
      EditorGUILayout.EndHorizontal();
    }

    private void DrawMap(Rect rect, TrackDefinition d)
    {
      var g = d.Geometry; var layout = d.Layout; var box = g.Bounds(g.HalfWidth + 10);
      float scale = Mathf.Min(rect.width / (float)(box.MaxX - box.MinX), rect.height / (float)(box.MaxZ - box.MinZ));
      Vector2 origin = rect.center;
      double cx = (box.MinX + box.MaxX) / 2, cz = (box.MinZ + box.MaxZ) / 2;
      Vector3 P(double x, double z) => new Vector3(origin.x + (float)(x - cx) * scale, origin.y - (float)(z - cz) * scale);
      if (Event.current.type == EventType.Repaint)
      {
        EditorGUI.DrawRect(rect, new Color(.12f, .13f, .14f));
        int count = g.Open ? g.N : g.N + 1;
        Vector3[] Line(double offset) => Enumerable.Range(0, count).Select(k => { var a = g.AtTrack(k % g.N, offset); return P(a.X, a.Z); }).ToArray();
        Handles.color = new Color(.55f, .58f, .62f); Handles.DrawAAPolyLine(2, Line(-g.HalfWidth)); Handles.DrawAAPolyLine(2, Line(g.HalfWidth));
        Handles.color = new Color(.85f, .85f, .85f, .5f); Handles.DrawAAPolyLine(1, Line(0));
        Handles.color = new Color(.9f, .25f, .2f);
        for (int i = 0; i < layout.Kerbs.Length; i++) if (layout.Kerbs[i]) { var a = g.AtTrack(i, g.HalfWidth); var b = g.AtTrack(i, -g.HalfWidth); Handles.DrawSolidDisc(P(a.X, a.Z), Vector3.forward, 1.5f); Handles.DrawSolidDisc(P(b.X, b.Z), Vector3.forward, 1.5f); }
        Handles.color = Color.yellow; foreach (int i in layout.BrakeBoards) Handles.DrawWireDisc(P(g.X[i], g.Z[i]), Vector3.forward, 6);
        Handles.color = new Color(.95f, .6f, .1f); foreach (var j in layout.Jumps) Handles.DrawSolidDisc(P(j.X, j.Z), Vector3.forward, 4);
        Handles.color = new Color(.45f, .3f, .15f); foreach (var m in layout.Mud) Handles.DrawWireDisc(P(m.X, m.Z), Vector3.forward, (float)m.Radius * scale);
        Handles.color = new Color(.3f, .6f, 1f); foreach (var w in layout.Water) Handles.DrawWireDisc(P(w.X, w.Z), Vector3.forward, (float)w.Radius * scale);
        var start = P(layout.StartX, layout.StartZ);
        Handles.color = Color.green; Handles.DrawSolidDisc(start, Vector3.forward, 5);
        Handles.DrawAAPolyLine(3, start, start + new Vector3(Mathf.Sin((float)layout.StartHeading), -Mathf.Cos((float)layout.StartHeading)) * 24);
      }
      var mouse = Event.current.mousePosition;
      if (!rect.Contains(mouse)) return;
      double mx = cx + (mouse.x - origin.x) / scale, mz = cz - (mouse.y - origin.y) / scale;
      var near = g.Nearest(mx, mz, hint); hint = near.Index;
      var proj = g.Project(mx, mz, near.Index);
      string info = $"x {mx:F1}  z {mz:F1}\nen yakın nokta {near.Index}  uzaklık {near.Distance:F2} m\npist boyunca s {proj.S:F1} m  çizgiye {proj.Distance:F2} m\n" +
        (layout.Kerbs.Length > 0 ? $"kerb yüksekliği {g.KerbHeight(layout.Kerbs, mx, mz, hint):F3} m\n" : "") +
        (layout.Jumps.Length > 0 ? $"rampa yüksekliği {layout.JumpHeight(mx, mz):F2} m  çamur {(layout.InMud(mx, mz) ? "evet" : "hayır")}\n" : "") +
        $"eğrilik {g.Curvature(proj.S):F4} rad/m";
      if (Event.current.type == EventType.Repaint)
      {
        Handles.color = Color.cyan; Handles.DrawLine(mouse, P(g.X[near.Index], g.Z[near.Index]));
      }
      GUI.Label(new Rect(rect.x + 8, rect.y + 8, 330, 96), info, EditorStyles.helpBox);
    }
  }
}
