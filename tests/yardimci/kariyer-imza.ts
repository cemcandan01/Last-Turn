// Ölçümün geçerlilik anahtarı: yeni araç/parça eklemek ilgisiz pistleri geçersiz kılmaz;
// kullanılan kurulum, geometri veya ortak fizik değişirse ilgili ölçüm yenilenir.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { PistTanimi } from "../../src/dunya/pist-tanimlari";
import { parcaliKurulum } from "../../src/arac/parcalar";
import { yarisLastigi } from "../../src/arac/yaris-lastigi";
import { SURF, TIRES, YERCEKIMI } from "../../src/fizik/veriler";
import { kariyerKurulumu } from "../../src/oyun/kariyer";
// LT-SYS-004 dış ivme (MUTANT skill çekişi) yalnız cx.dis verilince kuvvet ekler; kariyer/ölçüm onu hiç vermez ve
// yokken fizik birebir aynıdır (tests/birim/beceri-fizik.test.ts). İmzadan ayıklanır.
// LT-SYS-008 uçuş/sarkaç girişi (cx.ucus) de yalnız MUTANT skill'i verince çalışır; kariyer vermez, imzadan ayıklanır.
const ucussuz = (s: string) =>
  s
    .replace("    if (cx.ucus) ucusDenetimi(cx.ucus, Y, UST, st, h, (fy) => (Fy += m * fy));\n", "")
    .replace(/\n\/\*\*\n \* MUTANT uçuş\/sarkaç[\s\S]*$/, "\n");
const disSiz = (s: string) =>
  ucussuz(s)
    .replace(
      / {4}\/\/ dış ivme \(MUTANT çekme\/itme\): kütle merkezine yatay kuvvet\n {4}if \(cx\.dis\) \{\n {6}Fx \+= m \* cx\.dis\.x;\n {6}Fz \+= m \* cx\.dis\.z;\n {4}\}\n/,
      "",
    )
    .replace(
      // LT-SYS-006 drift yarışı bayrağı yalnız MUTANT'ta açılır; kapalıyken driftSkoru birebir eskisidir.
      "driftSkoru(d, v2, vl2, vt2, dt, !!cx.driftYarisi);",
      "driftSkoru(d, v2, vl2, vt2, dt);",
    );
const MODEL = [
  "src/fizik/yeni/model.ts",
  "src/fizik/yeni/arac-fizigi.ts",
  "src/fizik/simulasyon.ts",
  "src/dunya/pist.ts",
  "src/dunya/pist-ciz.ts",
]
  .map((f) => {
    let s = disSiz(readFileSync(f, "utf8"));
    // 0.7.5'te eklenen çıktı sayacı kuvvet/konum hesabını değiştirmez; driftte aşağıda ayrıca imzalanır.
    if (f == "src/fizik/yeni/model.ts")
      s = s
        .replace(
          / {2}let cimTeker = 0;\n {2}for \(let i = 0; i < 4; i\+\+\) if \(Y.tk\[i\].zemin == 2\) cimTeker\+\+;\n/,
          "",
        )
        .replace(
          "return { Sf: SURF[si], T, v: v2, si, cimTeker };",
          "return { Sf: SURF[si], T, v: v2, si };",
        );
    return s.replace(/\s+/g, "");
  })
  .join("\n");
export function kariyerOlcumImzasi(d: PistTanimi, aday?: { arac: number; parca: readonly string[] }) {
  const { t, lv, sev } = d;
  const geometri = Object.fromEntries(
    Object.entries(d).filter(([k]) => !["n", "d", "tg", "hp", "ys", "odulSn"].includes(k)),
  );
  const r = aday ?? kariyerKurulumu(t, sev ?? lv),
    K = parcaliKurulum(r.arac, r.parca, "norm");
  K.tire = yarisLastigi(t, r.parca);
  return createHash("sha256")
    .update(
      JSON.stringify({
        MODEL,
        DRIFT:
          t == "dp"
            ? readFileSync("src/oyun/yaris-kurallari.ts", "utf8").replace(/\s+/g, "") +
              disSiz(readFileSync("src/fizik/yeni/model.ts", "utf8")).replace(/\s+/g, "")
            : undefined,
        YERCEKIMI,
        SURF,
        geometri,
        K,
        lastik: TIRES[K.tire],
      }),
    )
    .digest("hex");
}
