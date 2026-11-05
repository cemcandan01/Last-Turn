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
    Console.WriteLine($"F garaj: {checks} koşul; bütün 12 kategori/42 parça al-tak-sök önizlemesi, salt okuma ve sahiplik.");
  }
}
