using LastTurn.Core;

// P5 ses altyapısı: TS ses.ts sesTick kuralları (seviye eğrisi, kip kazançları, lastik/savrulma hedefleri, olay tetikleri).
internal static class AudioValidation
{
  public static void Run()
  {
    int checks=0;void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException("Ses: "+label);}
    bool Near(double a,double b)=>Math.Abs(a-b)<1e-12;
    var s=new PlayerSettings();
    Check(Near(AudioDirector.Level(85),Math.Pow(.85,1.6))&&AudioDirector.Level(0)==0&&AudioDirector.Level(150)==1&&AudioDirector.Level(-5)==0,"TS seviye eğrisi (0-100)^1,6");
    var d=new AudioDirector();
    foreach(var (mode,gain) in new[]{("menu",1.0),("garage",.55),("result",.8),("pause",.35),("drive",0.0)})
    {var m=d.Step(new AudioFrame{Mode=mode},s);Check(Near(m.Music,gain*AudioDirector.Level(70)*.9),"Müzik kazancı "+mode);}
    s.Set["muz"]=0;Check(d.Step(new AudioFrame{Mode="menu"},s).Music==0,"Müzik kapalı (muz 0)");s.Set["ses"]=0;Check(d.Step(new AudioFrame{Mode="drive"},s).Effects==0,"Oyun sesleri kapalı (ses 0)");s=new PlayerSettings();
    Check(d.Step(new AudioFrame{Mode="drive",Cockpit=true},s).CockpitCutoff==2400&&d.Step(new AudioFrame{Mode="drive"},s).CockpitCutoff==20000,"Kokpitte boğuk ses (2400 Hz)");
    var tires=new[]{(true,1,.4,0.0),(true,1,0.0,.62),(true,0,.4,0.0),(false,1,1.0,1.0)};
    var mix=d.Step(new AudioFrame{Mode="drive",Speed=20,Tires=tires},s);
    Check(Near(mix.Surfaces[1],.5)&&Near(mix.Surfaces[0],.25)&&Near(mix.Slip,(1.0/4+1.0/4))&&Near(mix.Loose,2*(1.0/4)),"Lastik kayma/gevşek zemin hedefleri (TS yan/boy kayma)");
    Check(Near(d.Step(new AudioFrame{Mode="drive",Speed=20,Beta=.45,Tires=tires},s).Spin,.5*.5),"Savrulma: β 0,25–0,65 aralığında asfalt payıyla");
    // çarpma: son 12 karede hız kaybı; 0,2 sn içinde
    d=new AudioDirector();for(int i=0;i<5;i++)d.Step(new AudioFrame{Mode="drive",Speed=20,SimTime=i/60.0,HitTime=-9},s);
    d.Step(new AudioFrame{Mode="drive",Speed=6,SimTime=.1,HitTime=.09},s);var hit=d.Events.FirstOrDefault(e=>e.Name=="carpma");
    Check(Near(hit.Strength,Math.Min(1,14/14.0+.2)),"Çarpma şiddeti (hız kaybı/14 + 0,2)");
    d.Step(new AudioFrame{Mode="drive",Speed=6,SimTime=.12,HitTime=.09},s);Check(!d.Events.Any(e=>e.Name=="carpma"),"Aynı çarpma bir kez");
    for(int i=0;i<20;i++)d.Step(new AudioFrame{Mode="drive",Airborne=true,Vy=-5,Dt=1/60.0},s);d.Step(new AudioFrame{Mode="drive",Dt=1/60.0},s);
    Check(d.Events.Any(e=>e.Name=="inis"&&Near(e.Strength,.5)),"İniş sesi (0,25 sn+ havada, −vy/10)");
    d=new AudioDirector();int ticks=0;
    foreach(double left in new[]{3,2.5,2,1.2,.9,.2}){d.Step(new AudioFrame{Mode="drive",Racing=true,Countdown=true,CountdownLeft=left},s);ticks+=d.Events.Count(e=>e.Name=="sayim");}
    d.Step(new AudioFrame{Mode="drive",Racing=true},s);Check(ticks==3&&d.Events.Any(e=>e.Name=="basla"),"Geri sayım 3-2-1 ve başla");
    d.Step(new AudioFrame{Mode="drive",Racing=true,RaceType="dp",Multiplier=2,Combo=3,Score=10},s);Check(d.Events.Any(e=>e.Name=="kombo"&&e.Strength==2),"Drift çarpanı kombo sesi");
    d.Step(new AudioFrame{Mode="drive",Racing=true,RaceType="dp",Multiplier=1,Combo=0,Score=20},s);Check(d.Events.Any(e=>e.Name=="kasa"),"Kombo kasaya girdi");
    d.Step(new AudioFrame{Mode="drive",Racing=true,RaceType="dp",Multiplier=2,Combo=2,Score=20},s);d.Step(new AudioFrame{Mode="drive",Racing=true,RaceType="dp",Multiplier=1,Combo=0,Score=20},s);Check(d.Events.Any(e=>e.Name=="yandi"),"Kombo yandı");
    d.Step(new AudioFrame{Mode="result",Racing=true,Won=true},s);Check(d.Events.Any(e=>e.Name=="bitis"&&e.Strength==1),"Yarış bitiş sesi (kazandı)");
    d=new AudioDirector();d.Step(new AudioFrame{Mode="drive"},s);
    d.Step(new AudioFrame{Mode="drive",Nitro=true,Hook=true,Ghost=true,Transform=true,Wind=true,Refusals=1},s);
    Check(new[]{"nitro","kanca","hayaletAc","donusumAc","ruzgar","red"}.All(n=>d.Events.Any(e=>e.Name==n)),"Nitro ve skill giriş sesleri, ret");
    d.Step(new AudioFrame{Mode="drive",Refusals=1},s);Check(new[]{"nitroBitti","hayaletKapa","donusumKapa"}.All(n=>d.Events.Any(e=>e.Name==n))&&!d.Events.Any(e=>e.Name=="red"),"Nitro sönüşü, faz/dönüşüm çıkışı");
    d.Step(new AudioFrame{Mode="pause",Nitro=true},s);Check(!d.Events.Any(e=>e.Name=="nitro"),"Duraklatmada olay sesi yok");
    Console.WriteLine($"Ses: {checks} koşul; TS seviye eğrisi, kip kazançları, lastik/savrulma hedefleri, çarpma/iniş/sayım/kombo/nitro/skill/bitiş olayları. Ses varlıkları yok (TS sentez); yürütücü eksik varlığı raporlar.");
  }
}
