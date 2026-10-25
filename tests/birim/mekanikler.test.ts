import { describe, expect, it } from "vitest";
import { DRIFT_HARVESTER, mekanikAdimi, mekanikBaslat, type MekanikOlay } from "../../src/cekirdek/mekanikler";

const drift: MekanikOlay = { tur: "drift", kimlik: "d1", sure: 1 / 60, hiz: 24, aci: 0.5, kasitli: true };

describe("LT-SYS-001 enerji mekanikleri", () => {
  it("kapali sistem mevcut durumu degistirmez", () => {
    const ilk = mekanikBaslat();
    expect(mekanikAdimi(ilk, [drift], [DRIFT_HARVESTER])).toBe(ilk);
  });
  it("ayni olayi ikinci kez odullendirmez", () => {
    const a = mekanikAdimi(mekanikBaslat(), [drift], [DRIFT_HARVESTER], true);
    const b = mekanikAdimi(a, [drift], [DRIFT_HARVESTER], true);
    expect(a.enerji).toBeGreaterThan(0);
    expect(b.enerji).toBe(a.enerji);
  });
  it("kasitsiz kaymadan enerji uretmez", () => {
    const a = mekanikAdimi(mekanikBaslat(), [{ ...drift, kasitli: false }], [DRIFT_HARVESTER], true);
    expect(a.enerji).toBe(0);
  });
  it("enerji 0 ile kapasite arasinda kalir", () => {
    const a = mekanikAdimi(mekanikBaslat(2, 1.99), [drift], [DRIFT_HARVESTER], true);
    expect(a.enerji).toBeLessThanOrEqual(2);
    expect(a.enerji).toBeGreaterThanOrEqual(0);
  });
  it("ayni girdiler ayni sonucu verir", () => {
    const run = () => mekanikAdimi(mekanikBaslat(100, 0), [drift], [DRIFT_HARVESTER], true);
    expect(run()).toEqual(run());
  });
});
