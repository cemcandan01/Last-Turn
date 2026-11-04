#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using LastTurn.Core;

namespace LastTurn.EditorValidation
{
  // Saf C#: TS pist sorgusu oracle'ını (track-queries-0.8.18.json) C# TrackGeometry/TrackLayout ile karşılaştırır.
  // Aynı dosya .NET doğrulamasında (--tracks) ve Unity Editor'de (Mono) çalışır.
  public sealed class TrackReferenceComparison
  {
    public const double Tolerance = 1e-9;
    public int Checks, Tracks, Samples;
    public double MaxError;
    public string MaxErrorAt = "";
    private string where = "";

    private void Check(bool ok, string label) { Checks++; if (!ok) throw new InvalidOperationException("Pist karşılaştırması " + where + ": " + label); }
    private void Near(double expected, double actual, string label)
    {
      double e = Math.Abs(expected - actual);
      if (e > MaxError) { MaxError = e; MaxErrorAt = where + " " + label; }
      Check(e <= Tolerance * Math.Max(1, Math.Abs(expected)), label + $" TS {expected:R} C# {actual:R}");
    }
    private void Same(int expected, int actual, string label) => Check(expected == actual, label + $" TS {expected} C# {actual}");

    public static TrackReferenceComparison Run(TrackCatalog catalog, CatalogNode fixture, Func<TrackDefinition, bool>? only = null)
    {
      var c = new TrackReferenceComparison();
      c.Check(fixture["baseline"].S() == TrackCatalog.Baseline, "oracle kaynağı");
      c.Check(fixture["sources"].ToString() == catalog.Data["sources"].ToString(), "katalog ve oracle aynı TS kaynak hash'leri");
      c.Check(Math.Abs(fixture["kw"].N() - TrackGeometry.KerbWidth) == 0, "kerb genişliği");
      var cases = fixture["tracks"].Items.ToArray();
      c.Same(cases.Length, catalog.Tracks.Length, "pist sayısı");
      foreach (var track in catalog.Tracks)
      {
        if (only != null && !only(track)) continue;
        c.where = track.Key; c.Tracks++;
        var t = cases[track.Index];
        c.Check(t["key"].S() == track.Key, "oracle sırası");
        c.Geometry(track);
        c.Derived(track, t["derived"]);
        foreach (var row in t["samples"].Items) { c.Sample(track, row); c.Samples++; }
      }
      return c;
    }

    // Yüklenen P/T/S/len, TS mkTrack'in ikinci yarısıyla yeniden hesaplanır (veri bütünlüğü + JSON sayı okuma).
    private void Geometry(TrackDefinition d)
    {
      var g = d.Geometry; int n = g.N;
      double s = 0;
      for (int i = 0; i < n; i++)
      {
        int a = g.Open ? Math.Min(i + 1, n - 1) : (i + 1) % n, b = g.Open ? Math.Max(i - 1, 0) : (i - 1 + n) % n;
        double l = Math.Sqrt((g.X[a] - g.X[b]) * (g.X[a] - g.X[b]) + (g.Z[a] - g.Z[b]) * (g.Z[a] - g.Z[b]));
        Near((g.X[a] - g.X[b]) / l, g.Tx[i], "T.x " + i); Near((g.Z[a] - g.Z[b]) / l, g.Tz[i], "T.z " + i);
        if (i > 0) s += Math.Sqrt((g.X[i] - g.X[i - 1]) * (g.X[i] - g.X[i - 1]) + (g.Z[i] - g.Z[i - 1]) * (g.Z[i] - g.Z[i - 1]));
        Near(s, g.S[i], "S " + i);
      }
      double len = g.Open ? g.S[n - 1] : g.S[n - 1] + Math.Sqrt((g.X[0] - g.X[n - 1]) * (g.X[0] - g.X[n - 1]) + (g.Z[0] - g.Z[n - 1]) * (g.Z[0] - g.Z[n - 1]));
      Near(len, g.Length, "uzunluk");
      // Bölge merkezi TS mkReg formülü: c = [((k % 4) − 1.5)·2600, 3200 + ⌊k/4⌋·2600] (recenter kontrol noktalarına uygulanır).
      Check(d.CenterX == (d.Index % 4 - 1.5) * 2600 && d.CenterZ == 3200 + d.Index / 4 * 2600, "bölge merkezi");
    }

    private void Derived(TrackDefinition d, CatalogNode e)
    {
      var g = d.Geometry; var layout = d.Layout;
      var box = g.Bounds(150);
      Near(e["bbox150"][0].N(), box.MinX, "bbox"); Near(e["bbox150"][1].N(), box.MaxX, "bbox"); Near(e["bbox150"][2].N(), box.MinZ, "bbox"); Near(e["bbox150"][3].N(), box.MaxZ, "bbox");
      Near(e["start"][0].N(), layout.StartX, "başlangıç x"); Near(e["start"][1].N(), layout.StartZ, "başlangıç z"); Near(e["start"][2].N(), layout.StartHeading, "başlangıç yönü");
      string Bits(bool[] b) => new string(b.Select(v => v ? '1' : '0').ToArray());
      Check(e["kerbs"].S() == Bits(layout.Kerbs), "kerb noktaları");
      Check(e["asphalt"].S() == Bits(layout.Asphalt), "asfalt aralığı noktaları");
      Check(e["apex"].Items.Select(x => (int)x.N()).SequenceEqual(layout.BrakeBoards), "fren tabelası virajları");
      var jumps = e["jumps"].Items.ToArray(); Same(jumps.Length, layout.Jumps.Length, "rampa sayısı");
      for (int k = 0; k < jumps.Length; k++)
      {
        var j = jumps[k]; var c = layout.Jumps[k];
        Check(j["k"].S() == c.Kind, "rampa türü"); Same((int)j["i"].N(), c.Index, "rampa indeksi");
        Near(j["x"].N(), c.X, "rampa x"); Near(j["z"].N(), c.Z, "rampa z"); Near(j["tx"].N(), c.Tx, "rampa tx"); Near(j["tz"].N(), c.Tz, "rampa tz"); Near(j["w"].N(), c.Width, "rampa genişliği");
      }
      void Patches(CatalogNode list, TrackPatch[] actual, string label)
      {
        var items = list.Items.ToArray(); Same(items.Length, actual.Length, label + " sayısı");
        for (int k = 0; k < items.Length; k++)
        {
          Same((int)items[k]["i"].N(), actual[k].Index, label + " indeksi");
          Near(items[k]["x"].N(), actual[k].X, label + " x"); Near(items[k]["z"].N(), actual[k].Z, label + " z"); Near(items[k]["r"].N(), actual[k].Radius, label + " yarıçapı");
        }
      }
      Patches(e["mud"], layout.Mud, "çamur"); Patches(e["water"], layout.Water, "su");
      double[] fractions = { 0, 0.013, 0.25, 0.5, 0.731, 0.999, 1 };
      for (int q = 0; q < fractions.Length; q++)
      {
        Same((int)e["idxAt"][q].N(), g.IndexAt(fractions[q]), "idxAt");
        Near(e["straightF"][q].N(), g.StraightFraction(fractions[q]), "straightF");
        var o = g.OnTrack(fractions[q], (q - 3) * 2.5);
        Same((int)e["onTrack"][q]["i"].N(), o.Index, "onTrack i"); Near(e["onTrack"][q]["x"].N(), o.X, "onTrack x"); Near(e["onTrack"][q]["z"].N(), o.Z, "onTrack z");
      }
      int[] turns = { 0, 1, g.N / 3, g.N - 1 };
      for (int q = 0; q < turns.Length; q++) Near(e["turnAt"][q].N(), g.TurnAt(turns[q], 6), "turnAt " + turns[q]);
      int[] ats = { 0, g.N / 2, g.N - 1 };
      for (int q = 0; q < ats.Length; q++) { var a = g.AtTrack(ats[q], -4.5); Near(e["atTrack"][q][0].N(), a.X, "atTrack x"); Near(e["atTrack"][q][1].N(), a.Z, "atTrack z"); }
    }

    private void Sample(TrackDefinition d, CatalogNode r)
    {
      var g = d.Geometry;
      if (r.Has("trackAt"))
      {
        var at = g.At(r["s"].N());
        Near(r["trackAt"]["x"].N(), at.X, "trackAt x"); Near(r["trackAt"]["z"].N(), at.Z, "trackAt z"); Near(r["trackAt"]["a"].N(), at.Heading, "trackAt yön");
        Near(r["curvAt"].N(), g.Curvature(r["s"].N()), "curvAt");
      }
      if (!r.Has("x")) return;
      double x = r["x"].N(), z = r["z"].N(); int hint = (int)r["hint"].N();
      void Pair(CatalogNode e, (int Index, double Distance) a, string label) { Same((int)e[0].N(), a.Index, label + " indeksi"); Near(e[1].N(), a.Distance, label + " uzaklığı"); }
      var full = g.Nearest(x, z, 0, true);
      Pair(r["full"], full, "tam en yakın"); Pair(r["hinted"], g.Nearest(x, z, hint), "ipuçlu en yakın"); Pair(r["grid"], g.GridNearest(x, z), "ızgara en yakın");
      if (r.Has("proj")) { var p = g.Project(x, z, full.Index); Near(r["proj"][0].N(), p.S, "izdüşüm s"); Near(r["proj"][1].N(), p.Distance, "izdüşüm d"); }
      if (r.Has("clear")) Check(r["clear"].B() == g.ClearOf(x, z, g.HalfWidth + 3), "clearOf");
      if (r.Has("kerb")) Near(r["kerb"].N(), g.KerbHeight(d.Layout.Kerbs, x, z, (int)r["kerbHint"].N()), "kerb yüksekliği");
      if (r.Has("jump")) Near(r["jump"].N(), d.Layout.JumpHeight(x, z), "rampa yüksekliği");
    }
  }
}
