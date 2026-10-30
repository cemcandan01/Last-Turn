using System;
using System.Collections.Generic;

namespace LastTurn.Core
{
  // TS 0.8.18 yeniAdim zemin/gövde modeli; aktarma çıkış torku açık girdi, ek sürüş yardımları kapalı.
  public sealed class FourWheelVehicle
  {
    public const double FixedDelta = 1.0 / 60;
    public const int Substeps = 8;
    public const double Gravity = 24;
    private readonly VehicleParameters p;
    private readonly IVehicleWorld world;
    public VehicleState State { get; private set; } = null!;
    public FourWheelVehicle(VehicleParameters parameters, double initialSpeed = 0, double heightOffset = 0, double yaw = 0, IVehicleWorld world = null!)
    {
      p = parameters ?? throw new ArgumentNullException(nameof(parameters));
      this.world=world ?? FlatAsphaltWorld.Instance;
      Reset(initialSpeed, heightOffset, yaw);
    }
    public void Reset(double initialSpeed = 0, double heightOffset = 0, double yaw = 0, double x = 0, double z = 0)
    {
      Numeric.Finite(initialSpeed); Numeric.Finite(heightOffset); Numeric.Finite(yaw);Numeric.Finite(x);Numeric.Finite(z);
      var q = BodyRotation.Yaw(yaw);
      var gh=new double[4];
      for(int i=0;i<4;i++){var t=p.Wheels[i];gh[i]=world.Height(x+t.X*Math.Cos(yaw)+t.Z*Math.Sin(yaw),z-t.X*Math.Sin(yaw)+t.Z*Math.Cos(yaw));}
      double front=(gh[0]+gh[1])/2,rear=(gh[2]+gh[3])/2,left=(gh[0]+gh[2])/2,right=(gh[1]+gh[3])/2;
      double pitch=Math.Atan2(front-rear,p.Wheelbase),roll=Math.Atan2(left-right,p.Wheels[0].X-p.Wheels[1].X);
      // Düz sıfır eğimde eski quaternion işlem sırası da korunur.
      if(pitch!=0 || roll!=0)q=BodyRotation.Multiply(BodyRotation.Multiply(q,new BodyRotation(Math.Sin(-pitch/2),0,0,Math.Cos(pitch/2))),new BodyRotation(0,0,Math.Sin(roll/2),Math.Cos(roll/2)));
      var position = q.Rotate(new BodyVector(0, p.CgY, p.CgZ)) + new BodyVector(x, (front+rear)/2+heightOffset, z);
      var wheels = new VehicleWheelState[4];
      for (int i = 0; i < 4; i++)
      {
        double omega = initialSpeed / p.Wheels[i].Radius;
        Numeric.Finite(omega);
        wheels[i] = new VehicleWheelState
        {
          Omega = omega, Compression = p.Wheels[i].StaticCompression,
          Load = p.Wheels[i].StaticLoad, Contact = true, AbsMultiplier = 1,SurfaceIndex=1,GroundNormal=new BodyVector(0,1,0)
        };
      }
      State = new VehicleState(position, q, BodyRotation.Yaw(yaw).Rotate(new BodyVector(0, 0, initialSpeed)), default, wheels);
    }
    private static double Clamp(double x, double lo, double hi) => Math.Max(lo, Math.Min(hi, x));
    private static double Smooth(double a, double b, double x) { double t = Clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    private BodyVector Point(VehicleState s, double x, double y, double z) => s.Orientation.Rotate(new BodyVector(x, y - p.CgY, z - p.CgZ)) + s.Position;
    private BodyVector[] BodyPoints()
    {
      double x = p.Width / 2 - .1, y = .18 + p.Lift, front = p.Wheels[0].Z + .8, rear = p.Wheels[2].Z - .8;
      return new[] { new BodyVector(x,y,front), new BodyVector(-x,y,front), new BodyVector(x,y,rear), new BodyVector(-x,y,rear),
        new BodyVector(x*.8,1.15,.3),new BodyVector(-x*.8,1.15,.3),new BodyVector(0,1.2,-.6) };
    }
    public void Step(VehicleCommand command)
    {
      // Önceki durum bir görüntüdür; başarısız adım kısmi durum yayımlamaz.
      var s = State.Copy();
      var normals=new BodyVector[4];var tires=new TireParameters[4];
      // Kaynak sırası: dört teker yüzeyi, en son merkez; lastik ve normal ana adımda sabit.
      for(int i=0;i<4;i++)
      {
        var t=p.Wheels[i];var a=Point(s,t.X,0,t.Z);var wheel=s.WheelData[i];
        wheel.SurfaceIndex=world.Surface(a.X,a.Z);VehicleGround.Validate(wheel.SurfaceIndex);s.WheelData[i]=wheel;
      }
      var origin=Point(s,0,0,0);s.CenterSurface=world.Surface(origin.X,origin.Z);VehicleGround.Validate(s.CenterSurface);
      s.Mud=s.CenterSurface==3?1:Math.Max(0,s.Mud-FixedDelta*Math.Sqrt(s.Velocity.X*s.Velocity.X+s.Velocity.Z*s.Velocity.Z)/(s.CenterSurface==1?120:200));
      s.Wet=Math.Max(0,s.Wet-FixedDelta/2.5);
      double grip=world.GripMultiplier;Numeric.NonNegative(grip);
      for(int i=0;i<4;i++)
      {
        var tire=p.TireForSurface(s.WheelData[i].SurfaceIndex,i);
        double factor=grip*(1-.3*s.Wet)/(1+.5*s.Mud);
        tires[i]=factor==1?tire:new TireParameters(tire.MuY*factor,tire.MuX*factor,tire.Kp,tire.Ap,tire.C);
        var t=p.Wheels[i];var a=Point(s,t.X,0,t.Z);normals[i]=VehicleGround.Normal(world,a.X,a.Z);
        var wheel=s.WheelData[i];wheel.GroundNormal=normals[i];s.WheelData[i]=wheel;
      }
      var steer = new double[4]; var drive = new double[4]; var brake = new double[4];
      double delta = Clamp(command.SteeringAngle, -p.MaxSteering, p.MaxSteering), tanD = Math.Tan(delta);
      for (int i = 0; i < 4; i++)
      {
        var t = p.Wheels[i]; var wheel = s.WheelData[i];
        steer[i] = t.Front ? delta + .6 * (Math.Atan((p.Wheelbase * tanD) / (p.Wheelbase - t.X * tanD)) - delta) : 0;
        drive[i] = t.Front ? command.DriveTorque * p.FrontDriveShare / 2 : command.Handbrake ? 0 : command.DriveTorque * (1 - p.FrontDriveShare) / 2;
        double target = 1 - command.AbsStrength * Smooth(1.1, 1.8, -wheel.Kappa / tires[i].Kp);
        wheel.AbsMultiplier += (target - wheel.AbsMultiplier) * Math.Min(1, FixedDelta * 30);
        brake[i] = p.BrakeTorque * command.Brake * (t.Front ? p.FrontBrakeShare : 1 - p.FrontBrakeShare) / 2 * wheel.AbsMultiplier
          + (command.Handbrake && !t.Front ? p.BrakeTorque * .55 : 0);
        s.WheelData[i] = wheel;
      }
      var points = new List<BodyVector>();
      foreach (var point in BodyPoints())
      {
        var a=Point(s,point.X,point.Y,point.Z);
        if (a.Y-world.Height(a.X,a.Z) < .6 + Math.Abs(s.Velocity.Y) * FixedDelta * 2) points.Add(point);
      }
      for (int n = 0; n < Substeps; n++) Substep(s, command, steer, drive, brake, points,normals,tires);
      s.Steps = checked(s.Steps + 1);
      State = s;
    }
    private void Substep(VehicleState s, VehicleCommand command, double[] steer, double[] drive, double[] brake, List<BodyVector> points,BodyVector[] normals,TireParameters[] tires)
    {
      double h = FixedDelta / Substeps;
      var left = s.Orientation.Rotate(new BodyVector(1, 0, 0));
      var up = s.Orientation.Rotate(new BodyVector(0, 1, 0));
      var forward = s.Orientation.Rotate(new BodyVector(0, 0, 1));
      var force = new BodyVector(0, -p.Mass * Gravity, 0); var torque = default(BodyVector);
      void Apply(BodyVector point, BodyVector f) { force += f; torque += BodyVector.Cross(point - s.Position, f); }
      var compression = new double[4]; var springForce = new double[4]; var distance = new double[4];
      for (int i = 0; i < 4; i++)
      {
        var t = p.Wheels[i]; var a = Point(s, t.X, t.AttachmentY, t.Z);
        var normal=normals[i];
        distance[i] = normal.Y*(a.Y-world.Height(a.X,a.Z)) / Math.Max(.2, BodyVector.Dot(normal,up));
        compression[i] = t.RestLength + t.Radius - distance[i];
      }
      for (int i = 0; i < 4; i++)
      {
        var t = p.Wheels[i]; var wheel = s.WheelData[i]; double c = compression[i];
        if (c <= 0) { wheel.Contact = false; wheel.Compression = 0; s.WheelData[i] = wheel; continue; }
        double cv = (c - wheel.Compression) / h;
        double f = t.Spring * c + (cv > 0 ? t.BumpDamping : t.ReboundDamping) * cv;
        if (c > t.BumpStart)
        {
          double penetration = c - t.BumpStart;
          f += t.Spring * 8 * penetration * penetration / (penetration + .03)
            + t.BumpDamping * 2 * Math.Max(0, cv) * Math.Min(1, penetration / .03);
        }
        springForce[i] = Clamp(f, 0, 12 * t.StaticLoad);
        wheel.Contact = true; wheel.Compression = c; s.WheelData[i] = wheel;
      }
      void AntiRoll(int a, int b, double k)
      {
        if (!s.WheelData[a].Contact || !s.WheelData[b].Contact) return;
        double f = k * (compression[a] - compression[b]);
        springForce[a] = Math.Max(0, springForce[a] + f); springForce[b] = Math.Max(0, springForce[b] - f);
      }
      AntiRoll(0, 1, p.FrontAntiRoll); AntiRoll(2, 3, p.RearAntiRoll);
      for (int i = 0; i < 4; i++)
      {
        var t = p.Wheels[i]; var wheel = s.WheelData[i]; var tire = tires[i];
        if (!wheel.Contact)
        {
          wheel.Omega = WheelSolver.Solve(wheel.Omega, t.Inertia, h, drive[i], brake[i], t.Radius, wheel.Omega * t.Radius, 1, 0, 0, tire).Omega * (1 - .5 * h);
          wheel.Load = 0; s.WheelData[i] = wheel; continue;
        }
        var contact = Point(s, t.X, t.AttachmentY, t.Z) - up * distance[i];
        var normal=normals[i];
        double load = springForce[i] * Math.Max(0, BodyVector.Dot(up,normal)); wheel.Load = load;
        var direction = forward * Math.Cos(steer[i]) + left * Math.Sin(steer[i]);
        direction -= normal*BodyVector.Dot(direction,normal);
        double length = direction.Length; direction *= 1 / (length == 0 ? 1 : length);
        var lateral = BodyVector.Cross(normal,direction);
        var velocity = s.Velocity + BodyVector.Cross(s.AngularVelocity, contact - s.Position);
        double longitudinal = BodyVector.Dot(velocity, direction), side = BodyVector.Dot(velocity, lateral);
        double dx = Math.Max(Math.Abs(longitudinal), 3), tanAlpha = side / Math.Max(Math.Abs(longitudinal), 2);
        double td = drive[i];
        if (command.SlipLimit < 1e8 && td != 0)
        {
          double sign = Math.Sign(td), limit = t.Radius * Math.Abs(TireModel.Evaluate(load, sign * command.SlipLimit * tire.Kp, tanAlpha, tire).Fx) * 1.03;
          if (Math.Abs(td) > limit) td = sign * limit;
        }
        double rolling = (.012+.02*VehicleGround.Resistance(wheel.SurfaceIndex)) * load * t.Radius * Math.Tanh(wheel.Omega);
        var result = WheelSolver.Solve(wheel.Omega, t.Inertia, h, td - rolling, brake[i], t.Radius, longitudinal, dx, load, tanAlpha, tire);
        wheel.Omega = result.Omega; wheel.Kappa = (wheel.Omega * t.Radius - longitudinal) / dx; wheel.TanAlpha = tanAlpha;
        s.WheelData[i] = wheel;
        Apply(contact, up * springForce[i] + direction * result.Force.Fx + lateral * result.Force.Fy);
      }
      void Couple(int a, int b, double k)
      {
        var wa = s.WheelData[a]; var wb = s.WheelData[b];
        double amount = (wa.Omega - wb.Omega) * Math.Min(1, h * k) * .5;
        wa.Omega -= amount; wb.Omega += amount; s.WheelData[a] = wa; s.WheelData[b] = wb;
      }
      if (p.FrontDriveShare < 1) Couple(2, 3, p.RearDifferential * p.DifferentialRate);
      if (p.FrontDriveShare > 0)
      {
        Couple(0, 1, 40);
        if (!command.Handbrake)
        {
          double front = (s.WheelData[0].Omega + s.WheelData[1].Omega) / 2, rear = (s.WheelData[2].Omega + s.WheelData[3].Omega) / 2;
          double amount = Math.Min(1, h * 20) * .5 * (front - rear);
          for (int i = 0; i < 4; i++) { var wheel = s.WheelData[i]; wheel.Omega += i < 2 ? -amount : amount; s.WheelData[i] = wheel; }
        }
      }
      double aero = .5 * 1.2 * p.DragArea * s.Velocity.Length;
      force -= s.Velocity * aero;
      double speedAlong = BodyVector.Dot(s.Velocity, forward), downforce = .5 * 1.2 * p.DownforceArea * speedAlong * speedAlong;
      Apply(Point(s, 0, p.CgY, p.Wheels[0].Z), up * (-downforce * .45));
      Apply(Point(s, 0, p.CgY, p.Wheels[2].Z), up * (-downforce * .55));
      bool contactAny=false;foreach(var wheel in s.WheelData)contactAny|=wheel.Contact;
      double resistance=VehicleGround.Resistance(s.CenterSurface),horizontal=Math.Sqrt(s.Velocity.X*s.Velocity.X+s.Velocity.Z*s.Velocity.Z);
      if(contactAny && resistance>0 && horizontal>.05)
      {
        double a=resistance*3+horizontal*resistance*.04;
        force-=new BodyVector(p.Mass*a*s.Velocity.X/horizontal,0,p.Mass*a*s.Velocity.Z/horizontal);
      }
      foreach (var bodyPoint in points)
      {
        var a = Point(s, bodyPoint.X, bodyPoint.Y, bodyPoint.Z); double penetration = world.Height(a.X,a.Z)-a.Y;
        if (penetration <= 0) continue;
        var velocity = s.Velocity + BodyVector.Cross(s.AngularVelocity, a - s.Position);
        var normal=VehicleGround.Normal(world,a.X,a.Z);double vn=BodyVector.Dot(velocity,normal);
        double kc = p.Mass * Gravity * 40;
        double normalForce = Clamp(kc * penetration - 2 * Math.Sqrt(kc * p.Mass) * vn, 0, 6 * p.Mass * Gravity);
        var tangent = velocity-normal*vn; double speed = tangent.Length;
        double friction = Math.Min(.5 * normalForce, p.Mass * (speed == 0 ? 1 : speed) / (8 * h));
        Apply(a, normal*normalForce - tangent * (friction / (speed == 0 ? 1 : speed)));
      }
      // TS aynı sırayı kullanır; jiroskopik omega×Iomega veya ek analitik yük transferi eklenmez.
      s.Velocity += new BodyVector(force.X / p.Mass * h, force.Y / p.Mass * h, force.Z / p.Mass * h);
      s.Position += s.Velocity * h;
      var localTorque = s.Orientation.Unrotate(torque);
      var acceleration = s.Orientation.Rotate(new BodyVector(localTorque.X / p.Inertia.X, localTorque.Y / p.Inertia.Y, localTorque.Z / p.Inertia.Z));
      s.AngularVelocity += acceleration * h;
      s.AngularVelocity *= 1 - .05 * h;
      s.Orientation = s.Orientation.Advance(s.AngularVelocity, h);
      for (int i = 0; i < 4; i++)
      {
        var wheel = s.WheelData[i]; wheel.Angle += wheel.Omega * h;
        Numeric.Finite(wheel.Omega); Numeric.Finite(wheel.Angle); Numeric.Finite(wheel.Load);
        s.WheelData[i] = wheel;
      }
    }
  }
}
