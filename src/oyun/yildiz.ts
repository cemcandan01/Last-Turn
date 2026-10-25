// Yıldızlar: her yarışta 3 eşik (zamanlı yarışta süre, drift yarışında puan). 1★ hedef (tg / hp), 2★ ve 3★ ys.
// Eşikler ölçülerek yazılır (npm run olcum -- pistler, -- drift-puan). Pist başına en iyi yıldız lt_yildiz'de.
import type { YarisTuru } from "../arac/araclar";
import { okuJson, yazJson } from "../cekirdek/depo";
import { TDEF } from "../dunya/pist-tanimlari";

/** rekor ve yıldız anahtarının tür kısmı (<tür>_<seviye>) */
export const TUR_ANAHTARI: Record<YarisTuru, string> = {
  gp: "asphalt",
  rx: "dirt",
  dp: "drift",
  rl: "rally",
  dg: "drag",
};

/**
 * drift rekor/hayalet anahtarının ön eki (kural sürümlü: 0.7.4'te bonus kuralı değişti). Eski kuralın rekoru
 * `drift_<lv>`de kalır ve "eski kural" diye gösterilir; yıldız anahtarı (`drift_<lv>`) değişmez.
 */
export const DRIFT_REKOR_ON_EKI = TUR_ANAHTARI.dp + "2";

export const yildizAnahtari = (tur: YarisTuru, seviye: number) => TUR_ANAHTARI[tur] + "_" + seviye;

/** [1★, 2★, 3★] eşikleri: zamanlı yarışta süre (sn, azalan), drift yarışında puan (artan); pist yoksa boş */
export function yildizEsikleri(tur: YarisTuru, seviye: number): number[] {
  const d = TDEF.find((p) => p.t == tur && p.lv == seviye);
  if (!d) return [];
  const hedef = tur == "dp" ? d.hp : d.tg;
  return hedef && d.ys ? [hedef, ...d.ys] : [];
}

/** sonucun yıldızı (0-3): zamanlı yarışta süre eşiğin altında, drift yarışında puan eşiğin üstünde */
export function yildizSay(tur: YarisTuru, deger: number, esik: number[]) {
  let n = 0;
  for (const e of esik) if (tur == "dp" ? deger > 0 && deger >= e : deger <= e) n++;
  return n;
}

const kayit = () => okuJson("lt_yildiz", {} as Record<string, number>);

/** pistte şimdiye dek alınan en iyi yıldız (0-3) */
export const enIyiYildiz = (tur: YarisTuru, seviye: number): number =>
  +kayit()[yildizAnahtari(tur, seviye)] || 0;

/** yarış sonucunu kaydet; yeni en iyi ise true */
export function yildizKaydet(tur: YarisTuru, seviye: number, yildiz: number) {
  const k = kayit(),
    a = yildizAnahtari(tur, seviye);
  if (yildiz <= (+k[a] || 0)) return false;
  k[a] = yildiz;
  yazJson("lt_yildiz", k);
  return true;
}

/** drift yarışının tur sayısı */
export const DRIFT_TUR = 2;
