// Ses kaydı (test ve dinleme için): oyunun sesleri çevrimdışı bağlamda (OfflineAudioContext) senaryoyla çalınır
// ve WAV olarak döner. tests/e2e/ses-kaydi.mjs bunu çağırıp dosyaya yazar. Oyun kodu bu dosyayı kullanmaz.
import { VITESLER } from "../fizik/yeni/arac-fizigi";
import { CARS } from "../arac/araclar";
import { karistiriciKur } from "./baglam";
import { arayuzSesi, SurusSesleri, type SurusGirdisi } from "./efektler";
import { DINLE_SURE, dinleGaz, MotorSesi } from "./motor";
import { Muzik } from "./muzik";

const SR = 44100,
  ADIM = 1 / 60;

/** stereo örneklerden 16 bit WAV (base64) */
function wav(b: AudioBuffer) {
  const n = b.length,
    k = b.numberOfChannels,
    v = new DataView(new ArrayBuffer(44 + n * k * 2)),
    yaz = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  yaz(0, "RIFF");
  v.setUint32(4, 36 + n * k * 2, true);
  yaz(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, k, true);
  v.setUint32(24, b.sampleRate, true);
  v.setUint32(28, b.sampleRate * k * 2, true);
  v.setUint16(32, k * 2, true);
  v.setUint16(34, 16, true);
  yaz(36, "data");
  v.setUint32(40, n * k * 2, true);
  const ch = Array.from({ length: k }, (_, i) => b.getChannelData(i));
  let o = 44;
  for (let i = 0; i < n; i++)
    for (let c = 0; c < k; c++, o += 2) v.setInt16(o, Math.max(-1, Math.min(1, ch[c][i])) * 32767, true);
  let s = "";
  const u = new Uint8Array(v.buffer);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

const bosSurus = (): SurusGirdisi => ({
  hiz: 0,
  kayma: 0,
  savrulma: 0,
  zemin: [0, 1, 0, 0, 0, 0],
  gevsekKayma: 0,
  havada: false,
  kerb: false,
  kokpit: false,
});

/**
 * tur: "muzik" | "motor" (rölanti, gaz vuruşu, tam gazla vitesler, gaz kesme) | "surus" (drift, toprak, çarpma)
 * arac: araç türü (gt, rx, dr, rl, dg)
 */
export async function sesKaydi(tur: string, arac = "gt", sn = 14): Promise<string> {
  const ctx = new OfflineAudioContext(2, Math.round(sn * SR), SR),
    k = karistiriciKur(ctx);
  if (tur.startsWith("muzik")) {
    k.muzik.gain.value = 0.81;
    const m = new Muzik(ctx, k.muzik);
    // "muzik:davul" gibi: yalnız bir çalgı grubu (karışım dengesine bakmak için)
    const tek = tur.split(":")[1];
    if (tek) m.yalniz(tek);
    m.baslat(0);
    m.planla(sn);
    return wav(await ctx.startRendering());
  }
  const car = CARS.find((c) => c.k == arac) ?? CARS[0],
    dMax = car.dv ?? 7500,
    M = new MotorSesi(ctx, k.arac),
    SE = new SurusSesleri(ctx, k.arac);
  k.efekt.gain.value = 0.64;
  await M.kur(car.k, dMax);
  let devir = 900,
    vites = 1,
    kesik = 0,
    hiz = 0;
  for (let t = 0; t < sn; t += ADIM) {
    let gaz = 0;
    const s = bosSurus();
    if (tur == "dinle") {
      // garajdaki "motoru dinle" düğmesinin çaldığı 5 sn (ses.ts'teki sanal motorla aynı)
      gaz = t < DINLE_SURE ? dinleGaz(t) : 0;
      const h = gaz ? 900 + 0.99 * (dMax - 900) : 900;
      devir += (h - devir) * Math.min(1, ADIM * (h > devir ? 2.6 : 1.8));
      s.zemin = [0, 0, 0, 0, 0, 0];
    } else if (tur == "motor") {
      if (t > 1.5 && t < 1.9) gaz = 1;
      else if (t > 3.5 && t < 11.5) gaz = 1;
      if (t < 3.5) {
        // boşta: gaz vuruşu
        const h = gaz ? 0.78 * dMax : 900;
        devir += (h - devir) * Math.min(1, ADIM * (gaz ? 6 : 1.8));
      } else {
        // sanal şanzıman: devir vitese göre yükselir, azami devirde vites büyür
        if (kesik > 0) {
          kesik -= ADIM;
          devir += (devir * (VITESLER[vites - 1] / VITESLER[vites - 2]) - devir) * Math.min(1, ADIM * 30);
        } else if (gaz) {
          devir += (ADIM * 5200) / Math.pow(vites, 0.85);
          if (devir > 0.95 * dMax && vites < 5) {
            vites++;
            kesik = 0.12;
          }
        } else devir = Math.max(1100, devir - ADIM * 1400);
        hiz += ADIM * (gaz ? 14 / vites : -3);
      }
      s.hiz = hiz;
    } else {
      // sürüş: drift (asfalt), toprak, çarpma
      hiz = 22;
      gaz = 0.7 + 0.3 * Math.sin(t * 2.3);
      devir = 0.68 * dMax + 600 * Math.sin(t * 2.3);
      s.hiz = hiz;
      if (t > 1 && t < 6) {
        s.kayma = 0.9 + 0.3 * Math.sin(t * 3.1);
        s.savrulma = 1;
      } else if (t > 7 && t < 11) {
        s.zemin = [1, 0, 0, 0, 0, 0];
        s.gevsekKayma = 0.4 + 0.3 * Math.sin(t * 2);
      }
      if (Math.abs(t - 11.5) < ADIM / 2) SE.carp(t, 1);
      if (Math.abs(t - 12.7) < ADIM / 2) arayuzSesi.kombo(ctx, k.efekt, t, 3);
    }
    M.guncelle(t, ADIM, { devir, gaz, kesik: kesik > 0, hiz }, 1);
    SE.guncelle(t, s, 1);
  }
  return wav(await ctx.startRendering());
}
