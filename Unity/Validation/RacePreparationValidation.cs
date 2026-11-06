using LastTurn.Core;

internal static class RacePreparationValidation
{
  public static void Run()
  {
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    string Text(string file)=>File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/"+file));
    var catalog=new VehicleCatalog(Text("vehicle-catalog.json"));var events=new RaceEventCatalog(Text("race-events.json"));var tracks=new TrackCatalog(Text("track-catalog.json"));
    int checks=0;void Check(bool ok,string label){checks++;if(!ok)throw new Exception("Yarış hazırlığı: "+label);}
    var profile=new RaceProfile();string recordKey=events.Find("gp",1).Key;profile.Records[recordKey]="123.45";profile.Records["deneme_"+recordKey]="234.56";
    foreach(int selected in new[]{-1,10,0,9})
    {
      var state=new GarageState(catalog);
      if(selected>=0){state.AddXp(100000);state.AddMoney(1000000);if(!state.OwnsCar(selected))GarageCommand.BuyCar(selected).Apply(state);GarageCommand.SelectCar(selected).Apply(state);}
      string before=state.Snapshot().ToString(),record=profile.Snapshot().ToString();
      foreach(var e in events.Events)
      {
        var track=tracks.Find(e.Type,e.Level);var m=RacePreparationModel.Read(state,profile,events,track,e.Type+"_"+e.Level);
        Check(m.Open==state.TrackOpen(e.Type,e.Level),"Kilit mevcut ilerleme kuralıyla aynı");
        Check(m.Career==catalog.CareerEligible(e.Type,e.Level,state.SelectedCar,state.Equipped(state.SelectedCar)),"Bütçe mevcut performans kuralıyla aynı");
        Check(m.Car.Name==GarageViewModel.Detail(state,state.SelectedCar).Name&&m.Targets.Length==e.Stars.Length,"Gerçek seçili araç ve bütün yıldız hedefleri");
        Check(m.MapX.Length==track.Geometry.N&&m.MapZ.Length==track.Geometry.N&&m.MapOpen==track.Open,"Gerçek açık/kapalı pist geometrisi");
        if(m.Open&&m.Career){var copy=GarageState.Restore(catalog,state.Snapshot());var reward=copy.RaceFinished(e.Type,e.Level,3);Check(m.Xp==reward.Xp&&m.Money==reward.Money,"Öngörü gerçek yarış bitiş ödülüyle aynı");}
        else Check(m.Xp==0&&m.Money==0,"Kilit/denemede ödül vaat edilmez");
        if(e.Type=="gp"&&e.Level==1)Check(m.Record==RaceSession.FormatTime(m.Career?123.45:234.56),"Kariyer ve deneme rekor anahtarları ayrıdır");
        double x=track.Geometry.X[0];m.MapX[0]+=10;Check(track.Geometry.X[0]==x,"Harita görünümü fizik geometrisini değiştirmez");
        Check(state.Snapshot().ToString()==before&&profile.Snapshot().ToString()==record,"Hazırlık okuması ilerleme/kaydı değiştirmez");
      }
    }
    Console.WriteLine($"Yarış hazırlığı F: {checks} kontrol; 40 etkinlik, kilit/bütçe/ödül/rekor, gerçek geometri, mutasyonsuz sunum.");
  }
}
