using UnityEngine;

namespace LastTurn.Prototype
{
  /// Kameranın bir karelik girdisi (TS dongu.ts sahneGuncelle): kip, tercih ve oyun durumu.
  public struct CameraFrame
  {
    public int Mode; public bool SpeedFov, Shake, Drifting, Nitro; public float SkillFov, HitAge, FrontAxle;
  }
  // Geçici çekim: TS kip davranışları (Takip/Uzak takip/Kaput/Kokpit), hıza göre FOV, nitro/skill görüşü, hız sarsıntısı.
  // Kokpit göz noktası TS varsayılanı (araç iç mekân modeli grafik fazında); kokpit/ayna iç mekânı çizilmez.
  public sealed class GtFollowCamera : MonoBehaviour
  {
    private Quaternion yaw;
    private float distance = 6.8f, vertical, fov = 62;
    private bool initialized;
    private Camera view;
    public float Fov => fov;
    /// Yumuşatmanın yöneldiği TS görüş açısı (doğrulama ve HUD).
    public float TargetFov { get; private set; }
    public int Mode { get; private set; }
    public void ResetFollow() => initialized = false;
    public void Render(Vector3 origin, Vector3 forward, float speed, float dt) => Render(origin, Quaternion.LookRotation(forward.sqrMagnitude > 0 ? forward : Vector3.forward), speed, dt, new CameraFrame { SpeedFov = true });
    public void Render(Vector3 origin, Quaternion body, float speed, float dt, CameraFrame c)
    {
      if (!view) view = GetComponent<Camera>();
      Mode = c.Mode; var forward = body * Vector3.forward; var flat = forward; flat.y = 0; if (flat.sqrMagnitude < .0001f) flat = Vector3.forward;
      flat.Normalize(); var targetYaw = Quaternion.LookRotation(flat, Vector3.up);
      float span = Mathf.Clamp01(speed / 77.2f); bool inCar = c.Mode >= 2, cockpit = c.Mode == 3, near = c.Mode == 0, far = c.Mode == 1;
      // TS sarsıntı: çarpma anı 0,35 sn, hız sarsıntısı tercihiyle yüksek hızda.
      float shake = (c.HitAge < .35f ? .3f : 0) + (c.Shake && span > .7f ? .03f * (span - .6f) * 3 : 0);
      float farScale = far ? 1.6f : 1, pitch = near ? .25f : .3f, targetDistance = ((near ? 6.8f : 9) + span * (near ? 2 : 3)) * farScale;
      if (!initialized) { yaw = targetYaw; distance = targetDistance; vertical = origin.y; fov = Target(c, span, inCar, cockpit); initialized = true; }
      float turn = 1 - Mathf.Exp(-(c.Drifting ? 2.2f : 4.5f) * dt), smooth = 1 - Mathf.Exp(-3 * dt);
      yaw = Quaternion.Slerp(yaw, targetYaw, turn); distance = Mathf.Lerp(distance, targetDistance, smooth);
      vertical = Mathf.Lerp(vertical, origin.y, 1 - Mathf.Exp(-8 * dt)); TargetFov = Target(c, span, inCar, cockpit); fov = Mathf.Lerp(fov, TargetFov, smooth);
      view.nearClipPlane = inCar ? .15f : .5f;
      if (inCar)
      {
        var up = body * Vector3.up; var right = body * Vector3.right;
        // TS: kaput (0, teker+0,62, ön aks−0,1) → 16 m ileri; kokpit EYE [0,4; 1,3; −0,2] → 14 m ileri, 0,15 aşağı.
        var eye = cockpit ? origin - right * .4f + up * 1.3f - forward * .2f : origin + up * .95f + forward * (c.FrontAxle - .1f);
        var look = cockpit ? eye - up * .15f + forward * 14 : eye - up * .27f + forward * 16;
        eye += up * (Random.value - .5f) * shake * .4f;
        transform.SetPositionAndRotation(eye, Quaternion.LookRotation(look - eye, up));
      }
      else
      {
        var lookForward = yaw * Vector3.forward;
        var position = new Vector3(origin.x, vertical, origin.z) - lookForward * (distance * Mathf.Cos(pitch)) + Vector3.up * ((near ? 1.7f : 2.4f) * farScale + distance * Mathf.Sin(pitch));
        position += new Vector3((Random.value - .5f) * shake * .6f, (Random.value - .5f) * shake, 0);
        position.y = Mathf.Max(1, position.y);
        transform.SetPositionAndRotation(position, Quaternion.LookRotation(origin + flat * 3 + Vector3.up * 1.2f - position, Vector3.up));
      }
      view.fieldOfView = fov;
    }
    // TS: kokpit 54 (dikey 64), diğer 62 (dikey 78) + kaput 6; hıza göre FOV, nitro +9, kanca/dönüşüm/rüzgâr görüşü.
    private static float Target(CameraFrame c, float span, bool inCar, bool cockpit)
    {
      bool portrait = Screen.width < Screen.height;
      float baseFov = cockpit ? (portrait ? 64 : 54) : (portrait ? 78 : 62) + (inCar ? 6 : 0);
      return baseFov + (c.SpeedFov ? span * 24 : 0) + (c.Nitro ? 9 : 0) + c.SkillFov;
    }
  }
}
