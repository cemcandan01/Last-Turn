namespace LastTurn.Core
{
  // TS mulberry32: explicit unsigned wrapping, independent from engine RNG.
  public sealed class SeededRandom
  {
    private uint state;
    public SeededRandom(uint seed) { state = seed; }
    public double Next()
    {
      unchecked
      {
        state += 0x6d2b79f5u;
        uint t = state;
        t = (t ^ (t >> 15)) * (t | 1u);
        t ^= t + (t ^ (t >> 7)) * (t | 61u);
        return (t ^ (t >> 14)) / 4294967296.0;
      }
    }
  }
}
