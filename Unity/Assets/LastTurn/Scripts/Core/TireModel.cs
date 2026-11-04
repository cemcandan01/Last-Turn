using System;

namespace LastTurn.Core
{
  public readonly struct TireParameters
  {
    public readonly double MuY, MuX, Kp, Ap, C;
    public TireParameters(double muY, double muX, double kp, double ap, double c)
    {
      Numeric.Positive(kp); Numeric.Positive(ap); Numeric.Positive(c);
      Numeric.NonNegative(muY); Numeric.NonNegative(muX);
      MuY = muY; MuX = muX; Kp = kp; Ap = ap; C = c;
    }
    internal void Validate() { Numeric.Positive(Kp); Numeric.Positive(Ap); Numeric.Positive(C); }
  }

  public readonly struct TireForce
  {
    public readonly double Fx, Fy, Slip;
    public TireForce(double fx, double fy, double slip) { Fx = fx; Fy = fy; Slip = slip; }
  }

  // TS 0.8.18 lastikKuvveti; double precision, no engine or shared scratch state.
  public static class TireModel
  {
    public static TireForce Evaluate(double load, double kappa, double tanAlpha, TireParameters p)
    {
      Numeric.Finite(load); Numeric.Finite(kappa); Numeric.Finite(tanAlpha); p.Validate();
      double sx = kappa / p.Kp, sy = tanAlpha / p.Ap;
      double scale = Math.Max(Math.Abs(sx), Math.Abs(sy));
      double slip = scale == 0 ? 0 : scale * Math.Sqrt((sx / scale) * (sx / scale) + (sy / scale) * (sy / scale));
      if (slip < 1e-9 || load <= 0) return new TireForce(0, 0, slip);
      double c = Math.Max(1.05, p.C);
      double f = Math.Sin(c * Math.Atan(Math.Tan(Math.PI / (2 * c)) * slip));
      return new TireForce(p.MuX * load * f * sx / slip, -p.MuY * load * f * sy / slip, slip);
    }
  }

  internal static class Numeric
  {
    internal static void Finite(double x)
    {
      if (double.IsNaN(x) || double.IsInfinity(x)) throw new ArgumentOutOfRangeException(nameof(x));
    }
    internal static void Positive(double x) { Finite(x); if (x <= 0) throw new ArgumentOutOfRangeException(nameof(x)); }
    internal static void NonNegative(double x) { Finite(x); if (x < 0) throw new ArgumentOutOfRangeException(nameof(x)); }
  }
}
