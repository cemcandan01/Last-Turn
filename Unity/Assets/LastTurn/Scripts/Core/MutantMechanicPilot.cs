#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  // M1 deneyi: eski yürütücüyü değiştirmeyen, açıkça seçilen sabit-adım girdi sınırı.
  // Normal MutantEnergyController bu sınıfı kullanmaz. Ödül/skill/kayıt kuralı içermez.
  public sealed class MutantMechanicPilot
  {
    public const double FixedDelta = 1d / 60;
    private readonly MechanicDefinition[] installed;
    private MechanicState state;
    public MechanicState Snapshot => state.Clone();

    public MutantMechanicPilot(CatalogNode catalog, IEnumerable<string> passives)
    {
      var definitions = catalog["passives"].Items.Concat(catalog["addons"].Items).ToArray();
      installed = MutantMechanics.Installed(passives, id => definitions.FirstOrDefault(p => p["id"].S() == id)).ToArray();
      state = MutantMechanics.ApplyCapacity(MutantMechanics.Start(start: MutantMechanics.StartEnergy), installed);
    }

    // Türev enerji olayı dışarıdan tekrar kök olay olarak enjekte edilemez.
    // Reddedilen parti zaman/bekleme/sıra/telemetri dahil hiçbir durumu değiştirmez.
    public bool TryStep(IReadOnlyList<MechanicEvent> events, double dt = FixedDelta)
    {
      if (!double.IsFinite(dt) || Math.Abs(dt - FixedDelta) > 1e-12 || events.Count > MutantMechanics.StepLimit) return false;
      double last = state.LastSeq;
      foreach (var e in events)
      {
        if (e == null || !double.IsFinite(e.Seq) || e.Seq < 0 || e.Seq > 9007199254740991 || Math.Floor(e.Seq) != e.Seq || e.Seq <= last) return false;
        last = e.Seq;
        switch (e.Kind)
        {
          case "SurusTick": case "DriftTickQualified": case "YakinTakip":
            if (!double.IsFinite(e.Dt) || Math.Abs(e.Dt - dt) > 1e-12 || !double.IsFinite(e.Speed) || !double.IsFinite(e.Angle)) return false;
            break;
          case "DriftEnded":
            if (!double.IsFinite(e.Duration) || e.Duration < 0) return false;
            break;
          case "HasarAlindi": case "HasarVerildi": case "KorumaEngelledi":
            if (!double.IsFinite(e.Amount) || e.Amount <= 0) return false;
            break;
          case "RiskBasladi":
            if (!double.IsFinite(e.Risk) || e.Risk < 0 || e.Risk > 2 || Math.Floor(e.Risk) != e.Risk) return false;
            break;
          case "DriftStarted": case "AbilityActivated": case "DurumUygulandi": break;
          default: return false;
        }
      }
      state = MutantMechanics.Step(state, events, installed, true, FixedDelta);
      return true;
    }
  }
}
