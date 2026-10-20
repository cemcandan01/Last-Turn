// Pist geometrisi (saf matematik): Catmull-Rom pist eğrisi, en yakın nokta, kerbler, rampalar, pist üzerinde konum.
// Pist yapısı: P noktalar, T teğetler, S birikimli uzunluk, N nokta sayısı, len uzunluk, hw yarı genişlik, open (A'dan B'ye).
import { cl, sm, ad, type V2 } from "../cekirdek/matematik";

export interface Pist {
  P: V2[];
  N: number;
  T: V2[];
  S: number[];
  len: number;
  hw: number;
  open: boolean;
  /** kerb olan noktalar (virajlar) */
  kb?: boolean[];
  /** pist çizgisi boyunca yükseklik */
  hc?: number[];
}

/** son bulunan pist noktası: en yakın nokta aramasının başlangıç ipucu */
export const ipucu = { ti: 0 };

/** kontrol noktalarından pist (kapalı ya da açık Catmull-Rom eğrisi, ~4 m aralıklı) */
export function mkTrack(pts: V2[], hw: number, open: boolean): Pist {
  const P: V2[] = [],
    m = pts.length;
  for (let i = 0; i < (open ? m - 1 : m); i++) {
    const p0 = open && i == 0 ? pts[0] : pts[(i - 1 + m) % m],
      p1 = pts[i],
      p2 = pts[(i + 1) % m],
      p3 = open && i + 2 >= m ? pts[m - 1] : pts[(i + 2) % m],
      seg = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4);
    for (let j = 0; j < seg; j++) {
      const t = j / seg,
        t2 = t * t,
        t3 = t2 * t,
        f = (k: 0 | 1) =>
          0.5 *
          (2 * p1[k] +
            (-p0[k] + p2[k]) * t +
            (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
            (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      P.push([f(0), f(1)]);
    }
  }
  if (open) P.push([...pts[m - 1]]);
  const N = P.length,
    T: V2[] = [],
    S = [0];
  for (let i = 0; i < N; i++) {
    const a = P[open ? Math.min(i + 1, N - 1) : (i + 1) % N],
      b = P[open ? Math.max(i - 1, 0) : (i - 1 + N) % N],
      l = Math.hypot(a[0] - b[0], a[1] - b[1]);
    T.push([(a[0] - b[0]) / l, (a[1] - b[1]) / l]);
    if (i) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  }
  return {
    P,
    N,
    T,
    S,
    len: open ? S[N - 1] : S[N - 1] + Math.hypot(P[0][0] - P[N - 1][0], P[0][1] - P[N - 1][1]),
    hw,
    open,
  };
}

/** en yakın pist noktası [indeks, uzaklık]. Önce ipucu çevresine bakar, uzaksa tümünü tarar */
export function nearest(TR: Pist, x: number, z: number, hint: number, full?: boolean): [number, number] {
  let bi = hint,
    bd = 1e18;
  const N = TR.N;
  const scan = (a: number, b: number) => {
    for (let k = a; k <= b; k++) {
      const i = ((k % N) + N) % N,
        dx = x - TR.P[i][0],
        dz = z - TR.P[i][1],
        q = dx * dx + dz * dz;
      if (q < bd) {
        bd = q;
        bi = i;
      }
    }
  };
  if (full) scan(0, N - 1);
  else {
    scan(hint - 40, hint + 40);
    if (Math.sqrt(bd) > TR.hw + 25) scan(0, N - 1);
  }
  return [bi, Math.sqrt(bd)];
}

/** pist uzunluğunun f oranındaki nokta indeksi */
export const idxAt = (TR: Pist, f: number): number => {
  const L0 = f * TR.len;
  let i = 0;
  while (i < TR.N - 1 && TR.S[i] < L0) i++;
  return i;
};

/** ışınlanma noktası [ad, x, z, yön]: i'den back nokta geride */
export const tp = (TR: Pist, name: string, i: number, back: number): [string, number, number, number] => {
  i = (((i - back) % TR.N) + TR.N) % TR.N;
  return [name, TR.P[i][0], TR.P[i][1], Math.atan2(TR.T[i][0], TR.T[i][1])];
};

export const off = (a: V2[], ox: number, oz: number): V2[] => a.map(([x, z]) => [x + ox, z + oz]);

export function recenter(p: V2[]): V2[] {
  let a = 1e9,
    b = -1e9,
    c = 1e9,
    d = -1e9;
  for (const [x, z] of p) {
    a = Math.min(a, x);
    b = Math.max(b, x);
    c = Math.min(c, z);
    d = Math.max(d, z);
  }
  return p.map(([x, z]) => [x - (a + b) / 2, z - (c + d) / 2]);
}

/** pistin sınır kutusu [xmin, xmax, zmin, zmax], m pay ile */
export const bbox = (TR: Pist, m: number): [number, number, number, number] => {
  let a = 1e9,
    b = -1e9,
    c = 1e9,
    d = -1e9;
  for (const p of TR.P) {
    a = Math.min(a, p[0]);
    b = Math.max(b, p[0]);
    c = Math.min(c, p[1]);
    d = Math.max(d, p[1]);
  }
  return [a - m, b + m, c - m, d + m];
};

/** i noktasında, k nokta önce ve sonraki teğetler arasındaki açı */
export function turnAt(TR: Pist, i: number, k: number): number {
  const g = (j: number) => (TR.open ? cl(j, 0, TR.N - 1) : (j + TR.N) % TR.N),
    a = TR.T[g(i - k)],
    b = TR.T[g(i + k)];
  return Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]));
}

/** rampaları düzlüğe kaydır: verilen konumun ±100 m çevresindeki en düz nokta */
export function straightF(TR: Pist, f: number): number {
  const i0 = idxAt(TR, f);
  let bj = i0,
    bt = 1e9;
  for (let j = i0 - 25; j <= i0 + 25; j++) {
    const i = TR.open ? cl(j, 8, TR.N - 9) : (j + TR.N) % TR.N,
      t = turnAt(TR, i, 6);
    if (t < bt) {
      bt = t;
      bj = i;
    }
  }
  return TR.S[bj] / TR.len;
}

/** fren tabelaları: önünde en az 110 m düzlük olan virajlar */
export function autoApex(TR: Pist): number[] {
  const r: number[] = [];
  for (let i = 0; i < TR.N; i++) {
    if (!(turnAt(TR, i, 5) > 0.3 && turnAt(TR, (i - 1 + TR.N) % TR.N, 5) <= 0.3)) continue;
    let j = i,
      d = 0,
      n = 0;
    while (n++ < 15 && turnAt(TR, j, 5) > 0.12) j = (j - 1 + TR.N) % TR.N;
    while (d < 400) {
      const k = (j - 1 + TR.N) % TR.N;
      if (turnAt(TR, k, 5) > 0.2) break;
      d += Math.hypot(TR.P[j][0] - TR.P[k][0], TR.P[j][1] - TR.P[k][1]);
      j = k;
    }
    if (d >= 110) r.push(i);
  }
  return r;
}

/** kerb yalnız virajlarda (apeks ve çıkış) */
export function kerbs(TR: Pist) {
  TR.kb = TR.P.map((_p, i) => {
    const a = TR.T[(i - 5 + TR.N) % TR.N],
      b = TR.T[(i + 5) % TR.N];
    return Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])) > 0.12;
  });
}

/** kerb genişliği ve kesiti: pistten 9 cm yüksek */
export const KW = 1.6,
  kerbProf = (k: number) => (k <= 0 || k >= KW ? 0 : 0.09 * sm(0, 0.4, k) * (1 - sm(1.2, KW, k)));

/**
 * en yakın nokta i'nin iki yanındaki pist parçalarına izdüşüm: pist boyunca konum s (m) ve pist çizgisine uzaklık d.
 * İzdüşüm doğrusu parça boyunca dönen teğete diktir (teğet noktalarda sürekli): s ve d noktalar arasında ve
 * viraj içinde de basamaksız değişir. Yükseklik ve kerb bundan hesaplanınca araç titremez.
 */
export function parcayaIzdusum(TR: Pist, x: number, z: number, i: number): [number, number] {
  const N = TR.N;
  const yedek: [number, number] = [TR.S[i], Math.hypot(x - TR.P[i][0], z - TR.P[i][1])];
  for (let k = 0; k < 2; k++) {
    let a = k ? i : i - 1,
      b = k ? i + 1 : i;
    if (TR.open && (a < 0 || b >= N)) continue;
    a = (a + N) % N;
    b = b % N;
    const P = TR.P[a],
      Q = TR.P[b],
      Ta = TR.T[a],
      Tb = TR.T[b];
    // f(t) = (p − C(t)) · T(t): t = 0'da ≥ 0, t = 1'de ≤ 0 ise izdüşüm bu parçada
    const f = (t: number) => {
      const cx = P[0] + (Q[0] - P[0]) * t,
        cz = P[1] + (Q[1] - P[1]) * t,
        tx = Ta[0] + (Tb[0] - Ta[0]) * t,
        tz = Ta[1] + (Tb[1] - Ta[1]) * t;
      return ((x - cx) * tx + (z - cz) * tz) / (Math.hypot(tx, tz) || 1);
    };
    const f0 = f(0),
      f1 = f(1);
    if (f0 < 0 || f1 > 0) continue;
    // doğrusala yakın: iki adım kiriş yöntemi
    let t = f0 / (f0 - f1 || 1);
    const ft = f(t);
    t = ft > 0 ? t + ((1 - t) * ft) / (ft - f1 || 1) : (t * f0) / (f0 - ft || 1);
    t = cl(t, 0, 1);
    const cx = P[0] + (Q[0] - P[0]) * t,
      cz = P[1] + (Q[1] - P[1]) * t,
      l = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
    return [TR.S[a] + t * l, Math.hypot(x - cx, z - cz)];
  }
  return yedek;
}

export function Hkerb(TR: Pist) {
  return (x: number, z: number) => {
    const i = nearest(TR, x, z, ipucu.ti)[0];
    return TR.kb![i] ? kerbProf(parcayaIzdusum(TR, x, z, i)[1] - TR.hw) : 0;
  };
}

export interface Rampa {
  k: string;
  i: number;
  x: number;
  z: number;
  tx: number;
  tz: number;
  w: number;
}

/** rampa yüksekliği: kick (sıçrama), table (masa), bump (tümsek) */
export function jumpH(J: Rampa[], x: number, z: number): number {
  let h = 0;
  for (const j of J) {
    const dx = x - j.x,
      dz = z - j.z,
      s = dx * j.tx + dz * j.tz,
      l = Math.abs(-dx * j.tz + dz * j.tx);
    if (l > j.w + 6 || s < -30 || s > 30) continue;
    const w = cl((j.w + 6 - l) / 6, 0, 1);
    let p = 0;
    if (j.k == "kick") {
      if (s >= -18 && s < 0) p = 3.2 * Math.pow((s + 18) / 18, 1.6);
      else if (s >= 0 && s < 4) p = 3.2 * (1 - sm(0, 4, s));
    } else if (j.k == "table") p = 2.4 * sm(-16, -6, s) * (1 - sm(8, 18, s));
    else p = 1.4 * Math.exp(-((s / 6) ** 2));
    h += p * w;
  }
  return h;
}

export const mkJumps = (TR: Pist, list: [string, number][]): Rampa[] =>
  list.map(([k, f]) => {
    const i = idxAt(TR, f),
      p = TR.P[i],
      t = TR.T[i];
    return { k, i, x: p[0], z: p[1], tx: t[0], tz: t[1], w: TR.hw };
  });

/** pistin f oranında, merkezden lat kadar yanda nokta */
export const onTrack = (TR: Pist, f: number, lat?: number) => {
  const i = idxAt(TR, f),
    P = TR.P[i],
    T = TR.T[i];
  return { i, x: P[0] + T[1] * (lat || 0), z: P[1] - T[0] * (lat || 0) };
};

/** teğetin yön açısı */
export const angT = (T: V2) => Math.atan2(T[0], T[1]);

/** i noktasında, merkezden o kadar yanda (pozitif sağ) */
export const atTrack = (TR: Pist, i: number, o: number): V2 => {
  const P = TR.P[i],
    T = TR.T[i];
  return [P[0] + T[1] * o, P[1] - T[0] * o];
};

/** pistin her yerinden en az m uzakta mı (dönüşlerde karşı kola taşmasın) */
export const clearOf = (TR: Pist, x: number, z: number, m: number) => nearest(TR, x, z, 0, true)[1] > m;

/** hızlı en yakın nokta: 30 m'lik ızgarada (yükseklik hesabı için) */
export function gridNear(TR: Pist) {
  const GRD = new Map<string, number[]>();
  for (let i = 0; i < TR.N; i++) {
    const q = Math.floor(TR.P[i][0] / 30) + "," + Math.floor(TR.P[i][1] / 30);
    let a = GRD.get(q);
    if (!a) GRD.set(q, (a = []));
    a.push(i);
  }
  return (x: number, z: number): [number, number] => {
    let bi = 0,
      bd = 1e18;
    const cx = Math.floor(x / 30),
      cz = Math.floor(z / 30);
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        const L = GRD.get(cx + a + "," + (cz + b));
        if (L)
          for (const i of L) {
            const p = TR.P[i],
              q = (x - p[0]) ** 2 + (z - p[1]) ** 2;
            if (q < bd) {
              bd = q;
              bi = i;
            }
          }
      }
    return [bi, Math.sqrt(bd)];
  };
}

/** pist üzerinde s metredeki nokta ve yön (iki nokta arasında doğrusal) */
export function trackAt(TR: Pist, s: number) {
  const L = TR.len;
  s = TR.open ? cl(s, 0, TR.S[TR.N - 1]) : ((s % L) + L) % L;
  let lo = 0,
    hi = TR.N - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (TR.S[m] <= s) lo = m;
    else hi = m - 1;
  }
  const i = lo,
    j = TR.open ? Math.min(i + 1, TR.N - 1) : (i + 1) % TR.N,
    sl = (j > i ? TR.S[j] : TR.len) - TR.S[i] || 1,
    u = cl((s - TR.S[i]) / sl, 0, 1),
    P = TR.P[i],
    Q = TR.P[j],
    A = TR.T[i],
    B = TR.T[j];
  return {
    x: P[0] + (Q[0] - P[0]) * u,
    z: P[1] + (Q[1] - P[1]) * u,
    a: Math.atan2(A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u),
  };
}

/** eğrilik (rad/m) */
export const curvAt = (TR: Pist, s: number) => ad(trackAt(TR, s + 8).a - trackAt(TR, s - 8).a) / 16;
