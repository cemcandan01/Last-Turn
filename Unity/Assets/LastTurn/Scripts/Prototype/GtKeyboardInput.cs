using System;
using LastTurn.Core;
using UnityEngine.InputSystem;

namespace LastTurn.Prototype
{
  public sealed class GtKeyboardInput : IDisposable
  {
    private readonly InputActionMap map = new InputActionMap("GT Test");
    private readonly InputAction throttle, brake, left, right, handbrake, restart, shiftUp, shiftDown;
    private bool restartPending; private int shiftPending;
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
      handbrake = map.AddAction("ElFreni", InputActionType.Button, "<Keyboard>/space");
      restart = map.AddAction("YenidenBaslat", InputActionType.Button, "<Keyboard>/r");
      restart.performed += _ => restartPending = true;
      // Drag manuel vites (tek basış; mobilde iki düğme). Otomatik şanzımanda fizik yok sayar.
      shiftUp = map.AddAction("VitesYukari", InputActionType.Button, "<Keyboard>/e"); shiftUp.performed += _ => shiftPending = 1;
      shiftDown = map.AddAction("VitesAsagi", InputActionType.Button, "<Keyboard>/q"); shiftDown.performed += _ => shiftPending = -1;
    }
    /// Son basılan vites isteği (bir fizik adımında tüketilir).
    public int ConsumeShift() { int s = shiftPending; shiftPending = 0; return s; }
    public void Enable() => map.Enable();
    public void Disable() { map.Disable(); restartPending = false; shiftPending = 0; }
    public DrivingInput Read() => new DrivingInput(throttle.ReadValue<float>(), brake.ReadValue<float>(), (left.IsPressed()?1:0)-(right.IsPressed()?1:0), false, false, handbrake.IsPressed());
    public bool ConsumeRestart() { bool value = restartPending; restartPending = false; return value; }
    public void Dispose() => map.Dispose();
  }
}
