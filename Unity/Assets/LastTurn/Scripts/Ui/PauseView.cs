using System;
using System.Collections.Generic;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // F §8 Duraklatma (docs/tasarim/ekranlar-f.html): solda işlemler, sağda yarışın anlık durumu ve hızlı ayar (sürüş yardımı, kamera).
  // İşlemler eski IMGUI duraklatmasıyla aynı komutlar; Esc'i duraklatmayı açan MainMenuScreen/MutantScreen çevirir (burada işlenmez).
  // Mutant koşusunda Devam / Ayarlar / Koşudan çık ve koşu durumu gösterilir.
  public sealed class PauseView : MonoBehaviour
  {
    public static PauseView Instance { get; private set; }
    public static bool CoversCurrentScreen => Instance && Instance.page != null && Instance.Wanted();
    public bool Visible { get; private set; }
    public bool Mutant { get; private set; }
    public int Focus { get; private set; }
    public int ItemCount => items.Count;
    public string FocusedName => Focus < items.Count ? items[Focus].Name : "";

    private VisualElement page, actions, stats, quick, raceHints, mutantHints;
    private Label where, sub, statsTitle;
    private readonly List<(string Name, VisualElement Element, Action Run)> items = new List<(string, VisualElement, Action)>();
    private GtPrototype driver;

    private bool Wanted()
    {
      if (SceneManager.GetActiveScene().name == "Garage" || !GameFlow.Paused || SettingsScreen.Open) return false;
      if (MutantRuntime.Active) return !MutantStartView.CoversCurrentScreen;
      return true;
    }

    private void Start()
    {
      Instance = this;
      page = new VisualElement { name = "f-pause" }; page.AddToClassList("katman"); page.AddToClassList("pz-page");
      var left = new VisualElement(); left.AddToClassList("pz-left");
      where = Ui.Text("", "pz-where"); var head = Ui.Section(""); head.Clear(); var line = new VisualElement(); line.AddToClassList("cizgi"); head.Add(line); head.Add(where); left.Add(head);
      left.Add(Ui.Text("DURAKLATILDI", "baslik", "pz-title"));
      sub = Ui.Text("", "g-copy"); left.Add(sub);
      actions = new VisualElement(); actions.AddToClassList("pz-actions"); left.Add(actions);
      page.Add(left);

      var right = new VisualElement(); right.AddToClassList("g-panel"); right.AddToClassList("pz-right");
      var st = Ui.Section(""); statsTitle = st.Q<Label>(); right.Add(st);
      stats = new VisualElement(); stats.AddToClassList("pz-stats"); right.Add(stats);
      quick = new VisualElement(); quick.AddToClassList("pz-quick"); right.Add(quick);
      page.Add(right);

      raceHints = Ui.Hints(("↑|↓", "Seç"), ("Enter", "Onayla"), ("R", "Yeniden başlat"), ("Esc", "Devam")); page.Add(raceHints);
      mutantHints = Ui.Hints(("↑|↓", "Seç"), ("Enter", "Onayla"), ("Esc", "Devam")); page.Add(mutantHints);
      UiRoot.Instance.Screen.Add(page); Ui.Show(page, false);
    }

    private void Update()
    {
      if (page == null) return;
      bool wasVisible = Visible; Visible = Wanted(); Ui.Show(page, Visible);
      if (!Visible) return;
      if (!wasVisible || Mutant != MutantRuntime.Active) { Mutant = MutantRuntime.Active; driver = FindFirstObjectByType<GtPrototype>(); shown = ""; Build(); }
      Refresh();
      if (wasVisible) Keys(Keyboard.current);
    }

    private void Keys(Keyboard k)
    {
      if (k == null || items.Count == 0) return;
      if (k.upArrowKey.wasPressedThisFrame) { GameAudio.Click(); SetFocus((Focus + items.Count - 1) % items.Count); }
      else if (k.downArrowKey.wasPressedThisFrame) { GameAudio.Click(); SetFocus((Focus + 1) % items.Count); }
      else if (k.enterKey.wasPressedThisFrame || k.numpadEnterKey.wasPressedThisFrame) Run(Focus);
      // R: sürüş girdisi yeniden başlatmayı zaten kuyruğa aldı (GtKeyboardInput); burada yalnız devam edilir, yarış iki kez başlamaz.
      else if (k.rKey.wasPressedThisFrame && !Mutant) GameFlow.Pause(false);
    }

    public void Run(int index) { if (index < 0 || index >= items.Count) return; GameAudio.Click(); SetFocus(index); items[index].Run(); }
    public void Run(string name) => Run(items.FindIndex(i => i.Name == name));

    private void Build()
    {
      actions.Clear(); items.Clear(); Focus = 0;
      Add("pause-continue", "DEVAM ET", "Esc", () => GameFlow.Pause(false));
      if (!Mutant)
      {
        Add("pause-restart", "YENİDEN BAŞLAT", "R", () => { if (driver) { if (driver.Race != null) driver.RestartRace(); else driver.ResetVehicle(); } GameFlow.Pause(false); });
        Add("pause-settings", "AYARLAR", "", OpenSettings);
        Add("pause-career", "KARİYERE DÖN", "", () => GameFlow.LeaveDrive());
        Add("pause-garage", "GARAJA DÖN", "", () => GameFlow.LeaveDrive(0));
        Add("pause-home", "ANA MENÜYE DÖN", "", () => GameFlow.LeaveDrive(0, true));
      }
      else
      {
        Add("pause-settings", "AYARLAR", "", OpenSettings);
        Add("pause-exit-run", "KOŞUDAN ÇIK", "", MutantRuntime.Exit);
      }
      page.EnableInClassList("mut-ton", Mutant); Ui.Show(raceHints, !Mutant); Ui.Show(mutantHints, Mutant);
      SetFocus(0); BuildQuick();
    }

    private static void OpenSettings() { GameFlow.Pause(false); SettingsScreen.Show(); }

    private void Add(string name, string text, string key, Action run)
    {
      int index = items.Count; var b = Ui.Button(text, key, () => Run(index), primary: index == 0); b.name = name; b.AddToClassList("pz-action");
      b.RegisterCallback<PointerEnterEvent>(_ => SetFocus(index));
      actions.Add(b); items.Add((name, b, run));
    }

    private void SetFocus(int index)
    {
      Focus = index;
      for (int i = 0; i < items.Count; i++) items[i].Element.EnableInClassList("sec", i == Focus);
    }

    private string shown = "";
    private void Refresh()
    {
      var rows = new List<(string, string)>(); string head, line, title;
      if (Mutant)
      {
        var m = MutantRuntime.Model; head = "MUTANT · BÖLGE " + m.Region; line = m.BossName + " · " + m.CarName + " · Seviye " + m.Level; title = "KOŞU";
        rows.Add(("Boss'a", m.Timer)); rows.Add(("Gövde", m.Body.ToString("0"))); rows.Add(("Para", m.Money.ToString("0")));
      }
      else
      {
        var race = driver ? driver.Race : null;
        if (race == null) { head = "SERBEST SÜRÜŞ"; line = "Sürüş durdu."; title = "SÜRÜŞ"; }
        else
        {
          var s = race.Session; head = Ui.Upper(s.Event.Name) + " · " + DriveMenuModel.PauseProgress(s, race.World.Hint).ToUpperInvariant();
          line = "Yarış süresi ve sürüş durdu."; title = "YARIŞ"; rows.AddRange(DriveMenuModel.PauseStats(s, race.World.Hint));
        }
      }
      string sig = head + line + title + string.Join("|", rows); if (sig == shown) return; shown = sig;
      where.text = head; sub.text = line; statsTitle.text = title; stats.Clear();
      foreach (var (label, value) in rows) Stat(label, value);
    }

    private void Stat(string label, string value)
    {
      var c = new VisualElement(); c.AddToClassList("pz-stat"); c.Add(Ui.Text(label, "g-copy", "soluk")); c.Add(Ui.Text(value, "dar", "pz-value")); stats.Add(c);
    }

    // Hızlı ayar: Ayarlar ekranının sürüş yardımı ve kamera satırları (aynı görünüm modeli); değişiklik hemen kaydedilir.
    private void BuildQuick()
    {
      quick.Clear(); if (Mutant) return;
      quick.Add(Ui.Section("HIZLI AYAR"));
      foreach (var (section, key) in new[] { (0, "assist"), (1, "cam") })
      {
        var row = SettingsViewModel.Rows(section, PlayerPreferences.Current, GarageSession.State, false, false).Find(r => r.Key == key);
        if (row == null) continue;
        quick.Add(Ui.Text(row.Name, "g-copy"));
        var seg = new VisualElement(); seg.AddToClassList("parcali");
        for (int j = 0; j < row.Choices.Length; j++)
        {
          int c = j; var p = new VisualElement { name = "pause-" + key + "-" + j }; p.AddToClassList("parca"); if (j > 0) p.AddToClassList("ayir"); if (j == row.Selected) p.AddToClassList("sec");
          p.Add(Ui.Text(Ui.Upper(row.Choices[j])));
          p.AddManipulator(new Clickable(() =>
          {
            GameAudio.Click(); var cmd = SettingsViewModel.Choose(row, c, PlayerPreferences.Current, GarageSession.State);
            if (cmd != null) GarageSession.Execute(cmd); else PlayerPreferences.Save();
            BuildQuick();
          }));
          seg.Add(p);
        }
        quick.Add(seg);
      }
    }

    private void OnDestroy() { if (Instance == this) Instance = null; page?.RemoveFromHierarchy(); }
  }
}
