// Menü arka planı: kısa sinematik çekimler. Araç pist boyunca senaryoyla sürülür, kamera çekime göre konumlanır.
// Torba boşalana kadar her çekim bir kez gelir, art arda aynı çekim gelmez. Çekim sırasında araç ve koşullar
// geçicidir; demoStop() hepsini geri yükler.
import * as THREE from "three";
import { $ } from "../cekirdek/dom";
import { ad, cl } from "../cekirdek/matematik";
import { puff } from "../cizim/parcaciklar";
import { cam } from "../cizim/sahne";
import { V3 } from "../cizim/yardimci";
import { COND, type GununSaati, type Hava } from "../cizim/ortam";
import { REG } from "../dunya/bolgeler";
import { Hw, surfW } from "../dunya/dunya";
import { curvAt, KW, trackAt, type Pist } from "../dunya/pist";
import { zeminRengi } from "../fizik/ortak";
import { setActive } from "./bolge";
import { carIndex, oyun, setCar } from "./durum";
import { girdiSifirla } from "./girdi";
import { kurulumKaydet, kurulumYukle, type KurulumKaydi } from "./kurulum";
import { sim } from "./surus";
import { EVENTS } from "./yarislar";

type KameraTuru = "track" | "front" | "side" | "cock" | "heli" | "chase" | "orbit" | "launch";

interface Cekim {
  ty: string;
  /** yarış, araç, koşullar */
  ev: number;
  car: number;
  c: { tod: GununSaati; wx: Hava };
  cam: KameraTuru;
  /** pistteki başlangıç oranı, hız (m/s), süre (sn), drift açısı */
  f: number;
  v: number;
  dur: number;
  dr?: number;
}

const SHOTS: Cekim[] = [
  { ty: "gp", ev: 0, car: 0, c: { tod: "noon", wx: "sun" }, cam: "track", f: 0.62, v: 62, dur: 5 },
  { ty: "gp", ev: 1, car: 0, c: { tod: "evening", wx: "sun" }, cam: "front", f: 0.12, v: 48, dur: 5 },
  { ty: "gp", ev: 2, car: 0, c: { tod: "evening", wx: "sun" }, cam: "side", f: 0.3, v: 36, dur: 5 },
  { ty: "rl", ev: 9, car: 3, c: { tod: "night", wx: "rain" }, cam: "cock", f: 0.33, v: 22, dur: 6 },
  { ty: "rl", ev: 10, car: 3, c: { tod: "noon", wx: "snow" }, cam: "heli", f: 0.42, v: 21, dur: 5, dr: 0.3 },
  { ty: "rx", ev: 3, car: 1, c: { tod: "noon", wx: "sun" }, cam: "chase", f: 0.04, v: 28, dur: 5, dr: 0.25 },
  { ty: "rx", ev: 4, car: 1, c: { tod: "noon", wx: "sun" }, cam: "track", f: 0.6, v: 30, dur: 5, dr: 0.35 },
  { ty: "dp", ev: 6, car: 2, c: { tod: "evening", wx: "sun" }, cam: "orbit", f: 0.3, v: 22, dur: 6, dr: 0.7 },
  {
    ty: "dp",
    ev: 8,
    car: 2,
    c: { tod: "evening", wx: "sun" },
    cam: "track",
    f: 0.45,
    v: 24,
    dur: 5,
    dr: 0.65,
  },
  { ty: "dg", ev: 13, car: 4, c: { tod: "evening", wx: "sun" }, cam: "launch", f: 0, v: 0, dur: 5.5 },
];

interface CekimDurumu extends Cekim {
  TR: Pist;
  s: number;
  s0: number;
  t: number;
  vv: number;
  side: number;
  th: number;
  pv: THREE.Vector3 | null;
}

export let CINE: CekimDurumu | null = null;
let DEMO: { sv: KurulumKaydi & { car: number; cond: typeof COND; cam: number } } | null = null;
let BAG: number[] = [],
  LASTSHOT = -1;

export const demoCalisiyor = () => !!DEMO;

/** bir sonraki çekim: torba boşalana kadar her çekim bir kez, art arda aynı çekim yok */
function nextShot() {
  if (!BAG.length) {
    BAG = SHOTS.map((_, i) => i).sort(() => Math.random() - 0.5);
    if (BAG[0] === LASTSHOT) BAG.push(BAG.shift()!);
  }
  return (LASTSHOT = BAG.shift()!);
}

function cineStart() {
  const sh = SHOTS[nextShot()],
    e = EVENTS[sh.ev],
    r = REG[e.reg],
    TR = r.TR!;
  setCar(sh.car);
  Object.assign(COND, sh.c);
  setActive(r);
  const s0 = sh.f * TR.len;
  CINE = {
    ...sh,
    TR,
    s: s0,
    s0,
    t: 0,
    vv: sh.v,
    side: Math.random() < 0.5 ? 1 : -1,
    th: Math.random() * 6.28,
    pv: null,
  };
  oyun.camMode = sh.cam == "cock" ? 3 : 0;
  cineCar(0);
  const cut = $("#cut");
  cut.style.transition = "none";
  cut.style.opacity = "1";
  requestAnimationFrame(() => {
    cut.style.transition = "opacity .45s";
    cut.style.opacity = "0";
  });
}

/** aracı senaryoya göre yerleştir: hız, drift açısı, duman */
function cineCar(dt: number) {
  const C = CINE!,
    TR = C.TR,
    S = sim.S;
  if (C.cam == "launch") {
    C.vv = C.t < 1.3 ? 0 : Math.min(95, C.vv + 15 * dt);
  }
  C.s += C.vv * dt;
  const p = trackAt(TR, C.s),
    k = curvAt(TR, C.s),
    dr = C.dr ? C.dr * cl(Math.abs(k) * 45, 0.35, 1) * Math.sign(k || 1) : 0,
    h = p.a + dr,
    x = p.x + (C.cam == "launch" ? 0 : Math.sin(C.t * 0.7) * 0.6),
    z = p.z;
  const vx = Math.sin(p.a) * C.vv,
    vz = Math.cos(p.a) * C.vv;
  S.w = dt ? ad(h - S.h) / dt : 0;
  S.axs = dt ? (C.vv - Math.hypot(S.vx, S.vz)) / dt : 0;
  S.x = x;
  S.z = z;
  S.y = Hw(x, z);
  S.h = h;
  S.vx = vx;
  S.vz = vz;
  S.air = false;
  S.gas = 1;
  sim.d.delta = cl(-dr * 0.8 + k * 3, -0.5, 0.5);
  sim.pozKaydet();
  const burn = C.cam == "launch" && C.t < 2.2,
    smoke = Math.abs(dr) > 0.2 || burn || (C.vv > 8 && surfW(x, z) != 1 && Math.random() < 0.5);
  if (smoke && dt) {
    const si = surfW(x, z),
      col = zeminRengi(si),
      fx = Math.sin(h),
      fz = Math.cos(h);
    for (const s2 of [-0.9, 0.9])
      if (Math.random() < 0.7)
        puff(
          x - fx * 1.6 + Math.cos(h) * s2,
          S.y,
          z - fz * 1.6 - Math.sin(h) * s2,
          burn ? Math.random() * 2 - 1 : vx * 0.4,
          burn ? Math.random() * 2 - 1 : vz * 0.4,
          col,
        );
  }
}

export function cineTick(dt: number) {
  CINE!.t += dt;
  cineCar(dt);
  if (CINE!.t > CINE!.dur) cineStart();
}

/** kamera: çekim türüne göre; yakından hızlı geçişte sarsıntı */
export function cineCam() {
  const C = CINE!,
    TR = C.TR,
    S = sim.S,
    v = C.vv,
    fx = Math.sin(S.h),
    fz = Math.cos(S.h),
    car_ = V3(S.x, S.y + 0.8, S.z);
  let P: THREE.Vector3,
    L = car_.clone(),
    fov: number,
    shk = 0;
  if (C.cam == "track" || C.cam == "launch") {
    if (!C.pv) {
      const ln = C.cam == "launch",
        sc = ln ? C.s0 + 10 : C.s0 + C.v * 2.6,
        q = trackAt(TR, sc),
        o = ln ? 5 : (TR.hw + KW + (TR.kb ? 3.2 : 5.5)) * C.side;
      C.pv = V3(q.x + Math.cos(q.a) * o, 0, q.z - Math.sin(q.a) * o);
      // kamera yol yüksekliğinin altında kalmasın (yükseltili pistlerde set arkasında kalmasın)
      C.pv.y = Math.max(Hw(C.pv.x, C.pv.z), Hw(q.x, q.z)) + (ln ? 0.5 : 1.1);
    }
    P = C.pv.clone();
    const d = P.distanceTo(car_);
    fov = C.cam == "launch" ? 50 : cl(18 + d * 0.55, 24, 60);
    shk = ((Math.max(0, 1 - d / 18) * v) / 50) * 0.35 + (C.cam == "launch" && C.t < 2.2 ? 0.04 : 0);
  } else if (C.cam == "front") {
    const q = trackAt(TR, C.s + 11 - C.t * 1.2);
    P = V3(q.x, Hw(q.x, q.z) + 0.7, q.z);
    fov = 50;
    shk = 0.015;
  } else if (C.cam == "side") {
    const q = trackAt(TR, C.s + 2),
      o = 8 * C.side;
    P = V3(q.x + Math.cos(q.a) * o, 0, q.z - Math.sin(q.a) * o);
    P.y = Hw(P.x, P.z) + 1.3;
    fov = 46;
    shk = 0.01;
  } else if (C.cam == "chase") {
    P = V3(S.x - fx * 5.2, S.y + 1.05, S.z - fz * 5.2);
    L = V3(S.x + fx * 8, S.y + 0.7, S.z + fz * 8);
    fov = 72;
    shk = 0.06;
  } else if (C.cam == "heli") {
    P = V3(S.x + Math.cos(S.h) * 18 * C.side - fx * 8, S.y + 13, S.z - Math.sin(S.h) * 18 * C.side - fz * 8);
    fov = 44;
  } else if (C.cam == "orbit") {
    const a = C.th + C.t * 0.45;
    P = V3(S.x + Math.sin(a) * 7.5, S.y + 1.5, S.z + Math.cos(a) * 7.5);
    fov = 55;
  } else return; // kokpit: normal araç içi kamera
  P.x += (Math.random() - 0.5) * shk;
  P.y += (Math.random() - 0.5) * shk;
  cam.position.copy(P);
  cam.up.set(0, 1, 0);
  cam.lookAt(L);
  cam.fov = fov;
  cam.updateProjectionMatrix();
}

export function demoStart() {
  if (DEMO) return;
  DEMO = { sv: { ...kurulumKaydet(), car: carIndex(), cond: { ...COND }, cam: oyun.camMode } };
  cineStart();
}

export function demoStop() {
  if (!DEMO) return;
  const v = DEMO.sv;
  DEMO = null;
  CINE = null;
  if (carIndex() !== v.car) setCar(v.car);
  kurulumYukle(v);
  oyun.camMode = v.cam;
  Object.assign(COND, v.cond);
  girdiSifirla();
  $("#cut").style.opacity = "0";
}
