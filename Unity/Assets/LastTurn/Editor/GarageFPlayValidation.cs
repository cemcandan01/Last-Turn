using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Ui;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.UIElements;

namespace LastTurn.EditorValidation
{
  [InitializeOnLoad]
  public static class GarageFPlayValidation
  {
    private const string Active="LastTurn.P7Garage.Active",PathKey="LastTurn.P7Garage.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc;public bool gameView;public List<string> checks=new List<string>();public string[] images;public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double at,began;
    private static Keyboard keyboard;private static VisualElement pointerTarget;private static Vector2 pointerPoint;private static GarageView view;private static GarageScreen old;private static int car;private static string part;private static double balance,cost;private static RenderTexture target;private static string shot;private static int shotW,shotH;
    private static Dictionary<string,string> userFiles;private static string Project=>Path.GetDirectoryName(Application.dataPath);
    private static readonly List<string> images=new List<string>();private static bool captureQueued;private static DateTime captureAfter;private static readonly List<int> gameSizes=new List<int>();private static object sizeGroup;private static EditorWindow gameView;private static int originalSize;
    static GarageFPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartBatch()
    {
      if(!Application.isBatchMode||EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Ayrı batch test gerekir.");
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;
      InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      GarageSceneBuilder.Open();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/P7Garage/"+Guid.NewGuid().ToString("N")+"/garage.json"));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)
        throw new InvalidOperationException("Ayrı LastTurnUiValidation grafik Editor kopyası ve test bayrağı gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;
      InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      GarageSceneBuilder.Open();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/P7Garage/"+Guid.NewGuid().ToString("N")+"/garage.json"));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange s)
    {if(s==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){proof=new Proof();index=0;began=at=EditorApplication.timeSinceStartup;steps.Clear();EditorApplication.update+=Tick;}if(s==PlayModeStateChange.ExitingPlayMode)EditorApplication.update-=Tick;}
    private static void Check(bool ok,string text){if(!ok)throw new Exception(text);proof.checks.Add(text);}
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","");}
    private static Dictionary<string,string> PlayerFiles()=>new[]{"LastTurnGarage","LastTurnMutant","LastTurnSettings"}.Select(n=>Path.Combine(Application.persistentDataPath,n)).Where(Directory.Exists).SelectMany(p=>Directory.GetFiles(p,"*",SearchOption.AllDirectories)).ToDictionary(p=>p,Hash);
    private static void Tap(Key key){steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(key)));steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState()));}
    private static void Setup()
    {
      userFiles=PlayerFiles();GarageSession.Open(SessionState.GetString(PathKey,""),true);proof.gameView=!Application.isBatchMode;images.Clear();
      GarageSession.Transact(s=>{s.AddMoney(100000);s.AddXp(100000);return true;},"Ayrı P7 doğrulama kaydı");
      keyboard=InputSystem.AddDevice<Keyboard>();InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;
      old=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();view=GarageView.Instance;GameFlow.MainMenu();
      steps.Add(()=>Check(GameFlow.Home&&GameFlow.Hub==GameFlow.MenuHub.Home,"Akış ana menüde başlar"));Tap(Key.Enter);
      steps.Add(()=>Check(GameFlow.Home&&GameFlow.Hub==GameFlow.MenuHub.Race,"Ana Menü Enter Yarış menüsünü açar"));Tap(Key.E);
      steps.Add(()=>Check(view.Visible&&!view.Modifying,"F Garaj gerçek paneli görünür"));
      int initial=GarageSession.State.SelectedCar;
      Tap(Key.RightArrow);steps.Add(()=>{car=view.ViewedCar;Check(car!=initial,"Sağ ok araç kartını değiştirir");});Tap(Key.Enter);
      steps.Add(()=>Check(GarageSession.State.SelectedCar==car,"Enter gerçek araç seçimini diske yazar"));
      steps.Add(()=>Shot("garage-1920",1920,1080));
      steps.Add(()=>Shot("garage-2560",2560,1080));
      // Batch'te OS Game View yoktur: gerçek panel hit-test'i ve aynı PointerDown/Up Clickable yolu yürür.
      steps.Add(()=>{var card=UiRoot.Instance.Screen.Q("car-"+initial);pointerPoint=card.worldBound.center;pointerTarget=card.panel.Pick(pointerPoint);Check(pointerTarget==card||card.Contains(pointerTarget),"Fare hit-test'i görünür araç kartında");});
      steps.Add(()=>{using(var e=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=pointerPoint}))pointerTarget.SendEvent(e);});
      steps.Add(()=>{using(var e=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=pointerPoint}))pointerTarget.SendEvent(e);});
      steps.Add(()=>Check(view.ViewedCar==initial,"Fare gerçek araç kartını seçer"));
      steps.Add(()=>{GameFlow.OpenStore();Check(old.StoreOpen,"Mağaza bağlantısı mevcut oturum ekranını açar");});
      steps.Add(()=>{var offer=GarageViewModel.Cars(GarageSession.State).First(c=>!c.Owned&&c.Block=="");double before=GarageSession.State.Balance;Check(GarageSession.Execute(offer.Primary),"Mağazanın gerçek araç satın alma komutu");Check(GarageSession.State.OwnsCar(offer.Index)&&GarageSession.State.Balance==before-offer.Price,"Araç satın alma bakiye/sahiplik");car=offer.Index;old.SelectShop(false);old.ViewCar(car);old.SelectTab(0);});
      steps.Add(()=>Shot("garage-1280",1280,720));Tap(Key.M);
      steps.Add(()=>{Check(view.Modifying,"M Modifiye ekranını açar");view.SelectCategory(0);var rows=GarageViewModel.Parts(GarageSession.State,car,GarageViewModel.Categories(GarageSession.Catalog)[0].Id);int n=Array.FindIndex(rows,p=>!p.Owned&&p.Cost>0&&p.Enabled);part=rows[n].Id;cost=rows[n].Cost;view.SelectPart(n);balance=GarageSession.State.Balance;Check(view.Detail.PreviewPower>view.Detail.Power,"Seçili parça gerçek güç önizlemesi");});
      steps.Add(()=>Shot("mods-1920",1920,1080));steps.Add(()=>Shot("mods-1280",1280,720));
      steps.Add(()=>Shot("mods-2560",2560,1080));
      Tap(Key.Enter);steps.Add(()=>Check(GarageSession.State.Balance==balance,"İlk Enter satın alma onayı; bakiye değişmez"));Tap(Key.Enter);
      steps.Add(()=>{Check(GarageSession.State.OwnsPart(car,part)&&GarageSession.State.Equipped(car).Contains(part),"İkinci Enter parçayı satın alır ve takar");Check(GarageSession.State.Balance==balance-cost,"Parça bedeli bir kez düşer");balance=GarageSession.State.Balance;});Tap(Key.X);
      steps.Add(()=>Check(!GarageSession.State.Equipped(car).Contains(part)&&GarageSession.State.Balance==balance,"X söker; iade üretmez"));Tap(Key.Enter);
      steps.Add(()=>{Check(GarageSession.State.Equipped(car).Contains(part)&&GarageSession.State.Balance==balance,"Sahip olunan parça Enter ile ücretsiz takılır");GarageSession.Reload();});
      steps.Add(()=>Check(GarageSession.State.OwnsCar(car)&&GarageSession.State.OwnsPart(car,part)&&GarageSession.State.Equipped(car).Contains(part)&&GarageSession.State.Balance==balance,"Diskten yeniden açılınca araç/parça/bakiye korunur"));
      Tap(Key.Escape);steps.Add(()=>Check(view.Visible&&!view.Modifying,"Esc Garaj'a döner"));Tap(Key.Q);
      steps.Add(()=>Check(GameFlow.Home&&GameFlow.Hub==GameFlow.MenuHub.Race&&!view.Visible,"Q Kariyer menüsüne döner"));
      Tap(Key.E);steps.Add(()=>Check(view.Visible&&!view.Modifying,"Yarış menüsünden tekrar Garaj'a girilir"));
      Tap(Key.E);steps.Add(()=>Check(StoreView.Instance.Visible&&!view.Visible,"Garaj E F Mağaza'yı açar"));
      steps.Add(()=>{
        var store=StoreView.Instance;Check(store.VisibleCarCount==GarageViewModel.Cars(GarageSession.State).Length,"Mağaza tüm 15 aracı listeler");
        store.SetFilter("dp");Check(store.VisibleCarCount==GarageViewModel.Cars(GarageSession.State).Count(c=>c.Type=="dp"),"Drift filtresi katalogla aynı");store.SetFilter("");
        var offer=GarageViewModel.Cars(GarageSession.State).First(c=>!c.Owned&&c.Block=="");car=offer.Index;cost=offer.Price;balance=GarageSession.State.Balance;store.ViewCar(car);
      });
      steps.Add(()=>Shot("store-1920",1920,1080));steps.Add(()=>Shot("store-1280",1280,720));steps.Add(()=>Shot("store-2560",2560,1080));
      Tap(Key.Enter);steps.Add(()=>Check(StoreView.Instance.Confirming&&GarageSession.State.Balance==balance,"Mağaza ilk Enter para harcamadan onay ister"));Tap(Key.Escape);
      steps.Add(()=>Check(StoreView.Instance.Visible&&!StoreView.Instance.Confirming&&GarageSession.State.Balance==balance,"Esc satın almayı iptal eder"));
      Tap(Key.Enter);Tap(Key.Enter);
      steps.Add(()=>{Check(GarageSession.State.OwnsCar(car)&&GarageSession.State.Balance==balance-cost,"Mağaza satın alma sahiplik ve tek bedel");balance=GarageSession.State.Balance;});
      Tap(Key.Enter);steps.Add(()=>Check(view.Visible&&view.ViewedCar==car,"Satın alınan araç Garaj'da görünür"));Tap(Key.Enter);
      steps.Add(()=>{Check(GarageSession.State.SelectedCar==car,"Satın alınan araç sürüşe seçilir");GarageSession.Reload();});
      steps.Add(()=>Check(GarageSession.State.SelectedCar==car&&GarageSession.State.OwnsCar(car)&&GarageSession.State.Balance==balance,"Mağaza sahiplik/seçim/bakiye diskten korunur"));
      Tap(Key.E);Tap(Key.Tab);steps.Add(()=>Check(view.Visible&&view.Modifying&&GarageSession.State.OwnsCar(view.ViewedCar),"Mağaza Parçalar mevcut Modifiye'ye sahip olunan araçla gider"));Tap(Key.Escape);Tap(Key.E);
      steps.Add(()=>{GarageSession.Open(Path.Combine(Project,"Logs/P7Garage/"+Guid.NewGuid().ToString("N")+"/garage.json"),true);var offer=GarageViewModel.Cars(GarageSession.State).First(c=>!c.Owned);StoreView.Instance.ViewCar(offer.Index);balance=GarageSession.State.Balance;});
      steps.Add(()=>{var offer=StoreView.Instance.Offer;Check(offer.Block!=""&&!UiRoot.Instance.Screen.Q("store-buy").enabledSelf,"Yetersiz para/kilit satın almayı kapatır");StoreView.Instance.Activate();Check(GarageSession.State.Balance==balance&&!GarageSession.State.OwnsCar(offer.Index),"Engelli işlem sahiplik ve bakiyeyi değiştirmez");});
      steps.Add(()=>{car=GarageSession.State.SelectedCar;StoreView.Instance.ViewCar(Math.Max(0,car-1));});
      // Rebuild/ScrollTo sonrası gerçek panel yerleşimine bir kare bırak.
      steps.Add(()=>{var card=UiRoot.Instance.Screen.Q("store-car-"+car);pointerPoint=card.worldBound.center;pointerTarget=card.panel.Pick(pointerPoint);Check(pointerTarget==card||card.Contains(pointerTarget),"Mağaza araç kartı fare hit-test içinde");});
      steps.Add(()=>{using(var e=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=pointerPoint}))pointerTarget.SendEvent(e);});
      steps.Add(()=>{using(var e=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=pointerPoint}))pointerTarget.SendEvent(e);});
      steps.Add(()=>Check(StoreView.Instance.ViewedCar==car,"Mağaza fare kart seçimi"));Tap(Key.Escape);
      steps.Add(()=>Check(GameFlow.Home&&GameFlow.Hub==GameFlow.MenuHub.Race,"Mağaza Esc Yarış menüsüne döner"));
      steps.Add(()=>{var now=PlayerFiles();Check(now.Count==userFiles.Count&&userFiles.All(p=>now.TryGetValue(p.Key,out var hash)&&hash==p.Value),"Oyuncu kayıt dosyaları aynı hash'te");Finish(null);});
    }
    private static void Shot(string name,int w,int h)
    {
      shot=name;shotW=w;shotH=h;captureQueued=false;
      if(!Application.isBatchMode){SetGameSize(w,h);return;}
      target=new RenderTexture(w,h,24,RenderTextureFormat.ARGB32);var s=UiRoot.Instance.Settings;s.targetTexture=target;s.clearColor=true;s.colorClearValue=new Color(.035f,.055f,.075f,1);
    }
    private static string ImagePath=>Path.Combine(Project,"Logs/p7-"+(proof.gameView?"gameview-":"")+shot+".png");
    private static void SetGameSize(int w,int h)
    {
      var assembly=typeof(EditorWindow).Assembly;var type=assembly.GetType("UnityEditor.GameView");
      if(!gameView){gameView=EditorWindow.GetWindow(type);originalSize=(int)type.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(gameView);}
      var sizesType=assembly.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(sizesType).GetProperty("instance").GetValue(null);
      sizeGroup=sizesType.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int index=(int)sizeGroup.GetType().GetMethod("GetTotalCount").Invoke(sizeGroup,null);
      var size=Activator.CreateInstance(assembly.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(assembly.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"P7 doğrulama"});
      sizeGroup.GetType().GetMethod("AddCustomSize").Invoke(sizeGroup,new[]{size});gameSizes.Add(index);
      type.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(gameView,index);gameView.Show();gameView.Focus();gameView.Repaint();
    }
    private static void SaveShot()
    {
      if(proof.gameView)
      {
        if(!captureQueued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(ImagePath);captureQueued=true;return;}
        if(!File.Exists(ImagePath)||File.GetLastWriteTimeUtc(ImagePath)<captureAfter)return;
        var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(ImagePath));Check(png.width==shotW&&png.height==shotH,"Game View PNG boyutu "+shot);}finally{UnityEngine.Object.DestroyImmediate(png);}
        Layout();images.Add(Path.GetFileName(ImagePath));shot=null;return;
      }
      var previous=RenderTexture.active;var image=new Texture2D(shotW,shotH,TextureFormat.RGBA32,false);
      try{RenderTexture.active=target;image.ReadPixels(new Rect(0,0,shotW,shotH),0,0);image.Apply();File.WriteAllBytes(Path.Combine(Project,"Logs/p7-"+shot+".png"),image.EncodeToPNG());
        Layout();images.Add(Path.GetFileName(ImagePath));}
      finally{RenderTexture.active=previous;UiRoot.Instance.Settings.targetTexture=null;target.Release();UnityEngine.Object.DestroyImmediate(target);UnityEngine.Object.DestroyImmediate(image);shot=null;}
    }
    private static void Layout()
    {
        var page=UiRoot.Instance.Screen.Q(StoreView.Instance.Visible?"f-store":"f-garage");Check(page.worldBound.width>100&&page.worldBound.height>100,"Yerleşim görünür "+shot);
        if(StoreView.Instance.Visible){var buy=page.Q("store-buy");Check(buy.worldBound.yMax<=page.worldBound.yMax-50&&buy.worldBound.xMin>=0,"Mağaza satın alma düğmesi sınırlar içinde "+shot);return;}
        var effect=page.Q(className:"g-effect");if(effect!=null){var r=effect.worldBound;Check(r.xMin>=0&&r.xMax<=UiRoot.Instance.Root.layout.width+2,"Etki paneli yatay sınır içinde "+shot);var button=effect.Q(className:"ltb");Check(button.worldBound.yMax<=r.yMax+1,"Satın alma düğmesi görünür "+shot);}
        else{var right=page.Q(className:"g-right");var actions=page.Q(className:"g-actions");Check(right.worldBound.yMax<=actions.worldBound.yMin,"Özellik paneli ve işlemler çakışmaz "+shot);}
    }
    private static void Tick()
    {
      try
      {
        if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("P7 kısa Play süresi");
        if(steps.Count==0){if(!GarageView.Instance||!UnityEngine.Object.FindFirstObjectByType<GarageScreen>())return;Setup();at=EditorApplication.timeSinceStartup;return;}
        if(EditorApplication.timeSinceStartup-at<.45)return;
        if(shot!=null){SaveShot();at=EditorApplication.timeSinceStartup;return;}
        if(index<steps.Count){steps[index++]();at=EditorApplication.timeSinceStartup;}
      }catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(gameView&&sizeGroup!=null){gameView.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(gameView,originalSize);foreach(int i in gameSizes.AsEnumerable().Reverse())sizeGroup.GetType().GetMethod("RemoveCustomSize").Invoke(sizeGroup,new object[]{i});}
      proof.result=e==null?"p7-garage-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.images=images.ToArray();
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>Path.GetExtension(f)==".cs"||Path.GetExtension(f)==".uss").OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/p7-garage-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Garaj Play geçti: "+proof.checks.Count);
      EditorApplication.ExitPlaymode();EditorApplication.delayCall+=()=>EditorApplication.Exit(e==null?0:1);
    }
  }
}
