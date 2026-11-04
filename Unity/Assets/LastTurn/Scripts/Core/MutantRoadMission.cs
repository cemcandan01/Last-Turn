#nullable enable
using System;
using System.Collections.Generic;

namespace LastTurn.Core
{
  // TS mutant-gorev.ts: koşu ödülleri bu saf yürütücünün ürettiği olayla uygulanır.
  public sealed class MutantRoadMission
  {
    public string Kind = "drift";
    public double Target, Progress, Remaining, Money, Energy;
  }

  public sealed class MutantRoadMissionState
  {
    public MutantRoadMission? Active;
    public double Wait = MutantRoadMissions.InitialWait;
    public int Completed;
    public HashSet<string> Nearby = new HashSet<string>();
  }

  public readonly struct MutantRoadObstacle
  {
    public readonly string Id;
    public readonly double X, Z, Radius;
    public MutantRoadObstacle(string id, double x, double z, double radius)
    { Id = id; X = x; Z = z; Radius = radius; }
  }

  public sealed class MutantRoadMissionInput
  {
    public double Speed, X, Z;
    public bool Airborne, Drifting, Hit;
    public IReadOnlyList<MutantRoadObstacle> Obstacles = Array.Empty<MutantRoadObstacle>();
  }

  public sealed class MutantRoadMissionEvent
  {
    public readonly string Kind;
    public readonly MutantRoadMission Mission;
    public MutantRoadMissionEvent(string kind, MutantRoadMission mission) { Kind = kind; Mission = mission; }
  }

  public static class MutantRoadMissions
  {
    public const double Duration = 25, Interval = 8, InitialWait = 6;
    public const double NearDistance = 2.2, FarDistance = 4.5, NearSpeed = 15;
    public const double RampDistance = 450, MinimumSpeed = 6;

    public static (double Money, double Energy) Reward(int region) => (25 + 12 * region, 20);

    public static MutantRoadMission Draw(Func<double> random, int region, double maxSpeedKmh, double rampDistance)
    {
      string[] kinds = rampDistance < RampDistance
        ? new[] { "drift", "hiz", "kilpayi", "sicrama" }
        : new[] { "drift", "hiz", "kilpayi" };
      string kind = kinds[(int)Math.Floor(random() * kinds.Length)];
      double target = kind == "drift" ? 2 + region
        : kind == "hiz" ? Math.Min(Math.Floor(maxSpeedKmh * .85 / 5 + .5) * 5, 100 + 15 * region)
        : kind == "kilpayi" ? 2 + region : .8;
      var reward = Reward(region);
      return new MutantRoadMission { Kind = kind, Target = target, Remaining = Duration, Money = reward.Money, Energy = reward.Energy };
    }

    public static string Name(MutantRoadMission mission)
    {
      string target = mission.Target.ToString("G", System.Globalization.CultureInfo.InvariantCulture);
      switch (mission.Kind)
      {
        case "drift": return target + " sn kesintisiz drift";
        case "hiz": return target + " km/sa'e çık";
        case "kilpayi": return target + " engelin yanından kıl payı geç";
        default: return mission.Target.ToString("F1", System.Globalization.CultureInfo.InvariantCulture).Replace('.', ',') + " sn havada kal";
      }
    }

    // Olaydaki görev aynı nesnedir; tamamlanınca durumdan çıkarılır, son ilerleme korunur.
    public static MutantRoadMissionEvent? Step(MutantRoadMissionState state, MutantRoadMissionInput input, double dt, Func<MutantRoadMission> draw)
    {
      var active = state.Active;
      if (active == null)
      {
        if (input.Speed < MinimumSpeed) return null;
        state.Wait -= dt;
        if (state.Wait > 0) return null;
        state.Active = draw();
        state.Nearby.Clear();
        return new MutantRoadMissionEvent("basladi", state.Active);
      }
      active.Remaining -= dt;
      if (active.Kind == "drift") active.Progress = input.Drifting && !input.Hit ? active.Progress + dt : 0;
      else if (active.Kind == "sicrama") active.Progress = input.Airborne ? active.Progress + dt : 0;
      else if (active.Kind == "hiz") active.Progress = Math.Max(active.Progress, Math.Floor(input.Speed * 3.6 + .5));
      else
      {
        if (input.Hit) state.Nearby.Clear();
        foreach (var obstacle in input.Obstacles)
        {
          double clearance = JsMath.Hypot(obstacle.X - input.X, obstacle.Z - input.Z) - obstacle.Radius;
          if (clearance < NearDistance && input.Speed > NearSpeed && !input.Hit) state.Nearby.Add(obstacle.Id);
          else if (state.Nearby.Contains(obstacle.Id) && clearance > FarDistance)
          {
            state.Nearby.Remove(obstacle.Id);
            active.Progress++;
          }
        }
      }
      if (active.Progress >= active.Target)
      {
        state.Active = null;
        state.Wait = Interval;
        state.Completed++;
        return new MutantRoadMissionEvent("tamam", active);
      }
      if (active.Remaining <= 0)
      {
        state.Active = null;
        state.Wait = Interval;
        return new MutantRoadMissionEvent("kacti", active);
      }
      return null;
    }
  }
}
