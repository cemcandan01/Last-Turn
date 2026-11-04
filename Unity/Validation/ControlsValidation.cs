using LastTurn.Core;

// P5 kontroller ve kalıcı tercihler: TS fizikGirdisi/tiltRoll/tiltSteer, ayarlariYukle/Kaydet; dokunma ve dosya kaydı sınırları.
internal static class ControlsValidation
{
  public static void Run()
  {
    var f=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/controls-0.8.18.json")));
    int checks=0;double worst=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException("Kontroller: "+label);}
    void Near(double a,double e,string label){double d=Math.Abs(a-e);worst=Math.Max(worst,d);Check(d<=1e-12,label+" TS "+e+" C# "+a);}
    Check(f["baseline"].S()==VehicleCatalog.Baseline,"Sabit TS kaynak SHA");
    var defaults=new PlayerSettings();
    foreach(var k in PlayerSettings.Keys)Near(defaults[k],f["defaults"]["set"][k].N(),"Varsayılan "+k);
    Check(f["defaults"]["cams"].Items.Select(x=>x.S()).SequenceEqual(PlayerSettings.CameraNames),"Kamera kipleri");
    foreach(var p in f["defaults"]["hud"].Fields){var c=new PlayerSettings();c.ApplyPreset(p.Key);foreach(var (part,_) in PlayerSettings.HudParts)Check(c.Hud[part]==p.Value["p"][part].S(),"HUD düzeni "+p.Key+"."+part);Check(c.HudLayout==p.Key,"Düzen adı "+p.Key);}
    int n=0;
    foreach(var row in f["physics"].Items)
    {
      var c=row["input"];var s=new PlayerSettings{Steer=c["steer"].S(),Gas=c["gas"].S()};s.Set["inv"]=c["inv"].N();s.Set["tlt"]=c["tlt"].N();
      var d=new DrivingControls{L=c["l"].N(),R=c["r"].N(),G=c["g"].N(),B=c["b"].N(),Sa=c["sa"].N(),Dbr=c["dbr"].N(),TiltBeta=c["beta"].N(),TiltGamma=c["gamma"].N(),TiltZero=c["zero"].N()};
      double o=c["rot"].N();string l="girdi "+n++;
      Near(DrivingControls.TiltRoll(d.TiltBeta,d.TiltGamma,o),row["roll"].N(),l+" eğim");Near(d.TiltSteer(s,o),row["steer"].N(),l+" eğim direksiyonu");
      var q=d.Physics(s,o);var e=row["output"];
      Near(q.Steering,e["tg"].N(),l+" direksiyon");Near(q.Throttle,e["g"].N(),l+" gaz");Near(q.Brake,e["b"].N(),l+" fren");
      Check(q.AnalogSteering==e["analogDireksiyon"].B()&&q.AnalogThrottle==e["analogGaz"].B()&&q.Handbrake==e["dbr"].B(),l+" bayraklar");
    }
    int loads=0,guarded=0;
    foreach(var row in f["loads"].Items)
    {
      string? text=row["text"].ToString()=="null"?null:row["text"].S();var s=PlayerSettings.Load(text);string l="kayıt "+(text??"yok");loads++;
      foreach(var k in PlayerSettings.Keys)
      {
        var e=row["set"][k];double expected=e.IsNumber?e.N():e.ToString()=="true"?1:e.ToString()=="false"?0:defaults[k];
        if(!e.IsNumber&&e.ToString()!="true"&&e.ToString()!="false")guarded++;Near(s[k],expected,l+" "+k);
      }
      string steer=row["CT"]["steer"].S(),gas=row["CT"]["gas"].S();
      if(!PlayerSettings.SteerModes.Contains(steer)){guarded++;steer="btn";}if(!PlayerSettings.GasModes.Contains(gas)){guarded++;gas="btn";}
      Check(s.Steer==steer&&s.Gas==gas,l+" kontrol kipi");
      foreach(var (part,_) in PlayerSettings.HudParts)Check(s.Hud[part]==row["hud"][part].S(),l+" HUD "+part);Check(s.HudLayout==row["layout"].S(),l+" düzen adı");
      var cam=row["cam"];int camera=cam.IsNumber&&cam.N()>=0&&cam.N()<4&&cam.N()==Math.Floor(cam.N())?(int)cam.N():0;if(cam.IsNumber&&camera!=(int)cam.N())guarded++;
      Check(s.Camera==camera,l+" kamera");Check((s.AssistLevel??"")==(row["lk"].ToString()=="null"?"":row["lk"].S()),l+" yardım seviyesi");
      // TS ayarlariKaydet biçimi: aynı alanlar; Unity kaydı yeniden yüklenince aynı tercihler.
      s.AssistLevel="norm";var saved=CatalogNode.Parse(s.ToJson());var ts=row["saved"];
      Check(saved.Fields.Select(x=>x.Key).SequenceEqual(new[]{"set","CT","hud","cam","lk"})&&ts.Has("set")&&ts.Has("CT")&&ts.Has("hud")&&ts.Has("lk"),l+" kayıt alanları");
      foreach(var (part,_) in PlayerSettings.HudParts)Check(saved["hud"][part].S()==ts["hud"][part].S(),l+" kayıt HUD "+part);
      var back=PlayerSettings.Load(s.ToJson());Check(back.ToJson()==s.ToJson(),l+" gidiş-dönüş");
    }
    Check(guarded>=5,"Yanlış türlü TS alanları varsayılanda tutuldu");
    // TS kontroller.ts dokunma: ekran direksiyonu ±2,1 rad, bırakınca orta; analog pedal ölü bölge 0,08 ve 0,9'da tam.
    var w=new DrivingControls();w.WheelTurn(1.05);Near(w.Sa,-.5,"direksiyon yarım sol");w.WheelTurn(-1.05);Near(w.Sa,0,"direksiyon geri döner");
    w.WheelRelease();Check(w.Sa==0&&w.WheelAngle==0,"direksiyon bırakınca ortalanır");
    w.WheelTurn(2);w.WheelTurn(1);Near(w.WheelAngle,2.1,"direksiyon sınırı");Near(w.Sa,-1,"tam direksiyon");
    w.Pedal(.05);Check(w.G==0&&w.B==0,"pedal ölü bölgesi");w.Pedal(.9);Near(w.G,1,"pedal tam gaz");w.Pedal(-.49);Near(w.B,.5,"pedal yarım fren");Check(w.G==0,"pedal fren gazı bırakır");
    w.PedalRelease();Check(w.G==0&&w.B==0,"pedal bırakınca boş");
    var auto=new PlayerSettings{Gas="auto"};w.AutoGas(auto,true);Check(w.G==1,"otomatik gaz");w.B=1;w.AutoGas(auto,true);Check(w.G==0,"otomatik gazda fren gazı keser");
    w.B=0;w.G=0;w.AutoGas(auto,false);Check(w.G==0,"menüde otomatik gaz yok");
    w.L=1;w.Dbr=1;w.Sa=.4;w.Reset();Check(w.L==0&&w.Dbr==0&&w.Sa==0,"girdiSifirla");
    w.TiltTime=10;Check(!w.Calibrate(12,0),"eski sensör okumasında ortalama reddi");w.TiltGamma=12;Check(w.Calibrate(10.5,0)&&w.TiltZero!=0,"ortala sıfır noktası alır");
    // Dosya kaydı: yazılamayan/bozuk dosya varsayılanı verir, bozuk dosya üzerine yazılmaz.
    string dir=Path.Combine(Path.GetTempPath(),"lt-ayar-"+Guid.NewGuid().ToString("N"));var store=new PlayerSettingsStore(dir);
    try
    {
      Check(store.Load().ToJson()==new PlayerSettings().ToJson(),"dosya yokken varsayılan");
      var a=new PlayerSettings{Steer="wheel",Gas="analog",Camera=3};a.Set["ses"]=40;a.ApplyPreset("sade");Check(store.Save(a),"kaydet");
      Check(store.Load().ToJson()==a.ToJson()&&!File.Exists(store.FilePath+".tmp"),"yeniden yükle aynı");a.Set["muz"]=0;Check(store.Save(a)&&store.Load()["muz"]==0,"üzerine güvenli yaz");
      File.WriteAllText(store.FilePath,"{bozuk");Check(store.Load().ToJson()==new PlayerSettings().ToJson()&&File.ReadAllText(store.FilePath)=="{bozuk","bozuk dosya varsayılan, silinmez");
    }
    finally{if(Directory.Exists(dir))Directory.Delete(dir,true);}
    Console.WriteLine($"Kontroller: {checks} koşul; {n} TS fizik girdisi, {loads} ayar kaydı ({guarded} yanlış türlü alan varsayılanda), dokunma/otomatik gaz/ortalama/dosya sınırları; en büyük fark {worst:G3}.");
  }
}
