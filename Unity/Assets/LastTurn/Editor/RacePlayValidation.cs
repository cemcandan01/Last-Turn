using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEditor;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.EditorValidation
{
  // Gerçek Play: RaceTest sahnesinde gp_1 yarışı ayrı geçici profille (oyuncu kaydına yazılmaz). Geri sayım, TS pist
  // dünyası (yükseklik/yüzey/ipucu) üstünde gerçek fizikle 3 tur, bitiş, yıldız, ödülün kayda yazılıp yeniden okunması,
  // piste dönüş ve HUD/görünüm modeli. Sürüş test sürücüsüyle hızlandırılmış sabit adımlardır.
  [InitializeOnLoad]
  public static class RacePlayValidation
  {
    private const string Active = "LastTurn.RacePlay.Active", PathKey = "LastTurn.RacePlay.Path";
    [Serializable] private sealed class Source { public string path, sha256; }
    [Serializable] private sealed class Proof
    {
      public string result, utc, unityVersion, error, track, recordKey, finishTime, bestLap;
      public double time, minHeight, maxHeight; public int stars, xp, money, steps, countdownSteps, asphaltSteps, grassSteps, returnSteps, trackVertices, savedStars;
      public double savedBalance; public string[] checks; public Source[] sources;
    }
    private static readonly List<string> checks = new List<string>();
    private static Proof proof; private static double began; private static int phase;
    private static GtPrototype prototype; private static RaceTestDriver driver;
    private static int steps, countdown, asphalt, grass, waited; private static double lo, hi;
    private static BodyVector startPosition;

    static RacePlayValidation() { EditorApplication.playModeStateChanged += Changed; }

    [MenuItem("Last Turn/Yarış Kısa Play Doğrulaması (gp_1)")]
    public static void Start()
    {
      if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Önce Play'i durdurun.");
      RaceTestSceneBuilder.Open(); if (SceneManager.GetActiveScene().path != RaceTestSceneBuilder.ScenePath) return;
      string project = Path.GetDirectoryName(Application.dataPath);
      SessionState.SetString(PathKey, Path.Combine(project, "Logs/RacePlay/" + Guid.NewGuid().ToString("N") + "/profile.json"));
      SessionState.SetBool(Active, true); EditorApplication.EnterPlaymode();
    }

    private static void Changed(PlayModeStateChange state)
    {
      if (state == PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Active, false))
      {
        proof = new Proof { unityVersion = Application.unityVersion, result = "running", track = RaceTestSceneBuilder.Track };
        checks.Clear(); phase = 0; began = EditorApplication.timeSinceStartup; driver = new RaceTestDriver();
        steps = countdown = asphalt = grass = waited = 0; lo = 1e9; hi = -1e9;
        EditorApplication.update += Tick;
      }
      if (state == PlayModeStateChange.ExitingPlayMode) { EditorApplication.update -= Tick; SessionState.SetBool(Active, false); }
    }

    private static void Require(bool ok, string label) { if (!ok) throw new InvalidOperationException(label); checks.Add(label); }

    private static void Tick()
    {
      try
      {
        if (EditorApplication.timeSinceStartup - began > 150) throw new TimeoutException("Yarış Play kontrolü 150 sn sınırını aştı.");
        if (phase == 0)
        {
          prototype = UnityEngine.Object.FindFirstObjectByType<GtPrototype>(); if (!prototype || prototype.Race == null) return;
          // Ayrı geçici profil: ödül oyuncu kaydına değil buraya yazılır.
          GarageSession.Open(SessionState.GetString(PathKey, ""), true);
          Require(GarageSession.State.Balance == 0 && GarageSession.State.SelectedCar == 10, "Geçici profil: 0 para, başlangıç aracı");
          prototype.ManualStepping = true; prototype.InitializeRace();
          var race = prototype.Race; var world = prototype.RaceWorld;
          Require(prototype.RaceTrack == "gp_1" && race.Event.Key == "kariyer1_asphalt_1" && race.Session.Career && race.Session.RecordKey == race.Event.Key, "gp_1 kariyer yarışı, başlangıç aracı bütçede");
          Require(prototype.TrackVisuals.Vertices > 5000 && prototype.TrackVisuals.transform.childCount >= 6, "Pist ağları TS TrackWorld'den üretildi (" + prototype.TrackVisuals.Vertices + " köşe)");
          Require(prototype.GetComponent<RaceHud>() != null, "Geçici HUD bağlı");
          var p = race.Vehicle.ReferencePoint; double ground = world.Height(race.Event.StartX, race.Event.StartZ);
          Require(Math.Abs(p.X - race.Event.StartX) < 1e-9 && Math.Abs(p.Z - race.Event.StartZ) < 1e-9 && ground > 1 && Math.Abs(p.Y - ground) < 0.3,
            $"Araç TS başlangıç noktasında ve pist yüksekliğinde ({ground:F2} m)");
          Require(world.Surface(p.X, p.Z) == 1 && world.Hint == race.Session.Previous, "Başlangıç asfalt, ipucu oturumla aynı");
          proof.trackVertices = prototype.TrackVisuals.Vertices; proof.recordKey = race.Session.RecordKey;
          startPosition = race.Vehicle.Body.Position; phase = 1; return;
        }
        var r = prototype.Race; var s = r.Session;
        if (phase == 1)
        {
          while (s.State == RaceState.Countdown) { prototype.StepRace(new DrivingInput(1, 0, 0)); countdown++; }
          Require(countdown == 181 && r.Vehicle.Body.Position.Equals(startPosition), "3 sn geri sayımda fizik donuk (181 adım)");
          var hud = RaceViewModel.Hud(s, r.World.Hint);
          Require(hud.Sub.StartsWith("Tur 1/3 · Hedef 2:41.3"), "HUD: " + hud.Sub);
          proof.countdownSteps = countdown; phase = 2; return;
        }
        if (phase == 2)
        {
          for (int k = 0; k < 900 && s.State == RaceState.Running; k++)
          {
            prototype.StepRace(driver.Input(r)); steps++;
            var p = r.Vehicle.ReferencePoint; double h = r.World.BaseHeight(p.X, p.Z); lo = Math.Min(lo, h); hi = Math.Max(hi, h);
            if (r.Vehicle.Body.CenterSurface == 1) asphalt++; else grass++;
          }
          if (s.State == RaceState.Running) { if (steps > 40000) throw new InvalidOperationException("Yarış bitmedi"); return; }
          Require(s.State == RaceState.Finished && s.Lap == 3 && r.Teleports == 0, $"Gerçek fizikle 3 tur bitti ({steps} adım)");
          Require(hi - lo > 3 && asphalt > grass * 20, $"Sürüş TS yükseklik/yüzeyiyle ({lo:F2}–{hi:F2} m, asfalt {asphalt}/{grass})");
          Require(s.Stars == RaceStars.Count("gp", s.Time, r.Event.Stars) && s.BestLap < s.Time / 2.5, "Yıldız ve en iyi tur süreden");
          var expected = GarageSession.Catalog.Reward("gp", 1, s.Stars, 0);
          Require(s.Xp == expected["xp"].N() && s.Money == expected["para"].N(), "Ödül TS yarisBitti formülü");
          // Kayıt: yeniden aç, ödül ve yıldız kalıcı.
          GarageSession.Reload();
          Require(GarageSession.State.Balance == s.Money && GarageSession.State.Xp == s.Xp && GarageSession.State.StarsOf("gp", 1) == s.Stars, "Ödül ve yıldız kayda yazıldı (yeniden açınca)");
          var result = RaceViewModel.Result(s, GarageSession.State.StarsOf("gp", 1));
          Require(result.Rows.Any(x => x.Label == "En iyi tur") && result.StarRows.Count == 3 && result.BestStars == "En iyi: " + s.Stars + " / 3", "Sonuç görünüm modeli");
          proof.time = s.Time; proof.finishTime = RaceSession.FormatTime(s.Time); proof.bestLap = RaceSession.FormatTime(s.BestLap);
          proof.stars = s.Stars; proof.xp = (int)s.Xp; proof.money = (int)s.Money; proof.steps = steps; proof.asphaltSteps = asphalt; proof.grassSteps = grass;
          proof.minHeight = lo; proof.maxHeight = hi; proof.savedBalance = GarageSession.State.Balance; proof.savedStars = GarageSession.State.StarsOf("gp", 1);
          // Piste dönüş: yeniden başlat, 300 adım sür, 40 m dışarı koy, fren; 1+5 sn sonra dönüş noktası.
          prototype.InitializeRace(); r = prototype.Race; s = r.Session;
          while (s.State == RaceState.Countdown) prototype.StepRace(new DrivingInput(0, 0, 0));
          for (int k = 0; k < 300; k++) prototype.StepRace(driver.Input(r));
          var off = r.World.Geometry.AtTrack(r.World.Hint, 40); r.Vehicle.Place(off.X, off.Z, 0);
          while (r.Teleports == 0 && waited < 600) { prototype.StepRace(new DrivingInput(0, 1, 0)); waited++; }
          var back = r.Vehicle.ReferencePoint;
          Require(r.Teleports == 1 && waited >= 360 && waited <= 362 && s.Notes.Any(n => n.Text == "PİSTE DÖNDÜN"), $"Pist dışında 1+5 sn sonra piste dönüş ({waited} adım)");
          Require(r.World.Surface(back.X, back.Z) == 1 && s.Lap == 0 && s.OffTrack.First == null, "Dönüş noktası asfalt, tur sayılmadı, sayaç sıfır");
          proof.returnSteps = waited;
          Finish(null);
        }
      }
      catch (Exception error) { Finish(error); }
    }

    private static void Finish(Exception error)
    {
      EditorApplication.update -= Tick;
      proof.result = error == null ? "race-play-passed" : "failed"; proof.utc = DateTime.UtcNow.ToString("O"); proof.error = error?.ToString(); proof.checks = checks.ToArray();
      string project = Path.GetDirectoryName(Application.dataPath);
      var files = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories)
        .Where(p => p.EndsWith(".cs") || p.EndsWith(".unity") || p.EndsWith(".mat") || p.EndsWith(".meta") || p.EndsWith(".json")).OrderBy(p => p, StringComparer.Ordinal);
      proof.sources = files.Select(p => new Source { path = p.Substring(project.Length + 1).Replace('\\', '/'), sha256 = Hash(p) }).ToArray();
      Directory.CreateDirectory(Path.Combine(project, "Logs")); File.WriteAllText(Path.Combine(project, "Logs/race-play.json"), JsonUtility.ToJson(proof, true));
      SessionState.SetBool(Active, false);
      if (error == null) Debug.Log($"Last Turn yarış Play geçti: {checks.Count} kontrol; gp_1 {proof.finishTime}, {proof.stars}★, +{proof.xp} XP +{proof.money} para.");
      else Debug.LogException(error);
      EditorApplication.ExitPlaymode();
    }
    private static string Hash(string p) { using (var hash = SHA256.Create()) return BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(p))).Replace("-", "").ToLowerInvariant(); }
  }
}
