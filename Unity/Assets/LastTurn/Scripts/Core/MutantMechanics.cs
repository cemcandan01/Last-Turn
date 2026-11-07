#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // cekirdek/mekanikler.ts + oyun/mutant-enerji.ts (TS 0.8.18). Saf ve belirlenimci; fiziğe yalnız tutuş/güç çarpanı verir.
  public sealed class MechanicEffect
  {
    public double Grip, Duration, After;
    public double? Power;
  }

  public sealed class MechanicDefinition
  {
    public string Id = "", Category = "passive", GainUnit = "olay";
    public string? Trigger;
    public double Version = 1, Cost, CooldownSteps, Gain;
    // koşul (yalnız ilgili olay türünde anlamlı)
    public double? MinSpeed, MinAngle, MinDuration, ChainSteps, MinRisk;
    public string? Ability, DamageType, Status;
    public bool NoSpin, Grounded;
    // değiştirici (undefined → null)
    public double? ModCapacity, ModCost, ModDuration, ModGrip, ModPower, ModBurn;
    public bool HasModifier;
    public MechanicEffect? Effect;

    private static double? Opt(CatalogNode n, string key) => n.Has(key) && n[key].IsNumber ? n[key].N() : (double?)null;
    public static MechanicDefinition FromNode(CatalogNode m)
    {
      var d = new MechanicDefinition
      {
        Id = m["id"].S(), Version = m["versiyon"].N(), Category = m["kategori"].S(), Trigger = m.Has("tetik") ? m["tetik"].S() : null,
        Cost = m["maliyet"].N(), CooldownSteps = m["beklemeAdimi"].N(), Gain = m["kazanc"].N(), GainUnit = m["kazancBirimi"].S(),
      };
      if (m.Has("kosul"))
      {
        var k = m["kosul"];
        d.MinSpeed = Opt(k, "enAzHiz"); d.MinAngle = Opt(k, "enAzAci"); d.MinDuration = Opt(k, "enAzSure");
        d.ChainSteps = Opt(k, "zincirAdim"); d.MinRisk = Opt(k, "enAzRisk");
        d.Ability = k.Has("yetenek") ? k["yetenek"].S() : null; d.DamageType = k.Has("hasar") ? k["hasar"].S() : null;
        d.Status = k.Has("durum") ? k["durum"].S() : null; d.NoSpin = k["spinsiz"].B(); d.Grounded = k["yerde"].B();
      }
      if (m.Has("degistir"))
      {
        var g = m["degistir"]; d.HasModifier = true;
        d.ModCapacity = Opt(g, "kapasite"); d.ModCost = Opt(g, "maliyet"); d.ModDuration = Opt(g, "sure");
        d.ModGrip = Opt(g, "tutus"); d.ModPower = Opt(g, "guc"); d.ModBurn = Opt(g, "yakma");
      }
      if (m.Has("etki"))
      {
        var e = m["etki"];
        d.Effect = new MechanicEffect { Grip = e["tutus"].N(double.NaN), Duration = e["sure"].N(double.NaN), After = e["sonraBekleme"].N(double.NaN), Power = Opt(e, "guc") };
      }
      return d;
    }
  }

  // GirisOlayi ve TurevOlay (EnergyGained) tek tür; alanlar olay türüne göre anlamlıdır.
  public sealed class MechanicEvent
  {
    public string Kind = "";
    public MechanicEventIdentity? Identity;
    public double Seq, Dt, Speed, Angle, Duration, Amount, Risk, Distance, Direction, Severity;
    public bool Spin, Airborne;
    public string Ability = "", Damage = "", Target = "", DamageType = "", Effect = "", Status = "", Source = "";
    public MechanicEvent With(double seq) { var e = (MechanicEvent)MemberwiseClone(); e.Seq = seq; return e; }
  }

  public sealed class MechanicParameters
  {
    public double Capacity, Cost, Duration, Grip, Power, Burn;
  }

  public sealed class MechanicTelemetry
  {
    public double Triggers, Gain, Spent;
  }

  public sealed class MechanicState
  {
    public double Step, Energy, Capacity, LastSeq = -1, Cut, DriftGain, LastCleanEnd = -1, Burned;
    public double EffectLeft, EffectWait, EffectGrip = 1, EffectPower = 1, EffectSteps;
    public bool DriftOpen;
    public Dictionary<string, double> LastTrigger = new Dictionary<string, double>(StringComparer.Ordinal);
    public Dictionary<string, MechanicTelemetry> Telemetry = new Dictionary<string, MechanicTelemetry>(StringComparer.Ordinal);

    public MechanicState Clone()
    {
      var c = (MechanicState)MemberwiseClone();
      c.LastTrigger = new Dictionary<string, double>(LastTrigger, StringComparer.Ordinal);
      c.Telemetry = Telemetry.ToDictionary(p => p.Key, p => new MechanicTelemetry { Triggers = p.Value.Triggers, Gain = p.Value.Gain, Spent = p.Value.Spent }, StringComparer.Ordinal);
      return c;
    }

    public static MechanicState FromNode(CatalogNode n)
    {
      var s = new MechanicState
      {
        Step = n["adim"].N(), Energy = n["enerji"].N(), Capacity = n["kapasite"].N(), LastSeq = n["sonSira"].N(-1), Cut = n["kesilen"].N(),
        DriftOpen = n["driftAcik"].B(), DriftGain = n["driftKazanci"].N(), LastCleanEnd = n["sonTemizBitis"].N(-1), Burned = n["yanan"].N(),
        EffectLeft = n["etkiKalan"].N(), EffectWait = n["etkiBekleme"].N(), EffectGrip = n["etkiTutus"].N(1), EffectPower = n["etkiGuc"].N(1), EffectSteps = n["etkiAdim"].N(),
      };
      foreach (var p in n["sonTetik"].Fields) s.LastTrigger[p.Key] = p.Value.N();
      foreach (var p in n["telemetri"].Fields) s.Telemetry[p.Key] = new MechanicTelemetry { Triggers = p.Value["tetik"].N(), Gain = p.Value["kazanc"].N(), Spent = p.Value["harcama"].N() };
      return s;
    }

    public CatalogNode ToNode()
    {
      var n = CatalogNode.Obj();
      void Num(string k, double v) => n.Set(k, CatalogNode.Num(v));
      Num("adim", Step); Num("enerji", Energy); Num("kapasite", Capacity); Num("sonSira", LastSeq);
      var last = CatalogNode.Obj(); foreach (var p in LastTrigger) last.Set(p.Key, CatalogNode.Num(p.Value)); n.Set("sonTetik", last);
      var tel = CatalogNode.Obj();
      foreach (var p in Telemetry) { var t = CatalogNode.Obj(); t.Set("tetik", CatalogNode.Num(p.Value.Triggers)); t.Set("kazanc", CatalogNode.Num(p.Value.Gain)); t.Set("harcama", CatalogNode.Num(p.Value.Spent)); tel.Set(p.Key, t); }
      n.Set("telemetri", tel);
      Num("kesilen", Cut); n.Set("driftAcik", CatalogNode.Parse(DriftOpen ? "true" : "false")); Num("driftKazanci", DriftGain);
      Num("sonTemizBitis", LastCleanEnd); Num("yanan", Burned); Num("etkiKalan", EffectLeft); Num("etkiBekleme", EffectWait);
      Num("etkiTutus", EffectGrip); Num("etkiGuc", EffectPower); Num("etkiAdim", EffectSteps);
      return n;
    }
  }

  public sealed class DriftObservation
  {
    public bool Open;
    public double Duration, Seq;
  }

  public sealed class DriftObserverInput
  {
    public double Vx, Vz, Direction, Cool, Beta;
    public bool Air, DriftOn;
  }

  public static class MutantMechanics
  {
    public const int CausalDepth = 3, StepLimit = 64;
    public const double BaseCapacity = 100, GripCeiling = 1.4, PowerCeiling = 1.9, StartEnergy = 40;
    private static readonly (double Min, double Max) CapacityBounds = (BaseCapacity, 200), CostBounds = (.5, 2), DurationBounds = (.5, 2),
      GripBounds = (0, .2), PowerBounds = (0, .3), BurnBounds = (.2, 1);

    public static readonly MechanicDefinition Nitro = new MechanicDefinition
    { Id = "nitro", Category = "active", Trigger = "AbilityActivated", Cost = 40, GainUnit = "olay", Effect = new MechanicEffect { Grip = 1, Power = 1.6, Duration = 2.5, After = 4 } };
    public static readonly MechanicDefinition DrivingEnergy = new MechanicDefinition
    { Id = "surus-enerjisi", Trigger = "DriftTickQualified", MinSpeed = 11, MinAngle = .35, Gain = 2.5, GainUnit = "saniye" };
    public static readonly MechanicDefinition DriftHarvester = new MechanicDefinition
    { Id = "drift-harvester", Trigger = "DriftTickQualified", MinSpeed = 11, MinAngle = .2, Gain = 6, GainUnit = "saniye" };
    public static readonly MechanicDefinition GripPulse = new MechanicDefinition
    { Id = "tutus-darbesi", Category = "active", Trigger = "AbilityActivated", Cost = 30, GainUnit = "olay", Effect = new MechanicEffect { Grip = 1.2, Duration = 2.5, After = 2 } };

    private static double Clamp(double v, (double Min, double Max) b) => Math.Min(b.Max, Math.Max(b.Min, v));
    private static bool Finite(double? v) => v.HasValue && double.IsFinite(v.Value);
    private static bool SafeInteger(double v) => double.IsFinite(v) && Math.Floor(v) == v && Math.Abs(v) <= 9007199254740991;
    private static bool Integer(double v) => double.IsFinite(v) && Math.Floor(v) == v;

    private static bool Valid(MechanicDefinition m) =>
      m.Id != "" && m.Version >= 1 && SafeInteger(m.CooldownSteps) && m.CooldownSteps >= 0 && m.Cost >= 0 && m.Gain >= 0 &&
      double.IsFinite(m.Cost) && double.IsFinite(m.Gain) &&
      (m.Effect == null || (double.IsFinite(m.Effect.Grip) && m.Effect.Grip >= 1 && m.Effect.Duration > 0 && double.IsFinite(m.Effect.Duration) && m.Effect.After >= 0));

    /// aynı kimlik ikinci kez takılmaz; geçersiz tanım atılır; sıra korunur
    public static List<MechanicDefinition> Normalize(IEnumerable<MechanicDefinition> installed)
    {
      var seen = new HashSet<string>(StringComparer.Ordinal); var r = new List<MechanicDefinition>();
      foreach (var m in installed) { if (!Valid(m) || seen.Contains(m.Id)) continue; seen.Add(m.Id); r.Add(m); }
      return r;
    }

    public static MechanicParameters Parameters(IEnumerable<MechanicDefinition> installed)
    {
      double capacity = BaseCapacity, cost = 1, duration = 1, grip = 0, power = 0, burn = 1;
      foreach (var m in Normalize(installed))
      {
        if (!m.HasModifier) continue;
        if (Finite(m.ModCapacity)) capacity += m.ModCapacity!.Value;
        if (Finite(m.ModCost) && m.ModCost > 0) cost *= m.ModCost!.Value;
        if (Finite(m.ModDuration) && m.ModDuration > 0) duration *= m.ModDuration!.Value;
        if (Finite(m.ModGrip)) grip += m.ModGrip!.Value;
        if (Finite(m.ModPower)) power += m.ModPower!.Value;
        if (Finite(m.ModBurn) && m.ModBurn >= 0) burn *= m.ModBurn!.Value;
      }
      return new MechanicParameters
      {
        Capacity = Clamp(capacity, CapacityBounds), Cost = Clamp(cost, CostBounds), Duration = Clamp(duration, DurationBounds),
        Grip = Clamp(grip, GripBounds), Power = Clamp(power, PowerBounds), Burn = Clamp(burn, BurnBounds),
      };
    }

    public static MechanicState ApplyCapacity(MechanicState d, IEnumerable<MechanicDefinition> installed)
    {
      var c = d.Clone(); c.Capacity = Parameters(installed).Capacity; c.Energy = Math.Min(d.Energy, c.Capacity); return c;
    }

    public static double GripMultiplier(MechanicState d) => d.EffectLeft > 0 ? d.EffectGrip : 1;
    public static double PowerMultiplier(MechanicState d) => d.EffectLeft > 0 ? d.EffectPower : 1;

    public static MechanicState Start(double capacity = BaseCapacity, double start = 0)
    {
      if (!double.IsFinite(capacity) || capacity <= 0 || !double.IsFinite(start)) throw new ArgumentOutOfRangeException(nameof(capacity), "Geçersiz enerji kapasitesi veya başlangıcı");
      return new MechanicState { Energy = Math.Max(0, Math.Min(capacity, start)), Capacity = capacity };
    }

    private static bool ValidDt(double dt) => dt > 0 && dt <= 1.0 / 30 && double.IsFinite(dt);

    private static bool Matches(MechanicDefinition m, MechanicEvent o, MechanicState d)
    {
      if (m.Trigger == null || m.Trigger != o.Kind) return false;
      switch (o.Kind)
      {
        case "SurusTick":
          if (!ValidDt(o.Dt) || !double.IsFinite(o.Speed)) return false;
          if (m.Grounded && o.Airborne) return false;
          if (m.MinSpeed.HasValue && o.Speed < m.MinSpeed.Value) return false;
          break;
        case "DriftEnded":
          if (m.NoSpin && o.Spin) return false;
          if (m.MinDuration.HasValue && !(o.Duration >= m.MinDuration.Value)) return false;
          break;
        case "RiskBasladi":
          if (m.MinRisk.HasValue && !(o.Risk >= m.MinRisk.Value)) return false;
          break;
        case "HasarAlindi":
          if (!(o.Amount > 0)) return false;
          break;
        case "HasarVerildi":
        case "KorumaEngelledi":
          if (!(o.Amount > 0) || !double.IsFinite(o.Amount)) return false;
          if (o.Kind == "HasarVerildi" && m.DamageType != null && o.DamageType != m.DamageType) return false;
          break;
        case "YakinTakip":
          if (!ValidDt(o.Dt)) return false;
          break;
        case "DurumUygulandi":
          if (m.Status != null && o.Status != m.Status) return false;
          break;
        case "DriftStarted":
          if (m.ChainSteps.HasValue && (d.LastCleanEnd < 0 || d.Step - d.LastCleanEnd > m.ChainSteps.Value)) return false;
          break;
        case "DriftTickQualified":
          // bir sabit adımdan uzun tek adım nitelikli sayılmaz
          if (!(o.Dt > 0) || o.Dt > 1.0 / 30 || !double.IsFinite(o.Dt) || !double.IsFinite(o.Speed) || !double.IsFinite(o.Angle)) return false;
          if (m.MinSpeed.HasValue && o.Speed < m.MinSpeed.Value) return false;
          if (m.MinAngle.HasValue && Math.Abs(o.Angle) < m.MinAngle.Value) return false;
          break;
        case "AbilityActivated":
          if (o.Ability != (m.Ability ?? m.Id)) return false;
          break;
        case "EnergyGained":
          // kendi ürettiği enerji olayına tepki vermez
          if (o.Source == m.Id) return false;
          break;
      }
      return true;
    }

    private static double GainFor(MechanicDefinition m, MechanicEvent o)
    {
      if (m.GainUnit == "olay") return m.Gain;
      if (m.GainUnit == "saniye") return o.Kind == "DriftTickQualified" || o.Kind == "SurusTick" || o.Kind == "YakinTakip" ? m.Gain * o.Dt : 0;
      return o.Kind == "HasarVerildi" || o.Kind == "HasarAlindi" || o.Kind == "KorumaEngelledi" ? m.Gain * o.Amount : 0;
    }

    /// mekanikAdimi: etkin değilse aynı nesne döner. Türev olaylar aynı adımda derinlik/işlem sınırı içinde işlenir.
    public static MechanicState Step(MechanicState state, IReadOnlyList<MechanicEvent> events, IEnumerable<MechanicDefinition> installed, bool active = false, double dt = 1.0 / 60, MutantDamageEvents? damageEvents = null)
    {
      if (!active) return state;
      var y = state.Clone(); y.Step = state.Step + 1;
      double stepDt = ValidDt(dt) ? dt : 0;
      if (y.EffectLeft > 0)
      {
        y.EffectSteps++; y.EffectLeft = Math.Max(0, y.EffectLeft - stepDt);
        if (y.EffectLeft <= 0) { y.EffectGrip = 1; y.EffectPower = 1; }
      }
      else if (y.EffectWait > 0) y.EffectWait = Math.Max(0, y.EffectWait - stepDt);
      var list = Normalize(installed); var P = Parameters(list);
      var queue = new List<(MechanicEvent O, int Depth)>();
      foreach (var o in events)
      {
        if (!Integer(o.Seq) || o.Seq <= y.LastSeq) continue;
        y.LastSeq = o.Seq; queue.Add((o, 0));
      }
      int processed = 0;
      for (int i = 0; i < queue.Count; i++)
      {
        if (processed >= StepLimit) { y.Cut += queue.Count - i; break; }
        processed++;
        var (o, depth) = queue[i];
        if(damageEvents!=null&&!damageEvents.Accept(o))continue;
        damageEvents?.Observed(o);
        if (o.Kind == "DriftStarted") { y.DriftOpen = true; y.DriftGain = 0; }
        foreach (var m in list)
        {
          if (!Matches(m, o, y)) continue;
          if (y.LastTrigger.TryGetValue(m.Id, out double last) && y.Step - last <= m.CooldownSteps) continue;
          if (m.Effect != null && (y.EffectLeft > 0 || y.EffectWait > 0)) continue;
          double cost = m.Category == "active" ? m.Cost * P.Cost : m.Cost;
          if (y.Energy < cost) continue;
          double gain = GainFor(m, o), before = y.Energy;
          y.Energy = Math.Min(y.Capacity, Math.Max(0, before - cost + gain));
          y.LastTrigger[m.Id] = y.Step;
          if (m.Effect != null)
          {
            y.EffectLeft = m.Effect.Duration * P.Duration; y.EffectWait = m.Effect.After;
            y.EffectGrip = Math.Min(GripCeiling, m.Effect.Grip + P.Grip);
            y.EffectPower = m.Effect.Power.HasValue && m.Effect.Power.Value != 0 && !double.IsNaN(m.Effect.Power.Value) ? Math.Min(PowerCeiling, m.Effect.Power.Value + P.Power) : 1;
          }
          double earned = Math.Max(0, y.Energy - before + cost);
          if (y.DriftOpen) y.DriftGain += earned;
          y.Telemetry.TryGetValue(m.Id, out var t);
          y.Telemetry[m.Id] = new MechanicTelemetry { Triggers = (t?.Triggers ?? 0) + 1, Gain = (t?.Gain ?? 0) + earned, Spent = (t?.Spent ?? 0) + cost };
          double diff = y.Energy - before;
          if (diff > 0)
          {
            if (depth + 1 <= CausalDepth) queue.Add((new MechanicEvent { Kind = "EnergyGained", Amount = diff, Source = m.Id, Identity = o.Identity?.Energy(m.Id) }, depth + 1));
            else y.Cut++;
          }
        }
        if (o.Kind == "DriftEnded")
        {
          if (o.Spin) { double burn = Math.Min(y.Energy, y.DriftGain * P.Burn); y.Energy -= burn; y.Burned += burn; }
          else y.LastCleanEnd = y.Step;
          y.DriftOpen = false; y.DriftGain = 0;
        }
      }
      return y;
    }

    /// driftGozlemcisi: fizik sonrası bilinçli drift durumundan olay üretir; fiziği okumaz/yazmaz.
    public static (DriftObservation G, List<MechanicEvent> Events) ObserveDrift(DriftObservation g, DriftObserverInput d, double dt, bool drivingTick = false)
    {
      var events = new List<MechanicEvent>(); bool open = g.Open; double duration = g.Duration, seq = g.Seq;
      double speed = JsMath.Hypot(d.Vx, d.Vz);
      if (drivingTick) events.Add(new MechanicEvent { Kind = "SurusTick", Seq = seq++, Dt = dt, Speed = speed, Airborne = d.Air });
      if (d.DriftOn && !open) { events.Add(new MechanicEvent { Kind = "DriftStarted", Seq = seq++, Direction = d.Direction }); open = true; duration = 0; }
      if (d.DriftOn)
      {
        duration += dt;
        if (!d.Air) events.Add(new MechanicEvent { Kind = "DriftTickQualified", Seq = seq++, Dt = dt, Speed = speed, Angle = d.Beta });
      }
      else if (open)
      {
        // spinle biten driftte fizik soğuması (DR.cool) başlar
        events.Add(new MechanicEvent { Kind = "DriftEnded", Seq = seq++, Duration = duration, Spin = d.Cool > 0 }); open = false; duration = 0;
      }
      return (new DriftObservation { Open = open, Duration = duration, Seq = seq }, events);
    }

    /// takiliMekanikler: NITRO + temel sürüş enerjisi + koşu pasiflerinin mekanikleri (sıra korunur)
    public static List<MechanicDefinition> Installed(IEnumerable<string> passives, Func<string, CatalogNode?> find)
    {
      var r = new List<MechanicDefinition> { Nitro, DrivingEnergy };
      foreach (var id in passives) { var p = find(id); if (p != null && p.Has("m")) r.Add(MechanicDefinition.FromNode(p["m"])); }
      return r;
    }
  }
}
