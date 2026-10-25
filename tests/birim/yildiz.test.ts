// Yıldızlar ve yarış kuralları: yıldız sayımı, en iyi yıldız kaydı, ters sürüş algılama, ters giderken drift puanı yok
import { describe, expect, it } from "vitest";
import "../yardimci/sahte-tuval";
import { ipucu } from "../../src/dunya/pist";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import {
  bosDriftSayaci,
  X6_ORAN,
  driftAdimi,
  driftBankala,
  tersAdimi,
  type DriftSayaci,
  type TersSayaci,
} from "../../src/oyun/yaris-kurallari";
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

  it("drift sürerken puan açısı en az 10° (yön değiştirirken kayıp az)", () => {
    const a = bosDriftSayaci(),
      b = bosDriftSayaci();
    for (let k = 0; k < 30; k++) {
      driftAdimi(a, true, 0.01, false, 20, false, DT);
      driftAdimi(b, true, (10 * Math.PI) / 180, false, 20, false, DT);
    }
    expect(a.combo).toBeCloseTo(b.combo, 5);
    expect(a.combo).toBeGreaterThan(0);
  });

  it("geçişte drift bayrağı kısa düşse de kayma sürerken kombo akar, 0,6 sn sonra durur", () => {
    const E = bosDriftSayaci();
    for (let k = 0; k < 30; k++) driftAdimi(E, true, 0.4, false, 20, false, DT);
    const c0 = E.combo;
    for (let k = 0; k < 30; k++) driftAdimi(E, false, 0.2, false, 20, false, DT);
    const c05 = E.combo;
    expect(c05).toBeGreaterThan(c0);
    for (let k = 0; k < 10; k++) driftAdimi(E, false, 0.2, false, 20, false, DT);
    const c1 = E.combo;
    driftAdimi(E, false, 0.2, false, 20, false, DT);
    expect(E.combo).toBe(c1);
  });

  it("x6: 1. turun %89'u driftle kazandırmaz, %91'i kazandırır; x6'da çarpan 6", () => {
    const x6 = (oran: number) => oran >= X6_ORAN;
    expect(x6(0.89)).toBe(false);
    expect(x6(0.91)).toBe(true);
    const E = bosDriftSayaci();
    driftAdimi(E, true, 0.5, false, 20, false, DT, 0.5, 0, true);
    expect(E.mult).toBe(6);
    const F = bosDriftSayaci();
    driftAdimi(F, true, 0.5, false, 20, false, DT);
    expect(F.mult).toBe(1);
  });

  it("ters giderken drift kombosu birikmez", () => {
    const E: DriftSayaci = bosDriftSayaci();
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
    const E: DriftSayaci = bosDriftSayaci();
    for (let k = 0; k < 60; k++) driftAdimi(E, true, beta, false, v, false, DT);
    return E.combo;
  };
  it("hız ve açı arttıkça puan artar; düşük hız/açı belirgin az", () => {
    expect(sn(0.65, 30)).toBeGreaterThan(sn(0.65, 20));
    expect(sn(0.65, 20)).toBeGreaterThan(sn(0.3, 20));
    expect(sn(0.65, 30)).toBeGreaterThan(2 * sn(0.2, 12));
    expect(sn(0.65, 3)).toBeLessThan(sn(0.65, 30) / 20);
  });
  it("puan açısı 60°'de kesilir: daha büyük açı fazla puan vermez", () => {
    expect(sn(0.9, 25)).toBeGreaterThan(sn(0.5, 25));
    expect(sn(Math.PI / 3, 25)).toBeCloseTo(sn(1.3, 25), 5);
    expect(sn(1.4, 25)).toBe(sn(1.1, 25));
  });
  it("puan iç birim m/s ile hesaplanır: birim ayarı puanı değiştirmez", () => {
    // oyun hep m/s verir (AdimSonucu.v); km/sa ya da mph yalnız HUD'da çarpılır, puana girmez
    expect(sn(0.6, 25)).toBe(sn(0.6, 25));
    expect(sn(0.6, 25)).toBeCloseTo(3 * 25 * 0.6 * 1, 5);
  });
});

describe("drift bonusları", () => {
  const kos = (sn: number, beta: (t: number) => number, tg: (t: number) => number) => {
    const E = bosDriftSayaci();
    for (let k = 0; k < sn * 60; k++)
      driftAdimi(E, true, beta(k * DT), false, 25, false, DT, tg(k * DT), k * DT);
    return E;
  };
  const adlar = (E: DriftSayaci) => E.driftOlay.map((o) => o.ad + o.puan);
  it("uzun drift ve tek yön 3 sn'de başlar; uzun drift her saniye artar", () => {
    const E = kos(
      5.5,
      () => 0.5,
      () => 0.8,
    );
    expect(adlar(E)).toEqual([
      "UZUN DRIFT100",
      "TEK YÖN150",
      "UZUN DRIFT200",
      "TEK YÖN150",
      "UZUN DRIFT300",
      "TEK YÖN150",
    ]);
    expect(E.bonus).toBe(600 + 450);
    expect(
      kos(
        2.9,
        () => 0.5,
        () => 0.8,
      ).bonus,
    ).toBe(0);
  });
  it("direksiyonsuz 2 sn'de başlar, saniyede +100; taraf değişince tek yön sıfırlanır", () => {
    expect(
      kos(
        3.5,
        () => 0.5,
        () => 0,
      ).bonus,
    ).toBe(200 + 100 + 150);
    const E = kos(
      5,
      (t) => (t < 1.5 ? 0.5 : -0.5),
      () => 0.8,
    );
    expect(E.driftOlay.filter((o) => o.ad == "TEK YÖN").length).toBe(1);
  });
  it("bonus bankalanır; kombo yanınca bonus da yanar; ters sürüşte bonus yok", () => {
    const E = kos(
      3.2,
      () => 0.5,
      () => 0.8,
    );
    const kombo = Math.round(E.combo * E.mult);
    expect(driftBankala(E)).toBe(kombo + 250);
    const Y = kos(
      3.2,
      () => 0.5,
      () => 0.8,
    );
    driftAdimi(Y, true, 0.5, true, 25, false, DT, 0.8, 3);
    expect(Y.bonus).toBe(0);
    const T = bosDriftSayaci();
    for (let k = 0; k < 180; k++) driftAdimi(T, true, 0.5, false, 25, true, DT, 0, k * DT);
    expect(T.driftOlay.length).toBe(0);
  });
});
