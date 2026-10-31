using System;
using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Prototype
{
  // Geçici primitive pist görseli (nihai tasarım değil). Bütün yükseklikler sürüşte kullanılan TrackWorld sorgularından:
  // arazi = TS Hb (pist kenarında TS'deki gibi 0,3 m alçaltılmış), asfalt şerit ve kerbler = Hb + kerb kesiti.
  // Görsel yalnız çizer; simülasyona geri besleme yok.
  public sealed class RaceTrackVisuals : MonoBehaviour
  {
    [SerializeField] private Material asphalt, grass, kerbRed, kerbWhite, line, board;
    public int Vertices { get; private set; }

    public void Configure(Material asphalt, Material grass, Material kerbRed, Material kerbWhite, Material line, Material board)
    { this.asphalt = asphalt; this.grass = grass; this.kerbRed = kerbRed; this.kerbWhite = kerbWhite; this.line = line; this.board = board; }

    private sealed class Builder
    {
      public readonly List<Vector3> V = new List<Vector3>(); public readonly List<int> T = new List<int>();
      public int Add(double x, double y, double z) { V.Add(GtPresentation.Position(new BodyVector(x, y, z))); return V.Count - 1; }
      // Yüzler yukarı baksın: fizik xz düzleminde saat yönünün tersi (sunumdaki x aynası TerrainCourseMesh ile aynı).
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
      var go = new GameObject(name, typeof(MeshFilter), typeof(MeshRenderer)); go.transform.SetParent(transform, false);
      go.GetComponent<MeshFilter>().sharedMesh = b.Mesh(name); go.GetComponent<MeshRenderer>().sharedMaterial = material; Vertices += b.V.Count;
    }

    public void Build(TrackDefinition track)
    {
      foreach (Transform child in transform) Destroy(child.gameObject);
      Vertices = 0;
      var world = new TrackWorld(track); var g = track.Geometry; var layout = track.Layout; double hw = g.HalfWidth, kw = TrackGeometry.KerbWidth;
      // Arazi ızgarası: bölge kutusu (TS bbox 150), en çok ~60 bin köşe.
      var box = g.Bounds(150); double w = box.MaxX - box.MinX, d = box.MaxZ - box.MinZ;
      double step = Math.Max(4, Math.Ceiling(Math.Sqrt(w * d / 60000)));
      int nx = (int)Math.Ceiling(w / step), nz = (int)Math.Ceiling(d / step);
      var ground = new Builder(); var grid = new int[nx + 1, nz + 1];
      for (int i = 0; i <= nx; i++)
        for (int j = 0; j <= nz; j++)
        {
          double x = Math.Min(box.MaxX - 0.01, box.MinX + 0.01 + i * step), z = Math.Min(box.MaxZ - 0.01, box.MinZ + 0.01 + j * step);
          double dist = g.GridNearest(x, z).Distance;
          grid[i, j] = ground.Add(x, world.BaseHeight(x, z) - 0.3 * (1 - TrackGeometry.Smooth(hw + kw, hw + kw + 4, dist)), z);
        }
      for (int i = 0; i < nx; i++) for (int j = 0; j < nz; j++) { ground.Tri(grid[i, j], grid[i + 1, j], grid[i, j + 1]); ground.Tri(grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]); }
      Part("Arazi · TS Hb", ground, grass);
      // Asfalt şerit ve kerbler pist noktalarıyla.
      int count = g.Open ? g.N - 1 : g.N;
      var road = new Builder(); var red = new Builder(); var white = new Builder();
      (double X, double Z) At(int i, double o) => g.AtTrack(i % g.N, o);
      double H(double x, double z) { world.Hint = g.Nearest(x, z, world.Hint).Index; return world.BaseHeight(x, z) + world.KerbHeight(x, z); }
      void Strip(Builder b, int i, double o0, double o1, double lift)
      {
        var a0 = At(i, o0); var a1 = At(i, o1); var b0 = At(i + 1, o0); var b1 = At(i + 1, o1);
        int p = b.Add(a0.X, H(a0.X, a0.Z) + lift, a0.Z), q = b.Add(a1.X, H(a1.X, a1.Z) + lift, a1.Z), r = b.Add(b0.X, H(b0.X, b0.Z) + lift, b0.Z), s = b.Add(b1.X, H(b1.X, b1.Z) + lift, b1.Z);
        b.Tri(p, q, r); b.Tri(q, s, r);
      }
      for (int i = 0; i < count; i++)
      {
        Strip(road, i, -hw, hw, 0.02);
        if (layout.Kerbs.Length > 0 && layout.Kerbs[i])
          foreach (int side in new[] { -1, 1 }) Strip((i / 2) % 2 == 0 ? red : white, i, side * hw, side * (hw + kw), 0.03);
      }
      Part("Asfalt şerit", road, asphalt); if (red.V.Count > 0) { Part("Kerb kırmızı", red, kerbRed); Part("Kerb beyaz", white, kerbWhite); }
      // Bitiş/başlangıç çizgisi (pist noktası 0) ve fren tabelaları.
      var finish = new Builder(); Strip(finish, 0, -hw, hw, 0.05); Part("Başlangıç / bitiş çizgisi", finish, line);
      foreach (int i in layout.BrakeBoards)
      {
        var p = At(i, -(hw + kw + 3)); var cube = GameObject.CreatePrimitive(PrimitiveType.Cube); cube.name = "Fren tabelası " + i;
        Destroy(cube.GetComponent<Collider>()); cube.transform.SetParent(transform, false);
        cube.transform.localPosition = GtPresentation.Position(new BodyVector(p.X, world.BaseHeight(p.X, p.Z) + 1, p.Z)); cube.transform.localScale = new Vector3(0.3f, 2, 1.4f);
        cube.GetComponent<MeshRenderer>().sharedMaterial = board;
      }
    }
  }
}
