using LastTurn.Core;

internal static class MutantHookValidation
{
  public static void Run()
  {
    int checks=0,steps=0,checkpoints=0;double worst=0;
    void Check(bool yes,string label){checks++;if(!yes)throw new Exception(label);}
    void Same(CatalogNode a,CatalogNode b){if(b.IsNumber){double error=Math.Abs(a.N(double.NaN)-b.N());worst=Math.Max(worst,error);Check(double.IsFinite(error)&&error<=1e-9*Math.Max(1,Math.Abs(b.N())),"TS sayı");}else if(b.IsObject){Check(a.IsObject&&a.Fields.Select(x=>x.Key).Order().SequenceEqual(b.Fields.Select(x=>x.Key).Order()),"TS alan");foreach(var p in b.Fields)Same(a[p.Key],p.Value);}else if(b.IsArray){Check(a.IsArray&&a.Items.Count()==b.Items.Count(),"TS dizi");for(int i=0;i<b.Items.Count();i++)Same(a[i],b[i]);}else Check(a.ToString()==b.ToString(),"TS değer");}
    var fixture=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-skills-0.8.18.json")));
    Check(fixture["baseline"].S()==VehicleCatalog.Baseline,"TS kaynağı korunur");
    foreach(var scenario in fixture["scenarios"].Items.Where(s=>s["equipped"].Items.Count()==1&&s["equipped"][0]["id"].S()=="grappling-hook"))
    {
      var state=scenario["initial"].Clone();var previous=CatalogNode.Arr(Array.Empty<CatalogNode>());
      foreach(var frame in scenario["steps"].Items)
      {
        var w=frame["world"];var world=new MutantSkillWorld{Player=w["oyuncu"].Clone(),Targets=w["hedefler"].Clone(),Racing=w["yarista"].B(),Ground=w["zemin"].N(),Steering=w["direksiyon"].N(),Held=w.Has("tutulan")?w["tutulan"].Items.Select(x=>x.S()).ToArray():null,Link=(_,_)=>w.Has("link")?w["link"].Items.Select(x=>x.N()).ToArray():null,Corner=w.Has("corner")?_=>w["corner"].Clone():null,Sky=w.Has("sky")?()=>w["sky"].Clone():null};
        var eq=(frame.Has("equipped")?frame["equipped"]:scenario["equipped"]).Items.ToArray();var hook=eq.First(x=>x["id"].S()=="grappling-hook");string before=state.ToString(),player=world.Player.ToString(),targets=world.Targets.ToString();
        var query=MutantSkills.InspectHook(hook,MutantSkills.Parameters("grappling-hook",hook),world);var requests=MutantSkills.Requests(state,eq,world,frame["requests"].Items.Select(x=>x.S()));
        Check(before==state.ToString()&&player==world.Player.ToString()&&targets==world.Targets.ToString(),"Hedef sorgusu salt");
        if(frame.Has("helpers")){var h=frame["helpers"];foreach(var p in h["blockers"].Fields)Same(MutantSkills.Blocker(state,eq,world,p.Key) is string b?CatalogNode.Str(b):CatalogNode.Null(),p.Value);foreach(var p in h["targets"].Fields){var point=MutantSkills.TargetPoint(state,eq,world,p.Key);Same(point==null?CatalogNode.Null():CatalogNode.Arr(point.Select(CatalogNode.Num)),p.Value);}}
        var events=new List<CatalogNode>();if(frame["feedback"].B())events.AddRange(previous.Items);events.AddRange(frame["events"].Items);var result=MutantSkills.Step(state,eq,world,frame["dt"].N(),events,frame["unfiltered"].B()?frame["requests"].Items.Select(x=>x.S()):requests);state=result.State;previous=result.Output["olaylar"];steps++;
        if(frame.Has("expected")){Same(state,frame["expected"]["d"]);Same(result.Output,frame["expected"]["cikti"]);checkpoints++;}
      }
    }
    Check(checkpoints>0,"Kaynak karşılaştırması boş değil");
    var available=new MutantHookQuery{Target=CatalogNode.Obj(),Kind="kose"};var hud=new MutantSkillHud{Id="grappling-hook",Hook=available,MaxCharges=1,Charges=1,FullWait=6};
    Check(MutantSkillSlot.Read(hud).Text=="HEDEF · KÖŞE","Geçerli hedef");hud.Hook=new MutantHookQuery();hud.Blocker="hedef";Check(MutantSkillSlot.Read(hud).Text=="HEDEF YOK","Hedef yok");hud.Blocker="bekleme";hud.Wait=3;Check(MutantSkillSlot.Read(hud).Text.StartsWith("BEKLE"),"Bekleme");hud.Charges=0;Check(MutantSkillSlot.Read(hud).Text.Contains("HAK YOK")&&MutantSkillSlot.Read(hud).State=="bekle","Hak yok ve dolum ayrı bilgi");hud.Open=true;hud.Target=CatalogNode.Str("#kose");hud.Left=2;Check(MutantSkillSlot.Read(hud).Text=="BAĞLI · KÖŞE","Bağlı hedef öncelikli");
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));var catalog=CatalogNode.Parse(File.ReadAllText(Path.Combine(root,"Assets/LastTurn/Resources/mutant-catalog.json")));var a=new MutantRun(53,catalog);var control=new MutantRun(53,catalog);var hookDef=CatalogNode.Parse("{\"id\":\"grappling-hook\",\"seviye\":1,\"evrim\":null,\"eklentiler\":[]}");var empty=new MutantSkillWorld();string initial=a.State.ToString();for(int i=0;i<100;i++)MutantSkills.InspectHook(hookDef,MutantSkills.Parameters("grappling-hook",hookDef),empty);Check(a.State.ToString()==initial,"Koşu aynı");Check(a.RefreshStock()&&control.RefreshStock()&&a.State.ToString()==control.State.ToString(),"Özel RNG sonraki stok sonucu aynı");
    string Resource(string name)=>File.ReadAllText(Path.Combine(root,"Assets/LastTurn/Resources",name));var vehicles=new VehicleCatalog(Resource("vehicle-catalog.json"));var worlds=new MutantSkillWorldFactory(Resource("mutant-skill-world.json"));
    var twins=new[]{new MutantRun(53,catalog),new MutantRun(53,catalog)};var drivers=new List<MutantAbilityDriver>();
    foreach(var r in twins){r.Choose(r.State["secenekler"][0].S());r.State.Set("beceriler",CatalogNode.Arr(new[]{hookDef.Clone()}));var d=new MutantAbilityDriver(r,worlds);var session=new MutantGameSession(r,vehicles,0,0,0);d.BeginStep(new MutantAbilityContext{HasBody=true,Racing=true,RaceRunning=true,Ground=0,X=0,Z=0,Vx=0,Vz=15,Opponent=CatalogNode.Parse("{\"id\":\"rakip\",\"x\":0,\"z\":20,\"vx\":0,\"vz\":15}")});d.Step(session,new MutantSessionInput(),1d/60,false);drivers.Add(d);}
    string runBefore=twins[0].State.ToString();for(int i=0;i<100;i++){var skill=drivers[0].Skills().Single();Check(skill.Hook?.Kind=="rakip"&&skill.Ready,"Gerçek driver salt hedef");MutantHudModel.Read(twins[0],MutantMenuModel.Read(twins[0],vehicles,0),drivers[0],null,0,0,true);}
    Check(twins[0].State.ToString()==runBefore&&twins[0].State.ToString()==twins[1].State.ToString()&&drivers[0].LastHookAttempt==null,"Driver/HUD sorgusu durum ve komut telemetrisi değiştirmez");Check(twins[0].RefreshStock()&&twins[1].RefreshStock()&&twins[0].State.ToString()==twins[1].State.ToString(),"HUD sonrası özel RNG aynıdır");
    drivers[0].RaceStart();drivers[1].RaceStart();Check(drivers[0].Skills().Single().Hook?.Reason=="context"&&!drivers[0].Skills().Single().Ready,"Yeni yarış eski dünya hedefini göstermez");Check(twins[0].State.ToString()==twins[1].State.ToString(),"Hedef bağlamı temizliği oyuna yeni durum yazmaz");
    var feedback=new MutantHudFeedback();feedback.Observe(twins[0],drivers[0]);
    for(int n=0;n<2;n++){for(int i=0;i<2;i++){drivers[i].PressSkill(0);drivers[i].BeginStep(new MutantAbilityContext{HasBody=true,Racing=true,RaceRunning=true,Vz=15,Opponent=CatalogNode.Parse("{\"id\":\"rakip\",\"x\":0,\"z\":20,\"vx\":0,\"vz\":15}")});drivers[i].Step(new MutantGameSession(twins[i],vehicles,0,0,0),new MutantSessionInput(),1d/60,false);}feedback.Observe(twins[0],drivers[0]);Check(feedback.Text.Contains(n==0?"bağlandı":"bırakıldı"),"Gerçek komut bildirimi");long seq=feedback.Sequence;feedback.Observe(twins[0],drivers[0]);Check(feedback.Sequence==seq,"Aynı komut bildirimi tekrarlanmaz");Check(twins[0].State.ToString()==twins[1].State.ToString(),"Bildirim oyun durumuna yazmaz");}
    Console.WriteLine($"Kanca: {checks} kontrol, {steps} TS adımı/{checkpoints} nokta; en büyük fark {worst:G3}; salt sorgu/RNG/HUD geçti.");
  }
}
