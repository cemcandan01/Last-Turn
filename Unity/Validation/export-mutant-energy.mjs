// P4 dilim 3: gerçek TS enerjiAdimi; drift gözlemcisi + bekleyen hasar/risk + nitro + skill yakınlık/istek/adım tek sıra uzayında.
// Gerçek kosuBaslat/hasarAl/beceriYarisBasi akışı; dünya callback'leri açık test girdilerinden kurulur.
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
const L = createBaselineLoader({ stubs: true }),
  K = L.load("src/oyun/mutant-kosu"),
  B = L.load("src/cekirdek/beceri"),
  M = L.load("src/cekirdek/mekanikler"),
  R = L.load("src/cekirdek/rastgele");
const Y = L.load("src/oyun/yarislar"),
  tracks = L.load("src/oyun/mutant")
    .mutantPistleri()
    .map((p, i) => ({ ...p, n: Y.TUM_ETKINLIKLER[i].n }));
const copy = (x) =>
  JSON.parse(
    JSON.stringify(x, (k, v) => (typeof v === "number" && !Number.isFinite(v) ? { n: String(v) } : v)),
  );
const DT = 1 / 60,
  skillIds = B.BECERILER.map((t) => t.id),
  passiveIds = [...K.PASIFLER.map((p) => p.id), ...K.EKLENTILER.map((p) => p.id)];
const pick = (r, a) => a[Math.floor(r() * a.length)];
function bind(w) {
  return {
    ...w,
    baglanti: () => w.link ?? null,
    ...(w.corner ? { kose: () => w.corner } : {}),
    ...(w.sky ? { gokBaglanti: () => w.sky } : {}),
  };
}
const state = (k) =>
  copy({
    mek: k.mek,
    gozlem: k.gozlem,
    bec: k.bec,
    becCikti: k.becCikti,
    bekleyenBeceri: k.bekleyenBeceri,
    becEngel: k.becEngel,
    becHedef: k.becHedef,
    bekleyenHasar: k.bekleyenHasar,
    bekleyenRisk: k.bekleyenRisk,
    govde: k.govde,
    carpma: k.carpma,
    spin: k.spin,
    para: k.para,
    pert: k.pert,
    faz: k.faz,
  });
const coverage = {
  nitro: 0,
  powerChanged: 0,
  ghostBlocked: 0,
  damageEvents: 0,
  riskEvents: 0,
  skillEvents: 0,
  raceStarts: 0,
  flight: 0,
  blockers: 0,
  targets: 0,
  nearMiss: 0,
  following: 0,
};
const scenarios = [];
for (let seed = 1; seed <= 36; seed++) {
  const r = R.mulberry32(seed * 65537),
    k = K.kosuBaslat(1000 + seed, tracks, seed % 9 === 0);
  const passiveCount = Math.floor(r() * 5);
  for (let i = 0; i < passiveCount; i++) k.pasifler.push(pick(r, passiveIds));
  const skillCount = seed % 6 === 0 ? 0 : 1 + Math.floor(r() * 3),
    used = new Set();
  for (let i = 0; i < skillCount; i++) {
    const t = pick(r, B.BECERILER);
    if (used.has(t.id)) continue;
    used.add(t.id);
    const evolved = r() < 0.35,
      evrim = evolved ? t.evrimler[0].id : null,
      eklentiler = evolved
        ? B.BECERI_EKLENTILERI.filter((e) => B.eklentiUyar(t, e))
            .slice(0, 1 + Math.floor(r() * 2))
            .map((e) => e.id)
        : [];
    k.beceriler.push({ id: t.id, seviye: 1 + Math.floor(r() * 3), evrim, eklentiler });
  }
  k.mek = M.kapasiteUygula(k.mek, K.takiliMekanikler(k));
  k.mek = { ...k.mek, enerji: Math.floor(r() * k.mek.kapasite) };
  const initial = copy({
      pasifler: k.pasifler,
      beceriler: k.beceriler,
      mek: k.mek,
      gozlem: k.gozlem,
      bec: k.bec,
      govde: k.govde,
      test: k.test,
    }),
    steps = [];
  let x = 0,
    z = 0,
    h = 0,
    y,
    vy,
    drift = false,
    dir = 1;
  const equipped = k.beceriler.map((o) => o.id);
  for (let s = 0; s < 220; s++) {
    const speed = 10 + r() * 40;
    h += (r() - 0.5) * 0.05;
    const vx = Math.sin(h) * speed,
      vz = Math.cos(h) * speed;
    x += vx * DT;
    z += vz * DT;
    if (r() < 0.05) drift = !drift;
    if (r() < 0.02) dir = -dir;
    const air = r() < 0.12;
    if (air) {
      y = 2 + r() * 8;
      vy = (r() - 0.5) * 6;
    } else {
      y = 1;
      vy = 0;
    }
    const d = {
      S: { x, z, h, vx, vz, air },
      DR: { on: drift ? 1 : 0, dir, cool: r() < 0.2 ? 0.4 : 0 },
      D: { beta: drift ? dir * (0.2 + r() * 0.5) : (r() - 0.5) * 0.1 },
    };
    const dt = r() < 0.97 ? DT : pick(r, [0, 1 / 30]),
      nitro = r() < 0.06;
    const racing = s >= 40 && seed % 4 !== 1,
      targets = racing
        ? [
            {
              id: "rakip",
              x: x + (r() - 0.5) * 4,
              z: z + (s % 60 < 30 ? 6 + r() * 4 : -3 - r() * 3),
              h,
              vx,
              vz: vz + (r() - 0.5) * 4,
              y: 1,
              vy: 0,
            },
          ]
        : [];
    if (racing && seed % 3 === 0) targets.push({ id: "ikinci", x: x + 3, z: z + 20, h, vx, vz, y: 1, vy: 0 });
    const w = {
      oyuncu: { x, z, h, vx, vz, y, vy },
      hedefler: targets,
      yarista: racing,
      zemin: 0,
      direksiyon: (r() - 0.5) * 2,
      link: r() < 0.7 ? [x + 3, z + 25] : null,
    };
    if (r() < 0.4) w.corner = { p: [x + 8, z + 12], uc: [x + 8, z + 12] };
    if (r() < 0.3) w.sky = { p: [x, y + 20, z + 20], uc: [x + 12, y + 20, z + 20] };
    if (equipped.includes("volt-kanat") && s % 50 < 20) w.basili = ["volt-kanat"];
    const requests = equipped.filter(() => r() < 0.08);
    if (r() < 0.02) requests.push("yok");
    const obstacles =
      r() < 0.5 ? [{ id: "kaya", x: x + (r() < 0.5 ? 1.2 : 6), z: z + (r() - 0.5) * 2, r: 1 }] : [];
    const hit = r() < 0.02,
      raceStart = s === 40 || r() < 0.005,
      damage = r() < 0.04 ? pick(r, ["carpma", "spin"]) : null,
      risk = r() < 0.015 ? Math.floor(r() * 3) : null;
    if (raceStart) {
      K.beceriYarisBasi(k);
      coverage.raceStarts++;
    }
    const blockedBefore = k.bekleyenBeceri.length;
    if (damage) K.hasarAl(k, damage);
    if (damage && k.bekleyenBeceri.length > blockedBefore) coverage.ghostBlocked++;
    if (risk != null) k.bekleyenRisk = risk;
    coverage.damageEvents += !!k.bekleyenHasar;
    coverage.riskEvents += k.bekleyenRisk != null;
    const changed = K.enerjiAdimi(k, d, dt, nitro, {
      dunya: bind(w),
      istekler: requests,
      engeller: obstacles,
      carpti: hit,
    });
    coverage.nitro += nitro;
    coverage.powerChanged += changed;
    coverage.skillEvents += k.bekleyenBeceri.length;
    coverage.flight += !!k.becCikti?.ucus;
    coverage.blockers += Object.values(k.becEngel).filter((v) => v != null).length;
    coverage.targets += Object.values(k.becHedef).filter((v) => v != null).length;
    coverage.nearMiss += k.bec.sonNearMiss ? Object.keys(k.bec.sonNearMiss).length : 0;
    coverage.following += k.bec.takipKredi ? Object.keys(k.bec.takipKredi).length : 0;
    steps.push({
      d,
      dt,
      nitro,
      world: w,
      requests,
      obstacles,
      hit,
      raceStart,
      damage,
      risk,
      changed,
      expected: state(k),
      hud: copy(K.beceriGorunumu(k)),
      nitroHud: copy(K.nitroDurumu(k)),
    });
  }
  scenarios.push({ seed: 1000 + seed, initial, steps });
}
for (const [key, value] of Object.entries(coverage))
  if (value === 0) throw Error("Enerji oracle kapsamı boş: " + key);
const output = JSON.stringify({ baseline, sources: L.sources, coverage, scenarios }) + "\n",
  target = path.join(root, "Unity/Validation/Reference/mutant-energy-0.8.18.json");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output) throw Error("Enerji oracle güncel değil");
} else fs.writeFileSync(target, output);
console.log(
  `Mutant enerji TS: ${scenarios.length} koşu/${scenarios.reduce((n, s) => n + s.steps.length, 0)} enerji adımı; ${JSON.stringify(coverage)}.`,
);
