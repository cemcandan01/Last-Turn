using System;
using System.Linq;

namespace LastTurn.Core
{
  // TS 0.8.18 kariyer drifti: src/fizik/ortak.ts driftSkoru (yaris=false; drift yarışı mekaniği yalnız MUTANT'ta) ve
  // driftYarisProfili (komboyu yakan azami açı). Fizik değişmez: araç durumundan okunur.
  public static class RaceDrift
  {
    /// TS driftSkoru: β = atan2(vt, max(|vl|, 1)); drift = havada değil ∧ v > 10 ∧ (DR.on ∨ |β| > 0,5).
    /// DR.on TS drift yardımının durumudur; Unity sürüşünde yardımlar kapalı olduğundan yanlıştır.
    public static (bool Active, double Beta, double Speed) Detect(VehicleState s, bool driftAssistOn = false)
    {
      var f = s.Orientation.Rotate(new BodyVector(0, 0, 1));
      double h = Math.Atan2(f.X, f.Z), fx = Math.Sin(h), fz = Math.Cos(h);
      double vx = s.Velocity.X, vz = s.Velocity.Z, v = JsMath.Hypot(vx, vz), vl = vx * fx + vz * fz, vt = vx * fz - vz * fx;
      var r = Detect(v, vl, vt, !s.Wheels.Any(w => w.Contact), driftAssistOn);
      return (r.Active, r.Beta, v);
    }

    /// Hız bileşenlerinden (TS driftSkoru imzası): v toplam yatay hız, vl boyuna, vt yanal; air hiçbir teker temas etmiyor.
    public static (bool Active, double Beta) Detect(double v, double vl, double vt, bool air, bool driftAssistOn = false)
    {
      double beta = Math.Atan2(vt, Math.Max(Math.Abs(vl), 1));
      return (!air && v > 10 && (driftAssistOn || Math.Abs(beta) > 0.5), beta);
    }

    /// TS AdimSonucu.cimTeker: adım başında çimde (yüzey 2) olan teker sayısı.
    public static int GrassWheels(VehicleState s) => s.Wheels.Count(w => w.SurfaceIndex == 2);

    /// TS driftYarisProfili(kurulum).azami (rad): bunu 0,12 rad aşan kayma komboyu yakar.
    public static double MaxAngle(CatalogSetup setup)
    {
      var c = setup.Car; var t = setup.Tuning;
      double Pay(double v, double a, double b) => TrackGeometry.Clamp((v - a) / (b - a), 0, 1);
      double dmax = c["dmax"].IsNumber ? c["dmax"].N() : 0.8;
      double degree = 19 + 15 * Pay(dmax, 0.55, 1.06) + 9 * Pay(t["lock"].N(), 0.4, 1.0) + 5 * Pay(t["diff"].N(), 0.2, 1.2)
        + 4 * (1 - TrackGeometry.Clamp(c["awd"].N(), 0, 1)) + 3 * Pay(setup.Assists["dft"].N(), 0.2, 1);
      return TrackGeometry.Clamp(degree, 22, 58) * Math.PI / 180;
    }
  }
}
