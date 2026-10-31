using System;
using LastTurn.Core;

namespace LastTurn.Garage
{
  // Yarış ↔ garaj oturumu köprüsü (kural yok): seçili aracın kurulumu ve yarış lastiği, kariyer uygunluğu, pist kilidi
  // ve ödülün kayıtlı garaja işlenmesi. Kurallar GarageState/VehicleCatalog'dadır (TS ilerleme/kariyer).
  public static class GarageRace
  {
    public sealed class Drive
    {
      public PowertrainParameters Parameters; public CatalogSetup Setup; public bool Career; public string Message = "";
    }

    public static Drive Prepare(RaceEventInfo info)
    {
      var d = new Drive();
      try
      {
        // Yalnız okur: açılışta kayda yazılmaz (ödül dışında). Garajdan gelindiyse o kurulum, yoksa seçili araç.
        GarageSession.EnsureLoaded();
        var state = GarageSession.State; int car = state.SelectedCar;
        d.Setup = GarageSession.DriveActive && GarageSession.DriveSetup != null ? GarageSession.DriveSetup : state.Setup(car);
        // TS startEvent: etkinlik türünün yarış lastiği takılır.
        d.Parameters = GarageDriveParameters.Create(GarageSession.Catalog, d.Setup, false, info.Type);
        bool open = state.TrackOpen(info.Type, info.Level);
        d.Career = open && GarageSession.Catalog.CareerEligible(info.Type, info.Level, car, state.Equipped(car));
        d.Message = !open ? "Pist kilitli: ödülsüz deneme." : d.Career ? "Kariyer yarışı: ödül garaja işlenir." : "Deneme: araç bu yarışın puan bütçesini aşıyor, ödül yok.";
        if (GarageSession.Store.ReadOnly) d.Message += " Kayıt salt okunur: ödül yazılamaz.";
      }
      catch (Exception e) { d.Parameters = null; d.Setup = null; d.Career = false; d.Message = "Garaj açılamadı; GT test aracı, ödülsüz. " + e.Message; }
      return d;
    }

    /// TS yarisBitti: kayıtlı garaja yazılır; yazılamazsa durum değişmez ve kazanç 0 döner.
    public static (double Xp, double Money) Reward(string type, int level, int stars)
    {
      (double, double) result = (0, 0);
      bool saved = GarageSession.Transact(s => { result = s.RaceFinished(type, level, stars); return true; }, "Yarış ödülü garaja kaydedildi.");
      return saved ? result : (0, 0);
    }
  }
}
