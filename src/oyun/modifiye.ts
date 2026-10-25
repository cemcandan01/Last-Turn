// Modifiye: araç başına takılı parçalar (lt_parca: { "<araç no>": [parça id, …] }) ve sürüşe uygulanması.
// Parçalar araç başına satın alınır (oyun/ilerleme.ts → parcaSatinAl; alım "parca_<araç>_<parça>" bulutta); takılı
// liste de bulut belgesinin `parca` alanına gider (bulut/esitleme.ts; kurallar yayınlanmamışsa yalnız cihazda kalır). Fizik değerleri ve kurulum
// arac/parcalar.ts'ten (aracKur); stokta (parça yok) kurulum.mod null, fizik bugünküyle aynı.
import { CARS } from "../arac/araclar";
import type { YarisTuru } from "../arac/araclar";
import {
  aracKur,
  PAKETLER,
  parcaBul,
  parcaliKurulum,
  parcalariDuzenle,
  type ParcaKategori,
} from "../arac/parcalar";
import { performansPuani, kurulumPerformansi, type PuanTuru } from "../arac/performans";
import { yarisLastigi } from "../arac/yaris-lastigi";
import { TIRES } from "../fizik/veriler";
import { okuJson, yazJson } from "../cekirdek/depo";
import { applyPreset, kurulum } from "./kurulum";
import { degisimBildir, parcaSahipMi } from "./ilerleme";

const ANAHTAR = "lt_parca";
let T: Record<string, string[]> | null = null;

const tablo = () => (T ??= okuJson(ANAHTAR, {} as Record<string, string[]>));

/** aracın takılı parçaları (kategori sırasıyla; alınmamış ya da bilinmeyen parçalar atılır) */
export const takiliParcalar = (aracNo: number): string[] =>
  parcalariDuzenle(tablo()[aracNo] ?? []).filter((id) => parcaSahipMi(aracNo, id));

function yazTakili(aracNo: number, ids: string[]) {
  const t = tablo();
  const d = parcalariDuzenle(ids);
  if (d.length) t[aracNo] = d;
  else delete t[aracNo];
  yazJson(ANAHTAR, t);
  degisimBildir();
}

/** buluta gidecek takılı parçalar (araç no → parça listesi; boş araçlar yok) */
export function takiliVerisi(): Record<string, string[]> {
  const t = tablo(),
    r: Record<string, string[]> = {};
  for (const k in t) {
    const d = parcalariDuzenle(t[k] ?? []);
    if (d.length) r[k] = d;
  }
  return r;
}

/**
 * buluttan gelen takılı parçaları yerele kat. degistir: başka hesaba geçişte yerel liste bulutunkiyle değişir; yoksa
 * (aynı hesabın başka cihazı) yalnız bu cihazda parçası olmayan araçlar buluttan alınır. Bilinmeyen parça atılır
 */
export function takiliYukle(d: Record<string, unknown> | undefined | null, degistir = false) {
  const t = tablo();
  if (degistir) for (const k in t) delete t[k];
  for (const [k, v] of Object.entries(d || {})) {
    if (!Array.isArray(v) || !CARS[+k] || (t[k] && t[k].length)) continue;
    const l = parcalariDuzenle(v.filter((x): x is string => typeof x == "string"));
    if (l.length) t[k] = l;
  }
  yazJson(ANAHTAR, t);
}

/** parçayı tak (aynı kategorideki parçanın yerine); alınmamışsa takılmaz */
export function parcaTak(aracNo: number, id: string) {
  if (!parcaBul(id) || !parcaSahipMi(aracNo, id)) return false;
  yazTakili(aracNo, [...takiliParcalar(aracNo), id]);
  return true;
}

/** kategorideki parçayı sök (stoka dön) */
export function parcaSok(aracNo: number, kat: ParcaKategori) {
  yazTakili(
    aracNo,
    takiliParcalar(aracNo).filter((id) => parcaBul(id)!.kat != kat),
  );
}

/** paketin çekirdek parçalarını tak (hepsi alınmışsa) */
export function paketiTak(aracNo: number, paket: string) {
  const p = PAKETLER.find((x) => x.id == paket);
  if (!p || !p.parcalar.every((id) => parcaSahipMi(aracNo, id))) return false;
  yazTakili(aracNo, [...takiliParcalar(aracNo), ...p.parcalar]);
  return true;
}

/** aracın bütün parçalarını sök */
export const stokaDon = (aracNo: number) => yazTakili(aracNo, []);

/** kategoride takılı parça (yoksa undefined: stok) */
export const kategoriParcasi = (aracNo: number, kat: ParcaKategori) =>
  takiliParcalar(aracNo).find((id) => parcaBul(id)!.kat == kat);

/**
 * seçili aracın sürüş kurulumu (yarış ve serbest sürüş başında; applyPreset'in yerine): aracın kendi önayarı (paket
 * ağır basıyorsa o türün önayarı) + parçaların ayar alanları ve lastiği; parçalı araç kurulum.mod'da
 */
export function modifiyeUygula(aracNo: number) {
  const P = aracKur(aracNo, takiliParcalar(aracNo)),
    lastik = P.parcalar.some((id) => parcaBul(id)!.e.lastik != null);
  kurulum.mod = P.parcalar.length
    ? { taban: CARS[aracNo], car: P.car, tire: lastik ? P.tire : null, ayar: P.ayar, parcalar: P.parcalar }
    : null;
  kurulum.pk = P.pk;
  applyPreset();
}

export interface ParcaEtkisiSatiri {
  /** kısa ad (HIZ, GÜÇ…), gösterilecek değer, iyi mi (null: nötr: lastik adı, çekiş türü) */
  ad: string;
  deger: string;
  iyi: boolean | null;
}

/** puan zemininin yarış türü (etkiler aynı zeminde karşılaştırılsın) */
const ZEMIN_TURU: Record<PuanTuru, YarisTuru> = { asfalt: "gp", rallikros: "rx", ralli: "rl", drag: "dg" };
const sayi = (x: number, n: number) => Math.abs(x).toFixed(n).replace(".", ",");
const isaret = (x: number, n: number) => (x > 0 ? "+" : "−") + sayi(x, n);

/**
 * parça (ya da paket) takılınca neyin değiştiği: önce referans tur süresi (aynı zeminde; tur verilirse o yarış türünde),
 * sonra aracın fiziksel değerleri (güç, ağırlık, turbo gecikmesi, çekiş, teker açısı, yay, yerden yükseklik, diferansiyel
 * kilidi, lastik), en son nokta kütle değerleri (azami hız, 0-100, yanal tutuş, 100-0). Yalnız değişenler; en çok `en`
 */
export function parcaEtkileri(
  aracNo: number,
  once: readonly string[],
  sonra: readonly string[],
  tur?: YarisTuru,
  en = 6,
): ParcaEtkisiSatiri[] {
  const r: ParcaEtkisiSatiri[] = [],
    ekle = (ad: string, x: number, n: number, birim: string, iyiArti: boolean) => {
      if (Math.abs(x) >= 0.5 * 10 ** -n) r.push({ ad, deger: isaret(x, n) + birim, iyi: x > 0 == iyiArti });
    };
  const zt = tur ?? ZEMIN_TURU[performansPuani(aracNo, once).zemin],
    K0 = parcaliKurulum(aracNo, once, "norm"),
    K1 = parcaliKurulum(aracNo, sonra, "norm");
  if (tur) {
    K0.tire = yarisLastigi(tur, once);
    K1.tire = yarisLastigi(tur, sonra);
  }
  const p0 = tur
      ? kurulumPerformansi(K0, performansPuani(aracNo, once, zt).zemin)
      : performansPuani(aracNo, once, zt),
    p1 = tur
      ? kurulumPerformansi(K1, performansPuani(aracNo, sonra, zt).zemin)
      : performansPuani(aracNo, sonra, zt);
  ekle("TUR", p1.tur - p0.tur, 2, " sn", false);
  const a = K0.car,
    b = K1.car;
  ekle("GÜÇ", b.hp - a.hp, 0, " hp", true);
  ekle("AĞIRLIK", b.kg - a.kg, 0, " kg", false);
  const gecikme = (c: typeof a) => (c.tb ? (c.tbs ?? 1) : 0);
  if (gecikme(b) != gecikme(a))
    r.push({
      ad: "TURBO",
      deger: gecikme(b) ? sayi(gecikme(b), 2) + " sn gecikme" : "gecikmesiz",
      iyi: gecikme(b) < gecikme(a),
    });
  if (b.awd > 0 != a.awd > 0)
    r.push({ ad: "ÇEKİŞ", deger: b.awd > 0 ? "Dört çeker" : "Arkadan itiş", iyi: null });
  ekle("TEKER AÇISI", ((b.dmax ?? 0.8) - (a.dmax ?? 0.8)) * 57.3, 0, "°", true);
  if (b.fq != a.fq && b.fq) r.push({ ad: "YAY", deger: sayi(b.fq, 1) + " Hz", iyi: null });
  ekle("YERDEN", ((b.lift ?? 0) - (a.lift ?? 0)) * 100, 0, " cm", true);
  ekle("KİLİT", (K1.tu.diff - K0.tu.diff) * 100, 0, "%", true);
  if (K1.tire != K0.tire) r.push({ ad: "LASTİK", deger: TIRES[K1.tire]?.n ?? "", iyi: null });
  ekle("HIZ", p1.hiz - p0.hiz, 0, " km/sa", true);
  ekle("0-100", p1.ivme - p0.ivme, 2, " sn", false);
  ekle("TUTUŞ", (p1.tutus / p0.tutus - 1) * 100, 0, "%", true);
  ekle("FREN", p1.fren - p0.fren, 1, " m", false);
  return r.slice(0, en);
}

/** testler için: bellekteki tabloyu unut */
export const modifiyeSifirla = () => {
  T = null;
};
