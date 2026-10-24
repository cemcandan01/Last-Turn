// Gerçek motorla düz, kuru asfalt referansı (Dengeli, aracın kendi yarış türü).
import { CARS } from "../../src/arac/araclar";
import { parcaliKurulum } from "../../src/arac/parcalar";
import { Simulasyon } from "../../src/fizik/simulasyon";
import type { FizikBaglami } from "../../src/fizik/tipler";
export function duzPerformans(a: number, parcalar: readonly string[] = []) {
  const sim = new Simulasyon(7);
  const cx: FizikBaglami = {
    kurulum: parcaliKurulum(a, parcalar, "norm"),
    dunya: {
      H: () => 0,
      surf: () => 1,
      yakin: () => [],
      kutu: () => [-1e6, 1e6, -1e6, 1e6],
      kerb: () => 0,
      havaTutusu: () => 1,
      karli: () => false,
      yolTuru: () => CARS[a].ty,
    },
    olay: { spin: () => {}, puf: () => {}, caliRengi: () => 0 },
    rng: sim.rng,
    gorselRng: () => 0.5,
  };
  sim.sifirla(0, 0, 0, 0);
  for (let i = 0; i < 120; i++)
    sim.adim({ tg: 0, g: 0, b: 0, analogGaz: false, analogDireksiyon: false }, cx);
  let t100 = -1,
    max = 0;
  for (let i = 0; i < 60 * 60; i++) {
    sim.adim({ tg: 0, g: 1, b: 0, analogGaz: false, analogDireksiyon: false }, cx);
    const v = Math.hypot(sim.S.vx, sim.S.vz) * 3.6;
    max = Math.max(max, v);
    if (t100 < 0 && v >= 100) t100 = (i + 1) / 60;
  }
  sim.sifirla(0, 0, 0, 0);
  for (let i = 0; i < 120; i++)
    sim.adim({ tg: 0, g: 0, b: 0, analogGaz: false, analogDireksiyon: false }, cx);
  for (let i = 0; i < 900 && Math.hypot(sim.S.vx, sim.S.vz) < 100 / 3.6; i++)
    sim.adim({ tg: 0, g: 1, b: 0, analogGaz: false, analogDireksiyon: false }, cx);
  const z0 = sim.S.z;
  for (let i = 0; i < 600 && Math.hypot(sim.S.vx, sim.S.vz) > 0.3; i++)
    sim.adim({ tg: 0, g: 0, b: 1, analogGaz: false, analogDireksiyon: false }, cx);
  const fren = sim.S.z - z0;
  return { hiz: max, ivme: t100, fren };
}
