// Yeni fizik modeli: katı gövde + 4 teker. Her teker zemini ışınla bulur (yaylı süspansiyon, amortisör, denge
// çubuğu), lastik kuvveti teker dönüşüyle birlikte hesaplanır (patinaj, kilitlenme), motor-vites-diferansiyel
// torku tekerlere dağıtır. Gövde üç eksende döner: frende öne, virajda yana yatar, zıplamada havada döner.
// Oyun ölçeği: yerçekimi klasik modelle aynı (YERCEKIMI = 24); tutuş katsayıları gerçekçi aralıkta.
// Sürüş yardımları (ABS, çekiş, denge, viraj, drift) kuvvet ve tork olarak uygulanır.
import { ad, cl, sm } from "../../cekirdek/matematik";
import { direksiyonVeGaz, driftPenceresi, driftSiniri, driftSkoru, tozVeDuman, zeminIzleri } from "../ortak";
import type { YarisTuru } from "../../arac/araclar";
import type { AdimSonucu, FizikBaglami, FizikGirdisi, SimDurumu } from "../tipler";
import { SURF, TIRES, VMAX, YERCEKIMI } from "../veriler";
import { aracFizigi, RHO, torkEgrisi, VITESLER, type AracFizigi } from "./arac-fizigi";
import { lastikKuvveti, type LastikParam, type LastikSonucu } from "./lastik";

/** ara adım sayısı: 1/60 sn'lik adım 8'e bölünür (480 Hz) */
export const ARA = 8;
/** düşük hızda kayma hesabının paydası (m/s): durağan araçta titreşimi önler */
const VD_X = 3,
  VD_Y = 2;
/** tutuş ölçeği: yarış temposu pistlerin hedef sürelerine uysun diye */
export const TUTUS = 1.15;
/**
 * gevşek zemin (toprak, çim, çamur, kar): tutuş asfalttan düşük, tepe kayma açısı küçük (en çok ~13,5°) ve tepeden
 * sonra kuvvet düşer; arka biraz daha gevşek. Lastik sınırı aşınca araç kayar: toprakta tam gaz ve tam direksiyonla
 * viraj dönülmez (fren gerekir), abartan spin atar.
 */
export const GEVSEK_TUTUS = 0.75,
  GEVSEK_TEPE = 0.24,
  GEVSEK_C = 1.55,
  GEVSEK_ARKA = 0.92;
/** dört çekerde akslar arası bağ (1/s): düşük değer arka tekerin gazla patinaj yapmasına izin verir */
const AKS_BAGI = 20;

export interface YeniTeker {
  /** açısal hız (rad/s), dönme açısı (çizim) */
  w: number;
  don: number;
  /** süspansiyon sıkışması (m) ve dikey yük (N) */
  sik: number;
  Fz: number;
  temas: boolean;
  /** son kayma oranı ve kayma açısı tanjantı */
  kap: number;
  tanA: number;
  /** altındaki zemin (SURF indeksi) */
  zemin: number;
  /** ABS fren çarpanı */
  abs: number;
  /** durağan sıkışma (çizimde süspansiyon hareketi bundan ölçülür) */
  c0: number;
}

export interface YeniDurum {
  /** ağırlık merkezi konumu ve hızı (dünya) */
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  /** yönelim (gövde → dünya dördeyi) */
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  /** açısal hız (dünya) */
  ox: number;
  oy: number;
  oz: number;
  tk: YeniTeker[];
  /** motor devri (gösterge), vites (-1 geri, 1-6), vites geçiş süresi */
  rpm: number;
  vites: number;
  vitesT: number;
  /** turbo basıncı (0 boş, 1 dolu; turbosuz araçta kullanılmaz) */
  turbo: number;
  /** önceki adımın boylamsal hızı (ivme için) */
  vlOnce: number;
}

// ---------- vektör ve dördey yardımcıları (ayırma yapmadan)
interface V {
  x: number;
  y: number;
  z: number;
}
const v3 = (): V => ({ x: 0, y: 0, z: 0 });

/** gövde ekseninden dünyaya döndür */
function rot(Y: YeniDurum, x: number, y: number, z: number, o: V): V {
  const qx = Y.qx,
    qy = Y.qy,
    qz = Y.qz,
    qw = Y.qw;
  const tx = 2 * (qy * z - qz * y),
    ty = 2 * (qz * x - qx * z),
    tz = 2 * (qx * y - qy * x);
  o.x = x + qw * tx + (qy * tz - qz * ty);
  o.y = y + qw * ty + (qz * tx - qx * tz);
  o.z = z + qw * tz + (qx * ty - qy * tx);
  return o;
}
/** dünyadan gövde eksenine */
function rotTers(Y: YeniDurum, x: number, y: number, z: number, o: V): V {
  const qx = -Y.qx,
    qy = -Y.qy,
    qz = -Y.qz,
    qw = Y.qw;
  const tx = 2 * (qy * z - qz * y),
    ty = 2 * (qz * x - qx * z),
    tz = 2 * (qx * y - qy * x);
  o.x = x + qw * tx + (qy * tz - qz * ty);
  o.y = y + qw * ty + (qz * tx - qx * tz);
  o.z = z + qw * tz + (qx * ty - qy * tx);
  return o;
}

// ara değişkenler
const SOL = v3(),
  UST = v3(),
  ON = v3(),
  A = v3(),
  C = v3(),
  N = v3(),
  T1 = v3(),
  T2 = v3(),
  LS: LastikSonucu = { Fx: 0, Fy: 0, s: 0 };

/**
 * teker dönüşünün örtük çözümü: I·(ω − ω0) = h·(T − r·Fx(ω) − fren). Lastik kuvveti tepeyi geçince doğrusal
 * yaklaşım salınır; bu yüzden denklem ikiye bölmeyle tam çözülür (çözüm her zaman ω0 + hT/I ile yer hızı arasında).
 * Fren Coulomb sürtünmesi gibi: tekeri durdurabiliyorsa kilitler. Lastik kuvveti out'a yazılır.
 */
function tekerCoz(
  w0: number,
  Iw: number,
  h: number,
  T: number,
  Tb: number,
  r: number,
  vxw: number,
  dx: number,
  Fz: number,
  tanA: number,
  p: LastikParam,
  out: LastikSonucu,
): number {
  const f = (w: number) =>
      Iw * (w - w0) - h * T + h * r * lastikKuvveti(Fz, (w * r - vxw) / dx, tanA, p, out).Fx,
    f0 = f(0),
    hb = h * Tb;
  if (Math.abs(f0) <= hb) {
    lastikKuvveti(Fz, -vxw / dx, tanA, p, out);
    return 0;
  }
  const weq = vxw / r,
    wf = w0 + (h * T) / Iw;
  let lo: number, hi: number, c: number;
  if (f0 < -hb) {
    lo = 0;
    hi = Math.max(weq, wf, 0) + 1;
    c = hb;
  } else {
    lo = Math.min(weq, wf, 0) - 1;
    hi = 0;
    c = -hb;
  }
  for (let k = 0; k < 22; k++) {
    const m = (lo + hi) / 2;
    if (f(m) + c > 0) hi = m;
    else lo = m;
  }
  const w = (lo + hi) / 2;
  lastikKuvveti(Fz, (w * r - vxw) / dx, tanA, p, out);
  return w;
}

/** zemin normali (sonlu farklar) */
function normal(H: (x: number, z: number) => number, x: number, z: number, o: V): V {
  const e = 0.5,
    gx = (H(x + e, z) - H(x - e, z)) / (2 * e),
    gz = (H(x, z + e) - H(x, z - e)) / (2 * e),
    l = Math.hypot(gx, 1, gz);
  o.x = -gx / l;
  o.y = 1 / l;
  o.z = -gz / l;
  return o;
}

/** dördey çarpımı a ⊗ b */
function qCarp(a: number[], b: number[]): number[] {
  const [ax, ay, az, aw] = a,
    [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/**
 * aracı durağan haliyle (S'den) kur: gövde zeminin eğimine oturur (yokuşta ön tekerler gömülmesin),
 * ağırlık merkezi tekerler durağan sıkışmadayken olacağı yükseklikte
 */
export function yeniBaslat(d: SimDurumu, cx: FizikBaglami): YeniDurum {
  const S = d.S,
    F = aracFizigi(cx.kurulum.car, cx.kurulum),
    h = S.h,
    sh = Math.sin(h),
    ch = Math.cos(h);
  // tekerlerin altındaki zemin (gövde düzken)
  const gh = F.tk.map((t) => cx.dunya.H(S.x + t.x * ch + t.z * sh, S.z - t.x * sh + t.z * ch)),
    on = (gh[0] + gh[1]) / 2,
    arka = (gh[2] + gh[3]) / 2,
    sol = (gh[0] + gh[2]) / 2,
    sag = (gh[1] + gh[3]) / 2,
    iz = F.tk[0].x - F.tk[1].x,
    th = Math.atan2(on - arka, F.aks),
    fi = Math.atan2(sol - sag, iz),
    q = qCarp(qCarp([0, Math.sin(h / 2), 0, Math.cos(h / 2)], [Math.sin(-th / 2), 0, 0, Math.cos(th / 2)]), [
      0,
      0,
      Math.sin(fi / 2),
      Math.cos(fi / 2),
    ]),
    yer = (on + arka) / 2;
  const Y: YeniDurum = {
    px: 0,
    py: 0,
    pz: 0,
    vx: S.vx,
    vy: 0,
    vz: S.vz,
    qx: q[0],
    qy: q[1],
    qz: q[2],
    qw: q[3],
    ox: 0,
    oy: S.w,
    oz: 0,
    tk: F.tk.map((t) => ({
      w: (S.vx * Math.sin(h) + S.vz * Math.cos(h)) / t.r,
      don: 0,
      sik: t.c0,
      Fz: t.Fz0,
      temas: true,
      kap: 0,
      tanA: 0,
      zemin: 1,
      abs: 1,
      c0: t.c0,
    })),
    rpm: 900,
    vites: 1,
    vitesT: 0,
    turbo: 0,
    vlOnce: 0,
  };
  rot(Y, 0, F.cgY, F.cgZ, T1);
  Y.px = S.x + T1.x;
  Y.py = yer + T1.y;
  Y.pz = S.z + T1.z;
  return Y;
}

/** model koordinatındaki noktanın dünya konumu */
function noktaDunya(Y: YeniDurum, F: AracFizigi, x: number, y: number, z: number, o: V): V {
  rot(Y, x, y - F.cgY, z - F.cgZ, o);
  o.x += Y.px;
  o.y += Y.py;
  o.z += Y.pz;
  return o;
}

/** S'yi (oyunun okuduğu araç durumu) yeni modelin durumundan güncelle */
function cikis(d: SimDurumu, Y: YeniDurum, F: AracFizigi) {
  const S = d.S;
  noktaDunya(Y, F, 0, 0, 0, T1);
  S.x = T1.x;
  S.y = T1.y;
  S.z = T1.z;
  rot(Y, 0, 0, 1, ON);
  S.h = Math.atan2(ON.x, ON.z);
  S.vx = Y.vx;
  S.vz = Y.vz;
  S.vy = Y.vy;
  S.w = Y.oy;
}

/** yeni modelin bir adımı (dt = 1/60 sn; içeride ARA ara adım) */
export function yeniAdim(
  d: SimDurumu,
  Y: YeniDurum,
  gi: FizikGirdisi,
  cx: FizikBaglami,
  dt: number,
): AdimSonucu {
  const S = d.S,
    DR = d.DR,
    W = cx.dunya,
    K = cx.kurulum,
    CAR = K.car,
    tu = K.tu,
    as = K.as,
    F = aracFizigi(CAR, K),
    T = TIRES[K.tire],
    g = YERCEKIMI;
  // ---------- zemin: önce tekerlerin altı, en son merkez (bölge ve pist ipucu merkeze göre kalsın)
  for (let i = 0; i < 4; i++) {
    const t = F.tk[i];
    Y.tk[i].c0 = t.c0;
    noktaDunya(Y, F, t.x, 0, t.z, T1);
    Y.tk[i].zemin = W.surf(T1.x, T1.z);
  }
  const si = W.surf(S.x, S.z);
  zeminIzleri(S, si, dt);
  direksiyonVeGaz(d, gi, cx, dt);
  const st = d.st;
  // ---------- hız ve kayma açısı (aracın yönüne göre)
  let fx = Math.sin(S.h),
    fz = Math.cos(S.h);
  const v = Math.hypot(Y.vx, Y.vz),
    vl = Y.vx * fx + Y.vz * fz,
    vt = Y.vx * fz - Y.vz * fx,
    be = Math.atan2(vt, Math.max(vl, 0.5)),
    ab = Math.abs(be),
    bmax = driftSiniri(v);
  driftPenceresi(d, gi, cx, v, be, ab, bmax, dt);
  // ---------- lastik değerleri: her teker kendi zemininde
  const kz = Math.max(DR.k, sm(0.1, 0.3, ab) * Math.min(1, +gi.g) * as.dft),
    spn = Math.min(1, Math.abs(vl) / VMAX),
    // uzmanlık: araç kendi yarış türünün pistinde daha iyi tutar (başka yerde değeri değişmez)
    // modifiyeli araçta tür uyumu tablosu (uzT: tür → [tutuş, güç]); stok araçta yalnız kendi türü
    yt = W.yolTuru(),
    uzT = yt && CAR.uzT ? CAR.uzT[yt as YarisTuru] : undefined,
    uzman = uzT ? uzT[0] : yt == CAR.ty ? (CAR.uz ?? 1) : 1,
    uzmanG = uzT ? uzT[1] : yt == CAR.ty ? (CAR.uzg ?? 1) : 1,
    LP: LastikParam[] = [];
  let muOrt = 0;
  for (let i = 0; i < 4; i++) {
    const t = F.tk[i],
      zi = Y.tk[i].zemin,
      Sf = SURF[zi],
      ti = Sf.ti,
      gevsek = zi != 1,
      tp = t.on ? tu.tpf : tu.tpr,
      pg = 1 - (gevsek ? 0.35 : 0.15) * (tp - 1);
    let mu =
      ((Sf.a / 30) *
        T.g[ti] *
        CAR.gr[ti] *
        W.havaTutusu() *
        (1 - 0.3 * S.wet) *
        (1 + 0.25 * as.grip) *
        TUTUS *
        pg) /
      (1 + 0.5 * S.mud);
    mu *= t.on ? CAR.fb : CAR.rb * (1 - 0.3 * as.ini * DR.k);
    if (gevsek) mu *= GEVSEK_TUTUS * (t.on ? 1 : GEVSEK_ARKA);
    mu *= uzman;
    let B = T.B[ti] * (zi == 3 ? 0.85 : 1) * tp,
      Cc = gevsek ? Math.max(T.C[ti], GEVSEK_C) : T.C[ti];
    // asfaltta drift: arka lastik kaymaya başlayınca (drift yardımı açıkken) toprakta olduğu gibi yumuşak ve uzun kayar
    if (!gevsek && kz > 0) {
      B *= t.on ? 1 - 0.2 * kz : 1 - 0.45 * kz;
      if (!t.on) mu *= 1 - 0.1 * kz;
      Cc += (1.3 - Cc) * kz;
    }
    const C1 = Math.max(1.05, Cc),
      ap = Math.tan(Math.PI / (2 * C1)) / B;
    LP.push({
      muY: mu,
      muX: mu * (T.lg ? T.lg[ti] : 1),
      kp: gevsek ? 0.18 : 0.11,
      ap: gevsek ? Math.min(ap, GEVSEK_TEPE) : ap,
      C: Cc,
    });
    muOrt += mu / 4;
  }
  // ---------- direksiyon: hıza duyarlı, viraj desteğiyle biraz fazla; drift desteği karşı direksiyona yardım eder
  const pv0 = Math.atan2(Y.vx, Y.vz);
  let dlt =
    st * tu.lock * (K.ss ? 1 - 0.5 * Math.pow(spn, 0.8) * (1 - sm(0.1, 0.3, ab)) : 1) * (1 + 0.12 * as.str);
  const dw = as.dft * DR.k;
  let wd = 0;
  if (DR.k > 0 && as.dft > 0) {
    const dc = cl(2 * (be + DR.dir * DR.bt), -0.6, 0.6);
    dlt = dlt * (1 - dw) + dc * dw;
    const wv = ad(pv0 - (S.pv ?? pv0)) / dt;
    wd = wv + 5 * (be + DR.dir * DR.bt);
  }
  // ön teker açısı sınırı: açı kiti büyütür (CAR.dmax)
  const dMax = CAR.dmax ?? 0.8,
    delta = (d.delta = cl(dlt, -dMax, dMax)),
    tanD = Math.tan(delta),
    dTek = F.tk.map((t) =>
      t.on ? delta + 0.6 * (Math.atan((F.aks * tanD) / (F.aks - t.x * tanD)) - delta) : 0,
    );
  // ---------- gaz, fren, vites
  let gaz = S.gas,
    fren = gi.b;
  // dbr eski giriş/kayıt yuvasıdır; artık arka teker el frenidir.
  const elFreni = !!gi.dbr;
  if (as.tcs > 0 && !DR.on && !elFreni) gaz *= 1 - as.tcs * sm(0.12, 0.35, ab);
  if (fren > 0 && vl < 0.5 && gi.g < 0.05) Y.vites = -1;
  else if (Y.vites == -1 && gi.g > 0.05) Y.vites = 1;
  if (Y.vites == -1) {
    gaz = fren;
    fren = 0;
  }
  // çekiş sınırı (tepe kaymanın katı): çekiş kontrolü ve tuşla gazda kalkış patinajı (araca özgü, sabit ve düşük).
  // Sınır her ara adımda teker torkuna uygulanır: teker, lastiğin bu kaymada aktarabileceğinden fazla tork almaz.
  let cekisSiniri = 1e9;
  if (as.tcs > 0 && !elFreni) cekisSiniri = 1.2 + 2.5 * (1 - as.tcs);
  // tuşla gazda sınır hızla gevşer (klasik modeldeki gibi): kalkışta sabit, 30 m/s'de neredeyse yok
  if (!gi.analogGaz && !elFreni)
    cekisSiniri = Math.min(
      cekisSiniri,
      1 + 4 * (0.02 + 0.08 * tu.lch) + Math.max(0, Math.abs(vl) - 6) * 0.25,
    );
  let oranV = (Y.vites > 0 ? VITESLER[Y.vites - 1] : -3) * F.son;
  const wSurus = (1 - F.awd) * ((Y.tk[2].w + Y.tk[3].w) / 2) + F.awd * ((Y.tk[0].w + Y.tk[1].w) / 2),
    devirT = (Math.abs(wSurus * oranV) * 60) / (2 * Math.PI);
  // otomatik vites: geçişte 0,12 sn tork kesilir; geçişten sonra 0,6 sn yeni geçiş yok (vites gidip gelmesin)
  Y.vitesT -= dt;
  if (!elFreni && Y.vitesT < -0.6 && Y.vites > 0) {
    // tekerler patinajdayken devir yüksek görünür: vites büyütmek için ön tekerlerin hızına da bak
    const devirYer = (Math.abs(vl / F.tk[2].r) * Math.abs(oranV) * 60) / (2 * Math.PI);
    if (Math.min(devirT, devirYer * 1.15) > 0.95 * F.devirMax && Y.vites < VITESLER.length) {
      Y.vites++;
      Y.vitesT = 0.12;
    } else if (
      Y.vites > 1 &&
      devirT < (gaz > 0.5 ? 0.42 : 0.3) * F.devirMax &&
      (devirT * VITESLER[Y.vites - 2]) / VITESLER[Y.vites - 1] < 0.85 * F.devirMax
    ) {
      Y.vites--;
      Y.vitesT = 0.1;
    }
  }
  oranV = (Y.vites > 0 ? VITESLER[Y.vites - 1] : -3) * F.son;
  // kalkış debriyajı: tekerler yavaşken motor kalkış devrinde kalır, tork kayan debriyajdan geçer
  const kalkis = F.devirMin + (F.kalkis - F.devirMin) * Math.min(1, gaz * 1.5),
    devirBagli = Math.max(devirT, gaz > 0.05 ? kalkis : F.devirMin);
  // El freni motoru yapay biçimde devirlendirmez, bırakınca tork vuruşu üretmez.
  const devir = devirBagli,
    u = devir / F.devirMax;
  Y.rpm += (devir - Y.rpm) * Math.min(1, dt * 12);
  // turbo: torkun tb payı basınçtan gelir. Basınç gaz açık ve devir tbu'yu geçmişken tbs sürede dolar,
  // gaz kesilince çabuk boşalır (kalkışta ve virajdan çıkışta gecikme, sonra sert güç)
  let turbo = 1;
  if (CAR.tb) {
    const hedef = gaz * sm((CAR.tbu ?? 0.6) - 0.2, CAR.tbu ?? 0.6, u),
      tbs = CAR.tbs ?? 1;
    Y.turbo += (hedef - Y.turbo) * Math.min(1, dt / (hedef > Y.turbo ? tbs : tbs * 0.3));
    turbo = 1 - CAR.tb * (1 - Y.turbo);
  }
  let Te = 0;
  if (Y.vitesT <= 0) {
    Te = u < 1.02 ? F.tork * torkEgrisi(u) * gaz * uzmanG * turbo : 0;
    // motor freni: gaz kapalıyken
    if (devirT > F.devirMin) Te -= F.tork * 0.15 * u * (1 - gaz);
  }
  const Tw = Te * oranV * F.verim,
    Tsurus = [
      (Tw * F.awd) / 2,
      (Tw * F.awd) / 2,
      elFreni ? 0 : (Tw * (1 - F.awd)) / 2,
      elFreni ? 0 : (Tw * (1 - F.awd)) / 2,
    ];
  // frenler ve ABS; dururken gaz ve fren yoksa yokuş kalkış desteği aracı tutar
  const Tfren: number[] = [],
    tutma = Math.abs(vl) < 0.6 && gaz < 0.05 && fren < 0.05 ? 0.3 : 0;
  for (let i = 0; i < 4; i++) {
    const tk = Y.tk[i],
      hedef = 1 - as.abs * sm(1.1, 1.8, -tk.kap / LP[i].kp);
    tk.abs += (hedef - tk.abs) * Math.min(1, dt * 30);
    // ABS yalnız ayak frenine müdahale eder. El freni arka tekeri kilitleyip sürtünme elipsiyle yanal
    // tutuşu azaltır; ön lastikler direksiyonu dinler. Düz giderken otomatik dönme kuvveti eklenmez.
    const ayak = ((F.fren * (fren + tutma) * (F.tk[i].on ? F.frenOn : 1 - F.frenOn)) / 2) * tk.abs;
    Tfren.push(ayak + (elFreni && !F.tk[i].on ? F.fren * 0.55 : 0));
  }
  // ---------- yardım kuvvetleri için hedefler
  const kin = 5 * as.str * (1 - DR.k),
    al = 2.5 * as.str * (1 - DR.k),
    esc = 1.6 * as.stm * (1 - DR.k) * (elFreni ? 0 : 1),
    Aeq = 30 * muOrt * (1 + 0.5 * tu.aero * CAR.ae * spn * spn);
  // ---------- ara adımlar
  const h = dt / ARA,
    m = F.m,
    [Ix, Iy, Iz] = F.I;
  let kMaxArka = 0,
    aMaxArka = 0,
    temasSay = 0;
  // zemin eğimi adım başında bir kez (her teker için): ara adımlarda zemin, bu normalle düzlem kabul edilir
  const NT: V[] = [];
  for (let i = 0; i < 4; i++) {
    const t = F.tk[i];
    noktaDunya(Y, F, t.x, 0, t.z, A);
    NT.push(normal(W.H, A.x, A.z, v3()));
  }
  // gövde noktaları: yalnız zemine yakın olanlar ara adımlarda denetlenir
  const gn = GOVDE_NOKTALARI(CAR.w, F, CAR.lift || 0).filter(([bx_, by_, bz_]) => {
    noktaDunya(Y, F, bx_, by_, bz_, A);
    return A.y - W.H(A.x, A.z) < 0.6 + Math.abs(Y.vy) * dt * 2;
  });
  for (let n = 0; n < ARA; n++) {
    let temasN = 0;
    rot(Y, 1, 0, 0, SOL);
    rot(Y, 0, 1, 0, UST);
    rot(Y, 0, 0, 1, ON);
    let Fx = 0,
      Fy = -m * g,
      Fz = 0,
      tx = 0,
      ty = 0,
      tz = 0;
    const kuvvet = (px: number, py: number, pz: number, fx_: number, fy_: number, fz_: number) => {
      const rx = px - Y.px,
        ry = py - Y.py,
        rz = pz - Y.pz;
      Fx += fx_;
      Fy += fy_;
      Fz += fz_;
      tx += ry * fz_ - rz * fy_;
      ty += rz * fx_ - rx * fz_;
      tz += rx * fy_ - ry * fx_;
    };
    // süspansiyon: her teker için zemine ışın
    const sik = [0, 0, 0, 0],
      Fs = [0, 0, 0, 0],
      dist = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const t = F.tk[i],
        Nt = NT[i];
      noktaDunya(Y, F, t.x, t.ay, t.z, A);
      // ışın (gövdenin aşağı ekseni) ile bağlantı noktasının altındaki zemin düzleminin kesişimi
      const gy = W.H(A.x, A.z),
        dd = (Nt.y * (A.y - gy)) / Math.max(0.2, Nt.x * UST.x + Nt.y * UST.y + Nt.z * UST.z);
      dist[i] = dd;
      sik[i] = t.Lr + t.r - dd;
    }
    for (let i = 0; i < 4; i++) {
      const t = F.tk[i],
        tk = Y.tk[i],
        c = sik[i];
      if (c <= 0) {
        tk.temas = false;
        tk.sik = 0;
        continue;
      }
      const cv = (c - tk.sik) / h;
      let f = t.k * c + (cv > 0 ? t.cb : t.cr) * cv;
      // tampon: sertliği ve sönümü 3 cm içinde yumuşakça devreye girer (sert frende dalan önde darbe olmasın)
      if (c > t.tampon) {
        const p = c - t.tampon;
        f += (t.k * 8 * p * p) / (p + 0.03) + t.cb * 2 * Math.max(0, cv) * Math.min(1, p / 0.03);
      }
      // üst sınır: sert inişte bile durağan yükün 12 katı (sayısal patlamayı önler)
      Fs[i] = cl(f, 0, 12 * t.Fz0);
      tk.temas = true;
      tk.sik = c;
    }
    // viraj denge çubukları
    for (const [a, b, k] of [
      [0, 1, F.arb[0]],
      [2, 3, F.arb[1]],
    ]) {
      if (Y.tk[a].temas && Y.tk[b].temas) {
        const f = k * (sik[a] - sik[b]);
        Fs[a] = Math.max(0, Fs[a] + f);
        Fs[b] = Math.max(0, Fs[b] - f);
      }
    }
    // lastikler
    for (let i = 0; i < 4; i++) {
      const t = F.tk[i],
        tk = Y.tk[i],
        Isk = t.I;
      if (!tk.temas) {
        // havada: teker serbest döner, fren tutar
        tk.w =
          tekerCoz(tk.w, Isk, h, Tsurus[i], Tfren[i], t.r, tk.w * t.r, 1, 0, 0, LP[i], LS) * (1 - 0.5 * h);
        tk.Fz = 0;
        continue;
      }
      temasN++;
      noktaDunya(Y, F, t.x, t.ay, t.z, A);
      C.x = A.x - UST.x * dist[i];
      C.y = A.y - UST.y * dist[i];
      C.z = A.z - UST.z * dist[i];
      N.x = NT[i].x;
      N.y = NT[i].y;
      N.z = NT[i].z;
      const Fzi = Fs[i] * Math.max(0, UST.x * N.x + UST.y * N.y + UST.z * N.z);
      tk.Fz = Fzi;
      // tekerin yönü (direksiyon açısıyla), zemin düzlemine izdüşüm
      const cd = Math.cos(dTek[i]),
        sd = Math.sin(dTek[i]);
      T1.x = ON.x * cd + SOL.x * sd;
      T1.y = ON.y * cd + SOL.y * sd;
      T1.z = ON.z * cd + SOL.z * sd;
      const dn = T1.x * N.x + T1.y * N.y + T1.z * N.z;
      T1.x -= dn * N.x;
      T1.y -= dn * N.y;
      T1.z -= dn * N.z;
      const l1 = Math.hypot(T1.x, T1.y, T1.z) || 1;
      T1.x /= l1;
      T1.y /= l1;
      T1.z /= l1;
      // yanal eksen: normal × ileri (sol)
      T2.x = N.y * T1.z - N.z * T1.y;
      T2.y = N.z * T1.x - N.x * T1.z;
      T2.z = N.x * T1.y - N.y * T1.x;
      // temas noktasının hızı
      const rx = C.x - Y.px,
        ry = C.y - Y.py,
        rz = C.z - Y.pz,
        cvx = Y.vx + (Y.oy * rz - Y.oz * ry),
        cvy = Y.vy + (Y.oz * rx - Y.ox * rz),
        cvz = Y.vz + (Y.ox * ry - Y.oy * rx),
        vxw = cvx * T1.x + cvy * T1.y + cvz * T1.z,
        vyw = cvx * T2.x + cvy * T2.y + cvz * T2.z,
        dx = Math.max(Math.abs(vxw), VD_X),
        tanA = vyw / Math.max(Math.abs(vxw), VD_Y),
        r = t.r,
        p = LP[i];
      // çekiş sınırı: sürülen teker, lastiğin sınır kaymada aktarabileceği kuvvetten fazla tork almaz
      let Td = Tsurus[i];
      if (cekisSiniri < 1e8 && Td != 0) {
        const yon = Math.sign(Td),
          Tsin = r * Math.abs(lastikKuvveti(Fzi, yon * cekisSiniri * p.kp, tanA, p, LS).Fx) * 1.03;
        if (Math.abs(Td) > Tsin) Td = yon * Tsin;
      }
      // teker dönüşü ve lastik kuvveti birlikte (örtük çözüm: kararlı)
      const zSf = SURF[tk.zemin],
        Troll = (0.012 + 0.02 * zSf.dr) * Fzi * r * Math.tanh(tk.w);
      tk.w = tekerCoz(tk.w, Isk, h, Td - Troll, Tfren[i], r, vxw, dx, Fzi, tanA, p, LS);
      const kap0 = (tk.w * r - vxw) / dx,
        Fxl = LS.Fx;
      tk.kap = kap0;
      tk.tanA = tanA;
      if (!t.on) {
        kMaxArka = Math.max(kMaxArka, Math.abs(kap0));
        aMaxArka = Math.max(aMaxArka, Math.abs(tanA));
      }
      // gövdeye: süspansiyon (gövde ekseninde), lastik (zemin düzleminde)
      kuvvet(
        C.x,
        C.y,
        C.z,
        UST.x * Fs[i] + T1.x * Fxl + T2.x * LS.Fy,
        UST.y * Fs[i] + T1.y * Fxl + T2.y * LS.Fy,
        UST.z * Fs[i] + T1.z * Fxl + T2.z * LS.Fy,
      );
    }
    // diferansiyeller: kilit oranında tekerler birbirine çekilir; dört çekerde akslar arası viskoz bağ
    const kenet = (a: number, b: number, k: number) => {
      const l = Math.min(1, h * k),
        dlt_ = (Y.tk[a].w - Y.tk[b].w) * l * 0.5;
      Y.tk[a].w -= dlt_;
      Y.tk[b].w += dlt_;
    };
    // arka diferansiyel: kilit (tu.diff) × kenetleme katsayısı (diferansiyel parçası değiştirir; stokta 220)
    if (F.awd < 1) kenet(2, 3, F.diff * (CAR.dk ?? 220));
    if (F.awd > 0) {
      kenet(0, 1, 40);
      // Arka kilitlenirken merkez kavrama açılır; ön aksı el frenine bağlama.
      if (!elFreni) {
        const on = (Y.tk[0].w + Y.tk[1].w) / 2,
          arka = (Y.tk[2].w + Y.tk[3].w) / 2,
          l = Math.min(1, h * AKS_BAGI) * 0.5 * (on - arka);
        Y.tk[0].w -= l;
        Y.tk[1].w -= l;
        Y.tk[2].w += l;
        Y.tk[3].w += l;
      }
    }
    // aerodinamik: sürükleme ve bastırma (aks noktalarında)
    const vv = Math.hypot(Y.vx, Y.vy, Y.vz);
    {
      const k = 0.5 * RHO * F.CdA * vv;
      Fx -= k * Y.vx;
      Fy -= k * Y.vy;
      Fz -= k * Y.vz;
      const vi = Y.vx * ON.x + Y.vy * ON.y + Y.vz * ON.z,
        L = 0.5 * RHO * F.ClA * vi * vi;
      noktaDunya(Y, F, 0, F.cgY, F.tk[0].z, A);
      kuvvet(A.x, A.y, A.z, -UST.x * L * 0.45, -UST.y * L * 0.45, -UST.z * L * 0.45);
      noktaDunya(Y, F, 0, F.cgY, F.tk[2].z, A);
      kuvvet(A.x, A.y, A.z, -UST.x * L * 0.55, -UST.y * L * 0.55, -UST.z * L * 0.55);
    }
    temasSay += temasN;
    // zemin direnci (çim, çamur, derin kar): klasik modelle aynı
    if (temasN > 0) {
      const dr = SURF[si].dr,
        vh = Math.hypot(Y.vx, Y.vz);
      if (dr > 0 && vh > 0.05) {
        const a = dr * 3 + vh * dr * 0.04;
        Fx -= (m * a * Y.vx) / vh;
        Fz -= (m * a * Y.vz) / vh;
      }
    }
    // gövde temas noktaları: alt köşeler ve tavan zemine girerse yay gibi iter
    for (const [bx_, by_, bz_] of gn) {
      noktaDunya(Y, F, bx_, by_, bz_, A);
      const gy = W.H(A.x, A.z),
        pen = gy - A.y;
      if (pen > 0) {
        normal(W.H, A.x, A.z, N);
        const rx = A.x - Y.px,
          ry = A.y - Y.py,
          rz = A.z - Y.pz,
          pvx = Y.vx + (Y.oy * rz - Y.oz * ry),
          pvy = Y.vy + (Y.oz * rx - Y.ox * rz),
          pvz = Y.vz + (Y.ox * ry - Y.oy * rx),
          vn = pvx * N.x + pvy * N.y + pvz * N.z,
          kc = m * g * 40,
          fn = cl(kc * pen - 2 * Math.sqrt(kc * m) * vn, 0, 6 * m * g);
        // sürtünme: kayan gövde yavaşlar
        const tvx = pvx - vn * N.x,
          tvy = pvy - vn * N.y,
          tvz = pvz - vn * N.z,
          tv = Math.hypot(tvx, tvy, tvz) || 1,
          ff = Math.min(0.5 * fn, (m * tv) / (8 * h));
        kuvvet(
          A.x,
          A.y,
          A.z,
          N.x * fn - (tvx / tv) * ff,
          N.y * fn - (tvy / tv) * ff,
          N.z * fn - (tvz / tv) * ff,
        );
      }
    }
    // sürüş yardımları (yalpa torku ve yanal kuvvet; yalnız yerdeyken)
    if (temasN > 0) {
      const vlA = Y.vx * fx + Y.vz * fz,
        vtA = Y.vx * fz - Y.vz * fx,
        sp = Math.hypot(Y.vx, Y.vz);
      // viraj desteği: araç direksiyonun gösterdiği yaya çekilir
      if (kin > 0 && sp > 2) {
        const lim = (Aeq * 1.1) / Math.max(sp, 1),
          wk = cl((vlA / F.aks) * tanD, -lim, lim);
        ty += Iy * kin * (wk - Y.oy);
        const fyan = -m * al * vtA;
        Fx += fyan * fz;
        Fz -= fyan * fx;
      }
      // denge kontrolü: aşırı dönüşü söndürür
      if (esc > 0 && sp > 3) {
        const wRef = cl((vlA / F.aks) * tanD, -(Aeq / sp), Aeq / sp),
          fazla = Y.oy - cl(Y.oy, -Math.abs(wRef) - 0.05, Math.abs(wRef) + 0.05);
        ty -= Iy * esc * 2 * fazla;
      }
      // drift desteği: yalpa hızını seçilen drift açısına götürür
      if (dw > 0) ty += Iy * 10 * dw * (wd - Y.oy);
    }
    // tümleştirme (yarı örtük Euler)
    Y.vx += (Fx / m) * h;
    Y.vy += (Fy / m) * h;
    Y.vz += (Fz / m) * h;
    Y.px += Y.vx * h;
    Y.py += Y.vy * h;
    Y.pz += Y.vz * h;
    rotTers(Y, tx, ty, tz, T1);
    rot(Y, T1.x / Ix, T1.y / Iy, T1.z / Iz, T2);
    Y.ox += T2.x * h;
    Y.oy += T2.y * h;
    Y.oz += T2.z * h;
    const kd = 1 - 0.05 * h;
    Y.ox *= kd;
    Y.oy *= kd;
    Y.oz *= kd;
    // dördey: q += ½ ω q h
    const qx = Y.qx,
      qy = Y.qy,
      qz = Y.qz,
      qw = Y.qw,
      hh = 0.5 * h;
    Y.qx += hh * (Y.ox * qw + Y.oy * qz - Y.oz * qy);
    Y.qy += hh * (Y.oy * qw + Y.oz * qx - Y.ox * qz);
    Y.qz += hh * (Y.oz * qw + Y.ox * qy - Y.oy * qx);
    Y.qw += hh * (-Y.ox * qx - Y.oy * qy - Y.oz * qz);
    const ql = Math.hypot(Y.qx, Y.qy, Y.qz, Y.qw);
    Y.qx /= ql;
    Y.qy /= ql;
    Y.qz /= ql;
    Y.qw /= ql;
    for (const tk of Y.tk) tk.don += tk.w * h;
  }
  S.air = temasSay == 0;
  S.pv = pv0;
  // drift desteği hızı korur: driftte kaybedilen hızın çoğu geri verilir ve araç drift hızına doğru itilir
  if (DR.k > 0.05 && as.dft > 0 && gi.g > 0 && !S.air) {
    const v1 = Math.hypot(Y.vx, Y.vz);
    if (v1 > 1) {
      const w = as.dft * DR.k * gi.g,
        tgt = Math.min(F.vTasarim * 0.45, 30),
        dv = Math.max(0, v - v1) * 0.75 * w + Math.max(0, tgt - v1) * 0.35 * w * dt,
        k = (v1 + dv) / v1;
      Y.vx *= k;
      Y.vz *= k;
    }
  }
  carpismalar(d, Y, F, cx, dt, v);
  cikis(d, Y, F);
  // gösterge: boylamsal ivme, kerb, patinaj
  fx = Math.sin(S.h);
  fz = Math.cos(S.h);
  const v2 = Math.hypot(Y.vx, Y.vz),
    vl2 = Y.vx * fx + Y.vz * fz,
    vt2 = Y.vx * fz - Y.vz * fx;
  S.axs += ((vl2 - Y.vlOnce) / dt - S.axs) * Math.min(1, dt * 8);
  Y.vlOnce = vl2;
  // kerb sarsıntısı: yere değen bir teker kerbin üstündeyse (yokuşlu pistte taban yükseklik sayılmaz)
  S.kerb = 0;
  for (let i = 0; i < 4 && !S.air; i++) {
    if (!Y.tk[i].temas) continue;
    noktaDunya(Y, F, F.tk[i].x, 0, F.tk[i].z, T1);
    if (W.kerb(T1.x, T1.z) > 0.02) S.kerb = 1;
  }
  S.spin = kMaxArka > 0.3 && v2 < 25 ? 1 : 0;
  const dri = driftSkoru(d, v2, vl2, vt2, dt);
  tozVeDuman(d, cx, si, v2, !S.air && v2 > 5 && (kMaxArka > 0.25 || aMaxArka > 0.3 || dri));
  return { Sf: SURF[si], T, v: v2, si };
}

/** gövdenin zemine değebilecek noktaları (model koordinatı) */
function GOVDE_NOKTALARI(w: number, F: AracFizigi, lift: number): [number, number, number][] {
  // gövde, çizimdeki gibi lift kadar yüksekte (ralli aracı): alt köşeler de o kadar yukarıda
  const x = w / 2 - 0.1,
    y = 0.18 + lift,
    on = F.tk[0].z + 0.8,
    arka = F.tk[2].z - 0.8;
  return [
    [x, y, on],
    [-x, y, on],
    [x, y, arka],
    [-x, y, arka],
    [x * 0.8, 1.15, 0.3],
    [-x * 0.8, 1.15, 0.3],
    [0, 1.2, -0.6],
  ];
}

/** çarpışma: ağaç, taş, duvar (darbe gövdeye vurduğu noktadan: araç döner), çalı yavaşlatır, su ıslatır */
function carpismalar(d: SimDurumu, Y: YeniDurum, F: AracFizigi, cx: FizikBaglami, dt: number, v: number) {
  const S = d.S,
    W = cx.dunya,
    m = F.m,
    Iy = F.I[1];
  noktaDunya(Y, F, 0, 0, 0, T1);
  const ox = T1.x,
    oz = T1.z;
  const darbe = (nx: number, nz: number, pen: number, cxp: number, czp: number) => {
    // konum düzeltme
    Y.px += nx * pen;
    Y.pz += nz * pen;
    // temas noktasının hızı: v + ω × r (yalnız yalpa)
    const rx = cxp - Y.px,
      rz = czp - Y.pz,
      pvx = Y.vx + Y.oy * rz,
      pvz = Y.vz - Y.oy * rx,
      vn = pvx * nx + pvz * nz;
    if (vn >= 0) return;
    const rn = rz * nx - rx * nz,
      j = (-(1 + 0.3) * vn) / (1 / m + (rn * rn) / Iy);
    Y.vx += (j * nx) / m;
    Y.vz += (j * nz) / m;
    Y.oy += (j * rn) / Iy;
    // sürtünme: yüzey boyunca kayma hızının bir kısmı gider
    const tx = -nz,
      tz = nx,
      vtn = pvx * tx + pvz * tz,
      rt = rz * tx - rx * tz,
      jt = cl((-vtn / (1 / m + (rt * rt) / Iy)) * 0.6, -0.5 * j, 0.5 * j);
    Y.vx += (jt * tx) / m;
    Y.vz += (jt * tz) / m;
    Y.oy += (jt * rt) / Iy;
    if (-vn > 3) S.hit = d.zaman;
  };
  for (const o of W.yakin(ox, oz)) {
    const dx = ox - o.x,
      dz = oz - o.z,
      dd = Math.hypot(dx, dz) || 0.01;
    if (o.t == "box") {
      const px = o.hx! + 1.4 - Math.abs(dx),
        pz = o.hz! + 1.4 - Math.abs(dz);
      if (px > 0 && pz > 0) {
        if (px < pz) {
          const nx = Math.sign(dx) || 1;
          darbe(nx, 0, px, ox - nx * 1.4, oz);
        } else {
          const nz = Math.sign(dz) || 1;
          darbe(0, nz, pz, ox, oz - nz * 1.4);
        }
      }
    } else if (o.t == "solid") {
      const rr = o.r! + 1.5;
      if (dd < rr) {
        const nx = dx / dd,
          nz = dz / dd;
        darbe(nx, nz, rr - dd, ox - nx * 1.5, oz - nz * 1.5);
      }
    } else if (o.t == "bush") {
      if (dd < o.r! + 1) {
        const k = Math.exp(-2.2 * dt);
        Y.vx *= k;
        Y.vz *= k;
        if (!W.karli() && cx.gorselRng() < 0.4) cx.olay.puf(ox, S.y, oz, Y.vx, Y.vz, cx.olay.caliRengi());
      }
    } else if (dd < o.r!) {
      S.wet = 1;
      const k = Math.exp(-1.2 * dt * Math.min(1, v / 10));
      Y.vx *= k;
      Y.vz *= k;
      if (v > 4)
        for (const s2 of [-1, 1])
          if (cx.gorselRng() < 0.7)
            cx.olay.puf(
              ox + Math.cos(S.h) * s2,
              S.y,
              oz - Math.sin(S.h) * s2,
              Y.vx * 0.5,
              Y.vz * 0.5,
              0xcfe3f0,
            );
    }
  }
  // sürülebilir alanın sınırı
  const b = W.kutu();
  if (ox < b[0] + 5 || ox > b[1] - 5) {
    Y.px += cl(ox, b[0] + 5, b[1] - 5) - ox;
    Y.vx *= -0.3;
  }
  if (oz < b[2] + 5 || oz > b[3] - 5) {
    Y.pz += cl(oz, b[2] + 5, b[3] - 5) - oz;
    Y.vz *= -0.3;
  }
}
