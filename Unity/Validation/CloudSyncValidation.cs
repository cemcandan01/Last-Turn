using LastTurn.Core;

// P6-A bulut bağdaştırıcısı: Firebase REST sağlayıcısı + TS esitleme.ts/hesap.ts senaryoları sahte Firebase sunucusuna
// karşı (kimlik, belirteç yenileme, Firestore ve firestore.rules gecerli()/güncelleme kuralları). Gerçek ağ kullanılmaz.
internal static class CloudSyncValidation
{
  private static int checks;
  private static void Check(bool ok, string label) { checks++; if (!ok) throw new InvalidOperationException("Bulut eşitleme: " + label); }

  private sealed class MemoryStore : ICloudSessionStore { public CatalogNode? Value; public CatalogNode? Load() => Value?.Clone(); public void Save(CatalogNode? s) => Value = s?.Clone(); }
  private sealed class MemoryOwner : ICloudOwnerStore
  {
    public CloudOwnerRecord Value = new();
    public CloudOwnerRecord Load() => new() { Pending = Value.Pending, Owner = Value.Owner, OwnerAnonymous = Value.OwnerAnonymous };
    public void Save(CloudOwnerRecord r) => Value = new() { Pending = r.Pending, Owner = r.Owner, OwnerAnonymous = r.OwnerAnonymous };
  }

  // Bir cihazın yerel kaydı: gerçek GarageState + RaceProfile ve eşleyici.
  private sealed class Device : ICloudLocal
  {
    public GarageState State; public RaceProfile Profile = new(); public bool OfflineFlag; private int stamp;
    public Device(VehicleCatalog c) { State = new GarageState(c); }
    public void Change(Action<GarageState> f) { var s = GarageState.Restore(State.Catalog, State.Snapshot()); f(s); State = s; stamp++; }
    public void Record(string k, double v) { Profile.Records[k] = v.ToString(System.Globalization.CultureInfo.InvariantCulture); stamp++; }
    public string ChangeStamp => stamp.ToString();
    public CatalogNode Build(bool partless) => CloudLocalMapper.BuildDocument(State, Profile, "0.8.20", 1_700_000_000_000, partless);
    public void Merge(CatalogNode r) { State = CloudLocalMapper.Merge(State, r); CloudLocalMapper.MergeRecords(Profile, r["rekor"]); stamp++; }
    public void Replace(CatalogNode? r) { State = CloudLocalMapper.Replace(State, r); CloudLocalMapper.ClearRecords(Profile); if (r != null) CloudLocalMapper.MergeRecords(Profile, r["rekor"]); stamp++; }
    public bool Offline => OfflineFlag;
  }

  // Sahte Firebase: Identity Toolkit, Secure Token ve Firestore REST; kurallar firestore.rules ile aynı.
  private sealed class FakeFirebase : ICloudHttp
  {
    public bool Offline, OldRules; public int Writes, SignUps, Refreshes;
    public readonly Dictionary<string, CatalogNode> Docs = new();
    public readonly HashSet<string> Admins = new();
    private readonly Dictionary<string, (bool anon, string email, string pw)> users = new();
    private readonly Dictionary<string, string> idTokens = new(), refreshTokens = new();
    public readonly List<CloudHttpRequest> Log = new();
    private int next;
    public string LastRule = "";
    private static CloudHttpResponse Json(int s, string body) => new() { Status = s, Body = body };
    private static CloudHttpResponse AuthError(string m) => Json(400, "{\"error\":{\"code\":400,\"message\":\"" + m + "\"}}");
    public void Revoke(string uid) { foreach (var k in refreshTokens.Where(p => p.Value == uid).Select(p => p.Key).ToList()) refreshTokens.Remove(k); foreach (var k in idTokens.Where(p => p.Value == uid).Select(p => p.Key).ToList()) idTokens.Remove(k); }
    private string Session(string uid, bool emailOut)
    {
      string id = "id" + ++next, rt = "rt" + next; idTokens[id] = uid; refreshTokens[rt] = uid;
      var u = users[uid];
      return "{\"localId\":\"" + uid + "\",\"idToken\":\"" + id + "\",\"refreshToken\":\"" + rt + "\",\"expiresIn\":\"3600\"" + (emailOut && u.email != "" ? ",\"email\":\"" + u.email + "\"" : "") + "}";
    }
    public Task<CloudHttpResponse> Send(CloudHttpRequest r)
    {
      Log.Add(r);
      if (Offline) throw new CloudError("network-request-failed");
      return Task.FromResult(Handle(r));
    }
    private CloudHttpResponse Handle(CloudHttpRequest r)
    {
      if (r.Url.StartsWith("https://securetoken.googleapis.com/v1/token?key=KEY"))
      {
        Refreshes++;
        string rt = Uri.UnescapeDataString(r.Body.Split("refresh_token=")[1]);
        if (!refreshTokens.TryGetValue(rt, out var uid)) return Json(400, "{\"error\":{\"code\":400,\"message\":\"INVALID_REFRESH_TOKEN\"}}");
        string id = "id" + ++next; idTokens[id] = uid;
        return Json(200, "{\"id_token\":\"" + id + "\",\"refresh_token\":\"" + rt + "\",\"expires_in\":\"3600\",\"user_id\":\"" + uid + "\"}");
      }
      if (r.Url.StartsWith("https://identitytoolkit.googleapis.com/v1/accounts:"))
      {
        Check(r.Url.EndsWith("?key=KEY") && r.Method == "POST" && r.Headers["X-Firebase-Locale"] == "tr", "Kimlik isteği anahtarı/dili");
        string op = r.Url.Substring(r.Url.IndexOf(':', 8) + 1).Split('?')[0];
        var b = CatalogNode.Parse(r.Body);
        string email = b["email"].S(), pw = b["password"].S();
        bool emailTaken = email != "" && users.Values.Any(u => u.email == email);
        switch (op)
        {
          case "signUp":
            SignUps++;
            if (email != "" && emailTaken) return AuthError("EMAIL_EXISTS");
            if (email != "" && pw.Length < 6) return AuthError("WEAK_PASSWORD : Password should be at least 6 characters");
            { string uid = "u" + ++next; users[uid] = (email == "", email, pw); return Json(200, Session(uid, true)); }
          case "update":
            {
              if (!idTokens.TryGetValue(b["idToken"].S(), out var uid)) return AuthError("INVALID_ID_TOKEN");
              if (emailTaken) return AuthError("EMAIL_EXISTS");
              if (pw.Length < 6) return AuthError("WEAK_PASSWORD : Password should be at least 6 characters");
              users[uid] = (false, email, pw); return Json(200, Session(uid, true));
            }
          case "signInWithPassword":
            {
              var hit = users.FirstOrDefault(p => p.Value.email == email && email != "");
              if (hit.Key == null || hit.Value.pw != pw) return AuthError("INVALID_LOGIN_CREDENTIALS");
              return Json(200, Session(hit.Key, true));
            }
          case "sendOobCode":
            Check(b["requestType"].S() == "PASSWORD_RESET", "Şifre sıfırlama türü");
            return users.Values.Any(u => u.email == email) ? Json(200, "{\"email\":\"" + email + "\"}") : AuthError("EMAIL_NOT_FOUND");
        }
        return AuthError("UNKNOWN");
      }
      const string root = "https://firestore.googleapis.com/v1/projects/proje/databases/(default)/documents/";
      Check(r.Url.StartsWith(root), "Firestore adresi: " + r.Url);
      string path = r.Url.Substring(root.Length);
      string bearer = r.Headers.TryGetValue("Authorization", out var a) && a.StartsWith("Bearer ") ? a.Substring(7) : "";
      if (!idTokens.TryGetValue(bearer, out var auth)) return Json(401, "{\"error\":{\"code\":401,\"status\":\"UNAUTHENTICATED\"}}");
      var parts = path.Split('/');
      var denied = Json(403, "{\"error\":{\"code\":403,\"status\":\"PERMISSION_DENIED\"}}");
      if (parts[0] == "admins") return parts[1] == auth && Admins.Contains(auth) ? Json(200, "{\"fields\":{}}") : parts[1] == auth ? Json(404, "{}") : denied;
      if (parts[0] != "users" || parts[1] != auth) return denied;
      if (r.Method == "GET") return Docs.TryGetValue(auth, out var d) ? Json(200, FirestoreCodec.EncodeDocument(d).ToString()) : Json(404, "{\"error\":{\"code\":404,\"status\":\"NOT_FOUND\"}}");
      Check(r.Method == "PATCH" && !r.Url.Contains("updateMask"), "setDoc karşılığı tam belge PATCH");
      var raw = CatalogNode.Parse(r.Body)["fields"];
      var doc = FirestoreCodec.DecodeDocument(CatalogNode.Parse(r.Body));
      if (!Valid(raw, doc, Docs.TryGetValue(auth, out var old) ? old : null)) return denied;
      Docs[auth] = doc; Writes++;
      return Json(200, r.Body);
    }
    // firestore.rules gecerli() + update koşulları (admin değil).
    private bool Valid(CatalogNode raw, CatalogNode d, CatalogNode? old)
    {
      string[] allowed = OldRules ? new[] { "surum", "xp", "updatedAt", "yildiz", "ekAcik", "kazanilan", "alimlar", "rekor", "oyunSurum" }
        : new[] { "surum", "xp", "updatedAt", "yildiz", "ekAcik", "kazanilan", "alimlar", "rekor", "oyunSurum", "parca" };
      string[] required = { "surum", "xp", "updatedAt", "yildiz", "ekAcik", "kazanilan", "alimlar" };
      bool Int(string k, double max) => raw[k].Has("integerValue") && d[k].N() >= 0 && d[k].N() <= max;
      LastRule = d.Fields.FirstOrDefault(p => !allowed.Contains(p.Key)).Key ?? required.FirstOrDefault(k => !d.Has(k)) ?? "";
      if (LastRule != "") return false;
      LastRule = "tür/sınır";
      if (!(Int("surum", 100) && Int("xp", 10_000_000) && raw["updatedAt"].Has("integerValue") && Int("kazanilan", 1_000_000_000))) return false;
      if (!(d["yildiz"].IsObject && d["ekAcik"].IsArray && d["alimlar"].IsObject)) return false;
      if (d.Has("rekor") && !d["rekor"].IsObject) return false;
      if (d.Has("oyunSurum") && !(d["oyunSurum"].IsString && d["oyunSurum"].S().Length <= 20)) return false;
      if (d.Has("parca") && !d["parca"].IsObject) return false;
      LastRule = "azalma";
      if (old != null && (d["xp"].N() < old["xp"].N() || d["kazanilan"].N() < old["kazanilan"].N() || old["alimlar"].Fields.Any(p => !d["alimlar"].Has(p.Key)))) return false;
      LastRule = "";
      return true;
    }
  }

  private sealed class Rig
  {
    public FakeFirebase Server; public Device Local; public MemoryStore Session = new(); public MemoryOwner Owner = new();
    public FirebaseRestProvider Provider = null!; public CloudSync Sync = null!; public CloudAccount Account = null!; public double Now;
    public Rig(FakeFirebase s, Device d) { Server = s; Local = d; }
    public Rig Boot()
    {
      Provider = new FirebaseRestProvider("KEY", "proje", Server, Session, () => Now * 1000);
      Sync = new CloudSync(Provider, Local, Owner); Account = new CloudAccount(Provider, Sync); Account.Start();
      return this;
    }
    public void Tick(double dt) { Now += dt; Sync.Tick(Now); }
    /// Değişikliği gör, gecikmeyi geçir (TS 4 sn debounce).
    public void Flush() { Tick(0.01); Tick(CloudSync.DefaultDelay + 0.1); }
  }

  public static void Run()
  {
    checks = 0;
    string unity = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../.."));
    var catalog = new VehicleCatalog(File.ReadAllText(Path.Combine(unity, "Assets/LastTurn/Resources/vehicle-catalog.json")));

    // 0) Web oyunuyla aynı Firebase projesi (src/bulut/ayar.ts).
    string ayar = File.ReadAllText(Path.Combine(unity, "../src/bulut/ayar.ts"));
    Check(ayar.Contains("apiKey: \"" + CloudConfig.ApiKey + "\"") && ayar.Contains("projectId: \"" + CloudConfig.ProjectId + "\""), "CloudConfig = TS FIREBASE_AYAR");

    // 1) Firestore kodlaması: tamsayı integerValue (kurallar `is int`), kesirli doubleValue; gidiş-dönüş aynı.
    var sample = CatalogNode.Parse("{\"xp\":1200,\"t\":74.53,\"neg\":-3,\"s\":\"a\\\"b\",\"b\":true,\"n\":null,\"m\":{},\"a\":[],\"y\":{\"asphalt_1\":3},\"l\":[\"arac_2\",1.5]}");
    var enc = FirestoreCodec.EncodeDocument(sample);
    Check(enc["fields"]["xp"]["integerValue"].S() == "1200" && enc["fields"]["t"]["doubleValue"].N() == 74.53, "Tamsayı/kesirli Firestore türü");
    Check(enc["fields"]["neg"]["integerValue"].S() == "-3" && enc["fields"]["m"].Has("mapValue") && enc["fields"]["a"].Has("arrayValue"), "Negatif ve boş kap");
    Check(FirestoreCodec.DecodeDocument(CatalogNode.Parse(enc.ToString())).ToString() == sample.ToString(), "Firestore gidiş-dönüş");
    Check(FirestoreCodec.Decode(CatalogNode.Parse("{\"doubleValue\":\"NaN\"}")).IsNull && FirestoreCodec.Decode(CatalogNode.Parse("{\"geoPointValue\":{}}")).IsNull, "Bozuk/bilinmeyen değer null");
    Check(FirebaseRestProvider.AuthCode("WEAK_PASSWORD : Password should be at least 6 characters") == "weak-password" && FirebaseRestProvider.AuthCode("INVALID_LOGIN_CREDENTIALS") == "invalid-credential"
      && FirebaseRestProvider.AuthCode("EMAIL_EXISTS") == "email-already-in-use", "REST hata kodu → TS kodu");
    Check(CloudAccount.ErrorText(new CloudError("weak-password")) == "Şifre en az 6 karakter olmalı (weak-password)" && CloudAccount.ErrorText(new CloudError("network-request-failed"))!.StartsWith("İnternet yok"), "TS hataMetni");

    // 2) İlk açılış: sessiz misafir, belge yoksa yerel ilerleme yazılır; oturum yerelde kalır (kimlik belirteci saklanmaz).
    var server = new FakeFirebase();
    var pc = new Device(catalog);
    pc.Change(s => { s.AddMoney(5000); s.AddXp(900); });
    pc.Record("asphalt_1", 74.53); pc.Record("kariyer1_drift2_2", 1500); pc.Record("deneme_gp_1", 60);
    var a = new Rig(server, pc).Boot();
    string anonUid = a.Account.User!.Uid;
    Check(a.Account.User.Anonim && server.SignUps == 1 && a.Account.Summary() == "Misafir (yalnız bu cihaz) · Bulutta", "Sessiz misafir + ilk eşitleme: " + a.Account.Summary());
    var d0 = server.Docs[anonUid];
    Check(d0["xp"].N() == 900 && d0["kazanilan"].N() == 5000 && d0["surum"].N() == 3 && d0["oyunSurum"].S() == "0.8.20", "Belge ilerlemesi");
    Check(d0["rekor"]["asphalt_1"].N() == 74.53 && d0["rekor"]["kariyer1_drift2_2"].N() == 1500 && !d0["rekor"].Has("deneme_gp_1"), "Rekorlar: yalnız TS anahtarları");
    Check(a.Owner.Value.Owner == anonUid && a.Owner.Value.OwnerAnonymous && !a.Owner.Value.Pending, "Sahip kaydı");
    Check(a.Session.Value!["uid"].S() == anonUid && !a.Session.Value.ToString().Contains("\"id1\""), "Oturum kalıcı, kimlik belirteci diskte yok");
    var readFirst = server.Log.FindIndex(r => r.Method == "GET" && r.Url.Contains("/users/"));
    Check(readFirst >= 0 && readFirst < server.Log.FindIndex(r => r.Method == "PATCH"), "Okunmadan yazılmaz");

    // 3) Değişiklik gecikmeli yazılır; içerik değişmediyse yazılmaz.
    int w = server.Writes;
    pc.Change(s => s.AddMoney(1000));
    a.Tick(1); a.Tick(3.5);
    Check(server.Writes == w && a.Sync.Pending, "Gecikme dolmadan yazılmaz, bekleyen işaretli");
    a.Tick(0.6);
    Check(server.Writes == w + 1 && server.Docs[anonUid]["kazanilan"].N() == 6000 && !a.Sync.Pending, "4 sn sonra yazıldı");
    a.Tick(10); a.Sync.SendNow();
    Check(server.Writes == w + 1, "Değişmeyen belge yeniden yazılmaz");

    // 4) Çevrimdışı: bekleyen kalır, internet gelince gönderilir.
    pc.OfflineFlag = server.Offline = true;
    pc.Change(s => s.AddXp(100));
    a.Flush();
    Check(a.Sync.Status == CloudSyncStatus.Bekliyor && a.Sync.Pending && a.Account.Summary().EndsWith("İnternet gelince gönderilecek"), "Çevrimdışı bekliyor");
    pc.OfflineFlag = server.Offline = false;
    a.Tick(0.1);
    Check(a.Sync.Status == CloudSyncStatus.Tamam && server.Docs[anonUid]["xp"].N() == 1000, "İnternet gelince gönderildi");

    // 5) Yeniden açılış: kayıtlı oturumla aynı misafir; yeni hesap açılmaz, belirteç yenilenir.
    var again = new Rig(server, pc) { Session = a.Session, Owner = a.Owner }.Boot();
    Check(again.Account.User!.Uid == anonUid && server.SignUps == 1 && server.Refreshes == 1 && again.Sync.Status == CloudSyncStatus.Tamam, "Kalıcı oturum");
    a = again;

    // 6) Eski kurallar parca alanını reddeder: parçasız tekrar, parçalar cihazda kalır.
    server.OldRules = true;
    int car = pc.State.SelectedCar;
    pc.Change(s => { s.AddMoney(100000); Check(s.BuyParts(car, new[] { "motor-sokak" }) && s.Equip(car, "motor-sokak"), "Parça al/tak"); });
    a.Flush();
    Check(a.Sync.Status == CloudSyncStatus.Tamam && !server.Docs[anonUid].Has("parca") && pc.State.Equipped(car).Contains("motor-sokak"), "Parça reddi → parçasız yazıldı");
    server.OldRules = false;

    // 7) Misafiri e-postaya bağla: aynı uid, ilerleme kalır; parca artık yazılır.
    Check(!a.Account.CreateEmail("cem@ornek.com", "123").Result && a.Account.Error == "Şifre en az 6 karakter olmalı (weak-password) · Hesap değişmedi: Misafir", "Zayıf şifre: " + a.Account.Error);
    a.Sync.SendNow();
    Check(a.Account.CreateEmail(" cem@ornek.com ", "gizli123").Result, "E-posta bağlandı: " + a.Account.Error);
    Check(a.Account.User!.Uid == anonUid && !a.Account.User.Anonim && a.Account.User.Eposta == "cem@ornek.com", "Bağlanan hesap aynı uid");
    Check(a.Account.Info!.StartsWith("Bağlandı: cem@ornek.com · Seviye") && a.Account.Summary() == "E-posta · cem@ornek.com · Bulutta", "Bağlandı bildirimi: " + a.Account.Summary());
    // Bağlama sonrası partRejected bu açılışta kalır (TS parcaRed); yeni açılış parça alanını yazar.
    a = new Rig(server, pc) { Session = a.Session, Owner = a.Owner }.Boot();
    pc.Change(s => s.AddXp(1)); a.Flush();
    Check(server.Docs[anonUid]["parca"][car.ToString()].Items.Any(i => i.S() == "motor-sokak"), "Yeni açılışta parca yazıldı");

    // 8) Aynı hesabın başka cihazı (yeni kurulum, kendi misafiri): e-postayla girince yerel misafir kaydı değiştirilir.
    var laptop = new Device(catalog);
    laptop.Change(s => s.AddMoney(300)); laptop.Record("asphalt_1", 50);
    var b = new Rig(server, laptop).Boot();
    string laptopGuest = b.Account.User!.Uid;
    Check(laptopGuest != anonUid && server.Docs.ContainsKey(laptopGuest), "İkinci cihaz misafiri");
    Check(!b.Account.SignInEmail("cem@ornek.com", "yanlis").Result && b.Account.Error!.StartsWith("E-posta ya da şifre yanlış") && b.Account.User!.Uid == laptopGuest, "Yanlış şifre: hesap değişmedi");
    Check(b.Account.SignInEmail("cem@ornek.com", "gizli123").Result && b.Account.User!.Uid == anonUid, "E-posta girişi");
    Check(laptop.State.Xp == pc.State.Xp && laptop.State.Balance == pc.State.Balance && laptop.Profile.Best("asphalt_1") == 74.53, "Başka hesap: yerel kayıt bulutla değişti (misafirin 50 sn rekoru silindi)");
    Check(laptop.State.Equipped(car).Contains("motor-sokak") && b.Owner.Value.Owner == anonUid && !b.Owner.Value.OwnerAnonymous, "Parçalar ve sahip değişti");
    Check(server.Docs[laptopGuest]["kazanilan"].N() == 300, "Misafir belgesi bulutta kalır");

    // 9) Aynı hesap iki cihaz: birleşme XP/para büyüğü, alım birleşimi, rekorda iyisi.
    laptop.Change(s => s.AddXp(5000)); laptop.Record("asphalt_1", 70.1); laptop.Record("rally_3", 88);
    b.Flush();
    pc.Record("asphalt_1", 72); pc.Change(s => s.AddMoney(7));
    a.Sync.Session(anonUid, false); // yeniden oturum: önce çeker, sonra birleşmişi yazar
    Check(pc.State.Xp == laptop.State.Xp && pc.Profile.Best("asphalt_1") == 70.1 && pc.Profile.Best("rally_3") == 88, "Aynı hesap birleşmesi");
    Check(server.Docs[anonUid]["xp"].N() == pc.State.Xp && server.Docs[anonUid]["kazanilan"].N() - server.Docs[anonUid]["alimlar"].Fields.Sum(p => p.Value.N()) == pc.State.Balance
      && server.Docs[anonUid]["rekor"]["asphalt_1"].N() == 70.1, "Birleşmiş belge yazıldı");

    // 10) Bağlı hesapta gönderilemeyen yazma varken hesap değiştirilmez.
    pc.OfflineFlag = server.Offline = true;
    pc.Change(s => s.AddXp(3)); a.Flush();
    Check(!a.Account.SignInEmail("baska@ornek.com", "x123456").Result && a.Account.User!.Uid == anonUid
      && a.Account.Error!.StartsWith("Bu hesabın son ilerlemesi buluta gönderilemedi") && a.Account.Error.EndsWith("Hesap değişmedi: E-posta · cem@ornek.com"), "Gönderilemeyen ilerlemeyle geçiş yok: " + a.Account.Error);
    pc.OfflineFlag = server.Offline = false; a.Tick(0.1);
    Check(!a.Sync.Pending, "İnternet gelince gönderildi");

    // 11) Kurallar azalmayı reddeder: eşitleme Hata, bekleyen kalır, yerel bozulmaz.
    server.Docs[anonUid].Set("xp", CatalogNode.Num(pc.State.Xp + 1_000_000));
    var forced = server.Docs[anonUid]["xp"].N();
    pc.Change(s => s.AddXp(1)); a.Flush();
    Check(a.Sync.Status == CloudSyncStatus.Hata && a.Sync.Pending && server.LastRule == "azalma", "Kural reddi Hata: " + server.LastRule);
    pc.Change(s => s.AddXp(1)); a.Flush();
    Check(a.Sync.Status == CloudSyncStatus.Tamam && pc.State.Xp == forced, "Reddin ardından önce yeniden çekilip birleşti");

    // 12) Şifre sıfırlama ve belirteç iptali.
    Check(a.Account.ResetPassword("cem@ornek.com ").Result && a.Account.Info!.StartsWith("Şifre sıfırlama e-postası gönderildi: cem@ornek.com"), "Şifre sıfırlama");
    Check(!a.Account.ResetPassword("yok@ornek.com").Result && a.Account.Error!.StartsWith("Bu e-postayla hesap yok"), "Bilinmeyen e-posta");
    server.Revoke(anonUid);
    var c = new Rig(server, pc) { Session = a.Session, Owner = a.Owner }.Boot();
    Check(c.Account.User == null && c.Session.Value == null && pc.State.Xp == forced, "İptal edilen oturum düşer (TS: misafir yalnız açılışta), yerel kayıt kalır");
    c = new Rig(server, pc) { Session = c.Session, Owner = c.Owner }.Boot();
    Check(c.Account.User != null && c.Account.User.Uid != anonUid && c.Account.User.Anonim && c.Session.Value!["uid"].S() == c.Account.User.Uid, "Sonraki açılışta yeni misafir");
    Check(pc.State.Xp == 0 && pc.Profile.Best("asphalt_1") == 0, "Bağlı hesaptan yeni misafire: yerel kayıt sıfırdan (TS başka hesap kuralı)");
    Check(server.Docs[anonUid]["xp"].N() == forced, "Bağlı hesabın bulut kaydı korunur");

    Console.WriteLine($"Bulut eşitleme: {checks} koşul; sahte Firebase (kimlik, belirteç, Firestore, firestore.rules) ile misafir/e-posta/iki cihaz/çevrimdışı/kural reddi senaryoları.");
  }
}
