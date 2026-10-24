// Modifiye: araç başına takılı parçalar (lt_parca: { "<araç no>": [parça id, …] }) ve sürüşe uygulanması.
// Parçalar araç başına satın alınır (oyun/ilerleme.ts → parcaSatinAl; alım "parca_<araç>_<parça>" bulutta); takılı
// liste yalnız bu cihazda tutulur (bulut belgesinin alanları firestore.rules'ta sabit). Fizik değerleri ve kurulum
// arac/parcalar.ts'ten (aracKur); stokta (parça yok) kurulum.mod null, fizik bugünküyle aynı.
import { CARS } from "../arac/araclar";
import { aracKur, PAKETLER, parcaBul, parcalariDuzenle, type ParcaKategori } from "../arac/parcalar";
import { okuJson, yazJson } from "../cekirdek/depo";
import { applyPreset, kurulum } from "./kurulum";
import { parcaSahipMi } from "./ilerleme";

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

/** testler için: bellekteki tabloyu unut */
export const modifiyeSifirla = () => {
  T = null;
};
