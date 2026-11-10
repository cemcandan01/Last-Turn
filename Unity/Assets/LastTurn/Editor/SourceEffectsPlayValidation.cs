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
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace LastTurn.EditorValidation
{
  // Yalnız ayrı grafik Editor'da kaynak efekt/işaret/kapı kabulü: gerçek Mutant dünyası, gerçek fizik/girdi ile toz,
  // N nitro alevi, gerçek InspectHook hedef halkası ve bağ halatı, Flying Dutchman hayaleti, Volt rüzgârı, Risk Taker
  // alev/kor ve gerçek sokak yarışı kapıları. Fixture: bölge2, skill listesi, enerji100 ve Risk Taker dolu barı (yazılır,
  // kayıt edilir); hedef, bağ, kuvvet, sonuç veya efekt görünürlüğü yazılmaz.
  [InitializeOnLoad]
  public static class SourceEffectsPlayValidation
  {
    private const string Active="LastTurn.SourceEffects.Active",PathKey="LastTurn.SourceEffects.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc,environment;public List<string> checks=new(),images=new(),runtimeErrors=new(),editorDiagnostics=new(),outcomes=new(),fixtures=new();public Source[] sources;}
    private static Proof proof;private static double began,at;private static Keyboard keyboard;
    private static string career,profile;private static Dictionary<string,string> files;
    private static string shot;private static int shotW,shotH;private static bool queued,initialized;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new();
    private static readonly Queue<(string,int,int)> shots=new();
    private static string hookKind="";private static int firstBackdrop=-1;private static int mode,emittedMark,ropeFrames;private static long modeStep;private static double modeTime;private static string pending="";
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static SourceEffectsPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      foreach(var type in typeof(SourceEffectsPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
      EditorApplication.isPaused=false;Time.timeScale=1;
      var gameType=typeof(EditorWindow).Assembly.GetType("UnityEditor.GameView");var playWindow=EditorWindow.GetWindow(gameType);playWindow.Show();playWindow.Focus();
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      InputSystem.settings.supportedDevices=new[]{"Keyboard","Mouse"};
      GarageSceneBuilder.Open();RebuildFixtureScenes();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/SourceEffects/"+Guid.NewGuid().ToString("N")+"/garage.json"));SessionState.SetBool(Active,true);enterAfter=EditorApplication.timeSinceStartup+2;EditorApplication.update+=EnterWhenReady;
    }
    private static double enterAfter;
    private static void EnterWhenReady(){if(EditorApplication.isCompiling||EditorApplication.isUpdating){enterAfter=EditorApplication.timeSinceStartup+2;return;}if(EditorApplication.timeSinceStartup<enterAfter)return;EditorApplication.update-=EnterWhenReady;EditorApplication.EnterPlaymode();}
    private static void RebuildFixtureScenes()
    {
      string backup=Path.Combine(Project,"Logs/SourceEffectsSceneBackup/"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(backup);
      foreach(var type in new[]{typeof(GtPrototypeSceneBuilder),typeof(RaceTestSceneBuilder)}){
        string path=(string)type.GetField("ScenePath").GetRawConstantValue();if(File.Exists(path))File.Move(path,Path.Combine(backup,Path.GetFileName(path)));
        type.GetMethod("EnsureScene",BindingFlags.Static|BindingFlags.NonPublic).Invoke(null,null);
      }
      AssetDatabase.SaveAssets();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if(s==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){EditorApplication.isPaused=false;Time.timeScale=1;Application.runInBackground=true;proof=new Proof();initialized=false;mode=0;began=at=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;}
      if(s==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;}
    }
    private static void Logged(string message,string stack,LogType type)
    {if(type!=LogType.Error&&type!=LogType.Exception&&type!=LogType.Assert)return;// Oyun koduna değmeyen Editor tanıları (Search indeksleme, çevrimdışı Package Manager listesi) ayrı kaydedilir.
    if(!stack.Contains("LastTurn.")&&(stack.Contains("UnityEditor.Search.")||message.StartsWith("[Package Manager Window]",StringComparison.Ordinal)))proof.editorDiagnostics.Add(message);else proof.runtimeErrors.Add(message+"\n"+stack);}
    private static void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);proof.checks.Add(label);}
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","");}
    private static Dictionary<string,string> PlayerFiles()=>new[]{"LastTurnGarage","LastTurnMutant","LastTurnSettings"}.Select(n=>Path.Combine(Application.persistentDataPath,n)).Where(Directory.Exists).SelectMany(p=>Directory.GetFiles(p,"*",SearchOption.AllDirectories)).ToDictionary(p=>p,Hash);
    private static GtPrototype P=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    private static SourceEffectsView FX=>P?P.GetComponent<SourceEffectsView>():null;
    private static MutantSkillHud Skill(string id)=>MutantRuntime.Abilities.Skills().FirstOrDefault(s=>s.Id==id);
    private static bool WorldReady()=>SceneManager.GetActiveScene().name=="GTTest"&&P?.Simulation!=null&&P.Race==null&&MutantRuntime.Panel==""&&MutantHudView.Instance&&MutantHudView.Instance.Visible&&FX&&FX.Ready;
    private static void Keys(params Key[] keys)=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(keys));
    private static void Pair(string name){Time.timeScale=0;shots.Enqueue((name,1280,720));shots.Enqueue((name,1920,1080));}
    private static void Next(int m){mode=m;modeStep=P&&P.Simulation!=null?P.Simulation.Body.Steps:0;modeTime=EditorApplication.timeSinceStartup;emittedMark=FX?FX.Emitted:0;}
    private static double ModeAge=>EditorApplication.timeSinceStartup-modeTime;
    private static void Setup()
    {
      initialized=true;GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=PlayerFiles();keyboard=InputSystem.AddDevice<Keyboard>();
      Size(1280,720);Next(20);
    }
    private static void StartRun(int region)
    {
      if(MutantRuntime.Run!=null)MutantRuntime.Exit();MutantRuntime.Start(53);MutantRuntime.RecordDirectory=Path.Combine(Project,"Logs/SourceEffectsRecords/"+Guid.NewGuid().ToString("N"));
      MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);if(region>1){var r=MutantRuntime.Run;r.State.Set("bolge",CatalogNode.Num(region));foreach(var m in new[]{"ArrangeEvents","ArrangeChests"})typeof(MutantRun).GetMethod(m,BindingFlags.NonPublic|BindingFlags.Instance).Invoke(r,null);
        proof.fixtures.Add("Bölge "+region+" başlangıcı (tohum53, ilk başlangıç aracı); etkinlik/sandık üretim düzenleyicisiyle yeniden dizildi");}
      MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);
    }
    private static void Equip(params string[] ids)
    {
      var r=MutantRuntime.Run;r.State.Set("beceriler",CatalogNode.Arr(ids.Select(id=>CatalogNode.Parse("{\"id\":\""+id+"\",\"seviye\":1,\"evrim\":null,\"eklentiler\":[]}"))));r.State.Set("bec",MutantSkills.Initialize());r.State["mek"].Set("enerji",CatalogNode.Num(100));
      proof.fixtures.Add("Skill listesi lv1 "+string.Join("+",ids)+", enerji100");
    }
    private static void Markers(string label)
    {
      var model=MutantWorldMarkerModel.Read(MutantRuntime.Run);var view=P.GetComponent<MutantWorldMarkers>();
      Check(view&&view.Built==model.Length,"Kaynak işaretleri kuruldu / "+label+" "+model.Length);
      int expectedLabels=model.Count(m=>m.Label!=null);Check(view.Labels==expectedLabels,"Kaynak tabela sayısı / "+label+" "+expectedLabels);
      var root=P.transform.Find("TS Mutant işaretleri");Check(root&&root.gameObject.activeSelf,"İşaretler dünyada görünür / "+label);
      int active=0;foreach(Transform t in root)if(t.gameObject.activeSelf)active++;Check(active==model.Count(m=>!m.Used),"Kullanılan işaret gizli / "+label);
      foreach(var m in model)Check(m.Kind=="chest"?m.Label==null:m.Height>0,"İşaret boyu/tabela kuralı / "+m.Key);
      proof.outcomes.Add(label+": "+model.Length+" işaret, "+expectedLabels+" tabela, renkler "+string.Join(",",model.Select(m=>m.Color.ToString("x6")).Distinct()));
    }
    private static void Advance()
    {
      var p=P;var fx=FX;
      switch(mode)
      {
        case 20: // TS arka-gorsel.ts: ana menüde kaynak görselleri akar
        {
          var menu=UiRoot.Instance.GetComponent<MainMenuView>();var back=UiRoot.Instance.GetComponent<MenuBackdropView>();
          if(!menu||!menu.Visible||!back||!back.Playing||ModeAge<1.6)return;
          Check(back.Images==9,"Dokuz kaynak menü görseli");firstBackdrop=back.Current;Check(firstBackdrop>=0,"İlk görsel seçildi");
          var arka=UiRoot.Instance.Screen.Q("menu-arka");Check(arka!=null&&UiRoot.Instance.Screen.IndexOf(arka)==0,"Görsel menü katmanının altında");
          Pair("menu-backdrop");Next(21);return;
        }
        case 21:
        {
          var back=UiRoot.Instance.GetComponent<MenuBackdropView>();
          if(back.Switches>=2&&ModeAge>MenuBackdropView.Fade+.2){Check(back.Current!=firstBackdrop,"Art arda aynı görsel yok");proof.outcomes.Add("Menü görseli "+firstBackdrop+" → "+back.Current+", "+back.Switches+" geçiş");Pair("menu-backdrop-next");Next(22);return;}
          if(ModeAge>12)throw new TimeoutException("Menü görseli değişmedi");return;
        }
        case 22:
          StartRun(1);Next(23);return;
        case 23:
        {
          var back=UiRoot.Instance.GetComponent<MenuBackdropView>();if(SceneManager.GetActiveScene().name!="GTTest")return;
          Check(!back.Playing,"Sürüşte menü görseli kapalı");Next(1);return;
        }
        case 1: // bölge1 hub: işaretler, gerçek sürüşle toz
          if(!WorldReady())return;Markers("bölge1");Pair("markers-hub");Next(2);return;
        case 2:
          Keys(Key.W);
          if(fx.Emitted-emittedMark>=12&&fx.VisiblePuffs>=6){var b=p.Simulation.Body;proof.outcomes.Add("Toz: zemin "+b.CenterSurface+" hız "+JsMath.Hypot(b.Velocity.X,b.Velocity.Z).ToString("0.0")+" m/s, yayılan "+(fx.Emitted-emittedMark));Check(!b.Airborne,"Toz gerçek temas");Pair("dust");Next(3);return;}
          if(ModeAge>25)throw new TimeoutException("Toz yok: emitted="+fx.Emitted);return;
        case 3: // N nitro: gerçek enerji tüketimi ve egzoz alevi
          MutantRuntime.Run.State["mek"].Set("enerji",CatalogNode.Num(100));proof.fixtures.Add("Nitro öncesi enerji100");Keys(Key.W,Key.N);Next(4);return;
        case 4:
          Keys(Key.W);var e=MutantSkillEffectModel.Read(MutantRuntime.Run);
          if(e.Nitro&&fx.Emitted-emittedMark>=6){Check(MutantRuntime.Abilities.Nitro().Open,"Nitro gerçek açık");Pair("nitro");Next(5);return;}
          if(ModeAge>10)throw new TimeoutException("Nitro alevi yok");return;
        case 5: // bölge2 şehir
          Keys();StartRun(2);Next(6);return;
        case 6:
          if(!WorldReady())return;Check(p.OpenTerrain.Region.Key=="city","Üretim şehir dünyası");Markers("şehir");
          Check(MutantWorldMarkerModel.Read(MutantRuntime.Run).Any(m=>m.Street!=""&&m.Color==0xff8fd8&&m.Label==null),"Sokak işareti pembe ve tabelasız");
          Equip("grappling-hook","flying-dutchman","volt-kanat");Pair("markers-city");Next(7);return;
        case 7: // gerçek InspectHook hedefi: atılabilir bina noktası
        {
          var h=Skill("grappling-hook");var em=MutantSkillEffectModel.Read(MutantRuntime.Run);
          if(!h.Open&&h.Ready&&(h.Hook?.Kind=="gok"||h.Hook?.Kind=="kose")&&h.TargetPoint!=null&&fx.TargetVisible)
          {
            Check(em.HookTarget!=null&&em.HookTarget.SequenceEqual(h.TargetPoint),"Hedef halkası HUD TargetPoint'ten");
            var ring=fx.Prototype("hook-target-ring");Check(Vector3.Distance(ring.position,GtPresentation.Position(new BodyVector(h.TargetPoint[0],h.TargetPoint[1],h.TargetPoint[2])))<.01f,"Halka hedef noktasında");
            hookKind=h.Hook.Kind;proof.outcomes.Add("Kanca hedefi: "+hookKind+" "+string.Join(",",h.TargetPoint.Select(v=>v.ToString("0.0"))));Keys();Pair("hook-target");pending="bind";Next(8);return;
          }
          Keys(Key.S);if(ModeAge>40)throw new TimeoutException("Bina hedefi yok: "+h.Hook?.Kind+"/"+h.Blocker);return;
        }
        case 8: // gerçek 1 tuşu: bağ
        {
          var h=Skill("grappling-hook");
          if(pending=="bind"){Keys(Key.Digit1);pending="up";return;}
          if(pending=="up"){Keys();pending="";return;}
          if(h.Open&&fx.RopeVisible){if(++ropeFrames<6)return;var a=MutantRuntime.Abilities.LastHookAttempt;Check(a!=null&&a.Linked&&a.Query.Kind==hookKind,"Gerçek kanca bağı / "+hookKind);
            var em=MutantSkillEffectModel.Read(MutantRuntime.Run);Check(em.HookPoint!=null&&em.HookPoint.Length==3,"Halat ucu bağ noktasında");
            var tip=fx.Prototype("hook-tip");Check(Vector3.Distance(tip.position,GtPresentation.Position(new BodyVector(em.HookPoint[0],em.HookPoint[2],em.HookPoint[1])))<.01f,"Kanca ucu bağ noktasında");
            Check(!fx.TargetVisible,"Bağlıyken hedef halkası gizli");Pair("hook-rope");pending="release";Next(9);return;}
          if(ModeAge>8)throw new TimeoutException("Bağ yok");return;
        }
        case 9:
        {
          var h=Skill("grappling-hook");
          if(pending=="release"){Keys(Key.Digit1);pending="up";return;}
          if(pending=="up"){Keys();pending="";return;}
          if(!h.Open){Check(!fx.RopeVisible,"Bırakınca halat gizli");pending="ghost";Next(10);return;}
          if(ModeAge>20)throw new TimeoutException("Bırakma yok");return;
        }
        case 10: // gerçek 2 tuşu: Flying Dutchman
        {
          if(pending=="ghost"){var d=Skill("flying-dutchman");if(!d.Ready){if(ModeAge>30)throw new TimeoutException("Dutchman hazır değil: "+d.Blocker);return;}Keys(Key.Digit2);pending="up";return;}
          if(pending=="up"){Keys();pending="";return;}
          var em=MutantSkillEffectModel.Read(MutantRuntime.Run);
          if(em.Ghost&&p.SourceVehicle.Scene.GhostMode&&fx.Emitted>emittedMark){Check(MutantRuntime.Run.State["becCikti"]["hayalet"].B(),"Gerçek hayalet fazı");Pair("ghost");Next(11);return;}
          if(ModeAge>8)throw new TimeoutException("Hayalet görünümü yok");return;
        }
        case 11:
        {
          var em=MutantSkillEffectModel.Read(MutantRuntime.Run);
          if(!em.Ghost&&!p.SourceVehicle.Scene.GhostMode){proof.outcomes.Add("Hayalet bitince gövde malzemesi geri geldi");pending="volt";Next(12);return;}
          if(ModeAge>20)throw new TimeoutException("Hayalet bitmedi");return;
        }
        case 12: // gerçek 3 tuşu: Volt Kanat rüzgâr çizgileri
        {
          if(pending=="volt"){var v=Skill("volt-kanat");if(!v.Ready){if(ModeAge>30)throw new TimeoutException("Volt hazır değil: "+v.Blocker);return;}Keys(Key.Digit3);pending="hold";return;}
          if(pending=="hold"){Keys(Key.Digit3);var em=MutantSkillEffectModel.Read(MutantRuntime.Run);if(em.Wind&&fx.Emitted-emittedMark>=4){Pair("wind");pending="";Keys();Next(13);return;}if(ModeAge>8)throw new TimeoutException("Rüzgâr yok");return;}
          return;
        }
        case 13: // Risk Taker: dolu bar fixture, dönüşüm/iz/kor gerçek skill adımından
        {
          if(ModeAge<1.5)return;
          Equip("risk-taker");var y=MutantRuntime.Run.State["bec"]["yerel"];y.Set("risk-taker",CatalogNode.Parse("{\"kalan\":0,\"bekleme\":0,\"deger\":100,\"uzatma\":0,\"sayac\":0,\"hedef\":null,\"nokta\":null,\"iz\":[],\"islenen\":[]}"));
          proof.fixtures.Add("Risk Taker barı 100 (drift kazancı yerine); dönüşüm/iz/hasar alanı gerçek skill adımında");Next(14);return;
        }
        case 14:
        {
          Keys(Key.W);var em=MutantSkillEffectModel.Read(MutantRuntime.Run);
          if(em.Transform&&fx.ExhaustVisible&&fx.VisibleEmbers>=6&&fx.VisibleEmbers==Math.Min(26,em.Trail.Length)){proof.outcomes.Add("Risk Taker: iz "+em.Trail.Length+", kor "+fx.VisibleEmbers);Pair("risk-taker");Next(15);return;}
          if(ModeAge>12)throw new TimeoutException("Dönüşüm görünümü yok: "+em.Transform+"/"+fx.VisibleEmbers+"/"+em.Trail.Length);return;
        }
        case 15: // gerçek sokak yarışı başlangıcı: kapılar
        {
          Keys();var street=MutantRuntime.Run.State["etkinlikler"].Items.FirstOrDefault(x=>x.Has("sokak")&&!x["yapildi"].B());Check(street!=null,"Şehirde sokak etkinliği");
          proof.outcomes.Add("Sokak etkinliği "+street["sokak"].S()+" #"+street["id"].N());MutantRuntime.StartRace((int)street["id"].N(),0);Next(16);return;
        }
        case 16:
        {
          if(SceneManager.GetActiveScene().name!="RaceTest"||p==null||p.Race==null||fx==null||!fx.Ready||p.RaceDefinition==null)return;
          if(fx.GateObjects==0)return;
          var g=p.RaceDefinition.Geometry;int expected=1;double last=0;for(int i=1;i<g.N;i++)if(g.S[i]-last>=SourceEffectsView.GateSpacing){last=g.S[i];expected++;}
          Check(p.RaceDefinition.IsStreet&&fx.GateObjects==expected*3,"Sokak kapıları TS aralığıyla "+expected+" kapı");
          Check(P.transform.Find("TS Mutant işaretleri")==null,"Yarışta dünya işareti yok");
          Pair("street-gates");Next(17);return;
        }
        case 17:
          if(ModeAge<.5)return;FinishSuccess();return;
      }
    }
    private static void FinishSuccess(){MutantRuntime.Exit();Check(career==GarageSession.State.Snapshot().ToString()&&profile==GarageRace.ProfileStore().Load().Snapshot().ToString(),"Kariyer profil aynı");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"Kalıcı kayıt hashleri aynı");Finish(null);}
    private static void Shot(string name,int w,int h){Time.timeScale=0;shot=name;shotW=w;shotH=h;queued=false;Size(w,h);}
    private static void Size(int w,int h)
    {
      var a=typeof(EditorWindow).Assembly;var t=a.GetType("UnityEditor.GameView");if(!game){game=EditorWindow.GetWindow(t);originalSize=(int)t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(game);}
      var st=a.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null);group=st.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int n=(int)group.GetType().GetMethod("GetTotalCount").Invoke(group,null);var size=Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"Kaynak efekt"});group.GetType().GetMethod("AddCustomSize").Invoke(group,new[]{size});sizes.Add(n);
      t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,n);game.Show();game.Focus();game.Repaint();
    }
    private static void Capture()
    {
      string path=Path.Combine(Project,"Logs/p13-effects-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      proof.images.Add(Path.GetFileName(path));shot=null;Time.timeScale=shots.Count>0?0:1;
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>300)throw new TimeoutException("Efekt 300s mode="+mode);if(EditorApplication.timeSinceStartup-at<.025)return;at=EditorApplication.timeSinceStartup;if(!initialized){if(!UiRoot.Instance)return;Setup();return;}if(shot!=null){Capture();return;}if(shots.Count>0){var q=shots.Dequeue();Shot(q.Item1,q.Item2,q.Item3);return;}if(Time.timeScale==0)Time.timeScale=1;Advance();File.WriteAllText(Path.Combine(Project,"Logs/p13-effects-progress.txt"),"mode="+mode+" pending="+pending+" scene="+SceneManager.GetActiveScene().name+" panel="+MutantRuntime.Panel+" emitted="+(FX?FX.Emitted:-1));}catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.environment=Application.unityVersion+" | "+Application.platform+" | "+Application.productName+" | GameView";proof.result=e==null?"source-effects-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png",".bytes",".shader"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/p13-effects-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("Kaynak efekt Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
