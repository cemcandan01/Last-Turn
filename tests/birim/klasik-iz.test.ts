// Klasik fizik modeli değişmedi mi? Sabit girişli 13 senaryonun izi kayıtlı izle karşılaştırılır.
// Kayıt, oyunun TypeScript'e taşınmadan önceki sürümünden (2.0.0) alındı. Fizik bilerek değiştirilirse
// izi yenile: npm run altin-iz
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { ALANLAR, SENARYOLAR, senaryoCalistir } from "../yardimci/senaryo";

const kayit: { alan: string[]; her: number; iz: Record<string, number[][]> } = JSON.parse(
  zlib.gunzipSync(fs.readFileSync(path.join(import.meta.dirname, "../veri/klasik-iz.json.gz"))).toString(),
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
