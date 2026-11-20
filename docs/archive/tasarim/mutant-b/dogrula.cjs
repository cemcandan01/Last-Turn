(async () => {
  const { chromium } = await import("playwright");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const base = path.resolve(__dirname, "..");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const errors = [],
    externalRequests = [];
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) externalRequests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  const sizes = [];
  for (const width of [1440, 800]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto(pathToFileURL(path.join(base, "mutant-yonler.html")).href);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const check = await page.evaluate(() => {
      const rect = (e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      };
      const screens = [...document.querySelectorAll(".screen")].map((e) => {
        const r = e.getBoundingClientRect();
        const escaped = [...e.querySelectorAll("*")]
          .filter((c) => {
            const b = c.getBoundingClientRect();
            return (
              b.width &&
              b.height &&
              (b.left < r.left - 0.8 ||
                b.right > r.right + 0.8 ||
                b.top < r.top - 0.8 ||
                b.bottom > r.bottom + 0.8)
            );
          })
          .map((c) => c.className.baseVal ?? c.className);
        return {
          direction: e.dataset.direction,
          kind: e.dataset.kind,
          rect: rect(e),
          ratio: r.width / r.height,
          escaped,
        };
      });
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        broken: [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src),
        screens,
        fonts: document.fonts.check("16px Barlow") && document.fonts.check("16px Condensed"),
      };
    });
    sizes.push({ width, ...check });
    for (const dir of ["b", "c"]) {
      const folder = path.join(base, "mutant-" + dir, "kanit");
      fs.mkdirSync(folder, { recursive: true });
      const direction = page.locator(".direction." + dir);
      for (const kind of ["hud", "choice", "boss"])
        await direction
          .locator(".screen." + kind)
          .screenshot({ path: path.join(folder, `${kind}-${width}.png`) });
      if (width === 1440) {
        await direction.screenshot({ path: path.join(folder, "yon-tam.png") });
        for (const [i, name] of ["boss", "skill", "parca", "pasif"].entries())
          await direction
            .locator(".gallery")
            .nth(i)
            .screenshot({ path: path.join(folder, "ikonlar-" + name + ".png") });
        await direction.locator(".tile").evaluateAll((es) =>
          es.forEach((e) => {
            e.style.background = "#e7edf0";
            e.style.color = "#142735";
            e.querySelector("code").style.color = "#385366";
          }),
        );
        for (const [i, name] of ["boss", "skill", "parca", "pasif"].entries())
          await direction
            .locator(".gallery")
            .nth(i)
            .screenshot({ path: path.join(folder, "ikonlar-" + name + "-acik.png") });
        await direction.locator(".tile").evaluateAll((es) =>
          es.forEach((e) => {
            e.style.removeProperty("background");
            e.style.removeProperty("color");
            e.querySelector("code").style.removeProperty("color");
          }),
        );
      }
    }
    await page.screenshot({
      path: path.join(base, "mutant-b/kanit", `karsilastirma-${width}.png`),
      fullPage: true,
    });
  }
  const zoom = [];
  for (const dir of ["b", "c"]) {
    await page.locator("button[data-view=" + dir + "]").click();
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      visible: [...document.querySelectorAll(".direction")].filter((e) => e.getBoundingClientRect().width > 0)
        .length,
    }));
    zoom.push({ dir, ...state });
    for (const kind of ["hud", "choice", "boss"])
      await page
        .locator(".direction." + dir + " .screen." + kind)
        .screenshot({ path: path.join(base, "mutant-" + dir, "kanit", kind + "-800-genis.png") });
  }
  await page.locator("button[data-view=both]").click();
  const assets = [];
  for (const dir of ["b", "c"]) {
    const manifest = JSON.parse(fs.readFileSync(path.join(base, "mutant-" + dir, "manifest.json"), "utf8"));
    const files = [
      "arka-plan.png",
      "dokular/cerceve.png",
      "dokular/parlama.png",
      ...Object.entries(manifest.gruplar).flatMap(([g, rows]) => rows.map((r) => `ikonlar/${g}/${r.id}.png`)),
    ];
    for (const file of files) {
      const src =
        "data:image/png;base64," + fs.readFileSync(path.join(base, "mutant-" + dir, file)).toString("base64");
      const result = await page.evaluate(async (src) => {
        const i = new Image();
        i.src = src;
        await i.decode();
        const c = document.createElement("canvas");
        c.width = i.width;
        c.height = i.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(i, 0, 0);
        const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
        let clear = 0,
          partial = 0,
          visible = 0;
        for (let x = 3; x < rgba.length; x += 4) {
          if (rgba[x] === 0) clear++;
          else if (rgba[x] < 255) partial++;
          else visible++;
        }
        return {
          width: i.width,
          height: i.height,
          clear,
          partial,
          visible,
          transparent: clear > 0,
          nonempty: partial + visible > 0,
        };
      }, src);
      assets.push({ dir, file, ...result });
    }
  }
  const uyumsuzCss =
    fs
      .readFileSync(path.join(base, "mutant-yonler.html"), "utf8")
      .match(/\b(?:filter|backdrop-filter|box-shadow|text-shadow|mix-blend-mode)\s*:/g) || [];
  const passed =
    errors.length === 0 &&
    externalRequests.length === 0 &&
    uyumsuzCss.length === 0 &&
    zoom.every((z) => !z.overflow && z.visible === 1) &&
    sizes.every(
      (s) =>
        !s.overflow &&
        !s.broken.length &&
        s.fonts &&
        s.screens.length === 6 &&
        s.screens.every((x) => Math.abs(x.ratio - 16 / 9) < 0.01 && !x.escaped.length),
    ) &&
    assets.length === 62 &&
    assets.every((a) => a.transparent && a.nonempty && a.width >= 256 && a.height >= 256);
  const report = {
    zaman: new Date().toISOString(),
    browser: await browser.version(),
    channel: "msedge",
    url: "file:// yerel karşılaştırma",
    sizes,
    zoom,
    assets,
    errors,
    externalRequests,
    uyumsuzCss,
    passed,
  };
  fs.writeFileSync(path.join(base, "mutant-b/kanit/dogrulama.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        passed,
        errors,
        sizes,
        assetCount: assets.length,
        alphaFailures: assets.filter((a) => !a.transparent || !a.nonempty),
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (!passed) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
