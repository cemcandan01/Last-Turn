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
      var race = prototype ? prototype.Race : null; if (race == null) return;
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
      if (s.State == RaceState.Finished) Result(s);
    }

    private void Result(RaceSession s)
    {
      var garage = GarageSession.State;
      var r = RaceViewModel.Result(s, garage != null ? garage.StarsOf(s.Event.Type, s.Event.Level) : 0, GarageRace.LastPreviousBest, GarageRace.LastNewRecord);
      GUILayout.BeginArea(new Rect(Screen.width / 2f - 230, Screen.height / 2f - 190, 460, 380), GUI.skin.box);
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
      if (GUILayout.Button("Garaja dön", GUILayout.Height(34)))
      { if (GarageSession.DriveActive) GarageSession.ReturnToGarage(); else SceneManager.LoadScene("Garage"); }
      GUILayout.EndHorizontal();
      GUILayout.EndArea();
    }
  }
}
