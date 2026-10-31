using System;
using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Prototype
{
  // Geçici primitive pist görseli (nihai tasarım değil). Bütün yükseklik ve yüzeyler sürüşte kullanılan TrackWorld
  // sorgularından: arazi ızgarası (TS H; asfalt pistte kenarda 0,3 m alçaltılmış), yol şeridi yüzey türüne göre (asfalt,
  // toprak, kar, çamur), kerbler, su birikintileri, başlangıç/bitiş çizgisi, fren tabelaları. Simülasyona geri besleme yok.
  public sealed class RaceTrackVisuals : MonoBehaviour
  {
    [SerializeField] private Material asphalt, grass, kerbRed, kerbWhite, line, board, dirt, snow, mud, water;
    public int Vertices { get; private set; }
    public string Built { get; private set; } = "";

    public void Configure(Material asphalt, Material grass, Material kerbRed, Material kerbWhite, Material line, Material board,
      Material dirt, Material snow, Material mud, Material water)
    {
      this.asphalt = asphalt; this.grass = grass; this.kerbRed = kerbRed; this.kerbWhite = kerbWhite; this.line = line; this.board = board;
      this.dirt = dirt; this.snow = snow; this.mud = mud; this.water = water;
    }

    private sealed class Builder
    {
      public readonly List<Vector3> V = new List<Vector3>(); public readonly List<int> T = new List<int>();
      public int Add(double x, double y, double z) { V.Add(GtPresentation.Position(new BodyVector(x, y, z))); return V.Count - 1; }
      // Yüzler yukarı baksın (sunumdaki x aynası TerrainCourseMesh ile aynı).
      public void Tri(int a, int b, int c)
      {
        Vector3 A = V[a], B = V[b], C = V[c];
        double cross = (-(B.x - A.x)) * (C.z - A.z) - (B.z - A.z) * (-(C.x - A.x));
        if (cross >= 0) T.AddRange(new[] { a, b, c }); else T.AddRange(new[] { a, c, b });
      }
      public Mesh Mesh(string name)
      {
        var m = new Mesh { name = name, indexFormat = V.Count > 65000 ? UnityEngine.Rendering.IndexFormat.UInt32 : UnityEngine.Rendering.IndexFormat.UInt16 };
        m.SetVertices(V); m.SetTriangles(T, 0); m.RecalculateNormals(); m.RecalculateBounds(); return m;
      }
    }

    private void Part(string name, Builder b, Material material)
    {
      if (b.V.Count == 0) return;
      var go = new GameObject(name, typeof(MeshFilter), typeof(MeshRenderer)); go.transform.SetParent(transform, false);
      go.GetComponent<MeshFilter>().sharedMesh = b.Mesh(name); go.GetComponent<MeshRenderer>().sharedMaterial = material; Vertices += b.V.Count;
    }

    public void Build(TrackDefinition track)
    {
      for (int i = transform.childCount - 1; i >= 0; i--) { var c = transform.GetChild(i).gameObject; if (Application.isPlaying) Destroy(c); else DestroyImmediate(c); }
      Vertices = 0; Built = track.Key;
      // Ayrı dünya: görsel sorgular sürüşteki pist ipucunu değiştirmez.
      var world = new TrackWorld(track); var g = track.Geometry; var layout = track.Layout; double hw = g.HalfWidth, kw = TrackGeometry.KerbWidth;
      bool tarmac = track.Type == "gp" || track.Type == "dp";
      // Arazi ızgarası: TS bölge kutusu, en çok ~60 bin köşe.
      var box = world.Region; double w = box.MaxX - box.MinX, d = box.MaxZ - box.MinZ;
      double step = Math.Max(3, Math.Ceiling(Math.Sqrt(w * d / 60000)));
      int nx = (int)Math.Ceiling(w / step), nz = (int)Math.Ceiling(d / step);
      var ground = new Builder(); var grid = new int[nx + 1, nz + 1];
      for (int i = 0; i <= nx; i++)
        for (int j = 0; j <= nz; j++)
        {
          double x = Math.Min(box.MaxX - 0.01, box.MinX + 0.01 + i * step), z = Math.Min(box.MaxZ - 0.01, box.MinZ + 0.01 + j * step);
          double y = tarmac ? world.BaseHeight(x, z) - 0.3 * (1 - TrackGeometry.Smooth(hw + kw, hw + kw + 4, g.GridNearest(x, z).Distance)) : world.Height(x, z) - 0.15;
          grid[i, j] = ground.Add(x, y, z);
        }
      for (int i = 0; i < nx; i++) for (int j = 0; j < nz; j++) { ground.Tri(grid[i, j], grid[i + 1, j], grid[i, j + 1]); ground.Tri(grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]); }
      Part("Arazi · TS H", ground, track.Raw["snow"].N() != 0 ? snow : grass);
      // Yol şeridi: her parça ortasındaki TS yüzeyine göre.
      int count = g.Open ? g.N - 1 : g.N;
      var roads = new Dictionary<int, Builder>(); var red = new Builder(); var white = new Builder();
      (double X, double Z) At(int i, double o) => g.AtTrack(i % g.N, o);
      double H(double x, double z) { world.Hint = g.Nearest(x, z, world.Hint).Index; return world.Height(x, z); }
      void Strip(Builder b, int i, double o0, double o1, double lift)
      {
        var a0 = At(i, o0); var a1 = At(i, o1); var b0 = At(i + 1, o0); var b1 = At(i + 1, o1);
        int p = b.Add(a0.X, H(a0.X, a0.Z) + lift, a0.Z), q = b.Add(a1.X, H(a1.X, a1.Z) + lift, a1.Z), r = b.Add(b0.X, H(b0.X, b0.Z) + lift, b0.Z), s = b.Add(b1.X, H(b1.X, b1.Z) + lift, b1.Z);
        b.Tri(p, q, r); b.Tri(q, s, r);
      }
      for (int i = 0; i < count; i++)
      {
        var m = At(i, 0); var n = At(i + 1, 0); int surface = world.Surface((m.X + n.X) / 2, (m.Z + n.Z) / 2);
        if (!roads.TryGetValue(surface, out var b)) roads[surface] = b = new Builder();
        Strip(b, i, -hw, hw, 0.03);
        if (layout.Kerbs.Length > 0 && layout.Kerbs[i])
          foreach (int side in new[] { -1, 1 }) Strip((i / 2) % 2 == 0 ? red : white, i, side * hw, side * (hw + kw), 0.04);
      }
      foreach (var r in roads) Part("Yol · " + VehicleGround.Name(r.Key), r.Value, r.Key == 1 ? asphalt : r.Key == 3 ? mud : r.Key == 4 || r.Key == 5 ? snow : r.Key == 2 ? grass : dirt);
      Part("Kerb kırmızı", red, kerbRed); Part("Kerb beyaz", white, kerbWhite);
      // Su birikintileri (TS çarpışma nesnesi): daire.
      var puddles = new Builder();
      foreach (var p in layout.Water)
      {
        int c = puddles.Add(p.X, H(p.X, p.Z) + 0.06, p.Z);
        for (int k = 0; k < 24; k++)
        {
          double a0 = k * Math.PI / 12, a1 = (k + 1) * Math.PI / 12;
          int e0 = puddles.Add(p.X + Math.Cos(a0) * p.Radius, H(p.X, p.Z) + 0.06, p.Z + Math.Sin(a0) * p.Radius);
          int e1 = puddles.Add(p.X + Math.Cos(a1) * p.Radius, H(p.X, p.Z) + 0.06, p.Z + Math.Sin(a1) * p.Radius);
          puddles.Tri(c, e0, e1);
        }
      }
      Part("Su birikintileri", puddles, water);
      // Başlangıç/bitiş: kapalı pistte nokta 0; açık pistte başlangıç ve son nokta.
      var finish = new Builder(); Strip(finish, 0, -hw, hw, 0.06); if (g.Open) Strip(finish, g.N - 2, -hw, hw, 0.06);
      Part("Başlangıç / bitiş çizgisi", finish, line);
      foreach (int i in layout.BrakeBoards)
      {
        var p = At(i, -(hw + kw + 3)); var cube = GameObject.CreatePrimitive(PrimitiveType.Cube); cube.name = "Fren tabelası " + i;
        var col = cube.GetComponent<Collider>(); if (Application.isPlaying) Destroy(col); else DestroyImmediate(col);
        cube.transform.SetParent(transform, false);
        cube.transform.localPosition = GtPresentation.Position(new BodyVector(p.X, world.BaseHeight(p.X, p.Z) + 1, p.Z)); cube.transform.localScale = new Vector3(0.3f, 2, 1.4f);
        cube.GetComponent<MeshRenderer>().sharedMaterial = board;
      }
    }
  }
}
