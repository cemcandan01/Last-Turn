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
  // Gerçek UI Toolkit Play ve panel/kamera çizimi. Mutant panelleri mevcut modelden,
  // kontrollü test fazlarında gösterilir; bu test tam koşu veya insan kabulü değildir.
  [InitializeOnLoad]
  public static class PitUiPlayValidation
  {
    private const string Active="LastTurn.Pit.Active",PathKey="LastTurn.Pit.Path";
    [Serializable] private sealed class Source { public string path,hash; }
    [Serializable] private sealed class Proof
    {
      public string result,utc,error,environment="Unity grafik batch Play; sentetik klavye/fare, kontrollü Mutant fazları; 1920/1280 panel+kamera çizimi";
      public List<string> checks=new List<string>(),images=new List<string>(),errors=new List<string>();public Source[] sources;
    }
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;
    private static double began,at,shotAt;private static Keyboard keyboard;private static string career,profile,shot;private static int width,height;private static RenderTexture target;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static PitUiPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartBatch()
    {
      if(!Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Application.companyName!="LastTurnPitUiValidation"||!Environment.GetCommandLineArgs().Contains("-lastTurnUiValidation"))throw new InvalidOperationException("Yalnız ayrı pit doğrulama ürünü.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Test Editor'ı zaten Play'de.");
      foreach(var type in typeof(PitUiPlayValidation).Assembly.GetTypes().Where(t=>t.Namespace=="LastTurn.EditorValidation"))
      {var f=type.GetField("Active",BindingFlags.NonPublic|BindingFlags.Static);if(f!=null&&f.IsLiteral&&f.FieldType==typeof(string))SessionState.SetBool((string)f.GetRawConstantValue(),false);}
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;
      InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      GarageSceneBuilder.Open();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/Pit/"+Guid.NewGuid().ToString("N")+"/garage.json"));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange state)
    {
      if(state==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false))
      {proof=new Proof();steps.Clear();index=0;began=at=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;}
      if(state==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;}
    }
    private static void Logged(string text,string stack,LogType type)
    {if(type==LogType.Error||type==LogType.Exception||type==LogType.Assert)proof.errors.Add(text);}
    private static void Check(bool yes,string text){if(!yes)throw new InvalidOperationException(text);proof.checks.Add(text);}
    private static MainMenuView Menu=>UiRoot.Instance.GetComponent<MainMenuView>();
    private static void Add(Action action)=>steps.Add(action);
    private static void Wait(Func<bool> ready)=>Add(()=>{if(!ready())index--;});
    private static void Tap(Key key){Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(key)));Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState()));}
    private static void Panel(string panel)=>typeof(MutantRuntime).GetProperty("Panel").SetValue(null,panel);
    private static void Marker(int id)=>typeof(MutantRuntime).GetProperty("MarkerId").SetValue(null,id);
    private static void Shots(string name,string element)
    {
      foreach(int size in new[]{1920,1280})
      {
        int w=size;Add(()=>{
          var e=UiRoot.Instance.Root.Q(element);Check(e!=null&&e.resolvedStyle.display!=DisplayStyle.None,"Görünüm mevcut: "+name);
          width=w;height=w*9/16;target=new RenderTexture(width,height,24,RenderTextureFormat.ARGB32);
          UiRoot.Instance.Settings.clearColor=true;UiRoot.Instance.Settings.colorClearValue=Color.clear;UiRoot.Instance.Settings.targetTexture=target;Hud.SizeOverride=new Vector2(width,height);
          shot=name+"-"+w;shotAt=EditorApplication.timeSinceStartup;
        });
        Add(()=>{
          var e=UiRoot.Instance.Root.Q(element);var bounds=e.worldBound;var root=UiRoot.Instance.Root.worldBound;
          Check(bounds.width>20&&bounds.height>20&&!float.IsNaN(bounds.width),"Ölçülmüş görünüm "+name+" / "+w);
          Check(bounds.xMin>=root.xMin-2&&bounds.xMax<=root.xMax+2,"Yatay taşma yok "+name+" / "+w);
          if(name=="mutant-baslangic-yetenek")
          {
            var hints=e.Q(className:"ipuclari");var go=e.Q("mutant-continue");
            Check(hints!=null&&go!=null&&!hints.worldBound.Overlaps(go.worldBound),"Başlangıç yeteneği tuş ipuçları işlemle çakışmıyor / "+w);
          }
        });
      }
    }
    private static void Setup()
    {
      GarageSession.Open(SessionState.GetString(PathKey,""),true);GameFlow.MainMenu();keyboard=InputSystem.AddDevice<Keyboard>("PitValidation");
      career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();
      Check(Resources.Load<StyleSheet>("UI/pit")&&Resources.Load<Texture2D>("UI/Pit/menu-night"),"Pit stili ve onaylı afiş görseli yüklü");
      Shots("ana-menu","pit-home");
      Add(()=>{var e=UiRoot.Instance.Root.Q("pit-home-link-1");e.Focus();});
      Add(()=>Check(Menu.HomeFocus==1,"Native odak Mutant bölümüne eşleşir"));Tap(Key.UpArrow);
      Add(()=>Check(Menu.HomeFocus==0,"Dikey ana menü yukarı tuşu"));Tap(Key.Enter);Wait(()=>Menu.Showing==GameFlow.MenuHub.Race);
      Add(()=>Check(Menu.CardCount>0&&Menu.SelectedKey!="","Gerçek kariyer etkinlikleri bağlı"));Shots("kariyer","pit-career");
      Add(()=>{var e=UiRoot.Instance.Root.Q("pit-career-prepare");Check(e.focusable,"Hazırlık işlemi Tab odağı alır");e.Focus();});Tap(Key.Enter);Wait(()=>RacePreparationView.Instance.Visible);
      Add(()=>{RacePreparationView.Instance.SelectTime(1);RacePreparationView.Instance.SelectWeather(1);GameFlow.ChangePreparationCar();});Wait(()=>GarageView.Instance.Visible);
      Shots("garaj","f-garage");Add(()=>GameFlow.FinishGarageSelection());Wait(()=>RacePreparationView.Instance.Visible);
      Add(()=>Check(GameFlow.Conditions.TimeOfDay==RaceConditions.TimesOfDay[1].Key&&GameFlow.Conditions.Weather==RaceConditions.Weathers[1].Key,"Hazırlık-garaj dönüşü saat/hava korur"));Shots("hazirlik","f-race-preparation");
      Add(()=>GameFlow.OpenStore());Wait(()=>StoreView.Instance.Visible);Shots("magaza","f-store");
      Add(()=>GameFlow.OpenProfile());Wait(()=>ProfileView.Instance.Visible);Shots("profil","f-profile");
      Add(()=>SettingsScreen.Show());Wait(()=>SettingsView.Instance.Visible);Shots("ayarlar","f-settings");
      Add(()=>SettingsView.Instance.Back());Add(()=>{GameFlow.MainMenu();GameFlow.MutantMenu();});Wait(()=>Menu.Visible&&Menu.Showing==GameFlow.MenuHub.Mutant);Shots("mutant-menu","f-mutant-menu");
      Tap(Key.H);Add(()=>Check(Menu.MutantHelpOpen,"Mutant H yardım ipucu ve açılışı"));Tap(Key.H);
      Tap(Key.Enter);Add(()=>Check(Menu.ConfirmOpen&&!MutantRuntime.Active,"Mutant başlangıç onayı koşuyu başlatmaz"));Shots("mutant-onay","f-mutant-confirm");Tap(Key.Escape);
      Add(()=>MutantRuntime.Start(53));Wait(()=>MutantStartView.Instance.Visible);Shots("mutant-arac","f-mutant-start");
      Add(()=>MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id));Wait(()=>MutantStartView.Instance.ChoosingSkill);Shots("mutant-baslangic-yetenek","f-mutant-start");
      Add(()=>{MutantRuntime.RecordDirectory=Path.Combine(Project,"Logs/Pit/record");MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);});
      Wait(()=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>()?.Simulation!=null&&!MutantRuntime.Starting);
      Shots("mutant-surus","b-mutant-hud");
      Add(()=>{
        var r=MutantRuntime.Run;r.State.Set("faz",CatalogNode.Str("secim"));r.State.Set("seviye",CatalogNode.Num(3));r.State.Set("xp",CatalogNode.Num(MutantRun.LevelXp(3)));r.State.Set("bekleyenSecim",CatalogNode.Num(2));r.State.Set("secenekler",CatalogNode.Parse("[\"guc\",\"carpisma-pili\",\"sonnefes\"]"));Panel("choice");
      });Wait(()=>MutantChoiceView.Instance.Visible);Shots("mutant-odul","b-mutant-choice");
      Add(()=>{MutantRuntime.Run.State.Set("faz",CatalogNode.Str("surus"));Panel("boss");});Wait(()=>MutantBossView.Instance.Visible);Shots("mutant-boss","b-mutant-boss");
      Add(()=>{Marker(MutantRuntime.Model.Events[0].Id);Panel("event");});Wait(()=>MutantEventView.Instance.Visible);Shots("mutant-etkinlik","b-mutant-event");
      Add(()=>Panel("shop"));Wait(()=>MutantWorkshopView.Instance.Visible);Shots("mutant-atolye","b-mutant-workshop");
      Add(()=>{int id=MutantRuntime.Model.Chests.First(c=>c.Cursed).Id;MutantRuntime.Run.ChestOffer(id);Marker(id);Panel("chest");});Wait(()=>MutantChestView.Instance.Visible);Shots("mutant-lanetli-sandik","b-mutant-chest");
      Add(()=>Panel("result"));Wait(()=>MutantResultView.Instance.Visible);Shots("mutant-sonuc","b-mutant-result");
      Add(()=>{MutantRuntime.Run.State.Set("faz",CatalogNode.Str("bitti"));Panel("summary");});Wait(()=>MutantSummaryView.Instance.Visible);Shots("mutant-ozet","b-mutant-summary");
      Add(()=>{
        Check(GarageSession.State.Snapshot().ToString()==career,"Kariyer para/XP/sahiplik aynı");Check(GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Sürücü profili ve rekorlar aynı");
        Check(proof.errors.Count==0,"Çalışma anı hata yok");
      });
    }
    private static bool Capture()
    {
      if(shot==null)return false;if(EditorApplication.timeSinceStartup-shotAt<.4)return true;
      var a=new Texture2D(width,height,TextureFormat.RGBA32,false);var b=new Texture2D(width,height,TextureFormat.RGBA32,false);var scene=new RenderTexture(width,height,24);var old=RenderTexture.active;var camera=Camera.main;
      try
      {
        if(camera){var previous=camera.targetTexture;camera.targetTexture=scene;camera.Render();camera.targetTexture=previous;RenderTexture.active=scene;a.ReadPixels(new Rect(0,0,width,height),0,0);}
        RenderTexture.active=target;b.ReadPixels(new Rect(0,0,width,height),0,0);var pa=a.GetPixels32();var pb=b.GetPixels32();
        for(int i=0;i<pa.Length;i++){float alpha=pb[i].a/255f;pa[i]=new Color32((byte)Mathf.Min(255,pa[i].r*(1-alpha)+pb[i].r),(byte)Mathf.Min(255,pa[i].g*(1-alpha)+pb[i].g),(byte)Mathf.Min(255,pa[i].b*(1-alpha)+pb[i].b),255);}a.SetPixels32(pa);a.Apply();
        var file="Logs/pit-"+shot+".png";File.WriteAllBytes(Path.Combine(Project,file),a.EncodeToPNG());proof.images.Add(file);
      }
      finally{RenderTexture.active=old;UiRoot.Instance.Settings.targetTexture=null;Hud.SizeOverride=null;target.Release();scene.Release();UnityEngine.Object.DestroyImmediate(target);UnityEngine.Object.DestroyImmediate(scene);UnityEngine.Object.DestroyImmediate(a);UnityEngine.Object.DestroyImmediate(b);shot=null;}
      return true;
    }
    private static void Tick()
    {
      try
      {
        if(EditorApplication.timeSinceStartup-began>240)throw new TimeoutException("Pit Play adımı "+index+" / "+steps.Count);
        if(Capture()){at=EditorApplication.timeSinceStartup;return;}if(EditorApplication.timeSinceStartup-at<.3)return;at=EditorApplication.timeSinceStartup;
        if(steps.Count==0){if(!UiRoot.Instance||!UnityEngine.Object.FindFirstObjectByType<GarageScreen>())return;Setup();return;}
        if(index>=steps.Count){Finish(null);return;}steps[index++]();
      }
      catch(Exception e){Finish(e);}
    }
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","");}
    private static void Finish(Exception error)
    {
      SessionState.SetBool(Active,false);EditorApplication.update-=Tick;Application.logMessageReceived-=Logged;
      if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      proof.result=error==null?"pit-ui-play-passed":"failed";proof.utc=DateTime.UtcNow.ToString("O");proof.error=error?.ToString()??"";
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".jpg"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();
      File.WriteAllText(Path.Combine(Project,"Logs/pit-ui-play.json"),JsonUtility.ToJson(proof,true));if(error!=null)Debug.LogException(error);else Debug.Log("Pit Play: "+proof.checks.Count+" kontrol / "+proof.images.Count+" görüntü.");EditorApplication.Exit(error==null?0:1);
    }
  }
}
