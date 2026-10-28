// MUTANT DEV drift tanısı: fiziği değiştirmeden gerçek kayma, giriş ve spin durumunu açıklar.
// Normal HUD'a bağlanmaz; sürüş karakteri ve kullanıcı drift açısı kararı korunur.
import { cl } from "../cekirdek/matematik";
import { driftYarisProfili } from "./ortak";
import type { FizikBaglami, SimDurumu } from "./tipler";

export type DriftTaniKodu =
  | "havada"
  | "toparlan"
  | "yavas"
  | "gaz"
  | "aci"
  | "hazirlik"
  | "zorlama"
  | "drift"
  | "sinir";

export interface DriftTanisi {
  durum: DriftTaniKodu;
  mesaj: string;
  ipucu: string;
  aci: number;
  giris: number;
  azami: number;
  spin: number;
  hiz: number;
  /** 0-100: driftte kontrol açısı doluluğu, girişte hazırlık ilerlemesi. */
  ilerleme: number;
}

/** Tamamen salt okunur; yarış fiziğinin drift profilini tekrar kullanır, ayrı eşik uydurmaz. */
export function driftTanisi(
  d: Pick<SimDurumu, "S" | "DR" | "D" | "st">,
  K: FizikBaglami["kurulum"],
): DriftTanisi {
  const p = driftYarisProfili(K),
    ab = Math.abs(d.D.beta),
    derece = (r: number) => Math.round((r * 180) / Math.PI),
    hiz = Math.hypot(d.S.vx, d.S.vz),
    sonuc = (durum: DriftTaniKodu, mesaj: string, ipucu: string, ilerleme = 0): DriftTanisi => ({
      durum,
      mesaj,
      ipucu,
      aci: derece(ab),
      giris: derece(p.giris),
      azami: derece(p.azami),
      spin: derece(p.azami + 0.12),
      hiz: Math.round(hiz * 3.6),
      ilerleme: Math.round(cl(ilerleme, 0, 1) * 100),
    });
  if (d.S.air) return sonuc("havada", "HAVADA", "Tekerlekler yere basınca giriş yapılabilir");
  if (d.DR.cool > 0)
    return sonuc("toparlan", "SPİN SONRASI", "Toparlanma: " + Math.max(0, d.DR.cool).toFixed(1) + " sn");
  if (d.DR.on) {
    const ic = d.st * d.DR.dir,
      direksiyon =
        ic > 0.25
          ? "Direksiyon açıyı büyütüyor"
          : ic < -0.25
            ? "Karşı direksiyon açıyı azaltıyor"
            : "Açıyı gaz ve direksiyonla koru";
    return sonuc(
      ab >= p.azami * 0.9 ? "sinir" : "drift",
      ab >= p.azami * 0.9 ? "SPİN SINIRINDA" : "DRIFT AKTİF",
      direksiyon,
      ab / p.azami,
    );
  }
  if (hiz < 7) return sonuc("yavas", "HIZ GEREKLİ", "Drifte giriş için en az 25 km/sa");
  if (d.S.gas < 0.2) return sonuc("gaz", "GAZ GEREKLİ", "Gaza basarak açıyı oluştur");
  if (d.DR.nc > 0)
    return sonuc("hazirlik", "GİRİŞ HAZIRLIĞI", "Kayma açısını kısa süre koru", d.DR.nc / p.hazirlik);
  if (d.DR.hold > 0)
    return sonuc(
      "zorlama",
      "DİREKSİYONLA GİRİŞ",
      "Direksiyon ve gazı tutarak arka aksı kaydır",
      d.DR.hold / p.zorlama,
    );
  return sonuc(
    "aci",
    "KAYMA AÇISI",
    "Giriş eşiğine ulaş: " + derece(p.giris) + "°",
    ab / p.giris,
  );
}
