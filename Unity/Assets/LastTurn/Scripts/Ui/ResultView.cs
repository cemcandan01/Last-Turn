using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // F §9 Yarış sonucu (docs/tasarim/ekranlar-f.html): solda büyük süre/puan, hedefe fark, yıldızlar; sağda sonuç satırları ve kazanç.
  // Sayılar RaceViewModel.Result / DriveMenuModel'den; ödül ve kayıt işi yarış bitişinde (GarageRace) yapılmıştır, burada yalnız okunur.
  // Enter sıradaki kariyer yarışının hazırlığını açar (yoksa yarış menüsü), R tekrar (sürüş girdisi), G garaj, Esc yarış menüsü.
  // Mutant yarışlarının sonucu koşu panelindedir.
  public sealed class ResultView : MonoBehaviour
  {
    public static ResultView Instance { get; private set; }
    public static bool CoversCurrentScreen => Instance && Instance.page != null && Instance.Session() != null;
    public bool Visible { get; private set; }
    public string NextKey { get; private set; } = "";
    public string ValueText => value.text;
    public int StarsShown { get; private set; }

    private VisualElement page, stars, rows, levelFill, levelGain, primary;
    private Label where, value, delta, deltaText, record, header, reward, level, note;
    private GtPrototype driver; private RaceSession shown;

    private RaceSession Session()
    {
      if (!driver && UnityEngine.SceneManagement.SceneManager.GetActiveScene().name != "Garage") driver = FindFirstObjectByType<GtPrototype>();
      var race = driver ? driver.Race : null;
      if (race == null || race.Session.State != RaceState.Finished || MutantRuntime.Active || GameFlow.Paused || SettingsScreen.Open) return null;
      return race.Session;
    }

    private void Start()
    {
      Instance = this;
      page = new VisualElement { name = "f-result" }; page.AddToClassList("katman"); page.AddToClassList("rs-page");
      var left = new VisualElement(); left.AddToClassList("rs-left");
      var head = Ui.Section(""); where = head.Q<Label>(); left.Add(head);
      value = Ui.Text("", "rs-value"); left.Add(value);
      var line = new VisualElement(); line.AddToClassList("rs-line");
      delta = Ui.Text("", "rs-delta"); line.Add(delta); deltaText = Ui.Text("", "g-copy"); line.Add(deltaText);
      record = Ui.Text("YENİ REKOR", "rs-record"); line.Add(record); left.Add(line);
      header = Ui.Text("", "g-copy", "rs-header"); left.Add(header);
      stars = new VisualElement(); stars.AddToClassList("rs-stars"); left.Add(stars);
      page.Add(left);

      var right = new VisualElement(); right.AddToClassList("g-panel"); right.AddToClassList("rs-right");
      right.Add(Ui.Section("SONUÇ")); rows = new VisualElement(); right.Add(rows);
      var sep = new VisualElement(); sep.AddToClassList("rs-sep"); right.Add(sep);
      right.Add(Ui.Section("KAZANÇ")); reward = Ui.Text("", "rs-reward"); right.Add(reward);
      level = Ui.Text("", "g-copy", "soluk"); right.Add(level);
      var bar = new VisualElement(); bar.AddToClassList("rs-bar"); levelFill = new VisualElement(); levelFill.AddToClassList("rs-fill"); levelGain = new VisualElement(); levelGain.AddToClassList("rs-gain");
      bar.Add(levelFill); bar.Add(levelGain); right.Add(bar);
      note = Ui.Text("", "g-copy", "uyari"); note.name = "result-note"; right.Add(note);
      page.Add(right);

      var buttons = new VisualElement(); buttons.AddToClassList("rs-actions");
      var garage = Ui.Button("GARAJ", "G", Garage); garage.name = "result-garage"; buttons.Add(garage);
      var again = Ui.Button("TEKRAR", "R", Again); again.name = "result-again"; buttons.Add(again);
      primary = Ui.Button("", "Enter", Next, primary: true); primary.name = "result-next"; buttons.Add(primary);
      page.Add(buttons);
      page.Add(Ui.Hints(("Esc", "Yarış menüsü")));
      UiRoot.Instance.Screen.Add(page); Ui.Show(page, false);
    }

    private void Update()
    {
      if (page == null) return;
      var s = Session(); bool wasVisible = Visible; Visible = s != null; Ui.Show(page, Visible);
      if (!Visible) { shown = null; return; }
      if (s != shown) { shown = s; Render(s); }
      if (!wasVisible || LevelUpView.Open) return;
      var k = Keyboard.current; if (k == null) return;
      if (k.enterKey.wasPressedThisFrame || k.numpadEnterKey.wasPressedThisFrame) Next();
      else if (k.gKey.wasPressedThisFrame) Garage();
      else if (k.escapeKey.wasPressedThisFrame) { GameAudio.Click(); GameFlow.LeaveDrive(); }
      // R: GtKeyboardInput yarışı zaten yeniden başlatır (bitmiş yarışta da); ikinci kez çağrılmaz.
    }

    private void Render(RaceSession s)
    {
      var garageState = GarageSession.State;
      var r = RaceViewModel.Result(s, garageState != null ? garageState.StarsOf(s.Event.Type, s.Event.Level) : 0, GarageRace.LastPreviousBest, GarageRace.LastNewRecord);
      var h = DriveMenuModel.Headline(s);
      where.text = Ui.Upper(s.Event.Name) + " · " + (h.Passed ? "BİTTİ" : "HEDEF KAÇTI");
      value.text = h.Value + (s.Event.Type == "dp" ? " puan" : "");
      delta.text = h.Delta; deltaText.text = h.DeltaText; Ui.Show(delta, h.Delta != ""); delta.EnableInClassList("kotu", !h.Passed);
      Ui.Show(record, GarageRace.LastNewRecord);
      header.text = r.Header + (driver && driver.Opponent != null ? " · " + driver.OpponentText() : "");
      stars.Clear(); StarsShown = r.Stars;
      for (int i = 0; i < r.StarRows.Count; i++)
      {
        var col = new VisualElement(); col.AddToClassList("rs-star");
        var star = new Star(r.StarRows[i].Earned); star.AddToClassList("rs-star-icon"); col.Add(star);
        col.Add(Ui.Text(r.StarRows[i].Text.Substring(r.StarRows[i].Text.IndexOf(' ') + 1), "g-copy", r.StarRows[i].Earned ? "vurgu" : "soluk"));
        stars.Add(col);
      }
      rows.Clear();
      foreach (var (label, val) in r.Rows) rows.Add(Row(label, val));
      rows.Add(Row("Yıldız", r.BestStars));
      reward.text = "+" + r.Xp.ToString("0") + " XP    +" + r.Money.ToString("N0") + " para";
      CareerMenuModel m = null; if (garageState != null) { GameFlow.Refresh(); m = GameFlow.Menu(); }
      var (fill, gain) = m != null ? DriveMenuModel.LevelBar(m.Level, m.Xp, m.NextLevelXp, r.Xp) : (0, 0);
      level.text = m != null ? "Seviye " + m.Level + "    " + m.Xp.ToString("0") + " / " + m.NextLevelXp.ToString("0") + " XP" : "";
      levelFill.style.width = Length.Percent((float)((fill - gain) * 100)); levelGain.style.width = Length.Percent((float)(gain * 100));
      note.text = string.Join("\n", new[] { s.Career ? GarageSession.Message : "", GarageRace.LastMessage }.Where(t => !string.IsNullOrEmpty(t)));
      var next = s.Career && m != null ? DriveMenuModel.NextCareerEvent(m.Events, DriveMenuModel.CareerKey(s.Event)) : null;
      NextKey = next?.Key ?? "";
      primary.Q<Label>(className: "yazi").text = next != null ? "SIRADAKİ: " + Ui.Upper(next.Name) : "YARIŞ MENÜSÜ";
    }

    private static VisualElement Row(string label, string val)
    {
      var e = new VisualElement(); e.AddToClassList("rs-row"); e.Add(Ui.Text(label, "g-copy", "soluk")); e.Add(Ui.Text(val, "dar", "rs-row-value")); return e;
    }

    public void Next() { GameAudio.Click(); GameFlow.LeaveDrive(2, false, NextKey); }
    public void Garage() { GameAudio.Click(); GameFlow.LeaveDrive(0); }
    public void Again() { GameAudio.Click(); if (driver) driver.RestartRace(); }

    private void OnDestroy() { if (Instance == this) Instance = null; page?.RemoveFromHierarchy(); }
  }
}
