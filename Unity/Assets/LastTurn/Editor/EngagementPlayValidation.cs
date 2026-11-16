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
    [Serializable] private sealed class Source {public string path,hash;}
    [Serializable] private sealed class Proof {public string result,utc,error;public List<string> checks=new List<string>(),images=new List<string>(),errors=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index,stepped;
    private static double began,at,shotAt;private static string shot;private static int width;private static RenderTexture target;
    private static RaceTestDriver driver;
    private static Keyboard keyboard;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    private static GtPrototype P=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>();
    static EngagementPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartBatch()
    {
      if(!Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Application.companyName!="LastTurnPitUiValidation"||!Environment.GetCommandLineArgs().Contains("-lastTurnUiValidation"))throw new InvalidOperationException("Ayrı doğrulama ürünü gerekir.");
      foreach(var type in typeof(EngagementPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation"))
      {var f=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(f!=null&&f.IsLiteral&&f.FieldType==typeof(string))SessionState.SetBool((string)f.GetRawConstantValue(),false);}
      GarageSceneBuilder.Open();SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
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
    private static void Shots(string name)
    {
      foreach(int w in new[]{1280,1920})Add(()=>{width=w;target=new RenderTexture(w,w*9/16,24,RenderTextureFormat.ARGB32);UiRoot.Instance.Settings.clearColor=true;UiRoot.Instance.Settings.colorClearValue=Color.clear;UiRoot.Instance.Settings.targetTexture=target;Hud.SizeOverride=new Vector2(w,w*9/16);shot=name+"-"+w;shotAt=EditorApplication.timeSinceStartup;});
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
      Add(()=>Check(proof.errors.Count==0,"Çalışma anı hata yok"));
    }
    private static bool Capture()
    {
      if(shot==null)return false;if(EditorApplication.timeSinceStartup-shotAt<.5)return true;
      int height=width*9/16;var a=new Texture2D(width,height,TextureFormat.RGBA32,false);var b=new Texture2D(width,height,TextureFormat.RGBA32,false);var scene=new RenderTexture(width,height,24);var old=RenderTexture.active;var camera=Camera.main;
      try
      {
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
      try{if(EditorApplication.timeSinceStartup-began>180)throw new TimeoutException("Ustalık Play "+index+"/"+steps.Count);if(Capture()){at=EditorApplication.timeSinceStartup;return;}if(EditorApplication.timeSinceStartup-at<.3)return;at=EditorApplication.timeSinceStartup;if(steps.Count==0){if(!UiRoot.Instance)return;Setup();return;}if(index>=steps.Count){Finish(null);return;}steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception error)
    {
      SessionState.SetBool(Active,false);EditorApplication.update-=Tick;Application.logMessageReceived-=Logged;proof.result=error==null?"engagement-play-passed":"failed";proof.error=error?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");
      if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".jpg"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>{using(var h=SHA256.Create())return new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(f))).Replace("-","")};}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/engagement-play.json"),JsonUtility.ToJson(proof,true));if(error!=null)Debug.LogException(error);EditorApplication.Exit(error==null?0:1);
    }
  }
}
