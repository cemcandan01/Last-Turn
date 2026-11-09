#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LastTurn.Core
{
  /// TS BilinenHesap: bu cihazda daha önce girilmiş hesap. Yalnız uid, tür, e-posta/ad ve gösterim için seviye/admin;
  /// şifre ya da belirteç saklanmaz.
  public sealed class KnownAccount { public string Uid = "", Yol = "eposta", Label = ""; public int Level = 1; public bool Admin; }
  /// TS lt_hesaplar: en son kullanılan başta.
  public interface IKnownAccountStore { List<KnownAccount> Load(); void Save(List<KnownAccount> accounts); }
  public sealed class MemoryKnownAccounts : IKnownAccountStore
  {
    private List<KnownAccount> list = new List<KnownAccount>();
    public List<KnownAccount> Load() => list.Select(Copy).ToList();
    public void Save(List<KnownAccount> accounts) => list = accounts.Select(Copy).ToList();
    public static KnownAccount Copy(KnownAccount h) => new KnownAccount { Uid = h.Uid, Yol = h.Yol, Label = h.Label, Level = h.Level, Admin = h.Admin };
  }

  // TS bulut/hesap.ts: Profil ekranının kullandığı tek giriş noktası. İlk açılışta sessizce misafir hesap açılır;
  // e-postayla bağlanınca aynı ilerleme başka cihazda (web dahil) açılır. Görünüm yalnız bu durumu okur ve komut çağırır.
  // Hesap değiştirme listesi (bilinen hesaplar), admin oturumu ve "yeni oyuncu" da burada; garaj kaydına dokunan işlemler
  // Unity tarafından verilen eylemle yapılır.
  public sealed class CloudAccount
  {
    private readonly ICloudProvider provider;
    public CloudSync Sync { get; }
    public CloudUser? User { get; private set; }
    public string? Error { get; private set; }
    public string? Info { get; private set; }
    public bool Busy { get; private set; }
    /// TS D.admin: sunucuda admins/{uid} var; admin paneli ve "her şey açık" kipi.
    public bool Admin { get; private set; }
    private readonly IKnownAccountStore known;
    public event Action? Changed;
    private bool first = true;
    /// Bağlanma bildirimi için seviye (TS seviye().lv); Unity tarafı verir.
    public Func<int> Level = () => 1;

    public CloudAccount(ICloudProvider provider, CloudSync sync, IKnownAccountStore? known = null)
    {
      this.provider = provider; Sync = sync; this.known = known ?? new MemoryKnownAccounts();
      sync.StatusChanged += s =>
      {
        if (s == CloudSyncStatus.Tamam && User != null) Remember(User, Level(), null);
        Changed?.Invoke();
      };
    }

    private void SetAdmin(bool on) { Admin = on; GarageState.AdminMode = on; }

    /// TS hesapHatirla: listeye ekle ya da güncelle (en son kullanılan başa). Misafir listelenmez.
    private void Remember(CloudUser k, int? level, bool? admin)
    {
      if (k.Anonim) return;
      var list = known.Load();
      var old = list.FirstOrDefault(h => h.Uid == k.Uid);
      var h = new KnownAccount
      {
        Uid = k.Uid, Yol = k.Yol == "google" ? "google" : "eposta",
        Label = k.Eposta ?? k.Ad ?? old?.Label ?? "Google",
        Level = level ?? old?.Level ?? 1, Admin = admin ?? old?.Admin ?? false,
      };
      list.RemoveAll(x => x.Uid == k.Uid);
      list.Insert(0, h);
      known.Save(list);
    }

    /// TS bilinenHesaplar: bu cihazda girilmiş hesaplar (şu anki hesabın seviyesi canlı).
    public List<KnownAccount> KnownAccounts() => known.Load().Select(h =>
    {
      if (h.Uid != User?.Uid) return h;
      var c = MemoryKnownAccounts.Copy(h); c.Level = Level(); c.Admin = Admin; return c;
    }).ToList();

    /// TS hesapKaldir: yalnız bu cihazın listesinden; hesap ve bulut kaydı kalır. Şu anki hesap kaldırılmaz.
    public bool RemoveKnown(string uid)
    {
      if (uid == User?.Uid) return false;
      var list = known.Load();
      if (list.RemoveAll(h => h.Uid == uid) == 0) return false;
      known.Save(list);
      Changed?.Invoke();
      return true;
    }

    /// TS hesapBaslat: oturumu dinler, yoksa misafir açar; her oturum değişiminde eşitleyiciye bildirir.
    public void Start()
    {
      provider.ListenSession(k =>
      {
        User = k;
        SetAdmin(false);
        if (k != null) Remember(k, null, null);
        Changed?.Invoke();
        bool guest = k == null && first;
        first = false;
        // Önce bu oturum bildirilir: misafir girişi eşzamanlı dönerse yeni oturum bu çağrıyla ezilmesin.
        _ = Sync.Session(k?.Uid, k?.Anonim ?? false);
        if (guest) _ = Ignore(provider.SignInAnonymous());
        // Admin yetkisi sunucuda (Firestore admins/{uid}); misafir admin olamaz.
        if (k != null && !k.Anonim) _ = CheckAdmin(k);
      });
    }

    private async Task CheckAdmin(CloudUser k)
    {
      bool a;
      try { a = await provider.IsAdmin(k.Uid); } catch { a = false; }
      if (User?.Uid != k.Uid) return;
      Remember(k, null, a);
      if (!a) return;
      SetAdmin(true);
      Changed?.Invoke();
    }

    private static async Task Ignore(Task t) { try { await t; } catch { } }

    /// TS hataMetni: Firebase kodu → Türkçe metin (kod sonda görünür; kapatılan pencere sessiz).
    public static string? ErrorText(Exception e)
    {
      string k = e is CloudError c ? c.Code : e.Message;
      string kod = " (" + (k.StartsWith("auth/") ? k.Substring(5) : k) + ")";
      if (k.Contains("popup-closed") || k.Contains("cancelled-popup")) return null;
      if (k.Contains("network")) return "İnternet yok; bağlanınca yeniden dene" + kod;
      if (k.Contains("popup-blocked")) return "Pencere açılamadı; yeniden dene" + kod;
      if (k.Contains("wrong-password") || k.Contains("invalid-credential") || k.Contains("invalid-login"))
        return "E-posta ya da şifre yanlış (hesabın yoksa yeni hesap oluştur)" + kod;
      if (k.Contains("invalid-email")) return "E-posta geçersiz" + kod;
      if (k.Contains("email-already-in-use") || k.Contains("credential-already-in-use"))
        return "Bu e-postayla zaten hesap var; şifrenle giriş yap" + kod;
      if (k.Contains("user-not-found")) return "Bu e-postayla hesap yok; yeni hesap oluştur" + kod;
      if (k.Contains("missing-password")) return "Şifre yaz" + kod;
      if (k.Contains("weak-password")) return "Şifre en az 6 karakter olmalı" + kod;
      if (k.Contains("operation-not-allowed")) return "Bu giriş yolu henüz açılmadı (Firebase ayarı)" + kod;
      if (k.Contains("google-desktop")) return "Bu kurulumda Google girişi ayarlanmadı; e-postayla bağlan" + kod;
      if (k.Contains("google-timeout")) return "Google girişi tarayıcıda tamamlanmadı; yeniden dene" + kod;
      if (k.Contains("account-exists-with-different-credential")) return "Bu e-posta başka yolla kayıtlı; o yolla giriş yap" + kod;
      if (k.Contains("too-many-requests")) return "Çok deneme yapıldı; biraz sonra yeniden dene" + kod;
      if (k.Contains("gonderilemedi")) return "Bu hesabın son ilerlemesi buluta gönderilemedi; internet gelince yeniden dene" + kod;
      return "Bağlanılamadı" + kod;
    }

    private static string Who(CloudUser? k) => k == null || k.Anonim ? "Misafir" : (k.Yol == "google" ? "Google" : "E-posta") + (k.Eposta != null ? " · " + k.Eposta : "");

    /// TS islem: işlemi yürütür; başarılıysa true. switching: başarısızsa hangi hesapta kalındığı da yazılır.
    private async Task<bool> Run(Func<Task> f, Func<string>? info, bool switching)
    {
      if (Busy) return false;
      Busy = true; Error = null; Info = switching ? "Hesap değiştiriliyor…" : null;
      Changed?.Invoke();
      try
      {
        await f();
        Info = info?.Invoke();
        return true;
      }
      catch (Exception e)
      {
        Info = null;
        var h = ErrorText(e);
        Error = h != null && switching ? h + " · Hesap değişmedi: " + Who(User) : h;
        return false;
      }
      finally { Busy = false; Changed?.Invoke(); }
    }

    /// TS onceGonder: bağlı hesabın bekleyen yazması gönderilemezse hesap değiştirilmez (ilerleme kaybolmasın).
    private async Task SendFirst()
    {
      await Sync.SendNow();
      if (User != null && !User.Anonim && Sync.Pending) throw new CloudError("gonderilemedi");
    }

    private string Connected() => "Bağlandı: " + (User?.Eposta ?? "Google") + " · Seviye " + Level() + " · İlerlemen bulutta";

    /// TS googleBagla: misafirse hesaba bağlar (yeni Google hesabıysa misafirin ilerlemesi ona geçer; var olan hesapsa o
    /// hesabın ilerlemesi yüklenir); bağlı hesaptaysa başka Google hesabına geçer. hint: seçicide önerilen e-posta.
    public Task<bool> LinkGoogle(string? hint = null) => Run(async () =>
    { await SendFirst(); await provider.LinkGoogle(hint); await Sync.SendNow(); },
      () => User != null && !User.Anonim ? Connected() : "", true);

    /// TS yeniOyuncu: bekleyen kayıt gönderilir, hesaptan çıkılır, yerel ilerleme/rekor/profil sayaçları silinir (resetLocal;
    /// ayarlar kalır) ve yeni misafirle sıfırdan başlanır. Bağlı hesabın ilerlemesi bulutta kalır; misafirinki kaybolur.
    public async Task<bool> NewPlayer(Action resetLocal)
    {
      if (Busy) return false;
      Busy = true; Error = null; Info = null;
      Changed?.Invoke();
      try
      {
        try { await Sync.SendNow(); await Sync.Session(null); await provider.SignOut(); } catch { }
        resetLocal();
        Sync.ForgetOwner();
        try { await provider.SignInAnonymous(); }
        catch (Exception e) { Error = ErrorText(e); }
        if (Error == null) Info = "Yeni misafirle sıfırdan başlandı";
        return Error == null;
      }
      finally { Busy = false; Changed?.Invoke(); }
    }

    // ---------- admin (yalnız admin oturumunda; buluta yazma kuralları firestore.rules'ta)

    /// TS adminIslem: yalnız admin oturumunda çalışır, sonra hemen buluta yazılır. apply false dönerse bildirim yok.
    public bool AdminRun(Func<bool> apply, string info)
    {
      if (!Admin || Busy) return false;
      if (!apply()) return false;
      Error = null; Info = info;
      Changed?.Invoke();
      _ = Ignore(Sync.SendNow());
      return true;
    }

    /// TS adminHerSeyAcik: "her şey açık" kipini aç/kapa (normal oyuncu görünümünü denemek için); kayda yazılmaz.
    public bool AdminAll(bool on) => AdminRun(() => { GarageState.AdminMode = on; return true; }, on ? "Her şey açık" : "Normal oyuncu görünümü");

    /// TS epostaOlustur: misafirse ilerlemesi bu hesaba geçer; bağlı hesaptan açılırsa sıfırdan başlar.
    public Task<bool> CreateEmail(string email, string password) => Run(async () =>
    { await SendFirst(); await provider.CreateEmail(email.Trim(), password); await Sync.SendNow(); }, Connected, true);

    /// TS epostaGiris: bu cihazdaki ilerleme o hesabınkiyle değiştirilir (misafirden geçişte de).
    public Task<bool> SignInEmail(string email, string password) => Run(async () =>
    { await SendFirst(); await provider.SignInEmail(email.Trim(), password); await Sync.SendNow(); }, Connected, true);

    public Task<bool> ResetPassword(string email) => Run(() => provider.ResetPassword(email.Trim()),
      () => "Şifre sıfırlama e-postası gönderildi: " + email.Trim() + " (gelmezse gereksiz klasörüne bak)", false);

    /// TS hesapOzeti: "E-posta · ad@… · Bulutta" gibi.
    public string Summary()
    {
      var k = User;
      string who = k == null ? "Bağlanıyor…" : k.Anonim ? "Misafir (yalnız bu cihaz)" : Who(k);
      string es = Sync.Status switch
      {
        CloudSyncStatus.Tamam => "Bulutta",
        CloudSyncStatus.Esitleniyor => "Eşitleniyor…",
        CloudSyncStatus.Bekliyor => "İnternet gelince gönderilecek",
        CloudSyncStatus.Hata => "Eşitlenemedi",
        _ => "",
      };
      return es != "" && k != null ? who + " · " + es : who;
    }
  }
}
