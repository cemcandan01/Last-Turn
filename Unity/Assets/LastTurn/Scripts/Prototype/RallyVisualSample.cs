using System;
using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;
using UnityEngine.Rendering;

namespace LastTurn.Prototype
{
  // İlk oyun içi görsel örnek (Cem'in değerlendirmesi için; bütün oyuna yayılmadı): yalnız rl_2 Orman Etabı, öğle/güneşli koşul.
  // Temel TS 0.8.18 "day" teması ve orman etabı çizimi (temalar.ts, kurucu.ts, bolgeler.ts): gökyüzü/sis 140–900 m, yarımküre
  // ışığı, güneş, benekli çim dokusu, 3 parçada bir koyulaşan toprak yol bantları, gövde+koni ağaç, çok yüzlü kaya/çalı.
  // Okunabilirlik önerileri (TS'de yok): yol kenarı direkleri, keskin virajda ok levhaları, aracın altında temas gölgesi.
  // Hepsi çarpışmasız görsel; fizik zemini, collider, yol genişliği, kesme sınırı ve engel yerleri değişmez.
  public sealed class RallyVisualSample : MonoBehaviour
  {
    public const string TrackKey = "rl_2";
    /// Önce/sonra doğrulaması için kapatılabilir; açıkken yalnız rl_2'de ve öğle/güneşte uygulanır.
    public static bool Enabled = true;
    public static bool AppliesTo(string key, RaceConditions c, bool mutant) => Enabled && !mutant && key == TrackKey && c != null && c.TimeOfDay == "noon" && c.Weather == "sun" && !c.Night;

    private readonly List<UnityEngine.Object> owned = new List<UnityEngine.Object>();
    private readonly List<(Renderer R, Material M)> replaced = new List<(Renderer, Material)>();
    private readonly List<GameObject> hidden = new List<GameObject>();
    private (bool Fog, FogMode Mode, Color FogColor, float Start, float End, AmbientMode Ambient, Color Sky, Color Equator, Color Ground, Color Background, CameraClearFlags Clear, float Far) saved;
    private Light sun; private (Quaternion Rot, Color Color, float Intensity) savedSun;
    private Transform shadow; private GtPrototype owner; private Camera view;
    public int Posts { get; private set; }
    public int Chevrons { get; private set; }
    public int Trees { get; private set; }
    public int Rocks { get; private set; }

    private static Color Hex(int rgb) => new Color(((rgb >> 16) & 255) / 255f, ((rgb >> 8) & 255) / 255f, (rgb & 255) / 255f);
    private static Color Html(string s) => ColorUtility.TryParseHtmlString(s, out var c) ? c : Color.magenta;

    public static RallyVisualSample Apply(GtPrototype prototype, RaceTrackVisuals track, PhysicalWorldVisuals environment, TrackWorld world, Camera camera)
    {
      var s = prototype.gameObject.AddComponent<RallyVisualSample>(); s.owner = prototype; s.view = camera;
      s.Build(track, environment, world); return s;
    }
    public void Remove() { Restore(); Destroy(this); }
    private void OnDestroy() => Restore();
    private bool restored;
    private void Restore()
    {
      if (restored) return; restored = true;
      RenderSettings.fog = saved.Fog; RenderSettings.fogMode = saved.Mode; RenderSettings.fogColor = saved.FogColor; RenderSettings.fogStartDistance = saved.Start; RenderSettings.fogEndDistance = saved.End;
      RenderSettings.ambientMode = saved.Ambient; RenderSettings.ambientSkyColor = saved.Sky; RenderSettings.ambientEquatorColor = saved.Equator; RenderSettings.ambientGroundColor = saved.Ground;
      if (view) { view.backgroundColor = saved.Background; view.clearFlags = saved.Clear; view.farClipPlane = saved.Far; }
      if (sun) { sun.transform.rotation = savedSun.Rot; sun.color = savedSun.Color; sun.intensity = savedSun.Intensity; }
      foreach (var (r, m) in replaced) if (r) r.sharedMaterial = m;
      foreach (var g in hidden) if (g) g.SetActive(true);
      foreach (var o in owned) if (o) Destroy(o);
      owned.Clear(); replaced.Clear(); hidden.Clear();
    }

    private T Own<T>(T o) where T : UnityEngine.Object { owned.Add(o); return o; }
    private Material Mat(Color c, Texture2D tex = null, Vector2? scale = null, string shader = "Standard")
    {
      var m = Own(new Material(Shader.Find(shader)) { color = c }); if (tex) { m.mainTexture = tex; m.mainTextureScale = scale ?? Vector2.one; }
      if (shader == "Standard") { m.SetFloat("_Glossiness", .08f); m.SetFloat("_Metallic", 0); }
      return m;
    }

    // ---------- dokular (TS ctex: zemin rengi + 1400 benek; burada sabit tohumlu)
    private Texture2D Speckle(string b, string c1, string c2, int seed)
    {
      var t = Own(new Texture2D(256, 256, TextureFormat.RGBA32, true) { wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear, anisoLevel = 4 });
      var px = new Color[256 * 256]; var bc = Html(b); for (int i = 0; i < px.Length; i++) px[i] = bc;
      var r = new System.Random(seed); Color A = Html(c1), B = Html(c2);
      for (int k = 0; k < 1400; k++)
      {
        var c = r.NextDouble() < .5 ? A : B; int x0 = r.Next(256), y0 = r.Next(256), w = 2 + r.Next(5), h = 2 + r.Next(5);
        for (int y = y0; y < y0 + h; y++) for (int x = x0; x < x0 + w; x++) px[(y & 255) * 256 + (x & 255)] = c;
      }
      t.SetPixels(px); t.Apply(true); return t;
    }
    /// Toprak yol: boyuna 6 parçalık döngünün yarısı 0x8c6b45, yarısı 0x86663f (TS dirtCol), hafif benek ve iki tekerlek izi.
    private Texture2D Dirt()
    {
      var t = Own(new Texture2D(128, 256, TextureFormat.RGBA32, true) { wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear, anisoLevel = 8 });
      var r = new System.Random(19); Color a = Hex(0x8c6b45), b = Hex(0x86663f); var px = new Color[128 * 256];
      for (int y = 0; y < 256; y++) for (int x = 0; x < 128; x++)
        {
          float u = x / 127f; var c = y < 128 ? a : b;
          float rut = Mathf.Exp(-Mathf.Pow((u - .3f) / .045f, 2)) + Mathf.Exp(-Mathf.Pow((u - .7f) / .045f, 2));
          float edge = Mathf.SmoothStep(0, 1, Mathf.Min(u, 1 - u) / .06f);
          c = Color.Lerp(c, c * .82f, rut * .5f); c = Color.Lerp(c * .88f, c, edge);
          float n = (float)r.NextDouble(); if (n > .93f) c *= .9f; else if (n < .05f) c = Color.Lerp(c, Hex(0xa58560), .5f);
          c.a = 1; px[y * 128 + x] = c;
        }
      t.SetPixels(px); t.Apply(true); return t;
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
    private Texture2D Blob()
    {
      var t = Own(new Texture2D(64, 64, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp }); var px = new Color[64 * 64];
      for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++) { float dx = (x - 31.5f) / 31.5f, dy = (y - 31.5f) / 31.5f, d = Mathf.Sqrt(dx * dx + dy * dy); px[y * 64 + x] = new Color(0, 0, 0, Mathf.Clamp01(1 - d) * Mathf.Clamp01(1 - d) * .75f); }
      t.SetPixels(px); t.Apply(false); return t;
    }

    // ---------- geometri
    private sealed class Mesher
    {
      public readonly List<Vector3> V = new List<Vector3>(); public readonly List<Vector3> N = new List<Vector3>(); public readonly List<Vector2> U = new List<Vector2>(); public readonly List<int> T = new List<int>();
      public void Tri(Vector3 a, Vector3 b, Vector3 c, Vector2 ua = default, Vector2 ub = default, Vector2 uc = default)
      {
        var n = Vector3.Cross(b - a, c - a).normalized;
        int i = V.Count; V.Add(a); V.Add(b); V.Add(c); N.Add(n); N.Add(n); N.Add(n); U.Add(ua); U.Add(ub); U.Add(uc); T.Add(i); T.Add(i + 1); T.Add(i + 2);
      }
      /// Ön yüz dir yönüne bakar (Unity: ön yüzde saat yönü, Cross(b-a,c-a) izleyiciye doğru).
      public void Facing(Vector3 a, Vector3 b, Vector3 c, Vector3 dir, Vector2 ua = default, Vector2 ub = default, Vector2 uc = default)
      { if (Vector3.Dot(Vector3.Cross(b - a, c - a), dir) >= 0) Tri(a, b, c, ua, ub, uc); else Tri(a, c, b, ua, uc, ub); }
      /// a sol-alt, b sağ-alt, c sağ-üst, d sol-üst (bakana göre); flip dokuyu yatay çevirir.
      public void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector3 dir, bool flip = false)
      {
        Vector2 A = new Vector2(flip ? 1 : 0, 0), B = new Vector2(flip ? 0 : 1, 0), C = new Vector2(flip ? 0 : 1, 1), D = new Vector2(flip ? 1 : 0, 1);
        Facing(a, b, c, dir, A, B, C); Facing(a, c, d, dir, A, C, D);
      }
      public Mesh Build(string name) { var m = new Mesh { name = name, indexFormat = IndexFormat.UInt32 }; m.SetVertices(V); m.SetNormals(N); m.SetUVs(0, U); m.SetTriangles(T, 0); m.RecalculateBounds(); return m; }
    }
    private void Part(string name, Mesher m, Material mat, bool shadows = true)
    {
      if (m.V.Count == 0) return;
      var go = Own(new GameObject(name, typeof(MeshFilter), typeof(MeshRenderer))); go.transform.SetParent(transform, false);
      go.GetComponent<MeshFilter>().sharedMesh = Own(m.Build(name)); var r = go.GetComponent<MeshRenderer>(); r.sharedMaterial = mat;
      r.shadowCastingMode = shadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
    }
    private static Vector3 P(double x, double y, double z) => GtPresentation.Position(new BodyVector(x, y, z));
    // Konik/silindir (yan yüzler; taban yok), dodekahedron.
    private static void Cone(Mesher m, Vector3 c, float r0, float r1, float h, int sides, float yaw)
    {
      for (int k = 0; k < sides; k++)
      {
        float a0 = yaw + k * Mathf.PI * 2 / sides, a1 = yaw + (k + 1) * Mathf.PI * 2 / sides;
        Vector3 d0 = new Vector3(Mathf.Cos(a0), 0, Mathf.Sin(a0)), d1 = new Vector3(Mathf.Cos(a1), 0, Mathf.Sin(a1));
        Vector3 b0 = c + d0 * r0, b1 = c + d1 * r0, t0 = c + Vector3.up * h + d0 * r1, t1 = c + Vector3.up * h + d1 * r1;
        var o = (d0 + d1).normalized;
        if (r1 <= 0.001f) m.Facing(b1, b0, c + Vector3.up * h, o + Vector3.up * (r0 / h)); else { m.Facing(b1, b0, t0, o); m.Facing(b1, t0, t1, o); }
      }
    }
    private static readonly Vector3[] DodecaV;
    private static readonly int[][] DodecaF;
    static RallyVisualSample()
    {
      float p = (1 + Mathf.Sqrt(5)) / 2, q = 1 / p; var v = new List<Vector3>();
      foreach (int a in new[] { -1, 1 }) foreach (int b in new[] { -1, 1 }) foreach (int c in new[] { -1, 1 }) v.Add(new Vector3(a, b, c));
      foreach (int a in new[] { -1, 1 }) foreach (int b in new[] { -1, 1 }) { v.Add(new Vector3(0, a * q, b * p)); v.Add(new Vector3(a * q, b * p, 0)); v.Add(new Vector3(a * p, 0, b * q)); }
      for (int i = 0; i < v.Count; i++) v[i] = v[i].normalized; DodecaV = v.ToArray();
      // Yüzler: her yüzün merkezi bir ikosahedron köşesi yönünde; en yakın 5 köşe açıya göre sıralanır.
      var faces = new List<int[]>(); var ico = new List<Vector3>();
      foreach (int a in new[] { -1, 1 }) foreach (int b in new[] { -1, 1 }) { ico.Add(new Vector3(0, a, b * p).normalized); ico.Add(new Vector3(a, b * p, 0).normalized); ico.Add(new Vector3(b * p, 0, a).normalized); }
      foreach (var n in ico)
      {
        var idx = new List<int>(); for (int i = 0; i < DodecaV.Length; i++) idx.Add(i);
        idx.Sort((x, y) => Vector3.Dot(DodecaV[y], n).CompareTo(Vector3.Dot(DodecaV[x], n)));
        var five = idx.GetRange(0, 5); var t1 = Vector3.Cross(n, Mathf.Abs(n.y) < .9f ? Vector3.up : Vector3.right).normalized; var t2 = Vector3.Cross(n, t1);
        five.Sort((x, y) => Mathf.Atan2(Vector3.Dot(DodecaV[x], t2), Vector3.Dot(DodecaV[x], t1)).CompareTo(Mathf.Atan2(Vector3.Dot(DodecaV[y], t2), Vector3.Dot(DodecaV[y], t1))));
        faces.Add(five.ToArray());
      }
      DodecaF = faces.ToArray();
    }
    private static void Dodeca(Mesher m, Vector3 c, float r, float sy, float yaw)
    {
      var rot = Quaternion.Euler(0, yaw * Mathf.Rad2Deg, 0);
      Vector3 W(int i) { var p = rot * DodecaV[i]; return c + new Vector3(p.x * r, p.y * r * sy, p.z * r); }
      foreach (var f in DodecaF)
      {
        var a = W(f[0]); for (int k = 1; k < 4; k++) m.Facing(a, W(f[k]), W(f[k + 1]), a - c);
      }
    }
    private static float Hash(double x, double z, int salt) { unchecked { uint h = (uint)(Math.Floor(x * 7.31) * 73856093) ^ (uint)(Math.Floor(z * 5.17) * 19349663) ^ (uint)(salt * 83492791); h ^= h >> 13; h *= 0x5bd1e995; h ^= h >> 15; return (h & 0xffffff) / (float)0x1000000; } }

    private void Build(RaceTrackVisuals track, PhysicalWorldVisuals environment, TrackWorld world)
    {
      // Işık, gök, sis (TS TH0 day: sky 0x9fd0e8, fog 140–900, hemi beyaz/0x7a6a50 0,8, güneş 0xfff1d6 0,9; ISIK=π → Unity ölçeği).
      saved = (RenderSettings.fog, RenderSettings.fogMode, RenderSettings.fogColor, RenderSettings.fogStartDistance, RenderSettings.fogEndDistance, RenderSettings.ambientMode,
        RenderSettings.ambientSkyColor, RenderSettings.ambientEquatorColor, RenderSettings.ambientGroundColor, view ? view.backgroundColor : Color.black, view ? view.clearFlags : CameraClearFlags.SolidColor, view ? view.farClipPlane : 600);
      Color sky = Hex(0x9fd0e8);
      RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear; RenderSettings.fogColor = sky; RenderSettings.fogStartDistance = 140; RenderSettings.fogEndDistance = 900;
      RenderSettings.ambientMode = AmbientMode.Trilight; RenderSettings.ambientSkyColor = new Color(.8f, .82f, .85f); RenderSettings.ambientEquatorColor = new Color(.55f, .53f, .48f); RenderSettings.ambientGroundColor = Hex(0x7a6a50) * .8f;
      if (view) { view.clearFlags = CameraClearFlags.SolidColor; view.backgroundColor = sky; view.farClipPlane = 900; }
      foreach (var l in FindObjectsByType<Light>(FindObjectsSortMode.None)) if (l.type == LightType.Directional) { sun = l; break; }
      if (sun)
      {
        savedSun = (sun.transform.rotation, sun.color, sun.intensity);
        sun.transform.rotation = Quaternion.LookRotation(-P(60, 120, 40).normalized); sun.color = Hex(0xfff1d6); sun.intensity = 1.1f;
      }
      // Zemin ve yol malzemeleri (geometri aynı; yalnız doku/renk).
      var grass = Mat(Color.white, Speckle("#3f7a3a", "#376d33", "#4a8743", 7));
      var dirt = Mat(Color.white, Dirt());
      foreach (Transform c in track.transform)
      {
        var r = c.GetComponent<MeshRenderer>(); if (!r) continue;
        if (c.name.StartsWith("Arazi")) { replaced.Add((r, r.sharedMaterial)); r.sharedMaterial = grass; }
        else if (c.name.StartsWith("Yol") && !c.name.Contains("Çamur") && !c.name.Contains("Çim")) { replaced.Add((r, r.sharedMaterial)); r.sharedMaterial = dirt; }
      }
      var g = world.Track.Geometry; double hw = g.HalfWidth;
      double H(double x, double z) { world.Hint = g.Nearest(x, z, world.Hint).Index; return world.Height(x, z); }

      // Çevre nesneleri: aynı konum ve çarpışma yarıçapında TS biçimleri (r=0,9 ağaç; diğer "solid" kaya; çalı).
      if (environment)
      {
        var region = world.Environment; var trunks = new Mesher(); var leaves = new Mesher(); var rocks = new Mesher(); var bushes = new Mesher();
        foreach (var o in region.Objects)
        {
          double y = world.Height(o.X, o.Z); var c = P(o.X, y, o.Z); float yaw = Hash(o.X, o.Z, 1) * 6.28f;
          if (o.Type == "solid" && Math.Abs(o.Radius - .9) < 1e-6) { float s = .8f + Hash(o.X, o.Z, 2) * .8f; Cone(trunks, c, .7f, .5f, 3, 6, yaw); Cone(leaves, c + Vector3.up * (7 - 4.5f * s), 3 * s, 0, 9 * s, 7, yaw); Trees++; }
          else if (o.Type == "solid") { float s = (float)o.Radius / 1.3f; Dodeca(rocks, c + Vector3.up * .5f, 1.6f * s, .7f, yaw); Rocks++; }
          else if (o.Type == "bush") { float s = (float)o.Radius / 1.6f; Dodeca(bushes, c + Vector3.up * .5f, 1.4f * s, .6f, yaw); }
        }
        foreach (Transform child in environment.transform)
          foreach (Transform part in child) if (part.name == "solid" || part.name == "bush") { hidden.Add(part.gameObject); part.gameObject.SetActive(false); }
        Part("Örnek · ağaç gövdesi", trunks, Mat(Hex(0x5b4430))); Part("Örnek · ağaç yaprak", leaves, Mat(Hex(0x2f6b3a)));
        Part("Örnek · kaya", rocks, Mat(Hex(0x8a8a86))); Part("Örnek · çalı", bushes, Mat(Hex(0x3f7d33)));
      }

      // Öneri: yol kenarı direkleri (20 m'de bir, iki yanda; beyaz gövde, kırmızı yansıtıcı) ve keskin virajın dışında ok levhaları.
      var posts = new Mesher(); var caps = new Mesher(); var boards = new Mesher();
      double next = 0; int count = g.Open ? g.N - 1 : g.N;
      for (int i = 0; i < count; i++)
      {
        if (g.S[i] < next) continue; next = g.S[i] + 20;
        foreach (int side in new[] { -1, 1 })
        {
          var q = g.AtTrack(i, side * (hw + 1.6)); var b = P(q.X, H(q.X, q.Z), q.Z);
          Cone(posts, b, .07f, .07f, 1.05f, 4, .78f); Cone(caps, b + Vector3.up * .85f, .075f, .075f, .2f, 4, .78f); Posts++;
        }
      }
      next = 0;
      for (int i = 0; i < count; i++)
      {
        double k = g.Curvature(g.S[i]); if (Math.Abs(k) < .028 || g.S[i] < next) continue; next = g.S[i] + 9;
        // TS eğrilik işareti ofset ekseniyle ters: virajın dışı −k yönünde.
        int outside = k > 0 ? -1 : 1; var q = g.AtTrack(i, outside * (hw + 3.2)); double y = H(q.X, q.Z) + 1.1;
        var t = new Vector3(-(float)g.Tx[i], 0, (float)g.Tz[i]).normalized; var across = Vector3.Cross(Vector3.up, t);
        var c = P(q.X, y, q.Z); Vector3 a = c - across * .6f - Vector3.up * .45f, bb = c + across * .6f - Vector3.up * .45f, cc = c + across * .6f + Vector3.up * .45f, d = c - across * .6f + Vector3.up * .45f;
        // Yaklaşan araca bakan yüz (−t); ok virajın yönünü gösterir.
        boards.Quad(a, bb, cc, d, -t, outside < 0); Chevrons++;
      }
      Part("Öneri · kenar direği", posts, Mat(new Color(.92f, .92f, .9f)), false); Part("Öneri · direk yansıtıcı", caps, Mat(Hex(0xd8323a)), false);
      Part("Öneri · viraj levhası", boards, Mat(Color.white, Chevron()), false);

      // Öneri: temas gölgesi (araç yerdeyken koyu, havada yükseldikçe solar ve küçülür).
      var blob = GameObject.CreatePrimitive(PrimitiveType.Quad); blob.name = "Öneri · temas gölgesi"; Destroy(blob.GetComponent<Collider>()); Own(blob);
      blob.transform.SetParent(transform, false); var bm = Own(new Material(Shader.Find("Sprites/Default")) { mainTexture = Blob() }); var br = blob.GetComponent<MeshRenderer>(); br.sharedMaterial = bm; br.shadowCastingMode = ShadowCastingMode.Off; br.receiveShadows = false;
      shadow = blob.transform;
    }

    private void LateUpdate()
    {
      if (!shadow || !owner || owner.Simulation == null || owner.RaceWorld == null) return;
      var body = owner.Simulation.Body; var f = body.Orientation.Rotate(new BodyVector(0, 0, 1));
      double ground = owner.RaceWorld.Height(body.Position.X, body.Position.Z), height = Math.Max(0, body.Position.Y - ground - .35);
      float k = Mathf.Clamp01(1 - (float)height / 6), size = Mathf.Lerp(.65f, 1, k);
      shadow.position = P(body.Position.X, ground + .07, body.Position.Z);
      shadow.rotation = Quaternion.LookRotation(Vector3.down, new Vector3((float)-f.X, 0, (float)f.Z)); shadow.localScale = new Vector3(2.3f * size, 4.9f * size, 1);
      var r = shadow.GetComponent<MeshRenderer>(); r.sharedMaterial.color = new Color(1, 1, 1, k);
    }
  }
}
