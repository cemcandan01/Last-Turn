// Klasik fizik modeli (bisiklet modeli): oyunun ilk sürümlerinden beri ayarlanan sürüş hissi.
// Ön ve arka aks tek lastik gibi hesaplanır. Büyük kayma açısında tutuş tamamen kaybolmaz: araç sürtünerek yavaşlar.
// Bu dosya eski fizik.js'in birebir taşınmış halidir; davranışı tests/veri/klasik-iz.json.gz ile doğrulanır.
import { ad, cl, sm } from "../cekirdek/matematik";
import type { Lastik, Zemin } from "./veriler";
import { IZ, L, SURF, TIRES, VMAX, YERCEKIMI } from "./veriler";
import { direksiyonVeGaz, driftPenceresi, driftSiniri, driftSkoru, tozVeDuman, zeminIzleri } from "./ortak";
import type { AracDurumu, DriftDurumu, DriftSkoru, FizikBaglami, FizikGirdisi } from "./tipler";

/** bir fizik adımının durumu: araç, drift, direksiyon ve simülasyon saati */
export interface SimDurumu {
  S: AracDurumu;
  DR: DriftDurumu;
  D: DriftSkoru;
  /** süzülmüş direksiyon (-1..1) */
  st: number;
  /** ön teker açısı (rad) */
  delta: number;
  /** simülasyon zamanı (s) */
  zaman: number;
}

export interface AdimSonucu {
  Sf: Zemin;
  T: Lastik;
  v: number;
  si: number;
}

/** sabit adım içindeki parametreler */
interface P {
  A: number;
  Af: number;
  Ar: number;
  Bf: number;
  Br: number;
  C: number;
  top: number;
  drag: number;
  gas: number;
  lch: number;
  loose: boolean;
  lz: number;
  lg: number;
  delta: number;
}

interface M {
  rb: number;
  bc: number;
  bb: number;
  tc: number;
  wk: number;
  kin: number;
  al: number;
  dmp: number;
  acc: number;
  brk: number;
  lim: number;
  sc: number;
}

/** lastik eğrisi (Pacejka biçimi); büyük açıda sabit sürtünmeye geçer */
const pac = (al: number, B: number, C: number) => {
  const p = Math.sin(C * Math.atan(B * al)),
    b = sm(0.6, 1.2, Math.abs(al));
  return p * (1 - b) + Math.sign(al) * 0.45 * b;
};
/** sürtünme çemberi: boylamsal kuvvet yanal tutuşu azaltır, ama %30'un altına indirmez */
const cap = (Dm: number, F: number) => Math.sqrt(Math.max(Dm * Dm - F * F, 0.09 * Dm * Dm));

/** ara adım: bisiklet modeli (h = adım süresi) */
function sub(sim: SimDurumu, gi: FizikGirdisi, cx: FizikBaglami, h: number, P: P, M: M) {
  const S = sim.S,
    CAR = cx.kurulum.car;
  const fx = Math.sin(S.h),
    fz = Math.cos(S.h),
    ux = Math.cos(S.h),
    uz = -Math.sin(S.h);
  const vl = S.vx * fx + S.vz * fz,
    vt = S.vx * ux + S.vz * uz,
    sg = vl >= 0 ? 1 : -1,
    vxs = Math.max(Math.abs(vl), 4),
    a = L / 2,
    dl = P.delta,
    sp = Math.hypot(vl, vt);
  const af = Math.atan2(vt + a * S.w, vxs) - dl * sg,
    ar = Math.atan2(vt - a * S.w, vxs);
  const wt = cl(S.axs * M.wk, -0.15, 0.1),
    Df = P.Af * (0.5 - wt),
    Dr = P.Ar * (0.5 + wt) * M.rb;
  let ax = 0,
    Fxr = 0,
    Fxf = 0,
    spin = 0;
  if (gi.b) {
    if (vl > 0.5) {
      const Bk = Math.min(30 * M.brk, P.A * 1.05) * gi.b;
      ax = -Bk;
      Fxf = M.bb * Bk * M.bc;
      Fxr = (1 - M.bb) * Bk * M.bc;
    } else if (vl > -10) {
      const Rv = Math.min(12, Dr) * gi.b;
      ax = -Rv;
      Fxr = Rv * 0.6 * M.bc;
    }
  } else if (S.gas > 0.01) {
    const av = Math.abs(vl),
      lw = Math.max(0, 1 - av / 15),
      an = gi.analogGaz,
      Lc = an ? 1 + 2 * P.lch * S.gas * S.gas * lw : 1 + 0.7 * P.lch * lw,
      E0 =
        ((M.acc * P.gas * S.gas * Math.min(9.5 * Lc * CAR.trq, (240 * CAR.pw) / Math.max(av, 1))) / CAR.m) *
        (1 - Math.pow(cl(av / P.top, 0, 1.2), 4)),
      f4 = CAR.awd,
      lim = Math.min(P.A * 0.9, (f4 ? Math.min(Dr / (1 - f4), Df / f4) : Dr) * 0.55 * M.lim) * P.lg,
      // kalkış patinajı: tuşla ya da otomatik gazda aracın sabit değeri (M.sc); analog pedalda gazın ne kadar açıldığına bağlı
      E = an ? E0 : Math.min(E0, lim * (1 + M.sc + Math.max(0, av - 6) / 10)),
      sl = Math.max(0, E / lim - 1),
      sk = Math.min(1, sl * 2.5);
    spin = sk;
    const e = sl > 0 ? lim * (1 - (0.03 + 0.05 * P.lz) * sk) : E;
    ax = e;
    Fxr = Math.max(Math.abs(e) * (1 - f4) * M.tc * 1.1, Dr * (0.6 + 0.3 * P.lz) * sk * (1 - 0.5 * f4));
    // dört çekerde ön tekerler de çeker; ön tutuşun bir kısmını kullanır
    if (f4) Fxf = Math.max(Math.abs(e) * f4 * 1.2, Df * 0.5 * sk * f4);
  }
  if (!gi.b) ax -= sg * (1.2 + (S.gas > 0.05 ? 0 : 2.8)) + vl * 0.05;
  ax -= sg * P.drag * 3 + vl * P.drag * 0.04;
  const Fyf = -cap(Df, Fxf) * pac(af, P.Bf, P.C),
    Fyr = -cap(Dr, Fxr) * pac(ar, P.Br, P.C);
  ax -= Fyf * Math.sin(dl);
  const ay = Fyf * Math.cos(dl) + Fyr,
    dw = (a * Fyf * Math.cos(dl) - a * Fyr) / (IZ * CAR.iz) - S.w * M.dmp;
  S.vx += (ax * fx + ay * ux) * h;
  S.vz += (ax * fz + ay * uz) * h;
  S.w += dw * h;
  // viraj desteği: araç direksiyonun gösterdiği yaya çekilir
  if (M.kin > 0 && sp > 2) {
    const lim = (P.A * 1.1) / Math.max(sp, 1),
      wk = cl((vl / L) * Math.tan(dl), -lim, lim);
    S.w += (wk - S.w) * Math.min(1, h * M.kin);
    const k = Math.min(1, h * M.al);
    S.vx -= ux * vt * k;
    S.vz -= uz * vt * k;
  }
  // çok düşük hızda araç kayamaz
  const lk = cl(1 - sp / 5, 0, 1);
  if (lk > 0) {
    S.w += ((vl / L) * Math.tan(dl) - S.w) * Math.min(1, h * 12) * lk;
    const k = Math.min(1, h * 10) * lk;
    S.vx -= ux * vt * k;
    S.vz -= uz * vt * k;
  }
  S.h += S.w * h;
  S.axs += (ax - S.axs) * Math.min(1, h * 8);
  return { ar, spin };
}

/** klasik modelin bir adımı (dt = 1/60 sn; içeride 8 ara adım) */
export function klasikAdim(sim: SimDurumu, gi: FizikGirdisi, cx: FizikBaglami, dt: number): AdimSonucu {
  const { S, DR } = sim,
    W = cx.dunya,
    K = cx.kurulum,
    CAR = K.car,
    rng = cx.rng,
    grng = cx.gorselRng;
  const si = W.surf(S.x, S.z),
    Sf = SURF[si],
    T = TIRES[K.tire],
    tu = K.tu,
    as = K.as,
    loose = si != 1;
  zeminIzleri(S, si, dt);
  // lastik basıncı: yüksek = keskin ve erken kayar; gevşek zeminde düşük basınç tutuş verir
  const pg = (tp: number) => 1 - (loose ? 0.35 : 0.15) * (tp - 1),
    A0 =
      ((Sf.a * T.g[Sf.ti] * CAR.gr[Sf.ti] * W.havaTutusu()) / (1 + 0.5 * S.mud)) *
      (1 - 0.3 * S.wet) *
      (1 + 0.25 * as.grip),
    B0 = T.B[Sf.ti] * (si == 3 ? 0.85 : 1);
  const P: P = {
    A: A0,
    Af: A0 * pg(tu.tpf) * CAR.fb,
    Ar: A0 * pg(tu.tpr) * CAR.rb,
    Bf: B0 * tu.tpf,
    Br: B0 * tu.tpr,
    C: T.C[Sf.ti],
    top: VMAX * T.t[Sf.ti] * tu.top * CAR.top * (1 - 0.04 * (tu.aero - 1)),
    drag: Sf.dr,
    gas: 1,
    lch: tu.lch,
    loose,
    lz: loose ? 1 : 0,
    lg: T.lg ? T.lg[Sf.ti] : 1,
    delta: 0,
  };
  direksiyonVeGaz(sim, gi, cx, dt);
  const st = sim.st;
  let v = Math.hypot(S.vx, S.vz);
  let fx = Math.sin(S.h),
    fz = Math.cos(S.h),
    vl = S.vx * fx + S.vz * fz,
    vt = S.vx * Math.cos(S.h) - S.vz * Math.sin(S.h);
  const be = Math.atan2(vt, Math.max(vl, 0.5)),
    ab = Math.abs(be),
    bmax = driftSiniri(v);
  // drift penceresi: açı pencere içinde kaldıkça drift sürer; çok düşerse araç düzelir, abartılırsa spin
  driftPenceresi(sim, gi, cx, v, be, ab, bmax, dt);
  // asfaltta drift: arka lastik kaymaya başlayınca (drift yardımı açıkken) toprakta olduğu gibi yumuşak ve uzun kayar
  {
    const kz = Math.max(DR.k, sm(0.1, 0.3, ab) * Math.min(1, +gi.g) * as.dft);
    if (!loose && kz > 0) {
      P.Br *= 1 - 0.45 * kz;
      P.Bf *= 1 - 0.2 * kz;
      P.Ar *= 1 - 0.1 * kz;
      P.C += (1.3 - P.C) * kz;
      P.lz = kz;
    }
  }
  // çekiş kontrolü: drift dışındaki arka kaymada gazı keser
  if (as.tcs > 0 && !DR.on) P.gas = 1 - as.tcs * sm(0.12, 0.35, ab);
  const Mp: M = {
    rb: tu.bal * (1 - 0.3 * as.ini * DR.k),
    bc: 0.45 * (1 - as.abs),
    bb: tu.bb,
    tc: 0.8 * tu.diff * (1 - 0.7 * as.tcs),
    wk: 0.012 * tu.susp * CAR.wk,
    kin: 5 * as.str * (1 - DR.k),
    al: 2.5 * as.str * (1 - DR.k),
    dmp: 0.35 + 1.6 * as.stm * (1 - DR.k),
    acc: as.acc * tu.pow,
    brk: (as.bra * tu.brk * CAR.brk) / CAR.m,
    lim: 1 + 0.6 * as.tcs,
    sc: 0.02 + 0.08 * tu.lch,
  };
  const info = { ar: 0, spin: 0 };
  const pv0 = Math.atan2(S.vx, S.vz);
  if (!S.air) {
    // yokuş: yerçekiminin eğim bileşeni
    const e = 2;
    S.vx -= ((YERCEKIMI * (W.H(S.x + e, S.z) - W.H(S.x - e, S.z))) / (2 * e)) * dt;
    S.vz -= ((YERCEKIMI * (W.H(S.x, S.z + e) - W.H(S.x, S.z - e))) / (2 * e)) * dt;
    const spn = Math.min(1, Math.abs(vl) / VMAX),
      ae = 1 + 0.5 * tu.aero * CAR.ae * spn * spn;
    P.A *= ae;
    P.Af *= ae;
    P.Ar *= ae;
    const dmax =
      tu.lock * (K.ss ? 1 - 0.5 * Math.pow(spn, 0.8) * (1 - sm(0.1, 0.3, ab)) : 1) * (1 + 0.12 * as.str);
    let dlt = st * dmax;
    // drift desteği: direksiyonu ve yalpa hızını seçilen drift açısına göre ayarlar
    if (DR.k > 0 && as.dft > 0) {
      const dc = cl(2 * (be + DR.dir * DR.bt), -0.6, 0.6),
        w = as.dft * DR.k;
      dlt = dlt * (1 - w) + dc * w;
      const wv = ad(Math.atan2(S.vx, S.vz) - (S.pv ?? Math.atan2(S.vx, S.vz))) / dt,
        wd = wv + 5 * (be + DR.dir * DR.bt);
      S.w += (wd - S.w) * Math.min(1, dt * 10) * w;
    }
    sim.delta = cl(dlt, -0.8, 0.8);
    P.delta = sim.delta;
    const v0 = Math.hypot(S.vx, S.vz);
    for (let i = 0; i < 8; i++) {
      const r = sub(sim, gi, cx, dt / 8, P, Mp);
      info.ar = r.ar;
      info.spin = Math.max(info.spin, r.spin);
    }
    S.pv = pv0;
    // drift desteği hızı korur: driftte kaybedilen hızın çoğu geri verilir ve araç drift hızına doğru itilir
    if (DR.k > 0.05 && as.dft > 0 && gi.g > 0) {
      const v1 = Math.hypot(S.vx, S.vz);
      if (v1 > 1) {
        const w = as.dft * DR.k * gi.g,
          tgt = Math.min(P.top * 0.45, 30),
          dv = Math.max(0, v0 - v1) * 0.75 * w + Math.max(0, tgt - v1) * 0.35 * w * dt,
          k = (v1 + dv) / v1;
        S.vx *= k;
        S.vz *= k;
      }
    }
  } else S.h += S.w * dt;
  // ilerleme: önündeki zemin çok yüksekse (duvar, dik yamaç) sekerek durur
  const mx = S.x + S.vx * dt,
    mz = S.z + S.vz * dt,
    run = Math.hypot(S.vx, S.vz) * dt;
  if (run > 1e-4 && W.H(mx, mz) - S.y > Math.max(0.3, 0.6 * run + (S.air ? 0.3 : 0.05))) {
    const gx = (W.H(mx + 1, mz) - W.H(mx - 1, mz)) / 2,
      gz = (W.H(mx, mz + 1) - W.H(mx, mz - 1)) / 2,
      gl = Math.hypot(gx, gz) || 1,
      nx = gx / gl,
      nz = gz / gl,
      vn = S.vx * nx + S.vz * nz;
    if (vn > 0) {
      S.vx -= nx * vn * 1.15;
      S.vz -= nz * vn * 1.15;
    }
    S.vx *= 0.97;
    S.vz *= 0.97;
    S.w *= 0.5;
  } else {
    const b = W.kutu();
    S.x = mx;
    S.z = mz;
    if (S.x < b[0] + 5 || S.x > b[1] - 5) {
      S.x = cl(S.x, b[0] + 5, b[1] - 5);
      S.vx *= -0.3;
    }
    if (S.z < b[2] + 5 || S.z > b[3] - 5) {
      S.z = cl(S.z, b[2] + 5, b[3] - 5);
      S.vz *= -0.3;
    }
  }
  // çarpışma: ağaç ve taş sert, çalı yavaşlatır, su ıslatır
  for (const o of W.yakin(S.x, S.z)) {
    const dx = S.x - o.x,
      dz = S.z - o.z,
      d = Math.hypot(dx, dz) || 0.01;
    if (o.t == "box") {
      const px = o.hx! + 1.4 - Math.abs(dx),
        pz = o.hz! + 1.4 - Math.abs(dz);
      if (px > 0 && pz > 0) {
        let nx = 0,
          nz = 0;
        if (px < pz) {
          nx = Math.sign(dx) || 1;
          S.x += nx * px;
        } else {
          nz = Math.sign(dz) || 1;
          S.z += nz * pz;
        }
        const vn = S.vx * nx + S.vz * nz;
        if (vn < 0) {
          S.vx -= 1.3 * vn * nx;
          S.vz -= 1.3 * vn * nz;
          S.vx *= 0.75;
          S.vz *= 0.75;
          S.w += (rng() - 0.5) * 2 * Math.min(1, -vn / 15);
          if (-vn > 3) S.hit = sim.zaman;
        }
      }
      continue;
    }
    if (o.t == "solid") {
      const rr = o.r! + 1.5;
      if (d < rr) {
        const nx = dx / d,
          nz = dz / d,
          vn = S.vx * nx + S.vz * nz;
        S.x += nx * (rr - d);
        S.z += nz * (rr - d);
        if (vn < 0) {
          S.vx -= 1.3 * vn * nx;
          S.vz -= 1.3 * vn * nz;
          S.vx *= 0.75;
          S.vz *= 0.75;
          S.w += (rng() - 0.5) * 2 * Math.min(1, -vn / 15);
          if (-vn > 3) S.hit = sim.zaman;
        }
      }
    } else if (o.t == "bush") {
      if (d < o.r! + 1) {
        const k = Math.exp(-2.2 * dt);
        S.vx *= k;
        S.vz *= k;
        if (!W.karli() && grng() < 0.4) cx.olay.puf(S.x, S.y, S.z, S.vx, S.vz, cx.olay.caliRengi());
      }
    } else if (d < o.r!) {
      S.wet = 1;
      const k = Math.exp(-1.2 * dt * Math.min(1, v / 10));
      S.vx *= k;
      S.vz *= k;
      if (v > 4)
        for (const s2 of [-1, 1])
          if (grng() < 0.7)
            cx.olay.puf(
              S.x + Math.cos(S.h) * s2,
              S.y,
              S.z - Math.sin(S.h) * s2,
              S.vx * 0.5,
              S.vz * 0.5,
              0xcfe3f0,
            );
    }
  }
  // yükseklik: yerde yolu izler, tümsekten hızla çıkınca havalanır
  const g2 = W.H(S.x, S.z);
  S.kerb = W.kerbli() && !S.air && g2 > 0.02 ? 1 : 0;
  if (S.air) {
    S.vy -= YERCEKIMI * dt;
    const ay = S.y + S.vy * dt;
    if (ay > g2) S.y = ay;
    else {
      S.air = false;
      S.y = g2;
    }
  } else {
    const gv = (g2 - S.y) / dt;
    if (g2 < S.y - 0.02 && gv < S.vy - YERCEKIMI * dt - 0.5) {
      S.air = true;
      S.vy -= YERCEKIMI * dt;
      S.y += S.vy * dt;
    } else {
      S.vy = cl(gv, -30, 30);
      S.y = g2;
    }
  }
  v = Math.hypot(S.vx, S.vz);
  fx = Math.sin(S.h);
  fz = Math.cos(S.h);
  vl = S.vx * fx + S.vz * fz;
  vt = S.vx * Math.cos(S.h) - S.vz * Math.sin(S.h);
  S.spin = info.spin > 0.3 && v < 25 ? 1 : 0;
  if (info.spin && loose && !S.air) S.w += (rng() - 0.5) * dt * 1.5 * (1 - as.tcs) * info.spin;
  // drift göstergesi ve puanı, lastik dumanı ve toz
  const dri = driftSkoru(sim, v, vl, vt, dt);
  tozVeDuman(sim, cx, si, v, !S.air && v > 5 && (Math.abs(info.ar) > 0.16 || info.spin > 0.2 || dri));
  return { Sf, T, v, si };
}
