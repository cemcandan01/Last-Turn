using System;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // F menüleri (Cem, 2026-11-05): ana menüde yalnız YARIŞ, MUTANT, PROFİL, AYARLAR. Yarış menüsü: Kariyer (pist kartları),
  // Garaj, Mağaza sekmeleri. Mutant menüsü: ayrı ton, "Yeni koşu başlasın mı?" onayından sonra koşu başı (araç → yetenek).
  // Veri GameFlow.Menu() (CareerMenuModel) ve Mutant rekoru; işlemler GameFlow/oturum komutları.
  // Garaj/Modifiye/Mağaza F; Profil ve Ayarlar mevcut geçici ekranları kullanır.
  public sealed class MainMenuView : MonoBehaviour
  {
    private static readonly (string Name, string Sub)[] HomeItems =
    {
      ("YARIŞ", "Kariyer · garaj · mağaza"), ("MUTANT", "Koşu modu"), ("PROFİL", "Sürücü ve bulut hesabı"), ("AYARLAR", "Sürüş, kamera, ses, göstergeler"),
    };
    private static readonly string[] RaceTabs = { "KARİYER", "GARAJ", "MAĞAZA" };
    private VisualElement home, race, mutant, confirm, cards; private Label title, status, raceStatus, moneyLabel, mutantBest;
    private readonly VisualElement[] homeTiles = new VisualElement[HomeItems.Length];
    private readonly VisualElement[] typeButtons = new VisualElement[TestPanelModel.Types.Length];
    private readonly ProfileBadge[] badges = new ProfileBadge[2];
    private CareerMenuModel shown; private int type = -1, shownType = -1, selected, homeFocus;
    private RaceEventRow[] rows = Array.Empty<RaceEventRow>();
    public bool Visible { get; private set; }
    /// Doğrulama: görünen menü, seçili kart, kart sayısı, ana menü odağı, onay açık mı.
    public GameFlow.MenuHub Showing { get; private set; }
    public string SelectedKey => selected >= 0 && selected < rows.Length ? rows[selected].Key : "";
    public int CardCount => rows.Length;
    public int HomeFocus => homeFocus;
    public int HomeItemCount => HomeItems.Length;
    public bool ConfirmOpen => confirm != null && !confirm.ClassListContains("gizli");
    public bool MutantHelpOpen=>mutantHelp!=null&&!mutantHelp.ClassListContains("gizli");
    private Label mutantHelp;

    private sealed class ProfileBadge
    {
      public Label Level, Name, Line; public VisualElement Fill;
      public void Set(CareerMenuModel m)
      {
        Level.text = m.Level.ToString(); string xp = m.Xp.ToString("0") + " / " + m.NextLevelXp.ToString("0") + " XP";
        if (Name != null) { Name.text = m.Name; Line.text = xp + " · " + m.Money.ToString("N0") + " para"; } else Line.text = xp;
        if (Fill != null) Fill.style.width = Length.Percent((float)Math.Max(0, Math.Min(100, m.NextLevelXp > 0 ? 100 * m.Xp / m.NextLevelXp : 0)));
      }
    }

    private void Start()
    {
      home = Panel(); race = Panel(); mutant = Panel(); confirm = Panel();
      BuildHome(); BuildRace(); BuildMutant(); BuildConfirm();
      var layer = UiRoot.Instance.Screen; layer.Add(home); layer.Add(race); layer.Add(mutant); UiRoot.Instance.Top.Add(confirm);
      type = Math.Max(0, Array.IndexOf(TestPanelModel.Types, GameFlow.LastRaceKey.Split('_')[0]));
    }

    private static VisualElement Panel() { var e = new VisualElement { pickingMode = PickingMode.Ignore }; e.AddToClassList("katman"); return e; }
    private static VisualElement Row() { var e = new VisualElement { pickingMode = PickingMode.Ignore }; e.style.flexDirection = FlexDirection.Row; e.style.alignItems = Align.Center; return e; }
    private static VisualElement Card(float right, float top, float width)
    {
      var e = new VisualElement(); e.AddToClassList("cam"); Ui.Absolute(e, right: right, top: top); e.style.width = width;
      e.style.paddingLeft = 26; e.style.paddingRight = 26; e.style.paddingTop = 22; e.style.paddingBottom = 22; return e;
    }

    // ---------- ana menü ----------
    private void BuildHome()
    {
      home.Add(Ui.Shade(.6f, .85f));
      var logo = Ui.Logo(); logo.AddToClassList("logo-buyuk"); Ui.Absolute(logo, left: 58, top: 64); home.Add(logo);
      var line = Row(); Ui.Absolute(line, left: 64, top: 178);
      foreach (var (w, a) in new[] { (180f, 1f), (60f, .7f), (36f, .4f) })
      {
        var d = new VisualElement { pickingMode = PickingMode.Ignore }; d.style.width = w; d.style.height = 8; d.style.marginRight = 10;
        d.style.backgroundColor = new Color(1, .478f, .235f, a); line.Add(d);
      }
      home.Add(line);
      var badge = new ProfileBadge(); var pill = new VisualElement(); pill.AddToClassList("cam"); pill.AddToClassList("profil"); Ui.Absolute(pill, right: 58, top: 58);
      var sv = new VisualElement { pickingMode = PickingMode.Ignore }; sv.AddToClassList("sv"); badge.Level = Ui.Text("1"); sv.Add(badge.Level); pill.Add(sv);
      var col = new VisualElement { pickingMode = PickingMode.Ignore }; badge.Name = Ui.Text("", "ad"); col.Add(badge.Name);
      var bar = new VisualElement { pickingMode = PickingMode.Ignore }; bar.AddToClassList("xpcubuk"); badge.Fill = new VisualElement { pickingMode = PickingMode.Ignore }; bar.Add(badge.Fill); col.Add(bar);
      badge.Line = Ui.Text("", "alt"); col.Add(badge.Line); pill.Add(col); pill.AddManipulator(new Clickable(() => OpenHome(2))); home.Add(pill); badges[0] = badge;
      // eski menünün ikincil işlemleri (kayıt ve geliştirici)
      var extra = Row(); Ui.Absolute(extra, right: 58, top: 176);
      extra.Add(Ui.Button("GELİŞTİRİCİ", "", () => { GameFlow.MainMenu(); GameFlow.Browse(3); }, small: true));
      extra.Add(Ui.Button("KAYDET", "", () => GarageSession.Save(), small: true));
      extra.Add(Ui.Button("YENİDEN YÜKLE", "", () => GarageSession.Reload(), small: true));
      extra.Add(Ui.Button("ÇIKIŞ", "", () => { if (GarageSession.Save()) Application.Quit(); }, small: true));
      foreach (var c in extra.Children()) c.style.marginLeft = 12;
      home.Add(extra);
      var tiles = Row(); Ui.Absolute(tiles, left: 42, right: 42, bottom: 96);
      for (int i = 0; i < HomeItems.Length; i++)
      {
        int n = i; var t = new VisualElement(); t.AddToClassList("anasecim"); t.Add(new Skew());
        t.Add(Ui.Text(HomeItems[i].Name, "ad")); t.Add(Ui.Text(HomeItems[i].Sub, "alt")); t.Add(Ui.Text((i + 1).ToString(), "t", "no"));
        t.AddManipulator(new Clickable(() => OpenHome(n))); t.RegisterCallback<PointerEnterEvent>(_ => FocusHome(n));
        homeTiles[i] = t; tiles.Add(t);
      }
      home.Add(tiles);
      status = Ui.Text("", "durum", "golge"); Ui.Absolute(status, left: 58, bottom: 30); status.style.maxWidth = 1000; home.Add(status);
      home.Add(Ui.Hints(("←|→", "Seç"), ("1|2|3|4", "Kısayol"), ("Enter", "Aç")));
    }

    private void FocusHome(int n) { homeFocus = n; for (int i = 0; i < homeTiles.Length; i++) homeTiles[i].EnableInClassList("sec", i == n); }

    private void OpenHome(int n)
    {
      FocusHome(n); GameAudio.Click();
      switch (n)
      {
        case 0: GameFlow.RaceMenu(); break;
        case 1: GameFlow.MutantMenu(); break;
        case 2: GameFlow.OpenProfile(); break;
        case 3: SettingsScreen.Show(); break;
      }
    }

    // ---------- yarış menüsü ----------
    private void BuildRace()
    {
      race.Add(Ui.Shade());
      var bar = new VisualElement(); bar.AddToClassList("ustbar"); bar.pickingMode = PickingMode.Ignore; bar.Add(Ui.Logo());
      var tabs = new VisualElement(); tabs.AddToClassList("sekmeler"); tabs.pickingMode = PickingMode.Ignore; tabs.Add(Ui.Key("Q"));
      for (int i = 0; i < RaceTabs.Length; i++) { int n = i; var t = Ui.Tab(RaceTabs[i], () => OpenRaceTab(n)); if (i == 0) t.AddToClassList("sec"); tabs.Add(t); }
      tabs.Add(Ui.Key("E")); bar.Add(tabs);
      var mini = new VisualElement(); mini.AddToClassList("mini"); mini.pickingMode = PickingMode.Ignore;
      var badge = new ProfileBadge(); var sv = new VisualElement { pickingMode = PickingMode.Ignore }; sv.AddToClassList("sv"); badge.Level = Ui.Text("1"); sv.Add(badge.Level); mini.Add(sv);
      badge.Line = Ui.Text(""); mini.Add(badge.Line); var sep = new VisualElement(); sep.AddToClassList("ayrac"); mini.Add(sep);
      moneyLabel = Ui.Text(""); mini.Add(moneyLabel); badges[1] = badge;
      var back = Ui.Button("ANA MENÜ", "Esc", GameFlow.MainMenu, small: true); back.style.marginLeft = 28; mini.Add(back);
      bar.Add(mini); race.Add(bar);
      var head = new VisualElement { pickingMode = PickingMode.Ignore }; Ui.Absolute(head, left: 58, bottom: 330);
      head.Add(Ui.Section("KARİYER")); title = Ui.Text("", "baslik"); title.style.marginTop = 6; head.Add(title);
      var types = new VisualElement(); types.AddToClassList("parcali"); types.style.marginTop = 16; types.style.alignSelf = Align.FlexStart;
      for (int i = 0; i < TestPanelModel.Types.Length; i++)
      {
        int n = i; var p = new VisualElement(); p.AddToClassList("parca"); if (i > 0) p.AddToClassList("ayir"); p.Add(Ui.Text(Ui.Upper(TestPanelModel.TypeNames[i])));
        p.AddManipulator(new Clickable(() => SelectType(n))); typeButtons[i] = p; types.Add(p);
      }
      head.Add(types); race.Add(head);
      cards = Row(); cards.style.alignItems = Align.Stretch; Ui.Absolute(cards, left: 58, right: 58, bottom: 88); cards.style.height = 214; race.Add(cards);
      raceStatus = Ui.Text("", "durum", "golge"); Ui.Absolute(raceStatus, left: 58, bottom: 30); raceStatus.style.maxWidth = 900; race.Add(raceStatus);
      race.Add(Ui.Hints(("Q|E", "Sekme"), ("↑|↓", "Tür"), ("←|→", "Pist"), ("Enter", "Seç"), ("Esc", "Ana menü")));
    }

    /// Garaj ve Mağaza yalnız yarış menüsünden; şimdilik bugünkü garaj ekranı (geri düğmesi yarış menüsüne döner).
    private void OpenRaceTab(int n)
    {
      GameAudio.Click();
      if (n == 1) { GameFlow.RaceMenu(); GameFlow.Browse(0); var garage=FindFirstObjectByType<GarageScreen>();if(garage)garage.SelectShop(false); }
      else if (n == 2) GameFlow.OpenStore();
    }

    // ---------- Mutant menüsü ----------
    private void BuildMutant()
    {
      mutant.name="f-mutant-menu";
      var tone = Panel(); tone.AddToClassList("mut-ton"); mutant.Add(tone);
      mutant.Add(Ui.Shade(.75f, .85f));
      var bar = new VisualElement(); bar.AddToClassList("ustbar"); bar.pickingMode = PickingMode.Ignore; bar.Add(Ui.Logo());
      var badge = new VisualElement { pickingMode = PickingMode.Ignore }; badge.AddToClassList("mut-ad"); badge.Add(new Skew()); badge.Add(Ui.Text("MUTANT")); bar.Add(badge);
      var right = new VisualElement { pickingMode = PickingMode.Ignore }; right.AddToClassList("mini"); right.Add(Ui.Button("ANA MENÜ", "Esc", GameFlow.MainMenu, small: true)); bar.Add(right);
      mutant.Add(bar);
      var left = new VisualElement { pickingMode = PickingMode.Ignore }; Ui.Absolute(left, left: 58, top: 210); left.style.width = 660;
      left.Add(Ui.Section("KOŞU MODU"));
      var name = Ui.Text("MUTANT", "baslik"); name.style.fontSize = 112; name.style.marginTop = 8; left.Add(name);
      var about = Ui.Text("Zayıf bir araçla başla. Bölgelerde etkinlik kazan, atölyede parça al, sandık bul. Süre dolmadan boss'u yen.", "durum", "golge");
      about.style.fontSize = 22; about.style.marginTop = 10; left.Add(about);
      var buttons = new VisualElement { pickingMode = PickingMode.Ignore }; buttons.style.width = 470; buttons.style.marginTop = 40;
      var start = Ui.Button("KOŞUYA BAŞLA", "Enter", AskStart, primary: true); start.style.height = 74; start.style.justifyContent = Justify.SpaceBetween; buttons.Add(start);
      var help=Ui.Button("NASIL OYNANIR","H",ToggleMutantHelp);help.style.marginTop=14;buttons.Add(help);
      var back = Ui.Button("ANA MENÜ", "Esc", GameFlow.MainMenu); back.style.justifyContent = Justify.SpaceBetween; back.style.marginTop = 14; buttons.Add(back);
      left.Add(buttons); mutant.Add(left);
      mutantHelp=Ui.Text("1. Üç araçtan birini, sonra bir pasif yeteneği seç.\n2. Sürüşte etkinlik, atölye ve sandık işaretlerini kullan.\n3. Süre dolmadan boss'a meydan oku. Koşu para/parçaları kariyerden ayrıdır.","g-copy");mutantHelp.style.marginTop=18;left.Add(mutantHelp);Ui.Show(mutantHelp,false);
      var best = Card(58, 210, 500); best.Add(Ui.Section("EN İYİ KOŞU"));
      mutantBest = Ui.Text("", "baslik"); mutantBest.style.fontSize = 42; mutantBest.style.marginTop = 8; best.Add(mutantBest); mutant.Add(best);
      var run = Card(58, 380, 500); run.Add(Ui.Section("KOŞU"));
      foreach (var (k, v) in new[] { ("İlk boss'a süre", Clock(MutantRun.FirstBossSeconds)), ("Başlangıç aracı", "3 seçenek"), ("Başlangıç yeteneği", "3 seçenek"), ("Kariyer ilerlemesi", "etkilenmez") })
      { var r = Row(); r.AddToClassList("kv"); r.Add(Ui.Text(k)); r.Add(Ui.Text(v, "deger")); run.Add(r); }
      mutant.Add(run);
      mutant.Add(Ui.Hints(("Enter", "Koşuya başla"), ("Esc", "Ana menü")));
    }

    private static string Clock(double s) => ((int)s / 60).ToString("0") + ":" + ((int)s % 60).ToString("00");

    private void BuildConfirm()
    {
      confirm.name="f-mutant-confirm";
      confirm.AddToClassList("perde"); confirm.pickingMode = PickingMode.Position;
      var box = new VisualElement(); box.AddToClassList("cam"); box.AddToClassList("onay");
      box.Add(Ui.Section("MUTANT"));
      var t = Ui.Text("YENİ KOŞU BAŞLASIN MI?", "baslik"); t.style.fontSize = 54; t.style.marginTop = 10; box.Add(t);
      var d = Ui.Text("Önce aracını, sonra başlangıç yeteneğini seçeceksin. Boss süresi sürüş başlayınca akar. Koşuda aldığın parçalar ve para yalnız bu koşuya aittir; kariyer ilerlemen etkilenmez.", "durum");
      d.style.fontSize = 20; d.style.marginTop = 12; box.Add(d);
      var row = Row(); row.style.marginTop = 30; row.style.justifyContent = Justify.FlexEnd;
      row.Add(Ui.Button("VAZGEÇ", "Esc", CloseConfirm)); var go = Ui.Button("BAŞLA", "Enter", StartRun, primary: true); go.style.marginLeft = 22; row.Add(go);
      box.Add(row); confirm.Add(box); Ui.Show(confirm, false);
    }

    private void AskStart() { GameAudio.Click(); Ui.Show(confirm, true); }
    private void CloseConfirm() { GameAudio.Click(); Ui.Show(confirm, false); }
    private void ToggleMutantHelp(){Ui.Show(mutantHelp,!MutantHelpOpen);}
    private void StartRun() { Ui.Show(confirm, false); GameAudio.Click(); MutantRuntime.Start(unchecked((uint)Environment.TickCount)); }

    // ---------- güncelleme ----------
    private static bool Wanted() =>
      SceneManager.GetActiveScene().name == "Garage" && GameFlow.Home && !GameFlow.Profile && !MutantRuntime.Active && !SettingsScreen.Open && GarageSession.State != null;

    private void Update()
    {
      if (home == null) return;
      bool wasVisible=Visible;Visible = Wanted(); Showing = GameFlow.Hub;
      Ui.Show(home, Visible && Showing == GameFlow.MenuHub.Home); Ui.Show(race, Visible && Showing == GameFlow.MenuHub.Race); Ui.Show(mutant, Visible && Showing == GameFlow.MenuHub.Mutant);
      if (!Visible || Showing != GameFlow.MenuHub.Mutant) Ui.Show(confirm, false);
      if (!Visible) return;
      CareerMenuModel m; try { m = GameFlow.Menu(); } catch (Exception e) { status.text = "Menü okunamadı: " + e.Message; return; }
      foreach (var b in badges) b.Set(m);
      moneyLabel.text = m.Money.ToString("N0") + " para";
      string msg = GameFlow.Message != "" ? GameFlow.Message : GarageSession.Message ?? ""; status.text = msg; raceStatus.text = msg;
      if (Showing == GameFlow.MenuHub.Race && (m != shown || type != shownType)) Rebuild(m);
      if (Showing == GameFlow.MenuHub.Mutant) { var r = MutantRuntime.Record(); mutantBest.text = r.Region > 0 ? "Bölge " + r.Region + " · " + r.Bosses + " boss" : "Henüz koşu yok"; }
      if (Showing == GameFlow.MenuHub.Home && !homeTiles[homeFocus].ClassListContains("sec")) FocusHome(homeFocus);
      if(wasVisible)Keys(Keyboard.current);
    }

    private void Keys(Keyboard k)
    {
      if (k == null) return;
      bool enter = k.enterKey.wasPressedThisFrame || k.numpadEnterKey.wasPressedThisFrame, esc = k.escapeKey.wasPressedThisFrame;
      switch (Showing)
      {
        case GameFlow.MenuHub.Home:
          if (k.leftArrowKey.wasPressedThisFrame) { FocusHome((homeFocus + HomeItems.Length - 1) % HomeItems.Length); GameAudio.Click(); }
          else if (k.rightArrowKey.wasPressedThisFrame) { FocusHome((homeFocus + 1) % HomeItems.Length); GameAudio.Click(); }
          else if (enter) OpenHome(homeFocus);
          else for (int i = 0; i < HomeItems.Length; i++) if (k[Key.Digit1 + i].wasPressedThisFrame) { OpenHome(i); break; }
          break;
        case GameFlow.MenuHub.Race:
          if (esc) { GameAudio.Click(); GameFlow.MainMenu(); }
          else if (k.qKey.wasPressedThisFrame) OpenRaceTab(2); else if (k.eKey.wasPressedThisFrame) OpenRaceTab(1);
          else if (k.upArrowKey.wasPressedThisFrame) SelectType((type + TestPanelModel.Types.Length - 1) % TestPanelModel.Types.Length);
          else if (k.downArrowKey.wasPressedThisFrame) SelectType((type + 1) % TestPanelModel.Types.Length);
          else if (k.leftArrowKey.wasPressedThisFrame) Select(selected - 1);
          else if (k.rightArrowKey.wasPressedThisFrame) Select(selected + 1);
          else if (enter) Open();
          break;
        case GameFlow.MenuHub.Mutant:
          if (ConfirmOpen) { if (enter) StartRun(); else if (esc) CloseConfirm(); }
          else if(k.hKey.wasPressedThisFrame)ToggleMutantHelp();else if (enter) AskStart(); else if (esc) { GameAudio.Click(); GameFlow.MainMenu(); }
          break;
      }
    }

    private void SelectType(int n) { type = n; GameAudio.Click(); }

    private void Rebuild(CareerMenuModel m)
    {
      bool typeChanged = type != shownType; shown = m; shownType = type;
      for (int i = 0; i < typeButtons.Length; i++) typeButtons[i].EnableInClassList("sec", i == type);
      title.text = TestPanelModel.TypeNames[type];
      string old = SelectedKey;
      rows = TestPanelModel.Tracks(m.Events, TestPanelModel.Types[type]);
      int keep = Array.FindIndex(rows, r => r.Key == old);
      // sıradaki: açık ve kariyere uygun ilk 3 yıldızsız pist; yoksa son açık pist
      int next = Array.FindIndex(rows, r => r.Open && r.Career && r.BestStars < 3);
      if (next < 0) next = Math.Max(0, Array.FindLastIndex(rows, r => r.Open));
      int last = Array.FindIndex(rows, r => r.Key == GameFlow.LastRaceKey);
      selected = !typeChanged && keep >= 0 ? keep : last >= 0 ? last : next;
      cards.Clear();
      for (int i = 0; i < rows.Length; i++)
      {
        var r = rows[i]; int n = i;
        var c = new VisualElement(); c.AddToClassList("kart"); c.style.flexGrow = 1; c.style.flexBasis = 0; if (i > 0) c.style.marginLeft = 19;
        if (!r.Open) c.AddToClassList("kilit");
        string state = !r.Open ? "KİLİTLİ" : !r.Career ? "ÖDÜLSÜZ DENEME" : i == next ? "SIRADAKİ" : r.BestStars == 3 ? "TAMAM" : "AÇIK";
        c.Add(Ui.Text(Ui.Upper(TestPanelModel.TypeNames[type]) + " · " + state, "ust"));
        c.Add(Ui.Text(r.Name, "ad"));
        var bottom = new VisualElement { pickingMode = PickingMode.Ignore }; bottom.AddToClassList("alt");
        bottom.Add(Ui.Text("Hedef " + r.Target));
        var stars = new VisualElement { pickingMode = PickingMode.Ignore }; stars.AddToClassList("yildizlar"); for (int s = 0; s < 3; s++) stars.Add(new Star(s < r.BestStars));
        bottom.Add(stars); c.Add(bottom);
        c.AddManipulator(new Clickable(() => { if (selected == n) Open(); else Select(n); }));
        cards.Add(c);
      }
      Mark();
    }

    private void Select(int n) { if (rows.Length == 0) return; selected = Mathf.Clamp(n, 0, rows.Length - 1); Mark(); GameAudio.Click(); }
    private void Mark() { int i = 0; foreach (var c in cards.Children()) c.EnableInClassList("sec", i++ == selected); }

    /// Kart: bugünkü kariyer ekranına aynı pist seçili gider (hava/saat ve başlat orada).
    private void Open() { if (SelectedKey == "") return; GameAudio.Click(); GameFlow.OpenRace(SelectedKey); }
  }
}
