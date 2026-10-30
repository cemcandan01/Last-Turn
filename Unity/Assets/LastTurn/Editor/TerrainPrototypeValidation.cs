using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Security.Cryptography;
using LastTurn.Core;
using LastTurn.Prototype;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;

namespace LastTurn.EditorValidation
{
  [InitializeOnLoad]
  public static class TerrainPrototypeValidation
  {
    private const string SessionKey="LastTurn.Terrain.PlayCheck";
    private static Keyboard keyboard;private static GtPrototype prototype;
    private static int phase,startTick,restarts;private static double began;
    private static bool air,landed,soil,mixed;private static float peakY,compression,speedBeforeBrake;
    private static double lowSpeedPeakBeta,lowSpeedFinalBeta;
    private static readonly List<string> checks=new List<string>();
    [Serializable]private sealed class Source{public string path,sha256;}
    [Serializable]private sealed class Proof
    {
      public string result,utc,unityVersion,error;public string[] checks;public Source[] sources;
      public bool air,landed,soil,mixed;public float peakY,maxCompression,speedBeforeBrake,speedAfterBrake;
      public double lowSpeedPeakBeta,lowSpeedFinalBeta;
    }
    private static Proof proof;
    static TerrainPrototypeValidation(){EditorApplication.playModeStateChanged+=Changed;}
    [MenuItem("Last Turn/Arazi Kısa Play Doğrulaması")]
    public static void Start()
    {
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play'i durdurun.");
      TerrainTestSceneBuilder.Open();if(UnityEngine.SceneManagement.SceneManager.GetActiveScene().path!=TerrainTestSceneBuilder.ScenePath)return;
      SessionState.SetBool(SessionKey,true);EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(SessionKey,false))
      {
        phase=0;checks.Clear();air=landed=soil=mixed=false;peakY=compression=0;began=EditorApplication.timeSinceStartup;
        lowSpeedPeakBeta=lowSpeedFinalBeta=0;
        proof=new Proof{unityVersion=Application.unityVersion};EditorApplication.update+=Tick;
      }
      if(state==PlayModeStateChange.ExitingPlayMode){Cleanup();SessionState.SetBool(SessionKey,false);}
    }
    private static void Require(bool ok,string label){if(!ok)throw new InvalidOperationException(label);checks.Add(label);}
    private static void Queue(params Key[] keys)=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(keys));
    private static void Tick()
    {
      try
      {
        if(EditorApplication.timeSinceStartup-began>60)throw new TimeoutException("Arazi Play 60 sn sınırını aştı.");
        if(!prototype)prototype=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();if(!prototype||prototype.Simulation==null)return;
        var sim=prototype.Simulation;var s=sim.Body;
        if(phase==0)
        {
          Require(prototype.TerrainMode,"Ayrı TerrainTest dünya adaptörü");
          Require(UnityEngine.Object.FindObjectsByType<WheelCollider>(FindObjectsSortMode.None).Length==0 && UnityEngine.Object.FindObjectsByType<Rigidbody>(FindObjectsSortMode.None).Length==0,"İkinci araç fiziği yok");
          Require(prototype.SteerPivots.Length==4,"Dört süspansiyon görseli bağlı");
          keyboard=InputSystem.AddDevice<Keyboard>("LastTurnTerrainValidation");Queue(Key.W);phase=1;return;
        }
        if(phase==1||phase==2)
        {
          int contacts=s.Wheels.Count(w=>w.Contact);if(contacts==0)air=true;if(air&&contacts>0)landed=true;
          peakY=Math.Max(peakY,(float)s.Position.Y);compression=Math.Max(compression,(float)s.Wheels.Max(w=>w.Compression));
        }
        soil|=s.Wheels.Any(w=>w.SurfaceIndex==0);mixed|=s.Wheels.Select(w=>w.SurfaceIndex).Distinct().Count()>1;
        if(phase==7 || phase==8)
        {
          var f=s.Orientation.Rotate(new BodyVector(0,0,1));
          double along=s.Velocity.X*f.X+s.Velocity.Z*f.Z,side=s.Velocity.X*f.Z-s.Velocity.Z*f.X;
          lowSpeedFinalBeta=Math.Abs(Math.Atan2(side,Math.Max(.5,Math.Abs(along))))*180/Math.PI;
          lowSpeedPeakBeta=Math.Max(lowSpeedPeakBeta,lowSpeedFinalBeta);
        }
        if(phase==1 && s.Position.Z>145)
        {
          speedBeforeBrake=(float)s.Velocity.Length;Queue(Key.S);phase=2;
        }
        else if(phase==2 && s.Velocity.Length<.7)
        {
          proof.speedAfterBrake=(float)s.Velocity.Length;
          Require(peakY>2,"Eğim/rampa üzerinde gövde yüksekliği");Require(air && landed,"Gerçek Play havalanma ve iniş");
          Require(compression>.15,"İnişte süspansiyon sıkışması");Require(s.Velocity.Length<speedBeforeBrake*.1,"Arazi sonrası frenleme");
          Replay(prototype.RecordedInputs.ToArray(),sim);
          restarts=prototype.RestartCount;Queue(Key.R);phase=3;
        }
        else if(phase==3 && prototype.RestartCount>restarts)
        {
          Require(s.Velocity.Length<.01 && s.Position.Z<1,"R arazi başlangıcına döndü");
          startTick=s.Steps;Queue(Key.W,Key.A);phase=4;
        }
        else if(phase==4 && s.Steps-startTick>=120)
        {
          Require(soil && mixed,"Klavye ile asfalt/toprak ve karışık teker geçişi");
          Require(s.Wheels.All(w=>w.Compression>=0 && !double.IsNaN(w.Load)),"Yüzey geçişinde sonlu süspansiyon");
          Require(sim.Engine.Gear>0,"Arazi/test otomatik ileri vites");
          // S durunca kaynak otomatik geri seçer; park aşamasında el frenini kullan.
          Replay(prototype.RecordedInputs.ToArray(),sim);Queue(Key.Space);phase=5;
        }
        else if(phase==5 && s.Velocity.Length<.7)
        {
          Require(s.CenterSurface==0,"Düşük hız testi gerçek toprak şeridinde");Queue(Key.W);phase=6;
        }
        else if(phase==6 && s.Velocity.Length>=5){startTick=s.Steps;Queue(Key.A);phase=7;}
        else if(phase==7 && s.Steps-startTick>=12){startTick=s.Steps;Queue();phase=8;}
        else if(phase==8 && s.Steps-startTick>=60)
        {
          Require(s.CenterSurface==0 && s.Velocity.Length>2,"18 km/sa toprak direksiyon darbesi sonrası hareket/temas");
          Require(lowSpeedPeakBeta<12 && lowSpeedFinalBeta<3,"Düşük hızda küçük direksiyon sonrası kararlı toparlanma");
          Replay(prototype.RecordedInputs.ToArray(),sim);Finish(null);
        }
      }
      catch(Exception error){Finish(error);}
    }
    private static long[] Values(PowertrainVehicle sim)
    {
      var e=sim.Engine;
      return VehicleCoreSmokeCheck.Values(sim.Body).Concat(new[]{e.Gas,e.Steering,e.Rpm,(double)e.Gear,e.ShiftTimer,e.Turbo,e.EngineTorque,e.DriveTorque,e.CoupledRpm,e.EffectiveGas,e.EffectiveBrake,e.SlipLimit,e.SteeringAngle})
        .Concat(sim.Body.Wheels.Select(w=>(double)w.SurfaceIndex)).Concat(new[]{sim.Body.Wet,sim.Body.Mud}).Select(BitConverter.DoubleToInt64Bits).ToArray();
    }
    private static void Replay(DrivingInput[] tape,PowertrainVehicle original)
    {
      var expected=Values(original);
      foreach(double delta in new[]{1.0/30,1.0/60,1.0/120})
      {
        var sim=new PowertrainVehicle(GtPrototypeParameters.CreateTerrain(),world:new TerrainTestWorld());var runner=new PowertrainFixedStepRunner(sim);double time=0,total=tape.Length/60.0;
        while(time<total-1e-12){double dt=Math.Min(delta,total-time);runner.Advance(dt,k=>tape[k]);time+=dt;}
        Require(sim.Body.Steps==tape.Length && Values(sim).SequenceEqual(expected),"Arazi gerçek girdi kaydı "+(int)Math.Round(1/delta)+" FPS bit eşitliği");
      }
    }
    private static void Finish(Exception error)
    {
      proof.result=error==null?"terrain-play-passed":"failed";proof.utc=DateTime.UtcNow.ToString("O");proof.error=error?.ToString();proof.checks=checks.ToArray();
      proof.air=air;proof.landed=landed;proof.soil=soil;proof.mixed=mixed;proof.peakY=peakY;proof.maxCompression=compression;proof.speedBeforeBrake=speedBeforeBrake;
      proof.lowSpeedPeakBeta=lowSpeedPeakBeta;proof.lowSpeedFinalBeta=lowSpeedFinalBeta;
      string project=Path.GetDirectoryName(Application.dataPath);
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories)
        .Where(p=>p.EndsWith(".cs")||p.EndsWith(".unity")||p.EndsWith(".mat")||p.EndsWith(".meta")||p.EndsWith(".asset")).OrderBy(p=>p,StringComparer.Ordinal)
        .Select(p=>new Source{path=p.Substring(project.Length+1).Replace('\\','/'),sha256=Hash(p)}).ToArray();
      Directory.CreateDirectory(Path.Combine(project,"Logs"));File.WriteAllText(Path.Combine(project,"Logs/terrain-play.json"),JsonUtility.ToJson(proof,true));
      Cleanup();SessionState.SetBool(SessionKey,false);if(error==null)Debug.Log("Last Turn arazi Play geçti: "+checks.Count+" kontrol.");else Debug.LogException(error);
      EditorApplication.ExitPlaymode();
    }
    private static string Hash(string p){using(var hash=SHA256.Create())return BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(p))).Replace("-","").ToLowerInvariant();}
    private static void Cleanup(){EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);keyboard=null;}
  }
}
