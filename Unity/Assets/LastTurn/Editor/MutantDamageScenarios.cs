using System;
using System.Collections.Generic;
using System.Linq;
using LastTurn.Core;

namespace LastTurn.EditorValidation
{
  // Aynı dar senaryolar .NET ve gerçek Unity Play içinde çalışır; Unity API kullanmaz.
  public static class MutantDamageScenarios
  {
    public static List<string> VerifyGiven(CatalogNode catalog)
    {
      var checks=new List<string>();void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);checks.Add(label);}
      var r=new MutantRun(53,catalog);r.State.Set("faz",CatalogNode.Str("surus"));r.State.Set("pasifler",CatalogNode.Parse("[\"hasar-bataryasi\"]"));
      var w=new MutantSkillWorld{Racing=true,Player=CatalogNode.Parse("{\"x\":0,\"z\":0,\"vx\":0,\"vz\":0}"),Targets=CatalogNode.Parse("[{\"id\":\"r\",\"x\":0,\"z\":0,\"vx\":0,\"vz\":0}]")};
      var c=new MutantEnergyController(r);var seen=new List<MechanicEvent>();r.DamageEvents.Observe=e=>seen.Add(e);
      void Equip(){r.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"risk-taker\",\"seviye\":1,\"eklentiler\":[],\"evrim\":null}]"));r.State["bec"]["yerel"].Set("risk-taker",CatalogNode.Parse("{\"kalan\":1,\"iz\":[[0,0,1.5]]}"));}
      void Step()=>c.Step(new DriftObserverInput(),w,Array.Empty<CatalogNode>(),1d/60,false,Array.Empty<string>());
      double Energy()=>r.State["mek"]["enerji"].N();
      Equip();Step();var pending=r.State["bekleyenBeceri"];var original=pending.Items.Single(e=>e["tur"].S()=="HasarVerildi");
      var originalId=r.DamageEvents.IdentityForGiven(original);
      Check(original["miktar"].N()==4&&Energy()==40,"Gerçek skill hasarı ilk adımda üretilir, enerji sonraki adıma bekler");
      r.State.Set("beceriler",CatalogNode.Arr(Array.Empty<CatalogNode>()));Step();
      Check(Energy()==42,"Hasar Bataryası sonraki adımda gerçek4 hasardan2 enerji üretir");
      var accepted=seen.Single(e=>e.Kind=="HasarVerildi");
      Check(accepted.Identity==originalId,"Üretici ve controller deep clone aynı zarfı taşır");
      var child=seen.Single(e=>e.Kind=="EnergyGained"&&e.Source=="hasar-bataryasi");
      Check(child.Identity!=null&&child.Identity.Root==originalId.Root&&child.Identity.Parent==originalId.Id,"HasarVerildi enerji türevi kök/ebeveyn kimliğini korur");
      for(int i=0;i<20;i++)Step();double last=r.State["mek"]["sonSira"].N();
      r.State.Set("bekleyenBeceri",r.DamageEvents.CloneEvents(pending));Step();
      Check(r.State["mek"]["sonSira"].N()>last&&Energy()==42&&r.DamageEvents.Replays==1,"Bekleme dolduktan sonra yeni Seq ile replay enerji vermez");
      for(int i=0;i<20;i++)Step();Equip();Step();var fresh=r.State["bekleyenBeceri"].Items.Single(e=>e["tur"].S()=="HasarVerildi");
      Check(fresh["miktar"].N()==original["miktar"].N()&&r.DamageEvents.IdentityForGiven(fresh).Id!=originalId.Id,"Aynı miktarlı farklı gerçek vuruşun ayrı kimliği var");
      r.State.Set("beceriler",CatalogNode.Arr(Array.Empty<CatalogNode>()));Step();Check(Energy()==44,"Farklı gerçek vuruş bağımsız2 enerji üretir");
      for(int i=0;i<60;i++){r.State.Set("bekleyenBeceri",r.DamageEvents.CloneEvents(pending));Step();}
      Check(Energy()==44&&r.DamageEvents.Replays==61,"Altmış adımlık yinelenen hasar sonsuz enerji üretmez");
      return checks;
    }
    public static List<string> Verify(CatalogNode catalog)
    {
      var checks=new List<string>();
      void Check(bool ok,string label){if(!ok)throw new InvalidOperationException(label);checks.Add(label);}
      void Near(double expected,double actual,string label)=>Check(Math.Abs(expected-actual)<1e-9,label);
      var run=new MutantRun(53,catalog);run.State.Set("faz",CatalogNode.Str("surus"));
      run.State.Set("pasifler",CatalogNode.Parse("[\"carpisma-pili\",\"ek-hasar-donusturucu\"]"));
      run.State["mek"].Set("enerji",CatalogNode.Num(0));
      var controller=new MutantEnergyController(run);var observed=new List<MechanicEvent>();
      run.DamageEvents.Observe=e=>observed.Add(e);
      var world=new MutantSkillWorld{Player=CatalogNode.Parse("{\"x\":0,\"z\":0,\"vx\":0,\"vz\":0}"),Targets=CatalogNode.Arr(Array.Empty<CatalogNode>())};
      void Step()=>controller.Step(new DriftObserverInput(),world,Array.Empty<CatalogNode>(),1d/60,false,Array.Empty<string>());
      double Energy()=>run.State["mek"]["enerji"].N();
      run.Damage("carpma");var notice=run.State["bekleyenHasar"];string noticeJson=notice.ToString();Step();
      Near(27,Energy(),"Tek gerçek hasar iki enerji mekanizmasını bir kez besler");
      Check(!notice.Fields.Any(p=>p.Key!="tur"&&p.Key!="miktar"),"Legacy hasar JSON şeması aynı");
      var root=observed.Single(e=>e.Kind=="HasarAlindi");var children=observed.Where(e=>e.Kind=="EnergyGained").ToArray();
      Check(root.Identity!=null&&!root.Identity.Derived&&root.Identity.Parent==null&&root.Identity!.Id==root.Identity!.Root,"Hasar kök kimliği var");
      Check(children.Length==2&&children.All(e=>e.Identity!=null&&e.Identity.Derived&&e.Identity.Root==root.Identity!.Root&&e.Identity!.Parent==root.Identity!.Id),"İki enerji türevinin kök ve ebeveyni doğru");
      Check(children.Select(e=>e.Identity!.Id).Distinct().Count()==2,"Bağımsız tüketicilerin türev kimlikleri farklı");
      double firstSeq=root.Seq;observed.Clear();run.State.Set("bekleyenHasar",notice);Step();
      Near(27,Energy(),"Aynı hasar yeni fizik adımı/sırada tekrar enerji vermez");
      Check(run.DamageEvents.Replays==1&&!observed.Any(e=>e.Kind=="HasarAlindi"),"Tekrar kökü tüketiciye ulaşmadan kesilir");
      Check(run.State["mek"]["sonSira"].N()>firstSeq,"Replay gerçekten yeni sıra numarasıyla denendi");
      run.Damage("carpma");var second=run.State["bekleyenHasar"];Step();
      Near(54,Energy(),"Aynı tür/miktardaki farklı gerçek hasar bağımsız işlenir");
      Check(second.ToString()==noticeJson&&run.DamageEvents.IdentityFor(second).Id!=root.Identity!.Id,"Payload eşitliği kök eşitliği değildir");
      controller=new MutantEnergyController(run);controller.RaceStart();run.State.Set("bekleyenHasar",notice);Step();
      Near(54,Energy(),"Controller yeniden bağlama ve RaceStart tüketim belleğini silmez");
      Check(run.DamageEvents.Replays==2,"Run ömürlü tekrar belleği korunur");

      var state=MechanicState.FromNode(run.State["mek"]);var copied=root.With(state.LastSeq+1);
      Check(copied.Identity==root.Identity,"With yeni Seq verirken kök zarfını korur");
      var definitions=MutantMechanics.Installed(new[]{"carpisma-pili"},id=>catalog["passives"].Items.FirstOrDefault(x=>x["id"].S()==id));
      var replay=MutantMechanics.Step(state,new[]{copied},definitions,true,1d/60,run.DamageEvents);
      Near(state.Energy,replay.Energy,"Mekanik sınırında kopya olay/new Seq ikinci ödül vermez");
      observed.Clear();var deferred=children[0].With(replay.LastSeq+1);
      MutantMechanics.Step(replay,new[]{deferred},definitions,true,1d/60,run.DamageEvents);
      Check(observed.Any(e=>e.Kind=="EnergyGained"&&e.Identity!.Id==deferred.Identity!.Id&&e.Identity!.Parent==root.Identity!.Id),"Sonraki adıma taşınan türev kök filtresinde kaybolmaz");

      var channel=new MutantDamageEvents();var pending=CatalogNode.Parse("{\"tur\":\"spin\",\"miktar\":8}");
      var late=new MechanicEvent{Kind="HasarAlindi",Amount=8,Seq=0,Identity=channel.IdentityFor(pending)};
      var start=MutantMechanics.Start();
      Check(ReferenceEquals(start,MutantMechanics.Step(start,new[]{late},definitions,false,1d/60,channel)),"Etkin olmayan adım kökü tüketmez");
      var tooMany=Enumerable.Range(0,64).Select(i=>new MechanicEvent{Kind="noop",Seq=i}).Concat(new[]{late.With(64)}).ToArray();
      var cut=MutantMechanics.Step(start,tooMany,definitions,true,1d/60,channel);
      Check(cut.Cut==1,"64 işlem sınırı korunur");
      var retry=MutantMechanics.Step(cut,new[]{late.With(65)},definitions,true,1d/60,channel);
      Near(12,retry.Energy,"İşlem sınırı nedeniyle işlenmeyen kök sonraki adıma kaybolmadan geçer");
      var duplicate=MutantMechanics.Step(retry,new[]{late.With(66)},definitions,true,1d/60,channel);
      Near(12,duplicate.Energy,"Sonradan gerçekten işlenen kök artık tekrar vermez");
      var otherRun=new MutantRun(53,catalog);var otherId=otherRun.DamageEvents.IdentityFor(CatalogNode.Obj());
      Check(otherId.Id==root.Identity!.Id,"Aynı tohumda kimlik dizisi deterministik ve koşuya özgü");
      var other=MutantMechanics.Step(MutantMechanics.Start(),new[]{new MechanicEvent{Kind="HasarAlindi",Amount=12,Seq=0,Identity=otherId}},definitions,true,1d/60,otherRun.DamageEvents);
      Near(12,other.Energy,"Başka koşunun aynı yerel kökü eski koşuda tüketilmiş sayılmaz");
      return checks;
    }
  }
}
