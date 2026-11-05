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
  // F §3: satın alma kuralları mevcut tipli model/komutta; filtre ve onay yalnız sunum durumudur.
  public sealed class StoreView:MonoBehaviour
  {
    public static StoreView Instance {get;private set;}
    public static bool CoversCurrentScreen=>Instance&&Instance.Wanted();
    public bool Visible {get;private set;}
    public int ViewedCar {get;private set;}=-1;
    public int VisibleCarCount=>rows.Length;
    public bool Confirming=>confirm;
    public GarageCarRow Offer {get;private set;}
    private static readonly (string Key,string Name)[] Filters={ ("","TÜMÜ"),("gp","PİST"),("rx","RALLİKROS"),("rl","RALLİ"),("dp","DRİFT"),("dg","DRAG") };
    private VisualElement page,content,carTab,partsTab;private Label money,message;
    private GarageScreen legacy;private GarageState seen;private GarageVehiclePreview preview;
    private GarageCarRow[] rows=Array.Empty<GarageCarRow>();private string filter="";private bool confirm;private double until;
    private bool Wanted()
    {
      if(!legacy)legacy=FindFirstObjectByType<GarageScreen>();
      return page!=null&&legacy&&SceneManager.GetActiveScene().name=="Garage"&&!GameFlow.Home&&!GameFlow.Profile&&!SettingsScreen.Open&&!MutantRuntime.Active&&legacy.SelectedTab==0&&legacy.StoreOpen;
    }
    private void Start()
    {
      Instance=this;page=new VisualElement{name="f-store"};page.AddToClassList("katman");page.Add(Ui.Shade(.9f,.95f));
      var bar=new VisualElement();bar.AddToClassList("ustbar");bar.Add(Ui.Logo());bar.Add(Ui.Key("Q"));bar.Add(Ui.Tab("KARİYER",GameFlow.RaceMenu));bar.Add(Ui.Tab("GARAJ",OpenGarage));
      var tab=Ui.Tab("MAĞAZA",()=>{});tab.AddToClassList("sec");bar.Add(tab);bar.Add(Ui.Key("E"));money=Ui.Text("","g-money");bar.Add(money);page.Add(bar);
      content=new VisualElement();content.AddToClassList("s-content");page.Add(content);
      message=Ui.Text("","g-message");page.Add(message);var back=Ui.Button("GERİ","Esc",Back,small:true);Ui.Absolute(back,left:58,bottom:22);page.Add(back);
      page.Add(Ui.Hints(("←|→","Araç"),("Enter","Satın al / Garaj"),("Tab","Parçalar"),("Q|E","Sekme")));
      UiRoot.Instance.Screen.Add(page);preview=gameObject.AddComponent<GarageVehiclePreview>();Ui.Show(page,false);
    }
    private void Update()
    {
      if(page==null)return;bool active=Wanted(),changed=active!=Visible;Visible=active;Ui.Show(page,active);preview.SetVisible(active);
      if(!active){confirm=false;return;}
      if(changed){ViewedCar=legacy.ViewedCar;filter="";}
      if(changed||seen!=GarageSession.State)Rebuild();
      if(confirm&&Time.unscaledTimeAsDouble>until){confirm=false;Rebuild();}
      money.text="SEVİYE "+seen.Level+"   •   "+seen.Balance.ToString("N0")+" para";
      message.text=confirm?"Satın almak için tekrar onayla. Esc: vazgeç.":GarageSession.Message;
      if(changed)return;
      var k=Keyboard.current;if(k==null)return;
      if(k.escapeKey.wasPressedThisFrame){Back();return;}
      if(k.qKey.wasPressedThisFrame){OpenGarage();return;}if(k.eKey.wasPressedThisFrame){GameFlow.RaceMenu();return;}
      if(k.tabKey.wasPressedThisFrame){OpenParts();return;}
      int i=Array.FindIndex(rows,r=>r.Index==ViewedCar);
      if(k.leftArrowKey.wasPressedThisFrame&&i>0)ViewCar(rows[i-1].Index);
      else if(k.rightArrowKey.wasPressedThisFrame&&i+1<rows.Length)ViewCar(rows[i+1].Index);
      else if(k.enterKey.wasPressedThisFrame)Activate();
    }
    public void SetFilter(string key){filter=Filters.Any(f=>f.Key==key)?key:"";confirm=false;Rebuild();}
    public void ViewCar(int index){ViewedCar=index;confirm=false;legacy.ViewCar(index);Rebuild();}
    public void Activate()
    {
      if(Offer==null||GarageSession.Store.ReadOnly)return;
      if(Offer.Owned){OpenGarage();return;}
      if(Offer.Block!="")return;
      if(!confirm||Time.unscaledTimeAsDouble>until){confirm=true;until=Time.unscaledTimeAsDouble+3;Rebuild();return;}
      confirm=false;GarageSession.Execute(Offer.Primary);GameAudio.Click();Rebuild();
    }
    public void OpenGarage()
    {
      confirm=false;int car=Offer!=null&&Offer.Owned?ViewedCar:GarageSession.State.SelectedCar;
      GameFlow.Browse(0);legacy.SelectShop(false);legacy.ViewCar(car);
    }
    public void OpenParts(){OpenGarage();legacy.SelectTab(1);}
    private void Back(){if(confirm){confirm=false;Rebuild();}else GameFlow.Back();}
    private static VisualElement Box(string cls){var e=new VisualElement();e.AddToClassList(cls);return e;}
    private void Rebuild()
    {
      seen=GarageSession.State;rows=GarageViewModel.Cars(seen).Where(c=>filter==""||c.Type==filter).ToArray();
      if(!rows.Any(r=>r.Index==ViewedCar))ViewedCar=rows.Length>0?rows[0].Index:-1;
      Offer=rows.FirstOrDefault(r=>r.Index==ViewedCar);content.Clear();
      var left=Box("s-featured");content.Add(left);
      if(Offer!=null)
      {
        var d=GarageViewModel.Detail(seen,ViewedCar);left.Add(Ui.Section("ÖNE ÇIKAN  /  "+Filters.FirstOrDefault(f=>f.Key==Offer.Type).Name));left.Add(Ui.Text(Ui.Upper(d.Name),"baslik","g-name"));
        left.Add(Ui.Text(d.Class+d.Score.ToString("0")+"  •  "+d.Power.ToString("0")+" HP  •  "+d.Mass.ToString("0")+" KG","g-class"));
        var image=Box("s-preview");image.Add(preview.Image);left.Add(image);preview.Build(d,ViewedCar);
        var info=Box("g-panel");foreach(var stat in d.Stats)info.Add(Ui.Text(stat.Label+"   "+stat.Current.ToString("0.00"),"s-stat"));
        info.Add(Ui.Text(Offer.Description,"g-copy"));info.Add(Ui.Text(Offer.Price.ToString("N0")+" para"+(Offer.MissingMoney>0?"  •  "+Offer.MissingMoney.ToString("N0")+" eksik":""),"g-price"));
        info.Add(Ui.Text(Offer.Availability,"g-copy"));var buy=Ui.Button(Offer.Owned?"GARAJDA GÖR":confirm?"SATIN ALMAYI ONAYLA":"SATIN AL","Enter",Activate,true);buy.name="store-buy";buy.SetEnabled(!GarageSession.Store.ReadOnly&&(Offer.Owned||Offer.Block==""));info.Add(buy);left.Add(info);
      }
      var right=Box("s-catalog");content.Add(right);var tabs=Box("s-tabs");
      carTab=Ui.Tab("ARAÇLAR",()=>{});carTab.AddToClassList("sec");tabs.Add(carTab);partsTab=Ui.Tab("PARÇALAR",OpenParts);tabs.Add(partsTab);right.Add(tabs);
      var filters=Box("s-filters");foreach(var f in Filters){var b=Ui.Tab(f.Name,()=>SetFilter(f.Key));b.name="store-filter-"+f.Key;b.EnableInClassList("sec",filter==f.Key);filters.Add(b);}right.Add(filters);
      var scroll=new ScrollView(ScrollViewMode.Vertical);scroll.AddToClassList("s-scroll");right.Add(scroll);var grid=Box("s-grid");scroll.Add(grid);
      foreach(var car in rows)
      {
        var card=Box("kart");card.name="store-car-"+car.Index;card.AddToClassList("s-car");card.EnableInClassList("sec",car.Index==ViewedCar);card.EnableInClassList("kilit",!car.Owned&&car.Block!="");
        var detail=GarageViewModel.Detail(seen,car.Index);card.Add(Ui.Text(car.Owned?"SAHİPSİN":car.Block=="seviye"?"SEVİYE "+car.RequiredLevel.ToString("0"):Filters.FirstOrDefault(f=>f.Key==car.Type).Name,"ust"));
        card.Add(Ui.Text(car.Name,"ad"));card.Add(Ui.Text(detail.Class+detail.Score.ToString("0")+"  •  "+car.Price.ToString("N0"),"g-price"));
        int id=car.Index;card.AddManipulator(new Clickable(()=>ViewCar(id)));grid.Add(card);if(id==ViewedCar)scroll.schedule.Execute(()=>scroll.ScrollTo(card));
      }
      if(rows.Length==0)grid.Add(Ui.Text("Bu türde araç yok.","g-copy"));
    }
    private void OnDestroy(){if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
  }
}
