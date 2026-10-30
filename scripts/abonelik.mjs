// Yalnız resmi CLI durum komutları. Ham çıktı, hesap kimliği ve stderr saklanmaz.
import { execFile, spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";

const dogrulanmis = new WeakMap();
const manuelKayitlar = new WeakSet();
const planlar = ["free", "go", "plus", "pro", "max", "team", "business", "enterprise", "edu"];

export function cliYolu(ajan) {
  if (!["codex", "claude"].includes(ajan)) throw new Error("Geçersiz CLI");
  const env = guvenliOrtam();
  const arama = Object.entries(env).find(([k]) => k.toUpperCase() === "PATH")?.[1] ?? "";
  for (const dizin of arama.split(path.delimiter).filter((d) => path.isAbsolute(d))) {
    const p = path.join(dizin, ajan + (process.platform === "win32" ? ".exe" : ""));
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return fs.realpathSync(p);
  }
  throw new Error("Desteklenen CLI PATH üzerinde bulunamadı");
}

export function guvenliOrtam(env = process.env) {
  const izin = new Set([
    "PATH",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "HOME",
    "HOMEDRIVE",
    "HOMEPATH",
    "APPDATA",
    "LOCALAPPDATA",
    "PROGRAMFILES",
    "PROGRAMFILES(X86)",
    "PROGRAMDATA",
    "CODEX_HOME",
    "CLAUDE_CONFIG_DIR",
  ]);
  return Object.fromEntries(Object.entries(env).filter(([ad]) => izin.has(ad.toUpperCase())));
}

export function durumAyikla(ajan, code, stdout = "", stderr = "") {
  const r = {
    ajan,
    oturum: "bilinmiyor",
    abonelik: "bilinmiyor",
    dogrulandi: false,
    besSaat: "bilinmiyor",
    haftalik: "bilinmiyor",
    ekKredi: "bilinmiyor",
    zaman: new Date().toISOString(),
  };
  if (code !== 0) return r;
  if (ajan === "codex") {
    if (/^Logged in using ChatGPT\s*$/m.test((stdout + "\n" + stderr).replaceAll("\r", ""))) {
      r.oturum = "chatgpt";
      r.dogrulandi = true;
    } else if (/Logged in using an API key/i.test(stdout + stderr)) r.oturum = "api";
  } else if (ajan === "claude") {
    try {
      const a = JSON.parse(stdout);
      if (a.loggedIn === true && a.authMethod === "claude.ai" && planlar.includes(a.subscriptionType)) {
        r.oturum = "claude.ai";
        r.abonelik = a.subscriptionType;
        r.dogrulandi = true;
      } else if (["api_key", "api_key_helper", "third_party", "oauth_token", "none"].includes(a.authMethod))
        r.oturum = a.authMethod;
    } catch {
      /* Bozuk çıktı ve bilinmeyen protokol abonelik kanıtı değildir. */
    }
  }
  return r;
}

export function cliDurumu(ajan, cwd, calistir = execFile) {
  return new Promise((resolve) => {
    let exe;
    try {
      exe = calistir === execFile ? cliYolu(ajan) : ajan;
    } catch {
      resolve(durumAyikla(ajan, 1));
      return;
    }
    calistir(
      exe,
      ajan === "codex"
        ? ["login", "status"]
        : [
            "--safe-mode",
            "--restricted",
            "--settings",
            '{"forceLoginMethod":"claudeai","disableAllHooks":true}',
            "auth",
            "status",
          ],
      {
        cwd,
        env: guvenliOrtam(),
        windowsHide: true,
        timeout: 10000,
        maxBuffer: 128 * 1024,
        encoding: "utf8",
      },
      (err, stdout, stderr) => {
        const r = durumAyikla(ajan, err ? 1 : 0, stdout, stderr);
        if (err)
          r.hata = ["ENOENT", "EACCES", "EPERM", "ETIMEDOUT"].includes(err.code)
            ? err.code
            : "durum-okunamadi";
        dogrulanmis.set(r, { ajan: r.ajan, oturum: r.oturum, dogrulandi: r.dogrulandi, zaman: r.zaman });
        resolve(r);
      },
    );
  });
}

// Stable app-server: thread/start veya turn/start ASLA gönderilmez; model çağrısı yok.
export function codexHesabi(cwd) {
  return new Promise((resolve) => {
    const sonuc = {
      hesap: "bilinmiyor",
      abonelik: "bilinmiyor",
      ekKredi: "bilinmiyor",
      kota: { besSaat: "bilinmiyor", haftalik: "bilinmiyor" },
    };
    let child,
      buf = "",
      bytes = 0,
      bitti = false;
    const timer = setTimeout(() => bitir("zaman-asimi"), 15000);
    function bitir(hata) {
      if (bitti) return;
      bitti = true;
      clearTimeout(timer);
      child?.stdin?.end();
      child?.kill();
      if (hata) sonuc.hata = hata;
      resolve(sonuc);
    }
    const gonder = (x) => child.stdin.write(JSON.stringify(x) + "\n");
    try {
      child = spawn(cliYolu("codex"), ["app-server", "--stdio"], {
        cwd,
        env: guvenliOrtam(),
        windowsHide: true,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      });
      child.stderr.resume(); // Ham hata çıktısı kişisel/gizli yapılandırma içerebilir.
      child.stdin.on("error", () => bitir("protokol"));
      child.on("error", () => bitir("baslatilamadi"));
      child.on("close", () => bitir());
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (s) => {
        bytes += Buffer.byteLength(s);
        if (bytes > 256 * 1024) {
          bitir("cikti-siniri");
          return;
        }
        buf += s;
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          let e;
          try {
            e = JSON.parse(line);
          } catch {
            continue;
          }
          if (e?.id === 0 && e.result) {
            gonder({ method: "initialized", params: {} });
            gonder({ method: "account/read", id: 1, params: { refreshToken: false } });
          } else if (e?.id === 1) {
            if (e.result?.account?.type === "chatgpt") {
              sonuc.hesap = "chatgpt";
              if (planlar.includes(e.result.account.planType)) sonuc.abonelik = e.result.account.planType;
              gonder({ method: "account/rateLimits/read", id: 2 });
            } else bitir("abonelik-dogrulanamadi");
          } else if (e?.id === 2) {
            const k = e.result?.rateLimitsByLimitId?.codex ?? e.result?.rateLimits;
            if (k?.credits?.hasCredits === false && k.credits.unlimited === false)
              sonuc.ekKredi = "mevcut-kredi-yok";
            else if (k?.credits?.hasCredits === true || k?.credits?.unlimited === true)
              sonuc.ekKredi = "kredi-kullanilabilir";
            for (const [ad, dakika] of [
              ["besSaat", 300],
              ["haftalik", 10080],
            ]) {
              const p = [k?.primary, k?.secondary].find((p) => p?.windowDurationMins === dakika);
              if (
                p &&
                Number.isFinite(p.usedPercent) &&
                p.usedPercent >= 0 &&
                p.usedPercent <= 100 &&
                p.resetsAt * 1000 > Date.now()
              )
                sonuc.kota[ad] = {
                  kullanilanYuzde: p.usedPercent,
                  sifirlanma: new Date(p.resetsAt * 1000).toISOString(),
                };
            }
            bitir(e.error ? "hesap-verisi-okunamadi" : undefined);
          }
        }
      });
      gonder({
        method: "initialize",
        id: 0,
        params: { clientInfo: { name: "last_turn_koordinator", version: "0.1.0" } },
      });
    } catch {
      bitir("baslatilamadi");
    }
  });
}

export async function oturumDogrula(ajan, cwd) {
  if (!["codex", "claude"].includes(ajan)) throw new Error("Geçersiz ajan");
  const r = await cliDurumu(ajan, cwd);
  if (ajan === "codex" && r.dogrulandi) {
    r.hesapBilgisi = await codexHesabi(cwd);
    if (r.hesapBilgisi.hesap === "chatgpt") {
      r.abonelik = r.hesapBilgisi.abonelik;
      r.besSaat = r.hesapBilgisi.kota.besSaat;
      r.haftalik = r.hesapBilgisi.kota.haftalik;
      r.ekKredi = r.hesapBilgisi.ekKredi;
    }
  }
  return r;
}

const teyitDosyasi = (kok) => path.join(kok, "tests/cikti/koordinator/abonelik-kontrol.json");

// Yalnız kullanıcının gerçekten verdiği hesap-ayar teyidini kaydeder; ücretli kullanım izni değildir.
// Genel --baglam JSON'u bu kayda dönüştürülmez. CLI yazımı yalnız etkileşimli manuel kontroldedir.
export function kullaniciTeyidiKaydet(kok, ajanlar) {
  if (!Array.isArray(ajanlar) || !ajanlar.length || ajanlar.some((a) => !["codex", "claude"].includes(a)))
    throw new Error("Geçersiz teyit kapsamı");
  const dosya = teyitDosyasi(kok);
  let mevcut = path.dirname(dosya);
  while (!fs.existsSync(mevcut)) mevcut = path.dirname(mevcut);
  const gercekKok = fs.realpathSync(kok);
  const gercekMevcut = fs.realpathSync(mevcut);
  if (gercekMevcut !== gercekKok && !gercekMevcut.startsWith(gercekKok + path.sep))
    throw new Error("Teyit yolu güvenli değil");
  fs.mkdirSync(path.dirname(dosya), { recursive: true });
  if (
    !fs.realpathSync(path.dirname(dosya)).startsWith(fs.realpathSync(kok) + path.sep) ||
    (fs.existsSync(dosya) && fs.lstatSync(dosya).isSymbolicLink())
  )
    throw new Error("Teyit yolu güvenli değil");
  const simdi = Date.now();
  let sonGecerlilik = simdi + 24 * 60 * 60 * 1000;
  const kapsam = new Set(ajanlar);
  try {
    const eski = JSON.parse(fs.readFileSync(dosya, "utf8"));
    const son = Date.parse(eski.sonGecerlilik);
    if (
      eski.tur === "kullanici-hesap-kontrolu" &&
      eski.ekKullanimKapali === true &&
      Array.isArray(eski.ajanlar) &&
      son > simdi &&
      son <= simdi + 24 * 60 * 60 * 1000
    ) {
      for (const ajan of eski.ajanlar) if (["codex", "claude"].includes(ajan)) kapsam.add(ajan);
      sonGecerlilik = Math.min(sonGecerlilik, son);
    }
  } catch {
    /* Eski/bozuk kayıt genişletilmez. */
  }
  fs.writeFileSync(
    dosya,
    JSON.stringify(
      {
        surum: 1,
        tur: "kullanici-hesap-kontrolu",
        ajanlar: [...kapsam],
        ekKullanimKapali: true,
        zaman: new Date(simdi).toISOString(),
        sonGecerlilik: new Date(sonGecerlilik).toISOString(),
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  return {
    dosya,
    tur: "manuel",
    not: "Kullanıcı teyidi; resmi otomatik ek-kullanım doğrulaması değildir. Hesap/ayar değişirse geçersizdir.",
  };
}

export function manuelTeyidiOku(kok, oturum) {
  try {
    const dosya = teyitDosyasi(kok);
    if (
      fs.lstatSync(dosya).isSymbolicLink() ||
      !fs.realpathSync(dosya).startsWith(fs.realpathSync(kok) + path.sep)
    )
      return null;
    const k = JSON.parse(fs.readFileSync(dosya, "utf8"));
    if (
      k.surum !== 1 ||
      k.tur !== "kullanici-hesap-kontrolu" ||
      k.ekKullanimKapali !== true ||
      !Array.isArray(k.ajanlar) ||
      !k.ajanlar.includes(oturum?.ajan) ||
      !Number.isFinite(Date.parse(k.zaman)) ||
      Date.parse(k.zaman) > Date.now() ||
      !Number.isFinite(Date.parse(k.sonGecerlilik)) ||
      Date.parse(k.sonGecerlilik) > Date.parse(k.zaman) + 24 * 60 * 60 * 1000 ||
      Date.parse(k.sonGecerlilik) <= Date.now()
    )
      return null;
    const m = { tur: k.tur, ajan: oturum.ajan, zaman: k.zaman, sonGecerlilik: k.sonGecerlilik };
    manuelKayitlar.add(m);
    return Object.freeze(m);
  } catch {
    return null;
  }
}

export async function manuelKrediKontrolu(oturum, kok) {
  if (!dogrulanmis.has(oturum) || !oturum.dogrulandi || !process.stdin.isTTY || !process.stdout.isTTY)
    return null;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const yanit = await rl.question(
      `${oturum.ajan}: Hesap ayarlarında ücretli ek kullanım/otomatik kredi tüketimini kapattığınızı doğruladınız mı? Yalnız doğruladıysanız EK KULLANIM KAPALI yazın: `,
    );
    if (yanit !== "EK KULLANIM KAPALI") return null;
    kullaniciTeyidiKaydet(kok, [oturum.ajan]);
    return manuelTeyidiOku(kok, oturum);
  } finally {
    rl.close();
  }
}

export function abonelikKapisi(oturum, manuel) {
  const makbuz = oturum && dogrulanmis.get(oturum);
  const gercek =
    makbuz &&
    makbuz.ajan === oturum.ajan &&
    makbuz.oturum === oturum.oturum &&
    makbuz.dogrulandi === oturum.dogrulandi &&
    makbuz.zaman === oturum.zaman &&
    Date.now() - Date.parse(oturum.zaman) < 5 * 60 * 1000;
  const krediManuel =
    manuel &&
    manuelKayitlar.has(manuel) &&
    manuel.ajan === oturum?.ajan &&
    Date.parse(manuel.sonGecerlilik) > Date.now();
  return {
    izin: !!(gercek && oturum.dogrulandi && krediManuel),
    kaynak: gercek && oturum.dogrulandi ? "abonelik" : "bilinmiyor",
    apiOnayi: false,
    ekKrediOnayi: false,
    ekKrediKontrolu: krediManuel ? "kullanici-hesap-ayarinda-kapali-dogruladi" : "manuel-kontrol-gerekli",
    kotaBilinmiyorEngelDegil: true,
    neden:
      !gercek || !oturum.dogrulandi
        ? "Resmi CLI çıktısıyla abonelik doğrulanamadı; manuel başlatma gerekli."
        : krediManuel
          ? "Abonelik oturumu doğrulandı; API geçişi engelli. Ek kullanımın kapalı olması kullanıcı tarafından kontrol edildi; otomatik ek-kredi ayarı doğrulaması değildir."
          : "Abonelik doğrulandı; CLI tek başına ek kullanım/otomatik kredi ayarını kanıtlamıyor. Hesap ayarını kontrol edip etkileşimli --manuel-kontrol kullanın.",
  };
}
