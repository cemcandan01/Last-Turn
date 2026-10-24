// Bulut hesabı ve eşitleme (bulut/): yapılandırma yokken hiçbir şey yapılmaz; sahte Firebase ile ilerleme bir
// "cihazda" yazılıp başka cihazda geri okunur; çevrimdışı kuyruk; rekor birleştirme; kurallara aykırı yazma.
import { beforeEach, describe, expect, it } from "vitest";
import "../yardimci/sahte-tuval";
import { bulutAcik, FIREBASE_AYAR } from "../../src/bulut/ayar";
import {
  bekleyenVar,
  belgeOlustur,
  esitleyiciKur,
  rekorBirlestir,
  type BulutBelgesi,
  type Kullanici,
  type Saglayici,
} from "../../src/bulut/esitleme";
import {
  adminHerSeyAcik,
  adminKilitAyarla,
  adminParaEkle,
  adminSeviye,
  adminSifirla,
  adminXpEkle,
  bulutKur,
  epostaGiris,
  epostaOlustur,
  googleBagla,
  hesapBaslat,
  hesapDurumu,
  hesapOzeti,
  yeniOyuncu,
} from "../../src/bulut/hesap";
import { hesapHtml } from "../../src/arayuz/hesap-ui";
import {
  adminKipi,
  aracAcikMi,
  pistAcikMi,
  harca,
  ilerlemeSifirla,
  ilerlemeVerisi,
  para,
  paraEkle,
  seviye,
  xpEkle,
  yarisBitti,
} from "../../src/oyun/ilerleme";
import { PROF, best, saveBest } from "../../src/oyun/profil";
import { enIyiYildiz } from "../../src/oyun/yildiz";

let depo: Record<string, string>;
/** cihaz değiştir: her cihazın kendi localStorage'ı */
function cihazDeposu(d: Record<string, string> = {}) {
  depo = d;
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => depo[k] ?? null,
    setItem: (k: string, v: string) => (depo[k] = v),
    removeItem: (k: string) => delete depo[k],
  };
  ilerlemeSifirla();
  return d;
}
let cevrimici = true;
Object.defineProperty(globalThis, "navigator", {
  value: {
    get onLine() {
      return cevrimici;
    },
  },
  configurable: true,
});
(globalThis as { window?: unknown }).window = new EventTarget();
beforeEach(() => {
  cihazDeposu();
  cevrimici = true;
});

/** sahte Firebase: bellekte belge deposu ve Google hesapları; yazma kuralları firestore.rules'un özü */
function sahteBulut() {
  const db = new Map<string, BulutBelgesi>(),
    googleHesap = new Map<string, string>(),
    /** konsoldan eklenen admins/{uid} */
    adminler = new Set<string>();
  let n = 0,
    yazma = 0;
  function cihaz(): Saglayici & { k: Kullanici | null } {
    const fns: ((k: Kullanici | null) => void)[] = [];
    const s = {
      k: null as Kullanici | null,
      oturumDinle(fn: (k: Kullanici | null) => void) {
        fns.push(fn);
        fn(s.k);
      },
      ayarla(k: Kullanici | null) {
        s.k = k;
        fns.forEach((f) => f(k));
      },
      async anonimGir() {
        if (!s.k) s.ayarla({ uid: "anon" + ++n, anonim: true, yol: "anonim", eposta: null, ad: null });
      },
      async googleBagla() {
        const g = "oyuncu@ornek.com",
          var_ = googleHesap.get(g);
        if (var_) s.ayarla({ uid: var_, anonim: false, yol: "google", eposta: g, ad: null });
        else {
          googleHesap.set(g, s.k!.uid);
          s.ayarla({ ...s.k!, anonim: false, yol: "google", eposta: g });
        }
      },
      async epostaOlustur(e: string) {
        if (googleHesap.has(e)) throw { code: "auth/email-already-in-use" };
        googleHesap.set(e, s.k!.uid);
        s.ayarla({ ...s.k!, anonim: false, yol: "eposta", eposta: e });
      },
      async epostaGiris(e: string, sf: string) {
        if (!googleHesap.has(e) || sf != "dogru1") throw { code: "auth/invalid-credential" };
        s.ayarla({ uid: googleHesap.get(e)!, anonim: false, yol: "eposta", eposta: e, ad: null });
      },
      async sifreSifirla() {},
      async adminMi(uid: string) {
        return adminler.has(uid);
      },
      async cikis() {
        s.ayarla(null);
      },
      async oku(uid: string) {
        if (!cevrimici) throw { code: "unavailable" };
        const b = db.get(uid);
        return b ? structuredClone(b) : null;
      },
      async yaz(uid: string, b: BulutBelgesi) {
        if (!cevrimici) throw { code: "unavailable" };
        const o = db.get(uid);
        if (
          o &&
          !adminler.has(uid) &&
          (b.xp < o.xp || b.kazanilan < o.kazanilan || !Object.keys(o.alimlar).every((a) => a in b.alimlar))
        )
          throw { code: "permission-denied" };
        yazma++;
        db.set(uid, structuredClone(b));
      },
    };
    return s;
  }
  return { db, cihaz, adminler, yazmaSayisi: () => yazma };
}

const bekle = () => new Promise((r) => setTimeout(r, 5));

describe("yapılandırma yokken", () => {
  it("bulut kapalı: Firebase yüklenmez, hesap satırı çizilmez, kayıt değişmez", () => {
    const bos = { ...FIREBASE_AYAR, apiKey: "", projectId: "", appId: "" };
    expect(bulutAcik(bos)).toBe(false);
    bulutKur(bos); // window.requestIdleCallback yok: çağrılsaydı setTimeout kurulurdu; hiçbir şey olmamalı
    expect(hesapDurumu().etkin).toBe(false);
    expect(hesapHtml()).toBe("");
    expect(Object.keys(depo)).toEqual([]);
    expect(bulutAcik({ apiKey: "a", projectId: "p", appId: "x" })).toBe(true);
  });
});

describe("rekor ve belge", () => {
  it("drift puanında büyüğü, sürede küçüğü alınır; bilinmeyen anahtar alınmaz", () => {
    saveBest("asphalt_1", "70.5");
    saveBest("drift_1", "5000");
    rekorBirlestir({ asphalt_1: 65.2, drift_1: 4000, rally_2: 90, bilinmeyen_1: 3 });
    expect(best("asphalt_1")).toBe(65.2);
    expect(best("drift_1")).toBe(5000);
    expect(best("rally_2")).toBe(90);
    expect(depo["sv_bilinmeyen_1"]).toBeUndefined();
    rekorBirlestir({ asphalt_1: 80, drift_1: 6000 });
    expect(best("asphalt_1")).toBe(65.2);
    expect(best("drift_1")).toBe(6000);
    const b = belgeOlustur();
    expect(b.rekor).toMatchObject({ asphalt_1: 65.2, drift_1: 6000, rally_2: 90 });
    expect(Object.keys(b).sort()).toEqual(
      ["alimlar", "ekAcik", "kazanilan", "oyunSurum", "rekor", "surum", "updatedAt", "xp", "yildiz"].sort(),
    );
  });
});

describe("sahte Firebase ile eşitleme", () => {
  it("bir cihazda yazılan ilerleme başka cihazda aynı hesapla geri okunur; iki cihazın ilerlemesi birleşir", async () => {
    const bulut = sahteBulut();
    // 1. cihaz: anonim hesap, yarışlar, alım, rekor
    const A = bulut.cihaz(),
      dA = cihazDeposu(),
      eA = esitleyiciKur(A, { gecikme: 0 });
    await A.anonimGir();
    await eA.oturum(A.k!.uid);
    yarisBitti("gp", 1, 3);
    xpEkle(2000, "test");
    paraEkle(5000, "test");
    expect(harca("arac_8", 2000)).toBe(true);
    saveBest("asphalt_1", "61.5");
    paraEkle(1, "test"); // rekor yazıldıktan sonra bir değişiklik daha (gecikmeli yazma rekoru da taşır)
    await bekle();
    await eA.simdiGonder();
    const uidA = A.k!.uid;
    expect(bulut.db.get(uidA)!.xp).toBe(ilerlemeVerisi().xp);
    await A.googleBagla();
    expect(A.k!.uid).toBe(uidA);
    const lvA = seviye().lv,
      paraA = para();
    eA.kapat();

    // 2. cihaz: kendi küçük ilerlemesi var, sonra aynı Google hesabına girer
    const B = bulut.cihaz();
    cihazDeposu();
    const eB = esitleyiciKur(B, { gecikme: 0 });
    await B.anonimGir();
    await eB.oturum(B.k!.uid);
    yarisBitti("rx", 1, 2);
    await bekle();
    await eB.simdiGonder();
    await B.googleBagla();
    expect(B.k!.uid).toBe(uidA);
    await eB.oturum(B.k!.uid);
    expect(seviye().lv).toBeGreaterThanOrEqual(lvA);
    expect(enIyiYildiz("gp", 1)).toBe(3);
    expect(enIyiYildiz("rx", 1)).toBe(2);
    expect(aracAcikMi(8)).toBe(true);
    expect(best("asphalt_1")).toBe(61.5);
    expect(para()).toBeGreaterThanOrEqual(paraA);
    // birleşmiş hâl buluta da yazıldı: 1. cihaz tekrar açılınca 2. cihazın yıldızını görür
    expect(bulut.db.get(uidA)!.yildiz["dirt_1"]).toBe(2);
    eB.kapat();
    cihazDeposu(dA);
    const eA2 = esitleyiciKur(A, { gecikme: 0 });
    await eA2.oturum(uidA);
    expect(enIyiYildiz("rx", 1)).toBe(2);
    // para iki kez harcanmaz: alım birleşti, bakiye iki cihazda aynı
    const v = ilerlemeVerisi();
    expect(Object.keys(v.alimlar)).toEqual(["arac_8"]);
    eA2.kapat();
  });

  it("değişmeyen kayıt yeniden yazılmaz", async () => {
    const bulut = sahteBulut(),
      A = bulut.cihaz(),
      e = esitleyiciKur(A, { gecikme: 0 });
    await A.anonimGir();
    xpEkle(50, "test");
    await e.oturum(A.k!.uid);
    const n = bulut.yazmaSayisi();
    await e.simdiGonder();
    await e.oturum(A.k!.uid);
    expect(bulut.yazmaSayisi()).toBe(n);
    e.kapat();
  });

  it("çevrimdışıyken kuyruğa alınır, internet gelince gönderilir", async () => {
    const bulut = sahteBulut(),
      A = bulut.cihaz(),
      e = esitleyiciKur(A, { gecikme: 0 });
    await A.anonimGir();
    await e.oturum(A.k!.uid);
    cevrimici = false;
    xpEkle(300, "test");
    await bekle();
    await e.simdiGonder();
    expect(bekleyenVar()).toBe(true);
    expect(e.durum()).toBe("bekliyor");
    expect(bulut.db.get(A.k!.uid)?.xp ?? 0).toBe(0);
    cevrimici = true;
    window.dispatchEvent(new Event("online"));
    await bekle();
    await e.simdiGonder();
    expect(bulut.db.get(A.k!.uid)!.xp).toBe(300);
    expect(bekleyenVar()).toBe(false);
    expect(e.durum()).toBe("tamam");
    e.kapat();
  });

  it("araya başka cihaz girip yazma reddedilirse yeniden çekip birleştirerek yazar", async () => {
    const bulut = sahteBulut(),
      A = bulut.cihaz(),
      e = esitleyiciKur(A, { gecikme: 0 });
    await A.anonimGir();
    const uid = A.k!.uid;
    await e.oturum(uid);
    // başka cihaz bulutta daha çok XP ve bir alım yazdı
    bulut.db.set(uid, { ...belgeOlustur(), xp: 900, kazanilan: 9000, alimlar: { arac_9: 3000 } });
    xpEkle(10, "test");
    await bekle(); // gecikmeli yazma reddedilir (XP ve alım azalırdı)
    expect(e.durum()).toBe("hata");
    await e.simdiGonder(); // yeniden çeker, birleştirir, yazar
    expect(e.durum()).toBe("tamam");
    expect(bulut.db.get(uid)!.xp).toBe(900);
    expect(bulut.db.get(uid)!.alimlar).toHaveProperty("arac_9");
    e.kapat();
  });

  it("hesap: ilk açılışta sessiz anonim hesap, Google ile bağlanınca satır değişir", async () => {
    const bulut = sahteBulut(),
      A = bulut.cihaz();
    const e = hesapBaslat(A, { gecikme: 0 });
    await bekle();
    expect(hesapDurumu().kullanici?.anonim).toBe(true);
    expect(hesapOzeti()).toContain("Misafir");
    await googleBagla();
    await bekle();
    expect(hesapDurumu().kullanici?.yol).toBe("google");
    expect(hesapOzeti()).toContain("oyuncu@ornek.com");
    expect(hesapOzeti()).toContain("Bulutta");
    expect(hesapHtml()).toContain("Çıkış");
    // yeni oyuncu: bulutta kalır, bu cihaz sıfırdan; oyun yeniden açılınca yeni misafir hesap
    const uid = hesapDurumu().kullanici!.uid;
    yarisBitti("gp", 1, 3);
    saveBest("asphalt_1", "60");
    PROF.races = 5;
    let acildi = 0;
    await yeniOyuncu(() => acildi++);
    expect(acildi).toBe(1);
    expect(hesapDurumu().kullanici).toBeNull();
    expect(bulut.db.get(uid)!.yildiz["asphalt_1"]).toBe(3);
    ilerlemeSifirla();
    expect(seviye().toplamXp).toBe(0);
    expect(para()).toBe(0);
    expect(enIyiYildiz("gp", 1)).toBe(0);
    expect(best("asphalt_1")).toBe(0);
    expect(JSON.parse(depo["lt_prof"]).races).toBe(0);
    expect(depo["lt_car"]).toBe("1");
    expect(bekleyenVar()).toBe(false);
    // e-posta: yeni hesap, aynı e-postayla tekrar oluşturma → "giriş yap" uyarısı, yanlış ve doğru şifre
    await A.anonimGir();
    await bekle();
    expect(await epostaOlustur("yeni@ornek.com", "dogru1")).toBe(true);
    expect(hesapDurumu().bilgi).toBe("Bağlandı: yeni@ornek.com · İlerlemen bulutta");
    expect(hesapOzeti()).toContain("E-posta · yeni@ornek.com");
    await A.cikis();
    await A.anonimGir();
    expect(await epostaOlustur("yeni@ornek.com", "baska1")).toBe(false);
    expect(hesapDurumu().hata).toContain("zaten hesap var; şifrenle giriş yap (email-already-in-use)");
    expect(await epostaGiris("yeni@ornek.com", "yanlis")).toBe(false);
    expect(hesapDurumu().hata).toContain("şifre yanlış");
    expect(await epostaGiris("yeni@ornek.com", "dogru1")).toBe(true);
    expect(hesapDurumu().hata).toBeNull();
    expect(hesapDurumu().bilgi).toContain("Bağlandı: yeni@ornek.com");
    e.kapat();
  });

  it("admin: yetki sunucuda; admin her şeyi açık görür, panelle XP/para/seviye/kilit/sıfırlama; normal oyuncu göremez", async () => {
    const bulut = sahteBulut(),
      A = bulut.cihaz();
    const e = hesapBaslat(A, { gecikme: 0 });
    await bekle();
    // normal (bağlı ama admin değil) hesap: panel yok, kilitler normal, admin işlemi çalışmaz
    await googleBagla();
    await bekle();
    const uid = hesapDurumu().kullanici!.uid;
    expect(hesapDurumu().admin).toBe(false);
    expect(adminKipi()).toBe(false);
    expect(pistAcikMi("gp", 8)).toBe(false);
    expect(adminParaEkle(1000)).toBe(false);
    expect(para()).toBe(0);
    expect(hesapHtml()).not.toContain("Admin");
    expect(hesapHtml()).toContain(uid); // kopyalanabilir hesap kimliği
    // konsoldan admins/{uid} eklendi, yeniden giriş
    bulut.adminler.add(uid);
    await A.cikis();
    await A.googleBagla();
    await bekle();
    expect(hesapDurumu().admin).toBe(true);
    expect(pistAcikMi("gp", 8)).toBe(true);
    expect(aracAcikMi(9)).toBe(true);
    expect(seviye().lv).toBe(1); // kip kayda yazılmaz
    expect(hesapHtml()).toContain("İlerlemeyi sıfırla");
    expect(adminParaEkle(10000)).toBe(true);
    expect(adminXpEkle(1000)).toBe(true);
    expect(adminSeviye(10)).toBe(true);
    expect(seviye().lv).toBe(10);
    expect(adminSeviye(3)).toBe(true); // azaltma: buluta yalnız admin yazabilir
    expect(seviye().lv).toBe(3);
    expect(adminKilitAyarla("arac_9", true)).toBe(true);
    adminHerSeyAcik(false);
    expect(aracAcikMi(9)).toBe(true);
    expect(pistAcikMi("gp", 8)).toBe(false);
    expect(adminKilitAyarla("arac_9", false)).toBe(true);
    expect(aracAcikMi(9)).toBe(false);
    await bekle();
    expect(adminSifirla()).toBe(true);
    await bekle();
    expect(seviye().toplamXp).toBe(0);
    expect(para()).toBe(0);
    expect(bulut.db.get(uid)!.xp).toBe(0);
    expect(hesapDurumu().esitleme).toBe("tamam");
    // çıkınca admin kipi kapanır
    await A.cikis();
    expect(hesapDurumu().admin).toBe(false);
    expect(adminKipi()).toBe(false);
    e.kapat();
  });
});
