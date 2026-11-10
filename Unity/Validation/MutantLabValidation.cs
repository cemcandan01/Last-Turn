using LastTurn.Core;

// MUTANT DEV test laboratuvarı: TS mutant-kosu.ts test işlevleri (export-mutant-lab.mjs) ile MutantRun.Test* aynı sırada.
internal static class MutantLabValidation
{
  private static string Root => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
  public static void Run()
  {
    var oracle = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference/mutant-lab-0.8.18.json")));
    var catalog = CatalogNode.Parse(File.ReadAllText(Path.Combine(Root, "Unity/Assets/LastTurn/Resources/mutant-catalog.json")));
    if (oracle["baseline"].S() != TrackCatalog.Baseline) throw new InvalidOperationException("DEV lab kaynak SHA");
    int checks = 0, operations = 0;
    void Check(bool ok, string label) { checks++; if (!ok) throw new InvalidOperationException("DEV lab: " + label); }
    void Compare(CatalogNode actual, CatalogNode expected, string label)
    {
      if (expected.IsNumber) { Check(Math.Abs(actual.N(double.NaN) - expected.N()) <= 1e-9, label + " sayı " + actual + " != " + expected); return; }
      if (expected.IsObject)
      {
        Check(actual.Fields.Select(p => p.Key).OrderBy(x => x).SequenceEqual(expected.Fields.Select(p => p.Key).OrderBy(x => x)), label + " alanlar " + string.Join(",", actual.Fields.Select(p => p.Key)) + " / " + string.Join(",", expected.Fields.Select(p => p.Key)));
        foreach (var p in expected.Fields) Compare(actual[p.Key], p.Value, label + "." + p.Key); return;
      }
      if (expected.IsArray) { var a = actual.Items.ToArray(); var e = expected.Items.ToArray(); Check(a.Length == e.Length, label + " dizi " + a.Length + " != " + e.Length); for (int i = 0; i < e.Length; i++) Compare(a[i], e[i], label + "[" + i + "]"); return; }
      Check(actual.ToString() == expected.ToString(), label + " değer " + actual + " != " + expected);
    }
    foreach (var run in oracle["runs"].Items)
    {
      var r = new MutantRun((uint)run["seed"].N(), catalog, run["test"].B()); _ = new MutantEnergyController(r); // üretimde SelectCar → Abilities aynı skill durumunu kurar
      foreach (var step in run["steps"].Items)
      {
        var a = step["args"]; string name = step["name"].S(); bool result = name switch
        {
          "choose" => r.Choose(a[0].S(), a[1].S()),
          "setup" => r.TestSetup(a[0].S(), a[1].S()),
          "skill" => r.TestSkill(a[0].S(), (int)a[1].N(), a[2].IsString ? a[2].S() : null, a[3].Items.Select(x => x.S()).ToArray()),
          "reset" => r.TestReset(),
          "region" => r.TestRegion((int)a[0].N()),
          _ => throw new InvalidOperationException("İşlem " + name),
        };
        string label = (run["test"].B() ? "test" : "normal") + " #" + ++operations + " " + name + " " + a;
        Check(result == step["result"].B(), label + " dönüş");
        foreach (var f in step["state"].Fields) Compare(r.State[f.Key], f.Value, label + " " + f.Key);
      }
    }
    foreach (var c in oracle["diagnostics"].Items)
    {
      var x = c["input"]; var tp = c["profile"]; var e = c["expected"];
      var p = new DriftRaceProfile { Entry = tp["giris"].N(), Prepare = tp["hazirlik"].N(), Max = tp["azami"].N(), Force = tp["zorlama"].N(), Support = tp["destek"].N() };
      var dr = new DriftAssistState { Cool = x["cool"].N(), On = x["on"].N() != 0, Dir = x["dir"].N(), Nc = x["nc"].N(), Hold = x["hold"].N() };
      var m = MutantDriftDiagnosis.Read(x["air"].B(), dr, x["st"].N(), x["gas"].N(), x["beta"].N(), JsMath.Hypot(x["vx"].N(), x["vz"].N()), p);
      string label = "tanı " + c["car"].N() + " " + x;
      Check(m.State == e["durum"].S() && m.Message == e["mesaj"].S() && m.Hint == e["ipucu"].S(), label + " metin " + m.State + "/" + m.Hint);
      Check(m.Angle == e["aci"].N() && m.Entry == e["giris"].N() && m.Max == e["azami"].N() && m.Spin == e["spin"].N() && m.Speed == e["hiz"].N() && m.Progress == e["ilerleme"].N(), label + " sayılar");
    }
    Console.WriteLine($"MUTANT DEV laboratuvarı TS–C#: {oracle["runs"].Items.Count()} koşu, {operations} işlem, {oracle["diagnostics"].Items.Count()} drift tanısı, {checks} koşul, fark 0.");
  }
}
