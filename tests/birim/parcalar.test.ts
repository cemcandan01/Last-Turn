// Modifiye parçaları ve performans puanı: stok araç bugünkü fizikle birebir aynı, puan belirlenimci, parça takıp
// sökmek puanı tutarlı değiştirir, paketler türün kurulumunu ve tür uyumunu verir.
import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import {
  aracKur,
  birlikteOlur,
  KATEGORILER,
  paketTak,
  PAKETLER,
  PARCALAR,
  parcaliKurulum,
  parcalariDuzenle,
} from "../../src/arac/parcalar";
import { parcaPuanFarki, performansPuani, SINIFLAR, sinifHarfi } from "../../src/arac/performans";
import { Simulasyon } from "../../src/fizik/simulasyon";
import type { DunyaSorgusu, FizikBaglami, SurusKurulumu } from "../../src/fizik/tipler";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import { frensiz, gazlaKaydir } from "../yardimci/denemeler";
import { kurulumYap } from "../yardimci/surucu";
import { enIyiTur, virajTutusu } from "../yardimci/uyum";

const sira = CARS.map((_c, i) => i);

/** düz asfaltta kısa bir sürüş (gaz, direksiyon, fren): son durum */
function sur(K: SurusKurulumu) {
  const W: DunyaSorgusu = {
    H: () => 0,
    surf: () => 1,
    yakin: () => [],
    kutu: () => [-1e5, 1e5, -1e5, 1e5],
    kerb: () => 0,
    havaTutusu: () => 1,
    karli: () => false,
    yolTuru: () => "gp",
  };
  const sim = new Simulasyon(3),
    cx: FizikBaglami = {
      dunya: W,
      kurulum: K,
      olay: { spin: () => {}, puf: () => {}, caliRengi: () => 0 },
      rng: sim.rng,
      gorselRng: () => 0.5,
    };
  sim.sifirla(0, 0, 0, 0);
  for (let k = 0; k < 360; k++)
    sim.adim(
      {
        tg: k > 180 ? 0.6 : 0,
        g: k < 300 ? 1 : 0,
        b: k >= 300 ? 1 : 0,
        analogDireksiyon: true,
        analogGaz: true,
      },
      cx,
    );
  const S = sim.d.S;
  return [S.x, S.z, S.h, S.vx, S.vz, S.w];
}

describe("parçalar", () => {
  it("stok araç: aynı nesne, aynı kurulum, aynı fizik", () => {
    for (const a of sira) {
      const P = aracKur(a, []);
      expect(P.car).toBe(CARS[a]);
      expect(P.pk).toBe(CARS[a].pk);
      for (const lk of ["arc", "norm", "real"] as const) {
        const K = parcaliKurulum(a, [], lk),
          E = kurulumYap(a, CARS[a].pk, lk);
        expect(K).toEqual(E);
      }
      expect(sur(parcaliKurulum(a, [], "norm"))).toEqual(sur(kurulumYap(a, CARS[a].pk, "norm")));
    }
  });

  it("veri: kimlikler benzersiz, kategoriler tanımlı, paket parçaları var ve kategorileri ayrı", () => {
    const ids = PARCALAR.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const kat = new Set(KATEGORILER.map(([k]) => k));
    for (const p of PARCALAR) expect(kat.has(p.kat), p.id).toBe(true);
    for (const pk of PAKETLER) {
      for (const id of pk.parcalar) expect(ids, pk.id).toContain(id);
      expect(parcalariDuzenle(pk.parcalar).length, pk.id).toBe(pk.parcalar.length);
    }
  });

  it("her kategoride tek parça: son takılan geçer, bilinmeyen atılır", () => {
    expect(parcalariDuzenle(["motor-spor", "yok", "motor-yaris", "fren-spor"])).toEqual([
      "motor-yaris",
      "fren-spor",
    ]);
    expect(birlikteOlur("motor-spor", "motor-yaris")).toBe(false);
    expect(birlikteOlur("motor-spor", "turbo-kucuk")).toBe(true);
    expect(birlikteOlur("turbo-buyuk", "kompresor")).toBe(false);
    // paket aynı kategorideki eski parçanın yerine geçer
    expect(paketTak(["lastik-yaris", "motor-spor"], "ralli")).toEqual([
      "motor-spor",
      "lastik-toprak",
      "suspansiyon-ralli",
      "koruma",
    ]);
  });

  it("parça etkileri araç değerlerine işler, stok araç değişmez", () => {
    const hp0 = CARS[0].hp,
      P = aracKur(0, ["motor-yaris", "agirlik-2", "turbo-buyuk"]);
    expect(P.car.hp).toBeCloseTo(hp0 * 1.27 * 1.3, 6);
    expect(P.car.kg).toBeCloseTo(CARS[0].kg * 0.9, 6);
    // turbosuz araca turbo: basınçsız güç stokla aynı
    expect(P.car.hp * (1 - P.car.tb!)).toBeCloseTo(hp0 * 1.27, 6);
    expect(CARS[0].hp).toBe(hp0);
    expect(CARS[0].tb).toBeUndefined();
    // dört çekere geçiş ağırlık ekler, zaten dört çekerde eklemez
    expect(aracKur(0, ["cekis-dort"]).car.kg).toBeCloseTo(CARS[0].kg * 1.05, 6);
    expect(aracKur(1, ["cekis-dort"]).car.kg).toBe(CARS[1].kg);
  });

  it("paketler: kurulum, önayar ailesi ve tür uyumu", () => {
    const d = aracKur(0, paketTak([], "drift")),
      K = parcaliKurulum(0, paketTak([], "drift"), "norm");
    expect(d.pk).toBe("dr");
    expect(d.tire).toBe(3);
    expect(K.tu.diff).toBe(1.15);
    expect(K.car.dmax).toBe(1);
    // drift önayar ailesinin yardım tabanı (drift başlatma)
    expect(K.as.ini).toBeGreaterThanOrEqual(0.8);
    const r = aracKur(0, paketTak([], "ralli"));
    expect(r.pk).toBe("rl");
    expect(r.tire).toBe(1);
    expect(r.car.uzT!.rl).toEqual([1.15, 1.4]);
    expect(r.uyum.rl).toBe(1);
    // asfalt aracının kendi uzmanlığı korunur
    expect(r.car.uzT!.gp).toEqual([CARS[0].uz, 1]);
    // yarım paket: uyumun üçte ikisi, önayar ailesi değişir; üçte biri değişmez
    const y = aracKur(2, ["lastik-yaris", "suspansiyon-yaris"]);
    expect(y.car.uzT!.gp![0]).toBeCloseTo(1 + 0.12 * (2 / 3), 6);
    expect(y.pk).toBe("ar");
    expect(aracKur(2, ["lastik-yaris"]).pk).toBe("dr");
  });
});

describe("performans puanı", () => {
  it("belirlenimci ve sınırlı; sınıf harfi tabloyla uyumlu", () => {
    for (const a of sira) {
      const p = performansPuani(a),
        q = performansPuani(a);
      expect(p).toEqual(q);
      expect(p.puan).toBeGreaterThanOrEqual(100);
      expect(p.puan).toBeLessThanOrEqual(999);
      expect(p.sinif).toBe(sinifHarfi(p.puan));
    }
    for (const s of SINIFLAR) {
      expect(sinifHarfi(s.min)).toBe(s.h);
      expect(sinifHarfi(s.max)).toBe(s.h);
    }
  });

  it("parça takmak ve sökmek tutarlı: güçlü parça artırır, zayıf azaltır, sökünce stok", () => {
    for (const a of sira) {
      const s = performansPuani(a).puan;
      expect(parcaPuanFarki(a, [], "motor-yaris"), CARS[a].n).toBeGreaterThan(0);
      expect(parcaPuanFarki(a, [], "agirlik-3"), CARS[a].n).toBeGreaterThan(0);
      // zayıf parça puanı düşürür (asfalt puanında; genel puan toprakta çekiş sınırlıyken ±1 oynayabilir)
      const asfalt = performansPuani(a, [], "gp"),
        kisitli = performansPuani(a, ["motor-kisitli"], "gp");
      // Puan tabanı 100: daha yavaş araç orada aynı puanda kalabilir; fizik etkisi yine ölçülür.
      expect(kisitli.puan, CARS[a].n).toBeLessThanOrEqual(asfalt.puan);
      expect(kisitli.tur, CARS[a].n).toBeGreaterThan(asfalt.tur);
      expect(parcaPuanFarki(a, [], "motor-kisitli"), CARS[a].n).toBeLessThanOrEqual(1);
      expect(performansPuani(a, ["agirlik-balast"], "gp").tur, CARS[a].n).toBeGreaterThan(asfalt.tur);
      // daha güçlü motor daha çok puan
      expect(performansPuani(a, ["motor-yaris"]).puan).toBeGreaterThan(
        performansPuani(a, ["motor-spor"]).puan,
      );
      // sırası önemsiz, sökünce stoka döner
      expect(performansPuani(a, ["motor-spor", "agirlik-2"])).toEqual(
        performansPuani(a, ["agirlik-2", "motor-spor"]),
      );
      expect(
        performansPuani(
          a,
          parcalariDuzenle(["motor-spor"]).filter((x) => x != "motor-spor"),
        ).puan,
      ).toBe(s);
    }
  });
});

describe("hissiyat: parçalar hissedilir, kurallar korunur", () => {
  it(
    "lastik bileşeni asfaltta yanal tutuşu değiştirir: yarış > spor > sokak > drift (Kızıl Ok)",
    { timeout: 60000 },
    () => {
      const g = (p: string[]) => virajTutusu(0, 1, null, 35, p),
        y = g(["lastik-yaris"]),
        sp = g(["lastik-spor"]),
        so = g(["lastik-sokak"]),
        d = g(["lastik-drift"]);
      expect(y, "yarış / spor").toBeGreaterThan(sp * 1.08);
      expect(sp, "spor / sokak").toBeGreaterThan(so * 1.03);
      expect(so, "sokak / drift").toBeGreaterThan(d * 1.05);
    },
  );

  it(
    "süspansiyon: ralli süspansiyonu engebeli etapta, yarış süspansiyonu asfaltta iyi (Kızıl Ok, toprak lastiği, dört çeker)",
    { timeout: 180000 },
    () => {
      const b = ["lastik-toprak", "cekis-dort"],
        c = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3],
        etap = (s: string) => enIyiTur(pistNo("rl", 4), 0, c, { parca: [...b, s] }).t;
      expect(etap("suspansiyon-yaris"), "ralli etabı (seviye 4) süresi").toBeGreaterThan(
        etap("suspansiyon-ralli") * 1.03,
      );
      const asf = (s: string) => virajTutusu(0, 1, null, 35, [s]);
      expect(asf("suspansiyon-yaris"), "asfaltta yanal tutuş").toBeGreaterThan(
        asf("suspansiyon-ralli") * 1.03,
      );
    },
  );

  it("aero: büyük kanat hızlı virajda tutuşu artırır (Kızıl Ok, 140 m yarıçap)", { timeout: 60000 }, () => {
    expect(virajTutusu(0, 1, null, 140, ["aero-buyuk"])).toBeGreaterThan(
      virajTutusu(0, 1, null, 140, []) * 1.1,
    );
  });

  it("diferansiyel: kilitli diferansiyel gazla arkayı kaydırır, açık diferansiyel kararlı (Turuncu Ejder)", () => {
    const acik = gazlaKaydir(9, ["diferansiyel-acik"], 16, 0.35).kayma,
      kilitli = gazlaKaydir(9, ["diferansiyel-kilitli"], 16, 0.35).kayma;
    expect(kilitli - acik, `açık ${acik.toFixed(0)}°, kilitli ${kilitli.toFixed(0)}°`).toBeGreaterThan(25);
  });

  it("açı kiti teker açısını büyütür (stokta 0,8 rad sınırı)", () => {
    expect(gazlaKaydir(2, [], 12, 1).delta).toBeLessThanOrEqual(0.8 + 1e-9);
    expect(gazlaKaydir(2, ["aci-kiti"], 12, 1).delta).toBeGreaterThan(0.85);
  });

  it(
    "toprakta tam gaz + tam direksiyon ralli paketiyle de tutunmaz (Kızıl Ok, rallikros paketi, dört çeker, yarış motoru)",
    { timeout: 60000 },
    () => {
      const r = frensiz(pistNo("rx", 2), 0, "real", 120, [
        "lastik-toprak",
        "suspansiyon-rallikros",
        "diferansiyel-ralli",
        "cekis-dort",
        "motor-yaris",
      ]);
      expect(r.disari + 3 * r.spin, "pist dışında geçen süre + spin").toBeGreaterThan(4);
    },
  );
});
