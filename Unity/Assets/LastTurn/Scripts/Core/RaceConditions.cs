#nullable enable
using System;
using System.Collections.Generic;

namespace LastTurn.Core
{
  // TS cizim/ortam.ts COND + condOf + dunya/temalar.ts havaTutusu: günün saati, hava ve fiziksel hava tutuşu.
  // Görsel gökyüzü/sis/yağış görünümü grafik fazına aittir; tutuş ve seçim burada oynanış kuralıdır.
  public sealed class RaceConditions
  {
    public static readonly (string Key,string Name)[] TimesOfDay={("morning","Sabah"),("noon","Öğlen"),("evening","Akşam")};
    public static readonly (string Key,string Name,string Description)[] Weathers={("sun","Güneşli",""),("rain","Yağmurlu","Zemin daha kaygan"),("snow","Karlı","Zemin daha kaygan")};
    /// TS REG[i].th (tanımsız → "day"); Unity bölge anahtarı TS export-world sırasıyla (40 park, 41 city, hub bölge dışı).
    public static readonly string[] RegionThemes={"day","coast","day","mist","city","mount","day","day","quarry","day","mist","desert","day","coast","day","port","city","mount","day","day","quarry","mist","desert","snow","day","day","day","day","day","day","desert","snow","coast","snow","desert","quarry","coast","mount","day","day","day","day"};
    public string TimeOfDay="noon",Weather="sun";
    /// TS gece: tema gece temasıyken akşam ya da açık gece (boss); yalnız görünüm/HUD bilgisi.
    public bool Night;
    public static string Theme(int region)=>region>=0&&region<RegionThemes.Length?RegionThemes[region]:"day";
    /// Unity bölge anahtarından TS bölge teması: gp_1..dg_8 (TS export-world sırası), park, city; hub ve bilinmeyen day.
    public static string ThemeOf(string key)
    {
      if(key=="park")return Theme(40);if(key=="city")return Theme(41);
      var parts=key.Split('_');if(parts.Length!=2||!int.TryParse(parts[1],out int level))return "day";
      int type=Array.IndexOf(new[]{"gp","rx","dp","rl","dg"},parts[0]);if(type<0||level<1||level>8)return "day";
      return Theme(level<=6?type*6+level-1:30+type*2+level-7);
    }
    /// TS condOf: şehir/sahil/liman/dağ akşam, kar temasında kar; diğerleri öğlen/güneş.
    public static RaceConditions DefaultFor(string theme)=>new RaceConditions{TimeOfDay=theme is "city" or "coast" or "port" or "mount"?"evening":"noon",Weather=theme=="snow"?"snow":"sun"};
    /// TS havaTutusu.
    public static double Grip(string theme,string weather)=>weather=="rain"?.84:weather=="snow"?(theme=="snow"?.9:.74):1;
    public double GripFor(string theme)=>Grip(theme,Weather);
    public RaceConditions Clone()=>new RaceConditions{TimeOfDay=TimeOfDay,Weather=Weather,Night=Night};
    public string Label=>Array.Find(TimesOfDay,t=>t.Key==TimeOfDay).Name+(Night?" (gece)":"")+" • "+Array.Find(Weathers,w=>w.Key==Weather).Name;
    /// TS mutantBossKosulu: boss havası/gecesi dayatılır, yarış dönüşünde önceki koşul geri yüklenir.
    public RaceConditions ForBoss(CatalogNode boss)
    {
      var c=Clone();if(boss["hava"].S()!="")c.Weather=boss["hava"].S();if(boss["gece"].B()){c.Night=true;}return c;
    }
  }
  /// TS hayalet kaydı hava alanı: hayalet kaydedildiği havanın tutuşuyla oynar (yoksa güncel hava).
  public readonly struct GhostWeather
  {
    public readonly double Grip;public readonly bool Snowy;
    public GhostWeather(double grip,bool snowy){Grip=grip;Snowy=snowy;}
  }
}
