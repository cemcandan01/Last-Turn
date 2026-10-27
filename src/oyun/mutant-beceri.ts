// MUTANT skill'lerinin dünya bağı (LT-SYS-004, saf): skill yürütücüsünün okuduğu dünyayı (oyuncu, rakipler, pist
// bağlantı noktası, engeller) oyun verisinden kurar. Fiziğe ve oyun durumuna yazmaz; uygulama oyun/mutant.ts'te.
import type { BeceriDunyasi, Engel, Govde, Hedef } from "../cekirdek/beceri";
import type { CarpismaIzgarasi } from "../fizik/carpisma";
import type { DunyaSorgusu } from "../fizik/tipler";
import { nearest, type Pist } from "../dunya/pist";

/**
 * pistte oyuncunun gittiği yönde, yol boyunca ve düz çizgide enAz–enCok m ilerideki, önündeki konide (±0,6 rad) ilk
 * merkez çizgisi noktası. Pist yoksa ya da uygun nokta yoksa null (kanca enerji harcamaz)
 */
export function pistBaglantisi(
  TR: Pist | null,
  P: Govde,
  enAz: number,
  enCok: number,
  ipucu = 0,
): [number, number] | null {
  if (!TR || TR.N < 4) return null;
  const i0 = nearest(TR, P.x, P.z, ipucu, true)[0],
    T = TR.T[i0],
    ileri = P.vx * T[0] + P.vz * T[1] >= 0 ? 1 : -1;
  for (let n = 1; n < TR.N; n++) {
    let j = i0 + ileri * n;
    if (TR.open && (j < 0 || j >= TR.N)) return null;
    j = ((j % TR.N) + TR.N) % TR.N;
    const [x, z] = TR.P[j],
      d = Math.hypot(x - P.x, z - P.z);
    if (d > enCok) return null;
    if (d < enAz) continue;
    const a = Math.atan2(x - P.x, z - P.z) - P.h;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= 0.6) return [x, z];
  }
  return null;
}

/** oyuncunun çevresindeki katı engeller (ağaç, kaya, kutu); çalı ve su yakın geçiş sayılmaz */
export function engelListesi(
  dunya: Pick<DunyaSorgusu, "yakin"> | Pick<CarpismaIzgarasi, "yakin">,
  x: number,
  z: number,
): Engel[] {
  const r: Engel[] = [];
  for (const o of dunya.yakin(x, z)) {
    if (o.t != "solid" && o.t != "box") continue;
    const yari = o.t == "box" ? Math.hypot(o.hx ?? 0, o.hz ?? 0) : (o.r ?? 0);
    r.push({ id: "e:" + o.x.toFixed(1) + "," + o.z.toFixed(1), x: o.x, z: o.z, r: yari });
  }
  return r;
}

export function beceriDunyasiYap(
  P: Govde,
  hedefler: readonly Hedef[],
  TR: Pist | null,
  yarista: boolean,
): BeceriDunyasi {
  return {
    oyuncu: P,
    hedefler,
    baglanti: (enAz, enCok) => pistBaglantisi(TR, P, enAz, enCok),
    yarista,
  };
}
