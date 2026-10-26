import { readFileSync } from "node:fs";
import { kariyerOlcumImzasi } from "../yardimci/kariyer-imza";
import { beforeEach, describe, expect, it } from "vitest";
import "../yardimci/sahte-tuval";
import { CARS } from "../../src/arac/araclar";
import { PARCALAR } from "../../src/arac/parcalar";
import { TIRES } from "../../src/fizik/veriler";
import { yarisLastigi } from "../../src/arac/yaris-lastigi";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { kariyerKurali, kariyerYildizKapisi, kariyereUygun } from "../../src/oyun/kariyer";
import {
  ARAC_FIYAT,
  BASLANGIC_ARACLARI,
  PARCA_OZEL_FIYAT,
  yarisOdulTabani,
  yarisOdulu,
} from "../../src/oyun/ekonomi";
import {
  ilerlemeSifirla,
  ilerlemeVerisi,
  para,
  paraEkle,
  parcaAlimBedeli,
  parcaFiyati,
  parcaSatinAl,
  pistAcikMi,
  yarisBitti,
  ilerlemeYukle,
} from "../../src/oyun/ilerleme";
import { enIyiYildiz } from "../../src/oyun/yildiz";

beforeEach(() => {
  const depo: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (k) => depo[k] ?? null,
    setItem: (k, v) => {
      depo[k] = v;
    },
    removeItem: (k) => {
      delete depo[k];
    },
    clear: () => {},
    key: () => null,
    length: 0,
  };
  ilerlemeSifirla();
});

describe("kariyer sözleşmesi", () => {
  it("40 pistin kimliği, hedef kurulumu, bütçesi ve ödül süresi tanımlıdır", () => {
    expect(TDEF).toHaveLength(40);
    for (const d of TDEF) {
      const k = kariyerKurali(d.t, d.lv)!;
      expect(k.asama).toBe(d.sev ?? d.lv);
      expect(CARS[k.arac]).toBeDefined();
      expect(k.parca.every((id) => PARCALAR.some((p) => p.id == id))).toBe(true);
      expect(kariyereUygun(d.t, d.lv, k.arac, k.parca), d.n).toBe(true);
      expect(d.odulSn, d.n + " ölçüm eksik").toBeGreaterThan(0);
      const rapor = JSON.parse(readFileSync("docs/denge/2026-10-25-kariyer-olcum.json", "utf8"));
      const kayit = rapor.satirlar.find((r: { tur: string; lv: number }) => r.tur == d.t && r.lv == d.lv);
      expect(kayit, d.n + " ölçüm kaydı").toBeDefined();
      expect(kayit.kurulumImza, d.n + " fizik/kurulum/geometri değişti; yeniden ölç").toBe(
        kariyerOlcumImzasi(d),
      );
      expect(kayit.esikler).toEqual([d.t == "dp" ? d.hp : d.tg, ...d.ys!]);
    }
    expect(kariyerKurali("dg", 7)!.asama).toBe(1);
    expect(kariyerKurali("gp", 7)!.asama).toBe(2);
  });
  it("bütün türlerde yıldız bonusu bölünerek artırılamaz; yalnız ek sürüşün tabanı ödenir", () => {
    for (const d of TDEF) {
      const b = yarisOdulTabani(d.t, d.lv),
        direkt = yarisOdulu(d.t, d.lv, 3, 0);
      const parcalar = [1, 2, 3].map((y) => yarisOdulu(d.t, d.lv, y, y - 1));
      expect(parcalar.reduce((n, p) => n + p.para, 0) - 2 * b.para, d.n).toBe(direkt.para);
      expect(parcalar.reduce((n, p) => n + p.xp, 0) - 2 * b.xp, d.n).toBe(direkt.xp);
    }
  });
  it("ödül/dakika aynı aşamada türe bağlı bir farm üstünlüğü yaratmaz", () => {
    for (const d of TDEF) {
      const k = kariyerKurali(d.t, d.lv)!,
        b = yarisOdulTabani(d.t, d.lv);
      const oran = b.para / (k.referansSn / 60) / [140, 170, 205, 245, 290, 340][k.asama - 1];
      expect(oran, d.n).toBeGreaterThan(0.85);
      expect(oran, d.n).toBeLessThan(1.15);
    }
  });
  it.each(["gp", "rx", "rl", "dp", "dg"] as const)(
    "%s tek disiplin rotası iki yıldızla bütün aşamalara ulaşır",
    (tur) => {
      const pistler = TDEF.filter((d) => d.t == tur).sort((a, b) => (a.sev ?? a.lv) - (b.sev ?? b.lv));
      for (const d of pistler) {
        expect(pistAcikMi(tur, d.lv), d.n).toBe(true);
        yarisBitti(tur, d.lv, 2);
      }
      expect(kariyerYildizKapisi(tur, 6, enIyiYildiz).acik).toBe(true);
    },
  );
  it("yeni içerikte araç fiyatı unutulamaz; büyük güç dönüşümü ucuz sıradan parça olamaz", () => {
    expect(ARAC_FIYAT).toHaveLength(CARS.length);
    for (const [i, f] of ARAC_FIYAT.entries()) {
      if (BASLANGIC_ARACLARI.includes(i)) expect(f.para).toBe(0);
      else expect(f.para, CARS[i].n + " edinme bütçesi").toBeGreaterThanOrEqual(20 * 2 * 140);
    }
    for (const p of PARCALAR) {
      if (p.e.motorHp != null || (p.e.carp?.hp ?? 1) > 1.3 || (p.e.turbo?.guc ?? 1) > 1.4) {
        expect(PARCA_OZEL_FIYAT[p.id], p.n + " büyük dönüşüm fiyatı").toBeGreaterThanOrEqual(5500);
      }
    }
  });
  it("ilk sokak motoru her başlangıç disiplininde yaklaşık 2–4 dakikalık geçerli sürüşle alınabilir", () => {
    for (const d of TDEF.filter((d) => d.lv == 1)) {
      const k = kariyerKurali(d.t, 1)!,
        odul = yarisOdulu(d.t, 1, 1, 0).para;
      // İlk koşu yeni 1★, sonraki koşular olağan tekrar ödülü; aynı yıldız bonusu tekrar verilmez.
      const tekrar = yarisOdulTabani(d.t, 1).para;
      const yaris = 1 + Math.max(0, Math.ceil((parcaFiyati("motor-sokak") - odul) / tekrar));
      const dakika = (yaris * k.referansSn) / 60;
      expect(dakika, d.n).toBeGreaterThan(1.5);
      expect(dakika, d.n).toBeLessThan(4.5);
    }
  });
  it("Usta kupasında tek sokak motoru bütün türlerin üç yıldızını temizleyemez", () => {
    const rapor = JSON.parse(readFileSync("docs/denge/2026-10-25-yatirim-olcum.json", "utf8"));
    const tek = rapor.satirlar.filter((r: { ad: string }) => r.ad == "Tek sokak motoru");
    expect(tek).toHaveLength(5);
    for (const r of rapor.satirlar) {
      const d = TDEF.find((d) => d.t == r.tur && d.lv == r.lv)!;
      expect(r.kurulumImza, d.n + " yatırım örneğini yeniden ölç").toBe(kariyerOlcumImzasi(d, r));
    }
    for (const r of tek.filter((r: { sonuc: number | null }) => r.sonuc != null)) {
      const d = TDEF.find((d) => d.t == r.tur && d.lv == r.lv)!;
      if (d.t == "dp") expect(r.sonuc).toBeLessThan(d.ys![1]);
      else expect(r.sonuc).toBeGreaterThan(d.ys![1]);
    }
  });
  it("kategori yatırımı ardışık yükseltmede bir kez ödenir; eski alımlar ve bulut kaybolmaz", () => {
    paraEkle(30000, "test");
    for (const id of ["motor-sokak", "motor-spor", "motor-yaris"]) {
      const once = para(),
        net = parcaAlimBedeli(10, [id]);
      expect(parcaSatinAl(10, [id, id])).toBe(true);
      expect(once - para()).toBe(net);
    }
    expect(30000 - para()).toBe(parcaFiyati("motor-yaris"));
    const kayit = structuredClone(ilerlemeVerisi());
    expect(Object.keys(kayit.alimlar)).toHaveLength(3);
    ilerlemeYukle(kayit);
    expect(parcaAlimBedeli(10, ["motor-degisim"])).toBe(
      parcaFiyati("motor-degisim") - parcaFiyati("motor-yaris"),
    );
    expect(parcaSatinAl(10, ["motor-sokak"])).toBe(true);
    expect(ilerlemeVerisi().alimlar).toEqual(kayit.alimlar);
  });
  it("bileşik otomatik, alınan kalite gerçek tutuşa işler; serbest sürüş bileşikleri korunur", () => {
    for (const tur of ["gp", "rx", "rl", "dp", "dg"] as const) {
      const stok = TIRES[yarisLastigi(tur)],
        spor = TIRES[yarisLastigi(tur, ["lastik-spor"])];
      expect(spor.n).toBe(stok.n + " · K2");
      expect(spor.g[0]).toBeGreaterThan(stok.g[0]);
      expect(spor.g[1]).toBeGreaterThan(stok.g[1]);
    }
    expect(TIRES[0].n).toBe("Yarış");
    expect(TIRES[6].n).toBe("Drag");
  });
});
