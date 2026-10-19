// Vite derleme ayarları. Derleme çıktısı (dist/) olduğu gibi GitHub Pages'e yüklenir.
//   npm run build                          ana sürüm (kök adres)
//   vite build --mode gelistirme           deneme sürümü (/dev/ adresi, ayrı ad ve önbellek)
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as { version: string };

/** index.html'e sürüm ve ad, derlemede manifest ve service worker */
function pwa(gelistirme: boolean): Plugin {
  const ad = gelistirme ? "Last Turn Deneme" : "Last Turn";
  let outDir = "dist";
  return {
    name: "last-turn-pwa",
    configResolved(c) {
      outDir = c.build.outDir;
    },
    transformIndexHtml(html) {
      return html.replaceAll("%APP_VERSION%", pkg.version).replaceAll("%UYGULAMA_ADI%", ad);
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.webmanifest",
        source: JSON.stringify(
          {
            name: ad,
            short_name: ad,
            id: gelistirme ? "./?deneme" : "./",
            description: "Telefon için 3D sürüş ve yarış oyunu",
            lang: "tr",
            start_url: "./",
            scope: "./",
            display: "fullscreen",
            orientation: "any",
            background_color: "#10252b",
            theme_color: "#10252b",
            icons: [
              { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
              { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
              { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
          },
          null,
          2,
        ),
      });
    },
    // tüm çıktı dosyaları yazıldıktan sonra service worker'ı dosya listesiyle üret
    closeBundle() {
      const kok = path.resolve(outDir);
      if (!fs.existsSync(kok)) return;
      const dosyalar: string[] = [];
      const gez = (d: string) => {
        for (const f of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, f.name);
          if (f.isDirectory()) gez(p);
          else dosyalar.push(path.relative(kok, p).split(path.sep).join("/"));
        }
      };
      gez(kok);
      const liste = ["./", ...dosyalar.filter((f) => f != "sw.js" && !f.startsWith(".")).sort()];
      const ozet = createHash("sha1");
      for (const f of liste.slice(1)) ozet.update(f).update(fs.readFileSync(path.join(kok, f)));
      const sw = fs
        .readFileSync("src/pwa/sw-sablon.js", "utf8")
        .replaceAll("%ONEK%", gelistirme ? "last-turn-dev-" : "last-turn-")
        .replace("%SURUM%", pkg.version)
        .replace("%OZET%", ozet.digest("hex").slice(0, 8))
        .replace("/* DOSYALAR */ []", JSON.stringify(liste));
      fs.writeFileSync(path.join(kok, "sw.js"), sw);
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [pwa(mode == "gelistirme")],
  build: {
    target: "es2022",
    // three.js tek parça: oyun kodu ile ayrı önbelleklensin
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes("node_modules/three") ? "three" : undefined) },
    },
    chunkSizeWarningLimit: 900,
  },
}));
