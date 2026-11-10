using LastTurn.Core;

// TS enerjiAdimi: gerçek koşu durumu üzerinde gözlemci, bekleyen olaylar, nitro, skill yakınlık/istek/adım ve HUD engel/hedef kayıtları.
internal static class MutantEnergyValidation
{
  public static void Run()
  {
    var fixture=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-energy-0.8.18.json")));
    var catalog=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"../../../../Assets/LastTurn/Resources/mutant-catalog.json")));
    int checks=0,steps=0,changed=0;double worst=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException("Mutant enerji: "+label);}
    void Same(CatalogNode actual,CatalogNode expected,string label)
    {
      if(expected.IsNumber){double delta=Math.Abs(actual.N(double.NaN)-expected.N());worst=Math.Max(worst,delta);Check(double.IsFinite(delta)&&delta<=1e-9*Math.Max(1,Math.Abs(expected.N())),label+" TS "+expected+" C# "+actual);return;}
      if(expected.ToString().StartsWith("{")){
        Check(actual.Fields.Select(p=>p.Key).OrderBy(k=>k).SequenceEqual(expected.Fields.Select(p=>p.Key).OrderBy(k=>k)),label+" nesne alanları TS "+string.Join(",",expected.Fields.Select(p=>p.Key))+" C# "+string.Join(",",actual.Fields.Select(p=>p.Key)));
        foreach(var p in expected.Fields)Same(actual[p.Key],p.Value,label+"."+p.Key);return;
      }
      if(expected.ToString().StartsWith("[")){var a=actual.Items.ToArray();var e=expected.Items.ToArray();Check(a.Length==e.Length,label+" dizi uzunluğu TS "+e.Length+" C# "+a.Length);for(int i=0;i<e.Length;i++)Same(a[i],e[i],label+"["+i+"]");return;}
      Check(actual.ToString()==expected.ToString(),label+" TS "+expected+" C# "+actual);
    }
    MutantSkillWorld World(CatalogNode w)=>new MutantSkillWorld{
      Player=w["oyuncu"].Clone(),Targets=w["hedefler"].Clone(),Racing=w["yarista"].B(),Ground=w["zemin"].N(),Steering=w["direksiyon"].N(),
      Held=w.Has("basili")?w["basili"].Items.Select(x=>x.S()).ToArray():null,
      Link=(_,_)=>w["link"].IsNumber||w["link"].Items.Any()?w["link"].Items.Select(x=>x.N()).ToArray():null,
      Corner=w.Has("corner")?_=>w["corner"].Clone():null,Sky=w.Has("sky")?()=>w["sky"].Clone():null};
    var worlds=new MutantSkillWorldFactory(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"../../../../Assets/LastTurn/Resources/mutant-skill-world.json")));
    CatalogNode Num(double? n)=>n.HasValue?CatalogNode.Num(n.Value):CatalogNode.Parse("null");
    CatalogNode Text(string? t)=>t==null?CatalogNode.Parse("null"):CatalogNode.Str(t);
    CatalogNode Bool(bool b)=>CatalogNode.Parse(b?"true":"false");
    CatalogNode Hud(MutantSkillHud h){var n=CatalogNode.Obj();
      foreach(var (k,v) in new (string,CatalogNode)[]{("id",Text(h.Id)),("ad",Text(h.Name)),("tur",Text(h.Kind)),("seviye",Num(h.Level)),("evrim",Text(h.Evolution)),
        ("eklentiler",CatalogNode.Arr(h.Addons.Select(CatalogNode.Str))),("acik",Bool(h.Open)),("kalan",Num(h.Left)),("bekleme",Num(h.Wait)),("sarj",Num(h.Charges)),
        ("sarjUst",Num(h.MaxCharges)),("sure",Num(h.Duration)),("beklemeTam",Num(h.FullWait)),("bar",Num(h.Bar)),("engel",Text(h.Blocker)),
        ("hedefNokta",h.TargetPoint==null?CatalogNode.Parse("null"):CatalogNode.Arr(h.TargetPoint.Select(CatalogNode.Num))),("hedef",h.Target??CatalogNode.Parse("null")),
        ("nokta",h.Point??CatalogNode.Parse("null")),("hazir",Bool(h.Ready))})n.Set(k,v);return n;}
    CatalogNode NitroHud(MutantNitroHud h){var n=CatalogNode.Obj();foreach(var (k,v) in new (string,CatalogNode)[]{("enerji",Num(h.Energy)),("kapasite",Num(h.Capacity)),
      ("maliyet",Num(h.Cost)),("acik",Bool(h.Open)),("kalan",Num(h.Left)),("hazir",Bool(h.Ready))})n.Set(k,v);return n;}
    int hudRowCount=0;
    Check(fixture["baseline"].S()==VehicleCatalog.Baseline,"Sabit TS kaynak SHA");
    foreach(var scenario in fixture["scenarios"].Items)
    {
      var initial=scenario["initial"];var run=new MutantRun((uint)scenario["seed"].N(),catalog,initial["test"].B());
      foreach(var key in new[]{"pasifler","beceriler","mek","bec","gozlem","govde"})run.State.Set(key,initial[key].Clone());
      var driver=new MutantAbilityDriver(run,worlds);var energy=driver.Energy;int index=0;
      foreach(var step in scenario["steps"].Items)
      {
        string label="tohum "+scenario["seed"].N()+" adım "+index++;
        if(step["raceStart"].B())energy.RaceStart();
        if(step["damage"].S()!="")run.Damage(step["damage"].S());
        if(step["risk"].IsNumber)run.State.Set("bekleyenRisk",step["risk"].Clone());
        var d=step["d"];var input=new DriftObserverInput{Vx=d["S"]["vx"].N(),Vz=d["S"]["vz"].N(),Air=d["S"]["air"].B(),DriftOn=d["DR"]["on"].N()!=0,Direction=d["DR"]["dir"].N(),Cool=d["DR"]["cool"].N(),Beta=d["D"]["beta"].N()};
        var stepWorld=World(step["world"]);
        bool result=energy.Step(input,stepWorld,step["obstacles"].Items,step["dt"].N(),step["nitro"].B(),step["requests"].Items.Select(x=>x.S()),step["hit"].B());
        Check(result==step["changed"].B(),label+" güç/tutuş değişimi TS "+step["changed"]+" C# "+result);changed+=result?1:0;
        foreach(var p in step["expected"].Fields)Same(run.State[p.Key],p.Value,label+" "+p.Key);
        // 9d9d18a: kanca HUD engeli sürücünün Step'te gözlediği dünyadan (yeni yarışta eski hedef yok). Bu test Energy.Step'i
        // doğrudan çağırdığından sürücü dünyayı gözlemez; kanca satırı aynı adım dünyasıyla, sürücünün kullandığı Blocker ile kurulur.
        var hudRows=driver.Skills().Select(Hud).ToArray();var equipped=run.State["beceriler"].Items.ToArray();
        foreach(var row in hudRows.Where(r=>r["id"].S()=="grappling-hook")){var block=MutantSkills.Blocker(run.State["bec"],equipped,stepWorld,"grappling-hook");row.Set("engel",Text(block));row.Set("hazir",Bool(row["tur"].S()=="aktif"&&block==null));}
        Same(CatalogNode.Arr(hudRows),step["hud"],label+" skill HUD");Same(NitroHud(driver.Nitro()),step["nitroHud"],label+" nitro HUD");hudRowCount+=step["hud"].Items.Count();
        steps++;
      }
    }
    // Oyun bağı (TS mutant.ts): tuş kuyruğu, geri sayım reddi, fizik girdisi, havada nitro/sürükleme ve rakip etkisi.
    int links=0;void Link(bool ok,string label){links++;Check(ok,"bağ: "+label);}
    {
      var first=fixture["scenarios"].Items.First(x=>x["initial"]["beceriler"].Items.Any(o=>o["id"].S()=="grappling-hook"));
      var run=new MutantRun((uint)first["seed"].N(),catalog);foreach(var key in new[]{"pasifler","beceriler","mek","bec","gozlem","govde"})run.State.Set(key,first["initial"][key].Clone());
      run.State.Set("faz",CatalogNode.Str("surus"));var driver=new MutantAbilityDriver(run,worlds);
      int slot=run.State["beceriler"].Items.Select((o,i)=>(o,i)).First(x=>x.o["id"].S()=="grappling-hook").i;
      Link(driver.Physics(1/60.0)?.Flight!=null,"koşu sürerken uçuş denetimi her adım verilir");
      run.State.Set("faz",CatalogNode.Str("secim"));Link(driver.Physics(1/60.0)==null,"etki yokken ve sürüş dışında fizik girdisi yok (fizik birebir aynı)");run.State.Set("faz",CatalogNode.Str("surus"));
      driver.PressSkill(slot);driver.PressSkill(9);Link(driver.Held.Count==1&&driver.Held[0]=="grappling-hook","yuva tuşu basılı listesine girer, boş yuva yok sayılır");
      var ctx=new MutantAbilityContext{Racing=true,RaceRunning=false,Y=1,Vz=20};
      driver.BeginStep(ctx);int before=driver.Refusal.Count;driver.Step(null!,new MutantSessionInput(),1/60.0,false);
      Link(driver.Refusal.Count==before+1&&driver.Refusal.Reason=="basla"&&driver.Refusal.Id=="grappling-hook","yarış başlamadan skill isteği BAŞLANGIÇ ile reddedilir");
      driver.BeginStep(ctx);before=driver.Refusal.Count;driver.Step(null!,new MutantSessionInput(),1/60.0,false);Link(driver.Refusal.Count==before,"istek kuyruğu her adımda boşalır");
      driver.ReleaseSkill(slot);Link(driver.Held.Count==0,"tuş bırakılınca basılı listesinden çıkar");
      run.State["mek"].Set("etkiKalan",CatalogNode.Num(.5));run.State["mek"].Set("etkiGuc",CatalogNode.Num(1));
      Link(driver.Physics(1/60.0)!.Flight.Forward==14,"nitro/etki açıkken havada burun itkisi HAVA_NITRO (etkiKalan>0, güçten bağımsız)");
      run.State["mek"].Set("etkiKalan",CatalogNode.Num(0));
      driver.AirDrag(10,100);var air=driver.Physics(1/60.0)!.Flight.Air;double share=Math.Min(1,12/60.0);
      Link(air.Held&&Math.Abs(air.Pitch-100*.011*share*60)<1e-12&&Math.Abs(air.Yaw+10*.011*share*60)<1e-12,"sürükleme açısı adımlara HAVA_SURUKLE.hiz ile yayılır");
      var next=driver.Physics(1/60.0)!.Flight.Air;Link(Math.Abs(next.Pitch-100*.011*(1-share)*share*60)<1e-12,"kalan sürükleme sonraki adımda verilir");
      driver.AirRelease();Link(!driver.Physics(1/60.0)!.Flight.Air.Held,"parmak kalkınca havada tutma biter");
      var vehicles=new VehicleCatalog(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"../../../../Assets/LastTurn/Resources/vehicle-catalog.json")));
      var setup=OpponentRacer.CreateMutantSetup(vehicles,vehicles.Setup(0,Array.Empty<string>()),new[]{"turbo"});var link=new MutantOpponentLink(vehicles,setup);
      var vehicle=new PowertrainVehicle(vehicles.CreatePhysics(setup));var p0=vehicle.Parameters;
      link.Apply(vehicle,null,100);Link(ReferenceEquals(p0,vehicle.Parameters)&&vehicle.SkillInput==null,"tam gövdeli rakip ve ivmesiz adımda fizik değişmez");
      link.Apply(vehicle,(3,-4),50);Link(Math.Abs(link.Hp-setup.Car["hp"].N()*.85)<1e-9&&!ReferenceEquals(p0,vehicle.Parameters)&&vehicle.SkillInput?.X==3&&vehicle.SkillInput?.Z==-4,"rakip gövdesi %50: güç %15 düşer, skill ivmesi dış kuvvet olur");
      var p1=vehicle.Parameters;link.Apply(vehicle,(0,0),50);Link(ReferenceEquals(p1,vehicle.Parameters)&&vehicle.SkillInput==null,"aynı gövdede yeniden kurulum yok, sıfır ivme kuvveti kaldırır");
      link.Apply(vehicle,null,-20);Link(Math.Abs(link.Hp-setup.Car["hp"].N()*.7)<1e-9,"rakip güç kaybı RAKIP_GUC_KAYBI ile sınırlı");
      var hud=driver.Skills().First(h=>h.Id=="grappling-hook");var open=new MutantSkillHud{Open=true,Left=1.25,Duration=4};
      Link(MutantSkillSlot.Read(open).Text=="1,3 sn"&&MutantSkillSlot.Read(new MutantSkillHud{Blocker="hedef"}).Text=="HEDEF YOK"&&MutantSkillSlot.Read(hud,true).Text!="HAZIR","yuva yazısı TS biçimi");
    }
    var c=fixture["coverage"];foreach(var p in c.Fields)Check(p.Value.N()>0,"TS kapsamı "+p.Key);
    Check(changed==(int)c["powerChanged"].N(),"Güç/tutuş değişim sayısı");
    Console.WriteLine($"Mutant enerji: {checks} koşul; {fixture["scenarios"].Items.Count()} koşu/{steps} enerji adımı (nitro {c["nitro"].N()}, hayalet koruması {c["ghostBlocked"].N()}, yarış başı {c["raceStarts"].N()}, uçuş {c["flight"].N()}), {hudRowCount} skill HUD satırı + nitro HUD, {links} oyun bağı; en büyük fark {worst:G3}.");
  }
}
