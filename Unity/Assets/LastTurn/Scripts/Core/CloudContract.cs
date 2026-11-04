#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;

namespace LastTurn.Core
{
  // TS bulut/esitleme.ts + oyun/ilerleme.ts sözleşmesi: Firestore users/{uid} belgesi, ilerleme/rekor birleştirme ve
  // hesap değişimi kuralı. Ağ/kimlik sağlayıcı (Firebase) bu sınıfta yoktur; Unity'de sağlayıcı bağlanmadı (erişim gerekli).
  public sealed class CloudDocument
  {
    public double Surum=3,Xp,UpdatedAt,Kazanilan;
    public Dictionary<string,double> Yildiz=new Dictionary<string,double>(StringComparer.Ordinal),Alimlar=new Dictionary<string,double>(StringComparer.Ordinal),Rekor=new Dictionary<string,double>(StringComparer.Ordinal);
    public List<string> EkAcik=new List<string>();
    public string OyunSurum="";
    public Dictionary<string,string[]>? Parca;
  }
  public enum CloudSyncStatus{Yok,Esitleniyor,Tamam,Bekliyor,Hata}
  public sealed class CloudUser{public string Uid="",Yol="anonim";public bool Anonim=true;public string? Eposta,Ad;}
  /// TS Saglayici: kimlik ve belge işlemleri. Unity'de uygulaması yoktur (Firebase SDK + proje anahtarları gerekir).
  public interface ICloudProvider
  {
    void ListenSession(Action<CloudUser?> changed);
    Task SignInAnonymous();Task LinkGoogle(string? hint=null);Task CreateEmail(string email,string password);Task SignInEmail(string email,string password);
    Task ResetPassword(string email);Task<bool> IsAdmin(string uid);Task SignOut();
    Task<CatalogNode?> Read(string uid);Task Write(string uid,CatalogNode document);
  }
  public static class CloudContract
  {
    public static readonly string[] Types={"gp","rx","dp","rl","dg"};
    public static readonly Dictionary<string,string> TypeKey=new Dictionary<string,string>{["gp"]="asphalt",["rx"]="dirt",["dp"]="drift",["rl"]="rally",["dg"]="drag"};
    /// TS ESKI_UCRETSIZ: sürüm 3 öncesi ücretsiz araçlar.
    public static readonly int[] LegacyFreeCars={0,1};
    public const string DriftPrefix="drift2";public const int CareerVersion=1,TracksPerType=8;
    /// TS rekorAnahtarlari: tür_pist, yeni drift kuralı drift2_pist, ve her kariyer sürümü için kariyerN_ önekli kopyaları.
    public static string[] RecordKeys()
    {
      var old=Types.SelectMany(t=>Enumerable.Range(1,TracksPerType).Select(i=>TypeKey[t]+"_"+i)).Concat(Enumerable.Range(1,TracksPerType).Select(i=>DriftPrefix+"_"+i)).ToArray();
      return old.Concat(Enumerable.Range(1,CareerVersion).SelectMany(v=>old.Select(k=>"kariyer"+v+"_"+k))).ToArray();
    }
    public static bool IsDrift(string key){var a=System.Text.RegularExpressions.Regex.Replace(key,"^kariyer\\d+_","");return a.StartsWith(TypeKey["dp"]+"_")||a.StartsWith(DriftPrefix+"_");}
    private static double Num(CatalogNode n){if(n.IsNumber)return double.IsFinite(n.N())?n.N():0;var s=n.S();return double.TryParse(s,NumberStyles.Float,CultureInfo.InvariantCulture,out var v)&&double.IsFinite(v)?v:0;}
    /// TS rekorBirlestir: bulut rekoru yerele: driftte büyük puan, sürede küçük süre; bilinmeyen anahtar ve ≤0 alınmaz.
    public static void MergeRecords(IDictionary<string,double> local,CatalogNode? remote)
    {
      if(remote==null)return;
      foreach(var k in RecordKeys())
      {
        double v=Num(remote[k]),b=local.TryGetValue(k,out var x)?x:0;
        if(v>0&&(IsDrift(k)?v>b:b==0||v<b))local[k]=v;
      }
    }
    /// TS ilerlemeYukle: XP/kazanç/zaman en büyük, alım ilk kayıt korunur, açık öğe birleşir, yıldız en iyi.
    public static void MergeProgress(CloudDocument local,CatalogNode remote)
    {
      local.Xp=Math.Max(local.Xp,Num(remote["xp"]));local.Kazanilan=Math.Max(local.Kazanilan,Num(remote["kazanilan"]));
      foreach(var p in remote["alimlar"].Fields)if(!local.Alimlar.ContainsKey(p.Key))local.Alimlar[p.Key]=Math.Max(0,Num(p.Value));
      foreach(var a in remote["ekAcik"].Items)if(a.S()!=""&&!local.EkAcik.Contains(a.S()))local.EkAcik.Add(a.S());
      // eski sürümün (< 3) oynanmış bulut kaydı: o sürümde ücretsiz olan araçlar sahip sayılır (TS eskiUcretsizleriAc)
      bool played=Num(remote["xp"])>0||Num(remote["kazanilan"])>0||remote["alimlar"].Fields.Any()||remote["ekAcik"].Items.Any();
      if(Num(remote["surum"])<3&&played)foreach(int no in LegacyFreeCars)if(!local.EkAcik.Contains("arac_"+no))local.EkAcik.Add("arac_"+no);
      foreach(var t in Types)for(int lv=1;lv<=TracksPerType;lv++){string k=TypeKey[t]+"_"+lv;double y=Num(remote["yildiz"][k]);if(y>0&&y>(local.Yildiz.TryGetValue(k,out var o)?o:0))local.Yildiz[k]=y;}
      local.UpdatedAt=Math.Max(local.UpdatedAt,Num(remote["updatedAt"]));
    }
    /// TS cek: yerel kayıt başka hesabınsa (misafirden misafire değil) bulutla değiştirilir, yerel rekorlar silinir.
    public static bool ReplacesLocal(string? owner,bool ownerAnonymous,string uid,bool anonymous)=>owner!=null&&owner!=""&&owner!=uid&&!(ownerAnonymous&&anonymous);
    /// TS ozet: karşılaştırma için sıralı JSON (updatedAt ve oyunSurum dışarıda; diziler sıralı).
    public static string Summary(CatalogNode n)
    {
      if(n.ToString().StartsWith("{")){var o=CatalogNode.Obj();foreach(var p in n.Fields.Where(p=>p.Key!="updatedAt"&&p.Key!="oyunSurum").OrderBy(p=>p.Key,StringComparer.Ordinal))o.Set(p.Key,CatalogNode.Parse(Summary(p.Value)));return o.ToString();}
      if(n.ToString().StartsWith("["))return CatalogNode.Arr(n.Items.Select(i=>CatalogNode.Parse(Summary(i))).OrderBy(i=>i.ToString(),StringComparer.Ordinal)).ToString();
      return n.ToString();
    }
  }
}
