// MUTANT modu (oyun tarafı): açık dünyada roguelike koşu. Kurallar saf modülde (mutant-kurallari.ts); burası koşuyu
// tutar, her sabit adımda ilerletir, fiziğe tek etkiyi (tutuş çarpanı) verir ve rekoru ayrı anahtarda saklar.
// Yarışta (yaris.EV) ya da koşu yokken hiçbir şey yapmaz: tutuş çarpanı 1, kariyer/ekonomi/rekor dokunulmaz.
import { okuJson, yazJson } from "../cekirdek/depo";
import { tutusCarpani } from "../cekirdek/mekanikler";
import { kosuAdimi, kosuBaslat, kosuOzeti, type Kosu } from "./mutant-kurallari";
import type { SimDurumu } from "../fizik/tipler";

/** MUTANT rekoru: kariyer/serbest tur rekorlarından ayrı (lt_mutant) */
const ANAHTAR = "lt_mutant";

export const mutant = {
  kosu: null as Kosu | null,
  /** oyuncu Tutuş Darbesi'ne bastı; sonraki adımda tüketilir */
  darbe: false,
  /** arayüz bağlar: görev başarılınca (seçim ekranı) ve koşu bitince (özet) */
  secimAc: null as (() => void) | null,
  bittiAc: null as (() => void) | null,
  /** biten koşu rekoru geçti mi (özet ekranı için) */
  yeniRekor: false,
};

export const mutantRekoru = () => okuJson(ANAHTAR, { enIyi: 0 }).enIyi;

/** yeni koşu (tohum her koşuda değişir; aynı tohum aynı seçenek/görev dizisi) */
export function mutantBaslat(tohum = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0) {
  mutant.kosu = kosuBaslat(tohum);
  mutant.darbe = false;
}

export function mutantKapat() {
  mutant.kosu = null;
  mutant.darbe = false;
}

/** koşu açık mı (yarış dışında) */
export const mutantAcik = (yarista: boolean) => !!mutant.kosu && !yarista;

/** fiziğe giden tutuş çarpanı (dünya sorgusunun hava tutuşuyla çarpılır) */
export const mutantTutus = (yarista: boolean) =>
  mutantAcik(yarista) && mutant.kosu!.faz == "gorev" ? tutusCarpani(mutant.kosu!.mek) : 1;

/** fizik adımından sonra: koşuyu ilerlet, başarı/bitişte arayüzü aç */
export function mutantAdimi(d: Readonly<Pick<SimDurumu, "S" | "DR" | "D">>, dt: number, yarista: boolean) {
  const k = mutant.kosu;
  if (!k || yarista) return;
  const r = kosuAdimi(k, d, mutant.darbe, dt);
  mutant.darbe = false;
  if (r == "basari" && k.faz == "secim") mutant.secimAc?.();
  if (r == "bitti") {
    const o = kosuOzeti(k);
    mutant.yeniRekor = o.tamamlanan > mutantRekoru();
    if (mutant.yeniRekor) yazJson(ANAHTAR, { enIyi: o.tamamlanan });
    mutant.bittiAc?.();
  }
}
