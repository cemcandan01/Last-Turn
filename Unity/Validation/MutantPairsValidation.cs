using LastTurn.Core;

internal static class MutantPairsValidation
{
  public static void Run()
  {
    const double dt=1.0/60;
    int checks=0;
    void Check(bool ok,string why){if(!ok)throw new InvalidOperationException(why);checks++;}
    var catalog=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"../../../../Assets/LastTurn/Resources/mutant-catalog.json")));
    var state=new MutantRun(53,catalog).State;
    var controller=new MutantPairs();
    var c=new MutantAbilityContext{Vx=17,RaceRunning=true,Racing=true};
    void Equip(params string[] ids){
      state.Set("pasifler",CatalogNode.Arr(ids.Select(CatalogNode.Str)));
      state["mek"].Set("enerji",CatalogNode.Num(40));state.Set("govde",CatalogNode.Num(70));controller.Reset();
    }
    double Energy()=>state["mek"]["enerji"].N();
    void Tick(int count){for(int i=0;i<count;i++)controller.Step(state,c,dt,false);}
    void Drift(bool spin=false){
      c.DriftOn=true;c.Beta=.5;c.Throttle=.8;c.Steering=.6;Tick(100);
      c.DriftCool=spin?1:0;c.DriftOn=false;c.Beta=0;Tick(1);c.DriftCool=0;
      c.Steering=0;Tick(1);
    }
    Equip("aci");Drift();Check(!controller.Boosting && Energy()==40,"Tek parça itiş üretmemeli");
    Equip("aci","temiz-cikis");Drift(true);Check(!controller.Boosting && Energy()==40,"Spin ile biten drift depolanmamalı");
    Drift();Check(controller.Boosting && Energy()==32,"Temiz drift sonrası düz çıkış sekiz enerji harcayıp itiş vermeli");
    Tick(60);Check(!controller.Boosting && Energy()==32,"İtiş bir kez uygulanmalı");
    Equip("asfalt","fren");c.Steering=.45;c.Brake=.8;Tick(30);c.Brake=0;Tick(1);
    Check(Energy()==48,"Kontrollü frenlemede enerji");
    c.Brake=.8;Tick(30);c.Brake=0;Tick(1);Check(Energy()==48,"Freni peş peşe pompalamak enerji vermemeli");
    state["mek"].Set("enerji",CatalogNode.Num(98));Tick(260);c.Brake=.8;Tick(30);c.Brake=0;Tick(1);
    Check(Energy()==100,"Enerji kapasitesi");
    Equip("zirh","tamirci");Tick(360);Check(state["govde"].N()==70,"Darbe olmadan onarım olmamalı");
    controller.Step(state,c,dt,true);c.Vx=0;Tick(360);Check(state["govde"].N()==70,"Parkta onarım yok");
    c.Vx=17;Tick(140);controller.Step(state,c,dt,true);Tick(230);Check(state["govde"].N()==70,"Yeni darbe pencereyi yeniler");
    Tick(80);Check(state["govde"].N()==76,"Beş saniye temiz sürüşte onarım");Tick(360);
    Check(state["govde"].N()==76,"Aynı darbe için ikinci onarım yok");
    foreach(var ids in new[]{new[]{"aci","temiz-cikis"},new[]{"fren","asfalt"},new[]{"zirh","tamirci"}}){
      Equip(ids[0]);Check(MutantPairs.Preview(state,ids[1],catalog,out _).Contains(" sende."),"Ödül kartında eldeki eş");
    }
    var worlds=new MutantSkillWorldFactory(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"../../../../Assets/LastTurn/Resources/mutant-skill-world.json")));
    double ExitSpeed(bool pair){
      var run=new MutantRun(53,catalog);run.Choose(run.State["secenekler"][0].S());
      run.State.Set("pasifler",CatalogNode.Arr((pair?new[]{"aci","temiz-cikis"}:new[]{"temiz-cikis"}).Select(CatalogNode.Str)));
      run.State["mek"].Set("enerji",CatalogNode.Num(40));
      var abilities=new MutantAbilityDriver(run,worlds);
      var motion=new MutantAbilityContext{Racing=false,Vz=17,DriftOn=true,Beta=.55,Steering=.6,Throttle=.8};
      var input=new MutantSessionInput{HasSimulation=true};
      void Sensors(){abilities.BeginStep(motion);abilities.Step(null!,input,dt,false);}
      for(int i=0;i<105;i++)Sensors();
      motion.DriftOn=false;motion.Steering=0;motion.Beta=0;Sensors();
      var vehicle=new PowertrainVehicle(GtPrototypeParameters.Create(),17);
      for(int i=0;i<51;i++){
        vehicle.SkillInput=abilities.Physics(dt)!;vehicle.Step(new DrivingInput(.8,0,0));
        motion.Vz=vehicle.Body.Velocity.Z;Sensors();
      }
      return vehicle.Body.Velocity.Z*3.6;
    }
    double baseline=ExitSpeed(false),boosted=ExitSpeed(true);
    Check(boosted>baseline+3,"Aynı kurulumda ikili fiziksel çıkış hızını artırmalı");
    Console.WriteLine($"0,85 saniyelik kontrollü çıkış: tek pasif {baseline:F2} km/sa, ikili {boosted:F2} km/sa.");
    Console.WriteLine($"MUTANT ikilileri: {checks} kontrol geçti.");
  }
}
