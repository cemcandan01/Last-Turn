using System;
using System.Linq;
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
    // Hesap değiştir listesi, başka hesap seçenekleri, yeni misafir ve admin sıfırlama onayları (TS hesap-ui durumları).
    private VisualElement accountTop,accountBox;private TextField levelInput;private string accountSig="";private int itemIndex;
    public bool ListOpen {get;private set;}public bool OtherOpen {get;private set;}public bool AskNew {get;private set;}public bool AskReset {get;private set;}private bool copied;
    private bool Wanted()=>page!=null&&SceneManager.GetActiveScene().name=="Garage"&&GameFlow.Profile&&!SettingsScreen.Open&&!MutantRuntime.Active;
    private void Start()
    {
      Instance=this;page=new VisualElement{name="f-profile"};page.AddToClassList("katman");page.Add(Ui.Shade());var bar=new VisualElement();bar.AddToClassList("ustbar");bar.Add(Ui.Logo());bar.Add(Ui.Text("SÜRÜCÜ PROFİLİ","g-money"));page.Add(bar);
      var content=Box("p-content");page.Add(content);var left=Box("p-left");stats=Box("p-stats");left.Add(stats);
      nameForm=Box("g-panel");nameInput=Field("Sürücü adı","profile-name",20,false,2);nameForm.Add(nameInput);nameForm.Add(Button("ADI KAYDET","Enter",SaveName,"profile-save-name",3));nameForm.Add(Button("VAZGEÇ","Esc",CancelName,"profile-cancel-name",4));left.Add(nameForm);content.Add(left);
      var right=new ScrollView(ScrollViewMode.Vertical){horizontalScrollerVisibility=ScrollerVisibility.Hidden};right.AddToClassList("g-panel");right.AddToClassList("p-cloud");right.Add(Ui.Section("BULUT HESABI"));status=Ui.Text("","p-status");right.Add(status);hint=Ui.Text("","g-copy");right.Add(hint);accountTop=Box("p-account");right.Add(accountTop);
      cloudForm=Box("p-form");email=Field("E-posta","profile-email",120,false,10);password=Field("Şifre","profile-password",64,true,11);repeated=Field("Şifre tekrar (yalnız yeni hesap)","profile-repeat",64,true,12);repeatRow=repeated;cloudForm.Add(email);cloudForm.Add(password);cloudForm.Add(repeated);
      create=Button("HESAP OLUŞTUR","",Create,"profile-create",13,true);cloudForm.Add(create);login=Button("GİRİŞ YAP","Enter",SignIn,"profile-login",14);cloudForm.Add(login);reset=Button("ŞİFREMİ UNUTTUM","",ResetPassword,"profile-reset",15);cloudForm.Add(reset);right.Add(cloudForm);
      feedback=Ui.Text("","g-copy");feedback.name="profile-feedback";right.Add(feedback);accountBox=Box("p-account");right.Add(accountBox);content.Add(right);
      message=Ui.Text("","g-message");page.Add(message);var back=Button("GERİ","Esc",Back,"profile-back",20);Ui.Absolute(back,left:58,bottom:22);page.Add(back);page.Add(Ui.Hints(("Tab","Alan / işlem"),("Enter","Onayla"),("Esc","Geri")));UiRoot.Instance.Screen.Add(page);Ui.Show(page,false);
    }
    private static VisualElement Box(string cls){var e=new VisualElement();e.AddToClassList(cls);return e;}
    private static TextField Field(string label,string name,int length,bool secret,int tab)
    {var f=new TextField(label){name=name,maxLength=length,isPasswordField=secret,tabIndex=tab};f.AddToClassList("p-field");return f;}
    private static VisualElement Button(string label,string key,Action action,string name,int tab,bool primary=false)
    {var b=Ui.Button(label,key,action,primary);b.name=name;b.focusable=true;b.tabIndex=tab;b.userData=action;return b;}
    private static VisualElement Small(string label,Action action,string name,int tab,bool enabled=true)
    {var b=Ui.Button(label,"",action,false,true);b.name=name;b.focusable=true;b.tabIndex=tab;b.userData=action;b.SetEnabled(enabled);return b;}
    private void Update()
    {
      bool active=Wanted(),changed=active!=Visible;Visible=active;Ui.Show(page,active);
      if(!active){if(changed){ClearPasswords();EditingName=false;FormError="";seen=null;ListOpen=OtherOpen=AskNew=AskReset=copied=false;accountSig="";}return;}
      var summary=GameFlow.Menu();if(changed||seen!=summary){seen=summary;RenderProfile();}
      Ui.Show(nameForm,EditingName);message.text=GameFlow.Message;
      var account=CloudRuntime.Account;bool available=account!=null&&GarageSession.PlayerProfile;
      string id=account?.User?.Uid??"";if(user!=id){user=id;ClearPasswords();FormError="";}
      guest=account?.User==null||account.User.Anonim;Ui.Show(create,guest);Ui.Show(repeatRow,guest);
      status.text=account?.Summary()??(CloudRuntime.Unavailable==""?"Bağlanıyor…":CloudRuntime.Unavailable);
      hint.text=!GarageSession.PlayerProfile?"Bu profil (geliştirici/test) buluta eşitlenmez.":guest?"E-postayla bağlan: ilerlemen web oyunu dahil başka cihazlarda da açılır. Var olan hesaba girersen bu cihazdaki ilerleme o hesabınkiyle değişir.":"Başka bir hesaba girersen bu cihazdaki ilerleme o hesabınkiyle değişir; bu hesabın ilerlemesi bulutta kalır.";
      cloudForm.SetEnabled(available&&!account.Busy);feedback.text=FormError!=""?FormError:account?.Error??(account?.Busy==true?"Bağlanıyor…":account?.Info??"");
      RenderAccount(account,available);
      if(changed)return;var k=Keyboard.current;if(k==null)return;if(k.escapeKey.wasPressedThisFrame){Back();return;}
      if(k.enterKey.wasPressedThisFrame)
      {
        var focus=page.panel?.focusController.focusedElement as VisualElement;
        if(EditingName&&(focus==nameInput||focus!=null&&nameInput.Contains(focus))){SaveName();return;}
        if(levelInput!=null&&(focus==levelInput||focus!=null&&levelInput.Contains(focus))){AdminLevel();return;}
        switch(focus?.name){case "profile-save-name":SaveName();break;case "profile-cancel-name":CancelName();break;case "profile-create":Create();break;case "profile-reset":ResetPassword();break;case "profile-back":Back();break;case "profile-edit-name":BeginName();break;default:if(focus?.userData is Action act)act();else SignIn();break;}
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
    // ---------- Hesap değiştir / yeni misafir / admin (TS hesap-ui.ts)
    private void RenderAccount(CloudAccount account,bool available)
    {
      var k=account?.User;var known=account?.KnownAccounts();
      string sig=string.Join("|",available,k?.Uid,k?.Anonim,account?.Busy,account?.Admin,GarageState.AdminMode,ListOpen,OtherOpen,AskNew,AskReset,copied,known==null?"":string.Join(",",known.Select(h=>h.Uid+h.Level+h.Admin)));
      if(sig==accountSig)return;accountSig=sig;accountTop.Clear();accountBox.Clear();levelInput=null;
      if(account==null||!available||k==null)return;bool idle=!account.Busy;
      var row=Box("p-actions");
      if(k.Anonim)row.Add(Small("GOOGLE İLE BAĞLAN",()=>CloudRuntime.LinkGoogle(),"profile-google",16,idle));
      row.Add(Small(ListOpen?"LİSTEYİ KAPAT":"HESAP DEĞİŞTİR",ToggleList,"profile-switch",17,idle));accountTop.Add(row);
      if(ListOpen)
      {
        var list=Box("p-list");int tab=30;
        if(known.Count==0)list.Add(Ui.Text("Bu cihazda girilmiş hesap yok.","g-copy"));
        for(int i=0;i<known.Count;i++)
        {
          var h=known[i];bool current=h.Uid==k.Uid;var line=Box("p-acc-row");
          line.Add(Small(ProfileViewModel.AccountLine(h,current),()=>SwitchTo(h),"profile-account-"+i,tab++,idle&&!current));
          if(!current)line.Add(Small("KALDIR",()=>CloudRuntime.RemoveKnown(h.Uid),"profile-remove-"+i,tab++,idle));
          list.Add(line);
        }
        var more=Box("p-actions");more.Add(Small("+ BAŞKA HESAP",()=>{OtherOpen=!OtherOpen;AskNew=false;},"profile-other",tab++,idle));more.Add(Small("MİSAFİR OLARAK DEVAM (YENİ)",()=>{AskNew=true;OtherOpen=false;},"profile-new",tab++,idle));list.Add(more);
        if(OtherOpen){var other=Box("p-actions");other.Add(Small("GOOGLE İLE GİRİŞ",()=>{CloseList();CloudRuntime.LinkGoogle();},"profile-other-google",tab++,idle));other.Add(Small("E-POSTA İLE GİRİŞ",()=>{CloseList();email.Focus();},"profile-other-email",tab++,idle));list.Add(other);}
        if(AskNew)
        {
          list.Add(Ui.Text((k.Anonim?"Bu misafir hesabın ilerlemesi silinir.":"Bu hesabın ilerlemesi bulutta kalır; listeden yeniden girebilirsin.")+" Bu cihazda yeni bir misafirle sıfırdan başlanır (ayarlar kalır).","g-copy","p-warn"));
          var ask=Box("p-actions");ask.Add(Small("EVET, YENİ MİSAFİR",()=>{CloseList();CloudRuntime.NewPlayer();},"profile-new-yes",tab++,idle));ask.Add(Small("VAZGEÇ",()=>AskNew=false,"profile-new-no",tab++));list.Add(ask);
        }
        accountTop.Add(list);
      }
      if(!k.Anonim)
      {
        var id=Box("p-acc-row");id.Add(Ui.Text("Hesap kimliği: "+k.Uid,"g-copy","p-uid"));
        id.Add(Small(copied?"KOPYALANDI":"KOPYALA",()=>{GUIUtility.systemCopyBuffer=k.Uid;copied=true;},"profile-copy-uid",60));accountBox.Add(id);
      }
      if(account.Admin)RenderAdmin(idle);
    }
    private void RenderAdmin(bool idle)
    {
      var panel=Box("p-admin");panel.Add(Ui.Section("ADMIN"));
      var row=Box("p-actions");
      row.Add(Small("HER ŞEY AÇIK: "+(GarageState.AdminMode?"AÇIK":"KAPALI"),()=>CloudRuntime.AdminAll(!GarageState.AdminMode),"profile-admin-all",70,idle));
      row.Add(Small("+1000 PARA",()=>CloudRuntime.AdminMoney(1000),"profile-admin-money-1000",71,idle));row.Add(Small("+10000 PARA",()=>CloudRuntime.AdminMoney(10000),"profile-admin-money-10000",72,idle));
      row.Add(Small("+100 XP",()=>CloudRuntime.AdminXp(100),"profile-admin-xp-100",73,idle));row.Add(Small("+1000 XP",()=>CloudRuntime.AdminXp(1000),"profile-admin-xp-1000",74,idle));panel.Add(row);
      var level=Box("p-actions");levelInput=Field("Seviye (1–99)","profile-admin-level",2,false,75);levelInput.SetValueWithoutNotify(GarageSession.State.Level.ToString());level.Add(levelInput);
      level.Add(Small("SEVİYEYİ AYARLA",AdminLevel,"profile-admin-level-set",76,idle));panel.Add(level);
      var items=ProfileViewModel.AdminItems(GarageSession.State,RaceData.Load().Events);itemIndex=Math.Max(0,Math.Min(itemIndex,items.Length-1));
      var pick=new DropdownField("Öğe",items.Select(i=>i.Label).ToList(),itemIndex){name="profile-admin-item",tabIndex=77};pick.AddToClassList("p-field");pick.RegisterValueChangedCallback(_=>itemIndex=pick.index);
      var lockRow=Box("p-actions");lockRow.Add(pick);lockRow.Add(Small("AÇ",()=>CloudRuntime.AdminUnlock(items[itemIndex].Key,true),"profile-admin-open",78,idle));lockRow.Add(Small("KİLİTLE",()=>CloudRuntime.AdminUnlock(items[itemIndex].Key,false),"profile-admin-lock",79,idle));panel.Add(lockRow);
      var reset=Box("p-actions");
      if(AskReset){reset.Add(Small("EVET, İLERLEMEYİ SIFIRLA",()=>{AskReset=false;CloudRuntime.AdminReset();},"profile-admin-reset-yes",80,idle));reset.Add(Small("VAZGEÇ",()=>AskReset=false,"profile-admin-reset-no",81));}
      else reset.Add(Small("İLERLEMEYİ SIFIRLA",()=>AskReset=true,"profile-admin-reset",80,idle));
      panel.Add(reset);accountBox.Add(panel);
    }
    public void ToggleList(){ListOpen=!ListOpen;OtherOpen=AskNew=false;}
    private void CloseList(){ListOpen=OtherOpen=AskNew=false;}
    /// TS listeden geçiş: Google hesabında hesap seçici önerilen e-postayla açılır; e-posta hesabında şifre sorulur.
    public void SwitchTo(KnownAccount h){CloseList();FormError="";if(h.Yol=="google")CloudRuntime.LinkGoogle(h.Label);else{email.SetValueWithoutNotify(h.Label);password.Focus();}}
    public void AdminLevel(){if(levelInput==null)return;if(ProfileViewModel.Level(levelInput.value,out int lv)){FormError="";CloudRuntime.AdminLevel(lv);}else FormError="Seviye 1–99 arasında olmalı";}
    private void ClearPasswords(){password?.SetValueWithoutNotify("");repeated?.SetValueWithoutNotify("");}
    public void Back(){if(EditingName){CancelName();return;}ClearPasswords();GameFlow.Back();}
    private void OnDestroy(){ClearPasswords();if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
    private sealed class LevelRing:VisualElement
    {
      public LevelRing(float fill){generateVisualContent+=ctx=>{var p=ctx.painter2D;var center=contentRect.center;float radius=Math.Min(contentRect.width,contentRect.height)/2-10;p.lineWidth=12;void Draw(float amount,Color color){p.strokeColor=color;p.BeginPath();for(int i=0;i<=64;i++){float angle=(-90+360*amount*i/64)*Mathf.Deg2Rad;var v=center+new Vector2(Mathf.Cos(angle),Mathf.Sin(angle))*radius;if(i==0)p.MoveTo(v);else p.LineTo(v);}p.Stroke();}Draw(1,new Color(.18f,.23f,.26f));if(fill>0)Draw(fill,Ui.Accent);};}
    }
  }
}
