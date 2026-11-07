using System;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  public sealed class RacePreparationView:MonoBehaviour
  {
    public static RacePreparationView Instance {get;private set;}
    public static bool CoversCurrentScreen=>Instance&&Instance.Wanted();
    public bool Visible {get;private set;}public RacePreparationModel Model {get;private set;}
    private VisualElement page,content;private Label money,message;private GarageScreen legacy;private GarageState seen;private string key="";
    private bool Wanted()
    {
      if(!legacy)legacy=FindFirstObjectByType<GarageScreen>();
      return page!=null&&legacy&&legacy.SelectedTab==2&&SceneManager.GetActiveScene().name=="Garage"&&!GameFlow.Home&&!GameFlow.Profile&&!MutantRuntime.Active&&!SettingsScreen.Open;
    }
    private void Start()
    {
      Instance=this;page=new VisualElement{name="f-race-preparation"};page.AddToClassList("katman");page.Add(Ui.Shade(.95f,.95f));
      var bar=new VisualElement();bar.AddToClassList("ustbar");bar.Add(Ui.Logo());bar.Add(Ui.Key("Q"));var tab=Ui.Tab("KARİYER",GameFlow.RaceMenu);tab.AddToClassList("sec");bar.Add(tab);bar.Add(Ui.Tab("GARAJ",GameFlow.ChangePreparationCar));bar.Add(Ui.Tab("MAĞAZA",GameFlow.OpenStore));bar.Add(Ui.Key("E"));money=Ui.Text("","g-money");bar.Add(money);page.Add(bar);
      content=new VisualElement();content.AddToClassList("r-content");page.Add(content);message=Ui.Text("","g-message");page.Add(message);
      var back=Ui.Button("KARİYER","Esc",GameFlow.RaceMenu,small:true);Ui.Absolute(back,left:58,bottom:22);page.Add(back);page.Add(Ui.Hints(("C","Araç"),("1|2|3","Saat"),("4|5|6","Hava"),("Enter","Başla")));UiRoot.Instance.Screen.Add(page);Ui.Show(page,false);
    }
    private void Update()
    {
      bool active=Wanted(),changed=active!=Visible;Visible=active;Ui.Show(page,active);if(!active)return;
      if(changed||seen!=GarageSession.State||key!=legacy.SelectedRaceKey)Refresh();
      money.text="SEVİYE "+GarageSession.State.Level+"   •   "+GarageSession.State.Balance.ToString("N0")+" para";message.text=TestPanelActions.Error;
      if(changed)return;var k=Keyboard.current;if(k==null)return;
      if(k.escapeKey.wasPressedThisFrame){GameFlow.RaceMenu();return;}
      if(k.cKey.wasPressedThisFrame||k.eKey.wasPressedThisFrame){GameFlow.ChangePreparationCar();return;}
      if(k.qKey.wasPressedThisFrame){GameFlow.OpenStore();return;}
      for(int i=0;i<3;i++){if(k[Key.Digit1+i].wasPressedThisFrame){SelectTime(i);return;}if(k[Key.Digit4+i].wasPressedThisFrame){SelectWeather(i);return;}}
      if(k.enterKey.wasPressedThisFrame)StartRace();
    }
    public void SelectTime(int index){if(index<0||index>=RaceConditions.TimesOfDay.Length)return;GameFlow.Conditions.TimeOfDay=RaceConditions.TimesOfDay[index].Key;Refresh();}
    public void SelectWeather(int index){if(index<0||index>=RaceConditions.Weathers.Length)return;GameFlow.Conditions.Weather=RaceConditions.Weathers[index].Key;Refresh();}
    public bool StartRace()=>legacy.StartSelectedRace();
    private void Refresh()
    {
      seen=GarageSession.State;key=legacy.SelectedRaceKey;var data=RaceData.Load();var info=data.Event(key);Model=RacePreparationModel.Read(seen,GarageRace.ProfileStore().Load(),data.Events,data.Tracks.Find(info.Type,info.Level),key);content.Clear();
      var left=Box("r-left");left.Add(Ui.Section(Ui.Upper(Model.TypeName)+"  •  AŞAMA "+Model.Stage+"  •  "+(Model.Laps>0?Model.Laps+" TUR":"NOKTADAN NOKTAYA")));left.Add(Ui.Text(Ui.Upper(Model.Name),"baslik","r-title"));left.Add(Ui.Text(Model.Description,"g-copy"));
      var row=Box("r-track-row");var map=new TrackMap(Model);map.AddToClassList("r-map");row.Add(map);var stars=Box("g-panel");stars.AddToClassList("r-targets");stars.Add(Ui.Section("YILDIZ HEDEFLERİ"));for(int i=0;i<Model.Targets.Length;i++)stars.Add(Ui.Text((i+1)+" YILDIZ   "+Model.Targets[i],"r-stat"));stars.Add(Ui.Section(Model.Career?"KARİYER REKORUN":"DENEME REKORUN"));stars.Add(Ui.Text(Model.Record,"g-class"));row.Add(stars);left.Add(row);
      var reward=Box("g-panel");reward.AddToClassList("r-reward");reward.Add(Ui.Section("3 YILDIZ ÖDÜL ÖNGÖRÜSÜ"));reward.Add(Ui.Text("+"+Model.Xp.ToString("0")+" XP   •   +"+Model.Money.ToString("0")+" para","g-class"));reward.Add(Ui.Text("Mevcut en iyi yıldızına göre; ödül yarış bitişinde hesaplanır.","g-copy"));left.Add(reward);content.Add(left);
      var right=Box("g-panel");right.AddToClassList("r-options");right.Add(Ui.Section("ARAÇ  •  TAVAN "+Model.Budget));right.Add(Ui.Text(Model.Car.Name,"baslik","g-name"));right.Add(Ui.Text(Model.Car.Class+Model.Car.Score.ToString("0"),"g-class"));right.Add(Ui.Text(Model.Status,"g-copy"));var change=Ui.Button("ARACI DEĞİŞTİR","C",GameFlow.ChangePreparationCar,small:true);change.name="preparation-car";right.Add(change);
      right.Add(Ui.Section("GÜNÜN SAATİ"));var times=Box("r-chips");for(int i=0;i<RaceConditions.TimesOfDay.Length;i++){int n=i;var t=RaceConditions.TimesOfDay[i];var b=Ui.Tab(Ui.Upper(t.Name),()=>SelectTime(n));b.name="preparation-time-"+i;b.EnableInClassList("sec",GameFlow.Conditions.TimeOfDay==t.Key);times.Add(b);}right.Add(times);
      right.Add(Ui.Section("HAVA"));var weathers=Box("r-chips");for(int i=0;i<RaceConditions.Weathers.Length;i++){int n=i;var w=RaceConditions.Weathers[i];var b=Ui.Tab(Ui.Upper(w.Name),()=>SelectWeather(n));b.name="preparation-weather-"+i;b.EnableInClassList("sec",GameFlow.Conditions.Weather==w.Key);weathers.Add(b);}right.Add(weathers);
      var go=Ui.Button(Model.Career?"YARIŞA BAŞLA":"DENEMEYE BAŞLA","Enter",()=>StartRace(),true);go.name="preparation-start";go.SetEnabled(Model.Open);right.Add(go);content.Add(right);
    }
    private static VisualElement Box(string cls){var e=new VisualElement();e.AddToClassList(cls);return e;}
    private void OnDestroy(){if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
    private sealed class TrackMap:VisualElement
    {
      public TrackMap(RacePreparationModel model)
      {
        generateVisualContent+=ctx=>{if(model.MapX.Length<2)return;double minX=double.MaxValue,minZ=double.MaxValue,maxX=double.MinValue,maxZ=double.MinValue;for(int i=0;i<model.MapX.Length;i++){minX=Math.Min(minX,model.MapX[i]);maxX=Math.Max(maxX,model.MapX[i]);minZ=Math.Min(minZ,model.MapZ[i]);maxZ=Math.Max(maxZ,model.MapZ[i]);}float scale=(float)Math.Min((contentRect.width-40)/Math.Max(1,maxX-minX),(contentRect.height-40)/Math.Max(1,maxZ-minZ));float ox=(contentRect.width-(float)(maxX-minX)*scale)/2,oy=(contentRect.height-(float)(maxZ-minZ)*scale)/2;var p=ctx.painter2D;p.strokeColor=Ui.Accent;p.lineWidth=5;p.BeginPath();for(int i=0;i<model.MapX.Length;i++){var v=new Vector2(ox+(float)(model.MapX[i]-minX)*scale,oy+(float)(model.MapZ[i]-minZ)*scale);if(i==0)p.MoveTo(v);else p.LineTo(v);}if(!model.MapOpen)p.ClosePath();p.Stroke();};
      }
    }
  }
}
