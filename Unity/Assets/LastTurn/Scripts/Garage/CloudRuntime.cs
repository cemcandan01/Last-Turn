using System;
using System.IO;
using System.Threading.Tasks;
using LastTurn.Core;
using UnityEngine;
using System.Net.Http;

namespace LastTurn.Garage
{
  // Bulut hesabı ve eşitleme (TS bulutKur): normal oyuncu profilinde açılışta Firebase'e bağlanır. Geliştirici profili ve
  // batch/otomatik testler gerçek buluta bağlanmaz (TS navigator.webdriver). Kural ve durum Core'da (CloudAccount/CloudSync).
  public sealed class CloudRuntime : MonoBehaviour
  {
    public static CloudAccount Account { get; private set; }
    /// Profil ekranı satırı: bağlı değilse neden.
    public static string Unavailable { get; private set; } = "";
    private static CloudRuntime instance;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void ResetStatics() { Account = null; Unavailable = ""; instance = null; }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Install()
    {
      if (instance) return;
      if (Application.isBatchMode) { Unavailable = "Otomatik test: bulut kapalı."; return; }
#if UNITY_EDITOR
      // Ayrı grafik Editor doğrulaması gerçek Game View kullanır; oyuncu hesabına bağlanmaz.
      if (Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") >= 0)
      { Unavailable = "Arayüz doğrulaması: bulut kapalı."; return; }
#endif
      var go = new GameObject("Bulut");
      DontDestroyOnLoad(go);
      instance = go.AddComponent<CloudRuntime>();
    }

    private static string Folder => Path.Combine(Application.persistentDataPath, "LastTurnGarage");

    private void Start()
    {
      try
      {
        GarageSession.EnsureLoaded();
        var provider = new FirebaseRestProvider(CloudConfig.ApiKey, CloudConfig.ProjectId, new WebTransport(),
          new FileSessionStore(Path.Combine(Folder, "cloud-session-v1.json")), () => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        var sync = new CloudSync(provider, new LocalSave(), new FileOwnerStore(Path.Combine(Folder, "cloud-v1.json")));
        Account = new CloudAccount(provider, sync) { Level = () => GarageSession.State?.Level ?? 1 };
        Account.Start();
      }
      catch (Exception e) { Account = null; Unavailable = "Bulut başlatılamadı: " + e.Message; }
    }

    private void Update() { if (Account != null && GarageSession.PlayerProfile) Account.Sync.Tick(Time.realtimeSinceStartupAsDouble); }

    // Kapanırken bekleyen yazma denenir; yetişmezse bekleyen işareti sonraki açılışta gönderilir.
    private void OnApplicationQuit() { if (Account != null && GarageSession.PlayerProfile && Account.Sync.Pending) _ = Account.Sync.SendNow(); }

    // ---------- Komutlar (Profil ekranı)
    public static void CreateEmail(string email, string password) { if (Account != null) _ = Account.CreateEmail(email, password); }
    public static void SignInEmail(string email, string password) { if (Account != null) _ = Account.SignInEmail(email, password); }
    public static void ResetPassword(string email) { if (Account != null) _ = Account.ResetPassword(email); }

    /// Yerel kayıt: garaj (ilerleme, parçalar) + yarış profili (rekorlar). Geliştirici profili eşitlenmez.
    private sealed class LocalSave : ICloudLocal
    {
      private static void Normal() { GarageSession.EnsureLoaded(); if (!GarageSession.PlayerProfile) throw new InvalidOperationException("Yalnız oyuncu profili eşitlenir."); }
      private static long Stamp(string path) => File.Exists(path) ? File.GetLastWriteTimeUtc(path).Ticks : 0;
      public string ChangeStamp
      {
        get
        {
          if (!GarageSession.PlayerProfile) return "";
          return Stamp(GarageSession.Store.FilePath) + "|" + Stamp(GarageRace.ProfileStore().ProfileFile);
        }
      }
      public CatalogNode Build(bool partless)
      {
        Normal();
        return CloudLocalMapper.BuildDocument(GarageSession.State, GarageRace.ProfileStore().Load(), "unity-" + Application.version,
          DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), partless);
      }
      public void Merge(CatalogNode remote)
      {
        Normal();
        GarageSession.Commit(CloudLocalMapper.Merge(GarageSession.State, remote), "Bulut kaydı birleştirildi.");
        var store = GarageRace.ProfileStore(); var p = store.Load();
        if (CloudLocalMapper.MergeRecords(p, remote["rekor"])) store.Save(p);
        GameFlow.Refresh();
      }
      public void Replace(CatalogNode remote)
      {
        Normal();
        GarageSession.Commit(CloudLocalMapper.Replace(GarageSession.State, remote), "Hesabın bulut kaydı yüklendi.");
        var store = GarageRace.ProfileStore(); var p = store.Load();
        bool changed = CloudLocalMapper.ClearRecords(p);
        if (remote != null) changed |= CloudLocalMapper.MergeRecords(p, remote["rekor"]);
        if (changed) store.Save(p);
        GameFlow.Refresh();
      }
      public bool Offline => Application.internetReachability == NetworkReachability.NotReachable;
    }

    /// HttpClient taşıyıcısı (masaüstü ve ileride mobil); bağlantı hatası/zaman aşımı TS "network-request-failed" olur.
    /// Ana iş parçacığından çağrılır; await Unity eşzamanlama bağlamına döner, kayıt işlemleri ana iş parçacığında kalır.
    private sealed class WebTransport : ICloudHttp
    {
      private static readonly HttpClient Client = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
      public async Task<CloudHttpResponse> Send(CloudHttpRequest r)
      {
        using var req = new HttpRequestMessage(new HttpMethod(r.Method), r.Url);
        if (r.Method != "GET") req.Content = new StringContent(r.Body, System.Text.Encoding.UTF8, r.ContentType);
        foreach (var h in r.Headers) req.Headers.TryAddWithoutValidation(h.Key, h.Value);
        try
        {
          using var res = await Client.SendAsync(req);
          return new CloudHttpResponse { Status = (int)res.StatusCode, Body = await res.Content.ReadAsStringAsync() };
        }
        catch (Exception e) when (e is HttpRequestException || e is TaskCanceledException || e is System.Net.WebException) { throw new CloudError("network-request-failed"); }
      }
    }

    private static void WriteAtomic(string path, string text)
    {
      Directory.CreateDirectory(Path.GetDirectoryName(path));
      string tmp = path + ".tmp"; File.WriteAllText(tmp, text);
      if (File.Exists(path)) File.Replace(tmp, path, null); else File.Move(tmp, path);
    }

    private sealed class FileSessionStore : ICloudSessionStore
    {
      private readonly string path;
      public FileSessionStore(string path) { this.path = path; }
      public CatalogNode Load() => File.Exists(path) ? CatalogNode.Parse(File.ReadAllText(path)) : null;
      public void Save(CatalogNode session) { if (session == null) { if (File.Exists(path)) File.Delete(path); } else WriteAtomic(path, session.ToString()); }
    }

    private sealed class FileOwnerStore : ICloudOwnerStore
    {
      private readonly string path;
      public FileOwnerStore(string path) { this.path = path; }
      public CloudOwnerRecord Load()
      {
        try
        {
          if (!File.Exists(path)) return new CloudOwnerRecord();
          var n = CatalogNode.Parse(File.ReadAllText(path));
          return new CloudOwnerRecord { Pending = n["bekleyen"].B(), Owner = n["sahip"].IsString ? n["sahip"].S() : null, OwnerAnonymous = n["sahipAnonim"].B() };
        }
        catch (Exception e) when (e is FormatException || e is IOException) { return new CloudOwnerRecord { Pending = true }; }
      }
      public void Save(CloudOwnerRecord r)
      {
        var n = CatalogNode.Obj();
        n.Set("bekleyen", CatalogNode.Bool(r.Pending));
        if (r.Owner != null) n.Set("sahip", CatalogNode.Str(r.Owner));
        n.Set("sahipAnonim", CatalogNode.Bool(r.OwnerAnonymous));
        WriteAtomic(path, n.ToString());
      }
    }
  }
}
