// Çok araçlı altyapı: girdi kaydı ve yeniden oynatma (belirlenimcilik), araç örneklerinin birbirinden bağımsızlığı,
// anlık görüntü ve uzak aracın yumuşatılması.
import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../src/cekirdek/rastgele";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import {
  anlikDiziden,
  anlikDiziye,
  ANLIK_ALANLARI,
  bosAnlik,
  uzakAnlikEkle,
  uzakAracYap,
  uzakGuncelle,
} from "../../src/fizik/anlik";
import {
  aracAdimi,
  aracAnligi,
  aracOrnegiYap,
  aracSifirla,
  type AracOrnegi,
} from "../../src/fizik/arac-ornegi";
import { kaydiCoz, kaydiOynat, kaydiSerilestir } from "../../src/fizik/girdi-kaydi";
import type { FizikGirdisi } from "../../src/fizik/tipler";
import { egrilik, pilot } from "../yardimci/pilot";
import { surucuKur } from "../yardimci/surucu";

/** bir pistte araç örneği: test sürücüsünün dünya bağlamıyla */
function ornek(yaris: number, arac: number, i0: number) {
  const s = surucuKur({ yaris, arac, lk: "real" });
  const TR = s.bolge!.TR!,
    P = TR.P[i0];
  const a = aracOrnegiYap(s.cx, 7);
  const koy = () => {
    s.reset(P[0], P[1], Math.atan2(TR.T[i0][0], TR.T[i0][1]));
    aracSifirla(a, P[0], P[1], Math.atan2(TR.T[i0][0], TR.T[i0][1]), s.sim.S.y);
  };
  koy();
  return { s, a, TR, koy };
}

/** karşılaştırma için durumun bütün sayıları */
function durum(a: AracOrnegi) {
  const Y = a.sim.yeni!;
  return {
    S: { ...a.sim.S },
    DR: { ...a.sim.d.DR },
    D: { ...a.sim.d.D },
    st: a.sim.d.st,
    Y: { ...Y, tk: Y.tk.map((t) => ({ ...t })) },
  };
}

describe("girdi kaydı ve yeniden oynatma", () => {
  it("kayıt iki kez oynatılınca aynı son durum, canlı sürüşle de aynı", () => {
    const { a, TR } = ornek(pistNo("rx", 3), 1, 10);
    // pilot + gürültülü analog girdi (tuş ve analog karışık), çarpışmalar dahil
    const pl = pilot(TR, egrilik(TR), 1.1),
      r = mulberry32(3);
    for (let k = 0; k < 1500; k++) {
      const g = pl(a.sim.S);
      const gi: FizikGirdisi =
        k % 300 < 150
          ? g
          : {
              tg: g.tg + (r() - 0.5) * 0.6,
              g: r(),
              b: r() < 0.1 ? r() : 0,
              analogDireksiyon: true,
              analogGaz: true,
              // debriyaj vuruşu da kayda girer (5 sn'de bir 0,17 sn: araç yine yol alır)
              dbr: k % 300 >= 280 && k % 300 < 290,
            };
      aracAdimi(a, gi);
    }
    const canli = durum(a);
    expect(a.kayit.n).toBe(1500);
    expect(a.kayit.kesik).toBe(false);
    expect(Math.hypot(a.sim.S.x - TR.P[10][0], a.sim.S.z - TR.P[10][1]), "araç yol aldı").toBeGreaterThan(
      200,
    );

    const oyna = () => {
      const b = aracOrnegiYap(a.cx, 99);
      kaydiOynat(a.kayit, b.cx, b.sim);
      return durum(b);
    };
    const bir = oyna(),
      iki = oyna();
    expect(iki).toEqual(bir);
    expect(bir).toEqual(canli);

    // metne çevrilip geri okunan kayıt da aynı sonucu verir
    const metin = kaydiSerilestir(a.kayit),
      k2 = kaydiCoz(metin);
    expect(k2.n).toBe(1500);
    const b = aracOrnegiYap(a.cx, 1);
    kaydiOynat(k2, b.cx, b.sim);
    expect(durum(b)).toEqual(canli);
    // bellek hafif: adım başına 8 bayt (base64 ile ~11 karakter)
    expect(metin.length).toBeLessThan(1500 * 12 + 600);
  });

  it("sıfırlama rastgeleliği ve drift durumunu da sıfırlar", () => {
    const { a, koy } = ornek(pistNo("gp", 2), 2, 20);
    const sur = () => {
      for (let k = 0; k < 400; k++)
        aracAdimi(a, { tg: k % 120 < 60 ? 1 : -1, g: 1, b: 0, analogDireksiyon: false, analogGaz: false });
      return durum(a);
    };
    const ilk = sur();
    koy();
    expect(sur()).toEqual(ilk);
  });
});

describe("araç örnekleri birbirinden bağımsız", () => {
  it("iki araç sırayla adımlanınca her biri tek başına sürülmüş gibi", () => {
    const gi = (k: number, i: number): FizikGirdisi => ({
      tg: Math.sin(k / (40 + i * 13)),
      g: 1,
      b: 0,
      analogDireksiyon: true,
      analogGaz: false,
    });
    const tek = (i: number) => {
      const { a } = ornek(pistNo("gp", 3), i, 10 + i * 30);
      for (let k = 0; k < 600; k++) aracAdimi(a, gi(k, i));
      return durum(a);
    };
    const t0 = tek(0),
      t1 = tek(4);
    const A = ornek(pistNo("gp", 3), 0, 10).a,
      B = ornek(pistNo("gp", 3), 4, 130).a;
    for (let k = 0; k < 600; k++) {
      aracAdimi(A, gi(k, 0));
      aracAdimi(B, gi(k, 4));
    }
    expect(durum(A)).toEqual(t0);
    expect(durum(B)).toEqual(t1);
  });
});

describe("anlık görüntü ve uzak araç", () => {
  it("anlık görüntü düz sayı dizisine çevrilir ve geri okunur", () => {
    const { a } = ornek(pistNo("gp", 1), 0, 5);
    for (let k = 0; k < 120; k++)
      aracAdimi(a, { tg: 0.3, g: 1, b: 0, analogDireksiyon: true, analogGaz: false });
    const an = aracAnligi(a);
    for (const k of ANLIK_ALANLARI) expect(typeof an[k], k).toBe("number");
    expect(anlikDiziden(Float64Array.from(anlikDiziye(an)))).toEqual(an);
    expect(JSON.parse(JSON.stringify(an))).toEqual(an);
  });

  it("uzak araç seyrek görüntüler arasında yumuşak ilerler, sıra dışı görüntüyü atar", () => {
    const u = uzakAracYap("u", 0, 0.12);
    const gor = (t: number) => Object.assign(bosAnlik(), { t, x: 20 * t, vx: 20 });
    // 15 Hz görüntü, 60 Hz çizim; konum her karede ileri gider ve gerçek konumun ~gecikme kadar gerisinde kalır
    let son = -1e9,
      geri = 0;
    for (let f = 0; f < 240; f++) {
      const t = f / 60;
      if (f % 4 == 0) uzakAnlikEkle(u, gor(t));
      if (f == 100) uzakAnlikEkle(u, gor(t - 0.5)); // gecikmiş eski paket
      uzakGuncelle(u, 1 / 60);
      if (f > 30) {
        expect(u.goster.x, `kare ${f}`).toBeGreaterThanOrEqual(son);
        geri = 20 * t - u.goster.x;
      }
      son = u.goster.x;
    }
    expect(geri).toBeGreaterThan(0);
    expect(geri).toBeLessThan(20 * 0.35);
    // görüntü kesilince sınırlı ileri tahmin, sonra durur
    for (let f = 0; f < 120; f++) uzakGuncelle(u, 1 / 60);
    expect(u.goster.x).toBeLessThan(20 * (4 + u.tahmin) + 0.01);
  });
});
