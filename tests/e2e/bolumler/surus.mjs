/* global LT */
// Sürüş: gazla araç ilerliyor (hız, vites, devir)
export default async function ({ p, ok }) {
  const sr = await p.evaluate(async () => {
    LT.startWorld(1);
    const S = LT.sim.S,
      x0 = S.x,
      z0 = S.z,
      t0 = LT.sim.d.zaman;
    LT.I.g = 1;
    while (LT.sim.d.zaman - t0 < 2) await new Promise((r) => setTimeout(r, 20));
    LT.I.g = 0;
    const Y = LT.sim.yeni;
    return {
      yol: Math.hypot(S.x - x0, S.z - z0),
      v: Math.hypot(S.vx, S.vz) * 3.6,
      vites: Y && Y.vites,
      devir: Y && Y.rpm,
      fps: LT.perf.fps,
      cagri: LT.perf.cagri,
    };
  });
  ok(
    sr.yol > 10 && sr.v > 30 && sr.vites >= 1 && sr.devir > 1000,
    `gazla araç ilerliyor: 2 sn'de ${sr.yol.toFixed(0)} m, ${sr.v.toFixed(0)} km/sa, ${sr.vites}. vites, ${Math.round(sr.devir)} d/dk`,
  );
  console.log(`  (başsız tarayıcı: ${sr.fps.toFixed(0)} fps, ${sr.cagri} çizim çağrısı)`);
}
