using System;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  public sealed class ProfileView:MonoBehaviour
  {
    public static ProfileView Instance {get;private set;}
    public static bool CoversCurrentScreen=>Instance&&Instance.Wanted();
    public bool Visible {get;private set;}public bool EditingName {get;private set;}public string FormError {get;private set;}="";
    public ProfileViewModel Model {get;private set;}
    private VisualElement page,stats,nameForm,cloudForm,repeatRow,create,login,reset;private Label status,hint,feedback,message;
    private TextField nameInput,email,password,repeated;private CareerMenuModel seen;private string user="";private bool guest=true;
    private bool Wanted()=>page!=null&&SceneManager.GetActiveScene().name=="Garage"&&GameFlow.Profile&&!SettingsScreen.Open&&!MutantRuntime.Active;
    private void Start()
    {
      Instance=this;page=new VisualElement{name="f-profile"};page.AddToClassList("katman");page.Add(Ui.Shade());var bar=new VisualElement();bar.AddToClassList("ustbar");bar.Add(Ui.Logo());bar.Add(Ui.Text("SÜRÜCÜ PROFİLİ","g-money"));page.Add(bar);
      var content=Box("p-content");page.Add(content);var left=Box("p-left");stats=Box("p-stats");left.Add(stats);
      nameForm=Box("g-panel");nameInput=Field("Sürücü adı","profile-name",20,false,2);nameForm.Add(nameInput);nameForm.Add(Button("ADI KAYDET","Enter",SaveName,"profile-save-name",3));nameForm.Add(Button("VAZGEÇ","Esc",CancelName,"profile-cancel-name",4));left.Add(nameForm);content.Add(left);
      var right=new ScrollView(ScrollViewMode.Vertical){horizontalScrollerVisibility=ScrollerVisibility.Hidden};right.AddToClassList("g-panel");right.AddToClassList("p-cloud");right.Add(Ui.Section("BULUT HESABI"));status=Ui.Text("","p-status");right.Add(status);hint=Ui.Text("","g-copy");right.Add(hint);
      cloudForm=Box("p-form");email=Field("E-posta","profile-email",120,false,10);password=Field("Şifre","profile-password",64,true,11);repeated=Field("Şifre tekrar (yalnız yeni hesap)","profile-repeat",64,true,12);repeatRow=repeated;cloudForm.Add(email);cloudForm.Add(password);cloudForm.Add(repeated);
      create=Button("HESAP OLUŞTUR","",Create,"profile-create",13,true);cloudForm.Add(create);login=Button("GİRİŞ YAP","Enter",SignIn,"profile-login",14);cloudForm.Add(login);reset=Button("ŞİFREMİ UNUTTUM","",ResetPassword,"profile-reset",15);cloudForm.Add(reset);right.Add(cloudForm);
      feedback=Ui.Text("","g-copy");feedback.name="profile-feedback";right.Add(feedback);content.Add(right);
      message=Ui.Text("","g-message");page.Add(message);var back=Button("GERİ","Esc",Back,"profile-back",20);Ui.Absolute(back,left:58,bottom:22);page.Add(back);page.Add(Ui.Hints(("Tab","Alan / işlem"),("Enter","Onayla"),("Esc","Geri")));UiRoot.Instance.Screen.Add(page);Ui.Show(page,false);
    }
    private static VisualElement Box(string cls){var e=new VisualElement();e.AddToClassList(cls);return e;}
    private static TextField Field(string label,string name,int length,bool secret,int tab)
    {var f=new TextField(label){name=name,maxLength=length,isPasswordField=secret,tabIndex=tab};f.AddToClassList("p-field");return f;}
    private static VisualElement Button(string label,string key,Action action,string name,int tab,bool primary=false)
    {var b=Ui.Button(label,key,action,primary);b.name=name;b.focusable=true;b.tabIndex=tab;return b;}
    private void Update()
    {
      bool active=Wanted(),changed=active!=Visible;Visible=active;Ui.Show(page,active);
      if(!active){if(changed){ClearPasswords();EditingName=false;FormError="";seen=null;}return;}
      var summary=GameFlow.Menu();if(changed||seen!=summary){seen=summary;RenderProfile();}
      Ui.Show(nameForm,EditingName);message.text=GameFlow.Message;
      var account=CloudRuntime.Account;bool available=account!=null&&GarageSession.PlayerProfile;
      string id=account?.User?.Uid??"";if(user!=id){user=id;ClearPasswords();FormError="";}
      guest=account?.User==null||account.User.Anonim;Ui.Show(create,guest);Ui.Show(repeatRow,guest);
      status.text=account?.Summary()??(CloudRuntime.Unavailable==""?"Bağlanıyor…":CloudRuntime.Unavailable);
      hint.text=!GarageSession.PlayerProfile?"Bu profil (geliştirici/test) buluta eşitlenmez.":guest?"E-postayla bağlan: ilerlemen web oyunu dahil başka cihazlarda da açılır. Var olan hesaba girersen bu cihazdaki ilerleme o hesabınkiyle değişir.":"Başka bir hesaba girersen bu cihazdaki ilerleme o hesabınkiyle değişir; bu hesabın ilerlemesi bulutta kalır.";
      cloudForm.SetEnabled(available&&!account.Busy);feedback.text=FormError!=""?FormError:account?.Error??(account?.Busy==true?"Bağlanıyor…":account?.Info??"");
      if(changed)return;var k=Keyboard.current;if(k==null)return;if(k.escapeKey.wasPressedThisFrame){Back();return;}
      if(k.enterKey.wasPressedThisFrame)
      {
        var focus=page.panel?.focusController.focusedElement as VisualElement;
        if(EditingName&&(focus==nameInput||focus!=null&&nameInput.Contains(focus))){SaveName();return;}
        switch(focus?.name){case "profile-save-name":SaveName();break;case "profile-cancel-name":CancelName();break;case "profile-create":Create();break;case "profile-reset":ResetPassword();break;case "profile-back":Back();break;case "profile-edit-name":BeginName();break;default:SignIn();break;}
      }
    }
    private void RenderProfile()
    {
      Model=ProfileViewModel.Read(GarageSession.State,GarageRace.ProfileStore().Load(),RaceData.Load().Events);stats.Clear();var m=Model.Summary;
      var top=Box("p-identity");var ring=new LevelRing((float)Model.LevelFill);ring.AddToClassList("p-ring");ring.Add(Ui.Text("SEVİYE","g-copy"));ring.Add(Ui.Text(m.Level.ToString(),"baslik"));top.Add(ring);
      var identity=Box("p-name");identity.Add(Ui.Section("SÜRÜCÜ PROFİLİ"));identity.Add(Ui.Text(m.Name,"baslik","g-name"));identity.Add(Ui.Text(m.Xp.ToString("0")+" / "+m.NextLevelXp.ToString("0")+" XP  •  sonraki seviyeye "+Model.RemainingXp.ToString("0")+" XP","g-copy"));var edit=Button("ADI DEĞİŞTİR","",BeginName,"profile-edit-name",1);edit.SetEnabled(!GarageSession.Store.ReadOnly);identity.Add(edit);top.Add(identity);stats.Add(top);
      var cards=Box("p-cards");foreach(var stat in new[]{("YARIŞ",m.Races+"  /  "+m.Wins+" galibiyet"),("TOPLAM YOL",m.Km.ToString("0.0")+" km"),("YILDIZ",m.Stars+" / "+m.MaxStars),("PARA",m.Money.ToString("N0"))}){var card=Box("kart");card.Add(Ui.Text(stat.Item1,"ust"));card.Add(Ui.Text(stat.Item2,"ad"));cards.Add(card);}stats.Add(cards);
      var favorite=Box("g-panel");favorite.Add(Ui.Section("EN ÇOK KULLANILAN"));favorite.Add(Ui.Text(m.Favorite,"baslik","g-name"));if(Model.Favorite!=null)favorite.Add(Ui.Text(Model.Favorite.Class+Model.Favorite.Score.ToString("0")+"  •  "+Model.FavoriteUses+" yarış","g-class"));stats.Add(favorite);
    }
    public void BeginName(){EditingName=true;nameInput.SetValueWithoutNotify(GameFlow.Menu().Name);nameInput.Focus();}
    public void CancelName(){EditingName=false;}
    public void SaveName(){if(!EditingName)return;if(GameFlow.SaveName(nameInput.value))EditingName=false;}
    private bool CanSubmit()=>CloudRuntime.Account!=null&&!CloudRuntime.Account.Busy&&GarageSession.PlayerProfile;
    public void Create(){if(!CanSubmit()||CloudRuntime.Account.User!=null&&!CloudRuntime.Account.User.Anonim)return;FormError=ProfileViewModel.Validate(email.value,password.value,repeated.value,true);if(FormError!="")return;CloudRuntime.CreateEmail(email.value,password.value);ClearPasswords();}
    public void SignIn(){if(!CanSubmit())return;FormError=ProfileViewModel.Validate(email.value,password.value,repeated.value,false);if(FormError!="")return;CloudRuntime.SignInEmail(email.value,password.value);ClearPasswords();}
    public void ResetPassword(){if(!CanSubmit())return;FormError=ProfileViewModel.ValidateReset(email.value);if(FormError=="")CloudRuntime.ResetPassword(email.value);}
    private void ClearPasswords(){password?.SetValueWithoutNotify("");repeated?.SetValueWithoutNotify("");}
    public void Back(){if(EditingName){CancelName();return;}ClearPasswords();GameFlow.Back();}
    private void OnDestroy(){ClearPasswords();if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
    private sealed class LevelRing:VisualElement
    {
      public LevelRing(float fill){generateVisualContent+=ctx=>{var p=ctx.painter2D;var center=contentRect.center;float radius=Math.Min(contentRect.width,contentRect.height)/2-10;p.lineWidth=12;void Draw(float amount,Color color){p.strokeColor=color;p.BeginPath();for(int i=0;i<=64;i++){float angle=(-90+360*amount*i/64)*Mathf.Deg2Rad;var v=center+new Vector2(Mathf.Cos(angle),Mathf.Sin(angle))*radius;if(i==0)p.MoveTo(v);else p.LineTo(v);}p.Stroke();}Draw(1,new Color(.18f,.23f,.26f));if(fill>0)Draw(fill,Ui.Accent);};}
    }
  }
}
