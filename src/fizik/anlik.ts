// Araç durumu anlık görüntüsü: bir aracı çizmek (ve ileride ağ üzerinden göndermek) için gereken her şey, düz
// sayı alanlarıyla. Uzak araç (başka oyuncu, hayalet) fizik çalıştırmaz: gelen anlık görüntüler bir tampona
// girer, araç biraz geriden (gecikme) iki görüntü arasında ara değerle, görüntü gecikirse hızla ileri tahminle çizilir.
// Saf kod: three.js, DOM ve oyun durumu yok.
import { ad, cl, lerp, lerpAci } from "../cekirdek/matematik";
import type { SimDurumu } from "./tipler";
import type { YeniDurum } from "./yeni/model";

/** aracın bir andaki görünür durumu (bütün alanlar sayı: ağ ve kayıt için diziye çevrilebilir) */
export interface AracAnlik {
  /** gönderenin simülasyon zamanı (s) */
  t: number;
  /** konum (ağırlık merkezi değil, aracın yer noktası), yön */
  x: number;
  y: number;
  z: number;
  h: number;
  /** gövde yönelimi (dördey; fizik başlamadıysa yalnız yön) */
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  /** hız (m/s) */
  vx: number;
  vy: number;
  vz: number;
  /** ön teker açısı (rad) */
  delta: number;
  /** teker dönüş hızları (rad/s; sol ön, sağ ön, sol arka, sağ arka) ve dönüş açıları (rad, -π..π) */
  w0: number;
  w1: number;
  w2: number;
  w3: number;
  d0: number;
  d1: number;
  d2: number;
  d3: number;
  /** süspansiyon: tekerin durağan yerinden farkı (m; yerden kalkmışsa -0,1) */
  s0: number;
  s1: number;
  s2: number;
  s3: number;
  /** motor devri, vites, gaz (ses için) */
  rpm: number;
  vites: number;
  gaz: number;
}

/** alanların sabit sırası: diziye çevirme ve geri okuma bu sırayla (ağ biçimi) */
export const ANLIK_ALANLARI = [
  "t",
  "x",
  "y",
  "z",
  "h",
  "qx",
  "qy",
  "qz",
  "qw",
  "vx",
  "vy",
  "vz",
  "delta",
  "w0",
  "w1",
  "w2",
  "w3",
  "d0",
  "d1",
  "d2",
  "d3",
  "s0",
  "s1",
  "s2",
  "s3",
  "rpm",
  "vites",
  "gaz",
] as const satisfies readonly (keyof AracAnlik)[];

export function bosAnlik(): AracAnlik {
  const a = {} as AracAnlik;
  for (const k of ANLIK_ALANLARI) a[k] = 0;
  a.qw = 1;
  return a;
}

export function anlikKopyala(a: AracAnlik, out: AracAnlik = bosAnlik()): AracAnlik {
  for (const k of ANLIK_ALANLARI) out[k] = a[k];
  return out;
}

/** anlık görüntüyü diziye yaz (ANLIK_ALANLARI sırasıyla) */
export function anlikDiziye(a: AracAnlik, dizi: number[] | Float64Array | Float32Array = [], ofs = 0) {
  for (let i = 0; i < ANLIK_ALANLARI.length; i++) dizi[ofs + i] = a[ANLIK_ALANLARI[i]];
  return dizi;
}

export function anlikDiziden(dizi: ArrayLike<number>, ofs = 0, out: AracAnlik = bosAnlik()): AracAnlik {
  for (let i = 0; i < ANLIK_ALANLARI.length; i++) out[ANLIK_ALANLARI[i]] = dizi[ofs + i];
  return out;
}

/** simülasyondan anlık görüntü al */
export function anlikAl(d: SimDurumu, Y: YeniDurum | null, out: AracAnlik = bosAnlik()): AracAnlik {
  const S = d.S;
  out.t = d.zaman;
  out.x = S.x;
  out.y = S.y;
  out.z = S.z;
  out.h = S.h;
  out.vx = S.vx;
  out.vy = S.vy;
  out.vz = S.vz;
  out.delta = d.delta;
  out.gaz = S.gas;
  if (Y) {
    out.qx = Y.qx;
    out.qy = Y.qy;
    out.qz = Y.qz;
    out.qw = Y.qw;
    out.rpm = Y.rpm;
    out.vites = Y.vites;
    const T = Y.tk;
    out.w0 = T[0].w;
    out.w1 = T[1].w;
    out.w2 = T[2].w;
    out.w3 = T[3].w;
    out.d0 = ad(T[0].don);
    out.d1 = ad(T[1].don);
    out.d2 = ad(T[2].don);
    out.d3 = ad(T[3].don);
    out.s0 = susp(T[0]);
    out.s1 = susp(T[1]);
    out.s2 = susp(T[2]);
    out.s3 = susp(T[3]);
  } else {
    // fizik henüz başlamadı: düz duran araç
    out.qx = out.qz = 0;
    out.qy = Math.sin(S.h / 2);
    out.qw = Math.cos(S.h / 2);
    out.rpm = out.vites = 0;
    out.w0 = out.w1 = out.w2 = out.w3 = 0;
    out.d0 = out.d1 = out.d2 = out.d3 = 0;
    out.s0 = out.s1 = out.s2 = out.s3 = 0;
  }
  return out;
}

const susp = (tk: { temas: boolean; sik: number; c0: number }) =>
  tk.temas ? cl(tk.sik - tk.c0, -0.12, 0.16) : -0.1;

/** iki anlık görüntü arası (k: 0 → a, 1 → b) */
export function anlikAraDeger(a: AracAnlik, b: AracAnlik, k: number, out: AracAnlik): AracAnlik {
  out.t = lerp(a.t, b.t, k);
  out.x = lerp(a.x, b.x, k);
  out.y = lerp(a.y, b.y, k);
  out.z = lerp(a.z, b.z, k);
  out.h = lerpAci(a.h, b.h, k);
  out.vx = lerp(a.vx, b.vx, k);
  out.vy = lerp(a.vy, b.vy, k);
  out.vz = lerp(a.vz, b.vz, k);
  out.delta = lerp(a.delta, b.delta, k);
  // dördey: kısa yoldan (işaret), normalize edilmiş doğrusal ara değer
  const s = a.qx * b.qx + a.qy * b.qy + a.qz * b.qz + a.qw * b.qw < 0 ? -1 : 1;
  let qx = lerp(a.qx, s * b.qx, k),
    qy = lerp(a.qy, s * b.qy, k),
    qz = lerp(a.qz, s * b.qz, k),
    qw = lerp(a.qw, s * b.qw, k);
  const n = Math.hypot(qx, qy, qz, qw) || 1;
  qx /= n;
  qy /= n;
  qz /= n;
  qw /= n;
  out.qx = qx;
  out.qy = qy;
  out.qz = qz;
  out.qw = qw;
  out.w0 = lerp(a.w0, b.w0, k);
  out.w1 = lerp(a.w1, b.w1, k);
  out.w2 = lerp(a.w2, b.w2, k);
  out.w3 = lerp(a.w3, b.w3, k);
  out.s0 = lerp(a.s0, b.s0, k);
  out.s1 = lerp(a.s1, b.s1, k);
  out.s2 = lerp(a.s2, b.s2, k);
  out.s3 = lerp(a.s3, b.s3, k);
  out.rpm = lerp(a.rpm, b.rpm, k);
  out.gaz = lerp(a.gaz, b.gaz, k);
  out.vites = k < 0.5 ? a.vites : b.vites;
  // dönüş açıları: görüntüler arası tekerler çok tur atabilir; çizim açıyı dönüş hızından kendisi ilerletir
  out.d0 = b.d0;
  out.d1 = b.d1;
  out.d2 = b.d2;
  out.d3 = b.d3;
  return out;
}

/** uzak araç: kendi fiziği yok, gelen anlık görüntülerden çizilir */
export interface UzakArac {
  id: string;
  /** araç (CARS sırası) */
  arac: number;
  /** gelen görüntüler (zaman sırasıyla) */
  tampon: AracAnlik[];
  /** çizilecek durum */
  goster: AracAnlik;
  /** görüntü saati: gönderenin zamanına göre şu an gösterilen an */
  saat: number;
  /** ara değer gecikmesi (s): görüntüler bu kadar geriden çizilir, araya kayıp paket sığar */
  gecikme: number;
  /** son görüntüden en çok bu kadar ileri tahmin (s) */
  tahmin: number;
  /** çizim: teker dönüş açıları (dönüş hızından ilerletilir) */
  don: [number, number, number, number];
  /** hiç görüntü geldi mi */
  hazir: boolean;
}

export function uzakAracYap(id: string, arac: number, gecikme = 0.12): UzakArac {
  return {
    id,
    arac,
    tampon: [],
    goster: bosAnlik(),
    saat: 0,
    gecikme,
    tahmin: 0.3,
    don: [0, 0, 0, 0],
    hazir: false,
  };
}

/** tamponda tutulan en çok görüntü */
const TAMPON = 32;

/** ağdan (ya da hayaletten) gelen görüntüyü ekle; sıra dışı ve yinelenen görüntü atılır */
export function uzakAnlikEkle(u: UzakArac, a: AracAnlik) {
  const B = u.tampon,
    son = B[B.length - 1];
  if (son && a.t <= son.t) {
    // gönderen sıfırlandı (yeni yarış): zaman geri gitti
    if (a.t < son.t - 1) {
      B.length = 0;
      u.hazir = false;
    } else return;
  }
  B.push(anlikKopyala(a));
  if (B.length > TAMPON) B.shift();
  if (!u.hazir) {
    u.hazir = true;
    u.saat = a.t - u.gecikme;
    anlikKopyala(a, u.goster);
  }
}

/** uzak aracı çizim için ilerlet (dt: kare süresi) */
export function uzakGuncelle(u: UzakArac, dt: number) {
  const B = u.tampon;
  if (!B.length) return;
  const hedef = B[B.length - 1].t - u.gecikme;
  u.saat += dt;
  // saat kayması yumuşak düzeltilir; çok açılırsa atlanır
  const fark = hedef - u.saat;
  if (Math.abs(fark) > 1) u.saat = hedef;
  else u.saat += fark * Math.min(1, dt * 2);
  while (B.length > 2 && B[1].t <= u.saat) B.shift();
  const a = B[0],
    b = B.length > 1 ? B[1] : null,
    g = u.goster;
  if (b && u.saat > a.t && u.saat < b.t) anlikAraDeger(a, b, (u.saat - a.t) / (b.t - a.t), g);
  else {
    // görüntü yok ya da geride kaldı: son görüntüden hızla ileri tahmin (sınırlı)
    const s = b && u.saat >= b.t ? b : a,
      e = cl(u.saat - s.t, 0, u.tahmin);
    anlikKopyala(s, g);
    g.x += s.vx * e;
    g.y += s.vy * e;
    g.z += s.vz * e;
  }
  const D = u.don;
  D[0] += g.w0 * dt;
  D[1] += g.w1 * dt;
  D[2] += g.w2 * dt;
  D[3] += g.w3 * dt;
}
