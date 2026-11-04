using System;

namespace LastTurn.Core
{
  public sealed class PowertrainFixedStepRunner
  {
    private readonly PowertrainVehicle simulation;
    private double accumulator;
    public VehicleState PreviousBody { get; private set; }
    public VehicleState CurrentBody => simulation.Body;
    public PowertrainState Engine => simulation.Engine;
    public double Alpha => accumulator / PowertrainVehicle.FixedDelta;
    public PowertrainFixedStepRunner(PowertrainVehicle simulation)
    { this.simulation = simulation ?? throw new ArgumentNullException(nameof(simulation)); PreviousBody = simulation.Body; }
    public int Advance(double frameDelta, Func<int, DrivingInput> inputAtTick) => Advance(frameDelta, inputAtTick, null!);
    /// afterStep: her fizik adımından sonra (yarış adımı); false dönerse kalan birikim atılır (yarış bitti).
    public int Advance(double frameDelta, Func<int, DrivingInput> inputAtTick, Func<bool> afterStep)
    {
      Numeric.NonNegative(frameDelta); if (inputAtTick == null) throw new ArgumentNullException(nameof(inputAtTick));
      accumulator += Math.Min(frameDelta, .1); int count = 0;
      while (accumulator + 1e-12 >= PowertrainVehicle.FixedDelta)
      {
        var input = inputAtTick(CurrentBody.Steps); var previous = CurrentBody;
        simulation.Step(input); PreviousBody = previous;
        accumulator = Math.Max(0, accumulator - PowertrainVehicle.FixedDelta); count++;
        if (afterStep != null && !afterStep()) { accumulator = 0; break; }
      }
      return count;
    }
    /// Işınlanma/yeniden başlatmadan sonra ara değer eski konumdan çizilmesin.
    public void SyncPrevious() { PreviousBody = simulation.Body; accumulator = 0; }
  }
}
