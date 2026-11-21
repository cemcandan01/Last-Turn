using System;

namespace LastTurn.Core
{
  // MUTANT dilimi kanca ipi: gerilim hıza ve dönüş yarıçapına bağlıdır, kırmızıda kısa süre kalınca ip kopar.
  // Saf kural; kanca adımı (MutantSkills) hız/yarıçapı verir, HUD yalnız Ratio/Zone okur.
  public sealed class MutantHookRope
  {
    /// Seviye başına ipin taşıyabileceği dönüş yükü (m/sn²). Başlangıç değerleri, kontrol noktasında Cem'le ayarlanır.
    public static readonly double[] Strength = { 45, 52, 60 };
    public const double Yellow = .6, Red = 1, SnapTime = .25, SnapCooldownScale = 2.5, MinRadius = 6;

    /// Dönüş yükü (teğet hız² / yarıçap) ÷ seviye dayanımı.
    public static double Ratio(int level, double tangentSpeed, double radius)
    {
      double strength = Strength[Math.Max(0, Math.Min(Strength.Length, level) - 1)];
      return tangentSpeed * tangentSpeed / Math.Max(MinRadius, radius) / strength;
    }
    public static string Zone(double ratio) => ratio >= Red ? "kirmizi" : ratio >= Yellow ? "sari" : "yesil";
    /// Kopma sonrası yeniden kullanım bekleme süresi.
    public static double SnapCooldown(double baseCooldown) => baseCooldown * SnapCooldownScale;

    public double Tension { get; private set; }
    public double RedTime { get; private set; }
    public string Band => Zone(Tension);

    /// Bir adım ilerletir; ip koptuysa true. Kırmızı dışında sayaç aynı hızda söner (sınırda gidip gelerek aşılmaz).
    public bool Step(int level, double tangentSpeed, double radius, double dt)
    {
      Tension = Ratio(level, tangentSpeed, radius);
      RedTime = Tension >= Red ? RedTime + dt : Math.Max(0, RedTime - dt);
      return RedTime >= SnapTime - 1e-9;
    }
    public void Restore(double tension, double redTime) { Tension = tension; RedTime = redTime; }
  }
}
