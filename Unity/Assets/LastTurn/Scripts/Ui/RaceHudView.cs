using System.Collections.Generic;
using System.Globalization;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // F yarış HUD'u (panelsiz, docs/tasarim/menu-hud-pc.html → F): sol üst pist adı + ikincil bilgiler, üst orta süre/puan ve
  // hedef satırı, sağ alt hız + vites, ortada geri sayım / bildirim / GERİ DÖN. Konumlar HudLayout dikdörtgenlerinden;
  // veri RaceViewModel.Hud ve aracın anlık hızı. Sonuç ekranı ve drag devir çubuğu şimdilik RaceHud'da.
  public sealed class RaceHudView : MonoBehaviour
  {
    private VisualElement root, left, timer, speedBox, hints;
    private Label title, info, big, sub, speed, gear, unit, countdown, note, back, wrong, hintText;
    private GtPrototype p; private RaceSession seenSession; private int seenNotes; private string lastNote = ""; private float noteUntil;
    public bool Visible { get; private set; }
    /// Doğrulama: son çizilen süre/hız metni.
    public string TimerText => big?.text ?? "";
    public string SpeedText => speed?.text ?? "";

    private void Start()
    {
      root = new VisualElement { pickingMode = PickingMode.Ignore }; root.AddToClassList("katman");
      left = Box(); title = Ui.Text("", "hud-baslik"); info = Ui.Text("", "hud-bilgi"); left.Add(title); left.Add(info);
      timer = Box(); big = Ui.Text("", "hud-sure"); sub = Ui.Text("", "hud-alt"); timer.Add(big); timer.Add(sub);
      speedBox = Box(); var row = new VisualElement { pickingMode = PickingMode.Ignore }; row.AddToClassList("hud-hiz");
      speed = Ui.Text("0", "hud-hiz-deger"); gear = Ui.Text("1", "hud-vites"); row.Add(speed); row.Add(gear);
      unit = Ui.Text("KM/SA", "hud-birim"); speedBox.Add(row); speedBox.Add(unit);
      countdown = Center(140, .30f); note = Center(48, .38f); back = Center(40, .5f); wrong = Center(56, .2f); wrong.text = "GERİ DÖN"; wrong.AddToClassList("uyari");
      hints = Box(); hintText = Ui.Text("", "hud-ipucu"); hints.Add(hintText);
      foreach (var e in new VisualElement[] { left, timer, speedBox, hints }) root.Add(e);
      UiRoot.Instance.Hud.Add(root);
    }

    private static VisualElement Box() { var e = new VisualElement { pickingMode = PickingMode.Ignore }; e.style.position = Position.Absolute; return e; }
    private Label Center(float size, float y)
    {
      var l = Ui.Text("", "hud-orta"); l.style.fontSize = size; l.style.top = Length.Percent(y * 100); l.style.translate = new Translate(0, Length.Percent(-50)); root.Add(l); return l;
    }

    private void Place(VisualElement e, Dictionary<string, HudRect> r, string key, float k)
    {
      bool on = r.TryGetValue(key, out var h); Ui.Show(e, on); if (!on) return;
      e.style.left = (float)h.X * k; e.style.top = (float)h.Y * k; e.style.width = (float)h.W * k; e.style.minHeight = (float)h.H * k;
    }

    private void Update()
    {
      if (root == null) return;
      if (!p) p = FindFirstObjectByType<GtPrototype>();
      var race = p ? p.Race : null;
      bool world=MutantRuntime.Active&&!MutantRuntime.Blocked&&race==null&&p&&p.Simulation!=null&&!SettingsScreen.Open;
      if(world){Ui.Show(root,true);Visible=true;foreach(var e in new VisualElement[]{left,timer,hints,countdown,note,back,wrong})Ui.Show(e,false);Place(speedBox,Hud.Rects(p),"Speed",UiRoot.Instance.PixelToPanel);DrawSpeed();return;}
      Visible = race != null && p.Simulation != null && race.Session.State != RaceState.Finished && !GameFlow.Paused && !SettingsScreen.Open && MutantRuntime.Panel == "";
      Ui.Show(root, Visible); if (!Visible) return;
      foreach(var e in new VisualElement[]{countdown,note,back})Ui.Show(e,true);
      var s = race.Session;
      if (s != seenSession) { seenSession = s; seenNotes = 0; lastNote = ""; }
      for (; seenNotes < s.Notes.Count; seenNotes++) { lastNote = s.Notes[seenNotes].Text; noteUntil = Time.unscaledTime + 1.6f; }
      if (Time.unscaledTime > noteUntil) lastNote = "";
      var m = RaceViewModel.Hud(s, race.World.Hint, lastNote);
      var r = Hud.Rects(p); float k = UiRoot.Instance.PixelToPanel;
      // dokunmatik düzende (Title/Timer/Speed yok) eski yarış paneli alanı kullanılır
      if (r.ContainsKey("Title")) Place(left, r, "Title", k); else Place(left, r, "RacePanel", k);
      if (r.ContainsKey("Timer")) Place(timer, r, "Timer", k); else { Ui.Show(timer, true); timer.style.left = Length.Percent(35); timer.style.width = Length.Percent(30); timer.style.top = 12; }
      Place(speedBox, r, "Speed", k); Place(hints, r, "Hint", k);
      title.text = Ui.Upper(s.Event.Name);
      var lines = new List<string>();
      if (m.Drift != "" || m.X6 != "") lines.Add((m.Drift + "   " + m.X6).Trim());
      if (!string.IsNullOrEmpty(p.RaceMessage)) lines.Add(p.RaceMessage);
      if (!string.IsNullOrEmpty(p.RecordText)) lines.Add(p.RecordText);
      // TS hud.ts: güneş dışında hava adı gösterilir (zemin daha kaygan)
      if (p.Conditions.Weather != "sun" || p.Conditions.Night) lines.Add(p.Conditions.Label);
      if (p.Opponent != null) lines.Add(p.OpponentText());
      info.text = string.Join("\n", lines);
      big.text = m.Big; sub.text = m.Sub;
      DrawSpeed();
      countdown.text = m.Countdown; note.text = m.Note; back.text = m.Return; Ui.Show(wrong, m.WrongWay);
      // masaüstü ipucu: yalnız ilk saniyelerde
      bool hint = s.State == RaceState.Countdown || s.Time < 6;
      hintText.text = hint ? "W/S gaz–fren · A/D direksiyon · Boşluk el freni · T piste dön · R yeniden başlat · V kamera · Esc duraklat"
        + (p.Simulation.Parameters.ManualGearbox ? " · E/Q vites" : "") + (MutantRuntime.Active ? " · N nitro · 1/2/3 skill" : "") : "";
    }
    private void DrawSpeed(){var b=p.Simulation.Body;var engine=p.Simulation.Engine;speed.text=(b.Velocity.Length*3.6).ToString("0",CultureInfo.InvariantCulture);gear.text=engine.Gear<0?"R":engine.Gear==0?"N":engine.Gear.ToString(CultureInfo.InvariantCulture);}
  }
}
