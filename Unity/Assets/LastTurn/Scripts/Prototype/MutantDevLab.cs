using System;
using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;

namespace LastTurn.Prototype
{
  // TS arayuz/mutant-ui.ts testLaboratuvari + #mutantDevPanel + #mutantDriftTani: yalnız geliştirme yapısındaki test
  // koşusu. Seçimler katalogdan; kurulum kuralı MutantRun.Test* (TS mutant-kosu.ts) içinde, burada yalnız komut.
  public static class MutantDevLab
  {
    private static int passive, skill, level = 1, evolution, addon1, addon2, part;
    private static string message = "";
    public static string Message => message;
    private static CatalogNode[] Items(string key) => MutantRuntime.Run.Catalog[key].Items.ToArray();

    /// Sürüşte sağ üstteki geliştirici düğmesi (TS ⚙ DEV; emoji yerine metin).
    public static bool Button(GUIStyle style)
    {
      if (!MutantRuntime.TestRun || MutantRuntime.Panel != "" || GameFlow.Paused) return false;
      // TS sağ üst (top 72px); Windows F HUD'unda sağ üst miniharita olduğundan onun altına.
      float k = Screen.height / 720f;
      if (!GUI.Button(new Rect(Screen.width - 132 * k, 182 * k, 120 * k, 40 * k), "DEV PANEL", style)) return false;
      MutantRuntime.OpenLab(); return true;
    }

    private static int Cycle(string label, int index, string[] names, GUIStyle text, GUIStyle button)
    {
      if (names.Length == 0) return 0; index = (index % names.Length + names.Length) % names.Length;
      GUILayout.BeginHorizontal(); GUILayout.Label(label, text, GUILayout.Width(150));
      if (GUILayout.Button("<", button, GUILayout.Width(44), GUILayout.MinHeight(36))) index = (index + names.Length - 1) % names.Length;
      GUILayout.Label(names[index], text, GUILayout.MinWidth(260));
      if (GUILayout.Button(">", button, GUILayout.Width(44), GUILayout.MinHeight(36))) index = (index + 1) % names.Length;
      GUILayout.EndHorizontal(); return index;
    }
    private static bool Do(string label, GUIStyle button) => GUILayout.Button(label, button, GUILayout.MinHeight(40));
    private static void Note(bool ok, string fail) { message = ok ? "" : fail; }

    /// TS testLaboratuvari sayfası.
    public static void Draw(GUIStyle title, GUIStyle text, GUIStyle button)
    {
      var run = MutantRuntime.Run; var s = run.State; bool racing = MutantRuntime.InRace;
      GUILayout.Label("MUTANT · DEV PANEL", title);
      GUILayout.Label("Test modu · " + (racing ? "Yarış duraklatıldı" : "Açık dünya duraklatıldı") + " · Sayaç: " + MutantRuntime.Model.Timer + " (90 sn'de yenilenir)", text);
      GUILayout.Label("Değişiklikler anında araca işlenir. Yalnız geliştirme yapısında çalışır; kariyer ve normal MUTANT etkilenmez.", text);
      var passives = Items("passives"); passive = Cycle("Pasif", passive, passives.Select(p => p["ad"].S()).ToArray(), text, button);
      if (Do("Pasif ekle", button)) Note(MutantRuntime.LabSetup("pasif", passives[passive]["id"].S()), "Eklenemedi: sınır veya geçersiz seçim");
      var skills = Items("skills"); skill = Cycle("Skill", skill, skills.Select(p => p["ad"].S()).ToArray(), text, button);
      var t = skills[skill]; string id = t["id"].S(); var installed = s["beceriler"].Items.FirstOrDefault(o => o["id"].S() == id);
      level = Cycle("Seviye", level - 1, new[] { "Seviye 1", "Seviye 2", "Seviye 3" }, text, button) + 1;
      var evolutions = new[] { "" }.Concat(t["evrimler"].Items.Select(v => v["id"].S())).ToArray();
      evolution = Cycle("Evrim", evolution, new[] { "Evrim yok" }.Concat(t["evrimler"].Items.Select(v => v["ad"].S())).ToArray(), text, button);
      var tags = t["etiketler"].Items.Select(x => x.S()).ToArray(); var fits = Items("skillAddons").Where(a => tags.Contains(a["etiket"].S())).ToArray();
      var addonIds = new[] { "" }.Concat(fits.Select(a => a["id"].S())).ToArray(); var addonNames = new[] { "Eklenti yok" }.Concat(fits.Select(a => a["ad"].S())).ToArray();
      addon1 = Cycle("Eklenti 1", addon1, addonNames, text, button); addon2 = Cycle("Eklenti 2", addon2, addonNames, text, button);
      GUILayout.BeginHorizontal();
      if (Do("Skill kurulumunu uygula", button))
      {
        // Seviyeyi 3 altına çekince önceki evrim otomatik ayrılır.
        string evo = level == 3 && evolutions[evolution] != "" ? evolutions[evolution] : null;
        var ext = new[] { addonIds[addon1], addonIds[addon2] }.Where(x => x != "").ToArray();
        Note(MutantRuntime.LabSkill(id, level, evo, ext), "Uyumsuz eklenti veya evrim: kurulumu kontrol et");
      }
      if (Do("Seçili skill'i kaldır", button)) Note(MutantRuntime.LabSkill(id, 0, null, Array.Empty<string>()), "Bu skill zaten takılı değil");
      GUILayout.EndHorizontal();
      if (installed != null) GUILayout.Label("Takılı: Sv " + installed["seviye"].N() + (installed["evrim"].IsString ? " · " + installed["evrim"].S() : "") + " · " + string.Join(", ", installed["eklentiler"].Items.Select(x => x.S())), text);
      var parts = Items("parts"); part = Cycle("Parça (kilitsiz)", part, parts.Select(p => p["n"].S()).ToArray(), text, button);
      if (Do("Parça tak", button)) Note(MutantRuntime.LabSetup("parca", parts[part]["id"].S()), "Eklenemedi: sınır veya geçersiz seçim");
      GUILayout.Label("Takılı: " + s["parcalar"].Items.Count() + " parça · " + s["pasifler"].Items.Count() + " pasif · " +
        (s["beceriler"].Items.Any() ? string.Join(", ", s["beceriler"].Items.Select(o => skills.First(d => d["id"].S() == o["id"].S())["ad"].S() + " Sv" + o["seviye"].N())) : "skill yok"), text);
      if (Do("DRİFT YARIŞINA GİR / YENİDEN BAŞLAT", button)) Note(MutantRuntime.LabDrift(), "Bu bölgede drift etkinliği yok");
      if (racing && Do("BU YARIŞI YENİDEN BAŞLAT", button)) MutantRuntime.LabRestartRace();
      GUILayout.BeginHorizontal();
      if (Do("Tüm kurulumu sıfırla", button)) MutantRuntime.LabReset();
      if (Do("90 saniyeyi yenile", button)) MutantRuntime.LabTimer();
      if (Do("Drift ölçümleri: " + (MutantRuntime.DriftDiagnostics ? "AÇIK" : "KAPALI"), button)) MutantRuntime.DriftDiagnostics = !MutantRuntime.DriftDiagnostics;
      GUILayout.EndHorizontal();
      GUILayout.BeginHorizontal();
      if (Do("KULE ŞEHRİ'NE GİT", button)) MutantRuntime.LabCity();
      if (Do("Sonraki bölge (test)", button)) MutantRuntime.LabNextRegion();
      GUILayout.EndHorizontal();
      if (Do(racing ? "YARIŞA DÖN" : "AÇIK DÜNYAYA DÖN", button)) { message = ""; MutantRuntime.ClosePanel(); }
      if (message != "") GUILayout.Label(message, text);
    }

    private static double sampled = -1; private static MutantDriftDiagnosis last;
    /// TS driftDevGuncelle: test koşusunda MUTANT drift yarışı sürerken, 10 Hz.
    public static MutantDriftDiagnosis Diagnosis(GtPrototype p)
    {
      if (!MutantRuntime.TestRun || !MutantRuntime.DriftDiagnostics || p == null || p.Race == null || p.Race.Event.Type != "dp" || p.Simulation?.DriftRace == null) { sampled = -1; return null; }
      var v = p.Simulation; double time = v.Body.Steps * PowertrainVehicle.FixedDelta;
      if (last != null && sampled >= 0 && time >= sampled && time - sampled < .1) return last;
      sampled = time; var b = v.Body; var d = RaceDrift.Detect(b, v.Assist.On, true);
      last = MutantDriftDiagnosis.Read(!b.Wheels.Any(w => w.Contact), v.Assist, v.Engine.Steering, v.Engine.Gas, d.Beta, d.Speed, v.DriftRace);
      return last;
    }
    public static void DrawDiagnosis(GtPrototype p, GUIStyle text, GUIStyle small)
    {
      var t = Diagnosis(p); if (t == null) return;
      // TS #mutantDriftTani: üst ortada, sayaç ve F bildirim satırlarının altında (alt orta HUD kuralı gereği boş kalır); renk duruma göre.
      float k = Screen.height / 720f; var area = new Rect(Screen.width / 2f - 200 * k, 212 * k, 400 * k, 78 * k);
      var color = t.State == "drift" ? new Color(.52f, .93f, .75f) : t.State == "sinir" || t.State == "toparlan" ? new Color(1, .56f, .49f) : t.State == "hazirlik" || t.State == "zorlama" ? new Color(1, .83f, .49f) : new Color(.82f, .86f, .9f);
      GUILayout.BeginArea(area, GUI.skin.box);
      var title = new GUIStyle(text); title.normal.textColor = color;
      GUILayout.BeginHorizontal(); GUILayout.Label(t.Message, title); GUILayout.FlexibleSpace(); GUILayout.Label("AÇI " + t.Angle + "° · GİR " + t.Entry + "° · KONT " + t.Max + "°", small); GUILayout.EndHorizontal();
      GUILayout.Label(t.Hint, small);
      var bar = GUILayoutUtility.GetRect(420, 6); var c = GUI.color; GUI.color = new Color(1, 1, 1, .25f); GUI.DrawTexture(bar, Texture2D.whiteTexture);
      GUI.color = color; GUI.DrawTexture(new Rect(bar.x, bar.y, bar.width * t.Progress / 100f, bar.height), Texture2D.whiteTexture); GUI.color = c;
      GUILayout.EndArea();
    }
  }
}
