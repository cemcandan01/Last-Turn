// Kalibrasyon: kesilince tamamlanmış pistleri korur; yalnız aynı fizik/kurulum imzası tekrar kullanılabilir.
import { kariyerOlcumImzasi } from "../yardimci/kariyer-imza";
import { it, expect } from "vitest";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { kariyerKurali } from "../../src/oyun/kariyer";
import { performansPuani } from "../../src/arac/performans";
import { enIyiTur, dragSur, CESARETLER } from "../yardimci/uyum";
import { DRIFT_PILOT, driftTuru } from "../yardimci/drift-pilot";
import { DRIFT_TUR } from "../../src/oyun/yildiz";

it("kariyerin bütün hedef kurulumlarını gerçek fizikle ölçer", () => {
  const dosya = `tests/cikti/kariyer-olcum${process.env.TUR ? "-" + process.env.TUR + (process.env.LV ? "-" + process.env.LV : "") : ""}.json`;
  const kaynak = existsSync(dosya) ? dosya : "tests/cikti/kariyer-olcum.json";
  const imza = createHash("sha256")
    .update(
      [
        "src/arac/araclar.ts",
        "src/arac/parcalar.ts",
        "src/arac/yaris-lastigi.ts",
        "src/fizik/veriler.ts",
        "src/fizik/yeni/model.ts",
        "src/oyun/kariyer.ts",
        "tests/yardimci/surucu.ts",
      ]
        .map((f) => readFileSync(f, "utf8"))
        .join("\n"),
    )
    .digest("hex");
  const eski = existsSync(kaynak) ? JSON.parse(readFileSync(kaynak, "utf8")) : null;
  const satirlar: Record<string, unknown>[] =
    eski?.imza == imza
      ? eski.satirlar.filter((r: { tur: string }) => !process.env.TUR || r.tur == process.env.TUR)
      : [];
  mkdirSync("tests/cikti", { recursive: true });
  const yaz = () =>
    writeFileSync(
      dosya,
      JSON.stringify(
        {
          surum: 1,
          imza,
          yontem:
            "Gerçek 4 teker fizik, Dengeli yardım, otomatik yarış bileşiği/kalitesi; temiz pilot referansı, insan başarı oranı değildir.",
          satirlar,
        },
        null,
        2,
      ) + "\n",
    );
  for (const [i, d] of TDEF.entries()) {
    if ((process.env.TUR && d.t != process.env.TUR) || (process.env.LV && d.lv != +process.env.LV)) continue;
    if (satirlar.some((r) => r.tur == d.t && r.lv == d.lv)) continue;
    const k = kariyerKurali(d.t, d.lv)!,
      puan = performansPuani(k.arac, k.parca).puan;
    expect(puan, `${d.t}/${d.lv} hedef kurulum bütçesi`).toBeLessThanOrEqual(k.tavan);
    let referans: number, sure: number, esikler: number[];
    if (d.t == "dp") {
      const kosular = [0.3, 0.45, 0.6].map((aci) =>
        driftTuru(i, "norm", { ...DRIFT_PILOT, aci }, 600, false, k.arac, DRIFT_TUR, false, k.parca),
      );
      const temiz = kosular.filter((r) => r.tur >= DRIFT_TUR && r.puan > 0);
      expect(temiz.length, `${d.n} bitirilebilir`).toBeGreaterThan(0);
      const en = temiz.reduce((a, b) => (a.puan > b.puan ? a : b));
      referans = en.puan;
      sure = en.sure;
      esikler = [0.35, 0.68, 0.94].map((p) => Math.max(50, Math.round((referans * p) / 50) * 50));
    } else {
      let r =
        d.t == "dg"
          ? { t: dragSur(i, k.arac, 0, { parca: k.parca }) }
          : enIyiTur(
              i,
              k.arac,
              k.asama == 6 ? [0.25, 0.4, 0.6, 0.8] : [0.5, 0.7, 0.9, 1.1],
              { parca: k.parca },
              d.t == "rl" ? 1 : 3,
            );
      if (!Number.isFinite(r.t) && d.t != "dg")
        r = enIyiTur(i, k.arac, [0.2, 0.3, ...CESARETLER], { parca: k.parca }, d.t == "rl" ? 1 : 3);
      expect(Number.isFinite(r.t), `${d.n} temiz bitiriş`).toBe(true);
      referans = sure = r.t;
      esikler = (d.t == "dg" ? [1.25, 1.1, 1.025] : [1.3, 1.13, 1.04]).map(
        (p) => Math.ceil(referans * p * 10) / 10,
      );
    }
    satirlar.push({
      kurulumImza: kariyerOlcumImzasi(d),
      tur: d.t,
      lv: d.lv,
      asama: k.asama,
      arac: k.arac,
      parca: k.parca,
      puan,
      tavan: k.tavan,
      referans,
      sure,
      esikler,
    });
    yaz();
    console.log(`${d.t}/${d.lv} ${d.n}: ${referans.toFixed(1)} → ${esikler.join("/")}`);
  }
  if (!process.env.TUR && !process.env.LV) expect(satirlar).toHaveLength(TDEF.length);
}, 1800000);
