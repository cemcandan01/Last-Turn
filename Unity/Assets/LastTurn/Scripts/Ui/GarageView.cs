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
  // F §1–2. Yalnız tipli görünüm modelleri ve mevcut garaj komutları; kurallar Core'da kalır.
  public sealed class GarageView:MonoBehaviour
  {
    public static GarageView Instance {get;private set;}
    public bool Visible {get;private set;}
    public bool Modifying {get;private set;}
    public GarageCarDetail Detail {get;private set;}
    public int ViewedCar {get;private set;}=-1;
    public string PreviewPart=>part;
    public static bool CoversCurrentScreen=>Instance&&Instance.Wanted();
    private VisualElement page,content;private Label money,message;private GarageScreen legacy;private GarageState seen;
    private int category,partIndex;private string part="",confirm="";private double confirmUntil;
    private GaragePartRow[] parts=Array.Empty<GaragePartRow>();private GarageCarRow[] cars=Array.Empty<GarageCarRow>();
    private GarageVehiclePreview preview;
    private bool Wanted()
    {
      if(!legacy)legacy=FindFirstObjectByType<GarageScreen>();
      return page!=null&&SceneManager.GetActiveScene().name=="Garage"&&legacy&&!GameFlow.Home&&!GameFlow.Profile&&!SettingsScreen.Open&&!MutantRuntime.Active&&
        (legacy.SelectedTab==1||legacy.SelectedTab==0&&!legacy.StoreOpen);
    }
    private void Start()
    {
      Instance=this;page=new VisualElement();page.AddToClassList("katman");page.name="f-garage";page.Add(Ui.Shade());
      var bar=new VisualElement();bar.AddToClassList("ustbar");bar.Add(Ui.Logo());
      bar.Add(Ui.Key("Q"));bar.Add(Ui.Tab("KARİYER",GameFlow.RaceMenu));var tab=Ui.Tab("GARAJ",()=>Open(false));tab.AddToClassList("sec");bar.Add(tab);
      bar.Add(Ui.Tab("MAĞAZA",GameFlow.OpenStore));bar.Add(Ui.Key("E"));money=Ui.Text("","g-money");bar.Add(money);page.Add(bar);
      content=new VisualElement();content.AddToClassList("g-content");page.Add(content);
      message=Ui.Text("","g-message");page.Add(message);
      var back=Ui.Button("GERİ","Esc",Back,small:true);Ui.Absolute(back,left:58,bottom:22);page.Add(back);
      UiRoot.Instance.Screen.Add(page);preview=gameObject.AddComponent<GarageVehiclePreview>();Ui.Show(page,false);
    }
    private void Update()
    {
      if(page==null)return;bool active=Wanted();bool changed=active!=Visible;Visible=active;Ui.Show(page,active);preview.SetVisible(active&&!Modifying);
      if(!active){confirm="";return;}
      bool mods=legacy.SelectedTab==1;
      if(changed||seen!=GarageSession.State||ViewedCar!=legacy.ViewedCar||mods!=Modifying)
      {ViewedCar=legacy.ViewedCar;Modifying=mods;seen=GarageSession.State;Rebuild();}
      if(confirm!=""&&Time.unscaledTimeAsDouble>confirmUntil){confirm="";Rebuild();}
      money.text="SEVİYE "+seen.Level+"   •   "+seen.Balance.ToString("N0")+" para";
      message.text=confirm!=""?"Satın almak için aynı işlemi tekrar onayla. Esc: vazgeç.":GarageSession.Message;
      var audioLabel=page.Q("garage-listen-engine")?.Q<Label>(className:"yazi");if(audioLabel!=null)audioLabel.text=SourceEngineAudio.ListeningKey==Detail.ModelKey?"DİNLENİYOR…":"MOTORU DİNLE";
      // Açan tuşu aynı karede ikinci kez işleme (Yarış E → Garaj E → Mağaza).
      if(changed)return;
      var k=Keyboard.current;if(k==null)return;
      if(k.escapeKey.wasPressedThisFrame){if(confirm!=""){confirm="";Rebuild();}else Back();return;}
      if(k.qKey.wasPressedThisFrame){GameFlow.RaceMenu();return;}if(k.eKey.wasPressedThisFrame){GameFlow.OpenStore();return;}
      if(Modifying)
      {
        int count=GarageViewModel.Categories(GarageSession.Catalog).Length;
        if(k.upArrowKey.wasPressedThisFrame)SelectCategory((category+count-1)%count);
        else if(k.downArrowKey.wasPressedThisFrame)SelectCategory((category+1)%count);
        else if(k.leftArrowKey.wasPressedThisFrame)SelectPart(Math.Max(0,partIndex-1));
        else if(k.rightArrowKey.wasPressedThisFrame)SelectPart(Math.Min(parts.Length-1,partIndex+1));
        else if(k.enterKey.wasPressedThisFrame)ActivatePart();
        else if(k.xKey.wasPressedThisFrame)Execute(GarageCommand.UnequipCategory(ViewedCar,GarageViewModel.Categories(GarageSession.Catalog)[category].Id));
      }
      else
      {
        var owned=cars.Where(c=>c.Owned).ToArray();int i=Array.FindIndex(owned,c=>c.Index==ViewedCar);
        if(k.leftArrowKey.wasPressedThisFrame&&i>0)ViewCar(owned[i-1].Index);
        else if(k.rightArrowKey.wasPressedThisFrame&&i+1<owned.Length)ViewCar(owned[i+1].Index);
        else if(k.mKey.wasPressedThisFrame)Open(true);
        else if(k.lKey.wasPressedThisFrame)SourceEngineAudio.Listen(Detail.ModelKey);
        else if(k.enterKey.wasPressedThisFrame)SelectOrRace();
      }
    }
    public void Open(bool mods){confirm="";legacy.SelectShop(false);legacy.ViewCar(ViewedCar<0?GarageSession.State.SelectedCar:ViewedCar);legacy.SelectTab(mods?1:0);}
    public void ViewCar(int car){confirm="";part="";legacy.ViewCar(car);ViewedCar=car;seen=GarageSession.State;Rebuild();}
    public void SelectCategory(int index){category=index;partIndex=0;part="";confirm="";Rebuild();}
    public void SelectPart(int index){if(index<0||index>=parts.Length)return;partIndex=index;part=parts[index].Id;confirm="";Rebuild();}
    public void ActivatePart(){if(parts.Length>0&&parts[partIndex].Enabled)Execute(parts[partIndex].Command);}
    public void Execute(GarageCommand command)
    {
      if(GarageSession.Store.ReadOnly)return;
      string key=command.Kind+":"+command.Car+":"+command.Id;
      if(command.SpendsMoney&&(confirm!=key||Time.unscaledTimeAsDouble>confirmUntil)){confirm=key;confirmUntil=Time.unscaledTimeAsDouble+3;Rebuild();return;}
      confirm="";GarageSession.Execute(command);GameAudio.Click();seen=GarageSession.State;Rebuild();
    }
    private void SelectOrRace(){var c=cars.First(x=>x.Index==ViewedCar);if(!c.Selected)Execute(c.Primary);else GameFlow.FinishGarageSelection();}
    private void Back(){confirm="";if(Modifying){legacy.SelectTab(0);part="";}else GameFlow.Back();}
    private static VisualElement Box(string cls="g-panel"){var e=new VisualElement();e.AddToClassList(cls);return e;}
    private static void AddButton(VisualElement parent,string label,string key,Action action,bool enabled=true,bool primary=false)
    {var b=Ui.Button(label,key,action,primary);b.SetEnabled(enabled);parent.Add(b);}
    private void Rebuild()
    {
      if(ViewedCar<0||!legacy)return;content.Clear();cars=GarageViewModel.Cars(GarageSession.State);
      var cats=GarageViewModel.Categories(GarageSession.Catalog);category=Mathf.Clamp(category,0,cats.Length-1);
      parts=GarageViewModel.Parts(GarageSession.State,ViewedCar,cats[category].Id);
      if(Modifying){partIndex=Mathf.Clamp(partIndex,0,parts.Length-1);if(part==""||!parts.Any(p=>p.Id==part))part=parts[partIndex].Id;else partIndex=Array.FindIndex(parts,p=>p.Id==part);}
      var selected=parts.FirstOrDefault(p=>p.Id==part);
      Detail=GarageViewModel.Detail(GarageSession.State,ViewedCar,Modifying?part:"",Modifying&&selected!=null&&selected.Equipped);
      if(Modifying)BuildMods(cats);else BuildGarage();
    }
    private void BuildGarage()
    {
      var left=Box();left.AddToClassList("g-left");left.Add(Ui.Section("SAHİP OLUNAN ARAÇ"));left.Add(Ui.Text(Ui.Upper(Detail.Name),"baslik","g-name"));
      left.Add(Ui.Text(Detail.Class+Detail.Score.ToString("0"),"g-class"));left.Add(Ui.Text(Detail.Description,"g-copy"));
      left.Add(Ui.Section("KURULUM"));left.Add(Ui.Text("Lastik  •  "+Detail.TireName,"g-copy"));left.Add(Ui.Text("Takılı parça  •  "+Detail.Parts.Length+" / 12","g-copy"));
      left.Add(Ui.Text(Detail.PartNames.Length==0?"Stok kurulum":string.Join(" · ",Detail.PartNames),"g-copy"));content.Add(left);
      var listen=Ui.Button("MOTORU DİNLE","L",()=>SourceEngineAudio.Listen(Detail.ModelKey),small:true);listen.name="garage-listen-engine";left.Add(listen);
      var center=new VisualElement();center.AddToClassList("g-preview");center.Add(preview.Image);content.Add(center);preview.Build(Detail,ViewedCar);
      var right=Box();right.AddToClassList("g-right");right.Add(Ui.Section("ÖZELLİKLER"));Stats(right,false);content.Add(right);
      var actions=Box("g-actions");AddButton(actions,"MODİFİYE","M",()=>Open(true));AddButton(actions,cars.First(c=>c.Index==ViewedCar).Selected?"YARIŞ SEÇ":"ARACI SEÇ","Enter",SelectOrRace,!GarageSession.Store.ReadOnly,true);content.Add(actions);
      var row=new ScrollView(ScrollViewMode.Horizontal);row.AddToClassList("g-cars");row.horizontalScrollerVisibility=ScrollerVisibility.Auto;row.verticalScrollerVisibility=ScrollerVisibility.Hidden;
      foreach(var car in cars.Where(c=>c.Owned))
      {var card=Box("kart");card.name="car-"+car.Index;card.AddToClassList("g-car");card.EnableInClassList("sec",car.Index==ViewedCar);card.Add(Ui.Text(car.Selected?"SÜRÜŞ İÇİN SEÇİLİ":"GARAJ","ust"));card.Add(Ui.Text(car.Name,"ad"));int id=car.Index;card.AddManipulator(new Clickable(()=>ViewCar(id)));row.Add(card);if(car.Index==ViewedCar)row.schedule.Execute(()=>row.ScrollTo(card));}
      var store=Box("kart");store.AddToClassList("g-car");store.Add(Ui.Text("DAHA FAZLA ARAÇ","ust"));store.Add(Ui.Text("Mağazaya git","ad"));store.AddManipulator(new Clickable(GameFlow.OpenStore));row.Add(store);content.Add(row);
      var hints=Ui.Hints(("←|→","Araç"),("Fare","Aracı döndür"),("M","Modifiye"),("Q|E","Sekme"));hints.style.bottom=-50;content.Add(hints);
    }
    private void BuildMods((string Id,string Label)[] cats)
    {
      var columns=Box("g-mods");var categories=Vertical();categories.AddToClassList("g-categories");categories.Add(Ui.Section("KATEGORİ"));
      for(int i=0;i<cats.Length;i++){int n=i;var b=Ui.Tab(Ui.Upper(cats[i].Label),()=>SelectCategory(n));b.EnableInClassList("sec",i==category);categories.Add(b);}columns.Add(categories);
      var middle=Vertical();middle.AddToClassList("g-parts");middle.Add(Ui.Section("MODİFİYE  /  "+Ui.Upper(Detail.Name)));
      var packages=Box("g-packages");foreach(var p in GarageViewModel.Packages(GarageSession.State,ViewedCar))AddButton(packages,p.Name+" · "+(p.Owned?"Tak":p.Cost.ToString("N0")),"",()=>Execute(p.Command),p.Enabled&&!GarageSession.Store.ReadOnly);middle.Add(packages);
      middle.Add(Ui.Section(Ui.Upper(cats[category].Label)));
      for(int i=0;i<parts.Length;i++){int n=i;var p=parts[i];var card=Box("kart");card.name="part-"+p.Id;card.AddToClassList("g-part");card.EnableInClassList("sec",p.Id==part);card.Add(Ui.Text(p.Equipped?"TAKILI":p.Owned?"SAHİPSİN":"SATIN ALINABİLİR","ust"));card.Add(Ui.Text(p.Name,"ad"));card.Add(Ui.Text(p.Description,"g-copy"));card.Add(Ui.Text(p.Owned?"Satın alınmış":p.Cost.ToString("N0")+" para","g-price"));card.AddManipulator(new Clickable(()=>SelectPart(n)));middle.Add(card);if(p.Id==part)middle.schedule.Execute(()=>middle.ScrollTo(card));}
      middle.Add(Ui.Text("Sökme para iadesi üretmez; sahiplik ve yatırım kredisi korunur.","g-copy"));
      AddButton(middle,"KATEGORİYİ SÖK","X",()=>Execute(GarageCommand.UnequipCategory(ViewedCar,cats[category].Id)),!GarageSession.Store.ReadOnly);
      AddButton(middle,"STOK KURULUMA DÖN","",()=>Execute(GarageCommand.Stock(ViewedCar)),!GarageSession.Store.ReadOnly);columns.Add(middle);
      var right=Vertical();right.AddToClassList("g-effect");right.Add(Ui.Section("ETKİ"));var chosen=parts[partIndex];right.Add(Ui.Text(chosen.Name,"baslik","g-name"));Stats(right,true);
      string action=chosen.Equipped?"SÖK":chosen.Owned?"TAK":"SATIN AL VE TAK · "+chosen.Cost.ToString("N0");if(confirm!="")action="ONAYLA · "+action;
      AddButton(right,action,"Enter",ActivatePart,chosen.Enabled&&!GarageSession.Store.ReadOnly,true);columns.Add(right);content.Add(columns);
      var hints=Ui.Hints(("↑|↓","Kategori"),("←|→","Parça"),("Enter","Al / Tak"),("X","Sök"));hints.style.bottom=-50;content.Add(hints);
    }
    private static ScrollView Vertical()=>new ScrollView(ScrollViewMode.Vertical){horizontalScrollerVisibility=ScrollerVisibility.Hidden,verticalScrollerVisibility=ScrollerVisibility.Auto};
    private void Stats(VisualElement box,bool compare)
    {
      var badge=Ui.Text(Detail.Class+Detail.Score.ToString("0")+(compare?"  →  "+Detail.PreviewClass+Detail.PreviewScore.ToString("0"):""),"g-class");
      if(ColorUtility.TryParseHtmlString(Detail.ClassColor,out var color))badge.style.color=color;box.Add(badge);
      for(int i=0;i<Detail.Features.Length;i++)
      {var f=Detail.Features[i];var next=Detail.PreviewFeatures[i];var stat=i==0?null:Detail.Stats.First(s=>s.Key==new[]{"","ivme","hiz","tutus","fren","arazi"}[i]);
        string unit=i==1?" sn":i==2?" km/sa":i==4?" m":"";
        string value=i==0?Detail.Power.ToString("0.#")+" HP":stat.Current.ToString("0.00")+unit;string after=i==0?Detail.PreviewPower.ToString("0.#")+" HP":stat.Preview.ToString("0.00")+unit;
        box.Add(Ui.Text((i==0?"Güç":f.Name)+"   "+value+(compare?" → "+after:""),"g-stat"));var bar=Box("g-bar");var fill=Box("g-fill");fill.style.width=Length.Percent((float)Math.Min(100,100*f.Score/200));bar.Add(fill);if(compare){var mark=Box("g-mark");mark.style.left=Length.Percent((float)Math.Min(100,100*next.Score/200));bar.Add(mark);}box.Add(bar);}
      box.Add(Ui.Text(Detail.Power.ToString("0.#")+" HP"+(compare?" → "+Detail.PreviewPower.ToString("0.#"):"")+"  •  "+Detail.Mass.ToString("0")+" KG","g-copy"));
    }
    private void OnDestroy(){if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
  }
}
