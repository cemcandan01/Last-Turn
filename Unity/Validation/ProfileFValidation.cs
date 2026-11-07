using LastTurn.Core;

internal static class ProfileFValidation
{
  public static void Run()
  {
    string root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));string Text(string file)=>File.ReadAllText(Path.Combine(root,"Assets/LastTurn/Resources/"+file));
    var catalog=new VehicleCatalog(Text("vehicle-catalog.json"));var events=new RaceEventCatalog(Text("race-events.json"));int checks=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("Profil F: "+label);}
    foreach(double xp in new[]{0,100,500,5000,100000})
    {
      var state=new GarageState(catalog);state.AddXp(xp);state.AddMoney(12450);var profile=new RaceProfile{Races=48,Wins=12,Km=312};profile.Rename("  Test Sürücüsü  ");profile.Use[10]=21;profile.Use[11]=3;
      string before=state.Snapshot().ToString(),saved=profile.Snapshot().ToString();var m=ProfileViewModel.Read(state,profile,events);var expected=CareerMenuModel.Read(state,profile,events);
      Check(m.Summary.Name==expected.Name&&m.Summary.Money==expected.Money&&m.Summary.Level==state.Level,"Gerçek profil ve ilerleme");
      Check(m.Summary.Races==48&&m.Summary.Wins==12&&m.Summary.Km==312,"Mevcut sayaçlar");
      Check(m.FavoriteUses==21&&m.Favorite.Name==GarageViewModel.Cars(state)[10].Name,"Favori araç ve kullanım");
      Check(m.LevelFill>=0&&m.LevelFill<=1&&m.RemainingXp==expected.NextLevelXp-xp,"Seviye halkası ve kalan XP");
      Check(state.Snapshot().ToString()==before&&profile.Snapshot().ToString()==saved,"Okuma kayıt/ekonomiyi değiştirmez");
    }
    Check(ProfileViewModel.Validate("bad","abcdef","abcdef",true)=="Geçerli bir e-posta yaz","Bozuk e-posta");
    Check(ProfileViewModel.Validate("ui@example.test","short","short",true)=="Şifre en az 6 karakter olmalı","Kısa şifre");
    Check(ProfileViewModel.Validate("ui@example.test","abcdef","abcdefg",true)=="Şifreler aynı değil","Şifre tekrarı");
    Check(ProfileViewModel.Validate(" ui@example.test ","abcdef","",false)=="","Giriş tekrar şifresi istemez");
    Check(ProfileViewModel.Validate("ui@example.test","abcdef","abcdef",true)=="","Geçerli yeni hesap formu");
    Check(ProfileViewModel.ValidateReset("bad")=="Önce e-postanı yaz"&&ProfileViewModel.ValidateReset("ui@example.test")=="","Sıfırlama yalnız e-postayı doğrular");
    Console.WriteLine($"Profil F: {checks} kontrol; gerçek sayaç/favori/XP, mutasyonsuz sunum ve mevcut hesap form metinleri.");
  }
}
