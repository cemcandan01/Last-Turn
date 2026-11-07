using LastTurn.Core;

// F §8 Duraklatma ve §9 Sonuç sunum verisi: beş türde duraklatma satırları, sonuç başlığı/farkı, seviye çubuğu ve sıradaki kariyer yarışı.
internal static class DriveMenuFValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));string Res(string f)=>File.ReadAllText(Path.Combine(root,"Assets/LastTurn/Resources/"+f));
    var tracks=new TrackCatalog(Res("track-catalog.json"));var races=new RaceEventCatalog(Res("race-events.json"));var vehicles=new VehicleCatalog(Res("vehicle-catalog.json"));int checks=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("Duraklatma/Sonuç F: "+label);}

    foreach(var type in TestPanelModel.Types)
    {
      var e=races.Find(type,1);var s=new RaceSession(e,tracks.Tracks[e.Index],true,0);
      var stats=DriveMenuModel.PauseStats(s,0);string progress=DriveMenuModel.PauseProgress(s,0);
      Check(stats[0].Label==(type=="dp"?"Puan":"Süre")&&stats[0].Value==RaceViewModel.Hud(s,0).Big,"İlk satır HUD büyük değeri: "+type);
      Check(stats.Any(r=>r.Label=="Hedef")==(e.Limit>0),"Hedef satırı yalnız hedefli yarışta: "+type);
      Check(stats.Any(r=>r.Label=="En iyi tur")==(e.Laps>0&&type!="dp"),"En iyi tur yalnız turlu zaman yarışında: "+type);
      if(type=="dp")Check(stats.First(r=>r.Label=="Hedef").Value.EndsWith(" puan"),"Drift hedefi puan");
      if(type=="dg")Check(stats.First(r=>r.Label=="Hedef").Value.EndsWith(" sn"),"Drag hedefi saniye");
      Check(progress!=""&&!progress.Contains(" · ")&&RaceViewModel.Hud(s,0).Sub.StartsWith(progress),"İlerleme HUD alt satırının ilk parçası: "+type+" "+progress);
      var h=DriveMenuModel.Headline(s);
      if(type=="dp")Check(!h.Passed&&h.Value=="0"&&h.Delta.StartsWith("−")&&h.DeltaText=="hedefin altında","Drift sıfır puan hedefi geçmez");
      else Check(h.Passed&&h.Delta.StartsWith("−")&&h.DeltaText=="hedefin altında"&&h.Value==(type=="dg"?"0.000":RaceSession.FormatTime(0)),"Zaman yarışında hedefin altı iyi: "+type);
      Check(s.State==RaceState.Countdown&&s.Time==0,"Sunum okuması oturumu değiştirmez: "+type);
    }

    // Seviye çubuğu: dolu kısım ve bu yarıştan gelen kısım; seviye atlanınca yeni seviyedeki XP'nin tamamı bu yarıştandır.
    int lv=5;double start=VehicleCatalog.LevelBase(lv),next=VehicleCatalog.LevelBase(lv+1),mid=start+(next-start)/2;
    var (fill,gain)=DriveMenuModel.LevelBar(lv,mid,next,(next-start)/4);Check(Math.Abs(fill-.5)<1e-9&&Math.Abs(gain-.25)<1e-9,"Yarı dolu çubuk, çeyreği bu yarıştan");
    (fill,gain)=DriveMenuModel.LevelBar(lv,start+10,next,500);Check(gain==fill&&fill>0,"Seviye atlayınca kazanç dolulukla sınırlı");
    (fill,gain)=DriveMenuModel.LevelBar(1,0,VehicleCatalog.LevelBase(2),0);Check(fill==0&&gain==0,"Boş başlangıç");

    // Sıradaki kariyer yarışı: aynı tür, sonraki açık kariyer pisti; kilitli/ödülsüz atlanır, son pistte yok.
    RaceEventRow Row(string key,bool open,bool career)=>new RaceEventRow{Key=key,Name=key,Open=open,Career=career};
    var rows=new[]{Row("gp_1",true,true),Row("gp_2",true,false),Row("gp_3",true,true),Row("gp_4",false,true),Row("rx_1",true,true)};
    Check(DriveMenuModel.NextCareerEvent(rows,"gp_1")?.Key=="gp_3","Ödülsüz deneme atlanır");
    Check(DriveMenuModel.NextCareerEvent(rows,"gp_3")==null,"Kilitli pist sıradaki olmaz; tür dışına geçilmez");
    Check(DriveMenuModel.NextCareerEvent(rows,"rx_1")==null&&DriveMenuModel.NextCareerEvent(rows,"yok")==null&&DriveMenuModel.NextCareerEvent(rows,"gp_9")==null,"Son pist / bozuk anahtar");
    var state=new GarageState(vehicles);var events=CareerMenuModel.Read(state,new RaceProfile(),races).Events;
    foreach(var e in races.Events)Check(events.Any(r=>r.Key==DriveMenuModel.CareerKey(e)),"Oturum etkinliği kariyer satırına eşlenir: "+e.Key);
    foreach(var e in events){var n=DriveMenuModel.NextCareerEvent(events,e.Key);if(n!=null)Check(n.Open&&n.Career&&n.Key.Split('_')[0]==e.Key.Split('_')[0],"Gerçek kariyerde sıradaki açık ve aynı türde: "+e.Key);}
    Console.WriteLine($"Duraklatma/Sonuç F: {checks} kontrol; beş tür duraklatma satırı, sonuç farkı, seviye çubuğu ve sıradaki kariyer yarışı.");
  }
}
