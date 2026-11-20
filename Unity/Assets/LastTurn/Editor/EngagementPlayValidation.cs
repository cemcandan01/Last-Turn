using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using LastTurn.Ui;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;

namespace LastTurn.EditorValidation
{
  // Ayrı ürün/kayıt dizininde gerçek fizik + UI Toolkit çizimi. İnsan sürüş kabulü değildir.
  [InitializeOnLoad]
  public static class EngagementPlayValidation
  {
    private const string Active="LastTurn.Engagement.Active";
    private const string Pacing="LastTurn.Engagement.Pacing";
    private const string Traffic="LastTurn.Engagement.Traffic";
    [Serializable] private sealed class Source {public string path,hash;}
    [Serializable] private sealed class Proof {public string result,utc,error;public List<string> checks=new List<string>(),images=new List<string>(),errors=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index,stepped;
    private static double began,at,shotAt;private static string shot;private static int width;private static RenderTexture target;
    private static RaceTestDriver driver;
    private static Keyboard keyboard;
    private static Gamepad gamepad;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    private static GtPrototype P=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    static EngagementPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartBatch()=>Begin(false);
    public static void StartPacingBatch()=>Begin(true);
    public static void StartTrafficBatch()=>Begin(false,true);
    private static void Begin(bool pacing,bool traffic=false)
    {
      if(!Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Application.companyName!="LastTurnPitUiValidation"||!Environment.GetCommandLineArgs().Contains("-lastTurnUiValidation"))throw new InvalidOperationException("Ayrı doğrulama ürünü gerekir.");
      foreach(var type in typeof(EngagementPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation"))
      {var f=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(f!=null&&f.IsLiteral&&f.FieldType==typeof(string))SessionState.SetBool((string)f.GetRawConstantValue(),false);}
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;
      InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      SessionState.SetBool(Pacing,pacing);SessionState.SetBool(Traffic,traffic);GarageSceneBuilder.Open();SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){proof=new Proof();index=stepped=0;steps.Clear();began=at=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;}
      if(state==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;}
    }
    private static void Logged(string text,string stack,LogType type){if(type==LogType.Error||type==LogType.Exception||type==LogType.Assert)proof.errors.Add(text);}
    private static void Check(bool yes,string text){if(!yes)throw new InvalidOperationException(text);proof.checks.Add(text);}
    private static void Add(Action action)=>steps.Add(action);
    private static void Wait(Func<bool> ready)=>Add(()=>{if(!ready())index--;});
    private static void Shots(string name,params int[] sizes)
    {
      foreach(int w in sizes.Length==0?new[]{1280,1920}:sizes)Add(()=>{width=w;target=new RenderTexture(w,w*9/16,24,RenderTextureFormat.ARGB32);UiRoot.Instance.Settings.clearColor=true;UiRoot.Instance.Settings.colorClearValue=Color.clear;UiRoot.Instance.Settings.targetTexture=target;Hud.SizeOverride=new Vector2(w,w*9/16);shot=(Environment.GetCommandLineArgs().Contains("-duelProof") && name.StartsWith("traffic-") ? "duel-"+name.Substring(8) : name)+"-"+w;shotAt=EditorApplication.timeSinceStartup;});
    }
    private static void SetupPacing()
    {
      string dir=Path.Combine(Project,"Logs/Pacing/"+Guid.NewGuid().ToString("N"));GarageSession.Open(Path.Combine(dir,"garage.json"),true);MutantRuntime.RecordDirectory=Path.Combine(dir,"mutant");
      GameFlow.MainMenu();Add(()=>MutantRuntime.Start(53));Wait(()=>MutantStartView.Instance&&MutantStartView.Instance.Visible);
      Add(()=>{MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Run.State["secenekler"][0].S());});
      Wait(()=>P&&P.Simulation!=null&&P.Race==null&&MutantHudView.Instance&&MutantHudView.Instance.Visible);
      Add(()=>MutantRuntime.Session.Missions.Active=new MutantRoadMission{Kind="hiz",Progress=40,Target=115,Remaining=25});
      Add(()=>{Check(UiRoot.Instance.Hud.Q<Label>("mh-navigation").text.StartsWith("Etkinlik "),"Yakın etkinlik gerçek HUD'da");Check(UiRoot.Instance.Hud.Q<Label>("mh-mission").text.Contains("40 / 115"),"Görev ve etkinlik birlikte");Check(UnityEngine.Object.FindFirstObjectByType<MiniMapView>().Markers==10,"Miniharitada 8 etkinlik + atölye + boss; sandık yok");});
      Shots("pacing-world",1280,1920,3840);
      Add(()=>{var r=MutantRuntime.Run;r.EnterBoss();r.FinishBoss(true);while(r.State["faz"].S()=="secim")r.Choose(r.State["secenekler"][0].S());MutantRuntime.OpenWorld();});
      Wait(()=>P&&P.Simulation!=null&&P.OpenTerrain!=null&&P.OpenTerrain.Region.Key=="city"&&MutantHudView.Instance&&MutantHudView.Instance.Visible);
      Add(()=>MutantRuntime.Session.Missions.Active=new MutantRoadMission{Kind="kilpayi",Progress=1,Target=4,Remaining=25});
      Add(()=>{Check(UiRoot.Instance.Hud.Q<Label>("mh-navigation").text.StartsWith("Etkinlik "),"Şehirde görünür etkinlik havuzu");Check(UnityEngine.Object.FindFirstObjectByType<MiniMapView>().Markers==10,"Şehir miniharitasında gizli sandık yok");});Shots("pacing-city",1280,1920);
      Add(()=>{var reward=MutantRoadMissions.Reward(MutantRuntime.Run.Region);MutantRuntime.Run.State["mek"].Set("enerji",CatalogNode.Num(90));MutantRuntime.Session.Missions.Active=new MutantRoadMission{Kind="hiz",Target=1,Progress=1,Remaining=25,Money=reward.Money,Energy=reward.Energy};});
      Add(()=>{Check(MutantRuntime.Session.Missions.Completed==1,"Gerçek fizik sonrası görev tamamlandı");var feedback=MutantRuntime.HudFeedback.Text;Check(feedback.Contains("+49 para")&&feedback.Contains("+10 enerji"),"Runtime kapasiteye sığan gerçek ödülü bildirdi");Check(UiRoot.Instance.Hud.Q<Label>("mh-notice").text==feedback,"Gerçek HUD ödül bandı");Check(MutantRuntime.Message=="","Görev mesajı kalıcı panel mesajı olmaz");Check(MutantRuntime.Run.State["mek"]["enerji"].N()==100,"Enerji kapasitesi aşılmadı");});Shots("pacing-reward",1280);
      Add(()=>{while(!MutantRuntime.Run.Finished)MutantRuntime.Run.Damage("carpma");typeof(MutantRuntime).GetProperty("Panel").SetValue(null,"summary");});
      Wait(()=>MutantSummaryView.Instance&&MutantSummaryView.Instance.Visible);
      Add(()=>{Check(UiRoot.Instance.Root.Q<Label>("summary-stats").text.Contains("1 yol görevi"),"Koşu özetinde gerçek yol görevi sayısı");Check(UiRoot.Instance.Root.Q<Label>("summary-notice").text=="","Pert özetinde eski görev mesajı yok");});Shots("pacing-summary",1280,1920);
      Add(()=>Check(proof.errors.Count==0,"Dolaşım çalışma anı hata yok"));
    }
    private static void CheckDuel()
    {
      var player=P.SourceVehicle.Scene;
      var rival=P.OpponentVisual.GetComponent<SourceVehicleView>().Scene;
      Check(player.TailLamp && rival.TailLamp && player.TailLamp!=rival.TailLamp,"Her araç kendi stop lambasını kullanır");
      Check(player.Glass.Any(m=>m.IsKeywordEnabled("VEHICLE_FINISH")) &&
            !ShaderUtil.ShaderHasError(player.Glass[0].shader),"Araç camı cila shaderı derlendi");
      OpponentTrafficCar At(double x,double z,double y=0,double heading=0) =>
        new OpponentTrafficCar(x,y,z,0,0,heading,1.8,4.4);
      RivalSide Side(OpponentTrafficCar other,RivalSide last=RivalSide.Clear) =>
        RaceSpotter.Read(At(0,0),other,last);
      Check(Side(At(3,0))==RivalSide.Left && Side(At(-3,0))==RivalSide.Right,"Sürücünün iki yanındaki rakip ayırt edildi");
      Check(Side(At(3,-7))==RivalSide.Clear && Side(At(3,-7),RivalSide.Left)==RivalSide.Left,"Kenar titreşimini önleyen giriş ve çıkış mesafeleri");
      Check(Side(At(0,-3))==RivalSide.Clear && Side(At(3,0,4))==RivalSide.Clear &&
            Side(At(3,0,0,Math.PI))==RivalSide.Clear,"Arkada, üst katta ve ters yönde uyarı kapalı");
      P.StepRace(new DrivingInput(0,.8,0,true,true));
      Check(P.Simulation.Engine.BrakeLights,"Gerçek fren girdisi stop sinyali verdi");
    }

    private static bool AtelierProof=>Environment.GetCommandLineArgs().Contains("-atelierProof");
    private static void SetupAtelier()
    {
      string path=Path.Combine(Project,"Logs/Atelier",Guid.NewGuid().ToString("N"),"garage.json");
      GarageSession.Open(path,true);
      int id=GarageSession.State.SelectedCar;
      var balance=GarageSession.State.Balance;var equipped=GarageSession.State.Equipped(id);
      VisualElement Element(string name)=>UiRoot.Instance.Root.Q(name);
      void Choose(string name)
      {
        var control=Element(name);
        Check(control!=null && control.enabledInHierarchy,name+" etkin");
        var point=control.worldBound.center;
        using(var down=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=point}))control.SendEvent(down);
        using(var up=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=point}))control.SendEvent(up);
      }
      void Open()=>Choose("open-styling");
      Wait(()=>GarageView.Instance && UnityEngine.Object.FindFirstObjectByType<GarageScreen>());
      Add(()=>{GameFlow.RaceMenu();GameFlow.Browse(1);});
      foreach(var car in GarageSession.Catalog.Data["cars"].Items)
      {
        string model=car["k"].S();
        Add(()=>{
          var holder=new GameObject("Atölye model testi");holder.SetActive(false);
          try
          {
            var view=SourceVehicleView.Create(model,holder.transform);
            Check(view && view.Scene.BodyShell && view.Scene.PaintSurfaces.Contains(view.Scene.BodyShell),model+" boyanabilir karoser");
            var stock=view.Scene.BodyShell.sharedMaterial;
            foreach(int type in new[]{1,2,3})
            {
              CarStyling.Show(view,new CarAppearance{Wing=type,Fender=0x123457,Graphic=type});
              var addon=view.Scene.BodyShell.GetComponentsInChildren<MeshFilter>(true).Single(f=>f.name=="Atölye · spoiler" && f.gameObject.activeSelf);
              Check(addon.sharedMesh.vertexCount>=24 && view.Scene.FactoryWing.All(r=>!r.enabled),model+" takılı spoiler "+type);
            }
            CarStyling.Show(view,default);
            Check(view.Scene.BodyShell.sharedMaterial==stock && view.Scene.FactoryWing.All(r=>r.enabled),model+" fabrika görünümü geri alındı");
          }
          finally{UnityEngine.Object.Destroy(holder);}
        });
      }
      Wait(()=>GarageView.Instance && GarageView.Instance.Modifying);
      Add(Open);Add(()=>Check(Element("wing-3")!=null,"Atölye açıldı"));
      Add(()=>Choose("wing-3"));Add(()=>Choose("graphic-1"));Add(()=>Choose("swatch-F16930"));
      Add(()=>Choose("paint-layer-1"));Add(()=>Choose("swatch-252C34"));
      Add(()=>Choose("paint-layer-2"));Add(()=>Choose("swatch-E8E5DC"));
      Add(()=>{((SliderInt)Element("style-position")).value=1;((SliderInt)Element("style-scale")).value=1;
        Check(GarageSession.State.Appearance(id).IsStock,"Önizleme kaydı değiştirmedi");});
      Shots("atelier-preview",1280,1920);
      Add(()=>Choose("style-save"));
      var expected=new CarAppearance{Paint=0xF16931,Fender=0x252C35,Ink=0xE8E5DD,Wing=3,Graphic=1,Shift=1,Scale=1};
      Add(()=>{Check(GarageSession.State.Appearance(id).Equals(expected),"Seçilen yedi alan kaydedildi");
        GarageSession.Open(path,true);Check(GarageSession.State.Appearance(id).Equals(expected),"Diskten geri yüklenen araç tasarımı");
        Check(GarageSession.State.Balance==balance && equipped.SequenceEqual(GarageSession.State.Equipped(id)),"Bakiye ve takılı performans parçaları korundu");
        Check(GarageSession.State.Appearance(id==0?1:0).IsStock,"Başka aracın görünümü bağımsız");});
      Add(Open);Add(()=>Choose("graphic-2"));Add(()=>Choose("swatch-2863BF"));Add(()=>Choose("wing-2"));
      Shots("atelier-side",1280);
      Add(()=>Choose("style-reset"));Add(()=>Choose("style-cancel"));
      Add(()=>{Check(GarageSession.State.Appearance(id).Equals(expected),"Vazgeç fabrika taslağını attı");Check(TestPanelActions.StartRace("gp_1"),"Atölyeden sonra normal yarış açıldı");});
      Wait(()=>P && P.SourceVehicle && P.Race!=null);
      Add(()=>{var scene=P.SourceVehicle.Scene;var shader=Resources.Load<Shader>("SourcePresentation/CarLivery");
        Check(shader && !ShaderUtil.ShaderHasError(shader) && scene.BodyShell.sharedMaterial.shader==shader,"Pistte özel boya ve desen shaderı");
        Check(scene.BodyShell.transform.Find("Atölye · spoiler") && scene.FactoryWing.All(r=>!r.enabled),"Pistte oyuncunun özel spoilerı");
        Check(proof.errors.Count==0,"Atölye ve yarış çalışma anı hatasız");});
      Shots("atelier-race",1280);
    }

    private static bool ChoicesProof=>Environment.GetCommandLineArgs().Contains("-choicesProof");
    private static bool BossPairsProof=>Environment.GetCommandLineArgs().Contains("-bossPairsProof");

    private static void SetupBossPairs()
    {
      string dir=Path.Combine(Project,"Logs/PairBoss",Guid.NewGuid().ToString("N"));
      GarageSession.Open(Path.Combine(dir,"garage.json"),true);
      var setups=new[]{Array.Empty<string>(),new[]{"aci","temiz-cikis"},new[]{"asfalt","fren"},new[]{"zirh","tamirci"}};
      string bossKey=null;int selected=-1;
      foreach(var pair in setups)
      {
        int ticks=0,activations=0;bool hasPair=pair.Length>0;
        Add(()=>{MutantRuntime.RecordDirectory=dir;MutantRuntime.Start(53);});
        Wait(()=>MutantStartView.Instance && MutantStartView.Instance.Visible);
        Add(()=>{
          var run=MutantRuntime.Run;
          run.State.Set("pasifler",CatalogNode.Arr(hasPair?new[]{CatalogNode.Str(pair[0])}:Array.Empty<CatalogNode>()));
          string offer=hasPair?pair[1]:"guc";
          run.State.Set("secenekler",CatalogNode.Arr(new[]{offer,"ogrenci","b:grappling-hook"}.Select(CatalogNode.Str)));
          int car=MutantRuntime.Model.StartingCarsCards[0].Id;if(selected<0)selected=car;
          Check(car==selected,"Aynı başlangıç aracı");MutantRuntime.SelectCar(car);
        });
        Add(()=>{
          if(hasPair)Check(UiRoot.Instance.Root.Query<Label>().ToList().Any(l=>l.text!=null && l.text.Contains(" sende.")),"Sahip olunan eş ödül kartında");
        });
        if(hasPair && pair[0]=="aci")Shots("mutant-ikili",1280);
        Add(()=>{Check(MutantRuntime.Choose(hasPair?pair[1]:"guc"),"Ödül normal seçim yolundan alındı");});
        Wait(()=>P && P.Simulation!=null && !MutantRuntime.Starting && !MutantRuntime.InRace);
        Add(()=>{
          var r=MutantRuntime.Run;
          if(!hasPair)r.State.Set("pasifler",CatalogNode.Arr(Array.Empty<CatalogNode>()));
          // Aynı tohum, asfalt boss'u ve ikiliden bağımsız aynı başlangıç enerjisi.
          r.State.Set("boss",r.Catalog["bosses"].Items.First(b=>b["ty"].S()=="gp").Clone());
          r.State["mek"].Set("enerji",CatalogNode.Num(40));
          MutantRuntime.StartRace(0,0,true);
        });
        Wait(()=>P && P.Race!=null && P.Opponent!=null && MutantRuntime.RacePlan.Boss);
        Add(()=>{
          P.ManualStepping=true;driver=RaceTestDriver.For("gp");P.Race.Session.TickCountdown(4);
          string key=P.RaceTrack+"/"+MutantRuntime.RacePlan.Opponent["tohum"].N();
          if(bossKey==null)bossKey=key;Check(key==bossKey,"Aynı boss, pist ve rakip tohumu "+key);
        });
        Add(()=>{
          for(int i=0;i<300 && !MutantRuntime.Blocked && P.Race.PhysicsRunning && ticks<15000;i++,ticks++){
            var input=driver.Input(P.Race);
            // Her kurulum aynı fren/manzara kaçınma hareketini aynı fizik adımında alır.
            if(ticks>=900 && ticks<930)input=new DrivingInput(0,.65,.42,true,true);
            P.StepRace(input);driver.RespawnIfStuck(P.Race);
            if(MutantRuntime.Abilities.Pairs.Notice!="")activations++;
          }
          if(P.Race.PhysicsRunning && !MutantRuntime.Blocked && ticks<15000){index--;return;}
          Check(ticks>100 && (MutantRuntime.Blocked || !P.Race.PhysicsRunning),"Boss sürüşü · "+(hasPair?string.Join("+",pair):"stok")+" · "+P.Race.Session.Time.ToString("0.00")+" sn · "+(MutantRuntime.ResultPassed==true?"kazandı":P.Race.PhysicsRunning?"pert":"kaybetti")+" · "+activations+" ikili bildirimi");
        });
        Add(()=>MutantRuntime.Exit());Wait(()=>SceneManagerName()=="Garage");
      }
      Add(()=>Check(proof.errors.Count==0,"Boss çalışma anı hatasız"));
    }
    private static void Click(string name){
      var e=UiRoot.Instance.Root.Q(name);
      Check(e!=null && e.enabledInHierarchy,name+" erişilebilir");
      var scroll=e.GetFirstAncestorOfType<ScrollView>();if(scroll!=null)scroll.ScrollTo(e);
      var point=e.worldBound.center;
      using(var down=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=point}))e.SendEvent(down);
      using(var up=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=point}))e.SendEvent(up);
    }
    private static void SetupChoices()
    {
      string path=Path.Combine(Project,"Logs/Choices",Guid.NewGuid().ToString("N"),"garage.json");
      GarageSession.Open(path,true);int id=GarageSession.State.SelectedCar;
      Wait(()=>GarageView.Instance && UnityEngine.Object.FindFirstObjectByType<GarageScreen>());
      Add(()=>{GameFlow.RaceMenu();GameFlow.Browse(1);});Wait(()=>GarageView.Instance.Modifying);
      Add(()=>Click("open-styling"));Add(()=>Click("swatch-2863BF"));
      Add(()=>{UiRoot.Instance.Root.Q<Foldout>("decal-foldout").value=true;
        GarageView.Instance.GetComponent<GarageVehiclePreview>().RotateBy(-65);});
      for(int i=0;i<3;i++){
        int slot=i;Add(()=>Click("decal-slot-"+slot));Add(()=>Click("decal-shape-"+(slot+1)));
      }
      Add(()=>Click("decal-slot-1"));Add(()=>Click("decal-mirror"));
      Add(()=>{var root=UiRoot.Instance.Root;root.Q<SliderInt>("decal-number").value=52;
        root.Q<SliderInt>("decal-angle").value=12;root.Q<SliderInt>("decal-size").value=2;});
      Add(()=>Click("swatch-E6BA47"));Add(()=>Click("decal-slot-2"));Add(()=>Click("swatch-209C8B"));
      Shots("katmanlar",1280,1920);
      Add(()=>Click("style-save"));Add(()=>{
        GarageSession.Open(path,true);var s=GarageSession.State.Appearance(id);
        Check(s.Bottom.Shape==1 && s.Middle.Shape==2 && s.Top.Shape==3 && s.Top.X<0,"Üç bağımsız katman diskte");
        Check(s.Middle.Angle==12 && s.Middle.Size==2 && s.Middle.Number==52 && s.Middle.Mirror && s.Middle.Color!=s.Top.Color,"Numara, dönüş, ölçek, ayna ve iki renk korundu");
        GameFlow.OpenRace("gp_1");});
      Wait(()=>RacePreparationView.Instance && RacePreparationView.Instance.Visible);
      Add(()=>Click("preparation-knockout"));Wait(()=>P && P.Field!=null && P.Field.Knockout);
      Add(()=>{P.ManualStepping=true;P.Race.Session.TickCountdown(4);Check(!P.Race.Session.Career && P.Race.Event.Laps==3 && P.Field.Remaining==4,"Dört araçlı yarış hazırlıktan açıldı");});
      Shots("eleme-grid",1280);
      // Kontrollü bitiş çizgileri: üçüncü geçişle sonuncu çıkar, ikinci kapıyla son iki kalır.
      void Lap(object obj,int n)=>obj.GetType().GetProperty("Lap").SetValue(obj,n);
      Add(()=>{Lap(P.Race.Session,1);Lap(P.Field.Rivals[0],1);P.Field.UpdateOrder(P.Race);
        Check(P.Field.Remaining==4,"İlk iki geçişte kimse elenmedi");Lap(P.Field.Rivals[1],1);P.Field.UpdateOrder(P.Race);
        Check(P.Field.Remaining==3 && P.Field.IsOut(3),"Dördüncü sürücü elendi");});
      Add(()=>{Lap(P.Race.Session,2);Lap(P.Field.Rivals[0],2);P.Field.UpdateOrder(P.Race);
        Check(P.Field.Remaining==2 && P.Field.IsOut(2),"İkinci turda üçüncü elendi");});
      Shots("eleme-final",1280);
      Add(()=>{Lap(P.Field.Rivals[0],3);P.Field.UpdateOrder(P.Race);Check(P.Field.PlayerRank==2 && !P.Race.PhysicsRunning,"Rakip ilk geçince final bitti");});
      Wait(()=>ResultView.Instance && ResultView.Instance.Visible);
      Add(()=>{Check(ResultView.Instance.ValueText=="2. SIRA","Eleme sonuç ekranı");P.RestartRace();P.ManualStepping=true;P.Race.Session.TickCountdown(4);
        Check(P.Field.Remaining==4,"Tekrar tüm rakipleri geri getirdi");driver=RaceTestDriver.For("gp");});
      int rounds=0;
      Add(()=>{
        for(int i=0;i<320 && P.Race.PhysicsRunning;i++){P.StepRace(driver.Input(P.Race));driver.RespawnIfStuck(P.Race);}
        if(P.Race.PhysicsRunning && ++rounds<80){index--;return;}
        Check(!P.Race.PhysicsRunning && P.Field.Remaining<4,"Gerçek fizik sürüşüyle eleme yarışı tamamlandı");
      });
      Shots("eleme-sonuc",1280);
      Add(()=>Check(proof.errors.Count==0,"Çalışma anı hatasız"));
    }

    private static bool CircuitProof => Environment.GetCommandLineArgs().Contains("-circuitProof");
    private static void SetupCircuit()
    {
      string dir=Path.Combine(Project,"Logs/Circuit/"+Guid.NewGuid().ToString("N"));
      GarageSession.Open(Path.Combine(dir,"garage.json"),true);
      foreach(string key in new[]{"gp_1","rx_1"})
      {
        Add(()=>Check(TestPanelActions.StartRace(key),key+" normal yarış girişi"));
        Wait(()=>P && P.RaceTrack==key && P.Field!=null);
        Add(()=>{
          P.ManualStepping=true;
          Check(!WorldData.OpponentTest && P.Field.Rivals.Length==3,key+" oyuncu ve üç fiziksel rakip");
          Check(P.Field.PlayerRank>=3 && P.Field.Order.Distinct().Count()==4,key+" dört ayrı start sırası");
          Check(UiRoot.Instance.Hud.Q("circuit-standings").resolvedStyle.display==DisplayStyle.Flex,key+" canlı sıralama alanı");
          P.Race.Session.TickCountdown(4);
          driver=RaceTestDriver.For(P.Race.Event.Type);
          for(int i=0;i<150;i++) P.StepRace(driver.Input(P.Race));
          Check(P.Field.Rivals.All(r=>r.Time>2 && r.Vehicle.Body.Velocity.Length>1),key+" bütün rakipler sürüyor");
        });
        Shots("grid-"+key.Replace('_','-'),1280,1920);
        Add(()=>{
          var rival=P.Field.Rivals[0].Vehicle;
          var pose=OpponentTrafficCar.Read(rival);
          // Temas fixture'ı: oyuncuyu arka tampona yerleştir, iki aracı normal yarış adımıyla ilerlet.
          double gap=(OpponentTrafficCar.Read(P.Simulation).Length+pose.Length)*.5-.4;
          P.Simulation.Place(pose.X-gap*Math.Sin(pose.Heading),pose.Z-gap*Math.Cos(pose.Heading),pose.Heading);
          typeof(VehicleState).GetProperty("Velocity").SetValue(P.Simulation.Body,rival.Body.Velocity+
            new BodyVector(Math.Sin(pose.Heading)*8,0,Math.Cos(pose.Heading)*8));
          int hits=P.Field.PlayerContacts;
          P.StepRace(new DrivingInput(.3,0,0));
          Check(P.Field.PlayerContacts>hits && P.Simulation.Body.LastImpactSpeed>2 && rival.Body.LastImpactSpeed>2,key+" iki gövdede gerçek temas darbesi");
          Check(P.Race.Recording.Cut,key+" temaslı sürüş girdi hayaleti olarak kaydedilmez");
          P.RestartRace(); P.ManualStepping=true;
          Check(P.Field.PlayerContacts==0 && !P.Race.Recording.Cut,key+" tekrarda temiz grid");
          P.Race.Session.TickCountdown(4);
          driver=RaceTestDriver.For(P.Race.Event.Type);
        });
        int rounds=0;
        Add(()=>{
          for(int i=0;i<360 && P.Race.PhysicsRunning;i++){
            P.StepRace(driver.Input(P.Race)); driver.RespawnIfStuck(P.Race);
          }
          if(P.Race.PhysicsRunning && ++rounds<75){index--;return;}
          Check(P.Race.Session.State==RaceState.Finished && P.Field.PlayerRank>=1 && P.Field.PlayerRank<=4,key+" doğal yarış bitişi ve sonuç sırası");
        });
        Add(()=>GameFlow.LeaveDrive()); Wait(()=>SceneManagerName()=="Garage");
      }
      Add(()=>Check(proof.errors.Count==0,"Çalışma zamanı hatası yok"));
    }
    private static string SceneManagerName()=>UnityEngine.SceneManagement.SceneManager.GetActiveScene().name;

    private static void SetupTraffic()
    {
      string dir=Path.Combine(Project,"Logs/Traffic/"+Guid.NewGuid().ToString("N"));GarageSession.Open(Path.Combine(dir,"garage.json"),true);MutantRuntime.RecordDirectory=Path.Combine(dir,"mutant");GameFlow.MainMenu();
      var snapshot=typeof(GtPrototype).GetField("playerTraffic",BindingFlags.NonPublic|BindingFlags.Instance);
      Add(()=>MutantRuntime.Start(53));Wait(()=>MutantStartView.Instance&&MutantStartView.Instance.Visible);
      Add(()=>{MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Run.State["secenekler"][0].S());});Wait(()=>P&&P.Simulation!=null&&!MutantRuntime.Blocked);
      Add(()=>MutantRuntime.StartRace(MutantRuntime.Model.Events.First(e=>e.Type=="gp").Id,0));Wait(()=>P&&P.Race!=null&&P.Race.Event.Type=="gp"&&P.Opponent!=null);
      if (Environment.GetCommandLineArgs().Contains("-duelProof"))
      {
        Add(()=>{P.ManualStepping=true; P.Race.Session.TickCountdown(4);});
        Add(()=>Check(UiRoot.Instance.Hud.Q<Label>("rival-left").resolvedStyle.display!=DisplayStyle.None &&
                      UiRoot.Instance.Hud.Q<Label>("rival-right").resolvedStyle.display==DisplayStyle.None,"Gerçek startta sol rakip uyarısı görünüyor"));
        Shots("duel-grid",1280);
      }
      Add(()=>{P.Race.Session.TickCountdown(4);driver=RaceTestDriver.For("gp");OpponentTrafficCar before=default;for(int i=0;i<120;i++){before=OpponentTrafficCar.Read(P.Simulation);P.StepRace(driver.Input(P.Race));}var cached=(OpponentTrafficCar)snapshot.GetValue(P);Check(cached.X==before.X&&cached.Z==before.Z&&cached.Vx==before.Vx&&cached.Vz==before.Vz,"Gerçek yarış bağı aynı adımın başlangıç oyuncu pozunu taşır");Check(P.Opponent.Pilot.Traffic.State!="serbest","MUTANT rakibi yakın trafik kararına girdi");});Shots("traffic-mutant",1280,1920);
      Add(()=>{bool passed=false;for(int i=0;i<720&&!passed;i++){var command=driver.Input(P.Race);double speed=P.Simulation.Body.Velocity.Length;P.StepRace(new DrivingInput(speed<12?Math.Min(command.Throttle,.4):0,speed>13?.3:command.Brake,command.Steering,true,true));var a=OpponentTrafficCar.Read(P.Simulation);var b=OpponentTrafficCar.Read(P.Opponent.Vehicle);passed=(b.X-a.X)*Math.Sin(a.Heading)+(b.Z-a.Z)*Math.Cos(a.Heading)>3;}Check(passed,"Gerçek MUTANT yarışında yavaş oyuncuyu doğal fizikle geçti");Check(P.Opponent.Returns==0&&P.Race.Teleports==0,"Geçişte iki araçta da otomatik konum dönüşü yok");});Shots("traffic-overtake",1280,1920);
      if (Environment.GetCommandLineArgs().Contains("-duelProof"))
      {
        Add(CheckDuel);
        Add(()=>Check(P.SourceVehicle.Scene.TailLamp.color.r>.9f,"Fren stop rengi gerçek araçta uygulandı"));
        Shots("duel-brake",1280);
        Add(()=>P.StepRace(new DrivingInput(.6,0,0,true,true)));
        Add(()=>Check(!P.Simulation.Engine.BrakeLights && P.SourceVehicle.Scene.TailLamp.color.r<.6f,"Fren bırakıldığında normal stop rengi geri geldi"));
      }
      Add(()=>{GameFlow.Pause(true);double time=P.Opponent.Time;for(int i=0;i<30;i++)P.StepRace(new DrivingInput(1,0,0));Check(P.Opponent.Time==time,"Duraklatmada trafik ve rakip ilerlemez");GameFlow.Pause(false);P.RestartRace();Check(P.Opponent.Pilot.Traffic.Offset==0&&P.Opponent.Pilot.Traffic.SideChanges==0&&snapshot.GetValue(P)==null,"Tekrarda yan seçimi ve oyuncu anlık görüntüsü sıfır");});
      Add(()=>MutantRuntime.Exit());Wait(()=>UnityEngine.SceneManagement.SceneManager.GetActiveScene().name=="Garage");
      Add(()=>{MutantRuntime.RecordDirectory=Path.Combine(dir,"drag");MutantRuntime.Start(53);});Wait(()=>MutantStartView.Instance&&MutantStartView.Instance.Visible);
      Add(()=>{MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Run.State["secenekler"][0].S());});Wait(()=>P&&P.Simulation!=null&&!MutantRuntime.Blocked);
      Add(()=>MutantRuntime.StartRace(MutantRuntime.Model.Events.First(e=>e.Type=="dg").Id,0));Wait(()=>P&&P.Race!=null&&P.Race.Event.Type=="dg");
      Add(()=>{P.Race.Session.TickCountdown(4);driver=RaceTestDriver.For("dg");for(int i=0;i<60;i++)P.StepRace(driver.Input(P.Race));Check(snapshot.GetValue(P)==null&&P.Opponent.Pilot.Traffic.Offset==0,"MUTANT drag yeni trafik çizgisine girmez");});Shots("traffic-drag",1280);
      Add(()=>MutantRuntime.Exit());Wait(()=>UnityEngine.SceneManagement.SceneManager.GetActiveScene().name=="Garage");Add(()=>Check(TestPanelActions.StartRace("gp_1"),"Kariyer asfalt açıldı"));Wait(()=>P&&P.Race!=null&&P.Race.Event.Type=="gp");
      Add(()=>{P.Race.Session.TickCountdown(4);driver=RaceTestDriver.For("gp");for(int i=0;i<60;i++)P.StepRace(driver.Input(P.Race));Check(snapshot.GetValue(P)==null,"Kariyer trafik bağlamı almıyor");});Shots("traffic-career",1280);
      Add(()=>Check(proof.errors.Count==0,"Trafik çalışma anı hata yok"));
    }
    private static void Setup()
    {
      string dir=Path.Combine(Project,"Logs/Engagement/"+Guid.NewGuid().ToString("N"));GarageSession.Open(Path.Combine(dir,"garage.json"),true);MutantRuntime.RecordDirectory=Path.Combine(dir,"mutant");
      keyboard=InputSystem.AddDevice<Keyboard>("EngagementValidation");GameFlow.MainMenu();Add(()=>Check(TestPanelActions.StartRace("dg_1"),"Gerçek kariyer drag açıldı"));
      Wait(()=>P&&P.Race!=null&&P.Race.Session.Event.Type=="dg");
      Add(()=>{driver=RaceTestDriver.For("dg");P.Race.Session.TickCountdown(4);for(int i=0;i<30;i++)P.StepRace(driver.Input(P.Race));});
      Add(()=>Check(UiRoot.Instance.Hud.Query<Label>().ToList().Any(l=>l.text.Contains("süre bütçesi")),"Canlı HUD yıldız süre bütçesini çizdi"));Shots("yaris-hedef");
      Wait(()=>{for(int k=0;k<600&&P.Race.Session.State==RaceState.Running;k++){P.StepRace(driver.Input(P.Race));stepped++;}if(stepped>30000)throw new Exception("Drag bitmedi");return P.Race.Session.State==RaceState.Finished;});
      Wait(()=>ResultView.Instance&&ResultView.Instance.Visible);
      Add(()=>Check(UiRoot.Instance.Screen.Query<Label>().ToList().Any(l=>l.text=="Sonraki hedef"),"Gerçek bitiş sonuç hedefini çizdi"));Shots("yaris-sonuc");
      Add(()=>GameFlow.LeaveDrive());Wait(()=>UnityEngine.SceneManagement.SceneManager.GetActiveScene().name=="Garage");
      Add(()=>MutantRuntime.Start(53));Wait(()=>MutantStartView.Instance&&MutantStartView.Instance.Visible);
      Add(()=>{MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Run.State["secenekler"][0].S());});
      Wait(()=>!MutantRuntime.Starting&&MutantRuntime.Session!=null);
      Add(()=>{var run=MutantRuntime.Run;run.Advance(125);run.Damage("spin");run.EnterBoss();run.FinishBoss(false);typeof(MutantRuntime).GetProperty("Panel").SetValue(null,"summary");});
      Wait(()=>MutantSummaryView.Instance&&MutantSummaryView.Instance.Visible);
      Add(()=>{var page=UiRoot.Instance.Root.Q("b-mutant-summary");Check(page.Q<Label>("summary-stats").text.Contains("hazırlık süresi"),"Gerçek özet sayaçları çizdi");Check(page.Q<Label>("summary-build").text.Contains("Stok kurulum"),"Boş kurulum açık");Check(page.Q<Label>("summary-next-attempt").text.Contains("boss"),"Sonraki deneme önerisi çizildi");});Shots("mutant-ozet");
      Add(()=>{var s=MutantRuntime.Run.State;var c=MutantRuntime.Run.Catalog;s.Set("pasifler",CatalogNode.Arr(c["passives"].Items.Concat(c["addons"].Items).Select(x=>CatalogNode.Str(x["id"].S()))));s.Set("parcalar",CatalogNode.Arr(c["parts"].Items.Select(x=>CatalogNode.Str(x["id"].S()))));typeof(MutantSummaryView).GetField("run",BindingFlags.NonPublic|BindingFlags.Instance).SetValue(MutantSummaryView.Instance,null);});
      Add(()=>Check(UiRoot.Instance.Root.Q<Label>("summary-build").text.Contains("Parçalar"),"Uzun kurulum çizildi"));Shots("mutant-uzun-kurulum");
      Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.PageDown)));Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState()));
      Add(()=>Check(UiRoot.Instance.Root.Q<ScrollView>("summary-overview").scrollOffset.y>0,"PageDown uzun kurulumu kaydırdı"));Shots("mutant-kaydirilmis-kurulum");
      Add(()=>{var page=UiRoot.Instance.Root.Q("b-mutant-summary");page.Q<Label>("summary-next-attempt").text=string.Join("\n",Enumerable.Repeat("Uzun öneri erişim sınırı",30));});
      Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.LeftShift,Key.PageDown)));Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState()));
      Add(()=>Check(UiRoot.Instance.Root.Q("b-mutant-summary").Query<ScrollView>().ToList().Any(s=>s.name!="summary-overview"&&s.scrollOffset.y>0),"Shift PageDown sağ paneli kaydırdı"));
      Add(()=>{gamepad=InputSystem.AddDevice<Gamepad>("EngagementPad");UiRoot.Instance.Root.Q<ScrollView>("summary-overview").scrollOffset=Vector2.zero;});
      Add(()=>InputSystem.QueueStateEvent(gamepad,new GamepadState().WithButton(GamepadButton.DpadDown)));Add(()=>InputSystem.QueueStateEvent(gamepad,new GamepadState()));
      Add(()=>Check(UiRoot.Instance.Root.Q<ScrollView>("summary-overview").scrollOffset.y>0,"Gamepad yön tuşu kurulumu kaydırdı"));
      Add(()=>InputSystem.QueueStateEvent(gamepad,new GamepadState().WithButton(GamepadButton.South)));Add(()=>InputSystem.QueueStateEvent(gamepad,new GamepadState()));
      Add(()=>Check(!MutantRuntime.Active,"Gamepad onayı Mutant menüsüne döndü"));
      Add(()=>Check(proof.errors.Count==0,"Çalışma anı hata yok"));
    }
    private static bool Capture()
    {
      if(shot==null)return false;if(EditorApplication.timeSinceStartup-shotAt<.5)return true;
      int height=width*9/16;var a=new Texture2D(width,height,TextureFormat.RGBA32,false);var b=new Texture2D(width,height,TextureFormat.RGBA32,false);var scene=new RenderTexture(width,height,24);var old=RenderTexture.active;var camera=Camera.main;
      try
      {
        if(shot.StartsWith("pacing-world"))
          foreach(string name in new[]{"mh-navigation","mh-mission"})
          {var label=UiRoot.Instance.Hud.Q<Label>(name);var area=label.parent.worldBound;Check(label.resolvedStyle.display!=DisplayStyle.None&&label.worldBound.yMax<=area.yMax+1&&label.worldBound.yMin>=area.yMin-1,"Görev/mesafe panel içinde: "+name+" / "+width);}
        if(shot.StartsWith("yaris-sonuc"))
          foreach(var label in UiRoot.Instance.Root.Q("f-result").Query<Label>(className:"rs-row-value").ToList())
            Check(label.worldBound.xMax<=label.parent.worldBound.xMax+1&&label.worldBound.xMin>=label.parent.worldBound.xMin-1,"Sonuç satırı kendi alanına sığıyor: "+label.text+" / "+width);
        if(camera){var previous=camera.targetTexture;camera.targetTexture=scene;camera.Render();camera.targetTexture=previous;RenderTexture.active=scene;a.ReadPixels(new Rect(0,0,width,height),0,0);}
        RenderTexture.active=target;b.ReadPixels(new Rect(0,0,width,height),0,0);var pa=a.GetPixels32();var pb=b.GetPixels32();
        for(int i=0;i<pa.Length;i++){float alpha=pb[i].a/255f;pa[i]=new Color32((byte)Mathf.Min(255,pa[i].r*(1-alpha)+pb[i].r),(byte)Mathf.Min(255,pa[i].g*(1-alpha)+pb[i].g),(byte)Mathf.Min(255,pa[i].b*(1-alpha)+pb[i].b),255);}a.SetPixels32(pa);a.Apply();
        string file="Logs/engagement-"+shot+".png";File.WriteAllBytes(Path.Combine(Project,file),a.EncodeToPNG());proof.images.Add(file);
      }
      finally{RenderTexture.active=old;UiRoot.Instance.Settings.targetTexture=null;Hud.SizeOverride=null;target.Release();scene.Release();UnityEngine.Object.DestroyImmediate(target);UnityEngine.Object.DestroyImmediate(scene);UnityEngine.Object.DestroyImmediate(a);UnityEngine.Object.DestroyImmediate(b);shot=null;}
      return true;
    }
    private static void Tick()
    {
      try{if(EditorApplication.timeSinceStartup-began>(BossPairsProof?720:180))throw new TimeoutException("Play "+index+"/"+steps.Count+" · "+string.Join(" / ",proof.checks.Skip(Math.Max(0,proof.checks.Count-3))));if(Capture()){at=EditorApplication.timeSinceStartup;return;}if(EditorApplication.timeSinceStartup-at<.3)return;at=EditorApplication.timeSinceStartup;if(steps.Count==0){if(!UiRoot.Instance)return;if(BossPairsProof)SetupBossPairs();else if(ChoicesProof)SetupChoices();else if(AtelierProof)SetupAtelier();else if(CircuitProof)SetupCircuit();else if(SessionState.GetBool(Traffic,false))SetupTraffic();else if(SessionState.GetBool(Pacing,false))SetupPacing();else Setup();return;}if(index>=steps.Count){Finish(null);return;}steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception error)
    {
      bool pacing=SessionState.GetBool(Pacing,false),traffic=SessionState.GetBool(Traffic,false);SessionState.SetBool(Active,false);EditorApplication.update-=Tick;Application.logMessageReceived-=Logged;proof.result=error==null?(BossPairsProof?"boss-pairs-passed":ChoicesProof?"choices-play-passed":AtelierProof?"atelier-play-passed":CircuitProof?"circuit-play-passed":traffic?"traffic-play-passed":pacing?"pacing-play-passed":"engagement-play-passed"):"failed";proof.error=error?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");
      if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(gamepad!=null&&gamepad.added)InputSystem.RemoveDevice(gamepad);
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".jpg",".shader"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>{using(var h=SHA256.Create())return new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(f))).Replace("-","")};}).ToArray();
      File.WriteAllText(Path.Combine(Project,BossPairsProof?"Logs/boss-pairs.json":ChoicesProof?"Logs/choices-play.json":AtelierProof?"Logs/atelier-play.json":CircuitProof?"Logs/circuit-play.json":Environment.GetCommandLineArgs().Contains("-duelProof")?"Logs/duel-play.json":traffic?"Logs/traffic-play.json":pacing?"Logs/pacing-play.json":"Logs/engagement-play.json"),JsonUtility.ToJson(proof,true));if(error!=null)Debug.LogException(error);EditorApplication.Exit(error==null?0:1);
    }
  }
}
