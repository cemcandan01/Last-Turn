#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // TS oyun/ayarlar.ts: mekanik seçenekler (set), kontrol modu (CT), HUD parçaları, kamera kipi; kayıt anahtarı lt_ayar.
  // Yükleme TS Object.assign anlamını korur; yalnız türü bozuk alan (yazı yerine sayı vb.) varsayılanda kalır.
  // Yardım seviyesi (lk) Unity'de mevcut yardım kaydında tutulur; burada yalnız kayıt biçimi için taşınır.
  public sealed class PlayerSettings
  {
    public static readonly string[] Keys={"ss","sm","fov","shk","inv","tlt","ac","shd","perf","ses","muz","rh","hayalet"};
    private static readonly double[] Defaults={1,1,1,1,0,38,1,1,0,85,70,1,0};
    public static readonly string[] SteerModes={"btn","wheel","tilt"},GasModes={"btn","analog","auto"};
    public static readonly string[] CameraNames={"Takip","Uzak takip","Kaput","Kokpit"};
    public static readonly (string Part,string[] Values)[] HudParts={
      ("hiz",new[]{"kose","kadran","bant","sade"}),("sayac",new[]{"panel","yazi"}),("tus",new[]{"panel","simge"}),
      ("harita",new[]{"kare","yuvarlak","kucuk","kapali"}),("debriyaj",new[]{"acik","kapali"})};
    public static readonly Dictionary<string,string[]> HudPresets=new Dictionary<string,string[]>(StringComparer.Ordinal){
      ["kose"]=new[]{"kose","panel","panel","kare","acik"},["kadran"]=new[]{"kadran","panel","panel","yuvarlak","acik"},
      ["bant"]=new[]{"bant","panel","panel","kare","acik"},["sade"]=new[]{"sade","yazi","simge","kucuk","acik"}};
    // TS ayarlar-ekrani.ts / ayarlar.ts görünüm metinleri (TOG, STEER, GASM, CAMO, SESLER, HUD_PARCALARI).
    public static readonly (string Key,string Name,string Description)[] Toggles={
      ("inv","Direksiyon yönünü ters çevir","Sağ ve sol tuşlarının yönünü değiştirir"),("ss","Hıza duyarlı direksiyon","Hızlandıkça direksiyon açısı azalır"),
      ("sm","Direksiyon yumuşatma","Tuşa basınca direksiyon kademeli döner"),("fov","Hıza göre görüş açısı","Hızlandıkça görüş genişler"),
      ("shd","Gölgeler","Kapatmak eski telefonlarda akıcılığı artırır"),("shk","Hız sarsıntısı","Yüksek hızda kamera hafif titrer"),
      ("rh","Rekor hayaleti","Pistteki en iyi derecen saydam araç olarak seninle yarışır"),("perf","Performans göstergesi","Ekranın üstünde kare hızı, kare süresi ve çizim sayısı")};
    public static readonly (string Key,string Name,string Description) DeveloperGhost=("hayalet","Hayalet araç (geliştirici)","Uzak araç denemesi: aracın 2 sn geriden izler");
    public static readonly (string Key,string Name,string Description)[] SteerNames={("btn","Tuşlar","Sağ ve sol tuşları"),("wheel","Direksiyon","Ekrandaki direksiyonu çevir"),("tilt","Telefonu çevir","Telefonu direksiyon gibi yatır")};
    public static readonly (string Key,string Name,string Description)[] GasNames={("btn","Gaz tuşu","Basınca tam gaz"),("analog","Analog pedal","Ortası boş: yukarı kaydır gaz, aşağı kaydır fren. Kalkışta tam gaz patinaj yapar"),("auto","Otomatik gaz","Araç kendi hızlanır, sen frenle")};
    public static readonly (string Key,string Name,string Description)[] Volumes={("ses","Oyun sesleri","Motor, lastik, çarpma, menü tıkları"),("muz","Müzik","Menüde ve garajda çalan müzik")};
    public static readonly Dictionary<string,(string Name,Dictionary<string,string> Values)> HudNames=new Dictionary<string,(string,Dictionary<string,string>)>{
      ["hiz"]=("Hız",new Dictionary<string,string>{["kose"]="Panel",["kadran"]="Kadran",["bant"]="Üstte",["sade"]="Yazı"}),["sayac"]=("Sayaç",new Dictionary<string,string>{["panel"]="Panel",["yazi"]="Yazı"}),
      ["tus"]=("Tuşlar",new Dictionary<string,string>{["panel"]="Panel",["simge"]="Simge"}),["harita"]=("Harita",new Dictionary<string,string>{["kare"]="Kare",["yuvarlak"]="Yuvarlak",["kucuk"]="Küçük",["kapali"]="Kapalı"}),
      ["debriyaj"]=("El freni",new Dictionary<string,string>{["acik"]="Açık",["kapali"]="Kapalı"})};
    public static readonly (string Key,string Name,string Description)[] HudPresetNames={("kose","Köşe","Hız sağda, gaz tuşunun üstünde"),("kadran","Kadran","Yuvarlak hız kadranı, yuvarlak harita"),("bant","Bant","Hız üstte ortada, alt taraf boş"),("sade","Sade","Panelsiz, en az gösterge")};
    public readonly Dictionary<string,double> Set=new Dictionary<string,double>(StringComparer.Ordinal);
    public readonly Dictionary<string,string> Hud=new Dictionary<string,string>(StringComparer.Ordinal);
    public string Steer="btn",Gas="btn";
    public int Camera;
    public string? AssistLevel;
    public PlayerSettings(){for(int i=0;i<Keys.Length;i++)Set[Keys[i]]=Defaults[i];ApplyPreset("kose");}
    public double this[string key]=>Set[key];
    public bool On(string key)=>Set[key]!=0;
    public void ApplyPreset(string name){var p=HudPresets[name];for(int i=0;i<HudParts.Length;i++)Hud[HudParts[i].Part]=p[i];}
    /// TS hudDuzeni: seçim bir hazır düzene denk geliyorsa adı, değilse "ozel".
    public string HudLayout=>HudPresets.FirstOrDefault(p=>HudParts.Select((h,i)=>Hud[h.Part]==p.Value[i]).All(x=>x)).Key??"ozel";
    /// TS ayarlariYukle (okuJson + Object.assign). Bozuk metin TS gibi varsayılanlara düşer.
    public static PlayerSettings Load(string? json)
    {
      var s=new PlayerSettings();CatalogNode k;
      try{k=CatalogNode.Parse(string.IsNullOrEmpty(json)?"{}":json!);}catch(FormatException){return s;}
      var set=k["set"];
      foreach(var key in Keys)
      {
        if(!set.Has(key))continue;var v=set[key];
        if(v.IsNumber&&double.IsFinite(v.N()))s.Set[key]=v.N();
        else if(v.ToString()=="true"||v.ToString()=="false")s.Set[key]=v.B()?1:0;
      }
      var ct=k["CT"];
      if(SteerModes.Contains(ct["steer"].S()))s.Steer=ct["steer"].S();
      if(GasModes.Contains(ct["gas"].S()))s.Gas=ct["gas"].S();
      var hud=k["hud"];
      if(hud.S()!=""){if(HudPresets.ContainsKey(hud.S()))s.ApplyPreset(hud.S());}
      else foreach(var (part,values) in HudParts)if(values.Contains(hud[part].S()))s.Hud[part]=hud[part].S();
      var cam=k["cam"];if(cam.IsNumber&&cam.N()>=0&&cam.N()<CameraNames.Length&&cam.N()==Math.Floor(cam.N()))s.Camera=(int)cam.N();
      if(k["lk"].S()!="")s.AssistLevel=k["lk"].S();
      return s;
    }
    /// TS ayarlariKaydet: {set, CT, hud, cam, lk}.
    public string ToJson()
    {
      var n=CatalogNode.Obj();var set=CatalogNode.Obj();foreach(var key in Keys)set.Set(key,CatalogNode.Num(Set[key]));n.Set("set",set);
      var ct=CatalogNode.Obj();ct.Set("steer",CatalogNode.Str(Steer));ct.Set("gas",CatalogNode.Str(Gas));n.Set("CT",ct);
      var hud=CatalogNode.Obj();foreach(var (part,_) in HudParts)hud.Set(part,CatalogNode.Str(Hud[part]));n.Set("hud",hud);
      n.Set("cam",CatalogNode.Num(Camera));if(AssistLevel!=null)n.Set("lk",CatalogNode.Str(AssistLevel));return n.ToString();
    }
    public PlayerSettings Clone()=>Load(ToJson());
  }

  // Kalıcı ayar dosyası: geçici dosyaya yazılıp yer değiştirilir; okunamayan/bozuk dosya varsayılana düşer ve üzerine yazılmaz.
  public sealed class PlayerSettingsStore
  {
    public readonly string FilePath;
    public string? LastError {get;private set;}
    public PlayerSettingsStore(string directory){FilePath=System.IO.Path.Combine(directory,"ayarlar.json");}
    public PlayerSettings Load()
    {
      LastError=null;
      try{return System.IO.File.Exists(FilePath)?PlayerSettings.Load(System.IO.File.ReadAllText(FilePath)):new PlayerSettings();}
      catch(Exception e)when(e is System.IO.IOException||e is UnauthorizedAccessException){LastError=e.Message;return new PlayerSettings();}
    }
    public bool Save(PlayerSettings s)
    {
      LastError=null;
      try
      {
        System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(FilePath)!);string temp=FilePath+".tmp";
        System.IO.File.WriteAllText(temp,s.ToJson());if(System.IO.File.Exists(FilePath))System.IO.File.Replace(temp,FilePath,null);else System.IO.File.Move(temp,FilePath);return true;
      }
      catch(Exception e)when(e is System.IO.IOException||e is UnauthorizedAccessException){LastError=e.Message;return false;}
    }
  }
}
