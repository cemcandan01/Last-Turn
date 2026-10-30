using System;

namespace LastTurn.Core
{
  // Kaynak aracFizigi / araç / önayar değerleri; yeni motor veya araç dengesi türetilmez.
  public sealed class PowertrainParameters
  {
    public VehicleParameters Chassis { get; }
    public readonly bool SmoothSteering, SpeedSensitiveSteering;
    public readonly double PeakTorque, MaxRpm, IdleRpm, LaunchRpm, FinalDrive, Efficiency,
      ThrottleResponse, LaunchFactor, SteeringLock, SteeringSensitivity, TurboShare, TurboSeconds, TurboThreshold, Tcs, Abs;
    public PowertrainParameters(VehicleParameters chassis, double peakTorque, double maxRpm, double idleRpm,
      double launchRpm, double finalDrive, double efficiency, double throttleResponse, double launchFactor,
      double steeringLock, double steeringSensitivity, double turboShare = 0, double turboSeconds = 1,
      double turboThreshold = .6, double tcs = 0, double abs = 0, bool smoothSteering = true, bool speedSensitiveSteering = true)
    {
      Chassis = chassis ?? throw new ArgumentNullException(nameof(chassis));
      Numeric.Positive(peakTorque); Numeric.Positive(maxRpm); Numeric.Positive(idleRpm); Numeric.Positive(launchRpm);
      Numeric.Positive(finalDrive); Numeric.Positive(efficiency); Numeric.NonNegative(throttleResponse); Numeric.NonNegative(launchFactor);
      Numeric.Positive(steeringLock); Numeric.Positive(steeringSensitivity); Numeric.Positive(turboSeconds); Numeric.Finite(turboThreshold);
      VehicleParameters.Unit(turboShare); VehicleParameters.Unit(tcs); VehicleParameters.Unit(abs);
      if (maxRpm <= idleRpm || launchRpm < idleRpm) throw new ArgumentException("Motor devir aralığı geçersiz.");
      PeakTorque = peakTorque; MaxRpm = maxRpm; IdleRpm = idleRpm; LaunchRpm = launchRpm; FinalDrive = finalDrive; Efficiency = efficiency;
      ThrottleResponse = throttleResponse; LaunchFactor = launchFactor; SteeringLock = steeringLock; SteeringSensitivity = steeringSensitivity;
      TurboShare = turboShare; TurboSeconds = turboSeconds; TurboThreshold = turboThreshold; Tcs = tcs; Abs = abs;
      SmoothSteering = smoothSteering; SpeedSensitiveSteering = speedSensitiveSteering;
    }
    public static double TorqueCurve(double u) { Numeric.Finite(u); return Math.Max(.45, 1 - 1.4 * (u - .55) * (u - .55)); }
    public static double GearRatio(int gear)
    {
      switch (gear) { case -1: return -3; case 1: return 3.2; case 2: return 2.15; case 3: return 1.6; case 4: return 1.28; case 5: return 1.06; case 6: return .88; default: throw new ArgumentOutOfRangeException(nameof(gear)); }
    }
  }

  public readonly struct DrivingInput
  {
    public readonly double Throttle, Brake, Steering;
    public readonly bool AnalogThrottle, AnalogSteering, Handbrake;
    public DrivingInput(double throttle, double brake, double steering, bool analogThrottle = true, bool analogSteering = true, bool handbrake = false)
    {
      VehicleParameters.Unit(throttle); VehicleParameters.Unit(brake); Numeric.Finite(steering);
      if (Math.Abs(steering) > 1) throw new ArgumentOutOfRangeException(nameof(steering));
      Throttle = throttle; Brake = brake; Steering = steering; AnalogThrottle = analogThrottle; AnalogSteering = analogSteering; Handbrake = handbrake;
    }
  }
}
