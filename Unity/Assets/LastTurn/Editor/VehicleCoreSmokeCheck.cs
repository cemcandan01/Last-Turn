using System;
using System.IO;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.EditorValidation
{
  // JsonUtility alanları deserialization sırasında doldurur; yalnız bu DTO'larda CS0649 beklenir.
#pragma warning disable 0649
  internal static class VehicleCoreSmokeCheck
  {
    [Serializable] private sealed class Fixture { public Scenario[] scenarios; }
    [Serializable] private sealed class Scenario { public Geometry parameters; public Car car; public Tire[] tires; }
    [Serializable] private sealed class Car { public double w, lift, dk, dmax; }
    [Serializable] private sealed class Tire { public double muY, muX, kp, ap, C; }
    [Serializable] private sealed class Wheel { public double x,z,r,ay,Lr,k,cb,cr,tampon,c0,Fz0,I; public bool on; }
    [Serializable] private sealed class Geometry
    {
      public double m,cgY,cgZ,aks,awd,fren,frenOn,CdA,ClA,diff;
      public double[] I,arb;
      public Wheel[] tk;
    }
    internal static VehicleParameters Parameters(string project, string relative = "Validation/Reference/four-wheel-0.8.18.json", int index = 0)
    {
      var fixture = JsonUtility.FromJson<Fixture>(File.ReadAllText(Path.Combine(project, relative)));
      var scenario = fixture.scenarios[index]; var f = scenario.parameters; var car = scenario.car;
      var wheels = new WheelGeometry[4]; var tires = new TireParameters[4];
      for (int i = 0; i < 4; i++)
      {
        var t = f.tk[i]; var tire = scenario.tires[i];
        wheels[i] = new WheelGeometry(t.x,t.z,t.r,t.on,t.ay,t.Lr,t.k,t.cb,t.cr,t.tampon,t.c0,t.Fz0,t.I);
        tires[i] = new TireParameters(tire.muY,tire.muX,tire.kp,tire.ap,tire.C);
      }
      return new VehicleParameters(f.m,new BodyVector(f.I[0],f.I[1],f.I[2]),f.cgY,f.cgZ,f.aks,wheels,tires,
        f.arb[0],f.arb[1],f.awd,f.fren,f.frenOn,f.CdA,f.ClA,f.diff,car.dk==0?220:car.dk,car.w,car.lift,car.dmax==0?.8:car.dmax);
    }
    internal static int Run(string project)
    {
      var parameters = Parameters(project);
      var a = new FourWheelVehicle(parameters,12); var b = new FourWheelVehicle(parameters,12);
      for (int k = 0; k < 600; k++)
      {
        var command = new VehicleCommand(.08*Math.Sin(k/90.0),k<300?1200:0,k<300?0:.3,false,1,3.7);
        a.Step(command); b.Step(command);
        var av = Values(a.State); var bv = Values(b.State);
        for (int j = 0; j < av.Length; j++)
          if (double.IsNaN(av[j]) || double.IsInfinity(av[j]) || BitConverter.DoubleToInt64Bits(av[j]) != BitConverter.DoubleToInt64Bits(bv[j]))
            throw new InvalidOperationException("Unity dört teker kısa tekrar kontrolü başarısız.");
      }
      var runner = new VehicleFixedStepRunner(new FourWheelVehicle(parameters));
      if (runner.Advance(1.0/30,_=>new VehicleCommand(0,0,0)) != 2) throw new InvalidOperationException("Unity dört teker sabit adım kontrolü başarısız.");
      return a.State.Steps;
    }
    internal static double[] Values(VehicleState s)
    {
      var p=s.Position;var q=s.Orientation;var v=s.Velocity;var w=s.AngularVelocity;
      var values=new double[45];var body=new[]{p.X,p.Y,p.Z,q.X,q.Y,q.Z,q.W,v.X,v.Y,v.Z,w.X,w.Y,w.Z};
      Array.Copy(body,values,13);
      for(int i=0;i<4;i++)
      {
        var t=s.Wheels[i];var wheel=new[]{t.Omega,t.Angle,t.Compression,t.Load,t.Kappa,t.TanAlpha,t.AbsMultiplier,t.Contact?1.0:0};
        Array.Copy(wheel,0,values,13+8*i,8);
      }
      return values;
    }
  }
#pragma warning restore 0649
}
