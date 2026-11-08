using System;
using System.Collections.Generic;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // B / 5A: yalnız sunum ve seçim odağı; ödül/yuva/koşu işlemleri mevcut Runtime'da.
  public sealed class MutantChoiceView:MonoBehaviour
  {
    public static MutantChoiceView Instance {get;private set;}
    public static bool OwnsChoice=>MutantRuntime.Active&&!MutantRuntime.Starting&&MutantRuntime.Panel=="choice";
    public static bool CoversCurrentScreen=>OwnsChoice&&!GameFlow.Paused&&!SettingsScreen.Open;
    public bool Visible {get;private set;}
    public int Focused {get;private set;}
    public string Replacing {get;private set;}="";
    private VisualElement page,body,grid,accept,back;
    private Label status,heading,copy,notice;
    private readonly List<VisualElement> options=new List<VisualElement>();
    private readonly List<string> ids=new List<string>();
    private string shown="";
    private MutantRun run;
    private bool justOpened;
    private void Start()
    {
      Instance=this;page=new VisualElement{name="b-mutant-choice"};page.AddToClassList("katman");page.AddToClassList("mc-page");
      page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-choice"));
      // Ok/Enter komutlarını Update işler; Toolkit'in ikinci gezinme/onay olayını yut.
      page.RegisterCallback<NavigationMoveEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);
      page.RegisterCallback<NavigationSubmitEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);
      page.RegisterCallback<KeyDownEvent>(e=>{if(e.keyCode==KeyCode.LeftArrow||e.keyCode==KeyCode.RightArrow||e.keyCode==KeyCode.UpArrow||e.keyCode==KeyCode.DownArrow||e.keyCode==KeyCode.Return){e.PreventDefault();e.StopImmediatePropagation();}},TrickleDown.TrickleDown);
      var bg=Resources.Load<Texture2D>("UI/MutantB/background");if(bg)page.style.backgroundImage=bg;
      var bar=new VisualElement();bar.AddToClassList("mc-bar");bar.Add(Ui.Logo());bar.Add(Ui.Text("MUTANT / MUTASYON","mc-badge"));status=Ui.Text("","mc-status");bar.Add(status);page.Add(bar);
      body=new VisualElement();body.AddToClassList("mc-body");page.Add(body);
      heading=Ui.Text("","baslik","mc-heading");copy=Ui.Text("","mc-copy");body.Add(heading);body.Add(copy);
      notice=Ui.Text("","mc-notice");body.Add(notice);
      grid=new VisualElement();grid.AddToClassList("mc-grid");body.Add(grid);
      var actions=new VisualElement();actions.AddToClassList("mc-actions");body.Add(actions);
      back=Ui.Button("TEKLİFLERE DÖN","Esc",Cancel,small:true);back.name="mutant-replace-back";actions.Add(back);
      accept=Ui.Button("SEÇİLİ ÖDÜLÜ AL","Enter",Confirm,true);accept.name="mutant-choice-accept";accept.focusable=true;accept.tabIndex=0;actions.Add(accept);
      page.Add(Ui.Hints(("1|2|3","Seç"),("←|→","Seç"),("Enter","Onayla"),("Esc","Geri / duraklat")));
      UiRoot.Instance.Screen.Add(page);Ui.Show(page,false);
    }
    private void Update()
    {
      bool was=Visible;Visible=CoversCurrentScreen;Ui.Show(page,Visible);
      if(!MutantRuntime.Active){run=null;shown="";Replacing="";return;}
      if(!Visible){if(OwnsChoice&&GameFlow.Paused&&!SettingsScreen.Open&&Time.frameCount!=SettingsScreen.ClosedFrame&&Keyboard.current!=null&&Keyboard.current.escapeKey.wasPressedThisFrame)GameFlow.Pause(false);return;}
      if(run!=MutantRuntime.Run){run=MutantRuntime.Run;Replacing="";shown="";Focused=0;}
      var m=MutantRuntime.Model;string key=Replacing+"|"+string.Join("|",Array.ConvertAll(m.Choices,x=>x.Id));
      if(shown!=key){shown=key;Rebuild();justOpened=true;}
      status.text="BÖLGE "+m.Region+"  ·  BOSS "+m.Timer+"  ·  GÖVDE "+m.Body.ToString("0")+"  ·  "+m.Money.ToString("0")+" PARA";
      if(!was||justOpened){justOpened=false;return;}
      var k=Keyboard.current;if(k==null)return;
      if(k.escapeKey.wasPressedThisFrame&&Time.frameCount!=SettingsScreen.ClosedFrame){Cancel();return;}
      for(int i=0;i<Math.Min(3,ids.Count);i++)if(k[Key.Digit1+i].wasPressedThisFrame){Focus(i);return;}
      if(ids.Count==0)return;
      if(k.rightArrowKey.wasPressedThisFrame||k.downArrowKey.wasPressedThisFrame)Focus((Focused+1)%ids.Count);
      else if(k.leftArrowKey.wasPressedThisFrame||k.upArrowKey.wasPressedThisFrame)Focus((Focused+ids.Count-1)%ids.Count);
      else if(k.enterKey.wasPressedThisFrame)Confirm();
    }
    public void Focus(int index)
    {
      if(index<0||index>=options.Count)return;Focused=index;
      for(int i=0;i<options.Count;i++){options[i].EnableInClassList("mc-selected",i==Focused);options[i].Q<Label>(className:"mc-key").text=(i+1)+(i==Focused?" · SEÇİLİ":"");}
      if(options[index].focusController?.focusedElement!=options[index])options[index].Focus();
    }
    public void Confirm()
    {
      if(!CoversCurrentScreen||Focused>=ids.Count)return;
      string id=ids[Focused];
      if(Replacing!=""){
        if(MutantRuntime.Choose(Replacing,id)){Replacing="";shown="";Focused=0;}
        else notice.text="Seçim uygulanamadı. Mevcut teklif ve skill'ler korundu.";
      }else{
        var model=MutantRuntime.Reward(id,RewardSource.Level);
        if(model.NeedsReplacement){Replacing=id;shown="";Focused=0;return;}
        if(MutantRuntime.Choose(id)){shown="";Focused=0;}
        else notice.text="Bu teklif şu anda alınamıyor. Başka bir teklif seç.";
      }
    }
    public void Cancel()
    {
      if(Replacing!=""){Replacing="";shown="";Focused=0;}
      else GameFlow.Pause(true);
    }
    private void Rebuild()
    {
      grid.Clear();options.Clear();ids.Clear();var m=MutantRuntime.Model;bool replace=Replacing!="";
      heading.text=replace?"Yerine bırakılacak skill'i seç.":"Birini seç.";
      copy.text=replace?"Gelen: "+MutantRuntime.Reward(Replacing,RewardSource.Level).Name+". Bırakılan skill, seviyesi, evrimi ve eklentileriyle gider.":"SEVİYE "+m.Level+" / YETENEK SEÇ  ·  Pasifler yuva tüketmez. Seçim sırasında boss süresi durur.";
      notice.text="";Ui.Show(back,replace);accept.Q<Label>(className:"yazi").text=replace?"SKILL'İ DEĞİŞTİR":"SEÇİLİ ÖDÜLÜ AL";
      int count=replace?m.OwnedSkills.Length:m.Choices.Length;
      for(int i=0;i<count;i++){
        int at=i;string id=replace?m.OwnedSkills[i].Id:m.Choices[i].Id;VisualElement card;
        if(replace){card=new VisualElement();card.AddToClassList("mc-replacement");card.Add(Ui.Text("MEVCUT SKILL","mc-copy"));card.Add(Ui.Text(m.OwnedSkills[i].Name,"mc-skill-name"));card.Add(Ui.Text("Bu skill ve bütün geliştirmeleri bırakılır.","mc-copy"));}
        else card=new RewardCard(MutantRuntime.Reward(id,RewardSource.Level),true);
        card.name="mutant-choice-option-"+i;card.AddToClassList("mc-card");if(i==count-1)card.AddToClassList("mc-last");card.Insert(0,MutantRewardIcons.Create(replace?"skill/"+id:((RewardCard)card).Model.IconKey));
        var frame=new VisualElement{pickingMode=PickingMode.Ignore};frame.AddToClassList("mc-frame");card.Add(frame);
        card.Add(Ui.Text("","mc-key"));card.focusable=true;card.tabIndex=0;
        card.AddManipulator(new Clickable(()=>Focus(at)));card.RegisterCallback<FocusInEvent>(e=>{if(Focused!=at)Focus(at);});
        options.Add(card);ids.Add(id);grid.Add(card);
      }
      accept.SetEnabled(count>0);if(count>0)Focus(Math.Min(Focused,count-1));
      else notice.text="Bekleyen teklif bulunamadı. Esc ile duraklatma menüsüne dönebilirsin.";
    }
    private void OnDestroy(){if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
  }
}
