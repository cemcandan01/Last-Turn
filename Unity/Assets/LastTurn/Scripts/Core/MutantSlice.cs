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
    public const string TilkiKey = "c33", TavsanKey = "golf";
    public static readonly string[] CarKeys = { TilkiKey, TavsanKey };
    /// vehicle-catalog.json sırası: Bordo Tilki (c33) 13, Bozkır Tavşanı (golf) 11.
    public static readonly int[] StartingCars = { 13, 11 };

    // Bordo Tilki: ağır, arkadan itişli, uzun ve sakin kayan; zayıf fren, geniş direksiyon açısı.
    private const double TilkiInertia = 1.25, TilkiRearGrip = .85, TilkiBrake = .8, TilkiSteerAngle = .12, TilkiTorque = 1.1;
    // Bozkır Tavşanı: hafif, dört çeker, yapışan; güçlü fren, keskin yön değişimi.
    private const double TavsanInertia = .75, TavsanRearGrip = 1.12, TavsanBrake = 1.3, TavsanAwd = .65, TavsanPower = 1.35;

    public static CatalogNode TuneCar(CatalogNode car)
    {
      if (!Enabled) return car;
      string key = car["k"].S();
      if (!CarKeys.Contains(key)) return car;
      var tuned = car.Clone();
      void Multiply(string field, double factor) => tuned.Set(field, CatalogNode.Num(tuned[field].N() * factor));
      if (key == TilkiKey)
      {
        Multiply("iz", TilkiInertia); Multiply("rb", TilkiRearGrip); Multiply("brk", TilkiBrake); Multiply("trq", TilkiTorque);
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
