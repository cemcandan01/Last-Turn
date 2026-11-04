#nullable enable
using System;
using System.Collections.Generic;

namespace LastTurn.Core
{
  public sealed class MutantMarkerState
  {
    public string Inside = "", Closed = "";
    public double Wait;
  }

  public readonly struct MutantMarkerPoint
  {
    public readonly int Id;
    public readonly double X, Z;
    public readonly bool Used;
    public MutantMarkerPoint(int id, double x, double z, bool used = false) { Id = id; X = x; Z = z; Used = used; }
  }

  public sealed class MutantMarkerInput
  {
    public bool HasRun = true, Racing;
    public string Phase = "surus";
    public double X, Z, Speed;
    public IReadOnlyList<MutantMarkerPoint> Events = Array.Empty<MutantMarkerPoint>();
    public IReadOnlyList<MutantMarkerPoint> Chests = Array.Empty<MutantMarkerPoint>();
    public double WorkshopX, WorkshopZ, BossX, BossZ;
  }

  public sealed class MutantMarkerResult
  {
    public readonly string Kind;
    public readonly int? Id;
    public MutantMarkerResult(string kind, int? id = null) { Kind = kind; Id = id; }
  }

  // TS mutantAdimi işaret bloğu. Çakışmada en yakın seçilmez: son etkinlik, son sandık, atölye, boss sırasıdır.
  public static class MutantMarkerGate
  {
    public const double Radius = 10, MaximumSpeed = 5, Dwell = .5;

    public static MutantMarkerResult? Step(MutantMarkerState state, MutantMarkerInput input, double dt)
    {
      if (!input.HasRun || input.Racing || input.Phase != "surus") return null;
      bool Near(double x, double z) => JsMath.Hypot(input.X - x, input.Z - z) < Radius;
      string found = "";
      MutantMarkerResult? marker = null;
      foreach (var e in input.Events)
        if (!e.Used && Near(e.X, e.Z)) { found = "e" + e.Id; marker = new MutantMarkerResult("etkinlik", e.Id); }
      foreach (var chest in input.Chests)
        if (!chest.Used && Near(chest.X, chest.Z)) { found = "s" + chest.Id; marker = new MutantMarkerResult("sandik", chest.Id); }
      if (Near(input.WorkshopX, input.WorkshopZ)) { found = "a"; marker = new MutantMarkerResult("atolye"); }
      if (Near(input.BossX, input.BossZ)) { found = "b"; marker = new MutantMarkerResult("boss"); }
      if (found != state.Inside)
      {
        state.Inside = found;
        state.Wait = 0;
        if (found != state.Closed) state.Closed = "";
      }
      if (marker == null || found == state.Closed || input.Speed > MaximumSpeed) return null;
      state.Wait += dt;
      if (state.Wait >= Dwell) { state.Closed = found; return marker; }
      return null;
    }
  }
}
