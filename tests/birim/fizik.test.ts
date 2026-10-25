// Fizik motoru testleri: kararlılık, temel değerler, kullanıcı kararları (spin, drift, kalkış), sağlamlık
import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { cl } from "../../src/cekirdek/matematik";
import { mulberry32 } from "../../src/cekirdek/rastgele";
import { ipucu } from "../../src/dunya/pist";
import type { FizikGirdisi } from "../../src/fizik/tipler";
import { duzZemin, frensiz } from "../yardimci/denemeler";
import { DRIFT_PILOT, driftTuru } from "../yardimci/drift-pilot";
import { surucuKur } from "../yardimci/surucu";
import { titresimOlc } from "../yardimci/titresim";
import { driftGirisi } from "../yardimci/debriyaj";
import { pistNo, TDEF } from "../../src/dunya/pist-tanimlari";

const DT = 1 / 60;
const gir = (g = 0, b = 0, tg = 0, analogGaz = false, analogDireksiyon = false): FizikGirdisi => ({
  tg,
  g,
  b,
  analogDireksiyon,
  analogGaz,
});
const sonlu = (...a: number[]) => a.every(Number.isFinite);

describe("kararlılık ve temel değerler", () => {
  for (let ci = 0; ci < CARS.length; ci++)
    it(CARS[ci].n, () => {
      const s = surucuKur({ dunya: 0, arac: ci, lk: "norm" });
      const S = s.sim.S;
      // duruş: kıpırdamamalı, salınmamalı
      s.reset(210, -780, 0);
      let ymin = 1e9,
        ymax = -1e9;
      for (let k = 0; k < 180; k++) {
        s.adim(gir());
        if (k > 60) {
          ymin = Math.min(ymin, S.y);
          ymax = Math.max(ymax, S.y);
        }
      }
      expect(Math.hypot(S.x - 210, S.z + 780), "duruşta kayma (m)").toBeLessThan(0.01);
      expect(ymax - ymin, "duruşta salınım (m)").toBeLessThan(0.005);
      // hızlanma ve azami hız (düz asfalt yol)
      let t100 = -1,
        vmax = 0;
      for (let k = 0; k < 30 / DT && S.z < 760; k++) {
        s.adim(gir(1));
        const v = Math.hypot(S.vx, S.vz) * 3.6;
        if (t100 < 0 && v >= 100) t100 = k * DT;
        vmax = Math.max(vmax, v);
      }
      expect(t100, "0-100 km/sa (sn)").toBeGreaterThan(1.5);
      expect(t100, "0-100 km/sa (sn)").toBeLessThan(
        ci == 12 ? 15 : ci >= 10 ? 13 : ci == 2 || ci == 8 ? 7 : 5,
      );
      expect(vmax, "azami hız (km/sa)").toBeGreaterThan(
        ci == 12 ? 110 : ci >= 10 ? 125 : ci == 8 ? 150 : 170,
      );
      // fren: 100 km/sa'dan
      s.reset(210, -780, 0);
      for (let k = 0; k < 1200 && Math.hypot(S.vx, S.vz) < 27.78; k++) s.adim(gir(1));
      const z0 = S.z;
      for (let k = 0; k < 600 && Math.hypot(S.vx, S.vz) > 0.3; k++) s.adim(gir(0, 1));
      expect(S.z - z0, "100-0 fren mesafesi (m)").toBeLessThan(30);
      expect(S.z - z0).toBeGreaterThan(5);
    });
});

describe("gerçekçi seviyede otomatik pilot spin atmaz", () => {
  for (const [yaris, arac, ad] of [
    [pistNo("gp", 3), 0, "Grand Prix"],
    [pistNo("rl", 2), 3, "Orman Etabı"],
    [pistNo("rx", 2), 1, "Çamur Vadisi"],
  ] as const)
    it(ad, () => {
      const s = surucuKur({ yaris, arac, lk: "real" });
      const TR = s.bolge!.TR!,
        rally = TR.open,
        i0 = rally ? 4 : TR.N - 6,
        P = TR.P[i0];
      s.reset(P[0], P[1], Math.atan2(TR.T[i0][0], TR.T[i0][1]));
      let spin = 0,
        sp = false;
      for (let k = 0; k < 15 / DT; k++) {
        const S = s.sim.S,
          ti = ipucu.ti,
          q = TR.P[TR.open ? Math.min(ti + 7, TR.N - 1) : (ti + 7) % TR.N];
        let a = Math.atan2(q[0] - S.x, q[1] - S.z) - S.h;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        const v = Math.hypot(S.vx, S.vz);
        s.adim(
          gir(
            v < (rally ? 16 : 24) ? 1 : 0,
            v > (rally ? 20 : 30) ? 1 : 0,
            (a > 0.06 ? 1 : 0) - (a < -0.06 ? 1 : 0),
          ),
        );
        const ab = Math.abs(s.sim.d.D.beta);
        if (ab > 1.3 && !sp) {
          spin++;
          sp = true;
        }
        if (ab < 0.4) sp = false;
      }
      expect(spin, "spin").toBe(0);
      expect((100 * ipucu.ti) / TR.N, "ilerleme %").toBeGreaterThan(5);
    });
});

describe("toprakta sınır: tam gaz ve tam direksiyon yola tutunmaz", () => {
  it("frensiz tam gazla tur atılamaz (Çamur Vadisi, Kor RX, gerçekçi)", () => {
    const r = frensiz(pistNo("rx", 2), 1, "real");
    expect(r.disari + 3 * r.spin, "pist dışında geçen süre + spin").toBeGreaterThan(4);
  });
  it("gerçekçi: 80 km/sa'te tam direksiyon + tam gaz aracı kaydırır (Kor RX)", () => {
    const r = duzZemin(1, "real", 22);
    expect(r.bMax * 57.3, "en büyük kayma (derece)").toBeGreaterThan(30);
  });
  it("gerçekçi: arkadan itişli araç toprakta abartınca spin atar (Kızıl Ok)", () => {
    expect(duzZemin(0, "real", 22).spin).toBeGreaterThan(0);
  });
  it("dengeli: abartan spin atar, gaz kesince toparlar (Mavi Yıldız)", () => {
    expect(duzZemin(3, "norm", 22).spin, "tam gaz").toBeGreaterThan(0);
    expect(duzZemin(3, "norm", 22, { g: 0 }).spin, "gaz kapalı").toBe(0);
  });
});

describe("drift dengesi (Boş Otopark, Beyaz Kurt, drift önayarı)", () => {
  for (const [lk, st] of [
    ["real", "usta"],
    ["real", "abartan"],
    ["arc", "usta"],
  ] as const)
    it(`${lk} / ${st}`, () => {
      const s = surucuKur({ dunya: 1, arac: 2, pk: "dr", lk });
      s.reset(30, -3550, 0);
      const DR = s.sim.d.DR,
        D = s.sim.d.D;
      let ph = 0,
        act = 0,
        n = 0,
        sp = 0,
        c = 0;
      const surus = (sn: number) => {
        for (let k = 0; k < sn / DT; k++) {
          let sa = 0;
          if (ph == 1) {
            sa = 1;
            if (DR.on) ph = 2;
          } else if (ph == 2) {
            if (DR.cool > 1.15 && !c) {
              sp++;
              c = 1;
            }
            if (DR.cool < 1) c = 0;
            sa = st == "usta" ? DR.dir * cl(2.2 * (0.55 - Math.abs(D.beta)), -1, 1) : DR.dir;
            n++;
            if (D.act) act++;
          }
          s.adim(gir(1, 0, sa, false, true));
        }
      };
      surus(3);
      ph = 1;
      surus(6);
      const yuzde = (100 * act) / Math.max(n, 1);
      if (st == "usta") {
        expect(yuzde, "driftte geçen süre %").toBeGreaterThan(70);
        expect(sp, "spin").toBe(0);
      } else expect(sp, "abartan spin atmalı").toBeGreaterThan(0);
    });
});

describe("drift yarışı (Drift Parkı, Beyaz Kurt, drift önayarı)", () => {
  it("gerçekçi: ölçülü açıyla turun %80'i tek komboda geçer", { timeout: 30000 }, () => {
    const r = driftTuru(pistNo("dp", 3), "real", DRIFT_PILOT, 75);
    expect(r.oran, "en uzun kombo / tur").toBeGreaterThan(0.8);
    expect(r.spin, "spin").toBe(0);
  });
  it("gerçekçi: açıyı abartan komboyu yakar", { timeout: 30000 }, () => {
    const r = driftTuru(pistNo("dp", 3), "real", { ...DRIFT_PILOT, aci: 0.65 }, 75);
    expect(r.oran, "en uzun kombo / tur").toBeLessThan(0.8);
  });
  it("dengeli: turun %80'i tek komboda geçer", { timeout: 30000 }, () => {
    expect(driftTuru(pistNo("dp", 3), "norm", DRIFT_PILOT, 75).oran).toBeGreaterThan(0.8);
  });
});

describe("el freni: arka kilit ve kontrollü drift girişi", () => {
  for (const ad of ["Kızıl Ok", "Gümüş Serçe"])
    it(`${ad}: kısa el freni darbesi arkayı açar`, () => {
      const a = CARS.findIndex((c) => c.n == ad),
        dp = pistNo("dp", 1),
        gaz = driftGirisi(a, "real", 16, false, dp),
        el = driftGirisi(a, "real", 16, true, dp);
      expect(gaz.drift, "yalnız gazla otomatik drift yok").toBe(false);
      expect(el.drift, "kasıtlı el freniyle drift girişi").toBe(true);
      expect(el.aci).toBeGreaterThan(gaz.aci + 10);
      expect(el.spin).toBe(0);
    });
  for (const arac of [10, 11])
    it(`araç ${arac}: arka kilit, ön aks serbest; bırakınca hızlanır`, () => {
      const s = surucuKur({ dunya: 0, arac, lk: "real" });
      s.reset(210, -780, 0);
      const v = () => Math.hypot(s.sim.S.vx, s.sim.S.vz),
        gi = (dbr: boolean): FizikGirdisi => ({ ...gir(1), dbr });
      for (let k = 0; k < 900 && v() < 20; k++) s.adim(gi(false));
      const once = v(),
        vites = s.sim.yeni!.vites;
      for (let k = 0; k < 20; k++) s.adim(gi(true));
      const Y = s.sim.yeni!,
        sonra = v();
      expect(Y.vites).toBe(vites);
      expect(sonra).toBeLessThan(once - 0.5);
      expect(Math.abs(Y.tk[2].w)).toBeLessThan(Math.abs(Y.tk[0].w) * 0.3);
      expect(Math.abs(Y.tk[3].w)).toBeLessThan(Math.abs(Y.tk[1].w) * 0.3);
      for (let k = 0; k < 120; k++) s.adim(gi(false));
      expect(v()).toBeGreaterThan(sonra + 1);
      expect(sonlu(s.sim.S.x, s.sim.S.z, Y.rpm)).toBe(true);
    });
});

describe("asfalt pistte titreşim yok (her araç, her asfalt pist)", () => {
  // pist yüksekliği basamaksız olmalı: adımdan adıma poz sıçramaz, dikey ivme küçük kalır. Kerb sarsıntısı
  // (kamera) yalnız teker kerbe çıkınca açılır; yokuşlu pistte taban yüksekliği kerb sayılmaz.
  for (let yaris = 0; yaris < TDEF.length; yaris++) {
    if (!["gp", "dp", "dg"].includes(TDEF[yaris].t)) continue;
    it(TDEF[yaris].n, { timeout: 30000 }, () => {
      for (let arac = 0; arac < CARS.length; arac++) {
        const o = titresimOlc(yaris, arac, 20),
          ad = CARS[arac].n;
        expect(o.asfalt, `${ad}: asfaltta geçen süre`).toBeGreaterThan(0.6);
        expect(o.yanlisKerb, `${ad}: asfaltta kerb sarsıntısı`).toBe(0);
        expect(o.y, `${ad}: yükseklik sıçraması (mm)`).toBeLessThan(1.5);
        expect(Math.max(o.egim, o.yatis), `${ad}: eğim/yatış sıçraması (°)`).toBeLessThan(0.3);
        expect(o.yon, `${ad}: yön sıçraması (°)`).toBeLessThan(0.4);
        expect(o.ay, `${ad}: en büyük dikey ivme (m/s²)`).toBeLessThan(8);
      }
    });
  }
  it("sert frende öne dalan gövde yola vurmaz: darbe yok (her araç, 148 km/sa)", () => {
    for (let arac = 0; arac < CARS.length; arac++) {
      const s = surucuKur({ dunya: 0, arac, lk: "norm" });
      s.reset(210, -780, 0);
      const S = s.sim.S;
      for (let k = 0; k < 900 && Math.hypot(S.vx, S.vz) < 41; k++) s.adim(gir(1));
      let vy0 = s.sim.yeni!.vy,
        en = 0;
      for (let k = 0; k < 300; k++) {
        s.adim(gir(0, 1));
        const Y = s.sim.yeni!;
        en = Math.max(en, Math.abs((Y.vy - vy0) / DT));
        vy0 = Y.vy;
      }
      expect(en, `${CARS[arac].n}: frende en büyük dikey ivme (m/s²)`).toBeLessThan(6);
    }
  });

  it("turbo gecikmesi: kalkışta basınç boş, tam gazda dolar, gaz kesince boşalır (Turuncu Ejder)", () => {
    const s = surucuKur({ dunya: 0, arac: CARS.findIndex((c) => c.k == "supra"), lk: "norm" });
    s.reset(210, -780, 0);
    for (let k = 0; k < 18; k++) s.adim(gir(1));
    expect(s.sim.yeni!.turbo, "0,3 sn tam gaz").toBeLessThan(0.3);
    for (let k = 0; k < 300; k++) s.adim(gir(1));
    expect(s.sim.yeni!.turbo, "5 sn tam gaz").toBeGreaterThan(0.85);
    for (let k = 0; k < 60; k++) s.adim(gir(0));
    expect(s.sim.yeni!.turbo, "1 sn gazsız").toBeLessThan(0.1);
  });

  it("kerbe çıkan teker sarsıntıyı açar (Grand Prix)", () => {
    const s = surucuKur({ yaris: pistNo("gp", 3), arac: 0, lk: "norm" });
    const TR = s.bolge!.TR!,
      i = TR.kb!.findIndex((k, j) => k && TR.kb![j + 2] && TR.kb![j - 2]),
      [tx, tz] = TR.T[i];
    let acik = 0;
    // pist kenarına, sol tekerler kerbin üstünde olacak kadar dışarıya
    for (const sd of [-1, 1]) {
      const o = sd * (TR.hw + 0.3);
      s.reset(TR.P[i][0] + tz * o, TR.P[i][1] - tx * o, Math.atan2(tx, tz));
      for (let k = 0; k < 30; k++) s.adim(gir());
      acik += s.sim.S.kerb;
    }
    expect(acik, "kerbde sarsıntı").toBeGreaterThan(0);
  });
});

describe("kurallar ve sağlamlık", () => {
  it("belirlenimci: aynı girişler aynı sonuç", () => {
    const sur = () => {
      const s = surucuKur({ yaris: pistNo("gp", 3), arac: 0, lk: "real" });
      const TR = s.bolge!.TR!,
        P = TR.P[10];
      s.reset(P[0], P[1], Math.atan2(TR.T[10][0], TR.T[10][1]));
      const r = mulberry32(5);
      for (let k = 0; k < 600; k++) s.adim(gir(r(), r() < 0.2 ? r() : 0, r() * 2 - 1, true, true));
      const S = s.sim.S;
      return [S.x, S.z, S.h, S.vx, S.vz];
    };
    expect(sur()).toEqual(sur());
  });

  it("yokuşta başlangıç: araç fırlamaz", () => {
    const s = surucuKur({ yaris: pistNo("rl", 2), arac: 3, lk: "real" });
    const TR = s.bolge!.TR!;
    for (const i of [4, 40, 120, 300]) {
      const P = TR.P[i];
      s.reset(P[0], P[1], Math.atan2(TR.T[i][0], TR.T[i][1]));
      let vmax = 0;
      for (let k = 0; k < 120; k++) {
        s.adim(gir());
        vmax = Math.max(vmax, Math.hypot(s.sim.S.vx, s.sim.S.vz, s.sim.S.vy));
      }
      expect(vmax, `nokta ${i}: en büyük hız (m/s)`).toBeLessThan(6);
    }
  });

  it("rampadan atlama: havalanır, dik iner", () => {
    const s = surucuKur({ dunya: 0, arac: 3, lk: "arc" });
    s.reset(-250, -175, 0);
    let hava = 0;
    for (let k = 0; k < 360; k++) {
      s.adim(gir(1));
      if (s.sim.S.air) hava++;
    }
    for (let k = 0; k < 120; k++) s.adim(gir());
    const Y = s.sim.yeni!,
      // gövdenin yukarı ekseninin dünya y bileşeni
      upY = 1 - 2 * (Y.qx * Y.qx + Y.qz * Y.qz);
    expect(hava * DT, "havada geçen süre (sn)").toBeGreaterThan(0.2);
    expect(upY, "inişten sonra dik").toBeGreaterThan(0.9);
  });

  it("çarpışma: ağaca çarpınca yavaşlar, içinden geçmez", () => {
    const s = surucuKur({ dunya: 1, arac: 0, lk: "real" });
    s.cx.dunya.yakin = () => [{ x: 100, z: -3420, r: 1.3, t: "solid" as const }];
    s.reset(100, -3500, 0);
    let vOnce = 0,
      dmin = 1e9;
    for (let k = 0; k < 240; k++) {
      s.adim(gir(1));
      const S = s.sim.S;
      if (S.z < -3430) vOnce = Math.hypot(S.vx, S.vz);
      dmin = Math.min(dmin, Math.hypot(S.x - 100, S.z + 3420));
    }
    expect(vOnce, "çarpmadan önce hız").toBeGreaterThan(15);
    expect(dmin, "ağaca en yakın (m)").toBeGreaterThan(2.3);
  });

  it("kalkış patinajı: tuşla düşük ve sabit, analogda gaza bağlı", () => {
    const kalkis = (g: number, analog: boolean) => {
      const s = surucuKur({ dunya: 1, arac: 4, lk: "real" });
      s.reset(100, -3500, 0);
      let kMax = 0;
      for (let k = 0; k < 90; k++) {
        s.adim(gir(g, 0, 0, analog));
        const Y = s.sim.yeni!;
        if (k > 20) kMax = Math.max(kMax, Y.tk[2].kap, Y.tk[3].kap);
      }
      return kMax;
    };
    const tus = kalkis(1, false),
      analogTam = kalkis(1, true),
      analogYarim = kalkis(0.35, true);
    expect(tus, "tuşla patinaj").toBeLessThan(0.25);
    expect(analogTam, "analog tam gazda patinaj tuştan fazla").toBeGreaterThan(tus);
    expect(analogYarim, "analog yarım gaz tam gazdan az").toBeLessThan(analogTam);
  });

  it("rastgele girişlerle uzun sürüş: değerler sonlu kalır", { timeout: 60000 }, () => {
    for (const [yaris, arac] of [
      [pistNo("gp", 3), 0],
      [pistNo("rx", 2), 1],
      [pistNo("rl", 6), 3],
      [pistNo("dp", 3), 2],
    ] as const) {
      const s = surucuKur({ yaris, arac, lk: "real" });
      const TR = s.bolge!.TR!,
        P = TR.P[0];
      s.reset(P[0], P[1], Math.atan2(TR.T[0][0], TR.T[0][1]));
      const r = mulberry32(yaris + 11);
      let g = 0,
        b = 0,
        tg = 0;
      for (let k = 0; k < 40 / DT; k++) {
        if (k % 30 == 0) {
          g = r() < 0.7 ? r() : 0;
          b = r() < 0.2 ? r() : 0;
          tg = r() * 2 - 1;
        }
        s.adim(gir(g, b, tg, true, true));
        const S = s.sim.S;
        expect(sonlu(S.x, S.y, S.z, S.vx, S.vz, S.h)).toBe(true);
        expect(Math.hypot(S.vx, S.vz)).toBeLessThan(120);
      }
    }
  });
});
