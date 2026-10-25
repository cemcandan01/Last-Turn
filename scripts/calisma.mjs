// Ortak iş kartı ve sınırlı başlangıç bağlamı; ek paket/AI çağrısı gerekmez.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ALANLAR = Object.freeze([
  "altyapi",
  "araclar",
  "fizik",
  "garaj",
  "grafik",
  "hud",
  "menu",
  "modifiye",
  "pist",
  "ses",
  "kurallar",
  "regresyon",
]);

function alanDogrula(alan) {
  if (!ALANLAR.includes(alan)) throw new Error("Bilinmeyen alan: " + alan);
}

function oku(kok, dosya, sinir) {
  try {
    const metin = fs.readFileSync(path.join(kok, dosya), "utf8");
    return metin.length > sinir
      ? metin.slice(0, sinir) + "\n[Özet kesildi; devamı için " + dosya + " dosyasını oku.]"
      : metin;
  } catch {
    return "(henüz yok)";
  }
}

function git(kok, ...args) {
  try {
    return execFileSync("git", args, {
      cwd: kok,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "(bilinmiyor)";
  }
}

export function baglam(kok, alan) {
  alanDogrula(alan);
  const pkg = JSON.parse(fs.readFileSync(path.join(kok, "package.json"), "utf8"));
  const refs = ["HEAD", "origin/gelistirme", "origin/master"].map(
    (ref) => `${ref}: ${git(kok, "rev-parse", "--short", ref)}`,
  );
  return [
    `Last Turn · ${pkg.version} · ${alan}`,
    `Dal: ${git(kok, "branch", "--show-current")}`,
    ...refs,
    "Not: uzak referanslar son fetch kadar günceldir; bu komut ağ isteği yapmaz.",
    "\nOrtak devir:",
    oku(kok, "docs/DEVIR.md", 2600),
    "\nYalnız gerekli belgeler:",
    "CLAUDE.md → görev kartı → docs/ALANLAR.md ilgili bölüm → docs/notlar/" + alan + ".md",
    "Ortak süreç: docs/ORTAK-CALISMA.md; ayrıntılar gerektiğinde docs/GELISTIRICI-AYRINTILARI.md.",
    fs.existsSync(path.join(kok, "tests", "senaryolar", alan + ".mjs"))
      ? `Test: npm run kontrol; npm run alan -- ${alan}`
      : "Test: npm run kontrol; bu alanın kayıtlı senaryosu yok, görev kartında ilgili mevcut test kapsamını seç.",
    "Kabul ölçütü/aktif sahip/sonraki adım görev kartında olmalı. Bu özet test veya yayın kanıtı değildir.",
  ].join("\n");
}

export function gorevOlustur(kok, kimlik, alan, istek = "") {
  alanDogrula(alan);
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(kimlik)) throw new Error("Görev kimliği: 3–80 küçük harf/rakam/tire");
  const hedef = path.join(kok, "docs", "isler", kimlik + ".md");
  const metin = `# ${kimlik}

- Durum: tanımlanıyor
- Aktif sahip: atanacak (Claude / Codex)
- Alan: ${alan}
- Dal: atanacak
- Başlangıç SHA: doğrulanacak

## Kullanıcının özgün isteği

${istek || "Kullanıcının isteğini buraya aynen kaydet."}

## Ajanın anladığı sonuç

Oyuncu hangi ekranda/hangi hareketten sonra ne görecek veya hissedecek?

## Kabul ölçütleri

- [ ] Gözlenebilir sonuç 1
- [ ] Gözlenebilir sonuç 2
- [ ] Korunacak mevcut davranış

## Referans, sınırlar ve kanıt

- Referans/örnek: belirt
- Kapsam dışı: belirt
- Kanıt ekranı veya ölçümü: belirt
- Sonucu değiştiren açık sorular: yoksa “yok”

## Devir ve doğrulama

- Son kaynak SHA / uzak dal: doğrulanacak
- Test edilen kaynak/merge SHA / hedef dal SHA: henüz yok
- Bağımlılık kilidi özeti / çalıştırıcı ve ortam: henüz yok
- Çalıştırılan test ve kapsam / sonuç / CI veya dosya kanıtı: henüz yok
- Yerel / push / CI / deneme adresi / canlı durumu: ayrı ayrı belirt
- Engel ve tek sonraki adım: belirt

## Revize ve maliyet kaydı

- Revize turu / ilk kabul: henüz bilinmiyor
- Çalışma süresi / tekrar kurulum-test / ajan sayısı: henüz bilinmiyor
- Platformun gösterdiği kullanım: ölçülmedi (tahmin yazma)
- Revize geldiyse: istenen / çıkan / fark / düzeltme / kanıt
`;
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.writeFileSync(hedef, metin, { flag: "wx" });
  return hedef;
}

if (process.argv[1] && path.resolve(process.argv[1]) == fileURLToPath(import.meta.url)) {
  const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const [komut, a, b, ...istek] = process.argv.slice(2);
  try {
    if (komut == "baglam") console.log(baglam(kok, a));
    else if (komut == "yeni") console.log(gorevOlustur(kok, a, b, istek.join(" ")));
    else {
      console.error("Kullanım: npm run calisma -- baglam <alan> | yeni <kimlik> <alan> [istek]");
      process.exitCode = 2;
    }
  } catch (hata) {
    console.error(hata.message);
    process.exitCode = 1;
  }
}
