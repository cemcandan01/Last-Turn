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
  public static class GtPrototypeValidation
  {
    private const string SessionKey = "LastTurn.GtPrototype.PlayCheck";
    private static Keyboard keyboard;
    private static GtPrototype prototype;
    private static int phase, startTick, restartCount;
    private static double began;
    private static float speed, maxRelativeCameraStep;
    private static Vector3 previousOffset;
    private static bool hasOffset;
    private static bool reverseCutSeen;
    private static readonly List<string> passed = new List<string>();
    [Serializable] private sealed class Source { public string path,sha256; }
    [Serializable] private sealed class Proof
    {
      public string result,utc,unityVersion,error;
      public string[] checks;
      public float acceleratedSpeed,brakedSpeed,reverseSpeed,maxRelativeCameraStep;
      public float fullLeftLaunchSpeed,fullRightLaunchSpeed,reverseRpm;
      public Source[] sources;
    }
    private static Proof proof;
    static GtPrototypeValidation() { EditorApplication.playModeStateChanged += StateChanged; }
    private static void Require(bool condition,string message) { if(!condition) throw new InvalidOperationException(message); passed.Add(message); }

    public static int CheckPresentation()
    {
      int count = 0;
      foreach(double yaw in new[]{0.0,.4,-1.2,2.8})
      {
        var q = new BodyRotation(.1,Math.Sin(yaw/2),.05,Math.Cos(yaw/2)); var v = new BodyVector(.3,.8,1.7);
        var expected = GtPresentation.Position(q.Rotate(v)); var actual = GtPresentation.Rotation(q)*GtPresentation.Position(v);
        if(Vector3.Distance(expected,actual)>1e-5)throw new InvalidOperationException("GT eksen dönüşümü hatalı"); count++;
      }
      if(GtPresentation.Position(new BodyVector(1,0,0)).x!=-1)throw new InvalidOperationException("GT sol/sağ eşlemesi hatalı");
      if(Math.Abs(GtPresentation.Blend(2*Math.PI-.1,2*Math.PI+.1,.5)-2*Math.PI)>1e-12)throw new InvalidOperationException("GT teker açısı sarma hatası");
      return count+2;
    }

    [MenuItem("Last Turn/GT Kısa Play Doğrulaması %F8")]
    public static void Start()
    {
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play'i durdurun.");
      GtPrototypeSceneBuilder.Open();
      if(UnityEngine.SceneManagement.SceneManager.GetActiveScene().path!=GtPrototypeSceneBuilder.ScenePath)return;
      SessionState.SetBool(SessionKey,true); EditorApplication.EnterPlaymode();
    }
    private static void StateChanged(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(SessionKey,false))
      {
        proof = new Proof { result="running",unityVersion=Application.unityVersion };
        began=EditorApplication.timeSinceStartup; phase=0; passed.Clear(); hasOffset=false; maxRelativeCameraStep=0;reverseCutSeen=false;
        EditorApplication.update += Tick;
      }
      if(state==PlayModeStateChange.ExitingPlayMode) { Cleanup(); SessionState.SetBool(SessionKey,false); }
    }
    private static void Queue(params Key[] keys) => InputSystem.QueueStateEvent(keyboard,new KeyboardState(keys));
    private static void Tick()
    {
      try
      {
        if(EditorApplication.timeSinceStartup-began>60)throw new TimeoutException("GT Play kontrolü 60 sn sınırını aştı.");
        if(!prototype) prototype=UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
        if(!prototype || prototype.Simulation==null)return;
        if(phase==0)
        {
          Require(CheckPresentation()==6,"Eksen dönüşümü / sarılmamış teker interpolasyonu");
          Require(UnityEngine.Object.FindObjectsByType<WheelCollider>(FindObjectsSortMode.None).Length==0 &&
            UnityEngine.Object.FindObjectsByType<Rigidbody>(FindObjectsSortMode.None).Length==0,"Alternatif araç fiziği yok");
          Require(prototype.SteerPivots.Length==4 && prototype.SpinPivots.All(t=>t),"Dört görsel teker bağlı");
          keyboard=InputSystem.AddDevice<Keyboard>("LastTurnGtValidation"); startTick=prototype.Simulation.Body.Steps;
          Queue(Key.UpArrow); phase=1; return;
        }
        var sim=prototype.Simulation; int ticks=sim.Body.Steps-startTick;
        if(phase==6 && sim.Engine.CoupledRpm>=GtPrototypeParameters.Create().ReverseMaxRpm*1.02 && sim.Engine.EngineTorque==0)reverseCutSeen=true;
        var offset=prototype.FollowCamera.transform.position-prototype.VehicleRoot.position;
        if(phase<=4)
        {
          if(hasOffset)maxRelativeCameraStep=Mathf.Max(maxRelativeCameraStep,Vector3.Distance(offset,previousOffset));
          previousOffset=offset;hasOffset=true;
          RequireFinite(offset);
        }
        if(phase==1 && ticks>=120)
        {
          speed=(float)sim.Body.Velocity.Length;proof.acceleratedSpeed=speed;
          Require(speed>5 && sim.Body.Position.Z>5 && prototype.CurrentInput.Throttle==1,"Input System W → ileri hızlanma");
          Require(Quaternion.Angle(prototype.SpinPivots[0].localRotation,Quaternion.identity)>1,"Görsel teker dönüşü");
          startTick=sim.Body.Steps;Queue(Key.DownArrow);phase=2;
        }
        else if(phase==2 && ticks>=30)
        {
          proof.brakedSpeed=(float)sim.Body.Velocity.Length;
          Require(proof.brakedSpeed<speed-1 && prototype.CurrentInput.Brake==1,"Input System S → frenleme");
          startTick=sim.Body.Steps;Queue(Key.W,Key.A);phase=3;
        }
        else if(phase==3 && ticks>=45)
        {
          Require(prototype.CurrentInput.Steering>0 && sim.Body.Orientation.Y>0,"Input System A → kaynakta sol dönüş");
          float angle=Mathf.DeltaAngle(0,prototype.SteerPivots[0].localEulerAngles.y);
          Require(angle<-.5f,"Ön görsel teker Unity'de sola dönüyor");
          startTick=sim.Body.Steps;Queue(Key.W,Key.D,Key.Space);phase=4;
        }
        else if(phase==4 && ticks>=30)
        {
          Require(prototype.CurrentInput.Handbrake && Math.Abs(sim.Body.Wheels[2].Omega)<1 && Math.Abs(sim.Body.Wheels[3].Omega)<1,"Input System Space → arka teker kilidi");
          Require(prototype.CurrentInput.Steering<0,"Input System D → sağ direksiyon");
          Require(maxRelativeCameraStep<1.5f,"Yakın kamera göreli kare sıçraması <1.5m");
          Replay(prototype.RecordedInputs.ToArray(),sim);
          restartCount=prototype.RestartCount;Queue(Key.R);phase=5;
        }
        else if(phase==5 && prototype.RestartCount>restartCount)
        {
          Require(Math.Abs(sim.Body.Position.Z-GtPrototypeParameters.Create().Chassis.CgZ)<.01 && sim.Body.Velocity.Length<.01,"Input System R → başlangıç ve biriktirici sıfırlandı");
          startTick=sim.Body.Steps;Queue(Key.S);phase=6;
        }
        else if(phase==6 && ticks>=600)
        {
          proof.reverseSpeed=(float)sim.Body.Velocity.Z;
          proof.reverseRpm=(float)sim.Engine.Rpm;
          Require(sim.Engine.Gear==-1 && proof.reverseSpeed<-.5f,"Input System S → otomatik geri hareket");
          Require(reverseCutSeen && Math.Abs(proof.reverseSpeed)*3.6<38 && Math.Abs(proof.reverseSpeed)*3.6>30,
            "Geri motor kesicisi 3000 RPM → oranla tutarlı manevra hızı");
          restartCount=prototype.RestartCount;Queue(Key.R);phase=7;
        }
        else if(phase==7 && prototype.RestartCount>restartCount)
        {
          Require(sim.Body.Velocity.Length<.01 && sim.Engine.Gear==1,"Geri sürüş sonrası yeniden başlatma");
          startTick=sim.Body.Steps;Queue(Key.A,Key.D,Key.LeftArrow,Key.RightArrow);phase=8;
        }
        else if(phase==8 && ticks>=2)
        {
          Require(prototype.CurrentInput.Steering==0,"Zıt ve çapraz klavye yönleri nötr");
          startTick=sim.Body.Steps;Queue(Key.A);phase=9;
        }
        else if(phase==9 && ticks>=120) { startTick=sim.Body.Steps;Queue(Key.W,Key.A);phase=10; }
        else if(phase==10 && ticks>=60)
        {
          proof.fullLeftLaunchSpeed=(float)(sim.Body.Velocity.Length*3.6);
          Require(proof.fullLeftLaunchSpeed>30 && proof.fullLeftLaunchSpeed<42 && sim.Body.AngularVelocity.Y>1,
            "Önceden tam sol direksiyon + W → 1 sn dar yay kalkışı");
          Require(sim.Engine.EffectiveGas==sim.Engine.Gas,"Normal dönüş CG açısıyla gaz kesmiyor");
          Replay(prototype.RecordedInputs.ToArray(),sim);
          restartCount=prototype.RestartCount;Queue(Key.R);phase=11;
        }
        else if(phase==11 && prototype.RestartCount>restartCount) { startTick=sim.Body.Steps;Queue(Key.D);phase=12; }
        else if(phase==12 && ticks>=120) { startTick=sim.Body.Steps;Queue(Key.W,Key.D);phase=13; }
        else if(phase==13 && ticks>=60)
        {
          proof.fullRightLaunchSpeed=(float)(sim.Body.Velocity.Length*3.6);
          Require(proof.fullRightLaunchSpeed>30 && proof.fullRightLaunchSpeed<42 && sim.Body.AngularVelocity.Y< -1,
            "Önceden tam sağ direksiyon + W → 1 sn dar yay kalkışı");
          Replay(prototype.RecordedInputs.ToArray(),sim);Finish(null);
        }
      }
      catch(Exception error) { Finish(error); }
    }
    private static void RequireFinite(Vector3 v) { if(float.IsNaN(v.x)||float.IsInfinity(v.x)||float.IsNaN(v.y)||float.IsInfinity(v.y)||float.IsNaN(v.z)||float.IsInfinity(v.z))throw new InvalidOperationException("Kamera sonlu değil"); }
    private static double[] Values(PowertrainVehicle v)
    {
      var e=v.Engine;
      return VehicleCoreSmokeCheck.Values(v.Body).Concat(new[]{e.Gas,e.Steering,e.Rpm,(double)e.Gear,e.ShiftTimer,e.Turbo,e.EngineTorque,e.DriveTorque,e.CoupledRpm,e.EffectiveGas,e.EffectiveBrake,e.SlipLimit,e.SteeringAngle}).ToArray();
    }
    private static void Replay(DrivingInput[] tape,PowertrainVehicle original)
    {
      var expected=Values(original).Select(BitConverter.DoubleToInt64Bits).ToArray();
      foreach(double delta in new[]{1.0/30,1.0/60,1.0/120})
      {
        var replay=new PowertrainVehicle(GtPrototypeParameters.Create());var runner=new PowertrainFixedStepRunner(replay);
        double time=0,total=tape.Length/60.0;
        while(time<total-1e-12){double dt=Math.Min(delta,total-time);runner.Advance(dt,k=>tape[k]);time+=dt;}
        Require(replay.Body.Steps==tape.Length && Values(replay).Select(BitConverter.DoubleToInt64Bits).SequenceEqual(expected),"Gerçek Play girdi kaydı → "+(int)Math.Round(1/delta)+" FPS bit düzeyinde tekrar");
      }
    }
    private static void Finish(Exception error)
    {
      proof.result=error==null?"play-passed":"failed";proof.utc=DateTime.UtcNow.ToString("O");proof.error=error?.ToString();proof.checks=passed.ToArray();proof.maxRelativeCameraStep=maxRelativeCameraStep;
      string project=Path.GetDirectoryName(Application.dataPath);
      var files=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories)
        .Where(p=>p.EndsWith(".cs")||p.EndsWith(".unity")||p.EndsWith(".mat")||p.EndsWith(".meta"))
        .OrderBy(p=>p,StringComparer.Ordinal);
      proof.sources=files.Select(p=>new Source{path=p.Substring(project.Length+1).Replace('\\','/'),sha256=Hash(p)}).ToArray();
      Directory.CreateDirectory(Path.Combine(project,"Logs"));File.WriteAllText(Path.Combine(project,"Logs/gt-prototype-play.json"),JsonUtility.ToJson(proof,true));
      Cleanup(); SessionState.SetBool(SessionKey,false);
      if(error==null)Debug.Log("Last Turn GT Play doğrulaması geçti: "+passed.Count+" kontrol.");else Debug.LogException(error);
      EditorApplication.ExitPlaymode();
    }
    private static string Hash(string p) { using(var hash=SHA256.Create())return BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(p))).Replace("-","").ToLowerInvariant(); }
    private static void Cleanup()
    {
      EditorApplication.update-=Tick;
      if(keyboard!=null && keyboard.added)InputSystem.RemoveDevice(keyboard);
      keyboard=null;
      if(!EditorApplication.isPlayingOrWillChangePlaymode)SessionState.SetBool(SessionKey,false);
    }
  }
}
