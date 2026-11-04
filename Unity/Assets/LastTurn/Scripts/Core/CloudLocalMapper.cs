#nullable enable
using System;
using System.Globalization;
using System.Linq;

namespace LastTurn.Core
{
  // Unity yerel kaydı (garaj ilerlemesi + takılı parçalar, yarış profili rekorları) ↔ TS bulut belgesi (users/{uid}).
  // TS belgeOlustur, ilerlemeYukle/ilerlemeDegistir, takiliYukle ve rekorBirlestir/rekorlariSil karşılıkları; aday
  // garaj her zaman GarageState.Restore doğrulamasından geçer, bozuk uzak değer yerel kaydı bozamaz.
  public static class CloudLocalMapper
  {
    /// TS belgeOlustur: ilerleme + rekorlar (+ takılı parçalar; partless: alan hiç yazılmaz).
    public static CatalogNode BuildDocument(GarageState state, RaceProfile profile, string gameVersion, double updatedAtMs, bool partless)
    {
      var snap = state.Snapshot();
      var pr = snap["progress"];
      var d = CatalogNode.Obj();
      d.Set("surum", CatalogNode.Num(3));
      d.Set("xp", pr["xp"]);
      d.Set("updatedAt", CatalogNode.Num(Math.Floor(Math.Max(0, updatedAtMs))));
      d.Set("yildiz", pr["yildiz"]);
      d.Set("ekAcik", pr["ekAcik"]);
      d.Set("kazanilan", pr["kazanilan"]);
      d.Set("alimlar", pr["alimlar"]);
      var rekor = CatalogNode.Obj();
      foreach (var k in CloudContract.RecordKeys())
      {
        double b = profile.Best(k);
        if (b > 0) rekor.Set(k, CatalogNode.Num(b));
      }
      d.Set("rekor", rekor);
      d.Set("oyunSurum", CatalogNode.Str(gameVersion.Length > 20 ? gameVersion.Substring(0, 20) : gameVersion));
      if (!partless && snap["equipped"].Fields.Any()) d.Set("parca", snap["equipped"]);
      return d;
    }

    /// Aynı hesap (ya da misafirden bağlanan): TS ilerlemeYukle + takiliYukle(parca) — yalnız yerelde parçası olmayan araç alınır.
    public static GarageState Merge(GarageState state, CatalogNode remote)
    {
      var snap = state.Snapshot();
      var doc = FromProgress(snap["progress"]);
      CloudContract.MergeProgress(doc, remote);
      snap.Set("progress", ToProgress(doc));
      var equipped = snap["equipped"];
      foreach (var p in RemoteParts(remote))
        if (!equipped.Has(p.Key) || !equipped[p.Key].Items.Any()) equipped.Set(p.Key, p.Value);
      return GarageState.Restore(state.Catalog, snap);
    }

    /// Başka hesap: TS ilerlemeDegistir + takiliYukle(parca, degistir). Belge yoksa (yeni hesap) sıfırdan başlar.
    /// Seçili araç ve yardım seviyesi cihaz tercihidir; araç artık sahip değilse Restore başlangıç aracına döner.
    public static GarageState Replace(GarageState state, CatalogNode? remote)
    {
      var snap = state.Snapshot();
      var doc = new CloudDocument();
      if (remote != null) CloudContract.MergeProgress(doc, remote);
      snap.Set("progress", ToProgress(doc));
      var equipped = CatalogNode.Obj();
      if (remote != null) foreach (var p in RemoteParts(remote)) equipped.Set(p.Key, p.Value);
      snap.Set("equipped", equipped);
      return GarageState.Restore(state.Catalog, snap);
    }

    /// TS rekorBirlestir: bulut rekorları yerele (bilinmeyen anahtar alınmaz). Dönen: yerel profil değişti mi.
    public static bool MergeRecords(RaceProfile profile, CatalogNode? remoteRecords)
    {
      if (remoteRecords == null) return false;
      var local = CloudContract.RecordKeys().Where(k => profile.Best(k) > 0).ToDictionary(k => k, profile.Best, StringComparer.Ordinal);
      var before = local.ToDictionary(p => p.Key, p => p.Value, StringComparer.Ordinal);
      CloudContract.MergeRecords(local, remoteRecords);
      bool changed = false;
      foreach (var p in local)
        if (!before.TryGetValue(p.Key, out var b) || b != p.Value)
        { profile.Records[p.Key] = p.Value.ToString("R", CultureInfo.InvariantCulture); changed = true; }
      return changed;
    }

    /// TS rekorlariSil: yalnız eşitlenen rekor anahtarları silinir (deneme/Mutant rekorları cihazda kalır).
    public static bool ClearRecords(RaceProfile profile)
    {
      bool changed = false;
      foreach (var k in CloudContract.RecordKeys()) changed |= profile.Records.Remove(k);
      return changed;
    }

    private static CloudDocument FromProgress(CatalogNode pr)
    {
      var d = new CloudDocument { Xp = pr["xp"].N(), Kazanilan = pr["kazanilan"].N(), EkAcik = pr["ekAcik"].Items.Select(x => x.S()).ToList() };
      foreach (var p in pr["yildiz"].Fields) d.Yildiz[p.Key] = p.Value.N();
      foreach (var p in pr["alimlar"].Fields) d.Alimlar[p.Key] = p.Value.N();
      return d;
    }

    private static CatalogNode ToProgress(CloudDocument d)
    {
      var pr = CatalogNode.Obj();
      pr.Set("surum", CatalogNode.Num(3));
      pr.Set("xp", CatalogNode.Num(d.Xp));
      pr.Set("kazanilan", CatalogNode.Num(d.Kazanilan));
      var a = CatalogNode.Obj();
      foreach (var p in d.Alimlar) a.Set(p.Key, CatalogNode.Num(p.Value));
      pr.Set("alimlar", a);
      pr.Set("ekAcik", CatalogNode.Arr(d.EkAcik.Select(CatalogNode.Str)));
      var y = CatalogNode.Obj();
      // Bozuk uzak yıldız (kesirli/aralık dışı) kaydı kilitlemesin: Restore'un kabul ettiği 0–3 tamsayı dışı atılır.
      foreach (var p in d.Yildiz) if (p.Value % 1 == 0 && p.Value >= 0 && p.Value <= 3) y.Set(p.Key, CatalogNode.Num(p.Value));
      pr.Set("yildiz", y);
      return pr;
    }

    // TS takiliYukle: dizi olmayan değer ve metin olmayan parça atılır; araç/parça geçerliliğini Restore denetler.
    private static System.Collections.Generic.IEnumerable<System.Collections.Generic.KeyValuePair<string, CatalogNode>> RemoteParts(CatalogNode remote)
    {
      foreach (var p in remote["parca"].Fields)
      {
        if (!p.Value.IsArray) continue;
        var ids = p.Value.Items.Where(i => i.IsString && i.S() != "").Select(i => i.S()).Distinct().ToArray();
        if (ids.Length > 0) yield return new System.Collections.Generic.KeyValuePair<string, CatalogNode>(p.Key, CatalogNode.Arr(ids.Select(CatalogNode.Str)));
      }
    }
  }
}
