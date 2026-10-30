using System;

namespace LastTurn.Core
{
  public sealed class VehicleFixedStepRunner
  {
    private readonly FourWheelVehicle simulation;
    private double accumulator;
    public VehicleState Previous { get; private set; }
    public VehicleState Current => simulation.State;
    public double Alpha => accumulator / FourWheelVehicle.FixedDelta;
    public VehicleFixedStepRunner(FourWheelVehicle simulation)
    { this.simulation = simulation ?? throw new ArgumentNullException(nameof(simulation)); Previous = simulation.State; }
    public int Advance(double frameDelta, Func<int, VehicleCommand> inputAtStep)
    {
      Numeric.NonNegative(frameDelta);
      if (inputAtStep == null) throw new ArgumentNullException(nameof(inputAtStep));
      accumulator += Math.Min(frameDelta, .1);
      int count = 0;
      while (accumulator + 1e-12 >= FourWheelVehicle.FixedDelta)
      {
        var input = inputAtStep(Current.Steps); var previous = Current;
        simulation.Step(input); Previous = previous;
        accumulator = Math.Max(0, accumulator - FourWheelVehicle.FixedDelta); count++;
      }
      return count;
    }
  }
}
