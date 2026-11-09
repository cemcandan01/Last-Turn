using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
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
      if (LastTurn.Prototype.OfflineValidationRuntime.Active) { Unavailable="Bağımsız ürün doğrulaması: bulut kapalı."; return; }
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
        var transport = new WebTransport();
        var google = new GoogleDesktopAuth(CloudConfig.GoogleDesktopClientId, CloudConfig.GoogleDesktopClientSecret, transport, new LoopbackBrowser());
        var provider = new FirebaseRestProvider(CloudConfig.ApiKey, CloudConfig.ProjectId, transport,
          new FileSessionStore(Path.Combine(Folder, "cloud-session-v1.json")), () => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), google);
        var sync = new CloudSync(provider, new LocalSave(), new FileOwnerStore(Path.Combine(Folder, "cloud-v1.json")));
        Account = new CloudAccount(provider, sync, new FileKnownAccounts(Path.Combine(Folder, "cloud-accounts-v1.json"))) { Level = () => GarageSession.State?.Level ?? 1 };
        Account.Start();
      }
      catch (Exception e) { Account = null; Unavailable = "Bulut başlatılamadı: " + e.Message; }
    }

    private bool adminSeen;
    private void Update()
    {
      if (Account != null && GarageSession.PlayerProfile) Account.Sync.Tick(Time.realtimeSinceStartupAsDouble);
      // "Her şey açık" kipi değişince menü özetleri (kilitler) yeniden okunur.
      if (adminSeen != GarageState.AdminMode) { adminSeen = GarageState.AdminMode; GameFlow.Refresh(); }
    }

    // Kapanırken bekleyen yazma denenir; yetişmezse bekleyen işareti sonraki açılışta gönderilir.
    private void OnApplicationQuit() { if (Account != null && GarageSession.PlayerProfile && Account.Sync.Pending) _ = Account.Sync.SendNow(); }

    // ---------- Komutlar (Profil ekranı)
    public static void CreateEmail(string email, string password) { if (Account != null) _ = Account.CreateEmail(email, password); }
    public static void SignInEmail(string email, string password) { if (Account != null) _ = Account.SignInEmail(email, password); }
    public static void ResetPassword(string email) { if (Account != null) _ = Account.ResetPassword(email); }
    public static void LinkGoogle(string hint = null) { if (Account != null) _ = Account.LinkGoogle(hint); }
    public static bool RemoveKnown(string uid) => Account != null && Account.RemoveKnown(uid);

    /// TS yeniOyuncu: yerel ilerleme, rekorlar ve profil sayaçları silinir; ayarlar kalır; yeni misafirle başlanır.
    public static void NewPlayer() { if (Account != null && GarageSession.PlayerProfile) _ = Account.NewPlayer(ResetLocal); }
    private static void ResetLocal()
    {
      var next = GarageSession.State.ResetProgress();
      next.SelectCar((int)GarageSession.Catalog.Data["prices"]["initialCar"].N());
      GarageSession.Commit(next, "Yeni oyuncu: ilerleme sıfırlandı.");
      var store = GarageRace.ProfileStore(); var p = store.Load();
      CloudLocalMapper.ClearRecords(p); p.Rename(""); p.Races = 0; p.Wins = 0; p.Km = 0; p.Use.Clear();
      store.Save(p);
      GameFlow.Refresh();
    }

    // ---------- Admin (TS hesap.ts adminParaEkle/adminXpEkle/adminSeviye/adminKilitAyarla/adminHerSeyAcik/adminSifirla)
    private static bool Admin(Func<GarageState, bool> change, string info)
      => Account != null && GarageSession.PlayerProfile && Account.AdminRun(() =>
      {
        bool ok = GarageSession.Transact(change, info);
        GameFlow.Refresh();
        return ok;
      }, info);
    public static bool AdminMoney(double amount) => Admin(s => { s.AddMoney(amount); return true; }, "+" + amount + " para");
    public static bool AdminXp(double amount) => Admin(s => { s.AddXp(amount); return true; }, "+" + amount + " XP");
    public static bool AdminLevel(int level) => level >= 1 && Admin(s => { s.AdminSetLevel(level); return true; }, "Seviye " + level);
    public static bool AdminUnlock(string key, bool open) => Admin(s => s.AdminSetUnlock(key, open), key + (open ? " açıldı" : " kilitlendi"));
    public static bool AdminAll(bool on) => Account != null && Account.AdminAll(on);
    public static bool AdminReset()
      => Account != null && GarageSession.PlayerProfile && Account.AdminRun(() =>
      {
        try
        {
          GarageSession.Commit(GarageSession.State.ResetProgress(), "İlerleme sıfırlandı.");
          var store = GarageRace.ProfileStore(); var p = store.Load();
          if (CloudLocalMapper.ClearRecords(p)) store.Save(p);
        }
        catch (Exception) { return false; }
        GameFlow.Refresh();
        return true;
      }, "İlerleme sıfırlandı");
#if UNITY_EDITOR
    // Grafik test gerçek Firebase/oturum dosyası kullanmadan aynı hesap servisini bağlayabilir.
    public static void SetUiValidationAccount(CloudAccount account)
    {
      if(Application.productName!="LastTurnUiValidation"||Application.companyName!="LastTurnProfileUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)
        throw new InvalidOperationException("Yalnız ayrı profil arayüzü testinde kullanılabilir.");
      Account=account;
    }
#endif

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

    /// TS lt_hesaplar: yalnız uid, tür, etiket, seviye ve admin; şifre/belirteç yok. Bozuk dosya boş liste sayılır.
    private sealed class FileKnownAccounts : IKnownAccountStore
    {
      private readonly string path;
      public FileKnownAccounts(string path) { this.path = path; }
      public List<KnownAccount> Load()
      {
        try
        {
          if (!File.Exists(path)) return new List<KnownAccount>();
          return CatalogNode.Parse(File.ReadAllText(path))["liste"].Items.Where(n => n["uid"].S() != "")
            .Select(n => new KnownAccount { Uid = n["uid"].S(), Yol = n["yol"].S() == "google" ? "google" : "eposta", Label = n["etiket"].S(), Level = Math.Max(1, (int)n["lv"].N()), Admin = n["admin"].B() }).ToList();
        }
        catch (Exception e) when (e is FormatException || e is IOException) { return new List<KnownAccount>(); }
      }
      public void Save(List<KnownAccount> accounts)
      {
        var root = CatalogNode.Obj();
        root.Set("liste", CatalogNode.Arr(accounts.Select(h =>
        {
          var n = CatalogNode.Obj();
          n.Set("uid", CatalogNode.Str(h.Uid)); n.Set("yol", CatalogNode.Str(h.Yol)); n.Set("etiket", CatalogNode.Str(h.Label));
          n.Set("lv", CatalogNode.Num(h.Level)); n.Set("admin", CatalogNode.Bool(h.Admin));
          return n;
        })));
        WriteAtomic(path, root.ToString());
      }
    }

    /// Masaüstü Google girişi: 127.0.0.1 üzerinde boş bir bağlantı noktasında tek istek dinlenir, Google hesap seçici varsayılan
    /// tarayıcıda açılır. Dönüş 3 dakikada gelmezse vazgeçilir.
    private sealed class LoopbackBrowser : ILoopbackBrowser
    {
      public async Task<(string Redirect, Dictionary<string, string> Query)> Authorize(Func<string, string> url)
      {
        var probe = new TcpListener(IPAddress.Loopback, 0); probe.Start();
        int port = ((IPEndPoint)probe.LocalEndpoint).Port; probe.Stop();
        string redirect = "http://127.0.0.1:" + port;
        using var listener = new HttpListener();
        listener.Prefixes.Add(redirect + "/");
        listener.Start();
        Application.OpenURL(url(redirect));
        var wait = listener.GetContextAsync();
        if (await Task.WhenAny(wait, Task.Delay(TimeSpan.FromMinutes(3))) != wait) { listener.Stop(); throw new CloudError("google-timeout"); }
        var context = await wait;
        var query = GoogleDesktopAuth.ParseQuery(context.Request.Url.Query);
        byte[] page = Encoding.UTF8.GetBytes("<!doctype html><html lang=\"tr\"><meta charset=\"utf-8\"><title>Last Turn</title><body style=\"font-family:sans-serif;background:#111;color:#eee;padding:40px\"><h2>"
          + (query.ContainsKey("code") ? "Giriş alındı." : "Giriş tamamlanmadı.") + "</h2><p>Bu sekmeyi kapatıp Last Turn'e dönebilirsin.</p></body></html>");
        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.ContentLength64 = page.Length;
        await context.Response.OutputStream.WriteAsync(page, 0, page.Length);
        context.Response.Close();
        listener.Stop();
        return (redirect, query);
      }
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
