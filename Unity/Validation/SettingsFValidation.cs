using LastTurn.Core;

// F §7 Ayarlar görünüm modeli: satırlar mevcut tablolardan, yazım mevcut PlayerSettings/GarageCommand yoluyla; kayıt biçimi korunur.
internal static class SettingsFValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(root,"Assets/LastTurn/Resources/vehicle-catalog.json")));int checks=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("Ayarlar F: "+label);}
    SettingsRow Row(int section,PlayerSettings s,GarageState? state,string key,bool touch=false)=>SettingsViewModel.Rows(section,s,state,touch,false).First(r=>r.Key==key);

    var state=new GarageState(catalog);var s=new PlayerSettings();string career=state.Snapshot().ToString(),json=s.ToJson();
    Check(SettingsViewModel.Sections.Length==6&&SettingsViewModel.Sections[SettingsViewModel.Controls]=="KONTROLLER","Altı bölüm, sonuncusu Kontroller");
    for(int i=0;i<6;i++)foreach(bool touch in new[]{false,true})Check(SettingsViewModel.Rows(i,s,state,touch,false).Count>0,"Bölüm boş değil "+i+(touch?" dokunmatik":" masaüstü"));
    Check(state.Snapshot().ToString()==career&&s.ToJson()==json,"Satır okuma kaydı ve ayarı değiştirmez");

    // Windows: yalnız etkili gösterge (harita); dokunmatikte düzen + bütün parçalar.
    var desk=SettingsViewModel.Rows(2,s,state,false,false);Check(desk.Count==1&&desk[0].Key=="hud:harita"&&desk[0].Choices.Length==4,"Masaüstünde yalnız harita biçimi");
    var touchRows=SettingsViewModel.Rows(2,s,state,true,false);Check(touchRows.Count==1+PlayerSettings.HudParts.Length&&touchRows[0].Key=="hud","Dokunmatikte düzen ve parçalar");
    Check(SettingsViewModel.Rows(0,s,null,false,false).All(r=>r.Key!="assist"),"Kariyer kaydı yoksa sürüş yardımı satırı yok");
    Check(SettingsViewModel.Rows(0,s,state,false,true).Any(r=>r.Key=="hayalet")&&SettingsViewModel.Rows(0,s,state,false,false).All(r=>r.Key!="hayalet"),"Geliştirici hayaleti yalnız geliştirici yapısında");

    // Açık/kapalı anahtarları: seç, ←/→ uçta durur, Enter çevirir.
    foreach(var (section,key) in new[]{(0,"inv"),(0,"ss"),(0,"sm"),(0,"rh"),(1,"fov"),(1,"shk"),(4,"shd"),(4,"perf")})
    {
      bool was=s.On(key);var r=Row(section,s,state,key);Check(r.Choices.Length==2&&r.Selected==(was?1:0),"Anahtar gerçek değeri gösterir: "+key);
      SettingsViewModel.Activate(r,s,state);Check(s.On(key)!=was,"Enter çevirir: "+key);
      SettingsViewModel.Step(Row(section,s,state,key),1,s,state);Check(s.On(key),"→ açar: "+key);SettingsViewModel.Step(Row(section,s,state,key),1,s,state);Check(s.On(key),"→ uçta durur: "+key);
      SettingsViewModel.Step(Row(section,s,state,key),-1,s,state);Check(!s.On(key),"← kapatır: "+key);
      SettingsViewModel.Choose(Row(section,s,state,key),was?1:0,s,state);Check(s.On(key)==was,"Fare seçimi geri alır: "+key);
    }

    // Kamera, giriş biçimleri, gösterge düzeni ve parçası.
    for(int i=0;i<PlayerSettings.CameraNames.Length;i++){SettingsViewModel.Choose(Row(1,s,state,"cam"),i,s,state);Check(s.Camera==i&&Row(1,s,state,"cam").Selected==i,"Kamera "+PlayerSettings.CameraNames[i]);}
    SettingsViewModel.Activate(Row(1,s,state,"cam"),s,state);Check(s.Camera==0,"Kamera Enter sonda başa döner");
    for(int i=0;i<PlayerSettings.SteerNames.Length;i++){SettingsViewModel.Choose(Row(5,s,state,"steer"),i,s,state);Check(s.Steer==PlayerSettings.SteerNames[i].Key,"Direksiyon girişi "+s.Steer);}
    Check(SettingsViewModel.Rows(5,s,state,true,false).Any(r=>r.Key=="tlt")&&SettingsViewModel.Rows(5,s,state,false,false).All(r=>r.Key!="tlt"),"Çevirme açısı yalnız dokunmatik + telefonu çevir");
    var tilt=Row(5,s,state,"tlt",true);SettingsViewModel.SetValue(tilt,99,s);Check(s["tlt"]==60,"Çevirme açısı üst sınır");SettingsViewModel.SetValue(tilt,3,s);Check(s["tlt"]==15,"Çevirme açısı alt sınır");
    SettingsViewModel.Choose(Row(5,s,state,"steer"),0,s,state);
    for(int i=0;i<PlayerSettings.GasNames.Length;i++){SettingsViewModel.Choose(Row(5,s,state,"gas"),i,s,state);Check(s.Gas==PlayerSettings.GasNames[i].Key,"Gaz girişi "+s.Gas);}
    SettingsViewModel.Choose(Row(5,s,state,"gas"),0,s,state);Check(s.Steer=="btn"&&s.Gas=="btn"&&Row(5,s,state,"steer").Description.Contains("Windows"),"Windows klavye girişi notu ve geri dönüş");
    for(int i=0;i<PlayerSettings.HudPresetNames.Length;i++){SettingsViewModel.Choose(Row(2,s,state,"hud",true),i,s,state);Check(s.HudLayout==PlayerSettings.HudPresetNames[i].Key,"Gösterge düzeni "+s.HudLayout);}
    SettingsViewModel.Choose(Row(2,s,state,"hud:harita"),3,s,state);Check(s.Hud["harita"]=="kapali"&&s.HudLayout=="ozel"&&Row(2,s,state,"hud",true).Selected==-1,"Harita kapalı → özel düzen");
    SettingsViewModel.Step(Row(2,s,state,"hud",true),1,s,state);Check(s.HudLayout==PlayerSettings.HudPresetNames[1].Key,"Özel düzenden → ilk komşu düzene geçer");

    // Ses: %5 adım, 0..100 sınırı, fare değeri yuvarlanır.
    foreach(var v in PlayerSettings.Volumes)
    {
      var r=Row(3,s,state,v.Key);Check(r.Slider&&r.Value==s[v.Key],"Ses sürgüsü gerçek değer: "+v.Key);
      SettingsViewModel.SetValue(r,47,s);Check(s[v.Key]==45,"Fare değeri %5'e yuvarlanır: "+v.Key);
      SettingsViewModel.Step(Row(3,s,state,v.Key),1,s,state);Check(s[v.Key]==50,"→ %5 artırır: "+v.Key);
      SettingsViewModel.SetValue(r,140,s);SettingsViewModel.Step(Row(3,s,state,v.Key),1,s,state);Check(s[v.Key]==100,"Üst sınır: "+v.Key);
      SettingsViewModel.SetValue(r,-20,s);SettingsViewModel.Step(Row(3,s,state,v.Key),-1,s,state);Check(s[v.Key]==0,"Alt sınır: "+v.Key);
    }

    // Sürüş yardımı kariyer kaydında: komut döner, mevcut GarageCommand uygular; aynı seviye komut üretmez.
    double money=state.Balance;var assist=Row(0,s,state,"assist");Check(assist.Choices.Length==GarageViewModel.AssistLevels(state).Length&&assist.Selected>=0,"Yardım seviyeleri mevcut katalogdan");
    Check(SettingsViewModel.Choose(assist,assist.Selected,s,state)==null,"Aynı yardım seviyesi komut üretmez");
    for(int i=0;i<assist.Choices.Length;i++)
    {
      var cmd=SettingsViewModel.Choose(Row(0,s,state,"assist"),i,s,state);if(i==Row(0,s,state,"assist").Selected){Check(cmd==null,"Seçili seviye");continue;}
      Check(cmd!=null&&cmd.Apply(state)&&state.AssistLevel==GarageViewModel.AssistLevels(state)[i].Key&&Row(0,s,state,"assist").Selected==i,"Yardım seviyesi komutla kaydedilir: "+assist.Choices[i]);
    }
    Check(state.Balance==money&&state.Snapshot()["assistLevel"].S()==state.AssistLevel,"Yardım değişimi para/ilerlemeye dokunmaz, kayda yazılır");

    // Kayıt biçimi: değişen her alan mevcut JSON yolundan geri okunur.
    var back=PlayerSettings.Load(s.ToJson());Check(back.ToJson()==s.ToJson()&&back.Camera==s.Camera&&back.Hud["harita"]==s.Hud["harita"]&&back["ses"]==s["ses"],"Ayarlar mevcut kayıt biçiminden aynen geri okunur");
    Console.WriteLine($"Ayarlar F: {checks} kontrol; altı bölüm, anahtar/seçenek/sürgü sınırları, yardım komutu ve kayıt biçimi.");
  }
}
