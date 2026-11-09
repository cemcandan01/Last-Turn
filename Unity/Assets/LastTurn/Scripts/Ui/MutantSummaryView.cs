using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  public sealed class MutantSummaryView:MonoBehaviour
  {
    public static MutantSummaryView Instance{get;private set;}
    public static bool CoversCurrentScreen=>MutantRuntime.Active&&!MutantRuntime.Starting&&MutantRuntime.Panel=="summary"&&!GameFlow.Paused&&!SettingsScreen.Open;
    public bool Visible{get;private set;}
    private VisualElement page,go;private Label reason,region,bosses,record,notice;private MutantRun run;
    private void Start()
    {
      Instance=this;page=new VisualElement{name="b-mutant-summary"};page.AddToClassList("katman");page.AddToClassList("mc-page");page.AddToClassList("mt-page");page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-choice"));page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-terminal"));page.style.backgroundImage=Resources.Load<Texture2D>("UI/MutantB/background");
      page.RegisterCallback<NavigationSubmitEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);page.RegisterCallback<NavigationMoveEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);
      page.RegisterCallback<KeyDownEvent>(e=>{if(e.keyCode==KeyCode.Tab){go.Focus();e.PreventDefault();e.StopImmediatePropagation();}else if(e.keyCode==KeyCode.Return||e.keyCode==KeyCode.KeypadEnter){e.PreventDefault();e.StopImmediatePropagation();}},TrickleDown.TrickleDown);
      var bar=new VisualElement();bar.AddToClassList("mc-bar");bar.Add(Ui.Logo());bar.Add(Ui.Text("MUTANT / KOŞU ÖZETİ","mc-badge"));page.Add(bar);
      var layout=new VisualElement();layout.AddToClassList("mt-body");page.Add(layout);var left=new ScrollView();left.AddToClassList("mt-left");layout.Add(left);left.Add(Ui.Text("KOŞU BİTTİ","mt-kicker"));reason=Text(left,"summary-reason","mt-title");region=Text(left,"summary-region","mt-title");bosses=Text(left,"summary-bosses","mt-copy");notice=Text(left,"summary-notice","mt-copy");
      var right=new VisualElement();right.AddToClassList("mt-panel");layout.Add(right);right.Add(Ui.Text("EN İYİ KOŞU","mt-kicker"));var detail=new ScrollView();detail.AddToClassList("mt-detail");right.Add(detail);record=Text(detail,"summary-record","mt-title");detail.Add(Ui.Text("Mutant menüsüne dönerek yeniden başlayabilirsin.","mt-copy"));
      var actions=new VisualElement();actions.AddToClassList("mt-actions");right.Add(actions);go=Ui.Button("ANA MENÜ","Enter",Exit,true);go.name="summary-exit";go.focusable=true;go.AddToClassList("mc-selected");actions.Add(go);var frame=new VisualElement{pickingMode=PickingMode.Ignore};frame.AddToClassList("mc-frame");right.Add(frame);
      page.Add(Ui.Hints(("Enter","Mutant menüsü"),("Esc","Duraklat")));UiRoot.Instance.Screen.Add(page);Ui.Show(page,false);
    }
    private static Label Text(VisualElement parent,string name,string css){var e=Ui.Text("",css);e.name=name;parent.Add(e);return e;}
    private void Update()
    {
      bool was=Visible;Visible=CoversCurrentScreen;Ui.Show(page,Visible);if(!Visible)return;
      if(!was||run!=MutantRuntime.Run){run=MutantRuntime.Run;var m=MutantRuntime.Summary();reason.text=m.Reason;region.text="BÖLGE "+m.Region;bosses.text=m.Bosses+" boss yenildi.";record.text=m.RecordText;notice.text=m.Notice;go.Focus();return;}
      var k=Keyboard.current;if(k==null)return;if(k.tabKey.wasPressedThisFrame||k.leftArrowKey.wasPressedThisFrame||k.rightArrowKey.wasPressedThisFrame||k.upArrowKey.wasPressedThisFrame||k.downArrowKey.wasPressedThisFrame)go.Focus();else if(k.enterKey.wasPressedThisFrame||k.numpadEnterKey.wasPressedThisFrame)Exit();
    }
    public void Exit(){if(CoversCurrentScreen)MutantRuntime.Exit();}
    private void OnDestroy(){if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
  }
}
