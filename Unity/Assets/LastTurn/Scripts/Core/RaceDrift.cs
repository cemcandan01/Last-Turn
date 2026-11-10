using System;
using System.Linq;

namespace LastTurn.Core
{
  // TS 0.8.18 kariyer drifti: src/fizik/ortak.ts driftSkoru (yaris=false; drift yarışı mekaniği yalnız MUTANT'ta) ve
  // driftYarisProfili (komboyu yakan azami açı). Fizik değişmez: araç durumundan okunur.
  public static class RaceDrift
  {
    /// TS driftSkoru: β = atan2(vt, max(|vl|, 1)); drift = havada değil ∧ v > 10 ∧ (DR.on ∨ |β| > 0,5).
    /// DR.on: TS drift yardımının durumu (PowertrainVehicle.Assist.On; yardımsız araçta hep yanlış).
    public static (bool Active, double Beta, double Speed) Detect(VehicleState s, bool driftAssistOn = false)
    {
      var f = s.Orientation.Rotate(new BodyVector(0, 0, 1));
      double h = Math.Atan2(f.X, f.Z), fx = Math.Sin(h), fz = Math.Cos(h);
      double vx = s.Velocity.X, vz = s.Velocity.Z, v = JsMath.Hypot(vx, vz), vl = vx * fx + vz * fz, vt = vx * fz - vz * fx;
      var r = Detect(v, vl, vt, !s.Wheels.Any(w => w.Contact), driftAssistOn);
      return (r.Active, r.Beta, v);
    }

    /// Hız bileşenlerinden (TS driftSkoru imzası): v toplam yatay hız, vl boyuna, vt yanal; air hiçbir teker temas etmiyor.
    public static (bool Active, double Beta) Detect(double v, double vl, double vt, bool air, bool driftAssistOn = false, bool race = false)
    {
      double beta = Math.Atan2(vt, Math.Max(Math.Abs(vl), 1));
      // TS driftSkoru(yaris=true): MUTANT drift yarışında yalnız drift penceresi açıkken ve v > 7.
      return (race ? !air && v > 7 && driftAssistOn : !air && v > 10 && (driftAssistOn || Math.Abs(beta) > 0.5), beta);
    }

    /// Drift yarışı varyantı (TS cx.driftYarisi): araç durumundan.
    public static (bool Active, double Beta, double Speed) Detect(VehicleState s, bool driftAssistOn, bool race)
    {
      if (!race) return Detect(s, driftAssistOn);
      var f = s.Orientation.Rotate(new BodyVector(0, 0, 1));
      double h = Math.Atan2(f.X, f.Z), fx = Math.Sin(h), fz = Math.Cos(h);
      double vx = s.Velocity.X, vz = s.Velocity.Z, v = JsMath.Hypot(vx, vz), vl = vx * fx + vz * fz, vt = vx * fz - vz * fx;
      var r = Detect(v, vl, vt, !s.Wheels.Any(w => w.Contact), driftAssistOn, true);
      return (r.Active, r.Beta, v);
    }

    /// TS driftYarisProfili(kurulum): MUTANT drift yarışının giriş/hazırlık/azami/zorlama/destek değerleri.
    public static DriftRaceProfile Profile(CatalogSetup setup)
    {
      var c = setup.Car; var t = setup.Tuning; var a = setup.Assists;
      double Pay(double v, double lo, double hi) => TrackGeometry.Clamp((v - lo) / (hi - lo), 0, 1);
      double dmax = c["dmax"].IsNumber ? c["dmax"].N() : 0.8, awd = TrackGeometry.Clamp(c["awd"].N(), 0, 1);
      double degree = 19 + 15 * Pay(dmax, 0.55, 1.06) + 9 * Pay(t["lock"].N(), 0.4, 1.0) + 5 * Pay(t["diff"].N(), 0.2, 1.2) + 4 * (1 - awd) + 3 * Pay(a["dft"].N(), 0.2, 1);
      double ready = 0.45 * Pay(t["diff"].N(), 0.2, 1.15) + 0.3 * Pay(dmax, 0.55, 1.06) + 0.15 * (1 - awd) + 0.1 * Pay(a["ini"].IsNumber ? a["ini"].N() : 0, 0, 1);
      double control = TrackGeometry.Clamp((degree - 19) / 36, 0, 1);
      return new DriftRaceProfile
      {
        Entry = TrackGeometry.Clamp(17 - 7 * ready, 9, 17) * Math.PI / 180, Prepare = 0.2 - 0.1 * ready,
        Max = TrackGeometry.Clamp(degree, 22, 58) * Math.PI / 180, Force = 0.25 + 0.35 * (1 - ready), Support = 0.3 + 0.7 * Math.Pow(control, 1.5),
      };
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
  /// TS driftYarisProfili sonucu (rad/sn/oran).
  public sealed class DriftRaceProfile { public double Entry, Prepare, Max, Force, Support; }
}
