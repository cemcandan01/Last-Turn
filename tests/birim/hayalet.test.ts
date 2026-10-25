import "../yardimci/sahte-tuval";
import { beforeEach, describe, expect, test } from "vitest";
import { aracAdimi, aracOrnegiYap } from "../../src/fizik/arac-ornegi";
import { bosGirdi } from "../../src/fizik/girdi-kaydi";
import type { DunyaSorgusu, FizikOlaylari } from "../../src/fizik/tipler";
import { hayaletGirdiKaydiOku, hayaletKaydet, hayaletOku } from "../../src/oyun/hayalet-kayit";
import {
  HAYALET,
  rekorHayaleti,
  rekorHayaletiBaslat,
  rekorHayaletiDurdur,
  uzak,
  uzakAdimi,
} from "../../src/oyun/uzak";
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
    const a = aracOrnegiYap({ dunya: sahteDunya, kurulum: k, olay: sahteOlay, gorselRng: Math.random }, 123);

    for (let i = 0; i < 10; i++) {
      aracAdimi(a, { ...bosGirdi(), g: 1, tg: 0.1 * i });
    }

    // İlk rekor: 50 saniye
    const kayit1 = hayaletKaydet("test_pist_1", 0, 50.0, a.kayit, false, k);
    expect(kayit1).toBe(true);

    const okunan1 = hayaletOku("test_pist_1");
    expect(okunan1).not.toBeNull();
    expect(okunan1?.sure).toBe(50.0);
    expect(okunan1?.arac).toBe(0);

    // Kötü derece: 55 saniye (güncellenmemeli)
    const kayitKotu = hayaletKaydet("test_pist_1", 1, 55.0, a.kayit, false, k);
    expect(kayitKotu).toBe(false);
    expect(hayaletOku("test_pist_1")?.sure).toBe(50.0);

    // İyi derece: 42 saniye (güncellenmeli)
    const kayitIyi = hayaletKaydet("test_pist_1", 2, 42.0, a.kayit, false, k);
    expect(kayitIyi).toBe(true);
    expect(hayaletOku("test_pist_1")?.sure).toBe(42.0);
    expect(hayaletOku("test_pist_1")?.arac).toBe(2);

    const girdiVeri = hayaletGirdiKaydiOku("test_pist_1");
    expect(girdiVeri).not.toBeNull();
    expect(girdiVeri?.kayit.n).toBe(10);
  });

  test("rekor hayaleti başlatma ve adım adım oynatma", () => {
    const k = kurulumYap(0, "ar", "real");
    const a = aracOrnegiYap({ dunya: sahteDunya, kurulum: k, olay: sahteOlay, gorselRng: Math.random }, 456);

    for (let i = 0; i < 15; i++) {
      aracAdimi(a, { ...bosGirdi(), g: 1 });
    }

    hayaletKaydet("test_pist_2", 1, 30.0, a.kayit, false, k);

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

describe("hayalet sürüş doğruluğu", () => {
  beforeEach(() => {
    localStorage.clear();
    rekorHayaletiDurdur();
  });
  test("farklı araçla yarışa girilse de kaydedilen araç ve kurulumla aynı konumda biter", () => {
    const k = kurulumYap(10, "ar", "real");
    const a = aracOrnegiYap({ dunya: sahteDunya, kurulum: k, olay: sahteOlay, gorselRng: Math.random }, 789);
    for (let n = 0; n < 180; n++) aracAdimi(a, { ...bosGirdi(), g: 0.8, tg: n < 90 ? 0.1 : -0.1 });
    hayaletKaydet("dogruluk", 10, 3, a.kayit, false, k);
    expect(rekorHayaletiBaslat("dogruluk", sahteDunya)).toBe(true);
    expect(rekorHayaleti.cx!.kurulum.car.hp).toBe(k.car.hp);
    for (let n = 0; n < a.kayit.n; n++) uzakAdimi();
    expect(rekorHayaleti.sim!.S.x).toBeCloseTo(a.sim.S.x, 7);
    expect(rekorHayaleti.sim!.S.z).toBeCloseTo(a.sim.S.z, 7);
    expect(rekorHayaleti.sim!.S.h).toBeCloseTo(a.sim.S.h, 7);
  });
});

describe("hayalet kayıt sınırları", () => {
  beforeEach(() => {
    localStorage.clear();
    rekorHayaletiDurdur();
  });
  const hazir = () => {
    const k = kurulumYap(10, "ar", "real");
    const a = aracOrnegiYap({ dunya: sahteDunya, kurulum: k, olay: sahteOlay, gorselRng: Math.random }, 42);
    for (let n = 0; n < 180; n++) aracAdimi(a, { ...bosGirdi(), g: 0.8 });
    return { k, a };
  };
  test("kurulum kopyası korunur, serbest turun başlangıç öncesi girdileri atlanır", () => {
    const { k, a } = hazir();
    const ilkGuc = k.tu.pow;
    expect(hayaletKaydet("tur", 10, 1.5, a.kayit, false, k, 90, { tutus: 0.8, karli: false })).toBe(true);
    k.tu.pow = 0.1;
    expect(rekorHayaletiBaslat("tur", sahteDunya)).toBe(true);
    expect(rekorHayaleti.adimIndex).toBe(90);
    expect(rekorHayaleti.cx!.kurulum.tu.pow).toBe(ilkGuc);
    expect(rekorHayaleti.cx!.dunya.havaTutusu()).toBe(0.8);
    rekorHayaletiDurdur();
    hayaletKaydet("kuru", 10, 1.5, a.kayit, false, { ...k, tu: { ...k.tu, pow: ilkGuc } }, 90);
    rekorHayaletiBaslat("kuru", sahteDunya);
    for (let n = 90; n < 180; n++) uzakAdimi();
    expect(rekorHayaleti.sim!.S.z).toBeCloseTo(a.sim.S.z, 7);
  });
  test("piste dönüşle kesilmiş, taşmış ve bozuk/eski kayıt oynatılmaz", () => {
    const { k, a } = hazir();
    a.kayit.kesik = true;
    expect(hayaletKaydet("kesik", 10, 3, a.kayit, false, k)).toBe(false);
    a.kayit.kesik = false;
    a.kayit.tasti = true;
    expect(hayaletKaydet("tasdi", 10, 3, a.kayit, false, k)).toBe(false);
    localStorage.setItem(
      "lt_hayalet_eski",
      JSON.stringify({ k: "eski", arac: 10, sure: 2, girdiJson: "bozuk" }),
    );
    expect(rekorHayaletiBaslat("eski", sahteDunya)).toBe(false);
    expect(uzak.araclar.some((u) => u.id === HAYALET)).toBe(false);
  });
});
