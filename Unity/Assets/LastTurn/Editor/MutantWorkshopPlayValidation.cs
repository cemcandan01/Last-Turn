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
using UnityEngine.UIElements;

namespace LastTurn.EditorValidation
{
  // B /3A: izole üründe gerçek komutlar ve Game View; fiziksel/insan kabulü değildir.
  [InitializeOnLoad]
  public static class MutantWorkshopPlayValidation
  {
    private const string Active="LastTurn.BWorkshop.Active",PathKey="LastTurn.BWorkshop.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc,environment;public uint seed;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career,profile,initial;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantWorkshopPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      // Kopyalanmış Editor oturumundan başka kabul sürücüsü etkin kalamaz.
      foreach(var type in typeof(MutantWorkshopPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation")){var flag=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(flag!=null&&flag.IsLiteral&&flag.FieldType==typeof(string))SessionState.SetBool((string)flag.GetRawConstantValue(),false);}
      EditorApplication.isPaused=false;Time.timeScale=1;
      var gameType=typeof(EditorWindow).Assembly.GetType("UnityEditor.GameView");var playWindow=EditorWindow.GetWindow(gameType);playWindow.Show();playWindow.Focus();
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      InputSystem.settings.supportedDevices=new[]{"Keyboard","Mouse"};
      GarageSceneBuilder.Open();RebuildFixtureScenes();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/P7Mutant/"+Guid.NewGuid().ToString("N")+"/garage.json"));SessionState.SetBool(Active,true);enterAfter=EditorApplication.timeSinceStartup+2;EditorApplication.update+=EnterWhenReady;
    }
    private static double enterAfter;
    private static void EnterWhenReady(){if(EditorApplication.isCompiling||EditorApplication.isUpdating){enterAfter=EditorApplication.timeSinceStartup+2;return;}if(EditorApplication.timeSinceStartup<enterAfter)return;EditorApplication.update-=EnterWhenReady;EditorApplication.EnterPlaymode();}
    private static void RebuildFixtureScenes()
    {
      // Yalnız yukarıdaki izole ürün/komut satırı korumasından sonra: kopya sahneleri saklayıp mevcut üreticilerle yenile.
      string backup=Path.Combine(Project,"Logs/WorkshopSceneBackup/"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(backup);
      foreach(var type in new[]{typeof(GtPrototypeSceneBuilder)}){
        string path=(string)type.GetField("ScenePath").GetRawConstantValue();if(File.Exists(path))File.Move(path,Path.Combine(backup,Path.GetFileName(path)));
        type.GetMethod("EnsureScene",BindingFlags.Static|BindingFlags.NonPublic).Invoke(null,null);
      }
      AssetDatabase.SaveAssets();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if(s==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){EditorApplication.isPaused=false;Time.timeScale=1;Application.runInBackground=true;proof=new Proof();steps.Clear();index=0;began=at=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;}
      if(s==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;}
    }
    private static void Logged(string message,string stack,LogType type)
    {if(type!=LogType.Error&&type!=LogType.Exception&&type!=LogType.Assert)return;if(stack.Contains("UnityEditor.Search.")&&!stack.Contains("LastTurn."))proof.editorDiagnostics.Add(message);else proof.runtimeErrors.Add(message+"\n"+stack);}
    private static void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);proof.checks.Add(label);}
    private static void Tap(Key key){steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(key)));steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState()));}
    private static void Wait(Func<bool> ready){steps.Add(()=>{if(!ready())index--;});}
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","");}
    private static Dictionary<string,string> PlayerFiles()=>new[]{"LastTurnGarage","LastTurnMutant","LastTurnSettings"}.Select(n=>Path.Combine(Application.persistentDataPath,n)).Where(Directory.Exists).SelectMany(p=>Directory.GetFiles(p,"*",SearchOption.AllDirectories)).ToDictionary(p=>p,Hash);
    private static void Click(string name,Action after=null)=>Click(()=>name,after);
    private static void Click(Func<string> target,Action after=null)
    {
      steps.Add(()=>{var name=target();var element=UiRoot.Instance.Screen.Q(name)??UiRoot.Instance.Top.Q(name);Check(element!=null,"Fare hedefi var: "+name);point=element.worldBound.center;pointer=element.panel.Pick(point);Check(pointer==element||element.Contains(pointer),"Fare hit-test: "+name);});
      steps.Add(()=>{using(var e=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=point}))pointer.SendEvent(e);});
      steps.Add(()=>{using(var e=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=point}))pointer.SendEvent(e);after?.Invoke();});
    }
    private static MutantRun control;private static string expectedState,partId,token,offer,beforePhysics;private static int vehicleChanges;private static CatalogNode originalParts;
    private static void Setup()
    {
      GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=PlayerFiles();keyboard=InputSystem.AddDevice<Keyboard>();proof.seed=53;
      MutantRuntime.Start(53);MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);offer=MutantRuntime.Model.Choices[0].Id;MutantRuntime.Choose(offer);control=new MutantRun(53,MutantRuntime.Run.Catalog);control.Choose(offer);
      Wait(WorldReady);steps.Add(()=>{var shop=MutantWorldMarkerModel.Read(MutantRuntime.Run).First(m=>m.Kind=="shop");P.Simulation.Place(shop.X+40,shop.Z+40,0);});
      Wait(()=>MutantRuntime.Session.Markers.Closed!="a");steps.Add(()=>{var shop=MutantWorldMarkerModel.Read(MutantRuntime.Run).First(m=>m.Kind=="shop");P.Simulation.Place(shop.X,shop.Z,0);});Wait(()=>MutantWorkshopView.Instance.Visible);
      steps.Add(()=>{Check(MutantRuntime.Panel=="shop"&&MutantRuntime.Blocked&&!MutantHudView.Instance.Visible,"Gerçek atölye kapısı açılır; sürüş/HUD engelli");Check(MutantRuntime.Run.State["stok"].ToString()==control.State["stok"].ToString()&&MutantRuntime.Model.Money==150,"Paneli açmak stok/RNG/para değiştirmez");
        foreach(var p in MutantRuntime.Run.Catalog["parts"].Items)Check(MutantRewardIcons.TryGet("part/"+p["id"].S(),out var sprite)&&sprite,"Gerçek parça kategori ikonu / "+p["id"].S());
        MutantRuntime.Run.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"flying-dutchman\",\"seviye\":1,\"evrim\":null,\"eklentiler\":[]}]"));initial=MutantRuntime.Run.State.ToString();partId=MutantRuntime.Model.Stock[0].Id;MutantWorkshopView.Instance.Focus("part/"+partId);});
      steps.Add(()=>Shot("stock",1920,1080));steps.Add(()=>Shot("stock",1280,720));
      Tap(Key.Tab);steps.Add(()=>Check(MutantWorkshopView.Instance.FocusedKey=="part/"+MutantRuntime.Model.Stock[1].Id,"Tab tek adım ilerler"));Chord(Key.LeftShift,Key.Tab);steps.Add(()=>Check(MutantWorkshopView.Instance.FocusedKey=="part/"+partId,"Shift Tab geri ilerler"));Tap(Key.DownArrow);Tap(Key.UpArrow);
      Tap(Key.N);Tap(Key.Digit1);steps.Add(()=>Check(MutantRuntime.Run.State.ToString()==initial&&MutantRuntime.Abilities.Held.Count==0,"Panel gezinmesi/nitro/skill RNG/timer/gövde/parça değiştirmez"));
      Tap(Key.Escape);steps.Add(()=>Check(GameFlow.Paused&&!MutantWorkshopView.Instance.Visible,"Esc mevcut pause yolunda"));Tap(Key.Escape);Wait(()=>MutantWorkshopView.Instance.Visible);steps.Add(()=>Check(MutantWorkshopView.Instance.FocusedKey=="part/"+partId&&MutantRuntime.Run.State.ToString()==initial,"Pause dönüşü odak ve durum korunur"));
      steps.Add(()=>SettingsScreen.Show());steps.Add(()=>Check(!MutantWorkshopView.Instance.Visible,"Settings atölyeyi örter"));Tap(Key.Escape);Wait(()=>GameFlow.Paused&&!SettingsScreen.Open);Tap(Key.Escape);Wait(()=>MutantWorkshopView.Instance.Visible);
      steps.Add(()=>Check(MutantWorkshopView.Instance.FocusedKey=="part/"+partId&&MutantRuntime.Run.State.ToString()==initial,"Settings dönüşü odak ve durum korunur"));
      Click("workshop-back",()=>Check(MutantRuntime.Run.State.ToString()==initial&&MutantRuntime.Panel=="","Fare Geri salt; kaynaklar aynı"));Wait(WorldReady);
      steps.Add(()=>Check(!MutantRuntime.Abilities.Nitro().Open&&!MutantRuntime.Abilities.Skills()[0].Open,"Panelden sürüşe sızan nitro/skill isteği yok"));Tap(Key.N);steps.Add(()=>Check(MutantRuntime.Abilities.Nitro().Open,"Sürüşte N yolu çalışmaya devam eder"));Tap(Key.Digit1);steps.Add(()=>Check(MutantRuntime.Abilities.Skills()[0].Open,"Sürüşte skill yolu çalışmaya devam eder"));
      steps.Add(()=>{Fixture(500,70);partId=MutantRuntime.Model.Stock[0].Id;beforePhysics=P.Simulation.Parameters.GetHashCode().ToString();Expect(r=>r.BuyPart(partId,Level(partId)));vehicleChanges=MutantRuntime.Session.VehicleRefreshes;});Wait(()=>MutantWorkshopView.Instance.Visible);
      ClickPartBuy();steps.Add(()=>{Same("Normal alım mevcut Core ile aynı");Check(MutantRuntime.Session.VehicleRefreshes==vehicleChanges+1&&MutantRuntime.Session.BuildSetup().Parts.Contains(partId),"Alım mevcut araç hesabına ve yenileme bağlantısına geçer");string state=MutantRuntime.Run.State.ToString();Check(!MutantRuntime.Buy(partId)&&!MutantRuntime.Buy("__missing__")&&state==MutantRuntime.Run.State.ToString(),"Runtime eski/geçersiz parçayı güvenle reddeder");MutantWorkshopView.Instance.Back();});Wait(WorldReady);
      steps.Add(()=>Check(P.Simulation.Parameters.GetHashCode().ToString()!=beforePhysics&&MutantRuntime.Session.BuildSetup().Parts.Contains(partId),"Geri sonrası fizik kurulumu mevcut parçayla yenilenir"));
      steps.Add(()=>{Fixture(500,100);partId=MutantRuntime.Model.Stock[0].Id;MutantRuntime.Run.State.Set("para",CatalogNode.Num(MutantRuntime.Model.Stock[0].Price));});Wait(()=>MutantWorkshopView.Instance.Visible);steps.Add(()=>{MutantWorkshopView.Instance.Focus("part/"+partId);Expect(r=>r.BuyPart(partId,Level(partId)));});Tap(Key.Enter);steps.Add(()=>{Same("Tam fiyatla klavye alımı aynı");Check(MutantRuntime.Model.Money==0&&MutantRuntime.Model.Stock.All(s=>s.Id!=partId),"Tam fiyat harcanır ve parça stoktan kalkar");});
      steps.Add(()=>{Fixture(500,100);partId=MutantRuntime.Model.Stock[0].Id;MutantRuntime.Run.State.Set("para",CatalogNode.Num(MutantRuntime.Model.Stock[0].Price-1));});Wait(()=>MutantWorkshopView.Instance.Visible);steps.Add(()=>{initial=MutantRuntime.Run.State.ToString();MutantWorkshopView.Instance.Focus("part/"+partId);});Tap(Key.Enter);steps.Add(()=>Check(MutantRuntime.Run.State.ToString()==initial,"Yetersiz para alımı uygulamaz"));
      steps.Add(()=>Fixture(500,100));Wait(()=>MutantWorkshopView.Instance.Visible);steps.Add(()=>{initial=MutantRuntime.Run.State.ToString();MutantWorkshopView.Instance.Repair();Check(MutantRuntime.Run.State.ToString()==initial&&!MutantRuntime.Model.CanRepair,"Tam gövdede tamir uygulanmaz");});
      RepairCase("repair",90,70,false);RepairCase("partial",20,70,true);
      steps.Add(()=>Fixture(2,70));Wait(()=>MutantWorkshopView.Instance.Visible);steps.Add(()=>Shot("poor",1920,1080));steps.Add(()=>Shot("poor",1280,720));steps.Add(()=>{initial=MutantRuntime.Run.State.ToString();MutantWorkshopView.Instance.Repair();Check(MutantRuntime.Run.State.ToString()==initial&&!MutantRuntime.Model.CanRepair,"Bir puana yetmeyen para tamir harcamaz");});
      steps.Add(()=>Fixture(300,100));Wait(()=>MutantWorkshopView.Instance.Visible);steps.Add(()=>{token=MutantWorkshopView.Instance.StockStamp;partId=MutantRuntime.Model.Stock[0].Id;Expect(r=>r.RefreshStock());});
      Click("workshop-refresh",()=>{Same("Fare yenilemesi gerçek Core RNG sonucu ve bedelle aynı");string state=MutantRuntime.Run.State.ToString();MutantWorkshopView.Instance.Refresh();Check(state==MutantRuntime.Run.State.ToString(),"Tek giriş yenilemeyi iki kez uygulamaz");});
      steps.Add(()=>{string state=MutantRuntime.Run.State.ToString();MutantWorkshopView.Instance.Purchase(partId,token);Check(state==MutantRuntime.Run.State.ToString(),"Yenileme sonrası eski kart tokeni parça almaz");});
      steps.Add(()=>{Expect(r=>r.RefreshStock());MutantWorkshopView.Instance.Focus("refresh");});Tap(Key.Enter);steps.Add(()=>{Same("Sonraki açık yenileme işlemi yapılabilir");Check(MutantRuntime.Model.Money==220,"İki açık yenileme yalnız iki bedel harcar");});
      steps.Add(()=>{Fixture(0,100);MutantRuntime.Run.State.Set("stok",CatalogNode.Arr(Array.Empty<CatalogNode>()));});Wait(()=>MutantWorkshopView.Instance.Visible);steps.Add(()=>Shot("empty",1920,1080));steps.Add(()=>Shot("empty",1280,720));steps.Add(()=>{initial=MutantRuntime.Run.State.ToString();Check(MutantWorkshopView.Instance.FocusedKey=="back","Boş stok/yetersiz parada odak geçerli Geri");});Tap(Key.Enter);Wait(WorldReady);steps.Add(()=>Check(MutantHudView.Instance.Visible,"Klavye Geri HUD'a döner"));
      steps.Add(()=>{Fixture(1000,70);originalParts=MutantRuntime.Run.Catalog["parts"].Clone();var def=MutantRuntime.Run.Catalog["parts"].Items.First(p=>p["id"].S()==MutantRuntime.Model.Stock[0].Id);def.Set("n",CatalogNode.Str("Güçlendirilmiş sokak motoru · Uzun Türkçe parça adı"));def.Set("d",CatalogNode.Str(string.Concat(Enumerable.Repeat("Gövde ve çekiş dengesini mevcut kurulumla birlikte değerlendir. Açıklama bütünlüğü korunur; yeni bir güç kuralı eklenmez. ",22))));});
      Wait(()=>MutantWorkshopView.Instance.Visible);steps.Add(()=>Shot("long",1920,1080));steps.Add(()=>Shot("long",1280,720));steps.Add(()=>initial=MutantRuntime.Run.State.ToString());Tap(Key.PageDown);steps.Add(()=>{Check(MutantWorkshopView.Instance.Stock.scrollOffset.y>0&&MutantRuntime.Run.State.ToString()==initial,"Uzun açıklama klavyeyle kayar; durum değişmez");MutantRuntime.Run.Catalog.Set("parts",originalParts);MutantWorkshopView.Instance.Back();});Wait(WorldReady);
      steps.Add(()=>{MutantRuntime.Run.State["mek"].Set("enerji",CatalogNode.Num(40));MutantRuntime.Run.State["mek"].Set("etkiBekleme",CatalogNode.Num(0));typeof(MutantRuntime).GetProperty(nameof(MutantRuntime.MarkerId)).SetValue(null,MutantRuntime.Model.Events.First(e=>!e.Done).Id);typeof(MutantRuntime).GetProperty(nameof(MutantRuntime.Panel)).SetValue(null,"event");});Wait(()=>MutantEventView.Instance.Visible);steps.Add(()=>initial=MutantRuntime.Run.State.ToString());Tap(Key.N);Tap(Key.Digit1);steps.Add(()=>{Check(MutantRuntime.Run.State.ToString()==initial,"Ortak girdi koruması 2A panelinde de salt");MutantRuntime.ClosePanel();});Wait(WorldReady);steps.Add(()=>Check(!MutantRuntime.Abilities.Nitro().Open&&!MutantRuntime.Abilities.Skills()[0].Open,"2A panelinden sürüşe de istek sızmaz"));
      steps.Add(()=>{MutantRuntime.Exit();Check(GarageSession.State.Snapshot().ToString()==career&&GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Kariyer sahiplik para profil aynı");var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"İzole ürün kalıcı kayıt hash'leri aynı");Finish(null);});
    }
    private static void Chord(Key a,Key b){steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(a,b)));steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState()));}
    private static int Level(string id)=>(int)MutantRuntime.Run.Catalog["parts"].Items.First(p=>p["id"].S()==id)["sv"].N();
    private static void Sync(){foreach(var k in control.State.Fields.Select(p=>p.Key).ToArray())control.State.Remove(k);foreach(var p in MutantRuntime.Run.State.Fields)control.State.Set(p.Key,p.Value.Clone());}
    private static void Expect(Func<MutantRun,bool> command){Sync();Check(command(control),"Kontrol Core işlemi uygulanabilir");expectedState=control.State.ToString();}
    private static string Canonical(CatalogNode n)=>n.IsObject?"{"+string.Join(",",n.Fields.OrderBy(p=>p.Key,StringComparer.Ordinal).Select(p=>CatalogNode.Str(p.Key)+":"+Canonical(p.Value)))+"}":n.IsArray?"["+string.Join(",",n.Items.Select(Canonical))+"]":n.ToString();
    private static void Same(string label){string actual=MutantRuntime.Run.State.ToString();if(Canonical(CatalogNode.Parse(actual))!=Canonical(CatalogNode.Parse(expectedState))){File.WriteAllText(Path.Combine(Project,"Logs/b-workshop-expected.json"),expectedState);File.WriteAllText(Path.Combine(Project,"Logs/b-workshop-actual.json"),actual);Check(false,label);}Check(true,label);}
    private static void Fixture(double cash,double hp)
    {
      var r=MutantRuntime.Run;var choices=r.Catalog["parts"].Items.Where(p=>p["sv"].N()>0&&p["id"].S()!="motor-degisim").ToArray();var motor=choices.First(p=>p["kat"].S()=="motor");var stock=new[]{motor}.Concat(choices.Where(p=>p!=motor).Take(2));r.State.Set("para",CatalogNode.Num(cash));r.State.Set("govde",CatalogNode.Num(hp));r.State.Set("parcalar",CatalogNode.Arr(Array.Empty<CatalogNode>()));r.State.Set("stok",CatalogNode.Arr(stock.Select(p=>CatalogNode.Str(p["id"].S()))));r.State["mek"].Set("etkiKalan",CatalogNode.Num(0));r.State["mek"].Set("etkiBekleme",CatalogNode.Num(0));r.State["mek"].Set("enerji",CatalogNode.Num(40));r.State.Set("bec",MutantSkills.Initialize());r.State.Set("becCikti",CatalogNode.Parse("null"));
      typeof(MutantRuntime).GetProperty(nameof(MutantRuntime.Panel)).SetValue(null,"shop");
    }
    private static void ClickPartBuy(){steps.Add(()=>{MutantWorkshopView.Instance.Focus("part/"+partId);});Click(()=>"workshop-buy-"+partId);}
    private static void RepairCase(string label,double cash,double hp,bool keyboardRepair)
    {
      steps.Add(()=>Fixture(cash,hp));Wait(()=>MutantWorkshopView.Instance.Visible);steps.Add(()=>Shot(label,1920,1080));steps.Add(()=>Shot(label,1280,720));steps.Add(()=>{Expect(r=>r.Repair());vehicleChanges=MutantRuntime.Session.VehicleRefreshes;if(keyboardRepair)MutantWorkshopView.Instance.Focus("repair");});
      if(keyboardRepair)Tap(Key.Enter);else Click("workshop-repair");steps.Add(()=>{Same("Gerçek tamir sonucu / "+label);Check(MutantRuntime.Session.VehicleRefreshes==vehicleChanges+1,"Tamir araç yenilemesi tek / "+label);});
    }
    private static GtPrototype P=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    private static bool WorldReady()=>UnityEngine.SceneManagement.SceneManager.GetActiveScene().name=="GTTest"&&P?.Simulation!=null&&P.Race==null&&MutantRuntime.Panel==""&&MutantHudView.Instance.Visible;
    private static void Shot(string name,int w,int h){Time.timeScale=0;shot=name;shotW=w;shotH=h;queued=false;Size(w,h);}
    private static void Size(int w,int h)
    {
      var a=typeof(EditorWindow).Assembly;var t=a.GetType("UnityEditor.GameView");if(!game){game=EditorWindow.GetWindow(t);originalSize=(int)t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(game);}
      var st=a.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null);group=st.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int n=(int)group.GetType().GetMethod("GetTotalCount").Invoke(group,null);var size=Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"P7 Mutant"});group.GetType().GetMethod("AddCustomSize").Invoke(group,new[]{size});sizes.Add(n);
      t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,n);game.Show();game.Focus();game.Repaint();
    }
    private static void Capture()
    {
      string path=Path.Combine(Project,"Logs/b-workshop-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      ValidateShot();
      proof.images.Add(Path.GetFileName(path));shot=null;Time.timeScale=1;
    }
    private static void ValidateShot()
    {
      var page=UiRoot.Instance.Screen.Q("b-mutant-workshop");var view=MutantWorkshopView.Instance;var m=MutantRuntime.Model;string N(double n)=>n.ToString("0.##",System.Globalization.CultureInfo.InvariantCulture);
      Check(view.Visible&&!MutantHudView.Instance.Visible,"Atölye tek görünüm sahibi / "+shot+shotW);
      Check(page.Q<Label>("workshop-money").text==N(m.Money)+" PARA"&&page.Q<Label>("workshop-body").text=="Gövde "+N(m.Body)+" / 100"&&page.Q<Label>("workshop-power").text=="Güç kaybı %"+N(m.PowerLossPercent),"Gerçek kaynaklar modelle aynı / "+shot+shotW);
      Check(page.Q<Label>("workshop-full-cost").text=="Tam tamir bedeli: "+N(m.RepairCost)+" para","Tam tamir bedeli ayrı / "+shot+shotW);
      Check(page.Q("workshop-repair").enabledInHierarchy==m.CanRepair&&page.Q("workshop-refresh").enabledInHierarchy==m.CanRefresh,"İşlem uygunluğu gerçek modelde / "+shot+shotW);
      if(m.CanRepair)Check(page.Q<Label>("workshop-repair-preview").text.Contains(N(m.RepairPreview.Cost)+" para")&&page.Q<Label>("workshop-repair-preview").text.Contains(m.RepairPreview.Partial?"kısmi tamir":"tam tamir"),"Şimdiki tamir bedeli/türü doğru / "+shot+shotW);
      foreach(string name in new[]{"workshop-money","workshop-body","workshop-power","workshop-full-cost","workshop-repair-preview","workshop-repair","workshop-refresh","workshop-back","workshop-notice"}){var e=page.Q(name);Check(e.worldBound.xMin>=0&&e.worldBound.xMax<view.Stock.worldBound.xMin&&e.worldBound.yMax<page.worldBound.yMax-90,"Kaynak/eylem erişilebilir / "+name+shot+shotW);}
      Check(view.Stock.Query(className:"ms-card").ToList().Count==m.Stock.Length,"Gerçek stok sayısı / "+shot+shotW);
      foreach(var r in m.Stock){var card=page.Q("workshop-part-"+r.Id);Check(card.Q<Label>("part-name").text==r.Name&&card.Q<Label>("part-category").text==r.Category&&card.Q<Label>("part-description").text==r.Description&&card.Q<Label>("part-price").text==N(r.Price)+" PARA","Parça bilgisi/fiyat gerçek modelde / "+r.Id+shot+shotW);
        Check(card.Q("workshop-buy-"+r.Id).enabledInHierarchy==r.CanBuy,"Satın alma uygunluğu / "+r.Id+shot+shotW);Check(!card.Q(className:"ms-icon").ClassListContains("mc-icon-fallback"),"Parça gerçek kategori ikonunda / "+r.Id+shot+shotW);
        foreach(var l in card.Query<Label>().ToList())Check(l.worldBound.xMin>=card.worldBound.xMin&&l.worldBound.xMax<=card.worldBound.xMax+1&&l.worldBound.yMax<=card.worldBound.yMax+1,"Parça metni kartta sığar / "+l.name+r.Id+shot+shotW);
      }
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("B etkinlik kısa Play: "+Status());if(EditorApplication.timeSinceStartup-at<.45)return;at=EditorApplication.timeSinceStartup;File.WriteAllText(Path.Combine(Project,"Logs/b-workshop-progress.txt"),Status());if(steps.Count==0){if(!MutantWorkshopView.Instance)return;Setup();return;}if(shot!=null){Capture();return;}if(index<steps.Count)steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static string Status()=>"index="+index+" steps="+steps.Count+" pause="+GameFlow.Paused+" editorPause="+EditorApplication.isPaused+" scale="+Time.timeScale+" scene="+UnityEngine.SceneManagement.SceneManager.GetActiveScene().name+" panel="+MutantRuntime.Panel+" phase="+(MutantRuntime.Run?.State["faz"].S()??"null")+" root="+(UiRoot.Instance!=null)+" hud="+(MutantHudView.Instance!=null)+" visible="+(MutantHudView.Instance?.Visible??false)+" settings="+SettingsScreen.Open+" sim="+(P?.Simulation!=null)+" race="+(P?.Race!=null)+" touch="+(Touchscreen.current!=null);
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.environment=Application.unityVersion+" | "+Application.platform+" | "+Application.productName+" | GameView";proof.result=e==null?"b-workshop-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/b-workshop-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Mutant F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
