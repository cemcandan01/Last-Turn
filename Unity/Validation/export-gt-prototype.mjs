// Doğrulanmış, sabit TS izindeki GT/ar kurulumunu oynanabilir prototipe üretir; elle denge değeri yazılmaz.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../..");
const ref = JSON.parse(
  fs.readFileSync(path.join(root, "Unity/Validation/Reference/powertrain-0.8.18.json"), "utf8"),
);
if (ref.baseline !== "df3549e709469f0b519ebfbeaa9f63c1040fee05") throw new Error("GT kaynak SHA uyuşmazlığı");
const s = ref.scenarios.find((s) => s.name === "accelerate-coast-gt"),
  f = s.parameters,
  c = s.car,
  t = s.tuning;
const nums = (a) => a.map((v) => (typeof v === "boolean" ? String(v) : JSON.stringify(v))).join(", ");
const wheels = f.tk
  .map(
    (w) =>
      "        new WheelGeometry(" +
      nums([w.x, w.z, w.r, w.on, w.ay, w.Lr, w.k, w.cb, w.cr, w.tampon, w.c0, w.Fz0, w.I]) +
      "),",
  )
  .join("\n");
const tires = s.tires
  .map((p) => "        new TireParameters(" + nums([p.muY, p.muX, p.kp, p.ap, p.C]) + "),")
  .join("\n");
const text = `// Üretici: Unity/Validation/export-gt-prototype.mjs; TS 0.8.18 ${ref.baseline}.
namespace LastTurn.Core
{
  public static class GtPrototypeParameters
  {
    public static PowertrainParameters Create()
    {
      var wheels = new[] {
${wheels}
      };
      var tires = new[] {
${tires}
      };
      var chassis = new VehicleParameters(${f.m}, new BodyVector(${nums(f.I)}), ${nums([f.cgY, f.cgZ, f.aks])}, wheels, tires,
        ${nums([...f.arb, f.awd, f.fren, f.frenOn, f.CdA, f.ClA, f.diff, c.dk ?? 220, c.w, c.lift ?? 0, c.dmax ?? 0.8])});
      return new PowertrainParameters(chassis, ${nums([f.tork, f.devirMax, f.devirMin, f.kalkis, f.son, f.verim, t.thr, t.lch, t.lock, t.sens, c.tb ?? 0, c.tbs ?? 1, c.tbu ?? 0.6, s.tcs, s.abs])});
    }
  }
}
`;
const target = path.join(root, "Unity/Assets/LastTurn/Scripts/Core/GtPrototypeParameters.cs");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== text)
    throw new Error("GT üretilmiş parametreleri referansla eşleşmiyor");
  console.log("GT parametreleri TS 0.8.18 referansıyla aynı.");
} else fs.writeFileSync(target, text);
