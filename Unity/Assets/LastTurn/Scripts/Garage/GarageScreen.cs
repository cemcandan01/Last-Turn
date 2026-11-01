using System;
using System.Linq;
using LastTurn.Core;
using LastTurn.Prototype;
using UnityEngine;

namespace LastTurn.Garage
{
  // Geçici geliştirici paneli: yalnız görünüm modelleri, komutlar ve sahne servisi kullanır.
  public sealed class GarageScreen : MonoBehaviour
  {
    private int viewCar=10,category,shop,section,raceType;
    private string previewPart="",confirmKey="",localMessage="",raceKey="gp_1";
    private float confirmUntil;
    private Vector2 scroll,carsScroll;
    private GarageCarDetail detail;
    private GarageState seenState;
    private GUIStyle heading,text,title,button,selected,status;
    public int ViewedCar=>viewCar;
    public int SelectedTab=>section;
    public string SelectedRaceKey=>raceKey;
    private void Awake(){GarageSession.EnsureLoaded();viewCar=GarageSession.State.SelectedCar;section=GameFlow.GarageTab;Refresh();SelectTrack(GameFlow.LastRaceKey);}
    public void ViewCar(int index){viewCar=index;previewPart="";confirmKey="";Refresh();}
    private void Refresh(){if(GarageSession.State==null)return;detail=GarageViewModel.Detail(GarageSession.State,viewCar,previewPart);seenState=GarageSession.State;}
    public void SelectTab(int value){section=Mathf.Clamp(value,0,4);scroll=Vector2.zero;confirmKey="";localMessage="";TestPanelActions.ClearError();}
    public void SelectRaceType(string type){raceType=Array.IndexOf(TestPanelModel.Types,type);if(raceType<0)raceType=0;raceKey=TestPanelModel.Types[raceType]+"_1";}
    public void SelectTrack(string key){if(TestPanelActions.Events().Any(e=>e.Key==key)){raceKey=key;raceType=Array.IndexOf(TestPanelModel.Types,key.Split('_')[0]);}}
    public bool StartSelectedRace()=>WorldData.StartCareer(raceKey);
    private static string Key(GarageCommand c)=>c.Kind+":"+c.Car+":"+c.Id;
    private void Run(GarageCommand command)
    {
      if(command.SpendsMoney && !(confirmKey==Key(command) && Time.unscaledTime<=confirmUntil))
      {confirmKey=Key(command);confirmUntil=Time.unscaledTime+3;localMessage="Onaylamak için aynı satın alma düğmesine 3 saniye içinde tekrar basın.";return;}
      GarageSession.Execute(command);confirmKey="";localMessage="";Refresh();
    }
    private string Label(GarageCommand c,string label)=>confirmKey==Key(c)&&Time.unscaledTime<=confirmUntil?"Onayla • "+label:label;
    private bool Button(string label,bool on=false,bool enabled=true,float height=46)
    {bool old=GUI.enabled;GUI.enabled=old&&enabled;bool click=GUILayout.Button(label,on?selected:button,GUILayout.MinHeight(height));GUI.enabled=old;return click;}
    private void Styles()
    {
      if(button!=null)return;
      text=new GUIStyle(GUI.skin.label){fontSize=18,wordWrap=true,stretchWidth=true};text.normal.textColor=Color.white;
      heading=new GUIStyle(text){fontSize=22,fontStyle=FontStyle.Bold};title=new GUIStyle(heading){fontSize=26};
      button=new GUIStyle(GUI.skin.button){fontSize=18,wordWrap=true,padding=new RectOffset(12,12,10,10),stretchWidth=true};
      button.onNormal.textColor=new Color(.4f,1,.95f);button.onFocused.textColor=new Color(.4f,1,.95f);
      button.onHover.textColor=button.onNormal.textColor;button.onActive.textColor=button.onNormal.textColor;
      selected=new GUIStyle(button){fontStyle=FontStyle.Bold};selected.normal.textColor=new Color(.4f,1,.95f);
      selected.hover.textColor=selected.normal.textColor;selected.active.textColor=selected.normal.textColor;selected.focused.textColor=selected.normal.textColor;
      status=new GUIStyle(text){fontSize=16};
    }
    private void OnGUI()
    {
      if(GarageSession.State==null || GameFlow.Home || GameFlow.Profile)return;Styles();if(seenState!=GarageSession.State)Refresh();
      float width=Screen.width-24;
      GUILayout.BeginArea(new Rect(12,12,width,Math.Max(120,Screen.height-24)),GUI.skin.box);
      if(Button("Ana Menü",height:44))GameFlow.MainMenu();
      GUILayout.Label(section==2?"KARİYER / YARIŞLAR":"LAST TURN / GARAJ",title);
      GUILayout.Label("Sürüş: "+GarageViewModel.Cars(GarageSession.State)[GarageSession.State.SelectedCar].Name+"   |   Bakiye "+GarageSession.State.Balance.ToString("N0")+"   |   Seviye "+GarageSession.State.Level,text);
      var navStyle=width>=760?button:new GUIStyle(button){fontSize=width<480?14:16,padding=new RectOffset(4,4,8,8)};
      var tabs=width>=760?TestPanelModel.Tabs:new[]{"Garaj","Modifiye","Yarışlar","Test","Ayarlar"};
      int next=GUILayout.SelectionGrid(section,tabs,5,navStyle,GUILayout.Height(54));
      if(next!=section)SelectTab(next);
      string message=!string.IsNullOrEmpty(TestPanelActions.Error)?TestPanelActions.Error:!string.IsNullOrEmpty(localMessage)?localMessage:GarageSession.Message;
      var color=GUI.color;if(!string.IsNullOrEmpty(TestPanelActions.Error))GUI.color=new Color(1,.72f,.45f);
      GUILayout.Label(string.IsNullOrEmpty(message)?"Hazır. Bir bölüm seçin.":message,status);GUI.color=color;
      scroll=GUILayout.BeginScrollView(scroll,false,false);
      if(section==0)Garage(width);else if(section==1)Mods(width);else if(section==2)Races(width);else if(section==3)Developer();else Settings();
      GUILayout.Space(12);GUILayout.EndScrollView();
      if(section==2)
      {
        var row=TestPanelActions.Events().FirstOrDefault(e=>e.Key==raceKey);
        if(Button("Yarışı Başlat • "+(row==null?raceKey:row.Name+" / "+raceKey),true,height:58))StartSelectedRace();
      }
      GUILayout.EndArea();
    }
    private void Garage(float width)
    {
      var state=GarageSession.State;var cars=GarageViewModel.Cars(state);
      GUILayout.Label("Araçlar",heading);
      int next=GUILayout.SelectionGrid(shop,new[]{"Sahip olunanlar","Mağaza"},2,button,GUILayout.Height(48));
      if(next!=shop){shop=next;var first=cars.FirstOrDefault(c=>c.Owned==(shop==0));if(first!=null)ViewCar(first.Index);}
      bool wide=width>=900;if(wide)GUILayout.BeginHorizontal();
      if(wide)GUILayout.BeginVertical(GUILayout.Width(320));else GUILayout.BeginVertical();
      carsScroll=GUILayout.BeginScrollView(carsScroll,GUILayout.Height(wide?440:240));
      foreach(var c in cars.Where(c=>c.Owned==(shop==0)))
        if(Button(c.Name+"\n"+(c.Owned?(c.Selected?"Sürüş için seçili":"Sahip olunan"):c.Price.ToString("N0")+" • seviye "+c.RequiredLevel),c.Index==viewCar,height:72))ViewCar(c.Index);
      GUILayout.EndScrollView();GUILayout.EndVertical();
      GUILayout.BeginVertical();var car=cars[viewCar];GUILayout.Label(detail.Name,heading);GUILayout.Label(detail.Description,text);
      GUILayout.Label(detail.Class+detail.Score+"  •  "+detail.Power.ToString("0.##")+" hp  •  "+detail.Mass.ToString("0.##")+" kg",heading);
      GUILayout.Label(car.BlockText,text);
      if(Button(Label(car.Primary,car.Owned?(car.Selected?"Sürüş için seçili":"Sürüş için seç"):"Aracı satın al • "+car.Price.ToString("N0")),car.Selected,!GarageSession.Store.ReadOnly&&(car.Owned||car.Block=="")))Run(car.Primary);
      Stats();if(Button("Bu aracı modifiye et",enabled:car.Owned))SelectTab(1);
      GUILayout.EndVertical();if(wide)GUILayout.EndHorizontal();
    }
    private void Stats()
    {
      foreach(var s in detail.Stats)GUILayout.Label(s.Label+": "+s.Current.ToString("0.00")+(previewPart==""?"":" → "+s.Preview.ToString("0.00")),text);
      GUILayout.Label("Lastik: "+detail.TireName,text);GUILayout.Label("Takılı parçalar: "+(detail.Parts.Length==0?"Stok":string.Join(", ",detail.Parts)),text);
      GUILayout.Label("Özellik puanları: "+string.Join(" • ",detail.Features.Select(f=>f.Name+" "+f.Score)),status);
    }
    private void Mods(float width)
    {
      var state=GarageSession.State;bool can=state.OwnsCar(viewCar)&&!GarageSession.Store.ReadOnly;
      GUILayout.Label("Modifiye edilen araç: "+detail.Name,heading);
      if(Button("Araç değiştirmek için Garaj'a git"))SelectTab(0);
      if(!state.OwnsCar(viewCar))GUILayout.Label("Önce sahip olduğunuz bir aracı Garaj'dan seçin.",text);
      var categories=GarageViewModel.Categories(GarageSession.Catalog);int cols=width>=760?4:width>=480?3:2;
      int next=GUILayout.SelectionGrid(category,categories.Select(c=>c.Label).ToArray(),cols,button,GUILayout.Height((float)Math.Ceiling((double)categories.Length/cols)*54));
      if(next!=category){category=next;previewPart="";Refresh();}
      string kat=categories[category].Id;
      GUILayout.Label(categories[category].Label,heading);
      foreach(var p in GarageViewModel.Parts(state,viewCar,kat))
      {
        GUILayout.BeginVertical(GUI.skin.box);
        if(Button(p.Name+(p.Equipped?" • TAKILI":""),previewPart==p.Id)) {previewPart=p.Id;Refresh();}
        GUILayout.Label(p.Description,text);
        if(Button(Label(p.Command,p.Equipped?"Sök":p.Owned?"Tak":"Satın al ve tak • "+p.Cost.ToString("N0")),enabled:can))Run(p.Command);
        GUILayout.EndVertical();
      }
      GUILayout.Label("Paketler",heading);
      foreach(var p in GarageViewModel.Packages(state,viewCar))
        if(Button(Label(p.Command,p.Name+" • "+(p.Owned?"Paketi tak":"Satın al ve tak: "+p.Cost.ToString("N0"))),enabled:can))Run(p.Command);
      if(Button("Bu kategoriyi sök",enabled:can))Run(GarageCommand.UnequipCategory(viewCar,kat));
      if(Button("Tüm parçaları sök / stoka dön",enabled:can))Run(GarageCommand.Stock(viewCar));
      GUILayout.Label("Sökme para iadesi üretmez; sahiplik ve yatırım kredisi korunur.",status);
      GUILayout.Label("Kurulum / önizleme",heading);GUILayout.Label(detail.Class+detail.Score+(previewPart==""?"":" → "+detail.PreviewClass+detail.PreviewScore),heading);Stats();
    }
    private void Races(float width)
    {
      GUILayout.Label("Yarış türü",heading);int cols=TestPanelModel.Columns(width);
      int next=GUILayout.SelectionGrid(raceType,TestPanelModel.TypeNames,cols,button,GUILayout.Height((float)Math.Ceiling(5.0/cols)*50));
      if(next!=raceType)SelectRaceType(TestPanelModel.Types[next]);
      var rows=TestPanelModel.Tracks(TestPanelActions.Events(),TestPanelModel.Types[raceType]);
      GUILayout.Label(TestPanelModel.TypeNames[raceType]+" • "+rows.Length+" pist",heading);
      foreach(var r in rows)
      {
        if(Button(r.Name+" / "+r.Key+(r.Open?"":" • KİLİTLİ"),r.Key==raceKey))SelectTrack(r.Key);
        if(r.Key==raceKey)
        {
          GUILayout.Label(r.TypeName+" • Hedef "+r.Target+" • En iyi "+r.BestStars+"/3",text);
          GUILayout.Label(!r.Open?"Bu pist kilitli; başlat düğmesi erişim nedenini açıklar.":r.Career?"Kariyer yarışı":"Bütçe dışı: ödülsüz deneme",status);
          if(r.Key.StartsWith("dg_",StringComparison.Ordinal))GUILayout.Label("Drag: W kalkış devri, E vites yükselt, Q düşür. Yalnız Drag manuel vites kullanır.",text);
        }
      }
    }
    private void Developer()
    {
      GUILayout.Label("Tek tıklamayla aç",heading);
      GUILayout.Label("Fiziksel dünya / kaynak YZ",heading);
      foreach(string key in new[]{"hub","park","city"})if(Button(WorldData.Catalog.Region(key).Name+" • açık dünya"))WorldData.Open(key);
      foreach(string key in new[]{"gp_1","rx_1","rl_1","dg_1"})if(Button(key+" • fiziksel YZ yarışı (ödülsüz)"))WorldData.StartOpponent(key);
      GUILayout.Label("Kaynakta araç–araç teması yok; yeni temas tasarımı ayrı fazda. Koniler kaynakta görsel işarettir.",status);
      if(Button("Drag dg_1 • doğrudan yarış",true))TestPanelActions.StartRace("dg_1");
      if(Button("GTTest • düz asfalt sürüşü"))TestPanelActions.OpenScene("GTTest");
      if(Button("TerrainTest • arazi sürüşü"))TestPanelActions.OpenScene("TerrainTest");
      if(Button("RaceTest • Asfalt gp_1"))TestPanelActions.StartRace("gp_1");
      GUILayout.Space(12);GUILayout.Label("Kayıt ve test profili",heading);
      GUILayout.Label(GarageSession.DeveloperProfile?"Ayrı geliştirici test profili açık.":"Oyuncu profili açık. Yarış sonuçları bu profile yazılır.",text);
      if(Button(GarageSession.DeveloperProfile?"Oyuncu profiline dön":"Ayrı test profilini aç")){GarageSession.SwitchProfile(!GarageSession.DeveloperProfile);ViewCar(GarageSession.State.SelectedCar);localMessage="";}
      if(Button("Kaydet",enabled:!GarageSession.Store.ReadOnly)){GarageSession.Save();localMessage="";}
      if(Button("Kayıtlı garajı yeniden yükle")){GarageSession.Reload();ViewCar(GarageSession.State.SelectedCar);localMessage="";}
      GUILayout.Label(GarageSession.Store.Status,text);
    }
    private void Settings()
    {
      GUILayout.Label("Sürüş yardımı",heading);
      foreach(var l in GarageViewModel.AssistLevels(GarageSession.State))
      {if(Button(l.Name+" ("+l.Key+")"+(l.Selected?" • SEÇİLİ":""),l.Selected,!GarageSession.Store.ReadOnly))Run(GarageCommand.SetAssistLevel(l.Key));GUILayout.Label(l.Description,text);}
      GUILayout.Space(12);GUILayout.Label("Sürüş testi lastiği",heading);
      foreach(var m in GarageViewModel.DriveTireModes)if(Button(m.Label,GarageSession.RaceType==m.Key))GarageSession.RaceType=m.Key;
      GUILayout.Label("Yarışlar etkinlik türünün lastiğini otomatik kullanır. Bu seçim GTTest ve TerrainTest içindir.",status);
      GUILayout.Label("Klavye: W/S gaz–fren, A/D yön, Space el freni, R yeniden başlat. Drag: E/Q vites.",text);
    }
  }
}
