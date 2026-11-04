using System;
using System.Collections.Generic;

namespace LastTurn.Core
{
  public struct VehicleWheelState
  {
    public double Omega { get; internal set; }
    public double Angle { get; internal set; }
    public double Compression { get; internal set; }
    public double Load { get; internal set; }
    public double Kappa { get; internal set; }
    public double TanAlpha { get; internal set; }
    public double AbsMultiplier { get; internal set; }
    public bool Contact { get; internal set; }
    public int SurfaceIndex { get; internal set; }
    public BodyVector GroundNormal { get; internal set; }
  }

  public sealed class VehicleState
  {
    public BodyVector Position { get; internal set; }
    public BodyRotation Orientation { get; internal set; }
    public BodyVector Velocity { get; internal set; }
    public BodyVector AngularVelocity { get; internal set; }
    public int Steps { get; internal set; }
    public bool Airborne {get;internal set;}
    public int CenterSurface { get; internal set; } = 1;
    public double Wet { get; internal set; }
    public double Mud { get; internal set; }
    public double LastHitTime {get;internal set;}=-9;
    public double LastImpactSpeed {get;internal set;}
    public int CollisionCount {get;internal set;}
    internal readonly VehicleWheelState[] WheelData;
    public IReadOnlyList<VehicleWheelState> Wheels { get; }
    internal VehicleState(BodyVector position, BodyRotation orientation, BodyVector velocity, BodyVector angularVelocity, VehicleWheelState[] wheels, int steps = 0)
    {
      Position = position; Orientation = orientation; Velocity = velocity; AngularVelocity = angularVelocity; WheelData = wheels;
      Wheels = Array.AsReadOnly(WheelData); Steps = steps;
    }
    internal VehicleState Copy() => new VehicleState(Position, Orientation, Velocity, AngularVelocity, (VehicleWheelState[])WheelData.Clone(), Steps)
      { CenterSurface=CenterSurface,Wet=Wet,Mud=Mud,LastHitTime=LastHitTime,LastImpactSpeed=LastImpactSpeed,CollisionCount=CollisionCount,Airborne=Airborne };
    public double FrontLoad => Wheels[0].Load + Wheels[1].Load;
    public double RearLoad => Wheels[2].Load + Wheels[3].Load;
    public double LeftLoad => Wheels[0].Load + Wheels[2].Load;
    public double RightLoad => Wheels[1].Load + Wheels[3].Load;
  }
}
