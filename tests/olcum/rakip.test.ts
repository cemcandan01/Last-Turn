// A3 rakip YZ ölçümü (issue #22): düello pistinde (Yeşil Vadi, 2 tur) 5 başlangıç aracı × 2 kişilik × 5 tohum gerçek
// fizikle. Tur süresi dağılımı, takılma/toparlanma, pist dışı süre, spin, duvar; zorlanma durumları; yardım
// seviyeleri; aynı tohumun tekrarı; iki YZ arasında sıra değişimi; adım başına işlemci maliyeti.
// Rapor: tests/cikti/rakip-olcum.json (kalıcı kopya docs/denge/). Koşum: npm run olcum -- rakip
import { it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { CARS } from "../../src/arac/araclar";
import { tp, type Pist } from "../../src/dunya/pist";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import type { SeviyeAnahtari } from "../../src/fizik/veriler";
import { BASLANGIC_ARACLARI } from "../../src/oyun/ekonomi";
import { DUELLO } from "../../src/oyun/mutant-kosu";
import { pistKenari } from "../../src/oyun/piste-donus";
import { yildizEsikleri } from "../../src/oyun/yildiz";
import { KISILIKLER, type KisilikAdi } from "../../src/yz/kisilik";
import { pilotPlani } from "../../src/yz/pilot";
import { aracAdimi } from "../../src/fizik/arac-ornegi";
import { kayitGirdisi } from "../../src/fizik/girdi-kaydi";
import {
  IZGARA_YAN,
  rakipKurulumu,
  yarisciAdimi,
  yarisciIlerlemesi,
  yarisciYap,
  type Yarisci,
} from "../../src/yz/yarisci";
import { surucuKur } from "../yardimci/surucu";

const PIST = TDEF.findIndex((d) => d.t == DUELLO.pist.ty && d.lv == DUELLO.pist.lv),
  TOHUMLAR = [1, 2, 3, 4, 5],
  KISILIK: KisilikAdi[] = ["caylak", "deneyimli"];

type Bas = (TR: Pist) => { x: number; z: number; h: number; v?: number };
const izgara =
  (yan = IZGARA_YAN): Bas =>
  (TR) => {
    const g = tp(TR, "", TR.N, 6),
      i = (TR.N - 6) % TR.N;
    return { x: g[1] + TR.T[i][1] * yan, z: g[2] - TR.T[i][0] * yan, h: g[3] };
  };
const tasma =
  (yan: number, aci: number, v: number): Bas =>
  (TR) => {
    const i = 60;
    return {
      x: TR.P[i][0] + TR.T[i][1] * yan,
      z: TR.P[i][1] - TR.T[i][0] * yan,
      h: Math.atan2(TR.T[i][0], TR.T[i][1]) + aci,
      v,
    };
  };

function kur(
  arac: number,
  kisilik: KisilikAdi,
  tohum: number,
  tur: number,
  bas: Bas,
  lk: SeviyeAnahtari = "norm",
) {
  const s = surucuKur({ yaris: PIST, arac, lk });
  const TR = s.bolge!.TR!,
    b = bas(TR);
  const y = yarisciYap(s.cx.dunya, rakipKurulumu(arac, "gp", lk), TR, tur, kisilik, tohum, b);
  if (b.v) {
    y.ornek.sim.S.vx = Math.sin(b.h) * b.v;
    y.ornek.sim.S.vz = Math.cos(b.h) * b.v;
  }
  return { y, TR };
}

/** yarışçıyı bitene ya da süre dolana dek sür; sayaçlar */
function sur(y: Yarisci, TR: Pist, sn: number) {
  const S = y.ornek.sim.S,
    kenar = pistKenari(TR);
  let disari = 0,
    enUzak = 0,
    spin = 0,
    spinde = false,
    carpma = 0,
    sonHit = S.hit,
    adim = 0;
  const t0 = performance.now();
  for (; adim < sn * 60 && y.bitis == null; adim++) {
    yarisciAdimi(y, true);
    const u = Math.hypot(S.x - TR.P[y.ti][0], S.z - TR.P[y.ti][1]);
    enUzak = Math.max(enUzak, u);
    if (u > kenar) disari++;
    const beta = Math.abs(y.ornek.sim.d.D.beta),
      v = Math.hypot(S.vx, S.vz),
      sp = beta > 1.3 && v > 4;
    if (sp && !spinde) spin++;
    spinde = beta > 0.4 && (spinde || sp);
    if (S.hit > sonHit + 0.25) carpma++;
    sonHit = Math.max(sonHit, S.hit);
  }
  return {
    bitis: y.bitis == null ? null : +y.bitis.toFixed(2),
    turlar: y.turSureleri.map((t) => +t.toFixed(2)),
    toparlanma: y.pilot.toparlanma,
    kenarDuzeltme: y.pilot.kenar,
    pistDisiSn: +(disari / 60).toFixed(2),
    enUzakM: +enUzak.toFixed(1),
    spin,
    carpma,
    msAdim: +((performance.now() - t0) / Math.max(adim, 1)).toFixed(4),
  };
}

const ort = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(a.length, 1);
const sapma = (a: number[]) => Math.sqrt(ort(a.map((x) => (x - ort(a)) ** 2)));
const yuvarla = (x: number, n = 2) => +x.toFixed(n);

it("rakip YZ ölçümü", () => {
  const ys = yildizEsikleri(DUELLO.pist.ty, DUELLO.pist.lv).map((t) => yuvarla(t / 3)),
    duello: object[] = [],
    ozet: Record<string, object> = {};

  // 1) düello: 5 araç × 2 kişilik × 5 tohum
  const kisilikOzet: Record<
    string,
    {
      ucan: number[];
      bitis: number[];
      tamam: number;
      kosu: number;
      top: number;
      disari: number;
      spin: number;
      carpma: number;
      ms: number[];
    }
  > = {};
  for (const ad of KISILIK) {
    kisilikOzet[ad] = {
      ucan: [],
      bitis: [],
      tamam: 0,
      kosu: 0,
      top: 0,
      disari: 0,
      spin: 0,
      carpma: 0,
      ms: [],
    };
    for (const arac of BASLANGIC_ARACLARI) {
      const ucan: number[] = [];
      for (const tohum of TOHUMLAR) {
        const { y, TR } = kur(arac, ad, tohum, DUELLO.tur, izgara());
        const r = sur(y, TR, 200);
        const o = kisilikOzet[ad];
        o.kosu++;
        if (r.bitis != null) {
          o.tamam++;
          o.bitis.push(r.bitis);
          o.ucan.push(r.turlar[1]);
          ucan.push(r.turlar[1]);
        }
        o.top += r.toparlanma;
        o.disari += r.pistDisiSn;
        o.spin += r.spin;
        o.carpma += r.carpma;
        o.ms.push(r.msAdim);
        duello.push({ arac: CARS[arac].n, kisilik: ad, tohum, ...r });
      }
      console.log(
        `${CARS[arac].n.padEnd(15)} ${ad.padEnd(9)} uçan tur ${ucan.map((t) => t.toFixed(2)).join(" ")} (ort ${ort(ucan).toFixed(2)}, sapma ${sapma(ucan).toFixed(3)})`,
      );
    }
  }
  for (const ad of KISILIK) {
    const o = kisilikOzet[ad];
    ozet[ad] = {
      bitirme: `${o.tamam}/${o.kosu}`,
      ucanTurOrt: yuvarla(ort(o.ucan)),
      ucanTurSapma: yuvarla(sapma(o.ucan), 3),
      ucanTurEnIyi: yuvarla(Math.min(...o.ucan)),
      ucanTurEnKotu: yuvarla(Math.max(...o.ucan)),
      bitisOrt: yuvarla(ort(o.bitis)),
      toparlanma: o.top,
      pistDisiSn: yuvarla(o.disari),
      spin: o.spin,
      carpma: o.carpma,
    };
  }
  const fark =
    (ozet.caylak as { ucanTurOrt: number }).ucanTurOrt -
    (ozet.deneyimli as { ucanTurOrt: number }).ucanTurOrt;
  console.log("özet", JSON.stringify(ozet), "deneyimli/çaylak farkı", fark.toFixed(2), "sn/tur");

  // 2) aynı tohum birebir aynı
  const tekrar = [1, 2].map(() => {
    const { y, TR } = kur(BASLANGIC_ARACLARI[0], "caylak", 3, DUELLO.tur, izgara());
    sur(y, TR, 200);
    return JSON.stringify({ S: y.ornek.sim.S, t: y.t, b: y.bitis, p: y.pilot });
  });
  const tekrarAyni = tekrar[0] == tekrar[1];

  // 3) zorlanma
  const durumlar: [string, Bas, number][] = [
    ["ters başlangıç", (TR) => ({ ...izgara()(TR), h: izgara()(TR).h + Math.PI }), 1],
    ["dik başlangıç", (TR) => ({ ...izgara()(TR), h: izgara()(TR).h + Math.PI / 2 }), 1],
    ["genişe kaçma sol 20°/22 m/s", tasma(9, 0.35, 22), 1],
    ["genişe kaçma sağ 20°/22 m/s", tasma(-9, -0.35, 22), 1],
    ["sert taşma sol 34°/25 m/s", tasma(8, 0.6, 25), 1],
    ["sert taşma sağ 34°/25 m/s", tasma(-8, -0.6, 25), 1],
  ];
  const zorlanma: object[] = [];
  for (const [ad, bas, tur] of durumlar) {
    let tamam = 0,
      n = 0;
    const sureler: number[] = [],
      kalan: string[] = [];
    for (const arac of BASLANGIC_ARACLARI)
      for (const k of KISILIK) {
        const { y, TR } = kur(arac, k, 1, tur, bas);
        const r = sur(y, TR, 120);
        n++;
        if (r.bitis != null) {
          tamam++;
          sureler.push(r.bitis);
        } else kalan.push(CARS[arac].n + " " + k);
      }
    zorlanma.push({ durum: ad, toparlandi: `${tamam}/${n}`, turOrt: yuvarla(ort(sureler)), kalan });
    console.log("zorlanma", ad, `${tamam}/${n}`, "tur ort", ort(sureler).toFixed(1), kalan.join(", "));
  }

  // 4) yardım seviyeleri (rakip oyuncunun seviyesinde sürer)
  const yardim: object[] = [];
  for (const lk of ["arc", "norm", "real"] as SeviyeAnahtari[])
    for (const arac of BASLANGIC_ARACLARI) {
      const { y, TR } = kur(arac, "deneyimli", 1, DUELLO.tur, izgara(), lk);
      const r = sur(y, TR, 200);
      yardim.push({
        lk,
        arac: CARS[arac].n,
        bitis: r.bitis,
        ucan: r.turlar[1] ?? null,
        toparlanma: r.toparlanma,
        pistDisiSn: r.pistDisiSn,
        spin: r.spin,
      });
    }
  console.log("yardım", JSON.stringify(yardim));

  // 5) iki YZ yan yana (çarpışmasız): sıra değişimi ve fark (sıra hesabı oyundakiyle aynı ilerleme)
  const sira: object[] = [];
  for (const arac of BASLANGIC_ARACLARI) {
    const a = kur(arac, "caylak", 2, DUELLO.tur, izgara(-IZGARA_YAN / 2)).y,
      b = kur(arac, "deneyimli", 2, DUELLO.tur, izgara(IZGARA_YAN / 2)).y;
    let degisim = 0,
      onde = 0,
      enBuyuk = 0;
    for (let n = 0; n < 200 * 60 && (a.bitis == null || b.bitis == null); n++) {
      if (a.bitis == null) yarisciAdimi(a, true);
      if (b.bitis == null) yarisciAdimi(b, true);
      const f = yarisciIlerlemesi(b) - yarisciIlerlemesi(a);
      if (Number.isFinite(f)) enBuyuk = Math.max(enBuyuk, Math.abs(f));
      const s = Math.sign(f);
      if (s && onde && s != onde) degisim++;
      if (s) onde = s;
    }
    sira.push({
      arac: CARS[arac].n,
      caylakBitis: yuvarla(a.bitis ?? -1),
      deneyimliBitis: yuvarla(b.bitis ?? -1),
      siraDegisimi: degisim,
      enBuyukFarkM: yuvarla(enBuyuk, 1),
    });
  }
  console.log("iki YZ", JSON.stringify(sira));

  // 6) maliyet: plan kurulumu (yarış başında bir kez) ve adım başına (pilot + fizik); oyuncu fiziğiyle oran
  const t0 = performance.now(),
    s = surucuKur({ yaris: PIST, arac: BASLANGIC_ARACLARI[0], lk: "norm" });
  for (let n = 0; n < 5; n++) pilotPlani(s.bolge!.TR!, KISILIKLER.deneyimli, n);
  const planMs = (performance.now() - t0) / 5;
  // aynı yarış: önce pilot + fizik, sonra kaydedilen girdiler yalnız fizikle (pilotun payı = fark)
  const m = kur(BASLANGIC_ARACLARI[0], "deneyimli", 1, DUELLO.tur, izgara());
  for (let n = 0; n < 600; n++) yarisciAdimi(m.y, true);
  const t1 = performance.now();
  let adim = 0;
  for (; adim < 4800 && m.y.bitis == null; adim++) yarisciAdimi(m.y, true);
  const tamMs = (performance.now() - t1) / adim,
    kayit = m.y.ornek.kayit,
    tekrar2 = kur(BASLANGIC_ARACLARI[0], "deneyimli", 1, DUELLO.tur, izgara()).y;
  for (let n = 0; n < 600; n++) aracAdimi(tekrar2.ornek, kayitGirdisi(kayit, n));
  const t2 = performance.now();
  for (let n = 600; n < 600 + adim; n++) aracAdimi(tekrar2.ornek, kayitGirdisi(kayit, n));
  const fizikMs = (performance.now() - t2) / adim,
    yzMs = ort(Object.values(kisilikOzet).flatMap((o) => o.ms));
  const maliyet = {
    planKurulumMs: yuvarla(planMs, 2),
    rakipAdimMsOrt: yuvarla(yzMs, 4),
    olcumAdimMs: yuvarla(tamMs, 4),
    yalnizFizikAdimMs: yuvarla(fizikMs, 4),
    pilotPayiAdimMs: yuvarla(tamMs - fizikMs, 4),
    not: "Node (CI/geliştirici makinesi). iPhone 13 için tarayıcı ölçümü e2e 'rakip' bölümünde (perf.fizik farkı).",
  };
  console.log("maliyet", JSON.stringify(maliyet));

  const rapor = {
    tarih: new Date().toISOString().slice(0, 10),
    pist: TDEF[PIST].n,
    tur: DUELLO.tur,
    yildizTurBasina: { "1": ys[0], "2": ys[1], "3": ys[2] },
    kisilikler: KISILIKLER,
    ozet,
    deneyimliCaylakFarkSnTur: yuvarla(fark),
    tohumTekrariAyni: tekrarAyni,
    zorlanma,
    yardim,
    ikiYZ: sira,
    maliyet,
    duello,
  };
  mkdirSync("tests/cikti", { recursive: true });
  writeFileSync("tests/cikti/rakip-olcum.json", JSON.stringify(rapor, null, 2) + "\n");
});
