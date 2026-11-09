using System.Text.Json;
using LastTurn.Core;
internal static class RemoteSnapshotValidation
{
  public static void Run()
  {
    int count=0;double max=0;void Check(bool ok,string label){count++;if(!ok)throw new Exception("Uzak görüntü: "+label);}
    void Near(double x,double y,string label){max=Math.Max(max,Math.Abs(x-y));Check(Math.Abs(x-y)<1e-9,label);}
    using var json=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/remote-snapshots-0.8.18.json")));
    Check(json.RootElement.GetProperty("fields").EnumerateArray().Select(x=>x.GetString()).SequenceEqual(RemoteSnapshots.Fields),"Alan sırası");
    foreach(var c in json.RootElement.GetProperty("cases").EnumerateArray()){
      var r=new RemoteSnapshots();foreach(var step in c.GetProperty("steps").EnumerateArray()){
        var frame=step.GetProperty("frame");if(frame.ValueKind!=JsonValueKind.Null)r.Add(frame.EnumerateArray().Select(x=>x.GetDouble()).ToArray());
        r.Step(step.GetProperty("dt").GetDouble());Near(r.Clock,step.GetProperty("clock").GetDouble(),"Saat");Check(r.Count==step.GetProperty("count").GetInt32()&&r.Ready==step.GetProperty("ready").GetBoolean(),"Tampon/yeniden başlama");
        int i=0;foreach(var v in step.GetProperty("show").EnumerateArray())Near(r.Show[i++],v.GetDouble(),"Gösterim");i=0;foreach(var v in step.GetProperty("wheel").EnumerateArray())Near(r.WheelAngles[i++],v.GetDouble(),"Teker açısı");
      }
    }
    var buffer=new RemoteSnapshots();var valid=RemoteSnapshots.Empty();valid[1]=42;buffer.Add(valid);valid[1]=-7;Check(buffer.Show[1]==42,"Girdi kopyası");
    Check(!buffer.Add(new double[2])&&!buffer.Add(Enumerable.Repeat(double.NaN,28).ToArray()),"Bozuk paket güvenli ret");
    var carA=new PowertrainVehicle(GtPrototypeParameters.Create());var carB=new PowertrainVehicle(GtPrototypeParameters.Create());var feed=new DelayedGhostFeed();
    carA.Stepped+=v=>feed.Observe(RemoteSnapshots.Capture(v));
    for(int i=0;i<360;i++){
      var input=new DrivingInput(1,0,i<240?.1:0);carA.Step(input);carB.Step(input);feed.Remote.Step(1/60d);
      Check(RemoteSnapshots.Capture(carA).SequenceEqual(RemoteSnapshots.Capture(carB)),"Gözlemci fizik durumunu değiştirmedi");
      if(i<122)Check(!feed.Remote.Ready,"2 sn teslimden önce yok");
    }
    Check(feed.Remote.Ready&&feed.Remote.Show[0]<carA.Body.Steps/60d-1.9,"Gecikmiş gerçek fizik görüntüsü");
    Console.WriteLine($"Uzak görüntü: {count} kontrol/540 TS adımı; fark {max:E2};30/60/120 FPS, bozuk/tekrar/yeniden başlama ve salt fizik gözlemi.");
  }
}
