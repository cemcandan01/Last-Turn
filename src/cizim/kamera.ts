// Kamera durumu: takip açısı, parmakla bakış (sürükleme), görüş açısı ve eğim yumuşatması
import { cl } from "../cekirdek/matematik";
import { toApp } from "../cekirdek/ekran";

export const kamera = {
  /** takip kamerasının yönü */
  camYaw: 0,
  /** parmakla bakış: yatay ve dikey sapma */
  ly: 0,
  lp: 0,
  /** son sürükleme zamanı (bir süre sonra kamera arkaya döner) */
  lastDrag: 0,
  /** sürükleyen parmak */
  dp: null as number | null,
  fovC: 70,
  /** gövdenin öne-arkaya eğimi (yumuşatılmış) */
  pitC: 0,
  nearCur: 0.5,
};

export function kameraSifirla(h: number) {
  kamera.camYaw = h;
  kamera.ly = kamera.lp = 0;
}

/** ekranda sürükleyerek etrafa bakma */
export function kameraKur(cvs: HTMLElement) {
  let lx = 0,
    ly0 = 0;
  cvs.addEventListener("pointerdown", (e) => {
    if (kamera.dp === null) {
      kamera.dp = e.pointerId;
      [lx, ly0] = toApp(e.clientX, e.clientY);
    }
  });
  cvs.addEventListener("pointermove", (e) => {
    if (e.pointerId !== kamera.dp) return;
    const [ax, ay] = toApp(e.clientX, e.clientY);
    kamera.ly -= (ax - lx) * 0.009;
    kamera.lp = cl(kamera.lp + (ay - ly0) * 0.006, -0.25, 1);
    lx = ax;
    ly0 = ay;
    kamera.lastDrag = performance.now();
  });
  for (const n of ["pointerup", "pointercancel"])
    cvs.addEventListener(n, (e) => {
      if ((e as PointerEvent).pointerId === kamera.dp) kamera.dp = null;
    });
}
