// Mini harita: araç yukarı bakar. Araç imleci sabit (ortada, biraz altta), dünya aracın konumuna göre kayar ve
// yönüne göre döner (sağa dönünce harita saat yönünün tersine döner). Pist çizgisi her karede dünya
// koordinatından çizilir; test alanı gibi çizgisiz bölgeler bir kez büyük bir görüntüye çizilir.
import type { V2 } from "../cekirdek/matematik";
import type { Bolge } from "../dunya/bolgeler";
import type { Pist } from "../dunya/pist";
import { EA, EB, SX } from "../dunya/corak";

const W = 240;
/** imlecin yeri: ortada, yüksekliğin ~%68'i (önü daha çok görünsün) */
const OX = W / 2,
  OY = 164;
/** çizgisiz bölgelerin görüntü boyu */
const BM = 1536;
/** görünen genişlik (m): duruşta ~180, hızlandıkça ~260 */
const GEN_MIN = 180,
  GEN_MAX = 260,
  GEN_HIZ = 60;
/** eğik bakış: kamera araçtan CB m geride, H yükseklikte, EGIM derece aşağı bakar; G dikey kazanç (ileriyi açar) */
const EGIM = (55 * Math.PI) / 180,
  CH = 100,
  CB = 10,
  GK = 1.3,
  SE = Math.sin(EGIM),
  CE = Math.cos(EGIM),
  D0 = CH * SE + CB * CE,
  YN0 = (CH * CE - CB * SE) / D0;

let mmBase: HTMLCanvasElement;
let mmc: CanvasRenderingContext2D | null = null;
let MMV = { cx: 0, cz: 0, r: 900 };
/** pist çizgisi bölgesi: dünya koordinatında yol, başlangıç noktası ve yönü */
let yol: { pts: V2[]; pist: Pist; renk: string } | null = null;
/** yumuşatılmış görünen genişlik (m); null: sonraki karede doğrudan al */
let gen: number | null = null;
let sonZaman = 0;
/** son çizilen karenin çerçevesi: araç konumu, yönü ve piksel/metre ölçeği (testler ve dış çizimler için) */
const M = { x: 0, z: 0, fx: 0, fz: 1, s: 1 };

/** araç çerçevesindeki (sağ r, ileri f) yer noktası → mini harita pikseli; derinlik <= 0.2 ise null */
const yerProj = (r: number, f: number): V2 | null => {
  const d = CH * SE + (f + CB) * CE;
  if (d < 0.2) return null;
  const yn = (CH * CE - (f + CB) * SE) / d;
  return [OX + (M.s * D0 * r) / d, OY + GK * M.s * D0 * (yn - YN0)];
};

/** çizgisiz bölge görüntüsünde dünya koordinatından görüntü koordinatına */
export const mmP = (a: number, c: number): V2 => [
  BM / 2 + ((a - MMV.cx) / MMV.r) * (BM / 2),
  BM / 2 + ((c - MMV.cz) / MMV.r) * (BM / 2),
];

/** dünya noktasının son çizilen kareye göre mini harita (240×240) koordinatı; kameranın arkasındaysa dışarıda */
export const mmDonustur = (wx: number, wz: number): V2 => {
  const dx = wx - M.x,
    dz = wz - M.z;
  return yerProj(M.fx * dz - M.fz * dx, M.fx * dx + M.fz * dz) ?? [-999, -999];
};

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
      pts: V2[] = [];
    // 3 m'den sık noktalar atlanır: kare başına işlenen nokta sayısı düşer
    TR.P.forEach((q, i) => {
      const son = pts[pts.length - 1];
      if (son && i < TR.N - 1 && Math.hypot(q[0] - son[0], q[1] - son[1]) < 3) return;
      pts.push(q);
    });
    if (!TR.open) pts.push(TR.P[0]);
    yol = { pts, pist: TR, renk: r.col };
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
  Object.assign(M, { x, z, fx: fxm, fz: fzm, s: W / gen });
  mmc.setTransform(1, 0, 0, 1, 0, 0);
  mmc.clearRect(0, 0, W, W);
  if (yol) {
    const TR = yol.pist,
      ileriMax = gen * 1.6,
      geriMin = -gen * 0.45;
    mmc.lineJoin = mmc.lineCap = "round";
    // uzaklaştıkça sürekli daralan yol: her parça kendi derinliğinin ölçeğiyle çizilir (basamak yok);
    // imlecin arkası imleçten kalın olmaz (ölçek f=0'da sabitlenir)
    const olcekAt = (f: number) => (M.s * D0) / (CH * SE + (Math.max(f, 0) + CB) * CE);
    const parcalar: { a: V2; b: V2; o: number }[] = [];
    let oncekiPr: V2 | null = null,
      oncekiF = 0;
    for (const q of yol.pts) {
      const dx = q[0] - x,
        dz = q[1] - z,
        f = fxm * dx + fzm * dz;
      const pr = f < geriMin || f > ileriMax ? null : yerProj(fxm * dz - fzm * dx, f);
      if (pr && oncekiPr) parcalar.push({ a: oncekiPr, b: pr, o: olcekAt((f + oncekiF) / 2) });
      oncekiPr = pr;
      oncekiF = f;
    }
    for (const [renk, tab, min] of [
      ["rgba(0,0,0,.55)", 12, 2.2],
      [yol.renk, 7, 1.2],
    ] as const) {
      mmc.strokeStyle = renk;
      for (const p of parcalar) {
        mmc.lineWidth = Math.max(min, tab * p.o);
        mmc.beginPath();
        mmc.moveTo(p.a[0], p.a[1]);
        mmc.lineTo(p.b[0], p.b[1]);
        mmc.stroke();
      }
    }
    // başlangıç/bitiş çizgisi: yola dik beyaz çubuk; açık pistte bitiş turuncu
    const cizgi = (i: number, renk: string, dik: boolean) => {
      const a = mmDonustur(TR.P[i][0] + TR.T[i][1] * 6, TR.P[i][1] - TR.T[i][0] * 6),
        b = mmDonustur(TR.P[i][0] - TR.T[i][1] * 6, TR.P[i][1] + TR.T[i][0] * 6);
      if (a[0] < -900 || b[0] < -900) return;
      mmc!.strokeStyle = renk;
      mmc!.lineWidth = dik ? 4 : 5;
      mmc!.beginPath();
      mmc!.moveTo(a[0], a[1]);
      mmc!.lineTo(b[0], b[1]);
      mmc!.stroke();
    };
    cizgi(0, "#fff", true);
    if (TR.open) cizgi(TR.N - 1, "#ff7a3c", false);
  } else {
    // görüntü, derinlik şeritlerine bölünüp her şeride o derinliğin ölçeğiyle çizilir
    const k = BM / 2 / MMV.r,
      SERIT = 28,
      fA = -gen * 0.45,
      fB = gen * 1.6;
    mmc.imageSmoothingQuality = "low";
    for (let i = 0; i < SERIT; i++) {
      const f0 = fA + ((i + 0.5) / SERIT) * (fB - fA),
        p0 = yerProj(0, f0),
        px = yerProj(1, f0),
        py = yerProj(0, f0 + 1),
        ua = yerProj(0, fA + (i / SERIT) * (fB - fA)),
        ub = yerProj(0, fA + ((i + 1) / SERIT) * (fB - fA));
      if (!p0 || !px || !py || !ua || !ub) continue;
      const kx = px[0] - p0[0],
        ky = py[1] - p0[1];
      // dünya → ekran: r = fx·dz − fz·dx, f = fx·dx + fz·dz; şerit içinde ölçek sabit
      const a = -kx * fzm,
        c = kx * fxm,
        b = ky * fxm,
        d = ky * fzm,
        e = p0[0] - (a * x + c * z),
        f = p0[1] - ky * f0 - (b * x + d * z);
      mmc.save();
      mmc.beginPath();
      mmc.rect(0, Math.min(ua[1], ub[1]) - 0.5, W, Math.abs(ub[1] - ua[1]) + 1);
      mmc.clip();
      mmc.setTransform(a, b, c, d, e, f);
      mmc.translate(MMV.cx - BM / 2 / k, MMV.cz - BM / 2 / k);
      mmc.scale(1 / k, 1 / k);
      mmc.drawImage(mmBase, 0, 0);
      mmc.restore();
    }
    mmc.setTransform(1, 0, 0, 1, 0, 0);
  }
  // öteki araçlar: aynı dönüşümle; hayalet açık renk
  for (const u of oteki) {
    const q = mmDonustur(u.goster.x, u.goster.z);
    // yakın olan büyük, uzak olan küçük çizilir
    const yr = Math.max(2.5, Math.min(4.5, 4.5 - Math.max(0, OY - q[1]) / 40));
    if (q[0] < -6 || q[0] > W + 6 || q[1] < -6 || q[1] > W + 6) continue;
    mmc.fillStyle = u.id == hayalet ? "rgba(255,255,255,.7)" : "#ff4d4d";
    mmc.strokeStyle = "#000a";
    mmc.lineWidth = 1.5;
    mmc.beginPath();
    mmc.arc(q[0], q[1], yr, 0, 7);
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
