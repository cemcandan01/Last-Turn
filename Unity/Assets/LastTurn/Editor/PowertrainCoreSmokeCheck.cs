using System;
using System.IO;
using System.Linq;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.EditorValidation
{
  // JsonUtility tarafından doldurulan DTO alanları.
#pragma warning disable 0649
  internal static class PowertrainCoreSmokeCheck
  {
    [Serializable] private sealed class Fixture { public Scenario[] scenarios; }
    [Serializable] private sealed class Scenario { public Motor parameters; public Car car; public Tune tuning; public double tcs,abs; public bool smoothSteering,speedSensitiveSteering; }
    [Serializable] private sealed class Motor { public double tork,devirMax,devirMin,kalkis,son,verim; }
    [Serializable] private sealed class Car { public double tb,tbs,tbu; }
    [Serializable] private sealed class Tune { public double thr,lch, @lock,sens; }
    internal static int Run(string project)
    {
      const string relative = "Validation/Reference/powertrain-0.8.18.json";
      var fixture = JsonUtility.FromJson<Fixture>(File.ReadAllText(Path.Combine(project,relative)));
      int steps = 0;
      foreach (int index in new[]{1,4})
      {
        var s = fixture.scenarios[index]; var f = s.parameters; var c = s.car; var t = s.tuning;
        var parameters = new PowertrainParameters(VehicleCoreSmokeCheck.Parameters(project,relative,index),f.tork,f.devirMax,f.devirMin,f.kalkis,f.son,f.verim,
          t.thr,t.lch,t.@lock,t.sens,c.tb,c.tbs==0?1:c.tbs,c.tbu==0?.6:c.tbu,s.tcs,s.abs,s.smoothSteering,s.speedSensitiveSteering);
        var a = new PowertrainVehicle(parameters,index==4?15:0); var b = new PowertrainVehicle(parameters,index==4?15:0);
        for(int k=0;k<600;k++)
        {
          var input = new DrivingInput(k<400?1:0,0,.06*Math.Sin(k/100.0),index!=4,index!=4,index==4&&k>=280&&k<330);
          a.Step(input); b.Step(input);
          var av = Values(a); var bv = Values(b);
          for(int j=0;j<av.Length;j++)
            if(double.IsNaN(av[j])||double.IsInfinity(av[j])||BitConverter.DoubleToInt64Bits(av[j])!=BitConverter.DoubleToInt64Bits(bv[j]))
              throw new InvalidOperationException("Unity motor/aktarma kısa kontrolü başarısız.");
        }
        var runner = new PowertrainFixedStepRunner(new PowertrainVehicle(parameters));
        if(runner.Advance(1.0/30,_=>default)!=2)throw new InvalidOperationException("Unity motor sabit adımı başarısız.");
        steps += a.Body.Steps;
      }
      return steps;
    }
    private static double[] Values(PowertrainVehicle v)
    {
      var e = v.Engine;
      return VehicleCoreSmokeCheck.Values(v.Body).Concat(new[]{e.Gas,e.Steering,e.Rpm,(double)e.Gear,e.ShiftTimer,e.Turbo,e.EngineTorque,e.DriveTorque,e.CoupledRpm,e.EffectiveGas,e.EffectiveBrake,e.SlipLimit,e.SteeringAngle}).ToArray();
    }
  }
#pragma warning restore 0649
}
