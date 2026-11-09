using System;
using System.Linq;
using System.Text.RegularExpressions;

namespace LastTurn.Core
{
  // Salt profil sunumu ve mevcut form metinleri; hesap/eşitleme kuralları CloudAccount'ta kalır.
  public sealed class ProfileViewModel
  {
    public CareerMenuModel Summary=null!;public double LevelFill,RemainingXp;public int FavoriteUses;public GarageCarDetail Favorite=null!;
    public static ProfileViewModel Read(GarageState state,RaceProfile profile,RaceEventCatalog races)
    {
      var summary=CareerMenuModel.Read(state,profile,races);double start=VehicleCatalog.LevelBase(summary.Level);
      var favorite=profile.Use.OrderByDescending(p=>p.Value).ThenBy(p=>p.Key).FirstOrDefault();
      bool valid=profile.Use.Count>0&&favorite.Key>=0&&favorite.Key<GarageViewModel.Cars(state).Length;
      return new ProfileViewModel{Summary=summary,LevelFill=Math.Max(0,Math.Min(1,(summary.Xp-start)/Math.Max(1,summary.NextLevelXp-start))),RemainingXp=Math.Max(0,summary.NextLevelXp-summary.Xp),FavoriteUses=valid?favorite.Value:0,Favorite=valid?GarageViewModel.Detail(state,favorite.Key):null!};
    }
    public static bool EmailOk(string email)=>Regex.IsMatch(email.Trim(),@"^\S+@\S+\.\S+$");
    public static string Validate(string email,string password,string repeated,bool create)
      =>!EmailOk(email)?"Geçerli bir e-posta yaz":password.Length<6?"Şifre en az 6 karakter olmalı":create&&password!=repeated?"Şifreler aynı değil":"";
    public static string ValidateReset(string email)=>EmailOk(email)?"":"Önce e-postanı yaz";
    /// TS hesap-ui listeHtml satırı: tür, etiket, son seviye, şu an / admin işareti.
    public static string AccountLine(KnownAccount h,bool current)=>(h.Yol=="google"?"Google":"E-posta")+" · "+h.Label+" · Seviye "+h.Level+(current?" · şu an":"")+(h.Admin?" · Admin":"");
    /// TS hesap-ui adminHtml öğe listesi: araçlar ve kariyer pistleri (yıldız anahtarı).
    public static (string Key,string Label)[] AdminItems(GarageState state,RaceEventCatalog races)
      =>state.AdminKeys().Select(k=>(k,k.StartsWith("arac_",StringComparison.Ordinal)
        ?"Araç: "+state.Catalog.Data["cars"][int.Parse(k.Substring(5),System.Globalization.CultureInfo.InvariantCulture)]["n"].S()
        :"Pist: "+(races.Events.FirstOrDefault(e=>RaceStars.Key(e.Type,e.Level)==k)?.Name??k))).ToArray();
    /// TS hasv: 1–99 tam sayı.
    public static bool Level(string text,out int level)=>int.TryParse((text??"").Trim(),System.Globalization.NumberStyles.None,System.Globalization.CultureInfo.InvariantCulture,out level)&&level>=1&&level<=99;
  }
}
