import { describe, expect, it } from "vitest";
import { KW, mkTrack } from "../../src/dunya/pist";
import { bosPistDisi, pistDisiAdimi, pistKenari, pistKonumu } from "../../src/oyun/piste-donus";

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
