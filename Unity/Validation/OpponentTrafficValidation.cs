using LastTurn.Core;
using System.Text.Json;
using System.Security.Cryptography;
using System.Globalization;

internal static class OpponentTrafficValidation
{
  private sealed class Encounter
  {
    public string Name{get;set;}="";public int Overlaps{get;set;}public double MaximumLateral{get;set;}
    public double FinalGap{get;set;}public double FinalOffset{get;set;}public int SideChanges{get;set;}
    public string FinalState{get;set;}="";public string Trace{get;set;}="";
  }
  private static OpponentPlan Plan(double width=6,double speed=24,double radius=0,bool closed=false)
  {
    int count=radius>0?(closed?400:150):501;double ds=radius>0?(closed?2*Math.PI*radius/count:1):2;
    double[] s=Enumerable.Range(0,count).Select(i=>i*ds).ToArray();double[] x=s.Select(d=>radius>0?radius*(1-Math.Cos(d/radius)):0).ToArray(),z=s.Select(d=>radius>0?radius*Math.Sin(d/radius):d).ToArray();
    var row=CatalogNode.Parse(JsonSerializer.Serialize(new{key="trafik-fixture",personality="test",line=new{x,z,o=new double[count],s,k=s.Select(_=>radius>0?1/radius:0).ToArray(),cx=x,cz=z,nx=s.Select(d=>radius>0?Math.Cos(d/radius):1).ToArray(),nz=s.Select(d=>radius>0?-Math.Sin(d/radius):0).ToArray(),len=closed?2*Math.PI*radius:s[^1],hw=width,acik=!closed},speed=s.Select(_=>speed).ToArray()}));
    return new OpponentPlan(row,CatalogNode.Parse("{\"ad\":\"Trafik testi\",\"bakis\":18,\"bakisHiz\":0.5,\"tutarlilik\":1,\"tepki\":0,\"sabir\":8,\"kaymaSiniri\":0.7}"));
  }
  private static PowertrainVehicle Car(PowertrainParameters p,double distance,double speed,double radius)
  {
    var car=new PowertrainVehicle(p,initialSpeed:speed,initialGear:3);double h=radius>0?distance/radius:0;
    var q=BodyRotation.Yaw(h);double x=radius>0?radius*(1-Math.Cos(h)):0,z=radius>0?radius*Math.Sin(h):distance;
    // Yalnız test başlangıcı; döngü içinde konum/hız yazılmaz, iki araç da Vehicle.Step ile yürür.
    car.Body.Orientation=q;car.Body.Position=q.Rotate(new BodyVector(0,p.Chassis.CgY,p.Chassis.CgZ))+new BodyVector(x,0,z);car.Body.Velocity=q.Rotate(new BodyVector(0,0,speed));return car;
  }
  private static bool Overlap(OpponentTrafficCar a,OpponentTrafficCar b)
  {
    foreach(double heading in new[]{a.Heading,b.Heading})foreach(bool lateral in new[]{false,true})
    {
      double ax=lateral?Math.Cos(heading):Math.Sin(heading),az=lateral?-Math.Sin(heading):Math.Cos(heading);
      double Radius(OpponentTrafficCar c)=>Math.Abs(ax*Math.Sin(c.Heading)+az*Math.Cos(c.Heading))*c.Length/2+Math.Abs(ax*Math.Cos(c.Heading)-az*Math.Sin(c.Heading))*c.Width/2;
      if(Math.Abs((b.X-a.X)*ax+(b.Z-a.Z)*az)>=Radius(a)+Radius(b))return false;
    }
    return Math.Abs(a.Y-b.Y)<2;
  }
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../.."));int checks=0;
    void Check(bool value,string label){checks++;if(!value)throw new Exception("Rakip trafik: "+label);}
    var p=GtPrototypeParameters.Create();var straight=Plan();
    OpponentTrafficCar At(double x=0,double z=0,double speed=20,double y=1,double heading=0)=>new(x,y,z,Math.Sin(heading)*speed,Math.Cos(heading)*speed,heading,1.8,4.4);
    var control=new OpponentTraffic(2);var frame=new OpponentTrafficFrame(At(),At(z:20,speed:12));
    for(int i=0;i<180;i++){control.Step(straight,0,frame,1d/60);Check(Math.Abs(control.Offset)<=3.1,"Geçiş çizgisi pist payı içinde");}
    Check(control.SideChanges==1&&control.Side!=0&&control.Offset>2,"Tek ve kilitli geçiş tarafı");double held=control.Offset;
    for(int i=0;i<120;i++)control.Step(straight,0,new OpponentTrafficFrame(At(),At(z:2,speed:20)),1d/60);
    Check(control.SideChanges==1&&Math.Abs(control.Offset-held)<1e-12&&control.State=="yan-yana","Yan yana yeni taraf seçmez");
    var grid=new OpponentTraffic(2);grid.Step(straight,0,new OpponentTrafficFrame(At(x:3),At()),1d/60);Check(grid.Offset==3&&grid.SideChanges==0,"Başlangıçta yan yana oyuncunun üstüne yarış çizgisine dönmez");
    for(int i=0;i<240;i++)control.Step(straight,0,null,1d/60);
    Check(control.Offset==0&&double.IsPositiveInfinity(control.SpeedLimit),"Trafik bitince çizgiye yumuşak dönüş");
    foreach(var other in new[]{At(z:200),At(z:20,y:6),At(z:20,heading:Math.PI),At(x:30,z:20),new OpponentTrafficCar(double.NaN,1,20,0,12,0,1.8,4.4)})
    {var t=new OpponentTraffic(2);t.Step(straight,0,new OpponentTrafficFrame(At(),other),1d/60);Check(t.Offset==0&&double.IsPositiveInfinity(t.SpeedLimit),"Uzak/ayrı yükseklik/ters yön/pist dışı/geçersiz bağlam eski yolu bozmaz");}
    double curveHeading=20d/65;var curveOther=At(x:65*(1-Math.Cos(curveHeading)),z:65*Math.Sin(curveHeading),speed:12,heading:curveHeading);
    var tight=new OpponentTraffic(2);tight.Step(Plan(radius:65),0,new OpponentTrafficFrame(At(),curveOther),1d/60);Check(tight.Side==0&&tight.Offset==0&&tight.SpeedLimit<20,"Sert virajda geçiş değil takip");
    var narrow=new OpponentTraffic(2);narrow.Step(Plan(width:1.9),0,frame,1d/60);Check(narrow.Side==0&&narrow.SpeedLimit<20,"Dar kesitte fren");
    var hairpin=Plan(radius:25);double turn=12d/25;
    var curvedOther=At(x:25*(1-Math.Cos(turn)),z:25*Math.Sin(turn),speed:6,heading:turn);
    var bend=new OpponentTraffic(2);bend.Step(hairpin,0,new OpponentTrafficFrame(At(speed:9),curvedOther),1d/60);
    Check(bend.Side==0&&bend.SpeedLimit<9,"Keskin virajda iki araç kendi yol kesitinde aynı koridorda görülür");
    var cutIn=new OpponentTraffic(2);for(int i=0;i<180;i++)cutIn.Step(straight,0,frame,1d/60);
    cutIn.Step(straight,0,new OpponentTrafficFrame(At(x:3),At(x:3,z:15,speed:6)),1d/60);
    Check(cutIn.SpeedLimit<20&&cutIn.SideChanges==1,"Seçili geçiş koridoruna giren oyuncuya fren; ani taraf değişimi yok");
    var changing=Plan();for(int i=0;i<changing.N;i++)changing.Offset[i]=2;
    double prior=cutIn.Offset;cutIn.Step(changing,0,new OpponentTrafficFrame(At(x:3),At(z:2)),1d/60);
    Check(cutIn.Offset<prior&&prior-cutIn.Offset<=1.2/60+1e-12,"Yan yana kilitli hedef yeni kenar payına hız sınırlı döner");
    foreach(var recovery in new[]{(X:7.2,Heading:-.4,Beta:0d,Upright:true),(X:0d,Heading:0d,Beta:.8,Upright:true),(X:0d,Heading:0d,Beta:0d,Upright:false)})
    {
      var clean=new OpponentPilot(straight,2,0,0);var loaded=new OpponentPilot(straight,2,0,0);
      for(int i=0;i<180;i++){clean.Step(0,0,0,0,20,0,1d/60,true);loaded.Step(0,0,0,0,20,0,1d/60,true,frame);}
      Check(loaded.Traffic.Offset>2,"Kurtarma denemesi öncesinde gerçek geçiş hedefi etkin");
      var a=clean.Step(recovery.X,0,recovery.Heading,0,20,recovery.Beta,1d/60,true);
      var self=new OpponentTrafficCar(recovery.X,1,0,0,20,recovery.Heading,1.8,4.4,recovery.Upright);
      var b=loaded.Step(recovery.X,0,recovery.Heading,0,20,recovery.Beta,1d/60,true,new OpponentTrafficFrame(self,At(z:20,speed:12)));
      Check(a.Steering==b.Steering&&a.Throttle==b.Throttle&&a.Brake==b.Brake,"Pist dışı/kayma/devrilmede artık trafik hedefi kurtarma komutunu değiştirmez");
    }
    var varying=Plan(width:1.9);for(int i=0;i<varying.N;i++){varying.Offset[i]=Math.Sin(i*.15)*.5;varying.X[i]=varying.Offset[i];}
    var noCorridor=new OpponentTraffic(2);noCorridor.Step(varying,0,frame,1d/60);Check(noCorridor.Side==0&&noCorridor.SpeedLimit<20,"Sabit yan koridor yokken takip freni kaybolmaz");
    var seamPlan=Plan(radius:100,closed:true);int seam=seamPlan.N-5;double angle=seamPlan.S[seam]/100;
    var seamSelf=new OpponentTrafficCar(seamPlan.X[seam],1,seamPlan.Z[seam],Math.Sin(angle)*20,Math.Cos(angle)*20,angle,1.8,4.4);
    var seamOther=new OpponentTrafficCar(seamPlan.X[5],1,seamPlan.Z[5],Math.Sin(seamPlan.S[5]/100)*12,Math.Cos(seamPlan.S[5]/100)*12,seamPlan.S[5]/100,1.8,4.4);
    var seamControl=new OpponentTraffic(2);seamControl.Step(seamPlan,seam,new OpponentTrafficFrame(seamSelf,seamOther),1d/60);Check(seamControl.SpeedLimit<20,"Tur dikişinde yakın oyuncu yerel geometriyle görülür");

    Encounter Sim(string name,bool traffic,double width,double radius,int seconds,int fps=60,uint seed=2)
    {
      double ownSpeed=radius>0?14:24,otherSpeed=radius>0?9:12;
      var plan=Plan(width,ownSpeed,radius);var otherPlan=Plan(width,otherSpeed,radius);
      var a=Car(p,0,ownSpeed,radius);var b=Car(p,20,otherSpeed,radius);
      var pilot=new OpponentPilot(plan,seed,0,0);var otherPilot=new OpponentPilot(otherPlan,8,b.ReferencePoint.X,b.ReferencePoint.Z);
      var recordA=new InputRecording();var recordB=new InputRecording();var result=new Encounter{Name=name};
      double accumulator=0;int tick=0;var trace=new List<string>();
      for(int f=0;f<fps*seconds;f++)
      {
        accumulator+=1d/fps;
        while(accumulator+1e-12>=1d/60)
        {
          accumulator-=1d/60;var own=OpponentTrafficCar.Read(a);var other=OpponentTrafficCar.Read(b);
          var input=pilot.Step(own.X,own.Z,own.Heading,own.Vx,own.Vz,RaceDrift.Detect(a.Body).Beta,1d/60,true,traffic?new OpponentTrafficFrame(own,other):null);
          var next=otherPilot.Step(other.X,other.Z,other.Heading,other.Vx,other.Vz,RaceDrift.Detect(b.Body).Beta,1d/60,true);
          Check(double.IsFinite(input.Steering)&&Math.Abs(input.Steering)<=1&&input.Throttle>=0&&input.Throttle<=1&&input.Brake>=0&&input.Brake<=1,"Gerçek sürüş girdisi sınırlı");
          a.Step(recordA.Record(input));b.Step(recordB.Record(next));tick++;
          own=OpponentTrafficCar.Read(a);other=OpponentTrafficCar.Read(b);if(Overlap(own,other))result.Overlaps++;
          int at=plan.Nearest(own.X,own.Z,pilot.Index);double lateral=(own.X-plan.CenterX[at])*plan.Nx[at]+(own.Z-plan.CenterZ[at])*plan.Nz[at];result.MaximumLateral=Math.Max(result.MaximumLateral,Math.Abs(lateral));
          trace.Add(string.Join("/",new[]{own.X,own.Z,own.Vx,own.Vz,input.Steering,input.Throttle,input.Brake,pilot.Traffic.Offset}.Select(n=>n.ToString("R",CultureInfo.InvariantCulture))));
        }
        // Render yalnız gözlemler; sabit adımda yeni karar üretmez.
        _=pilot.Traffic.State;
      }
      Check(tick==seconds*60&&a.Body.Steps==tick&&b.Body.Steps==tick,"İki gerçek araç / sabit adım");
      var final=OpponentTrafficCar.Read(a);var finalOther=OpponentTrafficCar.Read(b);result.FinalGap=(finalOther.X-final.X)*Math.Sin(final.Heading)+(finalOther.Z-final.Z)*Math.Cos(final.Heading);
      result.FinalOffset=pilot.Traffic.Offset;result.SideChanges=pilot.Traffic.SideChanges;result.FinalState=pilot.Traffic.State;
      result.Trace=Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(string.Join("\n",trace))));return result;
    }
    var measurements=new List<Encounter>();
    foreach(var row in new[]{(Name:"genis-duz",Width:6d,Radius:0d,Seconds:14),(Name:"dar-duz",Width:1.9d,Radius:0d,Seconds:10),(Name:"sert-viraj",Width:6d,Radius:65d,Seconds:7)})
    {
      var before=Sim(row.Name+"-kaynak",false,row.Width,row.Radius,row.Seconds);var after=Sim(row.Name+"-trafik",true,row.Width,row.Radius,row.Seconds);measurements.Add(before);measurements.Add(after);
      Console.WriteLine($"{row.Name}: kaynak kutu çakışma {before.Overlaps}, trafik {after.Overlaps}; azami yanal {after.MaximumLateral:F2}, son fark {after.FinalGap:F2}, yan seçimi {after.SideChanges}.");
      Check(after.Overlaps==0,row.Name+" iki araç kutuları ayrık");Check(after.MaximumLateral<row.Width-p.Chassis.Width/2,row.Name+" araç pist içinde");
      if(row.Radius==0&&row.Width>3)Check(after.FinalGap < -8&&after.SideChanges==1&&Math.Abs(after.FinalOffset)<.1,"Geniş düzlükte geçer ve çizgiye döner");
      else Check(after.SideChanges==0&&after.FinalGap>4,"Dar/sert kesitte takip mesafesi");
    }
    var reference=Sim("fps-60",true,6,0,8);foreach(int fps in new[]{30,120})Check(Sim("fps-"+fps,true,6,0,8,fps).Trace==reference.Trace,"30/60/120 trafik izi aynı");
    var mirror=Sim("sol-gecis",true,6,0,14,seed:3);Check(mirror.Overlaps==0&&mirror.FinalGap < -8&&mirror.SideChanges==1,"Diğer geçiş tarafı da gerçek fizikle ayrışır");measurements.Add(mirror);
    var nullA=Car(p,0,20,0);var nullB=Car(p,0,20,0);var pilotA=new OpponentPilot(straight,13,0,0);var pilotB=new OpponentPilot(straight,13,0,0);
    for(int i=0;i<600;i++)
    {
      var a=OpponentTrafficCar.Read(nullA);var b=OpponentTrafficCar.Read(nullB);
      var inputA=pilotA.Step(a.X,a.Z,a.Heading,a.Vx,a.Vz,0,1d/60,true);
      var inputB=pilotB.Step(b.X,b.Z,b.Heading,b.Vx,b.Vz,0,1d/60,true,new OpponentTrafficFrame(b,new OpponentTrafficCar(b.X,b.Y,b.Z+200,b.Vx,b.Vz,b.Heading,b.Width,b.Length)));
      Check(inputA.Steering==inputB.Steering&&inputA.Throttle==inputB.Throttle&&inputA.Brake==inputB.Brake,"200 m oyuncu null yoluyla birebir aynı komut");nullA.Step(inputA);nullB.Step(inputB);
      Check(nullA.Body.Position.X==nullB.Body.Position.X&&nullA.Body.Position.Z==nullB.Body.Position.Z&&pilotA.Mode==pilotB.Mode&&pilotA.Stuck==pilotB.Stuck&&pilotA.EdgeCorrections==pilotB.EdgeCorrections,"Uzak oyuncu fizik/tempo/sayaç değiştirmez");
    }
    // Kaynak pistlerde kısa iki araç karşılaşmaları; plan/lastik/fizik değiştirilmez.
    string Read(string name)=>File.ReadAllText(Path.Combine(root,"Unity/Assets/LastTurn/Resources",name));
    var vehicles=new VehicleCatalog(Read("vehicle-catalog.json"));var tracks=new TrackCatalog(Read("track-catalog.json"));var worlds=new WorldCatalog(Read("world-catalog.json"),tracks);
    var source=CatalogNode.Parse(Read("opponent-catalog.json"));
    foreach(string key in new[]{"gp_1","rx_1","sokak_"+worlds.Streets.First(r=>r.Kind=="ab").Key})
    {
      var original=source["plans"].Items.First(r=>r["key"].S()==key&&r["personality"].S()=="caylak");var slower=original.Clone();slower.Set("speed",CatalogNode.Arr(original["speed"].Items.Select(v=>CatalogNode.Num(v.N()*.7))));
      var plan=new OpponentPlan(original,source["personalities"]["caylak"]);var otherPlan=new OpponentPlan(slower,source["personalities"]["caylak"]);
      var track=key.StartsWith("sokak_")?TrackDefinition.FromStreet(worlds.Streets.First(r=>"sokak_"+r.Key==key),40):tracks.Tracks.First(t=>t.Key==key);
      var world=track.IsStreet?new TrackWorld(track,worlds):new TrackWorld(track){Environment=worlds.Activate(key)};
      int carIndex=key=="rx_1"?11:10;var parameters=OpponentRacer.CreateMutantParameters(vehicles,vehicles.Setup(carIndex,Array.Empty<string>()));
      PowertrainVehicle Start(int index)
      {var c=new PowertrainVehicle(parameters,world:world);int next=plan.Ahead(index,3);c.Place(plan.X[index],plan.Z[index],Math.Atan2(plan.X[next]-plan.X[index],plan.Z[next]-plan.Z[index]));return c;}
      var a=Start(0);var b=Start(plan.Ahead(0,20));var pa=new OpponentPilot(plan,2,a.ReferencePoint.X,a.ReferencePoint.Z);var pb=new OpponentPilot(otherPlan,8,b.ReferencePoint.X,b.ReferencePoint.Z);var ra=new InputRecording();var rb=new InputRecording();var result=new Encounter{Name=key};
      for(int i=0;i<720;i++)
      {
        var ac=OpponentTrafficCar.Read(a);var bc=OpponentTrafficCar.Read(b);
        var command=pa.Step(ac.X,ac.Z,ac.Heading,ac.Vx,ac.Vz,RaceDrift.Detect(a.Body).Beta,1d/60,true,new OpponentTrafficFrame(ac,bc));
        var otherCommand=pb.Step(bc.X,bc.Z,bc.Heading,bc.Vx,bc.Vz,RaceDrift.Detect(b.Body).Beta,1d/60,true);
        a.Step(ra.Record(command));b.Step(rb.Record(otherCommand));if(Overlap(OpponentTrafficCar.Read(a),OpponentTrafficCar.Read(b)))result.Overlaps++;
        int j=plan.Nearest(a.ReferencePoint.X,a.ReferencePoint.Z,pa.Index);double lat=(a.ReferencePoint.X-plan.CenterX[j])*plan.Nx[j]+(a.ReferencePoint.Z-plan.CenterZ[j])*plan.Nz[j];result.MaximumLateral=Math.Max(result.MaximumLateral,Math.Abs(lat));
      }
      result.SideChanges=pa.Traffic.SideChanges;result.FinalOffset=pa.Traffic.Offset;result.FinalState=pa.Traffic.State;
      Console.WriteLine($"{key}: iki araç kutu çakışması {result.Overlaps}, yanal {result.MaximumLateral:F2}/{plan.HalfWidth:F2}, yan seçimi {result.SideChanges}.");
      Check(result.Overlaps==0,key+" kaynak iki araç ayrışması");Check(result.MaximumLateral+parameters.Chassis.Width/2<plan.HalfWidth,key+" kaynak gövde pist içinde");measurements.Add(result);
    }
    var info=new RaceEventCatalog(Read("race-events.json")).Find("gp",1);var gt=tracks.Tracks[info.Index];var gtPlan=new OpponentCatalog(Read("opponent-catalog.json")).Plan(gt.Key);
    int waitAt=Enumerable.Range(0,gtPlan.N).OrderBy(i=>Math.Abs(gtPlan.Curvature[i])+Math.Abs(gtPlan.Offset[i]-gtPlan.Offset[gtPlan.Ahead(i,30)])/30).First();int waitAhead=gtPlan.Ahead(waitAt,4);
    var waiting=new OpponentRacer(p,new TrackWorld(gt),gt,info,gtPlan,2,gtPlan.X[waitAt],gtPlan.Z[waitAt],Math.Atan2(gtPlan.X[waitAhead]-gtPlan.X[waitAt],gtPlan.Z[waitAhead]-gtPlan.Z[waitAt]));var initial=OpponentTrafficCar.Read(waiting.Vehicle);
    var stopped=new OpponentTrafficCar(initial.X+Math.Sin(initial.Heading)*6,initial.Y,initial.Z+Math.Cos(initial.Heading)*6,0,0,initial.Heading,initial.Width,initial.Length);
    for(int i=0;i<720;i++)waiting.Step(traffic:stopped);
    Console.WriteLine($"Trafik bekleyişi: dönüş {waiting.Returns}, mod {waiting.Pilot.Mode}, trafik {waiting.Pilot.Traffic.State}, hız {waiting.Vehicle.Body.Velocity.Length:F2}, sınır {waiting.Pilot.Traffic.SpeedLimit:F2}.");
    Check(waiting.Returns==0&&waiting.Vehicle.Body.Velocity.Length<1,"Bilinçli trafik bekleyişi otomatik dönüşe dönüşmez");
    var waitPosition=waiting.Vehicle.ReferencePoint;
    for(int i=0;i<600;i++)waiting.Step(traffic:new OpponentTrafficCar(stopped.X+200,stopped.Y,stopped.Z,0,0,stopped.Heading,stopped.Width,stopped.Length));
    Check(waiting.Returns==0&&JsMath.Hypot(waiting.Vehicle.ReferencePoint.X-waitPosition.X,waiting.Vehicle.ReferencePoint.Z-waitPosition.Z)>10,"Engel ayrılınca bekleyişten normal sürüşe döner");
    var fullRaces=new List<object>();
    foreach(var sample in new[]{(Seed:7u,Region:1,Type:"gp"),(Seed:53u,Region:1,Type:"rx"),(Seed:83u,Region:2,Type:"ab")})
    {
      var catalog=CatalogNode.Parse(Read("mutant-catalog.json"));var run=new MutantRun(sample.Seed,catalog);run.Choose(run.State["secenekler"][0].S());if(sample.Region==2){run.EnterBoss();run.FinishBoss(true);while(run.State["faz"].S()=="secim")run.Choose(run.State["secenekler"][0].S());}
      int selected=MutantMenuModel.StartingCars(sample.Seed,catalog)[0];var entry=run.State["etkinlikler"].Items.First(e=>e[sample.Region==1?"ty":"sokak"].S()==sample.Type);
      var race=MutantRacePlan.Create(run,selected,(int)entry["id"].N(),0,false,new RaceEventCatalog(Read("race-events.json")),tracks,worlds);var spec=race.Opponent;
      var data=source["plans"].Items.First(r=>r["key"].S()==race.Track.Key&&r["personality"].S()==spec["kisilik"].S());var slow=data.Clone();slow.Set("speed",CatalogNode.Arr(data["speed"].Items.Select(v=>CatalogNode.Num(v.N()*.7))));
      var ownPlan=new OpponentPlan(data,source["personalities"][spec["kisilik"].S()]);var playerPlan=new OpponentPlan(slow,source["personalities"][spec["kisilik"].S()]);
      var parameters=OpponentRacer.CreateMutantParameters(vehicles,vehicles.Setup((int)spec["arac"].N(),spec["parca"].Items.Select(x=>x.S())),spec["pasif"].Items.Select(x=>x.S()));
      foreach(bool enabled in new[]{false,true})
      {
        TrackWorld World()=>race.Track.IsStreet?new TrackWorld(race.Track,worlds):new TrackWorld(race.Track){Environment=worlds.Activate(race.Track.Key)};
        var spawn=race.OpponentStart();var npc=new OpponentRacer(parameters,World(),race.Track,race.Event,ownPlan,(uint)spec["tohum"].N(),spawn.X,spawn.Z,spawn.Heading);
        var player=new OpponentRacer(parameters,World(),race.Track,race.Event,playerPlan,42,race.Event.StartX,race.Event.StartZ,race.Event.StartHeading);
        int overlaps=0,ticks=0;
        while(!npc.FinishTime.HasValue&&ticks++<21600)
        {
          var before=OpponentTrafficCar.Read(player.Vehicle);npc.Step(traffic:enabled?before:null);player.Step();if(Overlap(OpponentTrafficCar.Read(npc.Vehicle),OpponentTrafficCar.Read(player.Vehicle)))overlaps++;
        }
        Console.WriteLine($"Tam çift {race.Track.Key}/{enabled}: {npc.FinishTime:F2} sn, kutu {overlaps}, dönüş {npc.Returns}, temas {npc.Vehicle.Body.CollisionCount}.");
        Check(npc.FinishTime.HasValue,"Trafik çiftinde doğal tam bitiş");if(enabled){Check(overlaps==0,"Tam çiftte araç kutuları ayrık");Check(npc.Returns==0,"Tam çiftte otomatik dönüş yok");}
        fullRaces.Add(new{sample.Seed,sample.Region,track=race.Track.Key,traffic=enabled,finished=npc.FinishTime,overlaps,returns=npc.Returns,hits=npc.Vehicle.Body.CollisionCount});
      }
    }
    string[] sources={"Scripts/Core/OpponentTraffic.cs","Scripts/Core/OpponentPilot.cs","Scripts/Core/OpponentRacer.cs","Scripts/Prototype/GtPrototype.cs"};
    var proof=new{result="opponent-traffic-passed",utc=DateTime.UtcNow.ToString("O"),checks,measurements,fullRaces,sources=sources.Select(s=>new{path=s,hash=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(root,"Unity/Assets/LastTurn",s))))})};
    File.WriteAllText(Path.Combine(root,"tests/cikti/opponent-traffic.json"),JsonSerializer.Serialize(proof,new JsonSerializerOptions{WriteIndented=true}));Console.WriteLine($"Rakip trafik: {checks} kontrol; iki araç, kaynak karşılaştırması ve FPS izi geçti.");
  }
}
