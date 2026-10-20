// Yarışlar: yarış listesi (her pist bir yarış), başlatma, tur ve drift puanı, bitiş.
// Yarıştan önceki sürüş kurulumu ve araç EV.sv'de saklanır, yarıştan çıkınca geri yüklenir.
import { CARS, type YarisTuru } from "../arac/araclar";
import { fmt } from "../cekirdek/bicim";
import { gizle, goster, $ } from "../cekirdek/dom";
import { note } from "../arayuz/bildirim";
import { kontrolleriKur } from "../arayuz/kontroller";
import { sonucGoster } from "../arayuz/sonuc";
import { REG, type Tele } from "../dunya/bolgeler";
import { ipucu, tp, type Pist } from "../dunya/pist";
import type { AdimSonucu } from "../fizik/tipler";
import type { OnayarAnahtari } from "../fizik/veriler";
import { setActive } from "./bolge";
import { carIndex, oyun, setCar } from "./durum";
import { girdiSifirla } from "./girdi";
import { applyPreset, kurulum, kurulumKaydet, kurulumYukle, type KurulumKaydi } from "./kurulum";
import { PROF, saveProf } from "./profil";
import { reset, sim } from "./surus";

/** yarış türleri: hedef süre, pist uzunluğundan ve ilk pistlerin ayarlı hızından (v, m/s) hesaplanır */
export const TYP: Record<
  YarisTuru,
  { k: string; pk: OnayarAnahtari; laps?: number; time?: number; v?: number; n: string; d: string }
> = {
  gp: {
    k: "asphalt",
    pk: "ar",
    laps: 3,
    v: 35.3,
    n: "Asfalt yarışları",
    d: "3 tur. Fren tabelalarını kullan, hedef süreyi geç.",
  },
  rx: {
    k: "dirt",
    pk: "tr",
    laps: 3,
    v: 28.5,
    n: "Toprak yarışları",
    d: "3 tur: çamur, su ve rampalar. Hedef süreyi geç.",
  },
  dp: {
    k: "drift",
    pk: "dr",
    time: 90,
    n: "Drift yarışmaları",
    d: "90 saniye puan topla. Drift uzadıkça çarpan x5’e çıkar; çime çıkmak, çarpmak ya da spin komboyu yakar. Drift ayarları otomatik gelir.",
  },
  rl: {
    k: "rally",
    pk: "rl",
    v: 12.2,
    n: "Ralli etapları",
    d: "Orman yolunda A’dan B’ye. Hedef süreyi geç.",
  },
  dg: {
    k: "drag",
    pk: "dg",
    n: "Drag yarışları",
    d: "Düz çizgide en kısa süre. Işıklar yeşile dönünce gaz. Kalkışta patinajı iyi ayarla.",
  },
};

export interface YarisTanimi {
  /** rekor anahtarı */
  k: string;
  ty: YarisTuru;
  n: string;
  d: string;
  /** bölge sırası */
  reg: number;
  pk: OnayarAnahtari;
  laps?: number;
  /** drift yarışı süresi */
  time?: number;
  /** hedef süre */
  limit: number;
  /** başlangıç noktası */
  g: Tele;
}

export interface Yaris extends YarisTanimi {
  i: number;
  sv: KurulumKaydi & { car: number };
  TR: Pist;
  state: "count" | "run" | "done";
  /** geri sayım */
  cd: number;
  t: number;
  score: number;
  combo: number;
  /** kombo süresi, çarpan, kombo arası */
  ct: number;
  mult: number;
  gap: number;
  best: number;
  armed: number;
  lap: number;
  lapStart: number;
  bestLap: number | null;
  prev: number;
  time: number;
  /** drag bitiş hızı */
  trap?: number;
}

export const EVENTS: YarisTanimi[] = REG.filter((r) => r.t != "park").map((r, i) => {
  const ty = r.t as YarisTuru,
    y = TYP[ty],
    no = REG.filter((q, j) => j <= i && q.t == ty).length,
    TR = r.TR!;
  return {
    k: y.k + (no > 1 ? no : ""),
    ty,
    n: r.n,
    d: r.d!,
    reg: i,
    pk: y.pk,
    laps: y.laps,
    time: y.time,
    limit: r.tg || (y.v ? Math.round((TR.len * (y.laps || 1)) / y.v / 5) * 5 : 0),
    g: tp(TR, r.n, ty == "dg" ? 1 : TR.open ? 4 : TR.N, TR.open ? 0 : 6),
  };
});

export const yaris = { EV: null as Yaris | null };

/** yarışı başlat (ci: seçilen araç) */
export function startEvent(i: number, ci?: number) {
  const e = EVENTS[i],
    EV = yaris.EV,
    sv = EV && EV.sv ? EV.sv : { ...kurulumKaydet(), car: carIndex() };
  // yarışta önayar seçilmez: aracın kendi önayarı ve oyuncunun yardım seviyesi yüklenir (önayar yalnız serbest
  // sürüşte). Böylece drift yarışı, otoparkta aynı araçla drift önayarında sürmekle birebir aynıdır.
  if (ci != null && CARS[ci] !== oyun.CAR) setCar(ci);
  kurulum.pk = oyun.CAR.pk;
  applyPreset();
  {
    const u = carIndex();
    PROF.use[u] = (PROF.use[u] || 0) + 1;
  }
  gizle("#res", "#set", "#menu");
  setActive(REG[e.reg]);
  reset(e.g[1], e.g[2], e.g[3]);
  oyun.mode = "drive";
  kontrolleriKur();
  goster("#hud", "#mm", "#ctl");
  yaris.EV = {
    ...e,
    i,
    sv,
    TR: REG[e.reg].TR!,
    state: "count",
    cd: 3,
    t: 0,
    score: 0,
    combo: 0,
    ct: 0,
    mult: 1,
    gap: 0,
    best: 0,
    armed: 0,
    lap: 0,
    lapStart: 0,
    bestLap: null,
    prev: ipucu.ti,
    time: e.time || 0,
    limit: e.limit || 0,
  };
}

/** yarıştan çık: önceki araç ve kurulum geri gelir */
export function leaveEvent() {
  const EV = yaris.EV;
  if (!EV) return;
  const sv = EV.sv;
  if (CARS[sv.car] !== oyun.CAR) setCar(sv.car);
  kurulumYukle(sv);
  yaris.EV = null;
  $("#ev").textContent = "";
}

/** drift komboyu puana çevir */
function bank(EV: Yaris) {
  const p = Math.round(EV.combo * EV.mult);
  if (p > 0) {
    EV.score += p;
    EV.best = Math.max(EV.best, p);
    note("+" + p, 40);
  }
  EV.combo = 0;
  EV.ct = 0;
  EV.mult = 1;
  EV.gap = 0;
}

/** yarış mantığı: her fizik adımından sonra */
export function evTick(dt: number, o: AdimSonucu) {
  const EV = yaris.EV!;
  if (EV.state != "run") return;
  const S = sim.S,
    D = sim.d.D,
    ti = ipucu.ti;
  EV.t += dt;
  if (EV.ty == "dp") {
    EV.time -= dt;
    const lost = o.si == 2 || sim.d.zaman - S.hit < 0.05 || Math.abs(D.beta) > 1.4;
    if (EV.combo > 0 && lost) {
      EV.combo = 0;
      EV.ct = 0;
      EV.mult = 1;
      note("KOMBO YANDI", 30);
    } else if (D.act && !lost) {
      EV.combo += o.v * Math.abs(D.beta) * dt * 3;
      EV.ct += dt;
      EV.gap = 0;
      const m = Math.min(5, 1 + Math.floor(EV.ct / 2.5));
      if (m > EV.mult) note("x" + m, 44);
      EV.mult = m;
    } else if (EV.combo > 0) {
      EV.gap += dt;
      if (EV.gap > 0.8) bank(EV);
    }
    if (EV.time <= 0) {
      bank(EV);
      endEvent();
    }
    return;
  }
  const N = EV.TR.N;
  if (EV.laps) {
    if (ti > N * 0.4 && ti < N * 0.6) EV.armed = 1;
    if (EV.prev > N * 0.8 && ti < N * 0.2 && EV.armed) {
      EV.armed = 0;
      EV.lap++;
      const lt = EV.t - EV.lapStart;
      EV.lapStart = EV.t;
      EV.bestLap = EV.bestLap == null ? lt : Math.min(EV.bestLap, lt);
      if (EV.lap >= EV.laps) endEvent();
      else note("Tur " + (EV.lap + 1) + "/" + EV.laps + " · " + fmt(lt), 30);
    }
    EV.prev = ti;
  } else {
    if (ti > N * 0.5) EV.armed = 1;
    if (EV.armed && ti >= N - (EV.ty == "dg" ? 1 : 4)) {
      EV.trap = Math.hypot(S.vx, S.vz) * 3.6;
      endEvent();
    }
  }
}

/** HUD'daki yarış satırı */
export function evText() {
  const EV = yaris.EV;
  if (!EV) return "";
  const ti = ipucu.ti;
  if (EV.ty == "dp")
    return (
      "⏱ " +
      Math.max(0, EV.time).toFixed(1) +
      " · Puan " +
      EV.score +
      (EV.combo > 0 ? " · Kombo " + Math.round(EV.combo) + " x" + EV.mult : "")
    );
  if (EV.ty == "dg")
    return (
      "⏱ " +
      EV.t.toFixed(2) +
      " / " +
      EV.limit.toFixed(1) +
      " sn · " +
      Math.round((100 * ti) / (EV.TR.N - 1)) +
      "%"
    );
  return (
    "⏱ " +
    fmt(EV.t) +
    " / " +
    fmt(EV.limit) +
    (EV.t > EV.limit ? " · SÜRE AŞILDI" : "") +
    (EV.laps
      ? " · Tur " + Math.min(EV.lap + 1, EV.laps) + "/" + EV.laps
      : " · %" + Math.round((100 * ti) / EV.TR.N))
  );
}

/** yarış bitti: profil, rekor, sonuç ekranı */
export function endEvent() {
  const EV = yaris.EV!;
  EV.state = "done";
  oyun.mode = "result";
  PROF.races++;
  if (EV.ty == "dp" ? EV.score > 0 : EV.t <= EV.limit) PROF.wins++;
  saveProf();
  girdiSifirla();
  gizle("#ctl");
  sonucGoster(EV);
}
