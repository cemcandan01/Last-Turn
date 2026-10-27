// LT-SYS-004 MUTANT skill mimarisi: skill'ler ortak olaylarla etkileşir (birbirini tanımaz). Bütün kombinasyonları
// tek tek denemek yerine ortak kurallar denetlenir: belirlenimcilik, enerji harcanmadan düşen istek, sonlu olay
// zinciri, tekrar eden olaydan sınırsız ödül yok (takip kredisi, near-miss beklemesi, durum yenilemesi, hasar tick'i,
// dönüşüm uzatma tavanı), yuva sınırı ve kapora. Ekonomi döngüsü ölçülür: tests/cikti/beceri-ekonomi.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ATES,
  BECERILER,
  BECERI_EKLENTILERI,
  FLYING_DUTCHMAN,
  GRAPPLING_HOOK,
  HASAR_ADIM_UST,
  IVME_UST,
  RISK_TAKER,
  SKILL_YUVASI,
  SLIPSTREAM_ENGINE,
  TAKIP,
  beceriAdimi,
  beceriDurumuBaslat,
  beceriIstekleri,
  beceriYetenegi,
  eklentiUyar,
  takiliBeceriler,
  yakinlikGozlemi,
  type BeceriDunyasi,
  type BeceriDurumu,
  type BeceriOlayi,
  type BeceriOrnegi,
  type Govde,
  type Hedef,
} from "../../src/cekirdek/beceri";
import { ADIM_ISLEM_SINIRI } from "../../src/cekirdek/mekanikler";
import {
  KAPORA,
  enerjiAdimi,
  etkinlikBitti,
  hasarAl,
  kaporaBelirle,
  kosuAraci,
  kosuBaslat,
  pasifSec,
  type Kosu,
} from "../../src/oyun/mutant-kosu";
import { CARS } from "../../src/arac/araclar";

const DT = 1 / 60;
const sb = (
  id: string,
  seviye = 1,
  eklentiler: string[] = [],
  evrim: string | null = null,
): BeceriOrnegi => ({
  id,
  seviye,
  eklentiler,
  evrim,
});
const govde = (x: number, z: number, vz = 25, h = 0): Govde => ({ x, z, h, vx: 0, vz });
const hedef = (x: number, z: number, vz = 22): Hedef => ({ id: "rakip", ...govde(x, z, vz) });
const dunya = (
  P: Govde,
  hedefler: Hedef[] = [],
  yarista = true,
  baglanti: [number, number] | null = null,
): BeceriDunyasi => ({ oyuncu: P, hedefler, baglanti: () => baglanti, yarista });

/** koşu: sürüş fazında, verilen skill'ler ve enerjiyle */
function kosu(beceriler: BeceriOrnegi[], enerji = 100, pasifler: string[] = []): Kosu {
  const k = kosuBaslat(11, []);
  k.faz = "surus";
  k.beceriler = beceriler;
  k.pasifler = pasifler;
  k.mek = { ...k.mek, enerji };
  return k;
}
/** fizik durumu (enerji adımının okuduğu kadarı) */
const sim = (P: Govde, drift = 0) =>
  ({
    S: { x: P.x, z: P.z, h: P.h, vx: P.vx, vz: P.vz, air: false },
    DR: { on: drift ? 1 : 0, dir: 1, cool: 0 },
    D: { act: 0, beta: drift },
  }) as unknown as Parameters<typeof enerjiAdimi>[1];
const adim = (k: Kosu, P: Govde, W: BeceriDunyasi, istekler: string[] = [], drift = 0) =>
  enerjiAdimi(k, sim(P, drift), DT, false, { dunya: W, istekler, engeller: [], carpti: false });

describe("LT-SYS-004 skill sistemi", () => {
  describe("LT-SYS-004 skill yürütücüsü (saf)", () => {
    it("aynı girdiler aynı sonucu verir; eklentili zincir sonlu, olay sınırı aşılmaz", () => {
      const kos = () => {
        const takili = [
          sb("grappling-hook", 2, ["sok-bobini"]),
          sb("risk-taker", 3, ["kor-cekirdegi"]),
          sb("flying-dutchman"),
        ];
        let d = beceriDurumuBaslat(),
          olaylar: BeceriOlayi[] = [],
          enCok = 0;
        for (let i = 0; i < 1800; i++) {
          const P = govde(0, i * 0.4),
            R = hedef(Math.sin(i / 50) * 2, P.z + (i % 600 < 300 ? 20 : -3)),
            W = dunya(P, [R]);
          const giris: BeceriOlayi[] = [
            ...olaylar,
            { tur: "DriftTickQualified", dt: DT, hiz: 20, aci: 0.5 },
            ...(i % 400 == 10 ? [{ tur: "NearMiss" as const, hedef: "rakip", hiz: 25 }] : []),
          ];
          const tet = i % 300 == 5 ? beceriIstekleri(d, takili, W, ["grappling-hook"]) : [];
          const r = beceriAdimi(d, takili, W, tet, giris, DT);
          d = r.d;
          olaylar = r.cikti.olaylar;
          enCok = Math.max(enCok, olaylar.length);
        }
        return { d, enCok };
      };
      const a = kos(),
        b = kos();
      expect(JSON.stringify(a.d)).toBe(JSON.stringify(b.d));
      expect(a.d.kesilen).toBe(0);
      expect(a.enCok).toBeLessThanOrEqual(ADIM_ISLEM_SINIRI);
      expect(a.d.verilen).toBeGreaterThan(0);
    });

    it("en çok 3 skill taşınır; geçersiz/tekrar skill sayılmaz", () => {
      expect(SKILL_YUVASI).toBe(3);
      const l = takiliBeceriler([
        sb("risk-taker"),
        sb("risk-taker"),
        sb("yok"),
        sb("grappling-hook"),
        sb("flying-dutchman"),
        sb("grappling-hook"),
      ]);
      expect(l.map((o) => o.id)).toEqual(["risk-taker", "grappling-hook", "flying-dutchman"]);
      // her skill seviye tablosu SEVIYE_UST uzunlukta; her skill en az bir evrim taşır
      for (const t of BECERILER) {
        expect(t.seviyeler.length).toBe(3);
        expect(t.evrimler.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Grappling Hook", () => {
    it("hedef ve pist noktası yoksa istek düşer, enerji harcanmaz", () => {
      const k = kosu([sb("grappling-hook")]),
        P = govde(0, 0);
      adim(k, P, dunya(P, [], true, null), ["grappling-hook"]);
      expect(k.mek.enerji).toBe(100);
      expect(k.bec.yerel["grappling-hook"]?.kalan ?? 0).toBe(0);
      // yarış dışında pist noktasına da tutunmaz
      const W = dunya(P, [], false, [0, 30]);
      expect(beceriIstekleri(k.bec, k.beceriler, W, ["grappling-hook"])).toEqual([]);
    });

    it("öndeki rakibe bağlanır: enerji 25, oyuncu ona, rakip oyuncuya doğru ivmelenir; KonumEtkisi", () => {
      const k = kosu([sb("grappling-hook")]),
        P = govde(0, 0),
        W = dunya(P, [hedef(1, 20)]);
      adim(k, P, W, ["grappling-hook"]);
      expect(k.mek.enerji).toBeCloseTo(75, 9);
      expect(k.becCikti!.oyuncuIvme.z).toBeGreaterThan(5);
      expect(k.becCikti!.hedefIvme.rakip.z).toBeLessThan(-2);
      expect(Math.hypot(k.becCikti!.oyuncuIvme.x, k.becCikti!.oyuncuIvme.z)).toBeLessThanOrEqual(IVME_UST);
      expect(k.bekleyenBeceri.some((e) => e.tur == "KonumEtkisi" && e.hedef == "rakip")).toBe(true);
      // etki sürerken ve sonrası beklemede yeniden kullanılamaz (enerji gitmez)
      adim(k, P, W, ["grappling-hook"]);
      expect(k.mek.enerji).toBeCloseTo(75, 9);
    });

    it("arkadaki ya da konidışı rakibe bağlanmaz; Ters Kanca evrimi arkadakini iki kat frenler, seni çekmez", () => {
      const P = govde(0, 0),
        arka = dunya(P, [hedef(0, -20)]);
      expect(beceriIstekleri(beceriDurumuBaslat(), [sb("grappling-hook")], arka, ["grappling-hook"])).toEqual(
        [],
      );
      const k = kosu([sb("grappling-hook", 3, [], "ters-kanca")]);
      adim(k, P, arka, ["grappling-hook"]);
      expect(k.becCikti!.oyuncuIvme).toEqual({ x: 0, z: 0 });
      expect(k.becCikti!.hedefIvme.rakip.z).toBeCloseTo(2 * GRAPPLING_HOOK.seviyeler[2].fren, 9);
    });

    it("rakip yokken pistteki noktaya tutunur; çok yaklaşınca kanca kopar ve bekleme başlar", () => {
      const k = kosu([sb("grappling-hook")]);
      let P = govde(0, 0);
      adim(k, P, dunya(P, [], true, [0, 30]), ["grappling-hook"]);
      expect(k.becCikti!.oyuncuIvme.z).toBeGreaterThan(0);
      P = govde(0, 25);
      adim(k, P, dunya(P, [], true, [0, 30]));
      expect(k.bec.yerel["grappling-hook"].kalan).toBe(0);
      expect(k.bec.yerel["grappling-hook"].bekleme).toBeCloseTo(GRAPPLING_HOOK.seviyeler[0].bekleme, 9);
    });

    it("Şok bobini eklentisi çekilen hedefe elektrik verir; elektrik rakibi frenler; yenileme olay üretmez", () => {
      const takili = [sb("grappling-hook", 1, ["sok-bobini"])],
        P = govde(0, 0),
        W = dunya(P, [hedef(0, 20)]);
      let d = beceriDurumuBaslat();
      const r = beceriAdimi(d, takili, W, [beceriYetenegi("grappling-hook")], [], DT);
      d = r.d;
      expect(r.cikti.olaylar.filter((e) => e.tur == "DurumUygulandi" && e.durum == "elektrik")).toHaveLength(
        1,
      );
      expect(d.hedefler.rakip.durumlar[0].tur).toBe("elektrik");
      // sonraki adımda elektrik + kanca freni: rakibin hızına karşı; durum yeniden uygulanmaz
      const r2 = beceriAdimi(d, takili, W, [], r.cikti.olaylar, DT);
      expect(r2.cikti.hedefIvme.rakip.z).toBeLessThan(-GRAPPLING_HOOK.seviyeler[0].fren);
      expect(r2.cikti.olaylar.some((e) => e.tur == "DurumUygulandi")).toBe(false);
      // uyumluluk etikete bağlı: kor çekirdeği hasar etiketli skill'e, şok bobini konum etiketli skill'e
      const sok = BECERI_EKLENTILERI.find((e) => e.id == "sok-bobini")!,
        kor = BECERI_EKLENTILERI.find((e) => e.id == "kor-cekirdegi")!;
      expect(eklentiUyar(GRAPPLING_HOOK, sok)).toBe(true);
      expect(eklentiUyar(GRAPPLING_HOOK, kor)).toBe(false);
      expect(eklentiUyar(RISK_TAKER, kor)).toBe(true);
    });
  });

  describe("Flying Dutchman", () => {
    it("faz: hasar işlemez (KorumaEngelledi → Kalkan Bataryası), tutuş artar, kanca kullanılamaz; sonra bekleme", () => {
      const k = kosu([sb("flying-dutchman"), sb("grappling-hook")], 100, ["kalkan-bataryasi"]),
        P = govde(0, 0),
        W = dunya(P, [hedef(0, 20)]);
      adim(k, P, W, ["flying-dutchman"]);
      expect(k.becCikti!.hayalet).toBe(true);
      expect(k.becCikti!.tutus).toBeCloseTo(FLYING_DUTCHMAN.seviyeler[0].tutus, 9);
      const g0 = k.govde,
        e0 = k.mek.enerji;
      expect(hasarAl(k, "carpma")).toBe(false);
      expect(k.govde).toBe(g0);
      expect(k.carpma).toBe(0);
      adim(k, P, W, ["grappling-hook"]);
      // kanca saldırı kapalıyken düşer; engellenen çarpma (12) kadar enerji gelir
      expect(k.bec.yerel["grappling-hook"]?.kalan ?? 0).toBe(0);
      expect(k.mek.enerji).toBeCloseTo(e0 + 12, 9);
      // araç değerleri: hayalet fazında tutuş yüksek, gücü değiştirmez
      const a = kosuAraci(CARS[0], k);
      expect(a.gr[1]).toBeCloseTo(CARS[0].gr[1] * FLYING_DUTCHMAN.seviyeler[0].tutus, 9);
      for (let i = 0; i < 100; i++) adim(k, P, W);
      expect(k.becCikti!.hayalet).toBe(false);
      expect(k.bec.yerel["flying-dutchman"].bekleme).toBeGreaterThan(0);
      expect(hasarAl(k, "carpma")).toBe(false);
      expect(k.govde).toBeLessThan(g0);
    });

    it("Lanetli Geçiş evrimi fazda yakındaki rakibe bir kez elektrik bırakır (hasar vermez)", () => {
      const takili = [sb("flying-dutchman", 3, [], "lanetli-gecis")],
        P = govde(0, 0),
        W = dunya(P, [hedef(1, 2)]);
      let d = beceriDurumuBaslat(),
        say = 0;
      for (let i = 0; i < 60; i++) {
        const r = beceriAdimi(d, takili, W, i == 0 ? [beceriYetenegi("flying-dutchman")] : [], [], DT);
        d = r.d;
        say += r.cikti.olaylar.filter((e) => e.tur == "DurumUygulandi").length;
        expect(r.cikti.olaylar.some((e) => e.tur == "HasarVerildi")).toBe(false);
      }
      expect(say).toBe(1);
    });
  });

  describe("Risk Taker", () => {
    const riskKos = (
      aci: number,
      sn: number,
      yarista = true,
      takili = [sb("risk-taker")],
      ek: (i: number) => BeceriOlayi[] = () => [],
      hedefler: (P: Govde) => Hedef[] = () => [],
    ) => {
      let d = beceriDurumuBaslat(),
        donusum = 0,
        sonCikti = null as ReturnType<typeof beceriAdimi>["cikti"] | null,
        hasar = 0,
        durum = 0,
        olaylar: BeceriOlayi[] = [];
      for (let i = 0; i < sn * 60; i++) {
        const P = govde(0, i * 0.33),
          W = dunya(P, hedefler(P), yarista);
        const r = beceriAdimi(
          d,
          takili,
          W,
          [],
          [...olaylar, { tur: "DriftTickQualified", dt: DT, hiz: 20, aci }, ...ek(i)],
          DT,
        );
        d = r.d;
        olaylar = r.cikti.olaylar;
        sonCikti = r.cikti;
        if (d.yerel["risk-taker"].kalan > 0) donusum++;
        for (const e of r.cikti.olaylar)
          if (e.tur == "HasarVerildi") hasar += e.miktar;
          else if (e.tur == "DurumUygulandi") durum++;
      }
      return { d, donusum, cikti: sonCikti!, hasar, durum };
    };

    it("20° üstü drift barı doldurur ve dönüşüm başlar; 19° ve yarış dışı doldurmaz", () => {
      const P = RISK_TAKER.seviyeler[0];
      // 100 / 12 = 8,33 sn drift
      expect(riskKos(0.36, 8.2).d.yerel["risk-taker"].kalan).toBe(0);
      const r = riskKos(0.36, 8.5);
      expect(r.d.yerel["risk-taker"].kalan).toBeGreaterThan(0);
      expect(r.cikti.guc).toBeCloseTo(P.guc, 9);
      expect(r.cikti.tutus).toBeCloseTo(P.tutus, 9);
      expect(riskKos(0.33, 20).d.yerel["risk-taker"].deger).toBe(0);
      expect(riskKos(0.5, 20, false).d.yerel["risk-taker"].deger).toBe(0);
    });

    it("dönüşüm süresi hasarla uzar ama uzatma tavanını aşmaz (sonsuz dönüşüm yok)", () => {
      const P = RISK_TAKER.seviyeler[0],
        bol = () =>
          Array.from({ length: 20 }, () => ({
            tur: "HasarVerildi" as const,
            hedef: "rakip",
            miktar: 5,
            hasar: "carpma" as const,
            kaynak: "x",
          }));
      // bar dolduktan sonra (8,5 sn) her adım 20 hasar olayı
      const r = riskKos(0.5, 30, true, [sb("risk-taker")], (i) => (i > 510 ? bol() : []));
      // drift sürdükçe bar yeniden dolar; tek dönüşüm sure + uzatmaUst ile sınırlı
      const tek = riskKos(0.5, 8.5 + P.sure + P.uzatmaUst + 0.5, true, [sb("risk-taker")], (i) =>
        i > 510 ? bol() : [],
      );
      expect(tek.donusum).toBeLessThanOrEqual(Math.ceil(((P.sure + P.uzatmaUst) / DT) * 1.001) + 1);
      expect(tek.donusum).toBeGreaterThan((P.sure / DT) * 1.2);
      expect(r.d.kesilen).toBe(0);
    });

    it("alev izi arkadaki rakibe tick aralığıyla, adım sınırı içinde hasar verir; Kıvılcım İzi hasar vermez", () => {
      const arka = (P: Govde) => [hedef(0, P.z - 3, 19.8)];
      const r = riskKos(0.5, 14, true, [sb("risk-taker", 1, ["kor-cekirdegi"])], () => [], arka);
      expect(r.hasar).toBeGreaterThan(0);
      // en kötü durum: alev (0,5 sn'de 4) + ateş (0,5 sn'de 2) → 12/sn; sınır adım başına HASAR_ADIM_UST
      const sure = r.donusum / 60;
      expect(r.hasar).toBeLessThanOrEqual(
        sure * (2 * RISK_TAKER.seviyeler[0].alev + 2 * ATES.hasar) + HASAR_ADIM_UST,
      );
      const k = riskKos(0.5, 14, true, [sb("risk-taker", 3, [], "kivilcim-izi")], () => [], arka);
      expect(k.hasar).toBe(0);
      expect(k.durum).toBeGreaterThan(0);
    });

    it("hayalet fazında takip/near-miss barı doldurmaz ve alev hasar vermez (çatışma)", () => {
      const nm = (i: number): BeceriOlayi[] =>
        i % 30 == 0 ? [{ tur: "NearMiss", hedef: "r" + i, hiz: 25 }] : [];
      const yalniz = riskKos(0, 2, true, [sb("risk-taker")], nm);
      expect(yalniz.d.yerel["risk-taker"].deger).toBeGreaterThan(0);
      // fazı sürekli açık tutmak için her adım hayalet durumu (yerel) yazılır
      let d = beceriDurumuBaslat();
      const takili = [sb("risk-taker"), sb("flying-dutchman")];
      for (let i = 0; i < 300; i++) {
        d.yerel["flying-dutchman"] = {
          kalan: 1,
          bekleme: 0,
          deger: 0,
          uzatma: 0,
          sayac: 0,
          hedef: null,
          nokta: null,
          iz: [],
          islenen: [],
        };
        const P = govde(0, i * 0.3);
        d = beceriAdimi(d, takili, dunya(P), [], nm(i), DT).d;
      }
      expect(d.yerel["risk-taker"].deger).toBe(0);
    });
  });

  describe("yakınlık gözlemi: anti-farm", () => {
    it("aynı rakibi sürekli takip etmek en çok TAKIP.kredi sn ödül verir", () => {
      let d = beceriDurumuBaslat(),
        toplam = 0;
      for (let i = 0; i < 60 * 60; i++) {
        const P = govde(0, i * 0.4),
          r = yakinlikGozlemi(d, dunya(P, [hedef(0, P.z + 8, 24)]), [], DT, false);
        d = { ...r.d, adim: d.adim + 1 };
        for (const e of r.olaylar) if (e.tur == "YakinTakip") toplam += e.dt;
      }
      expect(toplam).toBeLessThanOrEqual(TAKIP.kredi + 1e-9);
      expect(toplam).toBeGreaterThan(TAKIP.kredi - 0.05);
    });

    it("near-miss aynı hedefe beklemeyle bir kez; çarpışma yaklaşmayı geçersiz kılar; yarış dışında yok", () => {
      const gec = (d: BeceriDurumu, carp: boolean, yarista = true) => {
        let n = 0;
        // engelin 0,6 m yanından 25 m/s'de geçiş
        for (let i = 0; i < 40; i++) {
          const P = govde(0.6 + 1, -10 + i * 0.5),
            r = yakinlikGozlemi(
              d,
              dunya(P, [], yarista),
              [{ id: "e1", x: 0, z: 0, r: 1 }],
              DT,
              carp && i == 20,
            );
          d = { ...r.d, adim: d.adim + 1 };
          n += r.olaylar.filter((e) => e.tur == "NearMiss").length;
        }
        return { d, n };
      };
      const a = gec(beceriDurumuBaslat(), false);
      expect(a.n).toBe(1);
      expect(gec(a.d, false).n).toBe(0);
      expect(gec(beceriDurumuBaslat(), true).n).toBe(0);
      expect(gec(beceriDurumuBaslat(), false, false).n).toBe(0);
    });
  });

  describe("Slipstream Engine", () => {
    it("takipte depolar, çıkınca depo kadar güç; depo tavanlı, yarım saniyeden azı boşa gider", () => {
      const takili = [sb("slipstream-engine")],
        P = SLIPSTREAM_ENGINE.seviyeler[0];
      let d = beceriDurumuBaslat(),
        guclu = 0;
      for (let i = 0; i < 600; i++) {
        const takip: BeceriOlayi[] =
          i < 300 ? [{ tur: "YakinTakip", hedef: "rakip", dt: DT, mesafe: 8 }] : [];
        const r = beceriAdimi(d, takili, dunya(govde(0, 0)), [], takip, DT);
        d = r.d;
        if (r.cikti.guc > 1) {
          guclu++;
          expect(r.cikti.guc).toBeCloseTo(P.guc, 9);
        }
      }
      // 5 sn takip → depo enCok (2 sn) → 2 sn güç
      expect(guclu / 60).toBeCloseTo(P.enCok, 1);
      let d2 = beceriDurumuBaslat(),
        g2 = 0;
      for (let i = 0; i < 120; i++) {
        const takip: BeceriOlayi[] = i < 20 ? [{ tur: "YakinTakip", hedef: "rakip", dt: DT, mesafe: 8 }] : [];
        const r = beceriAdimi(d2, takili, dunya(govde(0, 0)), [], takip, DT);
        d2 = r.d;
        if (r.cikti.guc > 1) g2++;
      }
      expect(g2).toBe(0);
    });
  });

  describe("koşu: yuvalar, seçim teklifleri, kapora", () => {
    const secimde = (k: Kosu, secenekler: string[]) => {
      k.faz = "secim";
      k.bekleyenSecim = 1;
      k.secenekler = secenekler;
    };

    it("4. skill yuva doluyken ancak biri bırakılınca alınır; bırakılan seviye/eklenti/evrimiyle gider", () => {
      const k = kosu([
        sb("grappling-hook", 3, ["sok-bobini"], "ters-kanca"),
        sb("risk-taker"),
        sb("flying-dutchman"),
      ]);
      secimde(k, ["b:slipstream-engine"]);
      expect(pasifSec(k, "b:slipstream-engine")).toBe(false);
      expect(pasifSec(k, "b:slipstream-engine", "yok")).toBe(false);
      expect(k.beceriler).toHaveLength(3);
      expect(pasifSec(k, "b:slipstream-engine", "grappling-hook")).toBe(true);
      expect(k.beceriler.map((o) => o.id)).toEqual(["risk-taker", "flying-dutchman", "slipstream-engine"]);
      // kanca geri alınınca Sv1, eklentisiz, evrimsiz başlar; enerji tanımı da takılı listeden çıkar/girer
      secimde(k, ["b:grappling-hook"]);
      expect(pasifSec(k, "b:grappling-hook", "risk-taker")).toBe(true);
      expect(k.beceriler.find((o) => o.id == "grappling-hook")).toEqual(sb("grappling-hook"));
    });

    it("seviye, evrim ve skill eklentisi teklifleri kurallara uyar", () => {
      const k = kosu([sb("grappling-hook", 2), sb("risk-taker", 3, ["kor-cekirdegi"])]);
      secimde(k, ["y:grappling-hook", "v:grappling-hook:ters-kanca", "e:kor-cekirdegi:grappling-hook"]);
      // tavanda olmayan skill'e evrim, uyumsuz eklenti alınmaz
      expect(pasifSec(k, "v:grappling-hook:ters-kanca")).toBe(false);
      expect(pasifSec(k, "e:kor-cekirdegi:grappling-hook")).toBe(false);
      expect(pasifSec(k, "y:grappling-hook")).toBe(true);
      secimde(k, ["y:grappling-hook", "v:grappling-hook:ters-kanca", "e:sok-bobini:grappling-hook"]);
      expect(pasifSec(k, "y:grappling-hook")).toBe(false);
      expect(pasifSec(k, "v:grappling-hook:ters-kanca")).toBe(true);
      secimde(k, ["e:sok-bobini:grappling-hook", "e:kor-cekirdegi:risk-taker"]);
      expect(pasifSec(k, "e:kor-cekirdegi:risk-taker")).toBe(false);
      expect(pasifSec(k, "e:sok-bobini:grappling-hook")).toBe(true);
    });

    it("seçim ekranı skill teklifi içerir; pasif sırası (ana rastgelelik) eski koşuyla aynı kalır", () => {
      const k = kosuBaslat(5, []);
      expect(k.secenekler).toHaveLength(3);
      expect(k.secenekler[2].startsWith("b:")).toBe(true);
      // aynı tohum aynı teklifler
      expect(kosuBaslat(5, []).secenekler).toEqual(k.secenekler);
    });

    const driftKosusu = (beceriler: BeceriOrnegi[]) => {
      const k = kosu(beceriler);
      k.etkinlikler = [{ id: 3, i: 0, ty: "dp", sev: 1, x: 0, z: 0, yapildi: false }];
      return k;
    };

    it("kapora belirlenimci ve kilitli; kart yeniden açılınca değişmez; kilitli skill giderse deneme artar", () => {
      const l = [sb("grappling-hook"), sb("risk-taker"), sb("flying-dutchman")];
      const a = driftKosusu(l.map((o) => ({ ...o }))),
        b = driftKosusu(l.map((o) => ({ ...o })));
      const q = kaporaBelirle(a, 3)!;
      expect(q.beceri).not.toBeNull();
      expect(kaporaBelirle(b, 3)).toEqual(q);
      for (let i = 0; i < 20; i++) expect(kaporaBelirle(a, 3)).toEqual(q);
      a.beceriler = a.beceriler.filter((o) => o.id != q.beceri);
      const q2 = kaporaBelirle(a, 3)!;
      expect(q2.deneme).toBe(1);
      expect(a.beceriler.some((o) => o.id == q2.beceri)).toBe(true);
      // drift dışı etkinlikte kapora yok
      a.etkinlikler.push({ id: 4, i: 0, ty: "gp", sev: 1, x: 0, z: 0, yapildi: false });
      expect(kaporaBelirle(a, 4)).toBeNull();
    });

    it("kazanınca kapora skill'i +1 seviye (tavanda para), kaybedince yalnız o skill eklentileriyle gider; bir kez", () => {
      const kazan = driftKosusu([sb("grappling-hook"), sb("risk-taker")]),
        q = kaporaBelirle(kazan, 3)!;
      const r = etkinlikBitti(kazan, 3, true)!;
      expect(r.kapora).toEqual({ beceri: q.beceri, sonuc: "seviye" });
      expect(kazan.beceriler.find((o) => o.id == q.beceri)!.seviye).toBe(2);
      expect(etkinlikBitti(kazan, 3, true)).toBeNull();

      const kayb = driftKosusu([sb("grappling-hook", 3, ["sok-bobini"], "ters-kanca"), sb("risk-taker")]);
      kayb.etkinlikler[0].kapora = { beceri: "grappling-hook", deneme: 0 };
      const r2 = etkinlikBitti(kayb, 3, false)!;
      expect(r2.kapora).toEqual({ beceri: "grappling-hook", sonuc: "kayip" });
      expect(kayb.beceriler.map((o) => o.id)).toEqual(["risk-taker"]);

      const tavan = driftKosusu([sb("risk-taker", 3)]),
        p0 = tavan.para;
      kaporaBelirle(tavan, 3);
      expect(etkinlikBitti(tavan, 3, true)!.kapora!.sonuc).toBe("para");
      expect(tavan.para - p0).toBeGreaterThanOrEqual(KAPORA.tavanPara);
    });

    it("skill yokken kapora gövdedir: kaybedince gövde, kazanınca yeni skill; girilmeyen etkinlik bir şey almaz", () => {
      const k = driftKosusu([]);
      expect(kaporaBelirle(k, 3)).toEqual({ beceri: null, deneme: 0 });
      const g0 = k.govde;
      expect(etkinlikBitti(k, 3, false)!.kapora!.sonuc).toBe("govde");
      expect(k.govde).toBe(g0 - KAPORA.govde);
      const k2 = driftKosusu([]);
      kaporaBelirle(k2, 3);
      const r = etkinlikBitti(k2, 3, true)!;
      expect(r.kapora!.sonuc).toBe("yeni");
      expect(k2.beceriler).toHaveLength(1);
      // kart açıldı ama girilmedi: envanter aynı
      const k3 = driftKosusu([sb("risk-taker")]);
      kaporaBelirle(k3, 3);
      expect(k3.beceriler).toEqual([sb("risk-taker")]);
    });
  });

  describe("ekonomi döngüsü ölçümü (hasar → enerji → skill)", () => {
    it("en saldırgan kurulumda enerji sınırda, hasar ve dönüşüm payı sınırlı; rapor yazılır", () => {
      // Risk Taker Sv3 + kor çekirdeği, Kanca Sv3 + şok bobini, Slipstream; Hasar Bataryası + Takip Dinamosu.
      // Rakip hep 10 m önde (takip + kanca hedefi) ve alevin üstünde; oyuncu sürekli 25° driftte; her fırsatta kanca.
      const k = kosu(
        [
          sb("risk-taker", 3, ["kor-cekirdegi"]),
          sb("grappling-hook", 3, ["sok-bobini"]),
          sb("slipstream-engine", 3),
        ],
        40,
        ["hasar-bataryasi", "takip-dinamosu"],
      );
      let donusum = 0,
        enerjiMax = 0,
        kanca = 0,
        gucMax = 1;
      const SN = 120;
      for (let i = 0; i < SN * 60; i++) {
        const P = govde(0, i * 0.4, 24),
          R = hedef(0.5, P.z + (i % 120 < 60 ? 10 : -2), 24);
        const k0 = k.mek.telemetri["beceri:grappling-hook"]?.tetik ?? 0;
        adim(k, P, dunya(P, [R]), ["grappling-hook"], 0.45);
        if ((k.mek.telemetri["beceri:grappling-hook"]?.tetik ?? 0) > k0) kanca++;
        if (k.bec.yerel["risk-taker"]?.kalan > 0) donusum++;
        enerjiMax = Math.max(enerjiMax, k.mek.enerji);
        gucMax = Math.max(gucMax, kosuAraci(CARS[0], k).hp / CARS[0].hp);
        expect(
          Number.isFinite(k.mek.enerji) && k.mek.enerji >= 0 && k.mek.enerji <= k.mek.kapasite + 1e-9,
        ).toBe(true);
      }
      const rapor = {
        sureSn: SN,
        verilenHasarSn: +(k.bec.verilen / SN).toFixed(2),
        hasarEnerjisiSn: +((k.mek.telemetri["hasar-bataryasi"]?.kazanc ?? 0) / SN).toFixed(2),
        takipEnerjisiSn: +((k.mek.telemetri["takip-dinamosu"]?.kazanc ?? 0) / SN).toFixed(2),
        kancaSayisi: kanca,
        donusumPayi: +(donusum / (SN * 60)).toFixed(3),
        enerjiMax: +enerjiMax.toFixed(1),
        gucCarpaniMax: +gucMax.toFixed(3),
        kesilen: k.bec.kesilen + k.mek.kesilen,
      };
      mkdirSync("tests/cikti", { recursive: true });
      writeFileSync("tests/cikti/beceri-ekonomi.json", JSON.stringify(rapor, null, 1));
      expect(rapor.kesilen).toBe(0);
      // hasar tick/adım sınırı: alev + ateş en çok ~12-16/sn; kanca bekleme sınırlı (≥ 5 sn arayla)
      expect(rapor.verilenHasarSn).toBeLessThanOrEqual(20);
      expect(kanca).toBeLessThanOrEqual(SN / 5 + 1);
      // dönüşüm sürekli olamaz (sonrası yorgunluk + bar yeniden dolmalı)
      expect(rapor.donusumPayi).toBeLessThan(0.75);
      // nitro + skill gücü üst sınırı (pasifsiz araç)
      expect(rapor.gucCarpaniMax).toBeLessThanOrEqual(1.9 + 1e-9);
    });
  });
});
