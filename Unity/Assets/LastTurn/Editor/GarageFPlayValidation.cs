using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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
    [Serializable]private sealed class Proof{public string result,error,utc;public List<string> checks=new List<string>();public string[] images;public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double at,began;
    private static Keyboard keyboard;private static VisualElement pointerTarget;private static Vector2 pointerPoint;private static GarageView view;private static GarageScreen old;private static int car;private static string part;private static double balance,cost;private static RenderTexture target;private static string shot;private static int shotW,shotH;
    private static Dictionary<string,string> userFiles;private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static GarageFPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartBatch()
    {
      if(!Application.isBatchMode||EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Ayrı batch test gerekir.");
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
      userFiles=PlayerFiles();GarageSession.Open(SessionState.GetString(PathKey,""),true);
      GarageSession.Transact(s=>{s.AddMoney(100000);s.AddXp(100000);return true;},"Ayrı P7 doğrulama kaydı");
      keyboard=InputSystem.AddDevice<Keyboard>();InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;
      GameFlow.RaceMenu();GameFlow.Browse(0);old=UnityEngine.Object.FindFirstObjectByType<GarageScreen>();old.SelectShop(false);view=GarageView.Instance;
      steps.Add(()=>Check(view.Visible&&!view.Modifying,"F Garaj gerçek paneli görünür"));
      int initial=GarageSession.State.SelectedCar;
      Tap(Key.RightArrow);steps.Add(()=>{car=view.ViewedCar;Check(car!=initial,"Sağ ok araç kartını değiştirir");});Tap(Key.Enter);
      steps.Add(()=>Check(GarageSession.State.SelectedCar==car,"Enter gerçek araç seçimini diske yazar"));
      steps.Add(()=>Shot("garage-1920",1920,1080));
      // Batch'te OS Game View yoktur: gerçek panel hit-test'i ve aynı PointerDown/Up Clickable yolu yürür.
      steps.Add(()=>{var card=UiRoot.Instance.Screen.Q("car-"+initial);pointerPoint=card.worldBound.center;pointerTarget=card.panel.Pick(pointerPoint);Check(pointerTarget==card||card.Contains(pointerTarget),"Fare hit-test'i görünür araç kartında");});
      steps.Add(()=>{using(var e=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=pointerPoint}))pointerTarget.SendEvent(e);});
      steps.Add(()=>{using(var e=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=pointerPoint}))pointerTarget.SendEvent(e);});
      steps.Add(()=>Check(view.ViewedCar==initial,"Fare gerçek araç kartını seçer"));
      steps.Add(()=>{GameFlow.OpenStore();Check(old.StoreOpen,"Mağaza bağlantısı eski çalışan ekrana gider");});
      steps.Add(()=>{var offer=GarageViewModel.Cars(GarageSession.State).First(c=>!c.Owned&&c.Block=="");double before=GarageSession.State.Balance;Check(GarageSession.Execute(offer.Primary),"Mağazanın gerçek araç satın alma komutu");Check(GarageSession.State.OwnsCar(offer.Index)&&GarageSession.State.Balance==before-offer.Price,"Araç satın alma bakiye/sahiplik");car=offer.Index;old.SelectShop(false);old.ViewCar(car);old.SelectTab(0);});
      steps.Add(()=>Shot("garage-1280",1280,720));Tap(Key.M);
      steps.Add(()=>{Check(view.Modifying,"M Modifiye ekranını açar");view.SelectCategory(0);var rows=GarageViewModel.Parts(GarageSession.State,car,GarageViewModel.Categories(GarageSession.Catalog)[0].Id);int n=Array.FindIndex(rows,p=>!p.Owned&&p.Cost>0&&p.Enabled);part=rows[n].Id;cost=rows[n].Cost;view.SelectPart(n);balance=GarageSession.State.Balance;Check(view.Detail.PreviewPower>view.Detail.Power,"Seçili parça gerçek güç önizlemesi");});
      steps.Add(()=>Shot("mods-1920",1920,1080));steps.Add(()=>Shot("mods-1280",1280,720));
      Tap(Key.Enter);steps.Add(()=>Check(GarageSession.State.Balance==balance,"İlk Enter satın alma onayı; bakiye değişmez"));Tap(Key.Enter);
      steps.Add(()=>{Check(GarageSession.State.OwnsPart(car,part)&&GarageSession.State.Equipped(car).Contains(part),"İkinci Enter parçayı satın alır ve takar");Check(GarageSession.State.Balance==balance-cost,"Parça bedeli bir kez düşer");balance=GarageSession.State.Balance;});Tap(Key.X);
      steps.Add(()=>Check(!GarageSession.State.Equipped(car).Contains(part)&&GarageSession.State.Balance==balance,"X söker; iade üretmez"));Tap(Key.Enter);
      steps.Add(()=>{Check(GarageSession.State.Equipped(car).Contains(part)&&GarageSession.State.Balance==balance,"Sahip olunan parça Enter ile ücretsiz takılır");GarageSession.Reload();});
      steps.Add(()=>Check(GarageSession.State.OwnsCar(car)&&GarageSession.State.OwnsPart(car,part)&&GarageSession.State.Equipped(car).Contains(part)&&GarageSession.State.Balance==balance,"Diskten yeniden açılınca araç/parça/bakiye korunur"));
      Tap(Key.Escape);steps.Add(()=>Check(view.Visible&&!view.Modifying,"Esc Garaj'a döner"));Tap(Key.Q);
      steps.Add(()=>Check(GameFlow.Home&&GameFlow.Hub==GameFlow.MenuHub.Race&&!view.Visible,"Q Kariyer menüsüne döner"));
      steps.Add(()=>{var now=PlayerFiles();Check(now.Count==userFiles.Count&&userFiles.All(p=>now.TryGetValue(p.Key,out var hash)&&hash==p.Value),"Oyuncu kayıt dosyaları aynı hash'te");Finish(null);});
    }
    private static void Shot(string name,int w,int h)
    {shot=name;shotW=w;shotH=h;target=new RenderTexture(w,h,24,RenderTextureFormat.ARGB32);var s=UiRoot.Instance.Settings;s.targetTexture=target;s.clearColor=true;s.colorClearValue=new Color(.035f,.055f,.075f,1);}
    private static void SaveShot()
    {
      var previous=RenderTexture.active;var image=new Texture2D(shotW,shotH,TextureFormat.RGBA32,false);
      try{RenderTexture.active=target;image.ReadPixels(new Rect(0,0,shotW,shotH),0,0);image.Apply();File.WriteAllBytes(Path.Combine(Project,"Logs/p7-"+shot+".png"),image.EncodeToPNG());
        var page=UiRoot.Instance.Screen.Q("f-garage");Check(page.worldBound.width>100&&page.worldBound.height>100,"Yerleşim görünür "+shot);
        var effect=page.Q(className:"g-effect");if(effect!=null){var r=effect.worldBound;Check(r.xMin>=0&&r.xMax<=UiRoot.Instance.Root.layout.width+2,"Etki paneli yatay sınır içinde "+shot);var button=effect.Q(className:"ltb");Check(button.worldBound.yMax<=r.yMax+1,"Satın alma düğmesi görünür "+shot);}
        else{var right=page.Q(className:"g-right");var actions=page.Q(className:"g-actions");Check(right.worldBound.yMax<=actions.worldBound.yMin,"Özellik paneli ve işlemler çakışmaz "+shot);}}
      finally{RenderTexture.active=previous;UiRoot.Instance.Settings.targetTexture=null;target.Release();UnityEngine.Object.DestroyImmediate(target);UnityEngine.Object.DestroyImmediate(image);shot=null;}
    }
    private static void Tick()
    {
      try
      {
        if(EditorApplication.timeSinceStartup-began>100)throw new TimeoutException("P7 kısa Play süresi");
        if(steps.Count==0){if(!GarageView.Instance||!UnityEngine.Object.FindFirstObjectByType<GarageScreen>())return;Setup();at=EditorApplication.timeSinceStartup;return;}
        if(EditorApplication.timeSinceStartup-at<.45)return;
        if(shot!=null){SaveShot();at=EditorApplication.timeSinceStartup;return;}
        if(index<steps.Count){steps[index++]();at=EditorApplication.timeSinceStartup;}
      }catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      proof.result=e==null?"p7-garage-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.images=new[]{"p7-garage-1920.png","p7-garage-1280.png","p7-mods-1920.png","p7-mods-1280.png"};
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>Path.GetExtension(f)==".cs"||Path.GetExtension(f)==".uss").OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/p7-garage-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Garaj Play geçti: "+proof.checks.Count);
      EditorApplication.ExitPlaymode();EditorApplication.delayCall+=()=>EditorApplication.Exit(e==null?0:1);
    }
  }
}
