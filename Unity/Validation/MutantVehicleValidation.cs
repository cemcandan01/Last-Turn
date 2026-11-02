using LastTurn.Core;

internal static class MutantVehicleValidation
{
  public static void Run()
  {
    var data=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-vehicle-0.8.18.json")));
    if(data["baseline"].S()!=VehicleCatalog.Baseline)throw new Exception("Yanlış TS kaynağı");
    int checks=0;double error=0;
    void Compare(CatalogNode actual,CatalogNode expected,string label)
    {
      foreach(var pair in expected.Fields)
      {
        if(pair.Value.IsNumber){double d=Math.Abs(actual[pair.Key].N()-pair.Value.N());error=Math.Max(error,d);checks++;if(d>1e-9)throw new Exception(label+" / "+pair.Key+" fark "+d);}
        else if(pair.Key=="gr")for(int i=0;i<2;i++){double d=Math.Abs(actual["gr"][i].N()-pair.Value[i].N());error=Math.Max(error,d);checks++;if(d>1e-9)throw new Exception(label+" tutuş farkı");}
        else {checks++;if(actual[pair.Key].ToString()!=pair.Value.ToString())throw new Exception(label+" değişmeyen alan: "+pair.Key);}
      }
    }
    foreach(var row in data["cases"].Items)
    {
      var n=row["input"];var stock=data["cars"][(int)n["car"].N()];string before=stock.ToString();
      var result=MutantVehicle.Apply(stock,n["passives"].Items.Select(x=>x.S()),n["body"].N(),n["remaining"].N(),n["power"].N(),n["skillPower"].N(),n["skillGrip"].N());
      Compare(result,row["car"],"Pasif araç");checks++;if(stock.ToString()!=before)throw new Exception("Kariyer aracı değişti");
    }
    foreach(var row in data["dirt"].Items)Compare(MutantVehicle.DirtBalance(data["cars"][(int)row["car"].N()],row["grip"].N()),row["result"],"Toprak dengesi");
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/vehicle-catalog.json")));
    foreach(var row in data["setups"].Items)
    {
      var setup=catalog.Setup((int)row["car"].N(),row["ids"].Items.Select(x=>x.S()));
      var actual=MutantVehicle.Configure(catalog,setup,row["run"]);
      Compare(actual.Car,row["result"],"Parça/pasif fizik kurulumu");checks++;
      if(actual.Tire!=row["tire"].N())throw new Exception("Mutant önayar lastiği değişimi kaynakla farklı");
    }
    Console.WriteLine($"Mutant araç: {checks} koşul; bütün kaynak pasiflerinin araç alanları, güç/tutuş tavanı ve gövde/nitro/toprak; en büyük fark {error:G3}.");
  }
}
