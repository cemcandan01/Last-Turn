using System;

namespace LastTurn.Core
{
  // Yalnız sahne üst kurulumu: kabul edilmiş GT geri kesicisi ve TerrainTest kaynak dengesi.
  public static class GarageDriveParameters
  {
    public static CatalogSetup Configure(VehicleCatalog catalog, CatalogSetup setup, bool terrain, string raceType = "")
    {
      var copy = new CatalogSetup { Car = setup.Car.Clone(), Tuning = setup.Tuning, Assists = setup.Assists,
        Parts = (string[])setup.Parts.Clone(), Preset = setup.Preset, Tire = setup.Tire, Affinity = setup.Affinity };
      if (raceType != "") copy.Tire = catalog.RaceTire(raceType, copy.Parts);
      if (terrain)
      {
        // TS 0.8.18 mutant-kosu.ts TOPRAK_ACIK_PAYI; yeni genel tutuş bonusu değildir.
        double tireGrip = catalog.Data["tires"][copy.Tire]["g"][0].N(1);
        double combined = tireGrip * copy.Car["gr"][0].N();
        if (combined < 1)
          copy.Car.Set("gr", CatalogNode.Arr(new[] { CatalogNode.Num((1 - (1 - combined) * .55) / tireGrip), copy.Car["gr"][1] }));
      }
      return copy;
    }
    public static PowertrainParameters Create(VehicleCatalog catalog, CatalogSetup setup, bool terrain, string raceType = "")
    {
      var copy = Configure(catalog,setup,terrain,raceType);
      var p = catalog.CreatePhysics(copy);
      // Yüksek kalkış devirli paketlere yeni bir geri devir ayarı uydurma; kaynak motor sınırı kalır.
      if (copy.Car["k"].S() != "gt" || p.LaunchRpm > 3000) return p;
      return new PowertrainParameters(p.Chassis, p.PeakTorque, p.MaxRpm, p.IdleRpm, p.LaunchRpm, p.FinalDrive,
        p.Efficiency, p.ThrottleResponse, p.LaunchFactor, p.SteeringLock, p.SteeringSensitivity, p.TurboShare,
        p.TurboSeconds, p.TurboThreshold, p.Tcs, p.Abs, p.SmoothSteering, p.SpeedSensitiveSteering, 3000);
    }
  }
}
