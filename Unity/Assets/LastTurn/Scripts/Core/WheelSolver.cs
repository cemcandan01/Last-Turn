using System;

namespace LastTurn.Core
{
  public readonly struct WheelStep
  {
    public readonly double Omega;
    public readonly TireForce Force;
    public WheelStep(double omega, TireForce force) { Omega = omega; Force = force; }
  }

  public static class WheelSolver
  {
    // Original tekerCoz: implicit wheel inertia/tire reaction + Coulomb brake, 22 bisections.
    public static WheelStep Solve(double w0, double inertia, double h, double torque, double brake,
        double radius, double speed, double denominator, double load, double tanAlpha, TireParameters p)
    {
      Numeric.Finite(w0); Numeric.Positive(inertia); Numeric.Positive(h); Numeric.Finite(torque);
      Numeric.NonNegative(brake); Numeric.Positive(radius); Numeric.Finite(speed); Numeric.Positive(denominator);
      Numeric.Finite(load); Numeric.Finite(tanAlpha); p.Validate();
      double Residual(double w) => inertia * (w - w0) - h * torque + h * radius *
          TireModel.Evaluate(load, (w * radius - speed) / denominator, tanAlpha, p).Fx;
      double f0 = Residual(0), hb = h * brake;
      if (Math.Abs(f0) <= hb)
        return new WheelStep(0, TireModel.Evaluate(load, -speed / denominator, tanAlpha, p));
      double equilibrium = speed / radius, free = w0 + h * torque / inertia;
      double lo, hi, c;
      if (f0 < -hb) { lo = 0; hi = Math.Max(Math.Max(equilibrium, free), 0) + 1; c = hb; }
      else { lo = Math.Min(Math.Min(equilibrium, free), 0) - 1; hi = 0; c = -hb; }
      for (int k = 0; k < 22; k++)
      {
        double m = (lo + hi) / 2;
        if (Residual(m) + c > 0) hi = m; else lo = m;
      }
      double omega = (lo + hi) / 2;
      return new WheelStep(omega, TireModel.Evaluate(load, (omega * radius - speed) / denominator, tanAlpha, p));
    }
  }
}
