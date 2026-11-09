#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace LastTurn.Core
{
  /// Google hesabından OpenID kimlik belirteci (id_token) alır; FirebaseRestProvider bunu signInWithIdp ile Firebase
  /// oturumuna çevirir (TS signInWithPopup/linkWithPopup karşılığı).
  public interface IGoogleSignIn { Task<string> IdToken(string? hint); }

  /// Tarayıcı yönlendirmesi: redirect adresini (http://127.0.0.1:port) seçer, url(redirect) adresini tarayıcıda açar,
  /// dönüşün sorgu parametrelerini verir. Zaman aşımında CloudError("google-timeout") atar.
  public interface ILoopbackBrowser { Task<(string Redirect, Dictionary<string, string> Query)> Authorize(Func<string, string> url); }

  // Masaüstü (yüklü uygulama) OAuth: yetkilendirme kodu + PKCE + yerel geri dönüş adresi (RFC 8252). Google'ın "Masaüstü
  // uygulaması" istemcisinin gizli anahtarı uygulamaya gömülür ve Google'a göre gizli sayılmaz; koruma PKCE'dedir.
  public sealed class GoogleDesktopAuth : IGoogleSignIn
  {
    private const string AuthorizeUrl = "https://accounts.google.com/o/oauth2/v2/auth", TokenUrl = "https://oauth2.googleapis.com/token";
    private const string Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    private readonly string clientId, clientSecret;
    private readonly ICloudHttp http;
    private readonly ILoopbackBrowser browser;
    private readonly Func<int, string> random;

    public GoogleDesktopAuth(string clientId, string clientSecret, ICloudHttp http, ILoopbackBrowser browser, Func<int, string>? random = null)
    {
      this.clientId = clientId; this.clientSecret = clientSecret; this.http = http; this.browser = browser;
      this.random = random ?? Random;
    }

    public static string Random(int length)
    {
      var bytes = new byte[length];
      using (var rng = RandomNumberGenerator.Create()) rng.GetBytes(bytes);
      return new string(bytes.Select(b => Alphabet[b % Alphabet.Length]).ToArray());
    }

    public static string Challenge(string verifier)
    {
      using var sha = SHA256.Create();
      return Convert.ToBase64String(sha.ComputeHash(Encoding.ASCII.GetBytes(verifier))).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static string Form(IEnumerable<(string Key, string Value)> pairs)
      => string.Join("&", pairs.Select(p => Uri.EscapeDataString(p.Key) + "=" + Uri.EscapeDataString(p.Value)));

    public async Task<string> IdToken(string? hint)
    {
      if (clientId == "") throw new CloudError("google-desktop");
      string verifier = random(64), state = random(32);
      var (redirect, query) = await browser.Authorize(r =>
      {
        var q = new List<(string, string)>
        {
          ("client_id", clientId), ("redirect_uri", r), ("response_type", "code"), ("scope", "openid email profile"),
          ("code_challenge", Challenge(verifier)), ("code_challenge_method", "S256"), ("state", state), ("prompt", "select_account"),
        };
        if (!string.IsNullOrEmpty(hint)) q.Add(("login_hint", hint!));
        return AuthorizeUrl + "?" + Form(q);
      });
      // Hesap seçici kapatıldı/reddedildi: TS popup-closed gibi sessiz.
      if (query.TryGetValue("error", out var error)) throw new CloudError(error == "access_denied" ? "popup-closed-by-user" : "google-" + error);
      if (!query.TryGetValue("state", out var back) || back != state) throw new CloudError("google-state");
      if (!query.TryGetValue("code", out var code) || code == "") throw new CloudError("google-code");
      var r = await http.Send(new CloudHttpRequest
      {
        Method = "POST", Url = TokenUrl, ContentType = "application/x-www-form-urlencoded",
        Body = Form(new[] { ("code", code), ("client_id", clientId), ("client_secret", clientSecret), ("redirect_uri", redirect), ("code_verifier", verifier), ("grant_type", "authorization_code") }),
      });
      if (r.Status != 200) throw new CloudError("google-token");
      string id;
      try { id = CatalogNode.Parse(r.Body)["id_token"].S(); } catch (FormatException) { id = ""; }
      if (id == "") throw new CloudError("google-token");
      return id;
    }

    /// Yönlendirme sorgusu (?code=…&state=…) → sözlük.
    public static Dictionary<string, string> ParseQuery(string query)
    {
      var d = new Dictionary<string, string>(StringComparer.Ordinal);
      foreach (var part in query.TrimStart('?').Split('&'))
      {
        if (part == "") continue;
        int i = part.IndexOf('=');
        string k = Uri.UnescapeDataString((i < 0 ? part : part.Substring(0, i)).Replace('+', ' ')), v = i < 0 ? "" : Uri.UnescapeDataString(part.Substring(i + 1).Replace('+', ' '));
        d[k] = v;
      }
      return d;
    }
  }
}
