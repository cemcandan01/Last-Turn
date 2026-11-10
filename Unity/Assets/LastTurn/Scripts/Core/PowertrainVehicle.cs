using System;
using System.Linq;

namespace LastTurn.Core
{
  public sealed class PowertrainVehicle
  {
    public const double FixedDelta = FourWheelVehicle.FixedDelta;
    private PowertrainParameters p;
    public PowertrainParameters Parameters => p;
    public VehicleSkillInput SkillInput {get;set;}=null!;
    /// TS set.sm/set.ss oyuncu tercihi (lt_ayar). null: parametredeki değer (doğrulanmış varsayılan davranış).
    public bool? SmoothSteeringPreference {get;set;}
    public bool? SpeedSensitivePreference {get;set;}
    private readonly FourWheelVehicle body;
    public VehicleState Body => body.State;
    public PowertrainState Engine { get; private set; } = null!;
    /// TS DR (ortak.ts driftPenceresi, kariyer dalı): yalnız yardım parametresi olan araçta işler.
    public DriftAssistState Assist { get; private set; } = new DriftAssistState();
    /// TS S.pv: önceki adımın başındaki hız yönü (drift yalpa desteği); yerleştirmede sıfırlanır.
    private double? previousCourse;
    /// TS olay.spin: drift penceresi aşıldı (yardımlı araçta).
    public int Spins { get; private set; }
    /// TS cx.driftYarisi: MUTANT drift yarışı çalışırken drift penceresinin yarış dalı (null: kariyer/serbest dal).
    public DriftRaceProfile DriftRace { get; set; } = null!;
    public PowertrainVehicle(PowertrainParameters parameters, double initialSpeed = 0, int initialGear = 1,IVehicleWorld world = null!)
    {
      p = parameters ?? throw new ArgumentNullException(nameof(parameters));
      PowertrainParameters.GearRatio(initialGear);
      body = new FourWheelVehicle(p.Chassis, initialSpeed,world:world);
      Engine = Initial(initialGear);
    }
    // MUTANT güç/hasar/pasif güncellemesi sıfırlama değildir: motor, gövde, drift ve geçmiş hız yönü korunur.
    public void Reconfigure(PowertrainParameters parameters)
    {
      if(parameters==null)throw new ArgumentNullException(nameof(parameters));
      var a=parameters.Assists;
      if(a!=null)
      {
        // Sayısal parametreler kurucuda doğrulanır; yalnız yardım nesnesinin alanları sonradan değişebilir.
        Numeric.Finite(a.Str);Numeric.Finite(a.Stm);Numeric.Finite(a.Dft);Numeric.Finite(a.Ini);
        Numeric.Finite(a.DesignSpeed);Numeric.Finite(a.AeroFactor);
      }
      body.Reconfigure(parameters.Chassis);p=parameters;
    }
    private static PowertrainState Initial(int gear) => new PowertrainState { Rpm = 900, Gear = gear };
    public void Reset(double initialSpeed = 0, int initialGear = 1)
    {
      PowertrainParameters.GearRatio(initialGear);
      body.Reset(initialSpeed);
      Engine = Initial(initialGear); Assist = new DriftAssistState(); previousCourse = null;
    }
    /// Yarış başlangıcı / piste dönüş (TS reset karşılığı): araç durur, zemine oturtulur, motor ilk durumuna döner.
    public void Place(double x, double z, double heading)
    {
      body.Reset(0, 0, heading, x, z);
      Engine = Initial(1); Assist = new DriftAssistState(); previousCourse = null;
    }
    /// Gövdenin (0, 0, 0) referans noktası: TS S.x/S.z; yüzey ve yarış sorguları buradan yapılır.
    public BodyVector ReferencePoint => Body.Orientation.Rotate(new BodyVector(0, -p.Chassis.CgY, -p.Chassis.CgZ)) + Body.Position;
    private static double Clamp(double x, double a, double b) => Math.Max(a, Math.Min(b, x));
    private static double Smooth(double a, double b, double x) { double t = Clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    // Salt gösterim gözlemcisi; abone yokken sayısal yol aynıdır.
    public event Action<PowertrainVehicle>? Stepped;
    public void Step(DrivingInput input)
    {
      var previous = Engine;
      double dt = FixedDelta;
      double rate = input.AnalogSteering ? 14 * p.SteeringSensitivity : input.Steering == 0 ? 10 : (SmoothSteeringPreference ?? p.SmoothSteering) ? 6.5 * p.SteeringSensitivity : 30;
      double st = previous.Steering + (input.Steering - previous.Steering) * Math.Min(1, rate * dt);
      double gas = previous.Gas + (input.Throttle - previous.Gas) * Math.Min(1, dt * (2 + 18 * p.ThrottleResponse));
      var forward = Body.Orientation.Rotate(new BodyVector(0, 0, 1));
      double heading = Math.Atan2(forward.X, forward.Z), fx = Math.Sin(heading), fz = Math.Cos(heading);
      double vl = Body.Velocity.X * fx + Body.Velocity.Z * fz, vt = Body.Velocity.X * fz - Body.Velocity.Z * fx;
      double ab = Math.Abs(Math.Atan2(vt, Math.Max(vl, .5))), spn = Math.Min(1, Math.Abs(vl) / 77.2);
      // Drift/viraj/ESC yardımları bu dilimde kapalı; kaynak ss/sm seçenekleri korunur.
      double delta = st * p.SteeringLock * ((SpeedSensitivePreference ?? p.SpeedSensitiveSteering) ? 1 - .5 * Math.Pow(spn, .8) * (1 - Smooth(.1, .3, ab)) : 1);
      // TS yardımları (model.ts): drift penceresi, viraj desteğiyle direksiyon, drift desteğinin karşı direksiyonu.
      AssistCommand assist = null!; var a = p.Assists;
      if (a != null)
      {
        double v = Math.Sqrt(Body.Velocity.X * Body.Velocity.X + Body.Velocity.Z * Body.Velocity.Z), be = Math.Atan2(vt, Math.Max(vl, .5));
        DriftWindow(a, input, st, v, be, ab, dt);
        var dr = Assist; double pv0 = Math.Atan2(Body.Velocity.X, Body.Velocity.Z);
        delta *= 1 + .12 * a.Str;
        double dw = a.Dft * dr.K, wd = 0;
        if (dr.K > 0 && a.Dft > 0)
        {
          double dc = Clamp(2 * (be + dr.Dir * dr.Bt), -.6, .6);
          delta = delta * (1 - dw) + dc * dw;
          double wv = TrackGeometry.AngleDelta(pv0 - (previousCourse ?? pv0)) / dt;
          wd = wv + 5 * (be + dr.Dir * dr.Bt);
        }
        previousCourse = pv0;
        assist = new AssistCommand
        {
          Kz = Math.Max(dr.K, Smooth(.1, .3, ab) * Math.Min(1, input.Throttle) * a.Dft), RearGrip = 1 - .3 * a.Ini * dr.K,
          Kin = 5 * a.Str * (1 - dr.K), Al = 2.5 * a.Str * (1 - dr.K), Esc = 1.6 * a.Stm * (1 - dr.K) * (input.Handbrake ? 0 : 1), Dw = dw, Wd = wd,
          AeroFactor = a.AeroFactor, Spn = spn, Heading = heading,
          Support = dr.K > .05 && a.Dft > 0 && input.Throttle > 0 ? a.Dft * dr.K * input.Throttle : 0, SupportTarget = Math.Min(a.DesignSpeed * .45, 30),
        };
      }
      delta = Clamp(delta, -p.Chassis.MaxSteering, p.Chassis.MaxSteering);
      double throttle = gas, brake = input.Brake;
      // TS yardımlı araçta TCS gövde açısıyla gazı da keser (drift ve el freni hariç). Yardımsız GT/Arazi prototipinde
      // kabul edilmiş düzeltme (201d7b3) geçerli: yalnız kayma sınırı.
      if (p.Assists != null && p.Tcs > 0 && !Assist.On && !input.Handbrake) throttle *= 1 - p.Tcs * Smooth(.12, .35, ab);
      // Kütle merkezinin yana hızı normal dar dönüşte de vardır; patinaj değildir.
      // TCS, aşağıdaki kayma sınırıyla her tahrik tekerinin birleşik lastik
      // kuvvetine uygulanır. Gövde açısıyla ikinci kez gaz kesmek kalkışı boğar.
      int gear = previous.Gear;
      if (brake > 0 && vl < .5 && input.Throttle < .05) gear = -1;
      else if (gear == -1 && input.Throttle > .05) gear = 1;
      if (gear == -1) { throttle = brake; brake = 0; }
      double slipLimit = 1e9;
      if (p.Tcs > 0 && !input.Handbrake) slipLimit = 1.2 + 2.5 * (1 - p.Tcs);
      if (!input.AnalogThrottle && !input.Handbrake)
        slipLimit = Math.Min(slipLimit, 1 + 4 * (.02 + .08 * p.LaunchFactor) + Math.Max(0, Math.Abs(vl) - 6) * .25);
      double ratio = PowertrainParameters.GearRatio(gear) * p.FinalDrive;
      var wheels = Body.Wheels;
      double driven = (1 - p.Chassis.FrontDriveShare) * ((wheels[2].Omega + wheels[3].Omega) / 2)
        + p.Chassis.FrontDriveShare * ((wheels[0].Omega + wheels[1].Omega) / 2);
      double wheelRpm = Math.Abs(driven * ratio) * 60 / (2 * Math.PI);
      double timer = previous.ShiftTimer - dt;
      if (p.ManualGearbox)
      {
        // Drag manuel: istek yalnız geçiş bitmişken; geçiş süresi ve tork kesmesi otomatikle aynı. Sınır dışı istek reddedilir.
        if (gear > 0 && input.Shift != 0)
        {
          if (timer <= 0 && input.Shift > 0 && gear < 6) { gear++; timer = .12; ShiftsUp++; }
          else if (timer <= 0 && input.Shift < 0 && gear > 1) { gear--; timer = .1; ShiftsDown++; }
          else RejectedShifts++;
        }
      }
      else if (!input.Handbrake && timer < -.6 && gear > 0)
      {
        double groundRpm = Math.Abs(vl / p.Chassis.Wheels[2].Radius) * Math.Abs(ratio) * 60 / (2 * Math.PI);
        if (Math.Min(wheelRpm, groundRpm * 1.15) > .95 * p.MaxRpm && gear < 6) { gear++; timer = .12; }
        else if (gear > 1 && wheelRpm < (throttle > .5 ? .42 : .3) * p.MaxRpm
          && wheelRpm * PowertrainParameters.GearRatio(gear - 1) / PowertrainParameters.GearRatio(gear) < .85 * p.MaxRpm)
        { gear--; timer = .1; }
      }
      // devirT kaynakta eski oranla hesaplanır; geçiş sonrası Tw yeni oranı kullanır. Sıra değiştirilmez.
      ratio = PowertrainParameters.GearRatio(gear) * p.FinalDrive;
      // Manuel kalkış: geri sayımda tutulan devirden debriyaj bırakılır; kayan debriyaj devri teker devrine iner
      // (EngageRate), yetişince kavrar (−1) ve motor teker devriyle döner. Kalkış devri yalnız bu kayma süresinde etkili.
      double hold = 0;
      if (p.ManualGearbox && previous.LaunchHold >= 0)
      {
        double h0 = previous.LaunchHold == 0 ? p.IdleRpm : previous.LaunchHold;
        hold = h0 + (wheelRpm - h0) * Math.Min(1, dt * PowertrainParameters.EngageRate);
        if (hold - wheelRpm <= 25) hold = -1;
      }
      else if (p.ManualGearbox) hold = -1;
      double launch = p.ManualGearbox ? (hold > 0 ? hold : p.IdleRpm) : p.IdleRpm + (p.LaunchRpm - p.IdleRpm) * Math.Min(1, throttle * 1.5);
      double coupled = Math.Max(wheelRpm, throttle > .05 ? launch : p.IdleRpm), u = coupled / p.MaxRpm;
      double rpm = previous.Rpm + (coupled - previous.Rpm) * Math.Min(1, dt * 12);
      double boost = previous.Turbo, turboFactor = 1;
      if (p.TurboShare != 0)
      {
        double target = throttle * Smooth(p.TurboThreshold - .2, p.TurboThreshold, u);
        boost += (target - boost) * Math.Min(1, dt / (target > boost ? p.TurboSeconds : p.TurboSeconds * .3));
        turboFactor = 1 - p.TurboShare * (1 - boost);
      }
      double torque = 0;
      if (timer <= 0)
      {
        // Geri manevra kesicisi motor torkunu keser; hız/teker durumu kelepçelenmez.
        // Tork eğrisinin u değeri ileri motor devriyle normalize kalır.
        torque = u < 1.02 && (gear != -1 || coupled < p.ReverseMaxRpm * 1.02)
          ? p.PeakTorque * PowertrainParameters.TorqueCurve(u) * throttle * turboFactor : 0;
        if (wheelRpm > p.IdleRpm) torque -= p.PeakTorque * .15 * u * (1 - throttle);
      }
      double drive = torque * ratio * p.Efficiency;
      double holdBrake = Math.Abs(vl) < .6 && throttle < .05 && brake < .05 ? .3 : 0;
      var next = new PowertrainState { Gas = gas, Steering = st, Rpm = rpm, Gear = gear, ShiftTimer = timer,
        Turbo = boost, EngineTorque = torque, DriveTorque = drive, CoupledRpm = coupled, EffectiveGas = throttle,
        EffectiveBrake = brake + holdBrake, SlipLimit = slipLimit, SteeringAngle = delta, LaunchHold = hold };
      // Gövde başarısızsa motorun kısmen ilerlemiş durumu yayımlanmaz.
      body.Step(new VehicleCommand(delta, drive, brake + holdBrake, input.Handbrake, p.Abs, slipLimit, assist),SkillInput,st);
      Engine = next;
      Stepped?.Invoke(this);
    }
    public int ShiftsUp { get; private set; }
    public int ShiftsDown { get; private set; }
    public int RejectedShifts { get; private set; }

    /// Geri sayım kalkış devri: gaz basılıyken serbest devir hedefe (rölanti + gaz × (kesici − rölanti)) yaklaşır, bırakınca rölantiye.
    private double Hold(double previousHold, double throttle, double dt)
    {
      double h = previousHold == 0 ? p.IdleRpm : previousHold;
      double target = throttle > .05 ? p.IdleRpm + (p.MaxRpm * PowertrainParameters.RevLimit - p.IdleRpm) * throttle : p.IdleRpm;
      return h + (target - h) * Math.Min(1, dt * PowertrainParameters.FreeRevRate);
    }

    /// Drag geri sayımı: araç durur (fizik donuk); yalnız motor serbest devirde gazla tutulur (manuel kalkış hazırlığı).
    public void PreRev(DrivingInput input)
    {
      if (!p.ManualGearbox) return;
      double dt = FixedDelta; var previous = Engine;
      double gas = previous.Gas + (input.Throttle - previous.Gas) * Math.Min(1, dt * (2 + 18 * p.ThrottleResponse));
      double hold = Hold(previous.LaunchHold, gas, dt);
      Engine = new PowertrainState { Gas = gas, Steering = previous.Steering, Rpm = previous.Rpm + (hold - previous.Rpm) * Math.Min(1, dt * 12), Gear = previous.Gear,
        ShiftTimer = previous.ShiftTimer, Turbo = previous.Turbo, CoupledRpm = hold, LaunchHold = hold, EffectiveGas = gas };
    }

    /// Hayalet: kayıt başındaki motor durumu (geri sayım hazırlığı) aynen kurulur.
    public void SetStartEngine(double gas, double rpm, double hold)
    {
      Engine = new PowertrainState { Gas = gas, Rpm = rpm, Gear = 1, LaunchHold = hold, CoupledRpm = hold };
    }

    // TS ortak.ts driftPenceresi driftYarisi dalı: gaz+kayma ya da tam direksiyon+gazla giriş, geçişte yön değişir,
    // karşı direksiyonla bitirilebilir; azami + 0,12'yi aşan açı spin. Destek hedefi profil.destek.
    private void RaceWindow(DriftRaceProfile p, double g, double st, double v, double be, double ab, double dt)
    {
      var dr = Assist;
      if (Body.Wheels.Any(w => w.Contact))
      {
        if (!dr.On && dr.Cool <= 0)
        {
          dr.Nc = ab >= p.Entry && v >= 7 && g > .2 ? dr.Nc + dt : 0;
          dr.Hold = Math.Abs(st) > .6 && g > .5 && v >= 10 ? dr.Hold + dt : 0;
          if (dr.Nc >= p.Prepare) { dr.On = true; dr.T = 0; dr.Dir = -Math.Sign(be); dr.Bt = Clamp(ab, p.Entry, p.Max); }
          else if (dr.Hold >= p.Force) { dr.On = true; dr.T = 0; dr.Dir = Math.Sign(st); dr.Bt = p.Entry; }
          if (dr.On) dr.Nc = dr.Hold = 0;
        }
        else if (dr.On)
        {
          dr.T += dt;
          if (-Math.Sign(be) != dr.Dir && ab >= p.Entry) { dr.Dir = -Math.Sign(be); dr.Bt = Clamp(ab, 0, p.Max); dr.T = 0; }
          double ic = st * dr.Dir, gas = Clamp(g, 0, 1);
          dr.Bt += ((ic > .25 ? .4 * ic : ic < -.25 ? 1.0 * ic : 0) + (gas - .55) * .24) * dt;
          dr.Bt = Clamp(dr.Bt, 0, p.Max);
          if (ab > p.Max + .12) { dr.On = false; dr.Cool = .9; dr.Nc = 0; Spins++; }
          else if (v < 5 || dr.Bt < p.Entry * .5 || (ab < p.Entry * .6 && dr.T > .6)) dr.On = false;
        }
      }
      else dr.On = false;
      dr.K += ((dr.On ? p.Support : 0) - dr.K) * Math.Min(1, dt * (dr.On ? 7 : 3));
    }

    /// TS driftSiniri: hızla daralan drift açısı sınırı.
    public static double DriftLimit(double v) => .9 - .35 * Clamp((v - 10) / 45, 0, 1);

    // TS ortak.ts driftPenceresi (driftYarisi = false dalı; drift yarışı mekaniği yalnız MUTANT'ta).
    private void DriftWindow(DrivingAssists a, DrivingInput input, double st, double v, double be, double ab, double dt)
    {
      var dr = Assist; double bmax = DriftLimit(v), g = input.Throttle;
      if (dr.Cool > 0) dr.Cool -= dt;
      if (DriftRace != null) { RaceWindow(DriftRace, g, st, v, be, ab, dt); return; }
      if (Body.Wheels.Any(w => w.Contact))
      {
        if (!dr.On && dr.Cool <= 0)
        {
          bool full = Math.Abs(st) > (g > .5 ? .6 : .7);
          dr.Hold = full && v > 11 ? dr.Hold + dt : 0;
          double dth = a.DriftPreset ? .35 : .55;
          dr.Nc = ab > dth && g > .5 && v > 11 ? dr.Nc + dt : 0;
          if ((input.Handbrake && full && ab > .2 && v > 8) || (a.Dft > 0 && dr.Nc > .25)) { dr.On = true; dr.Dir = -Math.Sign(be); dr.Bt = Math.Min(ab, bmax); }
          else if (a.Ini > 0 && full && ((v > 13 && dr.Hold > .15) || (a.Ini >= .8 && v > 11 && input.Brake > 0))) { dr.On = true; dr.Dir = Math.Sign(st); dr.Bt = .35; }
          if (dr.On) dr.T = 0;
        }
        else if (dr.On)
        {
          dr.T += dt;
          double into = st * dr.Dir, gz = Math.Min(1, g), hd = 1.6 - a.Dft;
          if (into > .3) dr.Bt += (.5 + .3 * gz) * hd * into * dt;
          else if (into < -.3) dr.Bt += .9 * into * dt;
          else dr.Bt += (gz > .5 ? .12 * hd : -.2) * dt;
          if (gz < .2) dr.Bt -= .5 * dt;
          dr.Bt = Math.Min(dr.Bt, bmax + .9);
          if (ab > bmax + .6) { dr.On = false; dr.Cool = 1.2; Spins++; }
          else if (dr.Bt < .1 || v < 6 || (ab < .07 && dr.T > .5)) dr.On = false;
        }
      }
      dr.K += ((dr.On ? 1 : 0) - dr.K) * Math.Min(1, dt * (dr.On ? 7 : 3));
    }
  }

  public sealed class DriftAssistState
  {
    public bool On; public double Dir = 1, Hold, Bt, T, K, Cool, Nc;
  }
}
