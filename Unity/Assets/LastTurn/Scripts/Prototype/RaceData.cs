using System;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Prototype
{
  // TS'den üretilmiş pist ve etkinlik verisi (Resources); bir kez yüklenir.
  public sealed class RaceData
  {
    public readonly TrackCatalog Tracks;
    public readonly RaceEventCatalog Events;
    private static RaceData cached;
    private RaceData(TrackCatalog tracks, RaceEventCatalog events) { Tracks = tracks; Events = events; }
    public static RaceData Load()
    {
      if (cached != null) return cached;
      string Text(string name) { var a = Resources.Load<TextAsset>(name); if (!a) throw new InvalidOperationException(name + " bulunamadı."); return a.text; }
      return cached = new RaceData(new TrackCatalog(Text("track-catalog")), new RaceEventCatalog(Text("race-events")));
    }
    /// "gp_1" → etkinlik.
    public RaceEventInfo Event(string key)
    {
      var parts = key.Split('_');
      return Events.Find(parts[0], int.Parse(parts[1]));
    }
  }
}
