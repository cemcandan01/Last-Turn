using LastTurn.Core;

internal static class ChampionshipValidation
{
  public static void Run()
  {
    int checks=0;
    void Check(bool ok,string name){if(!ok)throw new Exception(name);checks++;}
    var c=new RivalChampionship();c.Begin(0);
    Check(!c.Finish(0,new[]{0,0,2,3}),"Tekrarlı sıra reddi");
    Check(c.Finish(0,new[]{0,1,2,3}),"İlk yarış");
    Check(!c.Finish(0,new[]{0,1,2,3}) && c.Points[0]==10,"Tekrar kaydetme puan katlamaz");
    c=RivalChampionship.Load(CatalogNode.Parse(c.Save().ToString()));
    Check(c.Round==1 && c.Points[0]==10 && c.Track=="gp_2","Disk biçimiyle devam");
    c.Finish(1,new[]{1,0,3,2});c.Finish(2,new[]{0,1,2,3});
    Check(c.Complete && c.Unlocked && c.Standings[0]==0 && c.Points[0]==26,"Final ve kozmetik ödül");
    Check(!c.Finish(3,new[]{0,1,2,3}),"Tamamlanmış kupa tekrar puan vermez");
    c.Begin(0);Check(c.Round==0 && c.Points.Sum()==0 && c.Unlocked,"Rövanş ödülü korur");
    c.Finish(0,new[]{0,1,2,3});c.Finish(1,new[]{1,0,2,3});c.Finish(2,new[]{2,3,1,0});
    Check(c.Standings[0]==1,"Puan tablosu lideri");
    var f=new DrivingFeedback();
    var self=new OpponentTrafficCar(0,0,0,0,15,0,1.8,4.4);
    void Step(int n,int rank=3,bool drift=false,bool contact=false,int lap=0)
    {for(int i=0;i<n;i++)f.Step(1.0/60,self,Array.Empty<OpponentTrafficCar>(),rank,lap,3,true,drift,contact,false);}
    Step(120);Step(1,2);Check(f.Current=="TEMİZ SOLLAMA","Temiz sollama");
    int serial=f.Serial;Step(1,1);Check(f.Serial==serial,"Bildirim bekleme süresi");
    Step(200,1,true);Step(1,1);Check(f.Current=="TEMİZ DRİFT ÇIKIŞI","Temiz drift çıkışı");
    Step(250,1);Step(1,1,false,false,2);Check(f.Current.StartsWith("SON TUR"),"Son tur");
    f=new DrivingFeedback();Step(120,3,true);Step(1,2,false,true);Check(f.Serial==0,"Temaslı drift ve sollamaya temiz bildirimi yok");
    f=new DrivingFeedback();
    var other=new OpponentTrafficCar(2.2,0,3,0,10,0,1.8,4.4);
    for(int i=0;i<120;i++)f.Step(1.0/60,self,new[]{other},3,0,3,true,false,false,false);
    other=new OpponentTrafficCar(2.2,0,-1,0,10,0,1.8,4.4);
    f.Step(1.0/60,self,new[]{other},3,0,3,true,false,false,false);
    Check(f.Current=="YAKIN GEÇİŞ","Gerçek yakınlıkta önden arkaya geçiş");
    f=new DrivingFeedback();
    for(int i=0;i<120;i++)f.Step(1.0/60,self,new[]{other},3,0,3,true,false,false,false);
    Check(f.Serial==0,"Zaten arkadaki araç yakın geçiş oluşturmaz");
    Console.WriteLine("Şampiyona ve sürüş geri bildirimi "+checks+" kontrol geçti.");
  }
}
