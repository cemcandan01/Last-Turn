#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Numerics;

namespace LastTurn.Core
{
  // Beceri yürütücüsünün salt okuduğu dünya; bütün konumlar TS (x,y,z) uzayındadır.
  public sealed class MutantSkillWorld
  {
    public CatalogNode Player = CatalogNode.Obj(), Targets = CatalogNode.Arr(Array.Empty<CatalogNode>());
    public bool Racing;
    public double Ground, Steering;
    public string[]? Held;
    public Func<double, double, double[]?>? Link;
    public Func<double, CatalogNode?>? Corner;
    public Func<CatalogNode?>? Sky;
  }

  // mutant-beceri.ts ile yollar.ts/sehir-duzen.ts kaynak sorguları; oyun durumuna/fiziğe yazmaz.
  public sealed class MutantSkillWorldFactory
  {
    public CatalogNode Data { get; }
    private readonly double[][] roads, cityRoads;
    private readonly double[] avenues, streets;
    private readonly Dictionary<int, CatalogNode[]> cells = new Dictionary<int, CatalogNode[]>();
    private CatalogNode City => Data["city"];
    public MutantSkillWorldFactory(string json) : this(CatalogNode.Parse(json)) { }
    public MutantSkillWorldFactory(CatalogNode data)
    {
      Data = data;
      if (data["baseline"].S() != VehicleCatalog.Baseline) throw new FormatException("Skill dünyası TS kaynağı farklı.");
      double[][] Points(CatalogNode n) => n.Items.Select(p => p.Items.Select(x => x.N()).ToArray()).ToArray();
      roads = Points(data["roads"]); cityRoads = Points(data["cityRoads"]);
      avenues = City["avenues"].Items.Select(x => x.N()).ToArray(); streets = City["streets"].Items.Select(x => x.N()).ToArray();
      foreach (var row in City["cells"].Items) cells[(int)row[0].N()] = row[1].Items.ToArray();
    }
    private static double Clamp(double v, double a, double b) => Math.Max(a, Math.Min(b, v));
    private static CatalogNode Result(double[] point, double[] end)
    {
      var n = CatalogNode.Obj(); n.Set("p", CatalogNode.Arr(point.Select(CatalogNode.Num))); n.Set("uc", CatalogNode.Arr(end.Select(CatalogNode.Num))); return n;
    }
    public bool IsCity(double x, double z) => Math.Abs(x - City["x"].N()) < City["half"].N() && Math.Abs(z - City["z"].N()) < City["half"].N();
    public MutantSkillWorld Build(CatalogNode player, CatalogNode targets, TrackGeometry? track, bool racing, bool openWorld = false, double ground = 0, string[]? held = null, double steering = 0)
    {
      bool city = IsCity(player["x"].N(), player["z"].N());
      return new MutantSkillWorld
      {
        Player = player, Targets = targets, Racing = racing, Ground = ground, Held = held, Steering = steering,
        Link = (min, max) => track != null ? TrackLink(track, player, min, max) : openWorld ? RoadLink(city ? cityRoads : roads, player, min, max) : null,
        Corner = direction => track != null ? TrackCorner(track, player, direction) : city ? CityCorner(player, direction) : null,
        Sky = city ? () => SkyLink(player) : (Func<CatalogNode?>?)null
      };
    }
    public static double[]? TrackLink(TrackGeometry? track, CatalogNode player, double min, double max, int hint = 0)
    {
      if (track == null || track.N < 4) return null;
      double px = player["x"].N(), pz = player["z"].N(); int first = track.Nearest(px, pz, hint, true).Index;
      int direction = player["vx"].N() * track.Tx[first] + player["vz"].N() * track.Tz[first] >= 0 ? 1 : -1;
      for (int n = 1; n < track.N; n++)
      {
        int j = first + direction * n; if (track.Open && (j < 0 || j >= track.N)) return null; j = ((j % track.N) + track.N) % track.N;
        double x = track.X[j], z = track.Z[j], distance = JsMath.Hypot(x - px, z - pz);
        if (distance > max) return null; if (distance < min) continue;
        double angle = Math.Atan2(x - px, z - pz) - player["h"].N();
        if (Math.Abs(Math.Atan2(Math.Sin(angle), Math.Cos(angle))) <= .6) return new[] { x, z };
      }
      return null;
    }
    public static CatalogNode? TrackCorner(TrackGeometry? track, CatalogNode player, double requestedDirection, int hint = 0)
    {
      if (track == null || track.N < 8) return null;
      int first = track.Nearest(player["x"].N(), player["z"].N(), hint, true).Index;
      int direction = player["vx"].N() * track.Tx[first] + player["vz"].N() * track.Tz[first] >= 0 ? 1 : -1;
      double spacing = track.Length / track.N; int k = Math.Max(1, (int)Math.Floor(20 / spacing + .5)), count = (int)Math.Floor(45 / spacing + .5);
      int Index(int j) => track.Open && (j < 0 || j >= track.N) ? -1 : ((j % track.N) + track.N) % track.N;
      int best = -1, side = 0; double turn = 0;
      for (int s = 0; s <= count; s++)
      {
        int j = Index(first + direction * s), a = Index(first + direction * (s - k)), b = Index(first + direction * (s + k));
        if (j < 0 || a < 0 || b < 0) break;
        var ta = TrackDirection(track, a, direction); var tb = TrackDirection(track, b, direction);
        double cross = ta.X * tb.Z - ta.Z * tb.X, angle = Math.Acos(Clamp(ta.X * tb.X + ta.Z * tb.Z, -1, 1));
        if (angle > turn) { turn = angle; best = j; side = cross < 0 ? 1 : -1; }
      }
      if (best < 0 || turn < .45 || (requestedDirection != 0 && requestedDirection != side)) return null;
      double radius = (2 * k * spacing) / turn; if (radius > 90) return null;
      var t = TrackDirection(track, best, direction); double x = track.X[best], z = track.Z[best];
      return Result(new[] { x + t.Z * side * radius, z - t.X * side * radius }, new[] { x + t.Z * side * (track.HalfWidth + 1), z - t.X * side * (track.HalfWidth + 1) });
    }
    private static (double X, double Z) TrackDirection(TrackGeometry track, int j, int direction)
    {
      int a = track.Open ? Math.Max(0, j - 1) : (j - 1 + track.N) % track.N, b = track.Open ? Math.Min(track.N - 1, j + 1) : (j + 1) % track.N;
      double dx = (track.X[b] - track.X[a]) * direction, dz = (track.Z[b] - track.Z[a]) * direction, length = JsMath.Hypot(dx, dz); if (length == 0) length = 1;
      return (dx / length, dz / length);
    }
    public static double[]? RoadLink(IEnumerable<double[]> points, CatalogNode player, double min, double max)
    {
      double speed = JsMath.Hypot(player["vx"].N(), player["vz"].N()), heading = speed > 3 ? Math.Atan2(player["vx"].N(), player["vz"].N()) : player["h"].N();
      double[]? best = null; double bestAngle = double.PositiveInfinity, bestDistance = 0;
      foreach (var p in points)
      {
        double distance = JsMath.Hypot(p[0] - player["x"].N(), p[1] - player["z"].N()); if (distance < min || distance > max) continue;
        double angle = Math.Atan2(p[0] - player["x"].N(), p[1] - player["z"].N()) - heading, absolute = Math.Abs(Math.Atan2(Math.Sin(angle), Math.Cos(angle))); if (absolute > .6) continue;
        if (absolute < bestAngle - .02 || (Math.Abs(absolute - bestAngle) <= .02 && distance > bestDistance)) { best = new[] { p[0], p[1] }; bestAngle = absolute; bestDistance = distance; }
      }
      return best;
    }
    private static double Nearest(double[] points, double value)
    { double best = points[0]; foreach (double p in points) if (Math.Abs(p - value) < Math.Abs(best - value)) best = p; return best; }
    private bool InPark(double x, double z)
    { var p = City["park"]; return x > p["x0"].N() && x < p["x1"].N() && z > p["z0"].N() && z < p["z1"].N(); }
    private bool OnRoad(double x, double z) => Math.Abs(x) <= City["half"].N() && Math.Abs(z) <= City["half"].N() && !InPark(x, z) &&
      (Math.Abs(x - Nearest(avenues, x)) < City["avenueHalf"].N() || Math.Abs(z - Nearest(streets, z)) < City["streetHalf"].N());
    public CatalogNode? CityCorner(CatalogNode player, double requestedDirection)
    {
      double x = player["x"].N() - City["x"].N(), z = player["z"].N() - City["z"].N(), vx = player["vx"].N(), vz = player["vz"].N(), speed = JsMath.Hypot(vx, vz);
      double fx = speed > 3 ? vx / speed : Math.Sin(player["h"].N()), fz = speed > 3 ? vz / speed : Math.Cos(player["h"].N()), sx = fz, sz = -fx;
      CatalogNode? best = null; double bestForward = double.PositiveInfinity;
      foreach (double cx in avenues) foreach (double cz in streets)
      {
        double rx = cx - x, rz = cz - z, forward = rx * fx + rz * fz, lateral = rx * sx + rz * sz;
        if (forward < -6 || forward > 40 || Math.Abs(lateral) > 10 || forward >= bestForward) continue;
        double side = requestedDirection != 0 ? requestedDirection : lateral < 0 ? 1 : -1; double[]? corner = null;
        foreach (double ax in new[] { -City["avenueHalf"].N(), City["avenueHalf"].N() }) foreach (double az in new[] { -City["streetHalf"].N(), City["streetHalf"].N() })
        { if (ax * fx + az * fz < 0 && Math.Sign(ax * sx + az * sz) == side) corner = new[] { cx + ax, cz + az }; }
        if (corner == null) continue;
        double sideX = cx + sx * side * (City["avenueHalf"].N() + 12), sideZ = cz + sz * side * (City["streetHalf"].N() + 12), blockX = corner[0] + (sx * side - fx) * 3, blockZ = corner[1] + (sz * side - fz) * 3;
        if (!OnRoad(sideX, sideZ) || OnRoad(blockX, blockZ) || InPark(blockX, blockZ)) continue;
        bestForward = forward; double lateralDistance = Math.Abs((corner[0] - x) * sx + (corner[1] - z) * sz), shift = Clamp(speed * speed / City["centripetal"].N() - lateralDistance, 0, 15);
        best = Result(new[] { corner[0] + (sx * side - fx) * shift + City["x"].N(), corner[1] + (sz * side - fz) * shift + City["z"].N() }, new[] { corner[0] + City["x"].N(), corner[1] + City["z"].N() });
      }
      return best;
    }
    private int Cell(double x, double z) => (int)Math.Floor((x - avenues[0]) / City["avenueSpacing"].N()) * 100 + (int)Math.Floor((z - streets[0]) / City["streetSpacing"].N());
    private IEnumerable<CatalogNode> NearbyBuildings(double x, double z, double radius)
    {
      var seen = new HashSet<CatalogNode>();
      for (int dx = -1; dx <= 1; dx++) for (int dz = -1; dz <= 1; dz++)
        if (cells.TryGetValue(Cell(x + dx * City["avenueSpacing"].N(), z + dz * City["streetSpacing"].N()), out var list))
          foreach (var b in list) if (Math.Abs(x - b["x"].N()) < b["hx"].N() + radius && Math.Abs(z - b["z"].N()) < b["hz"].N() + radius && seen.Add(b)) yield return b;
    }
    public CatalogNode? SkyLink(CatalogNode player)
    {
      double x = player["x"].N() - City["x"].N(), y = player["y"].N(), z = player["z"].N() - City["z"].N(), fx = Math.Sin(player["h"].N()), fz = Math.Cos(player["h"].N());
      CatalogNode? best = null; double bestScore = double.PositiveInfinity;
      for (int s = 20; s <= 60; s += 5)
      {
        double qx = x + fx * s, qz = z + fz * s;
        foreach (var candidate in new[] { new[] { Nearest(avenues, qx), qz }, new[] { qx, Nearest(streets, qz) } })
        {
          double ax = candidate[0], az = candidate[1]; if (!OnRoad(ax, az)) continue;
          double dx = ax - x, dz = az - z, distance = JsMath.Hypot(dx, dz); if (distance < 18 || distance > 65) continue;
          double angle = Math.Acos(Clamp((dx * fx + dz * fz) / distance, -1, 1)); if (angle > .7) continue;
          double score = angle * 40 + Math.Abs(distance - 38); if (score >= bestScore) continue;
          double top = 0, endDistance = double.PositiveInfinity; double[]? end = null;
          foreach (var b in NearbyBuildings(ax, az, 30))
          {
            double height = b.Has("ust") ? b["ust"]["y"].N() : b["y"].N(); if (height > top) top = height;
            double px = Clamp(ax, b["x"].N() - b["hx"].N(), b["x"].N() + b["hx"].N()), pz = Clamp(az, b["z"].N() - b["hz"].N(), b["z"].N() + b["hz"].N()), distanceToBuilding = JsMath.Hypot(px - ax, pz - az);
            if (height > y + 8 && distanceToBuilding < endDistance) { endDistance = distanceToBuilding; end = new[] { px, pz }; }
          }
          if (end == null || top < y + 8) continue;
          double py = Math.Max(y + 12, Math.Min(top, 90) * .92); bestScore = score;
          best = Result(new[] { ax + City["x"].N(), py, az + City["z"].N() }, new[] { end[0] + City["x"].N(), Math.Min(py, top), end[1] + City["z"].N() });
        }
      }
      return best;
    }
    // JS toFixed(1): önce ikilik sayının gerçek değeri yuvarlanır; 2.55 gibi sayılarda x*10 yuvarlaması eşdeğer değildir.
    private static string FixedOne(double value)
    {
      bool negative = value < 0; double magnitude = Math.Abs(value); long bits = BitConverter.DoubleToInt64Bits(magnitude);
      int encoded = (int)((bits >> 52) & 0x7ff), exponent = (encoded == 0 ? -1022 : encoded - 1023) - 52;
      BigInteger numerator = (bits & 0xfffffffffffffL) + (encoded == 0 ? 0 : 0x10000000000000L); numerator *= 10;
      BigInteger denominator = BigInteger.One; if (exponent >= 0) numerator <<= exponent; else denominator <<= -exponent;
      BigInteger rounded = BigInteger.DivRem(numerator, denominator, out var remainder); if (remainder * 2 >= denominator) rounded++;
      return (negative ? "-" : "") + (rounded / 10).ToString(CultureInfo.InvariantCulture) + "." + (rounded % 10).ToString(CultureInfo.InvariantCulture);
    }
    public static CatalogNode Obstacles(IEnumerable<WorldObstacle> obstacles)
    {
      var result = new List<CatalogNode>(); foreach (var o in obstacles)
      {
        if (o.Type != "solid" && o.Type != "box") continue;
        var n = CatalogNode.Obj(); n.Set("id", CatalogNode.Str("e:" + FixedOne(o.X) + "," + FixedOne(o.Z))); n.Set("x", CatalogNode.Num(o.X)); n.Set("z", CatalogNode.Num(o.Z)); n.Set("r", CatalogNode.Num(o.Type == "box" ? JsMath.Hypot(o.HalfX, o.HalfZ) : o.Radius)); result.Add(n);
      }
      return CatalogNode.Arr(result);
    }
  }
}
