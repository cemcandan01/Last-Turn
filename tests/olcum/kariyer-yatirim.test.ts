// İki yatırım yolu ve tek parça kestirmesi, her türün Usta pistinde gerçek fizikle karşılaştırılır.
import { kariyerOlcumImzasi } from "../yardimci/kariyer-imza";
import { it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { kariyerKurali, BASLANGIC } from "../../src/oyun/kariyer";
import { performansPuani } from "../../src/arac/performans";
import { parcaFiyati } from "../../src/oyun/ilerleme";
import { ARAC_FIYAT } from "../../src/oyun/ekonomi";
import { PARCALAR } from "../../src/arac/parcalar";
import { enIyiTur, dragSur } from "../yardimci/uyum";
import { driftTuru, DRIFT_PILOT } from "../yardimci/drift-pilot";
import { DRIFT_TUR } from "../../src/oyun/yildiz";
it("yatırım rotaları", () => {
  const satirlar = [];
  for (const [i, d] of TDEF.entries()) {
    if (d.lv != 4 || (process.env.TUR && d.t != process.env.TUR)) continue;
    const k = kariyerKurali(d.t, d.lv)!;
    const uzman = k.parca.filter(
      (id) => !["lastik", "motor", "agirlik", "turbo"].includes(PARCALAR.find((p) => p.id == id)!.kat),
    );
    const rotalar = [
      { ad: "Tek sokak motoru", arac: BASLANGIC[d.t], parca: ["motor-sokak"] },
      {
        ad: "Eski platform projesi",
        arac: BASLANGIC[d.t],
        parca: ["motor-degisim", "turbo-kucuk", "agirlik-2", "lastik-spor", ...uzman],
      },
      { ad: "Yeni platform stok", arac: k.arac, parca: [] },
    ];
    for (const r of rotalar) {
      let sonuc: number;
      if (d.t == "dp")
        sonuc = Math.max(
          ...[0.3, 0.45].map(
            (aci) =>
              driftTuru(i, "norm", { ...DRIFT_PILOT, aci }, 500, false, r.arac, DRIFT_TUR, false, r.parca)
                .puan,
          ),
        );
      else
        sonuc =
          d.t == "dg"
            ? dragSur(i, r.arac, 0, { parca: r.parca })
            : enIyiTur(i, r.arac, [0.4, 0.7], { parca: r.parca }, d.t == "rl" ? 1 : 3).t;
      const bedel = ARAC_FIYAT[r.arac].para + r.parca.reduce((n, id) => n + parcaFiyati(id), 0);
      satirlar.push({
        kurulumImza: kariyerOlcumImzasi(d, r),
        tur: d.t,
        lv: d.lv,
        ...r,
        bedel,
        puan: performansPuani(r.arac, r.parca).puan,
        sonuc: Number.isFinite(sonuc) ? sonuc : null,
      });
    }
  }
  mkdirSync("tests/cikti", { recursive: true });
  writeFileSync(
    "tests/cikti/kariyer-yatirim.json",
    JSON.stringify(
      {
        yontem:
          "Gerçek fizik; 2 sürüş tarzı. null: bu pilot örnekleminde temiz bitiriş yok, insan için imkânsız demek değildir.",
        satirlar,
      },
      null,
      2,
    ) + "\n",
  );
}, 600000);
