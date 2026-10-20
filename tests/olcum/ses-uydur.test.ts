// Motor sesi uydurma: gerçek motor seslerinin ölçülen özelliklerine (frekans dağılımı, harmonik oranı,
// silindirler arası düzensizlik) oyunun kendi sentezini yaklaştırır ve yalnız sayıları src/ses/hedefler.ts'e
// yazar. Kayıtlar oyuna girmez; yalnız bu ölçümde okunur.
//   SES_KAYNAK=<wav klasörü> npm run olcum -- ses-uydur
// Klasörde <seri>-<n>.wav dosyaları (n × 1000 d/dk, sabit devirde) beklenir; yoksa bu koşu atlanır.
import fs from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { MOTOR_AYAR } from "../../src/ses/hedefler";
import { katmanDevirleri, MOTORLAR, motorKatmani, type MotorProfili } from "../../src/ses/sentez";
import { bantlar, harmonik, wavOku } from "../yardimci/ses-analiz";

const KAYNAK = process.env.SES_KAYNAK;

/** araç türü → ölçülen seri ve o motorun silindir sayısı (ateşleme mertebesi için) */
const ESLEME: Record<string, { seri: string; silindir: number; ref: number }> = {
  gt: { seri: "tsp", silindir: 6, ref: 6 },
  rx: { seri: "su-oe", silindir: 4, ref: 4 },
  dr: { seri: "su-ss", silindir: 4, ref: 4 },
  rl: { seri: "su-mid", silindir: 4, ref: 4 },
  dg: { seri: "gv8", silindir: 8, ref: 8 },
};
const SR = 44100;
/** bant dağılımını yumuşat: seyrek harmonikler bantlara düşüp düşmemesine göre dişli görünür; tını zarfı yumuşaktır */
const yumusat = (b: number[]) => b.map((x, i) => 0.25 * (b[i - 1] ?? x) + 0.5 * x + 0.25 * (b[i + 1] ?? x));

function oku(seri: string, n: number) {
  const f = path.join(KAYNAK!, `${seri}-${n}.wav`);
  if (!fs.existsSync(f)) return null;
  const { s, sr } = wavOku(fs.readFileSync(f));
  // ortadan 2 sn (kayıt başı ve sonundaki geçişler dışarıda)
  const m = Math.floor(s.length / 2),
    y = Math.min(m, sr);
  return { s: s.subarray(m - y, m + y), sr };
}

it.skipIf(!KAYNAK)("motor sesi uydurma", () => {
  const cikti: Record<
    string,
    { govde: number; puruz: number; lope: number; kolFark: number; eq: number[][] }
  > = {};
  for (const [k, e] of Object.entries(ESLEME)) {
    const car = CARS.find((c) => c.k == k)!,
      dMax = car.dv ?? 7500,
      p0 = MOTORLAR[k];
    let nMax = 0;
    while (oku(e.seri, nMax + 1)) nMax++;
    // 1) harmonik yapı: uğultu (govde), pürüz ve silindir farkı (lope) ızgarada aranır
    // ölçüm: 2., 3. ve 4. katmanın kendi devrinde (kendi frekans ayarıyla), kaydın en yakın devriyle karşılaştırılır
    const dv = katmanDevirleri(dMax),
      olcuKatman = [1, 2, 3],
      kayitNo = (d: number) => Math.min(nMax, Math.max(1, Math.round(d / 1000))),
      ref = olcuKatman.map((li) => {
        const n = kayitNo(dv[li]),
          r = oku(e.seri, n)!;
        return harmonik(r.s, r.sr, n * 1000, e.ref);
      });
    // sıra 4 ve V6 düzgün çalışır: düzensizlik yalnız boxer ve büyük kamlı V8'de aranır (kaydın kendi motoru farklı
    // olsa da aracın gerçek diziliminin karakteri korunur)
    const lopeIzgara = k == "dg" || k == "rl" ? [0.15, 0.3, 0.5, 0.7] : [0.03, 0.08, 0.15],
      duzenHedef = (r: { h: number; duzensiz: number }) =>
        k == "rx" || k == "dr" ? { h: r.h, duzensiz: Math.min(r.duzensiz, 0.15) } : r;
    let en = { hata: 1e9, govde: p0.govde, puruz: p0.puruz, lope: p0.lope, kolFark: 1.13 };
    for (const govde of [0.2, 0.5, 0.9, 1.4])
      for (const puruz of [0.15, 0.35, 0.6])
        for (const lope of lopeIzgara)
          for (const kolFark of [1, 1.06, 1.13]) {
            const p: MotorProfili = { ...p0, govde, puruz, lope, kolFark };
            let hata = 0;
            olcuKatman.forEach((li, i) => {
              // önceki koşunun frekans ayarıyla ölç (ayar harmoniklerin dengesini de değiştirir; iki koşuda oturur)
              const s = motorKatmani(p, dv[li], 1, dMax, 22050, 3, MOTOR_AYAR[k]?.eq[li]),
                o = harmonik(s, 22050, dv[li], e.silindir);
              const h = duzenHedef(ref[i]);
              hata += (o.h - h.h) ** 2 + (o.duzensiz - h.duzensiz) ** 2;
            });
            if (hata < en.hata) en = { hata, govde, puruz, lope, kolFark };
          }
    const p: MotorProfili = { ...p0, govde: en.govde, puruz: en.puruz, lope: en.lope, kolFark: en.kolFark };
    // 2) frekans dağılımı: her katman, en yakın devirdeki kaydın 1/3 oktav dağılımına eşitlenir
    const eq = dv.map((d, li) => {
      const n = kayitNo(d),
        r = oku(e.seri, n)!,
        hedef = yumusat(bantlar(r.s, r.sr)),
        g = hedef.map(() => 0);
      for (let tur = 0; tur < 5; tur++) {
        const o = yumusat(bantlar(motorKatmani(p, d, 1, dMax, SR, 11 + li, g), SR));
        for (let i = 0; i < g.length; i++) g[i] = Math.max(-24, Math.min(24, g[i] + 0.8 * (hedef[i] - o[i])));
      }
      const son = yumusat(bantlar(motorKatmani(p, d, 1, dMax, SR, 11 + li, g), SR)),
        sapma = Math.sqrt(son.reduce((a, x, i) => a + Math.min(400, (x - hedef[i]) ** 2), 0) / son.length);
      console.log(
        `${k} ${d} d/dk ← ${e.seri}-${n}: kalan sapma ${sapma.toFixed(1)} dB · fark ${son.map((x, i) => Math.round(hedef[i] - x)).join(" ")}`,
      );
      return g.map((x) => Math.round(x * 10) / 10);
    });
    console.log(`${k}: kalan hata ${en.hata.toFixed(3)}`);
    console.log(
      `${k}: govde ${en.govde}, puruz ${en.puruz}, lope ${en.lope}, kolFark ${en.kolFark} (hedef h/düzensiz ${ref.map((r) => r.h.toFixed(2) + "/" + r.duzensiz.toFixed(2)).join(" ")})`,
    );
    cikti[k] = { govde: en.govde, puruz: en.puruz, lope: en.lope, kolFark: en.kolFark, eq };
  }
  const ts =
    "// Motor sesi ayarları: gerçek motor seslerinin ölçülen özelliklerine göre uydurulmuş sentez değerleri.\n" +
    "// Üretildi: SES_KAYNAK=<klasör> npm run olcum -- ses-uydur (tests/olcum/ses-uydur.test.ts). Elle düzenleme.\n" +
    "// govde, puruz, lope, kolFark: MotorProfili alanları; eq: her katman (katmanDevirleri sırası) için 1/3 oktav kazançları (dB,\n" +
    "// EQ_BANTLAR sırası).\n" +
    "export const MOTOR_AYAR: Record<string, { govde: number; puruz: number; lope: number; kolFark: number; eq: number[][] }> = " +
    JSON.stringify(cikti) +
    ";\n";
  fs.writeFileSync("src/ses/hedefler.ts", ts);
});
