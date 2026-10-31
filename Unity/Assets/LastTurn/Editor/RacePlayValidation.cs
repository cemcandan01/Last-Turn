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
  // Gerçek Play: RaceTest sahnesinde her yarış türünden temsilî pist (gp_1, rx_1, rl_1, dp_1, dg_1) ayrı geçici profille
  // (oyuncu kaydına yazılmaz). Her pist: TS pist görseli, başlangıçta TS yüksekliği, geri sayım, gerçek fizikle bitiş,
  // türün zemin/fizik izi (çamur, su, rampa, tepe, drift, tuzak hızı), ödülün kayda yazılıp yeniden okunması.
  // gp_1'de ayrıca pist dışından dönüş ve TS ↺ yeniden doğ. Sürüş doğrulama sürücüsüyle hızlandırılmış sabit adımlardır.
  [InitializeOnLoad]
  public static class RacePlayValidation
  {
    private const string Active = "LastTurn.RacePlay.Active", PathKey = "LastTurn.RacePlay.Path";
    public static readonly string[] Tracks = { "gp_1", "rx_1", "rl_1", "dp_1", "dg_1" };
    [Serializable] private sealed class Source { public string path, sha256; }
    [Serializable] public sealed class TrackResult
    {
      public string key, finishTime, bestLap; public double time, minHeight, maxHeight, score, trap; public int stars, xp, money, steps, countdownSteps, airborne, wet, mud, drift, respawns, vertices;
      public int[] surfaces;
    }
    [Serializable] private sealed class Proof
    {
      public string result, utc, unityVersion, error; public int returnSteps, savedStars; public double savedBalance, savedXp;
      public TrackResult[] tracks; public string[] checks; public Source[] sources;
    }
    private static readonly List<string> checks = new List<string>();
    private static readonly List<TrackResult> results = new List<TrackResult>();
    private static Proof proof; private static double began; private static int phase, trackIndex, waited;
    private static GtPrototype prototype; private static RaceTestDriver driver; private static TrackResult current;
    private static BodyVector startPosition; private static double balanceBefore;

    static RacePlayValidation() { EditorApplication.playModeStateChanged += Changed; }

    [MenuItem("Last Turn/Yarış Kısa Play Doğrulaması (5 tür)")]
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
        proof = new Proof { unityVersion = Application.unityVersion, result = "running" };
        checks.Clear(); results.Clear(); phase = 0; trackIndex = 0; waited = 0; began = EditorApplication.timeSinceStartup;
        EditorApplication.update += Tick;
      }
      if (state == PlayModeStateChange.ExitingPlayMode) { EditorApplication.update -= Tick; SessionState.SetBool(Active, false); }
    }

    private static void Require(bool ok, string label) { if (!ok) throw new InvalidOperationException(label); checks.Add(label); }

    private static void Tick()
    {
      try
      {
        if (EditorApplication.timeSinceStartup - began > 300) throw new TimeoutException("Yarış Play kontrolü 300 sn sınırını aştı.");
        if (phase == 0)
        {
          prototype = UnityEngine.Object.FindFirstObjectByType<GtPrototype>(); if (!prototype || prototype.Race == null) return;
          // Ayrı geçici profil: ödül oyuncu kaydına değil buraya yazılır.
          GarageSession.Open(SessionState.GetString(PathKey, ""), true);
          Require(GarageSession.State.Balance == 0 && GarageSession.State.SelectedCar == 10, "Geçici profil: 0 para, başlangıç aracı");
          Require(prototype.GetComponent<RaceHud>() != null, "Geçici HUD bağlı");
          prototype.ManualStepping = true; phase = 1; return;
        }
        string key = trackIndex < Tracks.Length ? Tracks[trackIndex] : "";
        if (phase == 1)
        {
          prototype.InitializeRace(key);
          var race = prototype.Race; var world = prototype.RaceWorld; driver = RaceTestDriver.For(race.Event.Type);
          current = new TrackResult { key = key, minHeight = 1e9, maxHeight = -1e9, surfaces = new int[6], vertices = prototype.TrackVisuals.Vertices };
          Require(prototype.RaceTrack == key && prototype.TrackVisuals.Built == key && current.vertices > 2000, $"{key}: TS pist görseli ({current.vertices} köşe)");
          var p = race.Vehicle.ReferencePoint; double ground = world.Height(race.Event.StartX, race.Event.StartZ);
          Require(Math.Abs(p.X - race.Event.StartX) < 1e-9 && Math.Abs(p.Z - race.Event.StartZ) < 1e-9 && Math.Abs(p.Y - ground) < 0.3, $"{key}: araç TS başlangıcında, zemin {ground:F2} m");
          Require(race.Session.Career && world.Hint == race.Session.Previous, $"{key}: kariyer yarışı, ipucu oturumla aynı");
          startPosition = race.Vehicle.Body.Position; balanceBefore = GarageSession.State.Balance;
          while (race.Session.State == RaceState.Countdown) { prototype.StepRace(new DrivingInput(1, 0, 0)); current.countdownSteps++; }
          Require(current.countdownSteps == 181 && race.Vehicle.Body.Position.Equals(startPosition), $"{key}: geri sayımda fizik donuk");
          phase = 2; return;
        }
        if (phase == 2)
        {
          var r = prototype.Race; var s = r.Session;
          for (int k = 0; k < 900 && s.State == RaceState.Running; k++)
          {
            prototype.StepRace(driver.Input(r)); current.steps++;
            if (driver.RespawnIfStuck(r)) current.respawns++;
            var b = r.Vehicle.Body; var p = r.Vehicle.ReferencePoint; double h = r.World.Height(p.X, p.Z);
            current.minHeight = Math.Min(current.minHeight, h); current.maxHeight = Math.Max(current.maxHeight, h); current.surfaces[b.CenterSurface]++;
            if (!b.Wheels.Any(w => w.Contact)) current.airborne++;
            if (b.Wet == 1) current.wet++;
            if (RaceDrift.Detect(b).Active) current.drift++;
          }
          if (s.State == RaceState.Running) { if (current.steps > 40000) throw new InvalidOperationException(key + " bitmedi"); return; }
          Require(s.State == RaceState.Finished, $"{key}: gerçek fizikle bitti ({current.steps} adım, {RaceSession.FormatTime(s.Time)})");
          Require(s.Stars == RaceStars.Count(r.Event.Type, s.Result, r.Event.Stars), $"{key}: yıldız sonuçtan ({s.Stars})");
          switch (r.Event.Type)
          {
            case "gp": Require(current.maxHeight - current.minHeight > 3 && current.surfaces[1] > current.surfaces[2] * 20 && s.Lap == 3, "gp_1: pist yüksekliği, asfalt, 3 tur"); break;
            case "rx": Require(current.surfaces[3] > 0 && current.airborne > 0 && current.surfaces[0] > 0 && s.Lap == 3, $"rx_1: toprak, çamur ({current.surfaces[3]}), rampadan havalanma ({current.airborne}), 3 tur"); break;
            case "rl": Require(current.wet > 0 && current.maxHeight - current.minHeight > 10 && current.surfaces[0] > 0, $"rl_1: su birikintisi ({current.wet} adım ıslak), tepeler ({current.minHeight:F1}–{current.maxHeight:F1} m), toprak"); break;
            case "dp": Require(current.drift > 0 && s.Drift.Score > 0 && s.Lap == 2, $"dp_1: gerçek kaymadan drift ({current.drift} adım, {s.Drift.Score} puan), 2 tur"); break;
            case "dg": Require(s.Trap > 0 && current.surfaces[1] == current.steps, $"dg_1: drag şeridi asfalt, tuzak hızı {s.Trap:F0} km/sa"); break;
          }
          var expected = GarageSession.Catalog.Reward(r.Event.Type, r.Event.Level, s.Stars, 0);
          Require(s.Xp == expected["xp"].N() && s.Money == expected["para"].N(), $"{key}: ödül TS yarisBitti (+{s.Xp} XP +{s.Money})");
          GarageSession.Reload();
          Require(GarageSession.State.StarsOf(r.Event.Type, r.Event.Level) == s.Stars && GarageSession.State.Balance == balanceBefore + s.Money, $"{key}: ödül ve yıldız kayıtta (yeniden açınca)");
          current.time = s.Time; current.finishTime = RaceSession.FormatTime(s.Time); current.bestLap = RaceSession.FormatTime(s.BestLap); current.stars = s.Stars;
          current.xp = (int)s.Xp; current.money = (int)s.Money; current.score = s.Drift.Score; current.trap = s.Trap ?? 0;
          results.Add(current);
          if (key == "gp_1") { phase = 3; return; }
          trackIndex++; phase = trackIndex < Tracks.Length ? 1 : 4; return;
        }
        if (phase == 3)
        {
          // gp_1: pist dışında 1+5 sn sonra dönüş, sonra TS ↺ yeniden doğ.
          prototype.InitializeRace("gp_1"); var r = prototype.Race; var s = r.Session;
          while (s.State == RaceState.Countdown) prototype.StepRace(new DrivingInput(0, 0, 0));
          for (int k = 0; k < 300; k++) prototype.StepRace(driver.Input(r));
          var off = r.World.Geometry.AtTrack(r.World.Hint, 40); r.Vehicle.Place(off.X, off.Z, 0);
          while (r.Teleports == 0 && waited < 600) { prototype.StepRace(new DrivingInput(0, 1, 0)); waited++; }
          var back = r.Vehicle.ReferencePoint;
          Require(r.Teleports == 1 && waited >= 360 && waited <= 362 && s.Notes.Any(n => n.Text == "PİSTE DÖNDÜN"), $"Pist dışında 1+5 sn sonra piste dönüş ({waited} adım)");
          Require(r.World.Surface(back.X, back.Z) == 1 && s.Lap == 0 && s.OffTrack.First == null, "Dönüş noktası asfalt, tur sayılmadı");
          var off2 = r.World.Geometry.AtTrack(r.World.Hint, 30); r.Vehicle.Place(off2.X, off2.Z, 1); prototype.StepRace(new DrivingInput(0, 0, 0));
          double t0 = s.Time; prototype.RespawnRace(); var p2 = r.Vehicle.ReferencePoint;
          Require(r.Teleports == 2 && s.Time == t0 && TrackRules.Locate(r.World.Geometry, p2.X, p2.Z, r.World.Hint).Distance < 1e-6, "TS ↺ yeniden doğ: pist dışı ilk çıkış noktasına, süre korunur");
          proof.returnSteps = waited; trackIndex++; phase = 1; return;
        }
        if (phase == 4)
        {
          proof.savedBalance = GarageSession.State.Balance; proof.savedXp = GarageSession.State.Xp;
          proof.savedStars = Tracks.Sum(k => GarageSession.State.StarsOf(k.Split('_')[0], int.Parse(k.Split('_')[1])));
          Require(proof.savedBalance == results.Sum(x => x.money), "Beş yarışın ödülü kayıtta toplam");
          Finish(null);
        }
      }
      catch (Exception error) { Finish(error); }
    }

    private static void Finish(Exception error)
    {
      EditorApplication.update -= Tick;
      proof.result = error == null ? "race-play-passed" : "failed"; proof.utc = DateTime.UtcNow.ToString("O"); proof.error = error?.ToString(); proof.checks = checks.ToArray();
      proof.tracks = results.ToArray();
      string project = Path.GetDirectoryName(Application.dataPath);
      var files = Directory.GetFiles(Path.Combine(Application.dataPath, "LastTurn"), "*", SearchOption.AllDirectories)
        .Where(p => p.EndsWith(".cs") || p.EndsWith(".unity") || p.EndsWith(".mat") || p.EndsWith(".meta") || p.EndsWith(".json")).OrderBy(p => p, StringComparer.Ordinal);
      proof.sources = files.Select(p => new Source { path = p.Substring(project.Length + 1).Replace('\\', '/'), sha256 = Hash(p) }).ToArray();
      Directory.CreateDirectory(Path.Combine(project, "Logs")); File.WriteAllText(Path.Combine(project, "Logs/race-play.json"), JsonUtility.ToJson(proof, true));
      SessionState.SetBool(Active, false);
      if (error == null) Debug.Log($"Last Turn yarış Play geçti: {checks.Count} kontrol; " + string.Join(", ", results.Select(r => $"{r.key} {r.finishTime} {r.stars}★")));
      else Debug.LogException(error);
      EditorApplication.ExitPlaymode();
    }
    private static string Hash(string p) { using (var hash = SHA256.Create()) return BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(p))).Replace("-", "").ToLowerInvariant(); }
  }
}
