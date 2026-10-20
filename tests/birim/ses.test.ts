// Ses sentezi: motor katmanları dikişsiz döngü, sessiz değil, taşmıyor; araçların sesleri birbirinden farklı.
import { describe, expect, it } from "vitest";
import { cakil, carpma, katmanDevirleri, MOTORLAR, motorKatmani, patlama, valf } from "../../src/ses/sentez";

const SR = 22050;
const rms = (s: Float32Array, a = 0, b = s.length) => {
  let t = 0;
  for (let i = a; i < b; i++) t += s[i] * s[i];
  return Math.sqrt(t / (b - a));
};
const tepe = (s: Float32Array) => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

/** temel frekansın gücü: verilen frekansta Goertzel */
function guc(s: Float32Array, f: number) {
  const w = (2 * Math.PI * f) / SR,
    c = 2 * Math.cos(w);
  let a = 0,
    b = 0;
  for (const x of s) {
    const y = x + c * a - b;
    b = a;
    a = y;
  }
  return Math.sqrt(a * a + b * b - c * a * b) / s.length;
}

describe("motor sesi", () => {
  for (const [k, p] of Object.entries(MOTORLAR))
    it(k + " (" + p.ad + "): katmanlar dolu, taşmıyor, döngü dikişsiz", () => {
      for (const d of katmanDevirleri(7500))
        for (const yuk of [0, 1]) {
          const s = motorKatmani(p, d, yuk, 7500, SR);
          expect(s.every(Number.isFinite)).toBe(true);
          expect(rms(s)).toBeGreaterThan(0.1);
          expect(tepe(s)).toBeLessThanOrEqual(0.96);
          // döngü noktasındaki sıçrama, sinyalin içindeki en büyük örnekten örneğe değişimi aşmamalı
          let enb = 0;
          for (let i = 1; i < s.length; i++) enb = Math.max(enb, Math.abs(s[i] - s[i - 1]));
          expect(Math.abs(s[0] - s[s.length - 1])).toBeLessThanOrEqual(enb);
        }
    });

  it("ateşleme frekansı sesin içinde güçlü (sıra 4: 2 × devir/60)", () => {
    const d = 3000,
      s = motorKatmani(MOTORLAR.rx, d, 1, 7800, SR),
      f = (2 * d) / 60;
    // ateşleme frekansı, iki ateşleme arasındaki bir frekanstan belirgin güçlü
    expect(guc(s, f)).toBeGreaterThan(3 * guc(s, f * 1.37));
  });

  it("büyük kamlı V8 rölantide homurdanır (ateşleme frekansının yan bantları), V6 daha düzgün", () => {
    const d = 1000,
      oran = (s: Float32Array, f: number) => (guc(s, f * 0.875) + guc(s, f * 1.125)) / guc(s, f);
    // ateşleme frekansı: V8'de 4, V6'da 3 × devir/60
    expect(oran(motorKatmani(MOTORLAR.dg, d, 1, 6800, SR), (4 * d) / 60)).toBeGreaterThan(
      2 * oran(motorKatmani(MOTORLAR.gt, d, 1, 8000, SR), (3 * d) / 60),
    );
  });

  it("motorlar dolgun: orta devirde gazda 150 Hz altında da enerji var", () => {
    for (const [k, p] of Object.entries(MOTORLAR)) {
      const s = motorKatmani(p, 4500, 1, 7500, SR);
      const alt = [40, 60, 80, 100, 120].reduce((a, f) => a + guc(s, f), 0),
        ust = [200, 300, 400, 500, 600].reduce((a, f) => a + guc(s, f), 0);
      expect(alt / ust, k).toBeGreaterThan(0.08);
    }
  });

  it("gaz açıkken ses gaz kapalıdan daha parlak", () => {
    const parlaklik = (s: Float32Array) => {
      let a = 0;
      for (let i = 1; i < s.length; i++) a += (s[i] - s[i - 1]) ** 2;
      return Math.sqrt(a / s.length) / rms(s);
    };
    const p = MOTORLAR.dr;
    expect(parlaklik(motorKatmani(p, 4000, 1, 7600, SR))).toBeGreaterThan(
      parlaklik(motorKatmani(p, 4000, 0, 7600, SR)),
    );
  });
});

describe("efekt örnekleri", () => {
  it("çakıl, patlama, valf ve çarpma dolu ve taşmıyor", () => {
    for (const s of [cakil(SR), patlama(SR, 1), valf(SR, 1), valf(SR, 2), carpma(SR, 1)]) {
      expect(s.every(Number.isFinite)).toBe(true);
      expect(rms(s)).toBeGreaterThan(0.02);
      expect(tepe(s)).toBeLessThanOrEqual(0.96);
    }
  });
  it("patlama kısa: sonunda sönmüş", () => {
    const s = patlama(SR, 3);
    expect(rms(s, s.length - 400)).toBeLessThan(rms(s, 0, 800) * 0.2);
  });
});
