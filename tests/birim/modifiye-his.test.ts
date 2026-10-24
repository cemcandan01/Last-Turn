// Modifiye hissiyatı: her parça kategorisi stoktan en az bir ölçüde anlamlı fark verir (istatistik ya da sürüş hissi).
// Ölçümler düz zeminde sanal sürüşle (tests/yardimci/modifiye-his.ts); tablo: npm run olcum -- modifiye
import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { aracKur, KATEGORILER, PARCALAR } from "../../src/arac/parcalar";
import { gazlaKaydir } from "../yardimci/denemeler";
import { cikisPatinaji, duzCizgi, frenMesafesi, yalpa } from "../yardimci/modifiye-his";
import { virajTutusu } from "../yardimci/uyum";

const PANDA = CARS.findIndex((c) => c.n == "Panda");

describe("modifiye: her kategori hissedilir", () => {
  const stok = duzCizgi(0);
  it("motor: yarış motoru 0-100'ü en az 0,3 sn kısaltır, kısıtlayıcı uzatır (Kızıl Ok)", () => {
    expect(duzCizgi(0, ["motor-yaris"]).t100).toBeLessThan(stok.t100 - 0.3);
    expect(duzCizgi(0, ["motor-kisitli"]).t100).toBeGreaterThan(stok.t100 + 0.2);
  });
  it("turbo: büyük turbo geç dolar (≥3 sn), küçük turbo çabuk (≤2,5 sn), kompresör gecikmesiz; hepsi güç katar", () => {
    const b = duzCizgi(0, ["turbo-buyuk"]),
      k = duzCizgi(0, ["turbo-kucuk"]),
      c = duzCizgi(0, ["kompresor"]);
    expect(b.dolma).toBeGreaterThan(3);
    expect(k.dolma).toBeGreaterThan(0.5);
    expect(k.dolma).toBeLessThan(2.5);
    expect(c.dolma).toBe(0);
    for (const x of [b, k, c]) expect(x.t100).toBeLessThan(stok.t100 - 0.08);
  });
  it("şanzıman: kısa oranlar tepe hızı düşürür, uzun oranlar yükseltir (≥10 km/sa)", () => {
    expect(duzCizgi(0, ["sanziman-kisa"]).vmax).toBeLessThan(stok.vmax - 10);
    expect(duzCizgi(0, ["sanziman-uzun"]).vmax).toBeGreaterThan(stok.vmax + 10);
  });
  it("lastik: sokak lastiği asfaltta yanal tutuşu en az %15 düşürür (Kızıl Ok, stok yarış lastiği)", () => {
    expect(virajTutusu(0, 1, null, 35, ["lastik-sokak"])).toBeLessThan(virajTutusu(0, 1) * 0.85);
  });
  it("süspansiyon: ralli süspansiyonu virajda belirgin yatar (≥1,5° fazla), yarış süspansiyonu stoktan az", () => {
    const y0 = yalpa(0);
    expect(yalpa(0, ["suspansiyon-ralli"])).toBeGreaterThan(y0 + 1.5);
    expect(yalpa(0, ["suspansiyon-yaris"])).toBeLessThan(y0);
  });
  it("diferansiyel: açık diferansiyelde çıkışta iç teker boşa döner, kilitli diferansiyel arkayı kaydırır", () => {
    const a = cikisPatinaji(0, ["diferansiyel-acik"]),
      k = cikisPatinaji(0, ["diferansiyel-kilitli"]);
    expect(a.kap - k.kap, "patinaj (kayma oranı)").toBeGreaterThan(0.4);
    expect(k.kayma - a.kayma, "kayma açısı (°)").toBeGreaterThan(5);
  });
  it("fren: yarış freni fren mesafesini kısaltır, sokak freni uzatır (Panda 100-0; Kızıl Ok 200-100, ABS'li)", () => {
    const p0 = frenMesafesi(PANDA);
    expect(frenMesafesi(PANDA, ["fren-yaris"])).toBeLessThan(p0 * 0.93);
    expect(frenMesafesi(PANDA, ["fren-sokak"])).toBeGreaterThan(p0 * 1.05);
    expect(frenMesafesi(0, ["fren-yaris"], 55.6, 27.78)).toBeLessThan(
      frenMesafesi(0, [], 55.6, 27.78) * 0.95,
    );
  });
  it("ağırlık: karbon gövde 0-100'ü en az 0,25 sn kısaltır, balast uzatır", () => {
    expect(duzCizgi(0, ["agirlik-3"]).t100).toBeLessThan(stok.t100 - 0.25);
    expect(duzCizgi(0, ["agirlik-balast"]).t100).toBeGreaterThan(stok.t100 + 0.1);
  });
  it("aero: büyük kanat hızlı virajda (140 m) tutuşu en az %12 artırır, tepe hızı düşürür", () => {
    expect(virajTutusu(0, 1, null, 140, ["aero-buyuk"])).toBeGreaterThan(virajTutusu(0, 1, null, 140) * 1.12);
    expect(duzCizgi(0, ["aero-buyuk"]).vmax).toBeLessThan(stok.vmax - 8);
  });
  it("çekiş: dört çeker arkadan itişli aracın kalkış patinajını ve çıkış kaymasını azaltır", () => {
    const d = cikisPatinaji(0, ["cekis-dort"]),
      s = cikisPatinaji(0);
    expect(d.kayma).toBeLessThan(s.kayma - 5);
  });
  it("direksiyon: açı kiti teker açısını en az 15° büyütür", () => {
    expect(gazlaKaydir(0, ["aci-kiti"], 12, 1).delta * 57.3).toBeGreaterThan(
      gazlaKaydir(0, [], 12, 1).delta * 57.3 + 15,
    );
  });
  it("koruma: alçak araçta gövdeyi yükseltir ve ralli uyumu kazandırır; yüksek ralli aracını yükseltmez", () => {
    const k = aracKur(0, ["koruma"]).car;
    expect((k.lift ?? 0) - (CARS[0].lift ?? 0)).toBeGreaterThan(0.015);
    expect(k.uzT?.rl?.[0] ?? 1).toBeGreaterThan(1);
    const rl = CARS.findIndex((c) => c.ty == "rl");
    expect(aracKur(rl, ["koruma", "suspansiyon-ralli"]).car.lift).toBe(CARS[rl].lift);
  });
  it("bütün kategoriler yukarıda sınandı", () => {
    const sinanan = [
      "motor",
      "turbo",
      "sanziman",
      "lastik",
      "suspansiyon",
      "diferansiyel",
      "fren",
      "agirlik",
      "aero",
      "cekis",
      "direksiyon",
      "koruma",
    ];
    expect(KATEGORILER.map(([k]) => k).sort()).toEqual([...sinanan].sort());
    expect(PARCALAR.every((p) => sinanan.includes(p.kat))).toBe(true);
  });
});
