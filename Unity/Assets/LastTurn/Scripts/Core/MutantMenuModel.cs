#nullable enable
using System;
using System.Globalization;
using System.Linq;

namespace LastTurn.Core
{
  public sealed class MutantStartCarCard
  {
    public int Id;
    public string Name = "";
    public double Hp;
  }
  public sealed class MutantOwnedSkillCard
  {
    public string Id = "", Name = "";
  }
  public sealed class MutantChoiceCard
  {
    public string Id = "", Type = "", Name = "", Description = "";
  }
  public sealed class MutantStockCard
  {
    public string Id = "", Name = "", Description = "", Category = "";
    public double Price;
    public bool CanBuy;
  }
  public sealed class MutantRiskCard
  {
    public int Risk;
    public string Name = "";
    public double Target, Xp, Money, Penalty, Consolation;
  }
  public sealed class MutantEventCard
  {
    public int Id, TrackIndex;
    public string Name = "", Type = "", Title = "", LevelName = "", Street = "";
    public double X, Z;
    public bool Done, Duel;
    public MutantRiskCard[] Risks = Array.Empty<MutantRiskCard>();
  }
  public sealed class MutantChestCard
  {
    public int Id;
    public string Title = "", Offer = "", Name = "", Description = "", CurseName = "", CurseDescription = "";
    public bool Opened, Inspected, Cursed;
    public double X, Z;
  }

  // Salt sunum: Read hiçbir koşu işlemi çalıştırmaz; sandık teklifi bile komut katmanında açılır.
  public sealed class MutantMenuModel
  {
    public string Phase = "", Timer = "", CarName = "", BossName = "", BossDescription = "", BossWeakness = "", BossType = "";
    public string[] BossAbilities = Array.Empty<string>(), PassiveNames = Array.Empty<string>(), SkillNames = Array.Empty<string>(), InstalledPartNames = Array.Empty<string>();
    public int Region, Level, SelectedCar, BossTrackIndex, DefeatedBosses;
    public bool Test, Finished, Wrecked, CanRepair, ShowRepair, CanRefresh;
    public double Remaining, Body, Money, Xp, NextLevelXp, RepairCost, RefreshCost, PowerLossPercent, BossTarget;
    public MutantChoiceCard[] Choices = Array.Empty<MutantChoiceCard>();
    public MutantStockCard[] Stock = Array.Empty<MutantStockCard>();
    public MutantEventCard[] Events = Array.Empty<MutantEventCard>();
    public MutantChestCard[] Chests = Array.Empty<MutantChestCard>();
    public MutantStartCarCard[] StartingCarsCards = Array.Empty<MutantStartCarCard>();
    public MutantOwnedSkillCard[] OwnedSkills = Array.Empty<MutantOwnedSkillCard>();

    public static int[] StartingCars(uint seed, CatalogNode catalog, bool test = false)
    {
      if (test) return Enumerable.Range(0, (int)catalog["carsCount"].N()).ToArray();
      var candidates = catalog["startingCars"].Items.Select(x => (int)x.N()).ToList();
      var random = new SeededRandom(seed ^ 0x5bd1e995u);
      var result = new System.Collections.Generic.List<int>();
      while (result.Count < 3 && candidates.Count > 0)
      {
        int at = (int)Math.Floor(random.Next() * candidates.Count);
        result.Add(candidates[at]); candidates.RemoveAt(at);
      }
      return result.ToArray();
    }

    private static CatalogNode Find(CatalogNode definitions, string id) => definitions.Items.FirstOrDefault(x => x["id"].S() == id)
      ?? throw new ArgumentException("Sunum tanımı bulunamadı: " + id);
    private static CatalogNode Passive(CatalogNode catalog, string id) => catalog["passives"].Items.Concat(catalog["addons"].Items).FirstOrDefault(x => x["id"].S() == id)
      ?? throw new ArgumentException("Pasif tanımı bulunamadı: " + id);
    private static string Value(CatalogNode node) => node.IsNumber ? node.N().ToString("G", CultureInfo.InvariantCulture) : node.ToString();
    private static double Round(double n) => Math.Floor(n + .5);
    public static string Time(double seconds) => Math.Floor(seconds / 60).ToString(CultureInfo.InvariantCulture) + ":" + Math.Floor(seconds % 60).ToString("00", CultureInfo.InvariantCulture);
    private static string SkillName(CatalogNode catalog, CatalogNode skill)
    {
      var definition = Find(catalog["skills"], skill["id"].S());
      var evolution = definition["evrimler"].Items.FirstOrDefault(x => x["id"].S() == skill["evrim"].S());
      return definition["ad"].S() + " Sv" + skill["seviye"].N().ToString(CultureInfo.InvariantCulture) + (evolution == null ? "" : " · " + evolution["ad"].S());
    }
    public static MutantChoiceCard Choice(MutantRun run, string id)
    {
      var catalog = run.Catalog;
      var card = new MutantChoiceCard { Id = id };
      var parts = id.Split(':');
      if (parts.Length == 1)
      {
        var p = Passive(catalog, id); card.Type = "Pasif"; card.Name = p["ad"].S(); card.Description = p["d"].S(); return card;
      }
      if (parts.Length < 2) throw new ArgumentException("Seçim kimliği eksik.", nameof(id));
      string kind = parts[0], a = parts[1];
      if (kind == "e")
      {
        if (parts.Length != 3) throw new ArgumentException("Eklenti hedefi eksik.", nameof(id));
        var addon = Find(catalog["skillAddons"], a);
        card.Type = "Skill eklentisi → " + Find(catalog["skills"], parts[2])["ad"].S(); card.Name = addon["ad"].S(); card.Description = addon["d"].S(); return card;
      }
      var skill = Find(catalog["skills"], a);
      if (kind == "b")
      {
        card.Type = "Skill · " + (skill["tur"].S() == "aktif" ? "tuşla" : "kendiliğinden"); card.Name = skill["ad"].S(); card.Description = skill["d"].S(); return card;
      }
      if (kind == "y")
      {
        var instance = Find(run.State["beceriler"], a); int level = (int)instance["seviye"].N();
        var previous = skill["seviyeler"][level - 1]; var next = skill["seviyeler"][level];
        if (!next.Fields.Any()) throw new ArgumentException("Son seviyeden sonra seçim bulunmaz.", nameof(id));
        card.Type = "Skill seviyesi"; card.Name = skill["ad"].S() + " Sv" + (level + 1);
        card.Description = string.Join(", ", next.Fields.Where(p => p.Value.ToString() != previous[p.Key].ToString()).Select(p => p.Key + " " + Value(previous[p.Key]) + " → " + Value(p.Value))); return card;
      }
      if (kind == "v" && parts.Length == 3)
      {
        var evolution = Find(skill["evrimler"], parts[2]); card.Type = "Evrim · " + skill["ad"].S(); card.Name = evolution["ad"].S(); card.Description = evolution["d"].S(); return card;
      }
      throw new ArgumentException("Seçim türü bulunamadı: " + id, nameof(id));
    }

    private static string EventTitle(string type, string street)
    {
      if (street != "") return street == "ab" ? "Sokak: A→B" : street == "tur" ? "Sokak: blok turu" : "Sokak: kovalamaca";
      switch (type) { case "gp": return "Asfalt yarışı"; case "rx": return "Rallikros"; case "rl": return "Toprak / ralli"; case "dp": return "Drift"; case "dg": return "Drag"; default: throw new ArgumentException("Yarış türü bulunamadı."); }
    }
    public static MutantMenuModel Read(MutantRun run, VehicleCatalog vehicles, int selectedCar = -1)
    {
      int count = vehicles.Data["cars"].Items.Count();
      if (selectedCar < -1 || selectedCar >= count) throw new ArgumentOutOfRangeException(nameof(selectedCar));
      var state = run.State; var catalog = run.Catalog; var boss = state["boss"];
      var bossTrack = run.BossTrack();
      var model = new MutantMenuModel
      {
        Phase = state["faz"].S(), Region = run.Region, Level = (int)state["seviye"].N(), Test = state["test"].B(), Finished = run.Finished,
        DefeatedBosses = (int)state["yenilenBoss"].N(),
        Wrecked = state["pert"].B(), Remaining = state["kalan"].N(), Timer = Time(state["kalan"].N()), Body = state["govde"].N(),
        Money = state["para"].N(), Xp = state["xp"].N(), NextLevelXp = MutantRun.LevelXp((int)state["seviye"].N() + 1),
        SelectedCar = selectedCar, CarName = selectedCar < 0 ? "" : vehicles.Data["cars"][selectedCar]["n"].S(),
        BossName = boss["ad"].S(), BossDescription = boss["d"].S(), BossWeakness = boss["zayif"].S(), BossType = boss["ty"].S(),
        BossAbilities = boss["yetenekler"].Items.Select(x => x.S()).ToArray(), BossTrackIndex = (int)bossTrack["i"].N(), BossTarget = run.BossTarget(bossTrack),
        RepairCost = run.RepairCost, RefreshCost = catalog["stockRefresh"].N(),
        CanRefresh = state["para"].N() >= catalog["stockRefresh"].N(), ShowRepair = state["govde"].N() < catalog["body"]["tam"].N(),
        CanRepair = state["govde"].N() < catalog["body"]["tam"].N() && state["para"].N() >= catalog["body"]["tamirFiyati"].N(),
        PowerLossPercent = Round(catalog["body"]["gucKaybi"].N() * (100 - state["govde"].N())),
        Choices = state["secenekler"].Items.Select(x => Choice(run, x.S())).ToArray(),
        PassiveNames = state["pasifler"].Items.Select(x => Passive(catalog, x.S())["ad"].S()).ToArray(),
        InstalledPartNames = state["parcalar"].Items.Select(x => Find(catalog["parts"], x.S())["n"].S()).ToArray(),
        SkillNames = state["beceriler"].Items.Select(x => SkillName(catalog, x) + (x["eklentiler"].Items.Any() ? " (" + string.Join(", ", x["eklentiler"].Items.Select(a => Find(catalog["skillAddons"], a.S())["ad"].S())) + ")" : "")).ToArray(),
        StartingCarsCards = StartingCars((uint)state["tohum"].N(), catalog, state["test"].B()).Select(i => new MutantStartCarCard { Id = i, Name = vehicles.Data["cars"][i]["n"].S(), Hp = vehicles.Data["cars"][i]["hp"].N() }).ToArray(),
        OwnedSkills = state["beceriler"].Items.Select(x => new MutantOwnedSkillCard { Id = x["id"].S(), Name = SkillName(catalog, x) }).ToArray()
      };
      model.Stock = state["stok"].Items.Select(x =>
      {
        string id = x.S(); var part = Find(catalog["parts"], id); double price = run.PartPrice((int)part["sv"].N(), id);
        return new MutantStockCard { Id = id, Name = part["n"].S(), Description = part["d"].S(), Price = price, CanBuy = model.Money >= price,
          Category = vehicles.Data["categories"].Items.First(c => c[0].S() == part["kat"].S())[1].S() };
      }).ToArray();
      model.Events = state["etkinlikler"].Items.Select(e =>
      {
        int index = (int)e["i"].N(); var track = catalog["tracks"].Items.First(t => t["i"].N() == index);
        var reward = catalog["eventRewards"][(int)e["sev"].N() - 1];
        return new MutantEventCard { Id = (int)e["id"].N(), TrackIndex = index, Name = catalog["trackNames"][index].S(),
          Type = e["ty"].S(), Street = e["sokak"].S(), Title = e["rakip"].B() ? "Düello" : EventTitle(e["ty"].S(), e["sokak"].S()), LevelName = catalog["levelNames"][(int)e["sev"].N() - 1].S(),
          X = e["x"].N(), Z = e["z"].N(), Done = e["yapildi"].B(), Duel = e["rakip"].B() || e["sokak"].S() == "kovala",
          Risks = catalog["risks"].Items.Take(e["rakip"].B() || e["sokak"].S() == "kovala" ? 2 : 3).Select((risk, i) => new MutantRiskCard { Risk = i, Name = risk["ad"].S(), Target = e["rakip"].B() || e["sokak"].S() == "kovala" ? 0 : MutantRun.EventTarget(track, i)["limit"].N(),
            Xp = Round(reward["xp"].N() * risk["odul"].N()), Money = Round(reward["para"].N() * risk["odul"].N()),
            Penalty = risk["ceza"].N(), Consolation = Round(reward["para"].N() * risk["kacirma"].N()) }).ToArray() };
      }).ToArray();
      model.Chests = state["sandiklar"].Items.Select(chest =>
      {
        string offer = chest["secenekler"][0].S();
        var definition = catalog["passives"].Items.Concat(catalog["addons"].Items).Concat(catalog["chestResources"].Items).FirstOrDefault(x => x["id"].S() == offer);
        var curse = catalog["curses"][chest["lanet"].S()];
        return new MutantChestCard { Id = (int)chest["id"].N(), Title = chest["lanetli"].B() ? "Lanetli sandık" : "Gizli sandık", X = chest["x"].N(), Z = chest["z"].N(),
          Opened = chest["acildi"].B(), Inspected = chest["incelendi"].B(), Cursed = chest["lanetli"].B(), Offer = offer,
          Name = definition?["ad"].S() ?? "", Description = definition?["d"].S() ?? "", CurseName = curse["ad"].S(), CurseDescription = curse["d"].S() };
      }).ToArray();
      return model;
    }
  }
}
