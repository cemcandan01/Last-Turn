#nullable enable
using System;

namespace LastTurn.Core
{
  // Yarış sürüşü (saf): TS surus.ts/dongu.ts sırası. Geri sayımda fizik donar; her sabit fizik adımından sonra yarış adımı
  // (evTick) çalışır; ipucu fizik adımının son yüzey sorgusundan (araç merkezi) gelir. Piste dönüşte araç dönüş noktasına
  // konur ve ipucu tam taramayla yenilenir. Unity görünümü ve .NET testleri aynı sınıfı kullanır.
  public sealed class RaceRun
  {
    public readonly PowertrainVehicle Vehicle;
    public readonly TrackWorld World;
    public readonly RaceEventInfo Event;
    private readonly Func<int, RaceSession> create;
    public RaceSession Session { get; private set; }
    public int Teleports { get; private set; }

    /// world: aracın sürüldüğü pist dünyası (PowertrainVehicle'a verilen aynı nesne). session: başlangıç ipucuyla oturum.
    public RaceRun(PowertrainVehicle vehicle, TrackWorld world, RaceEventInfo info, Func<int, RaceSession> session)
    {
      Vehicle = vehicle ?? throw new ArgumentNullException(nameof(vehicle)); World = world ?? throw new ArgumentNullException(nameof(world));
      Event = info ?? throw new ArgumentNullException(nameof(info)); create = session ?? throw new ArgumentNullException(nameof(session));
      Session = create(PlaceAtStart());
    }

    private int PlaceAtStart() { Place(Event.StartX, Event.StartZ, Event.StartHeading); return World.Hint; }

    /// TS reset: araç zemine oturtulur, sonra pist ipucu tam taramayla yenilenir.
    private void Place(double x, double z, double heading) { Vehicle.Place(x, z, heading); World.ResetHint(x, z); }

    /// Aynı yarış sıfırdan geri sayımla (TS yarisiYenidenBaslat).
    public void Restart() { Session = create(PlaceAtStart()); Teleports = 0; }

    /// Geri sayım (fizik donuk). TS'de kare süresiyle azalır.
    public void TickCountdown(double dt) => Session.TickCountdown(dt);

    public bool PhysicsRunning => Session.State == RaceState.Running;

    /// Fizik adımı + yarış adımı. Yarış çalışmıyorsa (geri sayım/bitti) fizik ilerlemez (TS: donuk / sonuç ekranı).
    public bool Step(DrivingInput input)
    {
      if (!PhysicsRunning) return false;
      Vehicle.Step(input);
      AfterPhysicsStep();
      return true;
    }

    /// Dışarıdan ilerletilen fizik adımından sonra çağrılır (Unity sabit adım koşucusu).
    public void AfterPhysicsStep()
    {
      var p = Vehicle.ReferencePoint; var v = Vehicle.Body.Velocity;
      var input = new RaceStepInput { X = p.X, Z = p.Z, Vx = v.X, Vz = v.Z, Speed = JsMath.Hypot(v.X, v.Z), Hint = World.Hint, Steer = Vehicle.Engine.Steering };
      var back = Session.Step(input, PowertrainVehicle.FixedDelta);
      if (back != null) { Place(back.Value.X, back.Value.Z, back.Value.Heading); Teleports++; }
    }
  }
}
