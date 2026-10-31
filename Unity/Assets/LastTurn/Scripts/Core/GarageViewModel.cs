using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // Sunum için tipli, salt okunur garaj görünümü. Katalog JSON anahtarları ve kurallar burada kalır; IMGUI, UI Toolkit
  // veya UGUI ekranı yalnız bu satırları çizer ve satırdaki komutu oturuma verir.
  public sealed class GarageCarRow
  {
    public int Index; public string Name = "", Description = "", Block = "", BlockText = "";
    public bool Owned, Selected; public double Price, RequiredLevel;
    public GarageCommand Primary = null!;
  }

  public sealed class GaragePartRow
  {
    public string Id = "", Name = "", Description = ""; public bool Owned, Equipped; public double Cost;
    public GarageCommand Command = null!;
  }

  public sealed class GaragePackageRow
  {
    public string Id = "", Name = ""; public bool Owned; public double Cost; public GarageCommand Command = null!;
  }

  public sealed class GarageStatRow { public string Key = "", Label = ""; public double Current, Preview; }
  public sealed class GarageFeatureRow { public string Name = ""; public double Score; }

  public sealed class GarageCarDetail
  {
    public string Name = "", Description = "", Class = "", PreviewClass = "", TireName = "";
    public double Score, PreviewScore, Power, Mass;
    public string[] Parts = Array.Empty<string>();
    public GarageStatRow[] Stats = Array.Empty<GarageStatRow>();
    public GarageFeatureRow[] Features = Array.Empty<GarageFeatureRow>();
  }

  public static class GarageViewModel
  {
    private static readonly (string Key, string Label)[] StatLabels =
      { ("hiz", "Azami hız (km/sa)"), ("ivme", "0–100 (sn)"), ("tutus", "Yol tutuşu"), ("fren", "100–0 (m)"), ("arazi", "Arazi") };

    // TS yarış lastiği seçimleri; boş anahtar takılı lastiktir.
    public static readonly (string Key, string Label)[] DriveTireModes =
      { ("", "Takılı"), ("gp", "Asfalt"), ("rx", "Rallikros"), ("rl", "Ralli"), ("dp", "Drift"), ("dg", "Drag") };

    /// TS LEVELS: yardım seviyeleri (anahtar, ad, açıklama) ve seçili olan.
    public static (string Key, string Name, string Description, bool Selected)[] AssistLevels(GarageState state)
      => state.Catalog.Data["levels"].Fields.Select(l => (l.Key, l.Value["n"].S(), l.Value["d"].S(), l.Key == state.AssistLevel)).ToArray();

    public static string BlockText(string block)
    {
      switch (block)
      {
        case "seviye": return "XP seviyesi veya aynı tür kupa başarısı gerekli.";
        case "para": return "Satın almak için bakiye yetersiz.";
        case "sahip": return "Sahip olunan araç.";
        case "gecersiz": return "Geçersiz araç.";
        default: return "Satın alınabilir.";
      }
    }

    public static GarageCarRow[] Cars(GarageState state)
    {
      var catalog = state.Catalog; var cars = catalog.Data["cars"].Items.ToArray();
      var rows = new GarageCarRow[cars.Length];
      for (int i = 0; i < cars.Length; i++)
      {
        var price = catalog.Data["prices"]["cars"][i]; bool owned = state.OwnsCar(i); string block = state.CarPurchaseBlock(i);
        rows[i] = new GarageCarRow
        {
          Index = i, Name = cars[i]["n"].S(), Description = cars[i]["d"].S(), Owned = owned, Selected = state.SelectedCar == i,
          Price = price["para"].N(), RequiredLevel = price["seviye"].N(), Block = block, BlockText = BlockText(block),
          Primary = owned ? GarageCommand.SelectCar(i) : GarageCommand.BuyCar(i),
        };
      }
      return rows;
    }

    public static (string Id, string Label)[] Categories(VehicleCatalog catalog)
      => catalog.Data["categories"].Items.Select(c => (c[0].S(), c[1].S())).ToArray();

    // Takılı parçanın komutu kategorisini söker (TS garaj.ts), sahip olunan takar, olmayan satın alıp takar.
    public static GaragePartRow[] Parts(GarageState state, int car, string category)
    {
      var equipped = state.Equipped(car);
      return state.Catalog.Data["parts"].Items.Where(p => p["kat"].S() == category).Select(p =>
      {
        string id = p["id"].S(); bool owned = state.OwnsPart(car, id), on = equipped.Contains(id);
        return new GaragePartRow
        {
          Id = id, Name = p["n"].S(), Description = p["d"].S(), Owned = owned, Equipped = on, Cost = state.PartsCost(car, new[] { id }),
          Command = on ? GarageCommand.UnequipCategory(car, category) : owned ? GarageCommand.EquipPart(car, id) : GarageCommand.BuyAndEquipPart(car, id),
        };
      }).ToArray();
    }

    public static GaragePackageRow[] Packages(GarageState state, int car)
      => state.Catalog.Data["packages"].Items.Select(p =>
      {
        string id = p["id"].S(); var ids = GarageCommand.PackageParts(state, id); bool owned = ids.All(x => state.OwnsPart(car, x));
        return new GaragePackageRow
        {
          Id = id, Name = p["n"].S(), Owned = owned, Cost = state.PartsCost(car, ids),
          Command = owned ? GarageCommand.EquipPackage(car, id) : GarageCommand.BuyAndEquipPackage(car, id),
        };
      }).ToArray();

    public static GarageCarDetail Detail(GarageState state, int car, string previewPart = "")
    {
      var catalog = state.Catalog; var setup = state.Setup(car);
      var current = CatalogPerformance.Calculate(catalog, setup);
      var ids = state.Equipped(car).Concat(string.IsNullOrEmpty(previewPart) ? Array.Empty<string>() : new[] { previewPart });
      var preview = CatalogPerformance.Calculate(catalog, catalog.Setup(car, ids));
      var data = catalog.Data["cars"][car];
      return new GarageCarDetail
      {
        Name = data["n"].S(), Description = data["d"].S(),
        Class = current["sinif"].S(), Score = current["puan"].N(), PreviewClass = preview["sinif"].S(), PreviewScore = preview["puan"].N(),
        Stats = StatLabels.Select(s => new GarageStatRow { Key = s.Key, Label = s.Label, Current = current[s.Key].N(), Preview = preview[s.Key].N() }).ToArray(),
        Power = setup.Car["hp"].N(), Mass = setup.Car["kg"].N(), TireName = catalog.Data["tires"][setup.Tire]["n"].S(),
        Parts = setup.Parts.ToArray(),
        Features = current["ozellikler"].Items.Select(f => new GarageFeatureRow { Name = f["ad"].S(), Score = f["puan"].N() }).ToArray(),
      };
    }
  }
}
