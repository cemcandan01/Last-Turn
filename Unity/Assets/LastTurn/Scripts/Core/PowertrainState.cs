namespace LastTurn.Core
{
  public sealed class PowertrainState
  {
    public double Gas { get; internal set; }
    public double Steering { get; internal set; }
    public double Rpm { get; internal set; }
    public int Gear { get; internal set; }
    public double ShiftTimer { get; internal set; }
    public double Turbo { get; internal set; }
    public double EngineTorque { get; internal set; }
    public double DriveTorque { get; internal set; }
    public double CoupledRpm { get; internal set; }
    public double EffectiveGas { get; internal set; }
    public double EffectiveBrake { get; internal set; }
    public double SlipLimit { get; internal set; }
    public double SteeringAngle { get; internal set; }
    /// Manuel kalkış: debriyaj kayarken motorun tutulduğu devir (0: henüz yok, rölanti; −1: debriyaj kavradı).
    public double LaunchHold { get; internal set; }
  }
}
