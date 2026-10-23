// Ölçüm: her yarış türünde bütün araçlar (her biri kendi önayarıyla). Türün araçları (★ ilk araç, ☆ sonradan
// gelenler; fark ilk araca göre) açık ara en iyi olmalı; yanlış türün aracı da bitirebilir ama daha yavaş. npm run olcum -- uyum
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { pistNo, TDEF } from "../../src/dunya/pist-tanimlari";
import { dragSur, driftPuani, enIyiTur, virajTutusu } from "../yardimci/uyum";

it("yol tutuşu (her yarış türünün pistinde)", () => {
  for (const [t, z] of [
    ["gp", 1],
    ["rx", 0],
    ["rl", 0],
  ] as const)
    console.log(
      t.padEnd(3),
      CARS.map((c, a) => `${c.n} ${virajTutusu(a, z, t).toFixed(1)}`).join("  "),
      "m/s²",
    );
});

it("araç-tür uyumu", { timeout: 3600000 }, () => {
  const PISTLER = [
    ["gp", 2],
    ["gp", 4],
    ["rx", 2],
    ["rx", 4],
    ["rl", 2],
    ["rl", 4],
    ["dp", 3],
    ["dp", 5],
    ["dg", 3],
    ["dg", 6],
  ] as const;
  for (const [t, lv] of PISTLER) {
    const y = pistNo(t, lv),
      d = TDEF[y],
      tur = t == "gp" || t == "rx" ? 3 : 1,
      oner = CARS.findIndex((c) => c.ty == t);
    const sonuc = CARS.map((_c, a) =>
      t == "dp" ? driftPuani(y, a) : t == "dg" ? dragSur(y, a) : enIyiTur(y, a).t * tur,
    );
    const iyi = (a: number, b: number) => (t == "dp" ? a > b : a < b);
    console.log(
      `\n${d.n} (${t} seviye ${lv}) hedef ${t == "dp" ? d.hp + " puan" : d.tg + " sn"}\n` +
        CARS.map((c, a) => {
          const v = sonuc[a],
            o = sonuc[oner],
            fark = t == "dp" ? (100 * (v - o)) / o : (100 * (v - o)) / o,
            hedef = t == "dp" ? v >= d.hp! : v <= d.tg!;
          return `  ${a == oner ? "★" : c.ty == t ? "☆" : " "} ${c.n.padEnd(12)} ${(t == "dp" ? v.toFixed(0) : v.toFixed(2)).padStart(8)}  ${a == oner ? "      " : (fark > 0 ? "+" : "") + fark.toFixed(1) + "%"}  hedef ${hedef ? "geçti" : "kaldı"}${a != oner && c.ty != t && iyi(v, o) ? "  ← ÖNERİLENDEN İYİ" : ""}`;
        }).join("\n"),
    );
  }
});
