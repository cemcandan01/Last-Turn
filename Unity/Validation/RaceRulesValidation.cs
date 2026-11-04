using System.Text.Json;
using LastTurn.Core;

// Paket A: TS 0.8.18 saf yarış kuralları (yaris-kurallari, piste-donus, yildiz) ↔ C# RaceRules.
// 1) export-race-rules.mjs izleri adım adım tekrar oynatılır; 2) TS birim testlerinin iddiaları C#'ta aynen sınanır.
internal static class RaceRulesValidation
{
  private const double Tol = 1e-9;
  private const double DT = 1.0 / 60;
  private static int checks;
  private static double maxError;
  private static string where = "";
  private static void Check(bool ok, string label) { checks++; if (!ok) throw new InvalidOperationException("Yarış kuralı " + where + ": " + label); }
  private static void Near(double expected, double actual, string label)
  {
    double e = Math.Abs(expected - actual); maxError = Math.Max(maxError, e);
    Check(e <= Tol * Math.Max(1, Math.Abs(expected)), label + $" TS {expected:R} C# {actual:R}");
  }
  private static double D(JsonElement e) => e.GetDouble();

  public static void Run()
  {
    string unity = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..");
    var catalog = new TrackCatalog(File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", "track-catalog.json")));
    using var doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference", "race-rules-0.8.18.json")));
    var root = doc.RootElement;
    Check(root.GetProperty("baseline").GetString() == TrackCatalog.Baseline, "oracle kaynağı");
    Constants(root.GetProperty("constants"));
    int driftSteps = Drift(root.GetProperty("drift")), wrongSteps = Wrong(root.GetProperty("wrong"));
    var tracks = Tracks(root.GetProperty("tracks"), catalog);
    int offSteps = OffTrack(root.GetProperty("off"), tracks), cutSteps = Cut(root.GetProperty("cut"), tracks);
    Stars(root, catalog);
    int traceChecks = checks;
    UnitTests(tracks, catalog);
    Console.WriteLine($"Yarış kuralları TS–C#: drift {driftSteps}, ters {wrongSteps}, pist dışı {offSteps}, kesme {cutSteps} adım ve 40 pist yıldızı; " +
      $"{traceChecks} iz koşulu + {checks - traceChecks} TS birim testi iddiası geçti. En büyük fark {maxError:G3}; tolerans {Tol:G}.");
  }

  private static void Constants(JsonElement c)
  {
    where = "sabitler";
    var b = c.GetProperty("bonus");
    Check(D(b.GetProperty("uzun").GetProperty("puan")) == 100 && D(b.GetProperty("uzun").GetProperty("bas")) == 3 && b.GetProperty("uzun").GetProperty("artan").GetBoolean(), "uzun drift bonusu");
    Check(D(b.GetProperty("direksiyonsuz").GetProperty("puan")) == 100 && D(b.GetProperty("direksiyonsuz").GetProperty("bas")) == 2 && !b.GetProperty("direksiyonsuz").GetProperty("artan").GetBoolean(), "direksiyonsuz bonusu");
    Check(D(b.GetProperty("tekYon").GetProperty("puan")) == 150 && D(b.GetProperty("tekYon").GetProperty("bas")) == 3, "tek yön bonusu");
    Check(D(c.GetProperty("direksiyonOlu")) == DriftCounter.NoSteerDeadZone && D(c.GetProperty("yanAci")) == DriftCounter.SideAngle, "ölü bölge/yan açı");
    Check(D(c.GetProperty("azamiAci")) == DriftCounter.MaxAngle && D(c.GetProperty("asgariAci")) == DriftCounter.MinAngle, "açı sınırları");
    Check(D(c.GetProperty("hizAlt")) == DriftCounter.SpeedLow && D(c.GetProperty("hizTam")) == DriftCounter.SpeedFull, "hız sınırları");
    Check(D(c.GetProperty("gecisSure")) == DriftCounter.TransitionTime && D(c.GetProperty("gecisKayma")) == DriftCounter.TransitionSlip, "geçiş");
    Check(D(c.GetProperty("x6Oran")) == DriftCounter.X6Ratio && D(c.GetProperty("x6Carpan")) == DriftCounter.X6Multiplier, "x6");
    Check(D(c.GetProperty("pistDisiBekleme")) == TrackRules.OffTrackWait && D(c.GetProperty("pistDisiSayim")) == TrackRules.OffTrackCountdown, "pist dışı süreleri");
    Check(D(c.GetProperty("kesme").GetProperty("enAz")) == TrackRules.CutMinimum && D(c.GetProperty("kesme").GetProperty("tolerans")) == TrackRules.CutTolerance, "kesme eşikleri");
    Check(D(c.GetProperty("kw")) == TrackGeometry.KerbWidth && D(c.GetProperty("driftTur")) == RaceStars.DriftLaps, "kerb/drift turu");
    foreach (var p in c.GetProperty("turAnahtari").EnumerateObject()) Check(RaceStars.TypeKey(p.Name) == p.Value.GetString(), "tür anahtarı " + p.Name);
    Check(c.GetProperty("driftRekorOnEki").GetString() == RaceStars.DriftRecordPrefix, "drift rekor ön eki");
  }

  private static string EventName(DriftStepEvent e) => e switch { DriftStepEvent.Burned => "yandi", DriftStepEvent.Multiplier => "carpan", DriftStepEvent.Banked => "bank", _ => "" };
  private static double[] State(DriftCounter E) => new[] { E.Score, E.Combo, E.ComboTime, E.Multiplier, E.Gap, E.Best, E.Bonus, E.LongTime, E.NoSteerTime, E.SideTime, E.Side };

  private static int Drift(JsonElement list)
  {
    int steps = 0;
    foreach (var run in list.EnumerateArray())
    {
      where = "drift " + run.GetProperty("name").GetString();
      var E = new DriftCounter(); int k = 0;
      foreach (var s in run.GetProperty("steps").EnumerateArray())
      {
        JsonElement expected;
        if (s[0].ValueKind == JsonValueKind.String)
        {
          Check(s[1].GetDouble() == E.Bank(), "bankalanan puan " + k); expected = s[2];
        }
        else
        {
          var a = s[0];
          var r = E.Step(a[0].GetBoolean(), D(a[1]), a[2].GetBoolean(), D(a[3]), a[4].GetBoolean(), D(a[5]),
            a.GetArrayLength() > 6 ? D(a[6]) : 0.5, a.GetArrayLength() > 7 ? D(a[7]) : 0, a.GetArrayLength() > 8 && a[8].GetBoolean());
          Check((s[1].ValueKind == JsonValueKind.Null ? "" : s[1].GetString()) == EventName(r.Event), "olay " + k);
          Check(s[2].GetDouble() == r.Points, "adım puanı " + k);
          expected = s[3];
        }
        var st = State(E);
        for (int q = 0; q < st.Length; q++) Near(expected[q].GetDouble(), st[q], "durum[" + q + "] adım " + k);
        k++; steps++;
      }
      var ev = run.GetProperty("events");
      Check(ev.GetArrayLength() == E.Events.Count, "bonus olay sayısı");
      for (int q = 0; q < E.Events.Count; q++)
      {
        Check(ev[q][0].GetString() == E.Events[q].Name && ev[q][1].GetDouble() == E.Events[q].Points, "bonus olayı " + q);
        Near(ev[q][2].GetDouble(), E.Events[q].Time, "bonus zamanı " + q);
      }
    }
    return steps;
  }

  private static int Wrong(JsonElement list)
  {
    int steps = 0;
    foreach (var run in list.EnumerateArray())
    {
      where = "ters " + run.GetProperty("name").GetString();
      var E = new WrongWayCounter(); int k = 0;
      foreach (var s in run.GetProperty("steps").EnumerateArray())
      {
        var a = s[0];
        bool back = E.Step(D(a[0]), D(a[1]), D(a[2]), D(a[3]), D(a[4]));
        Check(back == s[1].GetBoolean() && E.WrongWay == s[2].GetBoolean(), "ters bayrağı " + k);
        Near(s[3].GetDouble(), E.Timer, "ters sayacı " + k);
        k++; steps++;
      }
    }
    return steps;
  }

  private static Dictionary<string, (TrackGeometry G, bool Kerbs)> Tracks(JsonElement synthetic, TrackCatalog catalog)
  {
    var map = new Dictionary<string, (TrackGeometry, bool)>();
    foreach (var p in synthetic.EnumerateObject())
    {
      var g = p.Value; double[] A(string k) => g.GetProperty(k).EnumerateArray().Select(x => x.GetDouble()).ToArray();
      map[p.Name] = (new TrackGeometry(A("P"), A("T"), A("S"), D(g.GetProperty("len")), D(g.GetProperty("hw")), g.GetProperty("open").GetBoolean()), g.GetProperty("kerbs").GetBoolean());
    }
    foreach (var t in catalog.Tracks) map[t.Key] = (t.Geometry, t.Layout.Kerbs.Length > 0);
    return map;
  }

  private static int OffTrack(JsonElement list, Dictionary<string, (TrackGeometry G, bool Kerbs)> tracks)
  {
    int steps = 0;
    foreach (var run in list.EnumerateArray())
    {
      where = "pist dışı " + run.GetProperty("name").GetString();
      var (g, kerbs) = tracks[run.GetProperty("track").GetString()!]; double edge = TrackRules.Edge(g, kerbs);
      var s = new OffTrackCounter(); int k = 0;
      foreach (var row in run.GetProperty("steps").EnumerateArray())
      {
        var a = row[0]; double x = D(a[0]), z = D(a[1]); int hint = (int)D(a[2]);
        var loc = TrackRules.Locate(g, x, z, hint); var e = row[1];
        Near(D(e[0]), loc.Distance, "uzaklık " + k); Near(D(e[1]), loc.Point.X, "nokta x " + k); Near(D(e[2]), loc.Point.Z, "nokta z " + k);
        Near(D(e[3]), loc.Point.Heading, "nokta yön " + k); Near(D(e[4]), loc.Progress, "ilerleme " + k);
        var r = s.Step(g, edge, x, z, hint, D(a[3]));
        Check((row[2].ValueKind == JsonValueKind.Null) == (r == null), "dönüş kararı " + k);
        if (r != null) { Near(D(row[2][0]), r.Value.X, "dönüş x"); Near(D(row[2][1]), r.Value.Z, "dönüş z"); Near(D(row[2][2]), r.Value.Heading, "dönüş yön"); }
        Near(D(row[3]), s.Time, "pist dışı süresi " + k);
        Check((row[4].ValueKind == JsonValueKind.Null) == (s.First == null), "ilk çıkış " + k);
        if (s.First != null) { Near(D(row[4][0]), s.First.Value.X, "ilk x"); Near(D(row[4][1]), s.First.Value.Z, "ilk z"); }
        k++; steps++;
      }
    }
    return steps;
  }

  private static int Cut(JsonElement list, Dictionary<string, (TrackGeometry G, bool Kerbs)> tracks)
  {
    int steps = 0;
    foreach (var run in list.EnumerateArray())
    {
      where = "kesme " + run.GetProperty("name").GetString();
      var (g, kerbs) = tracks[run.GetProperty("track").GetString()!]; double edge = TrackRules.Edge(g, kerbs);
      var c = new CutCounter(); int k = 0;
      foreach (var row in run.GetProperty("steps").EnumerateArray())
      {
        var a = row[0];
        Near(D(row[1]), c.Step(g, edge, D(a[0]), D(a[1]), (int)D(a[2])), "kesme mesafesi " + k);
        Check((row[2].ValueKind == JsonValueKind.Null) == (c.Exit == null), "çıkış kilidi " + k);
        if (c.Exit != null) Near(D(row[2]), c.Exit.Value, "çıkış ilerlemesi " + k);
        Near(D(row[3]), c.Path, "dış yol " + k); Near(D(row[4]), c.Px, "px " + k); Near(D(row[5]), c.Pz, "pz " + k);
        k++; steps++;
      }
    }
    return steps;
  }

  private static void Stars(JsonElement root, TrackCatalog catalog)
  {
    foreach (var s in root.GetProperty("stars").EnumerateArray())
    {
      where = "yıldız " + s.GetProperty("key").GetString();
      var d = catalog.Tracks.Single(t => t.Key == s.GetProperty("key").GetString());
      var e = RaceStars.Thresholds(d);
      Check(s.GetProperty("anahtar").GetString() == RaceStars.Key(d.Type, d.Level), "yıldız anahtarı");
      Check(s.GetProperty("esik").EnumerateArray().Select(x => x.GetDouble()).SequenceEqual(e), "eşikler");
      foreach (var v in s.GetProperty("say").EnumerateArray()) Check(RaceStars.Count(d.Type, v[0].GetDouble(), e) == v[1].GetInt32(), "yıldız sayımı " + v[0].GetDouble());
    }
    where = "yıldız birim";
    foreach (var u in root.GetProperty("starUnit").EnumerateArray())
      Check(RaceStars.Count(u[0].GetString()!, u[1].GetDouble(), u[2].EnumerateArray().Select(x => x.GetDouble())) == u[3].GetInt32(), "yildizSay örneği");
  }

  // TS tests/birim/yildiz.test.ts, piste-donus.test.ts, kesme.test.ts iddiaları (fiziğe bağlı olanlar hariç; aşağıda not).
  private static void UnitTests(Dictionary<string, (TrackGeometry G, bool Kerbs)> tracks, TrackCatalog catalog)
  {
    where = "yildiz.test";
    Check(RaceStars.Count("gp", 100, new double[] { 120, 110, 102 }) == 3 && RaceStars.Count("gp", 105, new double[] { 120, 110, 102 }) == 2
      && RaceStars.Count("gp", 119, new double[] { 120, 110, 102 }) == 1 && RaceStars.Count("gp", 130, new double[] { 120, 110, 102 }) == 0, "süre yıldızları");
    Check(RaceStars.Count("dp", 9000, new double[] { 3000, 6000, 8000 }) == 3 && RaceStars.Count("dp", 4000, new double[] { 3000, 6000, 8000 }) == 1
      && RaceStars.Count("dp", 0, new double[] { 0, 6000, 8000 }) == 0, "puan yıldızları");
    Check(RaceStars.Thresholds(catalog.Find("gp", 1)).Length == 3, "gp_1 3 eşik");

    DriftCounter Run(int n, Func<int, (bool, double, bool, double, bool, double, double, double, bool)> f)
    {
      var E = new DriftCounter();
      for (int k = 0; k < n; k++) { var a = f(k); E.Step(a.Item1, a.Item2, a.Item3, a.Item4, a.Item5, a.Item6, a.Item7, a.Item8, a.Item9); }
      return E;
    }
    var a10 = Run(30, _ => (true, 0.01, false, 20, false, DT, 0.5, 0, false));
    var b10 = Run(30, _ => (true, 10 * Math.PI / 180, false, 20, false, DT, 0.5, 0, false));
    Check(Math.Abs(a10.Combo - b10.Combo) < 5e-6 && a10.Combo > 0, "asgari 10° açı");

    var g = new DriftCounter();
    for (int k = 0; k < 30; k++) g.Step(true, 0.4, false, 20, false, DT);
    double c0 = g.Combo; for (int k = 0; k < 30; k++) g.Step(false, 0.2, false, 20, false, DT);
    double c05 = g.Combo; for (int k = 0; k < 10; k++) g.Step(false, 0.2, false, 20, false, DT);
    double c1 = g.Combo; g.Step(false, 0.2, false, 20, false, DT);
    Check(c05 > c0 && g.Combo == c1, "geçişte kombo akar, 0,6 sn sonra durur");

    Check(!(0.89 >= DriftCounter.X6Ratio) && 0.91 >= DriftCounter.X6Ratio, "x6 oranı");
    var x6 = new DriftCounter(); x6.Step(true, 0.5, false, 20, false, DT, 0.5, 0, true);
    var no6 = new DriftCounter(); no6.Step(true, 0.5, false, 20, false, DT);
    Check(x6.Multiplier == 6 && no6.Multiplier == 1, "x6 çarpanı");

    var tw = Run(120, _ => (true, 0.5, false, 15, true, DT, 0.5, 0, false)); Check(tw.Combo == 0, "ters kombo yok");
    for (int k = 0; k < 120; k++) tw.Step(true, 0.5, false, 15, false, DT); Check(tw.Combo > 0, "doğru yönde kombo");

    double Sn(double beta, double v) => Run(60, _ => (true, beta, false, v, false, DT, 0.5, 0, false)).Combo;
    Check(Sn(0.65, 30) > Sn(0.65, 20) && Sn(0.65, 20) > Sn(0.3, 20) && Sn(0.65, 30) > 2 * Sn(0.2, 12) && Sn(0.65, 3) < Sn(0.65, 30) / 20, "puan hızı sıralaması");
    Check(Sn(0.9, 25) > Sn(0.5, 25) && Math.Abs(Sn(Math.PI / 3, 25) - Sn(1.3, 25)) < 5e-6 && Sn(1.4, 25) == Sn(1.1, 25), "60° kesilir");
    Check(Math.Abs(Sn(0.6, 25) - 3 * 25 * 0.6) < 5e-6, "puan m/s ile");

    DriftCounter Kos(double sn, Func<double, double> beta, Func<double, double> tg)
      => Run((int)Math.Ceiling(sn * 60), k => (true, beta(k * DT), false, 25, false, DT, tg(k * DT), k * DT, false));
    var bonus = Kos(5.5, _ => 0.5, _ => 0.8);
    Check(bonus.Events.Select(e => e.Name + e.Points).SequenceEqual(new[] { "UZUN DRIFT100", "TEK YÖN150", "UZUN DRIFT200", "TEK YÖN150", "UZUN DRIFT300", "TEK YÖN150" }) && bonus.Bonus == 1050, "uzun/tek yön bonusları");
    Check(Kos(2.9, _ => 0.5, _ => 0.8).Bonus == 0, "3 sn altı bonus yok");
    Check(Kos(3.5, _ => 0.5, _ => 0).Bonus == 450, "direksiyonsuz bonusu");
    Check(Kos(5, t => t < 1.5 ? 0.5 : -0.5, _ => 0.8).Events.Count(e => e.Kind == DriftBonusKind.OneSide) == 1, "taraf değişince tek yön sıfırlanır");
    var bank = Kos(3.2, _ => 0.5, _ => 0.8); double kombo = JsMath.Round(bank.Combo * bank.Multiplier);
    Check(bank.Bank() == kombo + 250, "bonus bankalanır");
    var burn = Kos(3.2, _ => 0.5, _ => 0.8); burn.Step(true, 0.5, true, 25, false, DT, 0.8, 3); Check(burn.Bonus == 0, "kombo yanınca bonus yanar");
    var tb = Run(180, k => (true, 0.5, false, 25, true, DT, 0, k * DT, false)); Check(tb.Events.Count == 0, "ters sürüşte bonus yok");

    where = "JS yuvarlama";
    Check(JsMath.Round(2.5) == 3 && JsMath.Round(-2.5) == -2 && JsMath.Round(0.5) == 1 && JsMath.Round(-0.5) == 0 && JsMath.Round(1.4999999999999998) == 1 && JsMath.Round(3.5) == 4, "Math.round eşitlikte +∞");
    var tie = new DriftCounter { Combo = 2.5, Multiplier = 1 }; Check(tie.Bank() == 3, "bankalama eşitlik yuvarlaması");

    where = "piste-donus.test";
    var (tr, _) = tracks["straight"]; double edge = TrackRules.Edge(tr, false);
    var s = new OffTrackCounter();
    bool allNull = true; for (int i = 0; i < 360; i++) allNull &= s.Step(tr, edge, 8, 21 + i / 10.0, 5, DT) == null;
    var p = s.Step(tr, edge, 20, 90, 20, DT);
    Check(allNull && p != null && p.Value.X == 0 && Math.Abs(p.Value.Z - 21) < 5e-3 && Math.Abs(p.Value.Heading) < 5e-3, "1+5 sn sınırı ve ilk çıkış");
    s = new OffTrackCounter(); s.Step(tr, edge, 8, 20, 5, 4.9);
    Check(s.Step(tr, edge, 5, 40, 10, 0.1) == null && s.Time == 0 && s.First == null, "erken dönüş temizler");
    Check(s.Step(tr, edge, -8, 60, 15, 4) == null && s.Step(tr, edge, -8, 65, 15, 1.9) == null && Math.Abs(s.Step(tr, edge, -8, 70, 15, 0.2)!.Value.Z - 60) < 5e-3, "yeni çıkış hizası");
    var (kerb, hasKerb) = tracks["straightKerb"]; double ke = TrackRules.Edge(kerb, hasKerb);
    Check(Math.Abs(ke - (5 + TrackGeometry.KerbWidth)) < 5e-3 && TrackRules.Edge(tr, false) == 5, "kerb pisttir");
    Check(new OffTrackCounter().Step(kerb, ke, 5 + TrackGeometry.KerbWidth - 0.05, 40, 10, 7) == null && new OffTrackCounter().Step(kerb, ke, 5 + TrackGeometry.KerbWidth + 0.05, 40, 10, 7) != null, "kerb sınırı");
    var l = TrackRules.Locate(tr, 5, 21.37, 5);
    Check(Math.Abs(l.Distance - 5) < 5e-3 && Math.Abs(l.Point.Z - 21.37) < 5e-3, "örnek arası izdüşüm");
    Check(new OffTrackCounter().Step(tr, edge, 5, 21.37, 5, 7) == null && new OffTrackCounter().Step(tr, edge, 5.01, 21.37, 5, 7) != null, "örnek arası kenar");
    Check(double.IsFinite(TrackRules.Locate(tracks["box"].G, -1, -1, 0).Point.Heading), "kapalı birleşim yönü");
    foreach (double z in new double[] { -10, 130 }) { var q = TrackRules.Locate(tr, 0, z, 0); Check(Math.Abs(q.Point.Z - (z < 0 ? 0 : 120)) < 5e-3 && Math.Abs(q.Point.Heading) < 5e-3, "açık uç " + z); }

    where = "kesme";
    var (sq, _) = tracks["square"];
    double Git(CutCounter k, double[][] yol)
    {
      double top = 0;
      for (int i = 0; i + 1 < yol.Length; i++)
      {
        double ax = yol[i][0], az = yol[i][1], bx = yol[i + 1][0], bz = yol[i + 1][1]; int n = (int)Math.Ceiling(JsMath.Hypot(bx - ax, bz - az));
        for (int j = 0; j <= n; j++) top += k.Step(sq, 5, ax + (bx - ax) * j / n, az + (bz - az) * j / n, 0);
      }
      return top;
    }
    var kc = new CutCounter(); double cut = Git(kc, new[] { new double[] { 0, 30 }, new double[] { 0, 50 }, new double[] { 50, 100 }, new double[] { 70, 100 } });
    Check(cut > 70 && cut < 110 && kc.Exit == null && kc.Path == 0, "çaprazdan kısa yol kesmedir");
    Check(Git(new CutCounter(), new[] { new double[] { 0, 80 }, new double[] { -12, 95 }, new double[] { -12, 112 }, new double[] { 5, 112 }, new double[] { 20, 100 } }) == 0, "dışarıdan dolaşmak");
    Check(Git(new CutCounter(), new[] { new double[] { 0, 30 }, new double[] { 7, 40 }, new double[] { 7, 60 }, new double[] { 0, 70 } }) == 0, "paralel gitmek");
    Check(Git(new CutCounter(), new[] { new double[] { 0, 60 }, new double[] { -15, 50 }, new double[] { 0, 30 } }) == 0, "geri dönmek");
    // kesme.test.ts: gerçek gp pistinde iç sahadan kısa yol, ceza atlanan mesafeye göre
    int found = 0;
    foreach (var d in catalog.Tracks.Where(t => t.Type == "gp"))
    {
      var G = d.Geometry; double e2 = TrackRules.Edge(G, true);
      for (int a = 0; a < G.N && found == 0; a += 5)
        for (int b = a + 1; b < G.N; b++)
        {
          double ds = G.S[b] - G.S[a]; if (ds < 150) continue; if (ds > 260) break;
          double L = JsMath.Hypot(G.X[b] - G.X[a], G.Z[b] - G.Z[a]); if (L > 60) continue;
          var k = new CutCounter(); double total = 0;
          for (double t = 0; t <= L; t += 0.5) total += k.Step(G, e2, G.X[a] + (G.X[b] - G.X[a]) * t / L, G.Z[a] + (G.Z[b] - G.Z[a]) * t / L, a);
          Check(total > ds - 40 && total < ds + 10, d.Name + " iç saha kesmesi"); found++; break;
        }
    }
    Check(found > 0, "gerçek pistte kesme bulundu");
  }
}
