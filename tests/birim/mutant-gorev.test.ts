import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../src/cekirdek/rastgele";
import {
  bosGorev,
  gorevAdimi,
  gorevCek,
  gorevOdulu,
  YOL_GOREVI,
  type GorevGirdisi,
  type YolGorevi,
} from "../../src/oyun/mutant-gorev";

const DT = 1 / 60;
const girdi = (o: Partial<GorevGirdisi> = {}): GorevGirdisi => ({
  v: 20,
  havada: false,
  drift: false,
  carpti: false,
  x: 0,
  z: 0,
  engeller: [],
  ...o,
});
const gorev = (tur: YolGorevi["tur"], hedef: number): YolGorevi => ({
  tur,
  hedef,
  ilerleme: 0,
  kalan: YOL_GOREVI.sure,
  para: 40,
  enerji: 20,
});

describe("LT-SYS-007 yol görevleri", () => {
  it("sürerken ilk bekleme bitince görev çıkar; dururken çıkmaz", () => {
    const g = bosGorev(),
      cek = () => gorev("hiz", 100);
    for (let n = 0; n < 20 * 60; n++) expect(gorevAdimi(g, girdi({ v: 0 }), DT, cek)).toBeNull();
    let olay = null;
    for (let n = 0; n < (YOL_GOREVI.ilkBekleme + 0.1) * 60 && !olay; n++)
      olay = gorevAdimi(g, girdi(), DT, cek);
    expect(olay?.tur).toBe("basladi");
    expect(g.aktif?.tur).toBe("hiz");
  });

  it("drift kesintisiz sayılır; bırakınca sıfırlanır; hedefe ulaşınca tamam", () => {
    const g = { ...bosGorev(), aktif: gorev("drift", 3) };
    for (let n = 0; n < 2 * 60; n++) gorevAdimi(g, girdi({ drift: true }), DT, () => gorev("hiz", 1));
    gorevAdimi(g, girdi(), DT, () => gorev("hiz", 1));
    expect(g.aktif!.ilerleme).toBe(0);
    let son = null;
    for (let n = 0; n < 3.1 * 60 && !son; n++)
      son = gorevAdimi(g, girdi({ drift: true }), DT, () => gorev("hiz", 1));
    expect(son?.tur).toBe("tamam");
    expect(g.tamamlanan).toBe(1);
    expect(g.bekleme).toBe(YOL_GOREVI.aralik);
  });

  it("süre biterse görev kaçar, cezasız", () => {
    const g = { ...bosGorev(), aktif: gorev("hiz", 300) };
    let son = null;
    for (let n = 0; n < (YOL_GOREVI.sure + 1) * 60 && !son; n++)
      son = gorevAdimi(g, girdi(), DT, () => gorev("hiz", 1));
    expect(son?.tur).toBe("kacti");
    expect(g.tamamlanan).toBe(0);
  });

  it("kıl payı: hızlı yaklaşıp çarpmadan uzaklaşınca bir sayılır; çarparsa sayılmaz", () => {
    const g = { ...bosGorev(), aktif: gorev("kilpayi", 2) },
      e = [{ id: "a", x: 0, z: 0, r: 1 }],
      c = () => gorev("hiz", 1);
    gorevAdimi(g, girdi({ x: 2, engeller: e }), DT, c);
    gorevAdimi(g, girdi({ x: 8, engeller: e }), DT, c);
    expect(g.aktif!.ilerleme).toBe(1);
    gorevAdimi(g, girdi({ x: 2, engeller: e }), DT, c);
    gorevAdimi(g, girdi({ x: 2, engeller: e, carpti: true }), DT, c);
    gorevAdimi(g, girdi({ x: 8, engeller: e }), DT, c);
    expect(g.aktif!.ilerleme).toBe(1);
    // yavaşken yaklaşmak sayılmaz
    gorevAdimi(g, girdi({ x: 2, v: 5, engeller: e }), DT, c);
    gorevAdimi(g, girdi({ x: 8, engeller: e }), DT, c);
    expect(g.aktif!.ilerleme).toBe(1);
  });

  it("çekilen görev: hız hedefi aracın son hızının %85'ini aşmaz; sıçrama yalnız rampaya yakın; ödül bölgeyle artar", () => {
    const r = mulberry32(5);
    for (let n = 0; n < 200; n++) {
      const g = gorevCek(r, 1, 140, 5000);
      expect(g.tur).not.toBe("sicrama");
      if (g.tur == "hiz") expect(g.hedef).toBeLessThanOrEqual(140 * 0.85);
    }
    const turler = new Set(Array.from({ length: 200 }, () => gorevCek(r, 2, 180, 100).tur));
    expect(turler.has("sicrama")).toBe(true);
    expect(gorevOdulu(3).para).toBeGreaterThan(gorevOdulu(1).para);
  });
});
