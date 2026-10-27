// Rakip YZ pilotu (saf, belirlenimci). Katmanlar:
//   Algı: kendi aracının konumu, hızı, kayma açısı; yarış çizgisindeki yeri ve ilerlemesi.
//   Plan: yarış çizgisi + hız profili (yz/cizgi.ts), kişiliğe göre (yz/kisilik.ts).
//   Taktik: yarış / toparlanma (takıldıysa geri vitesle çık, ters döndüyse kenarı gözeterek üç noktalı dönüş).
//   Kontrol: gaz, fren, direksiyon girdisi (FizikGirdisi). Oyuncuyla aynı fizik bu girdilerle ilerler.
// Rakip konum yazmaz, ışınlanmaz, hız/tutuş çarpanı almaz.
import type { Pist } from "../dunya/pist";
import type { FizikGirdisi } from "../fizik/tipler";
import { cizgideYakin, hizProfili, ileri, yarisCizgisi, type YarisCizgisi } from "./cizgi";
import { virajSapmasi, type Kisilik } from "./kisilik";

export interface PilotPlani {
  cizgi: YarisCizgisi;
  hiz: Float64Array;
  kisilik: Kisilik;
  tohum: number;
}

/** düzlükte hedef hız tavanı (m/s): aracın kendisi zaten sınırlar, bu yalnız profil için */
const TAVAN = 95;
/** viraj sapması bölümü (çizgi noktası): ~100 m */
const BOLUM = 25;

export function pilotPlani(TR: Pist, kisilik: Kisilik, tohum: number): PilotPlani {
  const cizgi = yarisCizgisi(TR, kisilik.pay);
  return {
    cizgi,
    hiz: hizProfili(cizgi, { yan: kisilik.yan, fren: kisilik.fren, tavan: TAVAN }),
    kisilik,
    tohum,
  };
}

export type PilotModu = "bekle" | "yaris" | "geri" | "don";

export interface PilotDurumu {
  mod: PilotModu;
  /** çizgideki son nokta */
  i: number;
  /** başlangıçtan beri çizgi boyunca ilerleme (m; geri gitmek düşürür) */
  ilerleme: number;
  /** yarış başladığından beri süre (sn): kalkış tepkisi */
  sure: number;
  /** tur (kişilik sapması tur başına değişir) */
  tur: number;
  /** toparlanma: takılı kalınan süre, geri vites süresi, sayaçlar */
  takili: number;
  geriT: number;
  toparlanma: number;
  /** kenardan düzeltme ve pist dışında geçen adım sayısı (ölçüm) */
  kenar: number;
  pistDisi: number;
  /** son girdi (ölçüm/çizim için) */
  hedefHiz: number;
}

export function pilotDurumu(plan: PilotPlani, x: number, z: number): PilotDurumu {
  return {
    mod: "bekle",
    i: cizgideYakin(plan.cizgi, x, z, 0, true),
    ilerleme: 0,
    sure: 0,
    tur: 0,
    takili: 0,
    geriT: 0,
    toparlanma: 0,
    kenar: 0,
    pistDisi: 0,
    hedefHiz: 0,
  };
}

/** pilotun gördüğü araç durumu: yalnız kendi aracından */
export interface PilotAlgisi {
  x: number;
  z: number;
  /** yön (atan2(dx, dz)) ve dünya hızları */
  h: number;
  vx: number;
  vz: number;
  /** kayma açısı (rad) */
  beta: number;
}

const kis = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const sinirla = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** bir sabit adım: algı → taktik → kontrol. basla: yarış başladı mı (geri sayımda frende bekler) */
export function pilotAdimi(
  p: PilotPlani,
  d: PilotDurumu,
  a: PilotAlgisi,
  dt: number,
  basla: boolean,
): FizikGirdisi {
  const c = p.cizgi,
    K = p.kisilik,
    v = Math.hypot(a.vx, a.vz),
    ileriHiz = a.vx * Math.sin(a.h) + a.vz * Math.cos(a.h);
  // algı: çizgideki yer ve ilerleme
  const i0 = d.i,
    i = cizgideYakin(c, a.x, a.z, i0);
  let ds = c.s[i] - c.s[i0];
  if (!c.acik) {
    if (ds < -c.len / 2) {
      ds += c.len;
      d.tur++;
    } else if (ds > c.len / 2) {
      ds -= c.len;
      d.tur--;
    }
  }
  d.ilerleme += ds;
  d.i = i;
  const yon = (j: number) => kis(Math.atan2(c.x[j] - a.x, c.z[j] - a.z) - a.h);
  if (basla) d.sure += dt;
  if (!basla || d.sure < K.tepki) {
    d.mod = "bekle";
    d.hedefHiz = 0;
    return { tg: 0, g: 0, b: 1, analogDireksiyon: true, analogGaz: true };
  }
  if (d.mod == "bekle") d.mod = "yaris";

  // algı: orta çizgiye göre yanal konum ve dışa doğru yanal hız; asfaltın dışındaysa pist dışı taktiği
  const yanal = (a.x - c.cx[i]) * c.nx[i] + (a.z - c.cz[i]) * c.nz[i],
    disari = Math.sign(yanal) * (a.vx * c.nx[i] + a.vz * c.nz[i]),
    disarida = Math.abs(yanal) > c.hw + 0.8,
    kenarda = Math.abs(yanal) > c.hw - 1.5 && disari > 0.2;
  const cizgiYonu = Math.atan2(c.x[ileri(c, i, 4)] - c.x[i], c.z[ileri(c, i, 4)] - c.z[i]),
    sapma0 = kis(cizgiYonu - a.h),
    ters = Math.abs(sapma0) > 1.9;

  // taktik: ters döndüyse ve yavaşsa üç noktalı dönüş; takıldıysa (duvar) geri vitesle çık
  if (d.mod == "yaris" && ters && v < 6) {
    d.mod = "don";
    d.geriT = 0;
    d.toparlanma++;
  }
  if (d.mod == "don") {
    // ileri tam kilit çizgi yönüne; kenara varınca ters kilitle geri; burun çizgiye dönünce yarış
    const yonIsaret = Math.sign(sapma0) || 1;
    d.hedefHiz = 0;
    if (Math.abs(sapma0) < 0.9) {
      d.mod = "yaris";
      d.takili = -1.5;
    } else {
      d.geriT += dt;
      const geride = d.geriT < 0;
      // yön değişimi yalnız o yöne gerçekten giderken kenara varınca (frenlenirken eski hız sayılmaz)
      if (!geride && ((kenarda && ileriHiz > 0.3) || d.geriT > 3)) d.geriT = -1.8;
      else if (geride && kenarda && ileriHiz < -0.3) d.geriT = 0;
      // manevra yavaş yapılır: güçlü araç tam kilitte hızlanıp pistten çıkmasın
      return geride
        ? { tg: -yonIsaret, g: 0, b: ileriHiz < -3 ? 0 : 0.8, analogDireksiyon: true, analogGaz: true }
        : {
            tg: yonIsaret,
            g: ileriHiz < 3 ? 0.7 : 0,
            b: ileriHiz > 5 ? 0.5 : 0,
            analogDireksiyon: true,
            analogGaz: true,
          };
    }
  }
  if (d.mod == "yaris") {
    if (v < 1) d.takili += dt;
    else d.takili = Math.max(Math.min(d.takili, 0), d.takili - 2 * dt);
    if (d.takili > K.sabir) {
      d.mod = "geri";
      d.geriT = 1.6;
      d.takili = 0;
      d.toparlanma++;
    }
  }
  if (d.mod == "geri") {
    d.geriT -= dt;
    // geri vites: direksiyon ters (burnu çizgiye çevir); araç durmadan geri girmez, fizik bunu yönetir. Geri
    // giderken pist kenarına varırsa durur: çime geri girmek kalkışı imkânsızlaştırır
    const hedef = yon(ileri(c, i, 10));
    if (d.geriT <= 0 || (kenarda && d.geriT < 1.2)) {
      d.mod = "yaris";
      // ileri kalkışa süre tanı: hemen yeniden "takıldım" deme
      d.takili = -1.5;
    }
    d.hedefHiz = 0;
    return { tg: -Math.sign(hedef) || 0, g: 0, b: 1, analogDireksiyon: true, analogGaz: true };
  }

  // kontrol: direksiyon bakış noktasına (saf takip); pist dışında yakına bakar: çim hızı hızla yer, kararlı dönüş
  const bak = disarida
      ? sinirla(1.3 * Math.abs(yanal), 8, K.bakis + K.bakisHiz * v)
      : K.bakis + K.bakisHiz * v,
    j = ileri(c, i, bak);
  const aci = yon(j);
  // ters dönmüşken (spin sonrası) tam kilit dön
  // düşük hızda kilit sınırlı: kalkışta tam kilit + gaz aracı yerinde döndürür
  // çimde tam kilit aracı döndürür: kilit yarıya iner. Arka kayınca karşı direksiyon (kayma açısı yönünde)
  const kilit = (v < 6 ? 0.45 + (0.55 * v) / 6 : 1) * (disarida ? 0.55 : 1),
    karsi = Math.abs(a.beta) > 0.15 && v > 5 ? 1.5 * (a.beta - Math.sign(a.beta) * 0.15) : 0,
    tg = ters ? Math.sign(aci) : sinirla(sinirla(aci * 2.4, -kilit, kilit) + karsi, -1, 1);
  // hız: biraz ilerinin hedefi (tepki payı); tutarlılık sapması viraj bölümü başına
  const k = ileri(c, i, 2 + v * 0.25),
    sapma = virajSapmasi(K, p.tohum, d.tur, Math.floor(k / BOLUM)),
    vh = p.hiz[k] * sapma;
  d.hedefHiz = vh;
  const fark = vh - ileriHiz;
  let g = fark > 0 ? sinirla(fark / 2.5, 0, 1) : 0;
  let b = fark < -0.8 ? sinirla(-fark / 4, 0, 1) : 0;
  // kayma: arka kaçıyorsa gazı kes (temkinli pilot daha erken)
  if (v > 8 && Math.abs(a.beta) > (disarida ? 0.6 : K.kaymaSiniri)) g *= 0.3;
  if (ters) g = Math.min(g, 0.4);
  let tgSon = tg;
  if (disarida) {
    // çimde durmak kalkışı imkânsızlaştırır: yalnız çok hızlıysa hafif fren, yavaşsa gaz açık kalır
    d.pistDisi++;
    b = v > 15 && fark < -3 ? Math.min(b, 0.4) : 0;
    if (v < 12 && !ters) g = Math.max(g, 0.6);
  } else {
    // pist kenarına yaklaşıp dışa kayıyorsa (viraj hızı fazla) gazı kes ve içe düzelt; yalnız çizginin dışına
    // taşarken: çıkışta bilerek kenara açılan çizgi düzeltilmez
    const tasma = (yanal - c.o[i]) * Math.sign(yanal);
    if (c.hw - Math.abs(yanal) < 0.3 && tasma > 0.8 && disari > 0.5) {
      g = Math.min(g, 0.3);
      tgSon = sinirla(tg - Math.sign(yanal) * 0.35, -1, 1);
      d.kenar++;
    }
  }
  return { tg: tgSon, g, b, analogDireksiyon: true, analogGaz: true };
}
