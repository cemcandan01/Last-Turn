// Asfalt temasının pürüzü ve yanal kızakta kauçuğun ötüşü için çevrimdışı PCM üretimi.
const sampleRate = 22050;
export const tireNames = ["lastik-asfalt", "savrulma"];

function bandpass(hz, q) {
  const omega = (2 * Math.PI * hz) / sampleRate;
  const alpha = Math.sin(omega) / (2 * q);
  const b = alpha / (1 + alpha);
  const a1 = (2 * Math.cos(omega)) / (1 + alpha);
  const a2 = (alpha - 1) / (1 + alpha);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = b * (x - x2) + a1 * y1 + a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

export function renderTire(name) {
  if (!tireNames.includes(name)) throw Error("Bilinmeyen asfalt katmanı: " + name);
  const slide = name === "savrulma";
  let seed = slide ? 227 : 341;
  const noise = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
  const body = bandpass(slide ? 900 : 610, 0.9);
  const rubber = bandpass(slide ? 1560 : 1230, slide ? 3.7 : 1.45);
  const grit = bandpass(slide ? 2300 : 2940, 1.4);
  const n = sampleRate * (slide ? 5 : 4), overlap = 2048;
  const pcm = new Float64Array(n + overlap);
  let grain = 0, envelope = 0, target = 0;
  for (let i = 0; i < pcm.length; i++) {
    if (i % 733 === 0) target = noise();
    envelope += (target - envelope) * 0.0015;
    grain += 0.019 * (noise() - grain);
    const excitation = noise();
    pcm[i] = (1 + envelope * 0.24) * (
      0.6 * body(excitation) +
      (slide ? 1.8 : 0.9) * rubber(excitation) +
      (0.38 + grain) * grit(excitation)
    );
  }
  // Döngü sonundan sonra üretilmiş örneklerle başı birleştir. Araç uzun süre
  // kayarken dikişte sessizlik veya ani genlik sıçraması duyulmaz.
  for (let i = 0; i < overlap; i++) {
    const t = (Math.PI / 2) * i / (overlap - 1);
    pcm[i] = Math.cos(t) * pcm[n + i] + Math.sin(t) * pcm[i];
  }
  let sum = 0;
  for (let i = 0; i < n; i++) sum += pcm[i] * pcm[i];
  const gain = (slide ? 0.085 : 0.13) / Math.sqrt(sum / n);
  const data = Buffer.alloc(44 + n * 2);
  data.write("RIFF"); data.writeUInt32LE(data.length - 8, 4); data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24); data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write("data", 36);
  data.writeUInt32LE(n * 2, 40);
  sum = 0;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const value = Math.round(pcm[i] * gain * 32767);
    data.writeInt16LE(value, 44 + i * 2);
    const x = value / 32767;
    sum += x * x;
    peak = Math.max(peak, Math.abs(x));
  }
  return { data, channels: 1, seconds: n / sampleRate, rms: Math.sqrt(sum / n), peak };
}
