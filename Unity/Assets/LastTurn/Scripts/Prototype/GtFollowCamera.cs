using UnityEngine;

namespace LastTurn.Prototype
{
  public sealed class GtFollowCamera : MonoBehaviour
  {
    private Quaternion yaw;
    private float distance = 6.8f, vertical, fov = 62;
    private bool initialized;
    private Camera view;
    public void ResetFollow() => initialized = false;
    public void Render(Vector3 origin, Vector3 forward, float speed, float dt)
    {
      if (!view) view = GetComponent<Camera>();
      forward.y = 0; if (forward.sqrMagnitude < .0001f) forward = Vector3.forward;
      forward.Normalize(); var targetYaw = Quaternion.LookRotation(forward, Vector3.up);
      float span = Mathf.Clamp01(speed / 77.2f), targetDistance = 6.8f + 2 * span;
      float targetY = origin.y;
      if (!initialized) { yaw = targetYaw; distance = targetDistance; vertical = targetY; fov = 62 + 24 * span; initialized = true; }
      float turn = 1 - Mathf.Exp(-4.5f * dt), smooth = 1 - Mathf.Exp(-3 * dt);
      yaw = Quaternion.Slerp(yaw, targetYaw, turn); distance = Mathf.Lerp(distance, targetDistance, smooth);
      vertical = Mathf.Lerp(vertical, targetY, 1 - Mathf.Exp(-8 * dt)); fov = Mathf.Lerp(fov, 62 + 24 * span, smooth);
      var lookForward = yaw * Vector3.forward;
      var position = new Vector3(origin.x, vertical, origin.z) - lookForward * (distance * Mathf.Cos(.25f))
        + Vector3.up * (1.7f + distance * Mathf.Sin(.25f));
      position.y = Mathf.Max(1, position.y);
      transform.SetPositionAndRotation(position, Quaternion.LookRotation(origin + forward * 3 + Vector3.up * 1.2f - position, Vector3.up));
      view.fieldOfView = fov;
    }
  }
}
