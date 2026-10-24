// Modifiye: parça fiyatları, araç başına satın alma, takılı parçaların kaydı ve sürüşe uygulanması (oyun/modifiye.ts)
import { beforeEach, describe, expect, it } from "vitest";
import "../yardimci/sahte-tuval";
import { CARS } from "../../src/arac/araclar";
import { belgeOlustur, esitleyiciKur, type BulutBelgesi, type Saglayici } from "../../src/bulut/esitleme";
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
    removeItem: (k: string) => delete depo[k],
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
    expect(parcaSahipMi(0, "motor-spor")).toBe(false);
    expect(parcaSatinAl(0, ["motor-spor"])).toBe(false);
    paraEkle(5000, "test");
    expect(parcaSatinAl(0, ["motor-spor"])).toBe(true);
    expect(para()).toBe(5000 - parcaFiyati("motor-spor"));
    expect(parcaSahipMi(0, "motor-spor")).toBe(true);
    expect(parcaSahipMi(1, "motor-spor")).toBe(false);
    expect(parcaSatinAl(0, ["motor-spor"])).toBe(true);
    expect(para()).toBe(5000 - parcaFiyati("motor-spor"));
    // paket: yalnız alınmamışların toplamı
    const pk = PAKETLER.find((p) => p.id == "asfalt")!;
    const once = para();
    expect(parcaSatinAl(0, pk.parcalar)).toBe(true);
    expect(once - para()).toBe(pk.parcalar.reduce((a, id) => a + parcaFiyati(id), 0));
  });
});

describe("modifiye: takılı parçalar ve sürüş", () => {
  it("alınmamış parça takılmaz; ücretsiz parça takılır; kategoride tek parça; sökülünce stok", () => {
    expect(parcaTak(0, "motor-spor")).toBe(false);
    expect(parcaTak(0, "motor-kisitli")).toBe(true);
    paraEkle(5000, "test");
    parcaSatinAl(0, ["motor-spor"]);
    expect(parcaTak(0, "motor-spor")).toBe(true);
    expect(takiliParcalar(0)).toEqual(["motor-spor"]);
    // kayıt kalıcı: bellek unutulsa da localStorage'dan gelir
    modifiyeSifirla();
    expect(takiliParcalar(0)).toEqual(["motor-spor"]);
    expect(takiliParcalar(1)).toEqual([]);
    parcaSok(0, "motor");
    expect(takiliParcalar(0)).toEqual([]);
  });

  it("stokta kurulum.mod yok, fizik aynı araç nesnesi; parçalıda güç artar ve lastik / önayar paketten gelir", () => {
    modifiyeUygula(0);
    expect(kurulum.mod).toBe(null);
    expect(kurulum.pk).toBe(CARS[0].pk);
    paraEkle(20000, "test");
    const dr = PAKETLER.find((p) => p.id == "drift")!;
    parcaSatinAl(0, [...dr.parcalar, "motor-yaris"]);
    expect(paketiTak(0, "drift")).toBe(true);
    parcaTak(0, "motor-yaris");
    modifiyeUygula(0);
    expect(kurulum.mod!.taban).toBe(CARS[0]);
    expect(kurulum.mod!.car.hp).toBeCloseTo(CARS[0].hp * 1.27, 5);
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

describe("modifiye: bulut", () => {
  /** sahte bulut: eski kurallar (parca alanı yok) hasOnly gibi parca'lı belgeyi reddeder */
  function sahte(eskiKural: boolean) {
    const db = new Map<string, BulutBelgesi>();
    let yazma = 0;
    const s: Saglayici = {
      oturumDinle: () => {},
      anonimGir: async () => {},
      googleBagla: async () => {},
      epostaOlustur: async () => {},
      epostaGiris: async () => {},
      sifreSifirla: async () => {},
      adminMi: async () => false,
      cikis: async () => {},
      oku: async (u) => (db.has(u) ? structuredClone(db.get(u)!) : null),
      yaz: async (u, b) => {
        if (eskiKural && "parca" in b) throw { code: "permission-denied" };
        yazma++;
        db.set(u, structuredClone(b));
      },
    };
    return { s, db, yazma: () => yazma };
  }
  const cihaz = () => {
    depo = {};
    ilerlemeSifirla();
    modifiyeSifirla();
  };

  it("takılı parçalar buluta gider ve başka cihazda geri gelir", async () => {
    const B = sahte(false);
    const e = esitleyiciKur(B.s, { gecikme: 0 });
    await e.oturum("u1");
    paraEkle(5000, "test");
    parcaSatinAl(0, ["motor-spor"]);
    parcaTak(0, "motor-spor");
    await e.simdiGonder();
    expect(B.db.get("u1")!.parca).toEqual({ 0: ["motor-spor"] });
    e.kapat();
    // ikinci cihaz: aynı hesap
    cihaz();
    const e2 = esitleyiciKur(B.s, { gecikme: 0 });
    await e2.oturum("u1");
    expect(takiliParcalar(0)).toEqual(["motor-spor"]);
    expect(e2.durum()).toBe("tamam");
    e2.kapat();
  });

  it("eski kurallar parca alanını reddederse kayıt onsuz gider, kuyruk takılmaz, parçalar cihazda kalır", async () => {
    const B = sahte(true);
    const e = esitleyiciKur(B.s, { gecikme: 0 });
    await e.oturum("u2");
    paraEkle(5000, "test");
    parcaSatinAl(0, ["motor-spor"]);
    parcaTak(0, "motor-spor");
    await e.simdiGonder();
    const b = B.db.get("u2")!;
    expect(b.parca).toBeUndefined();
    expect(b.alimlar["parca_0_motor-spor"]).toBeGreaterThan(0);
    expect(e.durum()).toBe("tamam");
    expect(takiliParcalar(0)).toEqual(["motor-spor"]);
    // sonraki değişiklik de takılmadan gider
    paraEkle(100, "test");
    await e.simdiGonder();
    expect(B.db.get("u2")!.kazanilan).toBe(5100);
    e.kapat();
  });

  it("başka hesaba geçişte takılı parçalar o hesabınkiyle değişir", async () => {
    const B = sahte(false);
    B.db.set("u3", { ...belgeOlustur(), parca: { 2: ["motor-kisitli"] } });
    paraEkle(5000, "test");
    parcaSatinAl(0, ["motor-spor"]);
    parcaTak(0, "motor-spor");
    depo.lt_bulut = JSON.stringify({ bekleyen: false, sahip: "baska" });
    const e = esitleyiciKur(B.s, { gecikme: 0 });
    await e.oturum("u3");
    expect(takiliParcalar(0)).toEqual([]);
    expect(takiliParcalar(2)).toEqual(["motor-kisitli"]);
    e.kapat();
  });
});
