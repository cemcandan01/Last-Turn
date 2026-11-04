using System;

namespace LastTurn.Core
{
  // TS model koordinatları korunur: x sol, y yukarı, z ileri. Gösterim dönüşümü Core dışında kalır.
  public readonly struct BodyVector
  {
    public readonly double X, Y, Z;
    public BodyVector(double x, double y, double z) { Numeric.Finite(x); Numeric.Finite(y); Numeric.Finite(z); X = x; Y = y; Z = z; }
    public static BodyVector operator +(BodyVector a, BodyVector b) => new BodyVector(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static BodyVector operator -(BodyVector a, BodyVector b) => new BodyVector(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static BodyVector operator *(BodyVector a, double s) => new BodyVector(a.X * s, a.Y * s, a.Z * s);
    public double Length => Math.Sqrt(X * X + Y * Y + Z * Z);
    public static double Dot(BodyVector a, BodyVector b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public static BodyVector Cross(BodyVector a, BodyVector b) => new BodyVector(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
  }

  public readonly struct BodyRotation
  {
    public readonly double X, Y, Z, W;
    public BodyRotation(double x, double y, double z, double w)
    {
      Numeric.Finite(x); Numeric.Finite(y); Numeric.Finite(z); Numeric.Finite(w);
      double length = Math.Sqrt(x * x + y * y + z * z + w * w);
      Numeric.Positive(length);
      X = x / length; Y = y / length; Z = z / length; W = w / length;
    }
    public static BodyRotation Identity => new BodyRotation(0, 0, 0, 1);
    public static BodyRotation Yaw(double yaw) => new BodyRotation(0, Math.Sin(yaw / 2), 0, Math.Cos(yaw / 2));
    public static BodyRotation Multiply(BodyRotation a,BodyRotation b)=>new BodyRotation(
      a.W*b.X+a.X*b.W+a.Y*b.Z-a.Z*b.Y,a.W*b.Y-a.X*b.Z+a.Y*b.W+a.Z*b.X,
      a.W*b.Z+a.X*b.Y-a.Y*b.X+a.Z*b.W,a.W*b.W-a.X*b.X-a.Y*b.Y-a.Z*b.Z);
    public BodyVector Rotate(BodyVector v)
    {
      double tx = 2 * (Y * v.Z - Z * v.Y), ty = 2 * (Z * v.X - X * v.Z), tz = 2 * (X * v.Y - Y * v.X);
      return new BodyVector(v.X + W * tx + (Y * tz - Z * ty), v.Y + W * ty + (Z * tx - X * tz), v.Z + W * tz + (X * ty - Y * tx));
    }
    public BodyVector Unrotate(BodyVector v)
    {
      double x = -X, y = -Y, z = -Z;
      double tx = 2 * (y * v.Z - z * v.Y), ty = 2 * (z * v.X - x * v.Z), tz = 2 * (x * v.Y - y * v.X);
      return new BodyVector(v.X + W * tx + (y * tz - z * ty), v.Y + W * ty + (z * tx - x * tz), v.Z + W * tz + (x * ty - y * tx));
    }
    // Dünya açısal hızı soldan çarpılır: q += 0.5 * (omega ⊗ q) * h; her alt adımda normalize.
    public BodyRotation Advance(BodyVector omega, double h)
    {
      double hh = .5 * h;
      return new BodyRotation(X + hh * (omega.X * W + omega.Y * Z - omega.Z * Y),
        Y + hh * (omega.Y * W + omega.Z * X - omega.X * Z),
        Z + hh * (omega.Z * W + omega.X * Y - omega.Y * X),
        W + hh * (-omega.X * X - omega.Y * Y - omega.Z * Z));
    }
  }
}
