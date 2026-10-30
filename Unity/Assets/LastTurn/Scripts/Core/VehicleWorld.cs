using System;

namespace LastTurn.Core
{
  // TS DunyaSorgusu sınırı; saf yükseklik/yüzey sorgusu, Unity collider fiziği yok.
  public interface IVehicleWorld
  {
    double Height(double x, double z);
    int Surface(double x, double z);
    double GripMultiplier { get; }
  }

  public sealed class FlatAsphaltWorld : IVehicleWorld
  {
    public static readonly FlatAsphaltWorld Instance = new FlatAsphaltWorld();
    private FlatAsphaltWorld() { }
    public double Height(double x, double z) => 0;
    public int Surface(double x, double z) => 1;
    public double GripMultiplier => 1;
  }

  public static class VehicleGround
  {
    public static string Name(int surface) { Validate(surface); return new[]{"Toprak","Asfalt","Çim","Çamur","Kar","Derin kar"}[surface]; }
    public static double Resistance(int surface) { Validate(surface); return new[]{0.0,0,.5,.9,.12,.8}[surface]; }
    public static void Validate(int surface) { if(surface<0 || surface>5)throw new ArgumentOutOfRangeException(nameof(surface)); }
    // TS normal: e=.5 merkezi farkı. Analitik normal ile değiştirilmez.
    public static BodyVector Normal(IVehicleWorld world,double x,double z)
    {
      double gx=world.Height(x+.5,z)-world.Height(x-.5,z),gz=world.Height(x,z+.5)-world.Height(x,z-.5);
      double length=Math.Sqrt(gx*gx+1+gz*gz);
      return new BodyVector(-gx/length,1/length,-gz/length);
    }
  }

  // Ödülsüz tanı parkuru: 20–60 m tepe; 70–90 m tümsek; 105–120 m rampa/iniş.
  public sealed class TerrainTestWorld : IVehicleWorld
  {
    public double Height(double x,double z)
    {
      if(z>=20 && z<35)return .12*(z-20);
      if(z>=35 && z<45)return 1.8;
      if(z>=45 && z<60)return .12*(60-z);
      if(z>=70 && z<90)return .28*(1-Math.Cos((z-70)*Math.PI/5));
      if(z>=105 && z<113)return .25*(z-105);
      if(z>=113 && z<120)return 2;
      return 0;
    }
    public int Surface(double x,double z)=>x>=4?0:1;
    public double GripMultiplier=>1;
  }
}
