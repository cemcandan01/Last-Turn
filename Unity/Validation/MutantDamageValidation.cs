using System.Security.Cryptography;
using System.Text.Json;
using LastTurn.Core;

internal static class MutantDamageValidation
{
  private static string Root => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
  private static CatalogNode Catalog => CatalogNode.Parse(File.ReadAllText(Path.Combine(Root,"Unity/Assets/LastTurn/Resources/mutant-catalog.json")));
  private static MutantSkillWorld World() => new() {
    Racing=true, Player=CatalogNode.Parse("{\"x\":0,\"z\":0,\"vx\":0,\"vz\":20,\"y\":0,\"vy\":0,\"h\":0}"),
    Targets=CatalogNode.Parse("[{\"id\":\"r\",\"x\":0,\"z\":0,\"vx\":0,\"vz\":0}]")
  };
  private static MutantRun NewRun()
  {
    var r=new MutantRun(53,Catalog);r.State.Set("faz",CatalogNode.Str("surus"));
    r.State.Set("pasifler",CatalogNode.Parse("[\"carpisma-pili\",\"hasar-bataryasi\"]"));
    r.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"risk-taker\",\"seviye\":1,\"eklentiler\":[\"kor-cekirdegi\"],\"evrim\":null}]"));
    var skill=MutantSkills.Initialize();skill["yerel"].Set("risk-taker",CatalogNode.Parse("{\"kalan\":1,\"iz\":[[0,0,1.5]]}"));r.State.Set("bec",skill);return r;
  }
  private static string[] ValidTrace(int fps=60)
  {
    var r=NewRun();var controller=new MutantEnergyController(r);var rows=new List<string>();
    double accumulator=0;int tick=0;
    for(int frame=0;frame<fps;frame++) {
      accumulator+=1d/fps;
      while(accumulator+1e-12>=1d/60) {
        if(tick==0||tick==20)r.Damage("carpma");
        controller.Step(new DriftObserverInput { Vz=20 },World(),Array.Empty<CatalogNode>(),1d/60,false,Array.Empty<string>());
        rows.Add(r.Snapshot().ToString());tick++;accumulator-=1d/60;
      }
    }
    return rows.ToArray();
  }
  private static string ReplayTrace(int fps)
  {
    var r=NewRun();var c=new MutantEnergyController(r);CatalogNode? notice=null;int tick=0;double accumulator=0;
    var roots=new List<string>();r.DamageEvents.Observe=e=>{if(e.Identity!=null)roots.Add(e.Identity.Id+":"+e.Seq.ToString(System.Globalization.CultureInfo.InvariantCulture));};
    for(int frame=0;frame<fps;frame++){
      accumulator+=1d/fps;
      while(accumulator+1e-12>=1d/60){
        if(tick==0||tick==20){r.Damage("carpma");notice=r.State["bekleyenHasar"];}
        if(tick==1||tick==21)r.State.Set("bekleyenHasar",notice!);
        c.Step(new DriftObserverInput{Vz=20},World(),Array.Empty<CatalogNode>(),1d/60,false,Array.Empty<string>());
        tick++;accumulator-=1d/60;
      }
    }
    if(tick!=60||r.DamageEvents.Replays!=2)throw new Exception("FPS tekrar senaryosu eksik");
    return r.State.ToString()+string.Join("|",roots);
  }
  public static void Run()
  {
    var before=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-damage-before.json")));
    var expected=before.RootElement.GetProperty("states").EnumerateArray().Select(x=>x.GetString()).ToArray();
    foreach(int fps in new[]{30,60,120})if(!ValidTrace(fps).SequenceEqual(expected))throw new Exception("Geçerli hasar izi değişti FPS="+fps);
    var checks=LastTurn.EditorValidation.MutantDamageScenarios.Verify(Catalog);
    checks.AddRange(LastTurn.EditorValidation.MutantDamageScenarios.VerifyGiven(Catalog));
    var checkpoint=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/mutant-given-before.json")));
    var currentHashes=ValidTrace().Select(s=>Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(s))).ToLowerInvariant());
    if(!currentHashes.SequenceEqual(checkpoint.RootElement.GetProperty("states").EnumerateArray().Select(e=>e.GetString())))throw new Exception("b465ec8 HasarVerildi geçerli izi değişti");
    string replay=ReplayTrace(60);
    foreach(int fps in new[]{30,120})if(ReplayTrace(fps)!=replay)throw new Exception("Tekrar güvenliği FPS'ye bağlı "+fps);
    checks.Add("Replay ve kök/ebeveyn/türev izi 30/60/120 FPS'de aynı");
    string given=GivenReplayTrace(60);foreach(int fps in new[]{30,120})if(GivenReplayTrace(fps)!=given)throw new Exception("HasarVerildi FPS izi değişti");
    checks.Add("HasarVerildi replay kimliği30/60/120 FPS'de aynı");
    var first=CatalogNode.Parse(expected[0]!);var second=CatalogNode.Parse(expected[1]!);
    if(!first["bekleyenBeceri"].Items.Any(e=>e["tur"].S()=="HasarVerildi")||second["mek"]["telemetri"]["hasar-bataryasi"]["kazanc"].N()<=0)throw new Exception("Gerçek skill türevi sonraki adımda enerjiye ulaşmadı");
    string[] sources={"MutantDamageEvents.cs","MutantMechanics.cs","MutantRun.cs","MutantEnergyController.cs"};
    var hashes=sources.ToDictionary(p=>p,p=>Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(Root,"Unity/Assets/LastTurn/Scripts/Core",p)))).ToLowerInvariant());
    Directory.CreateDirectory(Path.Combine(Root,"tests/cikti"));
    File.WriteAllText(Path.Combine(Root,"tests/cikti/mutant-damage-proof.json"),JsonSerializer.Serialize(new{result="passed",utc=DateTime.UtcNow,checks,legacyStates=60,renderRates=new[]{30,60,120},sources=hashes},new JsonSerializerOptions{WriteIndented=true}));
    Console.WriteLine($"Hasar izi: {checks.Count} dar kontrol; 30/60/120 FPS ×60 eski geçerli adım aynı; gerçek skill türevi sonraki adımda enerjiye ulaştı.");
  }
  private static string GivenReplayTrace(int fps)
  {
    var r=NewRun();var c=new MutantEnergyController(r);double acc=0;int tick=0;CatalogNode? pending=null;var trace=new List<string>();
    r.DamageEvents.Observe=e=>{if(e.Identity!=null)trace.Add(e.Identity.Id+":"+e.Seq.ToString(System.Globalization.CultureInfo.InvariantCulture));};
    for(int f=0;f<fps;f++){acc+=1d/fps;while(acc+1e-12>=1d/60){
      if(tick==20)r.State.Set("bekleyenBeceri",r.DamageEvents.CloneEvents(pending!));
      c.Step(new DriftObserverInput{Vz=20},World(),Array.Empty<CatalogNode>(),1d/60,false,Array.Empty<string>());
      if(tick==0)pending=r.State["bekleyenBeceri"];tick++;acc-=1d/60;
    }}
    if(r.DamageEvents.Replays<1)throw new Exception("HasarVerildi FPS replay denenmedi");
    return r.State.ToString()+string.Join("|",trace);
  }
}
