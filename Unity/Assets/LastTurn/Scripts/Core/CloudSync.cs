#nullable enable
using System;
using System.Threading.Tasks;

namespace LastTurn.Core
{
  /// Eşitleyicinin gördüğü yerel kayıt (Unity'de GarageSession + yarış profili; testte bellek).
  public interface ICloudLocal
  {
    /// Kayıt her değiştiğinde değişen ucuz damga (dosya yazım zamanı/sayaç); değişince belge yeniden kurulur.
    string ChangeStamp { get; }
    /// TS belgeOlustur.
    CatalogNode Build(bool partless);
    /// Aynı hesap: TS ilerlemeYukle + takiliYukle + rekorBirlestir.
    void Merge(CatalogNode remote);
    /// Başka hesap: TS ilerlemeDegistir + rekorlariSil + takiliYukle(degistir) (+ rekorBirlestir).
    void Replace(CatalogNode? remote);
    /// TS navigator.onLine === false.
    bool Offline { get; }
  }

  /// TS lt_bulut: bekleyen yazma ve yerel kaydın sahibi hesap.
  public sealed class CloudOwnerRecord { public bool Pending; public string? Owner; public bool OwnerAnonymous; }
  public interface ICloudOwnerStore { CloudOwnerRecord Load(); void Save(CloudOwnerRecord record); }

  // TS bulut/esitleme.ts esitleyiciKur: oturum açılınca okuyup birleştirir (okunmadan yazmaz), kayıt değişince gecikmeli
  // tam belge yazar, ağ yoksa bekleyen işareti bırakır. Zaman Tick(saniye) ile ilerler; aynı anda tek eşitleme çalışır.
  public sealed class CloudSync
  {
    public const double DefaultDelay = 4;
    private readonly ICloudProvider provider;
    private readonly ICloudLocal local;
    private readonly ICloudOwnerStore owner;
    private readonly double delay;
    private string? uid, pulled;
    private bool anonymous, partRejected, wasOffline;
    private double now;
    private double? dueAt;
    private string lastWritten = "", observedStamp;
    private Task running = Task.CompletedTask;
    public CloudSyncStatus Status { get; private set; } = CloudSyncStatus.Yok;
    public event Action<CloudSyncStatus>? StatusChanged;

    public CloudSync(ICloudProvider provider, ICloudLocal local, ICloudOwnerStore owner, double delay = DefaultDelay)
    {
      this.provider = provider; this.local = local; this.owner = owner; this.delay = delay;
      observedStamp = local.ChangeStamp; wasOffline = local.Offline;
    }

    public bool Pending => owner.Load().Pending;
    /// Bekleyen yazma varken kapatılırsa (çıkış) bir sonraki açılışta gönderilir.
    public bool Busy => !running.IsCompleted;

    private void SetStatus(CloudSyncStatus s) { if (s == Status) return; Status = s; StatusChanged?.Invoke(s); }
    private void SetPending(bool b) { var r = owner.Load(); r.Pending = b; owner.Save(r); }
    private void Fail() { SetPending(true); SetStatus(local.Offline ? CloudSyncStatus.Bekliyor : CloudSyncStatus.Hata); }

    /// TS cek: yerel kayıt bu hesabınsa birleştir, başka hesabınsa onunla değiştir.
    private async Task<bool> Pull(string u)
    {
      var remote = await provider.Read(u);
      if (u != uid) return false;
      var k = owner.Load();
      bool other = CloudContract.ReplacesLocal(k.Owner, k.OwnerAnonymous, u, anonymous);
      lastWritten = "";
      if (other) local.Replace(remote);
      else if (remote != null) local.Merge(remote);
      // Buluttan gelen değişiklik kullanıcı değişikliği sayılmaz (TS yukleniyor).
      observedStamp = local.ChangeStamp;
      owner.Save(new CloudOwnerRecord { Pending = !other && k.Pending, Owner = u, OwnerAnonymous = anonymous });
      if (remote != null)
      {
        var r = remote.Clone();
        if (!r["rekor"].IsObject) r.Set("rekor", CatalogNode.Obj());
        lastWritten = CloudContract.Summary(r);
      }
      pulled = u;
      return true;
    }

    /// TS esitle: gerekirse önce çeker, sonra yerel kaydın tamamını yazar (değişmediyse yazmaz).
    private async Task Sync()
    {
      dueAt = null;
      var u = uid;
      if (u == null) return;
      if (local.Offline) { if (pulled != u || Pending) Fail(); return; }
      try
      {
        if (pulled != u)
        {
          SetStatus(CloudSyncStatus.Esitleniyor);
          if (!await Pull(u)) return;
        }
        var b = local.Build(partRejected);
        var oz = CloudContract.Summary(b);
        if (oz != lastWritten)
        {
          try { await provider.Write(u, b); }
          catch
          {
            // Eski kurallar parca alanını tanımaz: alansız bir kez daha; geçerse bu açılışta parçalar yalnız cihazda.
            if (!b.Has("parca") || u != uid) throw;
            b = local.Build(true);
            oz = CloudContract.Summary(b);
            await provider.Write(u, b);
            partRejected = true;
          }
          if (u != uid) return;
          lastWritten = oz;
        }
        SetPending(false);
        SetStatus(CloudSyncStatus.Tamam);
      }
      catch
      {
        // Yazma reddedildiyse (ör. başka cihaz araya girdi) sonraki denemede önce yeniden çekilir.
        if (u == uid) pulled = null;
        Fail();
      }
    }

    private async Task After(Task previous)
    {
      try { await previous; } catch { }
      await Sync();
    }
    private Task Queue() => running = After(running);

    /// Oturum açılınca (uid; anonim: misafir) ya da kapanınca (null).
    public Task Session(string? newUid, bool anon = false)
    {
      uid = newUid; anonymous = anon; pulled = null; dueAt = null;
      if (newUid == null) { SetStatus(CloudSyncStatus.Yok); return running; }
      return Queue();
    }

    /// Bekleyen yazmayı hemen gönder.
    public Task SendNow() => Queue();

    /// TS yeniOyuncu lt_bulut = {bekleyen:false}: yerel kayıt artık hiçbir hesaba ait değil (yeni misafir birleştirir).
    public void ForgetOwner() => owner.Save(new CloudOwnerRecord());

    /// Her karede/saniyede: kayıt değişimini, gecikmeli yazmayı ve internetin geri gelişini izler.
    public void Tick(double seconds)
    {
      now = seconds;
      string stamp = local.ChangeStamp;
      if (stamp != observedStamp)
      {
        observedStamp = stamp;
        SetPending(true);
        if (uid != null) dueAt = now + delay;
      }
      bool offline = local.Offline;
      if (wasOffline && !offline && uid != null && (Pending || pulled != uid)) { dueAt = null; Queue(); }
      wasOffline = offline;
      if (dueAt.HasValue && now >= dueAt.Value) { dueAt = null; Queue(); }
    }
  }
}
