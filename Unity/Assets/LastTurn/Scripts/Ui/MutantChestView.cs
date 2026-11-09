using System;
using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // B /4A: salt hazırlanmış teklif; üretim ve tüketim Core/Runtime'da kalır.
  public sealed class MutantChestView:MonoBehaviour
  {
    public static MutantChestView Instance{get;private set;}
    public static bool CoversCurrentScreen=>MutantRuntime.Active&&!MutantRuntime.Starting&&MutantRuntime.Panel=="chest"&&!GameFlow.Paused&&!SettingsScreen.Open;
    public static int HandledFrame{get;private set;}=-1;
    public bool Visible{get;private set;}
    public bool AcceptFocused{get;private set;}=true;
    private VisualElement page,icon,accept,reject;private Label title,name,description,cost,costDescription,status;
    private MutantRun run;private int id,tabFrame=-1,actionFrame=-1;private string offer="",stamp="";
    private void Start()
    {
      Instance=this;HandledFrame=-1;page=new VisualElement{name="b-mutant-chest"};page.AddToClassList("katman");page.AddToClassList("mc-page");page.AddToClassList("mt-page");page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-choice"));page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-terminal"));page.style.backgroundImage=Resources.Load<Texture2D>("UI/MutantB/background");
      page.RegisterCallback<NavigationMoveEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);page.RegisterCallback<NavigationSubmitEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);
      page.RegisterCallback<KeyDownEvent>(e=>{if(e.keyCode==KeyCode.Tab){Tab();e.PreventDefault();e.StopImmediatePropagation();}else if(e.keyCode==KeyCode.Return||e.keyCode==KeyCode.KeypadEnter||e.keyCode==KeyCode.LeftArrow||e.keyCode==KeyCode.RightArrow||e.keyCode==KeyCode.UpArrow||e.keyCode==KeyCode.DownArrow){e.PreventDefault();e.StopImmediatePropagation();}},TrickleDown.TrickleDown);
      var bar=new VisualElement();bar.AddToClassList("mc-bar");bar.Add(Ui.Logo());bar.Add(Ui.Text("MUTANT / SANDIK","mc-badge"));status=Ui.Text("","mc-status");bar.Add(status);page.Add(bar);
      var layout=new VisualElement();layout.AddToClassList("mt-body");page.Add(layout);var left=new ScrollView();left.AddToClassList("mt-left");layout.Add(left);
      title=Ui.Text("","mt-kicker");title.name="chest-title";left.Add(title);icon=new VisualElement();icon.AddToClassList("mt-icon");left.Add(icon);name=Ui.Text("","mt-title");name.name="chest-name";left.Add(name);description=Ui.Text("","mt-copy");description.name="chest-description";left.Add(description);left.Add(Ui.Text("Tek teklif · Kabul etmek sana bağlı.","mt-copy"));
      var right=new VisualElement();right.AddToClassList("mt-panel");layout.Add(right);cost=Ui.Text("","mt-title");cost.name="chest-cost";right.Add(cost);var scroll=new ScrollView();scroll.AddToClassList("mt-detail");right.Add(scroll);costDescription=Ui.Text("","mt-copy");costDescription.name="chest-cost-description";scroll.Add(costDescription);
      var actions=new VisualElement();actions.AddToClassList("mt-actions");right.Add(actions);accept=Ui.Button("AL","",()=>Resolve(true),true);accept.name="chest-accept";reject=Ui.Button("REDDET","",()=>Resolve(false));reject.name="chest-reject";
      foreach(var b in new[]{accept,reject}){b.focusable=true;actions.Add(b);b.RegisterCallback<FocusInEvent>(e=>Focus(b==accept,false));}var frame=new VisualElement{pickingMode=PickingMode.Ignore};frame.AddToClassList("mc-frame");right.Add(frame);
      page.Add(Ui.Hints(("←|→","Al / Reddet"),("Tab","Odak"),("Enter","Onay"),("Esc","Duraklat")));UiRoot.Instance.Screen.Add(page);Ui.Show(page,false);
    }
    private void Focus(bool yes,bool apply=true){AcceptFocused=yes&&accept.enabledInHierarchy;accept.EnableInClassList("mc-selected",AcceptFocused);reject.EnableInClassList("mc-selected",!AcceptFocused);if(apply)(AcceptFocused?accept:reject).Focus();}
    private void Tab(){if(tabFrame==Time.frameCount)return;tabFrame=Time.frameCount;Focus(!AcceptFocused);}
    private void Update()
    {
      bool was=Visible;Visible=CoversCurrentScreen;Ui.Show(page,Visible);if(!Visible)return;
      var m=MutantRuntime.Model;var row=m.Chests.FirstOrDefault(c=>c.Id==MutantRuntime.MarkerId);string next=row==null?"missing":row.Id+"|"+row.Offer+"|"+row.Opened+"|"+row.Inspected+"|"+row.CanAccept+"|"+row.Name+row.Description+row.CurseName+row.CurseDescription;
      bool changed=run!=MutantRuntime.Run||stamp!=next;
      if(changed){run=MutantRuntime.Run;stamp=next;id=MutantRuntime.MarkerId;offer=row?.Offer??"";title.text=row?.Title??"Sandık bulunamadı";name.text=row?.Name??"Teklif kullanılamıyor";description.text=row?.Description??"";cost.text=row?.Cursed==true?"BEDEL · "+row.CurseName:"TEKLİF";cost.EnableInClassList("mt-curse",row?.Cursed==true);costDescription.text=row==null||row.Opened||!row.Inspected?"Bu teklif artık kullanılamıyor. Reddet ile sürüşe dönebilirsin.":row.Cursed?row.CurseDescription:"Ek lanet bedeli yok.";accept.SetEnabled(row?.CanAccept==true);icon.Clear();if(row!=null)icon.Add(MutantRewardIcons.Create(row.IconKey));}
      status.text="BÖLGE "+m.Region+" · BOSS "+m.Timer;
      if(!was||changed){Focus(changed||AcceptFocused);return;}var k=Keyboard.current;if(k==null)return;if(k.tabKey.wasPressedThisFrame)Tab();else if(k.leftArrowKey.wasPressedThisFrame||k.rightArrowKey.wasPressedThisFrame||k.upArrowKey.wasPressedThisFrame||k.downArrowKey.wasPressedThisFrame)Focus(!AcceptFocused);else if(k.enterKey.wasPressedThisFrame||k.numpadEnterKey.wasPressedThisFrame)Resolve(AcceptFocused);
    }
    public void Resolve(bool yes)
    {
      if(!CoversCurrentScreen||actionFrame==Time.frameCount||run!=MutantRuntime.Run)return;actionFrame=Time.frameCount;HandledFrame=Time.frameCount;
      var row=MutantRuntime.Model.Chests.FirstOrDefault(c=>c.Id==id);
      if(MutantRuntime.MarkerId!=id||row==null||row.Opened||!row.Inspected){if(!yes)MutantRuntime.ClosePanel();return;}
      if(row.Offer!=offer){stamp="";return;}MutantRuntime.ResolveChest(id,offer,yes);
    }
    private void OnDestroy(){if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
  }
}
