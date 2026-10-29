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

/**
 * LT-SYS-009 semtler (tekdüze ızgara tekinsiz duruyordu): her semtin kendi cephesi, renkleri, yükseklik karakteri ve
 * sokak dokusu var. cam: güneydeki iş merkezi ve park çevresinin kuleleri · eski: batıda tuğla eski şehir (alçak,
 * dükkân tenteli) · konut: kuzeyde sıvalı, balkonlu apartmanlar · sanayi: doğuda geniş, alçak depolar · tas: geri kalan
 * klasik taş binalar
 */
export type Semt = "cam" | "eski" | "konut" | "sanayi" | "tas";
export function semt(x: number, z: number): Semt {
  if (z < -520) return "cam";
  if (x > 470) return "sanayi";
  if (x < -430) return "eski";
  if (z > 380) return "konut";
  const dPark = Math.hypot(Math.max(PARK.x0 - x, 0, x - PARK.x1), Math.max(PARK.z0 - z, 0, z - PARK.z1));
  return dPark < 140 ? "cam" : "tas";
}
/** cephe dokusu sırası (çizim): semt → doku */
export const SEMT_DOKU: Record<Semt, number> = { tas: 0, cam: 1, eski: 2, konut: 3, sanayi: 4 };

export interface Bina {
  /** yerel merkez, yarı boylar, yükseklik (kademeli kulede alt gövdenin çatısı) */
  x: number;
  z: number;
  hx: number;
  hz: number;
  y: number;
  /** cephe ton indeksi (çizim; semtin renk listesinde) */
  ton: number;
  /** cephe dokusu (SEMT_DOKU) */
  doku: number;
  /** kademeli kule: aynı merkezde daha dar üst gövde (yarı boylar, tepe yüksekliği) */
  ust?: { hx: number; hz: number; y: number };
  /** çatı süsü: 0 yok, 1 su deposu, 2 anten, 3 klima kutuları, 4 baca */
  cati: number;
  /** zemin katta renkli dükkân tentesi */
  tente: boolean;
}

/** binanın en yüksek noktası (kademeli kulede üst gövdenin tepesi) */
export const binaTepesi = (b: Bina) => b.ust?.y ?? b.y;

/** blok: caddeler/sokaklar arası (kaldırımlı) dikdörtgen (yerel) */
export interface Blok {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** boş parselde küçük meydan (ağaçlı, açık zemin; çarpışma yok) */
export interface Meydan {
  x: number;
  z: number;
  hx: number;
  hz: number;
}

let onbellek: {
  bloklar: Blok[];
  binalar: Bina[];
  meydanlar: Meydan[];
  hucre: Map<number, Bina[]>;
} | null = null;

const hucreNo = (x: number, z: number) =>
  Math.floor((x - CADDELER[0]) / CADDE_ARA) * 100 + Math.floor((z - SOKAKLAR[0]) / SOKAK_ARA);

/** yerel noktadaki zemin yüksekliği: bina çatısı (uçan araç çatıya iner, çatıda sürülür), yoksa 0 */
export function sehirYuksekligi(x: number, z: number): number {
  if (Math.abs(x) > SEHIR_YARI || Math.abs(z) > SEHIR_YARI) return 0;
  const l = sehirBinalari().hucre.get(hucreNo(x, z));
  // çatı kenarından 1,5 m içeri: yoldaki aracın duvara değen tekeri çatı yüksekliğini görüp fırlamasın
  if (l)
    for (const b of l)
      if (Math.abs(x - b.x) < b.hx - 1.5 && Math.abs(z - b.z) < b.hz - 1.5)
        return b.ust && Math.abs(x - b.x) < b.ust.hx - 1.5 && Math.abs(z - b.z) < b.ust.hz - 1.5
          ? b.ust.y
          : b.y;
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
    meydanlar: Meydan[] = [],
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
      const sm = semt(cx, cz),
        parsel =
          sm == "sanayi" ? (r() < 0.5 ? 1 : 2) : sm == "eski" ? 3 + (r() < 0.4 ? 1 : 0) : r() < 0.35 ? 2 : 3,
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
        let y = Math.max(
          18,
          Math.min(
            260,
            28 + 150 * Math.exp(-dPark / 230) + r() * 45 + merkez * (60 + r() * 120) - (r() < 0.15 ? 15 : 0),
          ),
        );
        // semt yükseklik karakteri: eski şehir ve sanayi alçak, konut orta
        if (sm == "eski") y = 14 + r() * 30;
        else if (sm == "sanayi") y = 10 + r() * 16 + (r() < 0.12 ? 30 : 0);
        else if (sm == "konut") y = Math.min(y, 30 + r() * 45);
        const bx = bx0 + w / 2,
          bz = r() < 0.5 ? z0 + derin : z1 - derin;
        // ara sıra boş parsel: ağaçlı küçük meydan (sanayide yok)
        if (sm != "sanayi" && sm != "cam" && r() < 0.07) {
          meydanlar.push({ x: bx, z: bz, hx: w / 2, hz: derin });
          continue;
        }
        const cati = r(),
          b: Bina = {
            x: bx,
            z: bz,
            hx: w / 2,
            hz: derin,
            y,
            ton: Math.floor(r() * 6),
            doku: SEMT_DOKU[sm],
            cati:
              sm == "sanayi"
                ? cati < 0.35
                  ? 4
                  : 3
                : sm == "cam"
                  ? cati < 0.5
                    ? 2
                    : 3
                  : cati < 0.45
                    ? 1
                    : cati < 0.7
                      ? 3
                      : 0,
            tente: (sm == "eski" || sm == "konut") && r() < 0.7,
          };
        // yüksek kulelerin bir kısmı kademeli: alt gövde %55, üstte daralan kule
        if (y > 90 && r() < 0.55) {
          b.ust = { hx: b.hx * 0.62, hz: b.hz * 0.62, y };
          b.y = Math.round(y * 0.55);
        }
        binalar.push(b);
      }
    }
  const hucre = new Map<number, Bina[]>();
  for (const b of binalar) {
    const n = hucreNo(b.x, b.z);
    (hucre.get(n) ?? hucre.set(n, []).get(n)!).push(b);
  }
  onbellek = { bloklar, binalar, meydanlar, hucre };
  return onbellek;
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
  /** rakip YZ'nin bütün yarışı bitirme süresi (sn) [Çaylak, Deneyimli]: tests/olcum/mutant-rakip.test.ts (SADECE=sokak).
   *  Rota, tur sayısı ya da rakip kurulumu değişince yeniden ölç */
  olcum: [number, number];
  /** ızgara düğümleri [cadde, sokak]; ya da yerel noktalar (park yolu) */
  dugum?: [number, number][];
  nokta?: V2[];
}

/** sokak yarışı rotaları: blok turu (2 tur), A→B kontrol noktalı, kovalamaca (rakip önde kalkar, 2 tur) */
export const SOKAK_ROTALARI: readonly SokakRotasi[] = [
  {
    id: "alt-sehir",
    olcum: [112.5, 107.3],
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
    olcum: [77.0, 73.6],
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
    olcum: [64.7, 58.4],
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
    olcum: [86.5, 83.4],
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
    olcum: [82.5, 79.4],
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
    olcum: [66.3, 60.7],
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
    olcum: [124.2, 119.2],
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
    olcum: [70.2, 67.1],
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
    olcum: [61.4, 56.0],
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

/** yıldız eşikleri (bütün yarış, sn): 1★ Çaylak rakip +%8, 2★ Deneyimli rakip, 3★ Deneyimli −%8 */
export const sokakYildizlari = (r: Pick<SokakRotasi, "olcum">) =>
  [r.olcum[0] * 1.08, r.olcum[1], r.olcum[1] * 0.92].map((v) => Math.round(v * 10) / 10);

/** kapalı rotada tur sayısı: yarış ~2,4 km sürsün (A→B turu yok: 0). Boş zaman şikâyeti: yarış uzamasın */
export const SOKAK_YARIS_M = 2400;
export const sokakTurSayisi = (r: Pick<SokakRotasi, "tur">, turUzunlugu: number) =>
  r.tur == "ab" ? 0 : Math.max(1, Math.round(SOKAK_YARIS_M / turUzunlugu));

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

/** köşe ipinin merkezcil ivmesi bu kadarı aşmasın diye (m/s²) dönme noktası hızla bloğun içine kayar */
export const KOSE_MERKEZCIL = 55;

/**
 * LT-SYS-009 yerde kanca köşesi: oyuncunun gittiği cadde/sokakta önündeki (en çok 40 m; içindeyse de) kavşağın yakın
 * köşesi (uc: ipin çizildiği kaldırım ucu) ve ipin döndüğü nokta (p). yon +1 sol, −1 sağ, 0 araca yakın taraf. O yana
 * yan sokak yoksa (park, şehir kenarı) null. Hızlıyken p köşegen boyunca bloğun içine kayar (yarıçap v²/55'e çıkar):
 * çeyrek dönüş yine yan sokağın ortasında biter ve yörünge köşeden dışarıda kalır (a < 16 m). Dünya koordinatı.
 */
export function sehirKosesi(
  x: number,
  z: number,
  h: number,
  vx: number,
  vz: number,
  yon: number,
): { p: [number, number]; uc: [number, number] } | null {
  const lx = x - SEHIR_X,
    lz = z - SEHIR_Z,
    v = Math.hypot(vx, vz),
    fx = v > 3 ? vx / v : Math.sin(h),
    fz = v > 3 ? vz / v : Math.cos(h),
    // sol: (fz, −fx)
    sx = fz,
    sz_ = -fx;
  let en: { p: [number, number]; uc: [number, number] } | null = null,
    enA = Infinity;
  for (const cx of CADDELER)
    for (const kz of SOKAKLAR) {
      const rx = cx - lx,
        rz = kz - lz,
        ileri = rx * fx + rz * fz,
        yan = rx * sx + rz * sz_;
      if (ileri < -6 || ileri > 40 || Math.abs(yan) > 10 || ileri >= enA) continue;
      // köşe tarafı: istenen ya da aracın yakın olduğu yan (araç merkezin solundaysa sol)
      const taraf = yon || (yan < 0 ? 1 : -1);
      // köşeler: kavşak merkezinden ±yarı genişlik; yakın taraf (geride) ve istenen yan
      let kose: [number, number] | null = null;
      for (const ax of [-CADDE_YARI, CADDE_YARI])
        for (const az of [-SOKAK_YARI, SOKAK_YARI]) {
          const ki = ax * fx + az * fz,
            ky = ax * sx + az * sz_;
          if (ki < 0 && Math.sign(ky) == taraf) kose = [cx + ax, kz + az];
        }
      if (!kose) continue;
      // o yönde yan sokak ve köşede blok (park içi değil) olmalı
      const yanX = cx + sx * taraf * (CADDE_YARI + 12),
        yanZ = kz + sz_ * taraf * (SOKAK_YARI + 12),
        blokX = kose[0] + (sx * taraf - fx) * 3,
        blokZ = kose[1] + (sz_ * taraf - fz) * 3;
      if (!yoldaMi(yanX, yanZ) || yoldaMi(blokX, blokZ) || parkIcinde(blokX, blokZ)) continue;
      enA = ileri;
      // aracın köşeye yanal uzaklığı (doğal yarıçap); hız bunu aşan yarıçap isterse nokta bloğa kayar
      const yanal = Math.abs((kose[0] - lx) * sx + (kose[1] - lz) * sz_),
        a = Math.max(0, Math.min(15, (v * v) / KOSE_MERKEZCIL - yanal));
      en = {
        p: [kose[0] + (sx * taraf - fx) * a + SEHIR_X, kose[1] + (sz_ * taraf - fz) * a + SEHIR_Z],
        uc: [kose[0] + SEHIR_X, kose[1] + SEHIR_Z],
      };
    }
  return en;
}

/**
 * LT-SYS-009 havada kanca: burnun yönünde (±0,7 rad) 18–65 m ilerideki sokağın orta çizgisi üstünde asılma noktası
 * (fizik; sokak boyunca savrulur, duvara değil) ve ipin çizildiği yan bina cephesi noktası. Yükseklik yan binaların
 * tepesine göre (en çok 90 m); yanında oyuncudan en az 8 m yüksek bina yoksa (park, alçak semt) null.
 */
export function gokBaglantisi(
  x: number,
  y: number,
  z: number,
  h: number,
): { p: [number, number, number]; uc: [number, number, number] } | null {
  const lx = x - SEHIR_X,
    lz = z - SEHIR_Z,
    fx = Math.sin(h),
    fz = Math.cos(h);
  let en: { p: [number, number, number]; uc: [number, number, number] } | null = null,
    enS = Infinity;
  for (let s = 20; s <= 60; s += 5) {
    const qx = lx + fx * s,
      qz = lz + fz * s,
      adaylar: [number, number][] = [
        [enYakin(CADDELER, qx), qz],
        [qx, enYakin(SOKAKLAR, qz)],
      ];
    for (const [ax, az] of adaylar) {
      if (!yoldaMi(ax, az)) continue;
      const dx = ax - lx,
        dz = az - lz,
        d = Math.hypot(dx, dz);
      if (d < 18 || d > 65) continue;
      const aci = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)));
      if (aci > 0.7) continue;
      const skor = aci * 40 + Math.abs(d - 38);
      if (skor >= enS) continue;
      // yan binalar: en yüksek tepe ve ipin çizileceği cephe noktası
      let tepe = 0,
        uc: [number, number] | null = null,
        ucD = Infinity;
      for (const b of yakinBinalar(ax, az, 30)) {
        const by = binaTepesi(b);
        if (by > tepe) tepe = by;
        const px = Math.max(b.x - b.hx, Math.min(b.x + b.hx, ax)),
          pz = Math.max(b.z - b.hz, Math.min(b.z + b.hz, az)),
          bd = Math.hypot(px - ax, pz - az);
        if (by > y + 8 && bd < ucD) {
          ucD = bd;
          uc = [px, pz];
        }
      }
      if (!uc || tepe < y + 8) continue;
      const py = Math.max(y + 12, Math.min(tepe, 90) * 0.92);
      enS = skor;
      en = {
        p: [ax + SEHIR_X, py, az + SEHIR_Z],
        uc: [uc[0] + SEHIR_X, Math.min(py, tepe), uc[1] + SEHIR_Z],
      };
    }
  }
  return en;
}

/** yerel noktanın r m çevresindeki binalar (hücre ızgarasından) */
function yakinBinalar(x: number, z: number, r: number): Bina[] {
  const { hucre } = sehirBinalari(),
    out: Bina[] = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      const l = hucre.get(hucreNo(x + dx * CADDE_ARA, z + dz * SOKAK_ARA));
      if (l)
        for (const b of l)
          if (Math.abs(x - b.x) < b.hx + r && Math.abs(z - b.z) < b.hz + r && !out.includes(b)) out.push(b);
    }
  return out;
}
