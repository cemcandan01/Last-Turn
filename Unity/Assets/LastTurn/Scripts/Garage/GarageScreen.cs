using System;
using System.Linq;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Garage
{
  // Geçici IMGUI garajı: nihai tasarım değildir. Yalnız GarageViewModel satırlarını çizer ve komutlarını
  // GarageSession.Execute ile çalıştırır; satın alma/ekonomi/kayıt kuralı içermez.
  public sealed class GarageScreen : MonoBehaviour
  {
    private int viewCar=10,category,tab;
    private Vector2 carsScroll,partsScroll,statsScroll;
    private string previewPart="",confirmKey="",localMessage="";
    private float confirmUntil;
    private GarageCarDetail detail;
    private GUIStyle heading,small,stat,title;
    private GarageState seenState;
    private void Awake(){GarageSession.EnsureLoaded();viewCar=GarageSession.State.SelectedCar;Refresh();}
    public int ViewedCar => viewCar;
    public void ViewCar(int index){viewCar=index;previewPart="";confirmKey="";Refresh();}
    private void Refresh(){var state=GarageSession.State;if(state==null)return;detail=GarageViewModel.Detail(state,viewCar,previewPart);seenState=state;}
    private static string Key(GarageCommand c)=>c.Kind+":"+c.Car+":"+c.Id;
    // Para harcayan komut 3 sn içinde ikinci basışı ister; zamanlama sunumdadır, kural komuttadır.
    private void Run(GarageCommand command)
    {
      if(command.SpendsMoney && !(confirmKey==Key(command) && Time.unscaledTime<=confirmUntil))
      {confirmKey=Key(command);confirmUntil=Time.unscaledTime+3;localMessage="Satın almak için 3 saniye içinde aynı düğmeye tekrar basın.";return;}
      GarageSession.Execute(command);confirmKey="";localMessage="";Refresh();
    }
    // Geçici etkinlik listesi (TS menü kartları yerine): satırlar RaceViewModel.Events'ten; kural yok.
    private bool eventsOpen;private Vector2 eventsScroll;private RaceEventRow[] eventRows;private GarageState eventsState;
    private void Events(GarageState state)
    {
      GUILayout.BeginArea(new Rect(300,130,952,534),GUI.skin.box);
      GUILayout.Label("YARIŞLAR • seçili araç: "+GarageViewModel.Cars(state)[state.SelectedCar].Name,heading);
      eventsScroll=GUILayout.BeginScrollView(eventsScroll);
      if(eventsState!=state || eventRows==null){eventRows=RaceViewModel.Events(state,LastTurn.Prototype.RaceData.Load().Events);eventsState=state;}
      foreach(var row in eventRows)
      {
        GUILayout.BeginHorizontal(GUI.skin.box);
        GUILayout.Label(row.Key+"  "+row.Name,stat,GUILayout.Width(300));
        GUILayout.Label(row.TypeName+" • sv "+row.Difficulty+" • hedef "+row.Target+" • en iyi "+row.BestStars+"/3"+(row.Career?"":" • bütçe dışı: ödülsüz deneme"),small,GUILayout.Width(470));
        GUI.enabled=row.Open;
        if(GUILayout.Button(row.Open?"Yarış":"Kilitli",GUILayout.Width(120),GUILayout.Height(28))){LastTurn.Prototype.RaceData.Selected=row.Key;GarageSession.Launch("RaceTest");}
        GUI.enabled=true;GUILayout.EndHorizontal();
      }
      GUILayout.EndScrollView();GUILayout.EndArea();
    }
    private string Label(GarageCommand command,string label)=>confirmKey==Key(command) && Time.unscaledTime<=confirmUntil?"Onayla • "+label:label;
    private void OnGUI()
    {
      if(GarageSession.State==null)return;
      if(heading==null)
      {
        heading=new GUIStyle(GUI.skin.label){fontSize=19,fontStyle=FontStyle.Bold,wordWrap=true};
        title=new GUIStyle(heading){fontSize=27};small=new GUIStyle(GUI.skin.label){fontSize=13,wordWrap=true};
        stat=new GUIStyle(GUI.skin.label){fontSize=15,wordWrap=true};
      }
      if(seenState!=GarageSession.State)Refresh();
      var state=GarageSession.State;var cars=GarageViewModel.Cars(state);var car=cars[viewCar];bool writable=!GarageSession.Store.ReadOnly;
      float scale=Mathf.Min(Screen.width/1280f,Screen.height/760f);var matrix=GUI.matrix;GUI.matrix=Matrix4x4.Scale(new Vector3(scale,scale,1));
      GUI.Box(new Rect(10,10,1260,740),GUIContent.none);
      GUILayout.BeginArea(new Rect(28,22,1224,102));
      GUILayout.BeginHorizontal();GUILayout.Label("LAST TURN  /  GARAJ",title);GUILayout.FlexibleSpace();
      GUILayout.Label($"Bakiye  {state.Balance:N0}     Seviye {state.Level}",heading);GUILayout.EndHorizontal();
      GUILayout.BeginHorizontal();GUILayout.Label(GarageSession.DeveloperProfile?"GELİŞTİRİCİ TEST PROFİLİ • normal kayıttan ayrı":"Yerel oyuncu profili • işlemler otomatik kaydedilir",small);GUILayout.FlexibleSpace();
      if(GUILayout.Button("Kaydet",GUILayout.Width(96),GUILayout.Height(30))){GarageSession.Save();localMessage="";}
      if(GUILayout.Button("Yeniden yükle",GUILayout.Width(120),GUILayout.Height(30))){GarageSession.Reload();ViewCar(GarageSession.State.SelectedCar);localMessage="";}
      if(GUILayout.Button(GarageSession.DeveloperProfile?"Oyuncu profiline dön":"Ayrı test profilini aç",GUILayout.Width(190),GUILayout.Height(30))){GarageSession.SwitchProfile(!GarageSession.DeveloperProfile);ViewCar(GarageSession.State.SelectedCar);localMessage="";}
      GUILayout.EndHorizontal();GUILayout.Label(localMessage!=""?localMessage:GarageSession.Message,small);GUILayout.EndArea();

      GUILayout.BeginArea(new Rect(28,130,260,534),GUI.skin.box);
      tab=GUILayout.SelectionGrid(tab,new[]{"Garaj","Mağaza"},2,GUILayout.Height(34));carsScroll=GUILayout.BeginScrollView(carsScroll);
      foreach(var row in cars)
      {
        if((tab==0)!=row.Owned)continue;
        var color=GUI.backgroundColor;if(row.Index==viewCar)GUI.backgroundColor=new Color(.25f,.65f,.74f);
        string line=row.Name+"\n"+(row.Owned?(row.Selected?"SEÇİLİ":"Sahip olunan"):row.Price.ToString("N0")+" • sv "+row.RequiredLevel);
        if(GUILayout.Button(line,GUILayout.Height(58)))ViewCar(row.Index);GUI.backgroundColor=color;
      }
      GUILayout.EndScrollView();GUILayout.EndArea();

      GUILayout.BeginArea(new Rect(300,130,354,534),GUI.skin.box);
      GUILayout.Label(detail.Name,heading);GUILayout.Label(detail.Description,small);
      GUILayout.Label(detail.Class+detail.Score+(previewPart!=""?"  →  "+detail.PreviewClass+detail.PreviewScore:""),title);
      if(car.Owned)
      {
        if(GUILayout.Button(car.Selected?"Sürüş için seçili":"Sürüş için seç",GUILayout.Height(32)))Run(car.Primary);
      }
      else
      {
        GUILayout.Label(car.BlockText,small);
        GUI.enabled=car.Block=="" && writable;
        if(GUILayout.Button(Label(car.Primary,"Aracı satın al • "+car.Price.ToString("N0")),GUILayout.Height(34)))Run(car.Primary);GUI.enabled=true;
      }
      statsScroll=GUILayout.BeginScrollView(statsScroll);
      GUILayout.Label(previewPart==""?"Mevcut kurulum":"Mevcut → parça önizlemesi",heading);
      foreach(var s in detail.Stats)GUILayout.Label(s.Label+"   "+s.Current.ToString("0.00")+(previewPart==""?"":" → "+s.Preview.ToString("0.00")),stat);
      GUILayout.Label($"Güç {detail.Power:0.##} hp   Kütle {detail.Mass:0.##} kg",stat);
      GUILayout.Label("Lastik: "+detail.TireName,stat);
      GUILayout.Label("Takılı: "+(detail.Parts.Length==0?"Stok":string.Join(", ",detail.Parts)),small);
      foreach(var f in detail.Features)GUILayout.Label(f.Name+": "+f.Score,small);
      GUILayout.EndScrollView();GUILayout.EndArea();

      GUILayout.BeginArea(new Rect(666,130,586,534),GUI.skin.box);
      GUILayout.Label("MODİFİYE",heading);var categories=GarageViewModel.Categories(GarageSession.Catalog);
      int next=GUILayout.SelectionGrid(category,categories.Select(c=>c.Label).ToArray(),3,GUILayout.Height(100));if(next!=category){category=next;previewPart="";Refresh();}
      string kat=categories[category].Id;GUI.enabled=car.Owned && writable;
      if(GUILayout.Button("Bu kategoriyi sök • sahiplik ve yatırım korunur",GUILayout.Height(30)))Run(GarageCommand.UnequipCategory(viewCar,kat));
      partsScroll=GUILayout.BeginScrollView(partsScroll);
      foreach(var part in GarageViewModel.Parts(state,viewCar,kat))
      {
        GUILayout.BeginVertical(GUI.skin.box);GUILayout.BeginHorizontal();
        if(GUILayout.Button(part.Name+(part.Equipped?" • TAKILI":""),GUILayout.Width(300),GUILayout.Height(30))){previewPart=part.Id;Refresh();}
        string action=part.Equipped?"Sök":part.Owned?"Tak":"Al • "+part.Cost.ToString("N0");
        if(GUILayout.Button(Label(part.Command,action),GUILayout.Height(30)))Run(part.Command);
        GUILayout.EndHorizontal();GUILayout.Label(part.Description,small);GUILayout.EndVertical();
      }
      GUILayout.Space(8);GUILayout.Label("PAKETLER",heading);
      foreach(var pack in GarageViewModel.Packages(state,viewCar))
      {
        GUILayout.BeginHorizontal();GUILayout.Label(pack.Name,stat,GUILayout.Width(275));
        if(GUILayout.Button(Label(pack.Command,pack.Owned?"Paketi tak":"Al • "+pack.Cost.ToString("N0")),GUILayout.Height(28)))Run(pack.Command);
        GUILayout.EndHorizontal();
      }
      if(GUILayout.Button("Tüm parçaları sök • stoka dön",GUILayout.Height(30)))Run(GarageCommand.Stock(viewCar));
      GUILayout.EndScrollView();GUI.enabled=true;GUILayout.EndArea();

      GUILayout.BeginArea(new Rect(28,674,1224,60));GUILayout.BeginHorizontal();
      GUILayout.Label("Sürüş: "+cars[state.SelectedCar].Name,heading,GUILayout.Width(330));
      var modes=GarageViewModel.DriveTireModes;int mode=Array.FindIndex(modes,m=>m.Key==GarageSession.RaceType);
      mode=GUILayout.SelectionGrid(Math.Max(0,mode),modes.Select(m=>m.Label).ToArray(),6,GUILayout.Width(500),GUILayout.Height(36));GarageSession.RaceType=modes[mode].Key;
      if(GUILayout.Button("GTTest'te sür",GUILayout.Height(36)))GarageSession.Launch("GTTest");
      if(GUILayout.Button("TerrainTest'te sür",GUILayout.Height(36)))GarageSession.Launch("TerrainTest");
      if(GUILayout.Button(eventsOpen?"Yarışları kapat":"Yarışlar",GUILayout.Height(36)))eventsOpen=!eventsOpen;GUILayout.EndHorizontal();
      GUILayout.Label("Sökme/değiştirme iade üretmez. Kategoriye ödenmiş gerçek bedel sonraki yükseltmeye kredi olur.",small);GUILayout.EndArea();
      if(eventsOpen)Events(state);
      GUI.matrix=matrix;
    }
  }
}
