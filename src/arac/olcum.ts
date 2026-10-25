// Garaj değerleri: aracın (parçalarıyla) sonsuz düz asfaltta gerçek fizikle ölçülen azami hızı, 0-100 ve 100-0'ı.
// Nokta kütle modeli (performans.ts) puan için yeterli ama 0-100 ve frende %10-20 sapar; garaj oyundaki aracın
// yaptığını göstermeli. Belirlenimci (aynı kurulum aynı sonuç), ~10-30 ms; garaj araç + parça başına önbelleğe alır.
import { Simulasyon } from "../fizik/simulasyon";
import type { DunyaSorgusu, FizikBaglami, FizikGirdisi, SurusKurulumu } from "../fizik/tipler";

const DT = 1 / 60;

/** düz, sonsuz, kuru asfalt (zemin 1); engel yok, pist türü yok (uzmanlık çarpanı girmez) */
const DUZ_ASFALT: DunyaSorgusu = {
  H: () => 0,
  surf: () => 1,
  yakin: () => [],
  kutu: () => [-1e7, 1e7, -1e7, 1e7],
  kerb: () => 0,
  havaTutusu: () => 1,
  karli: () => false,
  yolTuru: () => null,
};

const gir = (g: number, b = 0): FizikGirdisi => ({ tg: 0, g, b, analogDireksiyon: false, analogGaz: false });

export interface DuzYolDegerleri {
  /** azami hız (km/sa), 0-100 (sn), 100-0 (m) */
  hiz: number;
  ivme: number;
  fren: number;
}

/** kurulumun (yardım seviyesi kurulumda; garaj Dengeli kullanır) düz asfaltta tam gaz ve tam fren değerleri */
export function duzYolOlcumu(K: SurusKurulumu): DuzYolDegerleri {
  const sim = new Simulasyon(1),
    cx: FizikBaglami = {
      dunya: DUZ_ASFALT,
      kurulum: K,
      olay: { spin: () => {}, puf: () => {}, caliRengi: () => 0 },
      rng: sim.rng,
      gorselRng: () => 0.5,
    },
    S = sim.S,
    v = () => Math.hypot(S.vx, S.vz) * 3.6;
  // tam gaz: 0-100 ve azami hız (son 2 sn'de 0,2 km/sa'den az artınca; en fazla 70 sn)
  sim.sifirla(0, 0, 0, 0);
  for (let k = 0; k < 30; k++) sim.adim(gir(0), cx);
  let t = 0,
    t100 = 0,
    vmax = 0,
    v2 = 0;
  for (let k = 1; k <= 70 / DT; k++) {
    sim.adim(gir(1), cx);
    t += DT;
    const h = v();
    if (!t100 && h >= 100) t100 = t;
    vmax = Math.max(vmax, h);
    if (k % 120 == 0) {
      if (vmax - v2 < 0.2 && t100) break;
      v2 = vmax;
    }
  }
  // 100 km/sa'den tam fren
  sim.sifirla(0, 0, 0, 0);
  for (let k = 0; k < 30 / DT && v() < 100; k++) sim.adim(gir(1), cx);
  const z0 = S.z;
  for (let k = 0; k < 10 / DT && v() > 1; k++) sim.adim(gir(0, 1), cx);
  return { hiz: vmax, ivme: t100 || 99, fren: S.z - z0 };
}
