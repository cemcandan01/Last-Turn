#nullable enable
using System.Collections.Generic;

namespace LastTurn.Core
{
  // Salt hedef seçimi kanıtı; sınırlar ve seçim kararı tek üretim seçicisinde hesaplanır.
  [System.Serializable] public sealed class MutantHookCandidate
  {
    public string Id="";public double Distance,Angle;public bool InRange,InCone;
  }
  public sealed class MutantCornerQuery
  {
    public CatalogNode? Target;public string Reason="";public double Turn,Radius,RequestedSide;public int Side,Index=-1;
  }
  public sealed class MutantHookQuery
  {
    public CatalogNode? Target;public string Reason="",Kind="",Id="";public double Distance,Range,Cone;public bool Airborne,Reverse;
    public readonly List<MutantHookCandidate> Candidates=new();public MutantCornerQuery? Corner;
    public bool Available=>Target!=null;
    public static string KindName(string kind)=>kind=="rakip"?"RAKİP":kind=="kose"?"KÖŞE":kind=="gok"?"BİNA":"";
  }
  public sealed class MutantHookAttempt
  {
    public long Sequence,Step;public double X,Y,Z,Heading,Steering;public string? Blocker;public bool Linked;public MutantHookQuery Query=new();
  }
}
