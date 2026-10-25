import "../yardimci/sahte-tuval";
import { beforeEach, describe, expect, test } from "vitest";
import { aracAdimi, aracOrnegiYap } from "../../src/fizik/arac-ornegi";
import { bosGirdi } from "../../src/fizik/girdi-kaydi";
import type { DunyaSorgusu, FizikOlaylari } from "../../src/fizik/tipler";
import { hayaletGirdiKaydiOku, hayaletKaydet, hayaletOku } from "../../src/oyun/hayalet-kayit";
import { HAYALET, rekorHayaleti, rekorHayaletiBaslat, rekorHayaletiDurdur, uzak, uzakAdimi } from "../../src/oyun/uzak";
import { kurulumYap } from "../yardimci/surucu";

const sahteOlay: FizikOlaylari = {
  spin: () => {},
  puf: () => {},
  caliRengi: () => 0,
};

const sahteDunya: DunyaSorgusu = {
  H: () => 0,
  surf: () => 0,
  yakin: () => [],
  kutu: (): [number, number, number, number] => [-1000, 1000, -1000, 1000],
  kerb: () => 0,
  havaTutusu: () => 1,
  karli: () => false,
  yolTuru: () => null,
};

describe("Hayalet tur kaydı ve oynatma", () => {
  beforeEach(() => {
    localStorage.clear();
    rekorHayaletiDurdur();
  });

  test("hayalet kaydı kaydetme, okuma ve derece karşılaştırması", () => {
    const k = kurulumYap(0, "ar", "real");
    const a = aracOrnegiYap(
      { dunya: sahteDunya, kurulum: k, olay: sahteOlay, gorselRng: Math.random },
      123,
    );

    for (let i = 0; i < 10; i++) {
      aracAdimi(a, { ...bosGirdi(), g: 1, tg: 0.1 * i });
    }

    // İlk rekor: 50 saniye
    const kayit1 = hayaletKaydet("test_pist_1", 0, 50.0, a.kayit);
    expect(kayit1).toBe(true);

    const okunan1 = hayaletOku("test_pist_1");
    expect(okunan1).not.toBeNull();
    expect(okunan1?.sure).toBe(50.0);
    expect(okunan1?.arac).toBe(0);

    // Kötü derece: 55 saniye (güncellenmemeli)
    const kayitKotu = hayaletKaydet("test_pist_1", 1, 55.0, a.kayit);
    expect(kayitKotu).toBe(false);
    expect(hayaletOku("test_pist_1")?.sure).toBe(50.0);

    // İyi derece: 42 saniye (güncellenmeli)
    const kayitIyi = hayaletKaydet("test_pist_1", 2, 42.0, a.kayit);
    expect(kayitIyi).toBe(true);
    expect(hayaletOku("test_pist_1")?.sure).toBe(42.0);
    expect(hayaletOku("test_pist_1")?.arac).toBe(2);

    const girdiVeri = hayaletGirdiKaydiOku("test_pist_1");
    expect(girdiVeri).not.toBeNull();
    expect(girdiVeri?.kayit.n).toBe(10);
  });

  test("rekor hayaleti başlatma ve adım adım oynatma", () => {
    const k = kurulumYap(0, "ar", "real");
    const a = aracOrnegiYap(
      { dunya: sahteDunya, kurulum: k, olay: sahteOlay, gorselRng: Math.random },
      456,
    );

    for (let i = 0; i < 15; i++) {
      aracAdimi(a, { ...bosGirdi(), g: 1 });
    }

    hayaletKaydet("test_pist_2", 1, 30.0, a.kayit);

    // Hayaleti başlat
    const basladi = rekorHayaletiBaslat("test_pist_2", sahteDunya);
    expect(basladi).toBe(true);
    expect(rekorHayaleti.aktif).toBe(true);

    const ghostUzakArac = uzak.araclar.find((u) => u.id == HAYALET);
    expect(ghostUzakArac).toBeDefined();

    // 5 fizik adımı ilerlet
    for (let i = 0; i < 5; i++) {
      uzakAdimi();
    }

    expect(rekorHayaleti.adimIndex).toBe(5);

    // Hayaleti durdur
    rekorHayaletiDurdur();
    expect(rekorHayaleti.aktif).toBe(false);
    expect(uzak.araclar.find((u) => u.id == HAYALET)).toBeUndefined();
  });
});
