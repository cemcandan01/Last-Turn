using System;
using LastTurn.Core;
using UnityEngine.InputSystem;

namespace LastTurn.Prototype
{
  public sealed class GtKeyboardInput : IDisposable
  {
    private readonly InputActionMap map = new InputActionMap("GT Test");
    private readonly InputAction throttle, brake, left, right, handbrake, restart;
    private bool restartPending;
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
    }
    public void Enable() => map.Enable();
    public void Disable() { map.Disable(); restartPending = false; }
    public DrivingInput Read() => new DrivingInput(throttle.ReadValue<float>(), brake.ReadValue<float>(), (left.IsPressed()?1:0)-(right.IsPressed()?1:0), false, false, handbrake.IsPressed());
    public bool ConsumeRestart() { bool value = restartPending; restartPending = false; return value; }
    public void Dispose() => map.Dispose();
  }
}
