using LastTurn.Core;

internal static class MutantStreetValidation
{
  public static void Run()
  {
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    var oracle=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-streets-0.8.18.json")));
    if(oracle["baseline"].S()!=TrackCatalog.Baseline)throw new Exception("Sokak TS SHA");
    var tracks=new TrackCatalog(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/track-catalog.json")));
    var worlds=new WorldCatalog(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/world-catalog.json")),tracks);
    int checks=0,steps=0,cutCallbacks=0;double error=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException("P3 sokak: "+label);}
    void Near(double a,double b,string label){double d=Math.Abs(a-b);error=Math.Max(error,d);Check(double.IsFinite(d)&&d<=1e-8,label+" "+a+" != "+b);}
    void Nullable(double? actual,CatalogNode expected,string label){if(expected.ToString()=="null")Check(actual==null,label);else{Check(actual.HasValue,label);Near(actual??double.NaN,expected.N(),label);}}
    void Snapshot(RaceSession session,CatalogNode expected,string label)
    {
      Near(session.Time,expected["t"].N(),label+" zaman");Near(session.Lap,expected["lap"].N(),label+" tur");Near(session.Armed,expected["armed"].N(),label+" kurulu");Near(session.Previous,expected["prev"].N(),label+" önceki");
      Nullable(session.BestLap,expected["bestLap"],label+" en iyi tur");Near(session.LapStart,expected["lapStart"].N(),label+" tur başlangıcı");Near(session.OffTrack.Time,expected["offTime"].N(),label+" dış süre");Nullable(session.Cut.Exit,expected["exit"],label+" kesme çıkışı");Near(session.Cut.Path,expected["path"].N(),label+" dış yol");
      Near(session.Stars,expected["stars"].N(),label+" yıldız");Near(session.Xp,expected["xp"].N(),label+" XP");Near(session.Money,expected["money"].N(),label+" para");
      string state=session.State==RaceState.Countdown?"count":session.State==RaceState.Running?"run":"done";Check(state==expected["state"].S(),label+" faz");
    }
    RaceEventInfo Event(CatalogNode row)=>new RaceEventInfo{Index=(int)row["index"].N(),Key=row["key"].S(),Type=row["type"].S(),Level=(int)row["level"].N(),Difficulty=(int)row["difficulty"].N(),Region=(int)row["region"].N(),Name=row["name"].S(),Description=row["description"].S(),Preset="ar",Laps=(int)row["laps"].N(),Limit=row["limit"].N(),Stars=row["stars"].Items.Select(x=>x.N()).ToArray(),StartX=row["start"][0].N(),StartZ=row["start"][1].N(),StartHeading=row["start"][2].N()};
    Check(tracks.Tracks.Length==40&&worlds.Streets.Length==9,"40 kariyer / 9 şehir rotası");
    var routes=oracle["routes"].Items.ToArray();
    foreach(var pair in routes.Select((row,n)=>(row,n)))
    {
      var row=pair.row;var track=TrackDefinition.FromStreet(worlds.Streets[pair.n],40+pair.n);var world=new TrackWorld(track,worlds);var info=Event(row);
      Check(track.IsStreet&&track.StreetKind==row["kind"].S(),"Sokak türü");Check(track.Key==info.Key&&track.Type==info.Type&&track.Level==info.Level,"Kaynak kimlik");Check(track.Name==info.Name&&track.Description==info.Description,"Kaynak metin");Check(track.Open==row["open"].B()&&track.Layout.Kerbs.Length==0,"Açıklık/şehirde yapay kerb yok");
      Near(track.Layout.StartX,info.StartX,"Başlangıç X");Near(track.Layout.StartZ,info.StartZ,"Başlangıç Z");Near(track.Layout.StartHeading,info.StartHeading,"Başlangıç yönü");
      world.Hint=0;foreach(var sample in row["samples"].Items){Near(world.Surface(sample[0].N(),sample[1].N()),sample[2].N(),"Şehir yüzeyi");Near(world.Hint,sample[3].N(),"Şehir rota ipucu");Near(world.Height(sample[0].N(),sample[1].N()),sample[4].N(),"Şehir/çatı yüksekliği");}
      world.Hint=(int)row["startHint"].N();var session=new RaceSession(info,track,false,world.Hint,mutant:true);Snapshot(session,row["initial"],"İlk durum");Check(session.RecordKey==row["recordKey"].S(),"Mutant rekor adı");session.TickCountdown(3);
      foreach(var r in row["rows"].Items){int surface=world.Surface(r[0].N(),r[1].N());Near(surface,r[4].N(),"Yarış şehir yüzeyi");Near(world.Hint,r[5].N(),"Yarış rota ipucu");
        session.Step(new RaceStepInput{X=r[0].N(),Z=r[1].N(),Vx=r[2].N(),Vz=r[3].N(),Speed=55,Hint=world.Hint,SinceHit=100,BetaLimit=double.PositiveInfinity},1d/60);Near(session.LastCutMeters,r[6].N(),"Temiz sürüş kesme metresi");
        if(r[7].ToString()!="null")Snapshot(session,r[7],"Yarış geçişi");steps++;
      }
      Snapshot(session,row["result"],"Sonuç");Check(session.State==RaceState.Finished,"Gerçek kaynak tur/bitiş eşiği");Check(session.Xp==0&&session.Money==0&&session.Stars==0&&!session.Career,"Mutant kariyer ödülünden ayrı");
    }
    foreach(var trace in oracle["cuts"].Items)
    {
      int n=(int)trace["route"].N();var track=TrackDefinition.FromStreet(worlds.Streets[n],40+n);var world=new TrackWorld(track,worlds){Hint=(int)trace["startHint"].N()};
      RaceSession? session=null;double callback=0;
      session=new RaceSession(Event(routes[n]),track,false,world.Hint,cutPenalty:metres=>{callback=metres;cutCallbacks++;Check(session!.OffTrack.First!=null,"Kesme gövde işlemi dış sayaç temizlenmeden önce");},mutant:true);session.TickCountdown(3);
      foreach(var r in trace["rows"].Items){world.Surface(r[0].N(),r[1].N());Near(world.Hint,r[2].N(),"Kesme rota ipucu");callback=0;session.Step(new RaceStepInput{X=r[0].N(),Z=r[1].N(),Hint=world.Hint,SinceHit=100,BetaLimit=double.PositiveInfinity},1d/60);Near(session.LastCutMeters,r[3].N(),"Gerçek kaynak kesme metresi");Near(callback,r[3].N(),"Kesme gövde callback");Snapshot(session,r[4],"Kesme durum izi");}
    }
    Check(cutCallbacks>0,"Gerçek kesme callback üretildi");Console.WriteLine($"P3 sokak: {checks} koşul, {routes.Length} rota, {steps} yarış adımı, {cutCallbacks} gerçek kesme; en büyük fark {error:G3}.");
  }
}
