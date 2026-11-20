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
    int tilki=MutantSlice.StartingCars[0],tavsan=MutantSlice.StartingCars[1];
    Check(vehicles.Data["cars"][tilki]["k"].S()==MutantSlice.TilkiKey && vehicles.Data["cars"][tavsan]["k"].S()==MutantSlice.TavsanKey,"Dilim araç sırası katalogla eşleşir");
    MutantSlice.Enabled=false;
    var offTilki=Measure(tilki);var offTavsan=Measure(tavsan);var offOther=Measure(10);
    Check(ReferenceEquals(MutantSlice.TuneCar(vehicles.Data["cars"][tilki]),vehicles.Data["cars"][tilki]),"Bayrak kapalıyken ayar uygulanmaz");
    MutantSlice.Enabled=true;
    try
    {
      var onTilki=Measure(tilki);var onTavsan=Measure(tavsan);var onOther=Measure(10);
      Check(onOther.Hundred==offOther.Hundred && onOther.Brake60==offOther.Brake60 && onOther.Slip==offOther.Slip,"Dilim dışı araç değişmez");
      var noKey=CatalogNode.Parse("{\"hp\":100}");
      Check(ReferenceEquals(MutantSlice.TuneCar(noKey),noKey),"Anahtarsız araç aynı düğümü döndürür");
      Check(vehicles.Data["cars"][tilki]["brk"].N()==.7 && vehicles.Data["cars"][tavsan]["brk"].N()==.72,"Katalog satırı değişmez");
      Check(Gap(onTilki.Brake60,onTavsan.Brake60)>=.15,"60-0 fren mesafesi farkı >= %15: "+onTilki.Brake60+" / "+onTavsan.Brake60);
      Check(Gap(onTilki.Slip,onTavsan.Slip)>=.15,"Slalom yan kayma farkı >= %15: "+onTilki.Slip+" / "+onTavsan.Slip);
      Check(Gap(onTilki.Hundred,onTavsan.Hundred)>=.10,"0-100 süre farkı >= %10: "+onTilki.Hundred+" / "+onTavsan.Hundred);
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
