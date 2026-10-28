// LT-SYS-007 ölçümü: MUTANT etkinlik türlerinde (asfalt, rallikros, ralli, drag) rakip YZ bütün pistleri tek turda
// takılmadan bitiriyor mu, temposu stok referansa göre nerede. Rakip MUTANT kuralıyla kurulur (önayar lastiği + toprak
// dengesi). Rapor: tests/cikti/mutant-rakip-olcum.json. Koşum: npx vitest run tests/olcum/mutant-rakip.test.ts
import { it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import type { YarisTuru } from "../../src/arac/araclar";
import { tp } from "../../src/dunya/pist";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { PRESETS } from "../../src/fizik/veriler";
import { BASLANGIC } from "../../src/oyun/kariyer";
import { MUTANT_REFERANS, MUTANT_REFERANS_YAGMUR } from "../../src/oyun/mutant-denge";
import {
  BOSSLAR,
  RAKIP_KISILIK,
  RAKIPSIZ_PISTLER,
  bossAdaylari,
  bossHedefi,
  bossRakibi,
  kosuAraci,
  toprakDengesi,
} from "../../src/oyun/mutant-kosu";
import { kariyerKurulumu } from "../../src/oyun/kariyer";
import { parcaBul, parcaliKurulum } from "../../src/arac/parcalar";
import { yildizEsikleri } from "../../src/oyun/yildiz";
import type { KisilikAdi } from "../../src/yz/kisilik";
import { IZGARA_YAN, rakipKurulumu, yarisciAdimi, yarisciYap } from "../../src/yz/yarisci";
import { surucuKur } from "../yardimci/surucu";

const TURLER: YarisTuru[] = (process.env.TUR?.split(",") as YarisTuru[]) ?? ["gp", "rx", "rl", "dg"];

export function rakipSur(
  i: number,
  kisilik: KisilikAdi,
  tohum: number,
  parca: readonly string[] = [],
  aracSec?: number,
) {
  const d = TDEF[i],
    ty = d.t,
    arac = aracSec ?? BASLANGIC[ty];
  const s = surucuKur({ yaris: i, arac, lk: "norm" });
  const TR = s.bolge!.TR!,
    g = tp(TR, "", ty == "dg" ? 1 : TR.open ? 4 : TR.N, TR.open ? 0 : 6),
    j = TR.open ? 0 : (TR.N - 6) % TR.N;
  const K = rakipKurulumu(arac, ty, "norm", 1, 1, parca);
  K.tire = parca.some((id) => parcaBul(id)?.e.lastik != null)
    ? parcaliKurulum(arac, parca, "norm").tire
    : PRESETS[K.pk].tire;
  K.car = toprakDengesi(K.car, K.tire);
  const y = yarisciYap(
    s.cx.dunya,
    K,
    TR,
    TR.open ? 0 : 1,
    kisilik,
    tohum,
    { x: g[1] + TR.T[j][1] * IZGARA_YAN, z: g[2] - TR.T[j][0] * IZGARA_YAN, h: g[3] },
    ty == "dg" ? 1 : 4,
  );
  const ref = MUTANT_REFERANS[ty + "_" + d.lv]?.stok;
  const ust = (ref ?? 200) * 3 + 20;
  for (let k = 0; k < 2 * 60 && y.bitis == null; k++) yarisciAdimi(y, false);
  for (let k = 0; k < ust * 60 && y.bitis == null; k++) yarisciAdimi(y, true);
  return {
    pist: d.n,
    ty,
    lv: d.lv,
    kisilik,
    tohum,
    bitis: y.bitis,
    ref,
    toparlanma: y.pilot.toparlanma,
    donus: y.pisteDonus,
  };
}

it.skipIf(process.env.SADECE == "boss")(
  "MUTANT rakip ölçümü",
  () => {
    const satir = [];
    const TUR_SAYISI: Partial<Record<YarisTuru, number>> = { gp: 3, rx: 3 };
    for (const [i, d] of TDEF.entries()) {
      if (!TURLER.includes(d.t) || RAKIPSIZ_PISTLER.includes(d.t + "_" + d.lv)) continue;
      const sev = d.sev ?? d.lv,
        bolge = sev <= 3 ? 1 : sev <= 5 ? 2 : 3,
        ys = yildizEsikleri(d.t, d.lv).map((y) => y / (TUR_SAYISI[d.t] ?? 1));
      for (const risk of [0, 1, 2] as const) {
        const K = kariyerKurulumu(d.t, sev),
          r = rakipSur(i, RAKIP_KISILIK[risk], 1, K.parca, K.arac);
        satir.push({ ...r, risk, bolge, hedef: ys[risk] });
        console.log(
          `${r.ty} lv${r.lv} sev${sev} b${bolge} ${r.pist.padEnd(20)} risk${risk} ${r.kisilik.padEnd(9)} rakip ${r.bitis?.toFixed(1) ?? "BİTMEDİ"} hedef ${ys[risk].toFixed(1)} oran ${r.bitis ? (r.bitis / ys[risk]).toFixed(2) : "-"} dönüş ${r.donus}`,
        );
      }
    }
    mkdirSync("tests/cikti", { recursive: true });
    writeFileSync("tests/cikti/mutant-rakip-olcum.json", JSON.stringify(satir, null, 1));
  },
  3600000,
);

// Boss rakibi: boss'un olabileceği pistlerde (bossAdaylari), bölgeye göre, bütün turlarda. Eski hedefle karşılaştırma.
it("MUTANT boss rakibi ölçümü", () => {
  const TYPL: Partial<Record<YarisTuru, number>> = { gp: 3, rx: 3 };
  const pistler = TDEF.map((d, i) => ({
    i,
    ty: d.t,
    sev: d.sev ?? d.lv,
    lv: d.lv,
    ys: yildizEsikleri(d.t, d.lv),
    laps: TYPL[d.t],
    ref: MUTANT_REFERANS[d.t + "_" + d.lv],
    refYagmur: MUTANT_REFERANS_YAGMUR[d.t + "_" + d.lv],
  }));
  const satir = [];
  for (const boss of BOSSLAR) {
    if (boss.ty == "dp") continue;
    for (const bolge of [1, 2, 3]) {
      for (const p of bossAdaylari(boss.ty, bolge, pistler, boss.hava)) {
        const B = bossRakibi({ tohum: 1, bolge, boss })!,
          hedef = bossHedefi({ bolge, boss }, p);
        const r = bossSur(p.i, B.arac, B.parca, p.laps ?? 0, boss.hava, B.pasif);
        satir.push({ boss: boss.id, bolge, pist: TDEF[p.i].n, hedef, ...r });
        console.log(
          `BOSS ${boss.id.padEnd(14)} b${bolge} ${TDEF[p.i].n.padEnd(20)} boss ${r.bitis?.toFixed(1) ?? "BİTMEDİ"} eski hedef ${hedef.toFixed(1)} oran ${r.bitis ? (r.bitis / hedef).toFixed(2) : "-"} dönüş ${r.donus}`,
        );
      }
    }
  }
  writeFileSync("tests/cikti/mutant-boss-olcum.json", JSON.stringify(satir, null, 1));
}, 3600000);

function bossSur(
  i: number,
  arac: number,
  parca: readonly string[],
  turlar: number,
  hava?: string,
  pasif: string[] = [],
) {
  const d = TDEF[i],
    ty = d.t;
  const s = surucuKur({ yaris: i, arac, lk: "norm", wx: hava });
  const TR = s.bolge!.TR!,
    g = tp(TR, "", ty == "dg" ? 1 : TR.open ? 4 : TR.N, TR.open ? 0 : 6),
    j = TR.open ? 0 : (TR.N - 6) % TR.N;
  const K = rakipKurulumu(arac, ty, "norm", 1, 1, parca);
  K.tire = parca.some((id) => parcaBul(id)?.e.lastik != null)
    ? parcaliKurulum(arac, parca, "norm").tire
    : PRESETS[K.pk].tire;
  K.car = toprakDengesi(kosuAraci(K.car, { pasifler: pasif }), K.tire);
  const y = yarisciYap(
    s.cx.dunya,
    K,
    TR,
    TR.open ? 0 : turlar || 1,
    "boss",
    1,
    { x: g[1] + TR.T[j][1] * IZGARA_YAN, z: g[2] - TR.T[j][0] * IZGARA_YAN, h: g[3] },
    ty == "dg" ? 1 : 4,
  );
  for (let k = 0; k < 600 * 60 && y.bitis == null; k++) yarisciAdimi(y, true);
  return { bitis: y.bitis, donus: y.pisteDonus };
}
