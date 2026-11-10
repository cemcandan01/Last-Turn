using System.Text.Json;
using LastTurn.Core;

// MUTANT drift yarışı: TS tam simülasyonu cx.driftYarisi=true (export-drift-race.mjs) ile C# PowertrainVehicle.DriftRace.
// Profil (driftYarisProfili), konum/yön/hız, DR.k/on/bt/nc/hold/cool, yarış drift skoru (driftSkoru yaris) ve spin sayısı.
internal static class DriftRaceValidation
{
  public static void Run()
  {
    string unity = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..");
    var catalog = new VehicleCatalog(File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", "vehicle-catalog.json")));
    using var doc = JsonDocument.Parse(File.ReadAllText(Environment.GetEnvironmentVariable("DRIFT_RACE_CAREER") ?? Path.Combine(AppContext.BaseDirectory, "Reference", "drift-race-0.8.18.json")));
    var scripts = new Dictionary<string, Func<int, (double Steer, double Gas, double Brake, bool Handbrake)>>(AssistValidation.Scripts)
    {
      ["uzun"] = n => n < 260 ? (0, 1, 0, false) : n < 330 ? (0.75, 1, 0, false) : n < 520 ? (0.25, 0.8, 0, false) : n < 600 ? (-0.8, 0.3, 0, false) : (0, 0.2, 0, false),
    };
    // Tolerans (önceden): drift durumu/skor/spin ve profil 1e-9; konum/yön/hız 1e-5. Uzun el freni spinlerinde motorlar arası
    // kayan nokta farkı üstel büyür; aynı büyüme DRIFT_RACE_CAREER ile kariyer dalında da ölçülür (yarış dalına özgü değil).
    bool career = Environment.GetEnvironmentVariable("DRIFT_RACE_CAREER") != null;
    double worst = 0, worstState = 0; string worstAt = ""; int checks = 0, opened = 0, spun = 0;
    foreach (var c in doc.RootElement.GetProperty("cases").EnumerateArray())
    {
      int car = c.GetProperty("car").GetInt32(); string level = c.GetProperty("level").GetString()!, script = c.GetProperty("script").GetString()!;
      var setup = catalog.Setup(car, Array.Empty<string>(), level); setup.Tire = c.GetProperty("tire").GetInt32();
      var profile = RaceDrift.Profile(setup); var tp = c.GetProperty("profile");
      foreach (var (name, mine) in new[] { ("giris", profile.Entry), ("hazirlik", profile.Prepare), ("azami", profile.Max), ("zorlama", profile.Force), ("destek", profile.Support) })
      {
        double e = Math.Abs(tp.GetProperty(name).GetDouble() - mine); checks++;
        if (e > 1e-12) throw new InvalidOperationException($"Drift profili {car}/{level} {name}: TS {tp.GetProperty(name).GetDouble():R} C# {mine:R}");
      }
      var v = new PowertrainVehicle(catalog.CreatePhysics(setup)) { DriftRace = Environment.GetEnvironmentVariable("DRIFT_RACE_CAREER") == null ? profile : null! }; var f = scripts[script];
      double caseMax = 0; int n = 0; string firstBad = "";
      foreach (var row in c.GetProperty("rows").EnumerateArray())
      {
        int until = row[0].GetInt32();
        while (n < until) { var i = f(n); v.Step(new DrivingInput(i.Gas, i.Brake, i.Steer, false, false, i.Handbrake)); n++; }
        var rp = v.ReferencePoint; var fw = v.Body.Orientation.Rotate(new BodyVector(0, 0, 1)); var dr = v.Assist;
        var detect = RaceDrift.Detect(v.Body, dr.On, !career);
        double[] mine = { rp.X, rp.Z, Math.Atan2(fw.X, fw.Z), v.Body.Velocity.X, v.Body.Velocity.Z, dr.K, dr.On ? 1 : 0, dr.Bt, dr.Nc, dr.Hold, dr.Cool, detect.Active ? 1 : 0, v.Spins };
        if (Environment.GetEnvironmentVariable("DRIFT_CURVE") == $"{car}/{level}/{script}") Console.WriteLine($"{until} " + string.Join(" ", Enumerable.Range(0, mine.Length).Select(k => Math.Abs(row[k + 1].GetDouble() - mine[k]).ToString("G2"))));
        for (int k = 0; k < mine.Length; k++)
        {
          double e = Math.Abs(row[k + 1].GetDouble() - mine[k]); if (k == 2) e = Math.Abs(TrackGeometry.AngleDelta(row[k + 1].GetDouble() - mine[k]));
          if (k < 5) { if (e > caseMax) caseMax = e; } else if (e > worstState) worstState = e;
          if (e > (k < 5 ? 1e-5 : 1e-9) && firstBad == "") firstBad = $"adım {until} alan {k} TS {row[k + 1].GetDouble():R} C# {mine[k]:R}";
          checks++;
        }
      }
      if (c.GetProperty("rows").EnumerateArray().Any(r => r[7].GetDouble() > 0)) opened++;
      if (v.Spins > 0) spun++;
      if (caseMax > worst) { worst = caseMax; worstAt = $"{car}/{level}/{script}"; }
      if (firstBad != "") throw new InvalidOperationException($"Drift yarışı TS–C# farkı tolerans dışı: {car}/{level}/{script} {firstBad}");
    }
    Console.WriteLine($"MUTANT drift {(career ? "(kariyer dalı tanısı)" : "yarışı")} TS–C#: {doc.RootElement.GetProperty("cases").GetArrayLength()} durum, {checks} koşul, {opened} durumda drift, {spun} spin; drift durumu en büyük fark {worstState:G3}, kinematik {worst:G3} ({worstAt}).");
  }
}
