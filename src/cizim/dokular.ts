// Kodla çizilen dokular: zemin benekleri, tabela sayıları, yazılar, bina pencereleri
import * as THREE from "three";

function tuval(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

/** benekli zemin dokusu: b zemin rengi, c1/c2 benek renkleri, rep tekrar */
export function ctex(b: string, c1: string, c2: string, rep: number) {
  const [c, x] = tuval(256, 256);
  x.fillStyle = b;
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    x.fillStyle = Math.random() < 0.5 ? c1 : c2;
    x.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 5, 2 + Math.random() * 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep);
  return t;
}

/** fren tabelası ve mesafe levhası */
export function numTex(n: string) {
  const [c, x] = tuval(128, 128);
  x.fillStyle = "#fff";
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = "#d8323a";
  x.fillRect(0, 0, 128, 18);
  x.fillStyle = "#111";
  x.font = "bold 54px sans-serif";
  x.textAlign = "center";
  x.fillText(n, 64, 88);
  return new THREE.CanvasTexture(c);
}

/** düz renkli zemin üstünde ortalı yazı */
export function textTex(t: string, w: number, h: number, bg: string, fg: string) {
  const [c, x] = tuval(w, h);
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  x.fillStyle = fg;
  x.font = `bold ${Math.round(h * 0.62)}px sans-serif`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(t, w / 2, h / 2 + 2);
  return new THREE.CanvasTexture(c);
}

/** gece bina cephesi: yanan ve sönük pencereler */
export function winTex(seed: number) {
  const [c, x] = tuval(64, 128);
  x.fillStyle = "#14171d";
  x.fillRect(0, 0, 64, 128);
  for (let r = 0; r < 16; r++)
    for (let k = 0; k < 4; k++) {
      const on = (r * 7 + k * 13 + seed * 5) % 11 < 5;
      x.fillStyle = on ? ((r + k + seed) % 3 ? "#ffd98a" : "#bfe1ff") : "#262b33";
      x.fillRect(4 + k * 15, 4 + r * 7.8, 10, 5);
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** araç üstü yazı (yarış numarası) */
export function yaziTuvali(t: string, fg: string) {
  const [c, x] = tuval(128, 96);
  x.fillStyle = fg;
  x.font = "bold 80px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(t, 64, 52);
  return new THREE.CanvasTexture(c);
}
