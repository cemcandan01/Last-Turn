using System;
using System.Globalization;

namespace LastTurn.Core
{
  /// TS fizik/drift-tani.ts driftTanisi: MUTANT DEV drift yarışı tanısı. Fiziği değiştirmez; yarış drift profilini okur.
  public sealed class MutantDriftDiagnosis
  {
    public string State = "", Message = "", Hint = "";
    public int Angle, Entry, Max, Spin, Speed, Progress;

    private static int Round(double x) => (int)Math.Floor(x + .5);
    private static int Degree(double r) => Round(r * 180 / Math.PI);

    /// air: S.air, dr: DR, steer: sim.st, gas: S.gas, beta: D.beta, speed: yatay hız (m/s), p: driftYarisProfili(kurulum).
    public static MutantDriftDiagnosis Read(bool air, DriftAssistState dr, double steer, double gas, double beta, double speed, DriftRaceProfile p)
    {
      double ab = Math.Abs(beta);
      MutantDriftDiagnosis R(string state, string message, string hint, double progress = 0) => new MutantDriftDiagnosis
      {
        State = state, Message = message, Hint = hint, Angle = Degree(ab), Entry = Degree(p.Entry), Max = Degree(p.Max), Spin = Degree(p.Max + .12),
        Speed = Round(speed * 3.6), Progress = Round(Math.Max(0, Math.Min(1, progress)) * 100),
      };
      if (air) return R("havada", "HAVADA", "Tekerlekler yere basınca giriş yapılabilir");
      if (dr.Cool > 0) return R("toparlan", "SPİN SONRASI", "Toparlanma: " + Math.Max(0, dr.Cool).ToString("0.0", CultureInfo.InvariantCulture) + " sn");
      if (dr.On)
      {
        double inside = steer * dr.Dir;
        string direction = inside > .25 ? "Direksiyon açıyı büyütüyor" : inside < -.25 ? "Karşı direksiyon açıyı azaltıyor" : "Açıyı gaz ve direksiyonla koru";
        bool limit = ab >= p.Max * .9;
        return R(limit ? "sinir" : "drift", limit ? "SPİN SINIRINDA" : "DRIFT AKTİF", direction, ab / p.Max);
      }
      if (speed < 7) return R("yavas", "HIZ GEREKLİ", "Drifte giriş için en az 25 km/sa");
      if (gas < .2) return R("gaz", "GAZ GEREKLİ", "Gaza basarak açıyı oluştur");
      if (dr.Nc > 0) return R("hazirlik", "GİRİŞ HAZIRLIĞI", "Kayma açısını kısa süre koru", dr.Nc / p.Prepare);
      if (dr.Hold > 0) return R("zorlama", "DİREKSİYONLA GİRİŞ", "Direksiyon ve gazı tutarak arka aksı kaydır", dr.Hold / p.Force);
      return R("aci", "KAYMA AÇISI", "Giriş eşiğine ulaş: " + Degree(p.Entry) + "°", ab / p.Entry);
    }
  }
}
