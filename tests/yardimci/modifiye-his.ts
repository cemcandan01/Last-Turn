// Modifiye ölçümleri (test ve ölçüm ortak): parçaların istatistik ve hissiyat izleri, düz zeminde sanal sürüşle.
// Gerçekçi seviye (yardımsız), aracın kendi önayarı + parçalar (oyundaki modifiyeUygula gibi parcaliKurulum).
import { cl } from "../../src/cekirdek/matematik";
import { surucuKur } from "./surucu";

const DT = 1 / 60;

/** düz asfalt (ya da zemin) sürücüsü */
function duz(arac: number, parca: readonly string[], zemin = 1) {
  const s = surucuKur({ dunya: 1, arac, lk: "real", parca });
  const W = s.cx.dunya,
    h0 = W.H(30, -3550);
  W.H = () => h0;
  W.surf = () => zemin;
  W.yakin = () => [];
  W.kutu = () => [-1e5, 1e5, -1e5, 1e5];
  W.yolTuru = () => null;
  s.reset(30, -3700, 0);
  return s;
}
const hiz = (S: { vx: number; vz: number }) => Math.hypot(S.vx, S.vz);
const DUZ = { tg: 0, b: 0, analogDireksiyon: true, analogGaz: true };

/**
 * düz çizgi: 0-100 (sn), 40 sn'de ulaşılan hız (km/sa), 100-0 fren mesafesi (m), kalkışta ilk 1 sn'deki en büyük teker
 * patinajı (kayma oranı), turbo basıncının kalkıştan %90'a dolma süresi (sn; turbosuz 0: turbo gecikmesi hissi)
 */
export function duzCizgi(arac: number, parca: readonly string[] = [], zemin = 1) {
  const s = duz(arac, parca, zemin),
    S = s.sim.S;
  let t100 = Infinity,
    vmax = 0,
    patinaj = 0,
    dolma = 0;
  for (let k = 0; k < 40 / DT; k++) {
    s.adim({ ...DUZ, g: 1 });
    const v = hiz(S);
    if (!dolma && s.cx.kurulum.car.tb && s.sim.yeni!.turbo >= 0.9) dolma = (k + 1) * DT;
    vmax = Math.max(vmax, v);
    if (t100 == Infinity && v >= 27.78) t100 = (k + 1) * DT;
    if (k < 60) {
      const Y = s.sim.yeni!;
      for (const t of Y.tk) patinaj = Math.max(patinaj, Math.abs(t.kap));
    }
  }
  // 100-0: yeniden 100'e çıkıp tam fren
  const s2 = duz(arac, parca, zemin),
    S2 = s2.sim.S;
  for (let k = 0; k < 30 / DT && hiz(S2) < 27.78; k++) s2.adim({ ...DUZ, g: 1 });
  let x = 0;
  for (let k = 0; k < 20 / DT && hiz(S2) > 0.3; k++) {
    s2.adim({ ...DUZ, g: 0, b: 1 });
    x += hiz(S2) * DT;
  }
  return { t100, vmax: vmax * 3.6, b100: x, patinaj, dolma };
}

/**
 * gaz tepkisi (turbo gecikmesi hissi): ~70 km/sa'da düşük gazla giderken tam gaz. dolma: turbo basıncının %90'a
 * ulaşma süresi (sn; turbosuzda 0), ilk: ilk 0,3 sn'deki ortalama ivmenin 1-1,5 sn arasındakine oranı (gecikmeli
 * turboda düşük), ivme: 1-1,5 sn ortalama ivme (m/s²)
 */
export function gazTepkisi(arac: number, parca: readonly string[] = []) {
  const s = duz(arac, parca),
    S = s.sim.S;
  for (let k = 0; k < 30 / DT && hiz(S) < 19.5; k++) s.adim({ ...DUZ, g: 1 });
  for (let k = 0; k < 3 / DT; k++) s.adim({ ...DUZ, g: 0.12 });
  let v0 = hiz(S),
    dolma = 0,
    ilk = 0,
    son = 0;
  const vb = v0;
  for (let k = 0; k < 1.5 / DT; k++) {
    s.adim({ ...DUZ, g: 1 });
    const v = hiz(S),
      t = (k + 1) * DT,
      Y = s.sim.yeni!;
    if (!dolma && s.cx.kurulum.car.tb && Y.turbo >= 0.9) dolma = t;
    if (k == Math.round(0.3 / DT) - 1) ilk = (v - vb) / 0.3;
    if (k == Math.round(1 / DT) - 1) v0 = v;
    if (k == Math.round(1.5 / DT) - 1) son = (v - v0) / 0.5;
  }
  return { dolma, ilk: ilk / son, ivme: son };
}

/** yalpa (hissiyat): R yarıçaplı dairede v m/s sabit hızda gövdenin yana yatma açısı (derece, son 2 sn ortalaması) */
export function yalpa(arac: number, parca: readonly string[] = [], R = 40, v = 19) {
  const s = duz(arac, parca),
    S = s.sim.S,
    cx = 30 + R,
    cz = -3700;
  let top = 0,
    n = 0;
  for (let k = 0; k < 9 / DT; k++) {
    const a = Math.atan2(S.z - cz, S.x - cx) - 9 / R,
      tx = cx + R * Math.cos(a),
      tz = cz + R * Math.sin(a);
    let e = Math.atan2(tx - S.x, tz - S.z) - S.h;
    e = Math.atan2(Math.sin(e), Math.cos(e));
    const vv = hiz(S);
    s.adim({
      tg: cl(e * 3, -1, 1),
      g: cl((v - vv) * 0.6 + 0.25, 0, 1),
      b: vv > v + 1 ? 0.3 : 0,
      analogDireksiyon: true,
      analogGaz: true,
    });
    if (k > 7 / DT) {
      const Y = s.sim.yeni!;
      // gövdenin sağ ekseni (1,0,0) dünyada: y bileşeni yana yatma
      top += Math.asin(cl(2 * (Y.qx * Y.qy + Y.qw * Y.qz), -1, 1)) * 57.3;
      n++;
    }
  }
  return Math.abs(top / n);
}

/** çıkış patinajı (hissiyat): 8 m/s'de 0,6 direksiyonla tam gaz, 1,5 sn'de çeker tekerlerin en büyük kayma oranı ve kayma açısı (derece) */
export function cikisPatinaji(arac: number, parca: readonly string[] = []) {
  const s = duz(arac, parca),
    S = s.sim.S;
  for (let k = 0; k < 20 / DT && hiz(S) < 8; k++) s.adim({ ...DUZ, g: 0.6 });
  for (let k = 0; k < 0.6 / DT; k++) s.adim({ ...DUZ, tg: 0.6, g: 0.2 });
  let kap = 0,
    b = 0;
  for (let k = 0; k < 1.5 / DT; k++) {
    s.adim({ ...DUZ, tg: 0.6, g: 1 });
    const Y = s.sim.yeni!;
    for (const t of Y.tk) kap = Math.max(kap, Math.abs(t.kap));
    b = Math.max(b, Math.abs(s.sim.d.D.beta));
  }
  return { kap, kayma: b * 57.3 };
}
