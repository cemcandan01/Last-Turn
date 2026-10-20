// Mini harita: serbest sürüşte test alanı, yarışta o pist. Taban bir kez çizilir, her karede araç oku eklenir.
import type { V2 } from "../cekirdek/matematik";
import type { Bolge } from "../dunya/bolgeler";
import { EA, EB, SX } from "../dunya/corak";

let mmBase: HTMLCanvasElement;
let mmc: CanvasRenderingContext2D | null = null;
let MMV = { cx: 0, cz: 0, r: 900 };

/** dünya koordinatından mini harita koordinatına */
export const mmP = (a: number, c: number): V2 => [
  120 + ((a - MMV.cx) / MMV.r) * 112,
  120 + ((c - MMV.cz) / MMV.r) * 112,
];

export function miniHaritaKur(canvas: HTMLCanvasElement) {
  mmBase = document.createElement("canvas");
  mmBase.width = mmBase.height = 240;
  mmc = canvas.getContext ? canvas.getContext("2d") : null;
}

export function mmDraw(r?: Bolge | null) {
  if (!mmBase) return;
  const x = mmBase.getContext("2d")!;
  x.clearRect(0, 0, 240, 240);
  if (r && r.mm) {
    const b = r.box;
    MMV = { cx: (b[0] + b[1]) / 2, cz: (b[2] + b[3]) / 2, r: Math.max(b[1] - b[0], b[3] - b[2]) / 2 - 20 };
    r.mm(x, mmP);
  } else if (r && r.TR) {
    const b = r.box;
    MMV = { cx: (b[0] + b[1]) / 2, cz: (b[2] + b[3]) / 2, r: Math.max(b[1] - b[0], b[3] - b[2]) / 2 - 100 };
    const TR = r.TR;
    x.strokeStyle = r.col;
    x.lineWidth = 6;
    x.lineJoin = "round";
    x.beginPath();
    TR.P.forEach((p, i) => {
      const q = mmP(p[0], p[1]);
      if (i) x.lineTo(q[0], q[1]);
      else x.moveTo(q[0], q[1]);
    });
    if (!TR.open) x.closePath();
    x.stroke();
    const s = mmP(TR.P[0][0], TR.P[0][1]);
    x.fillStyle = "#fff";
    x.fillRect(s[0] - 5, s[1] - 5, 10, 10);
    if (TR.open) {
      const e = mmP(TR.P[TR.N - 1][0], TR.P[TR.N - 1][1]);
      x.fillStyle = "#ff7a3c";
      x.fillRect(e[0] - 5, e[1] - 5, 10, 10);
    }
  } else {
    MMV = { cx: 0, cz: 0, r: 900 };
    const h = mmP(-900, -900),
      e = mmP(900, 900);
    x.fillStyle = "rgba(140,107,69,.55)";
    x.fillRect(h[0], h[1], e[0] - h[0], e[1] - h[1]);
    x.strokeStyle = "#9aa3b5";
    x.lineWidth = 4;
    const o = mmP(0, 0);
    x.beginPath();
    x.ellipse(o[0], o[1], (EA / MMV.r) * 112, (EB / MMV.r) * 112, 0, 0, 7);
    x.stroke();
    const a = mmP(SX, -800),
      b = mmP(SX, 800);
    x.beginPath();
    x.moveTo(a[0], a[1]);
    x.lineTo(b[0], b[1]);
    x.stroke();
  }
}

/** araç oku: (x, z) konumunda, (fx, fz) yönünde */
export function miniHaritaCiz(x: number, z: number, fxm: number, fzm: number) {
  if (!mmc) return;
  mmc.clearRect(0, 0, 240, 240);
  mmc.drawImage(mmBase, 0, 0);
  const q = mmP(x, z);
  mmc.fillStyle = "#fff";
  mmc.strokeStyle = "#ff7a3c";
  mmc.lineWidth = 3;
  mmc.beginPath();
  mmc.moveTo(q[0] + fxm * 12, q[1] + fzm * 12);
  mmc.lineTo(q[0] - fxm * 6 + fzm * 6, q[1] - fzm * 6 - fxm * 6);
  mmc.lineTo(q[0] - fxm * 6 - fzm * 6, q[1] - fzm * 6 + fxm * 6);
  mmc.closePath();
  mmc.fill();
  mmc.stroke();
}
