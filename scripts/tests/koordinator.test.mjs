// Gerçek servis çağırmadan izin, protokol, süre ve depo korumalarını sınar.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  secenekler,
  yerelYol,
  kilitle,
  hedefDogrula,
  claudeArgumanlari,
  claudeCalistir,
  degerlendir,
  koordine,
  codexArgumanlari,
  gizlilikFiltresi,
} from "../koordinator.mjs";

const gecici = fs.mkdtempSync(path.join(os.tmpdir(), "last-turn-koordinator-test-"));
// Yalnız bu testin mkdtemp ile oluşturduğu doğrulanmış mutlak dizin temizlenir.
after(() => {
  assert.equal(path.dirname(gecici), fs.realpathSync(os.tmpdir()));
  assert.ok(path.basename(gecici).startsWith("last-turn-koordinator-test-"));
  fs.rmSync(gecici, { recursive: true, force: true });
});
const temel = ["--kart", "docs/isler/deneme.md", "--gorev", "$(komut) `metin`", "--dosya", "package.json"];
const cwd = fs.realpathSync(gecici),
  id = "test-oturum";
const init = {
  type: "system",
  subtype: "init",
  cwd,
  tools: ["Read", "Glob", "Grep"],
  mcp_servers: [],
  permissionMode: "dontAsk",
  session_id: id,
  model: "sahte-test",
};
const sonuc = {
  type: "result",
  subtype: "success",
  is_error: false,
  session_id: id,
  result: "Yalnız analiz.",
  permission_denials: [],
};
const yaz = (e) => `process.stdout.write(${JSON.stringify(JSON.stringify(e) + "\n")});`;
const calistir = (kod, ek = {}) =>
  claudeCalistir({
    cwd,
    id,
    prompt: "Veri $(asla-calistirma)",
    timeoutMs: 3000,
    executable: process.execPath,
    args: ["-e", kod],
    ...ek,
  });

test("görev metni veri olarak kalır; süre, kapsam ve bilinmeyen izin seçenekleri doğrulanır", () => {
  assert.equal(secenekler(temel).gorev, "$(komut) `metin`");
  for (const ek of [
    ["--sure", "0"],
    ["--sure", "601"],
    ["--sure", "NaN"],
    ["--write", "true"],
    ["--dangerously-skip-permissions", "true"],
    ["toString", "yanlis"],
    ["--kart", "tekrar"],
  ])
    assert.throws(() => secenekler([...temel, ...ek]));
  assert.throws(() => secenekler(temel.slice(0, 4)));
  assert.throws(() => secenekler([...temel, ...Array(8).fill(["--dosya", "package.json"]).flat()]));
});

test("yol geçişi, mutlak yol ve dışarı yönelen bağlantı reddedilir", () => {
  assert.throws(() => yerelYol(cwd, "../disari"));
  assert.throws(() => yerelYol(cwd, path.resolve(cwd, "dosya")));
  const dis = fs.mkdtempSync(path.join(cwd, "dis-"));
  const ic = fs.mkdtempSync(path.join(cwd, "ic-"));
  fs.symlinkSync(dis, path.join(ic, "bag"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => yerelYol(ic, "bag/yeni.json"));
  assert.equal(yerelYol(ic, "guvenli/yeni.json"), path.join(ic, "guvenli/yeni.json"));
});

test("aynı depoda ikinci koordinatör kilidi alamaz, mevcut kilit silinmez", () => {
  const ac = kilitle(cwd);
  try {
    assert.throws(() => kilitle(cwd), { code: "EEXIST" });
  } finally {
    ac();
  }
  kilitle(cwd)();
});

test("aynı/ilgisiz worktree, yanlış dal veya kirli hedef reddedilir", () => {
  const g = {
    kok: "kaynak",
    hedef: "claude",
    kayitli: true,
    ortak: "git",
    hedefOrtak: "git",
    ajan: "claude",
    durum: { dal: "agents/claude", gitDurumu: "" },
  };
  assert.doesNotThrow(() => hedefDogrula(g));
  assert.doesNotThrow(() =>
    hedefDogrula({ ...g, ajan: "codex", durum: { dal: "agents/codex", gitDurumu: "" } }),
  );
  for (const ek of [
    { hedef: "kaynak" },
    { kayitli: false },
    { hedefOrtak: "baska" },
    { durum: { dal: "master", gitDurumu: "" } },
    { durum: { dal: "agents/claude", gitDurumu: " M x" } },
    { durum: { dal: "", gitDurumu: "" } },
  ])
    assert.throws(() => hedefDogrula({ ...g, ...ek }));
});

test("her iki ajan seçilebilir; ücretli onay bayrağı kabul edilmez", () => {
  assert.equal(secenekler([...temel, "--ajan", "codex", "--mevcut", "claude"]).ajan, "codex");
  assert.equal(secenekler([...temel, "--ajan", "claude", "--devir"]).mod, "devir");
  assert.equal(secenekler(temel).mod, "plan");
  assert.throws(() => secenekler([...temel, "--ajan", "baska"]));
  assert.throws(() => secenekler([...temel, "--calistir", "--devir"]));
  assert.throws(() => secenekler([...temel, "--api-onay", "true"]));
});

test("Claude argümanlarında yalnız okuma araçları ve kapalı izin istemi vardır", () => {
  const a = claudeArgumanlari(id);
  for (const bayrak of ["--safe-mode", "--restricted", "--strict-mcp-config", "--no-session-persistence"])
    assert.ok(a.includes(bayrak));
  assert.equal(a[a.indexOf("--tools") + 1], "Read,Glob,Grep");
  assert.equal(a[a.indexOf("--permission-mode") + 1], "dontAsk");
  assert.equal(a[a.indexOf("--permission-prompts") + 1], "none");
  assert.equal(JSON.parse(a[a.indexOf("--settings") + 1]).disableAllHooks, true);
});

test("gerçek alt süreçte geçerli akış, stdin ve sonuç doğrulanır", async () => {
  const r = await calistir(
    yaz(init) +
      yaz({
        type: "assistant",
        message: { content: [{ type: "tool_use", name: "Read", input: { file_path: "package.json" } }] },
      }) +
      `let s=''; process.stdin.on('data', b=>s+=b); process.stdin.on('end',()=>{if(!s.includes('$(asla-calistirma)'))process.exit(4);${yaz(sonuc)}});`,
  );
  assert.equal(degerlendir(r), "basarili");
  assert.equal(r.iz.length, 1);
});

test("süre aşımı gerçek süreci sonlandırır; eksik sonuç başarı olmaz", async () => {
  const r = await calistir("setInterval(()=>{},1000)", { timeoutMs: 100 });
  assert.equal(r.neden, "zaman-asimi");
  assert.equal(r.durdu, true);
  assert.equal(degerlendir(await calistir(yaz(init))), "eksik-sonuc");
});

test("kota, izin reddi ve çıkış hataları görünür kalır", async () => {
  for (const [degisim, kod, beklenen] of [
    [{ is_error: true, subtype: "error_during_execution", result: "Rate limit reached (429)" }, 1, "kota"],
    [{ permission_denials: [{ tool_name: "Read" }] }, 0, "izin-reddi"],
    [{}, 2, "claude-hatasi"],
    [{ result: "" }, 0, "bos-sonuc"],
  ]) {
    const r = await calistir(yaz(init) + yaz({ ...sonuc, ...degisim }) + `process.exitCode=${kod};`);
    assert.equal(degerlendir(r), beklenen);
  }
  const r = await claudeCalistir({
    cwd,
    id,
    prompt: "",
    timeoutMs: 1000,
    executable: path.join(cwd, "olmayan-exe"),
  });
  assert.match(degerlendir(r), /^baslatma:/);
});

test("genişletilmiş araç, MCP, yanlış cwd/izin ve yasak araç çağrısı durdurulur", async () => {
  for (const degisim of [
    { tools: [...init.tools, "Write"] },
    { mcp_servers: [{}] },
    { permissionMode: "bypassPermissions" },
    { cwd: path.dirname(cwd) },
  ]) {
    const r = await calistir(yaz({ ...init, ...degisim }) + "setInterval(()=>{},1000)");
    assert.equal(r.neden, "izin-politikasi");
  }
  const yasak = { type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: {} }] } };
  const r = await calistir(yaz(init) + yaz(yasak) + "setInterval(()=>{},1000)");
  assert.equal(r.neden, "izin-politikasi");
});

test("bozuk JSON ve aşırı çıktı sınırda durur", async () => {
  assert.equal((await calistir("console.log('JSON degil');setInterval(()=>{},1000)")).neden, "protokol");
  assert.equal((await calistir(yaz(null) + "setInterval(()=>{},1000)")).neden, "protokol");
  assert.equal(
    (await calistir(yaz({ ...init, cwd: {} }) + "setInterval(()=>{},1000)")).neden,
    "izin-politikasi",
  );
  assert.equal(
    (await calistir("console.log('x'.repeat(10000));setInterval(()=>{},1000)", { maxBytes: 500 })).neden,
    "cikti-siniri",
  );
});

test("araç çağrısı bütçesini aşan inceleme durur", async () => {
  const e = {
    type: "assistant",
    message: { content: Array(13).fill({ type: "tool_use", name: "Read", input: {} }) },
  };
  const r = await calistir(yaz(init) + yaz(e) + "setInterval(()=>{},1000)");
  assert.equal(r.neden, "kapsam-siniri");
});

test("master ön kontrolü Claude başlatmadan başarısız rapor üretir ve dosyayı korur", async () => {
  const repo = fs.mkdtempSync(path.join(cwd, "repo-"));
  execFileSync("git", ["init", "--initial-branch=master", repo], { stdio: "ignore" });
  fs.writeFileSync(path.join(repo, "koru.txt"), "korunacak");
  // Boş depoda dahi master koruması, HEAD okunmadan önce uygulanır.
  const r = await koordine({ ...secenekler(temel), worktree: cwd }, repo);
  assert.equal(r.durum, "on-kontrol");
  assert.match(r.hata, /master/);
  assert.equal(r.calisma, undefined);
  assert.equal(fs.readFileSync(path.join(repo, "koru.txt"), "utf8"), "korunacak");
  assert.ok(fs.existsSync(r.raporYolu));
});

test("gerçek depoda iki yönlü yerel plan ve devir model çağrısı olmadan raporlanır", async () => {
  const repo = fileURLToPath(new URL("../../", import.meta.url));
  for (const ajan of ["codex", "claude"]) {
    const o = secenekler([
      "--kart",
      "docs/isler/2026-10-30-yerel-koordinator.md",
      "--gorev",
      "Yerel yönlendirme testi",
      "--dosya",
      "package.json",
      "--ajan",
      ajan,
      "--mevcut",
      ajan,
    ]);
    const p = await koordine(o, repo);
    assert.equal(p.durum, "planlandi");
    assert.equal(p.plan.sahip, ajan);
    assert.equal(p.calisma, undefined);
    assert.equal(p.kaynak.degisenDosyalar.length, 0);
    const r = await koordine({ ...o, mod: "devir" }, repo);
    assert.equal(r.durum, "planlandi");
    assert.equal(r.calisma, undefined);
    assert.equal(r.maliyet.izin, false);
    assert.equal(r.devir.guvenli, false);
    assert.equal(JSON.parse(fs.readFileSync(r.devir.manifest, "utf8")).kaynak.sha, r.kaynak.sha);
  }
});

test("Codex adaptörü ChatGPT, salt okunur sandbox ve araçsız anlık görüntü ister", async () => {
  const a = codexArgumanlari();
  assert.ok(a.includes('forced_login_method="chatgpt"'));
  assert.equal(a[a.indexOf("--sandbox") + 1], "read-only");
  assert.ok(a.includes("--ignore-user-config"));
  for (const f of ["shell_tool", "hooks", "multi_agent", "apps", "plugins"]) assert.ok(a.includes(f));
  const events = [
    { type: "thread.started", thread_id: "codex-test" },
    { type: "item.completed", item: { type: "agent_message", text: "Analiz" } },
    { type: "turn.completed", usage: { input_tokens: 12 } },
  ];
  const r = await calistir(events.map(yaz).join(""), { ajan: "codex" });
  assert.equal(degerlendir(r), "basarili");
  const bad = await calistir(
    yaz(events[0]) +
      yaz({ type: "item.started", item: { type: "command_execution" } }) +
      "setInterval(()=>{},1000)",
    { ajan: "codex" },
  );
  assert.equal(bad.neden, "izin-politikasi");
});

test("raporda kimlik anahtarları ve bilinen gizli metin kalıpları maskelenir; token sayaçları korunur", () => {
  const r = gizlilikFiltresi({
    apiKey: "sahte",
    access_token: "sahte",
    email: "x@example.com",
    text: "sk-ant-123456789012 Bearer gizlibilgi",
    usage: { input_tokens: 12 },
  });
  assert.equal(r.apiKey, "[gizlendi]");
  assert.equal(r.access_token, "[gizlendi]");
  assert.ok(!r.text.includes("123456789012"));
  assert.ok(!r.text.includes("gizlibilgi"));
  assert.equal(r.usage.input_tokens, 12);
});
