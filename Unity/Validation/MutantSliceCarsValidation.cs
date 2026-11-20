using LastTurn.Core;

internal static class MutantSliceCarsValidation
{
  public static void Run()
  {
    int checks=0;
    void Check(bool ok,string why){if(!ok)throw new InvalidOperationException(why);checks++;}
    string resources=Path.Combine(AppContext.BaseDirectory,"../../../../Assets/LastTurn/Resources/");
    var vehicles=new VehicleCatalog(File.ReadAllText(resources+"vehicle-catalog.json"));
    var catalog=CatalogNode.Parse(File.ReadAllText(resources+"mutant-catalog.json"));
    var run=new MutantRun(53,catalog);
    GarageBenchResult Measure(int car){var setup=MutantVehicle.Configure(vehicles,vehicles.Setup(car,Array.Empty<string>()),run.State);return GarageBenchResult.Measure(vehicles,setup);}
    double Gap(double a,double b)=>Math.Abs(a-b)/Math.Max(a,b);
    // Toprakta sabit direksiyonla ortalama gövde kayma açısı (derece): norm yardımın farkı bastırıp bastırmadığını sınar.
    double DirtSlip(int car)
    {
      var vehicle=new PowertrainVehicle(vehicles.CreatePhysics(MutantVehicle.Configure(vehicles,vehicles.Setup(car,Array.Empty<string>()),run.State)),world:new TerrainTestWorld());
      vehicle.Place(10,0,Math.PI/2);double sum=0;int n=0;
      for(int i=0;i<60*6;i++)
      {
        double t=i/60.0;vehicle.Step(t<3.2?new DrivingInput(1,0,0,false,false,false):new DrivingInput(.6,0,.35,false,false,false));
        if(t>=3.8){var f=vehicle.Body.Orientation.Rotate(new BodyVector(0,0,1));double h=Math.Atan2(f.X,f.Z),vl=vehicle.Body.Velocity.X*Math.Sin(h)+vehicle.Body.Velocity.Z*Math.Cos(h),vt=vehicle.Body.Velocity.X*Math.Cos(h)-vehicle.Body.Velocity.Z*Math.Sin(h);sum+=Math.Abs(Math.Atan2(vt,Math.Max(vl,.5)))*180/Math.PI;n++;}
      }
      return sum/n;
    }
    int tilki=MutantSlice.StartingCars[0],tavsan=MutantSlice.StartingCars[1];
    Check(vehicles.Data["cars"][tilki]["k"].S()==MutantSlice.TilkiKey && vehicles.Data["cars"][tavsan]["k"].S()==MutantSlice.TavsanKey,"Dilim araç sırası katalogla eşleşir");
    MutantSlice.Enabled=false;
    var offTilki=Measure(tilki);var offTavsan=Measure(tavsan);var offOther=Measure(10);
    Check(ReferenceEquals(MutantSlice.TuneCar(vehicles.Data["cars"][tilki]),vehicles.Data["cars"][tilki]),"Bayrak kapalıyken ayar uygulanmaz");
    MutantSlice.Enabled=true;
    try
    {
      var onTilki=Measure(tilki);var onTavsan=Measure(tavsan);MutantSlice.SoftGround=false;var onOther=Measure(10);MutantSlice.SoftGround=true;
      Check(onOther.Hundred==offOther.Hundred && onOther.Brake60==offOther.Brake60 && onOther.Slip==offOther.Slip,"Dilim dışı araç araç ayarından etkilenmez (eski zeminde aynı)");
      var noKey=CatalogNode.Parse("{\"hp\":100}");
      Check(ReferenceEquals(MutantSlice.TuneCar(noKey),noKey),"Anahtarsız araç aynı düğümü döndürür");
      Check(vehicles.Data["cars"][tilki]["brk"].N()==.7 && vehicles.Data["cars"][tavsan]["brk"].N()==.72,"Katalog satırı değişmez");
      Check(Gap(onTilki.Brake60,onTavsan.Brake60)>=.15,"60-0 fren mesafesi farkı >= %15: "+onTilki.Brake60+" / "+onTavsan.Brake60);
      Check(Gap(onTilki.Slip,onTavsan.Slip)>=.15,"Slalom yan kayma farkı >= %15: "+onTilki.Slip+" / "+onTavsan.Slip);
      Check(Gap(onTilki.Hundred,onTavsan.Hundred)<=.08,"Güç dengesi yakın, 0-100 farkı <= %8: "+onTilki.Hundred+" / "+onTavsan.Hundred);
      double dirtTilki=DirtSlip(tilki),dirtTavsan=DirtSlip(tavsan);
      Check(dirtTilki>=dirtTavsan*3,"Toprakta Tilki Tavşan'dan >= 3 kat fazla kayar (norm yardımla): "+dirtTilki+" / "+dirtTavsan);
      Check(dirtTilki>=15,"Tilki toprakta belirgin kayar >= 15°: "+dirtTilki);
      Check(dirtTavsan<=6,"Tavşan toprakta yapışkan <= 6°: "+dirtTavsan);
      var stock=vehicles.Setup(tilki,Array.Empty<string>());var tunedAssists=MutantSlice.TuneAssists(MutantSlice.TilkiKey,stock.Assists);
      Check(tunedAssists["stm"].N()<stock.Assists["stm"].N() && tunedAssists["tcs"].N()<stock.Assists["tcs"].N() && ReferenceEquals(MutantSlice.TuneAssists(MutantSlice.TavsanKey,stock.Assists),stock.Assists),"Yalnız Tilki'nin yardımı azalır");
      Check(stock.Assists["stm"].N()==.4,"Katalog yardım seviyesi değişmez");
      // Zemin A/B: yeni ayar asfalt lastiğini yumuşatır, eski ayar bayrak kapalı sonucu verir.
      var softTire=vehicles.CreatePhysics(MutantVehicle.Configure(vehicles,vehicles.Setup(10,Array.Empty<string>()),run.State)).Chassis.TireForSurface(1,2);MutantSlice.SoftGround=false;TireParameters hardTire=default;
      try
      {
        hardTire=vehicles.CreatePhysics(MutantVehicle.Configure(vehicles,vehicles.Setup(10,Array.Empty<string>()),run.State)).Chassis.TireForSurface(1,2);var oldGround=Measure(10);Check(oldGround.Slip==offOther.Slip && oldGround.Brake60==offOther.Brake60,"Eski zemin ayarı bayrak kapalı sonucu verir");
        Check(!RaceDrift.SpinMargin.Equals(MutantSlice.DriftSpinMargin) && RaceDrift.SpinMargin==DriftRaceProfile.DefaultSpinMargin,"Eski zeminde spin payı TS değeri");
        var oldProfile=RaceDrift.Profile(vehicles.Setup(tilki,Array.Empty<string>()));Check(oldProfile.SpinMargin==.12 && oldProfile.SpinCool==.9 && oldProfile.HoldSteer==.6 && oldProfile.HoldGas==.5,"Eski zeminde drift profili TS değeri");
      }
      finally{MutantSlice.SoftGround=true;}
      Check(softTire.Kp>hardTire.Kp && softTire.MuY<hardTire.MuY,"Yeni zeminde asfalt lastiği yumuşar (daha az tutuş, daha yumuşak eğri): "+softTire.MuY+" / "+hardTire.MuY);
      var setup=vehicles.Setup(tilki,Array.Empty<string>());var loose=RaceDrift.Profile(setup);MutantSlice.SoftGround=false;var strict=RaceDrift.Profile(setup);MutantSlice.SoftGround=true;
      Check(loose.Entry<strict.Entry && loose.Force<strict.Force && loose.Max>strict.Max && loose.SpinMargin>strict.SpinMargin && loose.SpinCool<strict.SpinCool && loose.HoldSteer<strict.HoldSteer && loose.HoldGas<strict.HoldGas,"Drift yarışı gevşer: giriş, azami açı, spin cezası");
      Check(Math.Abs(loose.Max-strict.Max-MutantSlice.DriftMaxBonus*Math.PI/180)<1e-12,"Azami açı payı kadar genişler");
      Check(onTilki.Brake60!=offTilki.Brake60 || onTilki.Slip!=offTilki.Slip,"Ayar Tilki'yi gerçekten değiştirir");
      Check(onTavsan.Brake60!=offTavsan.Brake60 || onTavsan.Hundred!=offTavsan.Hundred,"Ayar Tavşan'ı gerçekten değiştirir");
      Console.WriteLine($"Tilki 0-100 {onTilki.Hundred:0.00}s / 60-0 {onTilki.Brake60:0.0}m / yan kayma {onTilki.Slip:0.0}°");
      Console.WriteLine($"Tavşan 0-100 {onTavsan.Hundred:0.00}s / 60-0 {onTavsan.Brake60:0.0}m / yan kayma {onTavsan.Slip:0.0}°");
      var cards=MutantMenuModel.StartingCars(53,catalog);
      Check(cards.Length==2 && cards[0]==tilki && cards[1]==tavsan,"Dilim başlangıçta yalnız iki araç");
    }
    finally{MutantSlice.Enabled=false;}
    var normal=MutantMenuModel.StartingCars(53,catalog);
    Check(normal.Length==3 && normal.All(c=>catalog["startingCars"].Items.Any(x=>(int)x.N()==c)),"Bayrak kapalıyken eski üç rastgele araç");
    Check(MutantMenuModel.StartingCars(53,catalog,true).Length==(int)catalog["carsCount"].N(),"DEV testi tüm araçları açar");
    var after=Measure(tilki);
    Check(after.Hundred==offTilki.Hundred && after.Brake60==offTilki.Brake60 && after.Slip==offTilki.Slip,"Bayrak kapanınca eski sonuç geri gelir");
    Console.WriteLine("MUTANT dilim araçları "+checks+" kontrol geçti.");
  }
}
