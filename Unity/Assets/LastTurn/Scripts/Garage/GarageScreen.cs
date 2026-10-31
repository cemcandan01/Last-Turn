using System;
using System.Linq;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Garage
{
  public sealed class GarageScreen : MonoBehaviour
  {
    private int viewCar=10,category,tab;
    private Vector2 carsScroll,partsScroll,statsScroll;
    private string previewPart="",confirmKey="",localMessage="";
    private float confirmUntil;
    private CatalogNode current,preview;
    private GUIStyle heading,small,stat,title;
    private GarageState seenState;
    private void Awake(){GarageSession.EnsureLoaded();viewCar=GarageSession.State.SelectedCar;Refresh();}
    public int ViewedCar => viewCar;
    public void ViewCar(int index){viewCar=index;previewPart="";confirmKey="";Refresh();}
    private void Refresh()
    {
      var state=GarageSession.State;if(state==null)return;
      current=CatalogPerformance.Calculate(GarageSession.Catalog,state.Setup(viewCar));
      var ids=state.Equipped(viewCar).Concat(previewPart==""?Array.Empty<string>():new[]{previewPart});
      preview=CatalogPerformance.Calculate(GarageSession.Catalog,GarageSession.Catalog.Setup(viewCar,ids));seenState=state;
    }
    private void Confirm(string key,Func<GarageState,bool> action,string message)
    {
      if(confirmKey==key && Time.unscaledTime<=confirmUntil)
      {GarageSession.Transact(action,message);confirmKey="";localMessage="";Refresh();}
      else{confirmKey=key;confirmUntil=Time.unscaledTime+3;localMessage="Satın almak için 3 saniye içinde aynı düğmeye tekrar basın.";}
    }
    private string BuyLabel(string key,string label)=>confirmKey==key && Time.unscaledTime<=confirmUntil?"Onayla • "+label:label;
    private void Act(Func<GarageState,bool> action,string message){GarageSession.Transact(action,message);localMessage="";Refresh();}
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
      var catalog=GarageSession.Catalog;var state=GarageSession.State;var cars=catalog.Data["cars"].Items.ToArray();
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
      for(int i=0;i<cars.Length;i++)
      {
        bool owned=state.OwnsCar(i);if((tab==0)!=owned)continue;
        var color=GUI.backgroundColor;if(i==viewCar)GUI.backgroundColor=new Color(.25f,.65f,.74f);
        string line=cars[i]["n"].S()+"\n"+(owned?(state.SelectedCar==i?"SEÇİLİ":"Sahip olunan"):catalog.Data["prices"]["cars"][i]["para"].N().ToString("N0")+" • sv "+catalog.Data["prices"]["cars"][i]["seviye"].N());
        if(GUILayout.Button(line,GUILayout.Height(58)))ViewCar(i);GUI.backgroundColor=color;
      }
      GUILayout.EndScrollView();GUILayout.EndArea();

      GUILayout.BeginArea(new Rect(300,130,354,534),GUI.skin.box);
      GUILayout.Label(cars[viewCar]["n"].S(),heading);GUILayout.Label(cars[viewCar]["d"].S(),small);
      GUILayout.Label(current["sinif"].S()+current["puan"].N()+ (previewPart!=""?"  →  "+preview["sinif"].S()+preview["puan"].N():""),title);
      if(state.OwnsCar(viewCar))
      {
        if(GUILayout.Button(state.SelectedCar==viewCar?"Sürüş için seçili":"Sürüş için seç",GUILayout.Height(32)))Act(s=>s.SelectCar(viewCar),"Araç seçimi kaydedildi.");
      }
      else
      {
        string block=state.CarPurchaseBlock(viewCar);double price=catalog.Data["prices"]["cars"][viewCar]["para"].N();
        GUILayout.Label(block=="seviye"?"XP seviyesi veya aynı tür kupa başarısı gerekli.":block=="para"?"Satın almak için bakiye yetersiz.":"Satın alınabilir.",small);
        GUI.enabled=block=="" && !GarageSession.Store.ReadOnly;
        if(GUILayout.Button(BuyLabel("car"+viewCar,"Aracı satın al • "+price.ToString("N0")),GUILayout.Height(34)))Confirm("car"+viewCar,s=>s.BuyCar(viewCar),"Araç satın alındı ve kaydedildi.");GUI.enabled=true;
      }
      statsScroll=GUILayout.BeginScrollView(statsScroll);
      GUILayout.Label(previewPart==""?"Mevcut kurulum":"Mevcut → parça önizlemesi",heading);
      foreach(var pair in new[]{("hiz","Azami hız (km/sa)"),("ivme","0–100 (sn)"),("tutus","Yol tutuşu"),("fren","100–0 (m)"),("arazi","Arazi")})
        GUILayout.Label(pair.Item2+"   "+current[pair.Item1].N().ToString("0.00")+(previewPart==""?"":" → "+preview[pair.Item1].N().ToString("0.00")),stat);
      var setup=state.Setup(viewCar);GUILayout.Label($"Güç {setup.Car["hp"].N():0.##} hp   Kütle {setup.Car["kg"].N():0.##} kg",stat);
      GUILayout.Label("Lastik: "+catalog.Data["tires"][setup.Tire]["n"].S(),stat);
      GUILayout.Label("Takılı: "+(setup.Parts.Length==0?"Stok":string.Join(", ",setup.Parts)),small);
      foreach(var f in current["ozellikler"].Items)GUILayout.Label(f["ad"].S()+": "+f["puan"].N(),small);
      GUILayout.EndScrollView();GUILayout.EndArea();

      GUILayout.BeginArea(new Rect(666,130,586,534),GUI.skin.box);
      GUILayout.Label("MODİFİYE",heading);var categories=catalog.Data["categories"].Items.ToArray();
      int next=GUILayout.SelectionGrid(category,categories.Select(c=>c[1].S()).ToArray(),3,GUILayout.Height(100));if(next!=category){category=next;previewPart="";Refresh();}
      string kat=categories[category][0].S();GUI.enabled=state.OwnsCar(viewCar) && !GarageSession.Store.ReadOnly;
      if(GUILayout.Button("Bu kategoriyi sök • sahiplik ve yatırım korunur",GUILayout.Height(30)))Act(s=>s.Unequip(viewCar,kat),"Parça söküldü. Para iadesi yok; yatırım kredisi korundu.");
      partsScroll=GUILayout.BeginScrollView(partsScroll);
      foreach(var part in catalog.Data["parts"].Items.Where(p=>p["kat"].S()==kat))
      {
        string id=part["id"].S();bool owned=state.OwnsPart(viewCar,id),equipped=state.Equipped(viewCar).Contains(id);double cost=state.PartsCost(viewCar,new[]{id});
        GUILayout.BeginVertical(GUI.skin.box);GUILayout.BeginHorizontal();
        if(GUILayout.Button(part["n"].S()+(equipped?" • TAKILI":""),GUILayout.Width(300),GUILayout.Height(30))){previewPart=id;Refresh();}
        // TS garaj.ts: takılı parçaya ikinci dokunuş o kategoriyi söker (parcaSok).
        if(owned){if(GUILayout.Button(equipped?"Sök":"Tak",GUILayout.Height(30))){if(equipped)Act(s=>s.Unequip(viewCar,kat),"Parça söküldü. Para iadesi yok; yatırım kredisi korundu.");else Act(s=>s.Equip(viewCar,id),"Parça takıldı ve kaydedildi.");}}
        else if(GUILayout.Button(BuyLabel("part"+id,"Al • "+cost.ToString("N0")),GUILayout.Height(30)))Confirm("part"+id,s=>s.BuyParts(viewCar,new[]{id}) && s.Equip(viewCar,id),"Parça satın alındı, takıldı ve kaydedildi.");
        GUILayout.EndHorizontal();GUILayout.Label(part["d"].S(),small);GUILayout.EndVertical();
      }
      GUILayout.Space(8);GUILayout.Label("PAKETLER",heading);
      foreach(var pack in catalog.Data["packages"].Items)
      {
        string id=pack["id"].S();var ids=pack["parcalar"].Items.Select(p=>p.S()).ToArray();bool owned=ids.All(p=>state.OwnsPart(viewCar,p));
        GUILayout.BeginHorizontal();GUILayout.Label(pack["n"].S(),stat,GUILayout.Width(275));
        if(owned){if(GUILayout.Button("Paketi tak",GUILayout.Height(28)))Act(s=>s.EquipPackage(viewCar,id),"Paket takıldı ve kaydedildi.");}
        else if(GUILayout.Button(BuyLabel("pack"+id,"Al • "+state.PartsCost(viewCar,ids).ToString("N0")),GUILayout.Height(28)))Confirm("pack"+id,s=>s.BuyParts(viewCar,ids) && s.EquipPackage(viewCar,id),"Paket satın alındı, takıldı ve kaydedildi.");
        GUILayout.EndHorizontal();
      }
      if(GUILayout.Button("Tüm parçaları sök • stoka dön",GUILayout.Height(30)))Act(s=>s.Stock(viewCar),"Stoka dönüldü. Satın alınmış parçalar ve yatırım korundu.");
      GUILayout.EndScrollView();GUI.enabled=true;GUILayout.EndArea();

      GUILayout.BeginArea(new Rect(28,674,1224,60));GUILayout.BeginHorizontal();
      GUILayout.Label("Sürüş: "+cars[state.SelectedCar]["n"].S(),heading,GUILayout.Width(330));
      var raceKeys=new[]{"","gp","rx","rl","dp","dg"};int mode=Array.IndexOf(raceKeys,GarageSession.RaceType);
      mode=GUILayout.SelectionGrid(Math.Max(0,mode),new[]{"Takılı","Asfalt","Rallikros","Ralli","Drift","Drag"},6,GUILayout.Width(500),GUILayout.Height(36));GarageSession.RaceType=raceKeys[mode];
      if(GUILayout.Button("GTTest'te sür",GUILayout.Height(36)))GarageSession.Launch("GTTest");
      if(GUILayout.Button("TerrainTest'te sür",GUILayout.Height(36)))GarageSession.Launch("TerrainTest");GUILayout.EndHorizontal();
      GUILayout.Label("Sökme/değiştirme iade üretmez. Kategoriye ödenmiş gerçek bedel sonraki yükseltmeye kredi olur.",small);GUILayout.EndArea();GUI.matrix=matrix;
    }
  }
}
