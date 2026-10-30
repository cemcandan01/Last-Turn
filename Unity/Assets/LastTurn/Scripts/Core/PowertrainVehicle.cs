using System;

namespace LastTurn.Core
{
  public sealed class PowertrainVehicle
  {
    public const double FixedDelta = FourWheelVehicle.FixedDelta;
    private readonly PowertrainParameters p;
    private readonly FourWheelVehicle body;
    public VehicleState Body => body.State;
    public PowertrainState Engine { get; private set; } = null!;
    public PowertrainVehicle(PowertrainParameters parameters, double initialSpeed = 0, int initialGear = 1)
    {
      p = parameters ?? throw new ArgumentNullException(nameof(parameters));
      PowertrainParameters.GearRatio(initialGear);
      body = new FourWheelVehicle(p.Chassis, initialSpeed);
      Engine = Initial(initialGear);
    }
    private static PowertrainState Initial(int gear) => new PowertrainState { Rpm = 900, Gear = gear };
    public void Reset(double initialSpeed = 0, int initialGear = 1)
    {
      PowertrainParameters.GearRatio(initialGear);
      body.Reset(initialSpeed);
      Engine = Initial(initialGear);
    }
    private static double Clamp(double x, double a, double b) => Math.Max(a, Math.Min(b, x));
    private static double Smooth(double a, double b, double x) { double t = Clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    public void Step(DrivingInput input)
    {
      var previous = Engine;
      double dt = FixedDelta;
      double rate = input.AnalogSteering ? 14 * p.SteeringSensitivity : input.Steering == 0 ? 10 : p.SmoothSteering ? 6.5 * p.SteeringSensitivity : 30;
      double st = previous.Steering + (input.Steering - previous.Steering) * Math.Min(1, rate * dt);
      double gas = previous.Gas + (input.Throttle - previous.Gas) * Math.Min(1, dt * (2 + 18 * p.ThrottleResponse));
      var forward = Body.Orientation.Rotate(new BodyVector(0, 0, 1));
      double heading = Math.Atan2(forward.X, forward.Z), fx = Math.Sin(heading), fz = Math.Cos(heading);
      double vl = Body.Velocity.X * fx + Body.Velocity.Z * fz, vt = Body.Velocity.X * fz - Body.Velocity.Z * fx;
      double ab = Math.Abs(Math.Atan2(vt, Math.Max(vl, .5))), spn = Math.Min(1, Math.Abs(vl) / 77.2);
      // Drift/viraj/ESC yardımları bu dilimde kapalı; kaynak ss/sm seçenekleri korunur.
      double delta = st * p.SteeringLock * (p.SpeedSensitiveSteering ? 1 - .5 * Math.Pow(spn, .8) * (1 - Smooth(.1, .3, ab)) : 1);
      delta = Clamp(delta, -p.Chassis.MaxSteering, p.Chassis.MaxSteering);
      double throttle = gas, brake = input.Brake;
      if (p.Tcs > 0 && !input.Handbrake) throttle *= 1 - p.Tcs * Smooth(.12, .35, ab);
      int gear = previous.Gear;
      if (brake > 0 && vl < .5 && input.Throttle < .05) gear = -1;
      else if (gear == -1 && input.Throttle > .05) gear = 1;
      if (gear == -1) { throttle = brake; brake = 0; }
      double slipLimit = 1e9;
      if (p.Tcs > 0 && !input.Handbrake) slipLimit = 1.2 + 2.5 * (1 - p.Tcs);
      if (!input.AnalogThrottle && !input.Handbrake)
        slipLimit = Math.Min(slipLimit, 1 + 4 * (.02 + .08 * p.LaunchFactor) + Math.Max(0, Math.Abs(vl) - 6) * .25);
      double ratio = PowertrainParameters.GearRatio(gear) * p.FinalDrive;
      var wheels = Body.Wheels;
      double driven = (1 - p.Chassis.FrontDriveShare) * ((wheels[2].Omega + wheels[3].Omega) / 2)
        + p.Chassis.FrontDriveShare * ((wheels[0].Omega + wheels[1].Omega) / 2);
      double wheelRpm = Math.Abs(driven * ratio) * 60 / (2 * Math.PI);
      double timer = previous.ShiftTimer - dt;
      if (!input.Handbrake && timer < -.6 && gear > 0)
      {
        double groundRpm = Math.Abs(vl / p.Chassis.Wheels[2].Radius) * Math.Abs(ratio) * 60 / (2 * Math.PI);
        if (Math.Min(wheelRpm, groundRpm * 1.15) > .95 * p.MaxRpm && gear < 6) { gear++; timer = .12; }
        else if (gear > 1 && wheelRpm < (throttle > .5 ? .42 : .3) * p.MaxRpm
          && wheelRpm * PowertrainParameters.GearRatio(gear - 1) / PowertrainParameters.GearRatio(gear) < .85 * p.MaxRpm)
        { gear--; timer = .1; }
      }
      // devirT kaynakta eski oranla hesaplanır; geçiş sonrası Tw yeni oranı kullanır. Sıra değiştirilmez.
      ratio = PowertrainParameters.GearRatio(gear) * p.FinalDrive;
      double launch = p.IdleRpm + (p.LaunchRpm - p.IdleRpm) * Math.Min(1, throttle * 1.5);
      double coupled = Math.Max(wheelRpm, throttle > .05 ? launch : p.IdleRpm), u = coupled / p.MaxRpm;
      double rpm = previous.Rpm + (coupled - previous.Rpm) * Math.Min(1, dt * 12);
      double boost = previous.Turbo, turboFactor = 1;
      if (p.TurboShare != 0)
      {
        double target = throttle * Smooth(p.TurboThreshold - .2, p.TurboThreshold, u);
        boost += (target - boost) * Math.Min(1, dt / (target > boost ? p.TurboSeconds : p.TurboSeconds * .3));
        turboFactor = 1 - p.TurboShare * (1 - boost);
      }
      double torque = 0;
      if (timer <= 0)
      {
        torque = u < 1.02 ? p.PeakTorque * PowertrainParameters.TorqueCurve(u) * throttle * turboFactor : 0;
        if (wheelRpm > p.IdleRpm) torque -= p.PeakTorque * .15 * u * (1 - throttle);
      }
      double drive = torque * ratio * p.Efficiency;
      double hold = Math.Abs(vl) < .6 && throttle < .05 && brake < .05 ? .3 : 0;
      var next = new PowertrainState { Gas = gas, Steering = st, Rpm = rpm, Gear = gear, ShiftTimer = timer,
        Turbo = boost, EngineTorque = torque, DriveTorque = drive, CoupledRpm = coupled, EffectiveGas = throttle,
        EffectiveBrake = brake + hold, SlipLimit = slipLimit, SteeringAngle = delta };
      // Gövde başarısızsa motorun kısmen ilerlemiş durumu yayımlanmaz.
      body.Step(new VehicleCommand(delta, drive, brake + hold, input.Handbrake, p.Abs, slipLimit));
      Engine = next;
    }
  }
}
