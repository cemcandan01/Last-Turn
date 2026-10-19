// Ana döngü: fizik sabit adımla (1/60 sn) ilerler, çizim her karede. Kare hızı düşse de oyun ağırlaşmaz;
// iki fizik adımı arasında araç konumu ara değerle bulunur (ekran 60 Hz'den farklı olsa da akıcı).
import * as THREE from "three";
import { ad, cl, lerp, lerpAci } from "../cekirdek/matematik";
import { $ } from "../cekirdek/dom";
import { ekran } from "../cekirdek/ekran";
import { kareKaydet } from "../cekirdek/performans";
import { bildirimTick, note } from "../arayuz/bildirim";
import { engine, hudGuncelle, motor } from "../arayuz/hud";
import { miniHaritaCiz } from "../arayuz/mini-harita";
import { body, car, model } from "../cizim/arac-modeli";
import { GX, GZ } from "../cizim/garaj-sahnesi";
import { kamera } from "../cizim/kamera";
import { cock, gauges, kokpit } from "../cizim/kokpit";
import { glassQM } from "../cizim/malzemeler";
import { precipTick, shadowTick } from "../cizim/ortam";
import { parcacikTick } from "../cizim/parcaciklar";
import { cam, R, scene } from "../cizim/sahne";
import { V3 } from "../cizim/yardimci";
import { zeminTasi } from "../cizim/zemin";
import { REG } from "../dunya/bolgeler";
import { Hw } from "../dunya/dunya";
import { VMAX } from "../fizik/veriler";
import { ADIM } from "../fizik/simulasyon";
import { CT, set } from "./ayarlar";
import { oyun } from "./durum";
import { I } from "./girdi";
import { CINE, cineCam, cineTick } from "./sinematik";
import { sim, son, surusAdimi } from "./surus";
import { yaris } from "./yarislar";

/** görsel saat (menü, garaj, yağış) */
export let tt = 0;
let last = 0,
  birikim = 0;
const q = new THREE.Quaternion(),
  qA = new THREE.Quaternion(),
  qB = new THREE.Quaternion();

/** bir kare */
function kare(ts: number) {
  const t0 = performance.now();
  const dt = Math.min(0.1, (ts - last) / 1000 || 0);
  last = ts;
  tt += dt;
  const { mode } = oyun,
    EV = yaris.EV,
    S = sim.S;
  if (CT.gas == "auto" && mode == "drive") I.g = I.b ? 0 : 1;
  const frozen = !!EV && EV.state == "count";
  if (mode == "menu" && CINE) cineTick(dt);
  // sabit adımlı fizik
  let adim = 0;
  if (mode == "drive" && !frozen) {
    birikim += dt;
    while (birikim >= ADIM) {
      surusAdimi();
      birikim -= ADIM;
      adim++;
    }
  } else birikim = 0;
  const t1 = performance.now();
  // ara değer: yalnız sürüşte (menü ve garajda araç doğrudan yerleştirilir)
  const al = mode == "drive" && !frozen ? birikim / ADIM : 1,
    P = sim.onceki,
    px = lerp(P.x, S.x, al),
    py = lerp(P.y, S.y, al),
    pz = lerp(P.z, S.z, al),
    ph = lerpAci(P.h, S.h, al);
  if (frozen && mode == "drive") {
    EV.cd -= dt;
    const b = $("#big");
    b.style.fontSize = "88px";
    b.textContent = EV.cd > 0 ? String(Math.ceil(EV.cd)) : "";
    if (EV.cd <= 0) {
      EV.state = "run";
      note("BAŞLA!", 60);
    }
  }
  if (EV) REG[EV.reg].tick?.(EV);
  precipTick(dt, tt);
  shadowTick(!!set.shd, S.x, S.y, S.z);
  bildirimTick(dt);
  zeminTasi(S.x, S.z);
  if (mode == "garage") {
    S.x = GX;
    S.z = GZ;
    S.y = 0.12;
    S.h = tt * 0.3 + kamera.ly;
    S.vx = S.vz = S.w = 0;
    S.axs = 0;
    sim.d.delta = 0;
  }
  const v = Math.hypot(S.vx, S.vz),
    gx = mode == "garage" ? S.x : px,
    gy = mode == "garage" ? S.y : py,
    gz = mode == "garage" ? S.z : pz,
    gh = mode == "garage" ? S.h : ph;
  sahneGuncelle(dt, v, gx, gy, gz, gh, al);
  if (mode == "menu" && CINE) cineCam();
  parcacikTick(dt);
  if (mode != "menu" && mode != "garage") {
    hudGuncelle(v, son.Sf, son.T);
    miniHaritaCiz(gx, gz, Math.sin(gh), Math.cos(gh));
  }
  const t2 = performance.now();
  R.render(scene, cam);
  const t3 = performance.now();
  kareKaydet(dt * 1000, t1 - t0, t3 - t2, adim, R.info.render.calls, R.info.render.triangles);
  requestAnimationFrame(kare);
}

/** araç modeli, gövde hareketi, kokpit ve kamera */
function sahneGuncelle(dt: number, v: number, x: number, y: number, z: number, h: number, al: number) {
  const S = sim.S,
    { mode, camMode } = oyun,
    delta = sim.d.delta;
  const fxm = Math.sin(h),
    fzm = Math.cos(h);
  car.position.set(x, y, z);
  for (const pv of model.steerP) pv.rotation.y = delta;
  const Y = sim.yeni;
  if (Y && (mode == "drive" || mode == "pause" || mode == "result")) {
    // yeni fizik: gövdenin gerçek yönelimi (iki adım arası ara değer), tekerlerde süspansiyon ve dönüş
    const P = sim.onceki;
    qA.set(P.qx, P.qy, P.qz, P.qw);
    qB.set(Y.qx, Y.qy, Y.qz, Y.qw);
    car.quaternion.slerpQuaternions(qA, qB, al);
    body.rotation.set(0, 0, 0);
    for (const tm of model.carM!.ws) {
      const tk = Y.tk[tm.pv.userData.fi];
      tm.pv.position.y = tm.pv.userData.y0 + (tk.temas ? cl(tk.sik - tk.c0, -0.12, 0.16) : -0.1);
      tm.w.rotation.x = tk.don;
    }
  } else {
    car.rotation.set(0, h, 0);
    for (const tm of model.carM!.ws) tm.pv.position.y = tm.pv.userData.y0;
    const vl_ = S.vx * fxm + S.vz * fzm;
    for (const w of model.wheels) w.rotation.x += (vl_ * dt) / w.userData.r;
    // gövde eğimi: havada hız yönüne, yerde yokuşa göre; yalpa ve ivmeyle yatış
    const pt = S.air
      ? Math.atan2(S.vy, Math.max(10, v))
      : Math.atan2(Hw(x + fxm * 1.6, z + fzm * 1.6) - Hw(x - fxm * 1.6, z - fzm * 1.6), 3.2);
    kamera.pitC += (pt - kamera.pitC) * Math.min(1, dt * 10);
    car.rotation.x = -kamera.pitC;
    body.rotation.z +=
      (cl(S.w * Math.min(1, v / VMAX) * 0.06, -0.12, 0.12) - body.rotation.z) * Math.min(1, dt * 8);
    body.rotation.x += (cl(-S.axs * 0.004, -0.07, 0.07) - body.rotation.x) * Math.min(1, dt * 6);
  }
  const spn = Math.min(1, v / VMAX),
    shake =
      mode == "drive" || CINE
        ? (CINE && CINE.cam == "cock" ? 0.07 : 0) +
          (S.kerb ? 0.06 : 0) +
          (sim.d.zaman - S.hit < 0.35 ? 0.3 : 0) +
          (set.shk && spn > 0.7 ? 0.03 * (spn - 0.6) * 3 : 0)
        : 0;
  const inCar = (mode != "menu" || (!!CINE && CINE.cam == "cock")) && mode != "garage" && camMode >= 2,
    ck = inCar && camMode == 3,
    nr = inCar ? 0.15 : 0.5;
  if (nr != kamera.nearCur) {
    kamera.nearCur = nr;
    cam.near = nr;
    cam.updateProjectionMatrix();
  }
  // kokpit: iç mekân görünür, renk panelleri gizlenir, ön cam şeffaflaşır
  cock.visible = ck;
  const g = model.carM!.g;
  if (g.userData.ck !== ck) {
    g.userData.ck = ck;
    g.traverse((o) => {
      if (o.userData.pan) o.visible = !ck;
    });
  }
  glassQM.opacity = ck ? 0.12 : 1;
  glassQM.depthWrite = !ck;
  if (Y && mode != "menu" && mode != "garage") {
    motor.RPM = Y.rpm / 1000;
    motor.GEAR = Y.vites;
  } else engine(v * 3.6, dt);
  if (ck) gauges(v * 3.6, motor.RPM);
  if (inCar) {
    car.updateMatrixWorld(true);
    kokpit.swl.rotation.z = -delta * 2.5;
    const mw = body.matrixWorld,
      CAR = oyun.CAR,
      E = kokpit.EYE;
    const hy = CAR.ws[0][1] + 0.62 + (CAR.lift || 0),
      hz = CAR.ws[0][0] - 0.1;
    cam.position.copy((ck ? V3(E[0], E[1], E[2]) : V3(0, hy, hz)).applyMatrix4(mw));
    cam.position.y += (Math.random() - 0.5) * shake * 0.4;
    cam.up.set(0, 1, 0).applyQuaternion(body.getWorldQuaternion(q));
    cam.lookAt((ck ? V3(E[0], E[1] - 0.15, E[2] + 14) : V3(0, hy - 0.27, 16)).applyMatrix4(mw));
  } else {
    const K = kamera;
    if (mode == "menu") {
      K.camYaw += ad(h - K.camYaw) * Math.min(1, dt * 1.5);
      K.ly = Math.sin(tt * 0.13) * 1.6;
      K.lp = 0.1 + Math.sin(tt * 0.07) * 0.1;
    } else {
      K.camYaw += ad(h - K.camYaw) * Math.min(1, dt * (sim.d.D.act ? 2.2 : 4.5));
      if (K.dp === null && performance.now() - K.lastDrag > 1500) {
        const d = Math.exp(-dt * 3);
        K.ly *= d;
        K.lp *= d;
      }
    }
    const far = camMode == 1 ? 1.6 : 1,
      pit = 0.3 + K.lp,
      dist = (9 + spn * 3 - cl(S.axs * 0.05, -1.5, 1.5)) * far,
      a = K.camYaw + K.ly;
    const cz = z - Math.cos(a) * dist * Math.cos(pit);
    let cx = x - Math.sin(a) * dist * Math.cos(pit),
      cy = y + 2.4 * far + dist * Math.sin(pit);
    cy += (Math.random() - 0.5) * shake;
    cx += (Math.random() - 0.5) * shake * 0.6;
    cy = Math.max(cy, Hw(cx, cz) + 1);
    cam.position.set(cx, cy, cz);
    cam.up.set(0, 1, 0);
    cam.lookAt(x + fxm * 3, y + 1.2, z + fzm * 3);
  }
  // garaj kamerası: araç dikeyde üst yarıda, yatayda solda (panel sağda)
  if (mode == "garage") {
    const a = 0.55,
      lnd = ekran.aw > ekran.ah,
      dd = lnd ? 8.2 : 8.8;
    cam.position.set(GX + Math.sin(a) * dd, lnd ? 2.3 : 3.2, GZ + Math.cos(a) * dd);
    cam.up.set(0, 1, 0);
    cam.lookAt(GX + (lnd ? Math.cos(a) * 3.4 : 0), lnd ? 0.6 : -1.5, GZ - (lnd ? Math.sin(a) * 3.4 : 0));
  }
  const port = ekran.aw < ekran.ah,
    bf = camMode == 3 && inCar ? (port ? 64 : 54) : (port ? 78 : 62) + (inCar ? 6 : 0),
    tf = bf + (set.fov ? spn * 24 : 0);
  kamera.fovC += (tf - kamera.fovC) * Math.min(1, dt * 3);
  if (Math.abs(cam.fov - kamera.fovC) > 0.05) {
    cam.fov = kamera.fovC;
    cam.updateProjectionMatrix();
  }
}

export function donguBaslat() {
  requestAnimationFrame(kare);
}
