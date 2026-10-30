using System.Text.Json;
using LastTurn.Core;

internal static class VehicleValidation
{
  private static double N(JsonElement e, string key) => e.GetProperty(key).GetDouble();
  internal static VehicleParameters Parameters(JsonElement scenario)
  {
    var f = scenario.GetProperty("parameters"); var car = scenario.GetProperty("car");
    var wheels = f.GetProperty("tk").EnumerateArray().Select(t => new WheelGeometry(N(t,"x"),N(t,"z"),N(t,"r"),t.GetProperty("on").GetBoolean(),N(t,"ay"),N(t,"Lr"),N(t,"k"),N(t,"cb"),N(t,"cr"),N(t,"tampon"),N(t,"c0"),N(t,"Fz0"),N(t,"I"))).ToArray();
    var tires = scenario.GetProperty("tires").EnumerateArray().Select(t => new TireParameters(N(t,"muY"),N(t,"muX"),N(t,"kp"),N(t,"ap"),N(t,"C"))).ToArray();
    var inertia = f.GetProperty("I"); var arb = f.GetProperty("arb");
    return new VehicleParameters(N(f,"m"),new BodyVector(inertia[0].GetDouble(),inertia[1].GetDouble(),inertia[2].GetDouble()),N(f,"cgY"),N(f,"cgZ"),N(f,"aks"),
      wheels,tires,arb[0].GetDouble(),arb[1].GetDouble(),N(f,"awd"),N(f,"fren"),N(f,"frenOn"),N(f,"CdA"),N(f,"ClA"),N(f,"diff"),
      car.TryGetProperty("dk",out var dk)?dk.GetDouble():220,N(car,"w"),car.TryGetProperty("lift",out var lift)?lift.GetDouble():0,car.TryGetProperty("dmax",out var dm)?dm.GetDouble():.8);
  }
  private static FourWheelVehicle Simulation(JsonElement scenario, VehicleParameters parameters)
  {
    var initial = scenario.GetProperty("initial");
    double yaw = 2 * Math.Atan2(N(initial,"qy"),N(initial,"qw"));
    double speed = N(initial,"vx") * Math.Sin(yaw) + N(initial,"vz") * Math.Cos(yaw);
    return new FourWheelVehicle(parameters,speed,N(initial,"py")-parameters.CgY,yaw);
  }
  internal static double[] Values(VehicleState s)
  {
    var p=s.Position; var q=s.Orientation; var v=s.Velocity; var w=s.AngularVelocity;
    return new[]{p.X,p.Y,p.Z,q.X,q.Y,q.Z,q.W,v.X,v.Y,v.Z,w.X,w.Y,w.Z}.Concat(s.Wheels.SelectMany(t=>new[]{t.Omega,t.Angle,t.Compression,t.Load,t.Kappa,t.TanAlpha,t.AbsMultiplier,t.Contact?1.0:0})).ToArray();
  }
  private static bool Same(VehicleState a, VehicleState b) => a.Steps==b.Steps && Values(a).Select(BitConverter.DoubleToInt64Bits).SequenceEqual(Values(b).Select(BitConverter.DoubleToInt64Bits));
  internal static void Run()
  {
    using var fixture=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/four-wheel-0.8.18.json")));
    var root=fixture.RootElement;
    int checks=0,rowsCompared=0;
    void Check(bool value,string label) {checks++;if(!value)throw new InvalidOperationException(label);}
    Check(root.GetProperty("baseline").GetString()=="df3549e709469f0b519ebfbeaa9f63c1040fee05","Vehicle baseline");
    Check(N(root,"dt")==FourWheelVehicle.FixedDelta && N(root,"substeps")==FourWheelVehicle.Substeps,"Vehicle tick contract");
    var fields=root.GetProperty("fields").EnumerateArray().Select(e=>e.GetString()!).ToArray();
    var limits=new[]{1e-5,1e-5,1e-5,1e-6,1e-6,1e-6,1e-6,1e-5,1e-5,1e-5,1e-5,1e-5,1e-5}
      .Concat(Enumerable.Range(0,4).SelectMany(_=>new[]{1e-4,1e-4,1e-5,.05,1e-5,1e-5,1e-6,0})).ToArray();
    Check(root.GetProperty("tolerances").EnumerateArray().Select(e=>e.GetDouble()).SequenceEqual(limits),"Predeclared vehicle tolerances changed");
    var errors=new double[limits.Length];
    foreach(var scenario in root.GetProperty("scenarios").EnumerateArray())
    {
      string label=scenario.GetProperty("name").GetString()!;
      var parameters=Parameters(scenario); var a=Simulation(scenario,parameters); var b=Simulation(scenario,parameters);
      var initial=a.State; var states=new List<VehicleState>(); var inputs=new List<VehicleCommand>();
      foreach(var row in scenario.GetProperty("rows").EnumerateArray())
      {
        var c=row.GetProperty("command");
        var input=new VehicleCommand(c[0].GetDouble(),c[1].GetDouble(),c[2].GetDouble(),c[3].GetBoolean(),c[4].GetDouble(),c[5].GetDouble());
        inputs.Add(input);a.Step(input);b.Step(input);states.Add(a.State);
        Check(Same(a.State,b.State),label+" repeat");
        Check(initial.Steps==0,"Published snapshot mutated");
        var values=Values(a.State);
        for(int j=0;j<values.Length;j++)
        {
          double error=Math.Abs(values[j]-row.GetProperty("values")[j].GetDouble());
          Check(double.IsFinite(values[j]) && error<=limits[j],$"{label} step {inputs.Count} {fields[j]} error {error:R} > {limits[j]:R}");
          errors[j]=Math.Max(errors[j],error);
        }
        double qLength=Math.Sqrt(values[3]*values[3]+values[4]*values[4]+values[5]*values[5]+values[6]*values[6]);
        Check(Math.Abs(qLength-1)<1e-12,label+" quaternion norm");
        Check(a.State.Wheels.All(w=>w.Load>=0 && w.Compression>=0),label+" negative load/compression");
        rowsCompared++;
      }
      Check(inputs.Count==600,"Vehicle trace size");
      // Reset aynı başlangıç değerleriyle yeni koşuma eşdeğerdir; tüm durum bileşenleri karşılaştırılır.
      var reset=a;
      double yaw=2*Math.Atan2(initial.Orientation.Y,initial.Orientation.W);
      double speed=BodyVector.Dot(initial.Velocity,new BodyVector(Math.Sin(yaw),0,Math.Cos(yaw)));
      reset.Reset(speed,initial.Position.Y-parameters.CgY,yaw);
      for(int i=0;i<inputs.Count;i++){reset.Step(inputs[i]);Check(Same(reset.State,states[i]),label+" reset");}
      foreach(var pattern in new[]{new[]{1.0/30},new[]{1.0/60},new[]{1.0/120},new[]{1.0/144,.027,1.0/45,.009}})
      {
        var runner=new VehicleFixedStepRunner(Simulation(scenario,parameters));double time=0;int frame=0;
        while(time<10-1e-12){double dt=Math.Min(pattern[frame++%pattern.Length],10-time);runner.Advance(dt,i=>inputs[i]);time+=dt;}
        Check(runner.Current.Steps==600 && Same(runner.Current,states[599]),label+" render cadence");
        Check(runner.Alpha>=0 && runner.Alpha<1+1e-10,label+" interpolation");
      }
      // Fiziksel yön kontrolleri oracle ile aynı hatayı paylaşma riskini azaltır.
      if(label=="rest-rwd") Check(Math.Abs(a.State.Position.Y-parameters.CgY)<1e-10 && Math.Abs(a.State.FrontLoad+a.State.RearLoad-parameters.Mass*24)<1e-6,"Static equilibrium");
      if(label=="accelerate-brake-rwd")
      {
        double staticFront=parameters.Wheels[0].StaticLoad+parameters.Wheels[1].StaticLoad;
        Check(states.Skip(30).Take(250).Any(s=>s.FrontLoad<staticFront-50),"Acceleration must unload front");
        Check(states.Skip(305).Take(100).Any(s=>s.FrontLoad>staticFront+50),"Braking must load front");
      }
      if(label=="turn-awd") Check(states.Any(s=>Math.Abs(s.LeftLoad-s.RightLoad)>500),"Lateral load transfer");
      if(label=="landing-rwd") Check(states.Any(s=>s.Wheels.All(w=>!w.Contact)) && states.Skip(120).Any(s=>s.Wheels.All(w=>w.Contact)),"Airborne and recontact");
      var before=a.State;
      try {a.Step(new VehicleCommand(double.NaN,0,0));throw new InvalidOperationException("NaN accepted");}catch(ArgumentException){checks++;}
      Check(ReferenceEquals(before,a.State),"Invalid command published state");
      try {a.Reset(double.MaxValue);throw new InvalidOperationException("Overflow reset accepted");}catch(ArgumentException){checks++;}
      Check(ReferenceEquals(before,a.State),"Overflow reset published state");
      Console.WriteLine($"PASS vehicle {label}: 600 × 45 TS values, repeat/reset, 4 frame schedules");
    }
    Console.WriteLine(JsonSerializer.Serialize(new{result="vehicle-passed",rowsCompared,checks,maxErrors=fields.Select((field,i)=>new{field,absoluteError=errors[i],tolerance=limits[i]})},new JsonSerializerOptions{WriteIndented=true}));
  }
}
