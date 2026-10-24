// Ölçüm: modifiye parçalarının istatistik ve hissiyat izi. npm run olcum -- modifiye (paralel: GRUP=0/4 … 3/4;
// PAKET=1 yalnız paketler). Her parça stok araca tek başına takılır; fark stoğa göre.
//   asfalt ölçüleri Kızıl Ok (0) ile: 0-100, 40 sn'de hız, 100-0, yanal tutuş (35 m; aero 140 m), turbo dolma süresi,
//   yalpa (40 m'de 19 m/s), çıkış patinajı ve kayma açısı, teker açısı; tur: asfalt pist 2 (Kızıl Ok), rallikros pist 2 (Kor RX)
//   paketler: aracın kendi türü ve başka türde (pist 2-3; drift puanı, drag süresi)
import { it } from "vitest";
import { CARS, type YarisTuru } from "../../src/arac/araclar";
import { PAKETLER, PARCALAR } from "../../src/arac/parcalar";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import { gazlaKaydir } from "../yardimci/denemeler";
import { cikisPatinaji, duzCizgi, yalpa } from "../yardimci/modifiye-his";
import { dragSur, driftPuani, enIyiTur, virajTutusu } from "../yardimci/uyum";

const C = [0.6, 0.8, 1, 1.2, 1.4];
const f = (x: number, n = 1) => (Number.isFinite(x) ? x.toFixed(n).replace(".", ",") : "—");
const d = (a: number, b: number, n = 1) => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return f(a, n);
  const x = a - b;
  return Math.abs(x) < 0.5 * 10 ** -n ? "±0" : (x > 0 ? "+" : "−") + Math.abs(x).toFixed(n).replace(".", ",");
};

function olc(parca: string[]) {
  const z = duzCizgi(0, parca),
    k = cikisPatinaji(0, parca);
  return {
    ...z,
    tutus: virajTutusu(0, 1, null, 35, parca),
    tutus140: virajTutusu(0, 1, null, 140, parca),
    yalpa: yalpa(0, parca),
    kap: k.kap,
    kayma: k.kayma,
    aci: gazlaKaydir(0, parca, 12, 1).delta * 57.3,
    asf: enIyiTur(pistNo("gp", 2), 0, C, { parca }).t,
    top: enIyiTur(pistNo("rx", 2), 1, C, { parca }).t,
  };
}

it("modifiye: parça başına istatistik ve hissiyat", () => {
  if (process.env.PAKET) return;
  const [g, n] = (process.env.GRUP || "0/1").split("/").map(Number);
  const s = olc([]);
  const satir = (ad: string, o: ReturnType<typeof olc>) =>
    `| ${ad} | ${d(o.t100, s.t100, 2)} | ${d(o.vmax, s.vmax, 0)} | ${d(o.b100, s.b100)} | ${d((o.tutus / s.tutus - 1) * 100, 0, 0)}% | ${d((o.tutus140 / s.tutus140 - 1) * 100, 0, 0)}% | ${f(o.dolma)} | ${d(o.yalpa, s.yalpa, 2)}° | ${d(o.kayma, s.kayma, 0)}° | ${d(o.kap, s.kap, 2)} | ${d(o.aci, s.aci, 0)}° | ${d(o.asf, s.asf, 2)} | ${d(o.top, s.top, 2)} |`;
  const out = [
    `stok Kızıl Ok: 0-100 ${f(s.t100, 2)} sn, hız ${f(s.vmax, 0)}, 100-0 ${f(s.b100)} m, tutuş ${f(s.tutus)} m/s², yalpa ${f(s.yalpa, 2)}°, kayma ${f(s.kayma, 0)}°, açı ${f(s.aci, 0)}°, asfalt tur ${f(s.asf, 2)} sn; Kor RX rallikros ${f(s.top, 2)} sn`,
    "| parça | 0-100 sn | hız km/sa | 100-0 m | tutuş 35 m | tutuş 140 m | turbo dolma sn | yalpa | çıkış kayma | patinaj | teker açısı | asfalt tur sn | toprak tur sn |",
  ];
  PARCALAR.forEach((p, i) => {
    if (i % n != g) return;
    out.push(satir(p.id, olc([p.id])));
  });
  console.log(out.join("\n"));
});

it("modifiye: tür paketleri (kendi türünde ve başka türde)", () => {
  if (process.env.GRUP && process.env.GRUP != "0/4" && !process.env.PAKET) return;
  const deger = (t: YarisTuru, a: number, parca: string[]) => {
    const y = pistNo(t, t == "dp" || t == "dg" ? 3 : 2);
    return t == "dp"
      ? driftPuani(y, a, parca)
      : t == "dg"
        ? dragSur(y, a, 0, { parca })
        : enIyiTur(y, a, undefined, { parca }).t;
  };
  const out = ["| paket | tür | araç | stok | paketli | fark |"];
  for (const p of PAKETLER) {
    const kendi = CARS.findIndex((c) => c.ty == p.tur),
      baska = p.tur == "gp" ? 1 : 0,
      parca = [...p.parcalar, ...p.oneri];
    for (const a of [kendi, baska]) {
      const s = deger(p.tur, a, []),
        m = deger(p.tur, a, parca),
        yuzde = ((m / s - 1) * 100 * (p.tur == "dp" ? 1 : -1)).toFixed(1);
      out.push(
        `| ${p.id} | ${p.tur} | ${CARS[a].n} | ${f(s, p.tur == "dp" ? 0 : 2)} | ${f(m, p.tur == "dp" ? 0 : 2)} | ${yuzde}% iyi |`,
      );
    }
  }
  console.log(out.join("\n"));
});

it("modifiye: drift puanı ve açısı (drift pisti 3, 90 sn)", () => {
  if (process.env.GRUP && process.env.GRUP != "1/4") return;
  const bk = CARS.findIndex((c) => c.ty == "dp"),
    y = pistNo("dp", 3);
  const out = ["| araç | parça | drift puanı | çıkış kayma |"];
  for (const [a, p] of [
    [bk, []],
    [bk, ["diferansiyel-acik"]],
    [bk, ["diferansiyel-kilitli"]],
    [bk, ["aci-kiti"]],
    [bk, ["motor-yaris"]],
    [bk, ["lastik-yaris"]],
    [bk, ["suspansiyon-yaris"]],
    [0, []],
    [0, ["lastik-drift", "diferansiyel-kilitli", "aci-kiti", "cekis-arka"]],
  ] as [number, string[]][])
    out.push(
      `| ${CARS[a].n} | ${p.join(", ") || "stok"} | ${f(driftPuani(y, a, p), 0)} | ${f(cikisPatinaji(a, p).kayma, 0)}° |`,
    );
  console.log(out.join("\n"));
});
