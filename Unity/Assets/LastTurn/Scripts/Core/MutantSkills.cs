#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // Sabit TS 0.8.18 cekirdek/beceri.ts. Sayısal kurallar, geçici durum ve olay anahtarları kaynakla aynıdır.
  // Dünya salt okunur; ivme/uçuş/hasar çıktıları oyun/fizik adaptörü tarafından uygulanır.
  public static class MutantSkills
  {
    public const int Slots=3,MaxLevel=3,MaxAddons=2,MaxDamage=10;
    public const double MaxAcceleration=12,MaxFlightAcceleration=60,Gravity=24;
    private sealed class Definition
    {
      public readonly string Id;public readonly bool Active,Toggle;public readonly string[] Tags;public readonly CatalogNode[] Levels;
      public Definition(string id,bool active,bool toggle,string[] tags,string levels){Id=id;Active=active;Toggle=toggle;Tags=tags;Levels=CatalogNode.Parse(levels).Items.ToArray();}
    }
    private static readonly Definition[] definitions={
      new Definition("grappling-hook",true,true,new[]{"hareket","kontrol","konum"},"[{\"menzil\":35,\"cekis\":7,\"fren\":3,\"sarj\":1,\"bekleme\":6},{\"menzil\":45,\"cekis\":8.5,\"fren\":3.5,\"sarj\":2,\"bekleme\":5.5},{\"menzil\":55,\"cekis\":10,\"fren\":4,\"sarj\":3,\"bekleme\":5}]"),
      new Definition("flying-dutchman",true,false,new[]{"savunma","hareket"},"[{\"sure\":2.5,\"tutus\":1.12,\"bekleme\":10},{\"sure\":3,\"tutus\":1.15,\"bekleme\":9},{\"sure\":3.5,\"tutus\":1.18,\"bekleme\":8}]"),
      new Definition("risk-taker",false,false,new[]{"risk","hasar","hareket"},"[{\"kazanc\":1,\"sure\":5,\"guc\":1.25,\"tutus\":1.1,\"alev\":4,\"uzatmaUst\":2,\"bekleme\":4},{\"kazanc\":1.2,\"sure\":6,\"guc\":1.3,\"tutus\":1.12,\"alev\":5,\"uzatmaUst\":2.5,\"bekleme\":4},{\"kazanc\":1.4,\"sure\":7,\"guc\":1.35,\"tutus\":1.15,\"alev\":6,\"uzatmaUst\":3,\"bekleme\":4}]"),
      new Definition("slipstream-engine",false,false,new[]{"hareket"},"[{\"enCok\":2,\"guc\":1.2,\"bekleme\":3},{\"enCok\":2.5,\"guc\":1.25,\"bekleme\":3},{\"enCok\":3,\"guc\":1.3,\"bekleme\":2.5}]"),
      new Definition("volt-kanat",true,true,new[]{"hareket"},"[{\"sure\":3,\"kalkis\":12,\"tirmanis\":13,\"itki\":9,\"bekleme\":9},{\"sure\":3,\"kalkis\":14,\"tirmanis\":15,\"itki\":10.5,\"bekleme\":8},{\"sure\":3,\"kalkis\":16,\"tirmanis\":17,\"itki\":12,\"bekleme\":7}]")
    };
    private static Definition? Find(string id)=>definitions.FirstOrDefault(d=>d.Id==id);
    // TS BeceriTanimi.birak: bırakınca biten skill (HUD süresi yoksa KANCA.enUzun).
    public static bool Releases(string id)=>Find(id)?.Toggle==true;
    private static CatalogNode Num(double n)=>CatalogNode.Num(n);
    private static CatalogNode Str(string s)=>CatalogNode.Str(s);
    private static CatalogNode Bool(bool b)=>CatalogNode.Parse(b?"true":"false");
    private static CatalogNode Null()=>CatalogNode.Parse("null");
    private static CatalogNode Arr(IEnumerable<CatalogNode> a)=>CatalogNode.Arr(a);
    private static CatalogNode Coords(params double[] a)=>Arr(a.Select(Num));
    private static CatalogNode Obj(params (string Key,CatalogNode Value)[] fields){var n=CatalogNode.Obj();foreach(var p in fields)n.Set(p.Key,p.Value);return n;}
    private static void Set(CatalogNode n,string k,double v)=>n.Set(k,Num(v));
    private static void Add(CatalogNode n,string k,double v)=>Set(n,k,n[k].N()+v);
    private static bool Finite(double n)=>!double.IsNaN(n)&&!double.IsInfinity(n);
    private static double H(double x,double z)=>Math.Sqrt(x*x+z*z);
    private static double H(double x,double y,double z)=>Math.Sqrt(x*x+y*y+z*z);
    private static double Speed(CatalogNode n)=>H(n["vx"].N(),n["vz"].N());
    private static double Direction(CatalogNode n)=>Math.Atan2(n["vx"].N(),n["vz"].N());
    private static double Delta(double a,double b)=>Math.Atan2(Math.Sin(a-b),Math.Cos(a-b));
    private static CatalogNode Local()=>CatalogNode.Parse("{\"kalan\":0,\"bekleme\":0,\"deger\":0,\"uzatma\":0,\"sayac\":0,\"hedef\":null,\"nokta\":null,\"iz\":[],\"islenen\":[]}");
    private static CatalogNode Local(CatalogNode state,string id){if(!state["yerel"].Has(id))state["yerel"].Set(id,Local());return state["yerel"][id];}
    public static CatalogNode Initialize()=>CatalogNode.Parse("{\"adim\":0,\"yerel\":{},\"hedefler\":{},\"sonVurus\":{},\"takipKredi\":{},\"yakin\":{},\"sonNearMiss\":{},\"sonCarpma\":-1000000000,\"verilen\":0,\"kesilen\":0}");
    private static CatalogNode EmptyOutput()=>CatalogNode.Parse("{\"oyuncuIvme\":{\"x\":0,\"z\":0},\"ucus\":null,\"hedefIvme\":{},\"olaylar\":[],\"tutus\":1,\"guc\":1,\"carpismaHasari\":1,\"hayalet\":false,\"saldiriKapali\":false}");
    public static CatalogNode[] Normalize(IEnumerable<CatalogNode> equipped)
    {
      var seen=new HashSet<string>();var result=new List<CatalogNode>();foreach(var o in equipped){string id=o["id"].S();if(Find(id)==null||seen.Contains(id)||result.Count>=Slots)continue;seen.Add(id);result.Add(o);}return result.ToArray();
    }
    public static CatalogNode Parameters(string id,CatalogNode instance)
    {
      var d=Find(id)??throw new ArgumentException("Beceri bulunamadı: "+id);double level=Math.Floor(instance["seviye"].N(double.NaN));if(level==0||double.IsNaN(level))level=1;
      int i=(int)Math.Max(0,Math.Min(d.Levels.Length,level)-1);return d.Levels[i].Clone();
    }
    public static double Charges(CatalogNode local,CatalogNode parameters)=>local["sarj"].N(parameters["sarj"].N(double.NaN))+Math.Max(0,parameters["sarj"].N(double.NaN)-local["sarjUst"].N(parameters["sarj"].N(double.NaN)));
    public static CatalogNode Flags(CatalogNode state,IEnumerable<CatalogNode> equipped)
    {
      bool ghost=Normalize(equipped).Any(o=>o["id"].S()=="flying-dutchman"&&state["yerel"][o["id"].S()]["kalan"].N()>0);
      return Obj(("hayalet",Bool(ghost)),("saldiriKapali",Bool(ghost)));
    }
    public static string? Blocker(CatalogNode state,IEnumerable<CatalogNode> equipped,MutantSkillWorld world,string id)
    {
      var list=Normalize(equipped);var o=list.FirstOrDefault(x=>x["id"].S()==id);var t=Find(id);if(o==null||t==null)return null;
      var y=state["yerel"].Has(id)?state["yerel"][id]:Local();var p=Parameters(id,o);
      if(y["kalan"].N()>0)return t.Toggle?null:"etkin";
      if(p["sarj"].N()!=0?Charges(y,p)<=0:y["bekleme"].N()>0)return "bekleme";
      var flags=Flags(state,list);if(!t.Active)return id=="slipstream-engine"&&!world.Targets.Items.Any()?"rakip":null;
      if(flags["saldiriKapali"].B()&&t.Tags.Any(tag=>tag=="saldiri"||tag=="konum"))return "faz";
      return id=="grappling-hook"&&HookTarget(o,p,world)==null?"hedef":null;
    }
    public static bool Ready(CatalogNode state,IEnumerable<CatalogNode> equipped,MutantSkillWorld world,string id)
    {var list=Normalize(equipped);return list.Any(x=>x["id"].S()==id)&&Find(id)!.Active&&Blocker(state,list,world,id)==null;}
    public static string[] Requests(CatalogNode state,IEnumerable<CatalogNode> equipped,MutantSkillWorld world,IEnumerable<string> requests)
    {var list=Normalize(equipped);var seen=new HashSet<string>();return requests.Where(id=>seen.Add(id)&&Ready(state,list,world,id)).ToArray();}
    public static double[]? TargetPoint(CatalogNode state,IEnumerable<CatalogNode> equipped,MutantSkillWorld world,string id)
    {
      var list=Normalize(equipped);var o=list.FirstOrDefault(x=>x["id"].S()==id);if(o==null||id!="grappling-hook")return null;
      var y=state["yerel"].Has(id)?state["yerel"][id]:Local();if(y["kalan"].N()>0||Blocker(state,list,world,id)!=null)return null;
      var target=HookTarget(o,Parameters(id,o),world);if(target==null)return null;
      string type=target["tur"].S();if(type=="gok")return target["uc"].Items.Select(x=>x.N()).ToArray();if(type=="kose")return new[]{target["uc"][0].N(),1.5,target["uc"][1].N()};
      var body=world.Targets.Items.First(h=>h["id"].S()==target["id"].S());return new[]{body["x"].N(),1,body["z"].N()};
    }
    public static double Bar(string id,CatalogNode local,CatalogNode parameters)=>id=="risk-taker"?local["deger"].N()/100:id=="slipstream-engine"?local["deger"].N()/parameters["enCok"].N():0;
    private static bool Airborne(MutantSkillWorld world)=>world.Player["y"].N()-world.Ground>2.5;
    private static CatalogNode? HookTarget(CatalogNode instance,CatalogNode parameters,MutantSkillWorld world)
    {
      var p=world.Player;bool reverse=instance["evrim"].S()=="ters-kanca";string? nearest=null;double nearestDistance=double.PositiveInfinity;
      foreach(var h in world.Targets.Items){double dx=h["x"].N()-p["x"].N(),dz=h["z"].N()-p["z"].N(),d=H(dx,dz);if(d<8||d>parameters["menzil"].N())continue;if(Math.Abs(Delta(Math.Atan2(dx,dz),p["h"].N()+(reverse?Math.PI:0)))>(reverse?.6:.45))continue;if(d<nearestDistance){nearestDistance=d;nearest=h["id"].S();}}
      if(nearest!=null)return Obj(("tur",Str("rakip")),("id",Str(nearest)));if(reverse)return null;
      if(Airborne(world)){var g=world.Sky?.Invoke();return g==null?null:Obj(("tur",Str("gok")),("p",g["p"]),("uc",g["uc"]));}
      var k=world.Corner?.Invoke(Math.Abs(world.Steering)>.15?Math.Sign(world.Steering):0);return k==null?null:Obj(("tur",Str("kose")),("p",k["p"]),("uc",k["uc"]));
    }
    private sealed class Context
    {
      public readonly CatalogNode State,Instance,Local,Parameters,Flags,Output;public readonly MutantSkillWorld World;public readonly double Dt;public readonly CatalogNode[] Events;public readonly string Id;
      private readonly List<(CatalogNode Event,int Depth)> queue;private readonly Dictionary<string,double> damage;
      public Context(CatalogNode state,CatalogNode instance,MutantSkillWorld world,double dt,CatalogNode[] events,CatalogNode flags,CatalogNode output,List<(CatalogNode,int)> queue,Dictionary<string,double> damage)
      {State=state;Instance=instance;Id=instance["id"].S();Local=MutantSkills.Local(state,Id);Parameters=MutantSkills.Parameters(Id,instance);World=world;Dt=dt;Events=events;Flags=flags;Output=output;this.queue=queue;this.damage=damage;}
      public double P(string k)=>Parameters[k].N();public double Y(string k)=>Local[k].N();public void Y(string k,double value)=>Set(Local,k,value);
      public void Emit(CatalogNode e)=>queue.Add((e,0));
      public double Damage(string id,double amount,string type,double interval)=>WriteDamage(State,World,Flags,damage,id,amount,type,Id,interval,e=>queue.Add((e,0)));
      public void Status(string id,string type,double duration)=>WriteStatus(State,World,id,type,duration,Id,e=>queue.Add((e,0)));
      public void Acceleration(string target,double x,double z)
      {
        if(!Finite(x)||!Finite(z))return;
        CatalogNode a;if(target=="oyuncu")a=Output["oyuncuIvme"];else{if(!World.Targets.Items.Any(h=>h["id"].S()==target))return;if(!Output["hedefIvme"].Has(target))Output["hedefIvme"].Set(target,Obj(("x",Num(0)),("z",Num(0))));a=Output["hedefIvme"][target];}Add(a,"x",x);Add(a,"z",z);
      }
      public void Flight(double x,double y,double z,double balance,double? forward=null,double? landing=null,double? roll=null)
      {
        if(!Finite(x)||!Finite(y)||!Finite(z)||!Finite(balance))return;if(Output["ucus"].ToString()=="null")Output.Set("ucus",Obj(("x",Num(0)),("y",Num(0)),("z",Num(0)),("denge",Num(0))));var u=Output["ucus"];
        Add(u,"x",x);Add(u,"y",y);Add(u,"z",z);Set(u,"denge",Math.Max(u["denge"].N(),Math.Min(1,balance)));
        if(forward.HasValue&&Finite(forward.Value))Set(u,"ileri",Math.Min(60,u["ileri"].N()+forward.Value));
        if(landing.HasValue&&Finite(landing.Value))Set(u,"inis",Math.Max(2,Math.Min(u["inis"].N(double.PositiveInfinity),landing.Value)));
        if(roll.HasValue&&Finite(roll.Value))Set(u,"yalpa",Math.Max(-4,Math.Min(4,roll.Value)));
      }
    }
    private static CatalogNode TargetState(CatalogNode state,string id)
    {if(!state["hedefler"].Has(id))state["hedefler"].Set(id,Obj(("govde",Num(100)),("durumlar",Arr(Array.Empty<CatalogNode>()))));return state["hedefler"][id];}
    private static double WriteDamage(CatalogNode state,MutantSkillWorld world,CatalogNode flags,Dictionary<string,double> stepDamage,string id,double amount,string type,string source,double interval,Action<CatalogNode> emit)
    {
      if(flags["saldiriKapali"].B()||!(amount>0)||!Finite(amount)||!world.Targets.Items.Any(h=>h["id"].S()==id))return 0;
      string key=source+"|"+id;if(state["sonVurus"].Has(key)&&state["adim"].N()-state["sonVurus"][key].N()<Math.Max(1,interval))return 0;
      var target=TargetState(state,id);double already=stepDamage.TryGetValue(id,out var n)?n:0,written=Math.Min(amount,Math.Min(10-already,target["govde"].N()));if(!(written>0))return 0;
      state["sonVurus"].Set(key,state["adim"]);stepDamage[id]=already+written;Add(target,"govde",-written);Add(state,"verilen",written);emit(Obj(("tur",Str("HasarVerildi")),("hedef",Str(id)),("miktar",Num(written)),("hasar",Str(type)),("kaynak",Str(source))));return written;
    }
    private static void WriteStatus(CatalogNode state,MutantSkillWorld world,string id,string type,double duration,string source,Action<CatalogNode> emit)
    {
      if(!(duration>0)||!world.Targets.Items.Any(h=>h["id"].S()==id))return;var target=TargetState(state,id);double time=Math.Min(3,duration);var existing=target["durumlar"].Items.FirstOrDefault(q=>q["tur"].S()==type);
      if(existing!=null){Set(existing,"kalan",Math.Max(existing["kalan"].N(),time));return;}
      target.Set("durumlar",Arr(target["durumlar"].Items.Append(Obj(("tur",Str(type)),("kalan",Num(time)),("kaynak",Str(source))))));emit(Obj(("tur",Str("DurumUygulandi")),("hedef",Str(id)),("durum",Str(type)),("kaynak",Str(source))));
    }
    private static void Begin(Context c)
    {
      if(c.Id=="grappling-hook"){
        var h=HookTarget(c.Instance,c.Parameters,c.World);if(h==null)return;var p=c.World.Player;c.Y("kalan",4);
        switch(h["tur"].S()){
          case "rakip":c.Local.Set("hedef",h["id"]);c.Local.Set("nokta",Null());c.Emit(Obj(("tur",Str("KonumEtkisi")),("hedef",h["id"]),("etki",Str("cekme")),("kaynak",Str(c.Id))));return;
          case "gok":c.Local.Set("hedef",Str("#bina"));c.Local.Set("nokta",Coords(h["p"][0].N(),h["p"][2].N()));c.Y("deger",h["p"][1].N());c.Local.Set("uc",h["uc"].Clone());c.Y("sayac",Math.Max(10,.85*H(h["p"][0].N()-p["x"].N(),h["p"][1].N()-p["y"].N(),h["p"][2].N()-p["z"].N())));return;
          default:c.Local.Set("hedef",Str("#kose"));c.Local.Set("nokta",h["p"].Clone());c.Local.Set("uc",Coords(h["uc"][0].N(),1.5,h["uc"][1].N()));c.Y("sayac",H(p["x"].N()-h["p"][0].N(),p["z"].N()-h["p"][1].N()));c.Y("deger",Direction(p));return;
        }
      }
      if(c.Id=="flying-dutchman"||c.Id=="volt-kanat"){c.Y("kalan",c.P("sure"));c.Local.Set("islenen",Arr(Array.Empty<CatalogNode>()));if(c.Id=="volt-kanat")c.Y("sayac",8);}
    }
    private static void Pendulum(Context c)
    {
      var p=c.World.Player;double dx=c.Local["nokta"][0].N()-p["x"].N(),dy=c.Y("deger")-p["y"].N(),dz=c.Local["nokta"][1].N()-p["z"].N(),d=H(dx,dy,dz);if(d==0)d=1;
      if(p["vx"].N()*dx+p["vz"].N()*dz<0&&p["vy"].N()<=0&&H(dx,dz)>6){c.Y("kalan",0);return;}
      if(p["y"].N()-c.World.Ground<1.2&&p["vy"].N()<=0){c.Y("kalan",0);return;}
      c.Y("sayac",Math.Max(10,Math.Min(c.Y("sayac"),d)-3*c.Dt));double stretch=d-c.Y("sayac");if(stretch<=0)return;
      double ux=dx/d,uy=dy/d,uz=dz/d,radial=p["vx"].N()*ux+p["vy"].N()*uy+p["vz"].N()*uz,a=Math.Min(54,28*Math.Min(stretch,3)+5*Math.Max(0,-radial));c.Flight(ux*a,uy*a,uz*a,0);
    }
    private static void CornerStep(Context c)
    {
      var p=c.World.Player;double rx=p["x"].N()-c.Local["nokta"][0].N(),rz=p["z"].N()-c.Local["nokta"][1].N(),d=H(rx,rz),v=Speed(p);if(d==0)d=1;
      if(Math.Abs(Delta(Direction(p),c.Y("deger")))>1.6||d>c.Y("sayac")+10||Airborne(c.World)){c.Y("kalan",0);return;}
      c.Y("sayac",Math.Max(4,Math.Min(c.Y("sayac"),d)));Set(c.Output,"tutus",c.Output["tutus"].N()*1.3);
      double ux=rx/d,uz=rz/d,vr=p["vx"].N()*ux+p["vz"].N()*uz,vt=p["vx"].N()*uz-p["vz"].N()*ux,stretch=d-c.Y("sayac"),ax=0,az=0;double? roll=null;
      if(stretch>.05){double a=Math.Min(60,vt*vt/d+30*stretch+6*Math.Max(0,vr));ax-=ux*a;az-=uz*a;roll=vt/d+3*Delta(Direction(p),p["h"].N());}
      double ropeSpeed=Math.Sqrt(.5*60*c.Y("sayac")),tangent=v>ropeSpeed?-Math.Min(24,(v-ropeSpeed)*5):v<45?5:0;if(v>1){ax+=p["vx"].N()/v*tangent;az+=p["vz"].N()/v*tangent;}c.Flight(ax,0,az,1,roll:roll);
    }
    private static void HookStep(Context c)
    {
      if(c.Y("kalan")<=0)return;string target=c.Local["hedef"].S();if(target=="#bina"){Pendulum(c);return;}if(target=="#kose"){CornerStep(c);return;}
      var p=c.World.Player;var h=c.World.Targets.Items.FirstOrDefault(t=>t["id"].S()==target);if(h==null){c.Y("kalan",0);return;}
      bool reverse=c.Instance["evrim"].S()=="ters-kanca";double dx=h["x"].N()-p["x"].N(),dz=h["z"].N()-p["z"].N(),d=H(dx,dz);if(d<7||d>c.P("menzil")*1.3){c.Y("kalan",0);return;}
      double ux=dx/d,uz=dz/d,closing=(p["vx"].N()-h["vx"].N())*ux+(p["vz"].N()-h["vz"].N())*uz;
      if(!reverse){double k=Math.Min(1,Math.Max(0,(22-closing)/10));c.Acceleration("oyuncu",ux*c.P("cekis")*k,uz*c.P("cekis")*k);}c.Acceleration(target,-ux*c.P("fren")*(reverse?2:1),-uz*c.P("fren")*(reverse?2:1));
    }
    private static void OnceStatus(Context c,double radius,string type,double duration)
    {
      var p=c.World.Player;foreach(var h in c.World.Targets.Items)if(!c.Local["islenen"].Items.Any(x=>x.S()==h["id"].S())&&H(h["x"].N()-p["x"].N(),h["z"].N()-p["z"].N())<radius){c.Local.Set("islenen",Arr(c.Local["islenen"].Items.Append(h["id"])));c.Status(h["id"].S(),type,duration);}
    }
    private static void RiskStep(Context c)
    {
      var y=c.Local;var p=c.World.Player;y.Set("iz",Arr(y["iz"].Items.Select(t=>Coords(t[0].N(),t[1].N(),t[2].N()-c.Dt)).Where(t=>t[2].N()>0)));
      if(c.Y("kalan")>0){
        Set(c.Output,"guc",c.Output["guc"].N()*c.P("guc"));Set(c.Output,"tutus",c.Output["tutus"].N()*c.P("tutus"));Set(c.Output,"carpismaHasari",c.Output["carpismaHasari"].N()*1.5);
        if(c.State["adim"].N()%6==0)y.Set("iz",Arr(y["iz"].Items.Append(Coords(p["x"].N(),p["z"].N(),1.5))));
        foreach(var h in c.World.Targets.Items)if(y["iz"].Items.Any(t=>H(h["x"].N()-t[0].N(),h["z"].N()-t[1].N())<2.5)){
          if(c.Instance["evrim"].S()=="kivilcim-izi")c.Status(h["id"].S(),"elektrik",1);else c.Damage(h["id"].S(),c.P("alev"),"ates",30);
        }
        foreach(var e in c.Events)if(e["tur"].S()=="HasarVerildi"&&c.Y("uzatma")<c.P("uzatmaUst")){double extra=Math.Min(.5,c.P("uzatmaUst")-c.Y("uzatma"));c.Y("kalan",c.Y("kalan")+extra);c.Y("uzatma",c.Y("uzatma")+extra);}return;
      }
      if(c.Y("bekleme")>0)return;double gain=0;
      foreach(var e in c.Events){string type=e["tur"].S();if(type=="DriftTickQualified"&&Math.Abs(e["aci"].N())>=.35&&e["hiz"].N()>=11)gain+=12*e["dt"].N();else if(type=="YakinTakip"&&c.World.Racing&&!c.Flags["hayalet"].B())gain+=15*e["dt"].N();else if(type=="NearMiss"&&c.World.Racing&&!c.Flags["hayalet"].B())gain+=15;}
      c.Y("deger",Math.Min(100,c.Y("deger")+gain*c.P("kazanc")));if(c.Y("deger")>=100){c.Y("deger",0);c.Y("kalan",c.P("sure"));c.Y("uzatma",0);y.Set("iz",Arr(Array.Empty<CatalogNode>()));}
    }
    private static void SlipstreamStep(Context c)
    {
      bool evolution=c.Instance["evrim"].S()=="ruzgar-kirici";
      if(c.Y("kalan")>0){Set(c.Output,"guc",c.Output["guc"].N()*c.P("guc"));if(evolution)Set(c.Output,"tutus",c.Output["tutus"].N()*1.08);return;}
      if(c.Y("bekleme")>0)return;bool following=false;
      foreach(var e in c.Events){if(e["tur"].S()=="YakinTakip"){following=true;c.Y("deger",c.Y("deger")+e["dt"].N());}else if(evolution&&e["tur"].S()=="NearMiss")c.Y("deger",c.Y("deger")+.5);}
      c.Y("deger",Math.Min(c.P("enCok"),c.Y("deger")));if(following){c.Y("sayac",0);return;}if(c.Y("deger")<=0)return;
      c.Y("sayac",c.Y("sayac")+c.Dt);if(c.Y("sayac")<.25)return;if(c.Y("deger")>=.5)c.Y("kalan",c.Y("deger"));c.Y("deger",0);c.Y("sayac",0);
    }
    private static void VoltStep(Context c)
    {
      var p=c.World.Player;double y=p["y"].N(),vy=p["vy"].N();
      if(c.Y("kalan")<=0){if(c.Y("sayac")<=0)return;c.Y("sayac",c.Y("sayac")-c.Dt);if(y-c.World.Ground<1.2&&vy>-1){c.Y("sayac",0);return;}c.Flight(0,0,0,0,landing:8);return;}
      if(c.World.Held!=null&&!c.World.Held.Contains(c.Id)){c.Y("kalan",0);return;}
      double ay=24+Math.Max(-6,Math.Min(c.P("kalkis"),(c.P("tirmanis")-vy)*2)),speed=Speed(p);c.Flight(0,ay,0,0,forward:speed<48?c.P("itki"):0);
      if(c.Instance["evrim"].S()=="firtina-kanadi")OnceStatus(c,8,"elektrik",1.5);
    }
    private static void SkillStep(Context c)
    {
      switch(c.Id){
        case "grappling-hook":HookStep(c);break;
        case "flying-dutchman":if(c.Y("kalan")>0){Set(c.Output,"tutus",c.Output["tutus"].N()*c.P("tutus"));if(c.Instance["evrim"].S()=="lanetli-gecis")OnceStatus(c,4,"elektrik",1.5);}break;
        case "risk-taker":RiskStep(c);break;case "slipstream-engine":SlipstreamStep(c);break;case "volt-kanat":VoltStep(c);break;
      }
    }
    private static void LimitAcceleration(CatalogNode acceleration)
    {double m=H(acceleration["x"].N(),acceleration["z"].N());if(m>12){Set(acceleration,"x",acceleration["x"].N()*12/m);Set(acceleration,"z",acceleration["z"].N()*12/m);}}
    public static (CatalogNode State,CatalogNode Output) Step(CatalogNode state,IEnumerable<CatalogNode> equipped,MutantSkillWorld world,double dt,IEnumerable<CatalogNode>? events=null,IEnumerable<string>? requests=null)
    {
      var d=state.Clone();Add(d,"adim",1);var list=Normalize(equipped);var output=EmptyOutput();var queue=new List<(CatalogNode Event,int Depth)>();var stepDamage=new Dictionary<string,double>();
      double validDt=dt>0&&dt<=1d/30&&Finite(dt)?dt:0;var inputEvents=events?.ToArray()??Array.Empty<CatalogNode>();var pressed=new HashSet<string>(requests??Array.Empty<string>());
      foreach(var key in d["yerel"].Fields.Select(p=>p.Key).ToArray())if(!list.Any(o=>o["id"].S()==key))d["yerel"].Remove(key);
      Context ContextFor(CatalogNode instance,CatalogNode flags)=>new Context(d,instance,world,validDt,inputEvents,flags,output,queue,stepDamage);
      var beforeFlags=Flags(d,list);
      foreach(var o in list)if(pressed.Contains(o["id"].S())){
        var c=ContextFor(o,beforeFlags);var t=Find(c.Id)!;
        if(c.Y("kalan")>0){if(t.Toggle)c.Y("kalan",0);continue;}
        double charges=c.P("sarj")!=0?Charges(c.Local,c.Parameters):0;
        if(c.P("sarj")!=0?charges<=0:c.Y("bekleme")>0)continue;
        if(c.Id=="grappling-hook"&&HookTarget(o,c.Parameters,world)==null)continue;Begin(c);
        if(c.P("sarj")!=0&&c.Y("kalan")>0){c.Y("sarj",charges-1);c.Y("sarjUst",c.P("sarj"));}
      }
      var flags=Flags(d,list);output.Set("hayalet",flags["hayalet"]);output.Set("saldiriKapali",flags["saldiriKapali"]);
      foreach(var o in list){
        var c=ContextFor(o,flags);bool wasActive=c.Y("kalan")>0;
        if(!wasActive&&c.Y("bekleme")>0)c.Y("bekleme",Math.Max(0,c.Y("bekleme")-validDt));
        if(c.P("sarj")!=0){double n=Charges(c.Local,c.Parameters);c.Y("sarjUst",c.P("sarj"));c.Y("sarj",n);if(n<c.P("sarj")){c.Y("dolum",c.Y("dolum")+validDt);if(c.Y("dolum")>=c.P("bekleme")){c.Y("sarj",n+1);c.Y("dolum",0);}}else c.Y("dolum",0);}
        SkillStep(c);if(c.Y("kalan")>0)c.Y("kalan",Math.Max(0,c.Y("kalan")-validDt));
        if(wasActive&&c.Y("kalan")<=0){c.Y("bekleme",c.P("sarj")!=0?0:c.Local["ozelBekleme"].N(c.Parameters["bekleme"].N()));c.Local.Remove("uc");c.Local.Remove("ozelBekleme");c.Local.Set("hedef",Null());c.Local.Set("nokta",Null());c.Local.Set("islenen",Arr(Array.Empty<CatalogNode>()));c.Y("uzatma",0);}
      }
      // Durumlar tüm skill adımlarından sonra işler; ateşin ürettiği olayın nedensel derinliği birdir.
      foreach(var pair in d["hedefler"].Fields){string id=pair.Key;var target=pair.Value;var body=world.Targets.Items.FirstOrDefault(h=>h["id"].S()==id);
        foreach(var status in target["durumlar"].Items){
          if(body!=null&&status["tur"].S()=="ates")WriteDamage(d,world,flags,stepDamage,id,2,"ates","ates",30,e=>queue.Add((e,1)));
          if(body!=null&&status["tur"].S()=="elektrik"){double v=Speed(body);if(v>2){if(!output["hedefIvme"].Has(id))output["hedefIvme"].Set(id,Obj(("x",Num(0)),("z",Num(0))));var a=output["hedefIvme"][id];Add(a,"x",-body["vx"].N()/v*3.5);Add(a,"z",-body["vz"].N()/v*3.5);}}
          Add(status,"kalan",-validDt);
        }target.Set("durumlar",Arr(target["durumlar"].Items.Where(q=>q["kalan"].N()>0)));
      }
      int processed=0;
      for(int i=0;i<queue.Count;i++){
        var record=queue[i];string type=record.Event["tur"].S();if(type!="KonumEtkisi"&&type!="HasarVerildi")continue;var o=list.FirstOrDefault(q=>q["id"].S()==record.Event["kaynak"].S());if(o==null||!o["eklentiler"].Items.Any())continue;var definition=Find(o["id"].S())!;
        foreach(var addon in o["eklentiler"].Items){string id=addon.S();bool shock=id=="sok-bobini",fire=id=="kor-cekirdegi";if((!shock&&!fire)||(shock?"KonumEtkisi":"HasarVerildi")!=type||!definition.Tags.Contains(shock?"konum":"hasar"))continue;
          if(record.Depth+1>3||processed>=64){Add(d,"kesilen",1);continue;}processed++;WriteStatus(d,world,record.Event["hedef"].S(),shock?"elektrik":"ates",shock?1.2:2,definition.Id+"/"+id,e=>queue.Add((e,record.Depth+1)));
        }
      }
      output.Set("olaylar",Arr(queue.Take(64).Select(k=>k.Event)));if(queue.Count>64)Add(d,"kesilen",queue.Count-64);
      LimitAcceleration(output["oyuncuIvme"]);foreach(var a in output["hedefIvme"].Fields)LimitAcceleration(a.Value);
      if(output["ucus"].ToString()!="null"){var u=output["ucus"];double m=H(u["x"].N(),u["z"].N());if(m>60){Set(u,"x",u["x"].N()*60/m);Set(u,"z",u["z"].N()*60/m);}Set(u,"y",Math.Max(-60,Math.Min(84,u["y"].N())));}
      return (d,output);
    }
    public static (CatalogNode State,CatalogNode Events) ObserveProximity(CatalogNode state,MutantSkillWorld world,IEnumerable<CatalogNode> obstacles,double dt,bool hit=false)
    {
      var d=state.Clone();var events=new List<CatalogNode>();if(!world.Racing||!(dt>0)||dt>1d/30)return(d,Arr(events));var player=world.Player;double speed=Speed(player),step=d["adim"].N();
      if(hit){d.Set("yakin",CatalogNode.Obj());Set(d,"sonCarpma",step);}
      void Approach(string id,double gap){
        if(gap<1.2&&speed>18&&!hit){if(!d["yakin"].Has(id))Set(d["yakin"],id,step);}
        else if(d["yakin"].Has(id)&&gap>3){d["yakin"].Remove(id);if((!d["sonNearMiss"].Has(id)||step-d["sonNearMiss"][id].N()>180)&&step-d["sonCarpma"].N()>60){Set(d["sonNearMiss"],id,step);events.Add(Obj(("tur",Str("NearMiss")),("hedef",Str(id)),("hiz",Num(speed))));}}
      }
      foreach(var h in world.Targets.Items){string id=h["id"].S();double dx=h["x"].N()-player["x"].N(),dz=h["z"].N()-player["z"].N(),distance=H(dx,dz);
        bool following=speed>15&&distance>=3&&distance<=12&&Math.Abs(Delta(Math.Atan2(dx,dz),Direction(player)))<.35&&H(player["vx"].N()-h["vx"].N(),player["vz"].N()-h["vz"].N())<8;
        double credit=d["takipKredi"][id].N(4);if(following&&credit>1e-9){events.Add(Obj(("tur",Str("YakinTakip")),("hedef",Str(id)),("dt",Num(Math.Min(dt,credit))),("mesafe",Num(distance))));Set(d["takipKredi"],id,Math.Max(0,credit-dt));}else if(!following)Set(d["takipKredi"],id,Math.Min(4,credit+.25*dt));Approach(id,distance-2.2);
      }
      foreach(var e in obstacles)Approach(e["id"].S(),H(e["x"].N()-player["x"].N(),e["z"].N()-player["z"].N())-e["r"].N()-1);return(d,Arr(events));
    }
  }
}
