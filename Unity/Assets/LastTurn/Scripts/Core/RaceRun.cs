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
    /// TS girdi kaydı (yarış başında sıfırlanır; dışarıdan taşınma kaydı keser).
    public readonly InputRecording Recording = new();
    /// Bu yarışta sürülen yol (TS PROF.km katkısı).
    public double Km { get; private set; }
    /// TS rekor hayaleti: oyuncunun her fizik adımında bir kayıtlı girdi (ayrı fizik). Yeniden başlatmada fabrikadan.
    public Func<GhostPlayer?>? GhostFactory;
    public GhostPlayer? Ghost { get; private set; }
    /// Yarış bittiğinde bir kez (rekor, profil, hayalet kaydı).
    public event Action<RaceRun>? Finished;

    /// Drift yarışında komboyu yakan açı: TS driftYarisProfili(kurulum).azami + 0,12 (RaceDrift.MaxAngle).
    public readonly double DriftBetaLimit;

    /// world: aracın sürüldüğü pist dünyası (PowertrainVehicle'a verilen aynı nesne). session: başlangıç ipucuyla oturum.
    public RaceRun(PowertrainVehicle vehicle, TrackWorld world, RaceEventInfo info, Func<int, RaceSession> session, double driftMaxAngle = double.PositiveInfinity)
    {
      DriftBetaLimit = driftMaxAngle + 0.12;
      Vehicle = vehicle ?? throw new ArgumentNullException(nameof(vehicle)); World = world ?? throw new ArgumentNullException(nameof(world));
      Event = info ?? throw new ArgumentNullException(nameof(info)); create = session ?? throw new ArgumentNullException(nameof(session));
      Session = create(PlaceAtStart());
    }

    private int PlaceAtStart() { Place(Event.StartX, Event.StartZ, Event.StartHeading); return World.Hint; }

    /// TS reset: araç zemine oturtulur, sonra pist ipucu tam taramayla yenilenir.
    private void Place(double x, double z, double heading) { Vehicle.Place(x, z, heading); World.ResetHint(x, z); }

    /// Aynı yarış sıfırdan geri sayımla (TS yarisiYenidenBaslat): kayıt ve hayalet baştan.
    public void Restart() { Session = create(PlaceAtStart()); Teleports = 0; Recording.Clear(); Km = 0; Ghost = GhostFactory?.Invoke(); }

    /// Hayaleti şimdi kur (ilk yarış; sonraki başlatmalar Restart'ta).
    public void StartGhost() => Ghost = GhostFactory?.Invoke();

    /// TS girdiyiKaydet: kaydeder ve fiziğe verilecek nicemlenmiş girdiyi döndürür.
    public DrivingInput Record(DrivingInput input) => Recording.Record(input);

    /// TS ↺ yeniden doğ: yarışta pist dışı ilk çıkış noktasına ya da en yakın pist noktasına (süre durmaz).
    public bool Respawn()
    {
      var p = Vehicle.ReferencePoint; var back = Session.ManualReturn(p.X, p.Z, World.Hint);
      if (back == null) return false;
      Place(back.Value.X, back.Value.Z, back.Value.Heading); Teleports++; Recording.Cut = true; return true;
    }

    /// Geri sayım (fizik donuk). TS'de kare süresiyle azalır.
    public void TickCountdown(double dt) => Session.TickCountdown(dt);

    /// Drag manuel: geri sayımda motor gazla serbest devirde tutulur (araç durur). Yarış başlarken motor durumu hayalete yazılır.
    public void TickCountdown(double dt, DrivingInput input)
    {
      if (Session.State == RaceState.Countdown) Vehicle.PreRev(input);
      Session.TickCountdown(dt);
      if (Session.State == RaceState.Running) { var e = Vehicle.Engine; StartGas = e.Gas; StartRpm = e.Rpm; StartHold = e.LaunchHold; }
    }
    public double StartGas { get; private set; }
    public double StartRpm { get; private set; } = 900;
    public double StartHold { get; private set; }
    public bool Manual => Vehicle.Parameters.ManualGearbox;

    public bool PhysicsRunning => Session.State == RaceState.Running;

    /// Fizik adımı + yarış adımı. Yarış çalışmıyorsa (geri sayım/bitti) fizik ilerlemez (TS: donuk / sonuç ekranı).
    public bool Step(DrivingInput input)
    {
      if (!PhysicsRunning) return false;
      var quantized = Record(input);
      Vehicle.Step(quantized);
      AfterPhysicsStep(quantized);
      return true;
    }

    /// Dışarıdan ilerletilen fizik adımından sonra çağrılır (Unity sabit adım koşucusu). input: o adımın girdisi.
    public void AfterPhysicsStep(DrivingInput command)
    {
      var body = Vehicle.Body; var p = Vehicle.ReferencePoint; var v = body.Velocity; var drift = RaceDrift.Detect(body, Vehicle.Assist.On);
      var input = new RaceStepInput
      {
        X = p.X, Z = p.Z, Vx = v.X, Vz = v.Z, Speed = drift.Speed, Hint = World.Hint,
        DriftActive = drift.Active, Beta = drift.Beta, GrassWheels = RaceDrift.GrassWheels(body), Steer = command.Steering,
        SimTime = body.Steps * PowertrainVehicle.FixedDelta, SinceHit = body.Steps*PowertrainVehicle.FixedDelta-body.LastHitTime, BetaLimit = DriftBetaLimit,
      };
      Km += JsMath.Hypot(v.X, v.Z) * PowertrainVehicle.FixedDelta / 1000;
      bool running = Session.State == RaceState.Running;
      var back = Session.Step(input, PowertrainVehicle.FixedDelta);
      if (back != null) { Place(back.Value.X, back.Value.Z, back.Value.Heading); Teleports++; Recording.Cut = true; }
      // TS uzakAdimi: yarış adımından sonra hayalet bir adım.
      Ghost?.Step();
      if (running && Session.State == RaceState.Finished) Finished?.Invoke(this);
    }
  }
}
