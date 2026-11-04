using System;

namespace LastTurn.Core
{
  public readonly struct DriveInput
  {
    public readonly double Throttle, Brake, SlipControl;
    public DriveInput(double throttle, double brake, double slipControl)
    {
      Numeric.Finite(throttle); Numeric.Finite(brake); Numeric.Finite(slipControl);
      if (throttle < 0 || throttle > 1 || brake < 0 || brake > 1 || Math.Abs(slipControl) > 1)
        throw new ArgumentOutOfRangeException(nameof(throttle));
      Throttle = throttle; Brake = brake; SlipControl = slipControl;
    }
  }

  public sealed class WheelDriveSettings
  {
    public double Mass { get; }
    public double Radius { get; }
    public double Inertia { get; }
    public double Load { get; }
    public double MaxDriveTorque { get; }
    public double MaxBrakeTorque { get; }
    public double SlipAngle { get; }
    public TireParameters Tire { get; }
    public WheelDriveSettings(double mass, double radius, double inertia, double load,
        double maxDriveTorque, double maxBrakeTorque, double slipAngle, TireParameters tire)
    {
      Numeric.Positive(mass); Numeric.Positive(radius); Numeric.Positive(inertia); Numeric.NonNegative(load);
      Numeric.NonNegative(maxDriveTorque); Numeric.NonNegative(maxBrakeTorque); Numeric.NonNegative(slipAngle); tire.Validate();
      Mass = mass; Radius = radius; Inertia = inertia; Load = load; MaxDriveTorque = maxDriveTorque;
      MaxBrakeTorque = maxBrakeTorque; SlipAngle = slipAngle; Tire = tire;
    }
  }

  public readonly struct DriveState
  {
    public readonly double Omega, Speed, Position, Angle;
    public readonly TireForce Force;
    public readonly int Steps;
    internal DriveState(double omega, double speed, double position, double angle, TireForce force, int steps)
    { Omega = omega; Speed = speed; Position = position; Angle = angle; Force = force; Steps = steps; }
  }

  // Fixed-load, longitudinal test rig. Not the full four-wheel game vehicle or its balance defaults.
  public sealed class WheelDriveBench
  {
    public const double FixedDelta = 1.0 / 60;
    public const int Substeps = 8;
    private readonly WheelDriveSettings settings;
    public DriveState State { get; private set; }
    public WheelDriveBench(WheelDriveSettings settings, double initialSpeed)
    { this.settings = settings ?? throw new ArgumentNullException(nameof(settings)); Reset(initialSpeed); }
    public void Reset(double initialSpeed)
    {
      Numeric.Finite(initialSpeed);
      double omega = initialSpeed / settings.Radius;
      Numeric.Finite(omega);
      State = new DriveState(omega, initialSpeed, 0, 0, default, 0);
    }
    public void Step(DriveInput input)
    {
      double omega = State.Omega, speed = State.Speed, position = State.Position, angle = State.Angle;
      TireForce force = default;
      double h = FixedDelta / Substeps;
      for (int i = 0; i < Substeps; i++)
      {
        var next = WheelSolver.Solve(omega, settings.Inertia, h, settings.MaxDriveTorque * input.Throttle,
            settings.MaxBrakeTorque * input.Brake, settings.Radius, speed, Math.Max(Math.Abs(speed), 3),
            settings.Load, Math.Tan(input.SlipControl * settings.SlipAngle), settings.Tire);
        omega = next.Omega; force = next.Force;
        speed += force.Fx / settings.Mass * h;
        position += speed * h;
        angle += omega * h;
      }
      // Reject arithmetic overflow without publishing a partially advanced state.
      Numeric.Finite(omega); Numeric.Finite(speed); Numeric.Finite(position); Numeric.Finite(angle);
      Numeric.Finite(force.Fx); Numeric.Finite(force.Fy); Numeric.Finite(force.Slip);
      State = new DriveState(omega, speed, position, angle, force, checked(State.Steps + 1));
    }
  }
}
