import { test } from "node:test";
import assert from "node:assert/strict";
import { kapasite, yonlendir, maliyetKapisi, devirOzeti } from "../ajan-yonlendirme.mjs";

const zaman = Date.parse("2026-10-30T13:00:00Z");
const kaynaklar = {
  codex: "https://learn.chatgpt.com/docs/app-server#6-rate-limits-chatgpt",
  claude: "https://code.claude.com/docs/en/costs#using-the-usage-command",
};
function gozlem(ajan, bes = 20, hafta = 30) {
  return {
    ajan,
    tur: "resmi-anlik-goruntu",
    kaynak: kaynaklar[ajan],
    kanit: "tests/cikti/resmi-kullanim.json",
    zaman: new Date(zaman).toISOString(),
    pencereler: [
      { dakika: 300, kullanilanYuzde: bes, sifirlanma: "2026-10-30T15:00:00Z" },
      { dakika: 10080, kullanilanYuzde: hafta, sifirlanma: "2026-11-02T13:00:00Z" },
    ],
  };
}
const sec = (b, o = {}) => yonlendir(b, { simdi: zaman, kart: "docs/isler/kart.md", sha: "sha1", ...o });

test("veri yokken iki kapasite penceresi bilinmiyor; kalıcı varsayılan sahip yok", () => {
  const p = sec({});
  assert.equal(p.sahip, null);
  assert.equal(p.durum, "secim-bekliyor");
  for (const a of p.adaylar) {
    assert.equal(a.kapasite.besSaat.durum, "bilinmiyor");
    assert.equal(a.kapasite.haftalik.durum, "bilinmiyor");
  }
  assert.equal(sec({}, { mevcut: "codex" }).sahip, "codex");
  assert.equal(sec({}, { mevcut: "claude" }).sahip, "claude");
});

test("kanıtlı uzmanlık görev sahibini her iki yönde değiştirebilir", () => {
  for (const ajan of ["claude", "codex"]) {
    const diger = ajan === "claude" ? "codex" : "claude";
    const p = sec(
      { gerekenUzmanlik: ["C#"], ajanlar: { [ajan]: { uzmanlik: [{ alan: "C#", kanit: "kart#olcum" }] } } },
      { mevcut: diger },
    );
    assert.equal(p.sahip, ajan);
  }
});

test("aynı kart/SHA bağlamı korunur; eski SHA hazır bağlam sayılmaz", () => {
  const b = {
    ajanlar: { claude: { baglam: { kart: "docs/isler/kart.md", sha: "sha1", kanit: "kart#devir" } } },
  };
  assert.equal(sec(b, { mevcut: "codex" }).sahip, "claude");
  assert.equal(sec(b, { mevcut: "codex", sha: "baska" }).sahip, "codex");
});

test("kanıtsız üstünlük veya ilgisiz iş geçmişi avantaj oluşturmaz", () => {
  const p = sec(
    {
      tur: "fizik",
      gerekenUzmanlik: ["C#"],
      ajanlar: {
        claude: {
          uzmanlik: [{ alan: "C#" }],
          gecmis: [{ tur: "hud", sonuc: "basarili", kanit: "kart#hud" }],
        },
      },
    },
    { mevcut: "codex" },
  );
  assert.equal(p.sahip, "codex");
});

test("aynı iş türündeki kanıtlı başarı ve başarısızlıklar kullanılır; tekrarlar şişirmez", () => {
  const veri = { tur: "fizik", sonuc: "basarili", kanit: "kart#test" };
  const p = sec({
    tur: "fizik",
    ajanlar: {
      claude: { gecmis: Array(30).fill(veri) },
      codex: { gecmis: [{ ...veri, sonuc: "basarisiz" }] },
    },
  });
  assert.equal(p.sahip, "claude");
  assert.equal(p.adaylar.find((a) => a.ajan === "claude").puan, 1);
});

test("küçük işte ikinci ajan yok; büyük işte gerekçeli bağımsız rol gerekir", () => {
  const bagimsizIs = { gerekli: true, rol: "inceleme", gerekce: "Ayrı TS senaryosu" };
  assert.equal(sec({ boyut: "kucuk", bagimsizIs }, { mevcut: "claude" }).ikinciAjan, null);
  assert.equal(sec({ boyut: "buyuk" }, { mevcut: "claude" }).ikinciAjan, null);
  assert.equal(sec({ boyut: "buyuk", bagimsizIs }, { mevcut: "claude" }).ikinciAjan, "codex");
  assert.equal(
    sec({ boyut: "buyuk", bagimsizIs: { ...bagimsizIs, gerekce: "" } }, { mevcut: "claude" }).ikinciAjan,
    null,
  );
});

test("5 saat veya haftalık pencerenin dolması aday seçimini engeller; diğer ajan devralabilir", () => {
  for (const [bes, hafta] of [
    [100, 0],
    [0, 100],
  ]) {
    const p = sec({ ajanlar: { codex: { kapasite: gozlem("codex", bes, hafta) } } }, { mevcut: "codex" });
    assert.equal(p.sahip, "claude");
    assert.equal(
      sec({ ajanlar: { codex: { kapasite: gozlem("codex", bes, hafta) } } }, { ajan: "codex" }).sahip,
      null,
    );
  }
});

test("bağımsız geliştirme/test için dosya sahipliği ayrıdır; çakışma ve yol takma adları engellenir", () => {
  const b = {
    boyut: "buyuk",
    sahipDosyalari: ["Unity/Assets/Core/Fizik.cs"],
    bagimsizIs: {
      gerekli: true,
      rol: "gelistirme",
      gerekce: "Ayrı test sınıfı",
      dosyalar: ["Unity/Assets/Tests/FizikTest.cs"],
    },
  };
  assert.equal(sec(b, { mevcut: "codex" }).ikinciAjan, "claude");
  assert.equal(sec(b, { mevcut: "claude" }).ikinciAjan, "codex");
  for (const dosyalar of [
    ["./unity/assets/core/Fizik.cs"],
    ["./Unity//Assets/./Core/Fizik.cs"],
    ["Unity/Assets/Core/"],
    ["../disari"],
    ["../disari/*"],
    [],
    ["/mutlak"],
  ])
    assert.equal(
      sec({ ...b, bagimsizIs: { ...b.bagimsizIs, dosyalar } }, { mevcut: "claude" }).ikinciAjan,
      null,
    );
});

test("iki aday doluysa başlatma planlanmaz", () => {
  assert.equal(
    sec({
      ajanlar: { codex: { kapasite: gozlem("codex", 100) }, claude: { kapasite: gozlem("claude", 100) } },
    }).sahip,
    null,
  );
});

test("güncel ve resmi kaynaklı olarak sunulan iki pencere karşılaştırılır", () => {
  const p = sec({
    ajanlar: { codex: { kapasite: gozlem("codex", 90, 70) }, claude: { kapasite: gozlem("claude", 20, 30) } },
  });
  assert.equal(p.sahip, "claude");
  assert.equal(p.adaylar[0].kapasite.kaynak.canliDogrulama, false);
});

test("eski, eksik, tahmini, yanlış süreli veya süresi dolmuş veri bilinmiyor kalır", () => {
  for (const ek of [
    { tur: "tahmin" },
    { kaynak: "yerel-token-sayaci" },
    { ajan: "claude" },
    { zaman: "bozuk" },
    { zaman: "2026-10-30T12:00:00Z" },
    { zaman: "2026-10-30T14:00:00Z" },
    { pencereler: {} },
    { pencereler: [null] },
    { pencereler: [...gozlem("codex").pencereler, gozlem("codex").pencereler[0]] },
    { pencereler: [{ dakika: 15, kullanilanYuzde: 50 }] },
  ]) {
    assert.equal(kapasite("codex", { ...gozlem("codex"), ...ek }, zaman).besSaat.durum, "bilinmiyor");
  }
  const x = gozlem("codex");
  x.pencereler[0].sifirlanma = "2026-10-30T12:00:00Z";
  assert.equal(kapasite("codex", x, zaman).besSaat.durum, "bilinmiyor");
});

test("API maliyet/token telemetrisi kalan abonelik kotasına dönüşmez", () => {
  const k = kapasite(
    "claude",
    { total_cost_usd: 5, usage: { input_tokens: 1000 }, remainingTokens: 999999 },
    zaman,
  );
  assert.equal(k.besSaat.durum, "bilinmiyor");
  assert.equal(k.haftalik.durum, "bilinmiyor");
});

test("JSON veya kullanıcı benzeri bayrak beyanı ücretli API/ek kredi kapısını açamaz", () => {
  const k = maliyetKapisi({ apiOnayi: true, abonelik: true, ekKrediKapali: true });
  assert.equal(k.izin, false);
  assert.equal(k.apiOnayi, false);
  assert.equal(k.ekKrediOnayi, false);
});

test("devir SHA/değişiklik/test kanıtını korur; önceki süreç durmadıysa devralma güvenli sayılmaz", () => {
  const kaynak = { dal: "unity/yerel-gelistirme", sha: "sha1", gitDurumu: " M fizik.cs" };
  const d = devirOzeti({
    kart: "kart",
    oncekiAjan: "claude",
    plan: { sahip: "codex" },
    kaynak,
    testler: [{ dosya: "test.tap" }],
  });
  assert.equal(d.sha, "sha1");
  assert.equal(d.oncekiAjan, "claude");
  assert.equal(d.guvenli, false);
  assert.equal(d.gitDurumu, " M fizik.cs");
  assert.equal(devirOzeti({ kaynak, durdu: true }).guvenli, true);
});
