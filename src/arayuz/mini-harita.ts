// Mini harita: araç yukarı bakar. Araç imleci sabit (ortada, biraz altta), dünya aracın konumuna göre kayar ve
// yönüne göre döner (sağa dönünce harita saat yönünün tersine döner). Pist çizgisi her karede dünya
// koordinatından çizilir; test alanı gibi çizgisiz bölgeler bir kez büyük bir görüntüye çizilir.
import type { V2 } from "../cekirdek/matematik";
import type { Bolge } from "../dunya/bolgeler";
import type { Pist } from "../dunya/pist";
import { EA, EB, SX } from "../dunya/corak";

const W = 240;
/** imlecin yeri: ortada, biraz altta (önü daha çok görünsün) */
const OX = W / 2,
  OY = 160;
/** çizgisiz bölgelerin görüntü boyu */
const BM = 1536;
/** görünen genişlik (m): duruşta ~180, hızlandıkça ~260 */
const GEN_MIN = 180,
  GEN_MAX = 260,
  GEN_HIZ = 60;

let mmBase: HTMLCanvasElement;
let mmc: CanvasRenderingContext2D | null = null;
let MMV = { cx: 0, cz: 0, r: 900 };
/** pist çizgisi bölgesi: dünya koordinatında yol, başlangıç noktası ve yönü */
let yol: { yol: Path2D; pist: Pist; renk: string } | null = null;
/** yumuşatılmış görünen genişlik (m); null: sonraki karede doğrudan al */
let gen: number | null = null;
let sonZaman = 0;
/** son çizilen karenin dönüşümü (testler ve dış çizimler için) */
const M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** çizgisiz bölge görüntüsünde dünya koordinatından görüntü koordinatına */
export const mmP = (a: number, c: number): V2 => [
  BM / 2 + ((a - MMV.cx) / MMV.r) * (BM / 2),
  BM / 2 + ((c - MMV.cz) / MMV.r) * (BM / 2),
];

/** dünya noktasının son çizilen kareye göre mini harita (240×240) koordinatı */
export const mmDonustur = (wx: number, wz: number): V2 => [
  M.a * wx + M.c * wz + M.e,
  M.b * wx + M.d * wz + M.f,
];

export function miniHaritaKur(canvas: HTMLCanvasElement) {
  mmBase = document.createElement("canvas");
  mmBase.width = mmBase.height = BM;
  mmc = canvas.getContext ? canvas.getContext("2d") : null;
}

/** oyundaki bölge (önizleme geçici çizer, sonra bu geri çizilir) */
let etkin: Bolge | null | undefined;

/** geçici çizimden sonra oyundaki bölgenin haritasına dön */
export const mmGeriAl = () => mmDraw(etkin);

export function mmDraw(r?: Bolge | null, gecici = false) {
  if (!mmBase) return;
  if (!gecici) etkin = r;
  gen = null;
  yol = null;
  const x = mmBase.getContext("2d")!;
  x.clearRect(0, 0, BM, BM);
  if (r && r.mm) {
    const b = r.box;
    MMV = { cx: (b[0] + b[1]) / 2, cz: (b[2] + b[3]) / 2, r: Math.max(b[1] - b[0], b[3] - b[2]) / 2 - 20 };
    r.mm(x, mmP);
  } else if (r && r.TR) {
    const TR = r.TR,
      p = new Path2D();
    let son: V2 | null = null;
    // 3 m'den sık noktalar atlanır: kare başına çizilen parça sayısı düşer
    TR.P.forEach((q, i) => {
      if (son && i < TR.N - 1 && Math.hypot(q[0] - son[0], q[1] - son[1]) < 3) return;
      if (son) p.lineTo(q[0], q[1]);
      else p.moveTo(q[0], q[1]);
      son = q;
    });
    if (!TR.open) p.closePath();
    yol = { yol: p, pist: TR, renk: r.col };
  } else {
    MMV = { cx: 0, cz: 0, r: 900 };
    const k = BM / 1800;
    x.fillStyle = "rgba(140,107,69,.55)";
    const h = mmP(-900, -900),
      e = mmP(900, 900);
    x.fillRect(h[0], h[1], e[0] - h[0], e[1] - h[1]);
    x.strokeStyle = "#9aa3b5";
    x.lineWidth = 4 * k;
    const o = mmP(0, 0);
    x.beginPath();
    x.ellipse(o[0], o[1], EA * k, EB * k, 0, 0, 7);
    x.stroke();
    const a = mmP(SX, -800),
      b = mmP(SX, 800);
    x.beginPath();
    x.moveTo(a[0], a[1]);
    x.lineTo(b[0], b[1]);
    x.stroke();
  }
}

/** haritada çizilecek öteki araç (uzak araç, hayalet) */
export interface HaritaAraci {
  id: string;
  goster: { x: number; z: number };
}

/**
 * Araç (x, z) konumunda, (fx, fz) = (sin h, cos h) yönünde, hızı v (m/s). Dünya, imleç ortada sabit ve hep
 * yukarı bakacak biçimde döner.
 */
export function miniHaritaCiz(
  x: number,
  z: number,
  fxm: number,
  fzm: number,
  v = 30,
  oteki: readonly HaritaAraci[] = [],
  hayalet = "hayalet",
) {
  if (!mmc) return;
  const t = performance.now(),
    hedef = GEN_MIN + (GEN_MAX - GEN_MIN) * Math.min(1, v / GEN_HIZ);
  // yakınlık hıza göre yavaşça açılır (saniyede ~%60); ilk karede doğrudan
  gen = gen === null ? hedef : gen + (hedef - gen) * Math.min(1, ((t - sonZaman) / 1000) * 2);
  sonZaman = t;
  const s = W / gen,
    // dünya (x, z) → ekran: araç yönü yukarı. Dönüş açısı h - π (y aşağı, x sağ; ayna yok)
    a = -s * fzm,
    b = -s * fxm,
    c = s * fxm,
    d = -s * fzm;
  M.a = a;
  M.b = b;
  M.c = c;
  M.d = d;
  M.e = OX - (a * x + c * z);
  M.f = OY - (b * x + d * z);
  mmc.setTransform(1, 0, 0, 1, 0, 0);
  mmc.clearRect(0, 0, W, W);
  if (yol) {
    const TR = yol.pist;
    mmc.setTransform(a, b, c, d, M.e, M.f);
    mmc.lineJoin = mmc.lineCap = "round";
    mmc.strokeStyle = "rgba(0,0,0,.55)";
    mmc.lineWidth = 11 / s;
    mmc.stroke(yol.yol);
    mmc.strokeStyle = yol.renk;
    mmc.lineWidth = 6.5 / s;
    mmc.stroke(yol.yol);
    mmc.setTransform(1, 0, 0, 1, 0, 0);
    // başlangıç/bitiş çizgisi: yola dik beyaz çubuk; açık pistte bitiş turuncu
    const cizgi = (i: number, renk: string, dik: boolean) => {
      const q = mmDonustur(TR.P[i][0], TR.P[i][1]),
        tx = M.a * TR.T[i][0] + M.c * TR.T[i][1],
        tz = M.b * TR.T[i][0] + M.d * TR.T[i][1],
        n = Math.hypot(tx, tz) || 1,
        ux = tx / n,
        uy = tz / n;
      mmc!.strokeStyle = renk;
      mmc!.lineWidth = dik ? 4 : 5;
      mmc!.beginPath();
      mmc!.moveTo(q[0] + uy * 9, q[1] - ux * 9);
      mmc!.lineTo(q[0] - uy * 9, q[1] + ux * 9);
      mmc!.stroke();
    };
    cizgi(0, "#fff", true);
    if (TR.open) cizgi(TR.N - 1, "#ff7a3c", false);
  } else {
    mmc.setTransform(a, b, c, d, M.e, M.f);
    const k = BM / 2 / MMV.r;
    mmc.translate(MMV.cx - BM / 2 / k, MMV.cz - BM / 2 / k);
    mmc.scale(1 / k, 1 / k);
    mmc.imageSmoothingQuality = "high";
    mmc.drawImage(mmBase, 0, 0);
    mmc.setTransform(1, 0, 0, 1, 0, 0);
  }
  // öteki araçlar: aynı dönüşümle; hayalet açık renk
  for (const u of oteki) {
    const q = mmDonustur(u.goster.x, u.goster.z);
    if (q[0] < -6 || q[0] > W + 6 || q[1] < -6 || q[1] > W + 6) continue;
    mmc.fillStyle = u.id == hayalet ? "rgba(255,255,255,.7)" : "#ff4d4d";
    mmc.strokeStyle = "#000a";
    mmc.lineWidth = 1.5;
    mmc.beginPath();
    mmc.arc(q[0], q[1], 4.5, 0, 7);
    mmc.fill();
    mmc.stroke();
  }
  // araç imleci: ortada sabit, hep yukarı
  mmc.fillStyle = "#fff";
  mmc.strokeStyle = "#ff7a3c";
  mmc.lineWidth = 3;
  mmc.beginPath();
  mmc.moveTo(OX, OY - 13);
  mmc.lineTo(OX + 8, OY + 9);
  mmc.lineTo(OX, OY + 4);
  mmc.lineTo(OX - 8, OY + 9);
  mmc.closePath();
  mmc.fill();
  mmc.stroke();
}
