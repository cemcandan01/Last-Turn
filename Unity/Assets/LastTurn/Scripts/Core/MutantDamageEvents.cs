#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Runtime.CompilerServices;

namespace LastTurn.Core
{
  // Zarf sıra numarası değildir. With(newSeq) aynı gerçek olayı taşımaya devam eder.
  public sealed class MechanicEventIdentity
  {
    public string Id { get; }
    public string Root { get; }
    public string? Parent { get; }
    public bool Derived => Parent != null;
    internal MechanicEventIdentity(string id, string root, string? parent)
    { Id=id; Root=root; Parent=parent; }
    internal MechanicEventIdentity Energy(string mechanic)
      =>new MechanicEventIdentity(Id+"/energy/"+mechanic,Root,Id);
  }

  // Bir koşunun iki hasar→enerji kanalı. Oyuncu kaydına/legacy JSON'a alan eklemez.
  // Ham eski bildirimler nesne kimliğiyle eşlenir; zarf taşınırken Identity korunmalıdır.
  public sealed class MutantDamageEvents
  {
    private readonly ConditionalWeakTable<CatalogNode,MechanicEventIdentity> notices=new ConditionalWeakTable<CatalogNode,MechanicEventIdentity>();
    private readonly HashSet<string> consumed=new HashSet<string>(StringComparer.Ordinal);
    private long next,given;
    public int Replays { get; private set; }
    // İsteğe bağlı salt gözlem: kopya olay gönderilir, oyun durumuna yeni bir kuyruk bağlanmaz.
    public Action<MechanicEvent>? Observe { get; set; }
    public MechanicEventIdentity IdentityFor(CatalogNode notice)
    {
      if(notices.TryGetValue(notice,out var identity))return identity;
      string id="damage/"+(++next).ToString(CultureInfo.InvariantCulture);
      identity=new MechanicEventIdentity(id,id,null);notices.Add(notice,identity);return identity;
    }
    public MechanicEventIdentity IdentityForGiven(CatalogNode notice)
    {
      if(notices.TryGetValue(notice,out var identity))return identity;
      string id="dealt/"+(++given).ToString(CultureInfo.InvariantCulture);
      identity=new MechanicEventIdentity(id,id,null);notices.Add(notice,identity);return identity;
    }
    // Skill çıktısının sonraki fizik adımına taşınan derin kopyası zarfını kaybetmez.
    public CatalogNode CloneEvents(CatalogNode events)=>CatalogNode.Arr(events.Items.Select(e=>{
      var copy=e.Clone();if(notices.TryGetValue(e,out var id))notices.Add(copy,id);return copy;
    }));
    internal bool Accept(MechanicEvent e)
    {
      if((e.Kind!="HasarAlindi"&&e.Kind!="HasarVerildi")||e.Identity==null)return true;
      string key=e.Kind+"/"+(e.Kind=="HasarAlindi"?e.Identity.Root:e.Identity.Id);
      if(consumed.Add(key))return true;
      Replays++;return false;
    }
    internal void Observed(MechanicEvent e)=>Observe?.Invoke(e.With(e.Seq));
  }
}
