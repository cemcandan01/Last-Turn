// İlerleme: XP eğrisi, kilit tablosu, eski kayıttan geçiş, bulut verisi, belirlenimcilik (oyun/ilerleme.ts)
import { beforeEach, describe, expect, it } from "vitest";
import "../yardimci/sahte-tuval";
import {
  ACILMA,
  adimXp,
  aracAcikMi,
  ilerlemeDinle,
  ilerlemeSifirla,
  ilerlemeVerisi,
  ilerlemeYukle,
  kilitTablosu,
  pistAcikMi,
  seviye,
  seviyeTabani,
  xpEkle,
  xpSeviyesi,
  yarisBitti,
  yarisSonuXp,
  type SeviyeOlayi,
} from "../../src/oyun/ilerleme";
import { enIyiYildiz, yildizEsikleri } from "../../src/oyun/yildiz";
import { CARS, type YarisTuru } from "../../src/arac/araclar";

const TURLER: YarisTuru[] = ["gp", "rx", "dp", "rl", "dg"];
let depo: Record<string, string>;
beforeEach(() => {
  depo = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => depo[k] ?? null,
    setItem: (k: string, v: string) => (depo[k] = v),
  };
  ilerlemeSifirla();
});

/** her yarışta açık pistlerden en kolayında bir yıldız daha alan (en çok `maks`) oyuncu; seviye → yarış/yıldız */
function benzet(maks: number) {
  const y: Record<string, number> = {},
    tablo: { lv: number; yaris: number; yildiz: number }[] = [];
  let xp = 0,
    yaris = 0,
    yildiz = 0;
  for (;;) {
    const lv = xpSeviyesi(xp),
      c = TURLER.flatMap((t) => [1, 2, 3, 4, 5, 6].map((l) => [t, l] as const))
        .filter(([t, l]) => ACILMA.pist[t][l - 1] <= lv && (y[t + l] || 0) < maks)
        .sort((a, b) => a[1] - b[1])[0];
    if (!c) return { tablo, xp, y };
    const [t, l] = c,
      o = y[t + l] || 0;
    xp += yarisSonuXp(t, l, o + 1, o);
    y[t + l] = o + 1;
    yaris++;
    yildiz++;
    if (xpSeviyesi(xp) > lv) tablo.push({ lv: xpSeviyesi(xp), yaris, yildiz });
  }
}

describe("XP ve seviye eğrisi", () => {
  it("seviye adımları büyüyor, taban adımların toplamı", () => {
    for (let n = 1; n < 30; n++) {
      expect(seviyeTabani(n + 1) - seviyeTabani(n)).toBe(adimXp(n));
      expect(adimXp(n + 1)).toBeGreaterThan(adimXp(n));
      expect(xpSeviyesi(seviyeTabani(n))).toBe(n);
      expect(xpSeviyesi(seviyeTabani(n + 1) - 1)).toBe(n);
    }
  });

  it("yarış XP'si: yıldız başına, seviyeyle artan; eski yıldız yeniden XP vermez", () => {
    expect(yarisSonuXp("gp", 1, 1, 0)).toBe(25);
    expect(yarisSonuXp("gp", 1, 3, 0)).toBe(65);
    expect(yarisSonuXp("gp", 1, 3, 2)).toBe(25);
    expect(yarisSonuXp("gp", 1, 2, 3)).toBe(3);
    expect(yarisSonuXp("gp", 1, 0, 0)).toBe(3);
    expect(yarisSonuXp("rl", 6, 1, 0)).toBeGreaterThan(yarisSonuXp("rl", 2, 1, 0));
  });

  it("aynı girişler aynı XP ve seviye (belirlenimcilik)", () => {
    expect(benzet(3)).toEqual(benzet(3));
  });

  it("her açık pistte yıldız toplayan oyuncu Efsane yıldızlarına gerek kalmadan her şeyi açar; ilk seviyeler hızlı", () => {
    const { tablo, y } = benzet(3),
      son = Math.max(...kilitTablosu().map((k) => k.seviye)),
      acan = tablo.find((t) => t.lv == son)!;
    expect(Object.values(y).reduce((a, b) => a + b, 0)).toBe(90);
    // Efsane pistleri (6. seviye) dışındaki 75 yıldızla son kilit açılır
    expect(acan.yildiz).toBeLessThanOrEqual(75);
    expect(acan.yildiz).toBeGreaterThan(55);
    // ilk 3 seviye 6 yarıştan az; sonraki her seviye daha çok yarış ister
    expect(tablo.find((t) => t.lv == 3)!.yaris).toBeLessThan(6);
    // yalnız 2★ toplayan oyuncu Efsane pistlerine ulaşamaz (son kilitler 3★ ister)
    expect(Math.max(...benzet(2).tablo.map((t) => t.lv))).toBeLessThan(son);
  });
});

describe("kilit tablosu", () => {
  it("başta yalnız her türün Çaylak pisti ve 2 araç açık; her türde başta sürülebilir araç var", () => {
    expect(seviye().lv).toBe(1);
    for (const t of TURLER) {
      expect(pistAcikMi(t, 1)).toBe(true);
      for (let l = 2; l <= 6; l++) expect(pistAcikMi(t, l)).toBe(false);
    }
    const acik = CARS.map((_, i) => i).filter(aracAcikMi);
    expect(acik.map((i) => CARS[i].n)).toEqual(["Kızıl Ok", "Kor RX"]);
    // her pist her seviyede açılır, seviyeler pistte artan; her türün aracı o türün 3. pistinden önce açılır
    for (const t of TURLER) {
      const s = ACILMA.pist[t];
      expect(s.length).toBe(8);
      for (let l = 1; l < 6; l++) expect(s[l]).toBeGreaterThan(s[l - 1]);
      for (let l = 6; l < 8; l++) expect(s[l]).toBeGreaterThan(1);
      expect(ACILMA.arac[CARS.findIndex((c) => c.ty == t)]).toBeLessThanOrEqual(s[2]);
    }
    expect(kilitTablosu().length).toBe(40 + CARS.length);
  });

  it("seviye atlayınca dinleyici açılanları alır", () => {
    const olaylar: SeviyeOlayi[] = [];
    const bırak = ilerlemeDinle((o) => olaylar.push(o));
    expect(xpEkle(10, "test")).toBeNull();
    const o = xpEkle(seviyeTabani(4) - 10, "test")!;
    expect(o.eski).toBe(1);
    expect(o.yeni).toBe(4);
    expect(o.acilanlar).toContainEqual({ tur: "pist", ty: "gp", lv: 2 });
    expect(o.acilanlar).toContainEqual({ tur: "pist", ty: "dg", lv: 2 });
    expect(o.acilanlar).toContainEqual({ tur: "arac", no: 2 });
    expect(olaylar.length).toBe(1);
    expect(pistAcikMi("dp", 2)).toBe(true);
    expect(aracAcikMi(2)).toBe(true);
    bırak();
    xpEkle(10000, "test");
    expect(olaylar.length).toBe(1);
  });

  it("yarış bitişi yıldızı kaydeder, yalnız yeni yıldız tam XP verir", () => {
    expect(yarisBitti("gp", 1, 2)).toBe(45);
    expect(enIyiYildiz("gp", 1)).toBe(2);
    expect(yarisBitti("gp", 1, 2)).toBe(3);
    expect(yarisBitti("gp", 1, 3)).toBe(25);
    expect(seviye().toplamXp).toBe(73);
    expect(seviye().lv).toBe(2);
  });
});

describe("eski kayıttan geçiş ve bulut verisi", () => {
  it("rekor ve yıldızlardan XP hesaplanır; oynanmış pist ve araç açık kalır", () => {
    const [, , uc] = yildizEsikleri("gp", 4);
    depo["sv_asphalt_4"] = String(uc - 1); // 3★ süre
    depo["lt_yildiz"] = JSON.stringify({ rally_1: 2 });
    depo["sv_drag_6"] = "99"; // yıldızsız rekor
    depo["lt_prof"] = JSON.stringify({ use: { 0: 3, 4: 1 } });
    const s = seviye();
    expect(s.toplamXp).toBe(20 + 3 * 65 + 5 + 2 * 20 + 30);
    expect(enIyiYildiz("gp", 4)).toBe(3);
    expect(enIyiYildiz("rl", 1)).toBe(2);
    expect(pistAcikMi("gp", 4)).toBe(true);
    expect(pistAcikMi("dg", 6)).toBe(true);
    expect(pistAcikMi("rx", 6)).toBe(false);
    expect(aracAcikMi(4)).toBe(true);
    expect(aracAcikMi(3)).toBe(false);
    // geçiş bir kez: kayıt yazıldı, yeniden okununca aynı
    ilerlemeSifirla();
    expect(seviye().toplamXp).toBe(s.toplamXp);
  });

  it("yeni oyuncu 0 XP; veri serileştirilebilir, sürümlü, yüklenince büyüğü alınır", () => {
    expect(seviye().toplamXp).toBe(0);
    yarisBitti("rx", 1, 1);
    const v = ilerlemeVerisi();
    expect(v.surum).toBe(1);
    expect(v.updatedAt).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(v))).toEqual(v);
    expect(v.yildiz).toEqual({ dirt_1: 1 });
    // başka cihazdan daha ileri veri
    ilerlemeYukle({ xp: 500, yildiz: { dirt_1: 3, drift_1: 2 }, ekAcik: ["arac_3"], updatedAt: 5 });
    expect(seviye().toplamXp).toBe(500);
    expect(enIyiYildiz("rx", 1)).toBe(3);
    expect(enIyiYildiz("dp", 1)).toBe(2);
    expect(aracAcikMi(3)).toBe(true);
    // daha geri veri ilerlemeyi düşürmez
    ilerlemeYukle({ xp: 10, yildiz: { dirt_1: 1 } });
    expect(seviye().toplamXp).toBe(500);
    expect(enIyiYildiz("rx", 1)).toBe(3);
  });
});
