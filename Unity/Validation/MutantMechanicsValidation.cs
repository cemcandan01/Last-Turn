using LastTurn.Core;

internal static class MutantMechanicsValidation
{
  public static void Run()
  {
    var fixture = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference/mutant-mechanics-0.8.18.json")));
    int checks = 0, steps = 0;
    double maximumError = 0;
    void Check(bool ok, string label) { checks++; if (!ok) throw new Exception("Mutant mekanik: " + label); }
    void Near(double expected, double actual, string label)
    {
      double e = Math.Abs(expected - actual); maximumError = Math.Max(maximumError, e);
      Check(double.IsFinite(actual) && e <= 1e-9 * Math.Max(1, Math.Abs(expected)), label + $" (TS {expected:R}, C# {actual:R})");
    }
    double Num(CatalogNode n) => n.IsNumber ? n.N() : double.Parse(n["n"].S(), System.Globalization.CultureInfo.InvariantCulture);
    Check(fixture["baseline"].S() == "df3549e709469f0b519ebfbeaa9f63c1040fee05", "Sabit kaynak SHA");
    var c = fixture["constants"];
    Check(c["depth"].N() == MutantMechanics.CausalDepth && c["limit"].N() == MutantMechanics.StepLimit && c["base"].N() == MutantMechanics.BaseCapacity, "Sınır sabitleri");
    Check(c["grip"].N() == MutantMechanics.GripCeiling && c["power"].N() == MutantMechanics.PowerCeiling && c["startEnergy"].N() == MutantMechanics.StartEnergy, "Çarpan tavanları");

    void SameDefinition(MechanicDefinition a, MechanicDefinition b, string label)
    {
      Check(a.Id == b.Id && a.Category == b.Category && a.Trigger == b.Trigger && a.Cost == b.Cost && a.CooldownSteps == b.CooldownSteps && a.Gain == b.Gain && a.GainUnit == b.GainUnit, label + " temel alanlar");
      Check(a.MinSpeed == b.MinSpeed && a.MinAngle == b.MinAngle && a.Ability == b.Ability, label + " koşul");
      Check((a.Effect == null) == (b.Effect == null), label + " etki var/yok");
      if (a.Effect != null) Check(a.Effect.Grip == b.Effect!.Grip && a.Effect.Power == b.Effect.Power && a.Effect.Duration == b.Effect.Duration && a.Effect.After == b.Effect.After, label + " etki");
    }
    var b = fixture["builtins"];
    SameDefinition(MutantMechanics.Nitro, MechanicDefinition.FromNode(b["nitro"]), "NITRO");
    SameDefinition(MutantMechanics.DrivingEnergy, MechanicDefinition.FromNode(b["surus"]), "SURUS_ENERJISI");
    SameDefinition(MutantMechanics.DriftHarvester, MechanicDefinition.FromNode(b["driftHarvester"]), "DRIFT_HARVESTER");
    SameDefinition(MutantMechanics.GripPulse, MechanicDefinition.FromNode(b["tutusDarbesi"]), "TUTUS_DARBESI");

    var defs = new Dictionary<string, MechanicDefinition>(StringComparer.Ordinal)
    {
      ["nitro"] = MutantMechanics.Nitro, ["surus-enerjisi"] = MutantMechanics.DrivingEnergy,
      ["drift-harvester"] = MutantMechanics.DriftHarvester, ["tutus-darbesi"] = MutantMechanics.GripPulse,
    };
    foreach (var m in fixture["perks"].Items.Concat(fixture["synthetic"].Items)) { var d = MechanicDefinition.FromNode(m); if (!defs.ContainsKey(d.Id)) defs[d.Id] = d; }
    // Katalogdaki pasif/eklenti mekanikleri oracle perkleriyle aynı olmalı (oyun bunları katalogdan okur).
    var catalog = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "../../../../Assets/LastTurn/Resources/mutant-catalog.json")));
    foreach (var perk in fixture["perks"].Items)
    {
      var source = catalog["passives"].Items.Concat(catalog["addons"].Items).FirstOrDefault(p => p["id"].S() == perk["id"].S());
      Check(source != null && source["m"].ToString() == perk.ToString(), "Katalog perk mekaniği " + perk["id"].S());
    }

    MechanicEvent Event(CatalogNode e) => new MechanicEvent
    {
      Kind = e["tur"].S(), Seq = Num(e["sira"]), Dt = e.Has("dt") ? Num(e["dt"]) : 0, Speed = e.Has("hiz") ? Num(e["hiz"]) : 0, Angle = e.Has("aci") ? Num(e["aci"]) : 0,
      Duration = e.Has("sure") ? Num(e["sure"]) : 0, Spin = e["spin"].B(), Ability = e["yetenek"].S(), Airborne = e["havada"].B(), Damage = e["hasar"].S(),
      Amount = e.Has("miktar") ? Num(e["miktar"]) : 0, Risk = e.Has("risk") ? Num(e["risk"]) : 0, Target = e["hedef"].S(), DamageType = e["hasar"].S(),
      Distance = e.Has("mesafe") ? Num(e["mesafe"]) : 0, Effect = e["etki"].S(), Status = e["durum"].S(), Source = e["kaynak"].S(),
      Direction = e.Has("yon") ? Num(e["yon"]) : 0, Severity = e.Has("siddet") ? Num(e["siddet"]) : 0,
    };
    void Same(CatalogNode expected, MechanicState s, string label)
    {
      Near(expected["adim"].N(), s.Step, label + " adım"); Near(expected["enerji"].N(), s.Energy, label + " enerji");
      Near(expected["kapasite"].N(), s.Capacity, label + " kapasite"); Near(expected["sonSira"].N(), s.LastSeq, label + " son sıra");
      Near(expected["kesilen"].N(), s.Cut, label + " kesilen"); Check(expected["driftAcik"].B() == s.DriftOpen, label + " drift açık");
      Near(expected["driftKazanci"].N(), s.DriftGain, label + " drift kazancı"); Near(expected["sonTemizBitis"].N(), s.LastCleanEnd, label + " temiz bitiş");
      Near(expected["yanan"].N(), s.Burned, label + " yanan"); Near(expected["etkiKalan"].N(), s.EffectLeft, label + " etki kalan");
      Near(expected["etkiBekleme"].N(), s.EffectWait, label + " etki bekleme"); Near(expected["etkiTutus"].N(), s.EffectGrip, label + " etki tutuş");
      Near(expected["etkiGuc"].N(), s.EffectPower, label + " etki güç"); Near(expected["etkiAdim"].N(), s.EffectSteps, label + " etki adım");
      var last = expected["sonTetik"].Fields.ToList(); Check(last.Count == s.LastTrigger.Count, label + " tetik sayısı");
      foreach (var p in last) Check(s.LastTrigger.TryGetValue(p.Key, out var v) && v == p.Value.N(), label + " son tetik " + p.Key);
      var tel = expected["telemetri"].Fields.ToList(); Check(tel.Count == s.Telemetry.Count, label + " telemetri sayısı");
      foreach (var p in tel)
      {
        Check(s.Telemetry.TryGetValue(p.Key, out var t), label + " telemetri " + p.Key);
        Near(p.Value["tetik"].N(), t!.Triggers, label + " tetik " + p.Key); Near(p.Value["kazanc"].N(), t.Gain, label + " kazanç " + p.Key); Near(p.Value["harcama"].N(), t.Spent, label + " harcama " + p.Key);
      }
      var round = MechanicState.FromNode(s.ToNode()); Check(round.ToNode().ToString() == s.ToNode().ToString(), label + " kayıt gidiş-dönüş");
    }

    foreach (var run in fixture["runs"].Items)
    {
      string label = "tohum " + run["seed"].N();
      var installed = run["defs"].Items.Select(x => defs[x.S()]).ToList();
      var state = MechanicState.FromNode(run["initial"]); Same(run["initial"], state, label + " başlangıç");
      int n = 0;
      foreach (var row in run["steps"].Items)
      {
        var events = row["events"].Items.Select(Event).ToList();
        var before = state; state = MutantMechanics.Step(state, events, installed, row["active"].B(), row["dt"].N());
        string at = label + " adım " + n++;
        Check(ReferenceEquals(before, state) == row["same"].B(), at + " etkin değilse aynı durum");
        Same(row["state"], state, at);
        Near(row["tutus"].N(), MutantMechanics.GripMultiplier(state), at + " tutuş çarpanı");
        Near(row["guc"].N(), MutantMechanics.PowerMultiplier(state), at + " güç çarpanı");
        steps++;
      }
    }
    var limit = fixture["limit"];
    var limited = MutantMechanics.Step(MutantMechanics.Start(200, 0), limit["events"].Items.Select(Event).ToList(), limit["defs"].Items.Select(x => defs[x.S()]).ToList(), true, 1.0 / 60);
    Same(limit["state"], limited, "işlem/derinlik sınırı"); Check(limited.Cut > 0, "Sınır aşımı sayıldı");

    foreach (var row in fixture["params"].Items)
    {
      var installed = row["defs"].Items.Select(x => defs[x.S()]).ToList(); var p = MutantMechanics.Parameters(installed); var e = row["p"];
      Near(e["kapasite"].N(), p.Capacity, "kapasite"); Near(e["maliyet"].N(), p.Cost, "maliyet"); Near(e["sure"].N(), p.Duration, "süre");
      Near(e["tutus"].N(), p.Grip, "tutuş"); Near(e["guc"].N(), p.Power, "güç"); Near(e["yakma"].N(), p.Burn, "yakma");
      Same(row["after"], MutantMechanics.ApplyCapacity(MechanicState.FromNode(row["before"]), installed), "kapasite uygula");
      Check(MutantMechanics.Normalize(installed).Select(m => m.Id).SequenceEqual(row["kept"].Items.Select(x => x.S())), "takılı düzenleme");
    }
    foreach (var row in fixture["starts"].Items)
    {
      double k = double.Parse(row["k"].S(), System.Globalization.CultureInfo.InvariantCulture), s0 = double.Parse(row["b"].S(), System.Globalization.CultureInfo.InvariantCulture);
      MechanicState? started = null; try { started = MutantMechanics.Start(k, s0); } catch (ArgumentOutOfRangeException) { }
      Check((started == null) == row.Has("error"), "başlatma reddi " + row["k"].S() + "/" + row["b"].S());
      if (started != null) Same(row["state"], started, "başlatma " + row["k"].S());
    }
    int observed = 0;
    foreach (var rows in fixture["observers"].Items)
    {
      var g = new DriftObservation();
      foreach (var row in rows.Items)
      {
        var i = row["input"];
        var input = new DriftObserverInput { Vx = i["S"]["vx"].N(), Vz = i["S"]["vz"].N(), Air = i["S"]["air"].B(), DriftOn = i["DR"]["on"].N() != 0, Direction = i["DR"]["dir"].N(), Cool = i["DR"]["cool"].N(), Beta = i["D"]["beta"].N() };
        var (next, events) = MutantMechanics.ObserveDrift(g, input, 1.0 / 60, row["tick"].B()); g = next;
        var expected = row["events"].Items.ToList(); Check(expected.Count == events.Count, "gözlemci olay sayısı");
        for (int j = 0; j < events.Count; j++)
        {
          var e = Event(expected[j]); var a = events[j];
          Check(e.Kind == a.Kind && e.Seq == a.Seq && e.Spin == a.Spin && e.Airborne == a.Airborne, "gözlemci olay " + e.Kind);
          Near(e.Dt, a.Dt, "gözlemci dt"); Near(e.Speed, a.Speed, "gözlemci hız"); Near(e.Angle, a.Angle, "gözlemci açı"); Near(e.Duration, a.Duration, "gözlemci süre"); Near(e.Direction, a.Direction, "gözlemci yön");
        }
        Check(g.Open == row["g"]["acik"].B() && g.Seq == row["g"]["sira"].N(), "gözlemci durumu"); Near(row["g"]["sure"].N(), g.Duration, "gözlemci drift süresi");
        observed++;
      }
    }
    Console.WriteLine($"Mutant mekanik: {checks} koşul; {fixture["runs"].Items.Count()} koşu/{steps} adım, {fixture["params"].Items.Count()} parametre birleşimi, {observed} gözlemci adımı, {fixture["perks"].Items.Count()} katalog perki; en büyük fark {maximumError:G3}.");
  }
}
