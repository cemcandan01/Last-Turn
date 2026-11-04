using System.Text.Json;
using LastTurn.Core;

// Yarış türleri: 40 pistin TS bölge dünyası (yükseklik/yüzey/ipucu/kutu), su birikintisi çarpışması (TS carpismalar),
// kariyer drift algısı (driftSkoru) ve 15 aracın drift yarışı açı sınırı (startEvent kurulumu + driftYarisProfili).
internal static class RaceTypesValidation
{
  private const double Tol = 1e-9;
  private static int checks;
  private static double maxError;
  private static string where = "";
  private static void Check(bool ok, string label) { checks++; if (!ok) throw new InvalidOperationException("Yarış türü " + where + ": " + label); }
  private static void Near(double expected, double actual, string label)
  {
    double e = Math.Abs(expected - actual); maxError = Math.Max(maxError, e);
    Check(e <= Tol * Math.Max(1, Math.Abs(expected)), label + $" TS {expected:R} C# {actual:R}");
  }

  public static void Run()
  {
    string unity = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..");
    string Res(string n) => File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", n));
    var tracks = new TrackCatalog(Res("track-catalog.json")); var vehicles = new VehicleCatalog(Res("vehicle-catalog.json"));
    using var doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference", "race-types-0.8.18.json")));
    var root = doc.RootElement;
    Check(root.GetProperty("baseline").GetString() == TrackCatalog.Baseline, "oracle kaynağı");
    var bySurface = new int[6]; int rows = 0;
    foreach (var w in root.GetProperty("world").EnumerateArray())
    {
      where = "dünya " + w.GetProperty("key").GetString();
      var track = tracks.Tracks.Single(t => t.Key == w.GetProperty("key").GetString()); var world = new TrackWorld(track);
      var box = w.GetProperty("box"); var region = world.Region;
      Check(box[0].GetDouble() == region.MinX && box[1].GetDouble() == region.MaxX && box[2].GetDouble() == region.MinZ && box[3].GetDouble() == region.MaxZ, "bölge kutusu");
      var list = w.GetProperty("rows").EnumerateArray().ToArray(); world.Hint = list[0][0].GetInt32();
      double[][] offsets = { new[] { 0.8, 1.3 }, new[] { -0.8, 1.3 }, new[] { 0.8, -1.3 }, new[] { -0.8, -1.3 }, new[] { 0.0, 0 } };
      for (int k = 1; k < list.Length; k++)
      {
        var r = list[k]; double x = r[0].GetDouble(), z = r[1].GetDouble(), h = r[2].GetDouble();
        var pts = offsets.Select(o => (x + o[0] * Math.Cos(h) + o[1] * Math.Sin(h), z - o[0] * Math.Sin(h) + o[1] * Math.Cos(h))).ToArray();
        for (int q = 0; q < 5; q++) { int s = world.Surface(pts[q].Item1, pts[q].Item2); Check(s == r[3][q].GetInt32(), $"yüzey {k}/{q} TS {r[3][q]} C# {s}"); bySurface[s]++; }
        Check(world.Hint == r[4].GetInt32(), "ipucu " + k);
        for (int q = 0; q < 5; q++) Near(r[5][q].GetDouble(), world.Height(pts[q].Item1, pts[q].Item2), "yükseklik " + k + "/" + q);
        rows++;
      }
    }
    where = "su";
    int wet = 0;
    foreach (var c in root.GetProperty("water").EnumerateArray())
    {
      var b = c.GetProperty("before"); double ox = b[2].GetDouble(), oz = b[3].GetDouble();
      int count = c.GetProperty("objs").EnumerateArray().Count(o => { double dd = JsMath.Hypot(ox - o.GetProperty("x").GetDouble(), oz - o.GetProperty("z").GetDouble()); if (dd == 0) dd = 0.01; return dd < o.GetProperty("r").GetDouble(); });
      var r = VehicleWater.Apply(b[0].GetDouble(), b[1].GetDouble(), c.GetProperty("v").GetDouble(), 1.0 / 60, count);
      var a = c.GetProperty("after");
      Near(a[0].GetDouble(), r.Vx, "vx"); Near(a[1].GetDouble(), r.Vz, "vz"); Check((a[2].GetDouble() == 1) == r.Wet, "ıslaklık");
      if (r.Wet) wet++;
    }
    where = "drift algısı";
    foreach (var d in root.GetProperty("drift").EnumerateArray())
    {
      var r = RaceDrift.Detect(d[0].GetDouble(), d[1].GetDouble(), d[2].GetDouble(), d[3].GetInt32() == 1);
      Check(r.Active == (d[4].GetInt32() == 1), "drift bayrağı " + d); Near(d[5].GetDouble(), r.Beta, "β");
    }
    where = "drift profili";
    foreach (var p in root.GetProperty("profiles").EnumerateArray())
    {
      int car = p.GetProperty("car").GetInt32();
      // TS varsayılan yardım seviyesi "real" (kurulum.lk); Unity garaj adaptörü şimdilik "norm" kurar (açık soru, kartta).
      var setup = GarageDriveParameters.Configure(vehicles, vehicles.Setup(car, Array.Empty<string>(), "real"), false, "dp");
      Check(setup.Tire == p.GetProperty("tire").GetInt32() && setup.Tuning["lock"].N() == p.GetProperty("lock").GetDouble()
        && setup.Tuning["diff"].N() == p.GetProperty("diff").GetDouble() && setup.Assists["dft"].N() == p.GetProperty("dft").GetDouble(), $"TS startEvent kurulumu araç {car}: lastik {setup.Tire}/{p.GetProperty("tire")} kilit {setup.Tuning["lock"].N()}/{p.GetProperty("lock")} dif {setup.Tuning["diff"].N()}/{p.GetProperty("diff")} dft {setup.Assists["dft"].N()}/{p.GetProperty("dft")}");
      Near(p.GetProperty("azami").GetDouble(), RaceDrift.MaxAngle(setup), "azami açı araç " + car);
    }
    Console.WriteLine($"Yarış türleri TS–C#: 40 pist × 300 dünya adımı ({rows}), yüzey dağılımı [{string.Join(",", bySurface)}] (toprak, asfalt, çim, çamur, kar, derin kar); " +
      $"su {wet} ıslak durum; drift algısı ve 15 araç profili; {checks} koşul geçti. En büyük fark {maxError:G3}; tolerans {Tol:G}.");
  }
}
