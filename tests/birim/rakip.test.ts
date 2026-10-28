// A3 rakip YZ (issue #22): yarış çizgisi/hız profili (saf), kişilik, gerçek fizikte düello pistinde sürüş. Rakip
// oyuncuyla aynı fizik çekirdeğini yalnız gaz/fren/direksiyon girdisiyle sürer: ışınlanma, gizli güç/tutuş, yakalama
// yardımı yok; aynı tohum aynı yarış, farklı tohum farklı yarış.
import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { aracKur, parcaliKurulum } from "../../src/arac/parcalar";
import { yarisLastigi } from "../../src/arac/yaris-lastigi";
import { tp, type Pist } from "../../src/dunya/pist";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { BASLANGIC_ARACLARI } from "../../src/oyun/ekonomi";
import { DUELLO } from "../../src/oyun/mutant-kosu";
import { hizProfili, yarisCizgisi } from "../../src/yz/cizgi";
import { karma, KISILIKLER, virajSapmasi, type KisilikAdi } from "../../src/yz/kisilik";
import { pilotAdimi, pilotDurumu, pilotPlani } from "../../src/yz/pilot";
import {
  IZGARA_YAN,
  pistIlerlemesi,
  rakipKurulumu,
  yarisciAdimi,
  yarisciYap,
  type Yarisci,
} from "../../src/yz/yarisci";
import { surucuKur } from "../yardimci/surucu";

/** düello pisti (TDEF indeksi = bölge) */
const DUELLO_PISTI = TDEF.findIndex((d) => d.t == DUELLO.pist.ty && d.lv == DUELLO.pist.lv);

/** oyundaki gibi: oyuncunun ızgarasının yanında, sol normal yönünde IZGARA_YAN */
function izgara(TR: Pist) {
  const g = tp(TR, "", TR.N, 6),
    i = (TR.N - 6) % TR.N;
  return { x: g[1] + TR.T[i][1] * IZGARA_YAN, z: g[2] - TR.T[i][0] * IZGARA_YAN, h: g[3] };
}

function yarisci(
  arac: number,
  kisilik: KisilikAdi,
  tohum: number,
  tur = DUELLO.tur,
  bas?: (TR: Pist) => { x: number; z: number; h: number },
) {
  const s = surucuKur({ yaris: DUELLO_PISTI, arac, lk: "norm" });
  const TR = s.bolge!.TR!;
  return {
    y: yarisciYap(
      s.cx.dunya,
      rakipKurulumu(arac, "gp", "norm"),
      TR,
      tur,
      kisilik,
      tohum,
      (bas ?? izgara)(TR),
    ),
    TR,
  };
}

/** bitene ya da süre dolana dek sür; her adımda konum sıçraması ve girdi sınırı denetlenir */
function sur(y: Yarisci, sn = 150) {
  const S = y.ornek.sim.S;
  let sicrama = 0,
    sinirDisi = 0,
    px = S.x,
    pz = S.z;
  for (let n = 0; n < sn * 60 && y.bitis == null; n++) {
    const v0 = Math.hypot(S.vx, S.vz),
      gi = yarisciAdimi(y, true),
      v1 = Math.hypot(S.vx, S.vz);
    if (gi.g < 0 || gi.g > 1 || gi.b < 0 || gi.b > 1 || Math.abs(gi.tg) > 1 || gi.dbr) sinirDisi++;
    // ışınlanma yok: bir adımda alınan yol hızın izin verdiğinden fazla olamaz
    const yol = Math.hypot(S.x - px, S.z - pz);
    sicrama = Math.max(sicrama, yol - (Math.max(v0, v1) / 60) * 1.05);
    px = S.x;
    pz = S.z;
  }
  return { sicrama, sinirDisi };
}

const durum = (y: Yarisci) => ({
  S: { ...y.ornek.sim.S },
  D: { ...y.ornek.sim.d.D },
  t: y.t,
  bitis: y.bitis,
  turlar: [...y.turSureleri],
  pilot: { ...y.pilot },
});

describe("A3 rakip YZ: yarış çizgisi, hız profili ve kişilik (saf)", () => {
  const s = surucuKur({ yaris: DUELLO_PISTI, arac: BASLANGIC_ARACLARI[0], lk: "norm" }),
    TR = s.bolge!.TR!;

  it("çizgi pistin içinde, orta çizgiden daha az kıvrımlı ve belirlenimci", () => {
    const K = KISILIKLER.deneyimli,
      c = yarisCizgisi(TR, K.pay);
    for (let i = 0; i < c.N; i++) expect(Math.abs(c.o[i])).toBeLessThanOrEqual(TR.hw - K.pay + 1e-9);
    const orta = yarisCizgisi(TR, TR.hw, 0);
    // kıvrım enerjisi (eğriliğin karesi): toplam dönüş açısı kapalı pistte sabit, karesi çizgi düzleşince azalır
    const enerji = (k: Float64Array) => k.reduce((a, b) => a + b * b, 0);
    expect(enerji(c.k)).toBeLessThan(enerji(orta.k) * 0.7);
    expect(yarisCizgisi(TR, K.pay)).toEqual(c);
  });

  it("hız profili viraj sınırını ve fren mesafesini aşmaz", () => {
    const c = yarisCizgisi(TR, 2.8),
      h = { yan: 13.5, fren: 8.5, tavan: 95 },
      v = hizProfili(c, h);
    for (let i = 0; i < c.N; i++) {
      const j = (i + 1) % c.N,
        ds = j ? c.s[j] - c.s[i] : c.len - c.s[i];
      expect(v[i]).toBeLessThanOrEqual(Math.sqrt(h.yan / Math.max(Math.abs(c.k[i]), 1e-5)) + 1e-9);
      expect(v[i] * v[i]).toBeLessThanOrEqual(v[j] * v[j] + 2 * h.fren * ds + 1e-6);
    }
  });

  it("kişilik sapması tohumlu, sınırlı; tutarlı pilot daha az sapar", () => {
    expect(karma(5, 1, 2)).toBe(karma(5, 1, 2));
    expect(karma(5, 1, 2)).not.toBe(karma(6, 1, 2));
    const enCok = { caylak: 0, deneyimli: 0 };
    for (let b = 0; b < 200; b++)
      for (const ad of ["caylak", "deneyimli"] as const) {
        const f = virajSapmasi(KISILIKLER[ad], 9, 0, b);
        enCok[ad] = Math.max(enCok[ad], Math.abs(f - 1));
      }
    expect(enCok.deneyimli).toBeLessThan(enCok.caylak);
    expect(enCok.caylak).toBeLessThanOrEqual(0.08 * (1 - KISILIKLER.caylak.tutarlilik) + 1e-9);
  });

  it("geri sayımda frende bekler, kalkış tepkisinden sonra gaz verir", () => {
    const plan = pilotPlani(TR, KISILIKLER.caylak, 1),
      d = pilotDurumu(plan, TR.P[0][0], TR.P[0][1]),
      a = { x: TR.P[0][0], z: TR.P[0][1], h: Math.atan2(TR.T[0][0], TR.T[0][1]), vx: 0, vz: 0, beta: 0 };
    expect(pilotAdimi(plan, d, a, 1 / 60, false)).toMatchObject({ g: 0, b: 1 });
    expect(pilotAdimi(plan, d, a, 1 / 60, true).g).toBe(0);
    for (let n = 0; n < 30; n++) pilotAdimi(plan, d, a, 1 / 60, true);
    expect(pilotAdimi(plan, d, a, 1 / 60, true).g).toBeGreaterThan(0.5);
  });

  it("ızgarada ilerleme negatif, çizgiden sonra pozitif; tur başına pist uzunluğu", () => {
    const N = TR.N;
    expect(pistIlerlemesi(TR, 0, N - 6, false)).toBeLessThan(0);
    expect(pistIlerlemesi(TR, 0, 10, false)).toBeGreaterThan(0);
    expect(pistIlerlemesi(TR, 1, 10, false) - pistIlerlemesi(TR, 0, 10, false)).toBeCloseTo(TR.len);
  });
});

describe("A3 rakip YZ: düello pistinde gerçek fizik (Yeşil Vadi, 2 tur)", () => {
  it("rakip oyuncunun stok aracı + yardım seviyesi + yarış lastiğiyle; gizli çarpan yok", () => {
    for (const arac of BASLANGIC_ARACLARI) {
      const k = rakipKurulumu(arac, "gp", "norm");
      expect(k).toEqual({ ...parcaliKurulum(arac, [], "norm"), tire: yarisLastigi("gp") });
      expect(k.car).toEqual(aracKur(arac, []).car);
      expect(k.car.hp).toBe(CARS[arac].hp);
    }
  });

  it("deneyimli ve çaylak bütün başlangıç araçlarında 2 turu takılmadan, ışınlanmadan bitirir", () => {
    const sonuc: Record<string, number[]> = { caylak: [], deneyimli: [] };
    for (const arac of BASLANGIC_ARACLARI)
      for (const ad of ["caylak", "deneyimli"] as const) {
        const { y } = yarisci(arac, ad, 1);
        const r = sur(y);
        expect(y.bitis, `${CARS[arac].n} ${ad} bitirdi`).not.toBeNull();
        expect(y.turSureleri).toHaveLength(DUELLO.tur);
        expect(y.pilot.toparlanma, "takılıp geri vitese geçmedi").toBe(0);
        expect(r.sicrama, "konum hızın izin verdiğinden fazla değişmedi").toBeLessThan(0.02);
        expect(r.sinirDisi, "girdiler sınırda, el freni yok").toBe(0);
        sonuc[ad].push(y.turSureleri[1]);
      }
    // kişilik farkı fiziksel: deneyimli her araçta daha hızlı uçan tur
    sonuc.deneyimli.forEach((t, i) => expect(t).toBeLessThan(sonuc.caylak[i] - 1));
    // pistin tur başına yıldız eşikleri (gp 1): 1★ 53,8 / 2★ 46,7 / 3★ 43,0 sn. Kalibrasyon (docs/DENGE.md):
    // deneyimli 2★-3★ temposunda, çaylak 1★-2★ temposunda (hızlı başlangıç aracında biraz altı)
    for (const t of sonuc.deneyimli) expect(t > 40 && t < 47, "deneyimli uçan tur " + t).toBe(true);
    for (const t of sonuc.caylak) expect(t > 45 && t < 53.8, "çaylak uçan tur " + t).toBe(true);
  }, 240000);

  it("aynı tohum birebir aynı yarış; farklı tohum farklı yarış", () => {
    const arac = BASLANGIC_ARACLARI[0],
      bir = yarisci(arac, "caylak", 7).y,
      iki = yarisci(arac, "caylak", 7).y,
      uc = yarisci(arac, "caylak", 8).y;
    sur(bir);
    sur(iki);
    sur(uc);
    expect(durum(iki)).toEqual(durum(bir));
    expect(uc.bitis).not.toBe(bir.bitis);
  }, 120000);

  it("zorlanma: ters ve dik başlangıçtan, iki yana genişe kaçmadan toparlanıp turu bitirir", () => {
    const arac = BASLANGIC_ARACLARI[0];
    const tasma = (yan: number, aci: number) => (TR: Pist) => {
      const i = 60;
      return {
        x: TR.P[i][0] + TR.T[i][1] * yan,
        z: TR.P[i][1] - TR.T[i][0] * yan,
        h: Math.atan2(TR.T[i][0], TR.T[i][1]) + aci,
      };
    };
    const durumlar: [string, (TR: Pist) => { x: number; z: number; h: number }, number][] = [
      ["ters", (TR) => ({ ...izgara(TR), h: izgara(TR).h + Math.PI }), 0],
      ["dik", (TR) => ({ ...izgara(TR), h: izgara(TR).h + Math.PI / 2 }), 0],
      ["sola taşma", tasma(9, 0.35), 22],
      ["sağa taşma", tasma(-9, -0.35), 22],
    ];
    for (const [ad, bas, v0] of durumlar) {
      const { y } = yarisci(arac, "deneyimli", 3, 1, bas);
      const S = y.ornek.sim.S;
      // başlangıç hızı fiziğin ilk adımından önce (araç durumu buradan kurulur): yalnız senaryo kurulumu
      S.vx = Math.sin(S.h) * v0;
      S.vz = Math.cos(S.h) * v0;
      sur(y, 120);
      expect(y.bitis, ad + ": tur bitti").not.toBeNull();
      expect(y.bitis!, ad).toBeLessThan(75);
    }
  }, 180000);
});
