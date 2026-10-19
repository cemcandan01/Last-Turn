// Tohumlu rastgele sayı üreteçleri. Fizik ve dünya kurulumu Math.random kullanmaz:
// aynı tohum ve aynı girişlerle her çalıştırma aynı sonucu verir (tekrar izleme, hayalet araç, testler).

export type Rastgele = () => number;

/** Park–Miller LCG: eski dekor üreteciyle aynı dizi (tohum 7 → eski oyunun dizisi) */
export function lcg(tohum: number): Rastgele {
  let s = tohum % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** mulberry32: hızlı, iyi dağılımlı 32 bit üreteç */
export function mulberry32(tohum: number): Rastgele {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
