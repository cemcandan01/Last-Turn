using LastTurn.Core;
using System.Text.Json;

internal static class TerrainValidation
{
  internal sealed class World(string name):IVehicleWorld
  {
    public double Height(double x,double z)=>name switch {
      "slope"=>.08*z+.04*x,"mixed"=>.12*Math.Sin(z*.5)+.06*Math.Sin(x*.7),
      "crest"=>z<10?0:z<18?.25*(z-10):z<20?2:0,_=>0};
    public int Surface(double x,double z)=>name switch {"flat-dirt"=>0,"mixed"=>x>=0?0:1,"crest"=>z>=18?0:1,"mud-to-asphalt"=>z<15?3:1,_=>1};
    public double GripMultiplier=>1;
  }
  internal static double[] Values(VehicleState s)=>VehicleValidation.Values(s).Concat(s.Wheels.Select(w=>(double)w.SurfaceIndex)).Concat(new[]{s.Wet,s.Mud}).ToArray();
  internal static void Run(string reference="terrain-0.8.18.json")
  {
    using var fixture=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/"+reference)));
    var root=fixture.RootElement;int checks=0,rows=0;
    void Check(bool condition,string label){checks++;if(!condition)throw new InvalidOperationException(label);}
    Check(root.GetProperty("baseline").GetString()=="df3549e709469f0b519ebfbeaa9f63c1040fee05","Arazi baseline");
    var limits=new[]{1e-5,1e-5,1e-5,1e-6,1e-6,1e-6,1e-6,1e-5,1e-5,1e-5,1e-5,1e-5,1e-5}
      .Concat(Enumerable.Range(0,4).SelectMany(_=>new[]{1e-4,1e-4,1e-5,.05,1e-5,1e-5,1e-6,0})).Concat(new[]{0.0,0,0,0,1e-10,1e-10}).ToArray();
    Check(root.GetProperty("tolerances").EnumerateArray().Select(x=>x.GetDouble()).SequenceEqual(limits),"Arazi tolerans sözleşmesi");
    var errors=new double[limits.Length];var summaries=new List<object>();
    foreach(var scenario in root.GetProperty("scenarios").EnumerateArray())
    {
      string name=scenario.GetProperty("name").GetString()!;var world=new World(scenario.GetProperty("world").GetString()!);
      var p=VehicleValidation.Parameters(scenario);double speed=scenario.GetProperty("initialSpeed").GetDouble(),height=scenario.GetProperty("heightOffset").GetDouble();
      var sim=new FourWheelVehicle(p,speed,height,world:world);var initial=sim.State;
      var inputs=new List<VehicleCommand>();var states=new List<long[]>();
      static long[] Bits(VehicleState s)=>Values(s).Select(BitConverter.DoubleToInt64Bits).ToArray();
      void Compare(JsonElement expected,string step)
      {
        var values=Values(sim.State);
        for(int i=0;i<values.Length;i++)
        {
          double error=Math.Abs(values[i]-expected[i].GetDouble());errors[i]=Math.Max(errors[i],error);
          Check(double.IsFinite(values[i]) && error<=limits[i],$"{name}/{step}/{i}: {error:R} > {limits[i]:R}");
        }
      }
      Compare(scenario.GetProperty("initialValues"),"reset");
      int air=0,minContacts=4;bool landed=false,mixed=false;double maxCompression=0,maxLoad=0,maxY=sim.State.Position.Y;
      foreach(var row in scenario.GetProperty("rows").EnumerateArray())
      {
        var c=row.GetProperty("command");var command=new VehicleCommand(c[0].GetDouble(),c[1].GetDouble(),c[2].GetDouble(),c[3].GetBoolean(),c[4].GetDouble(),c[5].GetDouble());
        inputs.Add(command);sim.Step(command);Compare(row.GetProperty("values"),inputs.Count.ToString());rows++;
        states.Add(Bits(sim.State));int contacts=sim.State.Wheels.Count(w=>w.Contact);minContacts=Math.Min(minContacts,contacts);
        if(contacts==0)air++;if(air>0 && contacts>0)landed=true;
        mixed|=sim.State.Wheels.Select(w=>w.SurfaceIndex).Distinct().Count()>1;
        maxCompression=Math.Max(maxCompression,sim.State.Wheels.Max(w=>w.Compression));maxLoad=Math.Max(maxLoad,sim.State.Wheels.Max(w=>w.Load));maxY=Math.Max(maxY,sim.State.Position.Y);
      }
      Check(initial.Steps==0,"Arazi snapshot değişmemeli");
      if(name=="jump"||name=="crest")Check(air>0 && landed,"Havalanma/iniş "+name);
      if(name=="mixed")Check(mixed,"Aynı aks farklı yüzeyler");
      foreach(double delta in new[]{1.0/30,1.0/60,1.0/120})
      {
        var replay=new FourWheelVehicle(p,speed,height,world:world);var runner=new VehicleFixedStepRunner(replay);double time=0;
        while(time<10-1e-12){double dt=Math.Min(delta,10-time);runner.Advance(dt,k=>inputs[k]);time+=dt;}
        Check(replay.State.Steps==600 && Bits(replay.State).SequenceEqual(states[^1]),name+" FPS "+1/delta);
      }
      sim.Reset(speed,height);for(int k=0;k<inputs.Count;k++){sim.Step(inputs[k]);Check(Bits(sim.State).SequenceEqual(states[k]),name+" reset/tekrar");}
      summaries.Add(new{name,air,minContacts,landed,mixed,maxCompression,maxLoad,maxY,finalSpeed=sim.State.Velocity.Length,finalMud=sim.State.Mud});
    }
    Console.WriteLine(JsonSerializer.Serialize(new{result="terrain-passed",reference,rows,checks,maxErrors=errors,summaries},new JsonSerializerOptions{WriteIndented=true}));
  }
}
