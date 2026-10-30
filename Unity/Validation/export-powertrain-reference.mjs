// Motor ve gaz/direksiyon blokları sabit kaynak SHA'dan çalıştırılır; eski gövde oracle'ı yeniden kullanılır.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  oracle,
  carValues,
  presetValue,
  fields,
  wheelFields,
  tolerances,
  paths,
  source,
  baseline,
  model,
  geometry,
  erase,
  fn,
  root,
  block,
} from "./export-vehicle-reference.mjs";
const read = (p) =>
  execFileSync(
    "git",
    ["-c", "safe.directory=" + root.replaceAll("\\", "/"), "-C", root, "show", baseline + ":" + p],
    { encoding: "utf8", env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } },
  );
const common = read("src/fizik/ortak.ts"),
  profiles = read("src/arac/gorunumler.ts");
const profile = vm.runInNewContext("(" + block(profiles, profiles.indexOf("  t16: {")).body + ")");
const carStart = source[3].lastIndexOf("{", source[3].indexOf('k: "t16"'));
const turboCar = vm.runInNewContext("(" + block(source[3], carStart).body + ")", {
  GORUNUM: { t16: profile },
});
const engineBlock = erase(model.slice(model.indexOf("let gaz ="), model.indexOf("  // frenler ve ABS")));
const filter = fn(common, "direksiyonVeGaz").replace(/:\s*(SimDurumu|FizikGirdisi|FizikBaglami)\b/g, "");
const steering = erase(model.slice(model.indexOf("let dlt ="), model.indexOf("  const dw =")));
const curve = erase(geometry.split("\n").find((s) => s.startsWith("export const torkEgrisi"))).replace(
  "export ",
  "",
);
const engineOracle = vm.runInNewContext(`
const cl=(x,a,b)=>Math.max(a,Math.min(b,x)),sm=(a,b,x)=>{const t=cl((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const VMAX=77.2,VITESLER=[3.2,2.15,1.6,1.28,1.06,.88];
${curve}
${filter}
${fn(model, "rot")}
function step(Y,S,sim,F,CAR,input,tcs,abs,smoothSteering,speedSensitiveSteering){
const dt=1/60,K={tu:${JSON.stringify(presetValue.v)},ss:speedSensitiveSteering,sm:smoothSteering},cx={kurulum:K},tu=K.tu;
const gi={g:input[0],b:input[1],tg:input[2],analogGaz:input[3],analogDireksiyon:input[4],dbr:input[5]};
sim.S=S;direksiyonVeGaz(sim,gi,cx,dt);
const st=sim.st,DR={on:false,k:0},as={tcs,str:0,dft:0};
const fx=Math.sin(S.h),fz=Math.cos(S.h),vl=Y.vx*fx+Y.vz*fz,vt=Y.vx*fz-Y.vz*fx,
be=Math.atan2(vt,Math.max(vl,.5)),ab=Math.abs(be),spn=Math.min(1,Math.abs(vl)/VMAX);
${steering}
const delta=cl(dlt,-(CAR.dmax??.8),CAR.dmax??.8);
${engineBlock}
const tutma=Math.abs(vl)<.6&&gaz<.05&&fren<.05?.3:0;
return {command:[delta,Tw,fren+tutma,elFreni,abs,cekisSiniri],values:[S.gas,st,Y.rpm,Y.vites,Y.vitesT,Y.turbo,Te,Tw,devir,gaz,fren+tutma,cekisSiniri,delta]};
}
({step,heading:Y=>{const on={};rot(Y,0,0,1,on);return Math.atan2(on.x,on.z)}})`);
const engineFields = [
  "gas",
  "steering",
  "rpm",
  "gear",
  "shiftTimer",
  "turbo",
  "engineTorque",
  "driveTorque",
  "coupledRpm",
  "effectiveGas",
  "effectiveBrake",
  "slipLimit",
  "steeringAngle",
];
const engineLimits = [1e-10, 1e-10, 1e-5, 0, 1e-10, 1e-10, 1e-4, 1e-4, 1e-5, 1e-10, 1e-10, 1e-10, 1e-10];
function scenario(
  name,
  car,
  speed,
  gear,
  tcs,
  commandAt,
  smoothSteering = true,
  speedSensitiveSteering = true,
) {
  const { F, LP } = oracle.setup(car),
    Y = {
      px: 0,
      py: F.cgY,
      pz: F.cgZ,
      qx: 0,
      qy: 0,
      qz: 0,
      qw: 1,
      vx: 0,
      vy: 0,
      vz: speed,
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
      rpm: 900,
      vites: gear,
      vitesT: 0,
      turbo: 0,
    };
  const S = { gas: 0, h: 0 },
    sim = { st: 0 },
    rows = [];
  for (let k = 0; k < 600; k++) {
    const input = commandAt(k),
      result = engineOracle.step(Y, S, sim, F, car, input, tcs, 1, smoothSteering, speedSensitiveSteering);
    oracle.step(Y, F, LP, car, result.command);
    S.h = engineOracle.heading(Y);
    const values = [
      ...fields.map((f) => Y[f]),
      ...Y.tk.flatMap((t) => wheelFields.map((f) => (f === "temas" ? +t[f] : t[f]))),
      ...result.values,
    ];
    if (!values.every(Number.isFinite)) throw new Error("Sonlu olmayan motor oracle: " + name);
    rows.push({ input, values });
  }
  return {
    name,
    car,
    parameters: F,
    tires: LP,
    initialSpeed: speed,
    initialGear: gear,
    tcs,
    abs: 1,
    smoothSteering,
    speedSensitiveSteering,
    tuning: presetValue.v,
    rows,
  };
}
const reference = {
  version: 1,
  baseline,
  dt: 1 / 60,
  substeps: 8,
  sources: Object.fromEntries(
    [...paths, "src/fizik/ortak.ts", "src/arac/gorunumler.ts"].map((p, i) => [
      p,
      createHash("sha256")
        .update([...source, common, profiles][i])
        .digest("hex"),
    ]),
  ),
  fields: [
    ...fields,
    ...Array.from({ length: 4 }, (_, i) => wheelFields.map((f) => `wheel${i}.${f}`)).flat(),
    ...engineFields,
  ],
  tolerances: [...tolerances, ...engineLimits],
  scenarios: [
    scenario("idle-gt", carValues[0], 0, 1, 0, () => [0, 0, 0, true, true, false]),
    scenario("accelerate-coast-gt", carValues[0], 0, 1, 1, (k) => [
      k < 420 ? 1 : 0,
      0,
      0.06 * Math.sin(k / 100),
      true,
      true,
      false,
    ]),
    scenario("downshift-gt", carValues[0], 18, 5, 1, (k) => [
      k < 240 ? 1 : 0,
      k > 420 ? 0.3 : 0,
      0,
      true,
      true,
      false,
    ]),
    scenario(
      "reverse-forward-rx",
      carValues[1],
      0,
      1,
      0,
      (k) => [k < 240 ? 0 : 1, k < 240 ? 0.7 : 0, 0.06, false, false, false],
      false,
      false,
    ),
    scenario("turbo-handbrake-t16", turboCar, 15, 1, 1, (k) => [
      k < 400 ? 1 : 0,
      k > 500 ? 0.2 : 0,
      0.08 * Math.sin(k / 80),
      false,
      false,
      k >= 280 && k < 330,
    ]),
  ],
};
const target = path.join(root, "Unity/Validation/Reference/powertrain-0.8.18.json");
if (process.argv.includes("--check")) {
  const saved = JSON.parse(fs.readFileSync(target, "utf8"));
  const meta = (r) => ({
    ...r,
    scenarios: r.scenarios.map(({ rows, ...s }) => ({ ...s, inputs: rows.map((r) => r.input) })),
  });
  if (JSON.stringify(meta(saved)) !== JSON.stringify(meta(reference)))
    throw new Error("Motor kaynak/parametre/girdi değişti");
  for (let s = 0; s < reference.scenarios.length; s++)
    for (let k = 0; k < 600; k++)
      for (let c = 0; c < reference.fields.length; c++) {
        const a = reference.scenarios[s].rows[k].values[c],
          b = saved.scenarios[s].rows[k].values[c];
        if (!Number.isFinite(b) || Math.abs(a - b) > reference.tolerances[c])
          throw new Error(`Motor TS farkı ${s}/${k}/${c}`);
      }
  console.log("TS motor referansı doğrulandı: 5 × 600 adım, özgün motor/girdi blokları.");
} else {
  fs.writeFileSync(target, JSON.stringify(reference) + "\n");
  console.log("TS motor referansı üretildi: 5 × 600 adım.");
}
