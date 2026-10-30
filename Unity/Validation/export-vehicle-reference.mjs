// Yalnız sabit TS 0.8.18 kaynak blokları çalıştırılır; C# çıktısından oracle üretilmez.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "../..");
const baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05";
const paths = [
  "src/fizik/yeni/model.ts",
  "src/fizik/yeni/arac-fizigi.ts",
  "src/fizik/yeni/lastik.ts",
  "src/arac/araclar.ts",
  "src/fizik/veriler.ts",
];
const source = paths.map((p) =>
  execFileSync(
    "git",
    ["-c", "safe.directory=" + root.replaceAll("\\", "/"), "-C", root, "show", baseline + ":" + p],
    { encoding: "utf8", env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } },
  ),
);
function block(text, start, open = "{", close = "}") {
  const begin = text.indexOf(open, start);
  if (begin < 0) throw new Error("Kaynak bloğu yok");
  let depth = 1,
    end = begin + 1;
  for (; depth && end < text.length; end++) {
    if (text[end] === open) depth++;
    if (text[end] === close) depth--;
  }
  if (depth) throw new Error("Kaynak bloğu kapanmadı");
  return { begin, end, body: text.slice(begin, end) };
}
function erase(text) {
  return text
    .replace(/:\s*\(x: number, z: number\) => number/g, "")
    .replace(/as \[number, boolean\]\[\]/g, "")
    .replace(/:\s*\[number, number(?:, number)?\](?:\[\])?/g, "")
    .replace(
      /:\s*(number|boolean|YeniDurum|AracFizigi|Arac|SurusKurulumu|TekerGeo|LastikParam|LastikSonucu|V)\b(?:\[\])?/g,
      "",
    );
}
function fn(text, name) {
  const start = text.indexOf("function " + name + "(");
  if (start < 0) throw new Error(name);
  return erase(text.slice(start, block(text, start).end));
}
const model = source[0],
  geometry = source[1],
  tires = source[2],
  cars = source[3],
  data = source[4];
const firstCar = block(cars, cars.indexOf("= [", cars.indexOf("export const CARS")));
const secondCar = block(cars, firstCar.end);
const raceTire = block(data, data.indexOf("= [", data.indexOf("export const TIRES")));
const preset = block(data, data.indexOf("  ar: {"));
const frequencies = block(geometry, geometry.indexOf("const FREKANS"));
const evaluate = (text) => vm.runInNewContext("(" + text + ")", {}, { timeout: 1000 });
const carValues = [evaluate(firstCar.body), evaluate(secondCar.body)],
  tireValue = evaluate(raceTire.body),
  presetValue = evaluate(preset.body);
const loopStart = model.indexOf("for (let n = 0; n < ARA; n++)");
const substeps = erase(model.slice(loopStart, block(model, loopStart).end));
const tirePrep = erase(
  model.slice(model.indexOf("const kz ="), model.indexOf("  // ---------- direksiyon:")),
);
const steeringPrep = erase(
  model.slice(model.indexOf("const dMax ="), model.indexOf("  // ---------- gaz, fren, vites")),
);
const brakePrep = erase(
  model.slice(model.indexOf("const Tfren:"), model.indexOf("  // ---------- yardım kuvvetleri")),
);
const driveArray = block(model, model.indexOf("Tsurus = ["), "[", "]").body;
const bOf = tires.split("\n").find((s) => s.startsWith("const bOf ="));
const code = `
const ARA=8,VD_X=3,VD_Y=2,AKS_BAGI=20,RHO=1.2,VMAX=77.2,YERCEKIMI=24;
const TUTUS=1.15,GEVSEK_TUTUS=.75,GEVSEK_TEPE=.24,GEVSEK_C=1.55,GEVSEK_ARKA=.92;
const VITESLER=[3.2,2.15,1.6,1.28,1.06,.88],FREKANS=${frequencies.body};
const TIRES=[${JSON.stringify(tireValue)}],SURF=[{dr:0},{dr:0,a:30,ti:1}];
const cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const sm=(a,b,x)=>{const t=cl((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const v3=()=>({x:0,y:0,z:0});
const SOL=v3(),UST=v3(),ON=v3(),A=v3(),C=v3(),N=v3(),T1=v3(),T2=v3(),LS={Fx:0,Fy:0,s:0};
${erase(bOf)}
${fn(tires, "lastikKuvveti")}
${fn(model, "tekerCoz")}
${fn(model, "rot")}
${fn(model, "rotTers")}
${fn(model, "noktaDunya")}
${fn(model, "normal")}
${fn(model, "GOVDE_NOKTALARI")}
${fn(geometry, "aracFizigi")}
function setup(CAR) {
 const K={tu:${JSON.stringify(presetValue.v)},as:{acc:1,bra:1,grip:0,ini:0,dft:0},tire:0};
 const F=aracFizigi(CAR,K),S={wet:0,mud:0},W={havaTutusu:()=>1},DR={k:0},gi={g:0};
 const tu=K.tu,as=K.as,T=TIRES[0],Y={tk:F.tk.map(()=>({zemin:1}))},ab=0,vl=0;
 ${tirePrep}
 return {F,LP};
}
function step(Y,F,LP,CAR,command) {
 const dt=1/60,h=dt/ARA,m=F.m,g=24,[Ix,Iy,Iz]=F.I;
 const W={H:()=>0},cx={},si=1,fx=0,fz=1,kin=0,al=0,esc=0,dw=0,wd=0,Aeq=0;
 const NT=[v3(),v3(),v3(),v3()].map(n=>({...n,y:1})),d={},dlt=command[0];
 ${steeringPrep}
 const Tw=command[1],elFreni=command[3],Tsurus=${driveArray};
 const as={abs:command[4]},fren=command[2],gaz=1,vl=0,cekisSiniri=command[5];
 ${brakePrep}
 let kMaxArka=0,aMaxArka=0,temasSay=0;
 const gn=GOVDE_NOKTALARI(CAR.w,F,CAR.lift||0).filter(([x,y,z])=>{noktaDunya(Y,F,x,y,z,A);return A.y<.6+Math.abs(Y.vy)*dt*2});
 ${substeps}
}
({setup,step})`;
const oracle = vm.runInNewContext(code, {}, { timeout: 1000 });
const fields = ["px", "py", "pz", "qx", "qy", "qz", "qw", "vx", "vy", "vz", "ox", "oy", "oz"];
const wheelFields = ["w", "don", "sik", "Fz", "kap", "tanA", "abs", "temas"];
const tolerances = [
  1e-5,
  1e-5,
  1e-5,
  1e-6,
  1e-6,
  1e-6,
  1e-6,
  1e-5,
  1e-5,
  1e-5,
  1e-5,
  1e-5,
  1e-5,
  ...Array.from({ length: 4 }, () => [1e-4, 1e-4, 1e-5, 0.05, 1e-5, 1e-5, 1e-6, 0]).flat(),
];
function scenario(name, carIndex, speed, height, commandAt, yaw = 0) {
  const car = carValues[carIndex],
    { F, LP } = oracle.setup(car),
    sin = Math.sin(yaw / 2),
    cos = Math.cos(yaw / 2);
  const Y = {
    px: Math.sin(yaw) * F.cgZ,
    py: F.cgY + height,
    pz: Math.cos(yaw) * F.cgZ,
    qx: 0,
    qy: sin,
    qz: 0,
    qw: cos,
    vx: Math.sin(yaw) * speed,
    vy: 0,
    vz: Math.cos(yaw) * speed,
    ox: 0,
    oy: 0,
    oz: 0,
    tk: F.tk.map((t) => ({
      w: speed / t.r,
      don: 0,
      sik: t.c0,
      Fz: t.Fz0,
      kap: 0,
      tanA: 0,
      abs: 1,
      temas: true,
      zemin: 1,
    })),
  };
  const initial = structuredClone(Y),
    rows = [];
  for (let k = 0; k < 600; k++) {
    const command = commandAt(k);
    oracle.step(Y, F, LP, car, command);
    rows.push({
      command,
      values: [
        ...fields.map((f) => Y[f]),
        ...Y.tk.flatMap((t) => wheelFields.map((f) => (f === "temas" ? +t[f] : t[f]))),
      ],
    });
  }
  return { name, carIndex, car, parameters: F, tires: LP, initial, rows };
}
const reference = {
  version: 1,
  baseline,
  scope:
    "original 0.8.18 substeps, flat asphalt, explicit drivetrain output torque; no driving assists/engine/gearbox/world objects",
  dt: 1 / 60,
  substeps: 8,
  sources: Object.fromEntries(paths.map((p, i) => [p, createHash("sha256").update(source[i]).digest("hex")])),
  fields: [
    ...fields,
    ...Array.from({ length: 4 }, (_, i) => wheelFields.map((f) => `wheel${i}.${f}`)).flat(),
  ],
  tolerances,
  scenarios: [
    scenario("rest-rwd", 0, 0, 0, () => [0, 0, 0, false, 0, 1e9]),
    scenario("accelerate-brake-rwd", 0, 12, 0, (k) => [
      0,
      k < 300 ? 1200 : 0,
      k < 300 ? 0 : 0.5,
      false,
      1,
      3.7,
    ]),
    scenario(
      "turn-awd",
      1,
      14,
      0,
      (k) => [0.12 * Math.sin(k / 90), 500, 0.03, k >= 420 && k < 480, 1, 3.7],
      0.37,
    ),
    scenario("reverse-awd", 1, -8, 0, (k) => [-0.08, -400, k > 360 ? 0.3 : 0, false, 0, 1e9]),
    scenario("landing-rwd", 0, 5, 0.7, (k) => [0.03, 200, k > 400 ? 0.1 : 0, false, 0, 1e9]),
  ],
};
for (const scenario of reference.scenarios)
  for (const row of scenario.rows)
    if (!row.values.every(Number.isFinite))
      throw new Error("TS oracle sonlu olmayan durum üretti: " + scenario.name);
const target = path.join(root, "Unity/Validation/Reference/four-wheel-0.8.18.json");
if (process.argv.includes("--check")) {
  const saved = JSON.parse(fs.readFileSync(target, "utf8"));
  const metadata = (r) => ({
    ...r,
    scenarios: r.scenarios.map(({ rows, ...s }) => ({ ...s, commands: rows.map((r) => r.command) })),
  });
  if (JSON.stringify(metadata(saved)) !== JSON.stringify(metadata(reference)))
    throw new Error("Dört teker kaynak/parametre/girdi sözleşmesi değişti");
  for (let s = 0; s < reference.scenarios.length; s++)
    for (let k = 0; k < 600; k++)
      for (let c = 0; c < tolerances.length; c++) {
        const actual = reference.scenarios[s].rows[k].values[c],
          expected = saved.scenarios[s].rows[k].values[c];
        if (
          !Number.isFinite(actual) ||
          !Number.isFinite(expected) ||
          Math.abs(actual - expected) > tolerances[c]
        )
          throw new Error(`TS oracle farkı: ${s}/${k}/${c}`);
      }
  console.log("TS dört teker referansı doğrulandı: 5 × 600 adım; orijinal alt adım bloğu.");
} else {
  fs.writeFileSync(target, JSON.stringify(reference) + "\n");
  console.log("Dört teker TS referansı üretildi: 5 × 600 adım.");
}
