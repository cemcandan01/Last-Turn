using System;
using System.Linq;

namespace LastTurn.Core
{
  // TS 0.8.18 bölge dünyası (src/dunya/bolgeler.ts mkReg/dragReg + dunya.ts Hw/surfW/regAt), saf C#. Beş tür:
  // - asfalt/drift (gp/dp): pist boyu yükseklik hS × kenara doğru yarıya inen arazi × kutu kenarı sönümü + kerb; asfalt hw+KW içi.
  // - rallikros (rx): rampalar (jumpH); hw+1 dışı çim, çamur, asfalt aralığı, toprak.
  // - ralli (rl): doğal tepeler H0, yol enine merkez çizgisine yaslanır + rampalar; hw+0,8 dışı çim/derin kar, çamur, kar, toprak.
  // - drag (dg): düz; şerit kutusu asfalt, dışı çim.
  // Bölge kutusu dışında yükseklik 0, çim. Her yüzey sorgusu pist ipucunu (ipucu.ti) günceller; fizik adımında son sorgu araç
  // merkezidir, yarış kuralları bu ipucunu kullanır. Su birikintileri TS'de çarpışma nesnesidir (InWater).
  public sealed class TrackWorld : IVehicleWorld, IVehicleWaterWorld
  {
    public readonly TrackDefinition Track;
    public readonly TrackGeometry Geometry;
    private readonly TrackLayout layout;
    private readonly string type;
    private readonly bool[] kerbs;
    private readonly double minX, maxX, minZ, maxZ, hw;
    // gp/dp
    private readonly double amplitude, phase, extraHills;
    // rl
    private readonly double half, hillScale, cx, cz; private readonly double[] ph = new double[3]; private readonly bool snow;
    // dg
    private readonly double dragX, dragZa, dragZb;
    /// TS ipucu.ti: son en yakın pist noktası.
    public int Hint { get; set; }

    public TrackWorld(TrackDefinition track)
    {
      Track = track; Geometry = track.Geometry; layout = track.Layout; type = track.Type; kerbs = layout.Kerbs; hw = Geometry.HalfWidth;
      var raw = track.Raw; cx = track.CenterX; cz = track.CenterZ;
      (minX, maxX, minZ, maxZ) = Geometry.Bounds(150);
      if (type == "gp" || type == "dp") { amplitude = raw["el"].N(); phase = raw["ep"].N(); extraHills = raw["ek"].N(); }
      else if (type == "rl")
      {
        var bb = Geometry.Bounds(0); double ext = Math.Max(bb.MaxX - bb.MinX, bb.MaxZ - bb.MinZ), s = raw["s"].N();
        half = ext / 2 + 130; ph[0] = 1 + s * 2.1; ph[1] = s * 1.3; ph[2] = s * 0.7; hillScale = raw["hs"].IsNumber ? raw["hs"].N() : 1;
        snow = raw["snow"].IsNumber ? raw["snow"].N() != 0 : raw["snow"].B();
        minX = cx - half; maxX = cx + half; minZ = cz - half; maxZ = cz + half;
      }
      else if (type == "dg")
      {
        dragX = cx; dragZa = Geometry.Z[0] - 60; dragZb = Geometry.Z[Geometry.N - 1] + 380;
        minX = dragX - 120; maxX = dragX + 140; minZ = dragZa - 40; maxZ = dragZb + 40;
      }
      else if (type != "rx") throw new NotSupportedException("Pist türü: " + track.Key);
    }

    public double GripMultiplier => 1;
    public bool HasKerbs => kerbs.Length > 0;

    /// TS regAt: kutunun içi (kenarlar hariç).
    public bool InRegion(double x, double z) => x > minX && x < maxX && z > minZ && z < maxZ;
    public (double MinX, double MaxX, double MinZ, double MaxZ) Region => (minX, maxX, minZ, maxZ);

    /// TS hS (gp/dp): pist boyunca konumun (s) yükseklik fonksiyonu.
    public double CenterHeight(double s)
    {
      double u = s / Geometry.Length * 6.2832;
      double t = extraHills != 0 ? 0.25 * Math.Sin(extraHills * u + phase * 2.3) : 0;
      return amplitude * (1 + 0.6 * Math.Sin(u + phase) + 0.4 * Math.Sin(2 * u + phase * 1.7 + 1) + t) / 2;
    }

    private double EdgeFade(double x, double z) => TrackGeometry.Smooth(10, 140, Math.Min(Math.Min(x - minX, maxX - x), Math.Min(z - minZ, maxZ - z)));

    /// TS ralli H0: doğal tepeler, kutu kenarında sönümlü.
    public double Hills(double x, double z)
    {
      double lx = x - cx, lz = z - cz;
      return hillScale * (14 * Math.Sin(lx / 85 + ph[0]) * Math.Cos(lz / 95 + ph[1]) + 8 * Math.Sin((lx - lz) / 60 + ph[2]) + 6 * Math.Cos(lz / 140 + ph[0]))
        * (1 - TrackGeometry.Smooth(half - 80, half - 10, Math.Max(Math.Abs(lx), Math.Abs(lz))));
    }

    /// Rampa/kerb hariç taban yükseklik (TS gp Hb, rl H0 yaslaması; rx/dg 0).
    public double BaseHeight(double x, double z)
    {
      if (type == "gp" || type == "dp")
      {
        if (amplitude == 0) return 0;
        var (i, d) = Geometry.GridNearest(x, z);
        double w = 1 - TrackGeometry.Smooth(hw + TrackGeometry.KerbWidth + 2, hw + 45, d);
        return CenterHeight(Geometry.Project(x, z, i).S) * (0.5 + 0.5 * w) * EdgeFade(x, z);
      }
      if (type == "rl")
      {
        var (i, d) = Geometry.GridNearest(x, z);
        double w = 1 - TrackGeometry.Smooth(hw + 1, hw + 9, d), px = Geometry.X[i], pz = Geometry.Z[i], tx = Geometry.Tx[i], tz = Geometry.Tz[i];
        double s = (x - px) * tx + (z - pz) * tz;
        return Hills(x, z) * (1 - w) + (w > 0 ? Hills(px + tx * s, pz + tz * s) * w : 0);
      }
      return 0;
    }

    public double KerbHeight(double x, double z) => HasKerbs ? Geometry.KerbHeight(kerbs, x, z, Hint) : 0;

    public double Height(double x, double z)
    {
      if (!InRegion(x, z)) return 0;
      switch (type)
      {
        case "gp": case "dp": return BaseHeight(x, z) + KerbHeight(x, z);
        case "rx": return layout.JumpHeight(x, z);
        case "rl": return BaseHeight(x, z) + layout.JumpHeight(x, z);
        default: return 0;
      }
    }

    public int Surface(double x, double z)
    {
      if (!InRegion(x, z)) return 2;
      var (i, d) = Geometry.Nearest(x, z, Hint);
      Hint = i;
      switch (type)
      {
        case "gp": case "dp": return d <= hw + TrackGeometry.KerbWidth ? 1 : 2;
        case "rx": return d > hw + 1 ? 2 : layout.InMud(x, z) ? 3 : layout.Asphalt[i] ? 1 : 0;
        case "rl": return d > hw + 0.8 ? (snow ? 5 : 2) : layout.InMud(x, z) ? 3 : snow ? 4 : 0;
        default: return x > dragX - 7 && x < dragX + 19 && z > dragZa && z < dragZb ? 1 : 2;
      }
    }

    /// TS su birikintisi (çarpışma ızgarasında "water", yalnız rx/rl): referans noktası birikinti yarıçapı içinde mi.
    public int WaterCount(double x, double z)
    {
      int n = 0;
      foreach (var w in layout.Water) { double dd = JsMath.Hypot(x - w.X, z - w.Z); if (dd == 0) dd = 0.01; if (dd < w.Radius) n++; }
      return n;
    }

    /// TS reset(): yeniden doğuşta ipucu tam taramayla.
    public void ResetHint(double x, double z) => Hint = Geometry.Nearest(x, z, 0, true).Index;
  }
}
