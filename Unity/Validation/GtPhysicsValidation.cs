using LastTurn.Core;
using System.Text.Json;

internal static class GtPhysicsValidation
{
  internal static void Run()
  {
    int checks=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException(label);}
    static long[] Bits(PowertrainVehicle v)=>PowertrainValidation.Values(v).Select(BitConverter.DoubleToInt64Bits).ToArray();
    var ends=new Dictionary<string,PowertrainVehicle>();
    foreach (var test in new[]{("straight",0.0,false),("left",1.0,false),("right",-1.0,false),("preset-left",1.0,false),("preset-right",-1.0,false),("reverse",0.0,true)})
    {
      var p=GtPrototypeParameters.Create();var car=new PowertrainVehicle(p);
      var tape=new List<DrivingInput>();double oneSecond=0,twoSeconds=0,maxReverseSpeed=0;bool cutSeen=false;
      void Step(DrivingInput input){tape.Add(input);car.Step(input);}
      if(test.Item1.StartsWith("preset"))for(int j=0;j<120;j++)Step(new DrivingInput(0,0,test.Item2,false,false));
      for(int k=1;k<=1200;k++)
      {
        Step(new DrivingInput(test.Item3?0:1,test.Item3?1:0,test.Item2,false,false));
        if(k==60)oneSecond=car.Body.Velocity.Length*3.6;
        if(k==120)twoSeconds=car.Body.Velocity.Length*3.6;
        if(test.Item3)
        {
          maxReverseSpeed=Math.Max(maxReverseSpeed,car.Body.Velocity.Length);
          if(car.Engine.CoupledRpm>=p.ReverseMaxRpm*1.02)
          { Check(car.Engine.EngineTorque==0,"Geri kesici motor torkunu kesmeli");cutSeen=true; }
          Check(car.Engine.Gear==-1,"Geri otomatik büyütmemeli");
        }
        Check(PowertrainValidation.Values(car).All(double.IsFinite),"GT sonlu durum");
        if(test.Item2!=0 && k<=60)
        {
          Check(car.Engine.EffectiveGas==car.Engine.Gas,"Normal dönüş CG yana hızıyla gaz kesmemeli");
          Check(car.Body.Wheels.All(w=>w.Contact),"Dar yay kalkışında dört temas");
        }
        if(k%120==0 || k<=60 && k%6==0)
        {
          var f=car.Body.Orientation.Rotate(new BodyVector(0,0,1));
          var v=car.Body.Velocity;double along=BodyVector.Dot(v,f),side=v.X*f.Z-v.Z*f.X;
          Console.WriteLine(JsonSerializer.Serialize(new{scenario=test.Item1,t=k/60.0,kmh=v.Length*3.6,along,side,
            car.Engine.Rpm,car.Engine.CoupledRpm,car.Engine.Gear,car.Engine.EffectiveGas,car.Engine.DriveTorque,
            yaw=car.Body.AngularVelocity.Y,wheels=car.Body.Wheels.Select(w=>new{w.Omega,w.Kappa,w.TanAlpha,w.Load})}));
        }
      }
      if(test.Item2!=0)
      {
        Check(oneSecond>30 && oneSecond<40,"Tam direksiyon 1 s doğal kalkış");
        Check(twoSeconds>45 && twoSeconds<65,"Tam direksiyon 2 s dar yay");
      }
      if(test.Item3)
      {
        double geared=p.ReverseMaxRpm*1.02*2*Math.PI/60*p.Chassis.Wheels[2].Radius/Math.Abs(PowertrainParameters.GearRatio(-1)*p.FinalDrive);
        Check(cutSeen && maxReverseSpeed<geared*1.02 && maxReverseSpeed>geared*.9,"Geri hız oran/devirden doğmalı");
      }
      var expected=Bits(car);
      foreach(double delta in new[]{1.0/30,1.0/60,1.0/120})
      {
        var replay=new PowertrainVehicle(p);var runner=new PowertrainFixedStepRunner(replay);
        double time=0,total=tape.Count/60.0;
        while(time<total-1e-12){double dt=Math.Min(delta,total-time);runner.Advance(dt,k=>tape[k]);time+=dt;}
        Check(replay.Body.Steps==tape.Count && Bits(replay).SequenceEqual(expected),test.Item1+" FPS "+1/delta);
      }
      car.Reset();foreach(var input in tape)car.Step(input);
      Check(Bits(car).SequenceEqual(expected),test.Item1+" reset/tekrar");
      ends.Add(test.Item1,car);
    }
    foreach(var pair in new[]{("left","right"),("preset-left","preset-right")})
    {
      var a=ends[pair.Item1].Body;var b=ends[pair.Item2].Body;
      Check(Math.Abs(a.Position.X+b.Position.X)<1e-8 && Math.Abs(a.Position.Z-b.Position.Z)<1e-8 &&
        Math.Abs(a.Velocity.Length-b.Velocity.Length)<1e-8,"Sol/sağ ayna simetrisi");
    }
    var braking=ends["straight"];double before=braking.Body.Velocity.Length;
    for(int k=0;k<60;k++)braking.Step(new DrivingInput(0,1,0,false,false));
    Check(braking.Body.Velocity.Length<before*.6,"GT düz frenleme");
    for(int k=0;k<30;k++)braking.Step(new DrivingInput(1,0,.5,false,false,true));
    Check(braking.Body.Wheels.Skip(2).All(w=>Math.Abs(w.Omega)<1),"GT el freni arka teker kilidi");
    var tire=GtPrototypeParameters.Create().Chassis.Tires[2];
    var straight=TireModel.Evaluate(8000,tire.Kp,0,tire);var combined=TireModel.Evaluate(8000,tire.Kp,tire.Ap,tire);
    Check(Math.Abs(combined.Fx)<Math.Abs(straight.Fx),"Birleşik tutuş korunmalı");
    Check(Math.Pow(combined.Fx/(tire.MuX*8000),2)+Math.Pow(combined.Fy/(tire.MuY*8000),2)<=1+1e-12,"Sürtünme elipsi");
    var overspeed=new PowertrainVehicle(GtPrototypeParameters.Create(),-25,-1);
    overspeed.Step(new DrivingInput(0,1,0,false,false));
    Check(overspeed.Engine.EngineTorque==0 && overspeed.Body.Velocity.Length>24,"Kesici hız kelepçesi olmamalı");
    overspeed.Step(new DrivingInput(1,0,0,false,false));Check(overspeed.Engine.Gear==1,"Geri sonrası ileri seçimi");
    Console.WriteLine($"PASS GT fizik: 6 × 1200 adım; 30/60/120 FPS, reset, simetri, fren/el freni, birleşik tutuş; {checks} koşul.");
  }
}
