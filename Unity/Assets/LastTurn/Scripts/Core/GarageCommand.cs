using System;

namespace LastTurn.Core
{
  public enum GarageCommandKind { SelectCar, BuyCar, BuyAndEquipPart, EquipPart, UnequipCategory, BuyAndEquipPackage, EquipPackage, Stock, SetAssistLevel }

  // Garaj işlemleri veri olarak tanımlanır; arayüz yalnız komutu seçer ve oturuma verir. Bileşik akış TS 0.8.18
  // garaj.ts onay düğmesidir: satın alma başarılıysa aynı işlemde takılır, sökme iade üretmez.
  public sealed class GarageCommand
  {
    public GarageCommandKind Kind { get; }
    public int Car { get; }
    public string Id { get; }

    private GarageCommand(GarageCommandKind kind, int car, string id = "") { Kind = kind; Car = car; Id = id ?? ""; }

    public static GarageCommand SelectCar(int car) => new GarageCommand(GarageCommandKind.SelectCar, car);
    public static GarageCommand BuyCar(int car) => new GarageCommand(GarageCommandKind.BuyCar, car);
    public static GarageCommand BuyAndEquipPart(int car, string part) => new GarageCommand(GarageCommandKind.BuyAndEquipPart, car, part);
    public static GarageCommand EquipPart(int car, string part) => new GarageCommand(GarageCommandKind.EquipPart, car, part);
    public static GarageCommand UnequipCategory(int car, string category) => new GarageCommand(GarageCommandKind.UnequipCategory, car, category);
    public static GarageCommand BuyAndEquipPackage(int car, string package) => new GarageCommand(GarageCommandKind.BuyAndEquipPackage, car, package);
    public static GarageCommand EquipPackage(int car, string package) => new GarageCommand(GarageCommandKind.EquipPackage, car, package);
    public static GarageCommand Stock(int car) => new GarageCommand(GarageCommandKind.Stock, car);
    /// TS kurulum.lk: yardım seviyesi (arc/norm/real); para harcamaz, kaydedilir.
    public static GarageCommand SetAssistLevel(string level) => new GarageCommand(GarageCommandKind.SetAssistLevel, -1, level);

    // Para harcayan işlemler sunumda ikinci onay ister (TS: 3 sn içinde ikinci dokunuş).
    public bool SpendsMoney => Kind == GarageCommandKind.BuyCar || Kind == GarageCommandKind.BuyAndEquipPart || Kind == GarageCommandKind.BuyAndEquipPackage;

    public bool Apply(GarageState state)
    {
      if (state == null) throw new ArgumentNullException(nameof(state));
      switch (Kind)
      {
        case GarageCommandKind.SelectCar: return state.SelectCar(Car);
        case GarageCommandKind.BuyCar: return state.BuyCar(Car);
        case GarageCommandKind.BuyAndEquipPart: return state.BuyParts(Car, new[] { Id }) && state.Equip(Car, Id);
        case GarageCommandKind.EquipPart: return state.Equip(Car, Id);
        case GarageCommandKind.UnequipCategory: return state.Unequip(Car, Id);
        case GarageCommandKind.BuyAndEquipPackage: return state.BuyParts(Car, PackageParts(state, Id)) && state.EquipPackage(Car, Id);
        case GarageCommandKind.EquipPackage: return state.EquipPackage(Car, Id);
        case GarageCommandKind.Stock: return state.Stock(Car);
        case GarageCommandKind.SetAssistLevel: return state.SetAssistLevel(Id);
        default: return false;
      }
    }

    internal static string[] PackageParts(GarageState state, string package)
    {
      foreach (var p in state.Catalog.Data["packages"].Items)
        if (p["id"].S() == package)
        {
          var ids = new System.Collections.Generic.List<string>();
          foreach (var id in p["parcalar"].Items) ids.Add(id.S());
          return ids.ToArray();
        }
      return Array.Empty<string>();
    }

    public string SuccessMessage
    {
      get
      {
        switch (Kind)
        {
          case GarageCommandKind.SelectCar: return "Araç seçimi kaydedildi.";
          case GarageCommandKind.BuyCar: return "Araç satın alındı ve kaydedildi.";
          case GarageCommandKind.BuyAndEquipPart: return "Parça satın alındı, takıldı ve kaydedildi.";
          case GarageCommandKind.EquipPart: return "Parça takıldı ve kaydedildi.";
          case GarageCommandKind.UnequipCategory: return "Parça söküldü. Para iadesi yok; yatırım kredisi korundu.";
          case GarageCommandKind.BuyAndEquipPackage: return "Paket satın alındı, takıldı ve kaydedildi.";
          case GarageCommandKind.EquipPackage: return "Paket takıldı ve kaydedildi.";
          case GarageCommandKind.SetAssistLevel: return "Sürüş yardımı seviyesi kaydedildi.";
          default: return "Stoka dönüldü. Satın alınmış parçalar ve yatırım korundu.";
        }
      }
    }
  }
}
