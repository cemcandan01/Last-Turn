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
  // Yalnız ayrı grafik Editor'da B / 5A; kontrollü seçim durumları, gerçek Runtime komutları ve Game View.
  [InitializeOnLoad]
  public static class MutantChoicePlayValidation
  {
    private const string Active="LastTurn.M2Choice.Active",PathKey="LastTurn.M2Choice.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc;public uint seed;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career,profile,initial;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static MutantChoicePlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      GarageSceneBuilder.Open();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/P7Mutant/"+Guid.NewGuid().ToString("N")+"/garage.json"));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if(s==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){proof=new Proof();steps.Clear();index=0;began=at=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;}
      if(s==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;}
    }
    private static void Logged(string message,string stack,LogType type)
    {if(type!=LogType.Error&&type!=LogType.Exception&&type!=LogType.Assert)return;if(stack.Contains("UnityEditor.Search.")&&!stack.Contains("LastTurn."))proof.editorDiagnostics.Add(message);else proof.runtimeErrors.Add(message+"\n"+stack);}
    private static void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);proof.checks.Add(label);}
    private static void Tap(Key key){steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState(key)));steps.Add(()=>InputSystem.QueueStateEvent(keyboard,new KeyboardState()));}
    private static void Wait(Func<bool> ready){steps.Add(()=>{if(!ready())index--;});}
    private static string Hash(string path){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(path))).Replace("-","");}
    private static Dictionary<string,string> PlayerFiles()=>new[]{"LastTurnGarage","LastTurnMutant","LastTurnSettings"}.Select(n=>Path.Combine(Application.persistentDataPath,n)).Where(Directory.Exists).SelectMany(p=>Directory.GetFiles(p,"*",SearchOption.AllDirectories)).ToDictionary(p=>p,Hash);
    private static void Click(string name)
    {
      steps.Add(()=>{var element=UiRoot.Instance.Screen.Q(name)??UiRoot.Instance.Top.Q(name);Check(element!=null,"Fare hedefi var: "+name);point=element.worldBound.center;pointer=element.panel.Pick(point);Check(pointer==element||element.Contains(pointer),"Fare hit-test: "+name);});
      steps.Add(()=>{using(var e=PointerDownEvent.GetPooled(new Event{type=EventType.MouseDown,button=0,mousePosition=point}))pointer.SendEvent(e);});
      steps.Add(()=>{using(var e=PointerUpEvent.GetPooled(new Event{type=EventType.MouseUp,button=0,mousePosition=point}))pointer.SendEvent(e);});
    }
    private static void Setup()
    {
      GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=PlayerFiles();
      keyboard=InputSystem.AddDevice<Keyboard>();proof.seed=53;MutantRuntime.Start(53);MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);MutantRuntime.Choose(MutantRuntime.Model.Choices[0].Id);
      Wait(()=>UnityEngine.Object.FindFirstObjectByType<GtPrototype>()?.Simulation!=null);
      steps.Add(()=>{
        Check(!MutantRuntime.Starting,"Gerçek başlangıç ve sürüş mevcut Runtime'dan");
        var r=MutantRuntime.Run;r.State.Set("faz",CatalogNode.Str("secim"));r.State.Set("seviye",CatalogNode.Num(3));r.State.Set("xp",CatalogNode.Num(MutantRun.LevelXp(3)));r.State.Set("bekleyenSecim",CatalogNode.Num(2));r.State.Set("secenekler",CatalogNode.Parse("[\"guc\",\"carpisma-pili\",\"sonnefes\"]"));
        MutantRuntime.Continue();initial=r.State.ToString();
      });
      Wait(()=>MutantChoiceView.Instance.Visible);
      steps.Add(()=>{
        Check(MutantChoiceView.CoversCurrentScreen&&!MutantStartView.CoversCurrentScreen,"Koşu içi seçim tek görünümde");
        Check(Resources.Load<Texture2D>("UI/MutantB/background")&&Resources.Load<Texture2D>("UI/MutantB/frame"),"B arka plan ve çerçeve yüklü");
        var rewards=new MutantRewards(MutantRuntime.Run.Catalog);
        Check(rewards.Definitions.Count==94,"94 ödül ikon tanımı");
        var iconMap=CatalogNode.Parse(Resources.Load<TextAsset>("UI/MutantB/reward-icons").text);
        foreach(var d in rewards.Definitions){Check(MutantRewardIcons.TryGet(d.Key,out var sprite)&&sprite&&sprite.name==d.Key,"Gerçek Unity Sprite yüklü "+d.Key);var icon=MutantRewardIcons.Create(d.Key);Check(!icon.ClassListContains("mc-icon-fallback")&&icon.style.backgroundImage.value.sprite==sprite,"94 tanımda fallback yok "+d.Key);
          var e=iconMap["entries"].Items.First(n=>n["key"].S()==d.Key);var a=iconMap["assets"].Items.First(n=>n["path"].S()==e["path"].S());
          Check(Math.Abs(sprite.rect.x/sprite.texture.width-e["x"].N()/a["width"].N())<1e-5&&Math.Abs(sprite.rect.width/sprite.texture.width-e["width"].N()/a["width"].N())<1e-5&&Math.Abs(sprite.rect.y/sprite.texture.height-(1-(e["y"].N()+e["height"].N())/a["height"].N()))<1e-5&&Math.Abs(sprite.rect.height/sprite.texture.height-e["height"].N()/a["height"].N())<1e-5,"Import boyutundan bağımsız doğru UV "+d.Key);
        }
        foreach(var c in UiRoot.Instance.Screen.Query<RewardCard>().ToList().Where(c=>c.ClassListContains("mc-card")))Check(c.Model.Offer==MutantRuntime.Model.Choices[int.Parse(c.name.Substring(c.name.Length-1))].Id,"Kart gerçek teklif kimliğinde");
      });
      Tap(Key.Digit2);steps.Add(()=>Check(MutantChoiceView.Instance.Focused==1&&MutantRuntime.Run.State.ToString()==initial,"Sayı seçimi koşu ve RNG'yi değiştirmez"));
      steps.Add(()=>{var card=UiRoot.Instance.Screen.Q("mutant-choice-option-2");card.Focus();});steps.Add(()=>Check(MutantChoiceView.Instance.Focused==2,"Native odak seçili ödülle eşleşir"));
      Tap(Key.LeftArrow);steps.Add(()=>Check(MutantChoiceView.Instance.Focused==1,"Sol ok tek kart ilerler"));
      steps.Add(()=>{var card=UiRoot.Instance.Screen.Q<RewardCard>("mutant-choice-option-1");using(var e=KeyDownEvent.GetPooled(new Event{type=EventType.KeyDown,keyCode=KeyCode.PageDown}))card.SendEvent(e);});
      steps.Add(()=>{var card=UiRoot.Instance.Screen.Q<RewardCard>("mutant-choice-option-1");Check(card.Details.verticalScroller.highValue<=1||card.Details.scrollOffset.y>0,"PgDn odaklı kart ayrıntısını kaydırır");});
      steps.Add(()=>{var page=UiRoot.Instance.Screen.Q("b-mutant-choice");var f=(VisualElement)page.focusController.focusedElement;using(var e=KeyDownEvent.GetPooled(new Event{type=EventType.KeyDown,keyCode=KeyCode.Tab,character='\t'}))f.SendEvent(e);});
      steps.Add(()=>{var page=UiRoot.Instance.Screen.Q("b-mutant-choice");var f=(VisualElement)page.focusController.focusedElement;var c=page.Q("mutant-choice-option-"+MutantChoiceView.Instance.Focused);Check(f==c||c.Contains(f)||f==page.Q("mutant-choice-accept"),"Tab odağı seçim veya onayda");});
      steps.Add(()=>Shot("offer",1920,1080));steps.Add(()=>Shot("offer",1280,720));
      steps.Add(()=>MutantRuntime.Run.State.Set("secenekler",CatalogNode.Parse("[\"v:grappling-hook:ters-kanca\",\"e:sok-bobini:grappling-hook\",\"ek-yedek-tup\"]")));
      steps.Add(()=>Shot("icons",1920,1080));steps.Add(()=>Shot("icons",1280,720));
      steps.Add(()=>MutantRuntime.Run.State.Set("secenekler",CatalogNode.Parse(initial)["secenekler"].Clone()));
      Tap(Key.Escape);steps.Add(()=>Check(GameFlow.Paused&&!MutantChoiceView.Instance.Visible&&MutantRuntime.Run.State.ToString()==initial,"Esc duraklatır; teklif timer RNG aynı"));
      Tap(Key.Escape);Wait(()=>MutantChoiceView.Instance.Visible);steps.Add(()=>Check(!GameFlow.Paused,"Esc seçim ekranına döner; çift işlem yok"));
      Click("mutant-choice-option-0");steps.Add(()=>Check(MutantChoiceView.Instance.Focused==0&&MutantRuntime.Run.State.ToString()==initial,"Fare yalnız seçer; otomatik ödül almaz"));
      Click("mutant-choice-accept");
      steps.Add(()=>{Check(MutantRuntime.Run.State["pasifler"].Items.Any(p=>p.S()=="guc")&&MutantRuntime.Run.State["bekleyenSecim"].N()==1,"Gerçek Choose pasifi alır ve bekleyen seçimi azaltır");Check(MutantChoiceView.Instance.Visible&&MutantRuntime.Run.State["secenekler"].Items.Any(),"Çoklu seçimde yeni teklifler görünür");
        var r=MutantRuntime.Run;r.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"slipstream-engine\",\"seviye\":2,\"eklentiler\":[],\"evrim\":null},{\"id\":\"grappling-hook\",\"seviye\":1,\"eklentiler\":[],\"evrim\":null},{\"id\":\"flying-dutchman\",\"seviye\":1,\"eklentiler\":[],\"evrim\":null}]"));r.State.Set("secenekler",CatalogNode.Parse("[\"b:volt-kanat\",\"y:slipstream-engine\",\"hafif\"]"));initial=r.State.ToString();
      });
      Tap(Key.Digit1);Tap(Key.Enter);steps.Add(()=>Check(MutantChoiceView.Instance.Replacing=="b:volt-kanat"&&MutantRuntime.Run.State.ToString()==initial,"Dolu yuva açık değiştirme ister; skill atılmaz"));
      steps.Add(()=>Shot("replace",1920,1080));steps.Add(()=>Shot("replace",1280,720));
      Click("mutant-replace-back");steps.Add(()=>Check(MutantChoiceView.Instance.Replacing==""&&MutantRuntime.Run.State.ToString()==initial,"Değiştirme iptali teklif ve skill'leri korur"));
      Tap(Key.Digit1);Tap(Key.Enter);Tap(Key.Escape);steps.Add(()=>Check(!GameFlow.Paused&&MutantChoiceView.Instance.Replacing==""&&MutantRuntime.Run.State.ToString()==initial,"Esc yalnız değiştirmeyi iptal eder"));
      Tap(Key.Enter);Tap(Key.Digit3);Tap(Key.Enter);Wait(()=>!MutantRuntime.Blocked&&UnityEngine.Object.FindFirstObjectByType<GtPrototype>()?.Simulation!=null);
      steps.Add(()=>{
        Check(MutantRuntime.Run.State["beceriler"].Items.Any(s=>s["id"].S()=="volt-kanat")&&!MutantRuntime.Run.State["beceriler"].Items.Any(s=>s["id"].S()=="flying-dutchman"),"Seçilen skill gerçek Choose ile değiştirildi");
        Check(MutantRuntime.Run.State["beceriler"].Items.First(s=>s["id"].S()=="slipstream-engine")["seviye"].N()==2,"Bırakılmayan skill seviyesi korunur");
        Check(!MutantChoiceView.Instance.Visible&&MutantRuntime.Panel=="","Ödül sonrası gerçek sürüş ve ekran kapanışı");
        Check(GarageSession.State.Snapshot().ToString()==career&&GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Kariyer sahiplik para profil aynı");
        var now=PlayerFiles();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"İzole ürün kalıcı kayıt hash'leri aynı");MutantRuntime.Exit();
      });
      steps.Add(()=>Finish(null));
    }
    private static void Shot(string name,int w,int h){shot=name;shotW=w;shotH=h;queued=false;Size(w,h);}
    private static void Size(int w,int h)
    {
      var a=typeof(EditorWindow).Assembly;var t=a.GetType("UnityEditor.GameView");if(!game){game=EditorWindow.GetWindow(t);originalSize=(int)t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(game);}
      var st=a.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null);group=st.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int n=(int)group.GetType().GetMethod("GetTotalCount").Invoke(group,null);var size=Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"P7 Mutant"});group.GetType().GetMethod("AddCustomSize").Invoke(group,new[]{size});sizes.Add(n);
      t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,n);game.Show();game.Focus();game.Repaint();
    }
    private static void Capture()
    {
      string path=Path.Combine(Project,"Logs/m2-choice-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      var page=UiRoot.Instance.Screen.Q("b-mutant-choice");var cards=page.Query(className:"mc-card").ToList();
      Check(cards.Count==3,"Üç kart / "+shot+shotW);
      foreach(var c in cards){var r=c.worldBound;Check(r.xMin>=0&&r.xMax<=page.worldBound.xMax&&r.yMax<page.worldBound.yMax-100,"Kart ekran sınırında / "+c.name+shotW);if(c is RewardCard reward){Check(reward.Details.contentViewport.worldBound.height>35&&reward.Q(className:"rc-foot").worldBound.yMax<r.yMax-12,"Ayrıntı alanı ve altlık sığar / "+shotW);var icon=c.Q(className:"mc-icon");Check(!icon.ClassListContains("mc-icon-fallback")&&icon.style.backgroundImage.value.sprite.name==reward.Model.IconKey,"Görünen ikon model kimliğinde / "+shot+shotW);}}
      for(int i=1;i<cards.Count;i++)Check(!cards[i].worldBound.Overlaps(cards[i-1].worldBound),"Kartlar çakışmaz / "+i+shotW);
      proof.images.Add(Path.GetFileName(path));shot=null;
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("P7 Mutant kısa Play");if(steps.Count==0){if(!MutantChoiceView.Instance)return;Setup();return;}if(EditorApplication.timeSinceStartup-at<.45)return;at=EditorApplication.timeSinceStartup;if(shot!=null){Capture();return;}if(index<steps.Count)steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.result=e==null?"m2-choice-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>new[]{".cs",".uss",".json",".png"}.Contains(Path.GetExtension(f))).OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/m2-choice-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 Mutant F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
