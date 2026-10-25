import { afterEach, describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { TIRES } from "../../src/fizik/veriler";
import { applyPreset, kurulum, kurulumKaydet, kurulumYukle, yarisLastigiTak } from "../../src/oyun/kurulum";

const once = kurulumKaydet();
afterEach(() => kurulumYukle(once));
describe("yarış lastiği", () => {
  it.each([
    ["gp", "Yarış"],
    ["rx", "Karışık"],
    ["rl", "Toprak"],
    ["dp", "Drift"],
    ["dg", "Drag"],
  ] as const)("%s yarışında %s lastiği araç ve modifiye lastiğinin önüne geçer", (tur, ad) => {
    kurulum.pk = "fd";
    kurulum.mod = { taban: CARS[0], car: CARS[0], tire: 4, ayar: {}, parcalar: ["lastik-sokak"] };
    yarisLastigiTak(tur);
    expect(TIRES[kurulum.tire].n).toBe(ad);
    kurulum.lk = "norm";
    applyPreset();
    expect(TIRES[kurulum.tire].n).toBe(ad);
    expect(kurulum.mod.parcalar).toEqual(["lastik-sokak"]);
  });
  it("çıkış önceki lastiği ve kilitsiz serbest sürüşü geri yükler", () => {
    kurulum.tire = 5;
    const serbest = kurulumKaydet();
    yarisLastigiTak("dp");
    kurulumYukle(serbest);
    expect(kurulum.tire).toBe(5);
    expect(kurulum.yarisLastik).toBeNull();
    kurulum.pk = "ar";
    applyPreset();
    expect(TIRES[kurulum.tire].n).toBe("Yarış");
  });
});
