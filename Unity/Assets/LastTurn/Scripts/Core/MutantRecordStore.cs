using System;
using System.IO;
using System.Text;

namespace LastTurn.Core
{
  public sealed class MutantRecord
  {
    public readonly int Region, Bosses;
    public MutantRecord(int region=0,int bosses=0){Region=region;Bosses=bosses;}
    public bool IsBetter(int region,int bosses)=>region>Region || (region==Region && bosses>Bosses);
    public CatalogNode Snapshot()
    {
      var n=CatalogNode.Obj();n.Set("bolge",CatalogNode.Num(Region));n.Set("boss",CatalogNode.Num(Bosses));return n;
    }
  }

  // TS mutant.ts: yalnız kaybedilen boss sonrasında bitti fazında lt_mutant güncellenir.
  // Aktif koşu kaydı kaynakta yoktur; kariyerin profil/ekonomi dosyaları bu sınıfa verilmez.
  public sealed class MutantRecordStore
  {
    public string FilePath {get;}
    public bool ReadOnly {get;private set;}
    public string Message {get;private set;}="";
    private bool loaded;
    private string observed=null!;
    private MutantRecord record=new MutantRecord();
    public MutantRecordStore(string directory)
    {
      if(string.IsNullOrWhiteSpace(directory))throw new ArgumentException("Mutant kayıt dizini boş.");
      FilePath=Path.Combine(Path.GetFullPath(directory),"lt_mutant.json");
    }
    public MutantRecord Load()
    {
      loaded=true;ReadOnly=false;
      try
      {
        observed=File.Exists(FilePath)?File.ReadAllText(FilePath,new UTF8Encoding(false,true)):null!;
        if(observed==null){record=new MutantRecord();return record;}
        var n=CatalogNode.Parse(observed);
        // TS biçimi sürümsüzdür. Tanınmayan sürüm/alanlar eski uygulama tarafından ezilmez.
        foreach(var p in n.Fields)if(p.Key!="bolge" && p.Key!="boss")throw new FormatException("Mutant kayıt biçimi desteklenmiyor.");
        if(!observed.TrimStart().StartsWith("{",StringComparison.Ordinal))throw new FormatException("Mutant rekoru nesne olmalı.");
        int Count(string key)
        {
          if(!n.Has(key))return 0;
          double v=n[key].N(-1);
          if(!n[key].IsNumber || v<0 || v>int.MaxValue || Math.Floor(v)!=v)throw new FormatException("Mutant rekor sayacı bozuk.");
          return (int)v;
        }
        record=new MutantRecord(Count("bolge"),Count("boss"));Message="Mutant rekoru yüklendi.";return record;
      }
      catch(Exception e) when(e is IOException || e is UnauthorizedAccessException || e is FormatException || e is ArgumentException)
      {ReadOnly=true;Message="Mutant rekoru okunamadı; mevcut dosya korunuyor: "+e.Message;record=new MutantRecord();return record;}
    }

    public bool AfterBossResult(string phase,int region,int bosses)
    {
      if(phase!="bitti")return false;
      if(region<0 || bosses<0)throw new ArgumentOutOfRangeException("Mutant rekor sayaçları negatif olamaz.");
      if(!loaded)Load();
      if(!record.IsBetter(region,bosses))return false;
      if(ReadOnly)throw new IOException(Message);
      string current=File.Exists(FilePath)?File.ReadAllText(FilePath,new UTF8Encoding(false,true)):null!;
      if(current!=observed){ReadOnly=true;Message="Mutant rekoru başka oturumda değişti; dosya korunuyor.";throw new IOException(Message);}
      Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
      string tmp=FilePath+".tmp";
      if(File.Exists(tmp))throw new IOException("Önceki Mutant geçici kaydı korunuyor; yazma iptal edildi.");
      var next=new MutantRecord(region,bosses);string text=next.Snapshot().ToString();
      // CreateNew başka oturumun geçici dosyasını üzerine yazmaz. Hata halinde rekor bellekte de ilerlemez.
      using(var stream=new FileStream(tmp,FileMode.CreateNew,FileAccess.Write,FileShare.None))
      using(var writer=new StreamWriter(stream,new UTF8Encoding(false)))writer.Write(text);
      if(File.Exists(FilePath))File.Replace(tmp,FilePath,null);else File.Move(tmp,FilePath);
      observed=text;record=next;Message="Mutant rekoru kaydedildi.";return true;
    }
  }
}
