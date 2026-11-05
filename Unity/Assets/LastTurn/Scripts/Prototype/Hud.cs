using System.Collections.Generic;
using System.Linq;
using LastTurn.Core;
using UnityEngine;
using UnityEngine.InputSystem;

namespace LastTurn.Prototype
{
  // Geçici sürüş HUD'unun ortak yerleşimi: her kare bir kez HudLayout'tan (saf, doğrulanmış çakışmasız) hesaplanır.
  public static class Hud
  {
    /// Doğrulama: batch Editor'da panel bir dokuya çizilirken HUD yerleşimi o boyutla hesaplanır.
    public static Vector2? SizeOverride;
    public static float ScreenWidth => SizeOverride?.x ?? Screen.width;
    private static Dictionary<string, HudRect> rects = new Dictionary<string, HudRect>(); private static int frame = -1;
    public static HudLayoutInput Input(GtPrototype p)
    {
      var s = PlayerPreferences.Current; var a = MutantRuntime.Abilities; bool racing = p.Race != null, manual = racing && p.Simulation.Parameters.ManualGearbox;
      return new HudLayoutInput
      {
        Width = SizeOverride?.x ?? Screen.width, Height = SizeOverride?.y ?? Screen.height, Steer = s.Steer, Gas = s.Gas, Map = s.Hud["harita"], Handbrake = s.Hud["debriyaj"] != "kapali",
        Manual = manual, DragBar = manual, Racing = racing, Mutant = a != null, Opponent = p.Opponent != null, DesktopHint = Touchscreen.current == null, Touch = Touchscreen.current != null,
        Info = !racing && !MutantRuntime.Active, Skills = a != null ? a.Skills().Select(k => k.Kind).ToArray() : new string[0]
      };
    }
    public static Dictionary<string, HudRect> Rects(GtPrototype p)
    {
      if (frame != Time.frameCount) { rects = HudLayout.Compute(Input(p)); frame = Time.frameCount; }
      return rects;
    }
    public static Rect R(HudRect r) => new Rect((float)r.X, (float)r.Y, (float)r.W, (float)r.H);
    public static bool TryGet(GtPrototype p, string key, out Rect rect) { bool ok = Rects(p).TryGetValue(key, out var r); rect = ok ? R(r) : default; return ok; }
  }
}
