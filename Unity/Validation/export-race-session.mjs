// TS 0.8.18 yarış oturumu oracle'ı: EVENTS/TYP verisi (Resources/race-events.json), bölge dünyası (Hw/surfW + ipucu)
// ve yarış durum makinesi (startEvent → geri sayım → evTick → endEvent → yarisBitti) sentetik araç izleriyle.
// TS bölge/yarış dosyaları THREE/DOM'a bağlı olduğu için yükleyicinin taklit modu kullanılır; görsel kurulum yapılmaz,
// fonksiyonlar TS kaynağının kendisidir. Kullanım: node Unity/Validation/export-race-session.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { baseline, createBaselineLoader, root } from "./export-catalog.mjs";

const DT = 1 / 60;

export function buildRaceSession() {
  const L = createBaselineLoader({ stubs: true, extraExports: { "src/oyun/surus.ts": ["surusKurulumu"] } }),
    { load } = L;
  const Y = load("src/oyun/yarislar"),
    S = load("src/oyun/surus"),
    P = load("src/dunya/pist"),
    W = load("src/dunya/dunya"),
    B = load("src/arayuz/bildirim"),
    O = load("src/fizik/ortak"),
    K = load("src/oyun/kariyer"),
    I = load("src/oyun/ilerleme");
  // Bildirimler (note) yakalanır: arayüz metinleri yarış olaylarının TS karşılığıdır.
  let notes = [];
  B.note = (t) => notes.push(t);

  const types = Object.fromEntries(
    Object.entries(Y.TYP).map(([k, t]) => [k, { k: t.k, pk: t.pk, laps: t.laps ?? 0, v: t.v ?? 0, n: t.n, d: t.d }]),
  );
  const events = Y.EVENTS.map((e, i) => ({
    i,
    k: e.k,
    ty: e.ty,
    lv: e.lv,
    sev: e.sev,
    n: e.n,
    d: e.d,
    reg: e.reg,
    pk: e.pk,
    laps: e.laps ?? 0,
    limit: e.limit,
    ys: e.ys,
    g: e.g.slice(1),
  }));

  // --- bölge dünyası: fizik adımındaki sıra (4 teker yüzeyi, sonra merkez; sonra yükseklikler) ---
  const world = [];
  for (const [key, seed] of [
    ["gp_1", 7],
    ["dp_1", 8],
  ]) {
    const k = events.findIndex((e) => e.ty + "_" + e.lv == key),
      TR = W.REG[k].TR;
    let a = seed >>> 0;
    const r = () => ((a = (Math.imul(a, 1664525) + 1013904223) >>> 0), a / 4294967296);
    let s = 0,
      lat = 0;
    P.ipucu.ti = P.nearest(TR, TR.P[0][0], TR.P[0][1], 0, true)[0];
    const rows = [[P.ipucu.ti]];
    for (let n = 0; n < 1500; n++) {
      s += 1 + r() * 3;
      lat += (r() - 0.5) * 4 - lat * 0.01;
      if (r() < 0.01) lat = (r() - 0.5) * 380; // bölge kutusu dışına da çıkar (±150 m pay)
      const b = P.trackAt(TR, s),
        x = b.x + Math.cos(b.a) * lat,
        z = b.z - Math.sin(b.a) * lat,
        h = b.a + (r() - 0.5);
      const pts = [
        [0.8, 1.3],
        [-0.8, 1.3],
        [0.8, -1.3],
        [-0.8, -1.3],
        [0, 0],
      ].map(([px, pz]) => [x + px * Math.cos(h) + pz * Math.sin(h), z - px * Math.sin(h) + pz * Math.cos(h)]);
      const surf = pts.map(([px, pz]) => W.surfW(px, pz)),
        ti = P.ipucu.ti,
        H = pts.map(([px, pz]) => W.Hw(px, pz));
      rows.push([x, z, h, surf, ti, H]);
    }
    world.push({ key, rows });
  }

  // --- yarış oturumu ---
  const scenarios = [];
  const snap = (EV) => [
    EV.t,
    EV.lap,
    EV.armed,
    EV.prev,
    EV.bestLap,
    EV.lapStart,
    EV.ters ? 1 : 0,
    EV.tersT,
    EV.pistDisi.sure,
    EV.kesme.cikis,
    EV.kesme.yol,
    EV.score,
    EV.combo,
    EV.mult,
    EV.driftOran,
    EV.driftMesafe,
    EV.x6 ? 1 : 0,
    EV.driftCarpan,
  ];
  /**
   * script(step, ctx) → { s?, lat?, v, x?, z?, vx?, vz?, act?, beta? } konum: pist boyunca s ve yanal lat (ya da
   * doğrudan x,z); hız vektörü pist yönünde v (negatif: ters). Işınlanınca ctx.s/lat dönüş noktasına alınır.
   */
  const run = (name, key, car, script, maxSteps) => {
    const i = events.findIndex((e) => e.ty + "_" + e.lv == key);
    notes = [];
    if (!Y.startEvent(i, car)) throw new Error("başlamadı " + name);
    const EV = Y.yaris.EV,
      TR = EV.TR,
      prog0 = I.ilerlemeVerisi();
    const out = {
      name,
      key,
      event: i,
      car,
      k: EV.k,
      career: EV.kariyer,
      startHint: P.ipucu.ti,
      countdown: 0,
      steps: [],
      before: { xp: prog0.xp, kazanilan: prog0.kazanilan },
    };
    while (EV.state == "count") {
      EV.cd -= DT;
      out.countdown++;
      if (EV.cd <= 0) {
        EV.state = "run";
        notes.push("BAŞLA!");
      }
    }
    out.startNotes = notes;
    notes = [];
    const azami = O.driftYarisProfili(S.surusKurulumu()).azami + 0.12;
    const ctx = { s: P.trackAt(TR, TR.S[EV.prev]).x == undefined ? 0 : TR.S[EV.prev], lat: 0, n: 0 };
    ctx.s = TR.open ? 0 : TR.S[EV.prev];
    for (let n = 0; n < maxSteps && EV.state == "run"; n++) {
      ctx.n = n;
      const c = script(n, ctx);
      let x, z, a;
      if (c.x != null) {
        x = c.x;
        z = c.z;
        a = c.a ?? 0;
      } else {
        ctx.s += (c.v ?? 0) * DT;
        if (c.lat != null) ctx.lat = c.lat;
        const b = P.trackAt(TR, ctx.s);
        x = b.x + Math.cos(b.a) * ctx.lat;
        z = b.z - Math.sin(b.a) * ctx.lat;
        a = b.a;
      }
      const v = c.v ?? 0,
        vx = c.vx ?? Math.sin(a) * v,
        vz = c.vz ?? Math.cos(a) * v;
      Object.assign(S.sim.S, { x, z, vx, vz, hit: -10 });
      // fizik adımının son yüzey sorgusu araç merkezidir (model.ts): ipucu oradan
      P.ipucu.ti = P.nearest(TR, x, z, P.ipucu.ti)[0];
      const ti = P.ipucu.ti;
      // TS surusAdimi: her adımda yerel.cx.kurulum yenilenir (drift yarışında açı sınırı buradan).
      S.yerel.cx.kurulum = S.surusKurulumu();
      S.sim.d.D = { act: !!c.act, beta: c.beta ?? 0 };
      S.sim.d.zaman = (S.sim.d.zaman || 0) + DT;
      const o = { v: Math.abs(v), cimTeker: c.grass ?? 0 };
      Y.evTick(DT, o, c.tg ?? 0.5);
      const moved = S.sim.S.x !== x || S.sim.S.z !== z,
        st = snap(EV),
        sig = [st[1], st[2], st[6], st[8] > 0, st[9] != null, EV.state].join();
      // Ara durum: her 30 adımda, değişimde, olayda ve drift yarışında her adımda (dosya boyutu)
      const full = key.startsWith("dp") || n % 30 == 0 || sig != ctx.sig || notes.length || moved || EV.state != "run";
      ctx.sig = sig;
      const input = key.startsWith("dp")
          ? [x, z, vx, vz, Math.abs(v), c.act ? 1 : 0, c.beta ?? 0, c.grass ?? 0, c.tg ?? 0.5, S.sim.d.zaman]
          : [x, z, vx, vz, Math.abs(v)],
        row = [input, ti, full ? st : null];
      if (notes.length) row.push(notes), (notes = []);
      if (moved) {
        row.push({ teleport: [S.sim.S.x, S.sim.S.z, S.sim.S.h], hint: P.ipucu.ti });
        // ışınlanma: araç dönüş noktasından devam eder
        ctx.s = P.parcayaIzdusum(TR, S.sim.S.x, S.sim.S.z, P.ipucu.ti)[0];
        if (!TR.open) ctx.s = ctx.s;
        ctx.lat = 0;
        ctx.teleported = (ctx.teleported || 0) + 1;
      }
      out.steps.push(row);
    }
    const prog = I.ilerlemeVerisi();
    Object.assign(out, {
      state: EV.state,
      driftLimit: azami,
      result: { t: EV.t, bestLap: EV.bestLap, lap: EV.lap, score: EV.score, yildiz: EV.yildiz, xp: EV.xp, para: EV.para, trap: EV.trap ?? null },
      after: { xp: prog.xp, kazanilan: prog.kazanilan, yildiz: prog.yildiz },
      finalNotes: notes,
    });
    notes = [];
    if (EV.state != "done") throw new Error("bitmedi " + name + " " + EV.lap + " " + EV.t);
    Y.leaveEvent();
    return out;
  };

  const rule = (key) => K.kariyerKurali(key.split("_")[0], +key.split("_")[1]).arac;
  const gp = rule("gp_1");
  // 1) temiz 3 tur, 42 m/s (3 yıldız)
  scenarios.push(run("gp_1 temiz 3 tur", "gp_1", gp, () => ({ v: 42, lat: 0 }), 20000));
  // 2) aynı pist, daha yavaş: 2 yıldız; ödül önceki en iyi 3 yıldıza göre (yarisBitti)
  scenarios.push(run("gp_1 2 yıldız (önceki 3)", "gp_1", gp, () => ({ v: 33.5, lat: 1.5 }), 20000));
  // 3) pist dışı: 300 m'de kenardan 25 m dışarı, yavaşla, 1+5 sn sonra piste dönüş; sonra 3 tur
  scenarios.push(
    run(
      "gp_1 pist dışı ve dönüş",
      "gp_1",
      gp,
      (n, c) => (!c.teleported && c.s > 300 ? { v: 2, lat: 25 + 12 } : { v: 40, lat: c.s > 280 && !c.teleported ? 6 : 0 }),
      20000,
    ),
  );
  // 4) kesme: ilk virajı iç sahadan kestir (düz çizgi), ceza yok yalnız bildirim
  {
    const i = 0,
      TR = W.REG[i].TR;
    // gp_1 tarifi "D250 L80/90 …": ilk sol virajın (S 250–376 m) içinden düz kestirme S 230 → 395 m
    const A = TR.S.findIndex((q) => q >= 230),
      Bp = TR.S.findIndex((q) => q >= 395),
      D2 = load("src/oyun/piste-donus");
    let dis = 0;
    for (let t = 0; t <= 1; t += 0.01)
      dis = Math.max(dis, D2.pistKonumu(TR, TR.P[A][0] + (TR.P[Bp][0] - TR.P[A][0]) * t, TR.P[A][1] + (TR.P[Bp][1] - TR.P[A][1]) * t, A).uzaklik);
    if (!(dis > D2.pistKenari(TR) + 5)) throw new Error("kestirme pist dışına çıkmıyor: " + dis);
    let chord = null;
    scenarios.push(
      run(
        "gp_1 kesme",
        "gp_1",
        gp,
        (n, c) => {
          // tek seferlik kestirme: virajın başında düz çizgiye geç, bitince pistte S[B]'den devam
          if (chord && !chord.done) {
            chord.t += (40 * DT) / chord.L;
            if (chord.t >= 1) {
              chord.done = true;
              c.s = c.s - (((c.s % TR.len) + TR.len) % TR.len) + TR.S[Bp] - 40 * DT;
              return { v: 40, lat: 0 };
            }
            const x = TR.P[A][0] + (TR.P[Bp][0] - TR.P[A][0]) * chord.t,
              z = TR.P[A][1] + (TR.P[Bp][1] - TR.P[A][1]) * chord.t,
              a = Math.atan2(TR.P[Bp][0] - TR.P[A][0], TR.P[Bp][1] - TR.P[A][1]);
            return { x, z, a, v: 40 };
          }
          const sm = ((c.s % TR.len) + TR.len) % TR.len;
          if (!chord && sm >= TR.S[A] && sm < TR.S[A] + 40) chord = { t: 0, L: Math.hypot(TR.P[Bp][0] - TR.P[A][0], TR.P[Bp][1] - TR.P[A][1]) };
          return { v: 40, lat: 0 };
        },
        20000,
      ),
    );
  }
  // 5) ters sürüş ve sahte tur: geri geri başlangıç çizgisini geç, dur, ileri; 0,3'e gidip geri dön ve yeniden geç; sonra 3 tur
  scenarios.push(
    run(
      "gp_1 ters ve sahte tur",
      "gp_1",
      gp,
      (n, c) => {
        const L = 1491.283;
        if (n < 360) return { v: -12, lat: 0 };
        if (n < 900) return { v: 20, lat: 0 };
        if (!c.phase && c.s % L > 0.3 * L && c.s % L < 0.35 * L) c.phase = 1;
        if (c.phase == 1) {
          if (c.s % L < 0.05 * L || c.s % L > 0.95 * L) c.phase = 2;
          return { v: -20, lat: 0 };
        }
        return { v: 40, lat: 0 };
      },
      30000,
    ),
  );
  // 6) kariyer dışı deneme: bütçeyi aşan araç (ödül yok, anahtar deneme_)
  // (araç 4 henüz açık değil: yalnız erişim için TS admin kipi; kariyer uygunluğu ve ödül kipten bağımsız)
  I.adminKipi(true);
  scenarios.push(run("gp_1 deneme (bütçe dışı araç)", "gp_1", 4, () => ({ v: 42, lat: 0 }), 20000));
  I.adminKipi(false);
  // 7) ralli A→B açık pist
  scenarios.push(run("rl_1 A→B", "rl_1", rule("rl_1"), () => ({ v: 30, lat: 0 }), 40000));
  // 8) drag: düz çizgi, tuzak hızı
  scenarios.push(run("dg_1 drag", "dg_1", rule("dg_1"), (n) => ({ v: Math.min(60, 5 + n * 0.25), lat: 0 }), 4000));
  // 8b) drag yavaş: 0 yıldız (önceki 3 yıldızla)
  scenarios.push(run("dg_1 yavaş 0 yıldız", "dg_1", rule("dg_1"), () => ({ v: 8, lat: 0 }), 4000));
  // 9) drift: 2 tur, 1. tur tamamen driftle (x6), arada çim (kombo yanar) ve bank
  scenarios.push(
    run(
      "dp_1 drift x6",
      "dp_1",
      rule("dp_1"),
      (n) => ({ v: 22, lat: 0, act: n % 600 < 560, beta: 0.45 * (n % 1200 < 600 ? 1 : -1), grass: n % 2000 > 1990 ? 4 : 0, tg: n % 900 < 300 ? 0.02 : 0.6 }),
      40000,
    ),
  );

  const sources = Object.fromEntries(Object.entries(L.sources).sort(([a], [b]) => a.localeCompare(b)));
  return {
    resource: { baseline, generator: "Unity/Validation/export-race-session.mjs", types, events },
    fixture: { baseline, sources, world, scenarios },
  };
}

export function main() {
  const { resource, fixture } = buildRaceSession();
  let failed = false;
  for (const [name, value] of [
    ["Unity/Assets/LastTurn/Resources/race-events.json", resource],
    ["Unity/Validation/Reference/race-session-0.8.18.json", fixture],
  ]) {
    const target = path.join(root, name),
      output = JSON.stringify(value) + "\n";
    if (process.argv.includes("--check")) {
      if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) {
        console.error("Güncel değil: " + name);
        failed = true;
      }
    } else fs.writeFileSync(target, output);
  }
  if (failed) process.exit(1);
  console.log(
    `${process.argv.includes("--check") ? "Doğrulandı" : "Yazıldı"}: ${resource.events.length} etkinlik; dünya ${fixture.world.map((w) => w.key + " " + (w.rows.length - 1)).join(", ")} adım; ` +
      fixture.scenarios
        .map((s) => `${s.name}: ${s.steps.length} adım, tur ${s.result.lap}, ${s.result.t.toFixed(2)} sn, ${s.result.yildiz}★, +${s.result.xp} XP +${s.result.para} para, kariyer ${s.career}`)
        .join("; "),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
