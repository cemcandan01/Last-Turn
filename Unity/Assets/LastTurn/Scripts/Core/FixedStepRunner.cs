using System;

namespace LastTurn.Core
{
  public sealed class FixedStepRunner
  {
    private readonly WheelDriveBench simulation;
    private double accumulator;
    public DriveState Previous { get; private set; }
    public DriveState Current => simulation.State;
    public double Alpha => accumulator / WheelDriveBench.FixedDelta;
    public FixedStepRunner(WheelDriveBench simulation)
    { this.simulation = simulation ?? throw new ArgumentNullException(nameof(simulation)); Previous = simulation.State; }
    // Inputs belong to physics ticks. Render frames must not consume simulation RNG.
    // Like TS, wall-clock stalls above 100ms are clamped; this deliberately discards excess time.
    public int Advance(double frameDelta, Func<int, DriveInput> inputAtStep)
    {
      Numeric.NonNegative(frameDelta);
      if (inputAtStep == null) throw new ArgumentNullException(nameof(inputAtStep));
      accumulator += Math.Min(frameDelta, 0.1);
      int count = 0;
      while (accumulator + 1e-12 >= WheelDriveBench.FixedDelta)
      {
        var input = inputAtStep(Current.Steps);
        var previous = Current;
        simulation.Step(input);
        Previous = previous;
        accumulator = Math.Max(0, accumulator - WheelDriveBench.FixedDelta);
        count++;
      }
      return count;
    }
    public double InterpolatedPosition => Previous.Position + (Current.Position - Previous.Position) * Alpha;
  }
}
