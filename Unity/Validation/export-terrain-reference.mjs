// TS 0.8.18'in özgün zemin/lastik/reset/alt-adım blokları; C# çıktısı kullanılmaz.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
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

const commonPath = "src/fizik/ortak.ts";
const common = execFileSync(
  "git",
  ["-c", "safe.directory=" + root.replaceAll("\\", "/"), "-C", root, "show", baseline + ":" + commonPath],
  { encoding: "utf8", env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } },
);
const data = source[4],
  tireSource = source[2];
const evaluate = (s) => vm.runInNewContext("(" + s + ")");
const surfaces = evaluate(block(data, data.indexOf("= [", data.indexOf("export const SURF")), "[", "]").body);
const tireValue = evaluate(block(data, data.indexOf("= [", data.indexOf("export const TIRES"))).body);
const frequencies = block(geometry, geometry.indexOf("const FREKANS")).body;
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
const normalPrep = erase(
  model.slice(model.indexOf("  const NT: V[]"), model.indexOf("  for (let n = 0; n < ARA; n++)")),
);
const surfacePrep = erase(
  model.slice(
    model.indexOf("  for (let i = 0; i < 4; i++) {", model.indexOf("// ---------- zemin:")),
    model.indexOf("  direksiyonVeGaz(d, gi, cx, dt);"),
  ),
);
const driveArray = block(model, model.indexOf("Tsurus = ["), "[", "]").body;
const cleanFn = (text, name) => fn(text, name).replace(/:\s*(SimDurumu|FizikBaglami|AracDurumu)\b/g, "");
const bOf = tireSource.split("\n").find((s) => s.startsWith("const bOf ="));

const code = `
const ARA=8,VD_X=3,VD_Y=2,AKS_BAGI=20,RHO=1.2,VMAX=77.2,YERCEKIMI=24;
const TUTUS=1.15,GEVSEK_TUTUS=.75,GEVSEK_TEPE=.24,GEVSEK_C=1.55,GEVSEK_ARKA=.92;
const VITESLER=[3.2,2.15,1.6,1.28,1.06,.88],FREKANS=${frequencies};
const TIRES=[${JSON.stringify(tireValue)}],SURF=${JSON.stringify(surfaces)};
const cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const sm=(a,b,x)=>{const t=cl((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const v3=()=>({x:0,y:0,z:0});
const SOL=v3(),UST=v3(),ON=v3(),A=v3(),C=v3(),N=v3(),T1=v3(),T2=v3(),LS={Fx:0,Fy:0,s:0};
${erase(bOf)}
${fn(tireSource, "lastikKuvveti")}
${fn(model, "tekerCoz")}
${fn(model, "rot")}
${fn(model, "rotTers")}
${fn(model, "noktaDunya")}
${fn(model, "normal")}
${fn(model, "qCarp")}
${fn(model, "GOVDE_NOKTALARI")}
${fn(geometry, "aracFizigi")}
${cleanFn(model, "yeniBaslat")}
${cleanFn(model, "cikis")}
${cleanFn(common, "zeminIzleri")}
function settings(CAR){return {car:CAR,tu:${JSON.stringify(presetValue.v)},as:{acc:1,bra:1,grip:0,ini:0,dft:0},tire:0};}
function setup(CAR,surface=1){
 const K=settings(CAR),F=aracFizigi(CAR,K),S={wet:0,mud:0},W={havaTutusu:()=>1},DR={k:0},gi={g:0};
 const tu=K.tu,as=K.as,T=TIRES[0],Y={tk:F.tk.map(()=>({zemin:surface}))},ab=0,vl=0;
 ${tirePrep}
 return {F,LP};
}
function initial(CAR,W,speed,height){
 const S={x:0,z:0,h:0,vx:0,vy:0,vz:speed,w:0,wet:0,mud:0};
 const Y=yeniBaslat({S},{kurulum:settings(CAR),dunya:W});Y.py+=height;
 return {Y,S};
}
function step(Y,S,F,CAR,W,command){
 const dt=1/60,h=dt/ARA,m=F.m,g=24,[Ix,Iy,Iz]=F.I,K=settings(CAR),tu=K.tu;
 const cx={},fx=Math.sin(S.h),fz=Math.cos(S.h),kin=0,al=0,esc=0,dw=0,wd=0,Aeq=0,d={},dlt=command[0];
 ${surfacePrep}
 const as={...K.as,abs:command[4]},T=TIRES[0],DR={k:0},gi={g:0},ab=0,vl=0;
 ${tirePrep}
 ${steeringPrep}
 const Tw=command[1],elFreni=command[3],Tsurus=${driveArray},fren=command[2],gaz=1,cekisSiniri=command[5];
 ${brakePrep}
 let kMaxArka=0,aMaxArka=0,temasSay=0;
 ${normalPrep}
 ${substeps}
 cikis({S},Y,F);
}
({setup,initial,step})`;
const oracle = vm.runInNewContext(code, {}, { timeout: 1000 });

function world(name) {
  let H = () => 0,
    surf = () => 1;
  if (name === "flat-dirt") surf = () => 0;
  if (name === "mud-to-asphalt") surf = (_x, z) => (z < 15 ? 3 : 1);
  if (name === "slope") H = (x, z) => 0.08 * z + 0.04 * x;
  if (name === "mixed") {
    H = (x, z) => 0.12 * Math.sin(z * 0.5) + 0.06 * Math.sin(x * 0.7);
    surf = (x) => (x >= 0 ? 0 : 1);
  }
  if (name === "crest") {
    H = (_x, z) => (z < 10 ? 0 : z < 18 ? 0.25 * (z - 10) : z < 20 ? 2 : 0);
    surf = (_x, z) => (z >= 18 ? 0 : 1);
  }
  return { H, surf, havaTutusu: () => 1 };
}
const values = (Y, S) => [
  ...fields.map((f) => Y[f]),
  ...Y.tk.flatMap((t) => wheelFields.map((f) => (f === "temas" ? +t[f] : t[f]))),
  ...Y.tk.map((t) => t.zemin),
  S.wet,
  S.mud,
];
const surfaceProfiles = carValues.map((car, carIndex) => ({
  carIndex,
  car,
  surfaceTires: surfaces.map((_, si) => oracle.setup(car, si).LP),
}));
function scenario(name, carIndex, initialSpeed, heightOffset, commandAt) {
  const car = carValues[carIndex],
    { F, LP } = oracle.setup(car),
    W = world(name),
    { Y, S } = oracle.initial(car, W, initialSpeed, heightOffset);
  const initial = structuredClone(Y),
    initialValues = values(Y, S),
    rows = [];
  for (let k = 0; k < 600; k++) {
    const command = commandAt(k);
    oracle.step(Y, S, F, car, W, command);
    const row = { command, values: values(Y, S) };
    if (!row.values.every(Number.isFinite)) throw new Error("Sonlu olmayan arazi oracle: " + name + "/" + k);
    rows.push(row);
  }
  return {
    name,
    world: name,
    carIndex,
    car,
    parameters: F,
    tires: LP,
    surfaceTires: surfaceProfiles[carIndex].surfaceTires,
    initialSpeed,
    heightOffset,
    initial,
    initialValues,
    rows,
  };
}
const reference = {
  version: 1,
  baseline,
  scope:
    "TS 0.8.18 özgün zemin/reset/lastik/alt-adım blokları; açık aktarma torku, motor/yardım/nesne çarpışması yok",
  dt: 1 / 60,
  substeps: 8,
  sources: Object.fromEntries(
    [...paths, commonPath].map((p, i) => [
      p,
      createHash("sha256")
        .update([...source, common][i])
        .digest("hex"),
    ]),
  ),
  fields: [
    ...fields,
    ...Array.from({ length: 4 }, (_, i) => wheelFields.map((f) => `wheel${i}.${f}`)).flat(),
    ...Array.from({ length: 4 }, (_, i) => `wheel${i}.surface`),
    "wet",
    "mud",
  ],
  tolerances: [...tolerances, 0, 0, 0, 0, 1e-10, 1e-10],
  surfaces,
  surfaceProfiles,
  scenarios: [
    scenario("flat-asphalt", 0, 0, 0, (k) =>
      k < 360 ? [0, 3500, 0, false, 1, 1.2] : [0, 0, 0.5, false, 1, 1.2],
    ),
    scenario("flat-dirt", 0, 0, 0, (k) =>
      k < 360 ? [0, 3500, 0, false, 1, 1.2] : [0, 0, 0.5, false, 1, 1.2],
    ),
    scenario("slope", 1, 8, 0, () => [0.02, 1600, 0, false, 1, 1.2]),
    scenario("mixed", 1, 10, 0, () => [0.03, 1000, 0, false, 1, 1.2]),
    scenario("jump", 0, 0, 1.5, () => [0, 0, 0, false, 1, 1.2]),
    scenario("crest", 0, 18, 0, () => [0, 0, 0, false, 1, 1.2]),
    scenario("mud-to-asphalt", 0, 8, 0, () => [0, 2000, 0, false, 1, 1.2]),
  ],
};
const target = path.join(root, "Unity/Validation/Reference/terrain-0.8.18.json");
if (process.argv.includes("--check")) {
  const saved = JSON.parse(fs.readFileSync(target, "utf8"));
  const metadata = (r) => ({
    ...r,
    scenarios: r.scenarios.map(({ rows, ...s }) => ({ ...s, commands: rows.map((r) => r.command) })),
  });
  if (JSON.stringify(metadata(saved)) !== JSON.stringify(metadata(reference)))
    throw new Error("Arazi kaynak/parametre/girdi sözleşmesi değişti");
  for (let s = 0; s < reference.scenarios.length; s++)
    for (let k = 0; k < 600; k++)
      for (let c = 0; c < reference.fields.length; c++) {
        const a = reference.scenarios[s].rows[k].values[c],
          b = saved.scenarios[s].rows[k].values[c];
        if (!Number.isFinite(b) || Math.abs(a - b) > reference.tolerances[c])
          throw new Error(`Arazi TS farkı ${s}/${k}/${c}`);
      }
  console.log(`TS arazi referansı doğrulandı: ${reference.scenarios.length} × 600 adım × 51 değer.`);
} else {
  fs.writeFileSync(target, JSON.stringify(reference) + "\n");
  console.log(`TS arazi referansı üretildi: ${reference.scenarios.length} × 600 adım × 51 değer.`);
}
