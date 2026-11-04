namespace LastTurn.Core
{
    /// <summary>
    /// Unity/arayüz bağımlılığı olmayan yarış yaşam döngüsü.
    /// İlk geçiş adımında hem .NET doğrulaması hem Unity tarafından derlenir.
    /// </summary>
    public enum RacePhase
    {
        Setup,
        Countdown,
        Racing,
        Finished,
    }
}
