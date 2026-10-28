// Rakip YZ, kişilik (saf): pilotun nasıl sürdüğünü belirleyen parametreler. Fark fiziksel sebepten doğar: daha geç
// fren ve daha yüksek viraj hızı lastik sınırını zorlar; zorlayan pilot hızlı ama hata yapmaya açıktır. Tutarlılık,
// viraj başına tohumlu (belirlenimci) bir sapmadır: saniye başına titreme değil, "bu virajı biraz erken/geç aldı".
// Rakibe gizli tutuş, güç ya da yakalama yardımı verilmez; parametreler yalnız girdi kararlarını değiştirir.

export interface Kisilik {
  ad: string;
  /** virajda kullanılan yanal ivme (m/s²): risk iştahı */
  yan: number;
  /** fren ivmesi varsayımı (m/s²): büyük değer = geç fren noktası */
  fren: number;
  /** pist kenarına bırakılan pay (m): küçük = çizgiyi sonuna kadar kullanır */
  pay: number;
  /** bakış mesafesi: taban (m) + hız katsayısı (sn) */
  bakis: number;
  bakisHiz: number;
  /** 0-1: 1 her virajı aynı alır; düşükse viraj başına sapma büyür */
  tutarlilik: number;
  /** ışık yeşile dönünce kalkış tepkisi (sn) */
  tepki: number;
  /** takılınca geri çıkmadan önce bekleme (sn) */
  sabir: number;
  /** kayma açısı bu sınırı aşınca gazı keser (rad): düşük = temkinli */
  kaymaSiniri: number;
}

export const KISILIKLER = {
  caylak: {
    ad: "Çaylak",
    yan: 7.5,
    fren: 5.5,
    pay: 3.4,
    bakis: 8,
    bakisHiz: 0.45,
    tutarlilik: 0.55,
    tepki: 0.35,
    sabir: 2.4,
    kaymaSiniri: 0.22,
  },
  deneyimli: {
    ad: "Deneyimli",
    yan: 10,
    fren: 8,
    pay: 2.8,
    bakis: 7,
    bakisHiz: 0.4,
    tutarlilik: 0.9,
    tepki: 0.18,
    sabir: 1.6,
    kaymaSiniri: 0.3,
  },
  // MUTANT boss'u (LT-SYS-007): en geç fren, en yüksek viraj hızı, en tutarlı ve en hızlı tepki
  boss: {
    ad: "Boss",
    yan: 12.5,
    fren: 10,
    pay: 2.5,
    bakis: 7,
    bakisHiz: 0.4,
    tutarlilik: 0.97,
    tepki: 0.12,
    sabir: 1.4,
    kaymaSiniri: 0.33,
  },
} satisfies Record<string, Kisilik>;

export type KisilikAdi = keyof typeof KISILIKLER;

/** tohum + iki tamsayıdan [0, 1) değer (durum tutmaz: aynı girdi aynı sonuç) */
export function karma(tohum: number, a: number, b: number): number {
  let h = (tohum ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 7, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** viraj bölgesi başına hız çarpanı: tutarsız pilot bazı virajlara fazla hızlı, bazılarına yavaş girer */
export function virajSapmasi(k: Kisilik, tohum: number, tur: number, bolum: number): number {
  return 1 + (1 - k.tutarlilik) * 0.16 * (karma(tohum, tur, bolum) - 0.5);
}
