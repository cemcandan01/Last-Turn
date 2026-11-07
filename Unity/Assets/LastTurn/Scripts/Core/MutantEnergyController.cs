#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // TS mutant-kosu.ts enerjiAdimi. Fizik sonrası olay sırası ve tek artan sıra uzayı korunur.
  public sealed class MutantEnergyController
  {
    public readonly MutantRun Run;
    private DriftObservation observation=new DriftObservation();
    public MutantEnergyController(MutantRun run)
    {
      Run=run;var s=run.State;
      if(!s.Has("bec"))s.Set("bec",MutantSkills.Initialize());
      if(!s.Has("becCikti"))s.Set("becCikti",CatalogNode.Parse("null"));
      if(!s.Has("becEngel"))s.Set("becEngel",CatalogNode.Obj());if(!s.Has("becHedef"))s.Set("becHedef",CatalogNode.Obj());
      if(s.Has("gozlem")){var g=s["gozlem"];observation=new DriftObservation{Open=g["acik"].B(),Duration=g["sure"].N(),Seq=g["sira"].N()};}
    }
    public void RaceStart()
    {var d=Run.State["bec"].Clone();foreach(string k in new[]{"hedefler","sonVurus","takipKredi","yakin","sonNearMiss"})d.Set(k,CatalogNode.Obj());Run.State.Set("bec",d);}
    private static CatalogNode Event(string kind,params (string Key,CatalogNode Value)[] fields)
    {var n=CatalogNode.Obj();n.Set("tur",CatalogNode.Str(kind));foreach(var f in fields)n.Set(f.Key,f.Value);return n;}
    private static CatalogNode Number(double n)=>CatalogNode.Num(n);
    private static CatalogNode Bool(bool b)=>CatalogNode.Parse(b?"true":"false");
    private static CatalogNode DriftEvent(MechanicEvent e)
    {
      var n=Event(e.Kind,("sira",Number(e.Seq)));
      if(e.Kind=="DriftStarted")n.Set("yon",Number(e.Direction));
      if(e.Kind=="SurusTick"||e.Kind=="DriftTickQualified"){n.Set("dt",Number(e.Dt));n.Set("hiz",Number(e.Speed));}
      if(e.Kind=="SurusTick")n.Set("havada",Bool(e.Airborne));
      if(e.Kind=="DriftTickQualified")n.Set("aci",Number(e.Angle));
      if(e.Kind=="DriftEnded"){n.Set("sure",Number(e.Duration));n.Set("spin",Bool(e.Spin));}return n;
    }
    private static MechanicEvent Mechanic(CatalogNode e)=>new MechanicEvent{Kind=e["tur"].S(),Seq=e["sira"].N(),Dt=e["dt"].N(),Speed=e["hiz"].N(),Angle=e["aci"].N(),Duration=e["sure"].N(),Amount=e["miktar"].N(),Risk=e["risk"].N(),Distance=e["mesafe"].N(),Direction=e["yon"].N(),Severity=e["siddet"].N(),Spin=e["spin"].B(),Airborne=e["havada"].B(),Ability=e["yetenek"].S(),Damage=e["hasar"].S(),Target=e["hedef"].S(),DamageType=e["hasar"].S(),Effect=e["etki"].S(),Status=e["durum"].S(),Source=e["kaynak"].S()};
    public bool Step(DriftObserverInput input,MutantSkillWorld world,IEnumerable<CatalogNode> obstacles,double dt,bool nitro,IEnumerable<string> requested,bool hit=false)
    {
      var s=Run.State;var old=MechanicState.FromNode(s["mek"]);double before=MutantMechanics.PowerMultiplier(old),power=s["becCikti"]["guc"].N(1),grip=s["becCikti"]["tutus"].N(1);
      var observed=MutantMechanics.ObserveDrift(observation,input,dt,true);observation=observed.G;var events=observed.Events.Select(DriftEvent).ToList();
      var identities=new Dictionary<double,MechanicEventIdentity>();
      void Add(CatalogNode e){var n=e.Clone();double seq=observation.Seq++;n.Set("sira",Number(seq));
        if(e["tur"].S()=="HasarVerildi")identities[seq]=Run.DamageEvents.IdentityForGiven(e);events.Add(n);}
      if(s["bekleyenRisk"].IsNumber)Add(Event("RiskBasladi",("risk",s["bekleyenRisk"])));
      double damageSeq=-1;MechanicEventIdentity? damageIdentity=null;
      if(s["bekleyenHasar"].Has("tur")){
        damageSeq=observation.Seq;damageIdentity=Run.DamageEvents.IdentityFor(s["bekleyenHasar"]);
        Add(Event("HasarAlindi",("hasar",s["bekleyenHasar"]["tur"]),("miktar",s["bekleyenHasar"]["miktar"])));
      }
      if(nitro)Add(Event("AbilityActivated",("yetenek",CatalogNode.Str("nitro"))));
      var nearby=MutantSkills.ObserveProximity(s["bec"],world,obstacles,dt,hit);s.Set("bec",nearby.State);
      foreach(var e in s["bekleyenBeceri"].Items.Concat(nearby.Events.Items))Add(e);
      var equipped=s["beceriler"].Items.ToArray();var requests=MutantSkills.Requests(s["bec"],equipped,world,requested);
      s.Set("bekleyenRisk",CatalogNode.Parse("null"));s.Set("bekleyenHasar",CatalogNode.Parse("null"));s.Set("bekleyenBeceri",CatalogNode.Arr(Array.Empty<CatalogNode>()));
      var definitions=Run.Catalog["passives"].Items.Concat(Run.Catalog["addons"].Items).ToArray();
      var installed=MutantMechanics.Installed(s["pasifler"].Items.Select(p=>p.S()),id=>definitions.FirstOrDefault(p=>p["id"].S()==id));
      var mechanicEvents=events.Select(Mechanic).ToArray();
      foreach(var e in mechanicEvents){if(identities.TryGetValue(e.Seq,out var id))e.Identity=id;if(e.Kind=="HasarAlindi"&&e.Seq==damageSeq)e.Identity=damageIdentity;}
      var mechanic=MutantMechanics.Step(old,mechanicEvents,installed,true,dt,Run.DamageEvents);s.Set("mek",mechanic.ToNode());
      var skills=MutantSkills.Step(s["bec"],equipped,world,dt,events,requests,Run.DamageEvents);s.Set("bec",skills.State);s.Set("becCikti",skills.Output);s.Set("bekleyenBeceri",Run.DamageEvents.CloneEvents(skills.Output["olaylar"]));
      var blockers=CatalogNode.Obj();var targets=CatalogNode.Obj();foreach(var e in equipped){string id=e["id"].S();string? block=MutantSkills.Blocker(skills.State,equipped,world,id);blockers.Set(id,block==null?CatalogNode.Parse("null"):CatalogNode.Str(block));var target=MutantSkills.TargetPoint(skills.State,equipped,world,id);targets.Set(id,target==null?CatalogNode.Parse("null"):CatalogNode.Arr(target.Select(Number)));}
      s.Set("becEngel",blockers);s.Set("becHedef",targets);s.Set("gozlem",Event("",("acik",Bool(observation.Open)),("sure",Number(observation.Duration)),("sira",Number(observation.Seq))));s["gozlem"].Remove("tur");
      return MutantMechanics.PowerMultiplier(mechanic)!=before||skills.Output["guc"].N()!=power||skills.Output["tutus"].N()!=grip;
    }
  }
}
