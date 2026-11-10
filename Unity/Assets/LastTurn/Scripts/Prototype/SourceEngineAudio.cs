using System;
using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Ui;
using UnityEngine;

namespace LastTurn.Prototype
{
  public sealed class SourceEngineAudio:MonoBehaviour
  {
    [Serializable]public sealed class Layer{public double rpm;public string gas,off;}
    [Serializable]public sealed class Profile{public string key;public double rpm,vtec,turbo,compressor,gears,pops;public int valve;public Layer[] layers;}
    [Serializable]private sealed class Table{public Profile[] profiles;}
    private static Table table;private static string requested="";
    private Profile profile;private EngineAudioMixer mixer=new EngineAudioMixer();private GameObject rig;
    private readonly AudioSource[] gas=new AudioSource[5],off=new AudioSource[5];private SourceEngineOscillator oscillator;private AudioSource extra;
    private readonly AudioSource[] shots=new AudioSource[6];private readonly float[] strengths=new float[6];private int shotIndex;
    private double[] rpms;private double priorGas,popUntil,nextPop;private bool priorShift;private readonly System.Random cosmetic=new System.Random(53);
    private double listenTime,listenRpm;private string listening="";
    public bool Previewing=>listening!="";
    public static string ListeningKey {get;private set;}="";
    public string LoadedKey=>profile?.key??"";
    public int LayerSources=>gas.Count(s=>s&&s.clip)+off.Count(s=>s&&s.clip);
    public EngineAudioMixer Mix=>mixer;
    public static void Listen(string key){requested=key;}
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]private static void Reset(){table=null;requested="";ListeningKey="";}
    private AudioClip Clip(string file){var clip=Resources.Load<AudioClip>("Audio/Engines/"+file);if(!clip)GameAudio.MissingAssets.Add("Engines/"+file);return clip;}
    private AudioSource LayerSource(string file)
    {
      var go=new GameObject(file);go.transform.SetParent(rig.transform,false);var source=go.AddComponent<AudioSource>();source.playOnAwake=false;source.loop=true;source.spatialBlend=0;source.clip=Clip(file);source.volume=0;go.AddComponent<SourceEngineFilter>();if(source.clip)source.Play();return source;
    }
    private bool Load(string key)
    {
      if(table==null){var text=Resources.Load<TextAsset>("Audio/Engines/manifest");if(!text)return false;table=JsonUtility.FromJson<Table>(text.text);}
      var next=Array.Find(table.profiles,p=>p.key==key);if(next==null)return false;if(profile==next)return true;
      if(rig){if(extra&&extra.clip)Destroy(extra.clip);rig.SetActive(false);Destroy(rig);}profile=next;mixer=new EngineAudioMixer();rpms=profile.layers.Select(l=>l.rpm).ToArray();priorGas=0;priorShift=false;popUntil=nextPop=0;
      rig=new GameObject("TS motor katmanları · "+key);rig.transform.SetParent(transform,false);
      for(int i=0;i<5;i++){gas[i]=LayerSource(profile.layers[i].gas);off[i]=LayerSource(profile.layers[i].off);}
      for(int i=0;i<shots.Length;i++){var go=new GameObject("TS valf/patlama "+i);go.transform.SetParent(rig.transform,false);shots[i]=go.AddComponent<AudioSource>();shots[i].playOnAwake=false;shots[i].spatialBlend=0;go.AddComponent<AudioLowPassFilter>().lowpassResonanceQ=.5f;}
      var aux=new GameObject("TS turbo kompresör dişli");aux.transform.SetParent(rig.transform,false);extra=aux.AddComponent<AudioSource>();extra.playOnAwake=false;extra.loop=true;extra.spatialBlend=0;extra.clip=AudioClip.Create("TS yardımcı osilatör",48000,1,48000,false);oscillator=aux.AddComponent<SourceEngineOscillator>();aux.AddComponent<AudioLowPassFilter>();extra.volume=0;extra.Play();return true;
    }
    public bool Apply(AudioFrame frame,AudioMix mix)
    {
      var p=FindFirstObjectByType<GtPrototype>();string key=p?p.AppliedGarageCarId:"";if(key=="")key=p&&p.TerrainMode?"rl":"gt";
      if(requested!=""){listening=requested;requested="";listenTime=0;listenRpm=900;}
      var view=GarageView.Instance;var store=StoreView.Instance;bool shown=(view&&view.Visible&&view.Detail?.ModelKey==listening)||(store&&store.Visible&&store.Offer!=null&&store.Offer.CanListen&&store.ModelKey==listening);if(listening!=""&&(!shown||GameFlow.Paused||SettingsScreen.Open||listenTime>=5))listening="";
      ListeningKey=listening;
      double rpm=frame.Rpm,throttle=frame.Gas,volume=mix.Effects*mix.EngineMix,dt=Math.Min(.1,Time.unscaledDeltaTime),time=AudioSettings.dspTime;
      if(listening!=""){key=listening;listenTime+=dt;throttle=EngineAudioMixer.ListenGas(listenTime)?1:0;volume=mix.Effects;}
      if(!Load(key))return false;
      if(listening!=""){double target=throttle>0?900+.99*(profile.rpm-900):900;listenRpm+=(target-listenRpm)*Math.Min(1,dt*(target>listenRpm?2.6:1.8));rpm=listenRpm;}
      double turbo=profile.turbo,compressor=profile.compressor;
      if(p&&p.Simulation!=null){var setup=MutantRuntime.Active?MutantRuntime.Session.BuildSetup():GarageSession.DriveSetup;if(setup!=null){turbo=Math.Max(turbo,setup.Parts.Contains("turbo-buyuk")?1:setup.Parts.Contains("turbo-kucuk")?.7:0);compressor=Math.Max(compressor,setup.Parts.Contains("kompresor")?.9:0);}}
      mixer.Step(time,dt,rpm,throttle,mix.ShiftCut,mix.Speed,p&&turbo>profile.turbo?(double?)p.Simulation.Engine.Turbo:null,volume,profile.rpm,rpms,profile.vtec,turbo,compressor,profile.gears);
      for(int i=0;i<5;i++){float smoothing=1-Mathf.Exp(-(float)dt/.02f),pitchSmooth=1-Mathf.Exp(-(float)dt/.012f);gas[i].volume=Mathf.Lerp(gas[i].volume,(float)(mixer.Gain*mixer.Gas[i]),smoothing);off[i].volume=Mathf.Lerp(off[i].volume,(float)(mixer.Gain*mixer.Off[i]),smoothing);gas[i].pitch=Mathf.Lerp(gas[i].pitch,(float)mixer.Pitch[i],pitchSmooth);off[i].pitch=gas[i].pitch;gas[i].GetComponent<SourceEngineFilter>().Configure(mixer.VtecDb,mix.CockpitCutoff);off[i].GetComponent<SourceEngineFilter>().Configure(mixer.VtecDb,mix.CockpitCutoff);}
      oscillator.Target=new SourceEngineOscillator.State{turboHz=mixer.TurboHz,turbo=mixer.TurboGain,noiseHz=mixer.NoiseHz,noise=mixer.NoiseGain,compressorHz=mixer.CompressorHz,compressor=mixer.CompressorGain,gearHz=mixer.GearHz,gear=mixer.GearGain};extra.volume=(float)volume;extra.GetComponent<AudioLowPassFilter>().cutoffFrequency=(float)mix.CockpitCutoff;
      for(int i=0;i<shots.Length;i++){shots[i].volume=(float)volume*strengths[i];shots[i].GetComponent<AudioLowPassFilter>().cutoffFrequency=(float)mix.CockpitCutoff;}
      bool release=priorGas>.5&&throttle<.2,shift=mix.ShiftCut&&!priorShift;double u=Math.Min(1,Math.Max(600,rpm)/profile.rpm);
      if(turbo>0&&profile.valve>0&&mixer.Boost>.4&&(release||shift)){OneShot("valve-"+profile.valve,(release?.75:.35)*mixer.Boost,.92+cosmetic.NextDouble()*.16,volume);mixer.DischargeBoost();}
      if(profile.pops>0){if(release&&u>.45){popUntil=time+.3+.8*profile.pops*u;nextPop=time+.04+cosmetic.NextDouble()*.08;}if(shift&&profile.pops>.7&&u>.5){popUntil=Math.Max(popUntil,time+.1);nextPop=Math.Min(nextPop,time+.02);}if(time<popUntil&&throttle<.3&&time>=nextPop){OneShot("pop-"+cosmetic.Next(4),(.7+.3*u)*(.2+.45*cosmetic.NextDouble()),.8+cosmetic.NextDouble()*.4,volume);nextPop=time+.07+cosmetic.NextDouble()*.25/(.5+profile.pops);}}
      priorGas=throttle;priorShift=mix.ShiftCut;return true;
    }
    private void OnDestroy(){if(ListeningKey==listening)ListeningKey="";if(extra&&extra.clip)Destroy(extra.clip);}
    private void OneShot(string name,double strength,double pitch,double volume){int i=shotIndex++%shots.Length;strengths[i]=(float)strength;shots[i].clip=Clip(name);shots[i].pitch=(float)pitch;shots[i].volume=(float)(volume*strength);if(shots[i].clip)shots[i].Play();}
  }
}
