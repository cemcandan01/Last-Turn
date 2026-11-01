using LastTurn.Core;

internal static class TestPanelValidation
{
  public static void Run()
  {
    string assets=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../Assets/LastTurn/Resources"));
    var catalog=new VehicleCatalog(File.ReadAllText(Path.Combine(assets,"vehicle-catalog.json")));
    var races=new RaceEventCatalog(File.ReadAllText(Path.Combine(assets,"race-events.json")));
    var state=new GarageState(catalog);string before=state.Snapshot().ToString();
    var rows=RaceViewModel.Events(state,races);int checks=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new InvalidOperationException(label);}
    Check(TestPanelModel.Tabs.Length==5,"Beş ayrı bölüm");
    foreach(string type in TestPanelModel.Types)
    {
      var tracks=TestPanelModel.Tracks(rows,type);Check(tracks.Length==8,type+" sekiz pist");
      for(int i=0;i<8;i++)Check(tracks[i].Key==type+"_"+(i+1) && tracks[i].Name.Length>0,type+" sıralı ad/anahtar");
    }
    Check(rows.Single(r=>r.Key=="dg_1").Open,"Yeni oyuncu dg_1 erişimi");
    Check(TestPanelModel.Tracks(rows,"yok").Length==0,"Bilinmeyen tür");
    foreach(int width in new[]{360,640,800,1280,1920})Check(TestPanelModel.Columns(width)>=2 && TestPanelModel.Columns(width)<=5 && TestPanelModel.ContentWidth(width)<width,"Uyarlanır sunum "+width);
    Check(before==state.Snapshot().ToString(),"Gezinme ekonomi/kaydı değiştirmiyor");
    Console.WriteLine($"Test paneli: {checks} kontrol; 5 tür × 8 pist, dg_1 açık, sıralama ve sunum aralıkları geçti.");
  }
}
