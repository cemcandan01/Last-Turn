#nullable enable
using System.Linq;

namespace LastTurn.Core
{
  /// TS oyun/mutant.ts beceriEfektDurumu + nitroAcik: koşu durumunun salt okuma görüntüsü. Yeni hedef/kuvvet hesabı yapmaz;
  /// kanca hedefi enerji adımının yazdığı becHedef (HUD TargetPoint) kaydından gelir.
  public sealed class MutantSkillEffectModel
  {
    /// Kanca ucu [x, z, y] (bina cephesi/köşe); yol/pist noktası [x, z] (zemine çizim katmanı oturtur). Rakipse null + HookOpponent.
    public double[]? HookPoint;
    public bool HookOpponent;
    /// Atılabilir kanca hedefi [x, y, z].
    public double[]? HookTarget;
    public bool Ghost, Transform, Wind, Nitro;
    /// Risk Taker alev izi: [x, z, kalan sn].
    public double[][] Trail = System.Array.Empty<double[]>();

    public const string Pendulum = "#bina";

    public static MutantSkillEffectModel? Read(MutantRun? run)
    {
      return run == null ? null : Read(run.State);
    }

    public static MutantSkillEffectModel Read(CatalogNode s)
    {
      var y = s["bec"]["yerel"];
      bool Open(string id) => y.Has(id) && y[id]["kalan"].N(0) > 0;
      var m = new MutantSkillEffectModel();
      if (Open("grappling-hook"))
      {
        var k = y["grappling-hook"];
        if (k.Has("uc") && k["uc"].IsArray) m.HookPoint = new[] { k["uc"][0].N(), k["uc"][2].N(), k["uc"][1].N() };
        else if (k.Has("hedef") && k["hedef"].IsString && k["hedef"].S() != "" && k["hedef"].S() != Pendulum) m.HookOpponent = true;
        else if (k.Has("nokta") && k["nokta"].IsArray) m.HookPoint = k["nokta"].Items.Select(n => n.N()).ToArray();
      }
      var target = s["becHedef"]["grappling-hook"];
      if (target.IsArray && target.Items.Any()) m.HookTarget = target.Items.Select(n => n.N()).ToArray();
      m.Ghost = s["becCikti"]["hayalet"].B();
      m.Transform = Open("risk-taker");
      if (y.Has("risk-taker") && y["risk-taker"]["iz"].IsArray)
        m.Trail = y["risk-taker"]["iz"].Items.Select(t => new[] { t[0].N(), t[1].N(), t[2].N() }).ToArray();
      // Volt Kanat uçuşu da rüzgâr çizgileriyle görünür (kaynakta ayrı model yok).
      m.Wind = Open("slipstream-engine") || Open("volt-kanat");
      m.Nitro = s["mek"]["etkiKalan"].N(0) > 0;
      return m;
    }
  }
}
