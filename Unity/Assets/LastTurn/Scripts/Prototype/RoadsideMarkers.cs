using System;
using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;
using UnityEngine.Rendering;

namespace LastTurn.Prototype
{
  // Yol kenarı okunabilirlik öğeleri (TS'de yok; Cem'in 11 Kasım 2026 kararıyla bütün yarış pistlerinde): 20 m'de bir iki yanda
  // kırmızı yansıtıcılı kenar direği ve keskin virajın (|eğrilik| > 0,028) dışında dönüş yönünü gösteren ok levhası.
  // Kaynak pist dünyasının üstüne yalnız çarpışmasız görsel eklenir; fizik zemini, collider, yol genişliği, kesme sınırı ve
  // engel yerleri değişmez. Engel/koni/su üstüne ya da başka bir yol parçasının üstüne düşen öğe atlanır.
  public sealed class RoadsideMarkers : MonoBehaviour
  {
    /// Önce/sonra doğrulaması için kapatılabilir.
    public static bool Enabled = true;
    public const double PostSpacing = 20, ChevronCurvature = .028, ChevronSpacing = 9;
    public int Posts { get; private set; }
    public int Chevrons { get; private set; }
    public int Skipped { get; private set; }
    private readonly List<UnityEngine.Object> owned = new List<UnityEngine.Object>();

    public static RoadsideMarkers Build(Transform parent, TrackWorld world)
    {
      var go = new GameObject("Yol kenarı işaretleri"); go.transform.SetParent(parent, false);
      var m = go.AddComponent<RoadsideMarkers>(); m.Create(world); return m;
    }
    public void Remove() => Destroy(gameObject);
    private void OnDestroy() { foreach (var o in owned) if (o) Destroy(o); owned.Clear(); }

    private T Own<T>(T o) where T : UnityEngine.Object { owned.Add(o); return o; }
    private static Color Hex(int rgb) => new Color(((rgb >> 16) & 255) / 255f, ((rgb >> 8) & 255) / 255f, (rgb & 255) / 255f);
    private static Vector3 P(double x, double y, double z) => GtPresentation.Position(new BodyVector(x, y, z));
    /// Kaynak dünyayla aynı ışık/sis modeli; lit 0 ışıktan bağımsız (yansıtıcı gece de seçilir).
    private Material Mat(Color c, float lit, Texture2D tex = null)
    {
      var m = Own(new Material(Resources.Load<Shader>("SourcePresentation/SourceLambert") ?? Shader.Find("Standard")) { color = c });
      if (tex) m.mainTexture = tex; if (m.HasProperty("_Lit")) m.SetFloat("_Lit", lit); return m;
    }
    private Texture2D Chevron()
    {
      var t = Own(new Texture2D(64, 64, TextureFormat.RGBA32, true) { wrapMode = TextureWrapMode.Clamp }); var px = new Color[64 * 64];
      for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++)
        {
          float d = Mathf.Abs(y - 32) * .9f; bool arrow = Mathf.Abs(x - (40 - d)) < 7 || Mathf.Abs(x - (18 - d)) < 7 && x > 2;
          px[y * 64 + x] = x < 2 || x > 61 || y < 2 || y > 61 ? Hex(0x222222) : arrow ? Hex(0xd8323a) : Color.white;
        }
      t.SetPixels(px); t.Apply(true); return t;
    }

    private sealed class Mesher
    {
      public readonly List<Vector3> V = new List<Vector3>(); public readonly List<Vector3> N = new List<Vector3>(); public readonly List<Vector2> U = new List<Vector2>(); public readonly List<int> T = new List<int>();
      private void Tri(Vector3 a, Vector3 b, Vector3 c, Vector2 ua, Vector2 ub, Vector2 uc)
      {
        var n = Vector3.Cross(b - a, c - a).normalized;
        int i = V.Count; V.Add(a); V.Add(b); V.Add(c); N.Add(n); N.Add(n); N.Add(n); U.Add(ua); U.Add(ub); U.Add(uc); T.Add(i); T.Add(i + 1); T.Add(i + 2);
      }
      /// Ön yüz dir yönüne bakar.
      public void Facing(Vector3 a, Vector3 b, Vector3 c, Vector3 dir, Vector2 ua = default, Vector2 ub = default, Vector2 uc = default)
      { if (Vector3.Dot(Vector3.Cross(b - a, c - a), dir) >= 0) Tri(a, b, c, ua, ub, uc); else Tri(a, c, b, ua, uc, ub); }
      /// a sol-alt, b sağ-alt, c sağ-üst, d sol-üst (bakana göre); flip dokuyu yatay çevirir.
      public void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector3 dir, bool flip = false)
      {
        Vector2 A = new Vector2(flip ? 1 : 0, 0), B = new Vector2(flip ? 0 : 1, 0), C = new Vector2(flip ? 0 : 1, 1), D = new Vector2(flip ? 1 : 0, 1);
        Facing(a, b, c, dir, A, B, C); Facing(a, c, d, dir, A, C, D);
      }
      /// Dört yüzlü dikme (taban/tavan yok).
      public void Prism(Vector3 c, float r, float h)
      {
        for (int k = 0; k < 4; k++)
        {
          float a0 = .78f + k * Mathf.PI / 2, a1 = a0 + Mathf.PI / 2;
          Vector3 d0 = new Vector3(Mathf.Cos(a0), 0, Mathf.Sin(a0)) * r, d1 = new Vector3(Mathf.Cos(a1), 0, Mathf.Sin(a1)) * r, up = Vector3.up * h;
          var o = d0 + d1; Facing(c + d1, c + d0, c + d0 + up, o); Facing(c + d1, c + d0 + up, c + d1 + up, o);
        }
      }
      public Mesh Build(string name) { var m = new Mesh { name = name, indexFormat = IndexFormat.UInt32 }; m.SetVertices(V); m.SetNormals(N); m.SetUVs(0, U); m.SetTriangles(T, 0); m.RecalculateBounds(); return m; }
    }
    private void Part(string name, Mesher m, Material mat)
    {
      if (m.V.Count == 0) return;
      var go = new GameObject(name, typeof(MeshFilter), typeof(MeshRenderer)); go.transform.SetParent(transform, false);
      go.GetComponent<MeshFilter>().sharedMesh = Own(m.Build(name)); var r = go.GetComponent<MeshRenderer>(); r.sharedMaterial = mat; r.shadowCastingMode = ShadowCastingMode.Off;
    }

    /// Öğe yeri boş mu: başka yol parçası, engel, koni ya da su üstünde değil.
    private static bool Clear(TrackWorld world, double x, double z, double hw, double room)
    {
      var g = world.Geometry; if (!g.ClearOf(x, z, hw + .8)) return false;
      var env = world.Environment; if (env == null) return true;
      foreach (var o in env.Objects)
      {
        double r = o.Type == "box" ? Math.Sqrt(o.HalfX * o.HalfX + o.HalfZ * o.HalfZ) : o.Radius;
        double dx = o.X - x, dz = o.Z - z, lim = r + room; if (dx * dx + dz * dz < lim * lim) return false;
      }
      foreach (var c in env.Cones) { double dx = c.X - x, dz = c.Z - z; if (dx * dx + dz * dz < (1 + room) * (1 + room)) return false; }
      return true;
    }

    private void Create(TrackWorld world)
    {
      var g = world.Geometry; double hw = g.HalfWidth; int hint = world.Hint;
      double H(double x, double z) { world.Hint = g.Nearest(x, z, world.Hint).Index; return world.Height(x, z); }
      try
      {
        var posts = new Mesher(); var caps = new Mesher(); var boards = new Mesher(); var backs = new Mesher();
        // Direk, kenar bandının (kerb) dışında; levha biraz daha açıkta.
        double postOff = hw + TrackGeometry.KerbWidth + .8, boardOff = hw + TrackGeometry.KerbWidth + 2;
        double next = 0; int count = g.Open ? g.N - 1 : g.N;
        for (int i = 0; i < count; i++)
        {
          if (g.S[i] < next) continue; next = g.S[i] + PostSpacing;
          foreach (int side in new[] { -1, 1 })
          {
            var q = g.AtTrack(i, side * postOff); if (!Clear(world, q.X, q.Z, hw, .5)) { Skipped++; continue; }
            var b = P(q.X, H(q.X, q.Z), q.Z);
            posts.Prism(b, .07f, 1.05f); caps.Prism(b + Vector3.up * .85f, .075f, .2f); Posts++;
          }
        }
        next = 0;
        for (int i = 0; i < count; i++)
        {
          double k = g.Curvature(g.S[i]); if (Math.Abs(k) < ChevronCurvature || g.S[i] < next) continue;
          // TS eğrilik işareti ofset ekseniyle ters: virajın dışı −k yönünde.
          int outside = k > 0 ? -1 : 1; var q = g.AtTrack(i, outside * boardOff);
          if (!Clear(world, q.X, q.Z, hw, .9)) { Skipped++; continue; }
          next = g.S[i] + ChevronSpacing;
          double y = H(q.X, q.Z) + 1.1;
          var t = new Vector3(-(float)g.Tx[i], 0, (float)g.Tz[i]).normalized; var across = Vector3.Cross(Vector3.up, t);
          var c = P(q.X, y, q.Z); Vector3 a = c - across * .6f - Vector3.up * .45f, bb = c + across * .6f - Vector3.up * .45f, cc = c + across * .6f + Vector3.up * .45f, d = c - across * .6f + Vector3.up * .45f;
          // Yaklaşan araca bakan yüz (−t); ok virajın yönünü gösterir. Arkası koyu düz yüz.
          boards.Quad(a, bb, cc, d, -t, outside < 0); Chevrons++;
          backs.Facing(a, bb, cc, t); backs.Facing(a, cc, d, t);
          backs.Prism(P(q.X, y - 1.1, q.Z) + t * .03f, .04f, .65f);
        }
        Part("Kenar direği", posts, Mat(new Color(.92f, .92f, .9f), 1));
        Part("Direk yansıtıcı", caps, Mat(Hex(0xd8323a), .35f));
        Part("Viraj levhası", boards, Mat(Color.white, .55f, Chevron()));
        Part("Levha arkası ve ayağı", backs, Mat(Hex(0x3a3d40), 1));
      }
      finally { world.Hint = hint; }
    }
  }
}
