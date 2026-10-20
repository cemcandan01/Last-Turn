// Ses ölçümü (testler ve motor sesi uydurma için): güç yoğunluğu, 1/3 oktav bant seviyeleri, harmonik oranı ve
// silindirler arası düzensizlik. Oyun kodu kullanmaz.
import { EQ_BANTLAR } from "../../src/ses/sentez";

/** yerinde radix-2 FFT (re, im; uzunluk 2'nin kuvveti) */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let b = n >> 1;
    for (; j & b; b >>= 1) j ^= b;
    j ^= b;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len,
      wr = Math.cos(a),
      wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1,
        ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k],
          ui = im[i + k],
          xr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci,
          xi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + xr;
        im[i + k] = ui + xi;
        re[i + k + len / 2] = ur - xr;
        im[i + k + len / 2] = ui - xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

/** Welch güç yoğunluğu: Hann pencereli, yarı örtüşen N'lik parçaların ortalaması. Döner: güç dizisi (N/2) */
export function guc(s: Float32Array, N: number): Float64Array {
  const P = new Float64Array(N / 2),
    w = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  let k = 0;
  for (let b = 0; b + N <= s.length; b += N / 2, k++) {
    const re = new Float64Array(N),
      im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = s[b + i] * w[i];
    fft(re, im);
    for (let i = 0; i < N / 2; i++) P[i] += re[i] * re[i] + im[i] * im[i];
  }
  for (let i = 0; i < N / 2; i++) P[i] /= Math.max(1, k);
  return P;
}

/** 1/3 oktav bant seviyeleri (dB, bantların toplam gücüne göre) */
export function bantlar(s: Float32Array, sr: number): number[] {
  const N = 8192,
    P = guc(s, N),
    df = sr / N,
    b = EQ_BANTLAR.map((f) => {
      let t = 0;
      const a = Math.ceil((f * 2 ** (-1 / 6)) / df),
        z = Math.min(N / 2 - 1, Math.floor((f * 2 ** (1 / 6)) / df));
      for (let i = a; i <= z; i++) t += P[i];
      return t;
    }),
    top = b.reduce((x, y) => x + y, 0) || 1;
  return b.map((x) => 10 * Math.log10(x / top + 1e-12));
}

/**
 * harmonik yapı: devir/120 Hz'in (yarım mertebe) katlarındaki gücün 40-2000 Hz toplamına oranı (h) ve bu gücün
 * ateşleme mertebesinin (silindir sayısı) katı olmayan yarım mertebelerdeki payı (duzensiz: lope, boxer homurtusu)
 */
export function harmonik(s: Float32Array, sr: number, devir: number, silindir: number) {
  const N = 16384,
    P = guc(s, N),
    df = sr / N,
    h0 = devir / 120;
  let top = 0,
    har = 0,
    duz = 0;
  for (let i = Math.ceil(40 / df); i < 2000 / df; i++) {
    const f = i * df,
      k = Math.round(f / h0);
    top += P[i];
    if (k >= 1 && Math.abs(f - k * h0) < Math.max(1.5 * df, 0.08 * h0)) {
      har += P[i];
      if (k % silindir) duz += P[i];
    }
  }
  return { h: har / (top || 1), duzensiz: duz / (har || 1) };
}

/** 16 bit PCM WAV oku (tek kanala indir) */
export function wavOku(b: Uint8Array): { s: Float32Array; sr: number } {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let o = 12,
    kanal = 1,
    sr = 44100,
    bit = 16;
  while (o + 8 <= b.length) {
    const id = String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]),
      n = v.getUint32(o + 4, true);
    if (id == "fmt ") {
      kanal = v.getUint16(o + 10, true);
      sr = v.getUint32(o + 12, true);
      bit = v.getUint16(o + 22, true);
    } else if (id == "data") {
      if (bit != 16) throw new Error("yalnız 16 bit");
      const m = Math.floor(n / 2 / kanal),
        s = new Float32Array(m);
      for (let i = 0; i < m; i++) {
        let t = 0;
        for (let c = 0; c < kanal; c++) t += v.getInt16(o + 8 + (i * kanal + c) * 2, true);
        s[i] = t / kanal / 32768;
      }
      return { s, sr };
    }
    o += 8 + n + (n & 1);
  }
  throw new Error("data yok");
}
