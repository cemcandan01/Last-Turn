// Pist çizimi (saf matematik): pist, düz ve yay parçalarından oluşan bir tarifle yazılır; virajın yarıçapı ve
// açısı tam istenen gibi çıkar (firkete, şikan, daralan viraj). Tarif boşlukla ayrılmış parçalardır:
//   D120     120 m düz
//   L60/90   sola 60 m yarıçaplı 90° viraj        R25/180  sağa 25 m yarıçaplı firkete
//   K60      kapanış (yalnız sonda, kapalı pistte): başlangıca en kısa yay-düz-yay yolu, 60 m yarıçapla
// Başlangıç (0, 0), yön +z. Sol, yönün +x tarafıdır (S.h artar). Noktalar ~4 m aralıklıdır (mkTrack bunları
// Catmull-Rom ile birleştirir).
import type { V2 } from "../cekirdek/matematik";

interface Parca {
  /** "D" düz, "L" sol, "R" sağ, "K" kapanış */
  t: "D" | "L" | "R" | "K";
  /** düzde uzunluk, virajda ve kapanışta yarıçap */
  a: number;
  /** viraj açısı (radyan) */
  b: number;
}

interface Uc {
  x: number;
  z: number;
  h: number;
}

const ARALIK = 4,
  TUR = 2 * Math.PI;

function coz(tarif: string): Parca[] {
  return tarif
    .trim()
    .split(/\s+/)
    .map((s) => {
      const t = s[0] as Parca["t"];
      if (t == "D" || t == "K") return { t, a: +s.slice(1), b: 0 };
      if (t != "L" && t != "R") throw new Error("pist tarifi: bilinmeyen parça " + s);
      const [r, d] = s.slice(1).split("/").map(Number);
      return { t, a: r, b: (d * Math.PI) / 180 };
    });
}

/** parçaları uç uca ekle (noktalar P'ye), bitiş ucu */
function yuru(pr: Parca[], u: Uc, P: V2[] | null): Uc {
  let { x, z, h } = u;
  for (const p of pr) {
    if (p.t == "D") {
      const n = Math.max(1, Math.round(p.a / ARALIK));
      for (let k = 1; k <= n; k++)
        P?.push([x + (Math.sin(h) * p.a * k) / n, z + (Math.cos(h) * p.a * k) / n]);
      x += Math.sin(h) * p.a;
      z += Math.cos(h) * p.a;
    } else if (p.t == "L" || p.t == "R") {
      const sg = p.t == "L" ? 1 : -1,
        r = p.a,
        // merkez: yönün solunda (L) ya da sağında (R); sol birim vektör (cos h, −sin h)
        cx = x + sg * r * Math.cos(h),
        cz = z - sg * r * Math.sin(h),
        n = Math.max(2, Math.ceil((r * p.b) / ARALIK));
      for (let k = 1; k <= n; k++) {
        const hk = h + (sg * p.b * k) / n;
        P?.push([cx - sg * r * Math.cos(hk), cz + sg * r * Math.sin(hk)]);
      }
      h += sg * p.b;
      x = cx - sg * r * Math.cos(h);
      z = cz + sg * r * Math.sin(h);
    }
  }
  return { x, z, h };
}

/** u ucundan (0, 0) yön 0'a yay-düz-yay yolu (Dubins): dört birleşimden geçerli ve en kısa olanı */
function kapanis(u: Uc, r: number): Parca[] {
  let en: Parca[] | null = null,
    enL = 1e18;
  const sol = (h: number): V2 => [Math.cos(h), -Math.sin(h)],
    mod = (a: number) => ((a % TUR) + TUR) % TUR;
  for (const s1 of [1, -1])
    for (const s2 of [1, -1]) {
      const c1x = u.x + s1 * r * sol(u.h)[0],
        c1z = u.z + s1 * r * sol(u.h)[1],
        c2x = s2 * r,
        c2z = 0,
        dx = c2x - c1x,
        dz = c2z - c1z,
        D = Math.hypot(dx, dz),
        taban = Math.atan2(dx, dz);
      const adaylar: [number, number][] = [];
      if (s1 == s2) adaylar.push([taban, D]);
      else if (D >= 2 * r) {
        const a = Math.asin((2 * r) / D),
          L = Math.sqrt(D * D - 4 * r * r);
        adaylar.push([taban + a, L], [taban - a, L]);
      }
      for (const [hs, L] of adaylar) {
        const a1 = mod(s1 * (hs - u.h)),
          a2 = mod(s2 * (0 - hs)),
          pr: Parca[] = [
            { t: s1 > 0 ? "L" : "R", a: r, b: a1 },
            { t: "D", a: L, b: 0 },
            { t: s2 > 0 ? "L" : "R", a: r, b: a2 },
          ],
          son = yuru(pr, u, null),
          top = r * (a1 + a2) + L;
        if (Math.hypot(son.x, son.z) < 0.5 && top < enL) {
          enL = top;
          en = pr;
        }
      }
    }
  if (!en) throw new Error("pist tarifi: kapanış bulunamadı");
  return en.filter((p) => (p.t == "D" ? p.a > 0.5 : p.b > 1e-3));
}

/** tariften pist kontrol noktaları. Kapalı pistte sonda K parçası olmalı; son nokta başa bağlanır */
export function cizPist(tarif: string, kapali = true): V2[] {
  const pr = coz(tarif),
    k = pr.findIndex((p) => p.t == "K");
  if (!kapali) {
    if (k >= 0) throw new Error("pist tarifi: açık pistte kapanış olmaz");
    const P: V2[] = [[0, 0]];
    yuru(pr, { x: 0, z: 0, h: 0 }, P);
    return P;
  }
  if (k != pr.length - 1) throw new Error("pist tarifi: kapalı pistin son parçası kapanış (K) olmalı");
  const P: V2[] = [[0, 0]],
    gov = pr.slice(0, k),
    u = yuru(gov, { x: 0, z: 0, h: 0 }, P);
  yuru(kapanis(u, pr[k].a), u, P);
  P.pop();
  return P;
}

/** tarifin bütün parçaları (kapanış açılmış): denetim ve testler için */
export function pistParcalari(tarif: string): Parca[] {
  const pr = coz(tarif),
    k = pr.findIndex((p) => p.t == "K");
  if (k < 0) return pr;
  const u = yuru(pr.slice(0, k), { x: 0, z: 0, h: 0 }, null);
  return [...pr.slice(0, k), ...kapanis(u, pr[k].a)];
}
