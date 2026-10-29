using LastTurn.Core;

var phases = Enum.GetValues<RacePhase>();
var expected = new[]
{
    RacePhase.Setup,
    RacePhase.Countdown,
    RacePhase.Racing,
    RacePhase.Finished,
};

if (!phases.SequenceEqual(expected))
{
    throw new InvalidOperationException("Yarış yaşam döngüsü beklenen sırada değil.");
}

Console.WriteLine("Last Turn Unity çekirdek doğrulaması geçti.");
