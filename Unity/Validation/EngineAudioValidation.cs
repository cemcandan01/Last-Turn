using LastTurn.Core;

internal static class EngineAudioValidation
{
  public static void Run()
  {
    var reference=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"../../../Reference/engine-audio-0.8.18.json")));
    EngineAudioMixer mix=new();string prior="";int checks=0,rows=0;double maxError=0;
    foreach(var r in reference["rows"].Items){string key=r["key"].S()+"/"+r["fps"].N();if(key!=prior){mix=new EngineAudioMixer();prior=key;}
      mix.Step(r["time"].N(),r["dt"].N(),r["rpm"].N(),r["gas"].N(),r["shift"].B(),r["speed"].N(),r["boost"].IsNumber?r["boost"].N():null,r["volume"].N(),r["max"].N(),r["layers"].Items.Select(x=>x.N()).ToArray(),r["vtec"].N(),r["turbo"].N(),r["compressor"].N(),r["gears"].N());
      var actual=new List<double>{mix.Load,mix.Boost,mix.Gain,mix.VtecDb};for(int i=0;i<5;i++)actual.AddRange(new[]{mix.Gas[i],mix.Off[i],mix.Pitch[i]});
      actual.AddRange(new[]{r["turbo"].N()>0?mix.TurboHz:0,mix.TurboGain,r["turbo"].N()>0?mix.NoiseHz:0,mix.NoiseGain,r["compressor"].N()>0?mix.CompressorHz:0,mix.CompressorGain,r["gears"].N()>0?mix.GearHz:0,mix.GearGain});
      var expected=r["expected"].Items.Select(x=>x.N()).ToArray();if(actual.Count!=expected.Length)throw new Exception("Motor hedef alanı farklı");
      for(int i=0;i<actual.Count;i++){double error=Math.Abs(actual[i]-expected[i]);maxError=Math.Max(maxError,error);checks++;if(!double.IsFinite(actual[i])||error>1e-10)throw new Exception("TS motor hedef farkı "+key+"/"+rows+"/"+i+" "+actual[i]+" != "+expected[i]);}rows++;
    }
    foreach(var p in new[]{(.5,false),(.5001,true),(.82,false),(1.7,false),(1.7001,true),(3.1,false),(5d,false)}){checks++;if(EngineAudioMixer.ListenGas(p.Item1)!=p.Item2)throw new Exception("TS dinleme gaz aralığı farklı");}
    if(rows!=1620)throw new Exception("Motor iz kapsamı eksik");Console.WriteLine($"TS motor karışımı: {checks} hedef/{rows} kare/15 araç/30-60-120 FPS, en büyük fark {maxError:G4} (1e-10); dinleme sınırları geçti. İşitme kabulü değil.");
  }
}
