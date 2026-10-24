// Ortak süreç aracının devir güvenliği: var olan işi ezmez, yol dışına yazmaz, sınırlı bağlam verir.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { baglam, gorevOlustur } from "../../scripts/calisma.mjs";

const geciciler: string[] = [];
function kur() {
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), "last-turn-calisma-"));
  geciciler.push(kok);
  fs.writeFileSync(path.join(kok, "package.json"), JSON.stringify({ version: "0.5.26" }));
  fs.mkdirSync(path.join(kok, "docs"));
  fs.mkdirSync(path.join(kok, "tests", "senaryolar"), { recursive: true });
  fs.writeFileSync(path.join(kok, "tests", "senaryolar", "hud.mjs"), "export default [];");
  return kok;
}
afterEach(() => {
  for (const kok of geciciler.splice(0)) fs.rmSync(kok, { recursive: true, force: true });
});

describe("ortak çalışma araçları", () => {
  it.each(["araclar", "regresyon"])("senaryosu olmayan %s için çalışmayan test komutu önermez", (alan) => {
    const sonuc = baglam(kur(), alan);
    expect(sonuc).not.toContain("npm run alan -- " + alan);
    expect(sonuc).toContain("ilgili mevcut test kapsamını seç");
  });
  it("bilinmeyen test alanı boş başarı raporu üretmez", () => {
    const kok = fileURLToPath(new URL("../../", import.meta.url));
    const r = spawnSync(process.execPath, ["tests/kosucu.mjs", "alan", "olmayan-alan"], {
      cwd: kok,
      encoding: "utf8",
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("boş koşum başarılı sayılamaz");
  });
  it("aynı kartı ikinci kez oluşturarak önceki ajanın işini ezmez", () => {
    const kok = kur();
    const hedef = gorevOlustur(kok, "hud-gaz", "hud", "Gaz düğmesi yolu kapatmasın.");
    const ilk = fs.readFileSync(hedef, "utf8");
    expect(ilk).toContain("Gaz düğmesi yolu kapatmasın.");
    expect(() => gorevOlustur(kok, "hud-gaz", "hud", "Yeni istek")).toThrow();
    expect(fs.readFileSync(hedef, "utf8")).toBe(ilk);
  });

  it.each(["../disari", "/tmp/disari", "a/b", "HUD", "ab", "a".repeat(81)])(
    "geçersiz görev kimliğini reddeder: %s",
    (kimlik) => {
      const kok = kur();
      expect(() => gorevOlustur(kok, kimlik, "hud")).toThrow("Görev kimliği");
      expect(fs.existsSync(path.join(kok, "docs", "isler"))).toBe(false);
    },
  );

  it("bilinmeyen alanla dosya üretmez veya yanlış test kapsamı önermez", () => {
    const kok = kur();
    expect(() => gorevOlustur(kok, "yanlis-alan", "baska")).toThrow("Bilinmeyen alan");
    expect(() => baglam(kok, "baska")).toThrow("Bilinmeyen alan");
  });

  it("istekteki komut benzeri metni çalıştırmadan aynen saklar", () => {
    const kok = kur();
    const istek = "Aracı $(touch dosya) ve `git status` metniyle göster.";
    const hedef = gorevOlustur(kok, "metin-koruma", "menu", istek);
    expect(fs.readFileSync(hedef, "utf8")).toContain(istek);
    expect(fs.existsSync(path.join(kok, "dosya"))).toBe(false);
  });

  it("uzun devir ve ilgisiz dosyaları başlangıç bağlamına doldurmaz", () => {
    const kok = kur();
    fs.writeFileSync(path.join(kok, "docs", "DEVIR.md"), "Devir\n" + "a".repeat(20000));
    fs.writeFileSync(path.join(kok, "ilgisiz.txt"), "OKUNMAMASI_GEREKEN");
    const sonuc = baglam(kok, "hud");
    expect(sonuc.length).toBeLessThan(4500);
    expect(sonuc).toContain("npm run alan -- hud");
    expect(sonuc).toContain("son fetch kadar");
    expect(sonuc).toContain("Özet kesildi");
    expect(sonuc).not.toContain("OKUNMAMASI_GEREKEN");
    expect(sonuc).toContain("test veya yayın kanıtı değildir");
  });

  it("henüz devir veya git kaydı olmayan kurulumda da kısa yönlendirme verir", () => {
    const sonuc = baglam(kur(), "kurallar");
    expect(sonuc).toContain("henüz yok");
    expect(sonuc).toContain("bilinmiyor");
    expect(sonuc).toContain("0.5.26");
  });
});
