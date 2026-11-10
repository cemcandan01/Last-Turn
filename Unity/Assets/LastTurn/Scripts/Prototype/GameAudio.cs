using System.Collections.Generic;
using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.Prototype
{
  // TS sentezinden çevrimdışı çıkarılan klipler; tını/araç başına katman tasarımı ayrı kalır.
  // Yürütücü yalnız saf ses hedeflerini uygular, oyun durumu veya RNG değiştirmez.
  public sealed class GameAudio : MonoBehaviour
  {
    private readonly AudioDirector director = new AudioDirector();
    private readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
    private AudioSource music, effects, engine, tires, loose, spin, wind;
    private AudioLowPassFilter filter;
    private SourceEngineAudio layers;
    public static readonly Dictionary<string, int> Fired = new Dictionary<string, int>();
    public static readonly HashSet<string> MissingAssets = new HashSet<string>();
    public static AudioMix LastMix { get; private set; }
    private static readonly List<string> pending = new List<string>();
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)] private static void Reset() { Fired.Clear(); MissingAssets.Clear(); pending.Clear(); LastMix = null; }
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Install() { SceneManager.sceneLoaded -= Loaded; SceneManager.sceneLoaded += Loaded; Loaded(SceneManager.GetActiveScene(), LoadSceneMode.Single); }
    private static void Loaded(Scene s, LoadSceneMode m)
    {
      var sound=new GameObject("Oyun sesi");
      // Eski prototip sahneleri kamera içeriyordu, dinleyici içermiyordu: isPlaying ses çıkışının kanıtı değildir.
      if(!Object.FindObjectsByType<AudioListener>(FindObjectsSortMode.None).Any(l=>l.enabled&&l.gameObject.activeInHierarchy))
      {var camera=Camera.main;(camera?camera.gameObject:sound).AddComponent<AudioListener>();}
      sound.AddComponent<GameAudio>();
    }
    /// Arayüz tık sesi (TS arayüz tıkları): dokunmatik düğmeler ve menüler çağırır.
    public static void Click() => pending.Add("tik");
    private AudioClip Clip(string name)
    {
      if (!clips.TryGetValue(name, out var c)) { c = Resources.Load<AudioClip>("Audio/" + name); clips[name] = c; }
      if (!c) MissingAssets.Add(name); return c;
    }
    private AudioSource Source(string name, bool loop)
    { var s = gameObject.AddComponent<AudioSource>(); s.loop = loop; s.playOnAwake = false; s.spatialBlend = 0; s.volume=0; var c = loop ? Clip(name) : null; if (c) { s.clip = c; s.Play(); } return s; }
    private void Awake()
    {
      music = Source("muzik", true); engine = Source("motor", true); tires = Source("lastik-asfalt", true); loose = Source("lastik-gevsek", true); effects = Source("", false);
      spin=Source("savrulma",true);wind=Source("ruzgar-hiz",true);filter=gameObject.AddComponent<AudioLowPassFilter>();
      layers=gameObject.AddComponent<SourceEngineAudio>();
      foreach (var n in AudioDirector.EventNames) if(n!="bitis")Clip(n);Clip("bitis-win");Clip("bitis-lose");
    }
    private AudioFrame Frame()
    {
      var p = FindFirstObjectByType<GtPrototype>(); var f = new AudioFrame { Dt = Time.deltaTime, Refusals = MutantRuntime.Abilities?.Refusal.Count ?? 0 };
      if (!p || p.Simulation == null) { f.Mode = GameFlow.Paused ? "pause" : SceneManager.GetActiveScene().name == "Garage" ? (GameFlow.Home ? "menu" : "garage") : "menu"; return f; }
      var b = p.Simulation.Body; var race = p.Race;
      f.Mode = GameFlow.Paused || SettingsScreen.Open ? "pause" : race != null && race.Session.State == RaceState.Finished ? "result" : "drive";
      f.Speed = JsMath.Hypot(b.Velocity.X, b.Velocity.Z); f.Rpm = p.Simulation.Engine.Rpm; f.Gas = p.Simulation.Engine.Gas; f.Vy = b.Velocity.Y; f.Airborne = b.Airborne;
      f.HitTime = b.LastHitTime; f.SimTime = b.Steps * PowertrainVehicle.FixedDelta; f.ShiftTimer = p.Simulation.Engine.ShiftTimer; f.Drifting = p.Simulation.Assist.On;
      f.Beta = RaceDrift.Detect(b, p.Simulation.Assist.On).Beta; f.Cockpit = PlayerPreferences.Current.Camera == 3;
      f.Tires = b.Wheels.Select(w => (w.Contact, w.SurfaceIndex, w.TanAlpha, w.Kappa)).ToArray();
      if (race != null)
      {
        var s = race.Session; f.Racing = true; f.Countdown = s.State == RaceState.Countdown; f.CountdownLeft = s.Countdown; f.RaceType = race.Event.Type;
        f.Multiplier = s.Drift.Multiplier; f.Combo = s.Drift.Combo; f.Score = s.Drift.Score; f.Won = s.IsDrift ? s.Drift.Score > 0 : s.Time <= race.Event.Limit;
      }
      var a = MutantRuntime.Abilities;
      if (a != null)
      {
        var y = MutantRuntime.Run.State["bec"]["yerel"]; bool Open(string id) => y[id]["kalan"].N() > 0;
        f.Nitro = a.Nitro().Open; f.Hook = Open("grappling-hook"); f.Ghost = MutantRuntime.Run.State["becCikti"]["hayalet"].B(); f.Transform = Open("risk-taker"); f.Wind = Open("slipstream-engine") || Open("volt-kanat");
      }
      return f;
    }
    private void Update()
    {
      var frame=Frame();var mix = director.Step(frame, PlayerPreferences.Current); LastMix = mix;
      music.volume = (float)mix.Music; music.mute = mix.Music <= 0;
      effects.volume = (float)mix.Effects; effects.mute = mix.Effects <= 0;
      engine.volume = (float)(mix.Effects * mix.EngineMix * (mix.ShiftCut ? .4 : 1)); engine.pitch = Mathf.Clamp((float)(mix.Rpm / 3000), .3f, 3);
      if(layers.Apply(frame,mix))engine.volume=0;
      if(layers.Previewing)music.volume=(float)(AudioDirector.Level(PlayerPreferences.Current["muz"])*.9*.12);
      tires.volume = (float)(mix.Effects * Mathf.Clamp01((float)mix.Slip)); loose.volume = (float)(mix.Effects * Mathf.Clamp01((float)mix.Loose));
      spin.volume=(float)(mix.Effects*Mathf.Clamp01((float)mix.Spin));wind.volume=(float)(mix.Effects*Mathf.Clamp01((float)(mix.Speed/70)));
      filter.cutoffFrequency=(float)mix.CockpitCutoff;
      foreach (var s in new[] { engine, tires, loose,spin,wind }) s.mute = mix.Effects <= 0;
      foreach (var e in director.Events) Play(e.Name, (float)e.Strength);
      foreach (var n in pending) Play(n, 1); pending.Clear();
    }
    private void Play(string name, float strength)
    {
      Fired[name] = (Fired.TryGetValue(name, out int n) ? n : 0) + 1;
      var c = Clip(name=="bitis"?(strength>0?"bitis-win":"bitis-lose"):name); if (c && effects.volume > 0) effects.PlayOneShot(c, Mathf.Clamp(strength,.2f,1));
    }
  }
}
