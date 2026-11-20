using System;
namespace LastTurn.Core
{
  public sealed class GarageBenchResult
  {
    public double Hundred,Brake60,Slip;
    public static GarageBenchResult Measure(VehicleCatalog catalog,CatalogSetup setup)
    {
      var p=GarageDriveParameters.Create(catalog,setup,false,"gp");
      var result=new GarageBenchResult();
      var car=new PowertrainVehicle(p);
      for(int i=0;i<1500;i++){
        car.Step(new DrivingInput(1,0,0,false,false));
        if(car.Body.Velocity.Length>=100/3.6){result.Hundred=(i+1)/60d;break;}
      }
      car=new PowertrainVehicle(p,60/3.6,3);double start=car.ReferencePoint.Z;
      for(int i=0;i<900 && car.Body.Velocity.Z>.5;i++)car.Step(new DrivingInput(0,1,0,false,false));
      result.Brake60=Math.Max(0,car.ReferencePoint.Z-start);
      car=new PowertrainVehicle(p,60/3.6,3);
      for(int i=0;i<180;i++){
        double steer=i<60?.4:i<120?-.4:0;
        car.Step(new DrivingInput(.25,0,steer,false,false));
        result.Slip=Math.Max(result.Slip,Math.Abs(RaceDrift.Detect(car.Body).Beta)*180/Math.PI);
      }
      return result;
    }
    public string Text=>"0–100  "+(Hundred==0?"25+ sn":Hundred.ToString("0.00")+" sn")+"\n60–0  "+Brake60.ToString("0.00")+" m\nSlalom kayma açısı  "+Slip.ToString("0.0")+"°";
  }
}
