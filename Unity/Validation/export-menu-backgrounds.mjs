// TS 0.8.18 menü arka plan görselleri (public/img/menu/NN.webp, arayuz/arka-gorsel.ts): sabit SHA'dan okunur, yerel
// Edge ile kayıpsız PNG'ye çözülür (Unity WebP içe aktarmaz). Yeni görsel üretilmez; --check paket hashlerini denetler.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
const root = path.resolve(import.meta.dirname, "../.."),
  baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05",
  out = path.join(root, "Unity/Assets/LastTurn/Resources/UI/MenuBackground"),
  manifestPath = path.join(out, "manifest.json"),
  hash = (b) => createHash("sha256").update(b).digest("hex"),
  show = (name) =>
    execFileSync(
      "git",
      ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "show", `${baseline}:${name}`],
      {
        cwd: root,
        maxBuffer: 1 << 26,
      },
    );
const count = JSON.parse(show("public/img/menu/adet.json").toString());
if (process.argv.includes("--check")) {
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (m.baseline !== baseline || m.images.length !== count) throw Error("Menü görsel kapsamı eksik");
  for (const e of m.images) {
    if (hash(show(e.source)) !== e.sourceHash) throw Error("TS görseli farklı: " + e.source);
    if (hash(fs.readFileSync(path.join(out, e.file))) !== e.hash) throw Error("PNG farklı: " + e.file);
  }
  console.log(
    `Menü arka planı: ${m.images.length}/${count} kaynak görsel; kaynak ve PNG hashleri aynı. Görsel kabul değildir.`,
  );
  process.exit(0);
}
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
const manifest = { baseline, kalmaMs: 6000, images: [] };
try {
  const page = await browser.newPage();
  for (let i = 0; i < count; i++) {
    const source = `public/img/menu/${String(i).padStart(2, "0")}.webp`,
      bytes = show(source);
    const png = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = "data:image/webp;base64," + b64;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      return { data: c.toDataURL("image/png").split(",")[1], w: c.width, h: c.height };
    }, bytes.toString("base64"));
    const b = Buffer.from(png.data, "base64"),
      file = `menu-${String(i).padStart(2, "0")}.png`;
    fs.writeFileSync(path.join(out, file), b);
    const meta = path.join(out, file + ".meta");
    if (!fs.existsSync(meta))
      fs.writeFileSync(
        meta,
        "fileFormatVersion: 2\nguid: " +
          hash(Buffer.from("UI/MenuBackground/" + file)).slice(0, 32) +
          "\nTextureImporter:\n  serializedVersion: 13\n  mipmaps:\n    enableMipMap: 0\n  textureSettings:\n    filterMode: 1\n    wrapU: 1\n    wrapV: 1\n  textureShape: 1\n  textureType: 0\n  maxTextureSize: 2048\n  npotScale: 0\n",
      );
    manifest.images.push({
      source,
      sourceHash: hash(bytes),
      file,
      hash: hash(b),
      width: png.w,
      height: png.h,
    });
    console.log(`${source} → ${file} ${png.w}×${png.h}`);
  }
} finally {
  await browser.close();
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
