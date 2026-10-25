// Ayarlar ekranı: menüde ve duraklatma ekranında aynı içerik (katlanır bölümler)
import { $ } from "../cekirdek/dom";
import {
  AST,
  LEVELS,
  PRESETS,
  TIRES,
  TUNE,
  type AyarSatiri,
  type OnayarAnahtari,
  type SeviyeAnahtari,
} from "../fizik/veriler";
import {
  ayarlariKaydet,
  CT,
  HUDLAR,
  hudDuzeni,
  set,
  TOG,
  type DireksiyonModu,
  type GazModu,
  type HudDuzeni,
} from "../oyun/ayarlar";
import { CAMS, oyun } from "../oyun/durum";
import { askTilt, girdiSifirla } from "../oyun/girdi";
import { applyPreset, kurulum } from "../oyun/kurulum";
import { reset } from "../oyun/surus";
import { yaris, yarisiYenidenBaslat } from "../oyun/yarislar";
import { note } from "./bildirim";
import { hudDuzenleyiciAc } from "./hud-duzenleyici";
import { kontrolleriKur } from "./kontroller";
import { showMenu } from "./menu";
import { performansGoster } from "../cekirdek/performans";

const STEER: Record<DireksiyonModu, { n: string; d: string }> = {
  btn: { n: "Tuşlar", d: "Sağ ve sol tuşları" },
  wheel: { n: "Direksiyon", d: "Ekrandaki direksiyonu çevir" },
  tilt: { n: "Telefonu çevir", d: "Telefonu direksiyon gibi yatır" },
};
const GASM: Record<GazModu, { n: string; d: string }> = {
  btn: { n: "Gaz tuşu", d: "Basınca tam gaz" },
  analog: {
    n: "Analog pedal",
    d: "Ortası boş: yukarı kaydır gaz, aşağı kaydır fren. Kalkışta tam gaz patinaj yapar",
  },
  auto: { n: "Otomatik gaz", d: "Araç kendi hızlanır, sen frenle" },
};
const CAMO = {
  0: { n: "Takip", d: "Arkadan" },
  1: { n: "Uzak takip", d: "Geniş görüş" },
  2: { n: "Kaput", d: "Kaputun üstünden" },
  3: { n: "Kokpit", d: "Şoför gözünden" },
};

/** açık bölümler (yeniden çizimde açık kalsın) */
const OPEN = new Set<string>();

export const sec = (k: string, t: string, body: string) =>
  `<details data-sec="${k}"${OPEN.has(k) ? " open" : ""}><summary>${t}</summary>${body}</details>`;

export const chipsOf = (obj: Record<string, { n: string; d: string }>, cur: string | number, attr: string) =>
  '<div class="chips" style="flex-wrap:wrap">' +
  Object.entries(obj)
    .map(
      ([k, m]) =>
        `<div class="chip ${cur == k ? "sel" : ""}" data-${attr}="${k}" style="flex:1 1 40%">${m.n}<small>${m.d}</small></div>`,
    )
    .join("") +
  "</div>";

const ctlHTML = () =>
  sec(
    "ctl",
    "Kontroller",
    '<div class="lbl">Direksiyon</div>' +
      chipsOf(STEER, CT.steer, "cs") +
      '<div class="lbl">Gaz</div>' +
      chipsOf(GASM, CT.gas, "cg") +
      (CT.steer == "tilt"
        ? `<div class="row" style="display:block"><div>Çevirme açısı <span id="v_tlt">${set.tlt}°</span><small>Tam direksiyon için telefonu ne kadar yatırman gerekir. Büyük değer daha az hassas.</small></div><input type="range" id="tlt" min="20" max="60" step="1" value="${set.tlt}"></div>`
        : "") +
      "<p>Telefonu çevirme: sürüşte sol alttaki tuşa basıp sensör izni ver, sonra telefonu nasıl tutacaksan öyle tutup “Ortala”ya bas. Telefonu direksiyon gibi sağa yatırınca sağa döner.</p>",
  );

/** ses seviyeleri: oyun sesleri ve menü müziği */
const SESLER: [keyof typeof set, string, string][] = [
  ["ses", "Oyun sesleri", "Motor, lastik, çarpma, menü tıkları"],
  ["muz", "Müzik", "Menüde ve garajda çalan müzik"],
];
const sesHTML = () =>
  sec(
    "ses",
    "Ses",
    SESLER.map(
      ([k, n, d]) =>
        `<div class="row" style="display:block"><div>${n} <span id="v_${k}">%${set[k]}</span><small>${d}</small></div><input type="range" data-ses="${k}" min="0" max="100" step="5" value="${set[k]}"></div>`,
    ).join("") + "<p>Ses ilk dokunuşta açılır. iPhone sessiz moddaysa (yandaki düğme) oyun sesi gelmez.</p>",
  );

const sliders = (D: AyarSatiri[], O: Record<string, number>, o: string) =>
  D.map(
    (t) =>
      `<div class="row" style="display:block"><div>${t[1]} <span id="v_${o}${t[0]}">${(+O[t[0]]).toFixed(2)}</span>${t[2] ? "<small>" + t[2] + "</small>" : ""}</div><input type="range" data-o="${o}" data-s="${t[0]}" min="${t[3]}" max="${t[4]}" step="${t[5]}" value="${O[t[0]]}"></div>`,
  ).join("");

const kaydet = () => ayarlariKaydet(oyun.camMode, kurulum.lk);

/** önayar yalnız serbest sürüşte (duraklatma menüsünde) seçilir; yarışta aracın kendi önayarı kullanılır */
const serbestSurus = () => !yaris.EV && (oyun.mode == "pause" || oyun.mode == "drive");

export const settingsHTML = () =>
  (serbestSurus()
    ? sec(
        "pre",
        "Önayar: " + (kurulum.custom ? "Özel" : PRESETS[kurulum.pk].n),
        chipsOf(PRESETS, kurulum.pk, "pk"),
      )
    : "") +
  sec("lvl", "Sürüş yardımı: " + LEVELS[kurulum.lk].n, chipsOf(LEVELS, kurulum.lk, "lk")) +
  sec("cam", "Kamera: " + CAMS[oyun.camMode], chipsOf(CAMO, oyun.camMode, "cm")) +
  ctlHTML() +
  sesHTML() +
  `<div class="card hdAc" data-hdac><b>Göstergeler (HUD)</b><span>${hudDuzeni() == "ozel" ? "Özel" : HUDLAR[hudDuzeni() as HudDuzeni].n} · hız, sayaç, tuşlar ve harita; önizlemeli</span></div>` +
  (serbestSurus()
    ? sec(
        "tir",
        "Lastik: " + TIRES[kurulum.tire].n,
        '<div class="chips" style="flex-wrap:wrap">' +
          TIRES.map(
            (t, i) =>
              `<div class="chip ${kurulum.tire == i ? "sel" : ""}" data-t="${i}" style="flex:1 1 40%">${t.n}<small>${t.d}</small></div>`,
          ).join("") +
          "</div>",
      )
    : "") +
  sec(
    "mek",
    "Mekanikler",
    TOG.map(
      (t) =>
        `<div class="row" data-k="${t[0]}"><div>${t[1]}<small>${t[2]}</small></div><i class="${set[t[0]] ? "on" : ""}">${set[t[0]] ? "Açık" : "Kapalı"}</i></div>`,
    ).join(""),
  ) +
  sec("tun", "Araç ayarları", sliders(TUNE, kurulum.tu, "tu")) +
  sec("ast", "Sürüş yardımları (ayrıntılı)", sliders(AST, kurulum.as, "as"));

function bindAll(root: HTMLElement, re: () => void) {
  const tl = root.querySelector<HTMLInputElement>("#tlt");
  if (tl)
    tl.oninput = () => {
      set.tlt = +tl.value;
      root.querySelector("#v_tlt")!.textContent = set.tlt + "°";
      kaydet();
    };
  root.querySelectorAll<HTMLInputElement>("input[data-ses]").forEach((e) => {
    const k = e.dataset.ses as keyof typeof set;
    e.oninput = () => {
      set[k] = +e.value;
      root.querySelector("#v_" + k)!.textContent = "%" + set[k];
    };
    e.onchange = kaydet;
  });
  root.querySelectorAll<HTMLDetailsElement>("details").forEach((d) =>
    d.addEventListener("toggle", () => {
      if (d.open) OPEN.add(d.dataset.sec!);
      else OPEN.delete(d.dataset.sec!);
    }),
  );
  const tikla = (sel: string, f: (e: HTMLElement) => void) =>
    root.querySelectorAll<HTMLElement>(sel).forEach(
      (e) =>
        (e.onclick = () => {
          f(e);
          kaydet();
          re();
        }),
    );
  tikla(".chip[data-pk]", (e) => {
    kurulum.pk = e.dataset.pk as OnayarAnahtari;
    applyPreset();
  });
  tikla(".chip[data-lk]", (e) => {
    kurulum.lk = e.dataset.lk as SeviyeAnahtari;
    applyPreset();
  });
  tikla(".chip[data-cs]", (e) => {
    CT.steer = e.dataset.cs as DireksiyonModu;
    if (CT.steer == "tilt") askTilt();
    kontrolleriKur();
  });
  tikla(".chip[data-cg]", (e) => {
    CT.gas = e.dataset.cg as GazModu;
    kontrolleriKur();
  });
  root.querySelectorAll<HTMLElement>("[data-hdac]").forEach((e) => (e.onclick = hudDuzenleyiciAc));
  tikla(".chip[data-cm]", (e) => {
    oyun.camMode = +e.dataset.cm!;
  });
}

export function bindSettings(s: HTMLElement, re: () => void) {
  bindAll(s, re);
  s.querySelectorAll<HTMLElement>(".chip[data-t]").forEach(
    (e) =>
      (e.onclick = () => {
        if (!serbestSurus()) return;
        kurulum.tire = +e.dataset.t!;
        kurulum.custom = true;
        re();
      }),
  );
  s.querySelectorAll<HTMLElement>(".row[data-k]").forEach(
    (r) =>
      (r.onclick = () => {
        const k = r.dataset.k as keyof typeof set;
        set[k] ^= 1;
        if (k == "perf") performansGoster(!!set.perf);
        kaydet();
        re();
      }),
  );
  s.querySelectorAll<HTMLInputElement>("input[data-o]").forEach(
    (e) =>
      (e.oninput = () => {
        (e.dataset.o == "tu" ? kurulum.tu : kurulum.as)[e.dataset.s!] = +e.value;
        s.querySelector("#v_" + e.dataset.o + e.dataset.s)!.textContent = (+e.value).toFixed(2);
        kurulum.custom = true;
      }),
  );
}

/** duraklatmadan sürüşe dön */
export function resume() {
  $("#set").classList.add("hidden");
  if (oyun.mode == "pause") {
    oyun.mode = "drive";
    kontrolleriKur();
    $("#ctl").classList.remove("hidden");
  }
}

/** duraklatma ekranı: ayarlar ve (serbest sürüşte) ışınlanma */
export function showSet() {
  const s = $("#set");
  s.classList.remove("hidden");
  if (oyun.mode == "drive") {
    oyun.mode = "pause";
    girdiSifirla();
    $("#ctl").classList.add("hidden");
  }
  s.innerHTML =
    `<div class="bar"><button class="btn" id="cl">Sürüşe dön</button>${yaris.EV ? '<button class="btn" id="restart">Yeniden başlat</button>' : ""}<button class="btn alt" id="mn">Ana menü</button></div><p style="margin:0 0 4px">Oyun duraklatıldı.</p>` +
    settingsHTML() +
    (yaris.EV
      ? ""
      : sec(
          "tp",
          "Işınlan",
          '<div class="chips" style="flex-wrap:wrap">' +
            oyun.CURW.tele
              .map((t, i) => `<div class="chip" data-p="${i}" style="flex:1 1 40%">${t[0]}</div>`)
              .join("") +
            "</div>",
        ));
  bindSettings(s, showSet);
  s.querySelectorAll<HTMLElement>(".chip[data-p]").forEach(
    (e) =>
      (e.onclick = () => {
        const p = oyun.CURW.tele[+e.dataset.p!];
        reset(p[1], p[2], p[3]);
        resume();
      }),
  );
  const restart = s.querySelector<HTMLElement>("#restart");
  if (restart) restart.onclick = yarisiYenidenBaslat;
  $("#cl").onclick = resume;
  $("#mn").onclick = () => {
    s.classList.add("hidden");
    showMenu(["home"]);
  };
}

/** sürüş sırasında lastik değiştir (🛞 tuşu) */
export function lastikDegistir() {
  if (!serbestSurus()) return;
  kurulum.tire = (kurulum.tire + 1) % TIRES.length;
  kurulum.custom = true;
  note(TIRES[kurulum.tire].n + " lastik", 30);
}
