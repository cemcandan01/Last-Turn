// LT-SYS-008 Kule Şehri: düzen (yol, park, bina, zemin, rota) ve şehir skill'leri gerçek fizikte (Volt Kanat uçuşu,
// kancanın bina sarkacı).
import { describe, expect, it } from "vitest";
import {
  beceriAdimi,
  beceriDurumuBaslat,
  KANCA_SARKAC,
  YER_CEKIMI,
  type BeceriOrnegi,
} from "../../src/cekirdek/beceri";
import { mkTrack } from "../../src/dunya/pist";
import {
  binaBaglantisi,
  CADDELER,
  PARK,
  rotaNoktalari,
  SEHIR_ATOLYE,
  SEHIR_BOSS,
  SEHIR_GIRIS,
  SEHIR_X,
  SEHIR_YERLERI,
  SEHIR_Z,
  sehirBinalari,
  sehirYuksekligi,
  sehirZemini,
  SOKAK_ROTALARI,
  SOKAKLAR,
  yoldaMi,
} from "../../src/dunya/sehir-duzen";
import { YERCEKIMI } from "../../src/fizik/veriler";
import type { DunyaSorgusu } from "../../src/fizik/tipler";
import { beceriDunyasiYap } from "../../src/oyun/mutant-beceri";
import { surucuKur } from "../yardimci/surucu";

const yerel = (p: [number, number]) => [p[0] - SEHIR_X, p[1] - SEHIR_Z] as const;

describe("LT-SYS-008 Kule Şehri düzeni", () => {
  it("ızgara yollar, merkezde park, yüzlerce bina; binalar yolda ve parkta değil", () => {
    const { binalar, bloklar } = sehirBinalari();
    expect(binalar.length).toBeGreaterThan(400);
    expect(bloklar.length).toBeGreaterThan(200);
    expect(Math.max(...binalar.map((b) => b.y))).toBeGreaterThan(150);
    for (const b of binalar) {
      expect(yoldaMi(b.x, b.z), "bina yolda").toBe(false);
      expect(b.x > PARK.x0 && b.x < PARK.x1 && b.z > PARK.z0 && b.z < PARK.z1, "bina parkta").toBe(false);
    }
    // park: çim, park yolu asfalt, göl su; dışarısı nehir; ızgara yolları asfalt
    expect(sehirZemini(40, -40)).toBe(2);
    expect(sehirZemini(153, 0)).toBe(1);
    expect(sehirZemini(0, 150)).toBe(3);
    expect(sehirZemini(850, 0)).toBe(3);
    expect(sehirZemini(CADDELER[2], SOKAKLAR[3] + 30)).toBe(1);
    // çatı yüksekliği: bina ortasında çatı, yolda 0
    const b = binalar[10];
    expect(sehirYuksekligi(b.x, b.z)).toBe(b.y);
    expect(sehirYuksekligi(CADDELER[2], SOKAKLAR[3])).toBe(0);
  });

  it("MUTANT yerleri yolda; sokak rotalarının bütün noktaları yolda ya da park yolunda", () => {
    for (const p of [
      ...SEHIR_YERLERI,
      SEHIR_ATOLYE,
      SEHIR_BOSS,
      [SEHIR_GIRIS[0], SEHIR_GIRIS[1]] as [number, number],
    ])
      expect(yoldaMi(...yerel(p)), "yer " + p).toBe(true);
    expect(SOKAK_ROTALARI.map((r) => r.tur).sort()).toEqual(expect.arrayContaining(["ab", "tur", "kovala"]));
    for (const r of SOKAK_ROTALARI) {
      const { pts, hw, acik } = rotaNoktalari(r),
        TR = mkTrack(pts, hw, acik);
      expect(TR.len, r.id).toBeGreaterThan(500);
      for (const [x, z] of TR.P) {
        const [lx, lz] = [x - SEHIR_X, z - SEHIR_Z];
        expect(sehirZemini(lx, lz) == 1 && sehirYuksekligi(lx, lz) == 0, r.id + " " + lx + "," + lz).toBe(
          true,
        );
      }
    }
  });

  it("bina bağlantısı: önde ve menzilde bina tepesi; geride bina aranmaz", () => {
    const x = SEHIR_X + CADDELER[2],
      z = SEHIR_Z + SOKAKLAR[3];
    const b = binaBaglantisi(x, z, 0, 20, 90)!;
    expect(b).not.toBeNull();
    expect(b[1]).toBeGreaterThan(15);
    expect(b[2] - z).toBeGreaterThan(0);
  });
});

describe("LT-SYS-008 şehir skill'leri gerçek fizikte", () => {
  it("oyunun yer çekimi skill çekirdeğindekiyle aynı", () => expect(YER_CEKIMI).toBe(YERCEKIMI));

  /** skill + fizik birlikte: her adımda skill çıktısı sonraki fizik adımına (oyundaki surus.ts gibi) */
  function surus(dunyaNo: number, x: number, z: number, h: number, beceri: BeceriOrnegi) {
    const s = surucuKur({ dunya: dunyaNo, arac: 0, lk: "norm" });
    s.reset(x, z, h);
    let bd = beceriDurumuBaslat(),
      tetik = false;
    const adim = (tg: number, g: number, bas = false) => {
      const S = s.sim.S,
        Y = s.sim.yeni;
      const d = beceriDunyasiYap(
        { x: S.x, z: S.z, h: S.h, vx: S.vx, vz: S.vz, y: Y?.py ?? 0, vy: Y?.vy ?? 0 },
        [],
        null,
        false,
        true,
        s.cx.dunya.H(S.x, S.z),
      );
      const r = beceriAdimi(bd, [beceri], d, bas || tetik ? ["beceri:" + beceri.id] : [], [], 1 / 60);
      tetik = false;
      bd = r.d;
      const u = r.cikti.ucus,
        a = r.cikti.oyuncuIvme;
      s.cx.dis = { x: a.x + (u?.x ?? 0), z: a.z + (u?.z ?? 0) };
      s.cx.ucus = u ? { y: u.y, denge: u.denge } : undefined;
      s.adim({ tg, g, b: 0, analogDireksiyon: true, analogGaz: true });
    };
    return { s, adim, yerel: () => bd.yerel[beceri.id] };
  }

  it("Volt Kanat: yükselir, direksiyonla döner, süre bitince yumuşak iner", () => {
    const DUZ: DunyaSorgusu = {
      H: () => 0,
      surf: () => 1,
      yakin: () => [],
      kutu: () => [-1e5, 1e5, -1e5, 1e5],
      kerb: () => 0,
      havaTutusu: () => 1,
      karli: () => false,
      yolTuru: () => null,
    };
    const { s, adim } = surus(1, 0, 0, 0, { id: "volt-kanat", seviye: 1, eklentiler: [], evrim: null });
    s.cx.dunya = DUZ;
    s.reset(0, 0, 0);
    for (let k = 0; k < 90; k++) adim(0, 1);
    adim(0, 1, true);
    let enYuksek = 0,
      inisVy = 0;
    const h0 = s.sim.S.h;
    for (let k = 0; k < 10 * 60; k++) {
      adim(k < 120 ? 0.6 : 0, 0.5);
      const Y = s.sim.yeni!;
      enYuksek = Math.max(enYuksek, Y.py);
      if (Y.py < 1.2 && enYuksek > 5 && !inisVy) inisVy = Y.vy;
    }
    expect(enYuksek).toBeGreaterThan(22);
    expect(s.sim.S.h - h0).toBeGreaterThan(0.4);
    expect(Math.abs(inisVy)).toBeLessThan(10);
    expect(s.sim.yeni!.py).toBeLessThan(1.5);
  });

  it("kanca şehirde bina tepesine takılır: araç yerden kalkıp savrulur, bırakınca hızını korur", () => {
    const x = SEHIR_X + CADDELER[2],
      z = SEHIR_Z + SOKAKLAR[2] + 20;
    const { s, adim, yerel } = surus(2, x, z, 0, {
      id: "grappling-hook",
      seviye: 3,
      eklentiler: [],
      evrim: null,
    });
    for (let k = 0; k < 150; k++) adim(0, 1);
    adim(0, 1, true);
    expect(yerel()?.hedef).toBe("#bina");
    let enYuksek = 0;
    for (let k = 0; k < KANCA_SARKAC.sure * 60; k++) {
      adim(0, 1);
      enYuksek = Math.max(enYuksek, s.sim.yeni!.py);
    }
    expect(enYuksek).toBeGreaterThan(3);
    expect(Math.hypot(s.sim.S.vx, s.sim.S.vz)).toBeGreaterThan(12);
    // kısa bekleme: hemen yeniden atılabilir (zincir)
    expect(yerel()!.bekleme).toBeLessThanOrEqual(KANCA_SARKAC.bekleme);
  });
});
