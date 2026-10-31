using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace LastTurn.Core
{
  // Tek yerel profil bir bütün olarak yazılır. Yedek, sahiplik ve ekonomi defterini aynı işlemde korur.
  public sealed class GarageSaveStore
  {
    public const int FormatVersion = 1;
    private const int MaxFileBytes = 4 * 1024 * 1024;
    private static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);
    private readonly VehicleCatalog catalog;
    private bool loaded;
    private string observedPrimary = null!;
    private long revision;
    public string FilePath { get; }
    public string Status { get; private set; } = "Kayıt henüz okunmadı.";
    public bool ReadOnly { get; private set; }

    private sealed class Attempt
    {
      public GarageState State = null!;
      public string Fingerprint = null!;
      public string Error = "";
      public long Revision;
      public bool Exists, Future, Valid;
    }

    public GarageSaveStore(string path, VehicleCatalog catalog)
    {
      if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Kayıt yolu boş olamaz.", nameof(path));
      FilePath = Path.GetFullPath(path);
      this.catalog = catalog ?? throw new ArgumentNullException(nameof(catalog));
    }

    public GarageState Load()
    {
      var state = LoadAttempts();
      if (state.SourceGeneration < GarageState.CatalogGeneration)
        Status += " Eski katalog neslinden (" + state.SourceGeneration + ") geçirildi; bilinmeyen takılı parçalar düştü, alım defteri korundu."
          + (ReadOnly ? "" : " İlk kayıtta eski dosya yedeğe alınır.");
      return state;
    }

    private GarageState LoadAttempts()
    {
      loaded = true;
      ReadOnly = false;
      var main = Read(FilePath);
      var backup = Read(FilePath + ".bak");
      var pending = Read(FilePath + ".tmp");
      observedPrimary = main.Fingerprint;
      revision = main.Revision;
      if (main.Future || backup.Future || pending.Future)
      {
        ReadOnly = true;
        Status = "Desteklenmeyen kayıt sürümü bulundu. Dosyalar korunuyor; bu oturum salt okunur.";
        if (main.Valid) return main.State;
        if (backup.Valid) { revision = backup.Revision; return backup.State; }
        return new GarageState(catalog);
      }
      if (main.Valid)
      {
        Status = "Yerel garaj kaydı yüklendi.";
        return main.State;
      }
      if (backup.Valid)
      {
        revision = backup.Revision;
        ReadOnly = main.Exists && main.Fingerprint == null;
        Status = ReadOnly
          ? "Doğrulanmış yedek yüklendi. Ana dosyanın tamamı okunamadığı için dosyalar korunuyor; oturum salt okunur."
          : "Ana kayıt okunamadı; doğrulanmış yedek yüklendi. Ana dosya sonraki kayıttan önce korunacak.";
        return backup.State;
      }
      if (!main.Exists && !backup.Exists)
      {
        // Kesilmiş ilk yazmada henüz ana dosya yoktur. Tam ve doğrulanmış geçici veri kurtarılabilir.
        if (pending.Valid)
        {
          revision = pending.Revision;
          Status = "Kesilmiş ilk yazmanın doğrulanmış geçici kaydı yüklendi.";
          return pending.State;
        }
        if (!pending.Exists)
        {
          Status = "Yerel kayıt yok; TypeScript başlangıç garajı oluşturuldu.";
          return new GarageState(catalog);
        }
      }
      ReadOnly = true;
      Status = "Garaj kaydı ve yedeği doğrulanamadı. Dosyalar korunuyor; kayıt kapalı. " + main.Error;
      return new GarageState(catalog);
    }

    public void Save(GarageState state)
    {
      if (state == null) throw new ArgumentNullException(nameof(state));
      if (!loaded) Load();
      if (ReadOnly) throw new InvalidOperationException("Salt okunur garaj kaydının üzerine yazılamaz.");
      try
      {
        Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
        // Dosya kilidi farklı store/Editor süreçlerinin aynı geçici dosyayı kullanmasını önler.
        using (var guard = new FileStream(FilePath + ".lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None))
          SaveLocked(state);
      }
      catch (Exception e) when (e is IOException || e is UnauthorizedAccessException || e is NotSupportedException)
      {
        Status = "Garaj kaydedilemedi; önceki kayıt korunuyor. " + e.Message;
        throw;
      }
    }

    private void SaveLocked(GarageState state)
    {
      // Değişmiş dosyayı sessizce ezme; iki oturum aynı profili açmış olabilir.
      var current = Read(FilePath);
      var backup = Read(FilePath + ".bak");
      var pending = Read(FilePath + ".tmp");
      if (current.Future || backup.Future || pending.Future)
      {
        ReadOnly = true;
        Status = "Desteklenmeyen kayıt sürümü bulundu; yazma durduruldu.";
        throw new InvalidOperationException(Status);
      }
      if (!string.Equals(observedPrimary, current.Fingerprint, StringComparison.Ordinal) ||
          (current.Exists && current.Fingerprint == null))
      {
        Status = "Kayıt dosyası bu oturumdan sonra değişti veya okunamıyor; önce yeniden yükleyin.";
        throw new IOException(Status);
      }

      string payload = state.Snapshot().ToString();
      // Veriyi diske değmeden önce aynı okuyucu ve durum doğrulayıcısından geçir.
      GarageState.Restore(catalog, CatalogNode.Parse(payload));
      var envelope = CatalogNode.Obj();
      envelope.Set("format", CatalogNode.Str("last-turn-garage"));
      envelope.Set("version", CatalogNode.Num(FormatVersion));
      long nextRevision = checked(Math.Max(revision, current.Revision) + 1);
      envelope.Set("revision", CatalogNode.Num(nextRevision));
      envelope.Set("checksum", CatalogNode.Str(Hash(Utf8.GetBytes(payload))));
      envelope.Set("payload", CatalogNode.Str(payload));
      byte[] bytes = Utf8.GetBytes(envelope.ToString());
      if (bytes.Length > MaxFileBytes) throw new InvalidOperationException("Garaj kaydı boyut sınırını aşıyor.");

      string directory = Path.GetDirectoryName(FilePath)!;
      string temporary = FilePath + ".tmp";
      try
      {
        Directory.CreateDirectory(directory);
        using (var file = new FileStream(temporary, FileMode.Create, FileAccess.Write, FileShare.None))
        {
          file.Write(bytes, 0, bytes.Length);
          file.Flush(true);
        }
        var verified = Read(temporary);
        if (!verified.Valid) throw new IOException("Geçici garaj dosyası doğrulanamadı: " + verified.Error);
        if (current.Exists)
        {
          if (!current.Valid)
          {
            // Bozuk ana dosya sağlam .bak dosyasının yerine geçmesin.
            string preserved = FilePath + ".corrupt-" + DateTime.UtcNow.ToString("yyyyMMddTHHmmssfffffff") + "-" + Guid.NewGuid().ToString("N");
            File.Copy(FilePath, preserved, false);
            File.Replace(temporary, FilePath, null);
          }
          else File.Replace(temporary, FilePath, FilePath + ".bak");
        }
        else File.Move(temporary, FilePath);
        observedPrimary = Hash(bytes);
        revision = nextRevision;
        Status = "Garaj kaydedildi. Sürüm " + FormatVersion + ", işlem " + revision + ".";
      }
      catch (Exception e) when (e is IOException || e is UnauthorizedAccessException || e is NotSupportedException)
      {
        // Ana dosya hiçbir zaman delete+move ile değiştirilmez. Başarısız geçici dosya tanı için kalır.
        Status = "Garaj kaydedilemedi; önceki kayıt korunuyor. " + e.Message;
        throw;
      }
    }

    private Attempt Read(string path)
    {
      var result = new Attempt { Exists = File.Exists(path) || Directory.Exists(path) };
      if (!result.Exists) return result;
      try
      {
        var info = new FileInfo(path);
        if (info.Length > MaxFileBytes) throw new FormatException("Kayıt boyutu sınırı aşıldı.");
        byte[] bytes = File.ReadAllBytes(path);
        result.Fingerprint = Hash(bytes);
        var envelope = CatalogNode.Parse(Utf8.GetString(bytes));
        // Yalnız daha yeni biçim korunur; daha küçük/bozuk sürüm geçersiz kayıttır ve yedekten kurtarılır.
        if (envelope["version"].IsNumber && envelope["version"].N() > FormatVersion)
        { result.Future = true; throw new FormatException("Desteklenmeyen dosya sürümü."); }
        if (envelope["format"].S() != "last-turn-garage" || !envelope["version"].IsNumber ||
            envelope["version"].N() != FormatVersion)
          throw new FormatException("Bilinmeyen garaj dosyası biçimi/sürümü.");
        double storedRevision = envelope["revision"].N(double.NaN);
        if (double.IsNaN(storedRevision) || storedRevision < 1 || storedRevision > 9007199254740991d || storedRevision % 1 != 0)
          throw new FormatException("Geçersiz kayıt işlem numarası.");
        result.Revision = (long)storedRevision;
        string payload = envelope["payload"].S();
        string checksum = envelope["checksum"].S();
        if (payload.Length == 0 || checksum != Hash(Utf8.GetBytes(payload)))
          throw new FormatException("Kayıt bütünlüğü doğrulanamadı.");
        var snapshot = CatalogNode.Parse(payload);
        // Ek alanlar varsayılabilir; ekonomik defterin eksikliği sıfır sahiplik diye kabul edilmez.
        if (!snapshot.Has("progress") || !snapshot["progress"].Has("xp") ||
            !snapshot["progress"].Has("kazanilan") || !snapshot["progress"].Has("alimlar"))
          throw new FormatException("Garajın zorunlu ilerleme/ekonomi defteri eksik.");
        if (GarageState.SnapshotSource(snapshot, out _) == GarageState.SourceAge.Unsupported)
        { result.Future = true; throw new FormatException("Daha yeni ya da bilinmeyen katalog kaynağına ait garaj kaydı."); }
        if (snapshot["version"].IsNumber && snapshot["version"].N() > GarageState.Version)
        { result.Future = true; throw new FormatException("Desteklenmeyen garaj veri sürümü."); }
        var progressVersion = snapshot["progress"]["surum"];
        if (progressVersion.IsNumber && progressVersion.N() > 3)
        { result.Future = true; throw new FormatException("Desteklenmeyen ilerleme veri sürümü."); }
        result.State = GarageState.Restore(catalog, snapshot);
        result.Valid = true;
      }
      catch (Exception e) when (e is IOException || e is UnauthorizedAccessException || e is FormatException ||
          e is ArgumentException || e is InvalidOperationException || e is OverflowException || e is IndexOutOfRangeException)
      { result.Error = e.Message; }
      return result;
    }

    private static string Hash(byte[] bytes)
    {
      using (var sha = SHA256.Create())
        return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant();
    }
  }
}
