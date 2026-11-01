using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.Prototype
{
  // Geçici geliştirici HUD'ı (nihai tasarım değil): yalnız RaceViewModel satırlarını çizer; kural/ödül/kayıt yok.
  public sealed class RaceHud : MonoBehaviour
  {
    private GtPrototype prototype;
    private GUIStyle big, text, center, title;
    private string note = ""; private float noteUntil; private int seenNotes;
    private RaceSession seenSession;

    private void Awake() { prototype = GetComponent<GtPrototype>(); }

    private void Update()
    {
      var race = prototype ? prototype.Race : null; if (race == null) return;
      var s = race.Session;
      if (s != seenSession) { seenSession = s; seenNotes = 0; note = ""; }
      for (; seenNotes < s.Notes.Count; seenNotes++) { note = s.Notes[seenNotes].Text; noteUntil = Time.unscaledTime + 1.6f; }
      if (Time.unscaledTime > noteUntil) note = "";
    }

    private void OnGUI()
    {
      var race = prototype ? prototype.Race : null; if (race == null || GameFlow.Paused) return;
      if (big == null)
      {
        big = new GUIStyle(GUI.skin.label) { fontSize = 30, fontStyle = FontStyle.Bold };
        text = new GUIStyle(GUI.skin.label) { fontSize = 16, wordWrap = true };
        title = new GUIStyle(text) { fontStyle = FontStyle.Bold };
        center = new GUIStyle(big) { alignment = TextAnchor.MiddleCenter, fontSize = 54 };
      }
      var s = race.Session; var m = RaceViewModel.Hud(s, race.World.Hint, note);
      GUILayout.BeginArea(new Rect(12, 12, 460, 176), GUI.skin.box);
      GUILayout.Label(m.Title, title); GUILayout.Label(m.Big, big); GUILayout.Label(m.Sub, text);
      if (m.Drift != "" || m.X6 != "") GUILayout.Label(m.Drift + "   " + m.X6, text);
      GUILayout.Label(prototype.RaceMessage, text);
      GUILayout.Label(prototype.RecordText, text);
      GUILayout.EndArea();
      float w = Screen.width, h = Screen.height;
      if (m.Countdown != "") GUI.Label(new Rect(0, h * .3f, w, 80), m.Countdown, center);
      if (m.Note != "") GUI.Label(new Rect(0, h * .3f + (m.Countdown != "" ? 80 : 0), w, 80), m.Note, center);
      if (m.Return != "") GUI.Label(new Rect(0, h * .5f, w, 60), m.Return, center);
      if (m.WrongWay) GUI.Label(new Rect(0, h * .2f, w, 60), "GERİ DÖN", center);
      GUI.Label(new Rect(12, h - 34, w - 24, 26), "W/S gaz-fren · A/D direksiyon · Boşluk el freni · R yeniden başlat", text);
      // TS ↺ yeniden doğ: pist dışı ilk çıkışa ya da en yakın pist noktasına; süre durmaz.
      if (s.State == RaceState.Running && GUI.Button(new Rect(w - 152, 12, 140, 40), "Piste dön")) prototype.RespawnRace();
      // Drag manuel: devir göstergesi, vites, kalkış bandı ve uyarı (otomatik vites yok).
      var d = DragViewModel.Hud(race.Vehicle, s);
      if (d.Manual)
      {
        var bar = new Rect(w / 2f - 220, h - 96, 440, 26); GUI.Box(bar, GUIContent.none);
        float F(double rpm) => bar.x + bar.width * Mathf.Clamp01((float)(rpm / (d.MaxRpm * PowertrainParameters.RevLimit)));
        var old = GUI.color;
        if (s.State == RaceState.Countdown) { GUI.color = new Color(.2f, .8f, .3f, .5f); GUI.DrawTexture(new Rect(F(d.LaunchLow), bar.y, F(d.LaunchHigh) - F(d.LaunchLow), bar.height), Texture2D.whiteTexture); }
        GUI.color = new Color(.95f, .75f, .1f, .5f); GUI.DrawTexture(new Rect(F(d.ShiftRpm), bar.y, F(d.MaxRpm) - F(d.ShiftRpm), bar.height), Texture2D.whiteTexture);
        GUI.color = d.Light == "KESİCİ" ? Color.red : Color.white; GUI.DrawTexture(new Rect(bar.x, bar.y + 8, F(d.Rpm) - bar.x, 10), Texture2D.whiteTexture); GUI.color = old;
        GUI.Label(new Rect(bar.x, bar.y - 30, 440, 28), "Vites " + d.Gear + " · " + d.Rpm.ToString("F0") + " devir   " + d.Light, big);
        GUI.Label(new Rect(bar.x, bar.y + 28, 600, 24), d.Help, text);
      }
      if (s.State == RaceState.Finished) Result(s);
    }

    private void Result(RaceSession s)
    {
      var garage = GarageSession.State;
      var r = RaceViewModel.Result(s, garage != null ? garage.StarsOf(s.Event.Type, s.Event.Level) : 0, GarageRace.LastPreviousBest, GarageRace.LastNewRecord);
      float width=Mathf.Min(520,Screen.width-24),height=Mathf.Min(580,Screen.height-24);
      GUILayout.BeginArea(new Rect((Screen.width-width)/2,(Screen.height-height)/2,width,height), GUI.skin.box);
      resultScroll=GUILayout.BeginScrollView(resultScroll);
      GUILayout.Label(r.Header, big);
      foreach (var row in r.Rows) GUILayout.Label(row.Label + ":  " + row.Value, text);
      GUILayout.Label("Yıldız " + r.Stars + " / 3", title);
      foreach (var star in r.StarRows) GUILayout.Label((star.Earned ? "● " : "○ ") + star.Text, text);
      GUILayout.Label(r.BestStars, text);
      GUILayout.Label("+" + r.Xp + " XP   +" + r.Money + " para", title);
      if (s.Career) GUILayout.Label(GarageSession.Message, text);
      if (GarageRace.LastMessage != "") GUILayout.Label(GarageRace.LastMessage, text);
      GUILayout.BeginHorizontal();
      if (GUILayout.Button("Yeniden başlat", GUILayout.Height(34))) prototype.RestartRace();
      if (GUILayout.Button("Kariyere dön", GUILayout.Height(46)))GameFlow.LeaveDrive();
      GUILayout.EndHorizontal();
      if(GUILayout.Button("Garaja dön",GUILayout.Height(46)))GameFlow.LeaveDrive(0);
      GUILayout.EndScrollView();
      GUILayout.EndArea();
    }
    private Vector2 resultScroll;
  }
}
