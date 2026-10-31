using System;

namespace LastTurn.Core
{
  // TS 0.8.18 kurulum.as (LEVELS arc/norm/real + önayar ast/cap). Tutuş (grip), ivme (acc), fren (bra), ABS ve TCS kayma
  // sınırı parametre kurulumunda; burada yalnız adım içi yardımlar: viraj desteği (str), denge (stm), drift desteği (dft),
  // drift başlatma (ini). TCS'nin gövde açısıyla gaz kesmesi kabul edilmiş GT düzeltmesiyle (201d7b3) kullanılmaz.
  public sealed class DrivingAssists
  {
    public double Str, Stm, Dft, Ini;
    /// TS DRIFT_ONAYARLARI (dr, fd, fa): drift girişi eşiği 0,35 rad (diğerleri 0,55).
    public bool DriftPreset;
    /// TS F.vTasarim (driftte hız koruma hedefi) ve tu.aero × CAR.ae (viraj desteği Aeq).
    public double DesignSpeed, AeroFactor;
    public bool Any => Str != 0 || Stm != 0 || Dft != 0 || Ini != 0;
  }

  // Kaynak aracFizigi / araç / önayar değerleri; yeni motor veya araç dengesi türetilmez.
  public sealed class PowertrainParameters
  {
    public VehicleParameters Chassis { get; }
    public readonly bool SmoothSteering, SpeedSensitiveSteering;
    public readonly double PeakTorque, MaxRpm, IdleRpm, LaunchRpm, FinalDrive, Efficiency,
      ThrottleResponse, LaunchFactor, SteeringLock, SteeringSensitivity, TurboShare, TurboSeconds, TurboThreshold, Tcs, Abs, ReverseMaxRpm;
    public PowertrainParameters(VehicleParameters chassis, double peakTorque, double maxRpm, double idleRpm,
      double launchRpm, double finalDrive, double efficiency, double throttleResponse, double launchFactor,
      double steeringLock, double steeringSensitivity, double turboShare = 0, double turboSeconds = 1,
      double turboThreshold = .6, double tcs = 0, double abs = 0, bool smoothSteering = true, bool speedSensitiveSteering = true,
      double reverseMaxRpm = 0)
    {
      Chassis = chassis ?? throw new ArgumentNullException(nameof(chassis));
      Numeric.Positive(peakTorque); Numeric.Positive(maxRpm); Numeric.Positive(idleRpm); Numeric.Positive(launchRpm);
      Numeric.Positive(finalDrive); Numeric.Positive(efficiency); Numeric.NonNegative(throttleResponse); Numeric.NonNegative(launchFactor);
      Numeric.Positive(steeringLock); Numeric.Positive(steeringSensitivity); Numeric.Positive(turboSeconds); Numeric.Finite(turboThreshold);
      VehicleParameters.Unit(turboShare); VehicleParameters.Unit(tcs); VehicleParameters.Unit(abs);
      if (maxRpm <= idleRpm || launchRpm < idleRpm) throw new ArgumentException("Motor devir aralığı geçersiz.");
      Numeric.NonNegative(reverseMaxRpm);
      ReverseMaxRpm = reverseMaxRpm == 0 ? maxRpm : reverseMaxRpm;
      if (ReverseMaxRpm < launchRpm || ReverseMaxRpm > maxRpm) throw new ArgumentException("Geri devir sınırı kalkış ve azami devir arasında olmalı.");
      PeakTorque = peakTorque; MaxRpm = maxRpm; IdleRpm = idleRpm; LaunchRpm = launchRpm; FinalDrive = finalDrive; Efficiency = efficiency;
      ThrottleResponse = throttleResponse; LaunchFactor = launchFactor; SteeringLock = steeringLock; SteeringSensitivity = steeringSensitivity;
      TurboShare = turboShare; TurboSeconds = turboSeconds; TurboThreshold = turboThreshold; Tcs = tcs; Abs = abs;
      SmoothSteering = smoothSteering; SpeedSensitiveSteering = speedSensitiveSteering;
    }
    /// TS yardım değerleri (kurulum.as) ve drift yardımının ihtiyaç duyduğu araç bilgisi. null: yardım dalları yok
    /// (GT/Arazi prototipi; kabul edilmiş davranış aynen).
    public DrivingAssists Assists { get; internal set; } = null!;
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
