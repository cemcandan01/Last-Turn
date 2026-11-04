// TS 0.8.18 saf yarış kuralları oracle'ı: yaris-kurallari (drift/bonus/ters), piste-donus (pist konumu, pist dışı,
// kesme), yildiz (eşik/sayım). TS birim test senaryoları + tohumlu rastgele izler; girdiler ve her adımın TS durumu yazılır.
// Kullanım: node Unity/Validation/export-race-rules.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";
import { checkComposition, regionTrack } from "./export-tracks.mjs";

const DT = 1 / 60;

// Deterministik rastgele (mulberry32); girdiler dosyaya yazıldığı için C# tarafı aynısını üretmek zorunda değil.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildRaceRules() {
  const loader = createBaselineLoader(),
    { load } = loader;
  const composition = checkComposition(loader);
  const R = load("src/oyun/yaris-kurallari"),
    D = load("src/oyun/piste-donus"),
    Y = load("src/oyun/yildiz"),
    P = load("src/dunya/pist"),
    defs = load("src/dunya/pist-tanimlari");

  const constants = {
    bonus: R.DRIFT_BONUS,
    direksiyonOlu: R.DIREKSIYON_OLU,
    yanAci: R.YAN_ACI,
    azamiAci: R.DRIFT_AZAMI_ACI,
    asgariAci: R.DRIFT_ASGARI_ACI,
    hizAlt: R.DRIFT_HIZ_ALT,
    hizTam: R.DRIFT_HIZ_TAM,
    gecisSure: R.GECIS_SURE,
    gecisKayma: R.GECIS_KAYMA,
    x6Oran: R.X6_ORAN,
    x6Carpan: R.X6_CARPAN,
    pistDisiBekleme: D.PIST_DISI_BEKLEME,
    pistDisiSayim: D.PIST_DISI_SAYIM,
    kesme: D.KESME,
    kw: P.KW,
    driftTur: Y.DRIFT_TUR,
    turAnahtari: Y.TUR_ANAHTARI,
    driftRekorOnEki: Y.DRIFT_REKOR_ON_EKI,
  };

  // --- drift: her adım [act, beta, lost, v, ters, dt, tg, zaman, x6] ya da "bank"; sonrasında tam durum ---
  const driftState = (E) => [
    E.score,
    E.combo,
    E.ct,
    E.mult,
    E.gap,
    E.best,
    E.bonus,
    E.uzunT,
    E.dirT,
    E.yanT,
    E.yan,
  ];
  const driftRun = (name, steps) => {
    const E = R.bosDriftSayaci(),
      out = [];
    for (const s of steps) {
      if (s == "bank") out.push(["bank", R.driftBankala(E), driftState(E)]);
      else {
        const r = R.driftAdimi(E, ...s);
        out.push([s, r.olay, r.p, driftState(E)]);
      }
    }
    return { name, steps: out, events: E.driftOlay.map((o) => [o.ad, o.puan, o.t]) };
  };
  const rep = (n, f) => Array.from({ length: n }, (_, k) => f(k));
  const drift = [
    // yildiz.test.ts senaryoları (adım girdileri birebir)
    driftRun(
      "asgari açı 0,01",
      rep(30, () => [true, 0.01, false, 20, false, DT]),
    ),
    driftRun(
      "asgari açı 10°",
      rep(30, () => [true, (10 * Math.PI) / 180, false, 20, false, DT]),
    ),
    driftRun("geçiş", [
      ...rep(30, () => [true, 0.4, false, 20, false, DT]),
      ...rep(41, () => [false, 0.2, false, 20, false, DT]),
    ]),
    driftRun("x6", [[true, 0.5, false, 20, false, DT, 0.5, 0, true]]),
    driftRun("x6 yok", [[true, 0.5, false, 20, false, DT]]),
    driftRun("ters kombo", [
      ...rep(120, () => [true, 0.5, false, 15, true, DT]),
      ...rep(120, () => [true, 0.5, false, 15, false, DT]),
    ]),
    ...[
      [0.65, 30],
      [0.65, 20],
      [0.3, 20],
      [0.2, 12],
      [0.65, 3],
      [0.9, 25],
      [0.5, 25],
      [Math.PI / 3, 25],
      [1.3, 25],
      [1.4, 25],
      [1.1, 25],
      [0.6, 25],
    ].map(([b, v]) =>
      driftRun(
        `puan hızı ${b}/${v}`,
        rep(60, () => [true, b, false, v, false, DT]),
      ),
    ),
    driftRun(
      "bonus 5,5 sn",
      rep(330, (k) => [true, 0.5, false, 25, false, DT, 0.8, k * DT]),
    ),
    driftRun(
      "bonus 2,9 sn",
      rep(174, (k) => [true, 0.5, false, 25, false, DT, 0.8, k * DT]),
    ),
    driftRun(
      "direksiyonsuz 3,5 sn",
      rep(210, (k) => [true, 0.5, false, 25, false, DT, 0, k * DT]),
    ),
    driftRun(
      "taraf değişimi",
      rep(300, (k) => [true, k * DT < 1.5 ? 0.5 : -0.5, false, 25, false, DT, 0.8, k * DT]),
    ),
    driftRun("bonus bank", [...rep(192, (k) => [true, 0.5, false, 25, false, DT, 0.8, k * DT]), "bank"]),
    driftRun("bonus yanar", [
      ...rep(192, (k) => [true, 0.5, false, 25, false, DT, 0.8, k * DT]),
      [true, 0.5, true, 25, false, DT, 0.8, 3],
    ]),
    driftRun(
      "ters bonus yok",
      rep(180, (k) => [true, 0.5, false, 25, true, DT, 0, k * DT]),
    ),
  ];
  // Tohumlu rastgele izler: drift aç/kapa, β yürüyüşü ve işaret değişimi, nadir yanma, hız 0-40, ters, dt 1/60-1/30.
  for (const seed of [11, 22, 33, 44, 55, 66]) {
    const r = rng(seed),
      steps = [];
    let act = false,
      beta = 0,
      v = 15,
      ters = false,
      t = 0;
    for (let k = 0; k < 1000; k++) {
      if (r() < 0.04) act = !act;
      if (r() < 0.01) ters = !ters;
      beta += (r() - 0.5) * 0.12;
      if (r() < 0.01) beta = -beta;
      beta = Math.max(-1.6, Math.min(1.6, beta));
      v = Math.max(0, Math.min(40, v + (r() - 0.5) * 2));
      const dt = r() < 0.9 ? DT : 1 / 30;
      t += dt;
      if (r() < 0.004) steps.push("bank");
      else
        steps.push([
          act,
          beta,
          r() < 0.004,
          v,
          ters,
          dt,
          r() < 0.3 ? (r() - 0.5) * 0.15 : r() * 2 - 1,
          t,
          seed == 66,
        ]);
    }
    drift.push(driftRun("rastgele " + seed, steps));
  }

  // --- ters sürüş: sentetik hız izi [vx, vz, tx, tz, dt] → [dönen, ters, tersT] ---
  const tersRun = (name, steps) => {
    const E = { ters: false, tersT: 0 };
    return { name, steps: steps.map((s) => [s, R.tersAdimi(E, ...s), E.ters, E.tersT]) };
  };
  const wrong = [
    tersRun("ters hızlanma 2,5 sn sonra doğru 2 sn", [
      ...rep(150, (k) => [0, -Math.min(20, k * 0.2), 0, 1, DT]),
      ...rep(120, (k) => [0, Math.min(20, k * 0.25), 0, 1, DT]),
    ]),
    tersRun("yavaş araç durumu korur", [
      ...rep(80, () => [0, -10, 0, 1, DT]),
      ...rep(80, () => [0, 2.9, 0, 1, DT]),
    ]),
    tersRun(
      "spin",
      rep(240, (k) => [12 * Math.sin(k * 0.08), 12 * Math.cos(k * 0.08), 0.6, 0.8, DT]),
    ),
  ];
  for (const seed of [7, 8, 9]) {
    const r = rng(seed);
    let h = 0;
    wrong.push(
      tersRun(
        "rastgele " + seed,
        rep(900, () => {
          h += (r() - 0.5) * 0.3;
          const sp = r() * 25;
          return [sp * Math.sin(h), sp * Math.cos(h), Math.sin(0.3), Math.cos(0.3), r() < 0.8 ? DT : 1 / 30];
        }),
      ),
    );
  }

  // --- pist konumu / pist dışı / kesme: sentetik pistler (TS birim testlerindeki) + gerçek pistler ---
  const geom = (TR) => ({
    N: TR.N,
    len: TR.len,
    hw: TR.hw,
    open: TR.open,
    kerbs: !!TR.kb,
    P: TR.P.flat(),
    T: TR.T.flat(),
    S: TR.S,
  });
  const straight = P.mkTrack(
    [
      [0, 0],
      [0, 120],
    ],
    5,
    true,
  );
  const straightKerb = P.mkTrack(
    [
      [0, 0],
      [0, 120],
    ],
    5,
    true,
  );
  straightKerb.kb = straightKerb.P.map(() => true);
  const kose = [
    [0, 0],
    [0, 100],
    [100, 100],
    [100, 0],
  ];
  const square = P.mkTrack(
    kose.flatMap(([x, z], i) => {
      const [nx, nz] = kose[(i + 1) % 4];
      return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => [x + ((nx - x) * t) / 10, z + ((nz - z) * t) / 10]);
    }),
    5,
    false,
  );
  const box = P.mkTrack(
    [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
    5,
    false,
  );
  const synthetic = { straight, straightKerb, square, box };
  const real = {};
  for (const key of ["gp_1", "dp_1", "rx_1", "rl_1", "dg_1", "gp_3"]) {
    const k = defs.TDEF.findIndex((d) => d.t + "_" + d.lv == key),
      { def, TR } = regionTrack(P, defs, k);
    if (def.t == "gp" || def.t == "dp") P.kerbs(TR);
    real[key] = TR;
  }
  const track = (name) => synthetic[name] ?? real[name];
  const loc = (p) => [p.uzaklik, p.nokta.x, p.nokta.z, p.nokta.h, p.ilerleme];
  const offRun = (name, trackName, steps) => {
    const TR = track(trackName),
      s = D.bosPistDisi();
    return {
      name,
      track: trackName,
      steps: steps.map(([x, z, hint, dt]) => {
        const p = D.pistKonumu(TR, x, z, hint),
          r = D.pistDisiAdimi(s, TR, x, z, hint, dt);
        return [
          [x, z, hint, dt],
          loc(p),
          r ? [r.x, r.z, r.h] : null,
          s.sure,
          s.ilk ? [s.ilk.x, s.ilk.z, s.ilk.h] : null,
        ];
      }),
    };
  };
  const cutRun = (name, trackName, steps) => {
    const TR = track(trackName),
      k = D.bosKesme();
    return {
      name,
      track: trackName,
      steps: steps.map(([x, z, hint]) => [
        [x, z, hint],
        D.kesmeAdimi(k, TR, x, z, hint),
        k.cikis,
        k.yol,
        k.px,
        k.pz,
      ]),
    };
  };
  // kesme.test.ts / piste-donus.test.ts yolları: (x0,z0)→(x1,z1) 1 m adımlarla
  const walk = (yol, hint = 0) => {
    const out = [];
    for (let i = 0; i + 1 < yol.length; i++) {
      const [ax, az] = yol[i],
        [bx, bz] = yol[i + 1],
        n = Math.ceil(Math.hypot(bx - ax, bz - az));
      for (let j = 0; j <= n; j++) out.push([ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n, hint]);
    }
    return out;
  };
  const off = [
    offRun("1+5 sn sınırı", "straight", [...rep(360, (i) => [8, 21 + i / 10, 5, DT]), [20, 90, 20, DT]]),
    offRun("erken dönüş ve yeni çıkış", "straight", [
      [8, 20, 5, 4.9],
      [5, 40, 10, 0.1],
      [-8, 60, 15, 4],
      [-8, 65, 15, 1.9],
      [-8, 70, 15, 0.2],
    ]),
    offRun("kerb içi", "straightKerb", [[5 + P.KW - 0.05, 40, 10, 7]]),
    offRun("kerb dışı", "straightKerb", [[5 + P.KW + 0.05, 40, 10, 7]]),
    offRun("örnek arası kenar", "straight", [[5, 21.37, 5, 7]]),
    offRun("örnek arası kenar dışı", "straight", [[5.01, 21.37, 5, 7]]),
    offRun("kapalı birleşim", "box", [[-1, -1, 0, DT]]),
    offRun("açık uçlar", "straight", [
      [0, -10, 0, DT],
      [0, 130, 0, DT],
    ]),
  ];
  const cut = [
    cutRun(
      "çaprazdan kısa yol",
      "square",
      walk([
        [0, 30],
        [0, 50],
        [50, 100],
        [70, 100],
      ]),
    ),
    cutRun(
      "dışarıdan dolaşmak",
      "square",
      walk([
        [0, 80],
        [-12, 95],
        [-12, 112],
        [5, 112],
        [20, 100],
      ]),
    ),
    cutRun(
      "paralel gitmek",
      "square",
      walk([
        [0, 30],
        [7, 40],
        [7, 60],
        [0, 70],
      ]),
    ),
    cutRun(
      "geri dönmek",
      "square",
      walk([
        [0, 60],
        [-15, 50],
        [0, 30],
      ]),
    ),
  ];
  // Kesme 15 m alt sınırı: kare pistin (0,100) köşesinde iç sahadan kısa yol; yol ortası köşeye doğru b kadar
  // şişirilir (dış yol uzar, kazanç azalır). TS kararının değiştiği b ikili aramayla bulunur; iki yanı yazılır.
  const cornerPath = (a, b) => {
    const m = [a / 2 - b / Math.SQRT2, 100 - a / 2 + b / Math.SQRT2],
      yol = [[0, 60], [0, 100 - a], m, [a, 100], [a + 20, 100]],
      out = [];
    for (let i = 0; i + 1 < yol.length; i++) {
      const [ax, az] = yol[i],
        [bx, bz] = yol[i + 1],
        n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
      for (let j = 0; j <= n; j++) out.push([ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n, 0]);
    }
    return out;
  };
  const cutOf = (steps) => {
    const k = D.bosKesme();
    let top = 0;
    for (const [x, z, h] of steps) top += D.kesmeAdimi(k, square, x, z, h);
    return top;
  };
  for (const a of [24, 30]) {
    let lo = 0,
      hi = a;
    if (!(cutOf(cornerPath(a, lo)) > 0 && cutOf(cornerPath(a, hi)) == 0))
      throw new Error("kesme sınırı bulunamadı " + a);
    for (let n = 0; n < 40; n++) {
      const mid = (lo + hi) / 2;
      if (cutOf(cornerPath(a, mid)) > 0) lo = mid;
      else hi = mid;
    }
    for (const b of [lo - 0.05, lo, hi, hi + 0.05])
      cut.push(cutRun(`15 m sınırı a=${a} b=${b.toFixed(6)}`, "square", cornerPath(a, b)));
  }
  // Kesme 10 m kazanç toleransı: pistten dik çıkış (0,30)→(8,30) ve dik dönüş (70,92)→(70,100) sabit; atlanan
  // pist mesafesi ~140 m sabit kalır, yalnız iç sahadaki yol ortası köşeye doğru b kadar şişer.
  const innerPath = (b) => {
    const yol = [
        [0, 30],
        [8, 30],
        [39 - b / Math.SQRT2, 61 + b / Math.SQRT2],
        [70, 92],
        [70, 100],
        [90, 100],
      ],
      out = [];
    for (let i = 0; i + 1 < yol.length; i++) {
      const [ax, az] = yol[i],
        [bx, bz] = yol[i + 1],
        n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
      for (let j = 0; j <= n; j++) out.push([ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n, 0]);
    }
    return out;
  };
  {
    let lo = 0,
      hi = 120;
    if (!(cutOf(innerPath(lo)) > 0 && cutOf(innerPath(hi)) == 0)) throw new Error("kazanç sınırı bulunamadı");
    for (let n = 0; n < 40; n++) {
      const mid = (lo + hi) / 2;
      if (cutOf(innerPath(mid)) > 0) lo = mid;
      else hi = mid;
    }
    for (const b of [lo - 0.05, lo, hi, hi + 0.05])
      cut.push(cutRun(`kazanç sınırı b=${b.toFixed(6)}`, "square", innerPath(b)));
  }
  // kesme.test.ts: gerçek gp pistlerinde iç sahadan kısa yol (aynı arama)
  for (const key of ["gp_1", "gp_3"]) {
    const TR = real[key];
    search: for (let a = 0; a < TR.N; a += 5)
      for (let b = a + 1; b < TR.N; b++) {
        const ds = TR.S[b] - TR.S[a];
        if (ds < 150) continue;
        if (ds > 260) break;
        const [ax, az] = TR.P[a],
          [bx, bz] = TR.P[b],
          L = Math.hypot(bx - ax, bz - az);
        if (L > 60) continue;
        const steps = [];
        for (let t = 0; t <= L; t += 0.5) steps.push([ax + ((bx - ax) * t) / L, az + ((bz - az) * t) / L, a]);
        cut.push(cutRun(key + " iç saha " + a + "→" + b + " (" + ds.toFixed(1) + " m)", key, steps));
        break search;
      }
  }
  // Gerçek pistlerde rastgele araç yürüyüşü: pist boyunca ilerleyip kenardan taşar, kestirir, geri döner.
  // İpucu her adımda TS'deki gibi önceki en yakın noktadır (ipucu.ti).
  for (const [key, seed] of [
    ["gp_1", 101],
    ["dp_1", 102],
    ["rx_1", 103],
    ["rl_1", 104],
    ["dg_1", 105],
  ]) {
    const TR = real[key],
      r = rng(seed),
      steps = [];
    let s = 0,
      lat = 0,
      hint = 0,
      chord = null,
      hold = 0;
    for (let k = 0; k < 1600; k++) {
      let x, z;
      if (chord) {
        // kestirme: bulunduğu yerden ilerideki pist noktasına düz çizgi
        chord.t = Math.min(1, chord.t + 0.8 / chord.L);
        x = chord.ax + (chord.bx - chord.ax) * chord.t;
        z = chord.az + (chord.bz - chord.az) * chord.t;
        if (chord.t >= 1) {
          s = chord.s;
          lat = 0;
          chord = null;
        }
      } else {
        s += 0.4 + r() * 0.6;
        // pist dışında bekleme (≈7 sn): piste dönüş sayacı dolar
        if (hold > 0) hold--;
        else lat += (r() - 0.5) * 1.2 - lat * 0.02;
        if (!hold && r() < 0.003) {
          hold = 420;
          lat = (r() < 0.5 ? -1 : 1) * (TR.hw + 12);
        }
        if (r() < 0.004) lat += (r() - 0.5) * 50;
        const b = P.trackAt(TR, s);
        x = b.x + Math.cos(b.a) * lat;
        z = b.z - Math.sin(b.a) * lat;
        if (r() < 0.006) {
          const ileri = 60 + r() * 160,
            e = P.trackAt(TR, s + ileri);
          chord = {
            ax: x,
            az: z,
            bx: e.x,
            bz: e.z,
            t: 0,
            s: s + ileri,
            L: Math.hypot(e.x - x, e.z - z) || 1,
          };
        }
      }
      steps.push([x, z, hint, r() < 0.9 ? DT : 1 / 30]);
      hint = P.nearest(TR, x, z, hint)[0];
    }
    off.push(offRun("rastgele " + key, key, steps));
    cut.push(
      cutRun(
        "rastgele " + key,
        key,
        steps.map(([x, z, h]) => [x, z, h]),
      ),
    );
  }

  // --- yıldız: 40 pistin eşikleri ve sınır sayımları ---
  const stars = defs.TDEF.map((d) => {
    const e = Y.yildizEsikleri(d.t, d.lv),
      values = [0, ...e.flatMap((x) => [x - 1e-9, x, x + 1e-9]), e.length ? e[0] * 2 : 1];
    return {
      key: d.t + "_" + d.lv,
      anahtar: Y.yildizAnahtari(d.t, d.lv),
      esik: e,
      say: values.map((v) => [v, Y.yildizSay(d.t, v, e)]),
    };
  });
  const starUnit = [
    ["gp", 100, [120, 110, 102]],
    ["gp", 105, [120, 110, 102]],
    ["gp", 119, [120, 110, 102]],
    ["gp", 130, [120, 110, 102]],
    ["dp", 9000, [3000, 6000, 8000]],
    ["dp", 4000, [3000, 6000, 8000]],
    ["dp", 0, [0, 6000, 8000]],
  ].map(([t, v, e]) => [t, v, e, Y.yildizSay(t, v, e)]);

  const sources = Object.fromEntries(Object.entries(loader.sources).sort(([a], [b]) => a.localeCompare(b)));
  return {
    baseline,
    generator: "Unity/Validation/export-race-rules.mjs",
    sources,
    composition,
    constants,
    tracks: Object.fromEntries(Object.entries(synthetic).map(([k, TR]) => [k, geom(TR)])),
    drift,
    wrong,
    off,
    cut,
    stars,
    starUnit,
  };
}

export function main() {
  const value = buildRaceRules(),
    target = path.join(root, "Unity/Validation/Reference/race-rules-0.8.18.json"),
    output = JSON.stringify(value) + "\n";
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) {
      console.error("Güncel değil: race-rules-0.8.18.json");
      process.exit(1);
    }
  } else fs.writeFileSync(target, output);
  const n = (list) => list.reduce((a, x) => a + x.steps.length, 0),
    cuts = value.cut.reduce((a, c) => a + c.steps.filter((s) => s[1] > 0).length, 0),
    returns = value.off.reduce((a, c) => a + c.steps.filter((s) => s[2]).length, 0);
  console.log(
    `${process.argv.includes("--check") ? "Doğrulandı" : "Yazıldı"}: drift ${value.drift.length} senaryo/${n(value.drift)} adım, ` +
      `ters ${n(value.wrong)} adım, pist dışı ${n(value.off)} adım (${returns} dönüş), kesme ${n(value.cut)} adım (${cuts} kesme), ` +
      `yıldız ${value.stars.length} pist; kaynak ${Object.keys(value.sources).length} dosya.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
