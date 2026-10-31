using System;
using LastTurn.Core;

namespace LastTurn.EditorValidation
{
  // Yalnız doğrulama için basit pist takipçisi (oyun YZ'si değildir, TS yz/ ile ilgisi yok): ileriye bakan direksiyon ve
  // eğriliğe göre hız. .NET (--race-drive) ve Unity Play doğrulaması aynı sürücüyü kullanır.
  public sealed class RaceTestDriver
  {
    public double LateralAcceleration = 18, MaxSpeed = 60;

    public DrivingInput Input(RaceRun run)
    {
      var g = run.World.Geometry; var vehicle = run.Vehicle;
      var p = vehicle.ReferencePoint; var f = vehicle.Body.Orientation.Rotate(new BodyVector(0, 0, 1));
      double heading = Math.Atan2(f.X, f.Z), v = vehicle.Body.Velocity.X * Math.Sin(heading) + vehicle.Body.Velocity.Z * Math.Cos(heading);
      double s = g.Project(p.X, p.Z, run.World.Hint).S;
      var target = g.At(s + 10 + 0.7 * Math.Max(0, v));
      double error = TrackGeometry.AngleDelta(Math.Atan2(target.X - p.X, target.Z - p.Z) - heading);
      double steer = Math.Max(-1, Math.Min(1, 2.2 * error));
      double curvature = 0;
      for (double d = 0; d <= 25 + 2.5 * Math.Max(0, v); d += 5) curvature = Math.Max(curvature, Math.Abs(g.Curvature(s + d)));
      double wanted = Math.Min(MaxSpeed, Math.Sqrt(LateralAcceleration / (curvature + 1e-4)));
      double throttle = Math.Max(0, Math.Min(1, (wanted - v) * 0.4)), brake = v > wanted + 1 ? Math.Min(1, (v - wanted) * 0.3) : 0;
      return new DrivingInput(brake > 0 ? 0 : throttle, brake, steer);
    }
  }
}
