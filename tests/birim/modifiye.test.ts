// Modifiye: parça fiyatları, araç başına satın alma, takılı parçaların kaydı ve sürüşe uygulanması (oyun/modifiye.ts)
import { beforeEach, describe, expect, it } from "vitest";
import "../yardimci/sahte-tuval";
import { CARS } from "../../src/arac/araclar";
import { BASLANGIC_ARACLARI } from "../../src/oyun/ekonomi";

/** yeni oyuncunun sahip olduğu iki araç (başlangıç araçları) */
const [A, B] = BASLANGIC_ARACLARI;
import { KATEGORILER, PAKETLER, PARCALAR } from "../../src/arac/parcalar";
import {
  ilerlemeSifirla,
  para,
  paraEkle,
  parcaFiyati,
  parcaSahipMi,
  parcaSatinAl,
} from "../../src/oyun/ilerleme";
import { kurulum } from "../../src/oyun/kurulum";
import {
  modifiyeSifirla,
  modifiyeUygula,
  paketiTak,
  parcaSok,
  parcaTak,
  takiliParcalar,
} from "../../src/oyun/modifiye";

let depo: Record<string, string>;
beforeEach(() => {
  depo = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => depo[k] ?? null,
    setItem: (k: string, v: string) => (depo[k] = v),
  };
  ilerlemeSifirla();
  modifiyeSifirla();
  kurulum.mod = null;
});

describe("modifiye: fiyat ve satın alma", () => {
  it("zayıf parçalar ücretsiz, diğerleri ücretli; kategoride seviye arttıkça fiyat artar", () => {
    for (const p of PARCALAR) {
      if (p.sv == 0) expect(parcaFiyati(p.id)).toBe(0);
      else expect(parcaFiyati(p.id)).toBeGreaterThan(0);
      expect(parcaFiyati(p.id) % 50).toBe(0);
    }
    for (const [k] of KATEGORILER) {
      const l = PARCALAR.filter((p) => p.kat == k);
      for (const a of l)
        for (const b of l) if (a.sv < b.sv) expect(parcaFiyati(a.id)).toBeLessThan(parcaFiyati(b.id));
    }
    // tam paket bir orta sınıf aracın (3000-5000) altında kalır
    for (const pk of PAKETLER) {
      const t = pk.parcalar.reduce((a, id) => a + parcaFiyati(id), 0);
      expect(t).toBeGreaterThan(1000);
      expect(t).toBeLessThan(5000);
    }
  });

  it("parça araç başına alınır, para yetmezse alınmaz, iki kez ödenmez", () => {
    expect(parcaSahipMi(A, "motor-spor")).toBe(false);
    expect(parcaSatinAl(A, ["motor-spor"])).toBe(false);
    paraEkle(5000, "test");
    expect(parcaSatinAl(A, ["motor-spor"])).toBe(true);
    expect(para()).toBe(5000 - parcaFiyati("motor-spor"));
    expect(parcaSahipMi(A, "motor-spor")).toBe(true);
    expect(parcaSahipMi(B, "motor-spor")).toBe(false);
    expect(parcaSatinAl(A, ["motor-spor"])).toBe(true);
    expect(para()).toBe(5000 - parcaFiyati("motor-spor"));
    // paket: yalnız alınmamışların toplamı
    const pk = PAKETLER.find((p) => p.id == "asfalt")!;
    const once = para();
    expect(parcaSatinAl(A, pk.parcalar)).toBe(true);
    expect(once - para()).toBe(pk.parcalar.reduce((a, id) => a + parcaFiyati(id), 0));
  });
});

describe("modifiye: takılı parçalar ve sürüş", () => {
  it("alınmamış parça takılmaz; ücretsiz parça takılır; kategoride tek parça; sökülünce stok", () => {
    expect(parcaTak(A, "motor-spor")).toBe(false);
    expect(parcaTak(A, "motor-kisitli")).toBe(true);
    paraEkle(5000, "test");
    parcaSatinAl(A, ["motor-spor"]);
    expect(parcaTak(A, "motor-spor")).toBe(true);
    expect(takiliParcalar(A)).toEqual(["motor-spor"]);
    // kayıt kalıcı: bellek unutulsa da localStorage'dan gelir
    modifiyeSifirla();
    expect(takiliParcalar(A)).toEqual(["motor-spor"]);
    expect(takiliParcalar(B)).toEqual([]);
    parcaSok(A, "motor");
    expect(takiliParcalar(A)).toEqual([]);
  });

  it("stokta kurulum.mod yok, fizik aynı araç nesnesi; parçalıda güç artar ve lastik / önayar paketten gelir", () => {
    modifiyeUygula(A);
    expect(kurulum.mod).toBe(null);
    expect(kurulum.pk).toBe(CARS[A].pk);
    paraEkle(20000, "test");
    const dr = PAKETLER.find((p) => p.id == "drift")!;
    parcaSatinAl(A, [...dr.parcalar, "motor-yaris"]);
    expect(paketiTak(A, "drift")).toBe(true);
    parcaTak(A, "motor-yaris");
    modifiyeUygula(A);
    expect(kurulum.mod!.taban).toBe(CARS[A]);
    expect(kurulum.mod!.car.hp).toBeCloseTo(CARS[A].hp * 1.27, 5);
    expect(kurulum.pk).toBe("dr");
    expect(kurulum.tire).toBe(kurulum.mod!.tire);
  });

  it("eski kayıt (lt_parca yok ya da bozuk) stok araç verir", () => {
    depo.lt_parca = "bozuk{";
    modifiyeSifirla();
    expect(takiliParcalar(3)).toEqual([]);
    depo.lt_parca = JSON.stringify({ 3: ["yok-boyle-parca", "motor-kisitli"] });
    modifiyeSifirla();
    expect(takiliParcalar(3)).toEqual(["motor-kisitli"]);
  });
});
