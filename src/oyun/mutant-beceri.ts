// MUTANT skill'lerinin dünya bağı (LT-SYS-004, saf): skill yürütücüsünün okuduğu dünyayı (oyuncu, rakipler, pist
// bağlantı noktası, engeller) oyun verisinden kurar. Fiziğe ve oyun durumuna yazmaz; uygulama oyun/mutant.ts'te.
import type { BeceriDunyasi, Engel, Govde, Hedef } from "../cekirdek/beceri";
import {
  gokBaglantisi,
  SEHIR_X,
  SEHIR_YARI,
  SEHIR_Z,
  sehirKosesi,
  sehirYolNoktalari,
} from "../dunya/sehir-duzen";
import type { CarpismaIzgarasi } from "../fizik/carpisma";
import type { DunyaSorgusu } from "../fizik/tipler";
import { nearest, type Pist } from "../dunya/pist";
import { EA, EB, SX } from "../dunya/corak";
import { yolBaglantisi, yolNoktalari } from "../dunya/yollar";

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

/**
 * LT-SYS-009 pistte kanca köşesi: önündeki 0–45 m içinde en keskin virajın (40 m'de ≥ 0,45 rad dönüş) eğrilik merkezi
 * (yarıçap ≤ 90 m; daha geniş viraj köşe sayılmaz). yon +1 sol, −1 sağ istenirse viraj o yana dönmeli; 0 hangisi olursa.
 * Merkez çizgisinde giden araç ipin çevresinde virajın yarıçapında döner.
 */
export function pistKosesi(
  TR: Pist | null,
  P: Govde,
  yon: number,
  ipucu = 0,
): { p: [number, number]; uc: [number, number] } | null {
  if (!TR || TR.N < 8) return null;
  const i0 = nearest(TR, P.x, P.z, ipucu, true)[0],
    T0 = TR.T[i0],
    ileri = P.vx * T0[0] + P.vz * T0[1] >= 0 ? 1 : -1,
    ad = TR.len / TR.N,
    k = Math.max(1, Math.round(20 / ad)),
    n = Math.round(45 / ad),
    nok = (j: number) => {
      if (TR.open && (j < 0 || j >= TR.N)) return -1;
      return ((j % TR.N) + TR.N) % TR.N;
    };
  let en = -1,
    enD = 0,
    enYan = 0;
  for (let s = 0; s <= n; s++) {
    const j = nok(i0 + ileri * s),
      a = nok(i0 + ileri * (s - k)),
      b = nok(i0 + ileri * (s + k));
    if (j < 0 || a < 0 || b < 0) break;
    const Ta = yonu(TR, a, ileri),
      Tb = yonu(TR, b, ileri),
      capraz = Ta[0] * Tb[1] - Ta[1] * Tb[0],
      donus = Math.acos(Math.max(-1, Math.min(1, Ta[0] * Tb[0] + Ta[1] * Tb[1])));
    if (donus > enD) {
      enD = donus;
      en = j;
      // çapraz < 0: sola dönüş
      enYan = capraz < 0 ? 1 : -1;
    }
  }
  if (en < 0 || enD < 0.45 || (yon && yon != enYan)) return null;
  const R = (2 * k * ad) / enD;
  if (R > 90) return null;
  const T = yonu(TR, en, ileri),
    // sol normal (gidiş yönüne göre): (Tz, −Tx)
    sx = T[1],
    sz = -T[0],
    p = TR.P[en];
  // ip virajın iç kenarına çizilir, eğrilik merkezi çevresinde döner
  return {
    p: [p[0] + sx * enYan * R, p[1] + sz * enYan * R],
    uc: [p[0] + sx * enYan * (TR.hw + 1), p[1] + sz * enYan * (TR.hw + 1)],
  };
}

/** pist noktasında gidiş yönündeki birim yön (komşu noktalardan; T kaba olabilir) */
function yonu(TR: Pist, j: number, ileri: number): [number, number] {
  const N = TR.N,
    a = TR.P[TR.open ? Math.max(0, j - 1) : (j - 1 + N) % N],
    b = TR.P[TR.open ? Math.min(N - 1, j + 1) : (j + 1) % N],
    dx = (b[0] - a[0]) * ileri,
    dz = (b[1] - a[1]) * ileri,
    l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
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

/** açık dünyanın yol orta çizgi noktaları (bir kez) */
let yolOnbellek: [number, number][] | null = null;
const acikDunyaYollari = () => (yolOnbellek ??= yolNoktalari(EA, EB, SX));

/**
 * skill dünyası. Kanca bağlantısı: yarışta (TR verilince) pistin merkez çizgisi; açık dünyada (acikDunya) asfalt yol
 * ağı; ikisi de yoksa (bölge içinde serbest sürüş, geri sayım) yok
 */
export function beceriDunyasiYap(
  P: Govde,
  hedefler: readonly Hedef[],
  TR: Pist | null,
  yarista: boolean,
  acikDunya = false,
  zemin = 0,
  ek: { basili?: readonly string[]; direksiyon?: number } = {},
): BeceriDunyasi {
  // LT-SYS-008/009: Kule Şehri'nde kanca havada sokak üstüne asılır, yerde kavşak köşesine; yarışta pist virajına
  const sehirde = sehirdeMi(P.x, P.z);
  return {
    oyuncu: P,
    hedefler,
    baglanti: (enAz, enCok) =>
      TR
        ? pistBaglantisi(TR, P, enAz, enCok)
        : acikDunya
          ? yolBaglantisi(sehirde ? sehirYollari() : acikDunyaYollari(), P, enAz, enCok)
          : null,
    kose: (yon) =>
      TR ? pistKosesi(TR, P, yon) : sehirde ? sehirKosesi(P.x, P.z, P.h, P.vx, P.vz, yon) : null,
    gokBaglanti: sehirde ? () => gokBaglantisi(P.x, P.y ?? 0, P.z, P.h) : undefined,
    zemin,
    basili: ek.basili,
    direksiyon: ek.direksiyon,
    yarista,
  };
}

let sehirYolOnbellek: [number, number][] | null = null;
const sehirYollari = () => (sehirYolOnbellek ??= sehirYolNoktalari());
/** dünya noktası Kule Şehri'nin içinde mi */
export const sehirdeMi = (x: number, z: number) =>
  Math.abs(x - SEHIR_X) < SEHIR_YARI && Math.abs(z - SEHIR_Z) < SEHIR_YARI;
