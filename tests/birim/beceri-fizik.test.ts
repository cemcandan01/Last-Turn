// LT-SYS-004: skill kuvvetleri gerçek fizikte. Dış ivme yokken fizik birebir aynı; Grappling Hook düello pistinde
// iki YZ aracı arasında oyuncuyu rakibe yaklaştırır, rakibi yavaşlatır; ışınlanma (hızın izin verdiğinden uzun adım)
// yoktur.
import { describe, expect, it } from "vitest";
import {
  beceriAdimi,
  beceriDurumuBaslat,
  beceriIstekleri,
  type BeceriOrnegi,
} from "../../src/cekirdek/beceri";
import { tp, type Pist } from "../../src/dunya/pist";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { BASLANGIC_ARACLARI } from "../../src/oyun/ekonomi";
import { DUELLO } from "../../src/oyun/mutant-kosu";
import { beceriDunyasiYap, pistBaglantisi } from "../../src/oyun/mutant-beceri";
import { rakipKurulumu, yarisciAdimi, yarisciYap, type Yarisci } from "../../src/yz/yarisci";
import { surucuKur } from "../yardimci/surucu";
import { YERCEKIMI } from "../../src/fizik/veriler";

const DUELLO_PISTI = TDEF.findIndex((d) => d.t == DUELLO.pist.ty && d.lv == DUELLO.pist.lv);
const ARAC = BASLANGIC_ARACLARI[0];

/** pistte i. noktada (merkez çizgi), pist yönünde */
function nokta(TR: Pist, i: number) {
  const g = tp(TR, "", TR.N, 6),
    j = (((TR.N - 6 + i) % TR.N) + TR.N) % TR.N,
    h = Math.atan2(TR.T[j][0], TR.T[j][1]);
  return i == 0 ? { x: g[1], z: g[2], h: g[3] } : { x: TR.P[j][0], z: TR.P[j][1], h };
}

function ikiArac() {
  const s = surucuKur({ yaris: DUELLO_PISTI, arac: ARAC, lk: "norm" }),
    TR = s.bolge!.TR!,
    yap = (i: number, tohum: number) =>
      yarisciYap(s.cx.dunya, rakipKurulumu(ARAC, "gp", "norm"), TR, 2, "deneyimli", tohum, nokta(TR, i));
  // oyuncu (YZ sürer) ızgarada, rakip ~40 m önde
  return { TR, oyuncu: yap(0, 3), rakip: yap(10, 4) };
}

const govde = (y: Yarisci) => {
  const S = y.ornek.sim.S;
  return { x: S.x, z: S.z, h: S.h, vx: S.vx, vz: S.vz };
};
const mesafe = (a: Yarisci, b: Yarisci) =>
  Math.hypot(a.ornek.sim.S.x - b.ornek.sim.S.x, a.ornek.sim.S.z - b.ornek.sim.S.z);

describe("LT-SYS-004 skill kuvvetleri gerçek fizikte", () => {
  it("dış ivme yokken (ya da sıfırken) fizik birebir aynı", () => {
    const a = ikiArac().oyuncu,
      b = ikiArac().oyuncu;
    for (let i = 0; i < 600; i++) {
      b.ornek.cx.dis = i % 2 ? { x: 0, z: 0 } : undefined;
      yarisciAdimi(a, true);
      yarisciAdimi(b, true);
    }
    expect(b.ornek.sim.S).toEqual(a.ornek.sim.S);
  });

  it("kanca oyuncuyu rakibe yaklaştırır, rakibi yavaşlatır; ışınlanma yok, belirlenimci", () => {
    const kos = (kanca: boolean) => {
      const { TR, oyuncu, rakip } = ikiArac(),
        takili: BeceriOrnegi[] = [{ id: "grappling-hook", seviye: 3, eklentiler: [], evrim: null }];
      let d = beceriDurumuBaslat(),
        sicrama = 0,
        tetik = 0;
      // 3 sn ısınma: ikisi de hızlanır
      for (let i = 0; i < 180; i++) {
        yarisciAdimi(oyuncu, true);
        yarisciAdimi(rakip, true);
      }
      const d0 = mesafe(oyuncu, rakip),
        vr0 = Math.hypot(rakip.ornek.sim.S.vx, rakip.ornek.sim.S.vz);
      for (let i = 0; i < 90; i++) {
        const W = beceriDunyasiYap(govde(oyuncu), [{ id: "rakip", ...govde(rakip) }], TR, true),
          tet = kanca && i == 0 ? beceriIstekleri(d, takili, W, ["grappling-hook"]) : [];
        tetik += tet.length;
        const r = beceriAdimi(d, takili, W, tet, [], 1 / 60);
        d = r.d;
        oyuncu.ornek.cx.dis = r.cikti.oyuncuIvme;
        rakip.ornek.cx.dis = r.cikti.hedefIvme.rakip;
        for (const y of [oyuncu, rakip]) {
          const S = y.ornek.sim.S,
            x0 = S.x,
            z0 = S.z,
            v0 = Math.hypot(S.vx, S.vz);
          yarisciAdimi(y, true);
          const v1 = Math.hypot(S.vx, S.vz);
          sicrama = Math.max(sicrama, Math.hypot(S.x - x0, S.z - z0) - (Math.max(v0, v1) / 60) * 1.05);
        }
      }
      return {
        d0,
        d1: mesafe(oyuncu, rakip),
        vr: Math.hypot(rakip.ornek.sim.S.vx, rakip.ornek.sim.S.vz) - vr0,
        sicrama,
        tetik,
        S: { ...oyuncu.ornek.sim.S },
      };
    };
    const yok = kos(false),
      var_ = kos(true);
    expect(var_.tetik).toBe(1);
    expect(var_.d0).toBeCloseTo(yok.d0, 9);
    // 1,5 sn sonra kancalı oyuncu rakibe belirgin daha yakın; rakip daha az hızlanmış
    expect(var_.d1).toBeLessThan(yok.d1 - 3);
    expect(var_.vr).toBeLessThan(yok.vr);
    expect(var_.sicrama).toBeLessThanOrEqual(1e-6);
    expect(kos(true).S).toEqual(var_.S);
  });

  it("pist bağlantı noktası oyuncunun önünde, menzilde ve pistin üstünde; ters yönde gidince geride değil", () => {
    const { TR, oyuncu } = ikiArac();
    for (let i = 0; i < 120; i++) yarisciAdimi(oyuncu, true);
    const P = govde(oyuncu),
      n = pistBaglantisi(TR, P, 21, 35)!;
    expect(n).not.toBeNull();
    const d = Math.hypot(n[0] - P.x, n[1] - P.z);
    expect(d).toBeGreaterThanOrEqual(21);
    expect(d).toBeLessThanOrEqual(35);
    // önünde: hız yönüyle aynı tarafta
    expect((n[0] - P.x) * P.vx + (n[1] - P.z) * P.vz).toBeGreaterThan(0);
    expect(pistBaglantisi(null, P, 21, 35)).toBeNull();
  });
});

describe("LT-SYS-008 uçuş girişi (cx.ucus) gerçek fizikte", () => {
  const DUZ = {
    H: () => 0,
    surf: () => 1,
    yakin: () => [],
    kutu: () => [-1e5, 1e5, -1e5, 1e5] as [number, number, number, number],
    kerb: () => 0,
    havaTutusu: () => 1,
    karli: () => false,
    yolTuru: () => null,
  };
  it("yer çekimini aşan dikey ivme aracı kaldırır; direksiyon yerdeki gibi aynı yöne döndürür; gövde dik kalır", () => {
    const s = surucuKur({ dunya: 1, arac: 0, lk: "norm" });
    s.cx.dunya = DUZ;
    s.reset(0, 0, 0);
    const Y = () => s.sim.yeni!;
    for (let k = 0; k < 2 * 60; k++) s.adim({ tg: 0, g: 1, b: 0, analogDireksiyon: true, analogGaz: true });
    const h0 = s.sim.S.h;
    for (let k = 0; k < 3 * 60; k++) {
      s.cx.ucus = { y: YERCEKIMI + Math.max(-6, Math.min(6, (15 - Y().py) * 1.2 - Y().vy * 1.8)), denge: 1 };
      s.adim({ tg: 0.5, g: 0, b: 0, analogDireksiyon: true, analogGaz: true });
    }
    expect(Y().py).toBeGreaterThan(8);
    expect(s.sim.S.h - h0).toBeGreaterThan(0.3);
    // dik: gövdenin yukarı ekseni dünya yukarısına yakın (dördeyden y bileşeni)
    const q = Y(),
      ustY = 1 - 2 * (q.qx * q.qx + q.qz * q.qz);
    expect(ustY).toBeGreaterThan(0.9);
  });
});
