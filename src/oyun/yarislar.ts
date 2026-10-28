// Yarışlar: yarış listesi (her pist bir yarış), başlatma, tur ve drift puanı, bitiş.
// Yarıştan önceki sürüş kurulumu ve araç EV.sv'de saklanır, yarıştan çıkınca geri yüklenir.
import { CARS, type YarisTuru } from "../arac/araclar";
import { fmt } from "../cekirdek/bicim";
import { gizle, goster, $ } from "../cekirdek/dom";
import { note } from "../arayuz/bildirim";
import { kontrolleriKur } from "../arayuz/kontroller";
import { sonucGoster } from "../arayuz/sonuc";
import { REG, SEHIR, type Tele } from "../dunya/bolgeler";
import {
  rotaNoktalari,
  sokakTurSayisi,
  sokakYildizlari,
  SOKAK_ROTALARI,
  type SokakTuru,
} from "../dunya/sehir-duzen";
import { ipucu, mkTrack, tp, type Pist } from "../dunya/pist";
import type { AdimSonucu } from "../fizik/tipler";
import type { OnayarAnahtari } from "../fizik/veriler";
import { setActive } from "./bolge";
import { carIndex, oyun, setCar } from "./durum";
import { girdiSifirla } from "./girdi";
import { MUTANT_REFERANS, MUTANT_REFERANS_YAGMUR } from "./mutant-denge";
import {
  mutantYarisAyari,
  mutantRakibi,
  mutantYarisKaynagi,
  mutantKapat,
  mutantKesme,
  mutantKurulumUygula,
  mutantPistKaynagi,
  mutantYarisBitti,
} from "./mutant";
import { aracAcikMi, pistAcikMi, yarisBitti } from "./ilerleme";
import { kariyereUygun, kariyerRekorAnahtari } from "./kariyer";
import { modifiyeUygula, takiliParcalar } from "./modifiye";
import { kurulumKaydet, kurulumYukle, yarisLastigiTak, type KurulumKaydi } from "./kurulum";
import { hayaletKaydet } from "./hayalet-kayit";
import { PROF, saveProf } from "./profil";
import { dunyaSorgusuYap, kayitKurulumu, kayitHavasi, reset, sim, yerel } from "./surus";
import { rekorHayaletiBaslat, rekorHayaletiDurdur } from "./uzak";
import { rakibiGecti, rakipBaslat, rakipDurdur } from "./rakip";
import { X6_CARPAN, X6_ORAN, driftAdimi, driftBankala, tersAdimi, type DriftOlay } from "./yaris-kurallari";
import { driftYarisProfili } from "../fizik/ortak";
import { sokakKapilariKur } from "../cizim/sokak-kapilari";
import {
  bosKesme,
  bosPistDisi,
  kesmeAdimi,
  pistDisiAdimi,
  type DonusNoktasi,
  type KesmeSayaci,
  type PistDisiSayaci,
} from "./piste-donus";
import { DRIFT_REKOR_ON_EKI, DRIFT_TUR, TUR_ANAHTARI, yildizEsikleri, yildizSay } from "./yildiz";

/** yarış türleri: hedef süre, pist uzunluğundan ve ilk pistlerin ayarlı hızından (v, m/s) hesaplanır */
export const TYP: Record<
  YarisTuru,
  { k: string; pk: OnayarAnahtari; laps?: number; v?: number; n: string; d: string }
> = {
  gp: {
    k: TUR_ANAHTARI.gp,
    pk: "ar",
    laps: 3,
    v: 35.3,
    n: "Asfalt yarışları",
    d: "3 tur. Fren tabelalarını kullan, hedef süreyi geç.",
  },
  rx: {
    k: TUR_ANAHTARI.rx,
    pk: "tr",
    laps: 3,
    v: 28.5,
    n: "Rallycross yarışları",
    d: "3 tur, asfalt ve toprak karışık: çamur, su ve rampalar. Hedef süreyi geç.",
  },
  dp: {
    // 0.7.4 drift bonus kuralı değişti: rekor ve hayalet yeni anahtarda (eski kural rekoru drift_<lv>'de kalır)
    k: DRIFT_REKOR_ON_EKI,
    pk: "dr",
    laps: DRIFT_TUR,
    n: "Drift yarışmaları",
    d:
      DRIFT_TUR +
      " turda hedef puanları topla. Drift uzadıkça çarpan x5’e çıkar; tamamen çime çıkmak, çarpmak ya da spin komboyu yakar. Drift ayarları otomatik gelir.",
  },
  rl: {
    k: TUR_ANAHTARI.rl,
    pk: "rl",
    v: 12.2,
    n: "Ralli etapları",
    d: "Orman yolunda A’dan B’ye. Hedef süreyi geç.",
  },
  dg: {
    k: TUR_ANAHTARI.dg,
    pk: "dg",
    n: "Drag yarışları",
    d: "Düz çizgide en kısa süre. Işıklar yeşile dönünce gaz. Kalkışta patinajı iyi ayarla.",
  },
};

export interface YarisTanimi {
  /** rekor anahtarı */
  k: string;
  ty: YarisTuru;
  /** pist numarası (türde benzersiz; rekor anahtarı `k`) */
  lv: number;
  /** zorluk seviyesi: 1 Çaylak … 6 Efsane (SEVIYELER) */
  sev: number;
  n: string;
  d: string;
  /** bölge sırası */
  reg: number;
  pk: OnayarAnahtari;
  laps?: number;
  /** hedef süre (sn); drift yarışında hedef puan (1★) */
  limit: number;
  /** yıldız eşikleri [1★, 2★, 3★]: süre ya da drift puanı */
  ys: number[];
  /** başlangıç noktası */
  g: Tele;
  /** LT-SYS-008 sokak yarışı (Kule Şehri): kendi rotası; bölgenin TR'si yarış başında buna kurulur */
  sokak?: SokakTuru;
  TR?: Pist;
}

export interface Yaris extends YarisTanimi {
  i: number;
  /** MUTANT etkinliği: kariyer ödülü, rekor, hayalet yok; koşu aracı ve koşu hedefi */
  mutant?: boolean;
  pistDisi: PistDisiSayaci;
  /** pist kesme algısı (LT-SYS-006) */
  kesme: KesmeSayaci;
  sv: KurulumKaydi & { car: number };
  TR: Pist;
  state: "count" | "run" | "done";
  /** Puan bütçesine uymayan araçla serbest deneme: kariyer ödülü/rekoru yok. */
  kariyer: boolean;
  /** geri sayım */
  cd: number;
  t: number;
  score: number;
  combo: number;
  /** kombo süresi, çarpan, kombo arası */
  ct: number;
  mult: number;
  gap: number;
  best: number;
  /** drift bonusu ve sayaçları (yaris-kurallari.ts) */
  bonus: number;
  uzunT: number;
  dirT: number;
  yanT: number;
  yan: number;
  /** verilen drift bonusları: hud okur ve kendi indeksini tutar */
  driftOlay: DriftOlay[];
  /** 1. turda drift hâlinde geçilen mesafe oranı (0-1, canlı); 1. tur bitince ≥ 0,9 ise x6 */
  driftOran: number;
  driftMesafe: number;
  x6: boolean;
  /** anlık çarpan (hud) */
  driftCarpan: number;
  armed: number;
  lap: number;
  lapStart: number;
  bestLap: number | null;
  prev: number;
  /** ters sürüş (hud "Geri dön" gösterir) ve histerezis sayacı */
  ters: boolean;
  tersT: number;
  /** bitişte alınan yıldız (0-3) */
  yildiz: number;
  /** bitişte kazanılan XP ve para (oyun/ilerleme.ts) */
  xp: number;
  para: number;
  /** drag bitiş hızı */
  trap?: number;
}

export const EVENTS: YarisTanimi[] = REG.filter((r) => r.t != "park").map((r, i) => {
  const ty = r.t as YarisTuru,
    y = TYP[ty],
    TR = r.TR!;
  return {
    // rekor anahtarı türe ve seviyeye bağlı (pistler 0.2'de yenilendi: eski rekorlar yeni pistlere taşınmaz)
    k: kariyerRekorAnahtari(y.k + "_" + r.lv),
    ty,
    lv: r.lv!,
    sev: r.sev ?? r.lv!,
    n: r.n,
    d: r.d!,
    reg: i,
    pk: y.pk,
    laps: y.laps,
    ys: yildizEsikleri(ty, r.lv!),
    limit: ty == "dp" ? r.hp || 0 : r.tg || (y.v ? Math.round((TR.len * (y.laps || 1)) / y.v / 5) * 5 : 0),
    g: tp(TR, r.n, ty == "dg" ? 1 : TR.open ? 4 : TR.N, TR.open ? 0 : 6),
  };
});

/**
 * LT-SYS-008 sokak yarışları (yalnız MUTANT, Kule Şehri): A→B kontrol noktalı (açık rota), blok turu ve kovalamaca
 * (kapalı rota, ~2,4 km). Kariyer listesine girmez: indeksleri EVENTS'ten sonra (TUM_ETKINLIKLER). Yıldız eşikleri
 * rakip YZ ölçümünden (sehir-duzen.ts sokakYildizlari; docs/denge/2026-10-28-mutant-sokak-olcum.md)
 */
export const SOKAK_ETKINLIKLERI: YarisTanimi[] = SOKAK_ROTALARI.map((r, n) => {
  const { pts, hw, acik } = rotaNoktalari(r),
    TR = mkTrack(pts, hw, acik),
    laps = sokakTurSayisi(r, TR.len) || undefined,
    ys = sokakYildizlari(r);
  return {
    k: "sokak_" + r.id,
    ty: acik ? "rl" : "gp",
    lv: 100 + n,
    sev: r.sev,
    n: r.n,
    d:
      r.tur == "ab"
        ? "Sokaklarda A'dan B'ye: rotayı izle, kestirme yok."
        : r.tur == "tur"
          ? "Blokların çevresinde " + (laps ?? 1) + " tur."
          : "Rakip önde kalkar: yakala, geç ve önde bitir.",
    reg: SEHIR.idx,
    pk: "ar",
    laps,
    ys,
    limit: ys[0],
    g: tp(TR, r.n, TR.open ? 4 : TR.N, TR.open ? 0 : 6),
    sokak: r.tur,
    TR,
  };
});
/** kariyer EVENTS + sokak yarışları (MUTANT ve startEvent bu indeksle) */
export const TUM_ETKINLIKLER: YarisTanimi[] = [...EVENTS, ...SOKAK_ETKINLIKLERI];

export const yaris = { EV: null as Yaris | null };

mutantYarisKaynagi(() => (yaris.EV ? { lap: yaris.EV.lap, ti: ipucu.ti, kurulu: !!yaris.EV.armed } : null));

mutantPistKaynagi(() =>
  TUM_ETKINLIKLER.map((e, i) => ({
    sokak: e.sokak,
    i,
    ty: e.ty,
    sev: e.sev,
    lv: e.lv,
    ys: e.ys,
    laps: e.laps,
    ref: MUTANT_REFERANS[e.ty + "_" + e.lv],
    refYagmur: MUTANT_REFERANS_YAGMUR[e.ty + "_" + e.lv],
  })),
);

/** yarışı başlat (ci: seçilen araç); pist ya da araç kilitliyse başlamaz (false). mutantEtkinligi: MUTANT koşusu
 *  içinden (kilit/kariyer yok, koşu aracı ve hedefi, ödül ve rekor koşuya) */
export function startEvent(i: number, ci?: number, mutantEtkinligi = false) {
  const e = TUM_ETKINLIKLER[i];
  if (!mutantEtkinligi) mutantKapat();
  if (!mutantEtkinligi && (!pistAcikMi(e.ty, e.lv) || !aracAcikMi(ci ?? carIndex()))) {
    note("Kilitli", 40);
    return false;
  }
  const uygun =
    !mutantEtkinligi && kariyereUygun(e.ty, e.lv, ci ?? carIndex(), takiliParcalar(ci ?? carIndex()));
  const EV = yaris.EV,
    sv = EV && EV.sv ? EV.sv : { ...kurulumKaydet(), car: carIndex() };
  // yarışta önayar seçilmez: aracın kendi önayarı ve oyuncunun yardım seviyesi yüklenir (önayar yalnız serbest
  // sürüşte). Böylece drift yarışı, otoparkta aynı araçla drift önayarında sürmekle birebir aynıdır.
  if (ci != null && CARS[ci] !== oyun.CAR) setCar(ci);
  // takılı parçalarıyla (paket ağır basıyorsa o türün önayarı); MUTANT'ta koşu aracı (atölye parçaları + pasifler)
  if (mutantEtkinligi) mutantKurulumUygula();
  else modifiyeUygula(carIndex());
  // MUTANT: koşu aracı kendi lastiğiyle yarışır (açık dünyayla aynı tutuş); kariyerde etkinlik bileşiği takılır
  if (!mutantEtkinligi) yarisLastigiTak(e.ty);
  if (!mutantEtkinligi) {
    const u = carIndex();
    PROF.use[u] = (PROF.use[u] || 0) + 1;
  }
  gizle("#res", "#set", "#menu", "#ts");
  // sokak yarışı: Kule Şehri bölgesinin pisti bu rotadır (mini harita, piste dönüş, tur sayacı)
  if (e.TR) REG[e.reg].TR = e.TR;
  sokakKapilariKur(e.sokak ? e.TR! : null);
  setActive(REG[e.reg]);
  girdiSifirla();
  reset(e.g[1], e.g[2], e.g[3]);
  document.getElementById("lvup")?.classList.remove("acik");
  oyun.mode = "drive";
  kontrolleriKur();
  goster("#hud", "#mm", "#ctl");
  yaris.EV = {
    ...e,
    k: mutantEtkinligi ? "mutant_" + e.k : uygun ? e.k : "deneme_" + e.k,
    kariyer: uygun,
    mutant: mutantEtkinligi,
    i,
    pistDisi: bosPistDisi(),
    kesme: bosKesme(),
    sv,
    TR: e.TR ?? REG[e.reg].TR!,
    state: "count",
    cd: 3,
    t: 0,
    score: 0,
    combo: 0,
    ct: 0,
    mult: 1,
    gap: 0,
    best: 0,
    bonus: 0,
    uzunT: 0,
    dirT: 0,
    yanT: 0,
    yan: 0,
    driftOlay: [],
    driftOran: 0,
    driftMesafe: 0,
    x6: false,
    driftCarpan: 1,
    armed: 0,
    lap: 0,
    lapStart: 0,
    bestLap: null,
    prev: ipucu.ti,
    ters: false,
    tersT: 0,
    yildiz: 0,
    xp: 0,
    para: 0,
    limit: e.limit || 0,
    ...(mutantEtkinligi ? mutantYarisAyari(i) : {}),
  };
  // MUTANT düellosu: oyuncunun yanına YZ rakip (yeniden başlatmada da aynı tohumla baştan)
  const r = mutantEtkinligi ? mutantRakibi() : null;
  if (r) rakipBaslat(yaris.EV, r);
  else rakipDurdur();
  if (!mutantEtkinligi) rekorHayaletiBaslat(e.k, dunyaSorgusuYap({ cur: null }));
  return true;
}

/** Aynı yarış, seçili araç ve takılı parçalarla sıfırdan geri sayım. */
export function yarisiYenidenBaslat() {
  if (!yaris.EV || (oyun.mode != "drive" && oyun.mode != "pause")) return false;
  return startEvent(yaris.EV.i, carIndex(), !!yaris.EV.mutant);
}

/** Yarış süresi/turlar/puan korunur; taşınan konum bir tur veya bitiş sayılmaz. */
export function yaristaPisteDon(p: DonusNoktasi) {
  const EV = yaris.EV;
  if (!EV) return;
  reset(p.x, p.z, p.h, false);
  // Yarışın yalnız son parçası rekor hayaleti diye kaydedilemez.
  yerel.kayit.kesik = true;
  EV.prev = ipucu.ti;
  EV.pistDisi = bosPistDisi();
  EV.kesme = bosKesme();
  EV.ters = false;
  EV.tersT = 0;
  driftAdimi(EV, false, 0, true, 0, false, 0);
  EV.driftCarpan = 1;
}

/** yarıştan çık: önceki araç ve kurulum geri gelir */
export function leaveEvent() {
  const EV = yaris.EV;
  if (!EV) return;
  const sv = EV.sv;
  if (CARS[sv.car] !== oyun.CAR) setCar(sv.car);
  kurulumYukle(sv);
  rekorHayaletiDurdur();
  rakipDurdur();
  // sokak rotası bölgede kalmasın: açık dünyada tur sayacı/ipucu eski rotaya bakmasın
  if (EV.TR && REG[EV.reg].t == "park") REG[EV.reg].TR = null;
  sokakKapilariKur(null);
  yaris.EV = null;
  goster("#ts");
  $("#ev").textContent = "";
}

/** drift komboyu puana çevir */
function bank(EV: Yaris) {
  const p = driftBankala(EV);
  if (p > 0) note("+" + p, 40);
}

/** yarış mantığı: her fizik adımından sonra */
export function evTick(dt: number, o: AdimSonucu, tg = 0.5) {
  const EV = yaris.EV!;
  if (EV.state != "run") return;
  const S = sim.S,
    D = sim.d.D,
    ti = ipucu.ti;
  EV.t += dt;
  // pist kesme: kısa yoldan piste dönünce ceza (MUTANT: atlanan mesafe / 10 gövde; hayalet fazı da korumaz)
  const kesme = kesmeAdimi(EV.kesme, EV.TR, S.x, S.z, ti);
  if (kesme > 0) {
    const h = EV.mutant ? mutantKesme(kesme) : 0;
    note("PİST KESME" + (h > 0 ? " · −" + Math.round(h) + " GÖVDE" : ""), 34);
  }
  const donus = pistDisiAdimi(EV.pistDisi, EV.TR, S.x, S.z, ti, dt);
  if (donus) {
    yaristaPisteDon(donus);
    note("PİSTE DÖNDÜN", 30);
    return;
  }
  if (EV.pistDisi.ilk) {
    // Pist dışında ilerleyerek tur/bitiş ya da drift puanı kazanılmaz.
    driftAdimi(EV, false, 0, true, 0, false, dt);
    EV.driftCarpan = 1;
    return;
  }
  const T = EV.TR.T[ti],
    geri = tersAdimi(EV, S.vx, S.vz, T[0], T[1], dt);
  if (EV.ty == "dp") {
    // kombo araç tamamen çime çıkınca yanar (tek teker ya da kerb yakmaz)
    const lost =
        o.cimTeker == 4 ||
        sim.d.zaman - S.hit < 0.05 ||
        Math.abs(D.beta) > driftYarisProfili(yerel.cx.kurulum).azami + 0.12,
      r = driftAdimi(EV, !!D.act, D.beta, lost, o.v, EV.ters || geri, dt, tg, sim.d.zaman, EV.x6);
    if (EV.lap == 0 && D.act && !lost && !EV.ters && !geri) {
      // orta çizgi ilerlemesi (pist uzunluğuyla aynı ölçü; dış çizgiden giden fazla yol sayılmaz)
      let ds = EV.TR.S[ti] - EV.TR.S[EV.prev];
      if (ds < -EV.TR.len / 2) ds += EV.TR.len;
      if (ds > 0) EV.driftMesafe += ds;
      EV.driftOran = Math.min(1, EV.driftMesafe / EV.TR.len);
    }
    EV.driftCarpan = EV.mult;
    if (r.olay == "yandi") note("KOMBO YANDI", 30);
    else if (r.olay == "carpan") note("x" + EV.mult, 44);
    else if (r.olay == "bank" && r.p > 0) note("+" + r.p, 40);
  }
  const N = EV.TR.N;
  if (EV.laps) {
    if (ti > N * 0.4 && ti < N * 0.6) EV.armed = 1;
    if (EV.prev > N * 0.8 && ti < N * 0.2 && EV.armed) {
      EV.armed = 0;
      EV.lap++;
      if (EV.ty == "dp" && EV.lap == 1 && EV.driftOran >= X6_ORAN) {
        EV.x6 = true;
        EV.driftCarpan = X6_CARPAN;
        EV.driftOlay.push({ ad: "ÇARPAN x6", puan: 0, t: sim.d.zaman });
        note("ÇARPAN x6", 44);
      }
      const lt = EV.t - EV.lapStart;
      EV.lapStart = EV.t;
      EV.bestLap = EV.bestLap == null ? lt : Math.min(EV.bestLap, lt);
      if (EV.lap >= EV.laps) {
        if (EV.ty == "dp") bank(EV);
        endEvent();
      } else note("Tur " + (EV.lap + 1) + "/" + EV.laps + " · " + fmt(lt), 30);
    }
    EV.prev = ti;
  } else {
    if (ti > N * 0.5) EV.armed = 1;
    if (EV.armed && ti >= N - (EV.ty == "dg" ? 1 : 4)) {
      EV.trap = Math.hypot(S.vx, S.vz) * 3.6;
      endEvent();
    }
  }
}

/** yarış bitti: profil, yıldız, rekor, sonuç ekranı */
export function endEvent() {
  const EV = yaris.EV;
  if (!EV || EV.state != "run" || !(EV.t > 0)) return;
  EV.state = "done";
  oyun.mode = "result";
  if (EV.mutant) {
    // MUTANT: kariyer ödülü, yıldız, rekor ve hayalet yok; sonuç koşuya
    girdiSifirla();
    gizle("#ctl");
    // düelloda hedef rakipten önce bitirmek; diğer etkinliklerde süre/puan hedefi, rakip varsa onu geçmek ek ödül
    const r = mutantRakibi(),
      hedef = EV.ty == "dp" ? EV.score > 0 && EV.score >= EV.limit : EV.t <= EV.limit;
    mutantYarisBitti(r?.duello ? rakibiGecti(EV.t) : hedef, r && !r.duello ? rakibiGecti(EV.t) : null);
    return;
  }
  PROF.races++;
  const sureSkor = EV.ty == "dp" ? EV.score : EV.t;
  EV.yildiz = yildizSay(EV.ty, sureSkor, EV.ys);
  hayaletKaydet(EV.k, carIndex(), sureSkor, yerel.kayit, EV.ty == "dp", kayitKurulumu, 0, kayitHavasi);
  rekorHayaletiDurdur();
  const odul = EV.kariyer ? yarisBitti(EV.ty, EV.lv, EV.yildiz) : { xp: 0, para: 0 };
  EV.xp = odul.xp;
  EV.para = odul.para;
  if (EV.kariyer && (EV.ty == "dp" ? EV.score > 0 && EV.score >= EV.limit : EV.t <= EV.limit)) PROF.wins++;
  saveProf();
  girdiSifirla();
  gizle("#ctl");
  sonucGoster(EV);
}
