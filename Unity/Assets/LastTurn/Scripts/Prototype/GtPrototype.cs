using System;
using System.Collections.Generic;
using System.Linq;
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
    private bool mutantDrive;
    private double pendingProfileKm,observedRaceKm;
    private readonly List<DrivingInput> trace = new List<DrivingInput>();
    private GUIStyle title, digits, text;
    private float frameSeconds = 1f / 60;
    public PowertrainVehicle Simulation { get; private set; }
    public Transform VehicleRoot => vehicleRoot;
    public Transform[] SteerPivots => steerPivots;
    public Transform[] SpinPivots => spinPivots;
    public GtFollowCamera FollowCamera => followCamera;
    public DrivingInput CurrentInput { get; private set; }
    /// Ham girişler (TS I); yalnız okuma/doğrulama.
    public DrivingControls Controls => input?.Controls;
    /// Serbest sürüş telemetrisinin alt kenarı (geliştirici dünya paneli altından başlar).
    public float TelemetryBottom { get; private set; }
    /// Bu sürüşün günün saati/havası (HUD ve doğrulama).
    public RaceConditions Conditions { get; private set; } = new RaceConditions();
    public IReadOnlyList<DrivingInput> RecordedInputs => trace;
    public int RestartCount { get; private set; }
    public PowertrainParameters Parameters => parameters;
    public string AppliedGarageCarId { get; private set; } = "";
    /// Etkin yarış: garajdan seçilen (RaceData.Selected) ya da sahnedeki varsayılan.
    public string RaceTrack { get; private set; } = "";
    public RaceRun Race { get; private set; }
    public TrackWorld RaceWorld { get; private set; }
    public OpenWorld OpenTerrain{get;private set;}
    public OpponentRacer Opponent{get;private set;}
    public PhysicalWorldVisuals EnvironmentVisuals{get;private set;}
    private Transform opponentVisual;private int openSpawn;
    public string RaceMessage { get; private set; } = "";
    public RaceTrackVisuals TrackVisuals => trackVisuals;
    public RallyVisualSample VisualSample { get; private set; }
    public SourceVehicleView SourceVehicle {get;private set;}
    public SourceEnvironmentView SourceEnvironment {get;private set;}
    private string sourceCarKey="";private SourceVehicleView opponentSource;
    /// Doğrulama sabit adımları kendisi verir (StepRace); Update fiziği ilerletmez.
    public bool ManualStepping { get; set; }

    private void Awake()
    {
      mutantDrive=MutantRuntime.Active;
      // Kamera yükseklik tabanı etkin fizik dünyasının zemininden (sahnedeki kayıtlı kameraya da bağlanır).
      if(followCamera)followCamera.Ground=(x,z)=>world!=null?world.Height(-x,z):0;
      if (raceTrack != "") { AwakeRace(); return; }
      if(MutantRuntime.Active&&MutantRuntime.Session!=null)
      {parameters=MutantRuntime.Session.BuildPhysics();AppliedGarageCarId=MutantRuntime.Session.BuildSetup().Car["k"].S();}
      else if (GarageSession.TryDriveParameters(terrainMode,out var garageParameters))
      { parameters=garageParameters;AppliedGarageCarId=GarageSession.DriveSetup.Car["k"].S(); }
      else parameters = terrainMode?GtPrototypeParameters.CreateTerrain():GtPrototypeParameters.Create();
      world=terrainMode?(IVehicleWorld)new TerrainTestWorld():FlatAsphaltWorld.Instance;
      if(WorldData.OpenKey!="")
      {
        OpenTerrain=new OpenWorld(WorldData.Catalog,WorldData.OpenKey);world=OpenTerrain;
        Conditions=GameFlow.Conditions.Clone();OpenTerrain.GripMultiplier=Conditions.GripFor(RaceConditions.ThemeOf(WorldData.OpenKey));
        ConfigureTerrain();EnvironmentVisuals=gameObject.AddComponent<PhysicalWorldVisuals>();EnvironmentVisuals.Build(world,OpenTerrain.Region,true);
        if(!MutantRuntime.Active)gameObject.AddComponent<WorldDrivePanel>();
        else gameObject.AddComponent<MutantWorldMarkers>();
      }
      if (!vehicleRoot || !followCamera) throw new InvalidOperationException("GTTest sahnesi eksik; Last Turn menüsünden sahneyi oluşturun.");
      if(AppliedGarageCarId!="")ApplyGarageVisuals(MutantRuntime.Active?MutantRuntime.Session.BuildSetup():GarageSession.DriveSetup);
      input = new GtKeyboardInput(); BindMutantInput(); BindTouch(); ResetVehicle();
    }
    private TouchDrivingOverlay touch;
    // P5: dokunmatik katman ve oyuncu tercihleri (TS kontrolleriKur + lt_ayar). Tercih değişince canlı araca uygulanır.
    private void BindTouch()
    {
      touch = gameObject.AddComponent<TouchDrivingOverlay>(); touch.Bind(this, input);
      PlayerPreferences.Changed += ApplyPreferences;
    }
    private void ApplyPreferences()
    {
      if (Simulation == null) return; var s = PlayerPreferences.Current;
      Simulation.SmoothSteeringPreference = s.On("sm"); Simulation.SpeedSensitivePreference = s.On("ss");
    }
    /// TS girdiSifirla: yarış başı/sonu, ayar ve panel değişimi.
    public void ResetInput() { input?.Controls.Reset(); touch?.Release(); }
    /// TS ↺ (yenidenDog): yarışta piste dönüş; Unity açık dünya bölgelerinde pist yok → TS pistsiz dalı: araç olduğu yerde durdurulup yere konur.
    public void RespawnAny()
    {
      if (Race != null) { if (Race.Session.State == RaceState.Running) RespawnRace(); return; }
      if (Simulation == null) return; var p = Simulation.ReferencePoint; var f = Simulation.Body.Orientation.Rotate(new BodyVector(0, 0, 1));
      Simulation.Place(p.X, p.Z, Math.Atan2(f.X, f.Z)); runner.SyncPrevious(); followCamera.ResetFollow();
    }
    // TS mutant-ui.ts klavye: tuşlar yalnız kuyruğa girer, sonraki fizik adımında MutantAbilityDriver tüketir.
    private void BindMutantInput()
    {
      if(!mutantDrive)return;
      input.NitroPressed+=()=>{if(!MutantRuntime.Blocked&&!SettingsScreen.Open)MutantRuntime.Abilities?.PressNitro();};
      input.SkillPressed+=slot=>{if(!MutantRuntime.Blocked&&!SettingsScreen.Open)MutantRuntime.Abilities?.PressSkill(slot);};
      input.SkillReleased+=slot=>MutantRuntime.Abilities?.ReleaseSkill(slot);
    }
    // TS suruklemeKancasi.hava: koşu sürerken araç havadaysa (ya da parmak zaten basılıysa) sürükleme burnu çevirir.
    private void UpdateAirControl()
    {
      var a=MutantRuntime.Abilities;if(!mutantDrive||a==null||Simulation==null)return;
      string phase=MutantRuntime.Run.State["faz"].S();bool active=((phase=="surus"||phase=="boss")&&Simulation.Body.Airborne)||a.Finger;
      if(input.AirHeld&&active){var d=input.AirDelta;if(d.X!=0||d.Y!=0)a.AirDrag(d.X,d.Y);}
      else if(!input.AirHeld&&a.Finger)a.AirRelease();
    }
    private void OnEnable() { input?.Enable(); }
    private void OnDisable() { FlushProfileDistance();input?.Disable(); }
    private void OnApplicationQuit(){FlushProfileDistance();}
    private void OnApplicationPause(bool paused){if(paused)FlushProfileDistance();}
    private void ObserveRaceDistance(){if(Race==null||mutantDrive)return;pendingProfileKm+=Math.Max(0,Race.Km-observedRaceKm);observedRaceKm=Race.Km;}
    public bool FlushProfileDistance()
    {
      if(mutantDrive){pendingProfileKm=0;return true;}
      ObserveRaceDistance();if(pendingProfileKm==0)return true;
      if(!GarageRace.Distance(pendingProfileKm))return false;pendingProfileKm=0;return true;
    }
    private void OnDestroy() { PlayerPreferences.Changed -= ApplyPreferences; input?.Dispose(); }
    private void OnApplicationFocus(bool value) { focused = value; if (value) input?.Enable(); else input?.Disable(); }
    public void ResetVehicle()
    {
      FlushProfileDistance();
      Simulation = new PowertrainVehicle(parameters,world:world); runner = new PowertrainFixedStepRunner(Simulation); ApplyPreferences();
      if(OpenTerrain!=null){var t=OpenTerrain.Region.Teleports[openSpawn];Simulation.Place(t.X,t.Z,t.Heading);runner.SyncPrevious();}
      if(MutantRuntime.Active&&OpenTerrain!=null){MutantRuntime.PlaceWorld(Simulation);runner.SyncPrevious();}
      trace.Clear(); previousSteer = 0; CurrentInput = default; RestartCount++;
      followCamera.ResetFollow(); RenderFrame(0);
    }
    private void Update()
    {
      if (!focused || GameFlow.Paused || MutantRuntime.Blocked || SettingsScreen.Open) return;
      if(ManualStepping&&Race==null)return;
      UpdateAirControl();
      if (Race != null) { UpdateRace(); return; }
      if (input.ConsumeRestart()) { ResetVehicle(); return; }
      CurrentInput = input.Read();
      runner.Advance(Time.deltaTime, _ =>
      {
        previousSteer = Simulation.Engine.SteeringAngle;
        if (trace.Count < 7200) trace.Add(CurrentInput);
        return CurrentInput;
      },()=>{if(MutantRuntime.Active){bool go=MutantRuntime.AfterPhysics(Simulation,world);parameters=Simulation.Parameters;return go;}
        if(GarageSession.DriveActive){var v=Simulation.Body.Velocity;pendingProfileKm+=JsMath.Hypot(v.X,v.Z)*PowertrainVehicle.FixedDelta/1000;
        if(Simulation.Body.Steps%1200==0)FlushProfileDistance();}return true;});
      frameSeconds = Mathf.Lerp(frameSeconds, Time.unscaledDeltaTime, .05f);
    }
    private void LateUpdate() { RenderFrame(Mathf.Min(Time.unscaledDeltaTime, .1f));if(opponentVisual && Opponent!=null){if(opponentSource)opponentSource.Pose(GtPresentation.Position(Opponent.Vehicle.ReferencePoint),GtPresentation.Rotation(Opponent.Vehicle.Body.Orientation),Opponent.Vehicle,Opponent.Vehicle.Body,Opponent.Vehicle.Body,1,false);else opponentVisual.SetPositionAndRotation(GtPresentation.Position(Opponent.Vehicle.Body.Position),GtPresentation.Rotation(Opponent.Vehicle.Body.Orientation));} }
    public void TeleportWorld(int index){if(OpenTerrain==null||index<0||index>=OpenTerrain.Region.Teleports.Length)return;openSpawn=index;ResetVehicle();}
    public void StepWorld(DrivingInput value)
    {
      if(Race!=null||GameFlow.Paused||MutantRuntime.Blocked)return;
      CurrentInput=value;previousSteer=Simulation.Engine.SteeringAngle;Simulation.Step(value);
      if(MutantRuntime.Active){MutantRuntime.AfterPhysics(Simulation,world);parameters=Simulation.Parameters;}
      runner.SyncPrevious();
    }
    private void CreateOpponent()
    {
      Opponent=null;if(opponentVisual){opponentVisual.gameObject.SetActive(false);Destroy(opponentVisual.gameObject);}
      if(MutantRuntime.Active)
      {
        var plan=MutantRuntime.RacePlan;if(plan==null||plan.Opponent==null)return;
        var spec=plan.Opponent;var opSetup=GarageSession.Catalog.Setup((int)spec["arac"].N(),spec["parca"].Items.Select(x=>x.S()));
        var opMutant=OpponentRacer.CreateMutantSetup(GarageSession.Catalog,opSetup,spec["pasif"].Items.Select(x=>x.S()));
        var opParameters=GarageSession.Catalog.CreatePhysics(opMutant);MutantRuntime.OpponentLink=new MutantOpponentLink(GarageSession.Catalog,opMutant);
        var spawn=plan.OpponentStart();var mutantWorld=plan.Track.IsStreet?new TrackWorld(plan.Track,WorldData.Catalog){GripMultiplier=RaceWorld.GripMultiplier}:new TrackWorld(plan.Track){Environment=RaceWorld.Environment,GripMultiplier=RaceWorld.GripMultiplier};
        Opponent=new OpponentRacer(opParameters,mutantWorld,plan.Track,plan.Event,WorldData.Opponents.Plan(plan.Track.Key,spec["kisilik"].S()),(uint)spec["tohum"].N(),spawn.X,spawn.Z,spawn.Heading);
        CreateOpponentVisual(opSetup.Car["k"].S());return;
      }
      if(!WorldData.OpponentTest)return;
      var info=Race.Event;var track=RaceWorld.Track;var g=track.Geometry;int i=g.Nearest(info.StartX,info.StartZ,0,true).Index;
      var opWorld=new TrackWorld(track){Environment=RaceWorld.Environment,GripMultiplier=RaceWorld.GripMultiplier};
      var opponentParameters=raceDrive.Setup!=null?OpponentRacer.CreateParameters(GarageSession.Catalog,raceDrive.Setup,info.Type):parameters;
      Opponent=new OpponentRacer(opponentParameters,opWorld,track,info,WorldData.Opponents.Plan(track.Key),731,info.StartX+g.Tz[i]*OpponentRacer.GridOffset,info.StartZ-g.Tx[i]*OpponentRacer.GridOffset,info.StartHeading);
      CreateOpponentVisual(AppliedGarageCarId);
    }
    private void CreateOpponentVisual(string key){opponentSource=SourceVehicleView.Create(key,transform);if(opponentSource){opponentVisual=opponentSource.transform;return;}var o=GameObject.CreatePrimitive(PrimitiveType.Cube);o.name="Fiziksel YZ rakip";o.GetComponent<Collider>().enabled=false;Destroy(o.GetComponent<Collider>());o.transform.localScale=new Vector3((float)parameters.Chassis.Width,.7f,(float)(parameters.Chassis.Wheelbase+1.69));o.GetComponent<Renderer>().material.color=new Color(.1f,.45f,.9f);opponentVisual=o.transform;}
    public string OpponentText()
    {
      if(Opponent==null)return "";var rank=Opponent.Rank(Race.Session.Lap,RaceWorld.Hint,Race.Session.Armed!=0);
      if(Race.Session.State==RaceState.Finished)return Opponent.PlayerWon(Race.Session.Time)?"Rakipten önce bitirdin • doğrulama yarışı, kariyer ödülü yok":"Rakip önce bitirdi • doğrulama yarışı, kariyer ödülü yok";
      return "Sıra "+rank.Rank+" / 2 • fark "+(double.IsInfinity(rank.Gap)?"rakip bitti":rank.Gap.ToString("0.0")+" m");
    }
    // TS sahneGuncelle kamera girdileri: kip/FOV/sarsıntı tercihi, drift, nitro, skill görüşü (beceriEfektDurumu), çarpma anı.
    private CameraFrame CameraFrame()
    {
      var s=PlayerPreferences.Current;var c=new CameraFrame{Mode=s.Camera,SpeedFov=s.On("fov"),Shake=s.On("shk"),Drifting=Simulation.Assist.On,
        HitAge=(float)(Simulation.Body.Steps*PowertrainVehicle.FixedDelta-Simulation.Body.LastHitTime),FrontAxle=(float)System.Math.Abs(parameters.Chassis.Wheels[0].Z)};
      var a=MutantRuntime.Abilities;
      if(a!=null)
      {
        var y=MutantRuntime.Run.State["bec"]["yerel"];bool Open(string id)=>y[id]["kalan"].N()>0;
        c.Nitro=a.Nitro().Open;c.SkillFov=(Open("grappling-hook")?6:0)+(Open("risk-taker")?5:0)+(Open("slipstream-engine")||Open("volt-kanat")?4:0);
      }
      if(SourceVehicle){c.HasSourceEye=true;c.SourceEye=SourceVehicle.Eye;}
      return c;
    }
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
      string sourceKey=AppliedGarageCarId!=""?AppliedGarageCarId:terrainMode?"rl":"gt";
      if(sourceKey!=sourceCarKey&&SourceVehicle){SourceVehicle.gameObject.SetActive(false);Destroy(SourceVehicle.gameObject);SourceVehicle=null;}
      if(!SourceVehicle){SourceVehicle=SourceVehicleView.Create(sourceKey,transform);sourceCarKey=sourceKey;}
      if(SourceVehicle)
      {
        foreach(var renderer in vehicleRoot.GetComponentsInChildren<Renderer>())renderer.enabled=false;
        SourceVehicle.Pose(origin,vehicleRoot.rotation,Simulation,a,b,alpha,PlayerPreferences.Current.Camera==3);
      }
      string environmentKey=RaceTrack!=""?RaceTrack:OpenTerrain?.Region.Key??"hub";
      if(!SourceEnvironment){SourceEnvironment=gameObject.AddComponent<SourceEnvironmentView>();SourceEnvironment.Configure(this,environmentKey,Conditions);}
      else if(SourceEnvironment.Key!=environmentKey||SourceEnvironment.ConditionsKey!=(Conditions.Night?"night":Conditions.TimeOfDay)+"/"+Conditions.Weather)SourceEnvironment.Configure(this,environmentKey,Conditions);
      followCamera.Render(origin, vehicleRoot.rotation, (float)b.Velocity.Length, dt, CameraFrame());
      // Sonsuz H=0 zeminin yalnız görsel döşemesi; simülasyona geri besleme yok.
      if(!terrainMode && ground)ground.position = new Vector3(vehicleRoot.position.x, 0, vehicleRoot.position.z);
    }
    // Geçici hayalet görseli: kayıtlı sürüşün ayrı fizikteki gövdesi (kutu).
    private Transform ghostView;private SourceVehicleView ghostSource;
    /// Rekor hayaleti şu an çizilir mi (kayıt var ve "rh" tercihi açık).
    public bool GhostShown => Race?.Ghost != null && PlayerPreferences.Current.On("rh");
    private void RenderGhost()
    {
      var ghost = GhostShown ? Race.Ghost : null;
      if (ghost == null) { if (ghostView) ghostView.gameObject.SetActive(false); return; }
      string ghostKey=GarageSession.Catalog.Data["cars"][ghost.Record.Car]["k"].S();
      if(ghostSource&&ghostSource.Scene.Data.key!=ghostKey){ghostView.gameObject.SetActive(false);Destroy(ghostView.gameObject);ghostView=null;ghostSource=null;}
      if (!ghostView)
      {
        ghostSource=SourceVehicleView.Create(ghostKey,transform);
        if(ghostSource){ghostView=ghostSource.transform;ghostSource.Scene.SetGhost(true);}
        else{
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube); go.name = "Rekor hayaleti"; var col = go.GetComponent<Collider>(); if (col) Destroy(col);
        go.transform.SetParent(transform, false); go.transform.localScale = new Vector3(1.8f, 1.1f, 4.3f);
        if (trackVisuals && trackVisuals.GhostMaterial) go.GetComponent<Renderer>().sharedMaterial = trackVisuals.GhostMaterial;
        ghostView = go.transform;
        }
      }
      ghostView.gameObject.SetActive(true);
      var b = ghost.Vehicle.Body;
      if(ghostSource)ghostSource.Pose(GtPresentation.Position(ghost.Vehicle.ReferencePoint),GtPresentation.Rotation(b.Orientation),ghost.Vehicle,b,b,1,false);
      else ghostView.SetPositionAndRotation(GtPresentation.Position(b.Position), GtPresentation.Rotation(b.Orientation));
    }
    // ---------- Yarış kipi: TS pist dünyası + yarış oturumu (RaceRun); kural ve ödül saf katmanda/garaj oturumunda.
    private void AwakeRace()
    {
      if (!vehicleRoot || !followCamera || !trackVisuals) throw new InvalidOperationException("RaceTest sahnesi eksik; Last Turn menüsünden sahneyi oluşturun.");
      input = new GtKeyboardInput(); BindMutantInput(); BindTouch();
      InitializeRace(string.IsNullOrEmpty(RaceData.Selected) ? raceTrack : RaceData.Selected);
    }
    /// Garaj oturumundan araç/kariyer/ödül bağını kurup yarışı baştan hazırlar (doğrulama ayrı profil açınca da çağırır).
    public void InitializeRace() => InitializeRace(RaceTrack);
    public void InitializeRace(string key)
    {
      FlushProfileDistance();observedRaceKm=0;
      var data = RaceData.Load();var mutant=MutantRuntime.Active?MutantRuntime.RacePlan:null;
      var info = mutant!=null?mutant.Event:data.Event(key); var track = mutant!=null?mutant.Track:data.Tracks.Tracks[info.Index];
      // Mutant planı sahnenin varsayılan gp_1 kimliğini de geçersiz kılar; görsel önbellek gerçek pistle eşleşir.
      if(mutant!=null)key=track.Key;
      if (key != RaceTrack) { trackVisuals.Build(track,mutant?.World); RaceTrack = key; }
      var drive = mutant!=null?new GarageRace.Drive{Parameters=MutantRuntime.Session.BuildPhysics(),Setup=MutantRuntime.Session.BuildSetup(),Car=MutantRuntime.Car,Career=false,Message="Mutant koşusu"}:GarageRace.Prepare(info);
      parameters = drive.Parameters ?? GtPrototypeParameters.Create(); RaceMessage = drive.Message;
      AppliedGarageCarId = "";
      if (drive.Setup != null && drive.Parameters != null)
      {
        AppliedGarageCarId = drive.Setup.Car["k"].S();
        // Görsel uyarlama parça konumlarını kaydırır: aynı sahnede bir kez.
        if (visualCar == "") { ApplyGarageVisuals(drive.Setup); visualCar = AppliedGarageCarId; }
      }
      RaceWorld = mutant!=null?mutant.World:new TrackWorld(track); world = RaceWorld;
      // TS COND/havaTutusu: bölge teması + seçili hava; Mutant boss kendi havasını/gecesini dayatır (TS mutantBossKosulu).
      Conditions = mutant!=null&&mutant.Boss?GameFlow.Conditions.ForBoss(MutantRuntime.Run.State["boss"]):GameFlow.Conditions.Clone();
      RaceWorld.GripMultiplier = Conditions.GripFor(RaceConditions.Theme(info.Region));
      if(mutant==null)RaceWorld.Environment=WorldData.Catalog.Activate(key);
      if(!EnvironmentVisuals)EnvironmentVisuals=gameObject.AddComponent<PhysicalWorldVisuals>();EnvironmentVisuals.Build(world,RaceWorld.Environment,false);
      // İlk görsel örnek yalnız rl_2 öğle/güneşte (Cem değerlendirmesi); başka pistte/koşulda eski görünüm geri gelir.
      if(VisualSample){VisualSample.Remove();VisualSample=null;}
      if(!Resources.Load<TextAsset>("SourcePresentation/world-"+track.Key)&&RallyVisualSample.AppliesTo(track.Key,Conditions,mutant!=null))VisualSample=RallyVisualSample.Apply(this,trackVisuals,EnvironmentVisuals,RaceWorld,followCamera.GetComponent<Camera>());
      Simulation = new PowertrainVehicle(parameters, world: world); runner = new PowertrainFixedStepRunner(Simulation); ApplyPreferences(); ResetInput();
      Race = new RaceRun(Simulation, RaceWorld, info, hint => new RaceSession(info, track, drive.Career, hint, drive.Career ? GarageRace.Reward : null,
        mutant!=null?(Action<double>)(metres=>MutantRuntime.Run.CutPenalty(metres)):null,mutant:mutant!=null),
        drive.Setup != null && drive.Parameters != null ? RaceDrift.MaxAngle(drive.Setup) : double.PositiveInfinity);
      // TS startEvent: kullanım sayacı ve rekor hayaleti; endEvent: rekor/profil/hayalet kaydı.
      Race.Finished += run => {ResetInput();if(mutant!=null)MutantRuntime.Finished(run,Opponent);else{FlushProfileDistance();GarageRace.Finished(run, drive);}};
      // TS rekorHayaletiBaslat/uzakAdimi: kayıt varsa hayalet her zaman yarışla eş adımlı oynar (kaydedildiği havanın
      // tutuşuyla); set.rh yalnız anlık görünürlüğü belirler, yarış ortasında açılıp kapanabilir.
      if(mutant==null){Race.GhostFactory = () => GarageRace.Ghost(info, track, Race.Session.RecordKey, RaceWorld.GripMultiplier); Race.StartGhost();}
      RecordText = mutant!=null?"Mutant koşusu":RaceRecordText(); if (drive.Parameters != null&&mutant==null) GarageRace.Started(drive.Car); raceDrive = drive;
      // TS mutantYarisAyari → beceriYarisBasi: rakip gövdesi, takip kredisi ve near-miss kayıtları her yarış başında sıfırlanır.
      if(mutant!=null)MutantRuntime.Abilities?.RaceStart();
      CreateOpponent();
      runner.SyncPrevious(); previousSteer = 0; followCamera.ResetFollow(); RenderFrame(0);
    }
    private void UpdateRace()
    {
      if (input.ConsumeRestart()) { RestartRace(); return; }
      CurrentInput = input.Read();
      if (ManualStepping) return;
      if (Race.Session.State == RaceState.Countdown)
      {
        // Geri sayım sabit adımla; drag manuelde motor devri bu sırada gazla tutulur (araç durur).
        countdownTime += Math.Min(Time.deltaTime, .1);
        while (countdownTime >= PowertrainVehicle.FixedDelta && Race.Session.State == RaceState.Countdown)
        { Race.TickCountdown(PowertrainVehicle.FixedDelta, CurrentInput); Opponent?.Step(false); countdownTime -= PowertrainVehicle.FixedDelta; }
        return;
      }
      countdownTime = 0;
      if (Race.Session.State != RaceState.Running) return;
      runner.Advance(Time.deltaTime, _ =>
      {
        previousSteer = Simulation.Engine.SteeringAngle; var i = CurrentInput; int shift = input.ConsumeShift();
        lastQuantized = Race.Record(new DrivingInput(i.Throttle, i.Brake, i.Steering, i.AnalogThrottle, i.AnalogSteering, i.Handbrake, shift));
        return lastQuantized;
      }, AfterRaceStep);
      frameSeconds = Mathf.Lerp(frameSeconds, Time.unscaledDeltaTime, .05f);
    }
    private DrivingInput lastQuantized; private double countdownTime;
    private bool AfterRaceStep()
    {
      bool mutantContinue=true;
      if(mutantDrive){mutantContinue=MutantRuntime.AfterPhysics(Simulation,world,true,Opponent);parameters=Simulation.Parameters;}
      int teleports = Race.Teleports; Race.AfterPhysicsStep(lastQuantized);
      Opponent?.Step();
      ObserveRaceDistance();if(Simulation.Body.Steps%1200==0)FlushProfileDistance();
      if (Race.Teleports != teleports) { runner.SyncPrevious(); followCamera.ResetFollow(); }
      return Race.PhysicsRunning&&mutantContinue;
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
    public void RestartRace() { if(mutantDrive){InitializeRace(MutantRuntime.RacePlan.Track.Key);return;}FlushProfileDistance();if (raceDrive != null && raceDrive.Parameters != null) GarageRace.Started(raceDrive.Car); Race.Restart();CreateOpponent(); observedRaceKm=0;RecordText = RaceRecordText(); runner.SyncPrevious(); previousSteer = 0; followCamera.ResetFollow(); RenderFrame(0); RestartCount++; }
    /// Doğrulama: bir sabit adım (geri sayımda 1/60 sn sayaç, yarışta fizik + yarış adımı).
    public void StepRace(DrivingInput value)
    {
      if(GameFlow.Paused||MutantRuntime.Blocked)return;
      CurrentInput = value;
      if (Race.Session.State == RaceState.Countdown) { Race.TickCountdown(PowertrainVehicle.FixedDelta, value); Opponent?.Step(false); return; }
      if (Race.Session.State != RaceState.Running) return;
      previousSteer = Simulation.Engine.SteeringAngle;
      if(mutantDrive){var q=Race.Record(value);Simulation.Step(q);MutantRuntime.AfterPhysics(Simulation,world,true,Opponent);parameters=Simulation.Parameters;Race.AfterPhysicsStep(q);}else Race.Step(value);
      Opponent?.Step();ObserveRaceDistance();if(Simulation.Body.Steps%1200==0)FlushProfileDistance();runner.SyncPrevious();
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
      // Mutant açık dünyasında koşu durum çubuğu kullanılır; telemetri yalnız GT/arazi/serbest sürüşte ve ortak Info alanında.
      if (Simulation == null || GameFlow.Paused || Race!=null || MutantRuntime.Active || SettingsScreen.Open || !Hud.TryGet(this,"Info",out var info)) { TelemetryBottom = 0; return; }
      if (title == null)
      {
        title = new GUIStyle(GUI.skin.label) { fontSize = 13, fontStyle = FontStyle.Bold, normal = { textColor = new Color(.95f,.32f,.2f) } };
        digits = new GUIStyle(GUI.skin.label) { fontSize = 34, fontStyle = FontStyle.Bold, normal = { textColor = Color.white } };
        text = new GUIStyle(GUI.skin.label) { fontSize = 13, normal = { textColor = new Color(.86f,.89f,.92f) } };
      }
      bool terrainPanel=terrainMode && OpenTerrain==null; var old = GUI.matrix; float scale = Mathf.Clamp(Mathf.Min(info.width/314f,info.height/(terrainPanel?383f:216f)),.45f,1.6f);
      GUI.matrix = Matrix4x4.TRS(new Vector3(info.x-14*scale,info.y-14*scale,0),Quaternion.identity,new Vector3(scale,scale,1)); TelemetryBottom = info.y + (terrainPanel?369:202)*scale;
      GUI.Box(new Rect(14,14,300,202), GUIContent.none);
      GUI.Label(new Rect(28,23,270,22),OpenTerrain!=null?"LAST TURN  /  "+OpenTerrain.Region.Name:terrainMode?"LAST TURN  /  ARAZİ TESTİ":"LAST TURN  /  GT TEST",title);
      var s = Simulation.Body; var e = Simulation.Engine;
      GUI.Label(new Rect(26,42,220,48),$"{s.Velocity.Length*3.6:0} km/sa",digits);
      GUI.Label(new Rect(235,51,65,38),e.Gear<0?"R":e.Gear.ToString(),digits);
      GUI.Label(new Rect(28,93,275,22),$"{e.Rpm:0} RPM   •   OTOMATİK   •   Turbo %{e.Turbo*100:0}",text);
      int contacts = 0; foreach(var wheel in s.Wheels) if(wheel.Contact) contacts++;
      GUI.Label(new Rect(28,116,275,22),$"Temas {contacts}/4   Ön {s.FrontLoad/1000:0.0} / Arka {s.RearLoad/1000:0.0} kN",text);
      GUI.Label(new Rect(28,139,275,22),$"60 Hz × 8  |  Adım {s.Steps}  |  {1/Mathf.Max(.001f,frameSeconds):0} FPS",text);
      GUI.Label(new Rect(28,161,275,22),$"Gaz %{CurrentInput.Throttle*100:0}  Fren %{CurrentInput.Brake*100:0}  El freni {(CurrentInput.Handbrake?"AÇIK":"—")}",text);
      GUI.Label(new Rect(28,185,275,22),focused?(OpenTerrain!=null?VehicleGround.Name(s.CenterSurface)+" · kaynak dünya":terrainMode?VehicleGround.Name(s.CenterSurface)+" · TS toprak dengesi":"Düz asfalt · klavye testi"):"Duraklatıldı · pencereye dönün",text);
      if(terrainMode && OpenTerrain==null)
      {
        GUI.Box(new Rect(14,225,350,158),GUIContent.none);
        GUI.Label(new Rect(28,234,325,22),$"Z {s.Position.Z:0.0} m · Y {s.Position.Y:0.00} m · Dikey {s.Velocity.Y:0.0} m/sn",text);
        for(int i=0;i<4;i++)
        {
          var wheel=s.Wheels[i];string corner=new[]{"Ön sol","Ön sağ","Arka sol","Arka sağ"}[i];
          GUI.Label(new Rect(28,258+i*23,325,22),$"{corner}: {VehicleGround.Name(wheel.SurfaceIndex)} · {(wheel.Contact?"TEMAS":"HAVA")} · {wheel.Compression*100:0.0} cm",text);
        }
        GUI.Label(new Rect(28,351,325,22),"20–60 tepe · 70–90 tümsek · 105–120 rampa",text);
        GUI.Label(new Rect(28,372,325,22),"Sol şerit TOPRAK (x ≥ 4) · Sağ ASFALT · R başa",text);
      }
      GUI.matrix = old;
      if (Hud.TryGet(this,"Hint",out var hint)) GUI.Label(hint,"W/↑ gaz · S/↓ fren ve geri · A/D dönüş · Boşluk/C el freni · R başlangıç",text);
      GUI.matrix = Matrix4x4.TRS(new Vector3(info.x-14*scale,info.y-14*scale,0),Quaternion.identity,new Vector3(scale,scale,1));
      GUI.matrix = old;
    }
  }
}
