using UnityEngine;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // F arayüzünün tek UI Toolkit belgesi (docs/tasarim/ekranlar-f.html): sahneler arasında yaşar, 1920×1080 başvuruyla ölçeklenir.
  // Katmanlar: Ekran (menüler), Hud (yarış), Ust (bildirim/onay). Görünüm yalnız görünüm modeli + komut kullanır.
  public sealed class UiRoot : MonoBehaviour
  {
    public static UiRoot Instance { get; private set; }
    public VisualElement Root { get; private set; }
    public VisualElement Screen { get; private set; }
    public VisualElement Hud { get; private set; }
    public VisualElement Top { get; private set; }
    /// Doğrulama: batch Editor'da oyun penceresi yok; panel geçici olarak bir dokuya çizdirilir.
    public PanelSettings Settings { get; private set; }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Install()
    {
      if (Instance) return;
      var go = new GameObject("Arayüz (F)"); DontDestroyOnLoad(go); go.AddComponent<UiRoot>();
    }

    private void Awake()
    {
      Instance = this;
      var settings = ScriptableObject.CreateInstance<PanelSettings>();
      settings.name = "Last Turn F paneli";
      settings.scaleMode = PanelScaleMode.ScaleWithScreenSize;
      settings.referenceResolution = new Vector2Int(1920, 1080);
      settings.screenMatchMode = PanelScreenMatchMode.MatchWidthOrHeight;
      // Geniş ekranda ek yatay alan kazan; 1080 birimlik dikey yerleşimi daraltma.
      settings.match = 1f;
      settings.sortingOrder = 10;
      settings.themeStyleSheet = Resources.Load<ThemeStyleSheet>("UI/LastTurnTheme");
      Settings = settings;
      var doc = gameObject.AddComponent<UIDocument>();
      doc.panelSettings = settings;
      Root = doc.rootVisualElement;
      Root.pickingMode = PickingMode.Ignore;
      var sheet = Resources.Load<StyleSheet>("UI/lt");
      if (sheet) Root.styleSheets.Add(sheet); else Debug.LogError("Arayüz stili bulunamadı: Resources/UI/lt.uss");
      var kok = Layer("lt-kok"); Root.Add(kok);
      Screen = Layer("katman"); Hud = Layer("katman"); Top = Layer("katman");
      kok.Add(Hud); kok.Add(Screen); kok.Add(Top);
      gameObject.AddComponent<MainMenuView>();
      gameObject.AddComponent<MenuBackdropView>();
      gameObject.AddComponent<LevelUpView>();
      gameObject.AddComponent<GarageView>();
      gameObject.AddComponent<StoreView>();
      gameObject.AddComponent<MutantStartView>();
      gameObject.AddComponent<MutantChoiceView>();
      gameObject.AddComponent<MutantBossView>();
      gameObject.AddComponent<MutantEventView>();
      gameObject.AddComponent<MutantWorkshopView>();
      gameObject.AddComponent<MutantChestView>();
      gameObject.AddComponent<MutantSummaryView>();
      gameObject.AddComponent<MutantResultView>();
      gameObject.AddComponent<RacePreparationView>();
      gameObject.AddComponent<ProfileView>();
      gameObject.AddComponent<SettingsView>();
      gameObject.AddComponent<PauseView>();
      gameObject.AddComponent<ResultView>();
      gameObject.AddComponent<RaceHudView>();
      gameObject.AddComponent<MutantHudView>();
    }

    private static VisualElement Layer(string cls)
    {
      var e = new VisualElement { pickingMode = PickingMode.Ignore }; e.AddToClassList(cls); return e;
    }

    /// Ekran pikseli (IMGUI ekseni) → panel birimi; HudLayout dikdörtgenlerini UI Toolkit'e taşımak için.
    public float PixelToPanel { get { float w = LastTurn.Prototype.Hud.ScreenWidth; return Root != null && Root.layout.width > 1 && w > 0 ? Root.layout.width / w : 1; } }

    /// Fare bir UI Toolkit öğesinin üstünde mi (sürüşte fareyle hava denetimi bununla çakışmasın).
    public bool PointerOverUi(Vector2 screenPosition)
    {
      var panel = Root?.panel; if (panel == null) return false;
      var p = RuntimePanelUtils.ScreenToPanel(panel, new Vector2(screenPosition.x, UnityEngine.Screen.height - screenPosition.y));
      var hit = panel.Pick(p); return hit != null && hit.pickingMode == PickingMode.Position && hit != Root;
    }
  }
}
