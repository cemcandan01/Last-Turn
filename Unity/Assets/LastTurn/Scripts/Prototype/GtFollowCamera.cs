using System;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Prototype
{
  /// Kameranın bir karelik girdisi (TS dongu.ts sahneGuncelle): kip, tercih ve oyun durumu.
  public struct CameraFrame
  {
    public int Mode; public bool SpeedFov, Shake, Drifting, Nitro; public float SkillFov, HitAge, FrontAxle;
    public bool HasSourceEye;public Vector3 SourceEye;
  }
  // Geçici çekim: TS kip davranışları (Takip/Uzak takip/Kaput/Kokpit), hıza göre FOV, nitro/skill görüşü, hız sarsıntısı.
  // Kokpit göz noktası TS varsayılanı (araç iç mekân modeli grafik fazında); kokpit/ayna iç mekânı çizilmez.
  public sealed class GtFollowCamera : MonoBehaviour
  {
    private readonly ChaseCamera chase = new ChaseCamera();
    private float fov = 62;
    private bool initialized;
    private Camera view;
    public float Fov => fov;
    /// Yumuşatmanın yöneldiği TS görüş açısı (doğrulama ve HUD).
    public float TargetFov { get; private set; }
    public int Mode { get; private set; }
    public void ResetFollow() { initialized = false; chase.Reset(); }
    /// Kameranın altındaki zemin (Unity x,z → y). Pistte fizik dünyasının yüksekliği; atanmazsa düz zemin (y=0).
    public Func<double, double, double> Ground = (x, z) => 0;
    /// Yalnız önce/sonra doğrulaması: eski mutlak y ≥ 1 tabanını yeniden üretir.
    public bool LegacyAbsoluteFloor;
    public ChaseCamera Chase => chase;
    public void Render(Vector3 origin, Vector3 forward, float speed, float dt) => Render(origin, Quaternion.LookRotation(forward.sqrMagnitude > 0 ? forward : Vector3.forward), speed, dt, new CameraFrame { SpeedFov = true });
    public void Render(Vector3 origin, Quaternion body, float speed, float dt, CameraFrame c)
    {
      if (!view) view = GetComponent<Camera>();
      Mode = c.Mode; var forward = body * Vector3.forward; var flat = forward; flat.y = 0; if (flat.sqrMagnitude < .0001f) flat = Vector3.forward;
      flat.Normalize();
      float span = Mathf.Clamp01(speed / 77.2f); bool inCar = c.Mode >= 2, cockpit = c.Mode == 3, near = c.Mode == 0, far = c.Mode == 1;
      // TS sarsıntı: çarpma anı 0,35 sn, hız sarsıntısı tercihiyle yüksek hızda.
      float shake = (c.HitAge < .35f ? .3f : 0) + (c.Shake && span > .7f ? .03f * (span - .6f) * 3 : 0);
      if (!initialized) { fov = Target(c, span, inCar, cockpit); initialized = true; }
      float smooth = 1 - Mathf.Exp(-3 * dt);
      TargetFov = Target(c, span, inCar, cockpit); fov = Mathf.Lerp(fov, TargetFov, smooth);
      view.nearClipPlane = inCar ? .15f : .5f;
      if (inCar)
      {
        var up = body * Vector3.up; var right = body * Vector3.right;
        // TS: kaput (0, teker+0,62, ön aks−0,1) → 16 m ileri; kokpit EYE [0,4; 1,3; −0,2] → 14 m ileri, 0,15 aşağı.
        var eye = cockpit ? (c.HasSourceEye?origin+body*c.SourceEye:origin-right*.4f+up*1.3f-forward*.2f) : origin + up * .95f + forward * (c.FrontAxle - .1f);
        var look = cockpit ? eye - up * .15f + forward * 14 : eye - up * .27f + forward * 16;
        eye += up * (UnityEngine.Random.value - .5f) * shake * .4f;
        transform.SetPositionAndRotation(eye, Quaternion.LookRotation(look - eye, up));
      }
      else
      {
        // Yükseklik tabanı kameranın altındaki zeminden (TS). Eski mutlak y ≥ 1 tabanı ralli çukurlarında kamerayı aracın
        // çok üstüne kaldırıp dik aşağı baktırıyordu.
        var p = chase.Step(origin.x, origin.y, origin.z, flat.x, flat.z, speed, dt, near ? 0 : 1, c.Drifting,
          LegacyAbsoluteFloor ? (x, z) => 0 : Ground, (UnityEngine.Random.value - .5f) * shake * .6f, (UnityEngine.Random.value - .5f) * shake);
        var position = new Vector3((float)p.X, (float)p.Y, (float)p.Z);
        transform.SetPositionAndRotation(position, Quaternion.LookRotation(new Vector3((float)p.TX, (float)p.TY, (float)p.TZ) - position, Vector3.up));
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
