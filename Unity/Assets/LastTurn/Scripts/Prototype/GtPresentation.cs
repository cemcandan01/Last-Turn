using System;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Prototype
{
  // Yansıma yalnız gösterim sınırında: M R M, açısal vektörde det(M) M.
  public static class GtPresentation
  {
    public static Vector3 Position(BodyVector v) => new Vector3((float)-v.X, (float)v.Y, (float)v.Z);
    public static Quaternion Rotation(BodyRotation q) => new Quaternion((float)q.X, (float)-q.Y, (float)-q.Z, (float)q.W);
    public static double Blend(double previous, double current, double alpha) => previous + (current - previous) * alpha;
    public static double Steering(WheelGeometry wheel, double wheelbase, double delta)
      => wheel.Front ? delta + .6 * (Math.Atan(wheelbase * Math.Tan(delta) / (wheelbase - wheel.X * Math.Tan(delta))) - delta) : 0;
    public static float Degrees(double unwrappedRadians) => (float)(Math.IEEERemainder(unwrappedRadians, 2 * Math.PI) * 180 / Math.PI);
  }
}
