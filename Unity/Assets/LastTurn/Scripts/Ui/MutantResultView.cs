using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // B / 7A: ödüller bitişte uygulanmıştır; burada yalnız güncel model çizilir ve Devam gönderilir.
  public sealed class MutantResultView:MonoBehaviour
  {
    public static MutantResultView Instance {get;private set;}
    public static bool CoversCurrentScreen=>MutantRuntime.Active&&!MutantRuntime.Starting&&MutantRuntime.Panel=="result"&&!GameFlow.Paused&&!SettingsScreen.Open;
    public bool Visible {get;private set;}
    private VisualElement page,go;
    private Label status,title,note,money,xp,level,body,timer,region;
    private void Start()
    {
      Instance=this;page=new VisualElement{name="b-mutant-result"};page.AddToClassList("katman");page.AddToClassList("mc-page");page.AddToClassList("mr-page");
      page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-choice"));page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-result"));page.style.backgroundImage=Resources.Load<Texture2D>("UI/MutantB/background");
      page.RegisterCallback<NavigationSubmitEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);
      page.RegisterCallback<KeyDownEvent>(e=>{if(e.keyCode==KeyCode.Tab){go.Focus();e.PreventDefault();e.StopImmediatePropagation();}else if(e.keyCode==KeyCode.Return||e.keyCode==KeyCode.KeypadEnter){e.PreventDefault();e.StopImmediatePropagation();}},TrickleDown.TrickleDown);
      var bar=new VisualElement();bar.AddToClassList("mc-bar");bar.Add(Ui.Logo());bar.Add(Ui.Text("MUTANT / SONUÇ","mc-badge"));status=Ui.Text("","mc-status");bar.Add(status);page.Add(bar);
      var content=new VisualElement();content.AddToClassList("mr-body");page.Add(content);
      var left=new VisualElement();left.AddToClassList("mr-left");content.Add(left);left.Add(Ui.Text("YARIŞ SONUCU","mr-kicker"));
      title=Ui.Text("","baslik","mr-title");title.name="mutant-result-title";left.Add(title);
      left.Add(Ui.Text("Koşu kaynaklarının güncel durumu.","mr-copy"));left.Add(Ui.Text("Etkinlik tamamlandı. Koşuna devam et.","mr-copy"));
      note=Ui.Text("","mr-note");note.name="mutant-result-note";left.Add(note);
      var right=new VisualElement();right.AddToClassList("mr-panel");content.Add(right);
      right.Add(Ui.Text("KOŞU DURUMU","mr-kicker"));money=Row(right,"Koşu parası","money");xp=Row(right,"XP","xp");level=Row(right,"Seviye","level");body=Row(right,"Gövde","body");timer=Row(right,"Boss'a kalan","timer");region=Row(right,"Bölge","region");
      var actions=new VisualElement();actions.AddToClassList("mc-actions");actions.AddToClassList("mr-actions");right.Add(actions);
      go=Ui.Button("DEVAM","Enter",Continue,true);go.name="mutant-result-continue";go.focusable=true;go.tabIndex=0;actions.Add(go);
      var frame=new VisualElement{pickingMode=PickingMode.Ignore};frame.AddToClassList("mc-frame");right.Add(frame);
      page.Add(Ui.Hints(("Enter","Devam"),("Esc","Duraklat")));UiRoot.Instance.Screen.Add(page);Ui.Show(page,false);
    }
    private static Label Row(VisualElement parent,string label,string id)
    {
      var row=new VisualElement();row.AddToClassList("mr-row");row.Add(Ui.Text(label,"mr-label"));var value=Ui.Text("","mr-value");value.name="mutant-result-"+id;row.Add(value);parent.Add(row);return value;
    }
    private void Update()
    {
      bool was=Visible;Visible=CoversCurrentScreen;Ui.Show(page,Visible);if(!Visible)return;
      var m=MutantRuntime.Model;var passed=MutantRuntime.ResultPassed;
      status.text="BÖLGE "+m.Region+"  ·  BOSS "+m.Timer+"  ·  "+m.Money.ToString("0")+" PARA";
      title.text=passed==true?"Hedef geçildi.":passed==false?"Hedef kaçırıldı.":"Yarış sonucu";title.EnableInClassList("mr-failed",passed==false);note.text=MutantRuntime.Message;
      money.text=m.Money.ToString("N0");xp.text=m.Xp.ToString("0")+" / "+m.NextLevelXp.ToString("0");level.text=m.Level.ToString();body.text="%"+m.Body.ToString("0");timer.text=m.Timer;region.text=m.Region.ToString();
      if(!was){go.Focus();return;}var k=Keyboard.current;if(k==null)return;
      if(k.tabKey.wasPressedThisFrame)go.Focus();
      else if(k.enterKey.wasPressedThisFrame||k.numpadEnterKey.wasPressedThisFrame)Continue();
    }
    public void Continue(){if(CoversCurrentScreen)MutantRuntime.Continue();}
    private void OnDestroy(){if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
  }
}
