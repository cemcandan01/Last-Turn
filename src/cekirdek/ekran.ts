// Ekran yönü kilidi: iOS ana ekran uygulamasında yön kilitlenemediği için, telefon kilitli yönün
// dışına dönerse içerik (#app) 90° döndürülür. AW/AH içeriğin genişliği ve yüksekliğidir.

export type YonKilidi = "auto" | "port" | "land";

export const ekran = {
  olock: "land" as YonKilidi,
  /** içeriğin dönme açısı: 0, 90, -90 */
  rot: 0,
  lastLand: 90,
  /** görünür alanın (ekranın) genişliği ve yüksekliği; dönmeden önceki ölçü */
  w: typeof innerWidth == "number" ? innerWidth : 844,
  h: typeof innerHeight == "number" ? innerHeight : 390,
  aw: typeof innerWidth == "number" ? innerWidth : 844,
  ah: typeof innerHeight == "number" ? innerHeight : 390,
};

let app: HTMLElement;
let probe: HTMLElement;

/** cihazın dönme açısı (0, 90, 180, 270) */
export const devO = (): number => {
  const w = window as Window & { orientation?: number };
  const o =
    typeof w.orientation == "number" ? w.orientation : (screen.orientation && screen.orientation.angle) || 0;
  return ((o % 360) + 360) % 360;
};

export function ekranKur() {
  app = document.getElementById("app")!;
  probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;inset:0;visibility:hidden;pointer-events:none;z-index:-1;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
  document.body.appendChild(probe);
  layout();
}

/** görünür alanın gerçek ölçüsü. iOS ana ekran uygulamasında innerWidth/Height ve visualViewport yön
 * değişiminden sonra eski (dikey) değerde kalabiliyor; bu yüzden ölçü, ekranı CSS ile (fixed, inset:0)
 * kaplayan ölçüm kutusundan alınır: sayfa düzeni neyse ölçü de odur. */
export function gorunurOlcu(): [number, number] {
  const r = probe ? probe.getBoundingClientRect() : null;
  if (r && r.width > 0 && r.height > 0) return [Math.round(r.width), Math.round(r.height)];
  const v = window.visualViewport;
  return [
    Math.round(v && v.width > 0 ? v.width : innerWidth),
    Math.round(v && v.height > 0 ? v.height : innerHeight),
  ];
}

/** ölçüm kutusunun boyutu her değiştiğinde (dönme, açılışta geç oturma) f çağrılır */
export function olcuIzle(f: () => void) {
  if (typeof ResizeObserver == "function") new ResizeObserver(() => f()).observe(probe);
}

export function layout() {
  const [W, H] = gorunurOlcu(),
    land = W > H,
    o = devO();
  if (land) ekran.lastLand = o == 270 ? 270 : 90;
  ekran.w = W;
  ekran.h = H;
  ekran.rot =
    ekran.olock == "land" && !land
      ? ekran.lastLand == 270
        ? -90
        : 90
      : ekran.olock == "port" && land
        ? o == 90
          ? -90
          : 90
        : 0;
  const ROT = ekran.rot;
  // içeriğin üst/sağ/alt/sol kenarı ekranın hangi kenarına denk geliyor
  const cs = getComputedStyle(probe),
    e = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map((v) => parseFloat(v) || 0),
    m = ROT == 90 ? [1, 2, 3, 0] : ROT == -90 ? [3, 0, 1, 2] : [0, 1, 2, 3];
  ekran.aw = ROT ? H : W;
  ekran.ah = ROT ? W : H;
  app.classList.toggle("land", ekran.aw > ekran.ah);
  const st = app.style;
  // dönme yokken boyut tamamen CSS'ten (inset:0): JS ölçüsü geç kalsa bile boşluk kalmaz
  st.width = ROT ? ekran.aw + "px" : "";
  st.height = ROT ? ekran.ah + "px" : "";
  st.transform =
    ROT == 90 ? `translate(${W}px,0) rotate(90deg)` : ROT == -90 ? `translate(0,${H}px) rotate(-90deg)` : "";
  ["--sat", "--sar", "--sab", "--sal"].forEach((k, i) => st.setProperty(k, e[m[i]] + "px"));
  st.setProperty("--aw", ekran.aw + "px");
  st.setProperty("--ah", ekran.ah + "px");
}

/** ekran koordinatını içerik koordinatına çevirir */
export const toApp = (x: number, y: number): [number, number] =>
  ekran.rot == 90 ? [y, ekran.w - x] : ekran.rot == -90 ? [ekran.h - y, x] : [x, y];
