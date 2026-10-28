// Kule Şehri düzeni (LT-SYS-008, saf: three ve DOM yok). Izgara şehir: kuzey-güney caddeler ve doğu-batı sokaklar,
// blokların içinde yüksek binalar, merkezde uzun dikdörtgen Büyük Park (içinde halka park yolu ve göl), kenarda
// bariyer ve nehir. Yükseklik düz (0). Zemin, binalar, sokak rotaları ve bina tepesi bağlantıları bu modülden;
// çizim sehir.ts'te. Gerçek şehir/marka adı kullanılmaz.
import { mulberry32 } from "../cekirdek/rastgele";
import type { V2 } from "../cekirdek/matematik";

/** şehrin dünya merkezi (öteki bölgelerle çakışmayan boş alan) */
export const SEHIR_X = 9000,
  SEHIR_Z = 0;
/** şehrin yarı boyu (bariyer içi) ve bölge kutusunun yarı boyu (nehir dahil) */
export const SEHIR_YARI = 800,
  SEHIR_KUTU = 880;

/** caddeler (kuzey-güney, x sabit) ve sokaklar (doğu-batı, z sabit): yerel koordinat */
export const CADDE_ARA = 120,
  SOKAK_ARA = 78,
  CADDE_YARI = 9,
  SOKAK_YARI = 7;
export const CADDELER = Array.from({ length: 14 }, (_, i) => -780 + CADDE_ARA * i);
export const SOKAKLAR = Array.from({ length: 21 }, (_, j) => -780 + SOKAK_ARA * j);

/** Büyük Park: cadde 5–8 ve sokak 6–14 arası (yerel). Park yolu halkası ve göl */
export const PARK = { x0: -171, x1: 171, z0: -305, z1: 305 };
export const PARK_YOLU = { x: 153, z: 287, yari: 5, kose: 20 };
export const GOL = { x: 0, z: 150, rx: 60, rz: 45 };

/** zemin türleri (SURF indeksi): toprak 0, asfalt 1, çim 2, çamur/su 3 */
const ASFALT = 1,
  CIM = 2,
  TOPRAK = 0,
  SU = 3;

const parkIcinde = (x: number, z: number) => x > PARK.x0 && x < PARK.x1 && z > PARK.z0 && z < PARK.z1;

/** park yolu halkasına uzaklık (yuvarlak köşeli dikdörtgen kenarı) */
function parkYoluUzakligi(x: number, z: number) {
  const r = PARK_YOLU.kose,
    qx = Math.abs(x) - (PARK_YOLU.x - r),
    qz = Math.abs(z) - (PARK_YOLU.z - r);
  const dis = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
  return Math.abs(dis - r);
}

const enYakin = (l: readonly number[], v: number) => {
  let b = l[0];
  for (const a of l) if (Math.abs(a - v) < Math.abs(b - v)) b = a;
  return b;
};

/** yerel noktada cadde/sokak var mı (park içinde ızgara yolu yok) */
export function yoldaMi(x: number, z: number) {
  if (Math.abs(x) > SEHIR_YARI || Math.abs(z) > SEHIR_YARI || parkIcinde(x, z)) return false;
  return Math.abs(x - enYakin(CADDELER, x)) < CADDE_YARI || Math.abs(z - enYakin(SOKAKLAR, z)) < SOKAK_YARI;
}

/** zemin (yerel): şehir içi her yer kaldırım/yol asfalt; park çim, park yolu asfalt, patika toprak, göl su */
export function sehirZemini(x: number, z: number): number {
  if (Math.abs(x) > SEHIR_YARI || Math.abs(z) > SEHIR_YARI) return SU;
  if (!parkIcinde(x, z)) return ASFALT;
  if (parkYoluUzakligi(x, z) < PARK_YOLU.yari) return ASFALT;
  const gx = (x - GOL.x) / GOL.rx,
    gz = (z - GOL.z) / GOL.rz;
  if (gx * gx + gz * gz < 1) return SU;
  // çapraz patikalar
  if (Math.abs(x) < 2.5 || Math.abs(z) < 2.5 || Math.abs(Math.abs(x) * 1.9 - Math.abs(z)) < 3) return TOPRAK;
  return CIM;
}

export interface Bina {
  /** yerel merkez, yarı boylar, yükseklik */
  x: number;
  z: number;
  hx: number;
  hz: number;
  y: number;
  /** cephe ton indeksi (çizim) */
  ton: number;
}

/** blok: caddeler/sokaklar arası (kaldırımlı) dikdörtgen (yerel) */
export interface Blok {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

let onbellek: { bloklar: Blok[]; binalar: Bina[]; hucre: Map<number, Bina[]> } | null = null;

const hucreNo = (x: number, z: number) =>
  Math.floor((x - CADDELER[0]) / CADDE_ARA) * 100 + Math.floor((z - SOKAKLAR[0]) / SOKAK_ARA);

/** yerel noktadaki zemin yüksekliği: bina çatısı (uçan araç çatıya iner, çatıda sürülür), yoksa 0 */
export function sehirYuksekligi(x: number, z: number): number {
  if (Math.abs(x) > SEHIR_YARI || Math.abs(z) > SEHIR_YARI) return 0;
  const l = sehirBinalari().hucre.get(hucreNo(x, z));
  // çatı kenarından 1,5 m içeri: yoldaki aracın duvara değen tekeri çatı yüksekliğini görüp fırlamasın
  if (l) for (const b of l) if (Math.abs(x - b.x) < b.hx - 1.5 && Math.abs(z - b.z) < b.hz - 1.5) return b.y;
  return 0;
}

/**
 * bloklar ve binalar (tohumlu, her açılışta aynı). Bina yüksekliği parka ve güneydeki iş merkezine yaklaştıkça artar;
 * blok 2–3 parsele bölünür, parseller arasında dar ara sokak (araç sığmaz, çarpışmalı değil, görsel).
 */
export function sehirBinalari() {
  if (onbellek) return onbellek;
  const r = mulberry32(0x5e41e),
    bloklar: Blok[] = [],
    binalar: Bina[] = [],
    KALDIRIM = 4;
  for (let i = 0; i + 1 < CADDELER.length; i++)
    for (let j = 0; j + 1 < SOKAKLAR.length; j++) {
      const b: Blok = {
        x0: CADDELER[i] + CADDE_YARI,
        x1: CADDELER[i + 1] - CADDE_YARI,
        z0: SOKAKLAR[j] + SOKAK_YARI,
        z1: SOKAKLAR[j + 1] - SOKAK_YARI,
      };
      const cx = (b.x0 + b.x1) / 2,
        cz = (b.z0 + b.z1) / 2;
      if (parkIcinde(cx, cz)) continue;
      bloklar.push(b);
      const parsel = r() < 0.35 ? 2 : 3,
        x0 = b.x0 + KALDIRIM,
        x1 = b.x1 - KALDIRIM,
        z0 = b.z0 + KALDIRIM,
        z1 = b.z1 - KALDIRIM,
        w = (x1 - x0 - (parsel - 1) * 3) / parsel;
      // parka uzaklık (park kenarı) ve iş merkezi (güney)
      const dx = Math.max(PARK.x0 - cx, 0, cx - PARK.x1),
        dz = Math.max(PARK.z0 - cz, 0, cz - PARK.z1),
        dPark = Math.hypot(dx, dz),
        merkez = cz < -560 ? 1 : 0;
      for (let k = 0; k < parsel; k++) {
        const bx0 = x0 + k * (w + 3),
          derin = r() < 0.3 ? (z1 - z0) / 2 - 1 : (z1 - z0) / 2;
        const y = Math.max(
          18,
          Math.min(
            260,
            28 + 150 * Math.exp(-dPark / 230) + r() * 45 + merkez * (60 + r() * 120) - (r() < 0.15 ? 15 : 0),
          ),
        );
        binalar.push({
          x: bx0 + w / 2,
          z: r() < 0.5 ? z0 + derin : z1 - derin,
          hx: w / 2,
          hz: derin,
          y,
          ton: Math.floor(r() * 6),
        });
      }
    }
  const hucre = new Map<number, Bina[]>();
  for (const b of binalar) {
    const n = hucreNo(b.x, b.z);
    (hucre.get(n) ?? hucre.set(n, []).get(n)!).push(b);
  }
  onbellek = { bloklar, binalar, hucre };
  return onbellek;
}

/**
 * Kancanın bina tepesi bağlantısı (dünya koordinatı): oyuncunun önünde (bakış yönünde ±0,7 rad), yatayda enAz–enCok m
 * uzaktaki binaların yola bakan çatı kenarı; en yakın uygun olan. Yoksa null. Yükseklik binanın tepesi (en çok 90 m:
 * çok uzun ip savrulmayı kontrolsüz yapar).
 */
export function binaBaglantisi(
  x: number,
  z: number,
  h: number,
  enAz: number,
  enCok: number,
): [number, number, number] | null {
  const lx = x - SEHIR_X,
    lz = z - SEHIR_Z,
    fx = Math.sin(h),
    fz = Math.cos(h);
  let en: [number, number, number] | null = null,
    enD = Infinity;
  for (const b of sehirBinalari().binalar) {
    // binanın oyuncuya en yakın çatı kenarı noktası (yatay)
    const px = Math.max(b.x - b.hx, Math.min(b.x + b.hx, lx + fx * enCok * 0.6)),
      pz = Math.max(b.z - b.hz, Math.min(b.z + b.hz, lz + fz * enCok * 0.6)),
      dx = px - lx,
      dz = pz - lz,
      d = Math.hypot(dx, dz);
    if (d < enAz || d > enCok) continue;
    const aci = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / (d || 1))));
    if (aci > 0.7) continue;
    // önde ve yanda olanı biraz tercih et: savrulma yolu boyunca olur
    const skor = d * (1 + aci);
    if (skor < enD) {
      enD = skor;
      en = [px + SEHIR_X, Math.min(b.y, 90), pz + SEHIR_Z];
    }
  }
  return en;
}

/** yerel ızgara düğümü → yerel nokta (cadde i, sokak j) */
export const dugum = (i: number, j: number): V2 => [CADDELER[i], SOKAKLAR[j]];

/**
 * Köşeli çizgiyi pist noktalarına çevir: düzlüklerde ~8 m aralık, köşelerde r yarıçaplı yay (Catmull-Rom köşede
 * taşmasın diye sık nokta). Dünya koordinatı döner.
 */
export function koseliYol(dugumler: readonly V2[], r: number, kapali: boolean): V2[] {
  const n = dugumler.length,
    out: V2[] = [],
    W = (p: V2): V2 => [p[0] + SEHIR_X, p[1] + SEHIR_Z];
  const kose = (i: number) => {
    const a = dugumler[(i - 1 + n) % n],
      b = dugumler[i],
      c = dugumler[(i + 1) % n];
    const u1 = [b[0] - a[0], b[1] - a[1]],
      u2 = [c[0] - b[0], c[1] - b[1]],
      l1 = Math.hypot(u1[0], u1[1]),
      l2 = Math.hypot(u2[0], u2[1]);
    return {
      b,
      d1: [u1[0] / l1, u1[1] / l1],
      d2: [u2[0] / l2, u2[1] / l2],
      rr: Math.min(r, l1 / 2.2, l2 / 2.2),
    };
  };
  const ekleDuz = (p: V2, q: V2) => {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]),
      k = Math.max(1, Math.round(L / 8));
    for (let s = 0; s < k; s++) out.push(W([p[0] + ((q[0] - p[0]) * s) / k, p[1] + ((q[1] - p[1]) * s) / k]));
  };
  const yay = (i: number) => {
    const { b, d1, d2, rr } = kose(i),
      p: V2 = [b[0] - d1[0] * rr, b[1] - d1[1] * rr],
      q: V2 = [b[0] + d2[0] * rr, b[1] + d2[1] * rr];
    // ikinci dereceden Bezier (köşe kontrol noktası): 90°'de yaya çok yakın
    const pts: V2[] = [];
    for (let s = 0; s <= 6; s++) {
      const t = s / 6,
        a = (1 - t) * (1 - t),
        bb = 2 * (1 - t) * t,
        c = t * t;
      pts.push([a * p[0] + bb * b[0] + c * q[0], a * p[1] + bb * b[1] + c * q[1]]);
    }
    return pts;
  };
  if (kapali) {
    for (let i = 0; i < n; i++) {
      const y = yay(i),
        sonraki = yay((i + 1) % n);
      for (const p of y) out.push(W(p));
      ekleDuz(y[y.length - 1], sonraki[0]);
    }
    return out;
  }
  let onceki: V2 = dugumler[0];
  for (let i = 1; i < n - 1; i++) {
    const y = yay(i);
    ekleDuz(onceki, y[0]);
    for (const p of y) out.push(W(p));
    onceki = y[y.length - 1];
  }
  ekleDuz(onceki, dugumler[n - 1]);
  out.push(W(dugumler[n - 1]));
  return out;
}

export type SokakTuru = "ab" | "tur" | "kovala";

export interface SokakRotasi {
  id: string;
  n: string;
  tur: SokakTuru;
  /** zorluk (1-6; MUTANT bölge havuzu ve rakip kurulumu) */
  sev: number;
  /** ızgara düğümleri [cadde, sokak]; ya da yerel noktalar (park yolu) */
  dugum?: [number, number][];
  nokta?: V2[];
}

/** sokak yarışı rotaları: blok turu (2 tur), A→B kontrol noktalı, kovalamaca (rakip önde kalkar, 2 tur) */
export const SOKAK_ROTALARI: readonly SokakRotasi[] = [
  {
    id: "alt-sehir",
    n: "Alt Şehir Turu",
    tur: "tur",
    sev: 2,
    dugum: [
      [1, 1],
      [4, 1],
      [4, 4],
      [1, 4],
    ],
  },
  {
    id: "park-cevresi",
    n: "Park Çevresi",
    tur: "tur",
    sev: 3,
    dugum: [
      [5, 6],
      [8, 6],
      [8, 14],
      [5, 14],
    ],
  },
  {
    id: "dogu-blogu",
    n: "Doğu Bloğu",
    tur: "tur",
    sev: 4,
    dugum: [
      [9, 2],
      [12, 2],
      [12, 9],
      [10, 9],
      [10, 5],
      [9, 5],
    ],
  },
  {
    id: "kuzey-kosusu",
    n: "Kuzey Koşusu",
    tur: "ab",
    sev: 2,
    dugum: [
      [2, 1],
      [2, 10],
      [4, 10],
      [4, 18],
      [9, 18],
    ],
  },
  {
    id: "guneyden-kuzeye",
    n: "Güneyden Kuzeye",
    tur: "ab",
    sev: 3,
    dugum: [
      [11, 0],
      [11, 6],
      [9, 6],
      [9, 16],
      [12, 16],
      [12, 20],
    ],
  },
  {
    id: "capraz",
    n: "Çapraz Kaçış",
    tur: "ab",
    sev: 4,
    dugum: [
      [0, 10],
      [3, 10],
      [3, 4],
      [6, 4],
      [6, 2],
      [13, 2],
    ],
  },
  {
    id: "kovala-bati",
    n: "Batı Kovalamacası",
    tur: "kovala",
    sev: 2,
    dugum: [
      [1, 15],
      [4, 15],
      [4, 19],
      [1, 19],
    ],
  },
  {
    id: "kovala-park",
    n: "Park Yolu Kovalamacası",
    tur: "kovala",
    sev: 3,
    nokta: [
      [PARK_YOLU.x, -PARK_YOLU.z],
      [PARK_YOLU.x, PARK_YOLU.z],
      [-PARK_YOLU.x, PARK_YOLU.z],
      [-PARK_YOLU.x, -PARK_YOLU.z],
    ],
  },
  {
    id: "kovala-dogu",
    n: "Doğu Kovalamacası",
    tur: "kovala",
    sev: 4,
    dugum: [
      [8, 15],
      [13, 15],
      [13, 20],
      [8, 20],
    ],
  },
];

/** rotanın dünya noktaları ve yarı genişliği (sokakta 7 m, park yolunda 5 m) */
export function rotaNoktalari(r: SokakRotasi): { pts: V2[]; hw: number; acik: boolean } {
  const acik = r.tur == "ab",
    dug = r.nokta ?? r.dugum!.map(([i, j]) => dugum(i, j));
  return { pts: koseliYol(dug, r.nokta ? PARK_YOLU.kose : 12, !acik), hw: r.nokta ? 5 : SOKAK_YARI, acik };
}

/** şehirdeki MUTANT yerleri (dünya): etkinlik/sandık noktaları kavşaklarda, atölye park güneyinde, boss kuzeyde */
export const SEHIR_YERLERI: [number, number][] = [
  [2, 3],
  [4, 7],
  [10, 4],
  [12, 8],
  [3, 12],
  [9, 12],
  [11, 17],
  [2, 17],
  [6, 18],
  [12, 1],
  [1, 7],
  [10, 19],
  [6, 3],
  [0, 14],
  [13, 11],
  [7, 16],
].map(([i, j]) => [CADDELER[i] + SEHIR_X, SOKAKLAR[j] + SEHIR_Z]);
export const SEHIR_ATOLYE: [number, number] = [CADDELER[6] + SEHIR_X, SOKAKLAR[5] + SEHIR_Z];
export const SEHIR_BOSS: [number, number] = [CADDELER[7] + SEHIR_X, SOKAKLAR[19] + SEHIR_Z];
/** bölgeye giriş noktası (atölye önü, kuzeye bakar) */
export const SEHIR_GIRIS: [number, number, number] = [CADDELER[6] + SEHIR_X, SOKAKLAR[4] + SEHIR_Z, 0];

/** şehrin cadde/sokak orta çizgi noktaları (kancanın yol bağlantısı ve kıl payı dışı yedek), dünya koordinatı */
export function sehirYolNoktalari(): [number, number][] {
  const p: [number, number][] = [];
  for (const x of CADDELER)
    for (let z = -780; z <= 780; z += 10) if (yoldaMi(x, z)) p.push([x + SEHIR_X, z + SEHIR_Z]);
  for (const z of SOKAKLAR)
    for (let x = -780; x <= 780; x += 10) if (yoldaMi(x, z)) p.push([x + SEHIR_X, z + SEHIR_Z]);
  return p;
}
