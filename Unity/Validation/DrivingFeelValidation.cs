using LastTurn.Core;
using System.Text.Json;
internal static class DrivingFeelValidation
{
  public static void Run(bool baseline=false)
  {
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"../../../../Assets/LastTurn/Resources/vehicle-catalog.json")));
    int checks=0;void Check(bool ok,string why){if(!ok)throw new Exception(why);checks++;}
    var rows=new List<object>();
    for(int id=0;id<catalog.Data["cars"].Items.Count();id++){
      var setup=catalog.Setup(id,Array.Empty<string>());
      var p=GarageDriveParameters.Create(catalog,setup,false,"gp");
      var car=new PowertrainVehicle(p);
      double eighty=0;
      for(int i=0;i<1500;i++){car.Step(new DrivingInput(1,0,0,false,false));if(car.Body.Velocity.Length>=80/3.6){eighty=(i+1)/60d;break;}}
      var brake=new PowertrainVehicle(p,60/3.6,3);double start=brake.ReferencePoint.Z;
      int ticks=0;while(brake.Body.Velocity.Z>.5 && ticks++<1200)brake.Step(new DrivingInput(0,1,0,false,false));
      double distance=brake.ReferencePoint.Z-start,lowest=brake.Body.Velocity.Z;
      for(int i=0;i<18;i++){brake.Step(new DrivingInput(0,1,0,false,false));lowest=Math.Min(lowest,brake.Body.Velocity.Z);}
      var steer=new PowertrainVehicle(p);
      for(int i=0;i<30;i++)steer.Step(new DrivingInput(0,0,1,false,false));
      int reverse=0;while(steer.Engine.Steering>0 && reverse++<60)steer.Step(new DrivingInput(0,0,-1,false,false));
      rows.Add(new{id,key=setup.Car["k"].S(),name=setup.Car["n"].S(),mass=p.Chassis.Mass,eighty,brake60=distance,brakeBack=lowest,counterSteerSeconds=reverse/60d});
      Check(double.IsFinite(distance) && distance>0 && ticks<1200,"Fren duruşu "+id);
      if(!baseline)Check(brake.Engine.Gear>0 && lowest>-.5,"Frenin ardından istemsiz geri sıçrama "+id+" hız "+lowest+" vites "+brake.Engine.Gear);
    }
    var output=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../../tests/cikti"));
    Directory.CreateDirectory(output);
    File.WriteAllText(Path.Combine(output,baseline?"handling-before.json":"handling-after.json"),JsonSerializer.Serialize(rows,new JsonSerializerOptions{WriteIndented=true}));
    if(!baseline){
      var p=GarageDriveParameters.Create(catalog,catalog.Setup(0,Array.Empty<string>()),false,"gp");
      var oldRecord=new GhostRecord{Key="gp_1",Car=0,Result=1};oldRecord.Inputs.Record(new DrivingInput(1,0,0));
      var oldSnapshot=oldRecord.Snapshot();oldSnapshot.Remove("kontrolSurum");
      var restored=GhostRecord.Restore(oldSnapshot,"gp_1");
      Check(restored!=null && restored.ControlRevision==0,"Eski kayıtta kontrol sürümü doğru okunur");
      var legacy=new PowertrainVehicle(p){LegacyControls=true};
      for(int i=0;i<30;i++)legacy.Step(new DrivingInput(0,0,1,false,false));
      int legacyCounter=0;while(legacy.Engine.Steering>0 && legacyCounter++<60)legacy.Step(new DrivingInput(0,0,-1,false,false));
      Check(legacyCounter>=10,"Eski hayalet eski direksiyon eğrisini korur");
      var car=new PowertrainVehicle(p);
      for(int i=0;i<120;i++)car.Step(new DrivingInput(1,0,0,false,false));
      car.Step(new DrivingInput(0,1,0,false,false));
      Check(car.Engine.EffectiveGas==0,"Gaz bırakılıp frenlenince motor çekişi kesilir");
      car=new PowertrainVehicle(p);
      for(int i=0;i<90;i++)car.Step(new DrivingInput(0,1,0,false,false));
      Check(car.Body.Velocity.Z<-.2,"Dururken geri manevra erişilebilir");
    }
    Console.WriteLine("Sürüş ölçümü 15 araç / "+checks+" kontrol. "+output);
  }
}
