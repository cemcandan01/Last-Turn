// Vite derleme ayarları. Derleme çıktısı (dist/) olduğu gibi GitHub Pages'e yüklenir.
//   npm run build                          ana sürüm (kök adres)
//   vite build --mode gelistirme           deneme sürümü (/dev/ adresi, ayrı ad ve önbellek)
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as { version: string };

/** Firebase yapılandırması (src/bulut/ayar.ts); boşsa Firebase parçası önbelleğe alınmaz, hiç indirilmez */
const firebaseAyar = (() => {
  const t = fs.readFileSync("src/bulut/ayar.ts", "utf8"),
    al = (k: string) => t.match(new RegExp(k + ':\\s*"([^"]*)"'))?.[1] || "";
  return { acik: !!(al("apiKey") && al("projectId") && al("appId")), authDomain: al("authDomain") };
})();

/**
 * Firebase giriş yardımcısı (Google girişi sayfaları) oyunun kendi adresine: iPhone ana ekran uygulamasında Safari
 * üçüncü taraf depolamayı engellediği için Google yönlendirmesi ancak böyle döner (bulut/firebase.ts). Dosyalar
 * derlemede projenin firebaseapp.com adresinden indirilir (GitHub Actions'ta internet var); inemezse uyarı verilir,
 * oyun açılır pencereyle dener.
 */
function firebaseYardimci(): Plugin {
  const dosyalar = [
    "__/auth/handler",
    "__/auth/handler.js",
    "__/auth/experiments.js",
    "__/auth/iframe",
    "__/auth/iframe.js",
    "__/firebase/init.json",
  ];
  return {
    name: "last-turn-firebase-yardimci",
    apply: "build",
    async generateBundle() {
      if (!firebaseAyar.acik || !firebaseAyar.authDomain) return;
      for (const f of dosyalar)
        try {
          const r = await fetch(`https://${firebaseAyar.authDomain}/${f}`, {
            signal: AbortSignal.timeout(10000),
          });
          if (!r.ok) throw new Error("HTTP " + r.status);
          this.emitFile({ type: "asset", fileName: f, source: new Uint8Array(await r.arrayBuffer()) });
        } catch (e) {
          this.warn(`Firebase giriş yardımcısı indirilemedi (${f}): ${(e as Error).message}`);
          return;
        }
    },
  };
}

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
            orientation: "landscape",
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
      // Firebase parçası yalnız yapılandırma varken önbelleğe alınır; giriş yardımcısı hiç (her zaman ağdan)
      const liste = [
        "./",
        ...dosyalar
          .filter((f) => f != "sw.js" && !f.startsWith(".") && !f.startsWith("__/"))
          .filter((f) => firebaseAyar.acik || !f.startsWith("assets/firebase-"))
          .sort(),
      ];
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
  plugins: [pwa(mode == "gelistirme"), firebaseYardimci()],
  build: {
    target: "es2022",
    // three.js tek parça: oyun kodu ile ayrı önbelleklensin
    rollupOptions: {
      // Firebase (bulut/firebase.ts ve SDK) ayrı parça: yalnız yapılandırma varsa açılıştan sonra yüklenir
      output: {
        manualChunks: (id) =>
          id.includes("node_modules/three")
            ? "three"
            : /node_modules\/(@?firebase)\/|src\/bulut\/firebase\.ts/.test(id)
              ? "firebase"
              : undefined,
      },
    },
    chunkSizeWarningLimit: 900,
  },
}));
