using System.Reflection;
using System.Text.Json;
using LastTurn.Core;

internal static class MutantReconfigureValidation
{
  public static void Run()
  {
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/vehicle-catalog.json")));
    var data=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-session-0.8.18.json")));
    int checks=0,compared=0;double worst=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("Yeniden kurulum: "+label);}
    Check(data["baseline"].S()==VehicleCatalog.Baseline,"Kaynak SHA");
    PowertrainParameters Parameters(int car,CatalogNode? change=null)
    {
      var setup=catalog.Setup(car,Array.Empty<string>(),"real");
      foreach(string k in new[]{"grip","str","stm","tcs","abs","dft","ini"})setup.Assists.Set(k,CatalogNode.Num(0));
      setup.Assists.Set("acc",CatalogNode.Num(1));setup.Assists.Set("bra",CatalogNode.Num(1));
      if(change!=null)
      {
        var run=CatalogNode.Obj();run.Set("govde",change["body"]);run.Set("pasifler",change["passives"]);
        var energy=CatalogNode.Obj();energy.Set("etkiKalan",change["remaining"]);energy.Set("etkiGuc",change["power"]);run.Set("mek",energy);
        setup=MutantVehicle.Configure(catalog,setup,run);
      }
      return catalog.CreatePhysics(setup);
    }
    var jsonOptions=new JsonSerializerOptions{IncludeFields=true};
    string Snapshot(PowertrainVehicle car)=>JsonSerializer.Serialize(new{car.Body,car.Engine,car.Assist,car.Spins,car.ShiftsUp,car.ShiftsDown,car.RejectedShifts},jsonOptions);
    var previous=typeof(PowertrainVehicle).GetField("previousCourse",BindingFlags.Instance|BindingFlags.NonPublic)!;
    void Preserved(PowertrainVehicle car,PowertrainParameters next)
    {
      string before=Snapshot(car);var body=car.Body;var engine=car.Engine;var assist=car.Assist;var course=previous.GetValue(car);
      car.Reconfigure(next);
      Check(ReferenceEquals(body,car.Body)&&ReferenceEquals(engine,car.Engine)&&ReferenceEquals(assist,car.Assist),"Gövde/motor/drift nesneleri aynı");
      Check(before==Snapshot(car),"Bütün gövde, teker, motor, spin ve vites sayaçları değişmedi");
      Check(Equals(course,previous.GetValue(car)),"Önceki hız yönü korundu");Check(ReferenceEquals(next,car.Parameters),"Yeni parametre bağlandı");
    }
    foreach(var scenario in data["reconfiguration"].Items)
    {
      int ci=(int)scenario["car"].N(),tick=0;var car=new PowertrainVehicle(Parameters(ci));var control=new PowertrainVehicle(Parameters(ci));
      foreach(var row in scenario["rows"].Items)
      {
        while(tick<row[0].N())
        {
          var change=scenario["changes"].Items.FirstOrDefault(c=>c["at"].N()==tick);
          if(change!=null){var p=Parameters(ci,change);Preserved(car,p);control.Reconfigure(Parameters(ci,change));}
          var input=new DrivingInput(1,0,tick<300?0:.12,false,false);car.Step(input);control.Step(input);tick++;
        }
        var point=car.ReferencePoint;var fw=car.Body.Orientation.Rotate(new BodyVector(0,0,1));
        var values=new List<double>{point.X,point.Z,Math.Atan2(fw.X,fw.Z),car.Body.Velocity.X,car.Body.Velocity.Z,car.Engine.Rpm,car.Engine.Gear,car.Engine.ShiftTimer,car.Engine.Turbo};
        foreach(var w in car.Body.Wheels)values.AddRange(new[]{w.Omega,w.Angle,w.Compression,w.Load,w.Kappa,w.TanAlpha,w.AbsMultiplier});
        for(int i=0;i<values.Count;i++){double err=Math.Abs(values[i]-row[i+1].N());worst=Math.Max(worst,err);Check(err<=scenario["tolerance"].N(),$"TS araç {ci} adım {tick} alan {i} fark {err:G3}");compared++;}
        Check(Snapshot(car)==Snapshot(control),"Aynı yeniden kurulum belirlenimci");
      }
      string before=Snapshot(car);var parameters=car.Parameters;
      try{car.Reconfigure(null!);throw new Exception("Null kabul edildi");}catch(ArgumentNullException){checks++;}
      Check(Snapshot(car)==before&&ReferenceEquals(parameters,car.Parameters),"Null parametre durumu değiştirmedi");
      var invalid=Parameters(ci);invalid.Assists.Str=double.NaN;
      try{car.Reconfigure(invalid);throw new Exception("NaN yardım kabul edildi");}catch(ArgumentException){checks++;}
      Check(Snapshot(car)==before&&ReferenceEquals(parameters,car.Parameters),"Geçersiz yardım gövde/parametreyi değiştirmedi");
    }
    // Sıfır olmayan drift belleği ve temas/su alanları da güncellemede korunmalı.
    var driven=new PowertrainVehicle(catalog.CreatePhysics(catalog.Setup(13,Array.Empty<string>())));
    for(int i=0;i<120;i++)driven.Step(new DrivingInput(1,0,i<80?0:.8,false,false));
    driven.Assist.On=true;driven.Assist.Dir=-1;driven.Assist.Hold=.3;driven.Assist.Bt=.8;driven.Assist.T=1;driven.Assist.K=.7;driven.Assist.Cool=.4;driven.Assist.Nc=.5;
    driven.Body.Mud=.2;driven.Body.Wet=.4;driven.Body.LastHitTime=1.25;driven.Body.CollisionCount=3;
    Preserved(driven,Parameters(13));
    var four=new FourWheelVehicle(Parameters(10).Chassis,12);four.Step(new VehicleCommand(.1,150,0));var state=four.State;
    four.Reconfigure(Parameters(2).Chassis);Check(ReferenceEquals(state,four.State),"Doğrudan gövde/teker durumu korundu");
    var chassis=four.Parameters;try{four.Reconfigure(null!);throw new Exception("Null gövde kabul edildi");}catch(ArgumentNullException){checks++;}
    Check(ReferenceEquals(state,four.State)&&ReferenceEquals(chassis,four.Parameters),"Gövde null ret atomik");
    Console.WriteLine($"Yeniden kurulum: {checks} koşul, {compared} TS alanı, 2×480 fizik adımı; hasar/nitro/pasif/tamir sırasında gövde/motor/teker/drift belleği korunur. En büyük fark {worst:G3}.");
  }
}
