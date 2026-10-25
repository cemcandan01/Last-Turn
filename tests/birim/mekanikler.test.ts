import { describe, expect, it } from "vitest";
import { cl } from "../../src/cekirdek/matematik";
import {
  ADIM_ISLEM_SINIRI,
  DRIFT_HARVESTER,
  MEKANIK_SISTEMI_ACIK,
  NEDENSEL_DERINLIK,
  driftGozlemcisi,
  driftGozlemiBaslat,
  mekanikAdimi,
  mekanikBaslat,
  type GirisOlayi,
  type MekanikTanim,
} from "../../src/cekirdek/mekanikler";
import type { FizikGirdisi } from "../../src/fizik/tipler";
import { surucuKur } from "../yardimci/surucu";

const DT = 1 / 60;
const tik = (
  sira: number,
  ek: Partial<Extract<GirisOlayi, { tur: "DriftTickQualified" }>> = {},
): GirisOlayi => ({
  tur: "DriftTickQualified",
  sira,
  dt: DT,
  hiz: 24,
  aci: 0.5,
  ...ek,
});
const gir = (g: number, tg: number): FizikGirdisi => ({
  tg,
  g,
  b: 0,
  analogDireksiyon: true,
  analogGaz: false,
});

describe("LT-SYS-001 mekanik yürütücü", () => {
  it("bayrak kapalı; kapalı yürütücü aynı durum nesnesini döndürür", () => {
    expect(MEKANIK_SISTEMI_ACIK).toBe(false);
    const ilk = mekanikBaslat();
    expect(mekanikAdimi(ilk, [tik(0)], [DRIFT_HARVESTER])).toBe(ilk);
  });
  it("aynı sıra numaralı olay ikinci kez ödül vermez", () => {
    const a = mekanikAdimi(mekanikBaslat(), [tik(0)], [DRIFT_HARVESTER], true);
    const b = mekanikAdimi(a, [tik(0)], [DRIFT_HARVESTER], true);
    expect(a.enerji).toBeCloseTo(6 * DT, 10);
    expect(b.enerji).toBe(a.enerji);
  });
  it("aynı mekanik iki kez takılınca yığılmaz", () => {
    const a = mekanikAdimi(mekanikBaslat(), [tik(0)], [DRIFT_HARVESTER, DRIFT_HARVESTER], true);
    expect(a.enerji).toBeCloseTo(6 * DT, 10);
    expect(a.telemetri[DRIFT_HARVESTER.id].tetik).toBe(1);
  });
  it("Harvester saniye biriminde: 1 sn nitelikli drift = 6 enerji", () => {
    let d = mekanikBaslat();
    for (let i = 0; i < 60; i++) d = mekanikAdimi(d, [tik(i)], [DRIFT_HARVESTER], true);
    expect(d.enerji).toBeCloseTo(6, 6);
  });
  it("koşul altındaki hız/açı, geçersiz dt ve drift başlangıç/bitiş olayları enerji vermez", () => {
    const d = mekanikAdimi(
      mekanikBaslat(),
      [
        { tur: "DriftStarted", sira: 0, yon: 1 },
        tik(1, { hiz: 10.9 }),
        tik(2, { aci: 0.19 }),
        tik(3, { dt: 0 }),
        tik(4, { dt: Number.NaN }),
        { tur: "DriftEnded", sira: 5, sure: 2, spin: false },
      ],
      [DRIFT_HARVESTER],
      true,
    );
    expect(d.enerji).toBe(0);
    expect(d.sonSira).toBe(5);
  });
  it("enerji 0 ile kapasite arasında kalır, uzun driftte taşmaz", () => {
    let d = mekanikBaslat(2, 1.99);
    for (let i = 0; i < 600; i++) d = mekanikAdimi(d, [tik(i)], [DRIFT_HARVESTER], true);
    expect(d.enerji).toBe(2);
    expect(d.telemetri[DRIFT_HARVESTER.id].kazanc).toBeCloseTo(0.01, 9);
  });
  it("aynı girdiler aynı sonucu verir", () => {
    const kos = () => {
      let d = mekanikBaslat();
      for (let i = 0; i < 120; i++)
        d = mekanikAdimi(d, [tik(i, { aci: i % 2 ? -0.4 : 0.5 })], [DRIFT_HARVESTER], true);
      return d;
    };
    expect(kos()).toEqual(kos());
  });
  it("karşılıklı enerji tetikleyen iki mekanik sonlu: her mekanik bir adımda en çok bir kez", () => {
    const yanki = (id: string): MekanikTanim => ({
      id,
      versiyon: 1,
      kategori: "passive",
      tetik: "EnergyGained",
      maliyet: 0,
      beklemeAdimi: 0,
      kazanc: 1,
      kazancBirimi: "olay",
    });
    const d = mekanikAdimi(mekanikBaslat(1000), [tik(0)], [DRIFT_HARVESTER, yanki("a"), yanki("b")], true);
    expect(d.telemetri.a.tetik).toBe(1);
    expect(d.telemetri.b.tetik).toBe(1);
    expect(d.enerji).toBeCloseTo(2 + 6 * DT, 9);
    expect(NEDENSEL_DERINLIK).toBeGreaterThanOrEqual(1);
  });
  it("aynı adımda iki nitelikli drift adımı tek ödül verir", () => {
    const d = mekanikAdimi(mekanikBaslat(), [tik(0), tik(1)], [DRIFT_HARVESTER], true);
    expect(d.enerji).toBeCloseTo(6 * DT, 10);
  });
  it("adım işlem sınırı aşılınca kalan olaylar atılıp sayılır", () => {
    const olaylar = Array.from({ length: ADIM_ISLEM_SINIRI + 10 }, (_, i) => tik(i));
    const d = mekanikAdimi(mekanikBaslat(), olaylar, [DRIFT_HARVESTER], true);
    expect(d.telemetri[DRIFT_HARVESTER.id].tetik).toBe(1);
    // 10 fazla girdi + Harvester'ın kuyruğun sonuna eklenen türev EnergyGained olayı
    expect(d.kesilen).toBe(11);
    expect(d.sonSira).toBe(ADIM_ISLEM_SINIRI + 9);
  });
  it("bekleme ve maliyet: yeteneği enerji yetmezse ya da beklemedeyken tetiklemez", () => {
    const yetenek: MekanikTanim = {
      id: "deneme-yetenek",
      versiyon: 1,
      kategori: "active",
      tetik: "AbilityActivated",
      maliyet: 5,
      beklemeAdimi: 2,
      kazanc: 0,
      kazancBirimi: "olay",
    };
    const bas = (s: number): GirisOlayi => ({ tur: "AbilityActivated", sira: s, yetenek: "deneme-yetenek" });
    let d = mekanikAdimi(mekanikBaslat(100, 4), [bas(0)], [yetenek], true);
    expect(d.enerji).toBe(4);
    d = mekanikAdimi(mekanikBaslat(100, 20), [bas(0)], [yetenek], true);
    expect(d.enerji).toBe(15);
    d = mekanikAdimi(d, [bas(1)], [yetenek], true);
    d = mekanikAdimi(d, [bas(2)], [yetenek], true);
    expect(d.enerji).toBe(15);
    d = mekanikAdimi(d, [bas(3)], [yetenek], true);
    expect(d.enerji).toBe(10);
  });
});

describe("LT-SYS-001 drift gözlemcisi (gerçek fizik, Boş Otopark, Beyaz Kurt)", () => {
  /** drift önayarıyla ölçülü drift (fizik.test 'drift dengesi' usta senaryosu); gözlemci isteğe bağlı */
  function kos(gozle: boolean, sur: "usta" | "abartan") {
    const s = surucuKur({ dunya: 1, arac: 2, pk: "dr", lk: "real" });
    s.reset(30, -3550, 0);
    const { DR, D } = s.sim.d;
    let g = driftGozlemiBaslat(),
      m = mekanikBaslat(),
      ph = 0;
    const tum: GirisOlayi[] = [];
    for (let k = 0; k < 9 / DT; k++) {
      if (k == Math.round(3 / DT)) ph = 1;
      let sa = 0;
      if (ph == 1) {
        sa = 1;
        if (DR.on) ph = 2;
      } else if (ph == 2) sa = sur == "usta" ? DR.dir * cl(2.2 * (0.55 - Math.abs(D.beta)), -1, 1) : DR.dir;
      s.adim(gir(1, sa));
      if (gozle) {
        const r = driftGozlemcisi(g, s.sim.d, DT);
        g = r.g;
        tum.push(...r.olaylar);
        m = mekanikAdimi(m, r.olaylar, [DRIFT_HARVESTER], true);
      }
    }
    return { durum: JSON.stringify(s.sim.d), m, tum, spin: s.olaylar.spin };
  }

  it("gözlemci + yürütücü fizik durumunu değiştirmez", () => {
    expect(kos(true, "usta").durum).toBe(kos(false, "usta").durum);
  });
  it("ölçülü drift enerji üretir; olaylar başla → nitelikli adımlar sırasıyla, sıra kesin artan", () => {
    const r = kos(true, "usta");
    expect(r.tum[0]?.tur).toBe("DriftStarted");
    expect(r.m.enerji).toBeGreaterThan(10);
    expect(r.m.enerji).toBeLessThanOrEqual(6 * 6 + 1e-9);
    for (let i = 1; i < r.tum.length; i++) expect(r.tum[i].sira).toBeGreaterThan(r.tum[i - 1].sira);
  });
  it("bilinçli drift kapalıyken savrulma (D.act=1, büyük açı) olay ve enerji üretmez", () => {
    const d = {
      S: { vx: 0, vz: 30, air: false },
      DR: { on: 0, dir: 1, cool: 0 },
      D: { act: 1, beta: 0.9 },
    } as unknown as Parameters<typeof driftGozlemcisi>[1];
    let g = driftGozlemiBaslat(),
      m = mekanikBaslat();
    for (let i = 0; i < 120; i++) {
      const r = driftGozlemcisi(g, d, DT);
      g = r.g;
      expect(r.olaylar).toEqual([]);
      m = mekanikAdimi(m, r.olaylar, [DRIFT_HARVESTER], true);
    }
    expect(m.enerji).toBe(0);
  });
  it("havadayken drift modu açık kalsa da nitelikli adım üretilmez", () => {
    const d = {
      S: { vx: 0, vz: 30, air: true },
      DR: { on: 1, dir: 1, cool: 0 },
      D: { act: 1, beta: 0.5 },
    } as unknown as Parameters<typeof driftGozlemcisi>[1];
    const r = driftGozlemcisi(driftGozlemiBaslat(), d, DT);
    expect(r.olaylar.map((o) => o.tur)).toEqual(["DriftStarted"]);
  });
  it("abartan sürüş spinle biter ve DriftEnded spin olarak işaretlenir", () => {
    const r = kos(true, "abartan");
    expect(r.spin).toBeGreaterThan(0);
    expect(r.tum.some((o) => o.tur == "DriftEnded" && o.spin)).toBe(true);
  });
  it("aynı girdilerle iki koşu aynı enerji ve olay dizisini üretir", () => {
    const a = kos(true, "usta"),
      b = kos(true, "usta");
    expect(a.m).toEqual(b.m);
    expect(a.tum).toEqual(b.tum);
  });
});
