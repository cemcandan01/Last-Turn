// Ekonomi: yarış parası, araç fiyatları, satın alma, eski kayıttan geçiş, bulut birleşmesi, benzetim (oyun/ekonomi.ts, ilerleme.ts)
import { beforeEach, describe, expect, it } from "vitest";
import "../yardimci/sahte-tuval";
import {
  ACILMA,
  aracAcikMi,
  aracFiyati,
  aracSatinAl,
  aracSatinAlinabilirMi,
  harca,
  ilerlemeSifirla,
  ilerlemeVerisi,
  ilerlemeYukle,
  para,
  paraDinle,
  paraEkle,
  seviye,
  seviyeTabani,
  xpEkle,
  xpSeviyesi,
  yarisBitti,
  yarisSonuPara,
  yarisSonuXp,
  type ParaOlayi,
} from "../../src/oyun/ilerleme";
import { ARAC_FIYAT, BASLANGIC_ARACLARI, ILK_ARAC } from "../../src/oyun/ekonomi";
import { pistSev } from "../../src/dunya/pist-tanimlari";
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

const adi = (no: number) => CARS[no].n;

/**
 * oyuncu benzetimi: her yarışta açık pistlerin en kolayında bir yıldız daha alır; "karisik" oyuncu her ikinci yarışta
 * yeni yıldız almadan açık en zor pisti tekrar oynar. Seviyesi gelen ve parası yeten aracı (ucuzdan pahalıya) hemen alır.
 * Dönen: araç adı → kaçıncı yarışta alındı.
 */
function benzet(tip: "yildiz" | "karisik") {
  const y: Record<string, number> = {},
    alinan: Record<string, number> = {},
    pistler = TURLER.flatMap((t) => ACILMA.pist[t].map((s, i) => ({ t, l: i + 1, s, z: pistSev(t, i + 1) })));
  let xp = 0,
    p = 0,
    yaris = 0;
  const sahip = new Set(ARAC_FIYAT.flatMap((f, i) => (f.para ? [] : [i])));
  while (yaris < 400 && sahip.size < CARS.length) {
    const lv = xpSeviyesi(xp),
      acik = pistler.filter((q) => q.s <= lv),
      yeni = acik.filter((q) => (y[q.t + q.l] || 0) < 3).sort((a, b) => a.z - b.z || a.l - b.l)[0],
      tekrar = acik.filter((q) => y[q.t + q.l]).sort((a, b) => b.z - a.z)[0],
      q = (tip == "karisik" && yaris % 2 == 1 && tekrar) || !yeni ? tekrar : yeni;
    if (!q) break;
    const o = y[q.t + q.l] || 0,
      yy = q == yeni ? o + 1 : o;
    xp += yarisSonuXp(q.t, q.l, yy, o);
    p += yarisSonuPara(q.t, q.z, yy, o);
    y[q.t + q.l] = yy;
    yaris++;
    const nlv = xpSeviyesi(xp);
    ARAC_FIYAT.map((f, i) => ({ ...f, i }))
      .filter((f) => !sahip.has(f.i) && nlv >= f.seviye)
      .sort((a, b) => a.para - b.para)
      .forEach((f) => {
        if (p < f.para) return;
        p -= f.para;
        sahip.add(f.i);
        alinan[adi(f.i)] = yaris;
      });
  }
  return { alinan, yaris, sahip: sahip.size };
}

describe("yarış parası", () => {
  it("zorlukla ve yeni yıldızla artar; tekrar az verir ama sıfır değil", () => {
    expect(yarisSonuPara("gp", 1, 1, 0)).toBe(300);
    expect(yarisSonuPara("gp", 1, 3, 0)).toBe(700);
    expect(yarisSonuPara("gp", 6, 1, 0)).toBe(1050);
    expect(yarisSonuPara("gp", 1, 3, 2)).toBe(300);
    // tekrar: tabanın %40'ı + yıldız başına %10
    expect(yarisSonuPara("gp", 1, 3, 3)).toBe(70);
    expect(yarisSonuPara("gp", 1, 0, 0)).toBe(40);
    expect(yarisSonuPara("gp", 6, 3, 3)).toBe(250);
    for (let z = 1; z < 6; z++) {
      expect(yarisSonuPara("rl", z + 1, 1, 0)).toBeGreaterThan(yarisSonuPara("rl", z, 1, 0));
      expect(yarisSonuPara("rl", z, 3, 3)).toBeGreaterThan(0);
      expect(yarisSonuPara("rl", z, 3, 3)).toBeLessThan(yarisSonuPara("rl", z, 1, 0) / 2);
    }
  });

  it("yarış bitişi parayı pistin zorluğuyla verir ve bakiyeye ekler", () => {
    const olaylar: ParaOlayi[] = [];
    paraDinle((o) => olaylar.push(o));
    // gp 7 sonradan eklenen pist: numarası 7, zorluğu 2
    const o = yarisBitti("gp", 7, 1);
    expect(o.para).toBe(yarisSonuPara("gp", pistSev("gp", 7), 1, 0));
    expect(pistSev("gp", 7)).toBeLessThan(7);
    expect(para()).toBe(o.para);
    expect(yarisBitti("gp", 7, 1).para).toBe(yarisSonuPara("gp", pistSev("gp", 7), 1, 1));
    expect(olaylar.map((e) => e.neden)).toEqual(["yaris", "yaris"]);
    expect(olaylar[1].bakiye).toBe(para());
  });

  it("aynı girişler aynı para (belirlenimcilik)", () => {
    expect(benzet("karisik")).toEqual(benzet("karisik"));
    const a = [yarisBitti("rx", 1, 2), yarisBitti("rx", 1, 3), yarisBitti("rx", 1, 3)];
    ilerlemeSifirla();
    depo = {};
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => depo[k] ?? null,
      setItem: (k: string, v: string) => (depo[k] = v),
    };
    expect([yarisBitti("rx", 1, 2), yarisBitti("rx", 1, 3), yarisBitti("rx", 1, 3)]).toEqual(a);
  });
});

describe("araç fiyatları ve satın alma", () => {
  it("başlangıç araçları ücretsiz; diğerlerinin seviyesi ve fiyatı var; Panda en ucuz ve en erken", () => {
    expect(ARAC_FIYAT.length).toBe(CARS.length);
    // her türden bir başlangıç aracı ücretsiz; Kızıl Ok ve Kor RX artık satın alınır
    expect(BASLANGIC_ARACLARI.length).toBe(5);
    for (const i of BASLANGIC_ARACLARI) expect(aracFiyati(i)).toEqual({ para: 0, seviye: 1 });
    expect(new Set(BASLANGIC_ARACLARI.map((i) => CARS[i].ty)).size).toBe(5);
    expect(aracFiyati(0).para).toBeGreaterThan(0);
    expect(aracFiyati(1).para).toBeGreaterThan(0);
    const ucretli = ARAC_FIYAT.map((f, i) => ({ ...f, i })).filter((f) => f.para > 0);
    expect(ucretli.length).toBe(10);
    const panda = CARS.findIndex((c) => c.n == "Panda");
    for (const f of ucretli) {
      expect(f.seviye).toBeGreaterThan(1);
      if (f.i != panda) {
        expect(f.para).toBeGreaterThan(aracFiyati(panda).para);
        expect(f.seviye).toBeGreaterThan(aracFiyati(panda).seviye);
      }
    }
    // pahalı araç daha ileri seviyede
    const sirali = [...ucretli].sort((a, b) => a.seviye - b.seviye);
    for (let k = 1; k < sirali.length; k++) expect(sirali[k].para).toBeGreaterThanOrEqual(sirali[k - 1].para);
    expect(ACILMA.arac).toEqual(ARAC_FIYAT.map((f) => f.seviye));
  });

  it("seviyesi gelmeyen ya da parası yetmeyen araç alınamaz ve seçilemez; alınca açılır, ikinci kez alınamaz", () => {
    const panda = CARS.findIndex((c) => c.n == "Panda"),
      f = aracFiyati(panda);
    expect(aracSatinAlinabilirMi(ILK_ARAC)).toEqual({ ok: false, neden: "sahip" });
    expect(aracSatinAlinabilirMi(0)).toEqual({ ok: false, neden: "seviye" });
    paraEkle(f.para, "test");
    expect(aracSatinAlinabilirMi(panda)).toEqual({ ok: false, neden: "seviye" });
    expect(aracSatinAl(panda)).toBe(false);
    expect(aracAcikMi(panda)).toBe(false);
    xpEkle(seviyeTabani(f.seviye), "test");
    expect(seviye().lv).toBeGreaterThanOrEqual(f.seviye);
    // seviye geldi ama satın alınmadan açık değil
    expect(aracAcikMi(panda)).toBe(false);
    harca("deneme", 1);
    expect(aracSatinAlinabilirMi(panda)).toEqual({ ok: false, neden: "para" });
    expect(aracSatinAl(panda)).toBe(false);
    paraEkle(1, "test");
    expect(aracSatinAlinabilirMi(panda)).toEqual({ ok: true, neden: null });
    const olaylar: ParaOlayi[] = [];
    paraDinle((o) => olaylar.push(o));
    expect(aracSatinAl(panda)).toBe(true);
    expect(aracAcikMi(panda)).toBe(true);
    expect(para()).toBe(0);
    expect(olaylar).toEqual([{ bakiye: 0, degisim: -f.para, neden: "alim:arac_" + panda }]);
    paraEkle(f.para, "test");
    expect(aracSatinAlinabilirMi(panda)).toEqual({ ok: false, neden: "sahip" });
    expect(aracSatinAl(panda)).toBe(false);
    expect(para()).toBe(f.para);
    // kayıt kalıcı
    ilerlemeSifirla();
    expect(aracAcikMi(panda)).toBe(true);
    expect(para()).toBe(f.para);
  });

  it("benzetim: ilk satın alma ~7-12 yarışta; yıldız toplayan bütün araçları alır; tekrar oynayan da yavaşça", () => {
    const y = benzet("yildiz"),
      k = benzet("karisik"),
      ilk = (b: ReturnType<typeof benzet>) => Math.min(...Object.values(b.alinan));
    // tablo docs/notlar/altyapi.md'de (yazdırmak için: console.log(y.alinan, k.alinan))
    expect(ilk(y)).toBeGreaterThanOrEqual(6);
    expect(ilk(k)).toBeLessThanOrEqual(12);
    expect(y.alinan.Panda).toBe(ilk(y));
    expect(y.sahip).toBe(CARS.length);
    expect(k.sahip).toBe(CARS.length);
    // Kızıl Ok ve Kor RX de satın alındığından (0.5.x'e dek ücretsiz) hepsini almak biraz uzadı
    expect(y.yaris).toBeLessThanOrEqual(125);
    expect(k.yaris).toBeGreaterThan(y.yaris);
    expect(k.yaris).toBeLessThan(250);
  });
});

describe("eski kayıttan para geçişi ve bulut", () => {
  it("sürüm 1 kaydı: yıldızlardan başlangıç parası, o sürümde açık olan araçlar sahip; XP korunur", () => {
    depo["lt_yildiz"] = JSON.stringify({ asphalt_1: 3, drift_2: 1, asphalt_7: 2 });
    depo["lt_ilerleme"] = JSON.stringify({
      surum: 1,
      xp: seviyeTabani(6),
      updatedAt: 1,
      yildiz: {},
      ekAcik: ["arac_9"],
    });
    expect(seviye().lv).toBe(6);
    expect(para()).toBe(
      yarisSonuPara("gp", 1, 3, 0) +
        yarisSonuPara("dp", 2, 1, 0) +
        yarisSonuPara("gp", pistSev("gp", 7), 2, 0),
    );
    // eski kural: Beyaz Kurt lv4, Mavi Yıldız lv6 açık; Gece Mavisi lv7 değil; ekAcik'teki araç açık kalır
    expect(aracAcikMi(2)).toBe(true);
    expect(aracAcikMi(3)).toBe(true);
    expect(aracAcikMi(4)).toBe(false);
    expect(aracAcikMi(9)).toBe(true);
    // o sürümde ücretsiz olan Kızıl Ok ve Kor RX sahip kalır
    expect(aracAcikMi(0)).toBe(true);
    expect(aracAcikMi(1)).toBe(true);
    const v = ilerlemeVerisi();
    expect(v.surum).toBe(3);
    // geçiş bir kez
    ilerlemeSifirla();
    expect(para()).toBe(v.kazanilan);
  });

  it("sürüm 2 kaydı: oynanmışsa Kızıl Ok ve Kor RX sahip kalır; hiç oynanmamış kayıt ve yeni oyuncu başlangıç araçlarıyla", () => {
    // yeni oyuncu: yalnız başlangıç araçları
    expect(CARS.map((_, i) => i).filter(aracAcikMi)).toEqual(BASLANGIC_ARACLARI);
    const v2 = (o: object) => {
      depo = {
        lt_ilerleme: JSON.stringify({
          surum: 2,
          xp: 0,
          updatedAt: 1,
          yildiz: {},
          ekAcik: [],
          kazanilan: 0,
          alimlar: {},
          ...o,
        }),
      };
      (globalThis as { localStorage?: unknown }).localStorage = {
        getItem: (k: string) => depo[k] ?? null,
        setItem: (k: string, v: string) => (depo[k] = v),
      };
      ilerlemeSifirla();
    };
    v2({ xp: 120, kazanilan: 900, alimlar: { arac_8: 2000 } });
    expect(aracAcikMi(0)).toBe(true);
    expect(aracAcikMi(1)).toBe(true);
    expect(aracAcikMi(8)).toBe(true);
    for (const i of BASLANGIC_ARACLARI) expect(aracAcikMi(i)).toBe(true);
    expect(ilerlemeVerisi().surum).toBe(3);
    // geçiş bir kez: kayıt yeniden okununca aynı
    ilerlemeSifirla();
    expect(aracAcikMi(0)).toBe(true);
    // hiç oynanmamış sürüm 2 kaydı: yeni oyuncu gibi
    v2({});
    expect(aracAcikMi(0)).toBe(false);
    expect(aracAcikMi(1)).toBe(false);
    // profilde yarış varsa (ilerleme boş da olsa) eski oyuncu sayılır
    v2({});
    depo["lt_prof"] = JSON.stringify({ races: 3, use: { 0: 3 } });
    depo["lt_ilerleme"] = JSON.stringify({
      surum: 2,
      xp: 0,
      updatedAt: 1,
      yildiz: {},
      ekAcik: [],
      kazanilan: 0,
      alimlar: {},
    });
    ilerlemeSifirla();
    expect(aracAcikMi(0)).toBe(true);
  });

  it("bulut: eski sürümün kaydı yeni cihazda da Kızıl Ok ve Kor RX'i sahip sayar; yeni sürümün kaydı saymaz", () => {
    ilerlemeYukle({ surum: 3, xp: 500, kazanilan: 100, alimlar: {}, ekAcik: [], updatedAt: 2 }, true);
    expect(aracAcikMi(0)).toBe(false);
    ilerlemeYukle({ surum: 2, xp: 0, kazanilan: 0, alimlar: {}, ekAcik: [], updatedAt: 3 }, true);
    expect(aracAcikMi(0)).toBe(false);
    ilerlemeYukle({ surum: 2, xp: 500, kazanilan: 100, alimlar: {}, ekAcik: [], updatedAt: 4 }, true);
    expect(aracAcikMi(0)).toBe(true);
    expect(aracAcikMi(1)).toBe(true);
  });

  it("çok eski kayıt (lt_ilerleme yok): rekor ve yıldızlardan XP ve para; yeni oyuncu 0 para", () => {
    expect(para()).toBe(0);
    ilerlemeSifirla();
    depo = { lt_yildiz: JSON.stringify({ rally_1: 2 }) };
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => depo[k] ?? null,
      setItem: (k: string, v: string) => (depo[k] = v),
    };
    expect(para()).toBe(yarisSonuPara("rl", 1, 2, 0));
    expect(seviye().toplamXp).toBeGreaterThan(0);
  });

  it("bulut: kazanılanın büyüğü, alımların birleşimi; harcama kaybolmaz", () => {
    paraEkle(5000, "test");
    xpEkle(seviyeTabani(7), "test");
    expect(aracSatinAl(2)).toBe(true);
    const olaylar: ParaOlayi[] = [];
    paraDinle((o) => olaylar.push(o));
    // öbür cihaz daha çok kazanmış ve başka araç almış
    ilerlemeYukle({ kazanilan: 10000, alimlar: { arac_3: 4000 } });
    expect(aracAcikMi(2)).toBe(true);
    expect(aracAcikMi(3)).toBe(true);
    expect(para()).toBe(10000 - 3000 - 4000);
    expect(olaylar).toEqual([{ bakiye: 3000, degisim: 1000, neden: "bulut" }]);
    // geri veri düşürmez
    ilerlemeYukle({ kazanilan: 10, alimlar: {} });
    expect(para()).toBe(3000);
    expect(JSON.parse(JSON.stringify(ilerlemeVerisi()))).toEqual(ilerlemeVerisi());
  });
});
