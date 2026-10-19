// Klasik fizik modeli değişmedi mi? Sabit girişli 13 senaryonun izi kayıtlı izle karşılaştırılır.
// İlk kayıt, oyunun TypeScript'e taşınmadan önceki sürümünden (2.0.0) alındı. Klasik fizik bilerek
// değiştirilirse izi yenile: npm run altin-iz (ve değişikliği commit mesajında belirt).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { ALANLAR, SENARYOLAR, senaryoCalistir } from "../yardimci/senaryo";

const DOSYA = path.join(import.meta.dirname, "../veri/klasik-iz.json.gz");

// npm run altin-iz: izi şimdiki fizikten yeniden yaz (yalnız fizik bilerek değiştirildiyse)
if (process.env.ALTIN_IZ == "yaz") {
  const iz: Record<string, number[][]> = {};
  for (const s of SENARYOLAR.senaryolar) iz[s.ad] = senaryoCalistir(s).filter((_, i) => i % 10 == 9);
  fs.writeFileSync(DOSYA, zlib.gzipSync(JSON.stringify({ alan: ALANLAR, her: 10, iz })));
}

const kayit: { alan: string[]; her: number; iz: Record<string, number[][]> } = JSON.parse(
  zlib.gunzipSync(fs.readFileSync(DOSYA)).toString(),
);

describe("klasik fizik izi", () => {
  it("alan sırası kayıtla aynı", () => expect(kayit.alan).toEqual(ALANLAR));
  for (const s of SENARYOLAR.senaryolar)
    it(s.ad, () => {
      const rows = senaryoCalistir(s).filter((_, i) => i % kayit.her == kayit.her - 1),
        ref = kayit.iz[s.ad];
      expect(rows.length).toBe(ref.length);
      for (let i = 0; i < ref.length; i++)
        for (let k = 0; k < ALANLAR.length; k++) {
          const a = rows[i][k],
            b = ref[i][k];
          if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(b)))
            throw new Error(`${s.ad}: adım ${(i + 1) * kayit.her}, ${ALANLAR[k]} = ${a}, beklenen ${b}`);
        }
    });
});
