#nullable enable
using System;
using System.Threading.Tasks;

namespace LastTurn.Core
{
  // TS bulut/hesap.ts: Profil ekranının kullandığı tek giriş noktası. İlk açılışta sessizce misafir hesap açılır;
  // e-postayla bağlanınca aynı ilerleme başka cihazda (web dahil) açılır. Görünüm yalnız bu durumu okur ve komut çağırır.
  // Bu adımda yok: Google girişi (masaüstü yönlendirme), bilinen hesaplar listesi, admin paneli, "yeni oyuncu".
  public sealed class CloudAccount
  {
    private readonly ICloudProvider provider;
    public CloudSync Sync { get; }
    public CloudUser? User { get; private set; }
    public string? Error { get; private set; }
    public string? Info { get; private set; }
    public bool Busy { get; private set; }
    public event Action? Changed;
    private bool first = true;
    /// Bağlanma bildirimi için seviye (TS seviye().lv); Unity tarafı verir.
    public Func<int> Level = () => 1;

    public CloudAccount(ICloudProvider provider, CloudSync sync)
    {
      this.provider = provider; Sync = sync;
      sync.StatusChanged += _ => Changed?.Invoke();
    }

    /// TS hesapBaslat: oturumu dinler, yoksa misafir açar; her oturum değişiminde eşitleyiciye bildirir.
    public void Start()
    {
      provider.ListenSession(k =>
      {
        User = k;
        Changed?.Invoke();
        bool guest = k == null && first;
        first = false;
        // Önce bu oturum bildirilir: misafir girişi eşzamanlı dönerse yeni oturum bu çağrıyla ezilmesin.
        _ = Sync.Session(k?.Uid, k?.Anonim ?? false);
        if (guest) _ = Ignore(provider.SignInAnonymous());
      });
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
