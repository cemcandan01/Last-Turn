using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Threading.Tasks;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Ui;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.UIElements;

namespace LastTurn.EditorValidation
{
  // Yalnız ayrı grafik Editor'da: Profil hesap yüzeyi (Google bağlama, hesap değiştir listesi, kimlik kopyalama, yeni misafir,
  // admin paneli). Sahte sağlayıcı gerçek CloudAccount/CloudSync'e bağlanır; garaj komutları ayrı ürünün kaydına gerçekten yazar.
  [InitializeOnLoad]
  public static class AccountPlayValidation
  {
    private const string Active = "LastTurn.Account.Active";
    [Serializable] private sealed class Source { public string path, hash; }
    [Serializable] private sealed class Proof { public string result, error, utc; public List<string> checks = new List<string>(), images = new List<string>(), runtimeErrors = new List<string>(), editorDiagnostics = new List<string>(); public Source[] sources; }
    private static Proof proof; private static readonly List<Action> steps = new List<Action>(); private static int index; private static double began, at; private static Keyboard keyboard;
    private static Dictionary<string, byte[]> backup;
    private static VisualElement pointer; private static Vector2 point; private static string shot; private static int shotW, shotH; private static bool queued; private static DateTime captureAfter;
    private static EditorWindow game; private static object group; private static int originalSize; private static readonly List<int> sizes = new List<int>();
    private static string Project => Path.GetDirectoryName(Application.dataPath);
    static AccountPlayValidation() { EditorApplication.playModeStateChanged += Changed; }
    public static void StartGameView()
    {
      if (Application.companyName != "LastTurnProfileUiValidation" || Application.isBatchMode || Application.productName != "LastTurnUiValidation" || Array.IndexOf(Environment.GetCommandLineArgs(), "-lastTurnUiValidation") < 0) throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Önce Play durmalı.");
      InputSystem.settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus; InputSystem.settings.editorInputBehaviorInPlayMode = InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      GarageSceneBuilder.Open(); SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if (s == PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active, false)) { proof = new Proof(); steps.Clear(); index = 0; began = at = EditorApplication.timeSinceStartup; Application.logMessageReceived += Logged; EditorApplication.update += Tick; }
      if (s == PlayModeStateChange.ExitingPlayMode) { Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; }
    }
    private static void Logged(string message, string stack, LogType type)
    { if (type != LogType.Error && type != LogType.Exception && type != LogType.Assert) return; if (stack.Contains("UnityEditor.Search.") && !stack.Contains("LastTurn.")) proof.editorDiagnostics.Add(message); else proof.runtimeErrors.Add(message + "\n" + stack); }
    private static void Check(bool ok, string label) { if (!ok) throw new InvalidOperationException(label); proof.checks.Add(label); }
    private static void Tap(Key key) { steps.Add(() => InputSystem.QueueStateEvent(keyboard, new KeyboardState(key))); steps.Add(() => InputSystem.QueueStateEvent(keyboard, new KeyboardState())); }
    private static void Wait(Func<bool> ready) { steps.Add(() => { if (!ready()) index--; }); }
    private static string Hash(string path) { using (var h = SHA256.Create()) return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-", ""); }
    private static VisualElement Q(string name) => UiRoot.Instance.Screen.Q(name);
    private static TextField Field(string name) => UiRoot.Instance.Screen.Q<TextField>(name);
    private static string Text(string name) => Q(name)?.Q<Label>(className: "yazi")?.text ?? "";
    private static void Click(string name)
    {
      steps.Add(() => { var element = Q(name); Check(element != null && element.enabledInHierarchy, "Fare hedefi var ve açık: " + name + (element == null || element.enabledInHierarchy ? "" : " [kapalı]") + (element != null ? "" : " [yok; liste " + ProfileView.Instance.ListOpen + ", meşgul " + account?.Busy + "]")); var scroll = element.GetFirstAncestorOfType<ScrollView>(); scroll?.ScrollTo(element); });
      steps.Add(() => { var element = Q(name); point = element.worldBound.center; pointer = element.panel.Pick(point); Check(pointer == element || element.Contains(pointer), "Fare hit-test: " + name); });
      steps.Add(() => { using (var e = PointerDownEvent.GetPooled(new Event { type = EventType.MouseDown, button = 0, mousePosition = point })) pointer.SendEvent(e); });
      steps.Add(() => { using (var e = PointerUpEvent.GetPooled(new Event { type = EventType.MouseUp, button = 0, mousePosition = point })) pointer.SendEvent(e); });
    }

    // TS Saglayici davranışının sahte karşılığı: Google bağlama/geçiş, e-posta girişi, admin sorgusu, çıkış ve yeni misafir.
    private static FakeProvider provider; private static CloudAccount account;
    private sealed class FakeProvider : ICloudProvider
    {
      private Action<CloudUser> changed; private CloudUser user; private int guests; private string googleUid;
      public int GoogleCalls; public string LastHint;
      private void Set(CloudUser k) { user = k; changed(k); }
      public void ListenSession(Action<CloudUser> listener) { changed = listener; Set(new CloudUser { Uid = "ui-guest-" + ++guests, Anonim = true }); }
      public Task SignInAnonymous() { if (user == null) Set(new CloudUser { Uid = "ui-guest-" + ++guests, Anonim = true }); return Task.CompletedTask; }
      public Task LinkGoogle(string hint = null)
      {
        GoogleCalls++; LastHint = hint;
        Set(new CloudUser { Uid = googleUid ??= user != null && user.Anonim ? user.Uid : "ui-google", Anonim = false, Yol = "google", Eposta = "cem@gmail.com", Ad = "Cem" });
        return Task.CompletedTask;
      }
      public Task CreateEmail(string email, string password) => throw new NotSupportedException();
      public Task SignInEmail(string email, string password) { Set(new CloudUser { Uid = email.StartsWith("admin") ? "ui-admin" : "ui-mail", Anonim = false, Yol = "eposta", Eposta = email }); return Task.CompletedTask; }
      public Task ResetPassword(string email) => Task.CompletedTask;
      public Task<bool> IsAdmin(string uid) => Task.FromResult(uid == "ui-admin");
      public Task SignOut() { Set(null); return Task.CompletedTask; }
      public Task<CatalogNode> Read(string uid) => Task.FromResult<CatalogNode>(null);
      public Task Write(string uid, CatalogNode document) => Task.CompletedTask;
    }
    private sealed class MemoryLocal : ICloudLocal
    {
      public string ChangeStamp => "ui-fixture"; public bool Offline => false;
      public CatalogNode Build(bool partless) => CatalogNode.Parse("{\"surum\":3,\"xp\":0,\"kazanilan\":0}");
      public void Merge(CatalogNode remote) { }
      public void Replace(CatalogNode remote) { }
    }
    private sealed class MemoryOwner : ICloudOwnerStore
    { private CloudOwnerRecord value = new CloudOwnerRecord(); public CloudOwnerRecord Load() => value; public void Save(CloudOwnerRecord record) { value = record; } }

    private static void SignIn(string email)
    {
      steps.Add(() => { Field("profile-email").value = email; Field("profile-password").value = "abcdef"; });
      Click("profile-login"); Wait(() => !account.Busy && account.User?.Eposta == email);
    }
    private static void Setup()
    {
      if (Application.companyName != "LastTurnProfileUiValidation") throw new InvalidOperationException("Ayrı profil test şirketi gerekir.");
      GarageSession.Open(GarageSession.ProfilePath(false));
      var files = new[] { GarageSession.Store.FilePath, GarageRace.ProfileStore().ProfileFile };
      backup = files.ToDictionary(f => f, f => File.Exists(f) ? File.ReadAllBytes(f) : null);
      var fixture = new GarageState(GarageSession.Catalog); fixture.AddXp(550); fixture.AddMoney(12450); GarageSession.Commit(fixture, "Ayrı hesap test verisi");
      var store = GarageRace.ProfileStore(); var saved = store.Load(); saved.Rename("Hesap Testi"); saved.Races = 9; saved.Wins = 2; saved.Km = 40; saved.Records["asphalt_1"] = "70.12"; store.Save(saved);
      keyboard = InputSystem.AddDevice<Keyboard>(); GameFlow.MainMenu(); GameFlow.OpenProfile();
      steps.Add(() => { provider = new FakeProvider(); account = new CloudAccount(provider, new CloudSync(provider, new MemoryLocal(), new MemoryOwner())) { Level = () => GarageSession.State.Level }; CloudRuntime.SetUiValidationAccount(account); account.Start(); });
      Wait(() => ProfileView.Instance.Visible && Q("profile-switch") != null);
      steps.Add(() => { Check(account.User.Anonim && Q("profile-google") != null && Q("profile-copy-uid") == null, "Misafirde Google ile bağlan var, hesap kimliği yok"); Check(account.KnownAccounts().Count == 0, "Misafir bilinen hesap değil"); });
      steps.Add(() => Shot("guest", 1280, 720));

      // Google ile bağlan: misafir aynı uid ile Google'a bağlanır; bildirim ve kimlik satırı.
      Click("profile-google"); Wait(() => !account.Busy && account.User.Yol == "google");
      steps.Add(() => { Check(provider.GoogleCalls == 1 && provider.LastHint == null && account.User.Uid == "ui-guest-1", "Fare Google bağlamayı bir kez çağırır, aynı uid"); Check(account.Info.StartsWith("Bağlandı: cem@gmail.com · Seviye ") && Q<Label>("profile-feedback").text == account.Info, "Bağlandı bildirimi gösterilir"); Check(Q("profile-google") == null && Q("profile-copy-uid") != null, "Bağlı hesapta Google düğmesi yok, kimlik satırı var"); });
      Click("profile-copy-uid");
      steps.Add(() => Check(GUIUtility.systemCopyBuffer == "ui-guest-1" && Text("profile-copy-uid") == "KOPYALANDI", "Hesap kimliği panoya kopyalanır"));

      // E-postayla başka hesaba geç; listede iki hesap, şu anki kapalı.
      SignIn("ui@example.test");
      Click("profile-switch");
      steps.Add(() => { Check(ProfileView.Instance.ListOpen && Text("profile-account-0").StartsWith("E-posta · ui@example.test · Seviye ") && Text("profile-account-0").Contains("şu an"), "Liste: şu anki e-posta hesabı başta"); Check(!Q("profile-account-0").enabledInHierarchy && Q("profile-remove-0") == null, "Şu anki hesap seçilemez/kaldırılamaz"); Check(Text("profile-account-1").StartsWith("Google · cem@gmail.com · Seviye ") && Q("profile-account-1").enabledInHierarchy, "Liste: önceki Google hesabı"); });
      steps.Add(() => Shot("list", 1920, 1080)); steps.Add(() => Shot("list", 1280, 720));
      Click("profile-account-1"); Wait(() => !account.Busy && account.User.Yol == "google");
      steps.Add(() => Check(provider.GoogleCalls == 2 && provider.LastHint == "cem@gmail.com" && !ProfileView.Instance.ListOpen, "Listeden Google hesabına ipucuyla geçilir, liste kapanır"));
      Click("profile-switch"); Click("profile-remove-1");
      steps.Add(() => Check(account.KnownAccounts().Count == 1 && account.KnownAccounts()[0].Label == "cem@gmail.com", "Diğer hesap yalnız listeden kaldırılır"));
      Click("profile-switch");

      // Admin: sunucu onayı ile panel; her şey açık, para/XP/seviye/kilit/sıfırlama gerçek garaj kaydına yazılır.
      SignIn("admin@example.test"); Wait(() => account.Admin && Q("profile-admin-all") != null);
      steps.Add(() => { Check(GarageState.AdminMode && Text("profile-admin-all") == "HER ŞEY AÇIK: AÇIK", "Admin oturumu her şey açık"); int cars = GarageSession.Catalog.Data["cars"].Items.Count(); Check(Enumerable.Range(0, cars).All(GarageSession.State.OwnsCar), "Her şey açıkken bütün araçlar açık"); });
      steps.Add(() => Shot("admin", 1920, 1080)); steps.Add(() => Shot("admin", 1280, 720));
      double money = 0, xp = 0;
      steps.Add(() => { money = GarageSession.State.Balance; xp = GarageSession.State.Xp; });
      Click("profile-admin-money-1000"); Click("profile-admin-xp-100");
      steps.Add(() => { GarageSession.Reload(); Check(GarageSession.State.Balance == money + 1000 && GarageSession.State.Xp == xp + 100 && account.Info == "+100 XP", "Admin para/XP diske yazılır"); });
      steps.Add(() => Field("profile-admin-level").value = "0"); Click("profile-admin-level-set");
      steps.Add(() => Check(ProfileView.Instance.FormError == "Seviye 1–99 arasında olmalı", "Geçersiz seviye uygulanmaz"));
      steps.Add(() => Field("profile-admin-level").value = "4"); Click("profile-admin-level-set");
      steps.Add(() => { GarageSession.Reload(); Check(GarageSession.State.Level == 4 && GarageSession.State.Xp == VehicleCatalog.LevelBase(4), "Admin seviye ayarı"); });
      Click("profile-admin-all");
      int locked = -1;
      steps.Add(() =>
      {
        Check(!GarageState.AdminMode && Text("profile-admin-all") == "HER ŞEY AÇIK: KAPALI", "Normal oyuncu görünümü");
        locked = Enumerable.Range(0, GarageSession.Catalog.Data["cars"].Items.Count()).Last(i => !GarageSession.State.OwnsCar(i));
        var pick = Q<DropdownField>("profile-admin-item"); pick.index = locked; Check(pick.value.StartsWith("Araç: "), "Öğe seçici araç adını gösterir");
      });
      Click("profile-admin-open");
      steps.Add(() => { GarageSession.Reload(); Check(GarageSession.State.OwnsCar(locked) && account.Info == "arac_" + locked + " açıldı", "Admin kilit açar"); });
      Click("profile-admin-lock");
      steps.Add(() => { GarageSession.Reload(); Check(!GarageSession.State.OwnsCar(locked), "Admin kilitler"); });
      Click("profile-admin-reset");
      steps.Add(() => Check(ProfileView.Instance.AskReset && Q("profile-admin-reset-yes") != null && GarageSession.State.Xp > 0, "Sıfırlama önce onay ister"));
      Click("profile-admin-reset-yes");
      steps.Add(() => { GarageSession.Reload(); Check(GarageSession.State.Xp == 0 && GarageSession.State.Balance == 0 && GarageRace.ProfileStore().Load().Best("asphalt_1") == 0, "Admin ilerleme ve rekorları sıfırlar"); Check(GarageRace.ProfileStore().Load().Name == "Hesap Testi", "Admin sıfırlaması profil adını korur"); });

      // Yeni oyuncu: onay, çıkış, yerel sıfır, yeni misafir; bilinen hesaplar kalır.
      steps.Add(() => { var p = GarageRace.ProfileStore(); var s = p.Load(); s.Records["asphalt_1"] = "65.5"; p.Save(s); GarageSession.Transact(st => { st.AddMoney(500); return true; }, "test"); });
      Click("profile-switch"); Click("profile-new");
      steps.Add(() => Check(ProfileView.Instance.AskNew && Q("profile-new-yes") != null, "Yeni misafir önce uyarı ve onay ister"));
      steps.Add(() => Shot("new", 1280, 720));
      Click("profile-new-yes"); Wait(() => !account.Busy && account.User != null && account.User.Anonim);
      steps.Add(() =>
      {
        GarageSession.Reload(); var p = GarageRace.ProfileStore().Load();
        Check(account.User.Uid == "ui-guest-2" && account.Info == "Yeni misafirle sıfırdan başlandı" && !account.Admin && !GarageState.AdminMode, "Yeni misafir, admin kapalı");
        Check(GarageSession.State.Xp == 0 && GarageSession.State.Balance == 0 && p.Name == "Sürücü" && p.Races == 0 && p.Km == 0 && p.Best("asphalt_1") == 0, "Yerel ilerleme, rekor ve profil sayaçları sıfır");
        Check(account.KnownAccounts().Count == 2 && Q("profile-google") != null, "Bilinen hesaplar kalır; misafirde Google düğmesi döner");
      });
      Tap(Key.Escape);
      steps.Add(() => { Check(!GameFlow.Profile && GameFlow.Home, "Esc ana menüye döner"); Check(proof.runtimeErrors.Count == 0, "LastTurn çalışma Console hatası yok"); Restore(); CloudRuntime.SetUiValidationAccount(null); Finish(null); });
    }
    private static T Q<T>(string name) where T : VisualElement => UiRoot.Instance.Screen.Q<T>(name);
    private static void Restore()
    {
      GarageState.AdminMode = false;
      foreach (var f in backup) { if (f.Value == null) { if (File.Exists(f.Key)) File.Delete(f.Key); } else File.WriteAllBytes(f.Key, f.Value); }
      GarageSession.Reload();
    }

    private static void Shot(string name, int w, int h) { shot = name; shotW = w; shotH = h; queued = false; Size(w, h); var s = UiRoot.Instance.Screen.Q(className: "p-cloud") as ScrollView; var target = Q("profile-admin-reset") ?? Q("profile-new-yes") ?? Q("profile-account-1"); if (s != null && target != null) s.ScrollTo(target); }
    private static void Size(int w, int h)
    {
      var a = typeof(EditorWindow).Assembly; var t = a.GetType("UnityEditor.GameView"); if (!game) { game = EditorWindow.GetWindow(t); originalSize = (int)t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).GetValue(game); }
      var st = a.GetType("UnityEditor.GameViewSizes"); var singleton = typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null); group = st.GetMethod("GetGroup").Invoke(singleton, new object[] { GameViewSizeGroupType.Standalone });
      int n = (int)group.GetType().GetMethod("GetTotalCount").Invoke(group, null); var size = Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"), new object[] { Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"), "FixedResolution"), w, h, "Hesap" }); group.GetType().GetMethod("AddCustomSize").Invoke(group, new[] { size }); sizes.Add(n);
      t.GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, n); game.Show(); game.Focus(); game.Repaint();
    }
    private static void Capture()
    {
      string path = Path.Combine(Project, "Logs/p8-account-" + shot + "-" + shotW + ".png");
      if (!queued) { Check(Screen.width == shotW && Screen.height == shotH, "Game View çözünürlüğü " + shot + shotW); captureAfter = DateTime.UtcNow; ScreenCapture.CaptureScreenshot(path); queued = true; return; }
      if (!File.Exists(path) || File.GetLastWriteTimeUtc(path) < captureAfter) return;
      var png = new Texture2D(2, 2); try { png.LoadImage(File.ReadAllBytes(path)); Check(png.width == shotW && png.height == shotH, "PNG boyutu " + shot + shotW); } finally { UnityEngine.Object.DestroyImmediate(png); }
      var panel = UiRoot.Instance.Screen.Q(className: "p-cloud"); Check(panel.worldBound.xMax <= UiRoot.Instance.Root.layout.width && panel.worldBound.yMax < UiRoot.Instance.Root.layout.height - 60, "Hesap paneli sınırlar içinde " + shot + shotW);
      proof.images.Add(Path.GetFileName(path)); shot = null;
    }
    private static void Tick()
    {
      try { if (proof.runtimeErrors.Count > 0) throw new Exception(proof.runtimeErrors[0]); if (EditorApplication.timeSinceStartup - began > 200) throw new TimeoutException("Hesap kısa Play"); if (steps.Count == 0) { if (!ProfileView.Instance) return; Setup(); return; } if (EditorApplication.timeSinceStartup - at < .35) return; at = EditorApplication.timeSinceStartup; if (shot != null) { Capture(); return; } if (index < steps.Count) steps[index++](); }
      catch (Exception e) { try { if (backup != null) Restore(); } catch { } Finish(e); }
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active, false); Application.logMessageReceived -= Logged; EditorApplication.update -= Tick; if (keyboard != null && keyboard.added) InputSystem.RemoveDevice(keyboard);
      if (game && group != null) { game.GetType().GetProperty("selectedSizeIndex", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance).SetValue(game, originalSize); foreach (int n in sizes.AsEnumerable().Reverse()) group.GetType().GetMethod("RemoveCustomSize").Invoke(group, new object[] { n }); }
      proof.result = e == null ? "p8-account-passed" : "failed"; proof.error = e?.ToString() ?? ""; proof.utc = DateTime.UtcNow.ToString("O"); proof.sources = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories).Where(f => Path.GetExtension(f) == ".cs" || Path.GetExtension(f) == ".uss").OrderBy(f => f, StringComparer.Ordinal).Select(f => new Source { path = f.Substring(Project.Length + 1).Replace('\\', '/'), hash = Hash(f) }).ToArray(); File.WriteAllText(Path.Combine(Project, "Logs/p8-account-play.json"), JsonUtility.ToJson(proof, true)); if (e != null) Debug.LogException(e); else Debug.Log("Hesap Play geçti: " + proof.checks.Count); EditorApplication.Exit(e == null ? 0 : 1);
    }
  }
}
