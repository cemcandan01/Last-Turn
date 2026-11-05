using System;
using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // F ana menüsü (docs/tasarim/menu-hud-pc.html → F, ekranlar-f.html): üst şeritte eğik sekmeler (Q/E), YARIŞ sekmesinde tür
  // seçimi ve o türün pist kartları. Veri GameFlow.Menu() (CareerMenuModel) görünüm modelinden; işlemler GameFlow/oturum
  // komutları. Diğer sekmeler şimdilik bugünkü geçici ekranları açar (akış aynı).
  public sealed class MainMenuView : MonoBehaviour
  {
    private static readonly string[] TabNames = { "YARIŞ", "MUTANT", "GARAJ", "MAĞAZA", "PROFİL", "AYARLAR" };
    private VisualElement root, cards, types; private Label level, xp, money, title, status;
    private readonly VisualElement[] typeButtons = new VisualElement[TestPanelModel.Types.Length];
    private CareerMenuModel shown; private int type = -1, shownType = -1, selected;
    private RaceEventRow[] rows = Array.Empty<RaceEventRow>();
    public bool Visible { get; private set; }
    /// Doğrulama: seçili kartın etkinlik anahtarı ve görünen kart sayısı.
    public string SelectedKey => selected >= 0 && selected < rows.Length ? rows[selected].Key : "";
    public int CardCount => rows.Length;

    private void Start()
    {
      root = new VisualElement(); root.AddToClassList("katman"); root.pickingMode = PickingMode.Ignore;
      root.Add(Ui.Shade());
      // üst şerit
      var bar = new VisualElement(); bar.AddToClassList("ustbar"); bar.pickingMode = PickingMode.Ignore; bar.Add(Ui.Logo());
      var tabs = new VisualElement(); tabs.AddToClassList("sekmeler"); tabs.pickingMode = PickingMode.Ignore;
      tabs.Add(Ui.Key("Q"));
      for (int i = 0; i < TabNames.Length; i++) { int n = i; var t = Ui.Tab(TabNames[i], () => OpenTab(n)); if (i == 0) t.AddToClassList("sec"); tabs.Add(t); }
      tabs.Add(Ui.Key("E")); bar.Add(tabs);
      var mini = new VisualElement(); mini.AddToClassList("mini"); mini.pickingMode = PickingMode.Ignore;
      var sv = new VisualElement(); sv.AddToClassList("sv"); level = Ui.Text("1"); sv.Add(level); mini.Add(sv);
      xp = Ui.Text(""); mini.Add(xp); var sep = new VisualElement(); sep.AddToClassList("ayrac"); mini.Add(sep); money = Ui.Text(""); mini.Add(money);
      bar.Add(mini); root.Add(bar);
      // sağ üst ikincil işlemler (eski menünün Kaydet / yeniden yükle / geliştirici / çıkış)
      var extra = new VisualElement { pickingMode = PickingMode.Ignore }; extra.style.flexDirection = FlexDirection.Row; Ui.Absolute(extra, right: 58, top: 128);
      extra.Add(Ui.Button("GELİŞTİRİCİ", "", () => GameFlow.Browse(3), small: true));
      extra.Add(Ui.Button("KAYDET", "", () => GarageSession.Save(), small: true));
      extra.Add(Ui.Button("YENİDEN YÜKLE", "", () => GarageSession.Reload(), small: true));
      extra.Add(Ui.Button("ÇIKIŞ", "", () => { if (GarageSession.Save()) Application.Quit(); }, small: true));
      foreach (var c in extra.Children()) c.style.marginLeft = 12;
      root.Add(extra);
      // YARIŞ sekmesi: başlık, tür seçimi, kartlar
      var head = new VisualElement { pickingMode = PickingMode.Ignore }; Ui.Absolute(head, left: 58, bottom: 330);
      head.Add(Ui.Section("KARİYER")); title = Ui.Text("", "baslik"); title.style.marginTop = 6; head.Add(title);
      types = new VisualElement(); types.AddToClassList("parcali"); types.style.marginTop = 16; types.style.alignSelf = Align.FlexStart;
      for (int i = 0; i < TestPanelModel.Types.Length; i++)
      {
        int n = i; var p = new VisualElement(); p.AddToClassList("parca"); if (i > 0) p.AddToClassList("ayir"); p.Add(Ui.Text(Ui.Upper(TestPanelModel.TypeNames[i])));
        p.AddManipulator(new Clickable(() => SelectType(n))); typeButtons[i] = p; types.Add(p);
      }
      head.Add(types); root.Add(head);
      cards = new VisualElement { pickingMode = PickingMode.Ignore }; cards.style.flexDirection = FlexDirection.Row; Ui.Absolute(cards, left: 58, right: 58, bottom: 88); cards.style.height = 214;
      root.Add(cards);
      status = Ui.Text("", "durum", "golge"); Ui.Absolute(status, left: 58, bottom: 30); status.style.maxWidth = 1000; root.Add(status);
      root.Add(Ui.Hints(("Q|E", "Sekme"), ("↑|↓", "Tür"), ("←|→", "Pist"), ("Enter", "Seç")));
      UiRoot.Instance.Screen.Add(root);
      type = Math.Max(0, Array.IndexOf(TestPanelModel.Types, GameFlow.LastRaceKey.Split('_')[0]));
    }

    private static bool Wanted() =>
      SceneManager.GetActiveScene().name == "Garage" && GameFlow.Home && !GameFlow.Profile && !MutantRuntime.Active && GarageSession.State != null;

    private void Update()
    {
      if (root == null) return;
      Visible = Wanted(); Ui.Show(root, Visible); if (!Visible) return;
      CareerMenuModel m; try { m = GameFlow.Menu(); } catch (Exception e) { status.text = "Menü okunamadı: " + e.Message; return; }
      level.text = m.Level.ToString(); xp.text = m.Xp.ToString("0") + " / " + m.NextLevelXp.ToString("0") + " XP"; money.text = m.Money.ToString("N0") + " para";
      if (m != shown || type != shownType) Rebuild(m);
      string msg = GameFlow.Message != "" ? GameFlow.Message : GarageSession.Message ?? ""; status.text = msg;
      var k = Keyboard.current; if (k == null) return;
      if (k.qKey.wasPressedThisFrame) OpenTab(TabNames.Length - 1); else if (k.eKey.wasPressedThisFrame) OpenTab(1);
      else if (k.upArrowKey.wasPressedThisFrame) SelectType((type + TestPanelModel.Types.Length - 1) % TestPanelModel.Types.Length);
      else if (k.downArrowKey.wasPressedThisFrame) SelectType((type + 1) % TestPanelModel.Types.Length);
      else if (k.leftArrowKey.wasPressedThisFrame) Select(selected - 1);
      else if (k.rightArrowKey.wasPressedThisFrame) Select(selected + 1);
      else if (k.enterKey.wasPressedThisFrame || k.numpadEnterKey.wasPressedThisFrame) Open();
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

    private void OpenTab(int n)
    {
      GameAudio.Click();
      switch (n)
      {
        case 1: MutantRuntime.Start(unchecked((uint)Environment.TickCount)); break;
        case 2: GameFlow.Browse(0); break;
        case 3: GameFlow.OpenStore(); break;
        case 4: GameFlow.OpenProfile(); break;
        case 5: GameFlow.Browse(4); break;
      }
    }
  }
}
