// Görsel yön örneği: tüm değerler temsili; oyun kaydına veya servislere bağlanmaz.
const content = document.querySelector("main");
const dialog = document.querySelector("dialog");
const state = {
  route: "home",
  type: "Asfalt",
  track: 0,
  car: 0,
  settings: "Erişilebilirlik",
  history: [],
  motion: false,
  scale: "1",
  volumes: { Ana: 80, Motor: 90, Müzik: 45 },
  weather: "Açık",
  time: "Gündüz",
};
const names = {
  home: "ANA MENÜ",
  race: "YARIŞ / KARİYER",
  garage: "YARIŞ / GARAJ",
  store: "YARIŞ / MAĞAZA",
  preparation: "YARIŞ / HAZIRLIK",
  mutant: "MUTANT",
  profile: "PROFİL",
  settings: "AYARLAR",
};
const cars = ["Başlangıç aracı", "Ralli kurulumu", "Drift kurulumu"];
const tracks = {
  Asfalt: ["Yeşil Vadi", "Sahil Yolu", "Şehir Turu", "Gece Etabı"],
  Ralli: ["Orman Etabı", "Dağ Geçidi", "Toprak Etabı", "Son Etap"],
  Drift: ["İlk Viraj", "Şehir Kayışı", "Liman", "Zirve"],
  Drag: ["Kalkış", "Düzlük", "Sprint", "Final"],
  Rallikros: ["Çapraz Yol", "Karma Zemin", "Çamur Etabı", "Final"],
};
const trackName = () => tracks[state.type][state.track];
const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
const primary = (label, action, attrs = "") =>
  `<button class="primary" ${action.startsWith("route:") ? `data-route="${action.slice(6)}"` : `data-action="${action}"`} ${attrs}>${label}${arrow}</button>`;
const kv = (label, value) => `<div class="kv"><span>${label}</span><strong>${value}</strong></div>`;
const crumb = (label, parent = "home") =>
  `<div class="breadcrumb"><button data-route="${parent}">${parent === "home" ? "ANA MENÜ" : "YARIŞ"}</button><span>/</span>${label}</div>`;
const head = (tag, title, balance = true) =>
  `<div class="page-head"><div><span class="eyebrow">${tag}</span><h1>${title}</h1></div>${balance ? '<div class="balance">ÖRNEK BAKİYE<strong>24.850 <span>PARA</span></strong></div>' : ""}</div>`;
const tabs = () =>
  `<nav class="tabs" aria-label="Yarış bölümleri">${[
    ["race", "KARİYER"],
    ["garage", "GARAJ"],
    ["store", "MAĞAZA"],
  ]
    .map(
      ([key, label]) =>
        `<button data-route="${key}" ${state.route === key ? 'aria-current="page"' : ""}>${label}</button>`,
    )
    .join("")}</nav>`;
function map() {
  return `<div class="map"><span class="coordinates">${state.type.toLocaleUpperCase("tr")} / ${String(state.track + 1).padStart(2, "0")}</span><svg viewBox="0 0 500 250" aria-label="Pist çizimi; temsili rota" role="img"><path d="M108 177 C35 141 49 76 116 58 L290 42 Q371 34 399 89 Q427 143 352 152 L279 148 Q242 145 250 185 Q256 217 211 211 Z" fill="none" stroke="#060b0e" stroke-width="23"/><path d="M108 177 C35 141 49 76 116 58 L290 42 Q371 34 399 89 Q427 143 352 152 L279 148 Q242 145 250 185 Q256 217 211 211 Z" fill="none" stroke="#ff7a3c" stroke-width="7"/><path d="M129 174 l-8 20" stroke="#f4f0e8" stroke-width="9"/><circle cx="131" cy="151" r="5" fill="#f4f0e8"/><text x="148" y="156" fill="#bac0c5" font-size="13" font-family="Barlow">BAŞLANGIÇ</text></svg><span class="map-caption">TEMSİLİ PİST ÇİZİMİ</span></div>`;
}
function home() {
  const modes = [
    ["race", "01", "YARIŞ", "Kariyer / Garaj / Mağaza"],
    ["mutant", "02", "MUTANT", "Araç / Yetenek / Koşu"],
    ["profile", "03", "PROFİL", "Sürücü dosyası"],
    ["settings", "04", "AYARLAR", "Kontrol masası"],
  ];
  return `<section class="home home-pit fade-in" aria-label="Ana menü"><div class="pit-index"><div class="pit-index-head"><span>SÜRÜCÜ MERKEZİ</span><span>LT / 001</span></div><div class="mode-grid">${modes.map(([route, tag, title, sub], i) => `<button data-route="${route}" class="mode ${i === 0 ? "featured" : ""}"><span class="number">${tag}</span><span class="mode-copy"><strong>${title}</strong><small>${sub}</small></span><span class="mode-mark" aria-hidden="true">${i === 0 ? "➜" : "+"}</span></button>`).join("")}</div><div class="pit-dispatch"><span class="dispatch-label">PİSTE ÇIKIŞ</span>${primary("KARİYERE GİT", "route:race")}<p>Pistini seç. Hazırlığını yap.</p></div><div class="pit-stamp" aria-hidden="true"><span>LT</span><b>SON VİRAJA KADAR</b></div></div><div class="race-poster"><div class="poster-photo"></div><div class="poster-grid" aria-hidden="true"></div><div class="poster-topline"><span>LAST TURN / MOTORSPORLARI</span><span>01 — ASFALT</span></div><h1>LAST<br><span>TURN</span><i aria-hidden="true">.</i></h1><div class="start-tag" aria-hidden="true"><small>KALKIŞ</small><strong>01</strong><span>ÇIKIŞ / LT</span></div><div class="poster-bottom"><div class="poster-serial"><span class="barcode" aria-hidden="true"></span><span>LT—01 / SÜRÜŞ ARŞİVİ</span></div><div class="poster-caption"><strong>GECE VARDİYASI</strong><span>Asfalt. Farlar. Son bir tur.</span></div></div></div></section>`;
}
function race() {
  return `<section class="page fade-in">${crumb("YARIŞ")}${tabs()}${head("YARIŞ DOSYASI / 01", "KARİYER")}<div class="race-layout"><div><div class="filter-row" aria-label="Yarış türü">${Object.keys(
    tracks,
  )
    .map(
      (type) =>
        `<button class="filter" data-type="${type}" aria-pressed="${type === state.type}">${type}</button>`,
    )
    .join(
      "",
    )}</div><div class="track-list">${tracks[state.type].map((name, i) => `<button class="track" data-track="${i}" aria-pressed="${i === state.track}"><span class="index">0${i + 1}</span><span><strong>${name}</strong><small>${i === 3 ? "Örnek kilit koşulu: önceki etapta ilerle" : `${state.type} · ${i === 0 ? "Başlangıç" : "Sonraki etap"}`}</small></span><span class="track-state">${i === state.track ? "SEÇİLİ" : i === 3 ? "KİLİTLİ" : i === 0 ? "2 / 3 ★" : "AÇIK"}</span></button>`).join("")}</div><p class="empty-note">Pist adları, rota ve ilerleme bu örnekte temsilidir.</p></div><article class="detail">${map()}<div class="detail-info"><span class="eyebrow">${state.track === 3 ? "KİLİTLİ ETKİNLİK" : "KARİYER ETKİNLİĞİ"}</span><h2>${trackName()}</h2><p>${state.track === 3 ? "Önceki etapta ilerleyerek bu etkinliğin kilidini aç." : "Aracını ve koşullarını kontrol et. Hazır olduğunda piste çık."}</p><div class="stats"><div class="stat"><small>TÜR</small><strong>${state.type}</strong></div><div class="stat"><small>HEDEF</small><strong>${state.type === "Drift" ? "2.500 puan" : "1:05.000"}</strong></div><div class="stat"><small>EN İYİ</small><strong>${state.track === 0 ? "2 / 3 yıldız" : "Henüz yok"}</strong></div></div><div class="detail-action"><span>${state.track === 3 ? "Hazırlık şu anda kapalı" : "Örnek araç: kariyere uygun"}</span>${primary("YARIŞA HAZIRLAN", "route:preparation", state.track === 3 ? "disabled" : "")}</div></div></article></div></section>`;
}
function preparation() {
  return `<section class="page fade-in">${crumb("YARIŞ HAZIRLIĞI", "race")}${head("YARIŞ HAZIRLIĞI", trackName().toLocaleUpperCase("tr"))}<div class="split"><article class="detail">${map()}<div class="detail-info"><span class="eyebrow">PİST BİLGİSİ</span><h2>${state.type}</h2><p>Son kontrol sende. Araç değiştirip aynı hazırlığa dönebilirsin.</p></div></article><div class="panel"><h2>BAŞLANGIÇ DÜZENİ</h2>${kv("Araç", cars[state.car])}${kv("Katılım", "Kariyer · uygun araç örneği")}<div class="setting"><label for="time">Saat</label><select id="time"><option ${state.time === "Gündüz" ? "selected" : ""}>Gündüz</option><option ${state.time === "Gece" ? "selected" : ""}>Gece</option></select></div><div class="setting"><label for="weather">Hava</label><select id="weather">${["Açık", "Yağmur", "Kar"].map((x) => `<option ${state.weather === x ? "selected" : ""}>${x}</option>`).join("")}</select></div><p class="empty-note">Seçimler yalnız bu tasarım örneğinde tutulur.</p><div class="actions"><button class="quiet" data-action="change-car">ARAÇ DEĞİŞTİR</button>${primary("PİSTE ÇIK", "start-race")}</div></div></div></section>`;
}
function garage() {
  return `<section class="page fade-in">${crumb("GARAJ", "race")}${tabs()}${head("SERVİS ALANI / 02", "GARAJ")}<div class="split"><div><div class="visual"><div class="visual-caption"><span class="eyebrow">OYUNDAN GÖRÜNTÜ / TEMSİLİ ARAÇ</span><h2>${cars[state.car].toLocaleUpperCase("tr")}</h2><p>Görsel seçimle değişmez; Unity'de seçili araç sahnesi kullanılacak.</p></div></div><div class="car-options">${cars.map((car, i) => `<button class="car-option" data-car="${i}" aria-pressed="${i === state.car}"><small>${i === state.car ? "SEÇİLİ" : "ÖRNEK KURULUM"}</small><strong>${car}</strong></button>`).join("")}</div></div><div class="panel"><span class="eyebrow">ARAÇ ÖZETİ</span><h2>${cars[state.car].toLocaleUpperCase("tr")}</h2><p>Seçili aracını incele. Parçalarını düzenle veya yarış hazırlığına dön.</p>${kv("Kullanım", "Kariyer")}${kv("Sınıf / puan", "D / 200 · temsili")}${kv("Durum", "Kullanıma hazır")}${["Güç", "Tutuş", "Kontrol"].map((x, i) => `<div class="kv"><span>${x}</span><strong>${[45, 62, 78][(i + state.car) % 3]} / 100 <span>· temsili</span></strong></div>`).join("")}<div class="actions">${primary(state.history.at(-1)?.route === "preparation" ? "HAZIRLIĞA DÖN" : "KARİYERE GİT", "garage-done")}<button class="quiet" data-action="modify">MODİFİYE</button></div></div></div></section>`;
}
function store() {
  return `<section class="page fade-in">${crumb("MAĞAZA", "race")}${tabs()}${head("TEDARİK / 03", "MAĞAZA")}<div class="catalog">${[
    ["01", "ARAÇLAR", "Yeni bir başlangıç. Farklı sürüş karakterleriyle tanış.", "Araç kataloğu"],
    ["02", "PARÇALAR", "Motor, lastik ve diğer geliştirmeleri karşılaştır.", "Parça kataloğu"],
    ["03", "KARŞILAŞTIR", "Önce kazanımı gör. Sonra kararını ver.", "Karşılaştırma"],
  ]
    .map(
      ([n, name, copy, action]) =>
        `<article class="panel"><span class="part-index">${n}</span><h2>${name}</h2><p>${copy}</p>${primary(action.toLocaleUpperCase("tr"), "catalog")}</article>`,
    )
    .join(
      "",
    )}</div><p class="empty-note">Bu yüzey katalog düzenini gösterir. Gerçek satın alma veya bakiye işlemi yapmaz.</p></section>`;
}
function mutant() {
  return `<section class="page mutant-page fade-in">${crumb("MUTANT")}<div class="split"><div class="mutant-copy"><span class="eyebrow">KOŞU DOSYASI / M</span><h1>MUTANT<br><em>KOŞUSU</em></h1><p>Aracını seç. Yeteneklerini bir araya getir. Süre dolmadan boss'a meydan oku.</p>${primary("YENİ KOŞU", "new-run")}<div class="actions"><button class="quiet" data-action="mutant-help">NASIL OYNANIR?</button></div></div><div><div class="panel"><span class="eyebrow">KOŞU REKORUN</span><h2>HENÜZ KOŞU YOK.</h2><p>Tamamladığın koşunun sonucu burada yer alacak.</p>${kv("Kariyer ilerlemen", "Ayrı tutulur")}${kv("Araç ve yetenek", "Koşu başında seçilir")}</div><div class="steps"><div class="step"><b>01</b><div><strong>BAŞLANGICINI SEÇ</strong><small>Araç ve başlangıç yeteneği.</small></div></div><div class="step"><b>02</b><div><strong>KOŞUNU KUR</strong><small>Etkinlikler, atölye ve sandıklar.</small></div></div><div class="step"><b>03</b><div><strong>BOSS'A MEYDAN OKU</strong><small>Süren dolmadan hazır ol.</small></div></div></div></div></div></section>`;
}
function profile() {
  return `<section class="page fade-in">${crumb("PROFİL")}${head("KAYIT / 04", "SÜRÜCÜ DOSYASI", false)}<div class="split"><div class="panel"><span class="eyebrow">ÖRNEK SÜRÜCÜ</span><h2>CEM <span style="color:var(--accent)">/ 08</span></h2><p>Seviye 8 · 1.250 / 2.000 XP</p><div class="bar"><i style="width:62.5%"></i></div><div class="profile-summary"><div><strong>24</strong><small>Yarış</small></div><div><strong>11</strong><small>Galibiyet</small></div><div><strong>32</strong><small>Yıldız</small></div></div>${kv("Sürüş mesafesi", "146 km")}${kv("Favori araç", "Başlangıç aracı")}<p class="empty-note">Bu rakamlar tasarım içindir; mevcut oyuncu kaydından okunmaz.</p></div><div class="panel"><span class="eyebrow">HESAP</span><h2>HESAP BAĞLANTISI</h2><p>Profil, kayıt ve hesap durumu aynı yerde. Eşitleme durumu metinle açıklanır.</p>${kv("Bu örnekte", "Hesap bağlantısı yok")}<div class="actions"><button class="quiet" data-action="account">HESAP SEÇENEKLERİ</button></div><p class="empty-note">Bu örnek hesap açmaz, e-posta göndermez ve buluta bağlanmaz.</p></div></div></section>`;
}
function settingSelect(id, label, help, options, value) {
  return `<div class="setting"><div><label for="${id}">${label}</label><small id="${id}-help">${help}</small></div><select id="${id}" aria-describedby="${id}-help">${options.map(([v, t]) => `<option value="${v}" ${String(v) === String(value) ? "selected" : ""}>${t}</option>`).join("")}</select></div>`;
}
function settings() {
  let body;
  if (state.settings === "Erişilebilirlik")
    body =
      settingSelect(
        "motion",
        "Hareketi azalt",
        "Ekran giriş animasyonlarını kapatır. Sistem tercihi de uygulanır.",
        [
          ["false", "Standart"],
          ["true", "Azaltılmış"],
        ],
        state.motion,
      ) +
      settingSelect(
        "scale",
        "Metin boyutu",
        "Okuma metinlerini ve denetim etiketlerini büyütür.",
        [
          ["1", "Standart"],
          ["1.15", "Büyük (%115)"],
        ],
        state.scale,
      ) +
      kv("Seçim göstergesi", "Çerçeve + metin + renk") +
      kv("Klavye odağı", "Yüksek kontrastlı dış çizgi");
  else if (state.settings === "Ses")
    body = Object.entries(state.volumes)
      .map(
        ([name, value]) =>
          `<div class="setting"><div><label for="volume-${name}">${name} sesi</label><small>Yalnız örnek değer; oyun sesini değiştirmez.</small></div><div class="range-wrap"><input type="range" id="volume-${name}" data-volume="${name}" min="0" max="100" step="5" value="${value}"><output for="volume-${name}">${value}%</output></div></div>`,
      )
      .join("");
  else
    body =
      kv("Tab / Shift + Tab", "İleri / geri odak") +
      kv("Yön tuşları", "Aynı grupta seçim odağı") +
      kv("Enter / Boşluk", "Odaktaki işlemi seç") +
      kv("Escape", "Pencereyi kapat / önceki ekrana dön") +
      '<p class="empty-note">Bu örnek fare ve klavye içindir. Oyun kumandası desteği uygulanmış değildir.</p>';
  return `<section class="page fade-in">${crumb("AYARLAR")}${head("KONTROL MASASI / 05", "AYARLAR", false)}<div class="settings-layout"><div class="settings-nav" aria-label="Ayar bölümleri">${["Erişilebilirlik", "Ses", "Kontroller"].map((x) => `<button data-settings="${x}" aria-pressed="${state.settings === x}">${x}</button>`).join("")}</div><section class="panel"><h2>${state.settings.toLocaleUpperCase("tr")}</h2>${body}<p class="empty-note">Değişiklikler bu örnek açık kaldığı sürece korunur; oyun ayarlarına yazılmaz.</p></section></div></section>`;
}
const screens = { home, race, preparation, garage, store, mutant, profile, settings };
function render(focus = true) {
  content.innerHTML = screens[state.route]();
  content.setAttribute("aria-label", names[state.route]);
  document.title = "Last Turn — " + names[state.route];
  document.querySelector("#location").textContent = names[state.route];
  document.querySelector("#context-hints").innerHTML = ["race", "garage", "store"].includes(state.route)
    ? "<kbd>Q / E</kbd> Bölüm"
    : state.route === "mutant"
      ? "<kbd>H</kbd> Nasıl oynanır"
      : state.route === "home"
        ? "<kbd>← →</kbd> Kart odağı"
        : "";
  document.querySelectorAll(".topbar [data-route]").forEach((el) => {
    const current =
      el.dataset.route === state.route ||
      (el.dataset.route === "race" && ["garage", "store", "preparation"].includes(state.route));
    if (current) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  document.querySelector("#back").hidden = state.route === "home";
  if (focus) {
    content.focus();
    window.scrollTo(0, 0);
  }
}
function go(route) {
  if (!screens[route] || route === state.route) return;
  const previous = { route: state.route, focus: document.activeElement?.getAttribute("data-route") };
  // Menü kökü ve kardeş sekmeler gezinme geçmişini şişirmez.
  if (route === "home") state.history = [];
  else if (["race", "mutant"].includes(route)) state.history = [{ route: "home", focus: route }];
  else if (["garage", "store"].includes(route) && state.route !== "preparation")
    state.history = [
      { route: "home", focus: "race" },
      { route: "race", focus: route },
    ];
  else state.history.push(previous);
  state.route = route;
  render();
}
function back() {
  const last = state.history.pop();
  if (!last) {
    state.route = "home";
    render();
    return;
  }
  state.route = last.route;
  render();
  if (last.focus) content.querySelector(`[data-route="${last.focus}"]`)?.focus();
}
let toastTimer;
function toast(text) {
  const node = document.querySelector("#toast");
  node.textContent = text;
  node.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("visible"), 4500);
}
let onConfirm;
function modal(title, copy, confirm = "ANLADIM", callback = null) {
  document.querySelector("#dialog-title").textContent = title;
  document.querySelector("#dialog-copy").textContent = copy;
  document.querySelector("#dialog-confirm").textContent = confirm;
  onConfirm = callback;
  dialog.returnValue = "";
  dialog.showModal();
}
dialog.addEventListener("close", () => {
  const callback = onConfirm;
  onConfirm = null;
  if (dialog.returnValue === "confirm") callback?.();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.dataset.route) go(button.dataset.route);
  if (button.dataset.type) {
    state.type = button.dataset.type;
    state.track = 0;
    render(false);
    content.querySelector(`[data-type="${state.type}"]`).focus();
  }
  if (button.dataset.track) {
    state.track = Number(button.dataset.track);
    render(false);
    content.querySelector(`[data-track="${state.track}"]`).focus();
  }
  if (button.dataset.car) {
    state.car = Number(button.dataset.car);
    render(false);
    content.querySelector(`[data-car="${state.car}"]`).focus();
  }
  if (button.dataset.settings) {
    state.settings = button.dataset.settings;
    render(false);
    content.querySelector(`[data-settings="${state.settings}"]`).focus();
  }
  switch (button.dataset.action) {
    case "change-car":
      go("garage");
      break;
    case "garage-done":
      if (state.history.at(-1)?.route === "preparation") back();
      else go("race");
      break;
    case "start-race":
      modal(
        "PİSTE ÇIKMAYA HAZIRSIN.",
        `${trackName()} · ${cars[state.car]} · ${state.time} · ${state.weather}. Bu tasarım örneği yarış başlatmaz. Unity entegrasyonunda mevcut yarış komutu çalıştırılacak.`,
      );
      break;
    case "new-run":
      modal(
        "YENİ KOŞU BAŞLASIN MI?",
        "Gerçek oyunda önce araç, sonra başlangıç yeteneği seçilir. Boss süresi sürüşte başlar. Bu örnek koşu başlatmaz ve kaydını değiştirmez.",
        "AKIŞI İNCELEDİM",
        () => toast("Koşu başlangıç akışı gösterildi. Oyun kaydı değiştirilmedi."),
      );
      break;
    case "mutant-help":
      modal(
        "HER KOŞU BİR YENİDEN BAŞLANGIÇ.",
        "1. Araç ve başlangıç yeteneğini seç. 2. Etkinlikler, atölye ve sandıklarla koşunu geliştir. 3. Süre dolmadan boss'a meydan oku. Koşu para ve parçaları kariyerden ayrıdır.",
      );
      break;
    case "modify":
      modal(
        "MODİFİYE / PARÇA DÜZENİ",
        "Unity'deki mevcut Modifiye ekranı bu noktadan açılacak. Bu örnekte parça takma, satın alma veya performans hesaplama yapılmıyor.",
      );
      break;
    case "catalog":
      modal(
        "KATALOG YÜZEYİ",
        "Araçlar ve parçalar mevcut katalog görünüm modellerinden bağlanacak. Sahiplik, fiyat, kilit nedeni ve satın alma onayı birlikte gösterilecek; bu örnekte satın alma yok.",
      );
      break;
    case "account":
      modal(
        "HESAP SEÇENEKLERİ",
        "Unity'deki mevcut giriş, kayıt ve eşitleme işlemleri burada yer alacak. Bu örnek herhangi bir hesap hizmetine bağlanmaz.",
      );
      break;
  }
  if (button.id === "back") back();
  if (button.id === "about")
    modal(
      "GEZİLEBİLİR TASARIM ÖRNEĞİ",
      "Last Turn için yeni menü yönü. Görseller oyunun mevcut tasarım kaynaklarından, yazılar yerel Barlow ailesinden gelir. Veriler ve pist çizimleri temsilidir. Yarış, satın alma ve hesap işlemleri çalışmaz. Tab, yön tuşları, Enter ve Esc ile gezebilirsin.",
    );
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.id === "motion") {
    state.motion = el.value === "true";
    document.documentElement.dataset.reduced = String(state.motion);
  }
  if (el.id === "scale") {
    state.scale = el.value;
    document.documentElement.dataset.large = String(el.value !== "1");
    document.documentElement.style.setProperty("--font-scale", state.scale);
  }
  if (el.id === "weather") state.weather = el.value;
  if (el.id === "time") state.time = el.value;
});
document.addEventListener("input", (event) => {
  if (!event.target.dataset.volume) return;
  state.volumes[event.target.dataset.volume] = Number(event.target.value);
  event.target.nextElementSibling.textContent = event.target.value + "%";
});
document.addEventListener("keydown", (event) => {
  if (dialog.open) return;
  if (event.key === "Escape") {
    event.preventDefault();
    back();
    return;
  }
  if (["SELECT", "INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  if (["race", "garage", "store"].includes(state.route) && ["q", "e"].includes(key)) {
    const routes = ["race", "garage", "store"];
    const next = (routes.indexOf(state.route) + (key === "q" ? 2 : 1)) % routes.length;
    event.preventDefault();
    go(routes[next]);
    return;
  }
  if (state.route === "mutant" && key === "h") {
    event.preventDefault();
    const help = content.querySelector('[data-action="mutant-help"]');
    help.focus();
    help.click();
    return;
  }
  const groups = [".mode-grid", ".filter-row", ".track-list", ".car-options", ".tabs", ".settings-nav"];
  const group = groups.map((selector) => document.activeElement.closest(selector)).find(Boolean);
  if (group && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    const buttons = [...group.querySelectorAll("button:not([disabled])")];
    const delta = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1;
    const next = (buttons.indexOf(document.activeElement) + delta + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next].focus();
  }
});
render(false);
