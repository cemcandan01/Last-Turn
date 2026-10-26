import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cl } from "../../src/cekirdek/matematik";
import { TUTUS_DARBESI } from "../../src/cekirdek/mekanikler";
import {
  GOREVLER,
  PERKLER,
  kosuAdimi,
  kosuBaslat,
  kosuOzeti,
  perkBul,
  perkSec,
  type Kosu,
} from "../../src/oyun/mutant-kurallari";
import { surucuKur } from "../yardimci/surucu";

const DT = 1 / 60;
type Sahte = Parameters<typeof kosuAdimi>[1];
/** sahte fizik durumu: drift açık/kapalı, hız, spin */
const durum = (on: boolean, hiz = 20, cool = 0): Sahte =>
  ({
    S: { vx: 0, vz: hiz, air: false },
    DR: { on: on ? 1 : 0, dir: 1, cool },
    D: { act: on ? 1 : 0, beta: on ? 0.5 : 0 },
  }) as unknown as Sahte;

/** ilk seçimde verilen perki seç, görev türünü zorla */
function hazirla(tohum: number, perk: string, tur: keyof typeof GOREVLER): Kosu {
  const k = kosuBaslat(tohum);
  k.secenekler = [perk];
  perkSec(k, perk);
  const G = GOREVLER[tur];
  k.gorev = { tur, hedef: G.hedef(0), sure: G.sure, kalan: G.sure, ilerleme: 0 };
  return k;
}

describe("MUTANT koşu kuralları", () => {
  it("perk kimlikleri tekil, açıklamalı; ilk seçimde 3 farklı perk ve en az bir enerji kaynağı", () => {
    expect(new Set(PERKLER.map((p) => p.m.id)).size).toBe(PERKLER.length);
    for (let t = 1; t <= 50; t++) {
      const k = kosuBaslat(t);
      expect(k.faz).toBe("secim");
      expect(new Set(k.secenekler).size).toBe(3);
      expect(k.secenekler.some((id) => perkBul(id)!.kaynak)).toBe(true);
    }
  });
  it("seçenekte olmayan perk seçilemez; seçim görevi başlatır", () => {
    const k = kosuBaslat(3);
    expect(perkSec(k, "yok")).toBe(false);
    expect(perkSec(k, k.secenekler[0])).toBe(true);
    expect(k.faz).toBe("gorev");
    expect(k.gorev).not.toBeNull();
  });
  it("enerji kaynağı yokken enerji görevi gelmez", () => {
    for (let t = 1; t <= 40; t++) {
      const k = kosuBaslat(t);
      k.secenekler = ["genis-batarya"];
      perkSec(k, "genis-batarya");
      expect(k.gorev!.tur).not.toBe("enerji");
    }
  });
  it("drift görevi nitelikli drift süresiyle tamamlanır, sonra yeni seçim gelir", () => {
    const k = hazirla(5, "drift-harvester", "drift");
    let r = null;
    for (let i = 0; i < 60 * 10 && !r; i++) r = kosuAdimi(k, durum(true), false, DT);
    expect(r).toBe("basari");
    expect(k.tamamlanan).toBe(1);
    expect(k.faz).toBe("secim");
    expect(k.secenekler.length).toBe(3);
    expect(k.secenekler).not.toContain("drift-harvester");
  });
  it("süre dolunca koşu biter; bitmiş koşu ilerlemez", () => {
    const k = hazirla(5, "drift-harvester", "drift");
    let r = null;
    for (let i = 0; i < 60 * 40 && !r; i++) r = kosuAdimi(k, durum(false), false, DT);
    expect(r).toBe("bitti");
    const z = k.zaman;
    expect(kosuAdimi(k, durum(true), false, DT)).toBeNull();
    expect(k.zaman).toBe(z);
  });
  it("hızlı yol görevi yalnız eşik üstü hızda ilerler", () => {
    const yavas = hazirla(9, "hiz-dinamosu", "hiz");
    for (let i = 0; i < 600; i++) kosuAdimi(yavas, durum(false, 20), false, DT);
    expect(yavas.gorev!.ilerleme).toBe(0);
    const hizli = hazirla(9, "hiz-dinamosu", "hiz");
    for (let i = 0; i < 60; i++) kosuAdimi(hizli, durum(false, 30), false, DT);
    expect(hizli.gorev!.ilerleme).toBeCloseTo(30, 6);
    expect(hizli.mek.enerji).toBeCloseTo(3, 6);
  });
  it("temiz drift görevi spinle biten drifti saymaz", () => {
    const k = hazirla(2, "drift-harvester", "temiz");
    const drift = (spin: boolean) => {
      for (let i = 0; i < 90; i++) kosuAdimi(k, durum(true), false, DT);
      kosuAdimi(k, durum(false, 20, spin ? 1.2 : 0), false, DT);
    };
    drift(true);
    expect(k.gorev!.ilerleme).toBe(0);
    drift(false);
    expect(k.gorev!.ilerleme).toBe(1);
  });
  it("Tutuş Darbesi koşuda enerji harcar ve özet sayar", () => {
    const k = hazirla(4, "drift-harvester", "drift");
    k.mek = { ...k.mek, enerji: 50 };
    kosuAdimi(k, durum(false), true, DT);
    expect(k.mek.enerji).toBe(50 - TUTUS_DARBESI.maliyet);
    kosuAdimi(k, durum(false), false, DT);
    const o = kosuOzeti(k);
    expect(o.darbe).toBe(1);
    expect(o.darbePayi).toBeGreaterThan(0);
  });
  it("aynı tohum ve girdilerle aynı koşu", () => {
    const kos = () => {
      const k = kosuBaslat(77);
      const sonuc: string[] = [];
      for (let i = 0; i < 60 * 120; i++) {
        if (k.faz == "secim") perkSec(k, k.secenekler[0]);
        if (k.faz == "bitti") break;
        const r = kosuAdimi(k, durum(i % 240 < 150, 30), i % 300 == 0, DT);
        if (r) sonuc.push(r + ":" + k.tamamlanan);
      }
      return { sonuc, ozet: kosuOzeti(k), perkler: k.perkler };
    };
    expect(kos()).toEqual(kos());
  });
});

describe("MUTANT ölçüm: sürüş yardımının Drift Hasadı'na etkisi (gerçek fizik)", () => {
  it(
    "Boş Otopark, Beyaz Kurt, drift önayarı, ölçülü sürücü: üç yardım seviyesinde enerji",
    { timeout: 60000 },
    () => {
      const sonuc: Record<string, { enerji: number; driftSn: number; spin: number }> = {};
      for (const lk of ["real", "norm", "arc"] as const) {
        const s = surucuKur({ dunya: 1, arac: 2, pk: "dr", lk });
        s.reset(30, -3550, 0);
        const { DR, D } = s.sim.d;
        const k = kosuBaslat(1);
        k.secenekler = ["drift-harvester"];
        perkSec(k, "drift-harvester");
        k.gorev = { tur: "drift", hedef: 1e9, sure: 1e9, kalan: 1e9, ilerleme: 0 };
        let ph = 0;
        for (let i = 0; i < 12 / DT; i++) {
          if (i == Math.round(3 / DT)) ph = 1;
          let sa = 0;
          if (ph == 1) {
            sa = 1;
            if (DR.on) ph = 2;
          } else if (ph == 2) sa = DR.dir * cl(2.2 * (0.55 - Math.abs(D.beta)), -1, 1);
          s.adim({ tg: sa, g: 1, b: 0, analogDireksiyon: true, analogGaz: false });
          kosuAdimi(k, s.sim.d, false, DT);
        }
        sonuc[lk] = {
          enerji: +k.mek.enerji.toFixed(2),
          driftSn: +k.gorev!.ilerleme.toFixed(2),
          spin: s.olaylar.spin,
        };
        expect(k.mek.enerji, lk).toBeGreaterThan(0);
      }
      mkdirSync("tests/cikti", { recursive: true });
      writeFileSync("tests/cikti/mutant-yardim.json", JSON.stringify(sonuc, null, 1));
    },
  );
});
