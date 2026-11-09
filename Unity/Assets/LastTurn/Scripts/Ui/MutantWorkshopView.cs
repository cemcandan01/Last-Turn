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
  // B /3A stok vitrini. İşlemler mevcut Runtime yollarına, fiyat/tamir önizlemesi saf modele aittir.
  public sealed class MutantWorkshopView:MonoBehaviour
  {
    public static MutantWorkshopView Instance {get;private set;}
    public static bool OwnsWorkshop=>MutantRuntime.Active&&!MutantRuntime.Starting&&MutantRuntime.Panel=="shop";
    public static bool CoversCurrentScreen=>OwnsWorkshop&&!GameFlow.Paused&&!SettingsScreen.Open;
    public static int HandledFrame {get;private set;}=-1;
    public bool Visible {get;private set;}
    public string FocusedKey {get;private set;}="";
    public string StockStamp {get;private set;}="";
    public ScrollView Stock {get;private set;}
    private VisualElement page,repair,refresh,back;private Label status,money,body,power,fullCost,preview,notice;
    private readonly List<(string Key,VisualElement Element)> nodes=new List<(string,VisualElement)>();
    private MutantRun run;private string shown="";private long revision;private int tabFrame=-1,actionFrame=-1;
    private static string N(double n)=>n.ToString("0.##",CultureInfo.InvariantCulture);
    private static string Key(MutantMenuModel m)=>m.Money.ToString("R",CultureInfo.InvariantCulture)+"|"+m.Body.ToString("R",CultureInfo.InvariantCulture)+"|"+m.RepairCost+"|"+m.RepairPreview.Cost+"|"+m.CanRefresh+"|"+string.Join("|",m.Stock.Select(s=>s.Id+":"+s.Name+":"+s.Category+":"+s.Description+":"+s.Price+":"+s.CanBuy));
    private void Start()
    {
      Instance=this;HandledFrame=-1;page=new VisualElement{name="b-mutant-workshop"};page.AddToClassList("katman");page.AddToClassList("mc-page");page.AddToClassList("ms-page");
      page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-choice"));page.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-workshop"));page.style.backgroundImage=Resources.Load<Texture2D>("UI/MutantB/background");
      page.RegisterCallback<NavigationMoveEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);page.RegisterCallback<NavigationSubmitEvent>(e=>{e.PreventDefault();e.StopImmediatePropagation();},TrickleDown.TrickleDown);
      page.RegisterCallback<KeyDownEvent>(e=>{if(e.keyCode==KeyCode.Tab){Tab();e.PreventDefault();e.StopImmediatePropagation();}else if(e.keyCode==KeyCode.LeftArrow||e.keyCode==KeyCode.RightArrow||e.keyCode==KeyCode.UpArrow||e.keyCode==KeyCode.DownArrow||e.keyCode==KeyCode.Return||e.keyCode==KeyCode.KeypadEnter||e.keyCode==KeyCode.PageUp||e.keyCode==KeyCode.PageDown){e.PreventDefault();e.StopImmediatePropagation();}},TrickleDown.TrickleDown);
      var bar=new VisualElement();bar.AddToClassList("mc-bar");bar.Add(Ui.Logo());bar.Add(Ui.Text("MUTANT / ATÖLYE","mc-badge"));status=Ui.Text("","mc-status");bar.Add(status);page.Add(bar);
      var layout=new VisualElement();layout.AddToClassList("ms-body");page.Add(layout);var left=new VisualElement();left.AddToClassList("ms-left");layout.Add(left);
      left.Add(Ui.Text("KOŞU KAYNAKLARI","ms-kicker"));left.Add(Ui.Text("ATÖLYE","baslik","ms-title"));money=Text(left,"workshop-money","ms-money");body=Text(left,"workshop-body","ms-copy");power=Text(left,"workshop-power","ms-copy");fullCost=Text(left,"workshop-full-cost","ms-small");preview=Text(left,"workshop-repair-preview","ms-copy");
      var actions=new VisualElement();actions.AddToClassList("ms-actions");left.Add(actions);
      repair=ActionButton(actions,"workshop-repair","TAMİR",()=>Repair(),"repair",true);refresh=ActionButton(actions,"workshop-refresh","STOĞU YENİLE",()=>Refresh(),"refresh");back=ActionButton(actions,"workshop-back","GERİ",Back,"back");notice=Text(left,"workshop-notice","ms-notice");
      Stock=new ScrollView(ScrollViewMode.Vertical){name="workshop-stock",horizontalScrollerVisibility=ScrollerVisibility.Hidden};Stock.AddToClassList("ms-stock");layout.Add(Stock);
      page.Add(Ui.Hints(("↑|↓|←|→","Odak"),("Tab","Sonraki"),("Enter","İşlem"),("PgUp|PgDn","Stok"),("Esc","Duraklat")));UiRoot.Instance.Screen.Add(page);Ui.Show(page,false);
    }
    private static Label Text(VisualElement p,string name,string css){var l=Ui.Text("",css);l.name=name;p.Add(l);return l;}
    private VisualElement ActionButton(VisualElement parent,string name,string text,Action action,string key,bool primary=false){var b=Ui.Button(text,"",action,primary);b.name=name;b.focusable=true;b.tabIndex=0;b.RegisterCallback<FocusInEvent>(e=>Focus(key,false));parent.Add(b);return b;}
    private void Update()
    {
      bool was=Visible;Visible=CoversCurrentScreen;Ui.Show(page,Visible);if(!OwnsWorkshop){run=null;shown="";return;}if(!Visible)return;
      bool identity=run!=MutantRuntime.Run;if(identity){run=MutantRuntime.Run;revision=0;FocusedKey="";shown="";notice.text="";}
      var m=MutantRuntime.Model;string key=Key(m);bool changed=shown!=key;if(changed){shown=key;Rebuild(m);}
      status.text="BÖLGE "+m.Region+" · BOSS "+m.Timer+" · "+N(m.Money)+" PARA";
      if(!was||changed){Focus(FocusedKey,true);return;}var k=Keyboard.current;if(k==null)return;
      // Esc yalnız mevcut MutantScreen pause/devam yolunda işlenir.
      if(k.tabKey.wasPressedThisFrame)Tab();else if(k.downArrowKey.wasPressedThisFrame||k.rightArrowKey.wasPressedThisFrame)Move(1);else if(k.upArrowKey.wasPressedThisFrame||k.leftArrowKey.wasPressedThisFrame)Move(-1);
      else if(k.pageDownKey.wasPressedThisFrame)Stock.scrollOffset+=new Vector2(0,160);else if(k.pageUpKey.wasPressedThisFrame)Stock.scrollOffset-=new Vector2(0,160);else if(k.enterKey.wasPressedThisFrame||k.numpadEnterKey.wasPressedThisFrame)Activate();
    }
    private void Rebuild(MutantMenuModel m)
    {
      int old=nodes.FindIndex(n=>n.Key==FocusedKey);StockStamp=revision+"|"+shown;Stock.Clear();nodes.Clear();money.text=N(m.Money)+" PARA";body.text="Gövde "+N(m.Body)+" / 100";power.text="Güç kaybı %"+N(m.PowerLossPercent);
      fullCost.text="Tam tamir bedeli: "+N(m.RepairCost)+" para";var p=m.RepairPreview;preview.text=p.CanRepair?"Şimdi: +"+N(p.Points)+" gövde · "+N(p.Cost)+" para"+(p.Partial?" (kısmi tamir)":" (tam tamir)"):m.ShowRepair?"Bir gövde puanına yetecek para yok.":"Gövde tam.";
      repair.SetEnabled(m.CanRepair);refresh.SetEnabled(m.CanRefresh);repair.Q<Label>(className:"yazi").text="TAMİR · "+N(p.Cost)+" PARA";refresh.Q<Label>(className:"yazi").text="STOĞU YENİLE · "+N(m.RefreshCost)+" PARA";
      if(m.CanRepair)nodes.Add(("repair",repair));if(m.CanRefresh)nodes.Add(("refresh",refresh));
      foreach(var r in m.Stock){string id=r.Id,token=StockStamp;var card=new VisualElement{name="workshop-part-"+id,focusable=true,tabIndex=0};card.AddToClassList("ms-card");
        var icon=MutantRewardIcons.Create(r.IconKey);icon.AddToClassList("ms-icon");card.Add(icon);var content=new VisualElement();content.AddToClassList("ms-part-content");card.Add(content);
        Text(content,"part-category","ms-kicker").text=r.Category;Text(content,"part-name","ms-part-name").text=r.Name;Text(content,"part-description","ms-description").text=r.Description;
        var row=new VisualElement();row.AddToClassList("ms-price-row");content.Add(row);Text(row,"part-price","ms-price").text=N(r.Price)+" PARA";
        var buy=Ui.Button(r.CanBuy?"SATIN AL":r.InsufficientMoney?"PARA YETERSİZ":"ALINAMIYOR","",()=>Purchase(id,token),true,small:true);buy.name="workshop-buy-"+id;buy.SetEnabled(r.CanBuy);row.Add(buy);
        var frame=new VisualElement{pickingMode=PickingMode.Ignore};frame.AddToClassList("mc-frame");card.Add(frame);card.RegisterCallback<FocusInEvent>(e=>Focus("part/"+id,false));card.RegisterCallback<PointerDownEvent>(e=>Focus("part/"+id,true,false),TrickleDown.TrickleDown);
        nodes.Add(("part/"+id,card));Stock.Add(card);
      }
      if(m.Stock.Length==0)Stock.Add(Ui.Text("Stok boş. Kaynakların uygunsa stoğu yenileyebilirsin.","ms-copy"));nodes.Add(("back",back));
      if(!nodes.Any(n=>n.Key==FocusedKey))FocusedKey=nodes[Math.Max(0,Math.Min(old,nodes.Count-1))].Key;
    }
    public void Focus(string key)=>Focus(key,true);
    private void Focus(string key,bool apply,bool scroll=true){int i=nodes.FindIndex(n=>n.Key==key);if(i<0)return;FocusedKey=key;foreach(var n in nodes){n.Element.EnableInClassList("ms-focused",n.Key==key);n.Element.EnableInClassList("mc-selected",n.Key==key);}if(apply){nodes[i].Element.Focus();if(scroll&&key.StartsWith("part/",StringComparison.Ordinal))Stock.ScrollTo(nodes[i].Element);}}
    private void Move(int delta){if(nodes.Count==0)return;int i=nodes.FindIndex(n=>n.Key==FocusedKey);Focus(nodes[(i+delta+nodes.Count)%nodes.Count].Key,true);}
    private void Tab(){if(tabFrame==Time.frameCount)return;tabFrame=Time.frameCount;Move(Keyboard.current!=null&&(Keyboard.current.leftShiftKey.isPressed||Keyboard.current.rightShiftKey.isPressed)?-1:1);}
    private void Activate(){if(FocusedKey=="repair")Repair();else if(FocusedKey=="refresh")Refresh();else if(FocusedKey=="back")Back();else if(FocusedKey.StartsWith("part/",StringComparison.Ordinal))Purchase(FocusedKey.Substring(5),StockStamp);}
    private bool Gate(string token){if(!CoversCurrentScreen||actionFrame==Time.frameCount||run!=MutantRuntime.Run)return false;if(token!=StockStamp||Key(MutantRuntime.Model)!=shown){shown="";notice.text="Stok veya kaynaklar değişti. Güncel vitrinden yeniden seç.";return false;}actionFrame=Time.frameCount;HandledFrame=Time.frameCount;return true;}
    public void Purchase(string id,string token){if(!Gate(token))return;var row=MutantRuntime.Model.Stock.FirstOrDefault(s=>s.Id==id);if(row==null||!row.CanBuy){notice.text="Bu parça şu anda alınamıyor; para ve stok korundu.";return;}if(MutantRuntime.Buy(id)){revision++;shown="";notice.text="Parça satın alındı. Mevcut araca uygulandı.";}else{shown="";notice.text="Satın alma uygulanamadı. Güncel stoğu kontrol et.";}}
    public void Repair(){if(!Gate(StockStamp))return;if(MutantRuntime.Repair()){revision++;shown="";notice.text="Tamir uygulandı; gövde ve para güncellendi.";}else notice.text="Tamir yapılamıyor; kaynaklar korundu.";}
    public void Refresh(){if(!Gate(StockStamp))return;if(MutantRuntime.RefreshStock()){revision++;shown="";notice.text="Stok yenilendi; bedel koşu parasından ödendi.";}else notice.text="Stok yenilemek için para yetersiz.";}
    public void Back(){if(!CoversCurrentScreen||actionFrame==Time.frameCount)return;HandledFrame=Time.frameCount;MutantRuntime.ClosePanel();}
    private void OnDestroy(){if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
  }
}
