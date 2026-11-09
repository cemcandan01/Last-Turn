using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // B /2A: salt etkinlik sunumu ve odak. Yarış/ödül kuralları mevcut Core/Runtime'da kalır.
  public sealed class MutantEventView:MonoBehaviour
  {
    public static MutantEventView Instance {get;private set;}
    public static bool OwnsEvent=>MutantRuntime.Active&&!MutantRuntime.Starting&&MutantRuntime.Panel=="event";
    public static bool CoversCurrentScreen=>OwnsEvent&&!GameFlow.Paused&&!SettingsScreen.Open;
    public static int HandledFrame {get;private set;}=-1;
    public bool Visible {get;private set;}
    public int Focused {get;private set;}
    public int Selected {get;private set;}
    public ScrollView Risks {get;private set;}
    public ScrollView Info {get;private set;}
    private VisualElement page,go,back;private Label status,kicker,title,type,notice,instruction;
    private MutantRun run;private int boundId=-1,tabFrame=-1;private string shown="";private bool submitting;
    private readonly List<VisualElement> cards=new List<VisualElement>();private MutantRiskCard[] rows=Array.Empty<MutantRiskCard>();
    private static string N(double value)=>value.ToString("0.##",CultureInfo.InvariantCulture);
    private void Start()
    {
      Instance=this;HandledFrame=-1;page=new VisualElement{name="b-mutant-event"};page.AddToClassList("katman");page.AddToClassList("mc-page");page.AddToClassList("me-page");
      page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-choice"));page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-event"));page.style.backgroundImage=Resources.Load<Texture2D>("UI/MutantB/background");
      page.RegisterCallback<NavigationMoveEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);
      page.RegisterCallback<NavigationSubmitEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);
      page.RegisterCallback<KeyDownEvent>(e=>{if(e.keyCode==KeyCode.Tab){Tab();e.PreventDefault();e.StopImmediatePropagation();}else if(e.keyCode==KeyCode.LeftArrow||e.keyCode==KeyCode.RightArrow||e.keyCode==KeyCode.UpArrow||e.keyCode==KeyCode.DownArrow||e.keyCode==KeyCode.Return||e.keyCode==KeyCode.KeypadEnter||e.keyCode==KeyCode.PageUp||e.keyCode==KeyCode.PageDown){e.PreventDefault();e.StopImmediatePropagation();}},TrickleDown.TrickleDown);
      var bar=new VisualElement();bar.AddToClassList("mc-bar");bar.Add(Ui.Logo());bar.Add(Ui.Text("MUTANT / ETKİNLİK","mc-badge"));status=Ui.Text("","mc-status");bar.Add(status);page.Add(bar);
      var body=new VisualElement();body.AddToClassList("me-body");page.Add(body);
      Info=new ScrollView(ScrollViewMode.Vertical){name="mutant-event-info",horizontalScrollerVisibility=ScrollerVisibility.Hidden};Info.AddToClassList("me-info");body.Add(Info);
      kicker=Text(Info,"mutant-event-level","me-kicker");title=Text(Info,"mutant-event-name","me-title");title.AddToClassList("baslik");type=Text(Info,"mutant-event-type","me-copy");
      instruction=Ui.Text("Riskini seç. Fareyle kartı seçebilir, ardından yarışı başlatabilirsin.","me-copy");Info.Add(instruction);notice=Text(Info,"mutant-event-notice","me-notice");
      var right=new VisualElement();right.AddToClassList("me-right");body.Add(right);
      Risks=new ScrollView(ScrollViewMode.Vertical){name="mutant-event-risks",horizontalScrollerVisibility=ScrollerVisibility.Hidden};Risks.AddToClassList("me-risks");right.Add(Risks);
      var actions=new VisualElement();actions.AddToClassList("mc-actions");right.Add(actions);
      back=Ui.Button("GERİ","",Back,small:true);back.name="mutant-event-back";back.focusable=true;back.tabIndex=0;back.RegisterCallback<FocusInEvent>(e=>Focus(cards.Count+1,false));actions.Add(back);
      go=Ui.Button("YARIŞI BAŞLAT","Enter",Confirm,true);go.name="mutant-event-start";go.focusable=true;go.tabIndex=0;go.RegisterCallback<FocusInEvent>(e=>Focus(cards.Count,false));actions.Add(go);
      page.Add(Ui.Hints(("↑|↓|←|→","Risk seç"),("Tab","Odak"),("Enter","Onayla"),("PgUp|PgDn","Kaydır"),("Esc","Duraklat")));UiRoot.Instance.Screen.Add(page);Ui.Show(page,false);
    }
    private static Label Text(VisualElement parent,string name,string css){var l=Ui.Text("",css);l.name=name;parent.Add(l);return l;}
    private static string Key(MutantEventCard row)=>row==null?"invalid":row.Name+"|"+row.Title+"|"+row.TypeName+"|"+row.LevelName+"|"+string.Join("|",row.Risks.Select(r=>r.Risk+":"+r.Name+":"+r.TargetText+":"+N(r.Money)+":"+N(r.Xp)+":"+N(r.Penalty)+":"+N(r.Consolation)));
    private void Update()
    {
      bool was=Visible;Visible=CoversCurrentScreen;Ui.Show(page,Visible);
      if(!OwnsEvent){run=null;shown="";submitting=false;return;}if(!Visible)return;
      var m=MutantRuntime.Model;var row=m.FindEvent(MutantRuntime.MarkerId);bool identity=run!=MutantRuntime.Run||boundId!=MutantRuntime.MarkerId;
      string key=Key(row);bool changed=identity||shown!=key;
      if(changed){run=MutantRuntime.Run;boundId=MutantRuntime.MarkerId;shown=key;submitting=false;Rebuild(row);}
      status.text="BÖLGE "+m.Region+"  ·  BOSS "+m.Timer+"  ·  GÖVDE "+N(m.Body)+"  ·  "+N(m.Money)+" PARA";
      go.SetEnabled(row!=null&&rows.Length>0&&!m.Finished&&m.SelectedCar>=0&&!submitting);
      if(!was||changed){Focus(Math.Min(Focused,cards.Count+1),true);return;}
      var k=Keyboard.current;if(k==null)return;
      // Esc mevcut MutantScreen pause/devam yolunda; burada ikinci kez işlenmez.
      if(k.tabKey.wasPressedThisFrame)Tab();
      else if(k.downArrowKey.wasPressedThisFrame||k.rightArrowKey.wasPressedThisFrame){if(cards.Count>0)Focus((Selected+1)%cards.Count,true);}
      else if(k.upArrowKey.wasPressedThisFrame||k.leftArrowKey.wasPressedThisFrame){if(cards.Count>0)Focus((Selected+cards.Count-1)%cards.Count,true);}
      else if(k.pageDownKey.wasPressedThisFrame){Info.scrollOffset+=new Vector2(0,120);Risks.scrollOffset+=new Vector2(0,120);}
      else if(k.pageUpKey.wasPressedThisFrame){Info.scrollOffset-=new Vector2(0,120);Risks.scrollOffset-=new Vector2(0,120);}
      else if(k.enterKey.wasPressedThisFrame||k.numpadEnterKey.wasPressedThisFrame){if(Focused==cards.Count+1)Back();else Confirm();}
    }
    private void Rebuild(MutantEventCard row)
    {
      Risks.Clear();cards.Clear();rows=row?.Risks??Array.Empty<MutantRiskCard>();Selected=0;Focused=rows.Length>0?0:1;Info.scrollOffset=Vector2.zero;
      kicker.text=row==null?"ETKİNLİK BULUNAMADI":row.Title+" / "+row.LevelName;title.text=row?.Name??"Bu etkinlik artık kullanılamıyor.";type.text=row?.TypeName??"Dünyaya dönüp başka bir işaret seçebilirsin.";
      notice.text=row==null?"Etkinlik bulunamadı veya tamamlanmış. Yarış başlatılmadı.":"Seçim ve Geri koşu kaynaklarını değiştirmez.";
      Ui.Show(instruction,row!=null);
      for(int i=0;i<rows.Length;i++){
        int at=i;var r=rows[i];var card=new VisualElement{name="mutant-event-risk-"+i,focusable=true,tabIndex=0};card.AddToClassList("me-risk");
        Text(card,"risk-name","me-risk-name").text=r.Name;Text(card,"risk-target","me-target").text="HEDEF · "+r.TargetText;
        Text(card,"risk-reward","me-copy").text=N(r.Money)+" para · "+N(r.Xp)+" XP";Text(card,"risk-penalty","me-small").text="Kaçırınca: "+N(r.Penalty)+" sn ceza · "+N(r.Consolation)+" para teselli";
        Text(card,"risk-selected","me-selected-label");var frame=new VisualElement{pickingMode=PickingMode.Ignore};frame.AddToClassList("mc-frame");card.Add(frame);
        card.AddManipulator(new Clickable(()=>Focus(at,true)));card.RegisterCallback<FocusInEvent>(e=>Focus(at,false));cards.Add(card);Risks.Add(card);
      }
    }
    public void Focus(int index)=>Focus(index,true);
    private void Focus(int index,bool focus)
    {
      if(index<0||index>cards.Count+1)return;Focused=index;if(index<cards.Count)Selected=index;
      for(int i=0;i<cards.Count;i++){cards[i].EnableInClassList("mc-selected",i==Selected);cards[i].EnableInClassList("me-focused",i==Focused);cards[i].Q<Label>("risk-selected").text=i==Selected?"SEÇİLİ":"";}
      go.EnableInClassList("me-focused",index==cards.Count);back.EnableInClassList("me-focused",index==cards.Count+1);
      if(focus){VisualElement target=index<cards.Count?cards[index]:index==cards.Count?go:back;if(target.enabledInHierarchy)target.Focus();if(index<cards.Count)Risks.ScrollTo(target);}
    }
    private void Tab(){if(tabFrame==Time.frameCount)return;tabFrame=Time.frameCount;if(cards.Count==0){Focus(1,true);return;}bool reverse=Keyboard.current!=null&&(Keyboard.current.leftShiftKey.isPressed||Keyboard.current.rightShiftKey.isPressed);Focus((Focused+(reverse?cards.Count+1:1))%(cards.Count+2),true);}
    public void Confirm()
    {
      if(!CoversCurrentScreen||submitting||HandledFrame==Time.frameCount||run!=MutantRuntime.Run||boundId!=MutantRuntime.MarkerId||Selected<0||Selected>=rows.Length)return;
      var m=MutantRuntime.Model;var row=m.FindEvent(boundId);if(row==null||Key(row)!=shown||m.Finished||m.SelectedCar<0||!row.Risks.Any(r=>r.Risk==rows[Selected].Risk)){shown="";notice.text="Etkinlik değişti. Yeniden seç veya Geri dön.";return;}
      submitting=true;HandledFrame=Time.frameCount;go.SetEnabled(false);MutantRuntime.StartRace(row.Id,rows[Selected].Risk);
    }
    public void Back(){if(!CoversCurrentScreen||submitting)return;HandledFrame=Time.frameCount;MutantRuntime.ClosePanel();}
    private void OnDestroy(){if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
  }
}
