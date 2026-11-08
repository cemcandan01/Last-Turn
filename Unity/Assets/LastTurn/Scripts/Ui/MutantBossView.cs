using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // B / 6A: salt boss görünümü; yarış hedefi, rakip ve geçişler mevcut Runtime/Core'da.
  public sealed class MutantBossView:MonoBehaviour
  {
    public static MutantBossView Instance {get;private set;}
    public static bool OwnsBoss=>MutantRuntime.Active&&!MutantRuntime.Starting&&MutantRuntime.Panel=="boss";
    public static bool CoversCurrentScreen=>OwnsBoss&&!GameFlow.Paused&&!SettingsScreen.Open;
    public bool Visible {get;private set;}
    public int Focused {get;private set;}
    public static int HandledFrame {get;private set;}=-1;
    public ScrollView Details {get;private set;}
    private VisualElement page,emblem,go,back,hints;
    private Label status,where,title,description,type,weakness,abilities,target;
    private string shown="";
    private bool canBack;
    private int tabFrame=-1;
    private void Start()
    {
      Instance=this;HandledFrame=-1;page=new VisualElement{name="b-mutant-boss"};page.AddToClassList("katman");page.AddToClassList("mc-page");page.AddToClassList("mb-page");
      page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-choice"));page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-boss"));
      page.style.backgroundImage=Resources.Load<Texture2D>("UI/MutantB/background");
      page.RegisterCallback<NavigationMoveEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);
      page.RegisterCallback<NavigationSubmitEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);
      page.RegisterCallback<KeyDownEvent>(e=>{if(e.keyCode==KeyCode.Tab){Tab();e.PreventDefault();e.StopImmediatePropagation();}else if(e.keyCode==KeyCode.LeftArrow||e.keyCode==KeyCode.RightArrow||e.keyCode==KeyCode.UpArrow||e.keyCode==KeyCode.DownArrow||e.keyCode==KeyCode.Return||e.keyCode==KeyCode.KeypadEnter||e.keyCode==KeyCode.PageUp||e.keyCode==KeyCode.PageDown){e.PreventDefault();e.StopImmediatePropagation();}},TrickleDown.TrickleDown);
      var bar=new VisualElement();bar.AddToClassList("mc-bar");bar.Add(Ui.Logo());bar.Add(Ui.Text("MUTANT / BOSS","mc-badge"));status=Ui.Text("","mc-status");bar.Add(status);page.Add(bar);
      var body=new VisualElement();body.AddToClassList("mb-body");page.Add(body);
      where=Ui.Text("","mb-kicker");title=Ui.Text("","baslik","mb-title");description=Ui.Text("","mc-copy");type=Ui.Text("","mc-copy");body.Add(where);body.Add(title);body.Add(description);body.Add(type);
      var panel=new VisualElement();panel.AddToClassList("mb-panel");body.Add(panel);
      emblem=new VisualElement{name="mutant-boss-emblem",pickingMode=PickingMode.Ignore};emblem.AddToClassList("mb-emblem");panel.Add(emblem);
      var right=new VisualElement();right.AddToClassList("mb-right");panel.Add(right);
      Details=new ScrollView(ScrollViewMode.Vertical){horizontalScrollerVisibility=ScrollerVisibility.Hidden};Details.AddToClassList("mb-details");right.Add(Details);
      Details.Add(Ui.Text("ZAYIFLIK","mb-kicker"));weakness=Ui.Text("","mb-copy");Details.Add(weakness);
      Details.Add(Ui.Text("YETENEKLER","mb-kicker"));abilities=Ui.Text("","mb-copy");Details.Add(abilities);
      target=Ui.Text("","mb-target");Details.Add(target);
      var actions=new VisualElement();actions.AddToClassList("mc-actions");right.Add(actions);
      go=Ui.Button("BOSS'A MEYDAN OKU","Enter",Challenge,true);go.name="mutant-boss-challenge";go.focusable=true;go.tabIndex=0;go.RegisterCallback<FocusInEvent>(e=>Sync(0,false));actions.Add(go);
      back=Ui.Button("GERİ","Esc",Back,small:true);back.name="mutant-boss-back";back.focusable=true;back.tabIndex=0;back.RegisterCallback<FocusInEvent>(e=>Sync(1,false));actions.Add(back);
      var frame=new VisualElement{pickingMode=PickingMode.Ignore};frame.AddToClassList("mc-frame");panel.Add(frame);
      hints=new VisualElement{pickingMode=PickingMode.Ignore};Ui.Absolute(hints,left:0,top:0,right:0,bottom:0);page.Add(hints);UiRoot.Instance.Screen.Add(page);Ui.Show(page,false);
    }
    private void Update()
    {
      bool was=Visible;Visible=CoversCurrentScreen;Ui.Show(page,Visible);
      if(!Visible){if(!OwnsBoss)shown="";else if(GameFlow.Paused&&!SettingsScreen.Open&&Time.frameCount!=SettingsScreen.ClosedFrame&&Keyboard.current!=null&&Keyboard.current.escapeKey.wasPressedThisFrame)GameFlow.Pause(false);return;}
      var m=MutantRuntime.Model;status.text="BÖLGE "+m.Region+"  ·  BOSS "+m.Timer+"  ·  GÖVDE "+m.Body.ToString("0")+"  ·  "+m.Money.ToString("0")+" PARA";
      where.text="BÖLGE "+m.Region+" / "+(m.CanLeaveBoss?"BOSS "+m.Timer:"SÜRE DOLDU");title.text=m.BossName;description.text=m.BossDescription;type.text="Tür: "+TypeName(m.BossType);
      weakness.text=m.BossWeakness;abilities.text=string.Join("\n\n",m.BossAbilities);target.text="HEDEF: "+(m.BossDuel?"Boss'u geç":m.BossTarget.ToString("0.##")+(m.BossType=="dp"?" puan":" sn"));
      bool changed=shown!=m.BossId||canBack!=m.CanLeaveBoss;
      if(changed){shown=m.BossId;canBack=m.CanLeaveBoss;emblem.style.backgroundImage=Resources.Load<Texture2D>("UI/MutantB/boss/"+m.BossId);emblem.tooltip=m.BossName;Details.scrollOffset=Vector2.zero;Ui.Show(back,canBack);hints.Clear();hints.Add(Ui.Hints(("←|→","Seç"),("Enter","Onayla"),("PgUp|PgDn","Ayrıntılar"),("Esc",canBack?"Geri":"Duraklat")));Sync(0,true);}
      go.SetEnabled(!m.Finished&&m.SelectedCar>=0);
      if(!was||changed)return;var k=Keyboard.current;if(k==null)return;
      if(k.escapeKey.wasPressedThisFrame&&Time.frameCount!=SettingsScreen.ClosedFrame){if(canBack)Back();else GameFlow.Pause(true);return;}
      if(k.tabKey.wasPressedThisFrame)Tab();
      else if(k.pageDownKey.wasPressedThisFrame)Details.scrollOffset+=new Vector2(0,120);
      else if(k.pageUpKey.wasPressedThisFrame)Details.scrollOffset-=new Vector2(0,120);
      else if(k.leftArrowKey.wasPressedThisFrame||k.rightArrowKey.wasPressedThisFrame||k.upArrowKey.wasPressedThisFrame||k.downArrowKey.wasPressedThisFrame)Sync(canBack?1-Focused:0,true);
      else if(k.enterKey.wasPressedThisFrame||k.numpadEnterKey.wasPressedThisFrame){if(Focused==0)Challenge();else Back();}
    }
    private void Sync(int index,bool focus){Focused=canBack?index:0;go.EnableInClassList("sec",Focused==0);back.EnableInClassList("sec",Focused==1);if(focus)(Focused==0?go:back).Focus();}
    private void Tab(){if(tabFrame==Time.frameCount)return;tabFrame=Time.frameCount;Sync(canBack?1-Focused:0,true);}
    public void Challenge(){if(!CoversCurrentScreen)return;var m=MutantRuntime.Model;if(!m.Finished&&m.SelectedCar>=0)MutantRuntime.StartRace(-1,0,true);}
    public void Back(){if(CoversCurrentScreen&&MutantRuntime.Model.CanLeaveBoss){HandledFrame=Time.frameCount;MutantRuntime.ClosePanel();}}
    private static string TypeName(string type){switch(type){case "rl":return "Toprak / ralli";case "rx":return "Rallikros";case "dp":return "Drift";case "dg":return "Drag";case "gp":return "Asfalt";default:return type;}}
    private void OnDestroy(){if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
  }
}
