#nullable enable
using System;

namespace LastTurn.Core
{
  // Güvenli piste dönüş (TS'de yok; Cem kararı 11 Kasım 2026): elle ↺, pist dışı ve ters dönme dönüşlerinde araç duruştan
  // ilerleyebileceği bir noktaya konur. Sıçrama rampası yaklaşımı/inişi, çamur/su ve dik yokuş (6 m gerisinden 25 m ilerisine %8'den dik
  // çıkış) güvenli değildir; dönüş noktası güvensizse pist boyunca ileride ilk güvenli noktaya (en çok 300 m) alınır.
  // Kapalı pistte başlangıç çizgisi geçilirse tur sayılır (RaceSession.Relocated), açık pistte bitişe 40 m'den fazla yaklaşılmaz.
  // Asfalt/drift/drag pistlerinde her nokta güvenlidir: davranış TS piste dönüşüyle aynı kalır.
  public sealed class TrackRecovery
  {
    public const double MaxSkip = 300, FinishMargin = 40;
    public readonly double MaxGrade, GradeLookahead, KickBefore;
    public readonly bool[] Safe;
    private readonly TrackGeometry g;

    public TrackRecovery(TrackWorld world, double maxGrade = .08, double lookahead = 25, double kickBefore = 50)
    {
      MaxGrade = maxGrade; GradeLookahead = lookahead; KickBefore = kickBefore;
      g = world.Geometry; var layout = world.Track.Layout; int n = g.N; Safe = new bool[n];
      // Yalnız toprak türlerde (ralli, rallikros): asfalt/drift/drag dönüşü TS ile aynı kalır.
      if (world.Track.Type != "rl" && world.Track.Type != "rx") { Array.Fill(Safe, true); return; }
      int hint = world.Hint;
      try
      {
        // Orta çizgi yüksekliği (ipucu her sorguda o noktaya alınır).
        var h = new double[n];
        for (int i = 0; i < n; i++) { world.Hint = i; h[i] = world.Height(g.X[i], g.Z[i]); }
        for (int i = 0; i < n; i++)
        {
          bool ok = true; double s = g.S[i];
          foreach (var j in layout.Jumps)
          {
            double d = s - g.S[j.Index]; if (!g.Open && Math.Abs(d) > g.Length / 2) d -= Math.Sign(d) * g.Length;
            // kick: yaklaşma hızı olmadan rampaya girilmez; masa/tümsek daha kısa bölge.
            var (before, after) = j.Kind == "kick" ? (KickBefore, 35.0) : j.Kind == "table" ? (60.0, 30.0) : (15.0, 12.0);
            if (d >= -before && d <= after) { ok = false; break; }
          }
          if (ok) foreach (var m in layout.Mud) if (Near(i, m, 6)) { ok = false; break; }
          if (ok) foreach (var w in layout.Water) if (Near(i, w, 3)) { ok = false; break; }
          if (ok)
          {
            // Önündeki 40 m'de 10 m'lik her parçanın çıkış eğimi.
            // Aracın gövdesi de yokuşta olmasın: 6 m geriden başlar.
            int start = Back(i, 6);
            for (int a = start; ok && a >= 0 && Ahead(g.S[start], g.S[a]) <= GradeLookahead + 6; a = Next(a, 1))
            {
              int b = Next(a, 10); if (b < 0) break;
              if ((h[b] - h[a]) / Ahead(g.S[a], g.S[b]) > MaxGrade) ok = false;
            }
          }
          Safe[i] = ok;
        }
      }
      finally { world.Hint = hint; }
    }

    private double Ahead(double from, double to) { double d = to - from; if (!g.Open && d < 0) d += g.Length; return d; }
    /// a'dan en az dist metre gerideki ilk indis (açık pistin başında 0).
    private int Back(int a, double dist)
    {
      for (int k = 1; k < g.N; k++)
      {
        int b = a - k; if (b < 0) { if (g.Open) return 0; b += g.N; }
        if (Ahead(g.S[b], g.S[a]) >= dist) return b;
      }
      return a;
    }
    /// a'dan en az dist metre ilerideki ilk indis (açık pistin sonunda −1).
    private int Next(int a, double dist)
    {
      for (int k = 1; k < g.N; k++)
      {
        int b = a + k; if (b >= g.N) { if (g.Open) return -1; b -= g.N; }
        if (Ahead(g.S[a], g.S[b]) >= dist) return b;
      }
      return -1;
    }
    private bool Near(int i, TrackPatch p, double margin) { double dx = g.X[i] - p.X, dz = g.Z[i] - p.Z, r = p.Radius + margin; return dx * dx + dz * dz < r * r; }

    /// Dönüş noktası güvenliyse aynen; değilse pist boyunca ileride ilk güvenli nokta (en az 10 m güvenli devamıyla).
    public TrackReturnPoint Choose(TrackReturnPoint p)
    {
      int i = g.Nearest(p.X, p.Z, 0, true).Index;
      if (Safe[i]) return p;
      double s0 = g.S[i];
      // Açık pistte bitişe yaklaşılmaz; kapalı pistte başlangıç çizgisi geçilebilir (oturum turu sayar, RaceSession.Relocated).
      for (int step = 1; step < g.N; step++)
      {
        int k = i + step; if (k >= g.N) { if (g.Open) break; k -= g.N; }
        double ahead = Ahead(s0, g.S[k]); if (ahead > MaxSkip || g.Open && g.S[k] > g.Length - FinishMargin) break;
        if (!Safe[k]) continue;
        // En az 10 m güvenli devam.
        int e = k, run = 0; while (run < g.N && Safe[e] && Ahead(g.S[k], g.S[e]) < 10) { int nx = e + 1; if (nx >= g.N) { if (g.Open) break; nx = 0; } e = nx; run++; }
        if (!Safe[e]) continue;
        return new TrackReturnPoint(g.X[k], g.Z[k], Math.Atan2(g.Tx[k], g.Tz[k]));
      }
      return p;
    }
  }

  /// Ters dönme sayacı: araç devrik (gövdenin üst yönü yataydan az yukarıda) kaldıkça yarım saniye bekler, sonra 5…1 sayar
  /// ve dönüş ister. Doğrulunca sıfırlanır.
  public sealed class FlipCounter
  {
    public const double Wait = .5, Countdown = 5, UpLimit = .35;
    public double Time;
    public void Clear() => Time = 0;
    public bool Step(bool flipped, double dt)
    {
      if (!flipped) { Time = 0; return false; }
      Time += dt; return Time > Wait + Countdown + 1e-9;
    }
    /// HUD sayısı (0: gösterme).
    public int Left => Time > Wait ? Math.Max(1, (int)Math.Ceiling(Wait + Countdown - Time)) : 0;
    public static bool Flipped(BodyRotation orientation) => orientation.Rotate(new BodyVector(0, 1, 0)).Y < UpLimit;
  }
}
