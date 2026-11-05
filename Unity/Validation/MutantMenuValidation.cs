using System.Text.Json;
using LastTurn.Core;

internal static class MutantMenuValidation
{
  public static void Run()
  {
    var fixture = CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference/mutant-menu-0.8.18.json")));
    string unity = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../.."));
    var catalog = CatalogNode.Parse(File.ReadAllText(Path.Combine(unity, "Assets/LastTurn/Resources/mutant-catalog.json")));
    var vehicles = new VehicleCatalog(File.ReadAllText(Path.Combine(unity, "Assets/LastTurn/Resources/vehicle-catalog.json")));
    int checks = 0; double maximumError = 0;
    void Check(bool ok, string label) { checks++; if (!ok) throw new Exception("Mutant menü: " + label); }
    void Compare(CatalogNode expected, CatalogNode actual, string path)
    {
      if (expected.IsNumber)
      {
        double error = Math.Abs(expected.N() - actual.N()); maximumError = Math.Max(maximumError, error);
        Check(actual.IsNumber && error < 1e-9, path + " sayı TS=" + expected + " C#=" + actual); return;
      }
      if (expected.Fields.Any())
      {
        Check(expected.Fields.Select(p => p.Key).ToHashSet().SetEquals(actual.Fields.Select(p => p.Key)), path + " nesne alanları");
        foreach (var pair in expected.Fields) Compare(pair.Value, actual[pair.Key], path + "." + pair.Key);
        return;
      }
      if (expected.Items.Any() || expected.ToString() == "[]")
      {
        var e = expected.Items.ToArray(); var a = actual.Items.ToArray(); Check(e.Length == a.Length, path + " dizi uzunluğu");
        for (int i = 0; i < e.Length; i++) Compare(e[i], a[i], path + "[" + i + "]"); return;
      }
      Check(expected.ToString() == actual.ToString(), path + " değer TS=" + expected + " C#=" + actual);
    }
    CatalogNode Json(object value) => CatalogNode.Parse(JsonSerializer.Serialize(value));
    object Choice(MutantChoiceCard c) => new { id = c.Id, value = new[] { c.Type, c.Name, c.Description } };
    object Project(MutantMenuModel m) => new
    {
      phase = m.Phase, region = m.Region, level = m.Level, test = m.Test, finished = m.Finished, wrecked = m.Wrecked, defeatedBosses = m.DefeatedBosses,
      startingCarsCards = m.StartingCarsCards.Select(c => new { id = c.Id, name = c.Name, hp = c.Hp }).ToArray(),
      ownedSkills = m.OwnedSkills.Select(s => new { id = s.Id, name = s.Name }).ToArray(),
      remaining = m.Remaining, timer = m.Timer, body = m.Body, money = m.Money, xp = m.Xp, nextLevelXp = m.NextLevelXp,
      carName = m.CarName, bossName = m.BossName, bossDescription = m.BossDescription, bossWeakness = m.BossWeakness,
      bossType = m.BossType, bossAbilities = m.BossAbilities, bossTrackIndex = m.BossTrackIndex, bossTarget = m.BossTarget,
      repairCost = m.RepairCost, refreshCost = m.RefreshCost, canRefresh = m.CanRefresh, showRepair = m.ShowRepair, canRepair = m.CanRepair, powerLossPercent = m.PowerLossPercent,
      choices = m.Choices.Select(Choice).ToArray(), passiveNames = m.PassiveNames, installedPartNames = m.InstalledPartNames, skillNames = m.SkillNames,
      stock = m.Stock.Select(p => new { id = p.Id, name = p.Name, description = p.Description, category = p.Category, price = p.Price, canBuy = p.CanBuy }).ToArray(),
      events = m.Events.Select(e => new { id = e.Id, trackIndex = e.TrackIndex, name = e.Name, type = e.Type, title = e.Title, street = e.Street, levelName = e.LevelName,
        x = e.X, z = e.Z, done = e.Done, duel = e.Duel,
        risks = e.Risks.Select(r => new { risk = r.Risk, name = r.Name, target = r.Target, xp = r.Xp, money = r.Money, penalty = r.Penalty, consolation = r.Consolation }).ToArray() }).ToArray(),
      chests = m.Chests.Select(c => new { id = c.Id, title = c.Title, offer = c.Offer, name = c.Name, description = c.Description,
        curseName = c.CurseName, curseDescription = c.CurseDescription, opened = c.Opened, inspected = c.Inspected, cursed = c.Cursed, x = c.X, z = c.Z }).ToArray()
    };
    Check(fixture["baseline"].S() == VehicleCatalog.Baseline && catalog["baseline"].S() == VehicleCatalog.Baseline, "Sabit kaynak SHA");
    foreach (var draw in fixture["initialCars"].Items)
    {
      int[] actual = MutantMenuModel.StartingCars((uint)draw["seed"].N(), catalog, draw["test"].B());
      Compare(draw["cars"], Json(actual), "başlangıç araçları");
      Check(actual.Distinct().Count() == actual.Length && actual.All(i => i >= 0 && i < vehicles.Data["cars"].Items.Count()), "benzersiz/geçerli araç adayları");
    }
    var run = new MutantRun(42, catalog);
    var control=new MutantRun(42,catalog);string initial=run.State.ToString();
    for(int i=0;i<5;i++)MutantMenuModel.Read(run,vehicles);
    Check(run.State.ToString()==initial,"F başlangıç görünümü mutasyonsuz");
    foreach(var car in MutantMenuModel.Read(run,vehicles).StartingCarsCards)
    {
      Check(car.Mass==vehicles.Data["cars"][car.Id]["kg"].N(),"Başlangıç kütlesi kaynak katalogdan");
      Check(car.Type==vehicles.Data["cars"][car.Id]["ty"].S(),"Başlangıç türü kaynak katalogdan");
      Check(car.Drive.Length>0,"Başlangıç çekiş metni");
    }
    string id=MutantMenuModel.Read(run,vehicles).Choices[0].Id;
    Check(run.Choose(id)&&control.Choose(id)&&run.State.ToString()==control.State.ToString(),"F görünüm okuması sonraki RNG/başlangıç seçimini değiştirmez");
    foreach (var choice in fixture["choices"].Items)
    {
      run.State.Set("beceriler", choice["skills"].Clone()); string before = run.State.ToString();
      var actual = MutantMenuModel.Choice(run, choice["id"].S());
      Compare(choice["expected"], Json(new[] { actual.Type, actual.Name, actual.Description }), "seçim " + choice["id"].S());
      Check(run.State.ToString() == before, "seçim kartı salt okunur");
    }
    foreach (var row in fixture["states"].Items)
    {
      var sample = new MutantRun((uint)row["seed"].N(), catalog, row["test"].B());
      foreach (var pair in row["state"].Fields) sample.State.Set(pair.Key, pair.Value.Clone());
      string before = sample.State.ToString(); string definitionsBefore = catalog.ToString();
      var actual = MutantMenuModel.Read(sample, vehicles, (int)row["car"].N());
      Compare(row["expected"], Json(Project(actual)), "görünüm");
      Check(sample.State.ToString() == before && catalog.ToString() == definitionsBefore, "görünüm ve sandık salt okunur");
      foreach (int car in new[] { -2, vehicles.Data["cars"].Items.Count() })
      {
        bool rejected = false; try { MutantMenuModel.Read(sample, vehicles, car); } catch (ArgumentOutOfRangeException) { rejected = true; }
        Check(rejected && sample.State.ToString() == before, "araç indeks sınırı durumu değiştirmez");
      }
    }
    foreach (var time in fixture["times"].Items) Check(MutantMenuModel.Time(time["seconds"].N()) == time["text"].S(), "süre etiketi");
    var small = CatalogNode.Parse("{\"carsCount\":2,\"startingCars\":[0,1]}");
    Check(MutantMenuModel.StartingCars(1, small).Length == 2, "üçten az adayda kaynak sınırı");
    small.Set("startingCars", CatalogNode.Arr(Array.Empty<CatalogNode>()));
    Check(MutantMenuModel.StartingCars(1, small).Length == 0, "boş adayda kaynak sınırı");
    Console.WriteLine($"Mutant menü: {checks} koşul; 14 başlangıç, 59 seçim kartı, 9 görünüm durumu; en büyük fark {maximumError:G3}.");
  }
}
