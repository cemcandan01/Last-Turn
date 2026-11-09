using LastTurn.Core;

internal static class MutantChestValidation
{
  public static void Run()
  {
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    var catalog=CatalogNode.Parse(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/mutant-catalog.json")));
    var vehicles=new VehicleCatalog(File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources/vehicle-catalog.json")));int checks=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception(label);}
    foreach(uint seed in new uint[]{1,7,53,101,999})foreach(bool accept in new[]{true,false})
    {
      var r=new MutantRun(seed,catalog);r.Choose(r.State["secenekler"][0].S());
      foreach(int id in new[]{0,1,2})
      {
        string before=r.State.ToString();var m=MutantMenuModel.Read(r,vehicles,0);Check(r.State.ToString()==before&&!m.Chests.Single(c=>c.Id==id).Inspected,"Model teklif üretmez");
        string offer=r.ChestOffer(id)!;before=r.State.ToString();Check(offer!=""&&r.ChestOffer(id)==offer&&r.State.ToString()==before,"Teklif yeniden üretilmez");
        var c=MutantMenuModel.Read(r,vehicles,0).Chests.Single(c=>c.Id==id);Check(c.CanAccept&&c.Name!=""&&c.Description!=""&&c.IconKey.EndsWith(offer),"Gerçek teklif sunumu");
        Check(!r.AcceptChest(id,"__stale__")&&r.State.ToString()==before,"Eski teklif salt reddedilir");
        Check(accept?r.AcceptChest(id,offer):r.RejectChest(id),"Mevcut komut uygulanır");
        before=r.State.ToString();Check(!r.AcceptChest(id,offer)&&!r.RejectChest(id)&&r.ChestOffer(id)==null&&r.State.ToString()==before,"Tek tüketim");
        Check(!MutantMenuModel.Read(r,vehicles,0).Chests.Single(c=>c.Id==id).CanAccept,"Açılmış teklif kapalı");
      }
      beforeInvalid(r);
    }
    void beforeInvalid(MutantRun r){string s=r.State.ToString();Check(!r.AcceptChest(-1,"x")&&!r.RejectChest(-1)&&r.ChestOffer(-1)==null&&s==r.State.ToString(),"Eksik sandık güvenli");}
    Console.WriteLine($"B sandık: {checks} kontrol geçti; teklif/tek tüketim/lanetli-normal/salt model.");
  }
}
