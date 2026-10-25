// Girdi kaydı: her fizik adımının girdisi (direksiyon, gaz, fren, analog ve debriyaj bayrakları) sıkıştırılmış olarak tutulur.
// Başlangıç durumu ve tohumla birlikte kayıt yeniden oynatılınca aynı sonucu verir (fizik belirlenimci): hayalet
// araç ve süre doğrulaması için. Adım başına 8 bayt (60 Hz'de dakikada ~29 KB). Saf kod.
//
// Belirlenimcilik için oyun fiziğe kaydedilen (nicemlenmiş) girdiyi verir: girdiyiKaydet'in döndürdüğünü.
// Kayıt bir sıfırlamadan başlar; araç kurulumu (önayar, ayar) kayıt boyunca aynı kalmalıdır.
import { Simulasyon } from "./simulasyon";
import type { AdimSonucu, AracDurumu, FizikBaglami, FizikGirdisi } from "./tipler";

/** girdi ölçeği: -1..1 aralığı 16 bit tamsayıya */
const OLCEK = 32767;
/** adım başına alan: direksiyon, gaz, fren, bayraklar */
const ALAN = 4;
/** en uzun kayıt (adım): 60 dakika; aşılırsa kayıt durur, `tasti` işaretlenir */
const EN_COK = 60 * 60 * 60;
/** kayıt biçimi sürümü */
const SURUM = 1;

export interface GirdiKaydi {
  surum: number;
  /** fizik rastgelelik tohumu */
  tohum: number;
  /** başlangıç durumu (sıfırlamadaki araç durumu) */
  bas: AracDurumu;
  /** kayıtlı adım sayısı */
  n: number;
  /** ALAN × kapasite; ilk ALAN × n dolu */
  veri: Int16Array;
  /** kayıt sırasında dışarıdan durum değişti (araç kaldırıldı) ya da kayıt doldu: yeniden oynatma güvenilmez */
  kesik: boolean;
  tasti: boolean;
}

/** bir sıfırlamadan sonra boş kayıt (bas: sıfırlanmış araç durumu, kopyalanır) */
export function kayitBaslat(tohum: number, bas: AracDurumu, k?: GirdiKaydi): GirdiKaydi {
  if (!k)
    return {
      surum: SURUM,
      tohum,
      bas: { ...bas },
      n: 0,
      veri: new Int16Array(ALAN * 1024),
      kesik: false,
      tasti: false,
    };
  k.tohum = tohum;
  k.bas = { ...bas };
  k.n = 0;
  k.kesik = k.tasti = false;
  return k;
}

const nicemle = (v: number) => Math.round(Math.max(-1, Math.min(1, v)) * OLCEK);

/**
 * girdiyi kayda ekle; fiziğe verilecek (nicemlenmiş) girdiyi döndürür. Tuş girdileri (-1, 0, 1) değişmez,
 * analog girdi 1/32767 adımlarla yuvarlanır.
 */
export function girdiyiKaydet(k: GirdiKaydi, gi: FizikGirdisi, out: FizikGirdisi = { ...gi }): FizikGirdisi {
  const a = nicemle(gi.tg),
    g = nicemle(gi.g),
    b = nicemle(gi.b);
  out.tg = a / OLCEK;
  out.g = g / OLCEK;
  out.b = b / OLCEK;
  out.analogDireksiyon = gi.analogDireksiyon;
  out.analogGaz = gi.analogGaz;
  out.dbr = !!gi.dbr;
  if (k.n >= EN_COK) {
    k.tasti = true;
    return out;
  }
  if ((k.n + 1) * ALAN > k.veri.length) {
    const yeni = new Int16Array(Math.min(EN_COK * ALAN, k.veri.length * 2));
    yeni.set(k.veri);
    k.veri = yeni;
  }
  const o = k.n * ALAN,
    V = k.veri;
  V[o] = a;
  V[o + 1] = g;
  V[o + 2] = b;
  V[o + 3] = (gi.analogDireksiyon ? 1 : 0) | (gi.analogGaz ? 2 : 0) | (gi.dbr ? 4 : 0);
  k.n++;
  return out;
}

/** i. adımın girdisi */
export function kayitGirdisi(k: GirdiKaydi, i: number, out: FizikGirdisi = bosGirdi()): FizikGirdisi {
  const o = i * ALAN,
    V = k.veri;
  out.tg = V[o] / OLCEK;
  out.g = V[o + 1] / OLCEK;
  out.b = V[o + 2] / OLCEK;
  out.analogDireksiyon = (V[o + 3] & 1) != 0;
  out.analogGaz = (V[o + 3] & 2) != 0;
  out.dbr = (V[o + 3] & 4) != 0;
  return out;
}

export const bosGirdi = (): FizikGirdisi => ({
  tg: 0,
  g: 0,
  b: 0,
  analogDireksiyon: false,
  analogGaz: false,
  dbr: false,
});

/**
 * kaydı baştan oynat: simülasyon kaydın başlangıç durumuna ve tohumuna sıfırlanır, her adım kayıtlı girdiyle
 * ilerler. adimSonrasi her adımdan sonra çağrılır (hayalet çizimi, süre denetimi). Son simülasyonu döndürür.
 */
export function kaydiOynat(
  k: GirdiKaydi,
  cx: FizikBaglami,
  sim: Simulasyon = new Simulasyon(k.tohum),
  adimSonrasi?: (sim: Simulasyon, i: number, r: AdimSonucu) => void,
): Simulasyon {
  sim.tohum = k.tohum;
  sim.sifirla(k.bas.x, k.bas.z, k.bas.h, k.bas.y);
  Object.assign(sim.d.S, k.bas);
  const gi = bosGirdi();
  for (let i = 0; i < k.n; i++) {
    const r = sim.adim(kayitGirdisi(k, i, gi), cx);
    adimSonrasi?.(sim, i, r);
  }
  return sim;
}

/** kayıt → metin (JSON; girdiler küçük-sonlu 16 bit, base64) */
export function kaydiSerilestir(k: GirdiKaydi): string {
  const v = k.veri.subarray(0, k.n * ALAN),
    b = new Uint8Array(v.length * 2);
  for (let i = 0; i < v.length; i++) {
    b[2 * i] = v[i] & 255;
    b[2 * i + 1] = (v[i] >> 8) & 255;
  }
  return JSON.stringify({
    surum: k.surum,
    tohum: k.tohum,
    bas: k.bas,
    n: k.n,
    kesik: k.kesik,
    tasti: k.tasti,
    veri: base64(b),
  });
}

export function kaydiCoz(s: string): GirdiKaydi {
  const j = JSON.parse(s) as Omit<GirdiKaydi, "veri"> & { veri: string };
  if (j.surum != SURUM) throw new Error("girdi kaydı sürümü desteklenmiyor: " + j.surum);
  const b = base64Coz(j.veri),
    v = new Int16Array(Math.max(ALAN, b.length / 2));
  for (let i = 0; i < b.length / 2; i++) v[i] = ((b[2 * i] | (b[2 * i + 1] << 8)) << 16) >> 16;
  return { surum: j.surum, tohum: j.tohum, bas: j.bas, n: j.n, veri: v, kesik: j.kesik, tasti: j.tasti };
}

// base64: tarayıcıya ya da Node'a bağlı olmadan
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    s += i + 1 < b.length ? B64[(n >> 6) & 63] : "=";
    s += i + 2 < b.length ? B64[n & 63] : "=";
  }
  return s;
}

function base64Coz(s: string): Uint8Array {
  const temiz = s.replace(/=+$/, ""),
    out = new Uint8Array(Math.floor((temiz.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < temiz.length; i += 4) {
    const n =
      (B64.indexOf(temiz[i]) << 18) |
      (B64.indexOf(temiz[i + 1]) << 12) |
      ((i + 2 < temiz.length ? B64.indexOf(temiz[i + 2]) : 0) << 6) |
      (i + 3 < temiz.length ? B64.indexOf(temiz[i + 3]) : 0);
    out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}
