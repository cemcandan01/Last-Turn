using LastTurn.Core;
internal static class GarageFValidation
{
  public static void Run()
  {
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/vehicle-catalog.json")));
    var state=new GarageState(catalog);state.AddMoney(1000000);state.AddXp(100000);int car=state.SelectedCar,checks=0;
    void Check(bool ok,string msg){checks++;if(!ok)throw new Exception("F garaj: "+msg);}
    foreach(var category in GarageViewModel.Categories(catalog))foreach(var part in GarageViewModel.Parts(state,car,category.Id))
    {
      string before=state.Snapshot().ToString();var preview=GarageViewModel.Detail(state,car,part.Id);
      Check(state.Snapshot().ToString()==before,"Önizleme kaydı değiştirmez");
      var candidate=GarageState.Restore(catalog,state.Snapshot());Check(part.Command.Apply(candidate),"Gerçek al/tak komutu");
      var actual=GarageViewModel.Detail(candidate,car);Check(actual.Score==preview.PreviewScore&&actual.Power==preview.PreviewPower,"Takma önizlemesi gerçek işlemle aynı");
      var removing=GarageViewModel.Detail(candidate,car,part.Id,true);double money=candidate.Balance;
      Check(GarageCommand.UnequipCategory(car,category.Id).Apply(candidate),"Sökme");actual=GarageViewModel.Detail(candidate,car);
      Check(actual.Score==removing.PreviewScore&&actual.Power==removing.PreviewPower,"Sökme önizlemesi gerçek işlemle aynı");
      Check(candidate.Balance==money&&candidate.OwnsPart(car,part.Id),"Sökme bakiye ve sahipliği korur");
      Check(actual.Features.Length==6&&actual.PreviewFeatures.Length==6&&actual.Outline.Length>2,"Altı özellik ve kaynak araç geometrisi");
    }
    string snapshot=state.Snapshot().ToString();
    foreach(var row in GarageViewModel.Cars(state))
    {
      Check(row.Type==catalog.Data["cars"][row.Index]["ty"].S(),"Mağaza tür filtresi kaynakla aynı");
      Check(row.MissingMoney==(row.Owned?0:Math.Max(0,row.Price-state.Balance)),"Mağaza eksik para hesabı");
      Check(row.Availability.Length>0&&row.Block==state.CarPurchaseBlock(row.Index),"Mağaza erişimi mevcut kuraldan");
    }
    Check(snapshot==state.Snapshot().ToString(),"Mağaza okuması mutasyonsuz");
    var exact=new GarageState(catalog);exact.AddXp(100000);
    var purchase=GarageViewModel.Cars(exact).First(r=>!r.Owned&&r.Price>0);exact.AddMoney(purchase.Price);
    Check(GarageViewModel.Cars(exact)[purchase.Index].Primary.Apply(exact),"Tam bedelle satın alma");
    var ownedRow=GarageViewModel.Cars(exact)[purchase.Index];
    Check(exact.Balance==0&&ownedRow.Owned&&ownedRow.MissingMoney==0,"Sahip olunan araç sıfır bakiyede eksik para göstermez");
    Console.WriteLine($"F garaj/mağaza: {checks} koşul; 12 kategori/42 parça, katalog filtre/erişim ve salt okuma.");
  }
}
