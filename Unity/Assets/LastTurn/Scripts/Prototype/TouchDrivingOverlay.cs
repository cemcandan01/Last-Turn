using System;
using System.Collections.Generic;
using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.InputSystem;

namespace LastTurn.Prototype
{
  // Geçici dokunmatik sürüş katmanı (TS kontroller.ts + surus-tuslari.ts + mutant-ui.ts düğmeleri). Nihai görsel tasarım değildir.
  // Her parmak başladığı kontrole bağlanır (TS pointer capture); üst düğmeler parmak üstündeyken kalkarsa çalışır (TS dokunma.ts).
  public sealed class TouchDrivingOverlay : MonoBehaviour
  {
    private enum Kind { None, Left, Right, Gas, Brake, Handbrake, Wheel, Pedal, Calibrate, Camera, Respawn, Pause, Settings, Nitro, Skill, Passive, ShiftUp, ShiftDown }
    private sealed class Pointer { public Kind Kind; public int Slot; public Vector2 Start, Last; public double Angle; }
    private readonly Dictionary<int, Pointer> pointers = new Dictionary<int, Pointer>();
    private readonly DrivingControls touch = new DrivingControls();
    private GtPrototype driver; private GtKeyboardInput input; private int shift; private GUIStyle style, small;
    public bool Left { get; private set; }
    public bool Right { get; private set; }
    public bool Handbrake { get; private set; }
    public double Gas { get; private set; }
    public double Brake { get; private set; }
    public double Wheel => touch.Sa;
    public bool MouseOnControl => pointers.TryGetValue(MouseId, out var p) && p.Kind != Kind.None;
    private const int MouseId = -1000;
    private static string notice = ""; private static float noticeUntil;
    /// TS note(): kısa ekran bildirimi.
    public static void Note(string text, float seconds = 1.6f) { notice = text; noticeUntil = Time.unscaledTime + seconds; }
    public void Bind(GtPrototype prototype, GtKeyboardInput keyboard) { driver = prototype; input = keyboard; keyboard.Touch = this; keyboard.CameraPressed += () => { if (Visible) Tap(Kind.Camera); }; keyboard.RespawnPressed += () => { if (Visible) Tap(Kind.Respawn); }; }
    /// Doğrulama/erişilebilirlik: kontrolün ekran dikdörtgeni (IMGUI ekseni) ya da null.
    public Rect? ControlRect(string kind, int slot = 0) { foreach (var c in Layout()) if (c.Kind.ToString() == kind && c.Slot == slot) return c.Rect; return null; }
    public int ConsumeShift() { int s = shift; shift = 0; return s; }
    public void Release() { pointers.Clear(); Left = Right = Handbrake = false; Gas = Brake = 0; touch.WheelRelease(); touch.PedalRelease(); }
    private PlayerSettings S => PlayerPreferences.Current;
    private bool Visible => driver && driver.Simulation != null && !GameFlow.Paused && !MutantRuntime.Blocked && !SettingsScreen.Open;
    // Yerleşim: ekran pikseli, IMGUI ekseni (sol üst köşe). Dar ekranda kısa kenara göre ölçeklenir.
    private static readonly Dictionary<string, string> Labels = new Dictionary<string, string>
    { ["Left"] = "SOL", ["Right"] = "SAĞ", ["Wheel"] = "DİREKSİYON", ["Calibrate"] = "Ortala", ["Gas"] = "GAZ", ["Pedal"] = "GAZ\n\nFREN", ["Brake"] = "FREN", ["Handbrake"] = "EL FRENİ",
      ["ShiftUp"] = "VİTES +", ["ShiftDown"] = "VİTES −", ["Settings"] = "AYAR", ["Pause"] = "DURAKLAT", ["Respawn"] = "↺", ["Camera"] = "KAMERA", ["Nitro"] = "NİTRO" };
    // Konumlar ortak HudLayout'tan; bilgi parçaları (panel, harita, çubuk) dokunmatik kontrol değildir.
    private IEnumerable<(Kind Kind, int Slot, Rect Rect, string Label)> Layout()
    {
      var skills = MutantRuntime.Abilities?.Skills();
      foreach (var p in Hud.Rects(driver))
      {
        string key = p.Key; int slot = 0; Kind kind;
        if (key.StartsWith("Skill") || key.StartsWith("Passive")) { slot = int.Parse(key.Substring(key.StartsWith("Skill") ? 5 : 7)); kind = key.StartsWith("Skill") ? Kind.Skill : Kind.Passive; }
        else if (!System.Enum.TryParse(key, out kind)) continue;
        if(LastTurn.Ui.MutantHudView.OwnsDrive&&(kind==Kind.Nitro||kind==Kind.Skill||kind==Kind.Passive))continue;
        string label = kind is Kind.Skill or Kind.Passive ? (skills != null && slot < skills.Length ? skills[slot].Name : "") : Labels[key];
        yield return (kind, slot, Hud.R(p.Value), label);
      }
    }
    private (Kind, int, Rect) Hit(Vector2 gui)
    {
      foreach (var c in Layout()) { var r = c.Rect; if (gui.x >= r.xMin - 10 && gui.x <= r.xMax + 10 && gui.y >= r.yMin - 10 && gui.y <= r.yMax + 10) return (c.Kind, c.Slot, r); }
      return (Kind.None, 0, default);
    }
    private static Vector2 Gui(Vector2 screen) => new Vector2(screen.x, Screen.height - screen.y);
    private void Update()
    {
      if (!Visible) { if (pointers.Count > 0) Release(); return; }
      var seen = new HashSet<int>();
      var screen = Touchscreen.current;
      if (screen != null) foreach (var t in screen.touches)
        { var ph = t.phase.ReadValue(); if (ph == UnityEngine.InputSystem.TouchPhase.None || ph == UnityEngine.InputSystem.TouchPhase.Ended || ph == UnityEngine.InputSystem.TouchPhase.Canceled) continue; int id = t.touchId.ReadValue(); seen.Add(id); Track(id, Gui(t.position.ReadValue())); }
      var mouse = Mouse.current;
      if (mouse != null && mouse.leftButton.isPressed) { seen.Add(MouseId); Track(MouseId, Gui(mouse.position.ReadValue())); }
      foreach (var id in pointers.Keys.Where(k => !seen.Contains(k)).ToArray()) End(id);
      Apply();
    }
    private void Track(int id, Vector2 at)
    {
      if (!pointers.TryGetValue(id, out var p))
      {
        var (kind, slot, rect) = Hit(at); p = new Pointer { Kind = kind, Slot = slot, Start = at, Last = at, Angle = Mathf.Atan2(at.y - rect.center.y, at.x - rect.center.x) };
        pointers[id] = p; Begin(p, rect);
      }
      if (p.Kind == Kind.Wheel)
      { var r = Layout().First(c => c.Kind == Kind.Wheel).Rect; double a = Math.Atan2(at.y - r.center.y, at.x - r.center.x); touch.WheelTurn(a - p.Angle); p.Angle = a; }
      else if (p.Kind == Kind.Pedal)
      { var r = Layout().First(c => c.Kind == Kind.Pedal).Rect; touch.Pedal((r.center.y - at.y) / (r.height / 2)); }
      else if (p.Kind == Kind.None)
      {
        // TS suruklemeKancasi.hava: kontrol dışı sürükleme havadayken burnu çevirir.
        var a = MutantRuntime.Abilities; var d = at - p.Last;
        if (a != null && (d.x != 0 || d.y != 0) && (a.Finger || (MutantRuntime.Run.State["faz"].S() is "surus" or "boss" && driver.Simulation.Body.Airborne))) a.AirDrag(d.x, d.y);
      }
      p.Last = at;
    }
    private void Begin(Pointer p, Rect rect)
    {
      if (p.Kind == Kind.Nitro) input.TouchNitro();
      else if (p.Kind == Kind.Skill) input.TouchSkill(p.Slot, true);
      else if (p.Kind == Kind.ShiftUp) shift = 1;
      else if (p.Kind == Kind.ShiftDown) shift = -1;
    }
    private void End(int id)
    {
      var p = pointers[id]; pointers.Remove(id); var (kind, _, _) = Hit(p.Last); bool inside = kind == p.Kind;
      if (p.Kind == Kind.Wheel) touch.WheelRelease();
      else if (p.Kind == Kind.Pedal) touch.PedalRelease();
      else if (p.Kind == Kind.Skill) input.TouchSkill(p.Slot, false);
      else if (p.Kind == Kind.None) MutantRuntime.Abilities?.AirRelease();
      else if (inside) Tap(p.Kind);
    }
    private void Tap(Kind k)
    {
      var s = S; GameAudio.Click();
      switch (k)
      {
        case Kind.Camera: s.Camera = (s.Camera + 1) % PlayerSettings.CameraNames.Length; PlayerPreferences.Save(); Note(PlayerSettings.CameraNames[s.Camera]); break;
        case Kind.Respawn: driver.RespawnAny(); break;
        case Kind.Pause: GameFlow.Pause(true); break;
        case Kind.Settings: SettingsScreen.Show(); break;
        case Kind.Calibrate:
          if (!Sensors.Available) Note("Cihaz yön sensörü bulunamadı");
          else if (input.Controls.Calibrate(Time.realtimeSinceStartupAsDouble, PlayerPreferences.Orientation)) Note("Ortalandı");
          else Note("Sensör okunamıyor");
          break;
      }
    }
    private void Apply()
    {
      bool Held(Kind k) => pointers.Values.Any(p => p.Kind == k);
      Left = Held(Kind.Left); Right = Held(Kind.Right); Handbrake = Held(Kind.Handbrake);
      Gas = Math.Max(Held(Kind.Gas) ? 1 : 0, touch.G); Brake = Math.Max(Held(Kind.Brake) ? 1 : 0, touch.B);
    }
    private void OnGUI()
    {
      if (style == null) { style = new GUIStyle(GUI.skin.box) { fontSize = 18, alignment = TextAnchor.MiddleCenter, wordWrap = true }; style.normal.textColor = Color.white; small = new GUIStyle(style) { fontSize = 15 }; }
      if (Time.unscaledTime < noticeUntil) GUI.Label(new Rect(Screen.width / 2f - 220, Screen.height * .32f, 440, 44), notice, style);
      if (!Visible) return;
      var color = GUI.color;
      foreach (var c in Layout())
      {
        bool held = pointers.Values.Any(p => p.Kind == c.Kind && p.Slot == c.Slot);
        GUI.color = held ? new Color(1, .85f, .3f, .95f) : new Color(1, 1, 1, .55f);
        string label = c.Label;
        if (c.Kind == Kind.Wheel) label += "\n" + (touch.WheelAngle * 57.3).ToString("0") + "°";
        if (c.Kind == Kind.Nitro) { var n = MutantRuntime.Abilities.Nitro(); label += "\n" + n.Energy.ToString("0") + "/" + n.Capacity.ToString("0") + (n.Open ? " AÇIK" : n.Ready ? " HAZIR" : ""); }
        if (c.Kind == Kind.Skill) label += "\n" + MutantSkillSlot.Read(MutantRuntime.Abilities.Skills()[c.Slot]).Text;
        GUI.Box(c.Rect, label, c.Kind is Kind.Nitro or Kind.Skill or Kind.Passive or Kind.Camera or Kind.Respawn or Kind.Pause or Kind.Settings ? small : style);
      }
      GUI.color = color;
    }
  }
}
