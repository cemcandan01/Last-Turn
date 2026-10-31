using System;
using System.IO;
using System.Linq;
using LastTurn.Core;

namespace LastTurn.Garage
{
  // Yarış ↔ garaj oturumu köprüsü (kural yok): seçili aracın kurulumu ve yarış lastiği, kariyer uygunluğu, pist kilidi
  // ve ödülün kayıtlı garaja işlenmesi. Kurallar GarageState/VehicleCatalog'dadır (TS ilerleme/kariyer).
  public static class GarageRace
  {
    public sealed class Drive
    {
      public PowertrainParameters Parameters; public CatalogSetup Setup; public bool Career; public int Car; public string Message = "";
    }

    public static Drive Prepare(RaceEventInfo info)
    {
      var d = new Drive();
      try
      {
        // Yalnız okur: açılışta kayda yazılmaz (ödül dışında). Garajdan gelindiyse o kurulum, yoksa seçili araç.
        GarageSession.EnsureLoaded();
        var state = GarageSession.State; int car = state.SelectedCar; d.Car = car;
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

    // ---------- Rekor, profil sayaçları ve hayalet (TS profil.ts sv_/lt_prof, hayalet-kayit.ts lt_hayalet_).
    // Garaj profilinin yanında "races-<profil>" dizini; salt okunur garajda yazılmaz.
    public static RaceProfileStore ProfileStore()
    {
      GarageSession.EnsureLoaded(); string file = GarageSession.Store.FilePath;
      return new RaceProfileStore(Path.Combine(Path.GetDirectoryName(file), "races-" + Path.GetFileNameWithoutExtension(file)));
    }

    /// Son yarışın sonuç satırı için: güncellemeden önceki rekor ve yeni rekor mu.
    public static double LastPreviousBest = double.NaN; public static bool LastNewRecord; public static bool LastGhostSaved; public static string LastMessage = "";

    /// TS startEvent: seçili aracın kullanım sayacı.
    public static void Started(int car)
    {
      if (GarageSession.Store == null || GarageSession.Store.ReadOnly) return;
      try { var store = ProfileStore(); var p = store.Load(); p.Started(car); store.Save(p); }
      catch (IOException e) { LastMessage = "Yarış profili yazılamadı: " + e.Message; }
    }

    /// TS endEvent + sonucGoster: yarış/galibiyet, km, rekor; hayalet yalnız kesintisiz kayıtta ve iyileşirse.
    public static void Finished(RaceRun run, Drive drive)
    {
      LastPreviousBest = double.NaN; LastNewRecord = false; LastGhostSaved = false; LastMessage = "";
      if (GarageSession.Store == null || GarageSession.Store.ReadOnly) { LastMessage = "Kayıt salt okunur: rekor yazılmadı."; return; }
      try
      {
        var store = ProfileStore(); var p = store.Load(); var s = run.Session;
        LastNewRecord = p.Finished(s, out LastPreviousBest); p.Km += run.Km; store.Save(p);
        if (drive.Setup != null && drive.Parameters != null)
        {
          var existing = store.LoadGhost(s.RecordKey); var inputs = run.Recording;
          if (GhostRecord.ShouldSave(existing, s.Result, inputs, s.IsDrift))
          {
            store.SaveGhost(new GhostRecord { Key = s.RecordKey, Car = drive.Car, RaceType = run.Event.Type, AssistLevel = "norm", Result = s.Result, Parts = drive.Setup.Parts, Inputs = inputs });
            LastGhostSaved = true;
          }
        }
        LastMessage = (LastNewRecord ? "Yeni rekor. " : "") + (LastGhostSaved ? "Hayalet kaydedildi." : inputsNote(run));
      }
      catch (IOException e) { LastMessage = "Rekor/hayalet yazılamadı: " + e.Message; }
    }
    private static string inputsNote(RaceRun run) => run.Recording.Cut ? "Piste dönüş/yeniden doğ kaydı kesti: hayalet yok." : "";

    /// Kayıtlı hayaleti kendi araç kurulumuyla oyuncudan ayrı fizikte oynat (yoksa null).
    public static GhostPlayer Ghost(RaceEventInfo info, TrackDefinition track, string recordKey)
    {
      try
      {
        GarageSession.EnsureLoaded(); var g = ProfileStore().LoadGhost(recordKey);
        if (g == null || g.Car >= GarageSession.Catalog.Data["cars"].Items.Count()) return null;
        var setup = GarageSession.Catalog.Setup(g.Car, g.Parts, g.AssistLevel);
        return new GhostPlayer(g, GarageDriveParameters.Create(GarageSession.Catalog, setup, false, g.RaceType), track, info);
      }
      catch (Exception e) when (e is IOException || e is ArgumentException || e is FormatException) { LastMessage = "Hayalet açılamadı: " + e.Message; return null; }
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
