using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using LastTurn.Core;
using UnityEditor;
using UnityEngine;

namespace LastTurn.EditorValidation
{
  public sealed class VehicleCatalogWindow : EditorWindow
  {
    private VehicleCatalog catalog;
    private int car,level=1,race;
    private string[] selected=Array.Empty<string>();
    private Vector2 scroll;
    private CatalogSetup setup;
    private CatalogNode stock,performance;
    private string error;
    [MenuItem("Last Turn/Araç ve Modifiye Kataloğu")]
    public static void Open(){var window=GetWindow<VehicleCatalogWindow>("Araç Kataloğu");window.minSize=new Vector2(820,640);}
    private void OnEnable(){minSize=new Vector2(820,640);Reload();}
    private void Reload()
    {
      try{catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(Application.dataPath,"LastTurn/Resources/vehicle-catalog.json")));RefreshValues();error=null;}
      catch(Exception e){error=e.Message;}
    }
    private void RefreshValues()
    {
      var keys=catalog.Data["levels"].Fields.Select(p=>p.Key).ToArray();level=Math.Min(level,keys.Length-1);
      setup=catalog.Setup(car,selected,keys[level]);selected=setup.Parts;
      // Garaj puanı her zaman kaynak gibi norm yardımında hesaplanır.
      performance=CatalogPerformance.Calculate(catalog,catalog.Setup(car,selected));stock=CatalogPerformance.Calculate(catalog,catalog.Setup(car,Array.Empty<string>()));
    }
    private void OnGUI()
    {
      if(GUILayout.Button("Kataloğu yeniden oku"))Reload();
      if(error!=null){EditorGUILayout.HelpBox(error,MessageType.Error);return;}
      if(catalog==null)return;
      EditorGUILayout.LabelField("TypeScript 0.8.18 • 15 araç / 42 parça / 5 paket",EditorStyles.boldLabel);
      var cars=catalog.Data["cars"].Items.ToArray();var keys=catalog.Data["levels"].Fields.Select(p=>p.Key).ToArray();
      EditorGUI.BeginChangeCheck();car=EditorGUILayout.Popup("Araç",car,cars.Select(c=>c["n"].S()+" ("+c["k"].S()+")").ToArray());level=EditorGUILayout.Popup("Sürüş yardımı",level,keys);race=EditorGUILayout.Popup("Yarış bileşiği",race,new[]{"gp","rx","rl","dp","dg"});if(EditorGUI.EndChangeCheck())RefreshValues();
      scroll=EditorGUILayout.BeginScrollView(scroll);
      EditorGUILayout.HelpBox(cars[car]["d"].S(),MessageType.Info);
      var price=catalog.Data["prices"]["cars"][car];EditorGUILayout.LabelField("Araç fiyatı / erişim",""+price["para"].N()+" / seviye "+price["seviye"].N());
      EditorGUILayout.LabelField("Sınıf",stock["sinif"].S()+stock["puan"].N()+" → "+performance["sinif"].S()+performance["puan"].N());
      EditorGUILayout.LabelField("Stok tavan / modifiye payı",catalog.Data["stockCaps"][stock["sinif"].S()].N()+" / "+(catalog.Data["classes"].Items.First(c=>c["h"].S()==performance["sinif"].S())["max"].N()-performance["puan"].N()));
      EditorGUILayout.LabelField("", "Stok → Seçili",EditorStyles.boldLabel);
      foreach(var p in new[]{("hp","Güç (hp)"),("kg","Kütle (kg)"),("lift","Yükseklik farkı (m)"),("awd","Ön çekiş payı")})EditorGUILayout.LabelField(p.Item2,cars[car][p.Item1].N().ToString("G6")+" → "+setup.Car[p.Item1].N().ToString("G6"));
      foreach(var p in new[]{("hiz","Azami hız (km/sa)"),("ivme","0–100 (sn)"),("tutus","Yol tutuşu"),("arazi","Arazi"),("fren","100–0 (m)")})EditorGUILayout.LabelField(p.Item2,stock[p.Item1].N().ToString("G6")+" → "+performance[p.Item1].N().ToString("G6"));
      foreach(var p in performance["ozellikler"].Items)EditorGUILayout.LabelField(p["ad"].S()+" puanı",p["puan"].N().ToString());
      EditorGUILayout.LabelField("Önayar / lastik",setup.Preset+" / "+catalog.Data["tires"][setup.Tire]["n"].S());
      int raceTire=catalog.RaceTire(new[]{"gp","rx","rl","dp","dg"}[race],selected);EditorGUILayout.LabelField("Otomatik yarış lastiği",catalog.Data["tires"][raceTire]["n"].S());
      EditorGUILayout.LabelField("Stoktan alım bedeli",catalog.PurchaseCost(selected,new Dictionary<string,double>()).ToString());
      EditorGUILayout.BeginHorizontal();if(GUILayout.Button("Stoka dön")){selected=Array.Empty<string>();RefreshValues();}foreach(var p in catalog.Data["packages"].Items)if(GUILayout.Button(p["n"].S())){selected=catalog.Normalize(selected.Concat(p["parcalar"].Items.Select(x=>x.S())));RefreshValues();}EditorGUILayout.EndHorizontal();
      var all=catalog.Data["parts"].Items.ToArray();foreach(var category in catalog.Data["categories"].Items)
      {
        string key=category[0].S();var options=all.Where(p=>p["kat"].S()==key).ToArray();int old=Array.FindIndex(options,p=>selected.Contains(p["id"].S()))+1;
        int next=EditorGUILayout.Popup(category[1].S(),old,new[]{"Stok"}.Concat(options.Select(p=>p["n"].S()+" — "+catalog.PartPrice(p["id"].S()))).ToArray());
        if(next!=old){selected=selected.Where(id=>!options.Any(p=>p["id"].S()==id)).Concat(next>0?new[]{options[next-1]["id"].S()}:Array.Empty<string>()).ToArray();RefreshValues();}
        if(next>0){EditorGUILayout.LabelField(options[next-1]["d"].S(),EditorStyles.wordWrappedLabel);EditorGUILayout.SelectableLabel(options[next-1]["e"].ToString(),EditorStyles.wordWrappedLabel,GUILayout.MinHeight(32));}
      }
      EditorGUILayout.LabelField("Türetilmiş sürüş verisi",EditorStyles.boldLabel);var physics=catalog.CreatePhysics(setup);EditorGUILayout.LabelField("Tork / son dişli",physics.PeakTorque.ToString("G8")+" Nm / "+physics.FinalDrive.ToString("G8"));
      EditorGUILayout.SelectableLabel(setup.Tuning.ToString(),EditorStyles.wordWrappedLabel,GUILayout.MinHeight(70));
      EditorGUILayout.HelpBox("Bu katalog inceleme içindir. GTTest ve TerrainTest seçimi değişmez. Sınıf ölçümü norm yardımını kullanır; sürüş parametreleri seçili yardım seviyesinden gelir.",MessageType.None);
      EditorGUILayout.EndScrollView();
    }
  }
}
