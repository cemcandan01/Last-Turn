using System;
using System.Collections.Generic;
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
  // F §7 Ayarlar (docs/tasarim/ekranlar-f.html): solda bölümler, ortada satırlar, sağda açıklama. Satır ve değer kuralları
  // SettingsViewModel'de; kayıt mevcut PlayerPreferences.Save (kapatınca) ve sürüş yardımı için GarageSession.Execute.
  // Her sahnede açılabilir (ana menü, yarış/Mutant duraklatma); yarışta kapatınca duraklatma menüsüne döner.
  public sealed class SettingsView : MonoBehaviour
  {
    public static SettingsView Instance { get; private set; }
    public static bool CoversCurrentScreen => Instance && Instance.page != null && SettingsScreen.Open;
    public bool Visible { get; private set; }
    public int Section { get; private set; }
    public int Row { get; private set; }
    public IReadOnlyList<SettingsRow> Rows => rows;
    public int KeyRowCount { get; private set; }

    private VisualElement page, sectionList, rowList, keyTable;
    private ScrollView scroll;
    private Label sectionTitle, infoTitle, infoText, infoNote, error;
    private readonly List<VisualElement> tabs = new List<VisualElement>(), rowElements = new List<VisualElement>();
    private List<SettingsRow> rows = new List<SettingsRow>();

    private static bool Touch => Touchscreen.current != null;

    private void Start()
    {
      Instance = this;
      page = new VisualElement { name = "f-settings" }; page.AddToClassList("katman"); page.AddToClassList("st-page");
      var bar = new VisualElement(); bar.AddToClassList("ustbar"); bar.Add(Ui.Logo()); bar.Add(Ui.Text("AYARLAR", "g-money")); page.Add(bar);

      sectionList = new VisualElement(); sectionList.AddToClassList("st-sections");
      for (int i = 0; i < SettingsViewModel.Sections.Length; i++)
      {
        int s = i; var tab = Ui.Tab(SettingsViewModel.Sections[i], () => { GameAudio.Click(); Select(s); }); tab.name = "settings-section-" + i;
        tabs.Add(tab); sectionList.Add(tab);
      }
      page.Add(sectionList);

      var main = new VisualElement(); main.AddToClassList("g-panel"); main.AddToClassList("st-main");
      sectionTitle = Ui.Text("", "st-title"); main.Add(sectionTitle);
      scroll = new ScrollView(ScrollViewMode.Vertical) { horizontalScrollerVisibility = ScrollerVisibility.Hidden }; scroll.AddToClassList("st-scroll");
      rowList = new VisualElement(); scroll.Add(rowList); keyTable = new VisualElement(); keyTable.AddToClassList("st-keys"); scroll.Add(keyTable);
      main.Add(scroll); page.Add(main);

      var info = new VisualElement(); info.AddToClassList("g-panel"); info.AddToClassList("st-info");
      var head = Ui.Section(""); infoTitle = head.Q<Label>(); info.Add(head);
      infoText = Ui.Text("", "g-copy"); info.Add(infoText);
      infoNote = Ui.Text("", "g-copy", "soluk"); info.Add(infoNote);
      error = Ui.Text("", "g-copy", "uyari"); error.name = "settings-error"; info.Add(error);
      page.Add(info);

      var back = Ui.Button("KAYDET VE DÖN", "Esc", Back, primary: true); back.name = "settings-back"; Ui.Absolute(back, left: 58, bottom: 22); page.Add(back);
      page.Add(Ui.Hints(("↑|↓", "Satır"), ("←|→", "Değiştir"), ("Enter", "Sıradaki"), ("Q|E", "Bölüm"), ("Esc", "Kaydet ve geri")));
      UiRoot.Instance.Screen.Add(page); Ui.Show(page, false);
    }

    private void Update()
    {
      if (page == null) return;
      bool wasVisible = Visible; Visible = CoversCurrentScreen; Ui.Show(page, Visible);
      if (!Visible) return;
      if (!wasVisible) { Section = 0; Row = 0; Rebuild(); }
      error.text = PlayerPreferences.LastError != null ? "Ayarlar kaydedilemedi: " + PlayerPreferences.LastError : "";
      if (wasVisible) Keys(Keyboard.current);
    }

    private void Keys(Keyboard k)
    {
      if (k == null) return;
      if (k.escapeKey.wasPressedThisFrame) { Back(); return; }
      if (k.qKey.wasPressedThisFrame) { GameAudio.Click(); Select((Section + SettingsViewModel.Sections.Length - 1) % SettingsViewModel.Sections.Length); }
      else if (k.eKey.wasPressedThisFrame) { GameAudio.Click(); Select((Section + 1) % SettingsViewModel.Sections.Length); }
      else if (rows.Count == 0) return;
      else if (k.upArrowKey.wasPressedThisFrame) FocusRow(Math.Max(0, Row - 1));
      else if (k.downArrowKey.wasPressedThisFrame) FocusRow(Math.Min(rows.Count - 1, Row + 1));
      else if (k.leftArrowKey.wasPressedThisFrame) Apply(SettingsViewModel.Step(rows[Row], -1, PlayerPreferences.Current, GarageSession.State));
      else if (k.rightArrowKey.wasPressedThisFrame) Apply(SettingsViewModel.Step(rows[Row], 1, PlayerPreferences.Current, GarageSession.State));
      else if (k.enterKey.wasPressedThisFrame || k.numpadEnterKey.wasPressedThisFrame) Apply(SettingsViewModel.Activate(rows[Row], PlayerPreferences.Current, GarageSession.State));
    }

    public void Select(int section) { Section = section; Row = 0; Rebuild(); scroll.scrollOffset = Vector2.zero; }

    /// Fare ve doğrulama: satırdaki seçeneği seçer.
    public void Choose(int row, int choice) { FocusRow(row); Apply(SettingsViewModel.Choose(rows[row], choice, PlayerPreferences.Current, GarageSession.State)); }

    private void Apply(GarageCommand command)
    {
      GameAudio.Click();
      if (command != null) GarageSession.Execute(command);
      Rebuild();
    }

    public void Back()
    {
      GameAudio.Click(); bool race = SceneManager.GetActiveScene().name != "Garage";
      SettingsScreen.Close();
      // Yarış ve Mutant'ta ayarlar duraklatma menüsünden açılır; oraya döner.
      if (race) GameFlow.Pause(true);
    }

    private void Rebuild()
    {
      rows = SettingsViewModel.Rows(Section, PlayerPreferences.Current, GarageSession.State, Touch, Debug.isDebugBuild);
      Row = Math.Min(Row, Math.Max(0, rows.Count - 1));
      for (int i = 0; i < tabs.Count; i++) tabs[i].EnableInClassList("sec", i == Section);
      sectionTitle.text = SettingsViewModel.Sections[Section];
      rowList.Clear(); rowElements.Clear();
      for (int i = 0; i < rows.Count; i++) rowList.Add(RowElement(i, rows[i]));
      BuildKeys();
      FocusRow(Row);
    }

    private VisualElement RowElement(int index, SettingsRow row)
    {
      var e = new VisualElement { name = "settings-row-" + index }; e.AddToClassList("st-row"); rowElements.Add(e);
      e.RegisterCallback<PointerEnterEvent>(_ => FocusRow(index));
      e.Add(Ui.Text(row.Name, "st-name"));
      if (row.Slider)
      {
        var box = new VisualElement(); box.AddToClassList("st-slider");
        box.Add(Piece("−", false, () => Apply(SettingsViewModel.Step(rows[index], -1, PlayerPreferences.Current, GarageSession.State)), "settings-row-" + index + "-down"));
        var track = new VisualElement(); track.AddToClassList("xpcubuk"); track.AddToClassList("st-track");
        var fill = new VisualElement(); fill.style.width = Length.Percent((float)((row.Value - row.Min) / (row.Max - row.Min) * 100)); track.Add(fill);
        track.RegisterCallback<PointerDownEvent>(ev =>
        {
          float t = Mathf.Clamp01(ev.localPosition.x / Mathf.Max(1, track.layout.width));
          FocusRow(index); SettingsViewModel.SetValue(rows[index], row.Min + t * (row.Max - row.Min), PlayerPreferences.Current); Apply(null);
        });
        box.Add(track);
        box.Add(Piece("+", false, () => Apply(SettingsViewModel.Step(rows[index], 1, PlayerPreferences.Current, GarageSession.State)), "settings-row-" + index + "-up"));
        box.Add(Ui.Text(row.Max == 100 ? "%" + row.Value.ToString("0") : row.Value.ToString("0") + "°", "st-value"));
        e.Add(box);
      }
      else
      {
        var seg = new VisualElement(); seg.AddToClassList("parcali");
        for (int j = 0; j < row.Choices.Length; j++)
        {
          int c = j; var p = Piece(Ui.Upper(row.Choices[j]), j == row.Selected, () => Choose(index, c), "settings-row-" + index + "-c" + j);
          if (j > 0) p.AddToClassList("ayir"); seg.Add(p);
        }
        e.Add(seg);
      }
      return e;
    }

    private static VisualElement Piece(string text, bool selected, Action click, string name)
    {
      var p = new VisualElement { name = name }; p.AddToClassList("parca"); if (selected) p.AddToClassList("sec");
      p.Add(Ui.Text(text)); p.AddManipulator(new Clickable(click)); return p;
    }

    private void FocusRow(int index)
    {
      if (rows.Count == 0) { Row = 0; infoTitle.text = SettingsViewModel.Sections[Section]; infoText.text = ""; infoNote.text = Note(); return; }
      Row = index;
      for (int i = 0; i < rowElements.Count; i++) rowElements[i].EnableInClassList("sec", i == Row);
      var r = rows[Row]; infoTitle.text = Ui.Upper(r.Name); infoText.text = r.Description; infoNote.text = Note();
      if (Row < rowElements.Count) scroll.ScrollTo(rowElements[Row]);
    }

    private string Note() => Section == SettingsViewModel.Controls
      ? "Klavye tuşları sabittir; tablo sürüşte kullanılan eşlemeden okunur."
      : "Değişiklikler hemen uygulanır; kapatınca kaydedilir.";

    // ---------- Kontroller: salt okunur klavye tablosu ----------
    private static readonly Dictionary<string, string> ActionNames = new Dictionary<string, string>
    {
      ["Gaz"] = "Gaz", ["Fren"] = "Fren / geri", ["SolDireksiyon"] = "Sola", ["SagDireksiyon"] = "Sağa", ["ElFreni"] = "El freni",
      ["YenidenBaslat"] = "Yeniden başlat", ["VitesYukari"] = "Vites yükselt (Drag)", ["VitesAsagi"] = "Vites düşür (Drag)", ["Nitro"] = "Nitro (Mutant)",
      ["Kamera"] = "Kamera", ["PisteDon"] = "Piste dön", ["Beceri1"] = "Skill 1 (Mutant)", ["Beceri2"] = "Skill 2 (Mutant)", ["Beceri3"] = "Skill 3 (Mutant)",
      ["HavaSurukle"] = "Havada burun (sürükle)",
    };

    private static string KeyName(string path)
    {
      string k = path.Substring(path.LastIndexOf('/') + 1);
      switch (k)
      {
        case "upArrow": return "↑"; case "downArrow": return "↓"; case "leftArrow": return "←"; case "rightArrow": return "→";
        case "space": return "Boşluk"; case "escape": return "Esc"; case "leftButton": return "Sol fare";
        default: return k.ToUpperInvariant();
      }
    }

    private void BuildKeys()
    {
      keyTable.Clear(); KeyRowCount = 0; Ui.Show(keyTable, Section == SettingsViewModel.Controls);
      if (Section != SettingsViewModel.Controls) return;
      keyTable.Add(Ui.Section("KLAVYE VE FARE"));
      foreach (var (action, paths) in GtKeyboardInput.Bindings().Append(("Duraklat", new[] { "<Keyboard>/escape" })))
      {
        var line = new VisualElement(); line.AddToClassList("st-key");
        line.Add(Ui.Text(ActionNames.TryGetValue(action, out var n) ? n : action, "st-name"));
        var keys = new VisualElement(); keys.AddToClassList("st-keycaps"); foreach (var p in paths) keys.Add(Ui.Key(KeyName(p)));
        line.Add(keys); keyTable.Add(line); KeyRowCount++;
      }
    }

    private void OnDestroy() { if (Instance == this) Instance = null; page?.RemoveFromHierarchy(); }
  }
}
