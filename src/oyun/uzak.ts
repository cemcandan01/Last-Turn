// Uzak araçlar: fiziği çalışmayan, anlık görüntülerle çizilen araçlar (ileride ağdaki diğer oyuncular). Ağ kodu
// yok: ağ katmanı uzakAracEkle ile aracı açıp gelen her durumu uzakAnlikEkle ile verecek; yumuşatma fizik/anlik.ts'te.
// Geliştirici hayaleti (deneme sürümünde ayarlardan): yerel aracın görüntüleri seyrek (paket gibi) ve gecikmeli olarak
// bir uzak araca verilir; ağ yolu ağsız denenir. Araçlar arasında çarpışma yok.
import { uzakAnlikEkle, uzakAracYap, uzakGuncelle, type AracAnlik, type UzakArac } from "../fizik/anlik";
import { aracAnligi } from "../fizik/arac-ornegi";
import { GELISTIRICI, set } from "./ayarlar";
import { carIndex } from "./durum";
import { sim, yerel } from "./surus";

export const uzak = { araclar: [] as UzakArac[] };

export function uzakAracEkle(id: string, arac: number): UzakArac {
  uzakAracSil(id);
  const u = uzakAracYap(id, arac);
  uzak.araclar.push(u);
  return u;
}

export function uzakAracSil(id: string) {
  const i = uzak.araclar.findIndex((u) => u.id == id);
  if (i >= 0) uzak.araclar.splice(i, 1);
}

export { uzakAnlikEkle };

/** her karede: uzak araçları görüntü saatine göre ilerlet */
export function uzakTick(dt: number) {
  for (const u of uzak.araclar) uzakGuncelle(u, dt);
}

/** geliştirici hayaleti: kaç adımda bir görüntü (60/4 = 15 Hz), kaç saniye gecikmeyle */
export const hayalet = {
  /** testler için: ayardan bağımsız aç */
  zorla: false,
  gecikme: 2,
  siklik: 4,
  adim: 0,
  kuyruk: [] as { ulas: number; a: AracAnlik }[],
};

export const HAYALET = "hayalet";
export const hayaletAcik = () => hayalet.zorla || (GELISTIRICI && !!set.hayalet);

/** her fizik adımından sonra (sürüşte): hayaletin paketlerini üret ve vakti gelenleri ver */
export function uzakAdimi() {
  const H = hayalet;
  let u = uzak.araclar.find((a) => a.id == HAYALET);
  if (!hayaletAcik()) {
    if (u) uzakAracSil(HAYALET);
    H.kuyruk.length = 0;
    return;
  }
  if (!u) u = uzakAracEkle(HAYALET, carIndex());
  u.arac = carIndex();
  if (++H.adim % H.siklik == 0) H.kuyruk.push({ ulas: sim.d.zaman + H.gecikme, a: aracAnligi(yerel) });
  while (H.kuyruk.length && H.kuyruk[0].ulas <= sim.d.zaman) uzakAnlikEkle(u, H.kuyruk.shift()!.a);
}

/** yerel araç sıfırlandı (yeni yarış, ışınlanma): hayalet baştan */
export function uzakSifirla() {
  hayalet.kuyruk.length = 0;
  const u = uzak.araclar.find((a) => a.id == HAYALET);
  if (u) {
    u.tampon.length = 0;
    u.hazir = false;
  }
}
