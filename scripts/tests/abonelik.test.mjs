import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  guvenliOrtam,
  durumAyikla,
  cliDurumu,
  abonelikKapisi,
  kullaniciTeyidiKaydet,
  manuelTeyidiOku,
} from "../abonelik.mjs";

const kok = fs.mkdtempSync(path.join(os.tmpdir(), "last-turn-abonelik-test-"));
after(() => {
  assert.equal(path.dirname(kok), fs.realpathSync(os.tmpdir()));
  assert.ok(path.basename(kok).startsWith("last-turn-abonelik-test-"));
  fs.rmSync(kok, { recursive: true, force: true });
});

test("çocuk ortamı API anahtarı, bearer, OAuth override, proxy ve üçüncü sağlayıcı değişkenlerini taşımaz", () => {
  const e = guvenliOrtam({
    PATH: "yol",
    USERPROFILE: "profil",
    CODEX_HOME: "kimlik deposu yolu",
    OPENAI_API_KEY: "sahte",
    CODEX_API_KEY: "sahte",
    ANTHROPIC_API_KEY: "sahte",
    ANTHROPIC_AUTH_TOKEN: "sahte",
    CLAUDE_CODE_USE_BEDROCK: "1",
    ANTHROPIC_BASE_URL: "sahte",
    CLAUDE_CODE_OAUTH_TOKEN: "sahte",
    CODEX_ACCESS_TOKEN: "sahte",
  });
  assert.deepEqual(Object.keys(e).sort(), ["CODEX_HOME", "PATH", "USERPROFILE"]);
});

test("resmi auth çıktıları yalnız whitelisted abonelik verisine dönüşür, e-posta/token saklanmaz", () => {
  const c = durumAyikla(
    "claude",
    0,
    JSON.stringify({
      loggedIn: true,
      authMethod: "claude.ai",
      subscriptionType: "pro",
      email: "gizli@example.com",
      accessToken: "sahte",
    }),
  );
  assert.equal(c.dogrulandi, true);
  assert.ok(!JSON.stringify(c).includes("gizli@example.com"));
  assert.ok(!JSON.stringify(c).includes("accessToken"));
  assert.equal(durumAyikla("codex", 0, "", "Logged in using ChatGPT\n").dogrulandi, true);
  for (const method of ["api_key", "api_key_helper", "oauth_token", "third_party", "none"])
    assert.equal(
      durumAyikla(
        "claude",
        0,
        JSON.stringify({ loggedIn: true, authMethod: method, subscriptionType: "pro" }),
      ).dogrulandi,
      false,
    );
  assert.equal(durumAyikla("codex", 0, "Logged in using an API key: sk-sahte").dogrulandi, false);
  assert.equal(durumAyikla("codex", 1, "Logged in using ChatGPT").dogrulandi, false);
});

test("kota bilinmiyorken gerçek probe makbuzu ve manuel ek kullanım teyidi yeterlidir; JSON auth taklidi değildir", async () => {
  const sahteResmiKomut = (_exe, _args, options, cb) => {
    assert.equal(options.env.ANTHROPIC_API_KEY, undefined);
    cb(null, JSON.stringify({ loggedIn: true, authMethod: "claude.ai", subscriptionType: "pro" }), "");
  };
  const oturum = await cliDurumu("claude", kok, sahteResmiKomut);
  assert.equal(oturum.besSaat, "bilinmiyor");
  assert.equal(abonelikKapisi(oturum).izin, false);
  kullaniciTeyidiKaydet(kok, ["claude"]);
  const m = manuelTeyidiOku(kok, oturum);
  assert.equal(abonelikKapisi(oturum, m).izin, true);
  assert.equal(abonelikKapisi({ ...oturum }, m).izin, false);
  assert.equal(abonelikKapisi(oturum, { ...m }).izin, false);
  oturum.oturum = "api";
  assert.equal(abonelikKapisi(oturum, m).izin, false);
});

test("manuel teyit süresi ve ajan kapsamı aşılırsa kapı açılmaz", async () => {
  const oturum = await cliDurumu("codex", kok, (_exe, _args, _options, cb) =>
    cb(null, "", "Logged in using ChatGPT\n"),
  );
  assert.equal(manuelTeyidiOku(kok, oturum), null);
  kullaniciTeyidiKaydet(kok, ["codex"]);
  const p = path.join(kok, "tests/cikti/koordinator/abonelik-kontrol.json");
  const x = JSON.parse(fs.readFileSync(p, "utf8"));
  x.sonGecerlilik = "2000-01-01T00:00:00Z";
  fs.writeFileSync(p, JSON.stringify(x));
  assert.equal(manuelTeyidiOku(kok, oturum), null);
});
