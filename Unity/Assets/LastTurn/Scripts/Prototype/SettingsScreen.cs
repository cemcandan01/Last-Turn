using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.Prototype
{
  // Geçici ayarlar ekranı (TS ayarlar-ekrani.ts işlevleri). Yalnız PlayerSettings görünüm verisi ve komutlarını kullanır.
  // Önayar/lastik/araç ayarı sürgüleri serbest sürüşte Test Paneli'ndedir (TS'de de yalnız serbest sürüşte).
  public sealed class SettingsScreen : MonoBehaviour
  {
    public static bool Open { get; private set; }
    public static void Show() { Open = true; }
    public static void Close()
    {
      Open = false; PlayerPreferences.Save();
      // TS: ayar değişince girdi sıfırlanır (kontrol kipi değişmiş olabilir).
      var p = FindFirstObjectByType<GtPrototype>(); if (p) p.ResetInput();
    }
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)] private static void Reset() { Open = false; }
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Install() { SceneManager.sceneLoaded -= Loaded; SceneManager.sceneLoaded += Loaded; Loaded(SceneManager.GetActiveScene(), LoadSceneMode.Single); }
    private static void Loaded(Scene s, LoadSceneMode m) { new GameObject("Ayarlar ekranı").AddComponent<SettingsScreen>(); }
    private GUIStyle text, title, chip, on; private Vector2 scroll;
    private bool Chip(string label, bool selected) => GUILayout.Button(label, selected ? on : chip, GUILayout.MinHeight(40));
    private void OnGUI()
    {
      if (!Open) return;
      if (text == null)
      {
        text = new GUIStyle(GUI.skin.label) { fontSize = 16, wordWrap = true }; text.normal.textColor = Color.white; title = new GUIStyle(text) { fontSize = 22, fontStyle = FontStyle.Bold };
        chip = new GUIStyle(GUI.skin.button) { fontSize = 15, wordWrap = true }; on = new GUIStyle(chip) { fontStyle = FontStyle.Bold }; on.normal.textColor = new Color(1, .85f, .3f);
      }
      var s = PlayerPreferences.Current; float w = Mathf.Min(760, Screen.width - 24); var area = new Rect((Screen.width - w) / 2, 12, w, Screen.height - 24);
      var c = GUI.color; GUI.color = new Color(.035f, .045f, .06f); GUI.DrawTexture(area, Texture2D.whiteTexture); GUI.color = c;
      GUILayout.BeginArea(area, GUI.skin.box); scroll = GUILayout.BeginScrollView(scroll);
      GUILayout.Label("AYARLAR", title);
      if (GarageSession.State != null)
      {
        GUILayout.Label("Sürüş yardımı", title); GUILayout.BeginHorizontal();
        foreach (var l in GarageViewModel.AssistLevels(GarageSession.State)) if (Chip(l.Name, l.Selected) && !l.Selected) GarageSession.Execute(GarageCommand.SetAssistLevel(l.Key));
        GUILayout.EndHorizontal();
      }
      GUILayout.Label("Kamera: " + PlayerSettings.CameraNames[s.Camera], title); GUILayout.BeginHorizontal();
      for (int i = 0; i < PlayerSettings.CameraNames.Length; i++) if (Chip(PlayerSettings.CameraNames[i], s.Camera == i)) s.Camera = i;
      GUILayout.EndHorizontal();
      GUILayout.Label("Direksiyon", title); GUILayout.BeginHorizontal();
      foreach (var m in PlayerSettings.SteerNames) if (Chip(m.Name + "\n" + m.Description, s.Steer == m.Key)) s.Steer = m.Key;
      GUILayout.EndHorizontal();
      if (s.Steer == "tilt")
      {
        GUILayout.Label("Çevirme açısı " + s["tlt"].ToString("0") + "° — tam direksiyon için telefonu ne kadar yatırman gerektiği" + (Sensors.Available ? "" : " (bu cihazda yön sensörü bulunamadı)"), text);
        s.Set["tlt"] = Mathf.Round(GUILayout.HorizontalSlider((float)s["tlt"], 15, 60));
      }
      GUILayout.Label("Gaz", title); GUILayout.BeginHorizontal();
      foreach (var m in PlayerSettings.GasNames) if (Chip(m.Name + "\n" + m.Description, s.Gas == m.Key)) s.Gas = m.Key;
      GUILayout.EndHorizontal();
      GUILayout.Label("Ses", title);
      foreach (var v in PlayerSettings.Volumes) { GUILayout.Label(v.Name + " %" + s[v.Key].ToString("0") + " — " + v.Description, text); s.Set[v.Key] = Mathf.Round(GUILayout.HorizontalSlider((float)s[v.Key], 0, 100) / 5) * 5; }
      GUILayout.Label("Göstergeler (HUD): " + (s.HudLayout == "ozel" ? "Özel" : PlayerSettings.HudPresetNames.First(p => p.Key == s.HudLayout).Name), title); GUILayout.BeginHorizontal();
      foreach (var p in PlayerSettings.HudPresetNames) if (Chip(p.Name + "\n" + p.Description, s.HudLayout == p.Key)) s.ApplyPreset(p.Key);
      GUILayout.EndHorizontal();
      foreach (var (part, values) in PlayerSettings.HudParts)
      {
        GUILayout.BeginHorizontal(); GUILayout.Label(PlayerSettings.HudNames[part].Name, text, GUILayout.Width(110));
        foreach (var v in values) if (Chip(PlayerSettings.HudNames[part].Values[v], s.Hud[part] == v)) s.Hud[part] = v;
        GUILayout.EndHorizontal();
      }
      GUILayout.Label("Mekanikler", title);
      var toggles = Debug.isDebugBuild ? PlayerSettings.Toggles.Append(PlayerSettings.DeveloperGhost) : PlayerSettings.Toggles;
      foreach (var t in toggles) if (Chip(t.Name + " — " + (s.On(t.Key) ? "Açık" : "Kapalı") + "\n" + t.Description, s.On(t.Key))) s.Set[t.Key] = s.On(t.Key) ? 0 : 1;
      if (PlayerPreferences.LastError != null) GUILayout.Label("Ayarlar kaydedilemedi: " + PlayerPreferences.LastError, text);
      GUILayout.EndScrollView();
      if (GUILayout.Button("Kapat ve kaydet", chip, GUILayout.MinHeight(48))) Close();
      GUILayout.EndArea();
    }
  }
}
