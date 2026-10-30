using System.Text.Json;
using LastTurn.Core;

internal static class PowertrainValidation
{
  private static double N(JsonElement e,string p)=>e.GetProperty(p).GetDouble();
  internal static PowertrainParameters Parameters(JsonElement s)
  {
    var f=s.GetProperty("parameters");var c=s.GetProperty("car");var t=s.GetProperty("tuning");
    double Optional(string name,double fallback)=>c.TryGetProperty(name,out var v)?v.GetDouble():fallback;
    return new PowertrainParameters(VehicleValidation.Parameters(s),N(f,"tork"),N(f,"devirMax"),N(f,"devirMin"),N(f,"kalkis"),N(f,"son"),N(f,"verim"),
      N(t,"thr"),N(t,"lch"),N(t,"lock"),N(t,"sens"),Optional("tb",0),Optional("tbs",1),Optional("tbu",.6),N(s,"tcs"),N(s,"abs"),s.GetProperty("smoothSteering").GetBoolean(),s.GetProperty("speedSensitiveSteering").GetBoolean());
  }
  internal static double[] Values(PowertrainVehicle v)
  {
    var e=v.Engine;
    return VehicleValidation.Values(v.Body).Concat(new[]{e.Gas,e.Steering,e.Rpm,(double)e.Gear,e.ShiftTimer,e.Turbo,e.EngineTorque,e.DriveTorque,e.CoupledRpm,e.EffectiveGas,e.EffectiveBrake,e.SlipLimit,e.SteeringAngle}).ToArray();
  }
  internal static void Run()
  {
    using var fixture=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/powertrain-0.8.18.json")));
    using var corrected=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/powertrain-gt-fixes.json")));
    var root=fixture.RootElement;int checks=0,rowsCompared=0;
    void Check(bool b,string label){checks++;if(!b)throw new InvalidOperationException(label);}
    Check(root.GetProperty("baseline").GetString()=="df3549e709469f0b519ebfbeaa9f63c1040fee05","Motor baseline");
    Check(corrected.RootElement.GetProperty("baseline").GetString()==root.GetProperty("baseline").GetString(),"Düzeltme baseline");
    Check(corrected.RootElement.GetProperty("sources").EnumerateObject().All(s=>root.GetProperty("sources").GetProperty(s.Name).GetString()==s.Value.GetString()),"Düzeltme kaynak hash'leri");
    Check(corrected.RootElement.GetProperty("tolerances").EnumerateArray().Select(v=>v.GetDouble()).SequenceEqual(root.GetProperty("tolerances").EnumerateArray().Select(v=>v.GetDouble())),"Düzeltme toleransları");
    Check(N(root,"dt")==PowertrainVehicle.FixedDelta && N(root,"substeps")==FourWheelVehicle.Substeps,"Motor fixed step");
    var fields=root.GetProperty("fields").EnumerateArray().Select(v=>v.GetString()!).ToArray();
    double[] limits=new[]{1e-5,1e-5,1e-5,1e-6,1e-6,1e-6,1e-6,1e-5,1e-5,1e-5,1e-5,1e-5,1e-5}
      .Concat(Enumerable.Range(0,4).SelectMany(_=>new[]{1e-4,1e-4,1e-5,.05,1e-5,1e-5,1e-6,0}))
      .Concat(new[]{1e-10,1e-10,1e-5,0,1e-10,1e-10,1e-4,1e-4,1e-5,1e-10,1e-10,1e-10,1e-10}).ToArray();
    Check(root.GetProperty("tolerances").EnumerateArray().Select(v=>v.GetDouble()).SequenceEqual(limits),"Motor tolerances changed");
    var errors=new double[limits.Length];
    foreach(var original in root.GetProperty("scenarios").EnumerateArray().Concat(corrected.RootElement.GetProperty("scenarios").EnumerateArray().Skip(1)))
    {
      // Eski fixture korunur. Yalnız CG açısıyla gaz kesmeyi kullanan T16 izi,
      // sabit TS kaynağına açık tek düzeltme uygulanmış bağımsız oracle ile kıyaslanır.
      var scenario=original.GetProperty("name").GetString()=="turbo-handbrake-t16"?corrected.RootElement.GetProperty("scenarios")[0]:original;
      string name=scenario.GetProperty("name").GetString()!;var parameters=name=="accelerate-coast-gt"||name.StartsWith("gt-")?GtPrototypeParameters.Create():Parameters(scenario);
      double speed=N(scenario,"initialSpeed");int gear=scenario.GetProperty("initialGear").GetInt32();
      var a=new PowertrainVehicle(parameters,speed,gear);var b=new PowertrainVehicle(parameters,speed,gear);
      var inputs=new List<DrivingInput>();var states=new List<double[]>();
      foreach(var row in scenario.GetProperty("rows").EnumerateArray())
      {
        var i=row.GetProperty("input");var input=new DrivingInput(i[0].GetDouble(),i[1].GetDouble(),i[2].GetDouble(),i[3].GetBoolean(),i[4].GetBoolean(),i[5].GetBoolean());
        inputs.Add(input);a.Step(input);b.Step(input);var values=Values(a);states.Add(values);
        Check(values.Select(BitConverter.DoubleToInt64Bits).SequenceEqual(Values(b).Select(BitConverter.DoubleToInt64Bits)),name+" repeat");
        for(int j=0;j<values.Length;j++)
        {
          double error=Math.Abs(values[j]-row.GetProperty("values")[j].GetDouble());
          Check(double.IsFinite(values[j]) && error<=limits[j],$"{name} tick {inputs.Count} {fields[j]} diff {error:R} > {limits[j]:R}");
          errors[j]=Math.Max(errors[j],error);
        }
        rowsCompared++;
      }
      a.Reset(speed,gear);
      for(int i=0;i<inputs.Count;i++){a.Step(inputs[i]);Check(Values(a).Select(BitConverter.DoubleToInt64Bits).SequenceEqual(states[i].Select(BitConverter.DoubleToInt64Bits)),name+" reset");}
      foreach(var pattern in new[]{new[]{1.0/30},new[]{1.0/60},new[]{1.0/120},new[]{.009,.027,1.0/144,1.0/45}})
      {
        var sim=new PowertrainVehicle(parameters,speed,gear);var runner=new PowertrainFixedStepRunner(sim);double time=0;int frame=0;
        while(time<10-1e-12){double dt=Math.Min(pattern[frame++%pattern.Length],10-time);runner.Advance(dt,k=>inputs[k]);time+=dt;}
        Check(sim.Body.Steps==600 && Values(sim).Select(BitConverter.DoubleToInt64Bits).SequenceEqual(states[599].Select(BitConverter.DoubleToInt64Bits)),name+" cadence");
      }
      if(name=="idle-gt")Check(a.Engine.Rpm==900 && a.Engine.EffectiveBrake==.3 && a.Body.Velocity.Length<1e-12,"Idle + hold brake");
      if(name=="accelerate-coast-gt")
      {
        Check(states.Any(v=>v[48]>1),"Upshift missing");Check(states.Skip(450).Any(v=>v[51]<0),"Engine braking missing");
        Check(states.Any(v=>v[49]>0 && v[52]==0),"Shift torque cut missing");
      }
      if(name=="downshift-gt")Check(states.Any(v=>v[48]<gear && v[48]>0),"Downshift missing");
      if(name=="reverse-forward-rx")Check(states.Take(240).All(v=>v[48]==-1) && states.Skip(240).All(v=>v[48]>0),"Reverse/forward selection");
      if(name=="turbo-handbrake-t16")Check(states.Take(400).Max(v=>v[50])>.1 && states[599][50]<states.Take(400).Max(v=>v[50]),"Turbo fill/decay");
      var oldBody=a.Body;var oldEngine=a.Engine;
      try{a.Reset(0,0);throw new InvalidOperationException("Invalid gear accepted");}catch(ArgumentException){checks++;}
      Check(ReferenceEquals(oldBody,a.Body)&&ReferenceEquals(oldEngine,a.Engine),"Failed reset published state");
      Console.WriteLine($"PASS powertrain {name}: 600 × 58 values, repeat/reset + 4 cadences");
    }
    Check(PowertrainParameters.TorqueCurve(.55)==1,"Torque peak");
    Check(PowertrainParameters.GearRatio(-1)==-3 && PowertrainParameters.GearRatio(6)==.88,"Gear ratios");
    Console.WriteLine(JsonSerializer.Serialize(new{result="powertrain-passed",rowsCompared,checks,maxErrors=fields.Select((field,i)=>new{field,error=errors[i],tolerance=limits[i]})},new JsonSerializerOptions{WriteIndented=true}));
  }
}
