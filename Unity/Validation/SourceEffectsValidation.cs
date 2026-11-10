using LastTurn.Core;

// TS beceriEfektDurumu/nitroAcik ve isaretleriGuncelle gövdelerinin çıktısı (export-source-effects.mjs) ile
// MutantSkillEffectModel ve MutantWorldMarkerModel renk/boy/tabela eşlemesinin karşılaştırması. Çizim kabulü değildir.
internal static class SourceEffectsValidation
{
  private static string Root => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
  public static void Run()
  {
    var f = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference/source-effects-0.8.18.json")));
    int checks = 0;
    void Check(bool ok, string label) { checks++; if (!ok) throw new Exception("Kaynak efekt: " + label); }
    bool Same(double[]? a, CatalogNode b) => a == null ? !b.IsArray : b.IsArray && a.SequenceEqual(b.Items.Select(n => n.N()));
    Check(f["baseline"].S() == TrackCatalog.Baseline && f["sarkac"].S() == MutantSkillEffectModel.Pendulum, "Sabit kaynak/SARKAC");
    foreach (var c in f["cases"].Items)
    {
      string name = c["name"].S(); var e = c["expected"];
      if (c["kosu"].IsNull) { Check(e["durum"].IsNull && !e["nitro"].B(), name + " koşu yok"); continue; }
      string before = c["kosu"].ToString(); var m = MutantSkillEffectModel.Read(c["kosu"]); var d = e["durum"];
      Check(before == c["kosu"].ToString(), name + " okuma durumu değiştirmez");
      var hook = d["kanca"];
      Check(m.HookOpponent == (hook.IsString && hook.S() == "rakip"), name + " rakip kancası");
      Check(hook.IsString ? m.HookPoint == null : Same(m.HookPoint, hook), name + " kanca ucu");
      Check(Same(m.HookTarget, d["kancaHedef"]), name + " kanca hedefi");
      Check(m.Ghost == d["hayalet"].B() && m.Transform == d["donusum"].B() && m.Wind == d["ruzgar"].B(), name + " hayalet/dönüşüm/rüzgâr");
      var trail = d["iz"].Items.ToArray();
      Check(m.Trail.Length == trail.Length && m.Trail.Zip(trail, (a, b) => Same(a, b)).All(x => x), name + " alev izi");
      Check(m.Nitro == e["nitro"].B(), name + " nitro");
    }
    var catalog = CatalogNode.Parse(File.ReadAllText(Path.Combine(Root, "Unity/Assets/LastTurn/Resources/mutant-catalog.json")));
    foreach (var c in f["markers"].Items)
    {
      string name = c["name"].S(); var run = new MutantRun(53, catalog); var k = c["kosu"];
      run.State.Set("etkinlikler", CatalogNode.Arr(k["etkinlikler"].Items.Select(x => { var y = x.Clone(); y.Set("i", CatalogNode.Num(0)); return y; })));
      run.State.Set("sandiklar", CatalogNode.Arr(k["sandiklar"].Items.Select(x => x.Clone())));
      var actual = MutantWorldMarkerModel.Read(run).Where(m => !m.Used).ToArray(); var expected = c["expected"].Items.ToArray();
      Check(actual.Length == expected.Length, name + " işaret sayısı");
      for (int i = 0; i < actual.Length; i++)
      {
        var a = actual[i]; var x = expected[i]; bool positioned = a.Kind == "event" || a.Kind == "chest";
        if (positioned) Check(a.X == x["x"].N() && a.Z == x["z"].N(), name + " konum " + i);
        Check(a.Color == (int)x["color"].N(), name + " renk " + i);
        Check((a.Kind == "chest") == x["chest"].B(), name + " sandık " + i);
        if (a.Kind != "chest") Check(a.Height == x["height"].N(), name + " sütun boyu " + i);
        Check(a.Label == (x["label"].IsString ? x["label"].S() : null), name + " tabela " + i);
      }
    }
    Console.WriteLine($"Kaynak efekt/işaret: {checks} kontrol, {f["cases"].Items.Count()} efekt + {f["markers"].Items.Count()} işaret TS senaryosu, fark 0.");
  }
}
