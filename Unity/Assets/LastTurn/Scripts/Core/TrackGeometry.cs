using System;
using System.Collections.Generic;

namespace LastTurn.Core
{
  // TS 0.8.18 src/dunya/pist.ts sorgularının saf C# karşılığı. Geometri (P/T/S) TS mkTrack çıktısıdır ve
  // track-catalog.json'dan gelir; burada eğri üretilmez. TS'deki global ipucu (ipucu.ti) yerine ipucu parametre olarak verilir.
  public sealed class TrackGeometry
  {
    public const double KerbWidth = 1.6;
    public readonly double[] X, Z, Tx, Tz, S;
    public readonly int N;
    public readonly double Length, HalfWidth;
    public readonly bool Open;
    private Dictionary<long, List<int>> grid = null!;

    public TrackGeometry(double[] points, double[] tangents, double[] distances, double length, double halfWidth, bool open)
    {
      N = distances.Length;
      if (N < 2 || points.Length != 2 * N || tangents.Length != 2 * N) throw new FormatException("Pist geometrisi: nokta sayıları uyuşmuyor.");
      X = new double[N]; Z = new double[N]; Tx = new double[N]; Tz = new double[N]; S = (double[])distances.Clone();
      for (int i = 0; i < N; i++) { X[i] = points[2 * i]; Z[i] = points[2 * i + 1]; Tx[i] = tangents[2 * i]; Tz[i] = tangents[2 * i + 1]; }
      Length = length; HalfWidth = halfWidth; Open = open;
      for (int i = 0; i < N; i++) Numeric.Finite(X[i] + Z[i] + Tx[i] + Tz[i] + S[i]);
    }

    public static double Clamp(double v, double a, double b) => Math.Max(a, Math.Min(b, v));
    public static double Smooth(double a, double b, double v) { double t = Clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    // TS ad(): eski kodla aynı sonuç için 6.2832 sabiti korunur.
    public static double AngleDelta(double a) => ((((a + Math.PI) % 6.2832) + 6.2832) % 6.2832) - Math.PI;
    private static double Hypot(double a, double b) => Math.Sqrt(a * a + b * b);
    private int Wrap(int i) => ((i % N) + N) % N;

    /// TS nearest: önce ipucu ±40 nokta, uzaksa (hw+25) tüm pist. Döner: (indeks, uzaklık).
    public (int Index, double Distance) Nearest(double x, double z, int hint, bool full = false)
    {
      int bi = hint; double bd = 1e18;
      void Scan(int a, int b)
      {
        for (int k = a; k <= b; k++)
        {
          int i = Wrap(k); double dx = x - X[i], dz = z - Z[i], q = dx * dx + dz * dz;
          if (q < bd) { bd = q; bi = i; }
        }
      }
      if (full) Scan(0, N - 1);
      else { Scan(hint - 40, hint + 40); if (Math.Sqrt(bd) > HalfWidth + 25) Scan(0, N - 1); }
      return (bi, Math.Sqrt(bd));
    }

    /// Pist uzunluğunun f oranındaki nokta indeksi.
    public int IndexAt(double f)
    {
      double l0 = f * Length; int i = 0;
      while (i < N - 1 && S[i] < l0) i++;
      return i;
    }

    public static double Heading(double tx, double tz) => Math.Atan2(tx, tz);

    /// TS tp: i'den back nokta geride ışınlanma noktası (x, z, yön).
    public (double X, double Z, double Heading) Teleport(int i, int back)
    {
      i = Wrap(i - back);
      return (X[i], Z[i], Heading(Tx[i], Tz[i]));
    }

    public (double MinX, double MaxX, double MinZ, double MaxZ) Bounds(double margin)
    {
      double a = 1e9, b = -1e9, c = 1e9, d = -1e9;
      for (int i = 0; i < N; i++) { a = Math.Min(a, X[i]); b = Math.Max(b, X[i]); c = Math.Min(c, Z[i]); d = Math.Max(d, Z[i]); }
      return (a - margin, b + margin, c - margin, d + margin);
    }

    /// i noktasında k önce/sonraki teğetler arası açı.
    public double TurnAt(int i, int k)
    {
      int G(int j) => Open ? (int)Clamp(j, 0, N - 1) : Wrap(j);
      int a = G(i - k), b = G(i + k);
      return Math.Abs(Math.Atan2(Tx[a] * Tz[b] - Tz[a] * Tx[b], Tx[a] * Tx[b] + Tz[a] * Tz[b]));
    }

    /// Rampayı düzlüğe kaydır: f konumunun ±25 noktası içindeki en düz nokta oranı.
    public double StraightFraction(double f)
    {
      int i0 = IndexAt(f), bj = i0; double bt = 1e9;
      for (int j = i0 - 25; j <= i0 + 25; j++)
      {
        int i = Open ? (int)Clamp(j, 8, N - 9) : Wrap(j); double t = TurnAt(i, 6);
        if (t < bt) { bt = t; bj = i; }
      }
      return S[bj] / Length;
    }

    /// Fren tabelası virajları: önünde en az 110 m düzlük olan viraj başları.
    public List<int> AutoApex()
    {
      var r = new List<int>();
      for (int i = 0; i < N; i++)
      {
        if (!(TurnAt(i, 5) > 0.3 && TurnAt(Wrap(i - 1), 5) <= 0.3)) continue;
        int j = i, n = 0; double d = 0;
        while (n++ < 15 && TurnAt(j, 5) > 0.12) j = Wrap(j - 1);
        while (d < 400)
        {
          int k = Wrap(j - 1);
          if (TurnAt(k, 5) > 0.2) break;
          d += Hypot(X[j] - X[k], Z[j] - Z[k]); j = k;
        }
        if (d >= 110) r.Add(i);
      }
      return r;
    }

    /// Kerb yalnız virajlarda (TS kerbs; kapalı pist sarmalı açık pistte de aynen uygulanır).
    public bool[] Kerbs()
    {
      var kb = new bool[N];
      for (int i = 0; i < N; i++)
      {
        int a = Wrap(i - 5), b = Wrap(i + 5);
        kb[i] = Math.Abs(Math.Atan2(Tx[a] * Tz[b] - Tz[a] * Tx[b], Tx[a] * Tx[b] + Tz[a] * Tz[b])) > 0.12;
      }
      return kb;
    }

    /// Kerb kesiti: pistten 9 cm yüksek.
    public static double KerbProfile(double k) => k <= 0 || k >= KerbWidth ? 0 : 0.09 * Smooth(0, 0.4, k) * (1 - Smooth(1.2, KerbWidth, k));

    /// En yakın nokta i'nin iki yanındaki parçalara izdüşüm: (pist boyunca s, pist çizgisine uzaklık d).
    public (double S, double Distance) Project(double x, double z, int i)
    {
      var fallback = (S[i], Hypot(x - X[i], z - Z[i]));
      for (int k = 0; k < 2; k++)
      {
        int a = k == 1 ? i : i - 1, b = k == 1 ? i + 1 : i;
        if (Open && (a < 0 || b >= N)) continue;
        a = Wrap(a); b %= N;
        double px = X[a], pz = Z[a], qx = X[b], qz = Z[b], tax = Tx[a], taz = Tz[a], tbx = Tx[b], tbz = Tz[b];
        double F(double t)
        {
          double cx = px + (qx - px) * t, cz = pz + (qz - pz) * t, tx = tax + (tbx - tax) * t, tz = taz + (tbz - taz) * t;
          double h = Hypot(tx, tz);
          return ((x - cx) * tx + (z - cz) * tz) / (h == 0 ? 1 : h);
        }
        double f0 = F(0), f1 = F(1);
        if (f0 < 0 || f1 > 0) continue;
        double Or1(double v) => v == 0 ? 1 : v;
        double u = f0 / Or1(f0 - f1);
        double ft = F(u);
        u = ft > 0 ? u + (1 - u) * ft / Or1(ft - f1) : u * f0 / Or1(f0 - ft);
        u = Clamp(u, 0, 1);
        double ux = px + (qx - px) * u, uz = pz + (qz - pz) * u, l = Hypot(qx - px, qz - pz);
        return (S[a] + u * l, Hypot(x - ux, z - uz));
      }
      return fallback;
    }

    /// Kerb yüksekliği (TS Hkerb); kerbs Kerbs() sonucudur.
    public double KerbHeight(bool[] kerbs, double x, double z, int hint)
    {
      int i = Nearest(x, z, hint).Index;
      return kerbs[i] ? KerbProfile(Project(x, z, i).Distance - HalfWidth) : 0;
    }

    /// Pistin f oranında, merkezden lat kadar yanda nokta (pozitif sağ).
    public (int Index, double X, double Z) OnTrack(double f, double lateral = 0)
    {
      int i = IndexAt(f);
      return (i, X[i] + Tz[i] * lateral, Z[i] - Tx[i] * lateral);
    }

    public (double X, double Z) AtTrack(int i, double offset) => (X[i] + Tz[i] * offset, Z[i] - Tx[i] * offset);

    /// Pistin her yerinden en az m uzakta mı.
    public bool ClearOf(double x, double z, double m) => Nearest(x, z, 0, true).Distance > m;

    /// 30 m ızgaralı hızlı en yakın nokta (yükseklik hesabı için).
    public (int Index, double Distance) GridNearest(double x, double z)
    {
      if (grid == null)
      {
        var g = new Dictionary<long, List<int>>();
        for (int i = 0; i < N; i++)
        {
          long key = Cell(Math.Floor(X[i] / 30), Math.Floor(Z[i] / 30));
          if (!g.TryGetValue(key, out var list)) g[key] = list = new List<int>();
          list.Add(i);
        }
        grid = g;
      }
      int bi = 0; double bd = 1e18, cx = Math.Floor(x / 30), cz = Math.Floor(z / 30);
      for (int a = -1; a <= 1; a++)
        for (int b = -1; b <= 1; b++)
          if (grid.TryGetValue(Cell(cx + a, cz + b), out var list))
            foreach (int i in list)
            {
              double q = (x - X[i]) * (x - X[i]) + (z - Z[i]) * (z - Z[i]);
              if (q < bd) { bd = q; bi = i; }
            }
      return (bi, Math.Sqrt(bd));
    }
    private static long Cell(double a, double b) => ((long)a << 32) ^ (uint)(int)b;

    /// Pist üzerinde s metredeki nokta ve yön (iki nokta arasında doğrusal).
    public (double X, double Z, double Heading) At(double s)
    {
      double l = Length;
      s = Open ? Clamp(s, 0, S[N - 1]) : ((s % l) + l) % l;
      int lo = 0, hi = N - 1;
      while (lo < hi) { int m = (lo + hi + 1) >> 1; if (S[m] <= s) lo = m; else hi = m - 1; }
      int i = lo, j = Open ? Math.Min(i + 1, N - 1) : (i + 1) % N;
      double sl = (j > i ? S[j] : Length) - S[i]; if (sl == 0) sl = 1;
      double u = Clamp((s - S[i]) / sl, 0, 1);
      return (X[i] + (X[j] - X[i]) * u, Z[i] + (Z[j] - Z[i]) * u,
        Math.Atan2(Tx[i] + (Tx[j] - Tx[i]) * u, Tz[i] + (Tz[j] - Tz[i]) * u));
    }

    /// Eğrilik (rad/m).
    public double Curvature(double s) => AngleDelta(At(s + 8).Heading - At(s - 8).Heading) / 16;
  }

  public sealed class TrackJump
  {
    public string Kind = ""; public int Index; public double X, Z, Tx, Tz, Width;

    /// TS jumpH: kick (sıçrama), table (masa), diğerleri tümsek.
    public static double Height(IReadOnlyList<TrackJump> jumps, double x, double z)
    {
      double h = 0;
      foreach (var j in jumps)
      {
        double dx = x - j.X, dz = z - j.Z, s = dx * j.Tx + dz * j.Tz, l = Math.Abs(-dx * j.Tz + dz * j.Tx);
        if (l > j.Width + 6 || s < -30 || s > 30) continue;
        double w = TrackGeometry.Clamp((j.Width + 6 - l) / 6, 0, 1), p = 0;
        if (j.Kind == "kick")
        {
          if (s >= -18 && s < 0) p = 3.2 * Math.Pow((s + 18) / 18, 1.6);
          else if (s >= 0 && s < 4) p = 3.2 * (1 - TrackGeometry.Smooth(0, 4, s));
        }
        else if (j.Kind == "table") p = 2.4 * TrackGeometry.Smooth(-16, -6, s) * (1 - TrackGeometry.Smooth(8, 18, s));
        else p = 1.4 * Math.Exp(-Math.Pow(s / 6, 2));
        h += p * w;
      }
      return h;
    }
  }
}
