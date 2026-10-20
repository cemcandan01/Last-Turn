// Matematik yardımcıları: sınırlama, yumuşak geçiş, açı farkı

/** v'yi [a, b] aralığına sıkıştırır */
export const cl = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** a ile b arasında yumuşak 0→1 geçiş (smoothstep) */
export const sm = (a: number, b: number, v: number): number => {
  const t = cl((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** açıyı [-π, π) aralığına indirger. Eski kodla birebir aynı sonuç için 6.2832 sabiti korunur */
export const ad = (a: number): number => ((((a + Math.PI) % 6.2832) + 6.2832) % 6.2832) - Math.PI;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** iki açı arasında kısa yoldan ara değer */
export const lerpAci = (a: number, b: number, t: number): number => a + ad(b - a) * t;

export type V2 = [number, number];
