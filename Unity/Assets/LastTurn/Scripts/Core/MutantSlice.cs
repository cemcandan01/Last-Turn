using System;
using System.Linq;

namespace LastTurn.Core
{
  // MUTANT dikey dilimi (AGENTS.md karar kaydı): iki araç, kural değiştiren kart seti, kısa koşu.
  // Bayrak kapalıyken hiçbir kural değişmez; kariyer ve TS referans yolu aynı kalır.
  // Ayar katalogdaki araç satırına değil, MUTANT koşusunun araç kopyasına uygulanır.
  public static class MutantSlice
  {
    public static bool Enabled { get; set; }
    /// Geliştirici A/B anahtarı: açıkken (varsayılan) asfalt lastiği yumuşar ve drift yarışı gevşer; kapalıyken eski zemin ayarı.
    public static bool SoftGround { get; set; } = true;
    public static bool DriftLoose => Enabled && SoftGround;
    public static double AsphaltSoftness => Enabled && SoftGround ? AsphaltSoftnessAmount : 0;
    /// 0 = eski asfalt lastiği, 1 = toprak lastik kuralı. Kayıp yakalanabilir kalsın diye kısmi.
    private const double AsphaltSoftnessAmount = .6;
    // Drift yarışı gevşetmesi: giriş açısı ve hazırlık süresi çarpanı, zorlama süresi çarpanı, azami açı payı (derece),
    // direksiyon+gaz eşikleri, spin açı payı (rad) ve spin sonrası bekleme (sn). Eski değerler: 1, 1, 0, .6, .5, .12, .9.
    public const double DriftEntryScale = .75, DriftForceScale = .6, DriftMaxBonus = 10, DriftHoldSteer = .4, DriftHoldGas = .35, DriftSpinMargin = .3, DriftSpinCool = .4;
    public const string TilkiKey = "c33", TavsanKey = "golf";
    public static readonly string[] CarKeys = { TilkiKey, TavsanKey };
    /// vehicle-catalog.json sırası: Bordo Tilki (c33) 13, Bozkır Tavşanı (golf) 11.
    public static readonly int[] StartingCars = { 13, 11 };

    // Bordo Tilki: ağır, arkadan itişli, uzun ve sakin kayan; zayıf fren, geniş direksiyon açısı.
    private const double TilkiInertia = 1.25, TilkiRearGrip = .88, TilkiBrake = .8, TilkiSteerAngle = .12, TilkiPower = 1.04;
    // Bozkır Tavşanı: hafif, dört çeker, yapışan; güçlü fren, keskin yön değişimi.
    private const double TavsanInertia = .75, TavsanRearGrip = 1.12, TavsanBrake = 1.3, TavsanAwd = .65, TavsanPower = 1.28;

    /// Asfalt lastiğini toprak lastik kuralına doğru kaydırır (VehicleCatalog.CreatePhysics yüzey 1).
    public static void SoftenAsphalt(TireParameters[] tires, double looseGrip, double looseRear, double looseShape, double loosePeak)
    {
      double k = AsphaltSoftness;
      for (int i = 0; i < tires.Length; i++)
      {
        var t = tires[i]; bool front = i < 2;
        double shape = t.C + (Math.Max(t.C, looseShape) - t.C) * k, b = Math.Tan(Math.PI / (2 * Math.Max(1.05, t.C))) / t.Ap;
        double ap = Math.Tan(Math.PI / (2 * Math.Max(1.05, shape))) / b; ap += (Math.Min(ap, loosePeak) - ap) * k;
        double mu = 1 + (looseGrip * (front ? 1 : looseRear) - 1) * k;
        tires[i] = new TireParameters(t.MuY * mu, t.MuX * mu, t.Kp + (.18 - t.Kp) * k, ap, shape);
      }
    }

    // Norm yardım seviyesi Tilki'nin kaymasını yarıya indiriyordu (ölçüm, 21 Kasım): yalnız Tilki'de yön/viraj/kayma yardımı azalır.
    private const double TilkiSteerAssist = .7, TilkiStability = .45, TilkiTraction = .6;
    public static CatalogNode TuneAssists(string key, CatalogNode assists)
    {
      if (!Enabled || key != TilkiKey) return assists;
      var tuned = assists.Clone();
      void Multiply(string field, double factor) => tuned.Set(field, CatalogNode.Num(tuned[field].N() * factor));
      Multiply("str", TilkiSteerAssist); Multiply("stm", TilkiStability); Multiply("tcs", TilkiTraction);
      return tuned;
    }

    public static CatalogNode TuneCar(CatalogNode car)
    {
      if (!Enabled) return car;
      string key = car["k"].S();
      if (!CarKeys.Contains(key)) return car;
      var tuned = car.Clone();
      void Multiply(string field, double factor) => tuned.Set(field, CatalogNode.Num(tuned[field].N() * factor));
      if (key == TilkiKey)
      {
        Multiply("iz", TilkiInertia); Multiply("rb", TilkiRearGrip); Multiply("brk", TilkiBrake); Multiply("hp", TilkiPower);
        tuned.Set("dmax", CatalogNode.Num(tuned["dmax"].N(.8) + TilkiSteerAngle));
      }
      else
      {
        Multiply("iz", TavsanInertia); Multiply("rb", TavsanRearGrip); Multiply("brk", TavsanBrake); Multiply("hp", TavsanPower);
        tuned.Set("awd", CatalogNode.Num(TavsanAwd));
      }
      return tuned;
    }
  }
}
