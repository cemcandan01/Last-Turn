import { describe, expect, it } from "vitest";
import { beceriAdimi, beceriDurumuBaslat, type BeceriDunyasi, type BeceriOrnegi } from "../../src/cekirdek/beceri";

const risk: BeceriOrnegi = { id: "risk-taker", seviye: 1, eklentiler: [], evrim: null };
const dunya = (yarista: boolean): BeceriDunyasi => ({
  oyuncu: { x: 0, z: 0, h: 0, vx: 0, vz: 20 },
  hedefler: [],
  baglanti: () => null,
  yarista,
});

describe("Risk Taker serbest surus", () => {
  it("kontrollu drift ile yaris disinda da bar doldurur", () => {
    const sonuc = beceriAdimi(beceriDurumuBaslat(), [risk], dunya(false), [], [
      { tur: "DriftTickQualified", dt: 1 / 60, hiz: 20, aci: 0.5 },
    ], 1 / 60);
    expect(sonuc.d.yerel[risk.id].deger).toBeGreaterThan(0);
  });

  it("yaris disinda yakin takip ve near-miss bar doldurmaz", () => {
    const sonuc = beceriAdimi(beceriDurumuBaslat(), [risk], dunya(false), [], [
      { tur: "YakinTakip", hedef: "r1", dt: 1 / 60, mesafe: 5 },
      { tur: "NearMiss", hedef: "r1", hiz: 20 },
    ], 1 / 60);
    expect(sonuc.d.yerel[risk.id].deger).toBe(0);
  });

  it("dusuk hizli veya kucuk acili drift risk vermez", () => {
    const sonuc = beceriAdimi(beceriDurumuBaslat(), [risk], dunya(false), [], [
      { tur: "DriftTickQualified", dt: 1 / 60, hiz: 5, aci: 0.5 },
      { tur: "DriftTickQualified", dt: 1 / 60, hiz: 20, aci: 0.1 },
    ], 1 / 60);
    expect(sonuc.d.yerel[risk.id].deger).toBe(0);
  });
});
