using System.Security.Cryptography;
using System.Text;
using LastTurn.Core;

internal static class GarageStorageValidation
{
  private static int checks;
  private static void Check(bool condition, string label)
  {
    checks++;
    if (!condition) throw new InvalidOperationException("Garaj kayıt testi: " + label);
  }

  private static void Reject(Action action, string label)
  {
    bool rejected = false;
    try { action(); }
    catch (Exception e) when (e is IOException || e is UnauthorizedAccessException || e is InvalidOperationException || e is ArgumentException)
    { rejected = true; }
    Check(rejected, label);
  }

  private static string Hash(string text)
  {
    using var sha = SHA256.Create();
    return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(text))).ToLowerInvariant();
  }

  // Yalnız hata senaryosu üretir; üretim kaydı her zaman GarageSaveStore üzerinden yazılır.
  private static void WriteEnvelope(string path, CatalogNode snapshot, int envelopeVersion = 1)
  {
    string payload = snapshot.ToString();
    var envelope = CatalogNode.Obj();
    envelope.Set("format", CatalogNode.Str("last-turn-garage"));
    envelope.Set("version", CatalogNode.Num(envelopeVersion));
    envelope.Set("revision", CatalogNode.Num(1));
    envelope.Set("checksum", CatalogNode.Str(Hash(payload)));
    envelope.Set("payload", CatalogNode.Str(payload));
    File.WriteAllText(path, envelope.ToString(), new UTF8Encoding(false));
  }

  public static void Run()
  {
    checks = 0;
    string project = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../"));
    var catalog = new VehicleCatalog(File.ReadAllText(Path.Combine(project, "Assets/LastTurn/Resources/vehicle-catalog.json")));
    string directory = Path.Combine(Path.GetTempPath(), "LastTurnGarageValidation-" + Guid.NewGuid().ToString("N"));
    Directory.CreateDirectory(directory);
    string Profile(string name) => Path.Combine(directory, name + ".json");
    GarageState Sample()
    {
      var sample = new GarageState(catalog);
      sample.AddXp(VehicleCatalog.LevelBase(15));
      sample.AddMoney(60000);
      Check(sample.BuyCar(0), "araç satın alındı");
      Check(sample.BuyParts(10, new[] { "motor-sokak", "lastik-spor" }), "ilk araç parçaları alındı");
      Check(sample.Equip(10, "motor-sokak") && sample.Equip(10, "lastik-spor"), "ilk araç parçaları takıldı");
      Check(sample.BuyParts(11, new[] { "lastik-toprak" }) && sample.Equip(11, "lastik-toprak"), "ikinci araç ayrı takıldı");
      Check(sample.SelectCar(0), "satın alınan araç seçildi");
      return sample;
    }
    try
    {
      string path = Profile("roundtrip");
      var store = new GarageSaveStore(path, catalog);
      var empty = store.Load();
      Check(empty.Balance == 0 && empty.Xp == 0 && empty.OwnsCar(10) && !empty.OwnsCar(0), "yeni oyuncu TS başlangıcı");
      Check(!File.Exists(path), "okuma yeni oyuncu dosyası yazmaz");
      var state = Sample();
      store.Save(state);
      Check(File.Exists(path) && !File.Exists(path + ".tmp"), "ilk atomik kayıt");
      var restarted = new GarageSaveStore(path, catalog);
      var loaded = restarted.Load();
      Check(!restarted.ReadOnly && loaded.SelectedCar == 0 && loaded.OwnsCar(0), "yeni store sahiplik ve seçim");
      Check(loaded.Balance == state.Balance && loaded.Xp == state.Xp, "para ve XP tekrar açmada aynı");
      Check(loaded.Equipped(10).SequenceEqual(new[] { "motor-sokak", "lastik-spor" }) &&
        loaded.Equipped(11).SequenceEqual(new[] { "lastik-toprak" }), "iki aracın takılıları karışmadı");
      Check(!loaded.OwnsPart(11, "motor-sokak") && loaded.OwnsPart(10, "motor-sokak"), "parça sahipliği araç başına");

      string firstSnapshot = loaded.Snapshot().ToString();
      loaded.AddMoney(100);
      restarted.Save(loaded);
      Check(File.Exists(path + ".bak"), "ikinci yazma önceki işlemi yedekler");
      string backupText = File.ReadAllText(path + ".bak");
      File.WriteAllText(path, "{", new UTF8Encoding(false));
      var recovery = new GarageSaveStore(path, catalog);
      var recovered = recovery.Load();
      Check(!recovery.ReadOnly && recovered.Snapshot().ToString() == firstSnapshot, "kesilmiş JSON sağlam yedekten döndü");
      Check(File.ReadAllText(path) == "{", "yükleme bozuk dosyanın üzerine yazmaz");
      recovery.Save(recovered);
      Check(Directory.GetFiles(directory, "roundtrip.json.corrupt-*").Any(), "bozuk ana dosya ayrı korundu");
      Check(File.ReadAllText(path + ".bak") == backupText, "bozuk ana dosya sağlam yedeği ezmedi");
      Check(new GarageSaveStore(path, catalog).Load().Snapshot().ToString() == firstSnapshot, "kurtarılan kayıt tekrar açıldı");

      string checksumPath = Profile("checksum");
      var checksumStore = new GarageSaveStore(checksumPath, catalog);
      checksumStore.Save(state);
      var envelope = CatalogNode.Parse(File.ReadAllText(checksumPath));
      envelope.Set("payload", CatalogNode.Str(envelope["payload"].S() + " "));
      File.WriteAllText(checksumPath, envelope.ToString());
      var tampered = new GarageSaveStore(checksumPath, catalog);
      tampered.Load();
      Check(tampered.ReadOnly, "checksum uyuşmazlığı yedeksiz dosyayı korur");
      string badMain = File.ReadAllText(checksumPath);
      Reject(() => tampered.Save(state), "bozuk kayda kayıt engeli");
      Check(File.ReadAllText(checksumPath) == badMain, "bozuk ana dosya değişmedi");

      string bothPath = Profile("both-corrupt");
      File.WriteAllText(bothPath, "[bozuk");
      File.WriteAllText(bothPath + ".bak", "null");
      var both = new GarageSaveStore(bothPath, catalog);
      both.Load();
      Check(both.ReadOnly, "ana ve yedek bozuksa salt okunur");
      Reject(() => both.Save(state), "iki bozuk dosyaya sıfır durum yazılmaz");
      Check(File.ReadAllText(bothPath) == "[bozuk" && File.ReadAllText(bothPath + ".bak") == "null", "iki bozuk dosya aynen durur");

      string futurePath = Profile("future");
      var futureSeed = new GarageSaveStore(futurePath, catalog);
      futureSeed.Save(state);
      futureSeed.Save(state);
      WriteEnvelope(futurePath, state.Snapshot(), 2);
      var future = new GarageSaveStore(futurePath, catalog);
      var futureView = future.Load();
      Check(future.ReadOnly && futureView.OwnsCar(0), "gelecek sürümde yedek yalnız görüntülenir");
      string futureText = File.ReadAllText(futurePath);
      Reject(() => future.Save(futureView), "eski yedek gelecek sürümü ezemez");
      Check(File.ReadAllText(futurePath) == futureText, "gelecek zarf korunur");

      string futureBackupPath = Profile("future-backup");
      var futureBackupSeed = new GarageSaveStore(futureBackupPath, catalog);
      futureBackupSeed.Save(state);
      futureBackupSeed.Save(state);
      var beforeBackupChange = new GarageSaveStore(futureBackupPath, catalog);
      var beforeBackupState = beforeBackupChange.Load();
      WriteEnvelope(futureBackupPath + ".bak", state.Snapshot(), 2);
      string futureBackupText = File.ReadAllText(futureBackupPath + ".bak");
      string currentMainText = File.ReadAllText(futureBackupPath);
      Reject(() => beforeBackupChange.Save(beforeBackupState), "oturum açıkken gelen gelecek yedek yazmayı durdurur");
      var futureBackup = new GarageSaveStore(futureBackupPath, catalog);
      var currentView = futureBackup.Load();
      Check(futureBackup.ReadOnly && currentView.OwnsCar(0), "sağlam ana ve gelecek yedek salt okunur açılır");
      Reject(() => futureBackup.Save(currentView), "sağlam ana kayıt gelecek yedeği ezemez");
      Check(File.ReadAllText(futureBackupPath + ".bak") == futureBackupText && File.ReadAllText(futureBackupPath) == currentMainText,
        "gelecek yedek ve sağlam ana aynen korunur");

      string futurePendingPath = Profile("future-pending");
      var futurePendingSeed = new GarageSaveStore(futurePendingPath, catalog);
      futurePendingSeed.Save(state);
      var beforePendingChange = new GarageSaveStore(futurePendingPath, catalog);
      var beforePendingState = beforePendingChange.Load();
      WriteEnvelope(futurePendingPath + ".tmp", state.Snapshot(), 2);
      string futurePendingText = File.ReadAllText(futurePendingPath + ".tmp");
      string pendingMainText = File.ReadAllText(futurePendingPath);
      Reject(() => beforePendingChange.Save(beforePendingState), "oturum açıkken gelen gelecek geçici kayıt yazmayı durdurur");
      var futurePending = new GarageSaveStore(futurePendingPath, catalog);
      Check(futurePending.Load().OwnsCar(0) && futurePending.ReadOnly, "sağlam ana ve gelecek geçici kayıt salt okunur açılır");
      Reject(() => futurePending.Save(state), "gelecek geçici kayıt Create ile ezilemez");
      Check(File.ReadAllText(futurePendingPath + ".tmp") == futurePendingText && File.ReadAllText(futurePendingPath) == pendingMainText,
        "gelecek geçici kayıt ve sağlam ana aynen korunur");

      string snapshotFuturePath = Profile("future-payload");
      var futureSnapshot = state.Snapshot();
      futureSnapshot.Set("version", CatalogNode.Num(2));
      WriteEnvelope(snapshotFuturePath, futureSnapshot);
      var snapshotFuture = new GarageSaveStore(snapshotFuturePath, catalog);
      snapshotFuture.Load();
      Check(snapshotFuture.ReadOnly, "gelecek payload sürümü korunur");
      Reject(() => snapshotFuture.Save(state), "gelecek payload üzerine yazılmaz");
      // Katalog nesli: eski nesil geçirilir (bilinmeyen takılı parça düşer, defter kalır); yeni/bilinmeyen kaynak korunur.
      string olderPath = Profile("older-generation");
      var older = state.Snapshot();
      older.Set("catalogGeneration", CatalogNode.Num(0));
      older.Set("baseline", CatalogNode.Str("0000000000000000000000000000000000000000"));
      older["equipped"].Set("10", CatalogNode.Arr(older["equipped"]["10"].Items.Concat(new[] { CatalogNode.Str("eski-parca") })));
      older["progress"]["alimlar"].Set("parca_10_eski-parca", CatalogNode.Num(500));
      WriteEnvelope(olderPath, older);
      string olderText = File.ReadAllText(olderPath);
      var olderStore = new GarageSaveStore(olderPath, catalog);
      var olderLoaded = olderStore.Load();
      Check(!olderStore.ReadOnly && olderLoaded.SourceGeneration == 0 && olderStore.Status.Contains("geçirildi"),
        "eski katalog nesli yazılabilir açılır ve geçiş bildirilir");
      Check(olderLoaded.OwnsCar(0) && olderLoaded.Equipped(10).SequenceEqual(state.Equipped(10)) &&
        olderLoaded.Balance == state.Balance - 500, "eski nesilde bilinmeyen parça düşer, sahiplik ve ödenmiş bedel kalır");
      olderStore.Save(olderLoaded);
      var olderReopened = new GarageSaveStore(olderPath, catalog).Load();
      Check(olderReopened.SourceGeneration == GarageState.CatalogGeneration && olderReopened.Equipped(10).SequenceEqual(state.Equipped(10)) &&
        File.ReadAllText(olderPath + ".bak") == olderText, "geçirilen kayıt güncel nesille yazılır, eski dosya yedekte kalır");
      foreach (var (name, generation, baseline) in new[] {
        ("newer-generation", 2, VehicleCatalog.Baseline),
        ("other-baseline-same-generation", 1, "1111111111111111111111111111111111111111"),
        ("unknown-baseline", -1, "2222222222222222222222222222222222222222") })
      {
        string sourcePath = Profile(name);
        var snapshot = state.Snapshot();
        if (generation < 0) snapshot.Remove("catalogGeneration"); else snapshot.Set("catalogGeneration", CatalogNode.Num(generation));
        snapshot.Set("baseline", CatalogNode.Str(baseline));
        WriteEnvelope(sourcePath, snapshot);
        string text = File.ReadAllText(sourcePath);
        var sourceStore = new GarageSaveStore(sourcePath, catalog);
        sourceStore.Load();
        Check(sourceStore.ReadOnly, "desteklenmeyen katalog kaynağı salt okunur: " + name);
        Reject(() => sourceStore.Save(state), "desteklenmeyen katalog kaynağı ezilmez: " + name);
        Check(File.ReadAllText(sourcePath) == text, "desteklenmeyen katalog kaynağı aynen korunur: " + name);
      }
      string oldFormatPath = Profile("old-envelope");
      var oldFormatSeed = new GarageSaveStore(oldFormatPath, catalog);
      oldFormatSeed.Save(state);
      oldFormatSeed.Save(state);
      WriteEnvelope(oldFormatPath, state.Snapshot(), 0);
      var oldFormat = new GarageSaveStore(oldFormatPath, catalog);
      Check(oldFormat.Load().OwnsCar(0) && !oldFormat.ReadOnly, "eski/bilinmeyen küçük biçim sürümü gelecek sayılmaz, yedekten açılır");

      foreach (int unsupported in new[] { 1, 4 })
      {
        string unsupportedPath = Profile("progress-" + unsupported);
        var unsupportedSnapshot = state.Snapshot();
        unsupportedSnapshot["progress"].Set("surum", CatalogNode.Num(unsupported));
        WriteEnvelope(unsupportedPath, unsupportedSnapshot);
        var unsupportedStore = new GarageSaveStore(unsupportedPath, catalog);
        unsupportedStore.Load();
        Check(unsupportedStore.ReadOnly, "desteklenmeyen TS ilerleme sürümü korunur " + unsupported);
      }

      string optionalPath = Profile("optional-fields");
      var optional = state.Snapshot();
      optional.Remove("equipped");
      optional["progress"].Remove("yildiz");
      optional["progress"].Remove("ekAcik");
      WriteEnvelope(optionalPath, optional);
      var optionalStore = new GarageSaveStore(optionalPath, catalog);
      var optionalLoaded = optionalStore.Load();
      Check(!optionalStore.ReadOnly && optionalLoaded.OwnsCar(0) && optionalLoaded.Equipped(10).Length == 0,
        "eksik ek alanlar güvenli boş varsayılanlarla açılır, sahiplik kalır");

      string missingLedgerPath = Profile("missing-ledger");
      var ledgerSeed = new GarageSaveStore(missingLedgerPath, catalog);
      ledgerSeed.Save(state);
      ledgerSeed.Save(state);
      var missingLedger = state.Snapshot();
      missingLedger["progress"].Remove("alimlar");
      WriteEnvelope(missingLedgerPath, missingLedger);
      var ledgerRecovery = new GarageSaveStore(missingLedgerPath, catalog);
      var ledgerLoaded = ledgerRecovery.Load();
      Check(!ledgerRecovery.ReadOnly && ledgerLoaded.OwnsCar(0) && ledgerLoaded.OwnsPart(10, "motor-sokak"),
        "eksik ekonomik defter sahipliği sıfırlamak yerine yedekten döner");

      string legacyPath = Profile("legacy-progress-two");
      var legacy = new GarageState(catalog).Snapshot();
      legacy["progress"].Set("surum", CatalogNode.Num(2));
      legacy["progress"].Set("xp", CatalogNode.Num(1));
      WriteEnvelope(legacyPath, legacy);
      var legacyStore = new GarageSaveStore(legacyPath, catalog);
      var legacyLoaded = legacyStore.Load();
      Check(!legacyStore.ReadOnly && legacyLoaded.OwnsCar(0) && legacyLoaded.OwnsCar(1), "oynanmış TS sürüm 2 eski ücretsiz sahipliği korur");
      Check(legacyLoaded.Snapshot()["progress"]["surum"].N() == 3 && legacyLoaded.Balance == 0,
        "bilinen eski sürüm geçişi para uydurmadan sürüm 3 üretir");
      legacyStore.Save(legacyLoaded);
      Check(new GarageSaveStore(legacyPath, catalog).Load().OwnsCar(1), "geçirilmiş eski sahiplik yeniden açmada kalır");

      string invalidMoneyPath = Profile("invalid-money");
      var invalidMoney = state.Snapshot();
      invalidMoney["progress"].Set("kazanilan", CatalogNode.Num(-1));
      WriteEnvelope(invalidMoneyPath, invalidMoney);
      var invalidStore = new GarageSaveStore(invalidMoneyPath, catalog);
      invalidStore.Load();
      Check(invalidStore.ReadOnly, "checksum doğru olsa da geçersiz ekonomi reddedilir");

      string pendingPath = Profile("pending-first-save");
      WriteEnvelope(pendingPath + ".tmp", state.Snapshot());
      var pending = new GarageSaveStore(pendingPath, catalog);
      var pendingState = pending.Load();
      Check(!pending.ReadOnly && pendingState.OwnsCar(0), "kesilmiş ilk yazmanın tam geçici dosyası kurtarılır");
      pending.Save(pendingState);
      Check(File.Exists(pendingPath) && !File.Exists(pendingPath + ".tmp"), "kurtarılan ilk yazma tamamlanır");

      string conflictPath = Profile("conflict");
      new GarageSaveStore(conflictPath, catalog).Save(state);
      var writerA = new GarageSaveStore(conflictPath, catalog);
      var writerB = new GarageSaveStore(conflictPath, catalog);
      var a = writerA.Load();
      var b = writerB.Load();
      a.AddMoney(10);
      writerA.Save(a);
      string winningText = File.ReadAllText(conflictPath);
      b.AddMoney(20);
      Reject(() => writerB.Save(b), "eski ikinci instance son yazanı ezemez");
      Check(File.ReadAllText(conflictPath) == winningText, "çakışmada ilk instance'ın kaydı korunur");

      var locked = new GarageSaveStore(conflictPath, catalog);
      var lockedState = locked.Load();
      using (var guard = new FileStream(conflictPath + ".lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None))
        Reject(() => locked.Save(lockedState), "eşzamanlı dosya kilidi ikinci yazmayı reddeder");
      Check(File.ReadAllText(conflictPath) == winningText, "kilit hatasında önceki kayıt değişmez");
      Directory.CreateDirectory(conflictPath + ".tmp");
      Reject(() => locked.Save(lockedState), "geçici dosya yazma hatası yüzeye çıkar");
      Check(File.ReadAllText(conflictPath) == winningText, "I/O hatasında önceki kayıt korunur");

      Console.WriteLine($"Garaj yerel kayıt: {checks} koşul geçti; yeniden açma/iki araç, checksum, yedek, bozuk/eksik/sürümlü veri, geçici kurtarma, iki instance ve I/O hatası.");
    }
    finally
    {
      // Yalnız bu testin oluşturduğu benzersiz geçici dizin silinir.
      string full = Path.GetFullPath(directory);
      string tempRoot = Path.GetFullPath(Path.GetTempPath()).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
      if (!full.StartsWith(tempRoot, StringComparison.OrdinalIgnoreCase) ||
          !Path.GetFileName(full).StartsWith("LastTurnGarageValidation-", StringComparison.Ordinal))
        throw new InvalidOperationException("Test geçici dizin sınırı doğrulanamadı.");
      Directory.Delete(full, true);
    }
  }
}
