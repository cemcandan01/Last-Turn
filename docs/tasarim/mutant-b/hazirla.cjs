(async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const root = path.resolve(__dirname, "../../..");
  const catalog = JSON.parse(
    fs.readFileSync(path.join(root, "Unity/Assets/LastTurn/Resources/mutant-catalog.json"), "utf8"),
  );
  const selected = ["guc", "hafif", "zirh", "tamirci", "adrenalin", "sert-nitro"];
  const categories = [...new Set(catalog.parts.map((p) => p.kat))];
  const names = [
    "Motor",
    "Turbo",
    "Şanzıman",
    "Lastik",
    "Süspansiyon",
    "Diferansiyel",
    "Fren",
    "Ağırlık",
    "Aerodinamik",
    "Çekiş",
    "Direksiyon",
    "Koruma",
  ];
  const groups = {
    boss: catalog.bosses,
    skill: catalog.skills,
    parca: categories.map((id, i) => ({ id, ad: names[i] })),
    pasif: selected.map((id) => catalog.passives.find((p) => p.id === id)),
  };
  for (const dir of ["b", "c"]) {
    const base = path.join(root, "docs/tasarim/mutant-" + dir);
    fs.mkdirSync(path.join(base, "yazi"), { recursive: true });
    for (const file of [
      "Barlow-Regular.ttf",
      "BarlowCondensed-SemiBold.ttf",
      "BarlowCondensed-ExtraBoldItalic.ttf",
    ])
      fs.copyFileSync(
        path.join(root, "Unity/Assets/LastTurn/Resources/UI/Fonts", file),
        path.join(base, "yazi", file),
      );
    fs.writeFileSync(
      path.join(base, "manifest.json"),
      JSON.stringify(
        {
          yon: dir.toUpperCase(),
          gruplar: groups,
          dokular: {
            cerceve: { dosya: "dokular/cerceve.png", dilimOrani: 0.25 },
            parlama: { dosya: "dokular/parlama.png", dilimOrani: 0.25 },
          },
          not: "Dilimler kaynak boyutunun dörtte biridir; gerçek RGBA boyutları dogrulama.json içinde.",
        },
        null,
        2,
      ),
    );
  }
  const image = (dir, group, id, cls = "") =>
    `<img class="${cls}" src="mutant-${dir}/ikonlar/${group}/${id}.png" alt="${groups[group].find((x) => x.id === id).ad}" loading="eager">`;
  const hints =
    '<div class="hints"><span><kbd>Oklar</kbd> Odak</span><span><kbd>Enter</kbd> Onay</span><span><kbd>Esc</kbd> Duraklat</span></div>';
  function frame(dir, kind) {
    const top = `<div class="top"><b class="brand">MUTANT</b><span>${kind === "hud" ? "SÜRÜŞ" : "BÖLGE 1"}</span>${kind === "hud" ? "" : '<span class="status">Boss 08:42 · Gövde 76 · 260 para</span>'}</div>`;
    let content = "";
    if (kind === "hud")
      content = `<div class="run"><div>BÖLGE 1<br><b>BOSS 08:42</b></div><div>Gövde 76 / 100<br>260 para · Seviye 3<br>500 / 680 XP</div></div><div class="mission">ATÖLYE · işaretin içinde dur</div><div class="map" aria-label="Temsili miniharita"><svg viewBox="0 0 160 120"><path d="M8 90L55 95L87 57L145 28M30 0L55 95L95 115" fill="none" stroke="currentColor" stroke-width="3"/><path d="M60 76l5 10H55z" fill="white"/><rect x="112" y="36" width="8" height="8" fill="var(--second)"/><rect x="45" y="91" width="7" height="7" fill="var(--accent)"/></svg></div><div class="slots"><div><kbd>N</kbd><b>NİTRO</b><small>64 / 100 · HAZIR</small><div class="bar"><i></i></div></div>${catalog.skills
        .slice(0, 3)
        .map(
          (s, i) =>
            `<div>${image(dir, "skill", s.id)}<kbd>${i + 1}</kbd><b>${s.ad}</b><small>${["Sv2 · ×2 HAZIR", "Sv1 · 3,2 sn", "Sv1 · %62 · kendiliğinden"][i]}</small></div>`,
        )
        .join(
          "",
        )}</div><div class="speed"><b>84</b> km/sa<br><em>3</em> VİTES</div><div class="hints"><span><kbd>N</kbd> Nitro</span><span><kbd>1/2/3</kbd> Skill</span><span><kbd>Esc</kbd> Duraklat</span></div>`;
    if (kind === "choice")
      content = `<div class="content"><div class="kicker">SEVİYE 3 / YETENEK SEÇ</div><h3>Birini seç.</h3><p>Pasifler yuva tüketmez. Skill, seviye, eklenti ve evrim teklifleri gerçek türüyle gösterilir.</p><div class="cards">${[
        "guc",
        "hafif",
        "zirh",
      ]
        .map((id, i) => {
          const p = catalog.passives.find((p) => p.id === id);
          return `<div class="card ${i === 0 ? "selected" : ""}"><small>PASİF</small>${image(dir, "pasif", id)}<strong>${p.ad}</strong><p>${p.d}</p>${i === 0 ? '<span class="btn">Seç</span>' : ""}</div>`;
        })
        .join("")}</div></div>${hints}`;
    if (kind === "boss") {
      const b = catalog.bosses[0];
      content = `<div class="content"><div class="kicker">BÖLGE 1 / BOSS 08:42</div><h3>${b.ad}</h3><p>${b.d}</p><p>Tür: Toprak / ralli</p><div class="boss-panel">${image(dir, "boss", b.id, "emblem")}<div><div class="kicker">ZAYIFLIK</div><p>${b.zayif}</p>${b.yetenekler.map((a) => `<div class="line">${a}</div>`).join("")}<div class="actions"><span class="btn primary">Boss’a meydan oku</span><span class="btn">Geri</span></div></div></div></div>${hints}`;
    }
    return `<div class="screen ${kind}" data-direction="${dir}" data-kind="${kind}" role="img" aria-label="Yön ${dir.toUpperCase()} ${kind === "hud" ? "1B HUD" : kind === "choice" ? "5A ödül seçimi" : "6A boss"}">${top}${content}</div>`;
  }
  const info = {
    b: {
      title: "Biyomekanik mutasyon",
      desc: "Makineyi saran canlı kabuk. Asit yeşili damarlar, magenta sıvı kanalları ve koyu petrol yüzeyler.",
      palette: ["#b7ff32", "#ef3f9f", "#0b1718", "#ecf6e7"],
      rarity: ["#b6c6b3", "#b7ff32", "#5fd3e6", "#ef3f9f", "#ffd17c"],
    },
    c: {
      title: "Neon hologram",
      desc: "Camgöbeği veri çizgileri, pembe ışık kırılmaları. Hafif hologramlar ve kesintili tarama izleri.",
      palette: ["#4cefff", "#ed69ff", "#080f24", "#ecfaff"],
      rarity: ["#b7ccdc", "#80f3bc", "#4cefff", "#ed69ff", "#ffce85"],
    },
  };
  for (const dir of ["b", "c"])
    fs.writeFileSync(
      path.join(root, "docs/tasarim/mutant-" + dir, "palet.json"),
      JSON.stringify(
        {
          ad: info[dir].title,
          ana: info[dir].palette,
          nadirlikOnerisi: Object.fromEntries(
            ["Yaygın", "Sıra dışı", "Nadir", "Epik", "Efsanevi"].map((n, i) => [n, info[dir].rarity[i]]),
          ),
          not: "Yalnız görsel öneridir; oyun nadirlik sistemi eklenmez.",
        },
        null,
        2,
      ),
    );
  const html = `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Last Turn · Mutant B / C yönleri</title><style>
@font-face{font-family:Barlow;src:url('mutant-b/yazi/Barlow-Regular.ttf')}@font-face{font-family:Condensed;src:url('mutant-b/yazi/BarlowCondensed-SemiBold.ttf')}@font-face{font-family:Condensed;src:url('mutant-b/yazi/BarlowCondensed-ExtraBoldItalic.ttf');font-weight:800;font-style:italic}
*{box-sizing:border-box}body{margin:0;background:#080d13;color:#eef6f8;font:16px Barlow,sans-serif}main{max-width:1700px;margin:auto;padding:40px 28px 80px}h1,h2,h3,strong{font-family:Condensed,sans-serif}h1{font-size:52px;font-style:italic;margin:8px 0}h2{font-size:32px;margin:8px 0}p{color:#b6c3cf;line-height:1.6}a{color:#bce9f6}header{max-width:950px;margin-bottom:38px}.eyebrow{letter-spacing:.2em;color:#9cb6c9;font-size:12px}.intro{border-left:2px solid #456075;padding-left:18px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:24px}.direction{min-width:0;--accent:#b7ff32;--second:#ef3f9f;--dark:#0b1718}.direction.c{--accent:#4cefff;--second:#ed69ff;--dark:#080f24}.direction h2{color:var(--accent)}.description{min-height:76px}.palettes{display:flex;gap:7px;flex-wrap:wrap;margin:15px 0}.swatch{border-top:15px solid var(--color);padding:5px 6px;background:#141d28;font-size:11px}.label{font:600 18px Condensed;margin:26px 0 10px}.screen{position:relative;aspect-ratio:16/9;container-type:inline-size;overflow:hidden;background:var(--dark) url('mutant-b/arka-plan.png') center/100% 100%;font-family:Condensed;font-size:1.35cqw;border:1px solid #32404a}.c .screen{background-image:url('mutant-c/arka-plan.png')}.screen:before{content:'';position:absolute;inset:0;background:#050b10a6;pointer-events:none}.top{position:absolute;top:2.5cqw;left:3cqw;right:3cqw;display:flex;align-items:center;gap:2cqw;font-size:1.4cqw}.brand{background:var(--accent);color:var(--dark);transform:skewX(-14deg);padding:.5cqw 1.3cqw;letter-spacing:.15em;font-weight:800}.status{margin-left:auto;font-size:1.25cqw}.content{position:absolute;left:5cqw;right:5cqw;top:12cqw;bottom:7cqw}.kicker{color:var(--second);letter-spacing:.16em;font-size:1.15cqw}.content h3{font:italic 800 4cqw/1 Condensed;margin:.5cqw 0 1.1cqw}.content p{font:1.35cqw/1.5 Barlow;margin:.6cqw 0 1.3cqw;color:#dde6ea}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:1.3cqw;margin-top:2cqw}.card{position:relative;background:#081219ef;padding:1.8cqw;border:1cqw solid transparent;border-image:url('mutant-b/dokular/cerceve.png') 25% stretch;min-height:20cqw}.c .card{border-image-source:url('mutant-c/dokular/cerceve.png')}.card.selected{border-image-source:url('mutant-b/dokular/parlama.png')}.c .card.selected{border-image-source:url('mutant-c/dokular/parlama.png')}.card img{display:block;width:7cqw;height:7cqw;object-fit:contain;margin:.5cqw 0}.card strong{display:block;font-size:2.2cqw}.card small{font-size:1.1cqw;color:var(--accent)}.card p{font-size:1.18cqw}.btn{display:inline-block;background:#13222b;border:1px solid var(--accent);padding:.8cqw 1.6cqw;transform:skewX(-12deg);font:600 1.4cqw Condensed;color:#eff9ff}.btn.primary{background:var(--accent);color:var(--dark)}.actions{display:flex;gap:1cqw;margin-top:1.8cqw}.boss-panel{display:grid;grid-template-columns:16cqw 1fr;gap:2cqw;background:#061017ee;padding:1.5cqw;border:1cqw solid transparent;border-image:url('mutant-b/dokular/cerceve.png') 25% stretch}.c .boss-panel{border-image-source:url('mutant-c/dokular/cerceve.png')}.emblem{width:16cqw;height:16cqw;object-fit:contain}.line{border-bottom:1px solid #ffffff25;padding:.8cqw 0;font-size:1.45cqw}.hints{position:absolute;right:3cqw;bottom:1.6cqw;display:flex;gap:1.5cqw;font:1cqw Barlow;color:#dbe5ea}kbd{display:inline-block;border:1px solid #82959f;padding:.15em .4em;border-bottom-width:2px;font:inherit;color:white}.run{position:absolute;left:3cqw;top:8cqw;display:flex;gap:2cqw;font-size:1.25cqw;line-height:1.6}.run b{color:var(--second);font-size:2cqw}.mission{position:absolute;left:3cqw;top:19cqw;color:var(--accent);font-size:1.5cqw}.map{position:absolute;right:3cqw;top:3cqw;width:16cqw;height:12cqw;background:#061119d9;color:#b4ced8;border:1px solid #6c7c85}.map svg{width:100%;height:100%}.slots{position:absolute;left:3cqw;bottom:8cqw;width:35cqw;display:grid;grid-template-columns:repeat(4,1fr);gap:.6cqw}.slots>div{border-left:.2cqw solid var(--accent);padding-left:.6cqw;font-size:1.1cqw}.slots img{width:3.5cqw;height:3.5cqw;object-fit:contain;display:block}.slots b{display:block;font-size:1.25cqw;margin:.4cqw 0}.slots small{font-size:.9cqw;color:#c3d4d9}.bar{height:.4cqw;background:#53626b;margin-top:.8cqw}.bar i{display:block;height:100%;width:64%;background:var(--accent)}.speed{position:absolute;right:4cqw;bottom:6cqw;text-align:right;font-size:1.1cqw}.speed b{font:italic 800 6cqw Condensed}.speed em{font-style:normal;color:var(--accent);font-size:3cqw}.gallery{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.tile{margin:0;padding:10px;background:repeating-conic-gradient(#172430 0 25%,#10202a 0 50%) 0/20px 20px;border:1px solid #2d3f4d;min-width:0}.tile img{display:block;width:100%;aspect-ratio:1;object-fit:contain}.tile figcaption{font:14px Condensed;margin-top:8px;overflow-wrap:anywhere}.tile code{display:block;font:10px Barlow;color:#a8c3cc}.textures{display:grid;grid-template-columns:1fr 1fr;gap:12px}.textures img{width:100%;aspect-ratio:1;object-fit:contain;background:#09131b}footer{margin-top:40px;color:#91a7b7;font-size:13px}@media(max-width:900px){main{padding:24px 16px 50px}.compare{gap:14px}.gallery{grid-template-columns:repeat(2,minmax(0,1fr))}h1{font-size:40px}h2{font-size:25px}.description{min-height:128px}.swatch{font-size:10px;padding:4px}}@media(max-width:600px){.compare{grid-template-columns:1fr}.description{min-height:0}}
</style><main><header><div class="eyebrow">LAST TURN / MUTANT / GÖRSEL YÖN SEÇİMİ</div><h1>Yaşayan makine veya ışık izi.</h1><p>İki ayrı kimlik, aynı ekran düzeni: 1B HUD · 5A ödül seçimi · 6A boss.</p><div class="intro"><p>Statik tasarım incelemesi. Değerler örnek koşu anlarıdır; isim ve açıklamalar mevcut katalogdan gelir. Oklar ve Enter, F taslağındaki sunum önerisidir. Görsel tercih henüz onaylanmadı.</p><a href="mutant-f.html">F yerleşim referansı</a> · <a href="mutant-f2.html">Yön A çalışması</a></div></header><div class="compare">${[
    "b",
    "c",
  ]
    .map((dir) => {
      const d = info[dir];
      return `<article class="direction ${dir}"><div class="eyebrow">YÖN ${dir.toUpperCase()}</div><h2>${d.title}</h2><p class="description">${d.desc}</p><div class="palettes">${d.palette.map((c) => `<span class="swatch" style="--color:${c}">${c}</span>`).join("")}</div><p>Nadirlik önerisi · ${d.rarity.map((c, i) => `<span style="color:${c}">${["Yaygın", "Sıra dışı", "Nadir", "Epik", "Efsanevi"][i]}</span>`).join(" / ")}<br><small>Görsel palet önerisidir; yeni oyun sınıfı veya kuralı tanımlamaz.</small></p>${[
        ["hud", "1B · Sürüş HUD"],
        ["choice", "5A · Ödül seçimi"],
        ["boss", "6A · Boss"],
      ]
        .map(([kind, label]) => `<h3 class="label">${label}</h3>${frame(dir, kind)}`)
        .join(
          "",
        )}<h3 class="label">Örnek ikon ailesi · 28 simge</h3><p>Şeffaflık kontrolü için kareli zemin. Tam katalog, yön seçiminden sonra tamamlanacak.</p>${Object.entries(
        groups,
      )
        .map(
          ([group, rows]) =>
            `<h3 class="label">${{ boss: "Boss amblemleri", skill: "Skill", parca: "Parça kategorileri", pasif: "Pasif örnekleri" }[group]}</h3><div class="gallery">${rows.map((r) => `<figure class="tile">${image(dir, group, r.id)}<figcaption>${r.ad}<code>${r.id}</code></figcaption></figure>`).join("")}</div>`,
        )
        .join(
          "",
        )}<h3 class="label">Çerçeve / seçim parlaması</h3><div class="textures"><img src="mutant-${dir}/dokular/cerceve.png" alt="Nötr 9 dilim çerçeve"><img src="mutant-${dir}/dokular/parlama.png" alt="Seçili 9 dilim parlama"></div><p>Dokuların köşeleri korunur, kenarları uzatılır. Parlama PNG içinde hazırdır.</p></article>`;
    })
    .join(
      "",
    )}</div><footer>Barlow / Barlow Condensed yerel dosyalardan yüklenir. Bu sayfa çevrimdışı file:// ile açılabilir. Yerleşik görsel üretimi; oyun verisi ve Unity uygulaması değiştirilmedi.</footer></main></html>`;
  const frameCss = `.direction{--frame:url('mutant-b/dokular/cerceve.png');--glow:url('mutant-b/dokular/parlama.png')}.direction.c{--frame:url('mutant-c/dokular/cerceve.png');--glow:url('mutant-c/dokular/parlama.png')}.direction .card,.direction .card.selected,.direction .boss-panel{border-image:none}.boss-panel{position:relative}.card:before,.boss-panel:before{content:'';position:absolute;inset:-1cqw;border:3.4cqw solid transparent;border-image:var(--frame) 25% stretch;pointer-events:none}.card.selected:before{border-image-source:var(--glow)}`;
  const zoomCss = `.zoom-tools{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 30px}.zoom-tools button{font:16px Barlow;padding:10px 16px;color:#d9e9f0;background:#14222d;border:1px solid #476070;cursor:pointer}.zoom-tools button[aria-pressed=true]{color:#071118;background:#c1e9f4}.zoom-tools button:focus-visible{outline:3px solid #ffd17c;outline-offset:3px}.compare[data-view=b],.compare[data-view=c]{grid-template-columns:1fr}.compare[data-view=b] .direction.c,.compare[data-view=c] .direction.b{display:none}`;
  const zoomTools = `<div class="zoom-tools" aria-label="Önizleme boyutu"><button data-view="both" aria-pressed="true">Yan yana</button><button data-view="b" aria-pressed="false">Yön B’yi büyüt</button><button data-view="c" aria-pressed="false">Yön C’yi büyüt</button></div>`;
  const zoomScript = `<script>document.querySelectorAll('.zoom-tools button').forEach(button=>button.addEventListener('click',()=>{document.querySelector('.compare').dataset.view=button.dataset.view;document.querySelectorAll('.zoom-tools button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));</script>`;
  fs.writeFileSync(
    path.join(root, "docs/tasarim/mutant-yonler.html"),
    html
      .replace("</style>", frameCss + zoomCss + "</style>")
      .replace('</header><div class="compare">', "</header>" + zoomTools + '<div class="compare">')
      .replace("</main></html>", "</main>" + zoomScript + "</html>"),
  );
  console.log("Karşılaştırma sayfası ve manifestler hazır.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
