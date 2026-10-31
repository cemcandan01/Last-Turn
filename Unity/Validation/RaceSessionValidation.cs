using System.Text.Json;
using LastTurn.Core;

// Paket B: TS 0.8.18 yarış oturumu (startEvent/geri sayım/evTick/endEvent/yarisBitti) ve bölge dünyası (Hw/surfW/ipucu)
// ↔ C# RaceSession, TrackWorld, GarageState.RaceFinished. Oracle: export-race-session.mjs (TS fonksiyonlarının kendisi).
internal static class RaceSessionValidation
{
  private const double Tol = 1e-9;
  private static int checks;
  private static double maxError;
  private static string where = "";
  private static void Check(bool ok, string label) { checks++; if (!ok) throw new InvalidOperationException("Yarış oturumu " + where + ": " + label); }
  private static void Near(double expected, double actual, string label)
  {
    double e = Math.Abs(expected - actual); maxError = Math.Max(maxError, e);
    Check(e <= Tol * Math.Max(1, Math.Abs(expected)), label + $" TS {expected:R} C# {actual:R}");
  }
  private static void NearOrNull(JsonElement e, double? actual, string label)
  {
    if (e.ValueKind == JsonValueKind.Null) Check(actual == null, label + " boş olmalı");
    else { Check(actual != null, label + " dolu olmalı"); Near(e.GetDouble(), actual!.Value, label); }
  }

  public static void Run()
  {
    string unity = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..");
    string Res(string n) => File.ReadAllText(Path.Combine(unity, "Assets", "LastTurn", "Resources", n));
    var tracks = new TrackCatalog(Res("track-catalog.json"));
    var races = new RaceEventCatalog(Res("race-events.json"));
    var vehicles = new VehicleCatalog(Res("vehicle-catalog.json"));
    using var doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference", "race-session-0.8.18.json")));
    var root = doc.RootElement;
    Check(root.GetProperty("baseline").GetString() == TrackCatalog.Baseline, "oracle kaynağı");

    // Etkinlik verisi pist kataloğuyla ve Paket A kurallarıyla tutarlı.
    where = "etkinlikler";
    Check(races.Events.Length == 40 && races.Types.Count == 5, "40 etkinlik, 5 tür");
    foreach (var e in races.Events)
    {
      var t = tracks.Tracks[e.Index];
      Check(t.Type == e.Type && t.Level == e.Level && e.Region == e.Index, "etkinlik sırası = pist sırası " + e.Key);
      Near(t.Layout.StartX, e.StartX, "başlangıç x " + e.Key); Near(t.Layout.StartZ, e.StartZ, "başlangıç z " + e.Key); Near(t.Layout.StartHeading, e.StartHeading, "başlangıç yönü " + e.Key);
      Check(e.Stars.SequenceEqual(RaceStars.Thresholds(t)), "yıldız eşikleri " + e.Key);
      Check(e.Laps == races.Types[e.Type].Laps, "tur sayısı " + e.Key);
      Check(e.Limit == (e.Type == "dp" ? t.Raw["hp"].N() : t.Raw["tg"].N()), "hedef " + e.Key);
    }
    Check(races.Find("gp", 1).Laps == 3 && races.Types["dp"].Laps == RaceStars.DriftLaps, "asfalt 3 tur, drift 2 tur");

    int worldRows = World(root.GetProperty("world"), tracks);
    var garage = new GarageState(vehicles);
    int steps = 0, scenarios = 0;
    foreach (var sc in root.GetProperty("scenarios").EnumerateArray()) { steps += Scenario(sc, tracks, races, vehicles, garage); scenarios++; }
    Console.WriteLine($"Yarış oturumu TS–C#: {scenarios} senaryo / {steps} adım, bölge dünyası {worldRows} adım (yükseklik, yüzey, ipucu), 40 etkinlik; " +
      $"{checks} koşul geçti. En büyük fark {maxError:G3}; tolerans {Tol:G}.");
  }

  private static int World(JsonElement list, TrackCatalog tracks)
  {
    int count = 0;
    foreach (var w in list.EnumerateArray())
    {
      where = "dünya " + w.GetProperty("key").GetString();
      var key = w.GetProperty("key").GetString()!.Split('_');
      var world = new TrackWorld(tracks.Tracks.Single(t => t.Type == key[0] && t.Level == int.Parse(key[1])));
      var rows = w.GetProperty("rows").EnumerateArray().ToArray();
      world.Hint = rows[0][0].GetInt32();
      double[][] offsets = { new[] { 0.8, 1.3 }, new[] { -0.8, 1.3 }, new[] { 0.8, -1.3 }, new[] { -0.8, -1.3 }, new[] { 0.0, 0 } };
      for (int k = 1; k < rows.Length; k++)
      {
        var r = rows[k]; double x = r[0].GetDouble(), z = r[1].GetDouble(), h = r[2].GetDouble();
        var pts = offsets.Select(o => (x + o[0] * Math.Cos(h) + o[1] * Math.Sin(h), z - o[0] * Math.Sin(h) + o[1] * Math.Cos(h))).ToArray();
        for (int q = 0; q < 5; q++) Check(world.Surface(pts[q].Item1, pts[q].Item2) == r[3][q].GetInt32(), "yüzey " + k + "/" + q);
        Check(world.Hint == r[4].GetInt32(), "ipucu " + k);
        for (int q = 0; q < 5; q++) Near(r[5][q].GetDouble(), world.Height(pts[q].Item1, pts[q].Item2), "yükseklik " + k + "/" + q);
        count++;
      }
    }
    return count;
  }

  private static void Snapshot(JsonElement e, RaceSession s, string at)
  {
    Near(e[0].GetDouble(), s.Time, "süre " + at); Check(e[1].GetInt32() == s.Lap && e[2].GetInt32() == s.Armed && e[3].GetInt32() == s.Previous, "tur/hazır/önceki " + at);
    NearOrNull(e[4], s.BestLap, "en iyi tur " + at); Near(e[5].GetDouble(), s.LapStart, "tur başı " + at);
    Check((e[6].GetInt32() == 1) == s.Wrong.WrongWay, "ters " + at); Near(e[7].GetDouble(), s.Wrong.Timer, "ters sayacı " + at);
    Near(e[8].GetDouble(), s.OffTrack.Time, "pist dışı " + at); NearOrNull(e[9], s.Cut.Exit, "kesme çıkışı " + at); Near(e[10].GetDouble(), s.Cut.Path, "kesme yolu " + at);
    Near(e[11].GetDouble(), s.Drift.Score, "puan " + at); Near(e[12].GetDouble(), s.Drift.Combo, "kombo " + at); Near(e[13].GetDouble(), s.Drift.Multiplier, "çarpan " + at);
    Near(e[14].GetDouble(), s.DriftRatio, "drift oranı " + at); Near(e[15].GetDouble(), s.DriftDistance, "drift mesafesi " + at);
    Check((e[16].GetInt32() == 1) == s.X6, "x6 " + at); Near(e[17].GetDouble(), s.DriftMultiplier, "drift çarpanı " + at);
  }

  private static int Scenario(JsonElement sc, TrackCatalog tracks, RaceEventCatalog races, VehicleCatalog vehicles, GarageState garage)
  {
    where = sc.GetProperty("name").GetString()!;
    var info = races.Events[sc.GetProperty("event").GetInt32()]; var track = tracks.Tracks[info.Index]; var g = track.Geometry;
    int car = sc.GetProperty("car").GetInt32();
    bool career = vehicles.CareerEligible(info.Type, info.Level, car, Array.Empty<string>());
    Check(career == sc.GetProperty("career").GetBoolean(), "kariyer uygunluğu (bütçe)");
    var before = sc.GetProperty("before");
    Near(before.GetProperty("xp").GetDouble(), garage.Xp, "önceki XP"); Near(before.GetProperty("kazanilan").GetDouble(), garage.Balance, "önceki para");
    Check(garage.TrackOpen(info.Type, info.Level), "pist açık");
    int hint = g.Nearest(info.StartX, info.StartZ, 0, true).Index;
    Check(hint == sc.GetProperty("startHint").GetInt32(), "başlangıç ipucu");
    var session = new RaceSession(info, track, career, hint, garage.RaceFinished);
    Check(session.RecordKey == sc.GetProperty("k").GetString(), "rekor anahtarı");
    int countdown = 0;
    while (session.State == RaceState.Countdown) { session.TickCountdown(1.0 / 60); countdown++; }
    Check(countdown == sc.GetProperty("countdown").GetInt32(), "geri sayım kare sayısı");
    Check(session.Notes.Select(n => n.Text).SequenceEqual(sc.GetProperty("startNotes").EnumerateArray().Select(x => x.GetString())), "BAŞLA!");
    session.Notes.Clear();
    // drift dışı yarışta TS profil sınırı tanımsızdır (kullanılmaz)
    double limit = sc.GetProperty("driftLimit").ValueKind == JsonValueKind.Number ? sc.GetProperty("driftLimit").GetDouble() : double.PositiveInfinity;
    int k = 0;
    foreach (var row in sc.GetProperty("steps").EnumerateArray())
    {
      var a = row[0]; bool drift = a.GetArrayLength() > 5;
      double x = a[0].GetDouble(), z = a[1].GetDouble();
      hint = g.Nearest(x, z, hint).Index;
      Check(hint == row[1].GetInt32(), "ipucu " + k);
      var input = new RaceStepInput
      {
        X = x, Z = z, Vx = a[2].GetDouble(), Vz = a[3].GetDouble(), Speed = a[4].GetDouble(), Hint = hint, BetaLimit = limit, SinceHit = 1e9,
        DriftActive = drift && a[5].GetInt32() == 1, Beta = drift ? a[6].GetDouble() : 0, GrassWheels = drift ? a[7].GetInt32() : 0,
        Steer = drift ? a[8].GetDouble() : 0.5, SimTime = drift ? a[9].GetDouble() : 0,
      };
      var back = session.Step(input, 1.0 / 60);
      if (row[2].ValueKind != JsonValueKind.Null) Snapshot(row[2], session, "adım " + k);
      JsonElement? notes = null, teleport = null;
      for (int q = 3; q < row.GetArrayLength(); q++) if (row[q].ValueKind == JsonValueKind.Array) notes = row[q]; else teleport = row[q];
      var expected = notes?.EnumerateArray().Select(n => n.GetString()).ToArray() ?? Array.Empty<string?>();
      Check(session.Notes.Select(n => n.Text).SequenceEqual(expected), "bildirimler " + k + ": " + string.Join(",", session.Notes.Select(n => n.Text)) + " / " + string.Join(",", expected));
      session.Notes.Clear();
      Check((teleport != null) == (back != null), "piste dönüş " + k);
      if (back != null)
      {
        var tp = teleport!.Value.GetProperty("teleport");
        Near(tp[0].GetDouble(), back.Value.X, "dönüş x"); Near(tp[1].GetDouble(), back.Value.Z, "dönüş z"); Near(tp[2].GetDouble(), back.Value.Heading, "dönüş yönü");
        hint = g.Nearest(back.Value.X, back.Value.Z, 0, true).Index;
        Check(hint == teleport.Value.GetProperty("hint").GetInt32() && session.Previous == hint, "dönüş ipucu");
      }
      k++;
    }
    var r = sc.GetProperty("result");
    Check(session.State == RaceState.Finished && sc.GetProperty("state").GetString() == "done", "yarış bitti");
    Near(r.GetProperty("t").GetDouble(), session.Time, "süre"); NearOrNull(r.GetProperty("bestLap"), session.BestLap, "en iyi tur");
    Check(r.GetProperty("lap").GetInt32() == session.Lap && r.GetProperty("yildiz").GetInt32() == session.Stars, "tur/yıldız");
    Near(r.GetProperty("score").GetDouble(), session.Drift.Score, "puan");
    Check(r.GetProperty("xp").GetDouble() == session.Xp && r.GetProperty("para").GetDouble() == session.Money, $"ödül TS {r.GetProperty("xp")}/{r.GetProperty("para")} C# {session.Xp}/{session.Money}");
    NearOrNull(r.GetProperty("trap"), session.Trap, "tuzak hızı");
    Check(sc.GetProperty("finalNotes").GetArrayLength() == 0, "bitiş sonrası bildirim yok");
    var after = sc.GetProperty("after");
    Near(after.GetProperty("xp").GetDouble(), garage.Xp, "sonraki XP"); Near(after.GetProperty("kazanilan").GetDouble(), garage.Balance, "sonraki para");
    foreach (var p in after.GetProperty("yildiz").EnumerateObject())
    {
      var parts = p.Name.Split('_'); string type = new[] { "gp", "rx", "dp", "rl", "dg" }.First(t => RaceStars.TypeKey(t) == parts[0]);
      Check(garage.StarsOf(type, int.Parse(parts[1])) == p.Value.GetInt32(), "kayıtlı yıldız " + p.Name);
    }
    return k;
  }
}
