// LT-SYS-001: oyun fizik motorundan bağımsız, deterministik perk/enerji prototipi.
// Bu modül kendi başına hiçbir canlı sürüş davranışını değiştirmez.
export type MekanikOlay =
  | { tur: "drift"; kimlik: string; sure: number; hiz: number; aci: number; kasitli: boolean }
  | { tur: "yetenek"; kimlik: string; yetenek: string };

export type MekanikTanim = {
  id: string;
  versiyon: number;
  tetik: MekanikOlay["tur"];
  maliyet: number;
  beklemeAdimi: number;
  enerjiKazanimi: number;
};

export type MekanikDurum = {
  adim: number;
  enerji: number;
  kapasite: number;
  sonTetik: Record<string, number>;
  gorulenOlaylar: string[];
};

export const DRIFT_HARVESTER: MekanikTanim = {
  id: "drift-harvester",
  versiyon: 1,
  tetik: "drift",
  maliyet: 0,
  beklemeAdimi: 0,
  enerjiKazanimi: 6,
};

export function mekanikBaslat(kapasite = 100, baslangic = 0): MekanikDurum {
  if (!Number.isFinite(kapasite) || kapasite <= 0 || !Number.isFinite(baslangic))
    throw new RangeError("Gecersiz enerji kapasitesi veya baslangici");
  return { adim: 0, enerji: Math.max(0, Math.min(kapasite, baslangic)), kapasite, sonTetik: {}, gorulenOlaylar: [] };
}

export function mekanikAdimi(
  durum: MekanikDurum,
  olaylar: readonly MekanikOlay[],
  takili: readonly MekanikTanim[],
  etkin = false,
): MekanikDurum {
  // Kapatılmış sistem hiçbir enerji/olay kaydı üretmez.
  if (!etkin) return durum;
  const yeni: MekanikDurum = {
    adim: durum.adim + 1,
    enerji: durum.enerji,
    kapasite: durum.kapasite,
    sonTetik: { ...durum.sonTetik },
    gorulenOlaylar: [...durum.gorulenOlaylar],
  };
  const gorulen = new Set(yeni.gorulenOlaylar);
  for (const olay of olaylar) {
    if (!olay.kimlik || gorulen.has(olay.kimlik)) continue;
    gorulen.add(olay.kimlik);
    yeni.gorulenOlaylar.push(olay.kimlik);
    for (const m of takili) {
      if (m.tetik !== olay.tur || m.versiyon < 1 || m.beklemeAdimi < 0 || m.maliyet < 0 || m.enerjiKazanimi < 0) continue;
      if (olay.tur === "drift" &&
        (!olay.kasitli || olay.sure <= 0 || olay.hiz < 11 || Math.abs(olay.aci) < 0.2)) continue;
      if (olay.tur === "yetenek" && olay.yetenek !== m.id) continue;
      const son = yeni.sonTetik[m.id];
      if (son !== undefined && yeni.adim - son <= m.beklemeAdimi) continue;
      if (yeni.enerji < m.maliyet) continue;
      const kazanc = olay.tur === "drift"
        ? m.enerjiKazanimi * Math.min(1, Math.max(0, olay.sure))
        : m.enerjiKazanimi;
      yeni.enerji = Math.min(yeni.kapasite, Math.max(0, yeni.enerji - m.maliyet + kazanc));
      yeni.sonTetik[m.id] = yeni.adim;
    }
  }
  return yeni;
}
