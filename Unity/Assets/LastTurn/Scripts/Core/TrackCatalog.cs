using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // TS 0.8.18 pist tanımları (src/dunya/pist-tanimlari.ts TDEF) ve bölge kurulumundaki pist geometrisi.
  // Veri export-tracks.mjs ile sabit SHA'dan üretilir; elle düzenlenmez. Görünüm bu sınıfları okur, kural üretmez.
  public sealed class TrackCatalog
  {
    public const string Baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05";
    public readonly CatalogNode Data;
    public readonly TrackDefinition[] Tracks;
    public readonly (string Name, string Description)[] Levels;

    public TrackCatalog(string json)
    {
      Data = CatalogNode.Parse(json);
      if (Data["baseline"].S() != Baseline) throw new FormatException("Pist kataloğu farklı TS kaynağından.");
      Levels = Data["levels"].Items.Select(l => (l["n"].S(), l["d"].S())).ToArray();
      Tracks = Data["tracks"].Items.Select((t, i) => new TrackDefinition(t, i)).ToArray();
    }

    public TrackDefinition Find(string type, int level) => Tracks.FirstOrDefault(t => t.Type == type && t.Level == level)
      ?? throw new ArgumentException("Pist yok: " + type + "_" + level);
  }

  public sealed class TrackDefinition
  {
    public readonly int Index, Level, Difficulty;
    public readonly string Type, Key, Name, Description;
    public readonly bool Open;
    public readonly bool IsStreet;
    public readonly string StreetKind = "";
    public readonly double CenterX, CenterZ;
    /// Ham TS tanımı (tarif/p, tema, el/ep/ek, j/m/w/as, tg/hp/ys, odulSn ...): sonraki aşamalar buradan okur.
    public readonly CatalogNode Raw;
    public readonly TrackGeometry Geometry;
    private TrackLayout layout = null!;

    internal TrackDefinition(CatalogNode node, int index)
    {
      if ((int)node["index"].N(-1) != index) throw new FormatException("Pist sırası bozuk.");
      Index = index; Raw = node["def"];
      Type = Raw["t"].S(); Level = (int)Raw["lv"].N(); Difficulty = (int)Raw["sev"].N(Level);
      Key = node["key"].S(); Name = Raw["n"].S(); Description = Raw["d"].S(); Open = node["open"].B();
      if (Key != Type + "_" + Level || Open != (Type == "rl" || Type == "dg")) throw new FormatException("Pist anahtarı/açıklığı tutarsız: " + Key);
      CenterX = node["center"][0].N(); CenterZ = node["center"][1].N();
      var g = node["geometry"];
      double[] Arr(string k) => g[k].Items.Select(n => n.N()).ToArray();
      Geometry = new TrackGeometry(Arr("P"), Arr("T"), Arr("S"), g["len"].N(), g["hw"].N(), Open);
      if (Geometry.N != (int)g["N"].N() || Geometry.HalfWidth != Raw["hw"].N()) throw new FormatException("Pist geometrisi tanımla uyuşmuyor: " + Key);
    }

    // Kaynak SOKAK_ETKINLIKLERI: kariyer kataloğu dışındaki dokuz şehir rotası.
    // Eski 40 pistin indeks/anahtar/açıklık doğrulaması ayrı constructor'da aynen kalır.
    public static TrackDefinition FromStreet(StreetRoute route,int index) => new TrackDefinition(route,index);
    private TrackDefinition(StreetRoute route,int index)
    {
      if(route==null)throw new ArgumentNullException(nameof(route));
      if(index<40||index>=49)throw new ArgumentOutOfRangeException(nameof(index));
      Index=index;Level=100+index-40;Difficulty=route.Difficulty;Type=route.Geometry.Open?"rl":"gp";
      Key="sokak_"+route.Key;Name=route.Name;StreetKind=route.Kind;IsStreet=true;Open=route.Geometry.Open;
      Description=route.Kind=="ab"?"Sokaklarda A'dan B'ye: rotayı izle, kestirme yok.":route.Kind=="tur"?"Blokların çevresinde "+(route.Laps>0?route.Laps:1)+" tur.":"Rakip önde kalkar: yakala, geç ve önde bitir.";
      Geometry=route.Geometry;CenterX=9000;CenterZ=0;
      Raw=CatalogNode.Obj();Raw.Set("t",CatalogNode.Str(Type));Raw.Set("lv",CatalogNode.Num(Level));Raw.Set("sev",CatalogNode.Num(Difficulty));Raw.Set("n",CatalogNode.Str(Name));Raw.Set("d",CatalogNode.Str(Description));Raw.Set("hw",CatalogNode.Num(Geometry.HalfWidth));
      Raw.Set("tg",CatalogNode.Num(route.Stars[0]));Raw.Set("ys",CatalogNode.Arr(route.Stars.Skip(1).Select(CatalogNode.Num)));
    }

    /// Tanımdan türeyen pist öğeleri (TS bolgeler.ts mkReg ve yarislar.ts EVENTS.g ile aynı).
    public TrackLayout Layout => layout ??= new TrackLayout(this);
  }

  public sealed class TrackPatch { public int Index; public double X, Z, Radius; }

  public sealed class TrackLayout
  {
    public readonly bool[] Kerbs = Array.Empty<bool>();
    public readonly bool[] Asphalt = Array.Empty<bool>();
    public readonly List<int> BrakeBoards = new();
    public readonly TrackJump[] Jumps = Array.Empty<TrackJump>();
    public readonly TrackPatch[] Mud = Array.Empty<TrackPatch>(), Water = Array.Empty<TrackPatch>();
    public readonly double StartX, StartZ, StartHeading;

    internal TrackLayout(TrackDefinition d)
    {
      var g = d.Geometry; var raw = d.Raw;
      (StartX, StartZ, StartHeading) = g.Teleport(d.Type == "dg" ? 1 : d.Open ? 4 : g.N, d.Open ? 0 : 6);
      if(d.IsStreet)return;
      if (d.Type == "gp" || d.Type == "dp") Kerbs = g.Kerbs();
      if (d.Type == "gp") BrakeBoards = g.AutoApex();
      if (d.Type != "rx" && d.Type != "rl") return;
      bool rally = d.Type == "rl";
      Jumps = raw["j"].Items.Select(j =>
      {
        int i = g.IndexAt(g.StraightFraction(j[1].N()));
        return new TrackJump { Kind = j[0].S(), Index = i, X = g.X[i], Z = g.Z[i], Tx = g.Tx[i], Tz = g.Tz[i], Width = g.HalfWidth };
      }).ToArray();
      TrackPatch Patch(double f, double lateral, double r) { var p = g.OnTrack(f, lateral); return new TrackPatch { Index = p.Index, X = p.X, Z = p.Z, Radius = r }; }
      Mud = raw["m"].Items.Select(f => Patch(f.N(), 0, rally ? 9 : 15)).ToArray();
      Water = raw["w"].Items.Select((f, q) => Patch(f.N(), (q % 2 == 1 ? 1 : -1) * (rally ? 1.5 : 3), rally ? 4 : 6)).ToArray();
      var ranges = raw["as"].Items.Select(r => (r[0].N(), r[1].N())).ToArray();
      Asphalt = Enumerable.Range(0, g.N).Select(i => ranges.Any(r => g.S[i] >= r.Item1 * g.Length && g.S[i] <= r.Item2 * g.Length)).ToArray();
    }

    public double JumpHeight(double x, double z) => TrackJump.Height(Jumps, x, z);
    public bool InMud(double x, double z) => Mud.Any(m => (x - m.X) * (x - m.X) + (z - m.Z) * (z - m.Z) < m.Radius * m.Radius);
  }
}
