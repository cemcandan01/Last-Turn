import { describe, expect, it } from "vitest";
import { KW, mkTrack } from "../../src/dunya/pist";
import {
  bosKesme,
  bosPistDisi,
  kesmeAdimi,
  pistDisiAdimi,
  pistKenari,
  pistKonumu,
} from "../../src/oyun/piste-donus";
import { hasarAl, kesmeCezasi, kosuBaslat } from "../../src/oyun/mutant-kosu";

const TR = mkTrack(
  [
    [0, 0],
    [0, 120],
  ],
  5,
  true,
);
describe("pist dışından dönüş", () => {
  it("1 sn bekleme + 5 sn sayımın tam sonunda dönmez; sonraki adım ilk çıkışın izdüşümünü döndürür", () => {
    const s = bosPistDisi();
    for (let i = 0; i < 360; i++) expect(pistDisiAdimi(s, TR, 8, 21 + i / 10, 5, 1 / 60)).toBeNull();
    const p = pistDisiAdimi(s, TR, 20, 90, 20, 1 / 60)!;
    expect(p.x).toBe(0);
    expect(p.z).toBeCloseTo(21);
    expect(p.h).toBeCloseTo(0);
  });
  it("erken dönüş süreyi temizler; sonraki çıkış yeni hizayı kaydeder", () => {
    const s = bosPistDisi();
    pistDisiAdimi(s, TR, 8, 20, 5, 4.9);
    expect(pistDisiAdimi(s, TR, 5, 40, 10, 0.1)).toBeNull();
    expect(s).toEqual(bosPistDisi());
    expect(pistDisiAdimi(s, TR, -8, 60, 15, 4)).toBeNull();
    expect(pistDisiAdimi(s, TR, -8, 65, 15, 1.9)).toBeNull();
    expect(pistDisiAdimi(s, TR, -8, 70, 15, 0.2)!.z).toBeCloseTo(60);
  });
  it("kerbli pistte kerb pisttir: kerb genişliği içinde sayım yok, dışında var", () => {
    const K = mkTrack(
      [
        [0, 0],
        [0, 120],
      ],
      5,
      true,
    );
    K.kb = K.P.map(() => true);
    expect(pistKenari(K)).toBeCloseTo(5 + KW);
    expect(pistDisiAdimi(bosPistDisi(), K, 5 + KW - 0.05, 40, 10, 7)).toBeNull();
    expect(pistDisiAdimi(bosPistDisi(), K, 5 + KW + 0.05, 40, 10, 7)).not.toBeNull();
    expect(pistKenari(TR)).toBe(5);
  });
  it("asfalt/toprak fark etmez: merkez çizgi ve genişlik kullanılır, örnek arası kenar içeridedir", () => {
    const p = pistKonumu(TR, 5, 21.37, 5);
    expect(p.uzaklik).toBeCloseTo(5);
    expect(p.nokta.z).toBeCloseTo(21.37);
    expect(pistDisiAdimi(bosPistDisi(), TR, 5, 21.37, 5, 7)).toBeNull();
    expect(pistDisiAdimi(bosPistDisi(), TR, 5.01, 21.37, 5, 7)).not.toBeNull();
  });
  it("kapalı pistin birleşimi ve açık pistin uçlarında geçerli dönüş yönü", () => {
    const kapali = mkTrack(
      [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ],
      5,
      false,
    );
    const p = pistKonumu(kapali, -1, -1, 0);
    expect(Number.isFinite(p.nokta.h)).toBe(true);
    for (const z of [-10, 130]) {
      const p = pistKonumu(TR, 0, z, 0);
      expect(p.nokta.z).toBeCloseTo(z < 0 ? 0 : 120);
      expect(p.nokta.h).toBeCloseTo(0);
    }
  });
});

describe("LT-SYS-006 pist kesme", () => {
  // 100 m'lik kare kapalı pist (yarı genişlik 5): köşeden köşeye çapraz geçmek kesmedir
  const kose: [number, number][] = [
      [0, 0],
      [0, 100],
      [100, 100],
      [100, 0],
    ],
    K = mkTrack(
      kose.flatMap(([x, z], i) => {
        const [nx, nz] = kose[(i + 1) % 4];
        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(
          (t) => [x + ((nx - x) * t) / 10, z + ((nz - z) * t) / 10] as [number, number],
        );
      }),
      5,
      false,
    );
  /** (x0,z0)'dan (x1,z1)'e 1 m adımlarla git; dönen: kesme (m) toplamı */
  const git = (k: ReturnType<typeof bosKesme>, yol: [number, number][]) => {
    let top = 0;
    for (let i = 0; i + 1 < yol.length; i++) {
      const [ax, az] = yol[i],
        [bx, bz] = yol[i + 1],
        n = Math.ceil(Math.hypot(bx - ax, bz - az));
      for (let j = 0; j <= n; j++)
        top += kesmeAdimi(k, K, ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n, 0);
    }
    return top;
  };
  it("çaprazdan kısa yol: atlanan pist mesafesi kadar kesme (≈ köşenin iki kolu)", () => {
    const k = bosKesme(),
      d = git(k, [
        [0, 30],
        [0, 50],
        [50, 100],
        [70, 100],
      ]);
    // çıkış ~(0,55), dönüş ~(45,100): atlanan ≈ 45 + 45 m; dışarıdaki yol ≈ 64 m
    expect(d).toBeGreaterThan(70);
    expect(d).toBeLessThan(110);
    expect(k).toEqual(bosKesme());
  });
  it("virajı dışarıdan geniş almak, kısa sapma ve geri dönmek kesme değildir", () => {
    // dışarıdan: köşeyi pistin dışından dolaş
    expect(
      git(bosKesme(), [
        [0, 80],
        [-12, 95],
        [-12, 112],
        [5, 112],
        [20, 100],
      ]),
    ).toBe(0);
    // düzlükte pistin yanından paralel gitmek (kazanç yok)
    expect(
      git(bosKesme(), [
        [0, 30],
        [7, 40],
        [7, 60],
        [0, 70],
      ]),
    ).toBe(0);
    // pistten çıkıp geriye doğru dönmek
    expect(
      git(bosKesme(), [
        [0, 60],
        [-15, 50],
        [0, 30],
      ]),
    ).toBe(0);
  });
  it("cezası atlanan mesafe / 10 gövde; hayalet fazı ve zırh korumaz, enerji vermez; gövde biterse pert", () => {
    const k = kosuBaslat(3, []);
    k.faz = "surus";
    k.pasifler = ["zirh", "carpisma-pili"];
    k.beceriler = [{ id: "flying-dutchman", seviye: 1, eklentiler: [], evrim: null }];
    k.bec.yerel["flying-dutchman"] = {
      kalan: 2,
      bekleme: 0,
      deger: 0,
      uzatma: 0,
      sayac: 0,
      hedef: null,
      nokta: null,
      iz: [],
      islenen: [],
    };
    // hayaletken çarpma işlemez, kesme işler
    expect(hasarAl(k, "carpma")).toBe(false);
    expect(k.govde).toBe(100);
    expect(kesmeCezasi(k, 90)).toBeCloseTo(9, 9);
    expect(k.govde).toBeCloseTo(91, 9);
    expect(k.bekleyenHasar).toBeNull();
    expect(kesmeCezasi(k, 2000)).toBeCloseTo(91, 9);
    expect(k.pert).toBe(true);
    expect(k.faz).toBe("bitti");
  });
});
