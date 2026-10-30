import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const required = [
  "Assets/LastTurn/Scripts/Core/RacePhase.cs",
  "Assets/LastTurn/Scripts/Core/TireModel.cs",
  "Assets/LastTurn/Scripts/Core/WheelSolver.cs",
  "Assets/LastTurn/Scripts/Core/WheelDriveBench.cs",
  "Assets/LastTurn/Scripts/Core/SeededRandom.cs",
  "Assets/LastTurn/Scripts/Core/FixedStepRunner.cs",
  "Assets/LastTurn/Scripts/Core/BodyMath.cs",
  "Assets/LastTurn/Scripts/Core/VehicleParameters.cs",
  "Assets/LastTurn/Scripts/Core/VehicleState.cs",
  "Assets/LastTurn/Scripts/Core/FourWheelVehicle.cs",
  "Assets/LastTurn/Scripts/Core/VehicleFixedStepRunner.cs",
  "Assets/LastTurn/Scripts/Core/PowertrainParameters.cs",
  "Assets/LastTurn/Scripts/Core/PowertrainState.cs",
  "Assets/LastTurn/Scripts/Core/PowertrainVehicle.cs",
  "Assets/LastTurn/Scripts/Core/PowertrainFixedStepRunner.cs",
  "Assets/LastTurn/Scripts/Core/GtPrototypeParameters.cs",
  "Assets/LastTurn/Scripts/Prototype/GtPrototype.cs",
  "Assets/LastTurn/Scripts/Prototype/GtKeyboardInput.cs",
  "Assets/LastTurn/Scripts/Prototype/GtPresentation.cs",
  "Assets/LastTurn/Scripts/Prototype/GtFollowCamera.cs",
  "Assets/LastTurn/Scenes/GTTest.unity",
  "Assets/LastTurn/Editor/PowertrainCoreSmokeCheck.cs",
  "Validation/Reference/powertrain-0.8.18.json",
  "Assets/LastTurn/Editor/VehicleCoreSmokeCheck.cs",
  "Validation/Reference/four-wheel-0.8.18.json",
  "Assets/LastTurn/Editor/DriveCoreCompilationCheck.cs",
  "Validation/Reference/wheel-drive-0.8.18.json",
  "Packages/manifest.json",
  "ProjectSettings/ProjectVersion.txt",
];

for (const relativePath of required) {
  await stat(resolve(projectRoot, relativePath));
}

const version = await readFile(resolve(projectRoot, "ProjectSettings/ProjectVersion.txt"), "utf8");
if (!/^m_EditorVersion: 6000\.3\.9f1$/m.test(version)) {
  throw new Error("Unity sürümü 6000.3.9f1 (Unity 6.3 LTS) olmalıdır.");
}

const manifest = JSON.parse(await readFile(resolve(projectRoot, "Packages/manifest.json"), "utf8"));
for (const packageName of ["com.unity.inputsystem", "com.unity.test-framework"]) {
  if (!manifest.dependencies?.[packageName]) {
    throw new Error(`Eksik Unity paketi: ${packageName}`);
  }
}

console.log("Unity proje düzeni doğrulandı.");
