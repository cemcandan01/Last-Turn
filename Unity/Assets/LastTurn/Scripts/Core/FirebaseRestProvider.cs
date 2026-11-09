#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;

namespace LastTurn.Core
{
  public sealed class CloudHttpRequest
  {
    public string Method = "GET", Url = "", Body = "", ContentType = "application/json";
    public readonly Dictionary<string, string> Headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
  }
  public sealed class CloudHttpResponse { public int Status; public string Body = ""; }
  /// Ağ taşıyıcısı (Unity'de UnityWebRequest, testte sahte sunucu). Bağlantı yoksa CloudError("network-request-failed") atar.
  public interface ICloudHttp { Task<CloudHttpResponse> Send(CloudHttpRequest request); }
  /// Oturumun kalıcı kısmı (uid, yenileme belirteci, tür, e-posta); kimlik belirteci saklanmaz. null: oturum yok.
  public interface ICloudSessionStore { CatalogNode? Load(); void Save(CatalogNode? session); }

  /// Firebase/TS hata kodu ("email-already-in-use", "network-request-failed" …); metni CloudAccount.ErrorText verir.
  public sealed class CloudError : Exception
  {
    public string Code { get; }
    public CloudError(string code) : base(code) { Code = code; }
  }

  // TS bulut/firebase.ts karşılığı: Firebase Auth (Identity Toolkit + Secure Token) ve Firestore REST. Web sürümüyle aynı
  // proje, hesaplar ve users/{uid} belgesi. Google: IGoogleSignIn'den gelen kimlik belirteci signInWithIdp ile oturuma çevrilir.
  public sealed class FirebaseRestProvider : ICloudProvider
  {
    private const string Auth = "https://identitytoolkit.googleapis.com/v1/accounts:";
    private const string Token = "https://securetoken.googleapis.com/v1/token?key=";
    private readonly string apiKey, documents;
    private readonly ICloudHttp http;
    private readonly ICloudSessionStore store;
    private readonly Func<double> nowMs;
    private readonly IGoogleSignIn? google;
    private readonly List<Action<CloudUser?>> listeners = new List<Action<CloudUser?>>();
    private CloudUser? user;
    private string refresh = "", idToken = "";
    private double expiresAt;
    private bool restored;

    public FirebaseRestProvider(string apiKey, string projectId, ICloudHttp http, ICloudSessionStore store, Func<double> nowMs, IGoogleSignIn? google = null)
    {
      this.apiKey = apiKey; this.http = http; this.store = store; this.nowMs = nowMs; this.google = google;
      documents = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/";
    }

    public CloudUser? CurrentUser { get { Restore(); return user; } }

    private void Restore()
    {
      if (restored) return;
      restored = true;
      CatalogNode? s = null;
      try { s = store.Load(); } catch (Exception e) when (e is FormatException || e is System.IO.IOException) { }
      if (s == null || s["uid"].S() == "" || s["refresh"].S() == "") return;
      refresh = s["refresh"].S();
      user = new CloudUser { Uid = s["uid"].S(), Anonim = s["anonim"].B(), Yol = s["yol"].S("anonim"), Eposta = s["eposta"].IsString ? s["eposta"].S() : null, Ad = s["ad"].IsString ? s["ad"].S() : null };
    }

    private void Notify() { foreach (var f in listeners.ToArray()) f(user); }

    private void SetSession(CatalogNode r, bool anonymous, string path)
    {
      user = new CloudUser { Uid = r["localId"].S(), Anonim = anonymous, Yol = path, Eposta = r["email"].IsString && r["email"].S() != "" ? r["email"].S() : null,
        Ad = r["displayName"].IsString && r["displayName"].S() != "" ? r["displayName"].S() : null };
      idToken = r["idToken"].S();
      refresh = r["refreshToken"].S();
      expiresAt = nowMs() + Seconds(r["expiresIn"]) * 1000;
      Persist();
      Notify();
    }

    private void Persist()
    {
      if (user == null) { store.Save(null); return; }
      var s = CatalogNode.Obj();
      s.Set("uid", CatalogNode.Str(user.Uid)); s.Set("refresh", CatalogNode.Str(refresh));
      s.Set("anonim", CatalogNode.Bool(user.Anonim)); s.Set("yol", CatalogNode.Str(user.Yol));
      s.Set("eposta", user.Eposta == null ? CatalogNode.Null() : CatalogNode.Str(user.Eposta));
      if (user.Ad != null) s.Set("ad", CatalogNode.Str(user.Ad));
      store.Save(s);
    }

    private static double Seconds(CatalogNode n) => n.IsNumber ? n.N() : double.TryParse(n.S(), NumberStyles.Float, CultureInfo.InvariantCulture, out var v) ? v : 3600;

    /// Identity Toolkit/Secure Token hata iletisi → TS (Firebase JS) kodu.
    public static string AuthCode(string message)
    {
      string m = message.Split(':')[0].Trim();
      switch (m)
      {
        case "EMAIL_EXISTS": return "email-already-in-use";
        case "FEDERATED_USER_ID_ALREADY_LINKED": return "credential-already-in-use";
        case "CREDENTIAL_TOO_OLD_LOGIN_AGAIN": return "requires-recent-login";
        case "INVALID_LOGIN_CREDENTIALS": case "INVALID_PASSWORD": return "invalid-credential";
        case "EMAIL_NOT_FOUND": case "USER_NOT_FOUND": return "user-not-found";
        case "INVALID_EMAIL": case "MISSING_EMAIL": return "invalid-email";
        case "MISSING_PASSWORD": return "missing-password";
        case "WEAK_PASSWORD": return "weak-password";
        case "OPERATION_NOT_ALLOWED": case "ADMIN_ONLY_OPERATION": return "operation-not-allowed";
        case "TOO_MANY_ATTEMPTS_TRY_LATER": return "too-many-requests";
        case "USER_DISABLED": return "user-disabled";
        case "TOKEN_EXPIRED": case "INVALID_REFRESH_TOKEN": case "INVALID_ID_TOKEN": return "user-token-expired";
        default: return m.ToLowerInvariant().Replace('_', '-');
      }
    }

    private static string ErrorMessage(CloudHttpResponse r)
    {
      try
      {
        var e = CatalogNode.Parse(r.Body)["error"];
        if (e.IsString) return e.S().ToUpperInvariant();          // securetoken: {"error":"invalid_grant"}
        return e["message"].S(e["status"].S("HTTP_" + r.Status));
      }
      catch (FormatException) { return "HTTP_" + r.Status; }
    }

    private async Task<CatalogNode> AuthPost(string method, CatalogNode body)
    {
      var req = new CloudHttpRequest { Method = "POST", Url = Auth + method + "?key=" + apiKey, Body = body.ToString() };
      req.Headers["X-Firebase-Locale"] = "tr"; // TS auth.languageCode = "tr" (şifre sıfırlama e-postası Türkçe)
      var r = await http.Send(req);
      if (r.Status != 200) throw new CloudError(AuthCode(ErrorMessage(r)));
      return CatalogNode.Parse(r.Body);
    }

    /// Geçerli kimlik belirteci; süresi dolmuşsa yenilenir. Yenileme reddedilirse oturum kapanır.
    private async Task<string> IdToken(bool force = false)
    {
      Restore();
      if (user == null) throw new CloudError("no-current-user");
      if (!force && idToken != "" && nowMs() < expiresAt - 60000) return idToken;
      var req = new CloudHttpRequest
      {
        Method = "POST", Url = Token + apiKey, ContentType = "application/x-www-form-urlencoded",
        Body = "grant_type=refresh_token&refresh_token=" + Uri.EscapeDataString(refresh),
      };
      var r = await http.Send(req);
      if (r.Status != 200)
      {
        string code = AuthCode(ErrorMessage(r));
        // Hesap silinmiş/kapatılmış ya da belirteç geçersiz: TS onAuthStateChanged(null) gibi oturum düşer.
        if (r.Status == 400 || r.Status == 401 || r.Status == 403) { user = null; refresh = ""; idToken = ""; Persist(); Notify(); }
        throw new CloudError(code);
      }
      var t = CatalogNode.Parse(r.Body);
      idToken = t["id_token"].S();
      refresh = t["refresh_token"].S(refresh);
      expiresAt = nowMs() + Seconds(t["expires_in"]) * 1000;
      Persist();
      return idToken;
    }

    private async Task<CloudHttpResponse> Firestore(string method, string path, string body = "")
    {
      for (int attempt = 0; ; attempt++)
      {
        var req = new CloudHttpRequest { Method = method, Url = documents + path, Body = body };
        req.Headers["Authorization"] = "Bearer " + await IdToken(attempt > 0);
        var r = await http.Send(req);
        if (r.Status == 401 && attempt == 0) continue;
        return r;
      }
    }

    private static string Segment(string uid) => Uri.EscapeDataString(uid);

    public void ListenSession(Action<CloudUser?> changed) { Restore(); listeners.Add(changed); changed(user); }

    public async Task SignInAnonymous()
    {
      Restore();
      if (user != null) return;
      var b = CatalogNode.Obj(); b.Set("returnSecureToken", CatalogNode.Bool(true));
      SetSession(await AuthPost("signUp", b), true, "anonim");
    }

    /// TS googleBagla: misafir aynı uid ile Google'a bağlanır (ilerleme kalır); Google hesabı başka cihazda zaten varsa ona
    /// geçilir (TS varsaGec); bağlı hesaptan başka Google hesabına geçilir.
    public async Task LinkGoogle(string? hint = null)
    {
      if (google == null) throw new CloudError("google-desktop");
      string token = await google.IdToken(hint);
      Restore();
      CatalogNode Body()
      {
        var b = CatalogNode.Obj();
        b.Set("postBody", CatalogNode.Str("id_token=" + Uri.EscapeDataString(token) + "&providerId=google.com"));
        b.Set("requestUri", CatalogNode.Str("http://localhost"));
        b.Set("returnSecureToken", CatalogNode.Bool(true)); b.Set("returnIdpCredential", CatalogNode.Bool(true));
        return b;
      }
      if (user != null && user.Anonim)
      {
        var link = Body(); link.Set("idToken", CatalogNode.Str(await IdToken()));
        try { GoogleSession(await AuthPost("signInWithIdp", link)); return; }
        catch (CloudError e) when (e.Code == "credential-already-in-use" || e.Code == "email-already-in-use") { }
      }
      GoogleSession(await AuthPost("signInWithIdp", Body()));
    }

    private void GoogleSession(CatalogNode r)
    {
      // Aynı e-posta başka yolla (şifre) kayıtlıysa Firebase onay ister; sessizce birleştirilmez.
      if (r["needConfirmation"].B()) throw new CloudError("account-exists-with-different-credential");
      SetSession(r, false, "google");
    }

    public async Task CreateEmail(string email, string password)
    {
      Restore();
      var b = CatalogNode.Obj();
      b.Set("email", CatalogNode.Str(email)); b.Set("password", CatalogNode.Str(password)); b.Set("returnSecureToken", CatalogNode.Bool(true));
      // TS linkWithCredential: misafir hesap aynı uid ile e-postaya bağlanır, ilerleme kalır.
      if (user != null && user.Anonim) { b.Set("idToken", CatalogNode.Str(await IdToken())); SetSession(await AuthPost("update", b), false, "eposta"); }
      else SetSession(await AuthPost("signUp", b), false, "eposta");
    }

    public async Task SignInEmail(string email, string password)
    {
      var b = CatalogNode.Obj();
      b.Set("email", CatalogNode.Str(email)); b.Set("password", CatalogNode.Str(password)); b.Set("returnSecureToken", CatalogNode.Bool(true));
      SetSession(await AuthPost("signInWithPassword", b), false, "eposta");
    }

    public async Task ResetPassword(string email)
    {
      var b = CatalogNode.Obj();
      b.Set("requestType", CatalogNode.Str("PASSWORD_RESET")); b.Set("email", CatalogNode.Str(email));
      await AuthPost("sendOobCode", b);
    }

    public async Task<bool> IsAdmin(string uid)
    {
      try { return (await Firestore("GET", "admins/" + Segment(uid))).Status == 200; }
      catch (CloudError) { return false; }
    }

    public Task SignOut()
    {
      Restore();
      user = null; refresh = ""; idToken = ""; expiresAt = 0;
      Persist(); Notify();
      return Task.CompletedTask;
    }

    public async Task<CatalogNode?> Read(string uid)
    {
      var r = await Firestore("GET", "users/" + Segment(uid));
      if (r.Status == 404) return null;
      if (r.Status != 200) throw new CloudError(FirestoreCode(r));
      return FirestoreCodec.DecodeDocument(CatalogNode.Parse(r.Body));
    }

    /// TS setDoc: belge bütünüyle değişir (updateMask yok).
    public async Task Write(string uid, CatalogNode document)
    {
      var r = await Firestore("PATCH", "users/" + Segment(uid), FirestoreCodec.EncodeDocument(document).ToString());
      if (r.Status != 200) throw new CloudError(FirestoreCode(r));
    }

    private static string FirestoreCode(CloudHttpResponse r)
    {
      try { var s = CatalogNode.Parse(r.Body)["error"]["status"].S(); if (s != "") return s.ToLowerInvariant().Replace('_', '-'); }
      catch (FormatException) { }
      return "http-" + r.Status;
    }
  }
}
