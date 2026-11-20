using LastTurn.Core;

internal static class VehicleContactValidation
{
  public static void Run()
  {
    var config=GtPrototypeParameters.Create();
    PowertrainVehicle Car(double x,double z,double heading,double speed)
    {
      var car=new PowertrainVehicle(config);
      car.Place(x,z,heading);
      car.Body.Velocity=new BodyVector(Math.Sin(heading)*speed,0,Math.Cos(heading)*speed);
      return car;
    }
    var a=Car(0,0,0,15);
    double length=OpponentTrafficCar.Read(a).Length;
    var b=Car(0,length-.2,0,5);
    BodyVector Momentum()=>a.Body.Velocity*a.Parameters.Chassis.Mass+b.Body.Velocity*b.Parameters.Chassis.Mass;
    var before=Momentum();
    void Expect(bool condition,string message){if(!condition)throw new Exception(message);}
    Expect(VehicleContact.Resolve(a,b),"Tampon teması kaçırıldı");
    Expect((Momentum()-before).Length<1e-7,"Temas toplam momentumu değiştirdi");
    Expect(a.Body.Velocity.Z<15 && b.Body.Velocity.Z>5,"İki araç da hız tepkisi vermeli");
    Expect(!VehicleContact.Resolve(a,b),"Ayrılmış gövdeler yeniden çarpıştı");
    b=Car(0,0,Math.PI/2,8);
    b.Body.Position+=new BodyVector(0,5,0);
    Expect(!VehicleContact.Resolve(a,b),"Ayrı katlarda sahte temas");
    b=Car(config.Chassis.Width+.15,0,0,8);
    Expect(!VehicleContact.Resolve(a,b),"Ayrı şeritlerde sahte temas");
    b=Car(config.Chassis.Width-.1,0,0,8);
    a.Body.Velocity=new BodyVector(-1,0,12);
    var separating=a.Body.Velocity;
    Expect(VehicleContact.Resolve(a,b) && (a.Body.Velocity-separating).Length==0,
      "Birbirinden uzaklaşan araçlara ikinci darbe uygulandı");
    Console.WriteLine("Araç teması: darbe, momentum, ayrışma, ayrı kat ve paralel şerit kontrolleri geçti.");
  }
}
