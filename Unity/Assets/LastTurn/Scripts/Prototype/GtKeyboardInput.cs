using System;
using LastTurn.Core;
using UnityEngine.InputSystem;

namespace LastTurn.Prototype
{
  // Klavye + dokunmatik katman + eğim → DrivingControls ham girişleri (TS I); fiziğe giden girdi TS fizikGirdisi ile tek yerden.
  public sealed class GtKeyboardInput : IDisposable
  {
    private readonly InputActionMap map = new InputActionMap("GT Test");
    private readonly InputAction throttle, brake, left, right, handbrake, restart, shiftUp, shiftDown, nitro, camera, respawn, airHold, airDelta;
    private readonly InputAction[] skills = new InputAction[3];
    private bool restartPending; private int shiftPending;
    /// TS mutant-ui.ts: N nitro, 1/2/3 yuva sırasıyla skill (basılı tutma Volt Kanat için ayrıca bildirilir).
    public event Action NitroPressed;
    /// Masaüstü (F): V kamera değiştirir (dokunmatik KAMERA düğmesinin klavye karşılığı).
    public event Action CameraPressed;
    /// Masaüstü (F): T piste döner / yeniden doğar (dokunmatik ↺ düğmesinin klavye karşılığı; R yarışı baştan başlatır).
    public event Action RespawnPressed;
    public event Action<int> SkillPressed, SkillReleased;
    public readonly DrivingControls Controls = new DrivingControls();
    /// Dokunmatik katman (yoksa yalnız klavye).
    public TouchDrivingOverlay Touch { get; set; }
    public GtKeyboardInput()
    {
      throttle = map.AddAction("Gaz", InputActionType.Button, "<Keyboard>/w");
      throttle.AddBinding("<Keyboard>/upArrow");
      brake = map.AddAction("Fren", InputActionType.Button, "<Keyboard>/s");
      brake.AddBinding("<Keyboard>/downArrow");
      left = map.AddAction("SolDireksiyon", InputActionType.Button, "<Keyboard>/a");
      left.AddBinding("<Keyboard>/leftArrow");
      right = map.AddAction("SagDireksiyon", InputActionType.Button, "<Keyboard>/d");
      right.AddBinding("<Keyboard>/rightArrow");
      // TS girdi.ts: boşluk ya da C el freni
      handbrake = map.AddAction("ElFreni", InputActionType.Button, "<Keyboard>/space");
      handbrake.AddBinding("<Keyboard>/c");
      restart = map.AddAction("YenidenBaslat", InputActionType.Button, "<Keyboard>/r");
      restart.performed += _ => restartPending = true;
      // Drag manuel vites (tek basış; mobilde iki düğme). Otomatik şanzımanda fizik yok sayar.
      shiftUp = map.AddAction("VitesYukari", InputActionType.Button, "<Keyboard>/e"); shiftUp.performed += _ => shiftPending = 1;
      shiftDown = map.AddAction("VitesAsagi", InputActionType.Button, "<Keyboard>/q"); shiftDown.performed += _ => shiftPending = -1;
      nitro = map.AddAction("Nitro", InputActionType.Button, "<Keyboard>/n"); nitro.performed += _ => NitroPressed?.Invoke();
      camera = map.AddAction("Kamera", InputActionType.Button, "<Keyboard>/v"); camera.performed += _ => CameraPressed?.Invoke();
      respawn = map.AddAction("PisteDon", InputActionType.Button, "<Keyboard>/t"); respawn.performed += _ => RespawnPressed?.Invoke();
      for (int i = 0; i < skills.Length; i++)
      {
        int slot = i; skills[i] = map.AddAction("Beceri" + (i + 1), InputActionType.Button, "<Keyboard>/" + (i + 1));
        skills[i].performed += _ => SkillPressed?.Invoke(slot); skills[i].canceled += _ => SkillReleased?.Invoke(slot);
      }
      // Havada burun denetimi: sol fare tuşuyla sürükleme (TS dokunmatik sürükleme alanı).
      airHold = map.AddAction("HavaSurukle", InputActionType.Button, "<Mouse>/leftButton");
      airDelta = map.AddAction("HavaDelta", InputActionType.Value, "<Mouse>/delta"); airDelta.expectedControlType = "Vector2";
    }
    /// Ayarlar → Kontroller tablosu: eylem adı ve bağlı tuş yolları, sürüşte kullanılan eşlemenin kendisinden okunur.
    public static (string Action, string[] Paths)[] Bindings()
    {
      using (var input = new GtKeyboardInput())
      {
        var rows = new System.Collections.Generic.List<(string, string[])>();
        foreach (var a in input.map.actions) if (a.name != "HavaDelta") rows.Add((a.name, System.Linq.Enumerable.ToArray(System.Linq.Enumerable.Select(a.bindings, b => b.path))));
        return rows.ToArray();
      }
    }
    /// Dokunmatik nitro/skill düğmeleri klavye olaylarıyla aynı kuyruğa girer.
    public void TouchNitro() => NitroPressed?.Invoke();
    public void TouchSkill(int slot, bool down) { if (down) SkillPressed?.Invoke(slot); else SkillReleased?.Invoke(slot); }
    /// Son basılan vites isteği (bir fizik adımında tüketilir).
    public int ConsumeShift() { int s = shiftPending + (Touch != null ? Touch.ConsumeShift() : 0); shiftPending = 0; return Math.Max(-1, Math.Min(1, s)); }
    public void Enable() => map.Enable();
    /// Odak kaybı: tuşlar bırakılmış sayılır (TS girdiSifirla), bekleyen istekler düşer.
    public void Disable() { map.Disable(); restartPending = false; shiftPending = 0; Controls.Reset(); Touch?.Release(); }
    public DrivingInput Read() => Read(true);
    /// driving: otomatik gaz yalnız sürüşte (TS dongu.ts mode == "drive").
    public DrivingInput Read(bool driving)
    {
      var s = PlayerPreferences.Current; var t = Touch;
      Controls.L = left.IsPressed() || (t != null && t.Left) ? 1 : 0;
      Controls.R = right.IsPressed() || (t != null && t.Right) ? 1 : 0;
      Controls.G = Math.Max(throttle.ReadValue<float>(), t != null ? t.Gas : 0);
      Controls.B = Math.Max(brake.ReadValue<float>(), t != null ? t.Brake : 0);
      Controls.Dbr = handbrake.IsPressed() || (t != null && t.Handbrake) ? 1 : 0;
      Controls.Sa = t != null ? t.Wheel : 0;
      Sensors.Read(Controls);
      Controls.AutoGas(s, driving);
      return Controls.Physics(s, PlayerPreferences.Orientation);
    }
    public bool AirHeld => airHold.IsPressed() && (Touch == null || !Touch.MouseOnControl);
    /// Kare başına fare kayması (piksel; y aşağı pozitif, DOM sürükleme yönü).
    public (double X, double Y) AirDelta { get { var d = airDelta.ReadValue<UnityEngine.Vector2>(); return (d.x, -d.y); } }
    public bool ConsumeRestart() { bool value = restartPending; restartPending = false; return value; }
    public void Dispose() => map.Dispose();
  }

  // TS deviceorientation (beta/gamma). Unity yerçekimi sensörü cihaz ekseninde; cihazda doğrulanmadı.
  public static class Sensors
  {
    public static bool Available => GravitySensor.current != null;
    public static void Read(DrivingControls c)
    {
      var g = GravitySensor.current; if (g == null) return;
      if (!g.enabled) InputSystem.EnableDevice(g);
      var v = g.gravity.ReadValue(); double m = Math.Sqrt(v.x * v.x + v.y * v.y + v.z * v.z); if (m < 1e-6) return;
      double gx = v.x / m, gy = v.y / m, b = Math.Asin(Math.Max(-1, Math.Min(1, -gy))), cb = Math.Cos(b);
      c.TiltBeta = b * 180 / Math.PI; c.TiltGamma = cb < 1e-6 ? 0 : Math.Asin(Math.Max(-1, Math.Min(1, gx / cb))) * 180 / Math.PI;
      c.TiltTime = UnityEngine.Time.realtimeSinceStartupAsDouble;
    }
  }
}
