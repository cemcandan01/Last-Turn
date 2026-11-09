using System.Text.Json;
using LastTurn.Core;
if(args.Contains("--remote-snapshots")){RemoteSnapshotValidation.Run();return;}
if(args.Contains("--mutant-hook")){MutantHookValidation.Run();return;}
if(args.Contains("--mutant-hud")){MutantHudValidation.Run();return;}
if(args.Contains("--mutant-event")){MutantEventValidation.Run();return;}
if(args.Contains("--mutant-workshop")){MutantWorkshopValidation.Run();return;}
if(args.Contains("--mutant-chest")){MutantChestValidation.Run();return;}
if(args.Contains("--mutant-summary")){MutantSummaryValidation.Run();return;}
if(args.Contains("--mutant-rewards")){MutantRewardValidation.Run();return;}
if(args.Contains("--mutant-damage")){MutantDamageValidation.Run();return;}
if(args.Contains("--mutant-pilot")){MutantPilotValidation.Run();return;}
if(args.Contains("--garage-f")){GarageFValidation.Run();return;}
if(args.Contains("--cloud")){CloudValidation.Run();return;}
if(args.Contains("--cloud-sync")){CloudSyncValidation.Run();return;}
if(args.Contains("--hud")){HudValidation.Run();return;}
if(args.Contains("--audio")){AudioValidation.Run();return;}
if(args.Contains("--conditions")){ConditionsValidation.Run();return;}
if(args.Contains("--race-preparation")){RacePreparationValidation.Run();return;}
if(args.Contains("--camera")){CameraValidation.Run();return;}
if(args.Contains("--profile-f")){ProfileFValidation.Run();return;}
if(args.Contains("--settings-f")){SettingsFValidation.Run();return;}
if(args.Contains("--drive-menu-f")){DriveMenuFValidation.Run();return;}
if(args.Contains("--controls")){ControlsValidation.Run();return;}
if(args.Contains("--mutant-energy")){MutantEnergyValidation.Run();return;}
if(args.Contains("--mutant-skills")){MutantSkillsValidation.Run();return;}
if(args.Contains("--mutant-skill-world")){MutantSkillWorldValidation.Run();return;}
if(args.Contains("--mutant-forces")){MutantForcesValidation.Run();return;}
if(args.Contains("--mutant-mechanics")){MutantMechanicsValidation.Run();return;}
if(args.Contains("--mutant-race-plan")){MutantRacePlanValidation.Run();return;}
if(args.Contains("--mutant-streets")){MutantStreetValidation.Run();return;}
if(args.Contains("--mutant-opponents")){MutantOpponentValidation.Run();return;}
if(args.Contains("--mutant-reconfigure")){MutantReconfigureValidation.Run();return;}
if(args.Contains("--mutant-menu")){MutantMenuValidation.Run();return;}
if(args.Contains("--mutant-session")){MutantSessionValidation.Run();return;}
if(args.Contains("--mutant-markers")){MutantMarkerValidation.Run();return;}
if(args.Contains("--mutant-run")){MutantRunValidation.Run();return;}
if(args.Contains("--mutant-records")){MutantRecordValidation.Run();return;}
if(args.Contains("--mutant-vehicle")){MutantVehicleValidation.Run();return;}
if(args.Contains("--mutant-missions")){MutantRoadMissionValidation.Run();return;}
if(args.Contains("--opponent-drive")){OpponentDriveValidation.Run();return;}
if(args.Contains("--world")){WorldValidation.Run();return;}
if(args.Contains("--opponents")){OpponentValidation.Run();return;}

if(args.Contains("--career-flow")){CareerFlowValidation.Run();return;}

if(args.Contains("--panel")){TestPanelValidation.Run();return;}

if(args.Contains("--garage")){GarageValidation.Run();return;}
if(args.Contains("--garage-storage")){GarageStorageValidation.Run();return;}
if(args.Contains("--garage-drive")){GarageDriveValidation.Run();return;}
if(args.Contains("--garage-ui")){GarageUiValidation.Run();return;}

if(args.Contains("--catalog")){CatalogValidation.Run();return;}
if(args.Contains("--tracks")){TrackValidation.Run();return;}
if(args.Contains("--race-rules")){RaceRulesValidation.Run();return;}
if(args.Contains("--race-session")){RaceSessionValidation.Run();return;}
if(args.Contains("--race-drive")){RaceDriveValidation.Run();return;}
if(args.Contains("--race-types")){RaceTypesValidation.Run();return;}
if(args.Contains("--race-all")){RaceAllValidation.Run();return;}
if(args.Contains("--assists")){AssistValidation.Run();return;}
if(args.Contains("--assist-levels")){AssistLevelsValidation.Run();return;}
if(args.Contains("--drag")){DragValidation.Run();return;}

if(args.Contains("--gt-physics")){GtPhysicsValidation.Run();return;}
if(args.Contains("--dirt-stability")){DirtStabilityValidation.Run();return;}

using var fixture = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Reference/wheel-drive-0.8.18.json")));
var root = fixture.RootElement;
const string baseline = "df3549e709469f0b519ebfbeaa9f63c1040fee05";
int checks = 0;
void Check(bool condition, string message)
{
  checks++;
  if (!condition) throw new InvalidOperationException(message);
}
double N(JsonElement e, string key) => e.GetProperty(key).GetDouble();
double[] Values(DriveState s) => [s.Omega, s.Force.Fx, s.Force.Fy, s.Force.Slip, s.Speed, s.Position, s.Angle];
bool Same(DriveState a, DriveState b) => a.Steps == b.Steps && Values(a).Select(BitConverter.DoubleToInt64Bits).SequenceEqual(Values(b).Select(BitConverter.DoubleToInt64Bits));
void Throws(Action action, string label)
{
  try { action(); } catch (ArgumentException) { checks++; return; }
  throw new InvalidOperationException("Expected rejection: " + label);
}
TireParameters Tire(JsonElement t) => new(N(t, "muY"), N(t, "muX"), N(t, "kp"), N(t, "ap"), N(t, "C"));
WheelDriveSettings Settings(JsonElement p) => new(N(p, "mass"), N(p, "radius"), N(p, "inertia"), N(p, "load"), N(p, "maxDriveTorque"), N(p, "maxBrakeTorque"), N(p, "slipAngle"), Tire(p.GetProperty("tire")));

Check(root.GetProperty("baseline").GetString() == baseline, "Wrong reference baseline");
Check(N(root, "dt") == WheelDriveBench.FixedDelta && N(root, "substeps") == WheelDriveBench.Substeps, "Fixed-step contract");
Check(Enum.GetValues<RacePhase>().SequenceEqual(new[] { RacePhase.Setup, RacePhase.Countdown, RacePhase.Racing, RacePhase.Finished }), "Race lifecycle");
string[] names = ["omega", "fx", "fy", "slip", "speed", "position", "angle"];
double[] limits = [1e-7, 1e-4, 1e-4, 1e-6, 1e-6, 1e-5, 1e-5];
for (int i = 0; i < names.Length; i++) Check(N(root.GetProperty("tolerances"), names[i]) == limits[i], "Predeclared tolerance changed");
double[] maxErrors = new double[7];
int rowsCompared = 0;
foreach (var scenario in root.GetProperty("scenarios").EnumerateArray())
{
  string label = scenario.GetProperty("name").GetString()!;
  var settings = Settings(scenario.GetProperty("parameters"));
  double initial = N(scenario, "initialSpeed");
  var random = new SeededRandom(scenario.GetProperty("seed").GetUInt32());
  var inputs = new List<DriveInput>();
  var simulation = new WheelDriveBench(settings, initial);
  var repeated = new WheelDriveBench(settings, initial);
  var states = new List<DriveState>();
  foreach (var row in scenario.GetProperty("rows").EnumerateArray())
  {
    double throttle = random.Next(), brake = random.Next() < .2 ? random.Next() : 0, control = random.Next() * 2 - 1;
    Check(throttle == row[0].GetDouble() && brake == row[1].GetDouble() && control == row[2].GetDouble(), label + " RNG/input mismatch");
    var input = new DriveInput(throttle, brake, control);
    inputs.Add(input);
    simulation.Step(input); repeated.Step(input); states.Add(simulation.State);
    Check(Same(simulation.State, repeated.State), label + " repeat mismatch");
    var values = Values(simulation.State);
    for (int i = 0; i < values.Length; i++)
    {
      double error = Math.Abs(values[i] - row[i + 3].GetDouble());
      Check(double.IsFinite(values[i]) && error <= limits[i], $"{label} step {inputs.Count} {names[i]} error {error:R} > {limits[i]:R}");
      maxErrors[i] = Math.Max(maxErrors[i], error);
    }
    rowsCompared++;
  }
  Check(inputs.Count == 600, label + " requires 600 steps");
  simulation.Reset(initial);
  for (int i = 0; i < inputs.Count; i++) { simulation.Step(inputs[i]); Check(Same(simulation.State, states[i]), label + " reset mismatch"); }
  foreach (double[] framePattern in new[] { new[] { 1.0 / 30 }, new[] { 1.0 / 60 }, new[] { 1.0 / 120 }, new[] { 1.0 / 144, 1.0 / 45, .009, .027 } })
  {
    var runner = new FixedStepRunner(new WheelDriveBench(settings, initial));
    double time = 0;
    int frame = 0;
    while (time < 10 - 1e-12)
    {
      double dt = Math.Min(framePattern[frame++ % framePattern.Length], 10 - time);
      runner.Advance(dt, index => inputs[index]); time += dt;
      Check(runner.Alpha >= 0 && runner.Alpha < 1 + 1e-10, "Interpolation alpha");
    }
    Check(runner.Current.Steps == 600 && Same(runner.Current, states[599]), label + " render cadence changed physics");
    var before = runner.Current;
    Throws(() => runner.Advance(double.NaN, _ => default), "NaN frame");
    Throws(() => runner.Advance(-1, _ => default), "negative frame");
    Check(Same(before, runner.Current), "Invalid frame advanced physics");
  }
  var unchanged = simulation.State;
  Throws(() => simulation.Step(new DriveInput(double.NaN, 0, 0)), "NaN input");
  Throws(() => simulation.Step(new DriveInput(1.1, 0, 0)), "out-of-range input");
  Throws(() => simulation.Reset(double.PositiveInfinity), "invalid reset");
  Check(Same(unchanged, simulation.State), "Rejected input/reset changed state");
  Console.WriteLine($"PASS {label}: 600 TS comparisons + bit-exact repeat/reset + 4 frame schedules");
}
var p0 = root.GetProperty("scenarios")[0].GetProperty("parameters");
var tire = Tire(p0.GetProperty("tire"));
foreach (var c in root.GetProperty("tireCases").EnumerateArray())
{
  var result = TireModel.Evaluate(N(c, "load"), N(c, "kappa"), N(c, "tanAlpha"), tire);
  double[] actual = [result.Fx, result.Fy, result.Slip];
  for (int i = 0; i < 3; i++) Check(Math.Abs(actual[i] - c.GetProperty("expected")[i].GetDouble()) <= limits[i + 1], "Tire boundary mismatch");
}
foreach (double omega in new[] { -10.0, 0, 10 })
{
  var locked = WheelSolver.Solve(omega, 1.6, 1.0 / 480, 0, 1e8, .34, -3, 3, 7200, 0, tire);
  Check(locked.Omega == 0 && double.IsFinite(locked.Force.Fx), "Coulomb brake lock/reverse");
}
Throws(() => TireModel.Evaluate(1, 0, 0, default), "default tire");
Throws(() => new TireParameters(1, 1, 0, .1, 1.3), "zero kappa scale");
Throws(() => new WheelDriveSettings(0, .34, 1, 0, 0, 0, 0, tire), "zero mass");
Throws(() => WheelSolver.Solve(0, 0, .01, 0, 0, .34, 0, 3, 1, 0, tire), "zero inertia");
var stalled = new FixedStepRunner(new WheelDriveBench(Settings(p0), 2));
Check(stalled.Advance(1, _ => default) == 6, "100ms stall clamp must be explicit");
Console.WriteLine(JsonSerializer.Serialize(new { result = "passed", baseline, rowsCompared, checks, maxErrors = names.Select((name, i) => new { name, absoluteError = maxErrors[i], tolerance = limits[i] }) }, new JsonSerializerOptions { WriteIndented = true }));
VehicleValidation.Run();
PowertrainValidation.Run();
GtPhysicsValidation.Run();
TerrainValidation.Run();
DirtStabilityValidation.Run();
