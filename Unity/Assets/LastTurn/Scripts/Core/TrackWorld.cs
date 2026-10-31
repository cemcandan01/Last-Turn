using System;

namespace LastTurn.Core
{
  // TS 0.8.18 bölge dünyası (src/dunya/bolgeler.ts mkReg asfalt/drift dalı + dunya.ts Hw/surfW + regAt), saf C#.
  // Yükseklik: pist boyunca yükseklik hS (el/ep/ek) × kenara doğru yarıya inen arazi × bölge kenarı sönümü + kerb kesiti.
  // Yüzey: pistten hw + KW içinde asfalt (1), dışı çim (2); bölge kutusu dışında yükseklik 0, çim.
  // TS'deki gibi her yüzey sorgusu pist ipucunu (ipucu.ti) günceller; fizik adımında son sorgu araç merkezidir, yarış
  // kuralları bu ipucunu kullanır. Kerb yüksekliği ipucunu okur. Rallikros/ralli/drag bölgeleri ayrı dünyadır (henüz yok).
  public sealed class TrackWorld : IVehicleWorld
  {
    public readonly TrackDefinition Track;
    public readonly TrackGeometry Geometry;
    private readonly bool[] kerbs;
    private readonly double minX, maxX, minZ, maxZ, amplitude, phase, extraHills, hw;
    /// TS ipucu.ti: son en yakın pist noktası.
    public int Hint { get; set; }

    public TrackWorld(TrackDefinition track)
    {
      if (track.Type != "gp" && track.Type != "dp") throw new NotSupportedException("Pist dünyası şimdilik yalnız asfalt/drift bölgeleri: " + track.Key);
      Track = track; Geometry = track.Geometry; kerbs = track.Layout.Kerbs; hw = Geometry.HalfWidth;
      (minX, maxX, minZ, maxZ) = Geometry.Bounds(150);
      amplitude = track.Raw["el"].N(); phase = track.Raw["ep"].N(); extraHills = track.Raw["ek"].N();
    }

    public double GripMultiplier => 1;

    /// TS regAt: kutunun içi (kenarlar hariç).
    public bool InRegion(double x, double z) => x > minX && x < maxX && z > minZ && z < maxZ;

    /// TS hS: pist boyunca konumun (s) yükseklik fonksiyonu; kapalı pistte başı sonuna bağlanır.
    public double CenterHeight(double s)
    {
      double u = s / Geometry.Length * 6.2832;
      double t = extraHills != 0 ? 0.25 * Math.Sin(extraHills * u + phase * 2.3) : 0;
      return amplitude * (1 + 0.6 * Math.Sin(u + phase) + 0.4 * Math.Sin(2 * u + phase * 1.7 + 1) + t) / 2;
    }

    private double EdgeFade(double x, double z) => TrackGeometry.Smooth(10, 140, Math.Min(Math.Min(x - minX, maxX - x), Math.Min(z - minZ, maxZ - z)));

    /// TS Hb: arazi tabanı (kerbsiz).
    public double BaseHeight(double x, double z)
    {
      if (amplitude == 0) return 0;
      var (i, d) = Geometry.GridNearest(x, z);
      double w = 1 - TrackGeometry.Smooth(hw + TrackGeometry.KerbWidth + 2, hw + 45, d);
      return CenterHeight(Geometry.Project(x, z, i).S) * (0.5 + 0.5 * w) * EdgeFade(x, z);
    }

    public double KerbHeight(double x, double z) => Geometry.KerbHeight(kerbs, x, z, Hint);

    public double Height(double x, double z) => InRegion(x, z) ? BaseHeight(x, z) + KerbHeight(x, z) : 0;

    public int Surface(double x, double z)
    {
      if (!InRegion(x, z)) return 2;
      var (i, d) = Geometry.Nearest(x, z, Hint);
      Hint = i;
      return d <= hw + TrackGeometry.KerbWidth ? 1 : 2;
    }

    /// TS reset(): yeniden doğuşta ipucu tam taramayla.
    public void ResetHint(double x, double z) => Hint = Geometry.Nearest(x, z, 0, true).Index;
  }
}
