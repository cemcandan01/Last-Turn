// Rakip YZ, plan katmanı (saf): pistin orta çizgisinden yarış çizgisi ve o çizgide hız profili. Çizgi, pist kenarından
// pay bırakarak eğriliği azaltan yumuşatmayla bulunur (virajın dışından gir, iç kenara yaklaş, dışa çık). Hız profili
// çizginin eğriliğinden yanal ivme sınırıyla, ardından fren ivmesiyle geriye doğru taşınır. Sonuç belirlenimcidir:
// aynı pist ve aynı ayarlar her seferinde aynı çizgiyi verir. Fizik değişmez; bu yalnız sürücünün niyetidir.
import type { Pist } from "../dunya/pist";

export interface YarisCizgisi {
  /** pist noktası başına çizgi konumu (orta çizgiden sola kayma o, m) */
  x: Float64Array;
  z: Float64Array;
  o: Float64Array;
  /** çizgi boyunca birikimli uzunluk (m) ve işaretli eğrilik (1/m, sola pozitif) */
  s: Float64Array;
  k: Float64Array;
  /** orta çizgi, sol normali ve pist yarı genişliği (algı: kenara uzaklık) */
  cx: Float64Array;
  cz: Float64Array;
  nx: Float64Array;
  nz: Float64Array;
  hw: number;
  /** çizgi uzunluğu */
  len: number;
  N: number;
  acik: boolean;
}

/** orta çizginin sol normali */
const solNormal = (TR: Pist, i: number): [number, number] => [TR.T[i][1], -TR.T[i][0]];

/**
 * yarış çizgisi. pay: pist kenarına bırakılan mesafe (m; araç yarı genişliği dahil). Yumuşatma eğriliği azaltır ve
 * kenardan taşmayı keser; tekrar sayısı çizginin ne kadar "düzleşeceğini" belirler.
 */
export function yarisCizgisi(TR: Pist, pay: number, tekrar = 400): YarisCizgisi {
  const N = TR.N,
    acik = TR.open,
    sinir = Math.max(0, TR.hw - pay),
    o = new Float64Array(N),
    x = new Float64Array(N),
    z = new Float64Array(N);
  const nx = new Float64Array(N),
    nz = new Float64Array(N),
    cx = new Float64Array(N),
    cz = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    [nx[i], nz[i]] = solNormal(TR, i);
    [cx[i], cz[i]] = TR.P[i];
  }
  const konum = () => {
    for (let i = 0; i < N; i++) {
      x[i] = cx[i] + nx[i] * o[i];
      z[i] = cz[i] + nz[i] * o[i];
    }
  };
  konum();
  // bükülme enerjisini azalt: her nokta, komşularının eğriliğini sürdüren konuma çekilir (dört komşulu kalıp).
  // Gergin ip (iki komşunun ortası) en kısa yolu verir ve tepe noktasında keskinleşir; bu kalıp en az eğriliği arar.
  // Geniş adım uzun virajları, dar adım kıvrımları düzler
  const g = (j: number) => (j + N) % N;
  for (const adim of [4, 2, 1]) {
    for (let t = 0; t < tekrar; t++) {
      for (let i = 0; i < N; i++) {
        if (acik && (i < 2 * adim || i >= N - 2 * adim)) continue;
        const a2 = g(i - 2 * adim),
          a1 = g(i - adim),
          b1 = g(i + adim),
          b2 = g(i + 2 * adim),
          mx = (-x[a2] + 4 * x[a1] + 4 * x[b1] - x[b2]) / 6 - x[i],
          mz = (-z[a2] + 4 * z[a1] + 4 * z[b1] - z[b2]) / 6 - z[i];
        const yeni = Math.max(-sinir, Math.min(sinir, o[i] + 0.5 * (mx * nx[i] + mz * nz[i])));
        x[i] += nx[i] * (yeni - o[i]);
        z[i] += nz[i] * (yeni - o[i]);
        o[i] = yeni;
      }
    }
  }
  konum();
  const s = new Float64Array(N),
    k = new Float64Array(N);
  for (let i = 1; i < N; i++) s[i] = s[i - 1] + Math.hypot(x[i] - x[i - 1], z[i] - z[i - 1]);
  const len = acik ? s[N - 1] : s[N - 1] + Math.hypot(x[0] - x[N - 1], z[0] - z[N - 1]);
  // eğrilik: ±2 noktalık kirişlerin açı farkı / yol
  const gk = (j: number) => (acik ? Math.max(0, Math.min(N - 1, j)) : (j + N) % N);
  for (let i = 0; i < N; i++) {
    const a = gk(i - 2),
      b = gk(i),
      c = gk(i + 2),
      h1 = Math.atan2(x[b] - x[a], z[b] - z[a]),
      h2 = Math.atan2(x[c] - x[b], z[c] - z[b]);
    let d = h2 - h1;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const l = Math.hypot(x[b] - x[a], z[b] - z[a]) + Math.hypot(x[c] - x[b], z[c] - z[b]);
    // yön açısı atan2(dx, dz): sola dönüşte azalır; sola pozitif eğrilik için işaret çevrilir
    k[i] = l > 1e-6 ? (-2 * d) / l : 0;
  }
  // araç ölçeğinde (±8 m) ortalama: kenara değen noktadaki kırık tek başına hızı düşürmesin
  const ham = Float64Array.from(k);
  for (let i = 0; i < N; i++) {
    let t = 0;
    for (let j = -2; j <= 2; j++) t += ham[gk(i + j)];
    k[i] = t / 5;
  }
  return { x, z, o, s, k, cx, cz, nx, nz, hw: TR.hw, len, N, acik };
}

export interface HizAyari {
  /** yanal ivme sınırı (m/s²): virajda hızı belirler */
  yan: number;
  /** fren ivmesi (m/s²): fren noktasını belirler */
  fren: number;
  /** düzlükte en yüksek hedef (m/s) */
  tavan: number;
}

/** çizgi boyunca hedef hız (m/s): viraj sınırı, sonra frenle geriye taşınır (kapalı pistte iki tur) */
export function hizProfili(c: YarisCizgisi, h: HizAyari): Float64Array {
  const N = c.N,
    v = new Float64Array(N);
  for (let i = 0; i < N; i++) v[i] = Math.min(h.tavan, Math.sqrt(h.yan / Math.max(Math.abs(c.k[i]), 1e-5)));
  const ds = (i: number) => (i + 1 < N ? c.s[i + 1] - c.s[i] : c.len - c.s[N - 1]);
  for (let tur = 0; tur < (c.acik ? 1 : 2); tur++)
    for (let i = N - 1; i >= 0; i--) {
      if (c.acik && i == N - 1) continue;
      const j = (i + 1) % N;
      v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * h.fren * ds(i)));
    }
  return v;
}

/** çizgide en yakın nokta: ipucu çevresinde arar (araç her adımda birkaç metre ilerler) */
export function cizgideYakin(c: YarisCizgisi, x: number, z: number, ipucu: number, genis = false): number {
  const N = c.N;
  let bi = ipucu,
    bd = 1e18;
  const tara = (a: number, b: number) => {
    for (let k = a; k <= b; k++) {
      const i = c.acik ? Math.max(0, Math.min(N - 1, k)) : ((k % N) + N) % N,
        q = (x - c.x[i]) ** 2 + (z - c.z[i]) ** 2;
      if (q < bd) {
        bd = q;
        bi = i;
      }
    }
  };
  if (genis) tara(0, N - 1);
  else {
    tara(ipucu - 12, ipucu + 12);
    if (bd > 30 * 30) tara(0, N - 1);
  }
  return bi;
}

/** i noktasından ileride d metredeki çizgi noktası (indeks) */
export function ileri(c: YarisCizgisi, i: number, d: number): number {
  const N = c.N;
  let j = i,
    yol = 0;
  while (yol < d) {
    const k = j + 1;
    if (c.acik && k >= N) return N - 1;
    const kk = k % N;
    yol += kk ? c.s[kk] - c.s[j] : c.len - c.s[j];
    j = kk;
  }
  return j;
}
