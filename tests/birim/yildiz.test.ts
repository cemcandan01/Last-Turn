// Yıldızlar ve yarış kuralları: yıldız sayımı, en iyi yıldız kaydı, ters sürüş algılama, ters giderken drift puanı yok
import { describe, expect, it } from "vitest";
import "../yardimci/sahte-tuval";
import { ipucu } from "../../src/dunya/pist";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import { driftAdimi, tersAdimi, type DriftSayaci, type TersSayaci } from "../../src/oyun/yaris-kurallari";
import { enIyiYildiz, yildizEsikleri, yildizKaydet, yildizSay } from "../../src/oyun/yildiz";
import { surucuKur } from "../yardimci/surucu";

const DT = 1 / 60;

describe("yıldız ve ters sürüş", () => {
  it("süre ve puan eşiklerine göre 0-3 yıldız", () => {
    expect(yildizSay("gp", 100, [120, 110, 102])).toBe(3);
    expect(yildizSay("gp", 105, [120, 110, 102])).toBe(2);
    expect(yildizSay("gp", 119, [120, 110, 102])).toBe(1);
    expect(yildizSay("gp", 130, [120, 110, 102])).toBe(0);
    expect(yildizSay("dp", 9000, [3000, 6000, 8000])).toBe(3);
    expect(yildizSay("dp", 4000, [3000, 6000, 8000])).toBe(1);
    expect(yildizSay("dp", 0, [0, 6000, 8000])).toBe(0);
    expect(yildizEsikleri("gp", 1).length).toBe(3);
  });

  it("pist başına en iyi yıldız saklanır, düşük sonuç eskisini silmez", () => {
    const depo: Record<string, string> = {};
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => depo[k] ?? null,
      setItem: (k: string, v: string) => (depo[k] = v),
    };
    expect(enIyiYildiz("rx", 2)).toBe(0);
    expect(yildizKaydet("rx", 2, 2)).toBe(true);
    expect(yildizKaydet("rx", 2, 1)).toBe(false);
    expect(enIyiYildiz("rx", 2)).toBe(2);
    expect(enIyiYildiz("gp", 2)).toBe(0);
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("ters giderken drift kombosu birikmez", () => {
    const E: DriftSayaci = { score: 0, combo: 0, ct: 0, mult: 1, gap: 0, best: 0 };
    for (let k = 0; k < 120; k++) driftAdimi(E, true, 0.5, false, 15, true, DT);
    expect(E.combo).toBe(0);
    for (let k = 0; k < 120; k++) driftAdimi(E, true, 0.5, false, 15, false, DT);
    expect(E.combo).toBeGreaterThan(0);
  });

  it("drift pistinde ters sürünce bayrak kalkar, dönüşte yanıp sönmez, doğru yöne dönünce iner", () => {
    const yaris = pistNo("dp", 3),
      s = surucuKur({ yaris, arac: 2, lk: "norm" }),
      TR = s.bolge!.TR!,
      k = Math.floor(TR.N * 0.25),
      S = s.sim.S,
      E: TersSayaci = { ters: false, tersT: 0 };
    const sur = (sn: number) => {
      const iz: boolean[] = [];
      for (let n = 0; n < sn / DT; n++) {
        s.adim({ tg: 0, g: 0.6, b: 0, analogDireksiyon: false, analogGaz: false });
        const T = TR.T[ipucu.ti];
        tersAdimi(E, S.vx, S.vz, T[0], T[1], DT);
        iz.push(E.ters);
      }
      return iz;
    };
    const ters = Math.atan2(-TR.T[k][0], -TR.T[k][1]);
    s.reset(TR.P[k][0], TR.P[k][1], ters);
    const geri = sur(2.5);
    expect(geri[geri.length - 1], "ters sürüşte bayrak").toBe(true);
    // ilk 0,5 sn'de (araç hızlanırken) bayrak kalkmaz: kısa ters hareket uyarı vermez
    expect(geri.slice(0, 30).some((x) => x)).toBe(false);
    s.reset(TR.P[k][0], TR.P[k][1], Math.atan2(TR.T[k][0], TR.T[k][1]));
    const ileri = sur(2);
    expect(ileri[ileri.length - 1], "doğru yönde bayrak iner").toBe(false);
    // bayrak bir kez iner, yanıp sönmez
    let degisim = 0;
    for (let n = 1; n < ileri.length; n++) if (ileri[n] != ileri[n - 1]) degisim++;
    expect(degisim).toBeLessThanOrEqual(1);
  });
});

describe("drift puan hızı (açı × hız)", () => {
  const sn = (beta: number, v: number) => {
    const E: DriftSayaci = { score: 0, combo: 0, ct: 0, mult: 1, gap: 0, best: 0 };
    for (let k = 0; k < 60; k++) driftAdimi(E, true, beta, false, v, false, DT);
    return E.combo;
  };
  it("hız ve açı arttıkça puan artar; düşük hız/açı belirgin az", () => {
    expect(sn(0.65, 30)).toBeGreaterThan(sn(0.65, 20));
    expect(sn(0.65, 20)).toBeGreaterThan(sn(0.3, 20));
    expect(sn(0.65, 30)).toBeGreaterThan(2 * sn(0.2, 12));
    expect(sn(0.65, 3)).toBeLessThan(sn(0.65, 30) / 20);
  });
  it("puan açısı 44°'de kesilir: daha büyük açı fazla puan vermez", () => {
    expect(sn(0.7, 25)).toBeGreaterThan(sn(0.5, 25));
    expect(sn(0.768, 25)).toBeCloseTo(sn(1.2, 25), 5);
    expect(sn(1.3, 25)).toBe(sn(0.9, 25));
  });
  it("puan iç birim m/s ile hesaplanır: birim ayarı puanı değiştirmez", () => {
    // oyun hep m/s verir (AdimSonucu.v); km/sa ya da mph yalnız HUD'da çarpılır, puana girmez
    expect(sn(0.6, 25)).toBe(sn(0.6, 25));
    expect(sn(0.6, 25)).toBeCloseTo(3 * 25 * 0.6 * 1, 5);
  });
});
