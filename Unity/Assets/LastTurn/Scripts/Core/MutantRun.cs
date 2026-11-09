using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  public readonly struct MutantRepairPreview
  {
    public readonly double Points, Cost, BodyAfter;
    public bool CanRepair=>Points>0;
    public bool Partial=>CanRepair&&BodyAfter<100;
    public MutantRepairPreview(double points,double cost,double bodyAfter){Points=points;Cost=cost;BodyAfter=bodyAfter;}
  }
  // TS 0.8.18 mutant-kosu: koşu ekonomisi ve envanteri. Beceri yürütücüsü ayrı adaptörden bağlanır.
  // Durum anahtarları kaynak TS adlarıdır; Unity/DOM, disk ve gerçek zaman bağımlılığı yoktur.
  public sealed class MutantRun
  {
    public CatalogNode State { get; }
    public CatalogNode Catalog { get; }
    // Kalıcı kayıt dışında, aynı Run/controller yeniden bağlansa da korunan hasar kimliği.
    public MutantDamageEvents DamageEvents { get; } = new MutantDamageEvents();
    private readonly SeededRandom random;
    private CatalogNode[] Tracks => Catalog["tracks"].Items.ToArray();
    private double N(string key)=>State[key].N();
    private string Phase {get=>State["faz"].S();set=>State.Set("faz",CatalogNode.Str(value));}
    public int Region => (int)N("bolge");
    public bool Finished => Phase=="bitti";
    private bool Test => State["test"].B();
    private static CatalogNode Bool(bool value)=>CatalogNode.Parse(value?"true":"false");
    private static CatalogNode Null()=>CatalogNode.Parse("null");
    private void Set(string key,double n)=>State.Set(key,CatalogNode.Num(n));
    private static void Set(CatalogNode obj,string key,double n)=>obj.Set(key,CatalogNode.Num(n));
    private string[] Strings(string key)=>State[key].Items.Select(x=>x.S()).ToArray();
    private static CatalogNode Array(IEnumerable<string> a)=>CatalogNode.Arr(a.Select(CatalogNode.Str));
    private void Strings(string key,IEnumerable<string> a)=>State.Set(key,Array(a));
    private static CatalogNode Obj(params (string key,CatalogNode value)[] fields){var o=CatalogNode.Obj();foreach(var p in fields)o.Set(p.key,p.value);return o;}
    private static int Round(double n)=>(int)Math.Floor(n+.5);
    private int Count(string id)=>Strings("pasifler").Count(x=>x==id);
    private double PickIndex(int count)=>Math.Floor(random.Next()*count);
    private T Pick<T>(IReadOnlyList<T> list)=>list[(int)PickIndex(list.Count)];
    private static T Take<T>(List<T> list,int i){var v=list[i];list.RemoveAt(i);return v;}
    private double Derived(uint salt,int n){uint seed;unchecked{seed=((uint)N("tohum")^salt)*31u+(uint)(n*7919);}return new SeededRandom(seed==0?1:seed).Next();}
    private CatalogNode[] PassiveDefinitions => Catalog["passives"].Items.Concat(Catalog["addons"].Items).ToArray();
    /// TS BOSS_SURESI(1): ilk boss'a kalan süre (sn); Mutant menüsü de bunu gösterir.
    public const double FirstBossSeconds=900;
    public MutantRun(uint seed,CatalogNode catalog,bool test=false)
    {
      Catalog=catalog;random=new SeededRandom(seed);State=CatalogNode.Obj();
      State.Set("tohum",CatalogNode.Num(seed));State.Set("test",Bool(test));Phase="basla";Set("bolge",1);
      State.Set("boss",Pick(Catalog["bosses"].Items.ToArray()).Clone());
      Set("kalan",test?90:FirstBossSeconds);Set("xp",0);Set("seviye",0);Set("bekleyenSecim",0);Set("para",150);
      foreach(string key in new[]{"pasifler","parcalar","stok","secenekler","etkinlikler","sandiklar","beceriler","bekleyenBeceri"})State.Set(key,CatalogNode.Arr(System.Array.Empty<CatalogNode>()));
      foreach(string key in new[]{"tamamlanan","yenilenBoss","zaman","carpma","spin","secimNo"})Set(key,0);
      Set("govde",100);State.Set("pert",Bool(false));State.Set("sonNefes",Bool(false));
      State.Set("mek",CatalogNode.Parse("{\"adim\":0,\"enerji\":40,\"kapasite\":100,\"sonSira\":-1,\"sonTetik\":{},\"telemetri\":{},\"kesilen\":0,\"driftAcik\":false,\"driftKazanci\":0,\"sonTemizBitis\":-1,\"yanan\":0,\"etkiKalan\":0,\"etkiBekleme\":0,\"etkiTutus\":1,\"etkiGuc\":1,\"etkiAdim\":0}"));
      State.Set("bekleyenHasar",Null());State.Set("bekleyenRisk",Null());
      DrawChoices();ArrangeEvents();ArrangeChests();ArrangeStock();
    }
    public CatalogNode Snapshot()=>State.Clone();
    private void ApplyCapacity()
    {
      double capacity=100;var ids=new HashSet<string>();foreach(string id in Strings("pasifler"))if(ids.Add(id)){
        var p=PassiveDefinitions.FirstOrDefault(x=>x["id"].S()==id);if(p!=null)capacity+=p["m"]["degistir"]["kapasite"].N();
      }
      capacity=Math.Max(100,Math.Min(200,capacity));Set(State["mek"],"kapasite",capacity);Set(State["mek"],"enerji",Math.Min(State["mek"]["enerji"].N(),capacity));
    }
    private CatalogNode? Skill(string id)=>State["beceriler"].Items.FirstOrDefault(x=>x["id"].S()==id);
    private CatalogNode? SkillDefinition(string id)=>Catalog["skills"].Items.FirstOrDefault(x=>x["id"].S()==id);
    private static bool Compatible(CatalogNode skill,CatalogNode addon)=>skill["etiketler"].Items.Any(x=>x.S()==addon["etiket"].S());
    public string[] SkillOffers()
    {
      var result=new List<string>();foreach(var definition in Catalog["skills"].Items){string id=definition["id"].S();var skill=Skill(id);
        if(skill==null){result.Add("b:"+id);continue;}
        if(skill["seviye"].N()<3)result.Add("y:"+id);
        else if(skill["evrim"].S()=="")foreach(var v in definition["evrimler"].Items)result.Add("v:"+id+":"+v["id"].S());
        if(skill["eklentiler"].Items.Count()<2)foreach(var e in Catalog["skillAddons"].Items)if(Compatible(definition,e)&&!skill["eklentiler"].Items.Any(x=>x.S()==e["id"].S()))result.Add("e:"+e["id"].S()+":"+id);
      }return result.ToArray();
    }
    private void DrawChoices()
    {
      var candidates=Catalog["passives"].Items.Where(p=>Count(p["id"].S())<p["en"].N()).Select(p=>p["id"].S()).ToList();var r=new List<string>();
      while(r.Count<3&&candidates.Count>0)r.Add(Take(candidates,(int)PickIndex(candidates.Count)));
      var offers=SkillOffers();Set("secimNo",N("secimNo")+1);if(offers.Length>0){string offer=offers[(int)Math.Floor(Derived(0x51ed27,(int)N("secimNo"))*offers.Length)];if(r.Count>=3)r[2]=offer;else r.Add(offer);}Strings("secenekler",r);
    }
    public bool Choose(string id,string drop="")
    {
      if((Phase!="basla"&&Phase!="secim")||!Strings("secenekler").Contains(id))return false;
      if(!id.Contains(":"))Strings("pasifler",Strings("pasifler").Append(id));else if(!ApplySkillOffer(id,drop))return false;
      if(Phase=="secim")Set("bekleyenSecim",Math.Max(0,N("bekleyenSecim")-1));ApplyCapacity();
      if(N("bekleyenSecim")>0){Phase="secim";DrawChoices();if(Strings("secenekler").Length>0)return true;}
      Phase="surus";Strings("secenekler",System.Array.Empty<string>());return true;
    }
    private void AddSkill(string id)=>State.Set("beceriler",CatalogNode.Arr(State["beceriler"].Items.Append(Obj(("id",CatalogNode.Str(id)),("seviye",CatalogNode.Num(1)),("eklentiler",Array(System.Array.Empty<string>())),("evrim",Null())))));
    public void RemoveSkill(string id){State.Set("beceriler",CatalogNode.Arr(State["beceriler"].Items.Where(x=>x["id"].S()!=id)));ApplyCapacity();}
    private bool ApplySkillOffer(string offer,string drop)
    {
      var p=offer.Split(':');string kind=p[0],id=p[1];var skill=Skill(id);var definition=SkillDefinition(id);
      if(kind=="b"){
        if(definition==null||skill!=null)return false;if(State["beceriler"].Items.Count()>=3){if(Skill(drop)==null)return false;RemoveSkill(drop);}AddSkill(id);return true;
      }
      if(kind=="y"){if(skill==null||skill["seviye"].N()>=3)return false;Set(skill,"seviye",skill["seviye"].N()+1);return true;}
      if(kind=="v"){
        if(p.Length!=3||skill==null||definition==null||skill["seviye"].N()<3||skill["evrim"].S()!=""||!definition["evrimler"].Items.Any(x=>x["id"].S()==p[2]))return false;
        skill.Set("evrim",CatalogNode.Str(p[2]));return true;
      }
      if(kind=="e"&&p.Length==3){skill=Skill(p[2]);definition=SkillDefinition(p[2]);var addon=Catalog["skillAddons"].Items.FirstOrDefault(x=>x["id"].S()==id);
        if(skill==null||definition==null||addon==null||!Compatible(definition,addon)||skill["eklentiler"].Items.Count()>=2||skill["eklentiler"].Items.Any(x=>x.S()==id))return false;
        skill.Set("eklentiler",Array(skill["eklentiler"].Items.Select(x=>x.S()).Append(id)));return true;
      }return false;
    }
    private void ArrangeEvents()
    {
      bool city=Region>=2;int max=Math.Min(6,city?2*Region:1+2*Region);var candidates=Tracks.Where(p=>city?p.Has("sokak")&&p["sev"].N()<=max:!p.Has("sokak")&&p["sev"].N()<=max&&p["sev"].N()>=max-3).ToArray();
      string[] types=city?new[]{"tur","ab","kovala"}:new[]{"gp","rx","rl","dp","dg"};var places=Catalog[city?"cityPlaces":"places"].Items.ToList();var result=new List<CatalogNode>();
      for(int n=0;n<8&&places.Count>0;n++){
        string type=n<types.Length?types[n]:Pick(types);var possible=candidates.Where(p=>p[city?"sokak":"ty"].S()==type).ToArray();if(possible.Length==0)continue;
        var p=Pick(possible);var pos=Take(places,(int)PickIndex(places.Count));
        var e=Obj(("id",CatalogNode.Num(n)),("i",p["i"]),("ty",city?p["ty"]:CatalogNode.Str(type)),("sev",p["sev"]),("x",pos[0]),("z",pos[1]),("yapildi",Bool(false)));
        if(city)e.Set("sokak",CatalogNode.Str(type));result.Add(e);
      }
      if(!city&&Region==1){var p=Tracks.FirstOrDefault(x=>x["ty"].S()=="gp"&&x["lv"].N()==1);var e=result.FirstOrDefault(x=>x["ty"].S()=="gp");if(p!=null&&e!=null){e.Set("i",p["i"]);e.Set("sev",p["sev"]);e.Set("rakip",Bool(true));}}
      State.Set("etkinlikler",CatalogNode.Arr(result));
    }
    private void ArrangeChests()
    {
      var places=Catalog[Region>=2?"cityPlaces":"places"].Items.Where(p=>!State["etkinlikler"].Items.Any(e=>e["x"].N()==p[0].N()&&e["z"].N()==p[1].N())).ToList();var result=new List<CatalogNode>();
      for(int n=0;n<3&&places.Count>0;n++){
        var p=Take(places,(int)PickIndex(places.Count));var curse=n==2?CatalogNode.Str(Pick(new[]{"sure","govde","para"})):Null();
        result.Add(Obj(("id",CatalogNode.Num(n)),("x",p[0]),("z",p[1]),("lanetli",Bool(n==2)),("secenekler",Array(System.Array.Empty<string>())),("incelendi",Bool(false)),("lanet",curse),("acildi",Bool(false))));
      }State.Set("sandiklar",CatalogNode.Arr(result));
    }
    private static bool Rare(string id)=>new[]{"motor-yaris","turbo-buyuk","lastik-yaris"}.Contains(id);
    private void ArrangeStock()
    {
      var candidates=Catalog["parts"].Items.Where(p=>p["sv"].N()>0&&!Strings("parcalar").Contains(p["id"].S())&&p["id"].S()!="motor-degisim").Select(p=>p["id"].S()).ToList();var stock=new List<string>();int rare=0;
      while(stock.Count<5&&candidates.Count>0){string id=Take(candidates,(int)PickIndex(candidates.Count));if(Rare(id)&&(Region<2||rare++>=1))continue;stock.Add(id);}Strings("stok",stock);
    }
    public bool RefreshStock(){if(N("para")<40)return false;Set("para",N("para")-40);ArrangeStock();return true;}
    public double PartPrice(int level,string id="")=>Round(new[]{40d,80,170,380}[level]*(Rare(id)?1.4:1)*(1-.1*Count("tuccar")));
    public bool CanBuyPart(string id,int level)=>!(N("para")<PartPrice(level,id)||Strings("parcalar").Contains(id)||!Strings("stok").Contains(id));
    public bool BuyPart(string id,int level)
    {
      double price=PartPrice(level,id);if(!CanBuyPart(id,level))return false;
      Strings("stok",Strings("stok").Where(x=>x!=id));Set("para",N("para")-price);Strings("parcalar",Strings("parcalar").Append(id));return true;
    }
    public double RepairCost=>Math.Ceiling((100-N("govde"))*3);
    // Eski Repair hesabı tek yerde; sunum aynı gerçek işlemi önceden okuyabilir.
    public MutantRepairPreview RepairPreview
    {
      get{double body=N("govde");if(body>=100||N("para")<=0)return new MutantRepairPreview(0,0,body);double points=Math.Min(100-body,Math.Floor(N("para")/3));return points<=0?new MutantRepairPreview(0,0,body):new MutantRepairPreview(points,points*3,body+points);}
    }
    public bool Repair()
    {
      var preview=RepairPreview;if(!preview.CanRepair)return false;
      Set("govde",preview.BodyAfter);Set("para",N("para")-preview.Cost);return true;
    }
    public bool Damage(string type,bool ghost=false,double? powerMultiplier=null)
    {
      if(State.Has("bec"))ghost=ghost||MutantSkills.Flags(State["bec"],State["beceriler"].Items)["hayalet"].B();
      if(type!="carpma"&&type!="spin")throw new ArgumentException("Kaynak hasar türü gerekir.",nameof(type));
      if(Finished||State["pert"].B())return false;double baseDamage=type=="carpma"?12:8;
      if(ghost){State.Set("bekleyenBeceri",CatalogNode.Arr(State["bekleyenBeceri"].Items.Append(Obj(("tur",CatalogNode.Str("KorumaEngelledi")),("miktar",CatalogNode.Num(Math.Min(N("govde"),baseDamage))),("kaynak",CatalogNode.Str(type))))));return false;}
      double power=powerMultiplier??(State["mek"]["etkiKalan"].N()>0?State["mek"]["etkiGuc"].N(1):1);
      double shield=power>1?1-.5*Count("nitro-kalkani"):1,bumper=type=="carpma"?1-.4*Count("ek-takviye-tampon"):1;
      double damage=baseDamage*(1-.35*Count("zirh"))*(1+Count("camtop"))*shield*bumper,received=Math.Min(N("govde"),damage);
      if(received>0){var notice=Obj(("tur",CatalogNode.Str(type)),("miktar",CatalogNode.Num(received)));DamageEvents.IdentityFor(notice);State.Set("bekleyenHasar",notice);}
      Set(type,N(type)+1);Set("govde",Math.Max(0,N("govde")-damage));if(Count("hurdaci")>0)Set("para",N("para")+Math.Floor(received*3*.8));
      if(N("govde")<=0){if(Test){Set("govde",100);return false;}State.Set("pert",Bool(true));Phase="bitti";return true;}return false;
    }
    public double CutPenalty(double metres)
    {
      if(Finished||State["pert"].B()||!(metres>0))return 0;double damage=Math.Min(N("govde"),metres*.1);Set("govde",Math.Max(0,N("govde")-metres*.1));Set("kesme",N("kesme")+1);
      if(N("govde")<=0){if(Test){Set("govde",100);return damage;}State.Set("pert",Bool(true));Phase="bitti";}return damage;
    }
    public string? Advance(double dt)
    {
      if(Finished||Phase=="boss")return null;Set("zaman",N("zaman")+dt);Set("kalan",Math.Max(0,N("kalan")-dt));
      if(!Test&&N("kalan")<=0&&!State["sonNefes"].B()&&Count("sonnefes")>0){State.Set("sonNefes",Bool(true));Set("kalan",90);}
      if(Test&&N("kalan")<=0){Set("kalan",90);return null;}return N("kalan")<=0?"boss":null;
    }
    private void AddXp(double amount)
    {
      Set("xp",N("xp")+Round(amount*(1+.25*Count("ogrenci"))));
      while(N("xp")>=LevelXp((int)N("seviye")+1)){Set("seviye",N("seviye")+1);Set("bekleyenSecim",N("bekleyenSecim")+1);}
    }
    public static double LevelXp(int level)=>80*level+30*level*(level-1);
    public CatalogNode? FinishEvent(int id,bool passed,int risk=0,bool? beatOpponent=null)
    {
      var e=State["etkinlikler"].Items.FirstOrDefault(x=>x["id"].N()==id);if(e==null||e["yapildi"].B())return null;e.Set("yapildi",Bool(true));Set("tamamlanan",N("tamamlanan")+1);
      if(Test)return Obj(("xp",State["xp"]),("para",CatalogNode.Num(0)),("gecti",Bool(passed)),("seviyeAtladi",Bool(false)),("ekSure",CatalogNode.Num(0)),("ceza",CatalogNode.Num(0)),("kapora",Null()));
      double multiplier=new[]{1d,2,3.5}[risk];bool gambler=risk==2&&Count("kumarbaz")>0;double share=passed?(gambler?5:multiplier):risk==0?.3:0,penalty=passed?0:new[]{0d,45,90}[risk]*(gambler?2:1),before=N("seviye");
      Set("kalan",Math.Max(0,N("kalan")-penalty));AddXp((40+20*e["sev"].N())*share);
      double basis=(60+30*e["sev"].N())*(1+.25*Count("tuccar")),opponentMoney=beatOpponent==true?Round(basis*Math.Max(1,multiplier)*.5):0,money=Round(basis*share)+opponentMoney;
      Set("para",N("para")+money);double extra=passed?20*Count("zaman"):0;Set("govde",Math.Min(100,N("govde")+12*Count("tamirci")));Set("kalan",N("kalan")+extra);
      var deposit=ApplyDeposit(e,passed);
      if(N("bekleyenSecim")>0){Phase="secim";DrawChoices();if(Strings("secenekler").Length==0){Set("bekleyenSecim",0);Phase="surus";}}
      return Obj(("xp",State["xp"]),("para",CatalogNode.Num(money)),("gecti",Bool(passed)),("seviyeAtladi",Bool(N("seviye")>before)),("ekSure",CatalogNode.Num(extra)),("ceza",CatalogNode.Num(penalty)),("kapora",deposit??Null()),("rakipPara",CatalogNode.Num(opponentMoney)),("rakipGecti",beatOpponent.HasValue?Bool(beatOpponent.Value):Null()));
    }
    public CatalogNode? LockDeposit(int eventId)
    {
      var e=State["etkinlikler"].Items.FirstOrDefault(x=>x["id"].N()==eventId);if(e==null||e["ty"].S()!="dp"||e["yapildi"].B())return null;
      var old=e["kapora"];string id=old["beceri"].S();int attempt=(int)old["deneme"].N();bool hasSkills=State["beceriler"].Items.Any();
      if(!e.Has("kapora")||(id!=""&&Skill(id)==null)||(id==""&&hasSkills)){
        if(id!=""&&Skill(id)==null)attempt++;var skills=State["beceriler"].Items.ToArray();var chosen=skills.Length==0?Null():skills[(int)Math.Floor(Derived(0x27d4eb2d,eventId*131+attempt*977)*skills.Length)]["id"];
        e.Set("kapora",Obj(("beceri",chosen),("deneme",CatalogNode.Num(attempt))));
      }return e["kapora"];
    }
    private CatalogNode? ApplyDeposit(CatalogNode e,bool passed)
    {
      if(e["ty"].S()!="dp"||!e.Has("kapora"))return null;var q=e["kapora"];string id=q["beceri"].S();
      CatalogNode Result(string? skill,string result)=>Obj(("beceri",skill==null?Null():CatalogNode.Str(skill)),("sonuc",CatalogNode.Str(result)));
      if(id!=""){
        var skill=Skill(id);if(skill==null)return null;if(!passed){RemoveSkill(id);return Result(id,"kayip");}
        if(skill["seviye"].N()<3){Set(skill,"seviye",skill["seviye"].N()+1);return Result(id,"seviye");}Set("para",N("para")+100);return Result(id,"para");
      }
      if(!passed){Set("govde",Math.Max(1,N("govde")-15));return Result(null,"govde");}
      var candidates=Catalog["skills"].Items.Where(t=>Skill(t["id"].S())==null).ToArray();
      if(candidates.Length==0||State["beceriler"].Items.Count()>=3){Set("para",N("para")+100);return Result(null,"para");}
      id=candidates[(int)Math.Floor(Derived(0x165667b1,(int)e["id"].N())*candidates.Length)]["id"].S();AddSkill(id);ApplyCapacity();return Result(id,"yeni");
    }
    private CatalogNode? Chest(int id)=>State["sandiklar"].Items.FirstOrDefault(x=>x["id"].N()==id);
    public string? ChestOffer(int id)
    {
      var c=Chest(id);if(c==null||c["acildi"].B()||Phase!="surus")return null;if(c["incelendi"].B())return c["secenekler"][0].S();c.Set("incelendi",Bool(true));
      var reserved=new HashSet<string>(Strings("pasifler").Concat(State["sandiklar"].Items.Where(x=>!x["acildi"].B()&&x["incelendi"].B()).SelectMany(x=>x["secenekler"].Items.Select(y=>y.S()))));
      var candidates=Catalog["addons"].Items.Where(x=>x["nadir"].B()==c["lanetli"].B()&&!reserved.Contains(x["id"].S())).ToArray();uint seed;unchecked{seed=((uint)N("tohum")^0x53a7d1)*31+(uint)((Region*101+id*719)*7919);}var r=new SeededRandom(seed==0?1:seed);
      string resource=new[]{"sandik-para","sandik-tamir","sandik-enerji"}[(int)Math.Floor(r.Next()*3)];string offer=candidates.Length>0?candidates[(int)Math.Floor(r.Next()*candidates.Length)]["id"].S():resource;
      c.Set("secenekler",Array(new[]{offer}));return offer;
    }
    public bool RejectChest(int id){var c=Chest(id);if(c==null||c["acildi"].B()||!c["incelendi"].B()||Phase!="surus")return false;c.Set("acildi",Bool(true));return true;}
    public bool CanAcceptChest(int id,string offer)
    {
      var c=Chest(id);if(c==null||c["acildi"].B()||!c["incelendi"].B()||Phase!="surus"||c["secenekler"][0].S()!=offer||Strings("pasifler").Contains(offer))return false;
      return new[]{"sandik-para","sandik-tamir","sandik-enerji"}.Contains(offer)||Catalog["addons"].Items.Any(x=>x["id"].S()==offer);
    }
    public bool AcceptChest(int id,string offer)
    {
      if(!CanAcceptChest(id,offer))return false;var c=Chest(id)!;
      bool resource=new[]{"sandik-para","sandik-tamir","sandik-enerji"}.Contains(offer);c.Set("acildi",Bool(true));
      if(resource){if(offer=="sandik-para")Set("para",N("para")+180);else if(offer=="sandik-tamir")Set("govde",Math.Min(100,N("govde")+35));else Set(State["mek"],"enerji",Math.Min(State["mek"]["kapasite"].N(),State["mek"]["enerji"].N()+60));}
      else{Strings("pasifler",Strings("pasifler").Append(offer));ApplyCapacity();if(offer=="ek-yedek-tup")Set(State["mek"],"enerji",Math.Min(State["mek"]["kapasite"].N(),State["mek"]["enerji"].N()+30));}
      switch(c["lanet"].S()){case "sure":Set("kalan",Math.Max(1,N("kalan")-45));break;case "govde":Set("govde",Math.Max(1,N("govde")-25));break;case "para":Set("para",Math.Floor(N("para")/2));break;}return true;
    }
    public void EnterBoss(){if(!Finished)Phase="boss";}
    public void FinishBoss(bool won)
    {
      if(Phase!="boss")return;if(!won){Phase="bitti";return;}Set("yenilenBoss",N("yenilenBoss")+1);Set("bolge",Region+1);
      State.Set("boss",Pick(Catalog["bosses"].Items.Where(b=>b["id"].S()!=State["boss"]["id"].S()).ToArray()).Clone());Set("kalan",Test?90:780);State.Set("sonNefes",Bool(false));Set("para",N("para")+200);AddXp(150);
      ArrangeEvents();ArrangeChests();ArrangeStock();if(N("bekleyenSecim")>0){Phase="secim";DrawChoices();if(Strings("secenekler").Length>0)return;Set("bekleyenSecim",0);}Phase="surus";
    }
    private CatalogNode? Reference(CatalogNode track)=>State["boss"]["hava"].S()=="rain"&&track.Has("refYagmur")?track["refYagmur"]:track.Has("ref")?track["ref"]:null;
    private static bool SinglePathInsufficient(string type,CatalogNode r){bool drift=type=="dp";double target=drift?r["birlesik"].N()/1.02:r["birlesik"].N()*1.02;return drift?r["nadir"].N()<target&&r["uzman"].N()<target:r["nadir"].N()>target&&r["uzman"].N()>target;}
    public CatalogNode BossTrack()
    {
      var tracks=Tracks.Where(p=>p["ty"].S()==State["boss"]["ty"].S()).OrderBy(p=>p["sev"].N()).ThenBy(p=>p["i"].N()).ToArray();
      var rainy=State["boss"]["hava"].S()=="rain"?tracks.Where(p=>p.Has("refYagmur")).ToArray():System.Array.Empty<CatalogNode>();var measured=rainy.Length>0?rainy:tracks.Where(p=>Reference(p)!=null).ToArray();var candidates=measured.Length>0?measured:tracks;
      if(Region<=1)candidates=candidates.Take(Math.Max(1,(int)Math.Ceiling(candidates.Length/2d))).ToArray();else if(Region>=3){var hard=candidates.Where(p=>Reference(p)!=null&&SinglePathInsufficient(p["ty"].S(),Reference(p)!)).ToArray();if(hard.Length>0)candidates=hard;}
      uint seed;unchecked{seed=(uint)N("tohum")+(uint)(Region*977);}return candidates[(int)Math.Floor(new SeededRandom(seed).Next()*candidates.Length)];
    }
    public double BossTarget(CatalogNode track)
    {
      bool drift=track["ty"].S()=="dp";double breath=State["sonNefes"].B()?.97:1,pay=new[]{1.05,1.02,1.02}[Math.Min(2,Region-1)]*breath;var reference=Reference(track);
      if(reference==null){double y=track["ys"][Math.Min(2,Region-1)].N();return drift?y/breath:y*breath;}
      double result=(Region<=1?reference["stok"].N():Region==2?(drift?Math.Max(reference["dengeli"].N(),reference["uzman"].N()):Math.Min(reference["dengeli"].N(),reference["uzman"].N())):reference["birlesik"].N())*track["laps"].N(1)*State["boss"]["hedef"].N();return drift?Round(result/pay):result*pay;
    }
    public static CatalogNode EventTarget(CatalogNode track,int risk)
    {
      if(track.Has("sokak")){var street=Obj(("limit",CatalogNode.Num(track["sokak"].S()=="kovala"?0:track["ys"][risk].N())));if(track.Has("laps"))street.Set("laps",track["laps"]);return street;}
      double laps=track["laps"].N()>1?track["laps"].N():1,target=track["ys"][risk].N()/laps;var result=Obj(("limit",CatalogNode.Num(track["ty"].S()=="dp"?Round(target):target)));if(track.Has("laps"))result.Set("laps",CatalogNode.Num(track["laps"].N()!=0?1:track["laps"].N()));return result;
    }
    private uint OpponentSeed(uint salt,int n){uint seed;unchecked{seed=((uint)N("tohum")^salt)*31u+(uint)(n*7919);}return seed==0?1:seed;}
    public CatalogNode? EventOpponent(CatalogNode e,int risk)
    {
      var track=Tracks.First(p=>p["i"].N()==e["i"].N());string type=e["ty"].S(),key=track["ty"].S()+"_"+track["lv"].N();
      if(e["rakip"].B()||!new[]{"gp","rx","rl","dg"}.Contains(type)||new[]{"rx_6","rl_3","rl_4","rl_6","rl_8"}.Contains(key))return null;
      var setup=Catalog["opponentSetups"][e.Has("sokak")?"gp":type][(int)e["sev"].N()-1];
      var result=Obj(("kisilik",CatalogNode.Str(risk==0?"caylak":"deneyimli")),("arac",setup["arac"]),("parca",setup["parca"].Clone()),("tohum",CatalogNode.Num(OpponentSeed(0x2545f491,(int)e["id"].N()))));
      if(e["sokak"].S()=="kovala"){Set(result,"onde",45);result.Set("duello",Bool(true));}return result;
    }
    public CatalogNode? BossOpponent()
    {
      string type=State["boss"]["ty"].S();if(type=="dp")return null;int car=type=="gp"?10:type=="rx"?11:type=="rl"?12:14;var setup=Catalog["bossSetups"][type][Math.Min(2,Region-1)];
      return Obj(("kisilik",CatalogNode.Str("boss")),("arac",CatalogNode.Num(car)),("parca",setup["parca"].Clone()),("pasif",setup["pasif"].Clone()),("tohum",CatalogNode.Num(OpponentSeed(0x68e31da4,Region))));
    }
    // Oyun tarafı mutantRakibi bağlaması: başlangıç düellosu oyuncunun stok aracıyla sürer.
    public CatalogNode? OpponentSpec(int eventId,int risk,int playerCar)
    {
      if(playerCar<0)return null;var e=State["etkinlikler"].Items.FirstOrDefault(x=>x["id"].N()==eventId);if(e==null)return null;
      if(e["rakip"].B())return Obj(("kisilik",CatalogNode.Str(risk==0?"caylak":"deneyimli")),("arac",CatalogNode.Num(playerCar)),("tohum",CatalogNode.Num(OpponentSeed(0x5bd1e995,eventId))),("duello",Bool(true)));
      var result=EventOpponent(e,risk);if(result!=null&&!result.Has("duello"))result.Set("duello",Bool(false));return result;
    }
  }
}
