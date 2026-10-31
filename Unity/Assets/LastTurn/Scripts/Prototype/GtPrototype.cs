using System;
using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;
using LastTurn.Garage;

namespace LastTurn.Prototype
{
  public sealed class GtPrototype : MonoBehaviour
  {
    [SerializeField] private Transform vehicleRoot;
    [SerializeField] private Transform[] steerPivots = new Transform[4], spinPivots = new Transform[4];
    [SerializeField] private GtFollowCamera followCamera;
    [SerializeField] private Transform ground;
    [SerializeField] private bool terrainMode;
    // Yarış kipi (RaceTest sahnesi): "gp_1" gibi tür_seviye. Boşsa GTTest/TerrainTest davranışı aynen kalır.
    [SerializeField] private string raceTrack = "";
    [SerializeField] private RaceTrackVisuals trackVisuals;
    private string visualCar = "";
    private IVehicleWorld world;
    public bool TerrainMode => terrainMode;
    private PowertrainParameters parameters;
    private PowertrainFixedStepRunner runner;
    private GtKeyboardInput input;
    private double previousSteer;
    private bool focused = true;
    private readonly List<DrivingInput> trace = new List<DrivingInput>();
    private GUIStyle title, digits, text;
    private float frameSeconds = 1f / 60;
    public PowertrainVehicle Simulation { get; private set; }
    public Transform VehicleRoot => vehicleRoot;
    public Transform[] SteerPivots => steerPivots;
    public Transform[] SpinPivots => spinPivots;
    public GtFollowCamera FollowCamera => followCamera;
    public DrivingInput CurrentInput { get; private set; }
    public IReadOnlyList<DrivingInput> RecordedInputs => trace;
    public int RestartCount { get; private set; }
    public PowertrainParameters Parameters => parameters;
    public string AppliedGarageCarId { get; private set; } = "";
    /// Etkin yarış: garajdan seçilen (RaceData.Selected) ya da sahnedeki varsayılan.
    public string RaceTrack { get; private set; } = "";
    public RaceRun Race { get; private set; }
    public TrackWorld RaceWorld { get; private set; }
    public string RaceMessage { get; private set; } = "";
    public RaceTrackVisuals TrackVisuals => trackVisuals;
    /// Doğrulama sabit adımları kendisi verir (StepRace); Update fiziği ilerletmez.
    public bool ManualStepping { get; set; }

    private void Awake()
    {
      if (raceTrack != "") { AwakeRace(); return; }
      if (GarageSession.TryDriveParameters(terrainMode,out var garageParameters))
      { parameters=garageParameters;AppliedGarageCarId=GarageSession.DriveSetup.Car["k"].S(); }
      else parameters = terrainMode?GtPrototypeParameters.CreateTerrain():GtPrototypeParameters.Create();
      world=terrainMode?(IVehicleWorld)new TerrainTestWorld():FlatAsphaltWorld.Instance;
      if (!vehicleRoot || !followCamera) throw new InvalidOperationException("GTTest sahnesi eksik; Last Turn menüsünden sahneyi oluşturun.");
      if(AppliedGarageCarId!="")ApplyGarageVisuals(GarageSession.DriveSetup);
      input = new GtKeyboardInput(); ResetVehicle();
    }
    private void OnEnable() { input?.Enable(); }
    private void OnDisable() { input?.Disable(); }
    private void OnDestroy() { input?.Dispose(); }
    private void OnApplicationFocus(bool value) { focused = value; if (value) input?.Enable(); else input?.Disable(); }
    public void ResetVehicle()
    {
      Simulation = new PowertrainVehicle(parameters,world:world); runner = new PowertrainFixedStepRunner(Simulation);
      trace.Clear(); previousSteer = 0; CurrentInput = default; RestartCount++;
      followCamera.ResetFollow(); RenderFrame(0);
    }
    private void Update()
    {
      if (!focused) return;
      if (Race != null) { UpdateRace(); return; }
      if (input.ConsumeRestart()) { ResetVehicle(); return; }
      CurrentInput = input.Read();
      runner.Advance(Time.deltaTime, _ =>
      {
        previousSteer = Simulation.Engine.SteeringAngle;
        if (trace.Count < 7200) trace.Add(CurrentInput);
        return CurrentInput;
      });
      frameSeconds = Mathf.Lerp(frameSeconds, Time.unscaledDeltaTime, .05f);
    }
    private void LateUpdate() { RenderFrame(Mathf.Min(Time.unscaledDeltaTime, .1f)); }
    private void RenderFrame(float dt)
    {
      if (runner == null) return;
      var a = runner.PreviousBody; var b = runner.CurrentBody; float alpha = (float)runner.Alpha;
      vehicleRoot.SetPositionAndRotation(Vector3.Lerp(GtPresentation.Position(a.Position), GtPresentation.Position(b.Position), alpha),
        Quaternion.Slerp(GtPresentation.Rotation(a.Orientation), GtPresentation.Rotation(b.Orientation), alpha));
      for (int i = 0; i < 4; i++)
      {
        var t = parameters.Chassis.Wheels[i];
        double compression = GtPresentation.Blend(a.Wheels[i].Compression, b.Wheels[i].Compression, alpha);
        steerPivots[i].localPosition = ModelPoint(t.X, t.AttachmentY - t.RestLength + compression, t.Z, parameters.Chassis);
        double delta = GtPresentation.Blend(GtPresentation.Steering(t, parameters.Chassis.Wheelbase, previousSteer),
          GtPresentation.Steering(t, parameters.Chassis.Wheelbase, Simulation.Engine.SteeringAngle), alpha);
        steerPivots[i].localRotation = Quaternion.AngleAxis(-GtPresentation.Degrees(delta), Vector3.up);
        spinPivots[i].localRotation = Quaternion.AngleAxis(GtPresentation.Degrees(GtPresentation.Blend(a.Wheels[i].Angle, b.Wheels[i].Angle, alpha)), Vector3.right);
      }
      RenderGhost();
      Vector3 origin = vehicleRoot.TransformPoint(ModelPoint(0, 0, 0, parameters.Chassis));
      followCamera.Render(origin, vehicleRoot.forward, (float)b.Velocity.Length, dt);
      // Sonsuz H=0 zeminin yalnız görsel döşemesi; simülasyona geri besleme yok.
      if(!terrainMode && ground)ground.position = new Vector3(vehicleRoot.position.x, 0, vehicleRoot.position.z);
    }
    // Geçici hayalet görseli: kayıtlı sürüşün ayrı fizikteki gövdesi (kutu).
    private Transform ghostView;
    private void RenderGhost()
    {
      var ghost = Race?.Ghost;
      if (ghost == null) { if (ghostView) ghostView.gameObject.SetActive(false); return; }
      if (!ghostView)
      {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube); go.name = "Rekor hayaleti"; var col = go.GetComponent<Collider>(); if (col) Destroy(col);
        go.transform.SetParent(transform, false); go.transform.localScale = new Vector3(1.8f, 1.1f, 4.3f);
        if (trackVisuals && trackVisuals.GhostMaterial) go.GetComponent<Renderer>().sharedMaterial = trackVisuals.GhostMaterial;
        ghostView = go.transform;
      }
      ghostView.gameObject.SetActive(true);
      var b = ghost.Vehicle.Body;
      ghostView.SetPositionAndRotation(GtPresentation.Position(b.Position), GtPresentation.Rotation(b.Orientation));
    }
    // ---------- Yarış kipi: TS pist dünyası + yarış oturumu (RaceRun); kural ve ödül saf katmanda/garaj oturumunda.
    private void AwakeRace()
    {
      if (!vehicleRoot || !followCamera || !trackVisuals) throw new InvalidOperationException("RaceTest sahnesi eksik; Last Turn menüsünden sahneyi oluşturun.");
      input = new GtKeyboardInput();
      InitializeRace(string.IsNullOrEmpty(RaceData.Selected) ? raceTrack : RaceData.Selected);
    }
    /// Garaj oturumundan araç/kariyer/ödül bağını kurup yarışı baştan hazırlar (doğrulama ayrı profil açınca da çağırır).
    public void InitializeRace() => InitializeRace(RaceTrack);
    public void InitializeRace(string key)
    {
      var data = RaceData.Load(); var info = data.Event(key); var track = data.Tracks.Tracks[info.Index];
      if (key != RaceTrack) { trackVisuals.Build(track); RaceTrack = key; }
      var drive = GarageRace.Prepare(info);
      parameters = drive.Parameters ?? GtPrototypeParameters.Create(); RaceMessage = drive.Message;
      AppliedGarageCarId = "";
      if (drive.Setup != null && drive.Parameters != null)
      {
        AppliedGarageCarId = drive.Setup.Car["k"].S();
        // Görsel uyarlama parça konumlarını kaydırır: aynı sahnede bir kez.
        if (visualCar == "") { ApplyGarageVisuals(drive.Setup); visualCar = AppliedGarageCarId; }
      }
      RaceWorld = new TrackWorld(track); world = RaceWorld;
      Simulation = new PowertrainVehicle(parameters, world: world); runner = new PowertrainFixedStepRunner(Simulation);
      Race = new RaceRun(Simulation, RaceWorld, info, hint => new RaceSession(info, track, drive.Career, hint, drive.Career ? GarageRace.Reward : null),
        drive.Setup != null && drive.Parameters != null ? RaceDrift.MaxAngle(drive.Setup) : double.PositiveInfinity);
      // TS startEvent: kullanım sayacı ve rekor hayaleti; endEvent: rekor/profil/hayalet kaydı.
      Race.Finished += run => GarageRace.Finished(run, drive);
      Race.GhostFactory = () => GarageRace.Ghost(info, track, Race.Session.RecordKey); Race.StartGhost();
      RecordText = RaceRecordText(); if (drive.Parameters != null) GarageRace.Started(drive.Car); raceDrive = drive;
      runner.SyncPrevious(); previousSteer = 0; followCamera.ResetFollow(); RenderFrame(0);
    }
    private void UpdateRace()
    {
      if (input.ConsumeRestart()) { RestartRace(); return; }
      CurrentInput = input.Read();
      if (ManualStepping) return;
      if (Race.Session.State == RaceState.Countdown) { Race.TickCountdown(Time.deltaTime); return; }
      if (Race.Session.State != RaceState.Running) return;
      runner.Advance(Time.deltaTime, _ => { previousSteer = Simulation.Engine.SteeringAngle; lastQuantized = Race.Record(CurrentInput); return lastQuantized; }, AfterRaceStep);
      frameSeconds = Mathf.Lerp(frameSeconds, Time.unscaledDeltaTime, .05f);
    }
    private DrivingInput lastQuantized;
    private bool AfterRaceStep()
    {
      int teleports = Race.Teleports; Race.AfterPhysicsStep(lastQuantized);
      if (Race.Teleports != teleports) { runner.SyncPrevious(); followCamera.ResetFollow(); }
      return Race.PhysicsRunning;
    }
    /// TS ↺: pist dışı ilk çıkış noktasına ya da en yakın pist noktasına (süre durmaz).
    public void RespawnRace() { if (Race.Respawn()) { runner.SyncPrevious(); followCamera.ResetFollow(); RenderFrame(0); } }
    public string RecordText { get; private set; } = "";
    private GarageRace.Drive raceDrive;
    private string RaceRecordText()
    {
      try
      {
        double best = GarageRace.ProfileStore().Load().Best(Race.Session.RecordKey);
        string value = best == 0 ? "—" : Race.Event.Type == "dp" ? best.ToString(System.Globalization.CultureInfo.InvariantCulture) + " puan" : RaceSession.FormatTime(best);
        return "Rekor " + value + " · hayalet " + (Race.Ghost != null ? RaceSession.FormatTime(Race.Ghost.Record.Result) + " (" + Race.Ghost.Record.Inputs.Count + " adım)" : "yok");
      }
      catch (Exception e) { return "Rekor okunamadı: " + e.Message; }
    }
    public void RestartRace() { if (raceDrive != null && raceDrive.Parameters != null) GarageRace.Started(raceDrive.Car); Race.Restart(); RecordText = RaceRecordText(); runner.SyncPrevious(); previousSteer = 0; followCamera.ResetFollow(); RenderFrame(0); RestartCount++; }
    /// Doğrulama: bir sabit adım (geri sayımda 1/60 sn sayaç, yarışta fizik + yarış adımı).
    public void StepRace(DrivingInput value)
    {
      CurrentInput = value;
      if (Race.Session.State == RaceState.Countdown) { Race.TickCountdown(PowertrainVehicle.FixedDelta); return; }
      if (Race.Session.State != RaceState.Running) return;
      previousSteer = Simulation.Engine.SteeringAngle;
      Race.Step(value); runner.SyncPrevious();
    }
    public void ConfigureRace(string key, RaceTrackVisuals visuals)
    {
      raceTrack = key; trackVisuals = visuals;
      foreach(Transform child in transform)
        if(child==ground || child.name.StartsWith("Mesafe çizgisi") || child.name=="Başlangıç karesi")child.gameObject.SetActive(false);
    }
    // Yalnız ayrı arazi sahnesi kurucusu çağırır; GTTest serialized verisi değişmez.
    public void ConfigureTerrain()
    {
      terrainMode=true;
      foreach(Transform child in transform)
        if(child==ground || child.name.StartsWith("Mesafe çizgisi") || child.name=="Başlangıç karesi")child.gameObject.SetActive(false);
    }
    private static Vector3 ModelPoint(double x, double y, double z, VehicleParameters p)
      => GtPresentation.Position(new BodyVector(x, y - p.CgY, z - p.CgZ));

    private void ApplyGarageVisuals(CatalogSetup setup)
    {
      var old=GtPrototypeParameters.Create().Chassis;var p=parameters.Chassis;
      foreach(Transform child in vehicleRoot)
        if(Array.IndexOf(steerPivots,child)<0)child.localPosition+=GtPresentation.Position(new BodyVector(0,old.CgY-p.CgY,old.CgZ-p.CgZ));
      var body=vehicleRoot.Find("GT gövde");
      if(body){body.localScale=new Vector3((float)setup.Car["w"].N(),.44f,(float)(p.Wheelbase+1.69));
        int rgb=(int)setup.Car["col"].N();body.GetComponent<Renderer>().material.color=new Color(((rgb>>16)&255)/255f,((rgb>>8)&255)/255f,(rgb&255)/255f);}
      for(int i=0;i<4;i++)
      {
        var tire=spinPivots[i].Find("Lastik "+i);if(tire)tire.localScale=new Vector3((float)p.Wheels[i].Radius*2,.13f,(float)p.Wheels[i].Radius*2);
      }
    }

    // Editor kurucusu bir kez çağırır; primitive nesneler ve referanslar gerçek .unity dosyasına kaydedilir.
    public void BuildVisuals()
    {
      var p = GtPrototypeParameters.Create().Chassis;
      var materials = new Dictionary<Color, Material>();
      Material Mat(Color color)
      {
        if (!materials.TryGetValue(color, out var m))
        { m = new Material(Shader.Find("Standard")) { color = color, name = "GT_" + ColorUtility.ToHtmlStringRGB(color) }; m.SetFloat("_Glossiness", .45f); materials.Add(color, m); }
        return m;
      }
      Transform Shape(string name, PrimitiveType type, Transform parent, Vector3 position, Vector3 scale, Color color)
      {
        var go = GameObject.CreatePrimitive(type); go.name = name; go.transform.SetParent(parent, false);
        go.transform.localPosition = position; go.transform.localScale = scale;
        var collider = go.GetComponent<Collider>(); if (collider) collider.enabled = false;
        go.GetComponent<Renderer>().sharedMaterial = Mat(color); return go.transform;
      }
      var asphalt = new Color(.105f,.12f,.14f); var red = new Color(.72f,.035f,.045f); var dark = new Color(.035f,.045f,.055f);
      var silver = new Color(.6f,.66f,.7f); var glass = new Color(.11f,.22f,.28f);
      ground = Shape("Düz asfalt", PrimitiveType.Plane, transform, Vector3.zero, new Vector3(400,1,400), asphalt);
      for (int n = -20; n <= 20; n++)
      {
        Shape("Mesafe çizgisi Z " + n, PrimitiveType.Cube, transform, new Vector3(0,.006f,n*25), new Vector3(1000,.008f,.055f), new Color(.19f,.21f,.23f));
        Shape("Mesafe çizgisi X " + n, PrimitiveType.Cube, transform, new Vector3(n*25,.006f,0), new Vector3(.055f,.008f,1000), new Color(.19f,.21f,.23f));
      }
      for(int n=0;n<18;n++) Shape("Başlangıç karesi", PrimitiveType.Cube, transform, new Vector3((n%9-4)*.6f,.015f,(n/9)*.6f-5),new Vector3(.6f,.015f,.6f),n%2==0?Color.white:dark);
      vehicleRoot = new GameObject("GT • ağırlık merkezi").transform; vehicleRoot.SetParent(transform, false);
      void Body(string name, double x, double y, double z, Vector3 scale, Color color)
        => Shape(name, PrimitiveType.Cube, vehicleRoot, ModelPoint(x,y,z,p), scale, color);
      Body("GT gövde",0,.48,0,new Vector3(1.8f,.44f,4.35f),red);
      Body("Kokpit",0,.88,-.25,new Vector3(1.36f,.5f,1.65f),glass);
      Body("Tavan",0,1.145,-.35,new Vector3(1.3f,.06f,1.25f),red);
      Body("Ön splitter",0,.24,2.12,new Vector3(1.84f,.08f,.24f),dark);
      Body("Arka kanat",0,1.03,-1.85,new Vector3(1.86f,.07f,.3f),dark);
      Body("Sol kanat ayağı",.57,.85,-1.85,new Vector3(.06f,.3f,.1f),dark);
      Body("Sağ kanat ayağı",-.57,.85,-1.85,new Vector3(.06f,.3f,.1f),dark);
      foreach(double side in new[]{-.63,.63})
      {
        Body("Far",side,.53,2.185,new Vector3(.36f,.12f,.025f),new Color(.9f,.95f,1));
        Body("Stop",side,.52,-2.185,new Vector3(.38f,.1f,.025f),new Color(1,.06f,.025f));
      }
      for (int i = 0; i < 4; i++)
      {
        var t = p.Wheels[i];
        steerPivots[i] = new GameObject("Teker direksiyon " + i).transform; steerPivots[i].SetParent(vehicleRoot, false);
        spinPivots[i] = new GameObject("Teker dönüş " + i).transform; spinPivots[i].SetParent(steerPivots[i], false);
        var tire = Shape("Lastik " + i,PrimitiveType.Cylinder,spinPivots[i],Vector3.zero,new Vector3((float)t.Radius*2,.13f,(float)t.Radius*2),dark);
        tire.localRotation = Quaternion.Euler(0,0,90);
        var rim = Shape("Jant " + i,PrimitiveType.Cylinder,spinPivots[i],new Vector3(i%2==0?-.14f:.14f,0,0),new Vector3(.43f,.012f,.43f),silver);
        rim.localRotation = Quaternion.Euler(0,0,90);
        Shape("Dönüş işareti " + i,PrimitiveType.Cube,spinPivots[i],new Vector3(i%2==0?-.158f:.158f,0,0),new Vector3(.025f,.46f,.045f),dark);
        steerPivots[i].localPosition = ModelPoint(t.X,t.Radius,t.Z,p);
      }
      var cameraObject = new GameObject("GT yakın takip kamera", typeof(Camera), typeof(GtFollowCamera));
      cameraObject.transform.SetParent(transform, false); cameraObject.tag = "MainCamera";
      var camera = cameraObject.GetComponent<Camera>(); camera.nearClipPlane = .15f; camera.farClipPlane = 600;
      camera.backgroundColor = new Color(.4f,.55f,.68f); camera.clearFlags = CameraClearFlags.SolidColor;
      followCamera = cameraObject.GetComponent<GtFollowCamera>();
      vehicleRoot.position = GtPresentation.Position(new BodyVector(0,p.CgY,p.CgZ));
      followCamera.Render(Vector3.zero,Vector3.forward,0,0);
      var sun = new GameObject("GT güneş", typeof(Light)); sun.transform.SetParent(transform, false);
      sun.transform.rotation = Quaternion.Euler(45,-30,0); var light = sun.GetComponent<Light>(); light.type = LightType.Directional; light.intensity = 1.15f;
    }

    private void OnGUI()
    {
      if (Simulation == null) return;
      if (title == null)
      {
        title = new GUIStyle(GUI.skin.label) { fontSize = 13, fontStyle = FontStyle.Bold, normal = { textColor = new Color(.95f,.32f,.2f) } };
        digits = new GUIStyle(GUI.skin.label) { fontSize = 34, fontStyle = FontStyle.Bold, normal = { textColor = Color.white } };
        text = new GUIStyle(GUI.skin.label) { fontSize = 13, normal = { textColor = new Color(.86f,.89f,.92f) } };
      }
      var old = GUI.matrix; float scale = Mathf.Clamp(Screen.width / 1280f,.8f,1.6f); GUI.matrix = Matrix4x4.Scale(new Vector3(scale,scale,1));
      GUI.Box(new Rect(14,14,300,202), GUIContent.none);
      GUI.Label(new Rect(28,23,270,22),terrainMode?"LAST TURN  /  ARAZİ TESTİ":"LAST TURN  /  GT TEST",title);
      var s = Simulation.Body; var e = Simulation.Engine;
      GUI.Label(new Rect(26,42,220,48),$"{s.Velocity.Length*3.6:0} km/sa",digits);
      GUI.Label(new Rect(235,51,65,38),e.Gear<0?"R":e.Gear.ToString(),digits);
      GUI.Label(new Rect(28,93,275,22),$"{e.Rpm:0} RPM   •   OTOMATİK   •   Turbo %{e.Turbo*100:0}",text);
      int contacts = 0; foreach(var wheel in s.Wheels) if(wheel.Contact) contacts++;
      GUI.Label(new Rect(28,116,275,22),$"Temas {contacts}/4   Ön {s.FrontLoad/1000:0.0} / Arka {s.RearLoad/1000:0.0} kN",text);
      GUI.Label(new Rect(28,139,275,22),$"60 Hz × 8  |  Adım {s.Steps}  |  {1/Mathf.Max(.001f,frameSeconds):0} FPS",text);
      GUI.Label(new Rect(28,161,275,22),$"Gaz %{CurrentInput.Throttle*100:0}  Fren %{CurrentInput.Brake*100:0}  El freni {(CurrentInput.Handbrake?"AÇIK":"—")}",text);
      GUI.Label(new Rect(28,185,275,22),focused?(terrainMode?VehicleGround.Name(s.CenterSurface)+" · TS toprak dengesi":"Düz asfalt · klavye testi"):"Duraklatıldı · pencereye dönün",text);
      if(terrainMode)
      {
        GUI.Box(new Rect(14,225,350,158),GUIContent.none);
        GUI.Label(new Rect(28,234,325,22),$"Z {s.Position.Z:0.0} m · Y {s.Position.Y:0.00} m · Dikey {s.Velocity.Y:0.0} m/sn",text);
        for(int i=0;i<4;i++)
        {
          var wheel=s.Wheels[i];string corner=new[]{"Ön sol","Ön sağ","Arka sol","Arka sağ"}[i];
          GUI.Label(new Rect(28,258+i*23,325,22),$"{corner}: {VehicleGround.Name(wheel.SurfaceIndex)} · {(wheel.Contact?"TEMAS":"HAVA")} · {wheel.Compression*100:0.0} cm",text);
        }
        GUI.Label(new Rect(28,351,325,22),"20–60 tepe · 70–90 tümsek · 105–120 rampa",text);
        if(Screen.width/scale>820)GUI.Box(new Rect(380,14,420,53),"Sol şerit TOPRAK (x ≥ 4) · Sağ şerit ASFALT\nW ile ilerle · A/D ile yüzey değiştir · R başa döner");
      }
      GUI.Box(new Rect(14,Screen.height/scale-46,560,32),"W / ↑ Gaz    S / ↓ Fren ve geri    A/D / ←/→ Dönüş    Space El freni    R Başlangıç");
      GUI.matrix = old;
    }
  }
}
