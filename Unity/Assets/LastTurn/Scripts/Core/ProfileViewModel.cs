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
  }
}
