// Kamera durumu: takip açısı, parmakla bakış (sürükleme), görüş açısı ve eğim yumuşatması
import { cl } from "../cekirdek/matematik";
import { oyun } from "../oyun/durum";
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
  /** garaj: kamera yüksekliği açısı (rad), uzaklık çarpanı, kendiliğinden dönme açık mı */
  gp: 0.15,
  gz: 1,
  gOto: true,
  /** garaj: dönme hızı (rad/sn) ve yönü (+1/-1); bırakma ivmesi bu hızdan kendi hızına söner */
  gV: 0.3,
  gYon: 1,
  /** garaj: vitrin tam ekran (bilgi paneli gizli) */
  gTam: false,
  /** garaj tam ekranda dokunup bırakınca seç/geri tuşları görünür; sürüklemeye başlayınca kaybolur */
  gBtn: false,
};

/** garajda dikey açı sınırı: yerin altına inmez, tam tepeden (90°) bakmaz */
const GP_MIN = 0.03,
  GP_MAX = 1.3,
  GZ_MIN = 0.5,
  GZ_MAX = 1.7,
  /** kendiliğinden dönme hızı (rad/sn) */
  GARAJ_DONME = 0.3,
  /** bırakma ivmesinin sönüm süresi (sn) ve parmak hızının ölçüldüğü pencere (ms) */
  GARAJ_SONUM = 0.8,
  HIZ_PENCERE = 100;

export function garajKameraSifirla() {
  kamera.ly = 0;
  kamera.gp = 0.15;
  kamera.gz = 1;
  kamera.gOto = true;
  kamera.gV = GARAJ_DONME;
  kamera.gYon = 1;
  kamera.gTam = false;
  kamera.gBtn = false;
}

/** garaj: araç kendiliğinden döner (dokununca durur), yön açısı tek yerde tutulur */
export function garajKameraTick(dt: number) {
  if (!kamera.gOto || kamera.dp !== null) return;
  // bırakma hızı, yönü değişmeden kendi dönme hızına söner
  kamera.gV += (GARAJ_DONME * kamera.gYon - kamera.gV) * (1 - Math.exp(-dt / GARAJ_SONUM));
  kamera.ly += kamera.gV * dt;
}

export function kameraSifirla(h: number) {
  kamera.camYaw = h;
  kamera.ly = kamera.lp = 0;
}

/** ekranda sürükleyerek etrafa bakma; garajda: sürükle = döndür/eğ, iki parmak ya da tekerlek = yakınlaştır, dokun = dönmeyi durdur/başlat */
export function kameraKur(cvs: HTMLElement) {
  let lx = 0,
    ly0 = 0,
    taban = 0,
    baslangic = { x: 0, y: 0, t: 0, yer: 0 },
    ornek: { t: number; ly: number }[] = [];
  const dokunuslar = new Map<number, { x: number; y: number }>(),
    iki = () => {
      const [a, b] = [...dokunuslar.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
  cvs.addEventListener("pointerdown", (e) => {
    const [ax, ay] = toApp(e.clientX, e.clientY);
    if (oyun.mode == "garage") {
      try {
        cvs.setPointerCapture?.(e.pointerId);
      } catch {
        /* yapay olay: yakalanacak parmak yok */
      }
      dokunuslar.set(e.pointerId, { x: ax, y: ay });
      if (dokunuslar.size == 1) {
        baslangic = { x: ax, y: ay, t: performance.now(), yer: 0 };
        ornek = [];
      } else {
        taban = iki() * kamera.gz;
        baslangic.yer = 1e9;
      }
    }
    if (kamera.dp === null) {
      kamera.dp = e.pointerId;
      [lx, ly0] = toApp(e.clientX, e.clientY);
    }
  });
  cvs.addEventListener("pointermove", (e) => {
    const [ax, ay] = toApp(e.clientX, e.clientY);
    if (oyun.mode == "garage") {
      const d = dokunuslar.get(e.pointerId);
      if (!d) return;
      d.x = ax;
      d.y = ay;
      if (kamera.gBtn && Math.hypot(ax - baslangic.x, ay - baslangic.y) > 10) {
        kamera.gBtn = false;
        document.dispatchEvent(new Event("lt:garaj-dokunus"));
      }
      if (dokunuslar.size >= 2) {
        kamera.gz = cl(taban / iki(), GZ_MIN, GZ_MAX);
        return;
      }
      baslangic.yer = Math.max(
        baslangic.yer == 1e9 ? 0 : baslangic.yer,
        Math.hypot(ax - baslangic.x, ay - baslangic.y),
      );
      // araç parmakla aynı yöne döner; aşağı sürükleyince kamera yükselir
      kamera.ly += (ax - lx) * 0.009;
      const simdi = performance.now();
      ornek.push({ t: simdi, ly: kamera.ly });
      // en az iki örnek kalır: seyrek gelen hareketlerde de (yavaş cihaz) bırakma hızı ölçülür
      while (ornek.length > 2 && simdi - ornek[1].t > HIZ_PENCERE) ornek.shift();
      kamera.gp = cl(kamera.gp + (ay - ly0) * 0.005, GP_MIN, GP_MAX);
      lx = ax;
      ly0 = ay;
      return;
    }
    if (e.pointerId !== kamera.dp) return;
    kamera.ly += (ax - lx) * 0.009 * -1;
    kamera.lp = cl(kamera.lp + (ay - ly0) * 0.006, -0.25, 1);
    lx = ax;
    ly0 = ay;
    kamera.lastDrag = performance.now();
  });
  for (const n of ["pointerup", "pointercancel"])
    cvs.addEventListener(n, (e) => {
      const pe = e as PointerEvent;
      if (oyun.mode == "garage" && dokunuslar.has(pe.pointerId)) {
        const tek = dokunuslar.size == 1;
        dokunuslar.delete(pe.pointerId);
        // kısa, yerinde dokunuş: yalnız tam ekranda kendiliğinden dönmeyi aç/kapat
        if (tek && n == "pointerup" && baslangic.yer < 10 && performance.now() - baslangic.t < 400) {
          if (kamera.gTam) {
            kamera.gOto = !kamera.gOto;
            kamera.gBtn = !kamera.gOto;
            document.dispatchEvent(new Event("lt:garaj-dokunus"));
          }
        } else if (tek && n == "pointerup" && baslangic.yer < 1e9) {
          // sürükleyip bırakma: son ~100 ms parmak hızıyla dönmeye devam eder (durmuşsa yeniden başlar)
          const simdi = performance.now(),
            son = simdi - ornek[ornek.length - 1]?.t <= HIZ_PENCERE ? ornek : [];
          let v = 0;
          if (son.length > 1)
            v = ((son[son.length - 1].ly - son[0].ly) / Math.max(son[son.length - 1].t - son[0].t, 1)) * 1000;
          if (Math.abs(v) > 0.05) kamera.gYon = Math.sign(v);
          kamera.gV = Math.abs(v) > 0.05 ? v : kamera.gYon * GARAJ_DONME;
          kamera.gOto = true;
          kamera.gBtn = false;
        }
        // iki parmaktan biri kalktıysa kalan parmak sürüklemeye devam eder (sıçrama olmasın)
        if (dokunuslar.size == 1) {
          const [id, d] = [...dokunuslar.entries()][0];
          kamera.dp = id;
          [lx, ly0] = [d.x, d.y];
          baslangic.yer = 1e9;
        }
      }
      if (pe.pointerId === kamera.dp) kamera.dp = null;
    });
  cvs.addEventListener(
    "wheel",
    (e) => {
      if (oyun.mode != "garage") return;
      e.preventDefault();
      kamera.gz = cl(kamera.gz * Math.exp(e.deltaY * 0.001), GZ_MIN, GZ_MAX);
    },
    { passive: false },
  );
}
