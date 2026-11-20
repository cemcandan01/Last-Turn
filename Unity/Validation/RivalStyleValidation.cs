using LastTurn.Core;
using System.Text.Json;
internal static class RivalStyleValidation
{
  public static void Run()
  {
    int checks=0;void Check(bool ok,string label){if(!ok)throw new Exception(label);checks++;}
    int count=201;double[] z=Enumerable.Range(0,count).Select(i=>i*2d).ToArray(),zero=new double[count],one=z.Select(_=>1d).ToArray();
    var row=CatalogNode.Parse(JsonSerializer.Serialize(new{key="test",personality="test",line=new{x=zero,z,o=zero,s=z,k=zero,cx=zero,cz=z,nx=one,nz=zero,len=400,hw=6,acik=true},speed=z.Select(_=>25d).ToArray()}));
    var plan=new OpponentPlan(row,CatalogNode.Parse("{\"ad\":\"test\",\"bakis\":18,\"bakisHiz\":0.5,\"tutarlilik\":1,\"tepki\":0,\"sabir\":8,\"kaymaSiniri\":0.7}"));
    OpponentTrafficCar At(double x,double z,double speed)=>new OpponentTrafficCar(x,1,z,0,speed,0,1.8,4.4);
    var self=At(0,20,20);var front=At(0,40,12);
    var aggressive=new OpponentTraffic(2){Style=RivalDrivingStyle.Doruk};
    var careful=new OpponentTraffic(2){Style=RivalDrivingStyle.Ece};
    var frame=new OpponentTrafficFrame(self,front);
    aggressive.Step(plan,10,frame,1d/60);careful.Step(plan,10,frame,1d/60);
    Check(aggressive.SpeedLimit>careful.SpeedLimit,"Doruk ve Ece farklı takip aralığı");
    Check(aggressive.Offset>careful.Offset,"Farklı çizgi değiştirme hızı");
    foreach(var style in new[]{RivalDrivingStyle.Doruk,RivalDrivingStyle.Ece,RivalDrivingStyle.Bora}){
      var control=new OpponentTraffic(2){Style=style};
      var left=At(2.9,22,20);var right=At(-2.9,22,20);
      control.Step(plan,10,new OpponentTrafficFrame(self,front,new[]{self,front,left,right}),1d/60);
      Check(control.Side==0,"İki yanı dolu araç geçiş başlatmaz "+style.Name);
      var open=new OpponentTraffic(2){Style=style};
      open.Step(plan,10,new OpponentTrafficFrame(self,front,new[]{self,front,left}),1d/60);
      Check(open.Side==-1,"Üçüncü araç dolu tarafı kapatır "+style.Name);
      open.Step(plan,10,new OpponentTrafficFrame(self,front,new[]{self,front,left,right}),1d/60);
      Check(open.State=="bosluk-bekle","Geçiş koridoru kapanınca bekle "+style.Name);
    }
    Console.WriteLine("Rakip karakteri "+checks+" kontrol geçti.");
  }
}
