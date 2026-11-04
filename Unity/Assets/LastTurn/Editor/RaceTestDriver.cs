using System;
using LastTurn.Core;

namespace LastTurn.EditorValidation
{
  // Yalnız doğrulama için basit pist takipçisi (oyun YZ'si değildir, TS yz/ ile ilgisi yok): ileriye bakan direksiyon ve
  // eğriliğe göre hız. .NET (--race-drive) ve Unity Play doğrulaması aynı sürücüyü kullanır.
  public sealed class RaceTestDriver
  {
    public double LateralAcceleration = 18, MaxSpeed = 60;

    /// Türe göre: toprak/kar yolda daha düşük viraj ivmesi, drag'de hız sınırı yok.
    public static RaceTestDriver For(string type) => type switch
    {
      "rx" => new RaceTestDriver { LateralAcceleration = 10, MaxSpeed = 40 },
      "rl" => new RaceTestDriver { LateralAcceleration = 8, MaxSpeed = 38 },
      "dg" => new RaceTestDriver { MaxSpeed = 300 },
      "dp" => new RaceTestDriver { Drift = true, LateralAcceleration = 14, MaxSpeed = 32 },
      _ => new RaceTestDriver(),
    };

    public double LastWanted, LastCurvature, LastThrottle;
    /// Drift kipi (dp): virajda el freniyle kayma başlatır, hız vektörünü pist hedefine çevirir, gazla kaymayı sürdürür.
    public bool Drift;
    /// Klavye gibi girdi (Unity GtKeyboardInput): direksiyon −1/0/1, gaz ve fren 0/1, el freni tuşu.
    public bool Digital;
    private static DrivingInput Keys(DrivingInput i) => new DrivingInput(i.Throttle >= .5 ? 1 : 0, i.Brake >= .5 ? 1 : 0, Math.Abs(i.Steering) < .33 ? 0 : Math.Sign(i.Steering), false, false, i.Handbrake);
    private int handbrake;
    private int stuck;
    /// Oyuncu gibi: 3 sn hızı 1 m/s altında kalırsa ya da 2 sn temassızsa TS ↺ yeniden doğ.
    public bool RespawnIfStuck(RaceRun run)
    {
      var b = run.Vehicle.Body; bool air = !System.Linq.Enumerable.Any(b.Wheels, w => w.Contact);
      stuck = b.Velocity.Length < 1 || air ? stuck + 1 : 0;
      if (stuck < (air ? 120 : 180)) return false;
      stuck = 0; return run.Respawn();
    }

    public DrivingInput Input(RaceRun run)
    {
      var i = Digital ? Keys(Raw(run)) : Raw(run); var e = run.Vehicle.Engine; var p = run.Vehicle.Parameters;
      // Drag manuel: gösterge noktasında (VİTES ışığı) oyuncu gibi E'ye basar; otomatik vites yok.
      int shift = p.ManualGearbox && e.Gear >= 1 && e.Gear < 6 && e.ShiftTimer <= 0 && e.Rpm >= DragGearAdvisor.ShiftRpm(p, e.Gear) * .97 ? 1 : 0;
      return shift == 0 ? i : new DrivingInput(i.Throttle, i.Brake, i.Steering, i.AnalogThrottle, i.AnalogSteering, i.Handbrake, shift);
    }

    /// Geri sayım: drag manuelde devri kalkış bandının ortasında tutmak için gaza bas/bırak (klavye gibi).
    public DrivingInput Countdown(RaceRun run)
    {
      var p = run.Vehicle.Parameters; if (!p.ManualGearbox) return new DrivingInput(1, 0, 0);
      var band = DragGearAdvisor.LaunchBand(p);
      return new DrivingInput(run.Vehicle.Engine.Rpm < (band.Low + band.High) / 2 ? 1 : 0, 0, 0, false, false);
    }

    private DrivingInput Raw(RaceRun run)
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
      // İstenen hızın altındayken en az yarım gaz: dik yokuşta durmasın.
      double throttle = v < wanted ? Math.Min(1, 0.5 + (wanted - v) * 0.4) : 0, brake = v > wanted + 1 ? Math.Min(1, (v - wanted) * 0.3) : 0;
      LastWanted = wanted; LastCurvature = curvature; LastThrottle = throttle;
      if (Drift && Digital && v > 11)
      {
        // Klavye drift tekniği (TS yardımıyla): virajda tam direksiyon + gaz; kayma açısı ~0,45–0,8 rad'da tutulur,
        // aşılırsa karşı direksiyon. Açı ve yön yalnız oyuncunun gördüğü araç durumundan.
        double vx = vehicle.Body.Velocity.X, vz = vehicle.Body.Velocity.Z, course = Math.Atan2(vx, vz);
        double slip = TrackGeometry.AngleDelta(heading - course), turn = Math.Sign(error);
        bool corner = Math.Abs(g.Curvature(s + 10)) > .006 || Math.Abs(slip) > .3;
        if (!corner) return new DrivingInput(v < wanted ? 1 : 0, 0, Math.Abs(steer) < .33 ? 0 : Math.Sign(steer), false, false);
        double into = slip * turn;
        double key = into < .45 ? turn : into > .8 ? -turn : (Math.Abs(error) > .25 ? turn : 0);
        return new DrivingInput(1, 0, key, false, false, into < .2 && Math.Abs(g.Curvature(s + 10)) > .012);
      }
      if (Drift && v > 11)
      {
        double vx = vehicle.Body.Velocity.X, vz = vehicle.Body.Velocity.Z, course = Math.Atan2(vx, vz);
        double beta = TrackGeometry.AngleDelta(course - heading), courseError = TrackGeometry.AngleDelta(Math.Atan2(target.X - p.X, target.Z - p.Z) - course);
        double near = Math.Abs(g.Curvature(s + 12));
        if (near > 0.006 && Math.Abs(beta) < 0.45 && handbrake <= 0) handbrake = 18;
        bool pull = handbrake-- > 0;
        if (Math.Abs(beta) > 0.35)
        {
          // Karşı direksiyon: kaymanın yönüne, hız vektörü hedefe dönsün; açı 0,9 rad'ı geçmesin.
          double counter = Math.Max(-1, Math.Min(1, -0.5 * beta + 2.5 * courseError - (Math.Abs(beta) > 0.9 ? 0.8 * Math.Sign(beta) : 0)));
          return new DrivingInput(v < wanted + 6 ? 1 : 0.6, 0, counter, true, true, pull);
        }
        return new DrivingInput(1, 0, steer, true, true, pull);
      }
      return new DrivingInput(brake > 0 ? 0 : throttle, brake, steer);
    }
  }
}
