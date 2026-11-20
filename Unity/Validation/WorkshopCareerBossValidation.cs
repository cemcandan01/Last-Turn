using LastTurn.Core;
internal static class WorkshopCareerBossValidation
{
  public static void Run()
  {
    int checks=0;void Check(bool ok,string label){if(!ok)throw new Exception(label);checks++;}
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"../../../../Assets/LastTurn/Resources/vehicle-catalog.json")));
    var state=new GarageState(catalog);int car=state.SelectedCar;
    Check(!CareerMilestones.CanUse(state,4),"Başlangıçta özel desen kilitli");
    Check(!state.SetAppearance(car,new CarAppearance{Graphic=4}),"Komut kilitli deseni reddeder");
    foreach(int level in new[]{1,2,3})state.RaceFinished("gp",level,1);
    Check(CareerMilestones.CanUse(state,4),"Üç tamamlamada ilk imza açılır");
    Check(state.SetAppearance(car,new CarAppearance{Graphic=4}),"Açılan desen uygulanır");
    var copy=GarageState.Restore(catalog,state.Snapshot());Check(copy.Appearance(car).Graphic==4,"Ödül görünümü diskte korunur");
    var before=state.Snapshot().ToString();var setup=GarageViewModel.PreviewSetup(state,car,"motor-yaris");
    var a=GarageBenchResult.Measure(catalog,state.Setup(car));var b=GarageBenchResult.Measure(catalog,setup);
    Check(state.Snapshot().ToString()==before,"Parça denemesi sahiplik/bakiye değiştirmez");
    Check(b.Hundred>0 && a.Hundred>0 && b.Hundred<a.Hundred,"Gerçek fizik motor karşılaştırması");
    Check(a.Brake60>0 && double.IsFinite(a.Slip),"Fren ve slalom ölçümü");
    foreach(string id in new[]{"gece-sahini","toprak-kurdu","camur-baronu","drag-canavari","drift-kralicesi"}){
      Check(BossEncounter.Read(id,0).Window==false,"Hazırlık okunur "+id);
      Check(BossEncounter.Read(id,4.5).Window,"Atak penceresi "+id);
    }
    Check(BossEncounter.Read("drag-canavari",5.5).Style.ThrottleCap<1,"Drag gaz keserek fırsat verir");
    Check(BossEncounter.Read("camur-baronu",3).Style.BrakePreview>BossEncounter.Read("gece-sahini",4).Style.BrakePreview,"Boss kararları farklı");
    var show=new BossShowProgress();show.Observe(2,100);Check(show.Windows==0,"Pencere dışında puan sayılmaz");
    show.Observe(4,200);show.Observe(5,250);Check(show.Windows==1,"Aynı pencere tek sayılır");
    show.Observe(16,400);Check(show.Windows==2,"İkinci şov penceresi");
    Console.WriteLine("Atölye, kariyer ve boss "+checks+" kontrol geçti.");
  }
}
