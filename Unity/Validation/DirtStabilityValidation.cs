using LastTurn.Core;
using System.Text.Json;

internal static class DirtStabilityValidation
{
  internal sealed class SurfaceWorld(int surface):IVehicleWorld
  {
    public double Height(double x,double z)=>0;
    public int Surface(double x,double z)=>surface;
    public double GripMultiplier=>1;
  }
  internal static void Run()
  {
    int checks=0;void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException(label);}
    var measurements=new Dictionary<(bool,int,double,double),double[]>();
    foreach(bool balanced in new[]{false,true})foreach(int surface in new[]{0,1})foreach(double speed in new[]{3.0,5,8,22})foreach(double gas in new[]{0.0,.2,1})
    {
      var p=balanced?GtPrototypeParameters.CreateTerrain():GtPrototypeParameters.Create();var car=new PowertrainVehicle(p,speed,world:new SurfaceWorld(surface));
      var tape=new List<DrivingInput>();
      double peakBeta=0,peakTire=0,afterReleaseBeta=0,maxSlip=0,betaAt1=0,speedAt1=0,betaAt2=0,speedAt2=0;
      for(int k=0;k<360;k++)
      {
        var input=new DrivingInput(k<120?gas:0,0,k<120?.35:0,true,true);tape.Add(input);car.Step(input);
        var f=car.Body.Orientation.Rotate(new BodyVector(0,0,1));var v=car.Body.Velocity;
        double along=v.X*f.X+v.Z*f.Z,side=v.X*f.Z-v.Z*f.X;
        double beta=Math.Abs(Math.Atan2(side,Math.Max(.5,Math.Abs(along))))*180/Math.PI;
        peakBeta=Math.Max(peakBeta,beta);peakTire=Math.Max(peakTire,car.Body.Wheels.Max(w=>Math.Abs(Math.Atan(w.TanAlpha))*180/Math.PI));
        maxSlip=Math.Max(maxSlip,car.Body.Wheels.Max(w=>Math.Abs(w.Kappa)));
        if(k==179)afterReleaseBeta=beta;
        if(k==59){betaAt1=beta;speedAt1=car.Body.Velocity.Length;}
        if(k==119){betaAt2=beta;speedAt2=car.Body.Velocity.Length;}
      }
      Console.WriteLine(JsonSerializer.Serialize(new{balanced,surface,speed,gas,peakBeta,peakTire,afterReleaseBeta,maxSlip,betaAt1,speedAt1,betaAt2,speedAt2,finalSpeed=car.Body.Velocity.Length}));
      measurements.Add((balanced,surface,speed,gas),new[]{peakBeta,afterReleaseBeta,peakTire});
      if(balanced && surface==0 && gas==.2 && speed<=8)Check(peakBeta<5 && afterReleaseBeta<.1,"Normal düşük hız direksiyonu/toparlama");
      if(balanced && surface==0 && speed==22 && gas==1)Check(peakBeta>25,"Yüksek hız/sert gazda kayma mümkün kalmalı");
      if(speed==5 && gas==.2)
      {
        var expected=PowertrainValidation.Values(car).Select(BitConverter.DoubleToInt64Bits).ToArray();
        foreach(double delta in new[]{1.0/30,1.0/60,1.0/120})
        {
          var replay=new PowertrainVehicle(p,speed,world:new SurfaceWorld(surface));var runner=new PowertrainFixedStepRunner(replay);double time=0;
          while(time<6-1e-12){double dt=Math.Min(delta,6-time);runner.Advance(dt,k=>tape[k]);time+=dt;}
          Check(replay.Body.Steps==360 && PowertrainValidation.Values(replay).Select(BitConverter.DoubleToInt64Bits).SequenceEqual(expected),"Toprak/asfalt FPS tekrar");
        }
      }
    }
    Check(measurements[(true,0,5,1)][1]<measurements[(false,0,5,1)][1]*.25,"Düşük hızdan gaz kesip toparlanma belirgin iyileşmeli");
    foreach(double speed in new[]{3.0,5,8,22})foreach(double gas in new[]{0.0,.2,1})
      Check(measurements[(true,1,speed,gas)].SequenceEqual(measurements[(false,1,speed,gas)]),"Asfalt kurulum farkından etkilenmemeli");
    using var fixture=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/dirt-balance-0.8.18.json")));
    var profiles=fixture.RootElement.GetProperty("profiles").EnumerateArray().ToArray();
    foreach(var raw in profiles.Where(p=>!p.GetProperty("balanced").GetBoolean()))
    {
      var balanced=profiles.Single(p=>p.GetProperty("balanced").GetBoolean() && p.GetProperty("carIndex").GetInt32()==raw.GetProperty("carIndex").GetInt32() && p.GetProperty("tire").GetInt32()==raw.GetProperty("tire").GetInt32());
      var a=VehicleValidation.Parameters(raw);var b=VehicleValidation.Parameters(balanced);
      for(int wheel=0;wheel<4;wheel++)for(int surface=0;surface<6;surface++)
      {
        var before=a.TireForSurface(surface,wheel);var after=b.TireForSurface(surface,wheel);
        Check(before.Kp==after.Kp && before.Ap==after.Ap && before.C==after.C,"Lastik kayma eğrisi korunmalı");
        if(surface==1 || raw.GetProperty("combinedBefore").GetDouble()>=1)Check(before.MuX==after.MuX && before.MuY==after.MuY,"Asfalt/uygun lastik kombinasyonu değişmemeli");
      }
    }
    VehicleParameters Profile(string name)=>VehicleValidation.Parameters(profiles.Single(p=>p.GetProperty("name").GetString()==name));
    double Mu(string name)=>Profile(name).TireForSurface(0,0).MuY;
    Check(Mu("rx-tire1-balanced")>Mu("gt-tire0-balanced")*1.8,"Toprak uzmanı araç/lastik üstünlüğü korunmalı");
    Check(Mu("gt-tire1-balanced")>Mu("gt-tire2-balanced") && Mu("gt-tire2-balanced")>Mu("gt-tire0-balanced"),"Aynı araçta lastik seçimi önemini korumalı");
    var brakes=new Dictionary<(bool,int),double>();
    foreach(bool balanced in new[]{false,true})foreach(int surface in new[]{0,1})
    {
      var p=balanced?GtPrototypeParameters.CreateTerrain():GtPrototypeParameters.Create();
      var braking=new FourWheelVehicle(p.Chassis,12,world:new SurfaceWorld(surface));double start=braking.State.Position.Z;
      for(int k=0;k<120;k++)braking.Step(new VehicleCommand(0,0,.5,absStrength:1,slipLimit:1.2));
      double distance=braking.State.Position.Z-start;brakes.Add((balanced,surface),distance);
      Check(braking.State.Velocity.Length<1,"Toprak/asfalt frenle durmalı");
      var handbrake=new FourWheelVehicle(p.Chassis,12,world:new SurfaceWorld(surface));double peak=0;
      for(int k=0;k<120;k++)
      {
        handbrake.Step(new VehicleCommand(.2,0,0,k>=30&&k<90,1,1.2));
        var f=handbrake.State.Orientation.Rotate(new BodyVector(0,0,1));var v=handbrake.State.Velocity;
        peak=Math.Max(peak,Math.Abs(Math.Atan2(v.X*f.Z-v.Z*f.X,Math.Max(.5,Math.Abs(v.X*f.X+v.Z*f.Z))))*180/Math.PI);
        if(k==89)Check(handbrake.State.Wheels.Skip(2).All(w=>Math.Abs(w.Omega)<.1),"Toprak/asfalt el freni arka kilidi");
      }
      Check(peak>5,"El freniyle kayma mümkün kalmalı");
      Console.WriteLine(JsonSerializer.Serialize(new{reaction="brake-handbrake",balanced,surface,brakingDistance=distance,handbrakePeakBeta=peak}));
    }
    Check(brakes[(true,1)]==brakes[(false,1)],"Asfalt fren mesafesi aynı kalmalı");
    Check(brakes[(true,0)]<brakes[(false,0)] && brakes[(true,0)]>brakes[(true,1)],"Toprak fren farkı ve asfalt üstünlüğü korunmalı");
    TerrainValidation.Run("dirt-balance-0.8.18.json");
    Console.WriteLine($"PASS toprak kararlılığı: 48 ham/dengeli asfalt/toprak karşılaştırması, düşük/yüksek hız, lastik/araç ayrımı, {checks} koşul.");
  }
}
