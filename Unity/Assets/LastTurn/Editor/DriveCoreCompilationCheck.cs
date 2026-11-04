using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using LastTurn.Core;
using UnityEditor;
using UnityEditor.Callbacks;
using UnityEngine;

namespace LastTurn.EditorValidation
{
    // Only runs after a successful script reload. No scene, input or project settings are changed.
    public static class DriveCoreCompilationCheck
    {
        [Serializable] private sealed class Source { public string path; public string sha256; }
        [Serializable] private sealed class Proof
        {
            public string result, utc, unityVersion, coreAssemblyMvid;
            public int smokeSteps, vehicleSmokeSteps, powertrainSmokeSteps, prototypeSmokeChecks;
            public Source[] prototypeSources;
            public Source[] sources;
        }

        [DidReloadScripts]
        private static void AfterReload() { EditorApplication.delayCall += Verify; }

        private static void Verify()
        {
            if (EditorApplication.isCompiling || EditorApplication.isUpdating)
            { EditorApplication.delayCall += Verify; return; }
            var settings = new WheelDriveSettings(300, .34, 1.2 + 4 * .34 * .34, 7200, 500, 1200, .3,
                new TireParameters(1.15, 1.15, .11, .12, 1.35));
            var a = new WheelDriveBench(settings, 2);
            var b = new WheelDriveBench(settings, 2);
            var random = new SeededRandom(5);
            for (int i = 0; i < 600; i++)
            {
                double throttle = random.Next(), brake = random.Next() < .2 ? random.Next() : 0;
                var input = new DriveInput(throttle, brake, random.Next() * 2 - 1);
                a.Step(input); b.Step(input);
                if (BitConverter.DoubleToInt64Bits(a.State.Position) != BitConverter.DoubleToInt64Bits(b.State.Position))
                    throw new InvalidOperationException("Unity drive core repeat mismatch");
            }
            var runner = new FixedStepRunner(new WheelDriveBench(settings, 2));
            if (runner.Advance(1.0 / 30, _ => default) != 2 || a.State.Steps != 600 ||
                double.IsNaN(a.State.Position) || double.IsInfinity(a.State.Position) || RacePhase.Racing == RacePhase.Setup)
                throw new InvalidOperationException("Unity drive core smoke check failed");
            string project = Path.GetDirectoryName(Application.dataPath);
            int vehicleSteps = VehicleCoreSmokeCheck.Run(project);
            int powertrainSteps = PowertrainCoreSmokeCheck.Run(project);
            int prototypeChecks = GtPrototypeValidation.CheckPresentation();
            string core = Path.Combine(Application.dataPath, "LastTurn/Scripts/Core");
            var proof = new Proof
            {
                result = "compiled-and-smoke-passed", utc = DateTime.UtcNow.ToString("O"),
                unityVersion = Application.unityVersion,
                coreAssemblyMvid = typeof(WheelDriveBench).Assembly.ManifestModule.ModuleVersionId.ToString(), smokeSteps = 600,
                vehicleSmokeSteps = vehicleSteps,
                powertrainSmokeSteps = powertrainSteps,
                prototypeSmokeChecks = prototypeChecks,
                prototypeSources = Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn/Scripts/Prototype"),"*.cs")
                    .OrderBy(p=>p,StringComparer.Ordinal).Select(p=>new Source { path=p.Substring(project.Length+1).Replace('\\','/'),sha256=Hash(p) }).ToArray(),
                sources = Directory.GetFiles(core, "*.cs", SearchOption.AllDirectories).OrderBy(p => p, StringComparer.Ordinal)
                    .Select(p => new Source { path = p.Substring(project.Length + 1).Replace('\\', '/'), sha256 = Hash(p) }).ToArray()
            };
            Directory.CreateDirectory(Path.Combine(project, "Logs"));
            File.WriteAllText(Path.Combine(project, "Logs/drive-core-compilation.json"), JsonUtility.ToJson(proof, true));
            Debug.Log("Last Turn: drive core compiled; wheel + four-wheel + powertrain repeat smoke passed. Proof: Logs/drive-core-compilation.json");
        }

        private static string Hash(string path)
        {
            using (var hash = SHA256.Create())
                return BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(path))).Replace("-", "").ToLowerInvariant();
        }
    }
}
