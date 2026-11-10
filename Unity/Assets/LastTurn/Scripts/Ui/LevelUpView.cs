using System.Collections.Generic;
using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // TS arayuz/seviye-ui.ts kutlamaGoster: seviye atlanınca yarış sonu ekranında XP çubuğu dolduktan sonra (2,3 sn) ya da
  // menü açılınca tek katman; bekleyen atlamalar birleşir (en son seviye, bütün açılanlar). Tıklama/Enter/Boşluk kapatır.
  public sealed class LevelUpView : MonoBehaviour
  {
    public const float ResultDelay = 2.3f;
    public static bool Open { get; private set; }
    public static LevelUpView Instance { get; private set; }
    public CareerLevelUp Shown { get; private set; }
    public int Opened { get; private set; }
    private VisualElement page, list; private Label title, heading; private float resultSince = -1; private int openedFrame;
    private MainMenuView menu;

    private void Start()
    {
      Instance = this; menu = GetComponent<MainMenuView>();
      page = new VisualElement { name = "seviye-kutlama" }; page.AddToClassList("katman"); page.Add(Ui.Shade(.55f, .7f));
      var card = new VisualElement(); card.AddToClassList("cam"); card.style.position = Position.Absolute; card.style.left = Length.Percent(50); card.style.top = Length.Percent(50);
      card.style.translate = new Translate(Length.Percent(-50), Length.Percent(-50)); card.style.width = 620; card.style.paddingLeft = card.style.paddingRight = 40; card.style.paddingTop = card.style.paddingBottom = 32; card.style.alignItems = Align.Center;
      card.Add(Ui.Section("SEVİYE ATLADIN")); title = Ui.Text("", "baslik", "g-name"); title.style.fontSize = 64; card.Add(title);
      heading = Ui.Text("", "g-price"); card.Add(heading); list = new VisualElement(); list.style.alignItems = Align.Center; list.style.marginTop = 8; card.Add(list);
      var hint = Ui.Text("Devam etmek için tıkla", "g-copy", "soluk"); hint.style.marginTop = 18; card.Add(hint); page.Add(card);
      page.AddManipulator(new Clickable(Close)); UiRoot.Instance.Top.Add(page); Ui.Show(page, false);
    }

    private void Show(CareerLevelUp m)
    {
      Shown = m; Opened++; Open = true; openedFrame = Time.frameCount; title.text = "Seviye " + m.New + "!"; list.Clear();
      heading.text = m.Unlocked.Length > 0 ? Ui.Upper(m.Heading) : ""; Ui.Show(heading, m.Unlocked.Length > 0);
      foreach (var o in m.Unlocked)
      {
        var row = Ui.Text(o.Name, "g-copy"); row.name = "seviye-acilan"; list.Add(row);
        if (o.Kind == "arac" && o.Price > 0) { var price = Ui.Text("Satın alınabilir · " + o.Price.ToString("N0") + " para", "g-copy", "soluk"); list.Add(price); }
      }
      Ui.Show(page, true); GameAudio.Click();
    }
    public void Close() { if (!Open || Time.frameCount == openedFrame) return; Open = false; Ui.Show(page, false); }

    private void Update()
    {
      if (page == null) return;
      bool result = ResultView.Instance && ResultView.Instance.Visible, home = menu && menu.Visible;
      resultSince = result ? (resultSince < 0 ? Time.unscaledTime : resultSince) : -1;
      if (Open)
      {
        // TS: kutlama yalnız menü/sonuçta; oradan çıkılırsa katman kapanır.
        if (!result && !home) { Open = false; Ui.Show(page, false); return; }
        var k = Keyboard.current; if (k != null && Time.frameCount != openedFrame && (k.enterKey.wasPressedThisFrame || k.numpadEnterKey.wasPressedThisFrame || k.spaceKey.wasPressedThisFrame || k.escapeKey.wasPressedThisFrame)) Close();
        return;
      }
      if (CareerLevelUps.Pending == 0) return;
      if (home || (result && Time.unscaledTime - resultSince >= ResultDelay)) { var m = CareerLevelUps.Take(); if (m != null) Show(m); }
    }
    private void OnDestroy() { if (Instance == this) { Instance = null; Open = false; } page?.RemoveFromHierarchy(); }
  }
}
