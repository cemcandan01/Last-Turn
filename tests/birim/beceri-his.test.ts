// LT-SYS-005 skill'lerin hissedilen etkisi uçtan uca: tetik → enerji → fiziğe ulaşan kuvvet/çarpan → gerçek
// fizikte ölçülen fark. Kullanılamayan skill'in nedeni HUD'a gider; serbest sürüş ve yarış ayrımı. Ölçüm (yapay
// senaryo, insan hissi değil): tests/cikti/beceri-his.json
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FLYING_DUTCHMAN,
  RISK_BAR,
  RISK_TAKER,
  beceriAdimi,
  beceriDurumuBaslat,
  beceriEngeli,
  beceriIstekleri,
  type BeceriOrnegi,
  type Govde,
} from "../../src/cekirdek/beceri";
import { SX } from "../../src/dunya/corak";
import { tp, type Pist } from "../../src/dunya/pist";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { BASLANGIC_ARACLARI } from "../../src/oyun/ekonomi";
import { beceriDunyasiYap, pistKosesi } from "../../src/oyun/mutant-beceri";
import { NITRO, SURUS_ENERJISI } from "../../src/oyun/mutant-enerji";
import {
  DUELLO,
  beceriGorunumu,
  enerjiAdimi,
  kosuAraci,
  kosuBaslat,
  type Kosu,
} from "../../src/oyun/mutant-kosu";
import { rakipKurulumu, yarisciAdimi, yarisciYap, type Yarisci } from "../../src/yz/yarisci";
import { surucuKur } from "../yardimci/surucu";

const DT = 1 / 60,
  PISTI = TDEF.findIndex((d) => d.t == DUELLO.pist.ty && d.lv == DUELLO.pist.lv),
  ARAC = BASLANGIC_ARACLARI[0],
  sb = (id: string, seviye = 1): BeceriOrnegi => ({ id, seviye, eklentiler: [], evrim: null }),
  rapor: Record<string, unknown> = {};

function nokta(TR: Pist, i: number) {
  const g = tp(TR, "", TR.N, 6),
    j = (((TR.N - 6 + i) % TR.N) + TR.N) % TR.N;
  return i == 0
    ? { x: g[1], z: g[2], h: g[3] }
    : { x: TR.P[j][0], z: TR.P[j][1], h: Math.atan2(TR.T[j][0], TR.T[j][1]) };
}
function ikiArac() {
  const s = surucuKur({ yaris: PISTI, arac: ARAC, lk: "norm" }),
    TR = s.bolge!.TR!,
    yap = (i: number, tohum: number) =>
      yarisciYap(s.cx.dunya, rakipKurulumu(ARAC, "gp", "norm"), TR, 2, "deneyimli", tohum, nokta(TR, i));
  return { TR, oyuncu: yap(0, 3), rakip: yap(10, 4) };
}
const gv = (y: Yarisci): Govde => {
  const S = y.ornek.sim.S;
  return { x: S.x, z: S.z, h: S.h, vx: S.vx, vz: S.vz };
};
const hiz = (y: Yarisci) => Math.hypot(y.ornek.sim.S.vx, y.ornek.sim.S.vz);
const kmh = (v: number) => +(v * 3.6).toFixed(1);

/**
 * kanca gerçek fizikte: ısın (YZ sürer), sonra 2,5 sn kancalı/kancasız. rakipli: düello rakibine; değilse pistin
 * ilerideki noktasına. Dönen: rakibe mesafe ya da pist ilerlemesi, hız, kancanın açık kaldığı adım
 */
function kancaKos(seviye: number, rakipli: boolean, isinma: number, kanca: boolean) {
  const { TR, oyuncu, rakip } = ikiArac(),
    takili = [sb("grappling-hook", seviye)];
  let d = beceriDurumuBaslat(),
    acik = 0,
    tetik = 0;
  for (let i = 0; i < isinma; i++) {
    yarisciAdimi(oyuncu, true);
    if (rakipli) yarisciAdimi(rakip, true);
  }
  const ti0 = oyuncu.ti,
    tur0 = oyuncu.tur;
  for (let i = 0; i < 150; i++) {
    const W = beceriDunyasiYap(gv(oyuncu), rakipli ? [{ id: "rakip", ...gv(rakip) }] : [], TR, true),
      tet = kanca && i == 0 ? beceriIstekleri(d, takili, W, ["grappling-hook"]) : [];
    tetik += tet.length;
    const r = beceriAdimi(d, takili, W, tet, [], DT);
    d = r.d;
    if ((d.yerel["grappling-hook"]?.kalan ?? 0) > 0) acik++;
    oyuncu.ornek.cx.dis = r.cikti.oyuncuIvme;
    rakip.ornek.cx.dis = r.cikti.hedefIvme.rakip;
    yarisciAdimi(oyuncu, true);
    if (rakipli) yarisciAdimi(rakip, true);
  }
  // pist ilerlemesi (m; ızgaradan başlangıç çizgisini geçince tur sayacı henüz artmamış olabilir)
  const ilerleme =
    (((TR.S[oyuncu.ti] - TR.S[ti0] + (oyuncu.tur - tur0) * TR.len) % TR.len) + TR.len) % TR.len;
  return {
    mesafe: rakipli
      ? Math.hypot(oyuncu.ornek.sim.S.x - rakip.ornek.sim.S.x, oyuncu.ornek.sim.S.z - rakip.ornek.sim.S.z)
      : ilerleme,
    v: hiz(oyuncu),
    acik,
    tetik,
  };
}

/** araç çarpanı (güç/tutuş) gerçek fizikte süre boyunca: 6 sn'de alınan yol farkı */
function carpanKos(guc: number, tutus: number, sure: number, isinma: number) {
  const { TR, oyuncu } = ikiArac(),
    car0 = oyuncu.ornek.cx.kurulum.car;
  for (let i = 0; i < isinma; i++) yarisciAdimi(oyuncu, true);
  const s0 = TR.S[oyuncu.ti],
    t0 = oyuncu.tur;
  for (let i = 0; i < 360; i++) {
    const c = i < sure * 60 ? kosuAraci(car0, { pasifler: [], becCikti: { guc, tutus } }) : car0;
    if (oyuncu.ornek.cx.kurulum.car !== c) oyuncu.ornek.cx.kurulum = { ...oyuncu.ornek.cx.kurulum, car: c };
    yarisciAdimi(oyuncu, true);
  }
  return (((TR.S[oyuncu.ti] - s0 + (oyuncu.tur - t0) * TR.len) % TR.len) + TR.len) % TR.len;
}

/** koşu: sürüş fazında, skill'ler ve enerjiyle */
function kosu(beceriler: BeceriOrnegi[], enerji: number): Kosu {
  const k = kosuBaslat(7, []);
  k.faz = "surus";
  k.beceriler = beceriler;
  k.mek = { ...k.mek, enerji };
  return k;
}
const sim = (P: Govde, beta = 0) =>
  ({
    S: { x: P.x, z: P.z, h: P.h, vx: P.vx, vz: P.vz, air: false },
    DR: { on: beta ? 1 : 0, dir: 1, cool: 0 },
    D: { act: 0, beta },
  }) as unknown as Parameters<typeof enerjiAdimi>[1];

describe("LT-SYS-005 skill'ler hissedilir", () => {
  it(
    "kanca: tek dokunuşla rakibe gerçek fizikte belirgin çeker ve yaklaşana dek bağlı kalır",
    { timeout: 60000 },
    () => {
      const yok = kancaKos(1, true, 120, false),
        var_ = kancaKos(1, true, 120, true);
      rapor["kanca Sv1 rakip-2sn"] = {
        kancasiz: { m: +yok.mesafe.toFixed(1), kmh: kmh(yok.v) },
        kancali: { m: +var_.mesafe.toFixed(1), kmh: kmh(var_.v) },
        acikSn: +(var_.acik / 60).toFixed(2),
      };
      expect(var_.tetik).toBe(1);
      expect(var_.acik).toBeGreaterThanOrEqual(60);
      expect(var_.v - yok.v).toBeGreaterThan(4);
      expect(var_.mesafe).toBeLessThan(yok.mesafe - 10);
    },
  );

  it("pistte kanca köşesi virajın iç yanında; düzlükte ve Çorak açık dünyada (köşe/rakip yok) kanca atılamaz", () => {
    const { TR } = ikiArac();
    let kose = 0;
    for (let i = 0; i < TR.N; i += 3) {
      const T = TR.T[i],
        P: Govde = { x: TR.P[i][0], z: TR.P[i][1], h: Math.atan2(T[0], T[1]), vx: T[0] * 20, vz: T[1] * 20 },
        k = pistKosesi(TR, P, 0, i);
      if (!k) continue;
      kose++;
      // dönme noktası önde ve en çok 70 m yarıçapta; ip ucu pistin kenarında
      expect(Math.hypot(k.p[0] - P.x, k.p[1] - P.z)).toBeLessThan(150);
      expect(Math.hypot(k.uc[0] - k.p[0], k.uc[1] - k.p[1])).toBeLessThanOrEqual(90);
    }
    expect(kose).toBeGreaterThan(3);
    rapor["pist köşe noktası (Yeşil Vadi, 3 noktada bir)"] = kose;
    // açık dünyada köşe tanımı yok: rakipsiz kanca atılamaz, nedeni 'hedef'
    const takili = [sb("grappling-hook")],
      W = beceriDunyasiYap({ x: SX, z: -400, h: 0, vx: 0, vz: 20 }, [], null, false, true);
    expect(beceriIstekleri(beceriDurumuBaslat(), takili, W, ["grappling-hook"])).toEqual([]);
    expect(beceriEngeli(beceriDurumuBaslat(), takili, W, "grappling-hook")).toBe("hedef");
  });

  it(
    "çarpanlar fiziğe ulaşır: Risk Taker dönüşümü ve nitro yol kazandırır; Dutchman tutuşu yolda ~0 (değeri bağışıklık)",
    { timeout: 60000 },
    () => {
      const r1 = RISK_TAKER.seviyeler[0],
        d1 = FLYING_DUTCHMAN.seviyeler[0],
        taban = carpanKos(1, 1, 0, 120),
        risk = carpanKos(r1.guc, r1.tutus, r1.sure, 120),
        dutch = carpanKos(1, d1.tutus, d1.sure, 600),
        dutch0 = carpanKos(1, 1, 0, 600);
      rapor["Risk Taker Sv1 dönüşüm (2 sn sonra, 6 sn yol)"] = {
        tabanM: +taban.toFixed(1),
        donusumM: +risk.toFixed(1),
      };
      rapor["Flying Dutchman Sv1 tutuş (10 sn sonra, 6 sn yol)"] = {
        tabanM: +dutch0.toFixed(1),
        fazM: +dutch.toFixed(1),
      };
      expect(risk).toBeGreaterThan(taban + 5);
      expect(Math.abs(dutch - dutch0)).toBeLessThan(5);
    },
  );

  it(
    "pist virajında kanca gerçek fizikte: araç pistte kalır, viraj hızlı geçilir",
    { timeout: 60000 },
    () => {
      const kos = (kanca: boolean) => {
        const { TR, oyuncu } = ikiArac(),
          takili = [sb("grappling-hook")];
        let d = beceriDurumuBaslat(),
          atildi = -1,
          enSapma = 0,
          acik = 0;
        for (let i = 0; i < 900; i++) {
          const W = beceriDunyasiYap(gv(oyuncu), [], TR, true),
            bas = kanca && atildi < 0 && i > 240 && !!W.kose?.(0);
          if (bas) atildi = i;
          const r = beceriAdimi(
            d,
            takili,
            W,
            bas ? beceriIstekleri(d, takili, W, ["grappling-hook"]) : [],
            [],
            DT,
          );
          d = r.d;
          const u = r.cikti.ucus;
          oyuncu.ornek.cx.dis = {
            x: r.cikti.oyuncuIvme.x + (u?.x ?? 0),
            z: r.cikti.oyuncuIvme.z + (u?.z ?? 0),
          };
          oyuncu.ornek.cx.ucus = u ? { y: u.y, denge: u.denge, yalpa: u.yalpa } : undefined;
          if ((d.yerel["grappling-hook"]?.kalan ?? 0) > 0) {
            acik++;
            const S = oyuncu.ornek.sim.S,
              j = oyuncu.ti;
            enSapma = Math.max(enSapma, Math.hypot(S.x - TR.P[j][0], S.z - TR.P[j][1]));
          }
          yarisciAdimi(oyuncu, true);
        }
        return { atildi, enSapma, acik, hw: TR.hw };
      };
      const k = kos(true);
      rapor["pist virajı kancası (Yeşil Vadi)"] = {
        acikSn: +(k.acik / 60).toFixed(2),
        enSapmaM: +k.enSapma.toFixed(1),
      };
      expect(k.atildi).toBeGreaterThan(0);
      expect(k.acik).toBeGreaterThan(20);
      expect(k.enSapma).toBeLessThan(k.hw + 3);
    },
  );

  it("Flying Dutchman Sv1 fazı 2,5 sn sürer; bu sürede hayalet bayrağı açık", () => {
    const takili = [sb("flying-dutchman")],
      W = { oyuncu: { x: 0, z: 0, h: 0, vx: 0, vz: 20 }, hedefler: [], baglanti: () => null, yarista: false };
    let d = beceriDurumuBaslat(),
      hayalet = 0;
    for (let i = 0; i < 400; i++) {
      const r = beceriAdimi(
        d,
        takili,
        W,
        i == 0 ? beceriIstekleri(d, takili, W, ["flying-dutchman"]) : [],
        [],
        DT,
      );
      d = r.d;
      if (r.cikti.hayalet) hayalet++;
    }
    expect(hayalet / 60).toBeCloseTo(FLYING_DUTCHMAN.seviyeler[0].sure, 1);
    expect(FLYING_DUTCHMAN.seviyeler[0].sure).toBeGreaterThanOrEqual(2.5);
  });

  it("temel sürüş enerjisi: skill alan ama kaynak perki olmayan koşuda kontrollü drift enerjiyi yeniden doldurur", () => {
    const k = kosu([sb("grappling-hook")], 0),
      P: Govde = { x: 0, z: 0, h: 0, vx: 0, vz: 20 },
      W = beceriDunyasiYap(P, [], null, false);
    // 10 sn 25° drift
    for (let i = 0; i < 600; i++)
      enerjiAdimi(k, sim(P, 0.45), DT, false, { dunya: W, istekler: [], engeller: [], carpti: false });
    expect(k.mek.enerji).toBeCloseTo(SURUS_ENERJISI.kazanc * 10, 0);
    // düz sürüş enerji vermez
    const e0 = k.mek.enerji;
    for (let i = 0; i < 300; i++)
      enerjiAdimi(k, sim(P, 0), DT, false, { dunya: W, istekler: [], engeller: [], carpti: false });
    expect(k.mek.enerji).toBe(e0);
    rapor["temel sürüş enerjisi"] = {
      driftSn10: +e0.toFixed(1),
      nitroIcinDriftSn: +(NITRO.maliyet / SURUS_ENERJISI.kazanc).toFixed(1),
    };
  });

  it("Risk Taker açık dünyada driftle dolar ve dönüşür; HUD kalan süreyi ve barı verir", () => {
    const k = kosu([sb("risk-taker")], 0),
      P: Govde = { x: 0, z: 0, h: 0, vx: 0, vz: 20 },
      W = beceriDunyasiYap(P, [], null, false);
    for (let i = 0; i < 240; i++)
      enerjiAdimi(k, sim(P, 0.45), DT, false, { dunya: W, istekler: [], engeller: [], carpti: false });
    const g = beceriGorunumu(k)[0];
    expect(g.bar).toBe(Math.round(RISK_BAR.drift * 4));
    expect(g.engel).toBeNull();
    let n = 0;
    while (!beceriGorunumu(k)[0].acik && n++ < 600)
      enerjiAdimi(k, sim(P, 0.45), DT, false, { dunya: W, istekler: [], engeller: [], carpti: false });
    // dönüşüm bar dolduğu adımın ardından çarpana geçer (1 adım)
    enerjiAdimi(k, sim(P, 0.45), DT, false, { dunya: W, istekler: [], engeller: [], carpti: false });
    const a = beceriGorunumu(k)[0];
    expect(a.acik).toBe(true);
    expect(a.kalan).toBeGreaterThan(RISK_TAKER.seviyeler[0].sure - 0.1);
    expect(a.sure).toBe(RISK_TAKER.seviyeler[0].sure);
    expect(kosuAraci(rakipKurulumu(ARAC, "gp", "norm").car, k).hp).toBeGreaterThan(
      rakipKurulumu(ARAC, "gp", "norm").car.hp * 1.2,
    );
    rapor["Risk Taker açık dünyada bar dolum süresi (25° drift)"] = +((240 + n) / 60).toFixed(1);
  });

  it("kullanılamama nedenleri HUD'a gider: hedef, faz, rakip, bekleme (skill enerji istemez)", () => {
    const k = kosu([sb("grappling-hook"), sb("flying-dutchman"), sb("slipstream-engine")], 20),
      P: Govde = { x: 0, z: 0, h: 0, vx: 0, vz: 20 },
      bos = beceriDunyasiYap(P, [], null, false),
      adim = (W: typeof bos, istekler: string[] = []) =>
        enerjiAdimi(k, sim(P), DT, false, { dunya: W, istekler, engeller: [], carpti: false }),
      neden = () => Object.fromEntries(beceriGorunumu(k).map((b) => [b.id, b.engel]));
    adim(bos);
    expect(neden()).toEqual({
      "grappling-hook": "hedef",
      "flying-dutchman": null,
      "slipstream-engine": "rakip",
    });
    const rakipli = beceriDunyasiYap(P, [{ id: "rakip", x: 0, z: 20, h: 0, vx: 0, vz: 18 }], null, true);
    adim(rakipli, ["flying-dutchman"]);
    expect(neden()).toMatchObject({
      "grappling-hook": "faz",
      "flying-dutchman": "etkin",
      "slipstream-engine": null,
    });
    for (let i = 0; i < 60 * FLYING_DUTCHMAN.seviyeler[0].sure + 2; i++) adim(rakipli);
    expect(neden()["flying-dutchman"]).toBe("bekleme");
    expect(neden()["grappling-hook"]).toBeNull();
  });

  it("ölçüm raporu", () => {
    mkdirSync("tests/cikti", { recursive: true });
    writeFileSync("tests/cikti/beceri-his.json", JSON.stringify(rapor, null, 1));
  });
});
