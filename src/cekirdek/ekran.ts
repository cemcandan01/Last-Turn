// Ekran yönü kilidi: iOS ana ekran uygulamasında yön kilitlenemediği için, telefon kilitli yönün
// dışına dönerse içerik (#app) 90° döndürülür. AW/AH içeriğin genişliği ve yüksekliğidir.

export type YonKilidi = "auto" | "port" | "land";

export const ekran = {
  olock: "land" as YonKilidi,
  /** içeriğin dönme açısı: 0, 90, -90 */
  rot: 0,
  lastLand: 90,
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
    "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
  document.body.appendChild(probe);
  layout();
}

export function layout() {
  const W = innerWidth,
    H = innerHeight,
    land = W > H,
    o = devO();
  if (land) ekran.lastLand = o == 270 ? 270 : 90;
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
  st.width = ekran.aw + "px";
  st.height = ekran.ah + "px";
  st.transform =
    ROT == 90 ? `translate(${W}px,0) rotate(90deg)` : ROT == -90 ? `translate(0,${H}px) rotate(-90deg)` : "";
  ["--sat", "--sar", "--sab", "--sal"].forEach((k, i) => st.setProperty(k, e[m[i]] + "px"));
  st.setProperty("--aw", ekran.aw + "px");
  st.setProperty("--ah", ekran.ah + "px");
}

/** ekran koordinatını içerik koordinatına çevirir */
export const toApp = (x: number, y: number): [number, number] =>
  ekran.rot == 90 ? [y, innerWidth - x] : ekran.rot == -90 ? [innerHeight - y, x] : [x, y];
