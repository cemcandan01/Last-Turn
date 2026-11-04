using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // TS 0.8.18 performans.ts ve ozellikler.ts: garaj ölçümü; sürüş modeline kuvvet eklemez.
  public static class CatalogPerformance
  {
    private sealed class PointMass
    {
      public double Gravity, Lateral, LateralRaw, Longitudinal, Downforce, Drag, Rolling,
        Brake, Traction, TractionDownforce, Turbo, TurboSeconds;
      public Func<double, double, double> Thrust = null!;
    }

    private static CatalogSetup WithTire(CatalogSetup s, int tire) => new CatalogSetup {
      Car = s.Car, Tuning = s.Tuning, Assists = s.Assists, Tire = tire,
      Preset = s.Preset, Parts = s.Parts
    };

    private static PointMass Point(VehicleCatalog catalog, CatalogSetup setup, string calibration, bool calibrated = true)
    {
      var c = setup.Car; var tu = setup.Tuning; var assists = setup.Assists;
      var engine = catalog.CreatePhysics(setup); var f = engine.Chassis;
      var tire = catalog.Data["tires"][setup.Tire];
      var k = catalog.Data["performanceCalibration"][calibration];
      double g = 24, m = f.Mass, front = c["ff"].N(.55);
      double common = (1 + .25 * assists["grip"].N()) * 1.15;
      int surface = calibration == "asfalt" ? 1 : 0;
      bool loose = surface == 0;
      double pressure = loose ? .35 : .15, ground = loose ? (26.0 / 30) * .75 : 1;
      double referenceMu = loose ? .85 : 1.3;
      double longitudinalGrip = tire.Has("lg") ? tire["lg"][surface].N() : 1;
      double muF = tire["g"][surface].N() * c["gr"][surface].N() * common * ground *
        (1 - pressure * (tu["tpf"].N() - 1)) * c["fb"].N();
      double muR = tire["g"][surface].N() * c["gr"][surface].N() * common * ground *
        (1 - pressure * (tu["tpr"].N() - 1)) * c["rb"].N() * (loose ? .92 : 1);
      double muY = .6 * Math.Min(muF, muR) + .4 * (front * muF + (1 - front) * muR);
      double muX = (front * muF + (1 - front) * muR) * longitudinalGrip;
      double radius = f.Wheels[2].Radius, wMax = engine.MaxRpm * 2 * Math.PI / 60;
      double awd = f.FrontDriveShare;
      double tractionShare = awd <= 0 ? (1 - front) * muR : awd >= 1 ? front * muF :
        Math.Min((1 - front) * muR / (1 - awd), front * muF / awd);
      double turbo = c["tb"].N(), threshold = c["tbu"].N(.6);
      double powerCalibration = calibrated ? k["guc"].N() : 1;
      double tractionCalibration = calibrated ? k["cekis"].N() : 1;
      return new PointMass {
        Gravity = g,
        Lateral = k["yanal"].N() * Math.Pow(muY / referenceMu, k["us"].N()) * referenceMu * g,
        LateralRaw = muY * g,
        Longitudinal = k["fren"].N() * muX * g,
        Downforce = .5 * 1.2 * f.DownforceArea / m,
        Drag = .5 * 1.2 * f.DragArea / m,
        Rolling = .012 * g,
        Brake = f.BrakeTorque / (f.Wheels[0].Radius * m),
        Traction = tractionCalibration * tractionShare * longitudinalGrip * g,
        TractionDownforce = tractionCalibration * (awd >= 1 ? .45 : awd > 0 ? .5 : .55) * longitudinalGrip,
        Turbo = turbo, TurboSeconds = c["tbs"].N(1),
        Thrust = (speed, boost) => {
          double best = 0;
          for (int gear = 1; gear <= 6; gear++) {
            double ratio = PowertrainParameters.GearRatio(gear) * engine.FinalDrive;
            double u = speed / radius * ratio / wMax;
            if (u > (calibrated ? 1 : 1.02)) continue;
            double effective = Math.Max(u, engine.LaunchRpm / engine.MaxRpm);
            double pressureFactor = turbo != 0 ? 1 - turbo * (1 - Math.Min(boost, Smooth(threshold - .2, threshold, effective))) : 1;
            double force = engine.PeakTorque * PowertrainParameters.TorqueCurve(effective) * pressureFactor * ratio * engine.Efficiency / radius;
            best = Math.Max(best, powerCalibration * force / m);
          }
          return best;
        }
      };
    }

    private static double Smooth(double a, double b, double x)
    {
      double t = Math.Max(0, Math.Min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }

    private static double[] Straight(PointMass n)
    {
      double maximum = 0;
      for (double speed = 1; speed < 150; speed += .1) {
        if (n.Thrust(speed, 1) - n.Drag * speed * speed - n.Rolling <= 0) break;
        maximum = speed;
      }
      double v = 0, time = 0, boost = 0;
      const double h = 1.0 / 120;
      while (v < 27.78 && time < 30) {
        double a = Math.Min(n.Thrust(v, boost), n.Traction + n.TractionDownforce * n.Downforce * v * v) - n.Drag * v * v - n.Rolling;
        v += a * h; time += h;
        if (n.Turbo != 0) boost += (1 - boost) * Math.Min(1, h / n.TurboSeconds);
      }
      double distance = 0; v = 27.78;
      while (v > .3) {
        double a = Math.Min(n.Brake, n.Longitudinal * (1 + n.Downforce * v * v / n.Gravity)) + n.Drag * v * v + n.Rolling;
        distance += v * h; v -= a * h;
      }
      return new[] { maximum, time, distance };
    }

    private static double Lateral(PointMass n, double share) => n.LateralRaw * (1 + n.Downforce * share / n.Gravity);

    private static double Lap(PointMass n, CatalogNode segment)
    {
      var curvature = segment["k"].Items.Select(x => x.N()).ToArray();
      var dx = segment["dx"].Items.Select(x => x.N()).ToArray();
      int count = curvature.Length;
      bool closed = segment["kapali"].B();
      var limits = new double[count]; var braking = new double[count];
      for (int i = 0; i < count; i++) {
        double p = curvature[i] - n.Lateral * n.Downforce / n.Gravity;
        limits[i] = braking[i] = p > 1e-6 ? Math.Sqrt(n.Lateral / p) : 200;
      }
      for (int j = (closed ? 2 * count : count) - 2; j >= 0; j--) {
        int i = j % count; double speed = braking[(i + 1) % count];
        double maximum = n.Lateral * (1 + n.Downforce * speed * speed / n.Gravity);
        double side = Math.Min(1, speed * speed * curvature[i] / maximum);
        double a = Math.Min(n.Brake, n.Longitudinal * (1 + n.Downforce * speed * speed / n.Gravity)) * Math.Sqrt(1 - side * side) + n.Drag * speed * speed + n.Rolling;
        braking[i] = Math.Min(limits[i], Math.Sqrt(speed * speed + 2 * a * dx[i]));
      }
      double v = .5, boost = 0, time = 0;
      for (int lap = 0; lap < (closed ? 2 : 1); lap++) {
        time = 0;
        for (int i = 0; i < (closed ? count : count - 1); i++) {
          double maximum = n.Lateral * (1 + n.Downforce * v * v / n.Gravity);
          double side = Math.Min(1, v * v * curvature[i] / maximum);
          double traction = (n.Traction + n.TractionDownforce * n.Downforce * v * v) * Math.Sqrt(1 - side * side);
          double a = Math.Min(n.Thrust(v, boost), traction) - n.Drag * v * v - n.Rolling;
          double v2 = Math.Sqrt(Math.Max(.25, v * v + 2 * a * dx[i]));
          double next = Math.Min(v2, braking[(i + 1) % count]);
          double dt = 2 * dx[i] / (v + next);
          if (n.Turbo != 0) boost += next >= v2 - 1e-9 ? (1 - boost) * Math.Min(1, dt / n.TurboSeconds) : -boost * Math.Min(1, dt / (.3 * n.TurboSeconds));
          v = next; time += dt;
        }
      }
      return time;
    }

    public static CatalogNode Calculate(VehicleCatalog catalog, CatalogSetup setup, string tur = "asfalt")
    {
      var cars = catalog.Data["cars"].Items.ToArray();
      int carIndex = Array.FindIndex(cars, c => c["k"].S() == setup.Car["k"].S());
      if (carIndex < 0) throw new ArgumentException("Katalogda olmayan stok araç.");
      var stock = cars[carIndex];
      int scoreTire = catalog.Data["tires"].Items.Select((t, i) => new { t, i }).First(x => x.t["n"].S() == "Karışık").i;
      var own = catalog.Setup(carIndex, Array.Empty<string>());
      var baseScore = WithTire(own, scoreTire); var scoreSetup = WithTire(setup, scoreTire);
      var d0 = Straight(Point(catalog, baseScore, "asfalt", false));
      var d = Straight(Point(catalog, scoreSetup, "asfalt", false));
      double grip0 = Lateral(Point(catalog, baseScore, "asfalt"), 625);
      double terrain0 = Lateral(Point(catalog, baseScore, "ralli"), 400);
      double grip = Lateral(Point(catalog, own, "asfalt"), 625) * Lateral(Point(catalog, scoreSetup, "asfalt"), 625) / grip0;
      double terrain = Lateral(Point(catalog, own, "ralli"), 400) * Lateral(Point(catalog, scoreSetup, "ralli"), 400) / terrain0;
      double speed = stock["vmax"].N(d0[0] * 3.6) * d[0] / d0[0];
      double acceleration = stock["a100"].N() * d[1] / d0[1];
      double braking = stock["b100"].N() * d[2] / d0[2];
      var raw = new[] { 300 * Math.Pow(setup.Car["hp"].N() / setup.Car["kg"].N(), 1.25),
        150 / acceleration, speed / 3, Math.Max(0, grip - 12) * 3.1, Math.Max(0, 600 / braking - 15), terrain * 6 };
      double total = raw.Sum(); int target = (int)Math.Max(100, Math.Min(999, Math.Floor(total + .5)));
      var fraction = raw.Select(x => x * target / total).ToArray();
      var points = fraction.Select(x => (int)Math.Floor(x)).ToArray();
      int left = target - points.Sum();
      foreach (int i in Enumerable.Range(0, 6).OrderByDescending(i => fraction[i] - points[i])) {
        if (left-- <= 0) break; points[i]++;
      }
      var result = CatalogNode.Obj();
      result.Set("puan", CatalogNode.Num(target));
      result.Set("sinif", CatalogNode.Str(Class(catalog, target)));
      result.Set("hiz", CatalogNode.Num(speed)); result.Set("ivme", CatalogNode.Num(acceleration));
      result.Set("tutus", CatalogNode.Num(grip)); result.Set("arazi", CatalogNode.Num(terrain)); result.Set("fren", CatalogNode.Num(braking));
      result.Set("ozellikler", CatalogNode.Arr(points.Select((value, i) => {
        var feature = CatalogNode.Obj(); feature.Set("ad", catalog.Data["featureNames"][i]); feature.Set("puan", CatalogNode.Num(value)); return feature;
      })));
      var track = catalog.Data["performanceTracks"][tur];
      var mass = Point(catalog, setup, track["kal"].S());
      result.Set("tur", CatalogNode.Num(track["bolum"].Items.Sum(segment => Lap(mass, segment))));
      result.Set("zemin", CatalogNode.Str(tur));
      return result;
    }

    public static string Class(VehicleCatalog catalog, double points)
    {
      var classes = catalog.Data["classes"].Items.ToArray();
      return (classes.FirstOrDefault(c => points <= c["max"].N()) ?? classes[classes.Length - 1])["h"].S();
    }
  }
}
