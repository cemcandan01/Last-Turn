// TS 0.8.18'in kendi Three.js kurucuları; çizim tekniği taşınır, yeni sanat üretilmez.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import ts from "typescript";
import { chromium } from "playwright";
const root = path.resolve(import.meta.dirname, "../.."),
  baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05";
const out = path.join(
  root,
  process.argv.includes("--write")
    ? "Unity/Assets/LastTurn/Resources/SourcePresentation"
    : "tests/cikti/source-presentation",
);
const manifestPath = path.join(out, "manifest.json"),
  hash = (b) => createHash("sha256").update(b).digest("hex");
if (process.argv.includes("--check")) {
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (m.baseline !== baseline || m.cars.length !== 15) throw Error("Kaynak sunum kapsamı eksik");
  const catalog = JSON.parse(
    fs.readFileSync(path.join(root, "Unity/Assets/LastTurn/Resources/vehicle-catalog.json"), "utf8"),
  );
  if (
    m.cars.some((c, i) => c.id !== i || c.key !== catalog.cars[i].k) ||
    new Set(m.cars.map((c) => c.key)).size !== 15
  )
    throw Error("Araç katalog eşlemesi farklı");
  if (
    process.argv.includes("--write") &&
    (m.worlds.length !== 43 || new Set(m.worlds.map((w) => w.key)).size !== 43)
  )
    throw Error("Dünya kapsamı eksik");
  for (const e of [...m.cars, ...m.worlds]) {
    const b = fs.readFileSync(path.join(out, e.file));
    if (hash(b) !== e.hash) throw Error("Sunum paketi farklı: " + e.file);
    const g = JSON.parse(gunzipSync(b));
    if (g.nodes.length !== e.nodes || !g.geometries.length || g.key !== e.key)
      throw Error("Boş/eksik çizim: " + e.file);
    for (const geom of g.geometries) {
      if (
        geom.positions.some((x) => !Number.isFinite(x)) ||
        geom.indices.some((x) => x < 0 || x >= geom.positions.length / 3) ||
        geom.indices.length % 3
      )
        throw Error("Geometri bozuk: " + e.key);
    }
    for (const mat of g.materials)
      if (mat.texture >= g.textures.length) throw Error("Doku indeksi bozuk: " + e.key);
    for (const tex of g.textures)
      if (!m.textures.some((t) => t.file === tex.file)) throw Error("Doku manifesti eksik: " + e.key);
    if (g.kind === "car") {
      const tags = g.nodes.map((n) => n.tag);
      for (const name of [
        "interior",
        "steering",
        "speed-needle",
        "rpm-needle",
        ...[0, 1, 2, 3].flatMap((i) => ["wheel-pivot-" + i, "wheel-spin-" + i]),
      ])
        if (!tags.includes(name)) throw Error("Araç bağı eksik: " + e.key + "/" + name);
      if (!g.eye?.every(Number.isFinite) || !g.materials.some((m) => m.mirror))
        throw Error("Göz/ayna eksik: " + e.key);
    }
  }
  for (const t of m.textures)
    if (hash(fs.readFileSync(path.join(out, t.file))) !== t.hash) throw Error("Doku farklı: " + t.file);
  if (m.environment) {
    const b = fs.readFileSync(path.join(out, m.environment.file));
    if (hash(b) !== m.environment.hash) throw Error("Ortam verisi farklı");
    const es = JSON.parse(b).entries;
    if (es.length !== 108 || new Set(es.map((e) => e.theme + "/" + e.time + "/" + e.weather)).size !== 108)
      throw Error("Tema/saat/hava kapsamı eksik");
  }
  for (const [name, sha] of Object.entries(m.sources)) {
    const b = execFileSync(
      "git",
      ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "show", `${baseline}:${name}`],
      { cwd: root },
    );
    if (hash(b) !== sha) throw Error("TS kaynak izi farklı: " + name);
  }
  console.log(
    `Kaynak sunum: ${m.cars.length} araç,${m.worlds.length} dünya,${m.textures.length} doku; kaynak/paket hashleri aynı. Görsel kabul değildir.`,
  );
  process.exit(0);
}
fs.mkdirSync(out, { recursive: true });
const sourceHashes = {},
  cache = new Map();
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, "http://localhost"),
      name = decodeURIComponent(url.pathname);
    if (name === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/three/three.module.js"}}</script>',
      );
      return;
    }
    if (name.startsWith("/three/")) {
      const leaf = name.slice(7);
      if (!["three.module.js", "three.core.js"].includes(leaf)) throw Error("Kütüphane yolu");
      res.setHeader("Content-Type", "text/javascript");
      res.end(fs.readFileSync(path.join(root, "node_modules/three/build", leaf)));
      return;
    }
    if (!name.startsWith("/ts/src/") || !name.endsWith(".js") || name.includes(".."))
      throw Error("Modül yolu");
    const source = name.slice(4, -3) + ".ts";
    if (!cache.has(source)) {
      const b = execFileSync(
        "git",
        ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "show", `${baseline}:${source}`],
        { cwd: root },
      );
      sourceHashes[source] = hash(b);
      let js = ts.transpileModule(b.toString(), {
        compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2020 },
      }).outputText;
      js = js.replace(
        /(from\s*["']|import\s*["'])(\.{1,2}\/[^"']+)(["'])/g,
        (_, pre, spec, post) =>
          pre +
          "/ts/" +
          path.posix.normalize(path.posix.join(path.posix.dirname(source), spec)) +
          ".js" +
          post,
      );
      cache.set(source, js);
    }
    res.setHeader("Content-Type", "text/javascript");
    res.end(cache.get(source));
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e));
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
const manifest = {
  baseline,
  three: JSON.parse(fs.readFileSync(path.join(root, "node_modules/three/package.json"))).version,
  sources: sourceHashes,
  cars: [],
  worlds: [],
  textures: [],
};
const pngs = new Map();
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    let seed = 7;
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    await import("/ts/src/cizim/sahne.js");
    const THREE = await import("three");
    const cars = await import("/ts/src/arac/araclar.js");
    const appearance = await import("/ts/src/arac/gorunumler.js");
    appearance.gorunumUygula(cars.CARS);
    const model = await import("/ts/src/cizim/arac-modeli.js"),
      interior = await import("/ts/src/cizim/kokpit.js"),
      mirrors = await import("/ts/src/cizim/ayna.js"),
      mats = await import("/ts/src/cizim/malzemeler.js");
    globalThis.sourceExport = { THREE, cars: cars.CARS, model, interior, mirrors, mats };
    globalThis.serializeSource = (root, extra) => {
      const s = globalThis.sourceExport,
        geometries = [],
        materials = [],
        textures = [],
        nodes = [],
        gm = new Map(),
        mm = new Map();
      const attr = (g, k) => (g.getAttribute(k) ? Array.from(g.getAttribute(k).array) : []);
      const material = (m) => {
        if (mm.has(m.uuid)) return mm.get(m.uuid);
        const id = materials.length;
        mm.set(m.uuid, id);
        let texture = -1,
          mirror = false;
        if (m.map) {
          mirror = !!m.map.isRenderTargetTexture;
          const im = m.map.image;
          if (im && typeof im.toDataURL === "function") {
            texture = textures.length;
            textures.push({ png: im.toDataURL("image/png") });
          }
        }
        const names = globalThis.worldMaterials;
        const semantic = names ? Object.entries(names).find(([k, v]) => v === m)?.[0] : undefined;
        materials.push({
          name: semantic || m.name || m.type,
          color: m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1],
          opacity: m.opacity ?? 1,
          transparent: !!m.transparent,
          doubleSided: m.side === s.THREE.DoubleSide,
          basic: !!m.isMeshBasicMaterial,
          glass: m === s.mats.glassQM,
          mirror,
          texture,
          repeat: m.map ? [m.map.repeat.x, m.map.repeat.y] : [1, 1],
          offset: m.map ? [m.map.offset.x, m.map.offset.y] : [0, 0],
          repeatWrap: m.map?.wrapS === s.THREE.RepeatWrapping,
        });
        return id;
      };
      const geometry = (g) => {
        if (gm.has(g.uuid)) return gm.get(g.uuid);
        const i = geometries.length;
        gm.set(g.uuid, i);
        geometries.push({
          positions: attr(g, "position"),
          normals: attr(g, "normal"),
          uv: attr(g, "uv"),
          colors: attr(g, "color"),
          indices: g.index
            ? Array.from(g.index.array)
            : Array.from({ length: g.getAttribute("position").count }, (_, i) => i),
          groups: g.groups.map((v) => ({ start: v.start, count: v.count, material: v.materialIndex })),
        });
        return i;
      };
      const visit = (o, parent) => {
        let tag = o.userData.pan ? "panel" : "";
        if (o === s.interior.cock) tag = "interior";
        if (o === s.interior.kokpit.swl) tag = "steering";
        if (o === s.interior.kokpit.ndS) tag = "speed-needle";
        if (o === s.interior.kokpit.ndR) tag = "rpm-needle";
        if (o.userData.fi !== undefined) tag = "wheel-pivot-" + o.userData.fi;
        const wheel = s.model.model.carM?.ws.find((w) => w.w === o);
        if (wheel) tag = "wheel-spin-" + wheel.pv.userData.fi;
        const n = {
          name: o.name || o.type,
          parent,
          tag,
          position: o.position.toArray(),
          rotation: o.quaternion.toArray(),
          scale: o.scale.toArray(),
          visible: o.visible,
          geometry: -1,
          materials: [],
          instances: [],
        };
        if (o.isMesh) {
          n.geometry = geometry(o.geometry);
          n.materials = (Array.isArray(o.material) ? o.material : [o.material]).map(material);
          if (o.isInstancedMesh) {
            const matrix = new s.THREE.Matrix4();
            for (let i = 0; i < o.count; i++) {
              o.getMatrixAt(i, matrix);
              n.instances.push(...matrix.elements);
            }
          }
        }
        const i = nodes.length;
        nodes.push(n);
        for (const c of o.children) if (!c.isLight && !c.isCamera) visit(c, i);
      };
      visit(root, -1);
      return { version: 1, ...extra, nodes, geometries, materials, textures };
    };
  });
  async function saveGraph(g, kind, id, key) {
    for (const t of g.textures) {
      const b = Buffer.from(t.png.split(",")[1], "base64"),
        sha = hash(b);
      const file = "tex-" + sha.slice(0, 20) + ".png";
      if (!pngs.has(file)) {
        pngs.set(file, sha);
        fs.writeFileSync(path.join(out, file), b);
        manifest.textures.push({ file, hash: sha });
      }
      t.file = file;
      delete t.png;
    }
    const file = kind + "-" + key + ".bytes",
      b = gzipSync(Buffer.from(JSON.stringify(g)));
    fs.writeFileSync(path.join(out, file), b);
    const e = {
      id,
      key,
      file,
      hash: hash(b),
      nodes: g.nodes.length,
      geometries: g.geometries.length,
      vertices: g.geometries.reduce((n, g) => n + g.positions.length / 3, 0),
      materials: g.materials.length,
    };
    manifest[kind === "car" ? "cars" : "worlds"].push(e);
    console.log(`${kind} ${key}: ${e.nodes} düğüm/${e.vertices} kaynak köşesi`);
  }
  for (let id = 0; id < 15; id++) {
    const g = await page.evaluate((id) => {
      const s = globalThis.sourceExport,
        c = s.cars[id];
      s.model.aracModeliKur(c);
      s.mirrors.aynaCiz({ shadowMap: { autoUpdate: false }, setRenderTarget() {}, render() {} }, true);
      return globalThis.serializeSource(s.model.car, {
        id,
        key: c.k,
        label: c.n,
        kind: "car",
        eye: s.interior.kokpit.EYE,
        gaugeRpm: s.interior.kokpit.rmx,
        mirrorPosition: s.mirrors.arkaKam.position.toArray(),
        mirrorRotation: s.mirrors.arkaKam.quaternion.toArray(),
        rearCameraFov: 42,
      });
    }, id);
    await saveGraph(g, "car", id, g.key);
  }
  if (process.argv.includes("--worlds")) {
    const ids = await page.evaluate(async () => {
      const d = await import("/ts/src/dunya/dunya.js");
      globalThis.sourceWorld = d;
      const k = await import("/ts/src/dunya/kurucu.js");
      globalThis.worldMaterials = { leaf: k.mT, trunk: k.mK, rock: k.mR, bush: k.mB };
      globalThis.sourceEnv = await import("/ts/src/cizim/ortam.js");
      return d.REG.filter((r) => r !== d.PARK && r !== d.SEHIR).map((r) => ({
        id: r.idx,
        key: r.t + "_" + r.lv,
      }));
    });
    for (const meta of [...ids, { id: -1, key: "hub" }, { id: 40, key: "park" }, { id: 41, key: "city" }]) {
      const g = await page.evaluate((meta) => {
        const d = globalThis.sourceWorld;
        let group, r;
        if (meta.id === -1) {
          d.loadWorld();
          group = d.dunya.g;
        } else {
          r = d.REG.find((r) => r.idx === meta.id);
          d.ensureBuilt(r);
          group = r.g;
        }
        const env = globalThis.sourceEnv;
        Object.assign(env.COND, env.condOf(r?.th));
        env.applyEnv(r?.th || "day");
        const result = globalThis.serializeSource(group, {
          id: meta.id,
          key: meta.key,
          label: r?.n ?? "Çorak Topraklar",
          kind: "world",
          box: r?.box ?? d.HUBB,
        });
        group.visible = false;
        return result;
      }, meta);
      await saveGraph(g, "world", meta.id, meta.key);
    }
  }
  if (process.argv.includes("--worlds")) {
    const environments = await page.evaluate(async () => {
      const d = globalThis.sourceWorld,
        e = globalThis.sourceEnv,
        s = await import("/ts/src/cizim/sahne.js"),
        t = await import("/ts/src/dunya/temalar.js"),
        z = await import("/ts/src/cizim/zemin.js");
      const result = [];
      for (const theme of [...new Set(["day", ...d.REG.map((r) => r.th || "day")])])
        for (const time of ["morning", "noon", "evening", "night"])
          for (const weather of ["sun", "rain", "snow"]) {
            Object.assign(e.COND, { tod: time, wx: weather });
            e.applyEnv(theme);
            const th = t.thOf(theme),
              map = z.ground.material.map;
            result.push({
              theme,
              time,
              weather,
              sky: s.scene.background.toArray(),
              fog: [s.scene.fog.near, s.scene.fog.far],
              skyLight: s.hemi.color.toArray(),
              groundLight: s.hemi.groundColor.toArray(),
              ambient: s.hemi.intensity / s.ISIK,
              sun: s.sun.color.toArray(),
              sunIntensity: s.sun.intensity / s.ISIK,
              leaf: th.leaf,
              trunk: th.trunk,
              rock: th.rock,
              bush: th.bush,
              night: globalThis.sourceExport.model.headL.intensity > 0,
              png: map.image.toDataURL("image/png"),
              repeat: map.repeat.toArray(),
            });
          }
      return result;
    });
    for (const e of environments) {
      const b = Buffer.from(e.png.split(",")[1], "base64"),
        sha = hash(b),
        file = "tex-" + sha.slice(0, 20) + ".png";
      if (!pngs.has(file)) {
        pngs.set(file, sha);
        fs.writeFileSync(path.join(out, file), b);
        manifest.textures.push({ file, hash: sha });
      }
      e.texture = file;
      delete e.png;
    }
    const file = "environments.json",
      b = Buffer.from(JSON.stringify({ entries: environments }));
    fs.writeFileSync(path.join(out, file), b);
    manifest.environment = { file, hash: hash(b), count: environments.length };
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  if (process.argv.includes("--write"))
    for (const name of fs.readdirSync(out).filter((n) => n.endsWith(".png"))) {
      const meta = path.join(out, name + ".meta");
      if (!fs.existsSync(meta))
        fs.writeFileSync(
          meta,
          "fileFormatVersion: 2\nguid: " +
            hash(Buffer.from("SourcePresentation/" + name)).slice(0, 32) +
            "\nTextureImporter:\n  serializedVersion: 13\n  mipmaps:\n    enableMipMap: 1\n  textureSettings:\n    filterMode: 2\n  textureShape: 1\n  textureType: 0\n  maxTextureSize: 2048\n  alphaIsTransparency: 1\n",
        );
    }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
