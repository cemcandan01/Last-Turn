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
      ("YARIŞ", "Pist seç, garaja gir veya araç satın al."), ("MUTANT", "Aracını koşu boyunca güçlendir ve boss’u yen."), ("PROFİL", ""), ("AYARLAR", ""),
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
    private Label milestoneText;
    private Label mutantHelp,cupTable;private VisualElement cupPanel;
    private VisualElement careerMap; private Label careerName,careerTarget,careerNote;private VisualElement careerGo;private ScrollView careerScroll;

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
      race.name="pit-career"; mutant.name="pit-mutant-menu"; mutant.AddToClassList("pit-mutant"); confirm.AddToClassList("pit-mutant");
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
      home.name="pit-home"; home.AddToClassList("pit-home");
      var header=Row(); header.AddToClassList("pit-home-header"); header.Add(Ui.Logo());
      var spacer=new VisualElement{pickingMode=PickingMode.Ignore}; spacer.style.flexGrow=1; header.Add(spacer);
      var badge=new ProfileBadge(); var pill=Row(); pill.AddToClassList("pit-driver");
      badge.Level=Ui.Text("1","pit-level"); pill.Add(badge.Level);
      var info=new VisualElement{pickingMode=PickingMode.Ignore};
      badge.Name=Ui.Text("","pit-driver-name"); badge.Line=Ui.Text("","pit-driver-line");
      info.Add(badge.Name);info.Add(badge.Line);pill.Add(info);header.Add(pill);badges[0]=badge;home.Add(header);

      var body=Row(); body.AddToClassList("pit-home-body");body.style.alignItems=Align.Stretch;
      var index=new VisualElement();index.AddToClassList("pit-index");
      for(int i=0;i<HomeItems.Length;i++)
      {
        int n=i;var tile=Row();tile.AddToClassList("pit-home-link");if(i>1)tile.AddToClassList("pit-utility-link");
        tile.name="pit-home-link-"+i;
        var copy=new VisualElement{pickingMode=PickingMode.Ignore};copy.style.flexGrow=1;
        copy.Add(Ui.Text(HomeItems[i].Name,"pit-index-title"));
        if(HomeItems[i].Sub.Length>0)copy.Add(Ui.Text(HomeItems[i].Sub,"pit-index-sub"));
        tile.Add(copy);
        Ui.Bind(tile,()=>OpenHome(n));tile.RegisterCallback<FocusInEvent>(_=>FocusHome(n));homeTiles[i]=tile;index.Add(tile);
      }
      var workshop=Ui.Button("GÖRSEL MODİFİYE","",GameFlow.OpenVisualWorkshop,true);
      workshop.name="home-visual-workshop";workshop.style.marginTop=18;index.Add(workshop);
      var milestone=new VisualElement();milestone.style.marginTop=20;
      milestone.Add(Ui.Section("KARİYER HEDEFİN"));milestoneText=Ui.Text("","g-copy");milestone.Add(milestoneText);
      var goalButton=Ui.Button("HEDEFE GİT","",()=>{
        var key=CareerMilestones.NextEvent(GarageSession.State,GameFlow.Menu().Events);
        if(key!="")GameFlow.OpenRace(key);else GameFlow.RaceMenu();
      },small:true);goalButton.name="career-goal";milestone.Add(goalButton);index.Add(milestone);
      body.Add(index);
      var poster=new VisualElement{pickingMode=PickingMode.Ignore,name="pit-home-poster"};poster.AddToClassList("pit-poster");
      poster.style.backgroundImage=Resources.Load<Texture2D>("UI/Pit/menu-night");
      body.Add(poster);home.Add(body);

      var extra=Row();extra.AddToClassList("pit-home-tools");
      var tools=Row();tools.name="home-session-actions";
      var switcher=Ui.Button("KAYIT VE ÇIKIŞ","",()=>Ui.Show(tools,tools.ClassListContains("gizli")),small:true);
      switcher.name="home-session-menu";extra.Add(switcher);extra.Add(tools);Ui.Show(tools,false);
      tools.Add(Ui.Button("KAYDET","",()=>GarageSession.Save(),small:true));
      tools.Add(Ui.Button("YENİDEN YÜKLE","",()=>GarageSession.Reload(),small:true));
      if(Application.isEditor||Debug.isDebugBuild)tools.Add(Ui.Button("GELİŞTİRİCİ","",()=>{GameFlow.MainMenu();GameFlow.Browse(3);},small:true));
      tools.Add(Ui.Button("ÇIKIŞ","",()=>{if(GarageSession.Save())Application.Quit();},small:true));home.Add(extra);
      status=Ui.Text("","durum");status.AddToClassList("pit-home-status");home.Add(status);
      home.Add(Ui.Hints(("↑|↓","Seç"),("Enter","Aç")));
    }

    private void FocusHome(int n)
    {
      homeFocus=n;for(int i=0;i<homeTiles.Length;i++)homeTiles[i].EnableInClassList("sec",i==n);
      if(homeTiles[n].panel!=null&&homeTiles[n].panel.focusController.focusedElement!=homeTiles[n])homeTiles[n].Focus();
    }

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
      var bar=Row();bar.AddToClassList("ustbar");bar.Add(Ui.Logo());
      var tabs=Row();tabs.AddToClassList("sekmeler");tabs.Add(Ui.Key("Q"));
      for(int i=0;i<RaceTabs.Length;i++){int n=i;var tab=Ui.Tab(RaceTabs[i],()=>OpenRaceTab(n));if(i==0)tab.AddToClassList("sec");tabs.Add(tab);}tabs.Add(Ui.Key("E"));bar.Add(tabs);
      var cupButton=Ui.Button("RAKİPLER KUPASI","",ToggleCup,small:true);
      cupButton.name="championship-menu";bar.Add(cupButton);
      var mini=Row();mini.AddToClassList("mini");var badge=new ProfileBadge();var level=new VisualElement();level.AddToClassList("sv");badge.Level=Ui.Text("1");level.Add(badge.Level);mini.Add(level);badge.Line=Ui.Text("");mini.Add(badge.Line);moneyLabel=Ui.Text("");mini.Add(moneyLabel);badges[1]=badge;
      mini.Add(Ui.Button("ANA MENÜ","Esc",GameFlow.MainMenu,small:true));bar.Add(mini);race.Add(bar);
      var head=new VisualElement();head.AddToClassList("pit-career-head");title=Ui.Text("","baslik");head.Add(title);
      var types=Row();types.AddToClassList("parcali");
      for(int i=0;i<TestPanelModel.Types.Length;i++){int n=i;var button=new VisualElement();button.AddToClassList("parca");button.Add(Ui.Text(Ui.Upper(TestPanelModel.TypeNames[i])));Ui.Bind(button,()=>SelectType(n));typeButtons[i]=button;types.Add(button);}head.Add(types);race.Add(head);
      careerScroll=new ScrollView(ScrollViewMode.Vertical){horizontalScrollerVisibility=ScrollerVisibility.Hidden};careerScroll.name="pit-career-scroll";careerScroll.AddToClassList("pit-career-scroll");
      cards=new VisualElement();cards.AddToClassList("pit-career-list");careerScroll.Add(cards);race.Add(careerScroll);
      var detail=new VisualElement();detail.name="pit-career-detail";detail.AddToClassList("pit-career-detail");careerMap=new VisualElement{pickingMode=PickingMode.Ignore};careerMap.AddToClassList("pit-career-map");detail.Add(careerMap);
      careerName=Ui.Text("","baslik","pit-career-name");detail.Add(careerName);careerTarget=Ui.Text("","g-class");detail.Add(careerTarget);careerNote=Ui.Text("","g-copy");detail.Add(careerNote);
      careerGo=Ui.Button("YARIŞA HAZIRLAN","Enter",Open,true);careerGo.name="pit-career-prepare";detail.Add(careerGo);race.Add(detail);
      cupPanel=new VisualElement{name="championship-panel"};cupPanel.AddToClassList("g-panel");
      Ui.Absolute(cupPanel,left:58,right:58,top:135,bottom:95);cupPanel.style.backgroundColor=new Color(.12f,.16f,.17f,1);
      cupPanel.Add(Ui.Text("RAKİPLER KUPASI","baslik"));
      cupPanel.Add(Ui.Text("Üç asfalt yarışı. Doruk, Ece ve Bora’ya karşı 10 / 6 / 3 / 1 puan. Eşit puanda galibiyet sayısı, sonra son yarış belirler. Kazanan altın arma kazanır.","g-copy"));
      cupTable=Ui.Text("","g-copy");cupTable.style.whiteSpace=WhiteSpace.Normal;cupTable.style.marginTop=20;cupTable.style.fontSize=28;cupPanel.Add(cupTable);
      var cupGo=Ui.Button("KUPAYA GİR / DEVAM ET","",()=>{if(!ChampionshipSession.Start())cupTable.text=ChampionshipSession.Message+"\n"+GarageSession.Message;},true);
      cupGo.name="championship-start";cupGo.style.maxWidth=600;cupPanel.Add(cupGo);
      var prize=Ui.Button("ALTIN ARMAYI UYGULA","",()=>{ChampionshipSession.ApplyPrize();cupTable.text=GarageSession.Message;},small:true);prize.name="championship-prize";prize.style.maxWidth=600;cupPanel.Add(prize);
      cupPanel.Add(Ui.Button("KAPAT","",()=>Ui.Show(cupPanel,false),small:true));race.Add(cupPanel);Ui.Show(cupPanel,false);
      raceStatus=Ui.Text("","durum");Ui.Absolute(raceStatus,left:58,bottom:30);raceStatus.style.maxWidth=800;race.Add(raceStatus);
      race.Add(Ui.Hints(("↑|↓","Tür"),("←|→","Pist")));
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
      mutant.style.backgroundImage=Resources.Load<Texture2D>("UI/MutantB/background");
      var tone = Panel(); tone.AddToClassList("mut-ton"); mutant.Add(tone);
      mutant.Add(Ui.Shade(.75f, .85f));
      var bar = new VisualElement(); bar.AddToClassList("ustbar"); bar.pickingMode = PickingMode.Ignore; bar.Add(Ui.Logo());
      var right = new VisualElement { pickingMode = PickingMode.Ignore }; right.AddToClassList("mini"); right.Add(Ui.Button("ANA MENÜ", "Esc", GameFlow.MainMenu, small: true)); bar.Add(right);
      mutant.Add(bar);
      var left = new VisualElement { pickingMode = PickingMode.Ignore }; Ui.Absolute(left, left: 58, top: 210); left.style.width = 660;
      var name = Ui.Text("MUTANT", "baslik"); name.style.fontSize = 112; name.style.marginTop = 8; left.Add(name);
      var about = Ui.Text("Etkinlik kazan, aracını güçlendir ve süre dolmadan bölgenin boss’una meydan oku.", "durum", "golge");
      about.style.fontSize = 22; about.style.marginTop = 10; left.Add(about);
      var buttons = new VisualElement { pickingMode = PickingMode.Ignore }; buttons.style.width = 470; buttons.style.marginTop = 40;
      var start = Ui.Button("KOŞUYA BAŞLA", "Enter", AskStart, primary: true); start.style.height = 74; start.style.justifyContent = Justify.SpaceBetween; buttons.Add(start);
      var help=Ui.Button("NASIL OYNANIR","H",ToggleMutantHelp);help.style.marginTop=14;buttons.Add(help);
      left.Add(buttons); mutant.Add(left);
      mutantHelp=Ui.Text("1. Üç araçtan birini, sonra bir pasif yeteneği seç.\n2. Sürüşte etkinlik, atölye ve sandık işaretlerini kullan.\n3. İlk boss için "+Clock(MutantRun.FirstBossSeconds)+" süren var. Koşuda kazandıkların bu koşuda kullanılır.","g-copy");mutantHelp.style.marginTop=18;left.Add(mutantHelp);Ui.Show(mutantHelp,false);
      var best = Card(58, 210, 500); best.Add(Ui.Section("EN İYİ KOŞU"));
      mutantBest = Ui.Text("", "baslik"); mutantBest.style.fontSize = 42; mutantBest.style.marginTop = 8; best.Add(mutantBest); mutant.Add(best);

    }

    private static string Clock(double s) => ((int)s / 60).ToString("0") + ":" + ((int)s % 60).ToString("00");

    private void BuildConfirm()
    {
      confirm.name="f-mutant-confirm";
      confirm.AddToClassList("perde"); confirm.pickingMode = PickingMode.Position;
      var box = new VisualElement(); box.AddToClassList("cam"); box.AddToClassList("onay");
      box.Add(Ui.Section("MUTANT"));
      var t = Ui.Text("YENİ KOŞU BAŞLASIN MI?", "baslik"); t.style.fontSize = 54; t.style.marginTop = 10; box.Add(t);
      var d = Ui.Text("Önce aracını ve yeteneğini seç. Geri sayım piste çıktığında başlar.", "durum");
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
      // Sonuç ekranında "Sıradaki": yarış menüsünden o pistin hazırlığına geçilir.
      if (GameFlow.NextRace != "") { var next = GameFlow.NextRace; GameFlow.NextRace = ""; GameFlow.OpenRace(next); return; }
      CareerMenuModel m; try { m = GameFlow.Menu(); } catch (Exception e) { status.text = "Menü okunamadı: " + e.Message; return; }
      var milestoneGoal=CareerMilestones.Next(GarageSession.State);milestoneText.text=milestoneGoal.Name+" · "+milestoneGoal.Progress+" / "+milestoneGoal.Target+"\nÖdül · "+milestoneGoal.Reward+(milestoneGoal.Unlocked?" · AÇILDI":"");
      foreach (var b in badges) b.Set(m);
      moneyLabel.text = m.Money.ToString("N0") + " para";
      string msg = GameFlow.Message != "" ? GameFlow.Message : GarageSession.Message ?? ""; status.text = msg; raceStatus.text = msg;
      if(Showing==GameFlow.MenuHub.Race && cupPanel!=null && !cupPanel.ClassListContains("gizli")){
        cupTable.text=ChampionshipSession.Table()+"\n"+ChampionshipSession.Message+"\n"+(GarageSession.State.Championship.Complete?"Rövanş için kupaya yeniden gir.":"Başladığın araçla devam et. Garajda geliştirebilirsin.");
        cupPanel.Q("championship-prize").SetEnabled(GarageSession.State.Championship.Unlocked);
      }
      if (Showing == GameFlow.MenuHub.Race && (m != shown || type != shownType)) Rebuild(m);
      if (Showing == GameFlow.MenuHub.Mutant) { var r = MutantRuntime.Record(); mutantBest.text = r.Region > 0 ? "Bölge " + r.Region + " · " + r.Bosses + " boss" : "Henüz koşu yok"; }
      if (Showing == GameFlow.MenuHub.Home && !homeTiles[homeFocus].ClassListContains("sec")) FocusHome(homeFocus);
      if(wasVisible&&!LevelUpView.Open)Keys(Keyboard.current);
    }

    private void Keys(Keyboard k)
    {
      if (k == null) return;
      if(Showing==GameFlow.MenuHub.Race && cupPanel!=null && !cupPanel.ClassListContains("gizli")){
        if(k.escapeKey.wasPressedThisFrame){Ui.Show(cupPanel,false);return;}
        if(Ui.ActivateFocused(k))return;
        if(k.enterKey.wasPressedThisFrame)ChampionshipSession.Start();
        return;
      }
      if(!ConfirmOpen&&Ui.ActivateFocused(k))return;
      bool enter = k.enterKey.wasPressedThisFrame || k.numpadEnterKey.wasPressedThisFrame, esc = k.escapeKey.wasPressedThisFrame;
      switch (Showing)
      {
        case GameFlow.MenuHub.Home:
          if (k.leftArrowKey.wasPressedThisFrame || k.upArrowKey.wasPressedThisFrame) { FocusHome((homeFocus + HomeItems.Length - 1) % HomeItems.Length); GameAudio.Click(); }
          else if (k.rightArrowKey.wasPressedThisFrame || k.downArrowKey.wasPressedThisFrame) { FocusHome((homeFocus + 1) % HomeItems.Length); GameAudio.Click(); }
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

    private void ToggleCup()
    {
      bool open=cupPanel.ClassListContains("gizli");Ui.Show(cupPanel,open);
      if(open)cupPanel.Q("championship-start").Focus();
    }
    private void SelectType(int n) { type = n; GameAudio.Click(); }

    private void Rebuild(CareerMenuModel m)
    {
      bool typeChanged = type != shownType; shown = m; shownType = type;
      for (int i = 0; i < typeButtons.Length; i++) typeButtons[i].EnableInClassList("sec", i == type);
      title.text = "Pist seç";
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
        var c = new VisualElement(); c.AddToClassList("kart");c.name="pit-career-track-"+i;c.focusable=true;c.tabIndex=0;
        if (!r.Open) c.AddToClassList("kilit");
        string state = !r.Open ? "KİLİTLİ" : !r.Career ? "ÖDÜLSÜZ DENEME" : i == next ? "SIRADAKİ" : r.BestStars == 3 ? "TAMAM" : "AÇIK";
        c.Add(Ui.Text(state, "ust"));
        c.Add(Ui.Text(r.Name, "ad"));
        var bottom = new VisualElement { pickingMode = PickingMode.Ignore }; bottom.AddToClassList("alt");
        var stars = new VisualElement { pickingMode = PickingMode.Ignore }; stars.AddToClassList("yildizlar"); for (int s = 0; s < 3; s++) stars.Add(new Star(s < r.BestStars));
        bottom.Add(stars); c.Add(bottom);
        c.AddManipulator(new Clickable(()=>Select(n)));c.RegisterCallback<FocusInEvent>(_=>{if(selected!=n)Select(n);});
        cards.Add(c);
      }
      Mark();
    }

    private void Select(int n) { if (rows.Length == 0) return; selected = Mathf.Clamp(n, 0, rows.Length - 1); Mark(); GameAudio.Click(); }
    private void Mark()
    {
      int i=0;foreach(var c in cards.Children()){c.EnableInClassList("sec",i==selected);if(i++==selected)careerScroll.schedule.Execute(()=>careerScroll.ScrollTo(c));}
      if(selected<0||selected>=rows.Length)return;var row=rows[selected];careerName.text=Ui.Upper(row.Name);careerTarget.text="HEDEF / "+row.Target;
      careerNote.text=!row.Open?"Bu pisti açmak için önceki etkinliklerde ilerle.":!row.Career?"Aracın puan sınırını aşıyor. Bu pistte ödülsüz yarışabilirsin.":"En iyi sonuç  ·  "+row.BestStars+" / 3 yıldız";careerGo.SetEnabled(row.Open);
      var data=RaceData.Load();var info=data.Event(row.Key);var model=RacePreparationModel.Read(GarageSession.State,GarageRace.ProfileStore().Load(),data.Events,data.Tracks.Find(info.Type,info.Level),row.Key);
      careerMap.Clear();var map=new RacePreparationView.TrackMap(model);map.style.flexGrow=1;careerMap.Add(map);
    }

    /// Kart: bugünkü kariyer ekranına aynı pist seçili gider (hava/saat ve başlat orada).
    private void Open() { if (SelectedKey == "" || !rows[selected].Open) return; GameAudio.Click(); GameFlow.OpenRace(SelectedKey); }
  }
}
