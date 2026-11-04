using LastTurn.Core;

// Sunum katmanı sözleşmesi: görünüm modeli komutları doğrudan GarageState işlemleriyle aynı sonucu verir.
internal static class GarageUiValidation
{
  private static int checks;
  private static void Check(bool condition, string label)
  {
    checks++;
    if (!condition) throw new InvalidOperationException("Garaj sunum testi: " + label);
  }

  private static GarageState Copy(GarageState s) => GarageState.Restore(s.Catalog, s.Snapshot());

  public static void Run()
  {
    var catalog = new VehicleCatalog(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..",
      "Assets", "LastTurn", "Resources", "vehicle-catalog.json")));
    var fresh = new GarageState(catalog);
    var cars = GarageViewModel.Cars(fresh);
    Check(cars.Length == catalog.Data["cars"].Items.Count(), "her araç için satır");
    Check(cars[fresh.SelectedCar].Owned && cars[fresh.SelectedCar].Selected && cars[fresh.SelectedCar].Primary.Kind == GarageCommandKind.SelectCar,
      "başlangıç aracı sahip/seçili");
    foreach (var row in cars.Where(r => !r.Owned))
    {
      Check(row.Primary.Kind == GarageCommandKind.BuyCar && row.Primary.SpendsMoney && row.Block == fresh.CarPurchaseBlock(row.Index),
        "mağaza satırı satın alma komutu ve TS engeli " + row.Index);
      string before = fresh.Snapshot().ToString();
      Check(!row.Primary.Apply(Copy(fresh)) && fresh.Snapshot().ToString() == before, "yeni oyuncu alımı reddedildi " + row.Index);
    }

    var rich = new GarageState(catalog);
    rich.AddMoney(60000); rich.AddXp(VehicleCatalog.LevelBase(15));
    int car = rich.SelectedCar;
    foreach (var (category, _) in GarageViewModel.Categories(catalog))
      foreach (var part in GarageViewModel.Parts(rich, car, category))
      {
        var viaCommand = Copy(rich); var direct = Copy(rich);
        bool a = part.Command.Apply(viaCommand);
        bool b = part.Equipped ? direct.Unequip(car, category)
          : part.Owned ? direct.Equip(car, part.Id) : direct.BuyParts(car, new[] { part.Id }) && direct.Equip(car, part.Id);
        Check(a == b && viaCommand.Snapshot().ToString() == direct.Snapshot().ToString(), "parça komutu doğrudan işlemle aynı " + part.Id);
        Check(part.Cost == rich.PartsCost(car, new[] { part.Id }), "parça bedeli kredi kuralından " + part.Id);
      }

    // Satın al+tak → satır sökme komutuna döner; sökme iade üretmez; yeniden takma ücretsizdir.
    var flow = Copy(rich);
    var first = GarageViewModel.Parts(flow, car, "motor").First(p => !p.Owned && p.Cost > 0);
    double balance = flow.Balance;
    Check(first.Command.Kind == GarageCommandKind.BuyAndEquipPart && first.Command.Apply(flow), "parça alındı ve takıldı");
    var equipped = GarageViewModel.Parts(flow, car, "motor").Single(p => p.Id == first.Id);
    Check(equipped.Equipped && equipped.Command.Kind == GarageCommandKind.UnequipCategory, "takılı parçanın komutu kategori sökme");
    double afterBuy = flow.Balance;
    Check(afterBuy == balance - first.Cost, "bakiye parça bedeli kadar düştü");
    Check(equipped.Command.Apply(flow) && !flow.Equipped(car).Contains(first.Id) && flow.Balance == afterBuy, "sökme iade üretmedi");
    var again = GarageViewModel.Parts(flow, car, "motor").Single(p => p.Id == first.Id);
    Check(again.Command.Kind == GarageCommandKind.EquipPart && !again.Command.SpendsMoney && again.Command.Apply(flow) && flow.Balance == afterBuy,
      "yeniden takma ücretsiz");

    // İki araç: başka araca alınan araç ve paket ilk aracın takılı listesini değiştirmez.
    var other = GarageViewModel.Cars(flow).First(r => !r.Owned && r.Block == "");
    Check(other.Primary.Apply(flow) && GarageViewModel.Cars(flow)[other.Index].Owned, "ikinci araç alındı");
    var firstCarParts = flow.Equipped(car);
    var pack = GarageViewModel.Packages(flow, other.Index).First(p => !p.Owned && p.Cost <= flow.Balance);
    Check(pack.Cost == flow.PartsCost(other.Index, GarageCommand.PackageParts(flow, pack.Id)), "paket bedeli kredi kuralından");
    Check(pack.Command.Apply(flow) && flow.Equipped(car).SequenceEqual(firstCarParts) && flow.Equipped(other.Index).Length > 0,
      "ikinci aracın paketi ilk aracı etkilemedi");
    Check(GarageCommand.Stock(other.Index).Apply(flow) && flow.Equipped(other.Index).Length == 0 && flow.Equipped(car).SequenceEqual(firstCarParts),
      "stoka dönüş yalnız o araca");

    var detail = GarageViewModel.Detail(flow, car);
    Check(detail.Stats.Length == 5 && detail.Parts.SequenceEqual(flow.Setup(car).Parts) && detail.Features.Length > 0, "ayrıntı satırları kurulumdan");
    Check(GarageViewModel.DriveTireModes.Length == 6 && GarageViewModel.DriveTireModes[0].Key == "", "yarış lastiği seçenekleri");
    Console.WriteLine($"Garaj sunum katmanı: komut/doğrudan işlem eşitliği, sökme/iade, iki araç ve paket; {checks} koşul geçti.");
  }
}
