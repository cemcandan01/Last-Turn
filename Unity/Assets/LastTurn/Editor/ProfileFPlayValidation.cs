using System;
using System.Threading.Tasks;
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
  // Yalnız ayrı grafik Editor'da F §6; gerçek komutlar ve Game View, yeni koşu kuralı yok.
  [InitializeOnLoad]
  public static class ProfileFPlayValidation
  {
    private const string Active="LastTurn.P7Profile.Active",PathKey="LastTurn.P7Profile.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;}
    private static Proof proof;private static readonly List<Action> steps=new List<Action>();private static int index;private static double began,at;private static Keyboard keyboard;
    private static string career;private static Dictionary<string,string> files;
    private static VisualElement pointer;private static Vector2 point;private static string shot;private static int shotW,shotH;private static bool queued;private static DateTime captureAfter;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static ProfileFPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.companyName!="LastTurnProfileUiValidation"||Application.isBatchMode||Application.productName!="LastTurnUiValidation"||Array.IndexOf(Environment.GetCommandLineArgs(),"-lastTurnUiValidation")<0)throw new InvalidOperationException("Ayrı grafik doğrulama kopyası gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce Play durmalı.");
      InputSystem.settings.backgroundBehavior=InputSettings.BackgroundBehavior.IgnoreFocus;InputSystem.settings.editorInputBehaviorInPlayMode=InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
      GarageSceneBuilder.Open();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/P7Profile/"+Guid.NewGuid().ToString("N")+"/garage.json"));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
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
    private static FakeProvider provider;private static CloudAccount account;
    private sealed class FakeProvider:ICloudProvider
    {
      private Action<CloudUser> changed;public int Created,SignedIn,Resets,Writes;public string LastEmail="";public bool Reject;public TaskCompletionSource<bool> Gate;
      public void ListenSession(Action<CloudUser> listener){changed=listener;listener(new CloudUser{Uid="ui-guest",Anonim=true});}
      public Task SignInAnonymous()=>Task.CompletedTask;
      public Task LinkGoogle(string hint=null)=>throw new NotSupportedException();
      public Task CreateEmail(string email,string password){Created++;LastEmail=email;changed(new CloudUser{Uid="ui-linked",Anonim=false,Yol="eposta",Eposta=email});return Task.CompletedTask;}
      public async Task SignInEmail(string email,string password){SignedIn++;LastEmail=email;if(Gate!=null)await Gate.Task;if(Reject)throw new CloudError("network-request-failed");changed(new CloudUser{Uid="ui-other",Anonim=false,Yol="eposta",Eposta=email});}
      public Task ResetPassword(string email){Resets++;LastEmail=email;return Task.CompletedTask;}
      public Task<bool> IsAdmin(string uid)=>Task.FromResult(false);public Task SignOut()=>Task.CompletedTask;
      public Task<CatalogNode> Read(string uid)=>Task.FromResult<CatalogNode>(null);
      public Task Write(string uid,CatalogNode document){Writes++;return Task.CompletedTask;}
    }
    private sealed class MemoryLocal:ICloudLocal
    {
      public string ChangeStamp=>"ui-fixture";public bool Offline=>false;
      public CatalogNode Build(bool partless)=>CatalogNode.Parse("{\"surum\":3,\"xp\":0,\"kazanilan\":0}");
      public void Merge(CatalogNode remote){}public void Replace(CatalogNode remote){}
    }
    private sealed class MemoryOwner:ICloudOwnerStore
    {private CloudOwnerRecord value=new CloudOwnerRecord();public CloudOwnerRecord Load()=>value;public void Save(CloudOwnerRecord record){value=record;}}
    private static TextField Field(string name)=>UiRoot.Instance.Screen.Q<TextField>(name);
    private static void Setup()
    {
      if(Application.companyName!="LastTurnProfileUiValidation")throw new InvalidOperationException("Ayrı profil test şirketi gerekir.");
      GarageSession.Open(GarageSession.ProfilePath(false));var fixture=new GarageState(GarageSession.Catalog);fixture.AddXp(550);fixture.AddMoney(12450);GarageSession.Commit(fixture,"Ayrı profil test verisi");var store=GarageRace.ProfileStore();var saved=store.Load();saved.Rename("Sürücü");saved.Races=48;saved.Wins=12;saved.Km=312;saved.Use[10]=21;store.Save(saved);var profileBefore=saved.Snapshot();profileBefore["prof"].Remove("name");files=PlayerFiles();career=GarageSession.State.Snapshot().ToString();
      keyboard=InputSystem.AddDevice<Keyboard>();GameFlow.MainMenu();Tap(Key.RightArrow);Tap(Key.RightArrow);Tap(Key.Enter);
      steps.Add(()=>{Check(ProfileView.Instance.Visible&&GameFlow.Profile,"Ana menüden F Profil açılır");Check(ProfileView.Instance.Model.Summary.Races==48&&ProfileView.Instance.Model.FavoriteUses==21,"Profil gerçek sayaç ve favoriyi gösterir");Check(!UiRoot.Instance.Screen.Q("profile-login").enabledInHierarchy,"Hesap servisi yokken işlem kapalı");});
      steps.Add(()=>Shot("unavailable",1280,720));Click("profile-edit-name");
      steps.Add(()=>{Check(ProfileView.Instance.EditingName,"Fare adı düzenlemeyi açar");Field("profile-name").value="  F Sürücüsü  ";});Tap(Key.Enter);
      steps.Add(()=>Check(GarageRace.ProfileStore().Load().Name=="F Sürücüsü"&&!ProfileView.Instance.EditingName,"Enter adı gerçek diske normalize ederek yazar"));
      Click("profile-edit-name");steps.Add(()=>Field("profile-name").value="İptal Adı");Tap(Key.Escape);
      steps.Add(()=>Check(ProfileView.Instance.Visible&&!ProfileView.Instance.EditingName&&GarageRace.ProfileStore().Load().Name=="F Sürücüsü","Esc ad değişimini kaydetmeden iptal eder"));
      steps.Add(()=>{provider=new FakeProvider();account=new CloudAccount(provider,new CloudSync(provider,new MemoryLocal(),new MemoryOwner())){Level=()=>GarageSession.State.Level};CloudRuntime.SetUiValidationAccount(account);account.Start();});
      steps.Add(()=>{Check(account.User.Anonim&&account.Summary().Contains("Misafir"),"Mevcut hesap servisi misafir durumunu gösterir");Check(Field("profile-password").isPasswordField&&Field("profile-repeat").isPasswordField,"Şifre ve tekrar alanı maskelidir");Check(UiRoot.Instance.Screen.Q("profile-create").enabledInHierarchy,"Misafirde hesap oluştur kullanılabilir");});
      steps.Add(()=>Shot("guest",1920,1080));steps.Add(()=>Shot("guest",1280,720));
      Click("profile-create");steps.Add(()=>Check(ProfileView.Instance.FormError=="Geçerli bir e-posta yaz"&&provider.Created==0,"Geçersiz form sağlayıcıya gitmez"));
      steps.Add(()=>{Field("profile-email").value=" ui@example.test ";Field("profile-password").value="abcdef";Field("profile-repeat").value="abcdefg";UiRoot.Instance.Screen.Q("profile-create").Focus();});Tap(Key.Enter);
      steps.Add(()=>Check(ProfileView.Instance.FormError=="Şifreler aynı değil"&&provider.Created==0,"Klavye oluştur şifre tekrarını doğrular"));
      steps.Add(()=>Field("profile-repeat").value="abcdef");Click("profile-create");Wait(()=>!account.Busy);
      steps.Add(()=>{Check(provider.Created==1&&provider.LastEmail=="ui@example.test"&&!account.User.Anonim,"Oluştur aynı hesap servisine bir kez doğru e-posta ile gider");Check(Field("profile-password").value==""&&Field("profile-repeat").value=="","Gönderimden sonra şifre alanları temizlenir");Check(!UiRoot.Instance.Screen.Q("profile-create").visible||UiRoot.Instance.Screen.Q("profile-create").ClassListContains("gizli"),"Bağlı hesapta oluştur gizlenir");});
      steps.Add(()=>Shot("linked",1920,1080));steps.Add(()=>Shot("linked",1280,720));
      steps.Add(()=>Check(account.Info.Contains("Seviye "+GarageSession.State.Level)&&ProfileView.Instance.Model.LevelFill>0&&ProfileView.Instance.Model.LevelFill<1,"Bağlanma seviyesi ve halka gerçek ilerlemeyle tutarlı"));
      steps.Add(()=>{Field("profile-password").value="abcdef";ProfileView.Instance.Create();Check(provider.Created==1,"Bağlı hesapta gizli oluştur eylemi yeniden çağrılamaz");Field("profile-password").SetValueWithoutNotify("");});
      steps.Add(()=>{provider.Gate=new TaskCompletionSource<bool>();provider.Reject=true;Field("profile-email").value="other@example.test";Field("profile-password").value="abcdef";});Click("profile-login");
      steps.Add(()=>{Check(account.Busy&&!UiRoot.Instance.Screen.Q("profile-login").enabledInHierarchy,"Beklemede bütün hesap işlemleri kapanır");ProfileView.Instance.SignIn();Check(provider.SignedIn==1,"Bekleme sırasında ikinci giriş çağrısı yapılmaz");});steps.Add(()=>Shot("busy",1920,1080));
      steps.Add(()=>provider.Gate.SetResult(true));Wait(()=>!account.Busy);
      steps.Add(()=>Check(account.Error!=null&&account.User.Uid=="ui-linked"&&UiRoot.Instance.Screen.Q<Label>("profile-feedback").text==account.Error,"Hata gerçek servis metniyle gösterilir; hesap korunur"));steps.Add(()=>Shot("error",1280,720));
      steps.Add(()=>{UiRoot.Instance.Screen.Q("profile-reset").Focus();});Tap(Key.Enter);Wait(()=>!account.Busy);
      steps.Add(()=>Check(provider.Resets==1&&account.Info!=null&&account.Error==null,"Klavye şifre sıfırlama mevcut servis yoluna gider"));
      steps.Add(()=>{Field("profile-email").Focus();using(var e=KeyDownEvent.GetPooled(new Event{type=EventType.KeyDown,keyCode=KeyCode.Tab,character='\t'}))Field("profile-email").SendEvent(e);});
      steps.Add(()=>{var focus=UiRoot.Instance.Root.panel.focusController.focusedElement as VisualElement;Check(focus!=null&&(focus==Field("profile-password")||Field("profile-password").Contains(focus)),"Tab sonraki form alanına odaklanır");Field("profile-password").value="abcdef";});Tap(Key.Escape);
      steps.Add(()=>{Check(!GameFlow.Profile&&GameFlow.Home,"Profil Esc ana menüye döner");Check(Field("profile-password").value=="","Ekrandan çıkınca şifre temizlenir");GarageSession.Reload();});
      steps.Add(()=>{var loaded=GarageRace.ProfileStore().Load();Check(loaded.Name=="F Sürücüsü","Sürücü adı yeniden yüklemede korunur");var after=loaded.Snapshot();after["prof"].Remove("name");Check(after.ToString()==profileBefore.ToString(),"Ad dışındaki profil sayaç ve rekorları aynı");Check(GarageSession.State.Snapshot().ToString()==career&&!MutantRuntime.Active,"Profil işlemleri kariyer/para/Mutant durumunu değiştirmez");bool Keep(string path)=>Path.GetExtension(path)==".json"&&!string.Equals(Path.GetFullPath(path),Path.GetFullPath(GarageRace.ProfileStore().ProfileFile),StringComparison.OrdinalIgnoreCase);var old=files.Where(p=>Keep(p.Key)).ToDictionary(p=>p.Key,p=>p.Value);var now=PlayerFiles().Where(p=>Keep(p.Key)).ToDictionary(p=>p.Key,p=>p.Value);Check(old.Count==now.Count&&old.All(p=>now.TryGetValue(p.Key,out var hash)&&hash==p.Value),"Ad dışındaki kalıcı oyuncu JSON dosyaları aynı hash'te");Check(proof.runtimeErrors.Count==0,"LastTurn çalışma Console hatası yok");CloudRuntime.SetUiValidationAccount(null);Finish(null);});
    }

    private static void Shot(string name,int w,int h){shot=name;shotW=w;shotH=h;queued=false;Size(w,h);}
    private static void Size(int w,int h)
    {
      var a=typeof(EditorWindow).Assembly;var t=a.GetType("UnityEditor.GameView");if(!game){game=EditorWindow.GetWindow(t);originalSize=(int)t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(game);}
      var st=a.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null);group=st.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int n=(int)group.GetType().GetMethod("GetTotalCount").Invoke(group,null);var size=Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"P7 profil"});group.GetType().GetMethod("AddCustomSize").Invoke(group,new[]{size});sizes.Add(n);
      t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,n);game.Show();game.Focus();game.Repaint();
    }
    private static void Capture()
    {
      string path=Path.Combine(Project,"Logs/p7-profile-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Game View çözünürlüğü "+shot+shotW);captureAfter=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<captureAfter)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG boyutu "+shot+shotW);}finally{UnityEngine.Object.DestroyImmediate(png);}
      var page=UiRoot.Instance.Screen.Q("f-profile");var panel=page.Q(className:"p-cloud");Check(panel.worldBound.xMax<=UiRoot.Instance.Root.layout.width&&panel.worldBound.yMax<UiRoot.Instance.Root.layout.height-60,"Profil paneli sinirlar icinde "+shot+shotW);
      proof.images.Add(Path.GetFileName(path));shot=null;
    }
    private static void Tick()
    {
      try{if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("P7 profil kısa Play");if(steps.Count==0){if(!ProfileView.Instance)return;Setup();return;}if(EditorApplication.timeSinceStartup-at<.45)return;at=EditorApplication.timeSinceStartup;if(shot!=null){Capture();return;}if(index<steps.Count)steps[index++]();}
      catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;if(keyboard!=null&&keyboard.added)InputSystem.RemoveDevice(keyboard);
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.result=e==null?"p7-profile-f-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(f=>Path.GetExtension(f)==".cs"||Path.GetExtension(f)==".uss").OrderBy(f=>f,StringComparer.Ordinal).Select(f=>new Source{path=f.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(f)}).ToArray();File.WriteAllText(Path.Combine(Project,"Logs/p7-profile-f-play.json"),JsonUtility.ToJson(proof,true));if(e!=null)Debug.LogException(e);else Debug.Log("P7 profil F Play geçti: "+proof.checks.Count);EditorApplication.Exit(e==null?0:1);
    }
  }
}
