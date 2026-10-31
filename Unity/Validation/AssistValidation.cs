using System.Text.Json;
using LastTurn.Core;

// Sürüş yardımları: TS tam simülasyonu (export-assists.mjs) ile C# PowertrainVehicle aynı kurulum ve girdilerle.
internal static class AssistValidation
{
  public static readonly Dictionary<string, Func<int, (double Steer, double Gas, double Brake, bool Handbrake)>> Scripts = new()
  {
    ["viraj"] = n => n < 180 ? (0, 1, 0, false) : n < 360 ? (0.6, 1, 0, false) : (0, 0, 1, false),
    ["elfreni"] = n => n < 240 ? (0, 1, 0, false) : n < 262 ? (1, 1, 0, true) : n < 460 ? (-0.5, 1, 0, false) : (0, 0.4, 0, false),
    ["gaz"] = n => n < 300 ? (0, 1, 0, false) : n < 420 ? (1, 1, 0, false) : n < 600 ? (-0.6, 1, 0, false) : (0, 0.5, 0, false),
  };

  public static PowertrainParameters Parameters(VehicleCatalog catalog, int car, string level, int tire)
  {
    var setup = catalog.Setup(car, Array.Empty<string>(), level == "zero" ? "real" : level);
    if (level == "zero") foreach (var k in new[] { "grip", "str", "stm", "tcs", "abs", "dft", "ini" }) setup.Assists.Set(k, CatalogNode.Num(0));
    if (level == "zero") { setup.Assists.Set("acc", CatalogNode.Num(1)); setup.Assists.Set("bra", CatalogNode.Num(1)); }
    setup.Tire = tire;
    return catalog.CreatePhysics(setup);
  }

  public static void Run()
  {
    string unity = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..");
    var catalog = new VehicleCatalog(File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", "vehicle-catalog.json")));
    using var doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference", "assists-0.8.18.json")));
    bool strict = Environment.GetEnvironmentVariable("ASSIST_REPORT") == null;
    double worst = 0; string worstAt = ""; int checks = 0;
    foreach (var c in doc.RootElement.GetProperty("cases").EnumerateArray())
    {
      int car = c.GetProperty("car").GetInt32(); string level = c.GetProperty("level").GetString()!, script = c.GetProperty("script").GetString()!;
      var p = Parameters(catalog, car, level, c.GetProperty("tire").GetInt32());
      var v = new PowertrainVehicle(p); var f = Scripts[script];
      double caseMax = 0; int n = 0; string firstBad = "";
      foreach (var row in c.GetProperty("rows").EnumerateArray())
      {
        int until = row[0].GetInt32();
        while (n < until) { var i = f(n); v.Step(new DrivingInput(i.Gas, i.Brake, i.Steer, false, false, i.Handbrake)); n++; }
        var rp = v.ReferencePoint; var fw = v.Body.Orientation.Rotate(new BodyVector(0, 0, 1));
        double[] mine = { rp.X, rp.Z, Math.Atan2(fw.X, fw.Z), v.Body.Velocity.X, v.Body.Velocity.Z, v.Assist.K, v.Assist.On ? 1 : 0 };
        for (int k = 0; k < 7; k++)
        {
          double e = Math.Abs(row[k + 1].GetDouble() - mine[k]); if (k == 2) e = Math.Abs(TrackGeometry.AngleDelta(row[k + 1].GetDouble() - mine[k]));
          if (e > caseMax) caseMax = e;
          if (e > 1e-6 && firstBad == "") firstBad = $"adım {until} alan {k} TS {row[k + 1].GetDouble():R} C# {mine[k]:R}";
          checks++;
        }
      }
      Console.WriteLine($"{car}/{level}/{script}: en büyük fark {caseMax:G3} {firstBad}");
      if (caseMax > worst) { worst = caseMax; worstAt = $"{car}/{level}/{script}"; }
    }
    Console.WriteLine($"Sürüş yardımları TS–C#: {doc.RootElement.GetProperty("cases").GetArrayLength()} durum, {checks} koşul; en büyük fark {worst:G3} ({worstAt}).");
    if (strict && worst > 1e-6) throw new InvalidOperationException("Yardım TS–C# farkı tolerans dışı: " + worstAt);
    Persistence(catalog);
  }

  private static void Check(bool ok, string label) { if (!ok) throw new InvalidOperationException("Yardım seviyesi: " + label); }

  // Oyuncu tercihi kalıcı garaj kaydında: varsayılan norm, real/arc seçilebilir, eski kayıt norm, bozuk değer reddedilir.
  private static void Persistence(VehicleCatalog catalog)
  {
    var g = new GarageState(catalog);
    Check(g.AssistLevel == "norm" && g.Setup(g.SelectedCar).Assists["dft"].N() == catalog.Setup(g.SelectedCar, Array.Empty<string>(), "norm").Assists["dft"].N(), "varsayılan norm");
    Check(GarageCommand.SetAssistLevel("real").Apply(g) && g.AssistLevel == "real" && !GarageCommand.SetAssistLevel("real").SpendsMoney, "real seçilir, para harcamaz");
    Check(!GarageCommand.SetAssistLevel("yok").Apply(g) && g.AssistLevel == "real", "bilinmeyen seviye reddedilir");
    var snap = g.Snapshot(); var back = GarageState.Restore(catalog, CatalogNode.Parse(snap.ToString()));
    Check(back.AssistLevel == "real" && back.Setup(back.SelectedCar).Assists["tcs"].N() == 0, "kayıt gidiş-dönüş real (TCS kapalı)");
    var old = CatalogNode.Parse(snap.ToString()); old.Remove("assistLevel");
    Check(GarageState.Restore(catalog, old).AssistLevel == "norm", "eski kayıt norm açılır");
    var bad = CatalogNode.Parse(snap.ToString()); bad.Set("assistLevel", CatalogNode.Str("xx"));
    try { GarageState.Restore(catalog, bad); Check(false, "bozuk seviye kabul edildi"); } catch (ArgumentException) { }
    Check(GarageCommand.SetAssistLevel("arc").Apply(back) && back.AssistLevel == "arc", "arc seçilir");
    Console.WriteLine("Yardım seviyesi kalıcılığı: varsayılan norm, real/arc seçimi, gidiş-dönüş, eski kayıt, bozuk değer reddi geçti.");
  }
}
