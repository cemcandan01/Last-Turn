#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;

namespace LastTurn.Core
{
  /// F §9 sonuç başlığı: büyük değer, hedefe fark ve geçti/kaldı.
  public sealed class RaceHeadline
  {
    public string Value="",Delta="",DeltaText="";public bool Passed;
  }

  /// F §8 Duraklatma ve §9 Yarış sonucu için saf sunum verisi. Sayılar mevcut RaceSession / kariyer kaydından okunur;
  /// ödül, yıldız ve kayıt kuralı burada değildir.
  public static class DriveMenuModel
  {
    private static string Inv(double v,string f)=>v.ToString(f,CultureInfo.InvariantCulture);

    /// Duraklatmada sağ paneldeki anlık yarış durumu (etiket, değer).
    public static List<(string Label,string Value)> PauseStats(RaceSession s,int hint)
    {
      var e=s.Event;var hud=RaceViewModel.Hud(s,hint);var rows=new List<(string,string)>();
      rows.Add((e.Type=="dp"?"Puan":"Süre",hud.Big));
      if(e.Laps>0&&e.Type!="dp")rows.Add(("En iyi tur",RaceSession.FormatTime(s.BestLap)));
      if(e.Limit>0)rows.Add(("Hedef",e.Type=="dp"?Inv(e.Limit,"0")+" puan":e.Type=="dg"?Inv(e.Limit,"0.000")+" sn":RaceSession.FormatTime(e.Limit)));
      return rows;
    }

    /// Duraklatma başlığındaki ilerleme: "TUR 2/3" ya da "%40" (HUD alt satırının ilk parçası).
    public static string PauseProgress(RaceSession s,int hint)=>RaceViewModel.Hud(s,hint).Sub.Split(new[]{" · "},StringSplitOptions.None)[0];

    /// Sonuç: süre/puan büyük; fark hedefe göre (zamanda eksi iyi, driftte artı iyi).
    public static RaceHeadline Headline(RaceSession s)
    {
      var e=s.Event;var h=new RaceHeadline();
      if(e.Type=="dp")
      {
        double score=s.Drift.Score;h.Value=Inv(score,"0");h.Passed=score>0&&score>=e.Limit;
        if(e.Limit>0){double d=score-e.Limit;h.Delta=(d>=0?"+":"−")+Inv(Math.Abs(d),"0");h.DeltaText=d>=0?"hedefin üstünde":"hedefin altında";}
        return h;
      }
      h.Value=e.Type=="dg"?Inv(s.Time,"0.000"):RaceSession.FormatTime(s.Time);h.Passed=s.Time<=e.Limit;
      if(e.Limit>0){double d=s.Time-e.Limit;h.Delta=(d<=0?"−":"+")+Inv(Math.Abs(d),e.Type=="dg"?"0.000":"0.0");h.DeltaText=d<=0?"hedefin altında":"hedefin üstünde";}
      return h;
    }

    /// Seviye çubuğu: toplam doluluk ve bu yarıştan gelen kısım (seviye atlandıysa yeni seviyenin tamamı bu yarıştandır).
    public static (double Fill,double Gain) LevelBar(int level,double xp,double nextLevelXp,double gained)
    {
      double start=VehicleCatalog.LevelBase(level),span=Math.Max(1,nextLevelXp-start);
      double fill=Math.Max(0,Math.Min(1,(xp-start)/span));return (fill,Math.Max(0,Math.Min(fill,gained/span)));
    }

    /// Kariyer satırı anahtarı (RaceViewModel.Events ile aynı: tür_seviye); RaceEventInfo.Key pist anahtarıdır.
    public static string CareerKey(RaceEventInfo e)=>e.Type+"_"+e.Level;

    /// Kariyerde sıradaki yarış: aynı türde bu pistten sonraki ilk açık kariyer pisti; yoksa null.
    public static RaceEventRow? NextCareerEvent(RaceEventRow[] events,string key)
    {
      int dash=key.IndexOf('_');if(dash<=0)return null;
      var rows=TestPanelModel.Tracks(events,key.Substring(0,dash));int at=Array.FindIndex(rows,r=>r.Key==key);
      if(at<0)return null;
      for(int i=at+1;i<rows.Length;i++)if(rows[i].Open&&rows[i].Career)return rows[i];
      return null;
    }
  }
}
