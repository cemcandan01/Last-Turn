using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace LastTurn.Core
{
  // TS 0.8.18 ilerleme/modifiye işlemleri. Disk, saat ve Unity arayüzü bu sınıfa girmez.
  public sealed class GarageState
  {
    public const int Version = 1;
    // Kaydın katalog nesli. Katalog yeni TS kaynağından yeniden üretilince artırılır, eski SHA aşağıdaki tabloya kendi
    // nesliyle eklenir. Eski nesil kayıt güncel kataloğa geçirilir; daha yeni ya da bilinmeyen kaynak salt okunur kalır.
    public const int CatalogGeneration = 1;
    private static readonly Dictionary<string, int> KnownBaselines =
      new Dictionary<string, int>(StringComparer.Ordinal) { [VehicleCatalog.Baseline] = CatalogGeneration };
    public enum SourceAge { Current, Older, Unsupported }
    private const double MaxExactInteger = 9007199254740991;
    private readonly Dictionary<string, CatalogNode> parts;
    private readonly Dictionary<string, double> purchases = new Dictionary<string, double>(StringComparer.Ordinal);
    private readonly List<string> extraOpen = new List<string>();
    private readonly Dictionary<string, int> stars = new Dictionary<string, int>(StringComparer.Ordinal);
    private readonly Dictionary<int, string[]> equipped = new Dictionary<int, string[]>();
    private double earned, xp;

    public VehicleCatalog Catalog { get; }
    public int SelectedCar { get; private set; }
    // Yüklenen kaydın nesli; güncelden küçükse kayıt bu oturumda geçirildi ve ilk yazmada güncellenir.
    public int SourceGeneration { get; private set; } = CatalogGeneration;
    public double Xp => xp;
    public double Balance => Math.Max(0, earned - purchases.Values.Sum());
    // Aynı seviye tabanını ikili arar; bozuk/büyük XP'de milyonlarca döngü çalıştırmaz.
    public int Level
    {
      get
      {
        int low = 1, high = 2;
        while (VehicleCatalog.LevelBase(high) <= xp) high *= 2;
        while (high - low > 1)
        {
          int middle = low + (high - low) / 2;
          if (VehicleCatalog.LevelBase(middle) <= xp) low = middle; else high = middle;
        }
        return low;
      }
    }

    public GarageState(VehicleCatalog catalog)
    {
      Catalog = catalog ?? throw new ArgumentNullException(nameof(catalog));
      parts = catalog.Data["parts"].Items.ToDictionary(p => p["id"].S(), StringComparer.Ordinal);
      SelectedCar = (int)catalog.Data["prices"]["initialCar"].N();
      if (!ValidCar(SelectedCar)) throw new ArgumentException("Başlangıç aracı bulunamadı.");
    }

    private bool ValidCar(int car) => car >= 0 && car < Catalog.Data["cars"].Items.Count();
    private static string CarKey(int car) => "arac_" + car.ToString(CultureInfo.InvariantCulture);
    private static string PartPrefix(int car) => "parca_" + car.ToString(CultureInfo.InvariantCulture) + "_";
    private int ReadStars(string type, int level)
    {
      string key;
      switch (type)
      {
        case "gp": key = "asphalt"; break;
        case "rx": key = "dirt"; break;
        case "rl": key = "rally"; break;
        case "dp": key = "drift"; break;
        case "dg": key = "drag"; break;
        default: return 0;
      }
      return stars.TryGetValue(key + "_" + level.ToString(CultureInfo.InvariantCulture), out int n) ? n : 0;
    }

    public bool OwnsCar(int car)
    {
      if (!ValidCar(car)) return false;
      var price = Catalog.Data["prices"]["cars"][car];
      return (price["para"].N() <= 0 && Level >= price["seviye"].N()) || purchases.ContainsKey(CarKey(car)) || extraOpen.Contains(CarKey(car));
    }

    public bool OwnsPart(int car, string id)
      => ValidCar(car) && id != null && (Catalog.PartPrice(id) <= 0 || purchases.ContainsKey(PartPrefix(car) + id));

    public string[] Equipped(int car)
    {
      if (!ValidCar(car) || !equipped.TryGetValue(car, out var ids)) return Array.Empty<string>();
      return Catalog.Normalize(ids).Where(id => OwnsPart(car, id)).ToArray();
    }

    public bool SelectCar(int car)
    {
      if (!OwnsCar(car)) return false;
      SelectedCar = car;
      return true;
    }

    public string CarPurchaseBlock(int car)
    {
      if (!ValidCar(car)) return "gecersiz";
      if (OwnsCar(car)) return "sahip";
      if (!Catalog.VehicleAccess(car, Level, ReadStars)) return "seviye";
      return Balance < Catalog.Data["prices"]["cars"][car]["para"].N() ? "para" : "";
    }

    public bool BuyCar(int car)
    {
      if (CarPurchaseBlock(car) != "") return false;
      purchases.Add(CarKey(car), Catalog.Data["prices"]["cars"][car]["para"].N());
      return true;
    }

    private Dictionary<string, double> PartPurchases(int car)
    {
      string prefix = PartPrefix(car);
      return purchases.Where(p => p.Key.StartsWith(prefix, StringComparison.Ordinal))
        .ToDictionary(p => p.Key.Substring(prefix.Length), p => p.Value, StringComparer.Ordinal);
    }

    public double PartsCost(int car, IEnumerable<string> ids)
    {
      if (!ValidCar(car) || ids == null) return 0;
      return Catalog.PurchaseCost(ids.Where(id => id != null), PartPurchases(car));
    }

    public bool BuyParts(int car, IEnumerable<string> ids)
    {
      if (!ValidCar(car) || ids == null) return false;
      var requested = ids.Where(id => id != null).Distinct(StringComparer.Ordinal).ToArray();
      if (!OwnsCar(car) || Balance < PartsCost(car, requested)) return false;
      var paid = PartPurchases(car);
      var investment = new Dictionary<string, double>(StringComparer.Ordinal);
      foreach (var pair in paid)
      {
        if (!parts.TryGetValue(pair.Key, out var p)) continue;
        string category = p["kat"].S();
        investment[category] = (investment.TryGetValue(category, out double before) ? before : 0) + pair.Value;
      }
      // TS Set sırası korunur; aynı işlemde üst basamak, önceki gerçek bedeli kredi sayar.
      foreach (string id in requested)
      {
        if (!parts.TryGetValue(id, out var p) || OwnsPart(car, id)) continue;
        string category = p["kat"].S();
        double prior = investment.TryGetValue(category, out double before) ? before : 0;
        double cost = Math.Max(0, Catalog.PartPrice(id) - prior);
        investment[category] = prior + cost;
        purchases.Add(PartPrefix(car) + id, cost);
      }
      return true;
    }

    private void SetEquipped(int car, IEnumerable<string> ids)
    {
      var normalized = Catalog.Normalize(ids);
      if (normalized.Length == 0) equipped.Remove(car); else equipped[car] = normalized;
    }

    public bool Equip(int car, string id)
    {
      if (!ValidCar(car) || id == null || !parts.ContainsKey(id) || !OwnsPart(car, id)) return false;
      SetEquipped(car, Equipped(car).Concat(new[] { id }));
      return true;
    }

    public bool Unequip(int car, string category)
    {
      if (!ValidCar(car) || !Catalog.Data["categories"].Items.Any(c => c[0].S() == category)) return false;
      SetEquipped(car, Equipped(car).Where(id => parts[id]["kat"].S() != category));
      return true;
    }

    public bool EquipPackage(int car, string package)
    {
      if (!ValidCar(car)) return false;
      var p = Catalog.Data["packages"].Items.FirstOrDefault(x => x["id"].S() == package);
      if (p == null) return false;
      var ids = p["parcalar"].Items.Select(id => id.S()).ToArray();
      if (ids.Any(id => !OwnsPart(car, id))) return false;
      SetEquipped(car, Equipped(car).Concat(ids));
      return true;
    }

    public bool Stock(int car)
    {
      if (!ValidCar(car)) return false;
      equipped.Remove(car);
      return true;
    }

    public double AddMoney(double amount)
    {
      Numeric.Finite(amount);
      double addition = Math.Max(0, VehicleCatalog.JsRound(amount));
      ValidateAmount(earned + addition, "Toplam kazanılan para");
      earned += addition;
      return addition;
    }

    public void AddXp(double amount)
    {
      Numeric.Finite(amount);
      double addition = Math.Max(0, VehicleCatalog.JsRound(amount));
      ValidateAmount(xp + addition, "Toplam XP");
      xp += addition;
    }

    public int StarsOf(string type, int level) => ReadStars(type, level);

    /// TS ilerleme.pistAcikMi (admin kipi yok): seviye, ek açık liste ya da kariyer yıldız kapısı.
    public bool TrackOpen(string type, int level)
    {
      var unlock = Catalog.Data["career"]["unlocks"]["pist"][type][level - 1];
      return Level >= (unlock.IsNumber ? unlock.N() : 1) || extraOpen.Contains(RaceStars.Key(type, level))
        || Catalog.StarGate(type, level, ReadStars)["acik"].B();
    }

    /// TS ilerleme.yarisBitti: ödül önceki en iyi yıldıza göre; yıldız yalnız daha iyiyse yazılır; para ve XP eklenir.
    public (double Xp, double Money) RaceFinished(string type, int level, int earnedStars)
    {
      if (earnedStars < 0 || earnedStars > 3) throw new ArgumentOutOfRangeException(nameof(earnedStars));
      int previous = ReadStars(type, level);
      var reward = Catalog.Reward(type, level, earnedStars, previous);
      double gainedXp = reward["xp"].N(), money = reward["para"].N();
      if (earnedStars > previous) stars[RaceStars.Key(type, level)] = earnedStars;
      AddMoney(money); AddXp(gainedXp);
      return (gainedXp, money);
    }

    /// TS kurulum.lk: oyuncunun yardım seviyesi (arc/norm/real); Unity varsayılanı norm (Cem kararı). Kalıcı.
    public string AssistLevel { get; private set; } = "norm";
    public bool SetAssistLevel(string level)
    {
      if (!Catalog.Data["levels"].Has(level)) return false;
      AssistLevel = level; return true;
    }
    public CatalogSetup Setup(int car) => Catalog.Setup(car, Equipped(car), AssistLevel);
    public CatalogSetup Setup(int car, string level) => Catalog.Setup(car, Equipped(car), level);

    public CatalogNode Snapshot()
    {
      var root = CatalogNode.Obj();
      root.Set("version", CatalogNode.Num(Version));
      root.Set("baseline", CatalogNode.Str(VehicleCatalog.Baseline));
      root.Set("catalogGeneration", CatalogNode.Num(CatalogGeneration));
      root.Set("selectedCar", CatalogNode.Num(SelectedCar));
      root.Set("assistLevel", CatalogNode.Str(AssistLevel));
      var progress = CatalogNode.Obj();
      progress.Set("surum", CatalogNode.Num(3));
      progress.Set("xp", CatalogNode.Num(xp));
      progress.Set("kazanilan", CatalogNode.Num(earned));
      var ledger = CatalogNode.Obj();
      foreach (var p in purchases) ledger.Set(p.Key, CatalogNode.Num(p.Value));
      progress.Set("alimlar", ledger);
      progress.Set("ekAcik", CatalogNode.Arr(extraOpen.Select(CatalogNode.Str)));
      var starData = CatalogNode.Obj();
      foreach (var p in stars) starData.Set(p.Key, CatalogNode.Num(p.Value));
      progress.Set("yildiz", starData);
      root.Set("progress", progress);
      var fitted = CatalogNode.Obj();
      foreach (var p in equipped)
      {
        var ids = Catalog.Normalize(p.Value);
        if (ids.Length > 0) fitted.Set(p.Key.ToString(CultureInfo.InvariantCulture), CatalogNode.Arr(ids.Select(CatalogNode.Str)));
      }
      root.Set("equipped", fitted);
      return root;
    }

    private static void ValidateAmount(double n, string label)
    {
      if (double.IsNaN(n) || double.IsInfinity(n) || n < 0 || n > MaxExactInteger)
        throw new ArgumentException(label + " geçersiz.");
    }
    private static bool IsObject(CatalogNode n) => n.ToString().StartsWith("{", StringComparison.Ordinal);
    private static bool IsArray(CatalogNode n) => n.ToString().StartsWith("[", StringComparison.Ordinal);
    private static double Number(CatalogNode n, string label)
    {
      if (!n.IsNumber) throw new ArgumentException(label + " sayı olmalı.");
      ValidateAmount(n.N(), label);
      return n.N();
    }
    private static int Integer(CatalogNode n, string label, int min, int max)
    {
      double value = Number(n, label);
      if (value % 1 != 0 || value < min || value > max) throw new ArgumentException(label + " aralığı geçersiz.");
      return (int)value;
    }

    // Açık nesil alanı yoksa SHA tablosuna bakılır; alanı/SHA'sı olmayan kayıt güncel sayılır.
    public static SourceAge SnapshotSource(CatalogNode snapshot, out int generation)
    {
      string baseline = snapshot.Has("baseline") ? snapshot["baseline"].S() : "";
      if (snapshot.Has("catalogGeneration")) generation = Integer(snapshot["catalogGeneration"], "Katalog nesli", 0, int.MaxValue);
      else if (baseline == "") generation = CatalogGeneration;
      else if (!KnownBaselines.TryGetValue(baseline, out generation)) return SourceAge.Unsupported;
      if (generation > CatalogGeneration) return SourceAge.Unsupported;
      if (generation < CatalogGeneration) return SourceAge.Older;
      return baseline == "" || baseline == VehicleCatalog.Baseline ? SourceAge.Current : SourceAge.Unsupported;
    }

    public static GarageState Restore(VehicleCatalog catalog, CatalogNode snapshot)
    {
      if (snapshot == null || !IsObject(snapshot)) throw new ArgumentException("Garaj kaydı nesne olmalı.");
      if (snapshot.Has("version") && Integer(snapshot["version"], "Garaj sürümü", 1, int.MaxValue) != Version)
        throw new ArgumentException("Desteklenmeyen garaj kayıt sürümü.");
      if (SnapshotSource(snapshot, out int generation) == SourceAge.Unsupported)
        throw new ArgumentException("Garaj kaydı daha yeni ya da bilinmeyen bir katalog kaynağına ait.");
      // Eski nesilde bilinmeyen araç/parça TS takiliYukle gibi takılı listeden düşer; alım defteri olduğu gibi kalır.
      var state = new GarageState(catalog) { SourceGeneration = generation };
      var progress = snapshot.Has("progress") ? snapshot["progress"] : CatalogNode.Obj();
      if (!IsObject(progress)) throw new ArgumentException("İlerleme kaydı nesne olmalı.");
      int sourceVersion = progress.Has("surum") ? Integer(progress["surum"], "İlerleme sürümü", 1, int.MaxValue) : 3;
      if (sourceVersion > 3) throw new ArgumentException("Desteklenmeyen ilerleme sürümü.");
      if (progress.Has("xp")) state.xp = Number(progress["xp"], "XP");
      if (progress.Has("kazanilan")) state.earned = Number(progress["kazanilan"], "Kazanılan para");
      if (progress.Has("alimlar"))
      {
        if (!IsObject(progress["alimlar"])) throw new ArgumentException("Alım kaydı nesne olmalı.");
        foreach (var p in progress["alimlar"].Fields) state.purchases.Add(p.Key, Number(p.Value, "Alım bedeli"));
        ValidateAmount(state.purchases.Values.Sum(), "Toplam alım bedeli");
      }
      if (progress.Has("ekAcik"))
      {
        if (!IsArray(progress["ekAcik"])) throw new ArgumentException("Eski sahiplik listesi dizi olmalı.");
        foreach (var item in progress["ekAcik"].Items)
        {
          string id = item.S();
          if (id == "") throw new ArgumentException("Eski sahiplik kimliği geçersiz.");
          if (!state.extraOpen.Contains(id)) state.extraOpen.Add(id);
        }
      }
      if (progress.Has("yildiz"))
      {
        if (!IsObject(progress["yildiz"])) throw new ArgumentException("Yıldız tablosu nesne olmalı.");
        foreach (var p in progress["yildiz"].Fields) state.stars.Add(p.Key, Integer(p.Value, "Yıldız", 0, 3));
      }
      if (sourceVersion < 2) throw new ArgumentException("TS ilerleme sürüm 1 için kaynak geçmiş içe aktarıcısı gerekli.");
      if (sourceVersion < 3 && (state.xp > 0 || state.earned > 0 || state.purchases.Count > 0 || state.extraOpen.Count > 0))
        foreach (var car in catalog.Data["prices"]["legacyFree"].Items)
        {
          string key = CarKey((int)car.N());
          if (!state.extraOpen.Contains(key)) state.extraOpen.Add(key);
        }
      if (snapshot.Has("equipped"))
      {
        if (!IsObject(snapshot["equipped"])) throw new ArgumentException("Takılı parça tablosu nesne olmalı.");
        foreach (var p in snapshot["equipped"].Fields)
        {
          if (!int.TryParse(p.Key, NumberStyles.None, CultureInfo.InvariantCulture, out int car) || !state.ValidCar(car)) continue;
          if (!IsArray(p.Value)) throw new ArgumentException("Takılı parçalar dizi olmalı.");
          if (p.Value.Items.Any(id => id.S() == "")) throw new ArgumentException("Takılı parça kimliği metin olmalı.");
          var ids = p.Value.Items.Select(id => id.S()).ToArray();
          state.SetEquipped(car, ids);
        }
      }
      // Eski kayıtta alan yok: norm. Bilinmeyen seviye bozuk kayıttır.
      if (snapshot.Has("assistLevel") && !state.SetAssistLevel(snapshot["assistLevel"].S())) throw new ArgumentException("Yardım seviyesi geçersiz.");
      if (snapshot.Has("selectedCar"))
      {
        int car = Integer(snapshot["selectedCar"], "Seçili araç", 0, int.MaxValue);
        if (state.OwnsCar(car)) state.SelectedCar = car;
      }
      return state;
    }
  }
}
