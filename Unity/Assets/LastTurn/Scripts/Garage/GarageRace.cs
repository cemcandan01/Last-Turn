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
        // Drag'e özel manuel vites ve kalkış (Cem kararı); diğer türlerde otomatik.
        d.Parameters.ManualGearbox = info.Type == "dg";
        if(LastTurn.Prototype.WorldData.OpponentTest)d.Parameters.ManualGearbox=false;
        bool open = state.TrackOpen(info.Type, info.Level);
        d.Career = open && GarageSession.Catalog.CareerEligible(info.Type, info.Level, car, state.Equipped(car));
        d.Message = !open ? "Pist kilitli: ödülsüz deneme." : d.Career ? "Kariyer yarışı: ödül garaja işlenir." : "Deneme: araç bu yarışın puan bütçesini aşıyor, ödül yok.";
        if(LastTurn.Prototype.WorldData.OpponentTest){d.Career=false;d.Message="Kaynak YZ doğrulama yarışı; kariyer/rekor/ödül değişmez.";}
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
      if(LastTurn.Prototype.WorldData.OpponentTest)return;
      if (GarageSession.Store == null || GarageSession.Store.ReadOnly) return;
      try { var store = ProfileStore(); var p = store.Load(); p.Started(car); store.Save(p); }
      catch (IOException e) { LastMessage = "Yarış profili yazılamadı: " + e.Message; }
    }

    /// TS endEvent + sonucGoster: yarış/galibiyet, km, rekor; hayalet yalnız kesintisiz kayıtta ve iyileşirse.
    public static void Finished(RaceRun run, Drive drive)
    {
      LastPreviousBest = double.NaN; LastNewRecord = false; LastGhostSaved = false; LastMessage = "";
      if(LastTurn.Prototype.WorldData.OpponentTest)return;
      if (GarageSession.Store == null || GarageSession.Store.ReadOnly) { LastMessage = "Kayıt salt okunur: rekor yazılmadı."; return; }
      try
      {
        var store = ProfileStore(); var p = store.Load(); var s = run.Session;
        LastNewRecord = p.Finished(s, out LastPreviousBest); store.Save(p);
        if (drive.Setup != null && drive.Parameters != null)
        {
          var existing = store.LoadGhost(s.RecordKey); var inputs = run.Recording;
          if (GhostRecord.ShouldSave(existing, s.Result, inputs, s.IsDrift))
          {
            store.SaveGhost(new GhostRecord { Key = s.RecordKey, Car = drive.Car, RaceType = run.Event.Type, AssistLevel = GarageSession.State.AssistLevel, Result = s.Result, Parts = drive.Setup.Parts, Inputs = inputs,
              Manual = run.Manual, StartGas = run.StartGas, StartRpm = run.StartRpm, StartHold = run.StartHold });
            LastGhostSaved = true;
          }
        }
        LastMessage = (LastNewRecord ? "Yeni rekor. " : "") + (LastGhostSaved ? "Hayalet kaydedildi." : inputsNote(run));
      }
      catch (IOException e) { LastMessage = "Rekor/hayalet yazılamadı: " + e.Message; }
    }
    private static string inputsNote(RaceRun run) => run.Recording.Cut ? "Piste dönüş/yeniden doğ kaydı kesti: hayalet yok." : "";

    // TS surusAdimi: yarış dışındaki yol ve yarıda bırakılan yarış da toplam yola dahildir.
    public static bool Distance(double km)
    {
      if(LastTurn.Prototype.WorldData.OpponentTest)return true;
      if(double.IsNaN(km)||double.IsInfinity(km)||km<0)return false;if(km==0)return true;
      if(GarageSession.Store==null || GarageSession.Store.ReadOnly)return false;
      try { var store=ProfileStore();var p=store.Load();p.Drove(km*1000,0,1);store.Save(p);return true; }
      catch(Exception e) { LastMessage="Kilometre kaydedilemedi: "+e.Message;return false; }
    }

    /// Kayıtlı hayaleti kendi araç kurulumuyla oyuncudan ayrı fizikte oynat (yoksa null).
    public static GhostPlayer Ghost(RaceEventInfo info, TrackDefinition track, string recordKey)
    {
      if(LastTurn.Prototype.WorldData.OpponentTest)return null;
      try
      {
        GarageSession.EnsureLoaded(); var g = ProfileStore().LoadGhost(recordKey);
        if (g == null || g.Car >= GarageSession.Catalog.Data["cars"].Items.Count()) return null;
        var setup = GarageSession.Catalog.Setup(g.Car, g.Parts, g.AssistLevel);
        var parameters = GarageDriveParameters.Create(GarageSession.Catalog, setup, false, g.RaceType); parameters.ManualGearbox = g.Manual;
        return new GhostPlayer(g, parameters, track, info);
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
