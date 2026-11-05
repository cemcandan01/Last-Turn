using LastTurn.Core;

// P5 HUD: TS miniharita izdüşümü (oracle) ve dar ekranda çakışmasız geçici HUD yerleşimi.
internal static class HudValidation
{
  public static void Run()
  {
    var f=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/minimap-0.8.18.json")));
    int checks=0,layouts=0;double worst=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException("HUD: "+label);}
    Check(f["baseline"].S()==VehicleCatalog.Baseline,"Sabit TS kaynak SHA");
    foreach(var c in f["cases"].Items)
    {
      var m=new MiniMap();double h=c["h"].N();m.Frame(c["x"].N(),c["z"].N(),Math.Sin(h),Math.Cos(h),c["v"].N(),1/60.0);
      foreach(var p in c["points"].Items){var q=m.Project(p["wx"].N(),p["wz"].N());double d=Math.Max(Math.Abs(q.X-p["p"][0].N()),Math.Abs(q.Y-p["p"][1].N()));worst=Math.Max(worst,d);Check(d<1e-9,"mmDonustur fark "+d);}
    }
    var mm=new MiniMap();mm.Frame(0,0,0,1,0,1/60.0);Check(mm.Width==180,"Duruşta 180 m");mm.Frame(0,0,0,1,60,.25);Check(Math.Abs(mm.Width-(180+80*.5))<1e-9,"Genişlik hıza yumuşak açılır");
    var ahead=mm.Marker(0,20);Check(!ahead.Edge&&Math.Abs(ahead.X-120)<1e-9&&ahead.Y<164,"Öndeki işaret imlecin üstünde");
    var far=mm.Marker(-5000,0);Check(far.Edge&&Math.Abs(far.X-(240-7))<1e-9&&Math.Abs(far.Y-164)<1e-9,"Sağdaki uzak işaret (TS + sol) sağ kenara sabitlenir");
    var back=mm.Marker(0,-5000);Check(back.Edge&&Math.Abs(back.Y-(240-7))<1e-9,"Arkadaki işaret alt kenara");
    Check(mm.Car(0,-5000)==null&&mm.Car(0,10)!=null,"Görüntü dışındaki araç çizilmez");
    var seg=mm.Track(new List<(double,double)>{(0,-100),(0,-10),(0,50),(0,200),(0,500)});Check(seg.Count==2&&seg[0].Scale>seg[1].Scale,"Pist çizgisi menzil sınırı ve derinlikle daralma");
    // Yerleşim: iPhone 13 yatay/dikey (pt ve px), küçük ve geniş ekran × kontrol kipleri × durumlar
    foreach(var (w,hh) in new[]{(844.0,390.0),(2532.0,1170.0),(390.0,844.0),(640.0,480.0),(1920.0,1080.0),(1280.0,720.0)})
    foreach(var steer in PlayerSettings.SteerModes)foreach(var gas in PlayerSettings.GasModes)foreach(var map in new[]{"kare","kucuk","kapali"})
    foreach(var state in new[]{"serbest","yaris","mutant-yaris","mutant-dunya","drag"})
    {
      var i=new HudLayoutInput{Width=w,Height=hh,Steer=steer,Gas=gas,Map=map,Racing=state!="serbest"&&state!="mutant-dunya",Mutant=state.StartsWith("mutant"),Opponent=state!="serbest",
        Manual=state=="drag",DragBar=state=="drag",DesktopHint=true,Info=state=="serbest",Skills=state.StartsWith("mutant")?new[]{"aktif","tetikli","aktif"}:Array.Empty<string>()};
      var r=HudLayout.Compute(i);layouts++;string l=w+"x"+hh+" "+steer+"/"+gas+"/"+map+"/"+state;
      var o=HudLayout.Overlaps(r).FirstOrDefault();Check(o==default,l+" çakışma "+o.A+"-"+o.B);
      foreach(var p in r)Check(p.Value.Inside(w,hh)&&p.Value.W>0&&p.Value.H>0,l+" ekran dışı "+p.Key);
      foreach(var k in new[]{"Settings","Pause","Respawn","Camera"})Check(r.ContainsKey(k),l+" üst düğme "+k);
      Check(r.ContainsKey(gas=="analog"?"Pedal":"Brake")&&(gas!="btn"||r.ContainsKey("Gas")),l+" pedal");
      if(i.Mutant)Check(r.ContainsKey("Nitro")&&r.ContainsKey("Skill0")&&r.ContainsKey("Passive1")&&r.ContainsKey("Skill2")&&r.ContainsKey("MutantBar"),l+" Mutant yuvaları");
      if(i.Racing)Check(r.ContainsKey("RacePanel")&&r["RacePanel"].H>=HudLayout.Unit(w,hh)*1.2,l+" yarış paneli yeterli");
      if(map!="kapali"&&w>=hh)Check(r.ContainsKey("Map"),l+" miniharita yatayda görünür");
      if(state=="drag")Check(r.ContainsKey("ShiftUp")&&r.ContainsKey("DragBar"),l+" drag vites ve devir çubuğu");
    }
    // F masaüstü (dokunmatik ekran yok): sürüş/üst simge tuşu yok; harita sağ üst, hız sağ alt, süre üst orta; alt orta araç için boş
    int desktop=0;var touchKeys=new[]{"Left","Right","Wheel","Calibrate","Gas","Pedal","Brake","Handbrake","ShiftUp","ShiftDown","Settings","Pause","Respawn","Camera"};
    foreach(var (w,hh) in new[]{(1920.0,1080.0),(1280.0,720.0),(2560.0,1440.0),(1366.0,768.0),(1024.0,768.0),(3440.0,1440.0),(844.0,390.0)})
    foreach(var map in new[]{"kare","kucuk","kapali"})foreach(var hint in new[]{true,false})
    foreach(var state in new[]{"serbest","yaris","mutant-yaris","mutant-dunya","drag"})
    {
      var i=new HudLayoutInput{Width=w,Height=hh,Map=map,Touch=false,Racing=state!="serbest"&&state!="mutant-dunya",Mutant=state.StartsWith("mutant"),Opponent=state!="serbest",
        Manual=state=="drag",DragBar=state=="drag",DesktopHint=hint,Info=state=="serbest",Skills=state.StartsWith("mutant")?new[]{"aktif","tetikli","aktif","aktif"}:Array.Empty<string>()};
      var r=HudLayout.Compute(i);desktop++;string l="masaüstü "+w+"x"+hh+" "+map+"/"+state+(hint?"/ipucu":"");
      var o=HudLayout.Overlaps(r).FirstOrDefault();Check(o==default,l+" çakışma "+o.A+"-"+o.B);
      foreach(var p in r)Check(p.Value.Inside(w,hh)&&p.Value.W>0&&p.Value.H>0,l+" ekran dışı "+p.Key);
      foreach(var k in touchKeys)Check(!r.ContainsKey(k),l+" dokunmatik tuş yok: "+k);
      // aracın durduğu alt orta (yatay %42–58, alt %35) boş
      var car=new HudRect(w*.42,hh*.65,w*.16,hh*.35);foreach(var p in r)Check(!p.Value.Overlaps(car),l+" alt orta boş: "+p.Key);
      Check(r.ContainsKey("Speed")&&r["Speed"].Right>w*.8&&r["Speed"].Bottom>hh*.8,l+" hız sağ altta");
      if(map!="kapali")Check(r.ContainsKey("Map")&&r["Map"].X>w*.7&&r["Map"].Y<hh*.1,l+" miniharita sağ üstte");else Check(!r.ContainsKey("Map"),l+" harita kapalı");
      if(i.Racing)Check(r.ContainsKey("Timer")&&Math.Abs(r["Timer"].X+r["Timer"].W/2-w/2)<1e-6&&r.ContainsKey("Title"),l+" süre üst ortada, pist adı sol üstte");
      if(i.Mutant)Check(r.ContainsKey("Nitro")&&r.ContainsKey("Skill0")&&r.ContainsKey("Passive1")&&r.ContainsKey("Skill3")&&r.ContainsKey("MutantBar")&&(!i.Racing||r["Title"].Y>=r["MutantBar"].Bottom),l+" Mutant yuvaları ve durum çubuğu");
      if(state=="drag")Check(r.ContainsKey("DragBar"),l+" drag devir çubuğu");
      if(i.Info)Check(r.ContainsKey("Info")&&r["Info"].H>=HudLayout.Unit(w,hh),l+" serbest sürüş bilgisi");
    }
    Console.WriteLine($"HUD masaüstü (F): {desktop} yerleşim (7 ekran × 3 harita × ipucu açık/kapalı × 5 durum) dokunmatik tuşsuz, çakışmasız, alt orta boş.");
    Console.WriteLine($"HUD: {checks} koşul; miniharita {f["cases"].Items.Count()} TS çerçevesi (fark {worst:G3}) + kenar/araç/pist sınırları; {layouts} yerleşim (6 ekran × 3 direksiyon × 3 gaz × 3 harita × 5 durum) çakışmasız ve ekran içinde.");
  }
}
