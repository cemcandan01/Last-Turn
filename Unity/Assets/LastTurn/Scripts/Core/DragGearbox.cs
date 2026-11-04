using System;

namespace LastTurn.Core
{
  // Drag manuel vites göstergesi (Cem kararı; TS'de yok). Yalnız bilgi verir, vitesi kendisi değiştirmez. Değerler fizikle aynı
  // tork eğrisi ve vites oranlarından; turbo gecikmesi ve lastik kayması dahil değildir (gösterge yaklaşığı).
  public static class DragGearAdvisor
  {
    /// Motor tork katsayısı: kesicide (RevLimit) sıfır.
    public static double Torque(PowertrainParameters p, double rpm)
    {
      double u = rpm / p.MaxRpm;
      return u >= PowertrainParameters.RevLimit ? 0 : PowertrainParameters.TorqueCurve(u);
    }

    /// g'den g+1'e en uygun geçiş devri: aynı hızda bir üst vitesin teker torku mevcut vitesinkine eşitlendiği ilk devir; yoksa kesici.
    public static double ShiftRpm(PowertrainParameters p, int gear)
    {
      if (gear < 1 || gear >= 6) return p.MaxRpm;
      double r = PowertrainParameters.GearRatio(gear), next = PowertrainParameters.GearRatio(gear + 1);
      for (double rpm = .4 * p.MaxRpm; rpm < p.MaxRpm * PowertrainParameters.RevLimit; rpm += 10)
        if (Torque(p, rpm * next / r) * next >= Torque(p, rpm) * r) return rpm;
      return p.MaxRpm;
    }

    /// Kalkış bandı: tork eğrisinin tepesinin %95'inden fazlasını veren devir aralığı.
    public static (double Low, double High) LaunchBand(PowertrainParameters p)
    {
      double half = Math.Sqrt(.05 / 1.4);
      return ((.55 - half) * p.MaxRpm, (.55 + half) * p.MaxRpm);
    }
  }

  public sealed class DragHudModel
  {
    public bool Manual; public int Gear; public double Rpm, MaxRpm, ShiftRpm, LaunchLow, LaunchHigh;
    public string Light = "", Help = "";
    public double Fraction => Rpm / MaxRpm;
  }

  public static class DragViewModel
  {
    /// Devir göstergesi ve uyarı: geri sayımda kalkış bandı, yarışta vites ışığı / kesici / düşük devir. Otomatik vites yok.
    public static DragHudModel Hud(PowertrainVehicle v, RaceSession s)
    {
      var p = v.Parameters; var e = v.Engine; var band = DragGearAdvisor.LaunchBand(p);
      var m = new DragHudModel { Manual = p.ManualGearbox, Gear = e.Gear, Rpm = e.Rpm, MaxRpm = p.MaxRpm, ShiftRpm = DragGearAdvisor.ShiftRpm(p, e.Gear), LaunchLow = band.Low, LaunchHigh = band.High };
      if (!m.Manual) return m;
      m.Help = "E vites yükselt · Q düşür · geri sayımda W ile devri yeşil bölgede tut";
      if (s.State == RaceState.Countdown)
        m.Light = e.Rpm < band.Low ? "DEVİR DÜŞÜK" : e.Rpm > band.High ? "DEVİR YÜKSEK" : "KALKIŞ HAZIR";
      else if (s.State == RaceState.Running)
        m.Light = e.Rpm >= p.MaxRpm * .99 ? "KESİCİ" : e.Gear < 6 && e.Rpm >= m.ShiftRpm * .97 ? "VİTES ↑" : e.Gear > 1 && e.Rpm < .3 * p.MaxRpm ? "DÜŞÜK DEVİR" : "";
      return m;
    }
  }
}
