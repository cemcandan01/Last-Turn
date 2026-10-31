using LastTurn.Core;

internal static class GarageValidation
{
  private static int checks;
  private static void Check(bool ok, string label)
  {
    checks++;
    if (!ok) throw new InvalidOperationException("Garaj eşdeğerliği: " + label);
  }

  private static void Compare(CatalogNode expected, CatalogNode actual, string label)
  {
    if (expected.ToString().StartsWith("{", StringComparison.Ordinal))
    {
      Check(actual.ToString().StartsWith("{", StringComparison.Ordinal), label + " nesne türü");
      Check(expected.Fields.Count() == actual.Fields.Count(), label + " alan sayısı");
      foreach (var p in expected.Fields)
      {
        Check(actual.Has(p.Key), label + " eksik alan " + p.Key);
        Compare(p.Value, actual[p.Key], label + "/" + p.Key);
      }
    }
    else if (expected.ToString().StartsWith("[", StringComparison.Ordinal))
    {
      Check(actual.ToString().StartsWith("[", StringComparison.Ordinal), label + " dizi türü");
      var a = expected.Items.ToArray(); var b = actual.Items.ToArray();
      Check(a.Length == b.Length, label + " dizi uzunluğu");
      for (int i = 0; i < a.Length; i++) Compare(a[i], b[i], label + "/" + i);
    }
    else if (expected.IsNumber)
      Check(actual.IsNumber && Math.Abs(expected.N() - actual.N()) <= 1e-9 + Math.Abs(expected.N()) * 1e-10,
        label + " sayı " + expected + " != " + actual);
    else Check(expected.ToString() == actual.ToString(), label + " değer " + expected + " != " + actual);
  }

  private static void State(CatalogNode expected, GarageState state, string label)
  {
    Compare(expected["snapshot"], state.Snapshot(), label + " snapshot");
    Compare(expected["balance"], CatalogNode.Num(state.Balance), label + " bakiye");
    Compare(expected["level"], CatalogNode.Num(state.Level), label + " seviye");
    var parts = state.Catalog.Data["parts"].Items.ToArray();
    for (int car = 0; car < state.Catalog.Data["cars"].Items.Count(); car++)
    {
      Check(expected["ownedCars"][car].B() == state.OwnsCar(car), label + " araç sahipliği " + car);
      Compare(expected["ownedParts"][car], CatalogNode.Arr(parts.Where(p => state.OwnsPart(car, p["id"].S())).Select(p => CatalogNode.Str(p["id"].S()))), label + " parça sahipliği " + car);
    }
    var s = state.Setup(state.SelectedCar);
    var setup = CatalogNode.Obj(); setup.Set("hp", s.Car["hp"]); setup.Set("kg", s.Car["kg"]);
    setup.Set("tire", CatalogNode.Num(s.Tire)); setup.Set("pk", CatalogNode.Str(s.Preset));
    setup.Set("tu", s.Tuning); setup.Set("as", s.Assists);
    Compare(expected["setup"], setup, label + " seçili sürüş kurulumu");
  }

  private static CatalogNode? Execute(CatalogNode op, ref GarageState state)
  {
    var catalog = state.Catalog;
    int car = (int)op["car"].N(); string id = op["id"].S();
    var ids = op["ids"].Items.Select(p => p.S()).ToArray();
    CatalogNode Bool(bool value) => CatalogNode.Parse(value ? "true" : "false");
    switch (op["kind"].S())
    {
      case "money": return CatalogNode.Num(state.AddMoney(op["amount"].N()));
      case "xp": state.AddXp(op["amount"].N()); return null;
      case "buyCar": return Bool(state.BuyCar(car));
      case "block": return CatalogNode.Str(state.CarPurchaseBlock(car));
      case "cost": return CatalogNode.Num(state.PartsCost(car, ids));
      case "buyParts": return Bool(state.BuyParts(car, ids));
      case "equip": return Bool(state.Equip(car, id));
      case "unequip": return Bool(state.Unequip(car, op["category"].S()));
      case "package": return Bool(state.EquipPackage(car, id));
      case "stock": return Bool(state.Stock(car));
      case "select": return Bool(state.SelectCar(car));
      case "reload": state = GarageState.Restore(catalog, state.Snapshot()); return null;
      default: throw new InvalidOperationException("Bilinmeyen garaj işlemi.");
    }
  }

  public static void Run()
  {
    string unity = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../"));
    var catalog = new VehicleCatalog(File.ReadAllText(Path.Combine(unity, "Assets/LastTurn/Resources/vehicle-catalog.json")));
    var fixture = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference/garage-operations-0.8.18.json")));
    Check(fixture["schema"].N() == 1 && fixture["baseline"].S() == VehicleCatalog.Baseline, "kaynak sürümü");
    int operations = 0, migrations = 0, rejected = 0;
    foreach (var scenario in fixture["scenarios"].Items.Concat(fixture["migrations"].Items))
    {
      string label = scenario["name"].S();
      if (scenario["expectedRejected"].B())
      {
        bool fail = false;
        try { _ = GarageState.Restore(catalog, scenario["seed"]); } catch (ArgumentException) { fail = true; }
        Check(fail, "açıkça desteklenmeyen eski TS kaydı reddedildi"); rejected++; continue;
      }
      bool seeded = scenario["seed"].ToString() != "null";
      var state = seeded ? GarageState.Restore(catalog, scenario["seed"]) : new GarageState(catalog);
      if (seeded) migrations++;
      State(scenario["initial"], state, label + "/başlangıç");
      foreach (var step in scenario["steps"].Items)
      {
        string before = state.Snapshot().ToString();
        var actual = Execute(step["op"], ref state);
        Compare(step["result"], actual ?? CatalogNode.Parse("null"), label + "/sonuç");
        if (actual != null && actual.ToString() == "false")
          Check(before == state.Snapshot().ToString(), label + " reddedilen işlem durumu değiştirmedi");
        State(step, state, label + "/" + operations); operations++;
      }
    }
    Check(operations > 50 && migrations >= 3 && rejected == 1, "boş olmayan işlem ve sürüm kapsamı");
    // UI'nin TS'de erişilemeyen girdileri C# sınırında da değişiklik yapamaz.
    var invalid = new GarageState(catalog); string unchanged = invalid.Snapshot().ToString();
    foreach (int car in new[] { -1, 15, int.MaxValue })
    {
      Check(!invalid.BuyCar(car) && !invalid.BuyParts(car, new[] { "motor-sokak" }) && !invalid.SelectCar(car), "geçersiz araç reddi");
      Check(unchanged == invalid.Snapshot().ToString(), "geçersiz araç kayıt koruması");
    }
    Console.WriteLine($"Garaj TS–C#: {operations} işlem, {migrations} güvenli kayıt yükleme/geçişi, {rejected} desteklenmeyen sürüm reddi; {checks} koşul geçti.");
  }
}
