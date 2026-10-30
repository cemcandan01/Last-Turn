// Ajan adından bağımsız yerel kararlar. Model çağrısı, kimlik bilgisi veya kota tahmini yok.
export const AJANLAR = ["codex", "claude"];
import { abonelikKapisi } from "./abonelik.mjs";
const belgeVar = (x) => typeof x === "string" && x.trim().length > 0;

export function kapasite(ajan, gozlem, simdi = Date.now()) {
  const sonuc = { besSaat: { durum: "bilinmiyor" }, haftalik: { durum: "bilinmiyor" }, kaynak: null };
  const kaynaklar = {
    codex: "https://learn.chatgpt.com/docs/app-server#6-rate-limits-chatgpt",
    claude: "https://code.claude.com/docs/en/costs#using-the-usage-command",
  };
  // Yerel token/maliyet kayıtları, aboneliğin kalan kotasına dönüştürülmez.
  if (
    !gozlem ||
    !Array.isArray(gozlem.pencereler) ||
    gozlem.ajan !== ajan ||
    gozlem.tur !== "resmi-anlik-goruntu" ||
    gozlem.kaynak !== kaynaklar[ajan] ||
    !belgeVar(gozlem.kanit)
  )
    return sonuc;
  const tarih = Date.parse(gozlem.zaman);
  if (!Number.isFinite(tarih) || simdi < tarih || simdi - tarih > 5 * 60 * 1000) return sonuc;
  sonuc.kaynak = { belge: gozlem.kaynak, kanit: gozlem.kanit, zaman: gozlem.zaman, canliDogrulama: false };
  for (const [ad, dakika] of [
    ["besSaat", 300],
    ["haftalik", 10080],
  ]) {
    const eslesen = gozlem.pencereler.filter((p) => p?.dakika === dakika);
    const p = eslesen.length === 1 ? eslesen[0] : null;
    if (!p || !Number.isFinite(p.kullanilanYuzde) || p.kullanilanYuzde < 0 || p.kullanilanYuzde > 100)
      continue;
    const sifirlanma = Date.parse(p.sifirlanma);
    if (!Number.isFinite(sifirlanma) || sifirlanma <= simdi) continue;
    sonuc[ad] = {
      durum: p.kullanilanYuzde >= 100 ? "dolu" : "uygun",
      kullanilanYuzde: p.kullanilanYuzde,
      sifirlanma: p.sifirlanma,
    };
  }
  return sonuc;
}

export function yonlendir(baglam = {}, { mevcut, ajan = "auto", kart, sha, simdi = Date.now() } = {}) {
  if (mevcut && !AJANLAR.includes(mevcut)) throw new Error("Mevcut ajan codex veya claude olmalı.");
  if (ajan !== "auto" && !AJANLAR.includes(ajan)) throw new Error("Ajan auto, codex veya claude olmalı.");
  const adaylar = AJANLAR.map((ad) => {
    const veri = baglam.ajanlar?.[ad] ?? {};
    const k = kapasite(ad, veri.kapasite, simdi);
    const nedenler = [];
    const engelli =
      k.besSaat.durum === "dolu" ||
      k.haftalik.durum === "dolu" ||
      (veri.erisim?.durum === "yok" && belgeVar(veri.erisim.kanit));
    let puan = 0;
    const uzmanlik = (veri.uzmanlik ?? []).filter(
      (u) => belgeVar(u.kanit) && (baglam.gerekenUzmanlik ?? []).includes(u.alan),
    );
    // Aynı beceriyi tekrar yazarak veya sınırsız geçmiş ekleyerek puan büyütülemez.
    const alanlar = [...new Set(uzmanlik.map((u) => u.alan))];
    if (alanlar.length) {
      puan += Math.min(3, alanlar.length) * 4;
      nedenler.push("Kanıtlı ilgili uzmanlık: " + alanlar.join(", "));
    }
    if (veri.baglam?.kart === kart && veri.baglam?.sha === sha && belgeVar(veri.baglam.kanit)) {
      puan += 3;
      nedenler.push("Aynı kart ve kaynak SHA için hazır bağlam");
    }
    const gecmis = (veri.gecmis ?? []).filter(
      (g) =>
        belgeVar(baglam.tur) &&
        g.tur === baglam.tur &&
        belgeVar(g.kanit) &&
        ["basarili", "basarisiz"].includes(g.sonuc),
    );
    const tekil = [...new Map(gecmis.map((g) => [g.kanit, g])).values()].slice(-5);
    if (tekil.length) {
      puan += Math.max(
        -2,
        Math.min(
          2,
          tekil.reduce((p, g) => p + (g.sonuc === "basarili" ? 1 : -1), 0),
        ),
      );
      nedenler.push("Aynı iş türünde kanıtlı son " + tekil.length + " sonuç");
    }
    if (k.besSaat.durum === "uygun" && k.haftalik.durum === "uygun") {
      puan++;
      nedenler.push("Her iki pencere için güncel resmi veri olarak sunulan kapasite kaydı");
    }
    if (engelli) nedenler.push("Dolu kota penceresi veya kanıtlı erişim engeli");
    return { ajan: ad, puan, engelli, nedenler, kapasite: k, model: null };
  });
  const uygun = adaylar.filter((a) => !a.engelli);
  let sahip;
  if (ajan !== "auto") sahip = uygun.find((a) => a.ajan === ajan);
  else if (uygun.length) {
    const enIyi = Math.max(...uygun.map((a) => a.puan));
    let esler = uygun.filter((a) => a.puan === enIyi);
    // Kapasitesi bilinmeyeni boş veya dolu sayma. Yalnız iki tam resmi gözlem karşılaştırılır.
    if (
      esler.length === 2 &&
      esler.every((a) => a.kapasite.besSaat.durum === "uygun" && a.kapasite.haftalik.durum === "uygun")
    ) {
      const yuk = (a) => Math.max(a.kapasite.besSaat.kullanilanYuzde, a.kapasite.haftalik.kullanilanYuzde);
      const enAz = Math.min(...esler.map(yuk));
      esler = esler.filter((a) => yuk(a) === enAz);
    }
    sahip = esler.length === 1 ? esler[0] : esler.find((a) => a.ajan === mevcut);
  }
  const yazanRol = ["gelistirme", "test"].includes(baglam.bagimsizIs?.rol);
  const norm = (s) =>
    s
      .replaceAll("\\", "/")
      .split("/")
      .filter((p) => p && p !== ".")
      .map((p) => p.replace(/[. ]+$/, ""))
      .join("/")
      .toLowerCase();
  const kapsam = (liste) =>
    Array.isArray(liste) &&
    liste.length > 0 &&
    liste.every(
      (s) =>
        typeof s === "string" &&
        norm(s).length > 0 &&
        !/[:*?]/.test(s) &&
        !s.startsWith("/") &&
        !s.startsWith("\\") &&
        !s.split(/[\\/]/).some((p) => p.trimEnd() === ".."),
    );
  const cakisan = (a, b) => a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
  const dosyaSahipligiUygun =
    !yazanRol ||
    (kapsam(baglam.sahipDosyalari) &&
      kapsam(baglam.bagimsizIs?.dosyalar) &&
      !baglam.sahipDosyalari.some((a) => baglam.bagimsizIs.dosyalar.some((b) => cakisan(norm(a), norm(b)))));
  const ikinciFaydali =
    baglam.boyut !== "kucuk" &&
    dosyaSahipligiUygun &&
    baglam.bagimsizIs?.gerekli === true &&
    belgeVar(baglam.bagimsizIs.gerekce) &&
    ["gelistirme", "inceleme", "test"].includes(baglam.bagimsizIs.rol);
  const ikinci = sahip && ikinciFaydali ? uygun.find((a) => a.ajan !== sahip.ajan) : null;
  return {
    sahip: sahip?.ajan ?? null,
    ikinciAjan: ikinci?.ajan ?? null,
    ikinciRol: ikinci ? baglam.bagimsizIs.rol : null,
    dosyaSahipligi: {
      sahip: baglam.sahipDosyalari ?? [],
      ikinci: ikinci ? (baglam.bagimsizIs.dosyalar ?? []) : [],
      uygun: dosyaSahipligiUygun,
    },
    adaylar,
    durum: sahip ? "planlandi" : "secim-bekliyor",
    gerekce: sahip
      ? ajan !== "auto"
        ? "Açık ajan seçimi; erişim/kota engelleri yine uygulanır."
        : "İş türü, kanıtlı uzmanlık, aynı kaynak bağlamı, sonuç geçmişi ve kapasite karşılaştırıldı; eşitlikte mevcut bağlam korunur."
      : "Uygun tek aday veya bağlama dayalı üstünlük yok; kalıcı varsayılan ajan seçilmedi.",
    eksikler:
      "Bildirilmeyen model ve resmi kullanım pencereleri bilinmiyor; puan yerel karar yordamıdır, genel yetenek ölçümü değildir." +
      (dosyaSahipligiUygun
        ? ""
        : " İkinci yazan rol için ayrı, çakışmayan dosya sahipliği eksik veya geçersiz; ikinci ajan seçilmedi."),
  };
}

export function maliyetKapisi(oturum, manuel) {
  return abonelikKapisi(oturum, manuel);
}

export function devirOzeti({ kart, oncekiAjan, plan, kaynak, testler = [], durdu }) {
  return {
    kart,
    oncekiAjan: oncekiAjan ?? null,
    aday: plan?.sahip ?? null,
    dal: kaynak?.dal ?? null,
    sha: kaynak?.sha ?? null,
    gitDurumu: kaynak?.gitDurumu ?? "bilinmiyor",
    testKaniti: testler,
    oncekiSurec: durdu === true ? "durdu" : "bilinmiyor",
    guvenli: durdu === true && !!kaynak?.sha,
    sonrakiAdim:
      durdu === true
        ? "Aynı kart, SHA, içerik manifesti ve test kanıtlarını incele. Gönderilmemiş değişiklikleri koru; tek sahip olarak mevcut worktree'den devral veya açıkça yetkilendirilmiş aktarımı doğrula. Analizi sıfırdan tekrarlama."
        : "Önceki sürecin durması doğrulanamadı; devir ve yeni model çağrısı engelli.",
  };
}
