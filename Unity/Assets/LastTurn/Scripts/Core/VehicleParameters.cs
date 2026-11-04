using System;
using System.Collections.Generic;

namespace LastTurn.Core
{
  public readonly struct WheelGeometry
  {
    public readonly double X, Z, Radius, AttachmentY, RestLength, Spring, BumpDamping, ReboundDamping, BumpStart, StaticCompression, StaticLoad, Inertia;
    public readonly bool Front;
    public WheelGeometry(double x, double z, double radius, bool front, double attachmentY, double restLength,
      double spring, double bumpDamping, double reboundDamping, double bumpStart, double staticCompression, double staticLoad, double inertia)
    {
      Numeric.Finite(x); Numeric.Finite(z); Numeric.Positive(radius); Numeric.Finite(attachmentY); Numeric.Positive(restLength);
      Numeric.Positive(spring); Numeric.NonNegative(bumpDamping); Numeric.NonNegative(reboundDamping);
      Numeric.NonNegative(bumpStart); Numeric.NonNegative(staticCompression); Numeric.Positive(staticLoad); Numeric.Positive(inertia);
      X = x; Z = z; Radius = radius; Front = front; AttachmentY = attachmentY; RestLength = restLength; Spring = spring;
      BumpDamping = bumpDamping; ReboundDamping = reboundDamping; BumpStart = bumpStart;
      StaticCompression = staticCompression; StaticLoad = staticLoad; Inertia = inertia;
    }
  }

  // aracFizigi çıktısı açık parametre sözleşmesidir; burada yeni araç dengesi türetilmez.
  public sealed class VehicleParameters
  {
    public readonly double Mass, CgY, CgZ, Wheelbase, FrontAntiRoll, RearAntiRoll, FrontDriveShare,
      BrakeTorque, FrontBrakeShare, DragArea, DownforceArea, RearDifferential, DifferentialRate, Width, Lift, MaxSteering;
    public readonly BodyVector Inertia;
    public IReadOnlyList<WheelGeometry> Wheels { get; }
    public IReadOnlyList<TireParameters> Tires { get; }
    private readonly TireParameters[][] surfaceTires;
    public TireParameters TireForSurface(int surface,int wheel) { VehicleGround.Validate(surface);return surfaceTires[surface][wheel]; }
    public VehicleParameters(double mass, BodyVector inertia, double cgY, double cgZ, double wheelbase,
      WheelGeometry[] wheels, TireParameters[] tires, double frontAntiRoll, double rearAntiRoll,
      double frontDriveShare, double brakeTorque, double frontBrakeShare, double dragArea, double downforceArea,
      double rearDifferential, double differentialRate, double width, double lift, double maxSteering,
      TireParameters[][] surfaceTires = null!)
    {
      Numeric.Positive(mass); Numeric.Positive(inertia.X); Numeric.Positive(inertia.Y); Numeric.Positive(inertia.Z);
      Numeric.Positive(cgY); Numeric.Finite(cgZ); Numeric.Positive(wheelbase); Numeric.NonNegative(frontAntiRoll); Numeric.NonNegative(rearAntiRoll);
      Numeric.NonNegative(brakeTorque); Numeric.NonNegative(dragArea); Numeric.NonNegative(downforceArea);
      Numeric.NonNegative(differentialRate); Numeric.Positive(width); Numeric.Finite(lift); Numeric.Positive(maxSteering);
      Unit(frontDriveShare); Unit(frontBrakeShare); Unit(rearDifferential);
      if (wheels == null || tires == null || wheels.Length != 4 || tires.Length != 4) throw new ArgumentException("Dört teker/lastik gerekli.");
      for (int i = 0; i < 4; i++)
      {
        Numeric.Positive(wheels[i].Spring); Numeric.Positive(wheels[i].Inertia); Numeric.Positive(wheels[i].Radius); tires[i].Validate();
        if (wheels[i].Front != (i < 2)) throw new ArgumentException("Teker sırası: ön sol/sağ, arka sol/sağ.");
      }
      Mass = mass; Inertia = inertia; CgY = cgY; CgZ = cgZ; Wheelbase = wheelbase;
      Wheels = Array.AsReadOnly((WheelGeometry[])wheels.Clone()); Tires = Array.AsReadOnly((TireParameters[])tires.Clone());
      if(surfaceTires!=null && surfaceTires.Length!=6)throw new ArgumentException("Altı yüzey lastik tablosu gerekli.");
      this.surfaceTires=new TireParameters[6][];
      for(int surface=0;surface<6;surface++)
      {
        var row=surfaceTires==null?tires:surfaceTires[surface];
        if(row==null || row.Length!=4)throw new ArgumentException("Her yüzeyde dört lastik gerekli.");
        foreach(var tire in row)tire.Validate();
        this.surfaceTires[surface]=(TireParameters[])row.Clone();
      }
      FrontAntiRoll = frontAntiRoll; RearAntiRoll = rearAntiRoll; FrontDriveShare = frontDriveShare;
      BrakeTorque = brakeTorque; FrontBrakeShare = frontBrakeShare; DragArea = dragArea; DownforceArea = downforceArea;
      RearDifferential = rearDifferential; DifferentialRate = differentialRate; Width = width; Lift = lift; MaxSteering = maxSteering;
    }
    internal static void Unit(double x) { Numeric.NonNegative(x); if (x > 1) throw new ArgumentOutOfRangeException(nameof(x)); }
  }

  /// TS adım içi yardım hedefleri (model.ts): lastik drift yumuşatması kz, ini arka tutuş, viraj desteği kin/al, denge esc,
  /// drift yalpa desteği dw/wd, driftte hız koruma. Yoksa (null) gövde adımı yardımsız dalla aynıdır.
  public sealed class AssistCommand
  {
    public double Kz, RearGrip = 1, Kin, Al, Esc, Dw, Wd, AeroFactor, Spn, Support, SupportTarget, Heading;
  }

  public readonly struct VehicleCommand
  {
    public readonly double SteeringAngle, DriveTorque, Brake, AbsStrength, SlipLimit;
    public readonly bool Handbrake;
    public readonly AssistCommand Assist;
    public VehicleCommand(double steeringAngle, double driveTorque, double brake, bool handbrake, double absStrength, double slipLimit, AssistCommand assist)
      : this(steeringAngle, driveTorque, brake, handbrake, absStrength, slipLimit) { Assist = assist; }
    public VehicleCommand(double steeringAngle, double driveTorque, double brake, bool handbrake = false, double absStrength = 0, double slipLimit = 1e9)
    {
      Numeric.Finite(steeringAngle); Numeric.Finite(driveTorque); VehicleParameters.Unit(brake); VehicleParameters.Unit(absStrength); Numeric.NonNegative(slipLimit);
      SteeringAngle = steeringAngle; DriveTorque = driveTorque; Brake = brake; Handbrake = handbrake; AbsStrength = absStrength; SlipLimit = slipLimit; Assist = null!;
    }
  }
}
