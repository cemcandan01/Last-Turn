// LT-SYS-005 açık dünya yol ağı: bütün MUTANT etkinlik/sandık yerleri, atölye ve boss asfalt yolla bağlı; asfalt
// araç bu yollarda etkinliklere gerçek fizikle (yolu izleyen basit pilot) ulaşır. Araçların zemin tutuşu değişmedi:
// toprakta ralli aracı asfalt aracından hâlâ belirgin hızlı (karakter aynı). Ölçüm: tests/cikti/yol-agi.json
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { EA, EB, SX, surfTest } from "../../src/dunya/corak";
import { dunya } from "../../src/dunya/dunya";
import { YOLLAR, YOL_YARI, yolBaglantisi, yolMesafesi, yolNoktalari } from "../../src/dunya/yollar";
import { BASLANGIC_ARACLARI } from "../../src/oyun/ekonomi";
import { ATOLYE, BOSS_YERI, YERLER } from "../../src/oyun/mutant-kosu";
import { surucuKur } from "../yardimci/surucu";

type N = [number, number];
const DT = 1 / 60;
const HEDEFLER: N[] = [...YERLER, BOSS_YERI];

/** asfalt düğümleri: yol noktaları; aralarında (≤ 9 m) asfalt üstünden kenar */
const DUGUM = yolNoktalari(EA, EB, SX);
function yol(bas: N, son: N): N[] | null {
  const n = DUGUM.length,
    en = (p: N) =>
      DUGUM.reduce(
        (b, q, i) =>
          Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(DUGUM[b][0] - p[0], DUGUM[b][1] - p[1]) ? i : b,
        0,
      ),
    a = en(bas),
    b = en(son),
    uz = new Array(n).fill(Infinity),
    once = new Array(n).fill(-1),
    bitti = new Array(n).fill(false);
  uz[a] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!bitti[i] && uz[i] < Infinity && (u < 0 || uz[i] < uz[u])) u = i;
    if (u < 0) return null;
    if (u == b) break;
    bitti[u] = true;
    for (let v = 0; v < n; v++) {
      const d = Math.hypot(DUGUM[u][0] - DUGUM[v][0], DUGUM[u][1] - DUGUM[v][1]);
      if (d > 9 || bitti[v]) continue;
      // kenar asfalt üstünden geçmeli (orta nokta asfalt)
      if (!surfTest((DUGUM[u][0] + DUGUM[v][0]) / 2, (DUGUM[u][1] + DUGUM[v][1]) / 2)) continue;
      if (uz[u] + d < uz[v]) {
        uz[v] = uz[u] + d;
        once[v] = u;
      }
    }
  }
  const r: N[] = [];
  for (let v = b; v >= 0; v = once[v]) r.unshift(DUGUM[v]);
  return [bas, ...r, son];
}

/**
 * yolu izleyen basit pilot (gerçek fizik, açık dünya, çarpışma nesneleri dahil): ileriye bakış noktasına direksiyon,
 * önümüzdeki dönüş açısına göre hız. Dönen: varış süresi (sn; varamazsa null), asfaltta geçen süre payı
 */
function sur(arac: number, rota: N[], sinir = 240) {
  const s = surucuKur({ dunya: 0, arac, lk: "norm" }),
    S = s.sim.S,
    [x0, z0] = rota[0];
  s.reset(x0, z0, Math.atan2(rota[1][0] - x0, rota[1][1] - z0));
  let i = 0,
    asfalt = 0,
    kayma = 0,
    carpma = 0,
    hit = S.hit,
    adim = 0;
  const son = rota[rota.length - 1];
  for (; adim < sinir / DT; adim++) {
    if (Math.hypot(S.x - son[0], S.z - son[1]) < 10)
      return { t: adim * DT, asfalt: asfalt / Math.max(1, adim), kayma: kayma / Math.max(1, adim), carpma };
    while (
      i < rota.length - 1 &&
      Math.hypot(rota[i][0] - S.x, rota[i][1] - S.z) < 6 + Math.hypot(S.vx, S.vz) * 0.5
    )
      i++;
    const [tx, tz] = rota[i],
      v = Math.hypot(S.vx, S.vz),
      hata = Math.atan2(
        Math.sin(Math.atan2(tx - S.x, tz - S.z) - S.h),
        Math.cos(Math.atan2(tx - S.x, tz - S.z) - S.h),
      );
    // önümüzdeki ~40 m'deki yön değişimi
    let don = 0;
    for (let j = i; j < Math.min(rota.length - 2, i + 8); j++) {
      const a1 = Math.atan2(rota[j + 1][0] - rota[j][0], rota[j + 1][1] - rota[j][1]),
        a2 = Math.atan2(rota[j + 2][0] - rota[j + 1][0], rota[j + 2][1] - rota[j + 1][1]);
      don += Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
    }
    // insan gibi: asfaltta düzlükte 150 km/sa'e dek, toprakta 108 km/sa
    const tepe = surfTest(S.x, S.z) == 1 ? 42 : 30,
      hedefV = Math.max(9, tepe - (tepe - 8) * Math.min(1, don / 1.2) - 10 * Math.min(1, Math.abs(hata)));
    s.adim({
      tg: Math.max(-1, Math.min(1, hata * 2.2)),
      g: v < hedefV ? 1 : 0,
      b: v > hedefV + 3 ? 0.6 : 0,
      analogDireksiyon: true,
      analogGaz: false,
    });
    if (surfTest(S.x, S.z) == 1) asfalt++;
    if (Math.abs(s.sim.d.D.beta) > 0.35) kayma++;
    if (S.hit > hit + 0.25) carpma++;
    hit = Math.max(hit, S.hit);
  }
  return { t: null, asfalt: asfalt / adim, kayma: kayma / adim, carpma };
}

/** başlangıç araçlarından asfalt (yarış lastikli önayar) ve ralli (toprak lastikli önayar) aracı */
const ASFALT = BASLANGIC_ARACLARI.find((i) => CARS[i].pk == "ar")!,
  RALLI = BASLANGIC_ARACLARI.find((i) => CARS[i].pk == "rl")!;

describe("LT-SYS-005 açık dünya asfalt yol ağı", () => {
  it("bütün etkinlik/sandık yerleri, atölye ve boss asfaltta; yollar yeni düğümlerle tek ağ", () => {
    for (const [x, z] of [...HEDEFLER, ATOLYE]) expect(surfTest(x, z), `${x},${z}`).toBe(1);
    for (const h of HEDEFLER) expect(yol(ATOLYE, h), `${h}`).not.toBeNull();
    // yol kenarından 1 m dışarı toprak (arazi asfalta dönmedi)
    expect(surfTest(YOL_YARI + 1, -300)).toBe(0);
    expect(yolMesafesi(0, -300)).toBe(0);
  });

  it("yolun üstünde ağaç, kaya, koni yok (katı çarpışma nesnesi)", () => {
    surucuKur({ dunya: 0, arac: ASFALT, lk: "norm" });
    let sayi = 0;
    for (const y of YOLLAR)
      for (let i = 0; i + 1 < y.length; i++)
        for (let t = 0; t <= 1; t += 0.02) {
          const x = y[i][0] + (y[i + 1][0] - y[i][0]) * t,
            z = y[i][1] + (y[i + 1][1] - y[i][1]) * t;
          for (const o of dunya.cols.yakin(x, z))
            if ((o.t == "solid" || o.t == "box") && yolMesafesi(o.x, o.z) < YOL_YARI) sayi++;
        }
    expect(sayi).toBe(0);
  });

  it("kanca açık dünyada yolun ilerideki noktasına tutunur; yol önde değilse tutunmaz", () => {
    const nok = yolNoktalari(EA, EB, SX);
    // düz yolda kuzeye giderken
    const n = yolBaglantisi(nok, { x: SX, z: -300, h: 0, vx: 0, vz: 25 }, 21, 35)!;
    expect(n).not.toBeNull();
    expect(n[1]).toBeGreaterThan(-300 + 20);
    expect(Math.abs(n[0] - SX)).toBeLessThan(2);
    // yoldan uzakta, yola sırtı dönük
    expect(yolBaglantisi(nok, { x: 600, z: -700, h: Math.PI / 2, vx: 20, vz: 0 }, 21, 35)).toBeNull();
  });

  it(
    "asfalt araç yolu izleyerek her etkinliğe varır; ralli aracı toprakta yine belirgin hızlı",
    { timeout: 240000 },
    () => {
      const rapor: Record<string, unknown> = {};
      let enUzun = 0;
      for (const h of HEDEFLER) {
        const r = yol(ATOLYE, h)!,
          a = sur(ASFALT, r);
        rapor[h.join(",")] = {
          rotaM: Math.round(
            r.reduce((t, p, i) => (i ? t + Math.hypot(p[0] - r[i - 1][0], p[1] - r[i - 1][1]) : 0), 0),
          ),
          sn: a.t && +a.t.toFixed(1),
          asfaltPayi: +a.asfalt.toFixed(2),
          kaymaPayi: +a.kayma.toFixed(2),
          carpma: a.carpma,
        };
        expect(a.t, `${h} varış`).not.toBeNull();
        expect(a.asfalt, `${h} asfalt payı`).toBeGreaterThan(0.9);
        enUzun = Math.max(enUzun, a.t!);
      }
      // karşılaştırma (yalnız rapor): uzak düzlüklere yolsuz, dümdüz arazi üstünden (asfalt araç)
      for (const h of [
        [-550, 350],
        [450, 450],
        [-450, -450],
        [-150, -500],
      ] as N[]) {
        const ara: N[] = [
            ATOLYE,
            ...[0.25, 0.5, 0.75].map(
              (f) => [ATOLYE[0] + (h[0] - ATOLYE[0]) * f, ATOLYE[1] + (h[1] - ATOLYE[1]) * f] as N,
            ),
            h,
          ],
          d = sur(ASFALT, ara);
        rapor["arazi " + h.join(",")] = {
          sn: d.t && +d.t.toFixed(1),
          asfaltPayi: +d.asfalt.toFixed(2),
          kaymaPayi: +d.kayma.toFixed(2),
          carpma: d.carpma,
        };
      }
      // karakter: toprakta düz 300 m (uzun düz yolun doğusu, yolsuz) ralli aracı asfalt aracından hızlı
      const toprak = (arac: number) =>
        sur(
          arac,
          [
            [300, -400],
            [300, -250],
            [300, -100],
          ],
          60,
        ).t!;
      const ta = toprak(ASFALT),
        tr = toprak(RALLI);
      rapor.toprak300m = { asfaltArac: +ta.toFixed(1), ralliArac: +tr.toFixed(1) };
      rapor.enUzunVarisSn = +enUzun.toFixed(1);
      expect(tr).toBeLessThan(ta);
      mkdirSync("tests/cikti", { recursive: true });
      writeFileSync("tests/cikti/yol-agi.json", JSON.stringify(rapor, null, 1));
    },
  );
});
