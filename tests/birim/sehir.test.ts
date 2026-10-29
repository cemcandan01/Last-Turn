// LT-SYS-008 Kule Şehri: düzen (yol, park, bina, zemin, rota) ve şehir skill'leri gerçek fizikte (Volt Kanat uçuşu,
// kancanın bina sarkacı).
import { describe, expect, it } from "vitest";
import {
  beceriAdimi,
  beceriDurumuBaslat,
  beceriIstekleri,
  KOSE,
  YER_CEKIMI,
  type BeceriOrnegi,
} from "../../src/cekirdek/beceri";
import { mkTrack } from "../../src/dunya/pist";
import {
  gokBaglantisi,
  sehirKosesi,
  SOKAK_YARI,
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

describe("LT-SYS-008 Kule Şehri", () => {
  describe("düzen", () => {
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
      expect(sehirYuksekligi(b.x, b.z)).toBe(b.ust?.y ?? b.y);
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
      expect(SOKAK_ROTALARI.map((r) => r.tur).sort()).toEqual(
        expect.arrayContaining(["ab", "tur", "kovala"]),
      );
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

    it("havada asılma noktası sokağın üstünde, yan binanın cephesine çizilir; köşe kavşakta ve doğru yanda", () => {
      const x = SEHIR_X + CADDELER[2],
        z = SEHIR_Z + SOKAKLAR[3] + 20;
      const g = gokBaglantisi(x, 15, z, 0)!;
      expect(g).not.toBeNull();
      // sokak orta çizgisi üstünde (yolda), önde, oyuncudan yüksek
      expect(yoldaMi(g.p[0] - SEHIR_X, g.p[2] - SEHIR_Z)).toBe(true);
      expect(g.p[2] - z).toBeGreaterThan(15);
      expect(g.p[1]).toBeGreaterThan(15 + 10);
      // ip ucu bina cephesinde (yolda değil)
      expect(yoldaMi(g.uc[0] - SEHIR_X, g.uc[2] - SEHIR_Z)).toBe(false);
      // yerde köşe: kuzeye giderken önündeki kavşağın sol (+x) ve sağ yakın köşesi
      const z0 = SEHIR_Z + SOKAKLAR[4] - 25,
        sol = sehirKosesi(x, z0, 0, 0, 20, 1)!.uc,
        sag = sehirKosesi(x, z0, 0, 0, 20, -1)!.uc;
      expect(sol[0]).toBeGreaterThan(x);
      expect(sag[0]).toBeLessThan(x);
      expect(Math.abs(sol[1] - (SEHIR_Z + SOKAKLAR[4]))).toBeLessThan(10);
      expect(sol[1]).toBeLessThan(SEHIR_Z + SOKAKLAR[4]);
      // kavşaktan uzakta (blok ortasında, sonraki kavşak 40 m'den uzak) köşe yok
      expect(sehirKosesi(x, SEHIR_Z + SOKAKLAR[4] + 10 - 78 + 20, 0, 0, 20, 0)).toBeNull();
    });
  });

  describe("şehir skill'leri gerçek fizikte", () => {
    it("oyunun yer çekimi skill çekirdeğindekiyle aynı", () => expect(YER_CEKIMI).toBe(YERCEKIMI));

    /** skill + fizik birlikte: her adımda skill çıktısı sonraki fizik adımına (oyundaki surus.ts/mutant.ts gibi) */
    function surus(dunyaNo: number, x: number, z: number, h: number, beceri: BeceriOrnegi) {
      const s = surucuKur({ dunya: dunyaNo, arac: 0, lk: "norm" });
      s.reset(x, z, h);
      let bd = beceriDurumuBaslat();
      const girdi = { basili: false, parmak: false, yunus: 0, yalpa: 0, ileri: 0 };
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
          { basili: girdi.basili ? [beceri.id] : [], direksiyon: s.sim.d.st },
        );
        const r = beceriAdimi(
          bd,
          [beceri],
          d,
          bas ? beceriIstekleri(bd, [beceri], d, [beceri.id]) : [],
          [],
          1 / 60,
        );
        bd = r.d;
        const u = r.cikti.ucus,
          a = r.cikti.oyuncuIvme;
        s.cx.dis = { x: a.x + (u?.x ?? 0), z: a.z + (u?.z ?? 0) };
        s.cx.ucus = {
          y: u?.y ?? 0,
          denge: u?.denge ?? 0,
          ileri: (u?.ileri ?? 0) + girdi.ileri,
          inis: u?.inis,
          yalpa: u?.yalpa,
          hava: { parmak: girdi.parmak, yunus: girdi.yunus, yalpa: girdi.yalpa },
        };
        s.adim({ tg, g, b: 0, analogDireksiyon: true, analogGaz: true });
      };
      return { s, adim, girdi, yerel: () => bd.yerel[beceri.id] };
    }
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
    /** gövdenin üst ve burun eksenlerinin dikey bileşeni */
    const eksen = (Y: { qx: number; qy: number; qz: number; qw: number }) => ({
      ust: 1 - 2 * (Y.qx * Y.qx + Y.qz * Y.qz),
      burun: 2 * (Y.qy * Y.qz - Y.qw * Y.qx),
    });
    const volt = (seviye = 1) => {
      const r = surus(1, 0, 0, 0, { id: "volt-kanat", seviye, eklentiler: [], evrim: null });
      r.s.cx.dunya = DUZ;
      r.s.reset(0, 0, 0);
      for (let k = 0; k < 90; k++) r.adim(0, 1);
      return r;
    };

    it("Volt Kanat: basılı tuttukça yükselir ve ileri gider (en çok 3 sn); erken bırakınca az; süzülerek düzgün iner", () => {
      const kos = (tut: number) => {
        const { s, adim, girdi } = volt();
        girdi.basili = true;
        adim(0, 1, true);
        const z0 = s.sim.S.z;
        let enYuksek = 0,
          inisVy = 0,
          ucusSuresi = 0;
        for (let k = 0; k < 14 * 60; k++) {
          girdi.basili = k < tut * 60;
          adim(0, 0.5);
          const Y = s.sim.yeni!;
          if (Y.vy > 0.5) ucusSuresi += 1 / 60;
          enYuksek = Math.max(enYuksek, Y.py);
          if (Y.py < 1.6 && enYuksek > 5 && !inisVy) inisVy = Y.vy;
        }
        return {
          enYuksek,
          inisVy,
          ileri: s.sim.S.z - z0,
          ust: eksen(s.sim.yeni!).ust,
          ucusSuresi,
          py: s.sim.yeni!.py,
        };
      };
      const tam = kos(10),
        kisa = kos(1);
      expect(tam.enYuksek).toBeGreaterThan(18);
      // 3 sn'den uzun basılı tutmak tırmanmayı uzatmaz
      expect(tam.ucusSuresi).toBeLessThan(4.2);
      expect(kisa.enYuksek).toBeLessThan(tam.enYuksek * 0.6);
      expect(tam.ileri).toBeGreaterThan(kisa.ileri);
      expect(Math.abs(tam.inisVy)).toBeLessThan(14);
      // tekerleri üstünde iner
      expect(tam.ust).toBeGreaterThan(0.9);
      expect(tam.py).toBeLessThan(1.5);
    });

    it("havada sürükleme burnu 360° çevirir: aşağı kaydırma burnu kaldırır, yan kaydırma döndürür; parmak yokken duruş korunur, yere yakın dikleşir", () => {
      const { s, adim, girdi } = volt(3);
      girdi.basili = true;
      adim(0, 0, true);
      for (let k = 0; k < 60; k++) adim(0, 0);
      // burun yukarı (yunuslama +)
      girdi.parmak = true;
      girdi.yunus = 1.5;
      const b0 = eksen(s.sim.yeni!).burun;
      for (let k = 0; k < 30; k++) adim(0, 0);
      const b1 = eksen(s.sim.yeni!).burun;
      expect(b1 - b0).toBeGreaterThan(0.4);
      // parmak durunca (sürükleme yok) açı korunur
      girdi.yunus = 0;
      for (let k = 0; k < 20; k++) adim(0, 0);
      expect(Math.abs(eksen(s.sim.yeni!).burun - b1)).toBeLessThan(0.15);
      // tam takla: yunuslama yönünde sürekli sürükleme bir tur atar (360°)
      girdi.yunus = -1.5;
      for (let k = 0; k < 40; k++) adim(0, 0);
      girdi.yunus = 0;
      // sağa kaydırma: burun sağa (yalpa −)
      girdi.yalpa = -1.2;
      const h0 = s.sim.S.h;
      for (let k = 0; k < 20; k++) adim(0, 0);
      expect(s.sim.S.h - h0).toBeLessThan(-0.2);
      // parmak kalkar: yere inerken gövde dikleşir ve tekerleri üstünde iner
      girdi.yalpa = 0;
      girdi.parmak = false;
      girdi.basili = false;
      for (let k = 0; k < 12 * 60; k++) adim(0, 0);
      expect(s.sim.yeni!.py).toBeLessThan(1.5);
      expect(eksen(s.sim.yeni!).ust).toBeGreaterThan(0.9);
    });

    it("havada nitro burun yönünde ivme verir", () => {
      const kos = (ileri: number) => {
        const { s, adim, girdi } = volt(3);
        girdi.basili = true;
        adim(0, 0, true);
        for (let k = 0; k < 40; k++) adim(0, 0);
        girdi.basili = false;
        girdi.ileri = ileri;
        const v0 = Math.hypot(s.sim.S.vx, s.sim.S.vz);
        for (let k = 0; k < 60; k++) adim(0, 0);
        return Math.hypot(s.sim.S.vx, s.sim.S.vz) - v0;
      };
      expect(kos(14) - kos(0)).toBeGreaterThan(8);
    });

    it("yerde kanca köşeye takılır: araç kavşakta sola döner, takla atmaz, hızını korur; kancasız düz gider", () => {
      const x = SEHIR_X + CADDELER[2] + 2,
        z = SEHIR_Z + SOKAKLAR[4] - 120,
        zs = SEHIR_Z + SOKAKLAR[4];
      const kos = (kanca: boolean) => {
        const r = surus(2, x, z, 0, { id: "grappling-hook", seviye: 1, eklentiler: [], evrim: null });
        let atildi = false,
          hedef: string | null = null;
        for (let k = 0; k < 10 * 60; k++) {
          const S = r.s.sim.S,
            bas = kanca && !atildi && S.z > zs - 22;
          if (bas) atildi = true;
          r.adim(0, 0.7, bas);
          if (bas) hedef = r.yerel()?.hedef ?? null;
          if (atildi && S.x > x + 40) break;
        }
        const S = r.s.sim.S;
        return { S, hedef, ust: eksen(r.s.sim.yeni!).ust, v: Math.hypot(S.vx, S.vz) };
      };
      const k = kos(true),
        d = kos(false);
      expect(k.hedef).toBe(KOSE);
      // sola (+x) yan sokağa döndü, sokakta; takla yok, hız korunur
      expect(k.S.x).toBeGreaterThan(x + 30);
      expect(Math.abs(k.S.z - zs)).toBeLessThan(SOKAK_YARI + 3);
      expect(k.ust).toBeGreaterThan(0.9);
      expect(k.v).toBeGreaterThan(12);
      // kancasız: kavşağı düz geçer
      expect(d.S.z).toBeGreaterThan(zs + 30);
      expect(Math.abs(d.S.x - x)).toBeLessThan(6);
    });

    it("havada kanca sokağın üstüne asılır: savrulur, binaya çarpmaz, tepede bırakır; burun yan sokağa dönünce köşe döner", () => {
      const x = SEHIR_X + CADDELER[2],
        z = SEHIR_Z + SOKAKLAR[2] + 10;
      const r = surus(2, x, z, 0, { id: "grappling-hook", seviye: 3, eklentiler: [], evrim: null }),
        Y = () => r.s.sim.yeni!;
      for (let k = 0; k < 120; k++) r.adim(0, 1);
      // havaya fırlat (rampa yerine dikey ivme): 15 m üstü
      for (let k = 0; k < 90; k++) {
        r.s.cx.ucus = { y: YER_CEKIMI + 18, denge: 1 };
        r.s.cx.dis = undefined;
        r.s.adim({ tg: 0, g: 1, b: 0, analogDireksiyon: true, analogGaz: true });
      }
      expect(Y().py).toBeGreaterThan(10);
      r.adim(0, 1, true);
      expect(r.yerel()?.hedef).toBe("#bina");
      const hit0 = r.s.sim.S.hit;
      let sure = 0;
      while (r.yerel()!.kalan > 0 && sure < 5) {
        r.adim(0, 1);
        sure += 1 / 60;
        // sokakta kalır: binaya girmez
        expect(Math.abs(r.s.sim.S.x - x)).toBeLessThan(10);
      }
      expect(r.s.sim.S.hit).toBe(hit0);
      expect(Math.hypot(r.s.sim.S.vx, r.s.sim.S.vz)).toBeGreaterThan(12);
      // havada burun sağa yan sokağa çevrilip yeniden atılınca asılma noktası yan sokakta (doğu-batı)
      const S = r.s.sim.S,
        g = gokBaglantisi(S.x, Y().py, S.z, S.h - Math.PI / 2);
      if (g) expect(Math.abs(g.p[0] - S.x)).toBeGreaterThan(Math.abs(g.p[2] - S.z));
    });
  });
});
