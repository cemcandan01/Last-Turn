using System;

namespace LastTurn.Core
{
  /// Takip/uzak takip kamerasının saf hesabı (TS dongu.ts sahneGuncelle, kamera.camYaw dalı). Koordinatlar Unity
  /// görünüm uzayındadır (x sağ, y yukarı, z ileri); oyun durumuna geri yazmaz. Yumuşatmalar üstel olduğundan kare
  /// süresinden bağımsızdır; yükseklik tabanı kameranın altındaki zeminden ölçülür (TS cy = max(cy, Hw(cx,cz) + 1)).
  public sealed class ChaseCamera
  {
    public double Yaw { get; private set; }
    public double Distance { get; private set; }
    public double Vertical { get; private set; }
    public bool Initialized { get; private set; }
    /// Son karede zemin tabanının kamerayı yukarı itip itmediği (telemetri).
    public bool Floored { get; private set; }
    public void Reset() => Initialized = false;

    public static double DeltaAngle(double a) { a %= 2 * Math.PI; if (a > Math.PI) a -= 2 * Math.PI; if (a < -Math.PI) a += 2 * Math.PI; return a; }

    /// mode: 0 yakın takip, 1 uzak takip. (fx, fz): gövde ileri yönünün yatay izdüşümü. ground: Unity (x,z) → zemin y.
    /// shake: rastgele sarsıntı ofseti (TS'de taban sınırından önce eklenir).
    public (double X, double Y, double Z, double TX, double TY, double TZ) Step(double ox, double oy, double oz, double fx, double fz,
      double speed, double dt, int mode, bool drifting, Func<double, double, double> ground, double shakeX = 0, double shakeY = 0)
    {
      double len = Math.Sqrt(fx * fx + fz * fz);
      if (len < .01) { fx = 0; fz = 1; } else { fx /= len; fz /= len; }
      double targetYaw = Math.Atan2(fx, fz), span = Math.Max(0, Math.Min(1, speed / 77.2));
      bool near = mode == 0, far = mode == 1;
      double farScale = far ? 1.6 : 1, pitch = near ? .25 : .3, targetDistance = ((near ? 6.8 : 9) + span * (near ? 2 : 3)) * farScale;
      if (!Initialized) { Yaw = targetYaw; Distance = targetDistance; Vertical = oy; Initialized = true; }
      double turn = 1 - Math.Exp(-(drifting ? 2.2 : 4.5) * dt), smooth = 1 - Math.Exp(-3 * dt);
      Yaw += DeltaAngle(targetYaw - Yaw) * turn; Yaw = DeltaAngle(Yaw);
      Distance += (targetDistance - Distance) * smooth;
      Vertical += (oy - Vertical) * (1 - Math.Exp(-8 * dt));
      double lx = Math.Sin(Yaw), lz = Math.Cos(Yaw), back = Distance * Math.Cos(pitch);
      double x = ox - lx * back + shakeX, z = oz - lz * back;
      double y = Vertical + (near ? 1.7 : 2.4) * farScale + Distance * Math.Sin(pitch) + shakeY;
      double floor = ground(x, z) + 1;
      Floored = y < floor; if (Floored) y = floor;
      return (x, y, z, ox + fx * 3, oy + 1.2, oz + fz * 3);
    }

    /// Kameradan hedefe bakışın yatayla açısı (derece, pozitif: aşağı).
    public static double Pitch((double X, double Y, double Z, double TX, double TY, double TZ) p)
    {
      double dx = p.TX - p.X, dy = p.TY - p.Y, dz = p.TZ - p.Z;
      return -Math.Atan2(dy, Math.Sqrt(dx * dx + dz * dz)) * 180 / Math.PI;
    }
  }
}
