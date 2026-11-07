using System.Security.Cryptography;
using System.Text.Json;
using LastTurn.Core;

internal static class MutantPilotValidation
{
  public static void Run()
  {
    string root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
    string catalogPath = Path.Combine(root, "Unity/Assets/LastTurn/Resources/mutant-catalog.json");
    var catalog = CatalogNode.Parse(File.ReadAllText(catalogPath));
    int checks = 0;
    void Check(bool ok, string label) { checks++; if (!ok) throw new Exception("M1: " + label); }
    void Near(double a, double b, string label) => Check(double.IsFinite(b) && Math.Abs(a - b) < 1e-8, label + $" ({a:R}/{b:R})");
    MechanicEvent Nitro(int seq) => new() { Kind = "AbilityActivated", Ability = "nitro", Seq = seq };
    MechanicEvent Drift(int seq) => new() { Kind = "DriftTickQualified", Speed = 20, Angle = .4, Dt = MutantMechanicPilot.FixedDelta, Seq = seq };

    // Üç gerçek katalog etkileşimi; eşik altından enerji üretip aynı nitro mekanizmasını kullanır.
    var drift = new MutantMechanicPilot(catalog, new[] { "drift-harvester" });
    Check(drift.TryStep(new[] { Nitro(0) }), "başlangıç nitrosu");
    for (int i = 1; i <= 420; i++) Check(drift.TryStep(new[] { Drift(i) }), "drift enerji adımı");
    Near(59.5, drift.Snapshot.Energy, "7 sn drift: (2,5+6)×7");
    Check(drift.TryStep(new[] { Nitro(421) }), "drift nitroya dönüşür");
    Near(19.5, drift.Snapshot.Energy, "drift nitrosu 40 tüketir");
    Near(1.6, MutantMechanics.PowerMultiplier(drift.Snapshot), "drift nitrosu güç sağlar");

    var hit = new MutantMechanicPilot(catalog, new[] { "carpisma-pili", "ek-hasar-donusturucu" });
    Check(hit.TryStep(new[] { Nitro(0) }), "hasar deneyi depoyu harcar");
    for (int i = 0; i < 421; i++) Check(hit.TryStep(Array.Empty<MechanicEvent>()), "normal bekleme");
    Check(hit.TryStep(new[] { new MechanicEvent { Kind = "HasarAlindi", Amount = 12, Seq = 1 } }), "bir hasar iki bağımsız üreticiyi tetikler");
    Near(27, hit.Snapshot.Energy, "hasar 12+15 enerji");
    Check(hit.TryStep(new[] { Nitro(2) }), "yetersiz enerji isteği geçerli girdi");
    Near(27, hit.Snapshot.Energy, "yetersiz enerji harcanmaz");
    Check(hit.TryStep(new[] { new MechanicEvent { Kind = "HasarAlindi", Amount = 12, Seq = 3 } }), "ikinci hasar");
    Check(hit.TryStep(new[] { Nitro(4) }), "hasar nitroya dönüşür");
    Near(14, hit.Snapshot.Energy, "hasar nitrosu gerçek bedeli öder");

    var follow = new MutantMechanicPilot(catalog, new[] { "takip-dinamosu", "verimli-nitro" });
    Check(follow.TryStep(new[] { Nitro(0) }), "verimli nitro");
    Near(12, follow.Snapshot.Energy, "verimli nitro 28 tüketir");
    for (int i = 1; i <= 421; i++) Check(follow.TryStep(new[] { new MechanicEvent { Kind = "YakinTakip", Dt = 1d/60, Seq = i } }), "takip girdi adımı");
    double beforeNitro = follow.Snapshot.Energy;
    Check(follow.TryStep(new[] { Nitro(422) }), "takip nitroya dönüşür");
    Near(beforeNitro - 28, follow.Snapshot.Energy, "takip verimli maliyet");

    // Tekrar/NaN/zaman/harici türev atomik reddedilir; bekleme bu yolla atlanamaz.
    void Reject(IReadOnlyList<MechanicEvent> batch, double dt, string label)
    {
      string before = hit.Snapshot.ToNode().ToString();
      Check(!hit.TryStep(batch, dt), label);
      Check(hit.Snapshot.ToNode().ToString() == before, label + " atomik");
    }
    Reject(new[] { new MechanicEvent { Kind = "HasarAlindi", Amount = 12, Seq = 3 } }, 1d/60, "aynı kök tekrar ödül üretemez");
    Reject(new[] { new MechanicEvent { Kind = "EnergyGained", Amount = 50, Source = "ek-hasar-donusturucu", Seq = 5 } }, 1d/60, "türev enerji yeniden kök olamaz");
    Reject(new[] { new MechanicEvent { Kind = "HasarAlindi", Amount = double.NaN, Seq = 5 } }, 1d/60, "NaN kaynak");
    Reject(new[] { new MechanicEvent { Kind = "HasarAlindi", Amount = double.PositiveInfinity, Seq = 5 } }, 1d/60, "sonsuz kaynak");
    Reject(new[] { Nitro(5), Nitro(5) }, 1d/60, "parti içi aynı sıra");
    Reject(new[] { Nitro(6), Nitro(5) }, 1d/60, "gerileyen sıra sessizce sıralanmaz");
    Reject(new[] { Nitro(5), new MechanicEvent { Kind = "EnergyGained", Seq = 6 } }, 1d/60, "sonraki geçersiz olay önceki nitroyu çalıştırmaz");
    Reject(new[] { new MechanicEvent { Kind = "HasarAlindi", Amount = 1, Seq = 5.5 } }, 1d/60, "kesir sıra");
    Reject(new[] { new MechanicEvent { Kind = "HasarAlindi", Amount = 1, Seq = 9007199254740992 } }, 1d/60, "güvenli tamsayı sınırı");
    Reject(Enumerable.Range(5, 65).Select(Nitro).ToArray(), 1d/60, "kök parti 64 sınırı");
    foreach (double dt in new[] { 0d, -1d, double.NaN, double.PositiveInfinity, 1d/30, .1 }) Reject(Array.Empty<MechanicEvent>(), dt, "geçersiz sabit zaman " + dt);
    string detached = hit.Snapshot.ToNode().ToString(); var copy = hit.Snapshot; copy.Energy = 999;
    Check(hit.Snapshot.ToNode().ToString() == detached, "gözlemci iç durumu yazamaz");
    double left = hit.Snapshot.EffectLeft;
    Check(hit.TryStep(new[] { Nitro(5) }), "aktifken nitro isteği");
    Near(left - 1d/60, hit.Snapshot.EffectLeft, "aktif nitro tekrar uzamaz");
    Near(14, hit.Snapshot.Energy, "aktif nitro ikinci bedel almaz");

    // Derinlik ve işlem sınırı olan eski mekanizma kullanılır; oyun kataloğuna yapay skill eklenmez.
    var synthetic = new[] {
      new MechanicDefinition { Id="root", Trigger="HasarAlindi", Gain=1 },
      new MechanicDefinition { Id="echo-a", Trigger="EnergyGained", Gain=1 },
      new MechanicDefinition { Id="echo-b", Trigger="EnergyGained", Gain=1 }
    };
    var bounded = MutantMechanics.Step(MutantMechanics.Start(), new[] { new MechanicEvent { Kind="HasarAlindi", Amount=1, Seq=0 } }, synthetic, true);
    Near(3, bounded.Energy, "karşılıklı enerji yankıları adımda birer kez");
    Check(bounded.Telemetry.Values.All(t=>t.Triggers==1), "aynı adımda yinelenen türev yeniden ödüllendirilmez");

    string[] perks = { "drift-harvester", "verimli-nitro", "uzun-nitro", "genis-tup", "sert-nitro", "ek-turbo-kartusu" };
    MechanicState Trace(int fps, IEnumerable<string> passives)
    {
      var p = new MutantMechanicPilot(catalog, passives); double accumulator = 0; int tick=0;
      for(int frame=0;frame<fps*12;frame++) {
        accumulator+=1d/fps;
        while(accumulator+1e-12>=1d/60) {
          int seq=tick*2; var batch = new List<MechanicEvent> { Drift(seq) };
          if(tick%60==0)batch.Add(Nitro(seq+1));
          Check(p.TryStep(batch), "sabit adım izi"); accumulator-=1d/60;tick++;
        }
      }
      Check(tick==720,"12 sn 720 fizik adımı");return p.Snapshot;
    }
    var trace = Trace(60, perks);
    string canonical = trace.ToNode().ToString();
    foreach(int fps in new[]{30,120})Check(Trace(fps,perks).ToNode().ToString()==canonical,"FPS bağımsızlığı "+fps);
    var reversed=Trace(60,perks.Reverse());
    Near(trace.Energy,reversed.Energy,"kapsanan pasiflerin sıra bağımsız enerjisi");
    Near(trace.EffectLeft,reversed.EffectLeft,"sıra bağımsız süre");
    Near(trace.EffectPower,reversed.EffectPower,"sıra bağımsız güç");
    Check(trace.Energy>=0&&trace.Energy<=trace.Capacity&&trace.EffectPower<=1.9&&trace.EffectGrip<=1.4,"kaynak/fizik çarpanı sınırları");
    var dry = new MutantMechanicPilot(catalog, Array.Empty<string>());
    for(int i=0;i<1200;i++)Check(dry.TryStep(new[]{Nitro(i)}),"20 sn basılı nitro deneyi");
    Near(1,dry.Snapshot.Telemetry["nitro"].Triggers,"üreticisiz sürekli nitro yok");
    Near(0,dry.Snapshot.Energy,"kaynak yoktan üretilmez");
    var full = new MutantMechanicPilot(catalog, new[] { "drift-harvester", "genis-tup", "ek-yedek-tup", "genis-tup" });
    for (int i=0;i<1200;i++) Check(full.TryStep(new[]{Drift(i)}),"depo dolum sınırı");
    Near(180,full.Snapshot.Capacity,"tekrar takılan kapasite mekanizması iki kez sayılmaz");
    Near(180,full.Snapshot.Energy,"üretim kapasitede durur");
    Check(full.Snapshot.Telemetry["drift-harvester"].Gain < 120,"dolu depoda gerçek kazanç sayılır");

    // M0 ölçümü: sabit 128 tohum, gerçek Run API; sonuçlar sürüş simülasyonu DEĞİL.
    var initialOffers=new SortedDictionary<string,int>();var chestOffers=new SortedDictionary<string,int>();
    var stock=new SortedDictionary<string,int>();var bosses=new SortedDictionary<string,int>();
    void Count(SortedDictionary<string,int> d,string id){d.TryGetValue(id,out int n);d[id]=n+1;}
    var routes=new List<object>();double[] moneySum=new double[3],xpSum=new double[3];int[] choices=new int[3];
    for(uint seed=1;seed<=128;seed++) {
      var run=new MutantRun(seed,catalog);
      Check(run.State.ToString()==new MutantRun(seed,catalog).State.ToString(),"tohum tekrarı");
      foreach(var o in run.State["secenekler"].Items)Count(initialOffers,o.S());
      Count(bosses,run.State["boss"]["id"].S());
      foreach(var o in run.State["stok"].Items)Count(stock,o.S());
      Check(run.Choose(run.State["secenekler"][0].S()),"başlangıç seçimi");
      foreach(var chest in run.State["sandiklar"].Items) {
        string offer=run.ChestOffer((int)chest["id"].N())!;Count(chestOffers,offer);
        Check(run.ChestOffer((int)chest["id"].N())==offer,"sandık tekrarı aynı teklif");
      }
      for(int risk=0;risk<3;risk++) {
        var route=new MutantRun(seed,catalog);Check(route.Choose(route.State["secenekler"][0].S()),"rota başlangıcı");
        double beforeMoney=route.State["para"].N();
        foreach(var e in route.State["etkinlikler"].Items.ToArray()) {
          Check(route.FinishEvent((int)e["id"].N(),true,risk)!=null,"varsayımsal başarılı etkinlik");
          string snapshot=route.State.ToString();
          Check(route.FinishEvent((int)e["id"].N(),true,risk)==null&&route.State.ToString()==snapshot,"etkinlikten tekrar ödül yok");
          while(route.State["faz"].S()=="secim") { Check(route.Choose(route.State["secenekler"][0].S()),"rota ödülü");choices[risk]++; }
        }
        moneySum[risk]+=route.State["para"].N()-beforeMoney;xpSum[risk]+=route.State["xp"].N();
      }
    }
    for(int risk=0;risk<3;risk++)routes.Add(new{risk,seeds=128,meanMoney=moneySum[risk]/128,meanXp=xpSum[risk]/128,meanLevelChoices=choices[risk]/128d});
    string[] sources={"Unity/Assets/LastTurn/Scripts/Core/MutantMechanicPilot.cs","Unity/Assets/LastTurn/Scripts/Core/MutantMechanics.cs","Unity/Assets/LastTurn/Scripts/Core/MutantRun.cs","Unity/Assets/LastTurn/Resources/mutant-catalog.json","Unity/Validation/MutantPilotValidation.cs","Unity/Validation/audit-mutant-m0.py"};
    var hashes=sources.ToDictionary(s=>s,s=>Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(root,s)))).ToLowerInvariant());
    string proofPath=Path.Combine(root,"tests/cikti/mutant-m0-m1-proof.json");Directory.CreateDirectory(Path.GetDirectoryName(proofPath)!);
    File.WriteAllText(proofPath,JsonSerializer.Serialize(new{result="passed",utc=DateTime.UtcNow,checks,seeds=128,scope="Core M0/M1; no Unity Play or driving simulation",sourceHashes=hashes,initialOffers,chestOffers,stock,bosses,routes},new JsonSerializerOptions{WriteIndented=true}));
    Console.WriteLine($"Mutant M0/M1: {checks} kontrol; 128 tohum; 3 etkileşim, atomik girdi/döngü sınırı, 30/60/120 FPS; kanıt {proofPath}");
  }
}
