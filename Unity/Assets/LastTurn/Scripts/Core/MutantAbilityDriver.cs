#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // TS surus.ts → mutantAdimi cevre: fizik sonrası oyuncu gövdesi, drift penceresi, pist/dünya ve rakip.
  public sealed class MutantAbilityContext
  {
    public double X,Z,Heading,Vx,Vz,Y,Vy,Ground,Steering,Beta,DriftDirection,DriftCool;
    public bool Airborne,DriftOn,Racing,RaceRunning=true,HasBody=true;
    public TrackGeometry? Track;
    /// Yarışta rakip varsa gövdesi {id,x,z,h,vx,vz}; geri sayımda da verilir (etki yazımı için).
    public CatalogNode? Opponent;
    public IEnumerable<WorldObstacle> Obstacles=Array.Empty<WorldObstacle>();
  }
  public sealed class MutantSkillRefusal {public string Id="",Reason="";public int Count;}
  // TS beceriGorunumu satırı: HUD yalnız okur.
  public sealed class MutantSkillHud
  {
    public string Id="",Name="",Kind="";public int Level;public string? Evolution;public string[] Addons=Array.Empty<string>();
    public bool Open,Ready;public double Left,Wait,Charges,MaxCharges,Duration,FullWait;public double? Bar;
    public string? Blocker;public double[]? TargetPoint;public CatalogNode? Target,Point;
  }
  public sealed class MutantNitroHud {public double Energy,Capacity,Cost,Left;public bool Open,Ready;}
  // TS mutant-ui.ts mutantTusuGuncelle: yuvanın dolgusu, kısa yazısı ve durumu (on/bekle/engel/hazir).
  public static class MutantSkillSlot
  {
    private static string Reason(string r)=>r=="hedef"?"HEDEF YOK":r=="faz"?"FAZDA":r=="rakip"?"RAKİP YOK":r=="basla"?"BAŞLANGIÇ":"";
    private static string Seconds(double x)=>x.ToString("0.0",System.Globalization.CultureInfo.InvariantCulture).Replace(".",",")+" sn";
    private static double Round(double x)=>Math.Floor(x+.5);
    public static (double Fill,string Text,string State) Read(MutantSkillHud b,bool refusedAtStart=false)
    {
      string? blocker=refusedAtStart?"basla":b.Blocker;double fill;string text,state;
      if(b.Open){fill=b.Left/Math.Max(Math.Max(b.Duration,b.Left),.01);text=Seconds(b.Left);state="on";}
      else if(blocker=="bekleme"||blocker=="etkin"){fill=1-b.Wait/Math.Max(b.FullWait,.01);text=Seconds(b.Wait);state="bekle";}
      else if(b.Bar.HasValue){fill=b.Bar.Value/100;text=blocker!=null?Reason(blocker):"%"+b.Bar.Value.ToString("0");state=blocker!=null?"engel":b.Bar.Value>=75?"hazir":"";}
      else if(blocker!=null){fill=1;text=Reason(blocker);state="engel";}
      else{fill=b.MaxCharges!=0&&b.Charges<b.MaxCharges?1-b.Wait/Math.Max(b.FullWait,.01):1;text=b.MaxCharges>1?"×"+b.Charges.ToString("0"):"HAZIR";state="hazir";}
      return (Round(100*Math.Max(0,Math.Min(1,fill)))/100,text,state);
    }
  }

  // TS mutant.ts nitro/skill tuşları, mutantAdimi enerji dalı, mutantOyuncuIvmesi/mutantUcus ve rakipEtkisi.
  // Kural durumu Run.State'te kalır; bu sınıf yalnız tek adımlık girdi kuyruğunu ve havada sürükleme birikimini tutar.
  public sealed class MutantAbilityDriver
  {
    public const double AirNitro=14,AirDragAngle=.011,AirDragRate=12,OpponentPowerLoss=.3;
    public readonly MutantRun Run;
    public readonly MutantEnergyController Energy;
    private readonly MutantSkillWorldFactory worlds;
    private bool nitro,stepNitro;
    private readonly List<string> requests=new List<string>(),held=new List<string>();
    private string[] stepRequests=Array.Empty<string>();
    private double pitch,yaw;
    private MutantAbilityContext? context;
    public bool Finger {get;private set;}
    public MutantSkillRefusal Refusal {get;}=new MutantSkillRefusal();
    public bool OpponentEffect {get;private set;}
    public (double X,double Z)? OpponentAcceleration {get;private set;}
    public double OpponentBody {get;private set;}=100;
    public MutantAbilityDriver(MutantRun run,MutantSkillWorldFactory worlds){Run=run;this.worlds=worlds;Energy=new MutantEnergyController(run);}
    private CatalogNode[] Equipped=>Run.State["beceriler"].Items.ToArray();
    public void PressNitro()=>nitro=true;
    public void PressSkill(int slot)
    {
      var e=Equipped;if(slot<0||slot>=e.Length)return;string id=e[slot]["id"].S();
      requests.Add(id);if(!held.Contains(id))held.Add(id);
    }
    public void ReleaseSkill(int slot){var e=Equipped;if(slot>=0&&slot<e.Length)held.Remove(e[slot]["id"].S());}
    public IReadOnlyList<string> Held=>held;
    // Aşağı sürükleme burnu kaldırır, sağa sürükleme sağa çevirir (piksel).
    public void AirDrag(double dx,double dy){Finger=true;pitch+=dy*AirDragAngle;yaw-=dx*AirDragAngle;}
    public void AirRelease()=>Finger=false;
    public void RaceStart()=>Energy.RaceStart();
    /// TS mutantAdimi başı: bu adımın tuşları alınır, kuyruk her durumda boşalır.
    public void BeginStep(MutantAbilityContext c)
    {context=c;stepNitro=nitro;stepRequests=requests.ToArray();nitro=false;requests.Clear();OpponentEffect=false;}
    /// MutantGameSession.EnergyAndSkills: hasar dalından sonra; true ise araç değerleri yenilenir.
    public bool Step(MutantGameSession session,MutantSessionInput input,double dt,bool hit)
    {
      var c=context;if(c==null||!c.HasBody)return false;
      bool running=c.Racing&&c.RaceRunning;
      var player=CatalogNode.Obj();foreach(var (k,v) in new[]{("x",c.X),("z",c.Z),("h",c.Heading),("vx",c.Vx),("vz",c.Vz),("y",c.Y),("vy",c.Vy)})player.Set(k,CatalogNode.Num(v));
      var opponent=running?c.Opponent:null;
      var targets=CatalogNode.Arr(opponent!=null?new[]{opponent.Clone()}:Array.Empty<CatalogNode>());
      var world=worlds.Build(player,targets,c.Racing?c.Track:null,running,!c.Racing,c.Ground,held.ToArray(),c.Steering);
      if(stepRequests.Length>0)
      {
        var view=Skills();
        foreach(var id in stepRequests)
        {
          string? reason=c.Racing&&!running?"basla":view.FirstOrDefault(b=>b.Id==id)?.Blocker;
          if(reason!=null){Refusal.Id=id;Refusal.Reason=reason;Refusal.Count++;}
        }
      }
      var drift=new DriftObserverInput{Vx=c.Vx,Vz=c.Vz,Air=c.Airborne,DriftOn=c.DriftOn,Direction=c.DriftDirection,Cool=c.DriftCool,Beta=c.Beta};
      bool changed=Energy.Step(drift,world,MutantSkillWorldFactory.Obstacles(c.Obstacles).Items,dt,stepNitro,c.Racing&&!running?Array.Empty<string>():stepRequests,hit);
      if(c.Opponent!=null)
      {
        OpponentEffect=true;var a=opponent!=null?Run.State["becCikti"]["hedefIvme"]["rakip"]:null;
        OpponentAcceleration=a!=null&&a.Has("x")?(a["x"].N(),a["z"].N()):((double,double)?)null;
        var body=Run.State["bec"]["hedefler"]["rakip"];OpponentBody=body.Has("govde")?body["govde"].N():100;
      }
      return changed;
    }
    /// TS mutantOyuncuIvmesi + mutantUcus + mutantHayalet: sonraki fizik adımının girdisi; koşu etkisi yoksa null (fizik aynı).
    public VehicleSkillInput? Physics(double dt)
    {
      var s=Run.State;var c=s["becCikti"];var u=c["ucus"];string phase=s["faz"].S();
      double x=c["oyuncuIvme"]["x"].N()+u["x"].N(),z=c["oyuncuIvme"]["z"].N()+u["z"].N();
      VehicleFlightInput? flight=null;
      if(phase=="surus"||phase=="boss")
      {
        double rate=Math.Min(1,AirDragRate*dt),p=pitch*rate,w=yaw*rate;pitch-=p;yaw-=w;
        flight=new VehicleFlightInput{Vertical=u["y"].N(),Balance=u["denge"].N(),
          Forward=u["ileri"].N()+(s["mek"]["etkiKalan"].N()>0?AirNitro:0),
          Descent=u["inis"].IsNumber?u["inis"].N():(double?)null,Yaw=u["yalpa"].IsNumber?u["yalpa"].N():(double?)null,
          Air=new VehicleAirControl{Held=Finger,Pitch=p/dt,Yaw=w/dt}};
      }
      bool ghost=c["hayalet"].B();
      if(x==0&&z==0&&flight==null&&!ghost)return null;
      return new VehicleSkillInput{X=x,Z=z,Ghost=ghost,Flight=flight!};
    }
    /// TS beceriGorunumu.
    public MutantSkillHud[] Skills()
    {
      var s=Run.State;var definitions=Run.Catalog["skills"].Items.ToArray();
      return Equipped.Select(o=>
      {
        string id=o["id"].S();var t=definitions.First(d=>d["id"].S()==id);bool has=s["bec"]["yerel"].Has(id);var y=s["bec"]["yerel"][id];
        var p=MutantSkills.Parameters(id,o);var block=s["becEngel"][id];string? blocker=block.ToString()=="null"||block.ToString()==""?null:block.S();
        double maxCharges=p["sarj"].N(0),charges=maxCharges!=0&&has?MutantSkills.Charges(y,p):maxCharges;
        double wait=maxCharges!=0?(charges<maxCharges?Math.Max(0,p["bekleme"].N(double.NaN)-y["dolum"].N(0)):0):y["bekleme"].N(0);
        bool open=y["kalan"].N(0)>0;bool bar=id=="risk-taker"||id=="slipstream-engine";
        var point=s["becHedef"][id];var evolution=o["evrim"];
        return new MutantSkillHud{Id=id,Name=t["ad"].S(),Kind=t["tur"].S(),Level=(int)o["seviye"].N(),Evolution=evolution.ToString()=="null"?null:evolution.S(),
          Addons=o["eklentiler"].Items.Select(e=>e.S()).ToArray(),Open=open,Left=y["kalan"].N(0),Wait=wait,Charges=charges,MaxCharges=maxCharges,
          Duration=p["sure"].IsNumber?p["sure"].N():MutantSkills.Releases(id)?4:0,FullWait=p["bekleme"].N(0),
          Bar=bar?Math.Floor(100*Math.Max(0,Math.Min(1,has?MutantSkills.Bar(id,y,p):0))+.5):(double?)null,
          Blocker=blocker,TargetPoint=point.Items.Any()?point.Items.Select(n=>n.N()).ToArray():null,
          Target=open&&y.Has("hedef")&&y["hedef"].ToString()!="null"?y["hedef"].Clone():null,
          Point=open&&y.Has("nokta")&&y["nokta"].ToString()!="null"?y["nokta"].Clone():null,
          Ready=t["tur"].S()=="aktif"&&blocker==null};
      }).ToArray();
    }
    /// TS nitroDurumu.
    public MutantNitroHud Nitro()
    {
      var m=MechanicState.FromNode(Run.State["mek"]);var definitions=Run.Catalog["passives"].Items.Concat(Run.Catalog["addons"].Items).ToArray();
      var installed=MutantMechanics.Installed(Run.State["pasifler"].Items.Select(p=>p.S()),id=>definitions.FirstOrDefault(p=>p["id"].S()==id));
      double cost=MutantMechanics.Nitro.Cost*MutantMechanics.Parameters(installed).Cost;
      return new MutantNitroHud{Energy=m.Energy,Capacity=m.Capacity,Cost=cost,Open=m.EffectLeft>0,Left=Math.Max(0,m.EffectLeft),
        Ready=m.EffectLeft<=0&&m.EffectWait<=0&&m.Energy>=cost};
    }
  }

  // TS rakip.ts rakipEtkisi: skill çekişi rakibe dış ivme, skill hasarı rakip gücünü RAKIP_GUC_KAYBI oranında düşürür.
  public sealed class MutantOpponentLink
  {
    private readonly VehicleCatalog catalog;private readonly CatalogSetup setup;private readonly double baseHp;
    public double Hp {get;private set;}
    public MutantOpponentLink(VehicleCatalog catalog,CatalogSetup mutantSetup){this.catalog=catalog;setup=mutantSetup;baseHp=mutantSetup.Car["hp"].N();Hp=baseHp;}
    public void Apply(PowertrainVehicle vehicle,(double X,double Z)? acceleration,double body)
    {
      vehicle.SkillInput=acceleration.HasValue&&(acceleration.Value.X!=0||acceleration.Value.Z!=0)?new VehicleSkillInput{X=acceleration.Value.X,Z=acceleration.Value.Z}:null!;
      double hp=baseHp*(1-MutantAbilityDriver.OpponentPowerLoss*(1-Math.Max(0,Math.Min(100,body))/100));
      if(hp==Hp)return;Hp=hp;
      var copy=new CatalogSetup{Car=setup.Car.Clone(),Tuning=setup.Tuning,Assists=setup.Assists,Affinity=setup.Affinity,Tire=setup.Tire,Preset=setup.Preset,Parts=setup.Parts};
      copy.Car.Set("hp",CatalogNode.Num(hp));vehicle.Reconfigure(catalog.CreatePhysics(copy));
    }
  }
}
