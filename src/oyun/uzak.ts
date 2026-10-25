// Uzak araçlar: fiziği çalışmayan, anlık görüntülerle çizilen araçlar (ileride ağdaki diğer oyuncular). Ağ kodu
// yok: ağ katmanı uzakAracEkle ile aracı açıp gelen her durumu uzakAnlikEkle ile verecek; yumuşatma fizik/anlik.ts'te.
// Rekor hayaleti: kaydedilmiş en iyi tur girdilerini adım adım simüle eder ve pistte saydam araç olarak çizer.
// Geliştirici hayaleti (deneme sürümünde ayarlardan): yerel aracın görüntüleri seyrek ve gecikmeli verilir.
import {
  anlikAl,
  uzakAnlikEkle,
  uzakAracYap,
  uzakGuncelle,
  type AracAnlik,
  type UzakArac,
} from "../fizik/anlik";
import { aracAnligi } from "../fizik/arac-ornegi";
import { kayitGirdisi, type GirdiKaydi } from "../fizik/girdi-kaydi";
import { Simulasyon } from "../fizik/simulasyon";
import type { DunyaSorgusu, FizikBaglami } from "../fizik/tipler";
import { GELISTIRICI, set } from "./ayarlar";
import { carIndex } from "./durum";
import { hayaletGirdiKaydiOku } from "./hayalet-kayit";
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

export const HAYALET = "hayalet";

/** Rekor hayaletinin oynatma durumu */
export const rekorHayaleti = {
  aktif: false,
  kayit: null as GirdiKaydi | null,
  sim: null as Simulasyon | null,
  cx: null as FizikBaglami | null,
  adimIndex: 0,
};

/** Kayıtlı rekor hayaletini yükle ve başlat */
export function rekorHayaletiBaslat(pistAnahtari: string, dunyaSorgusu: DunyaSorgusu) {
  rekorHayaletiDurdur();
  const veri = hayaletGirdiKaydiOku(pistAnahtari);
  if (!veri) return false;

  uzakAracEkle(HAYALET, veri.arac);
  const ghostSim = new Simulasyon(veri.kayit.tohum);
  ghostSim.sifirla(veri.kayit.bas.x, veri.kayit.bas.z, veri.kayit.bas.h, veri.kayit.bas.y);
  Object.assign(ghostSim.d.S, veri.kayit.bas);

  const cx: FizikBaglami = {
    dunya: dunyaSorgusu,
    kurulum: yerel.cx.kurulum,
    olay: yerel.cx.olay,
    gorselRng: yerel.cx.gorselRng || Math.random,
    rng: ghostSim.rng,
  };

  rekorHayaleti.aktif = true;
  rekorHayaleti.kayit = veri.kayit;
  rekorHayaleti.sim = ghostSim;
  rekorHayaleti.cx = cx;
  rekorHayaleti.adimIndex = 0;
  return true;
}

export function rekorHayaletiDurdur() {
  rekorHayaleti.aktif = false;
  rekorHayaleti.kayit = null;
  rekorHayaleti.sim = null;
  rekorHayaleti.cx = null;
  rekorHayaleti.adimIndex = 0;
  uzakAracSil(HAYALET);
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

export const hayaletAcik = () => hayalet.zorla || (GELISTIRICI && !!set.hayalet);

/** her fizik adımından sonra (sürüşte): hayaleti ilerlet */
export function uzakAdimi() {
  const H = rekorHayaleti;
  if (H.aktif && H.kayit && H.sim && H.cx) {
    const u = uzak.araclar.find((a) => a.id == HAYALET);
    if (!u) return;
    const kayit = H.kayit;
    const gSim = H.sim;
    const gCx = H.cx;
    if (H.adimIndex < kayit.n) {
      const gi = kayitGirdisi(kayit, H.adimIndex);
      gSim.adim(gi, gCx);
      const anlik = anlikAl(gSim.d, gSim.yeni);
      uzakAnlikEkle(u, anlik);
      H.adimIndex++;
    }
    return;
  }

  const Hdev = hayalet;
  let u = uzak.araclar.find((a) => a.id == HAYALET);
  if (!hayaletAcik()) {
    if (u) uzakAracSil(HAYALET);
    Hdev.kuyruk.length = 0;
    return;
  }
  if (!u) u = uzakAracEkle(HAYALET, carIndex());
  u.arac = carIndex();
  if (++Hdev.adim % Hdev.siklik == 0)
    Hdev.kuyruk.push({ ulas: sim.d.zaman + Hdev.gecikme, a: aracAnligi(yerel) });
  while (Hdev.kuyruk.length && Hdev.kuyruk[0].ulas <= sim.d.zaman) uzakAnlikEkle(u, Hdev.kuyruk.shift()!.a);
}

/** yerel araç sıfırlandı (yeni yarış, ışınlanma): hayalet baştan */
export function uzakSifirla() {
  const H = rekorHayaleti;
  if (H.aktif && H.kayit && H.sim) {
    H.adimIndex = 0;
    const k = H.kayit;
    H.sim.sifirla(k.bas.x, k.bas.z, k.bas.h, k.bas.y);
    Object.assign(H.sim.d.S, k.bas);
  }
  hayalet.kuyruk.length = 0;
  const u = uzak.araclar.find((a) => a.id == HAYALET);
  if (u) {
    u.tampon.length = 0;
    u.hazir = false;
  }
}
