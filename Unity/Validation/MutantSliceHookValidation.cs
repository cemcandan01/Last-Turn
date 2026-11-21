using LastTurn.Core;

internal static class MutantSliceHookValidation
{
  public static void Run()
  {
    int checks=0;
    void Check(bool yes,string label){checks++;if(!yes)throw new Exception(label);}
    const double dt=1d/60;
    // Yük hıza ve yarıçapa bağlıdır: hız artınca artar, yarıçap artınca azalır.
    Check(MutantHookRope.Ratio(1,30,30)>MutantHookRope.Ratio(1,20,30),"Hız arttıkça gerilim artar");
    Check(MutantHookRope.Ratio(1,30,15)>MutantHookRope.Ratio(1,30,30),"Yarıçap küçüldükçe gerilim artar");
    Check(MutantHookRope.Ratio(3,30,20)<MutantHookRope.Ratio(1,30,20),"Üst seviye daha dayanıklı");
    Check(MutantHookRope.Zone(.3)=="yesil"&&MutantHookRope.Zone(.7)=="sari"&&MutantHookRope.Zone(1.2)=="kirmizi","Bölgeler");
    Check(MutantHookRope.Ratio(1,0,20)==0&&MutantHookRope.Ratio(1,30,0)>0&&double.IsFinite(MutantHookRope.Ratio(1,30,0)),"Sınır girdileri sonlu");
    // Yeşilde sonsuza kadar bağlı kalır.
    var rope=new MutantHookRope();bool snapped=false;
    for(int i=0;i<60*30;i++)snapped|=rope.Step(1,18,30,dt);
    Check(!snapped&&rope.Band=="yesil"&&rope.RedTime==0,"Yeşilde süre dolmaz");
    // Kırmızıda 0,25 sn'den önce kopmaz, sonra koparır.
    rope=new MutantHookRope();int frames=0;snapped=false;
    while(!snapped&&frames<600){snapped=rope.Step(1,40,20,dt);frames++;}
    Check(snapped&&frames*dt>=.24&&frames*dt<=.27,"Kırmızıda ~0,25 sn sonra kopar");
    // Kısa kırmızı temasında kopmaz; yeşile dönünce sayaç söner.
    rope=new MutantHookRope();for(int i=0;i<10;i++)Check(!rope.Step(1,40,20,dt),"Kısa kırmızı");
    for(int i=0;i<30;i++)rope.Step(1,15,30,dt);Check(rope.RedTime==0,"Kırmızıdan çıkınca sayaç söner");
    // Kırmızıya girip çıkarak sınırı kullanmak sayacı sıfırlamaz (yavaş söner).
    rope=new MutantHookRope();snapped=false;
    for(int c=0;c<20&&!snapped;c++){for(int i=0;i<10&&!snapped;i++)snapped=rope.Step(1,40,20,dt);for(int i=0;i<3&&!snapped;i++)snapped=rope.Step(1,15,30,dt);}
    Check(snapped,"Sınırda gidip gelmek sayacı sıfırlamaz");
    // Kopunca bekleme x2,5.
    Check(Math.Abs(MutantHookRope.SnapCooldown(6)-15)<1e-9&&Math.Abs(MutantHookRope.SnapCooldown(5)-12.5)<1e-9,"Kopma beklemesi x2,5");
    // Birleşik adım: köşe çıpası, tuş basılı kaldıkça bağlı, bırakınca devam, kopunca bekleme x2,5.
    var hook=CatalogNode.Parse("{\"id\":\"grappling-hook\",\"seviye\":1,\"evrim\":null,\"eklentiler\":[]}");var eq=new[]{hook};
    CatalogNode Open(CatalogNode st,double speed,string[] held,string[] requests,out CatalogNode output)
    {
      // İp boyu basış anındaki uzaklıktır; basıştan sonra araç dışarı kayar (gergin ip).
      return OpenAt(st,requests.Length>0?0:-0.5,speed,held,requests,out output);
    }
    CatalogNode OpenAt(CatalogNode st,double x,double speed,string[] held,string[] requests,out CatalogNode output)
    {
      var player=CatalogNode.Parse("{\"x\":"+x.ToString(System.Globalization.CultureInfo.InvariantCulture)+",\"y\":0,\"z\":0,\"vx\":0,\"vy\":0,\"vz\":"+speed.ToString(System.Globalization.CultureInfo.InvariantCulture)+",\"h\":0}");
      var world=new MutantSkillWorld{Player=player,Targets=CatalogNode.Parse("[]"),Racing=false,Held=held,Corner=_=>CatalogNode.Parse("{\"p\":[30,0],\"uc\":[30,0]}")};
      var r=MutantSkills.Step(st,eq,world,dt,null,requests);output=r.Output;return r.State;
    }
    string[] id={"grappling-hook"},none=Array.Empty<string>();
    MutantSlice.Enabled=true;
    try
    {
      var state=MutantSkills.Initialize();state=Open(state,15,id,id,out var o);
      Check(state["yerel"]["grappling-hook"]["kalan"].N()>0,"Basınca bağlanır");
      for(int i=0;i<60*20;i++)state=Open(state,15,id,none,out o);
      Check(state["yerel"]["grappling-hook"]["kalan"].N()>0,"Tuş basılıyken 20 sn sonra hâlâ bağlı (otomatik süre yok)");
      Check(state["yerel"]["grappling-hook"]["gerilim"].N()<MutantHookRope.Yellow,"Yavaşta gerilim yeşil");
      state=Open(state,15,none,none,out o);
      Check(state["yerel"]["grappling-hook"]["kalan"].N()==0&&state["yerel"]["grappling-hook"]["bekleme"].N()==0,"Bırakınca bağ biter, ceza yok");
      Check(o["oyuncuIvme"]["x"].N()==0&&o["oyuncuIvme"]["z"].N()==0&&o["ucus"].ToString()=="null","Bırakınca itme yok, araç hız ve yönüyle devam eder");
      state=MutantSkills.Initialize();state=Open(state,45,id,id,out o);int held=0;
      while(state["yerel"]["grappling-hook"]["kalan"].N()>0&&held<600){state=Open(state,45,id,none,out o);held++;}
      Check(held>0&&held*dt<=.3,"Hızlı ve dar dönüşte kırmızıda kopar");
      double cooldown=state["yerel"]["grappling-hook"]["bekleme"].N();Check(Math.Abs(cooldown-15)<=2*dt,"Kopunca bekleme 6 sn x2,5 ("+cooldown+")");
      var world2=new MutantSkillWorld{Player=CatalogNode.Parse("{\"x\":-0.5,\"y\":0,\"z\":0,\"vx\":0,\"vy\":0,\"vz\":15,\"h\":0}"),Targets=CatalogNode.Parse("[]"),Corner=_=>CatalogNode.Parse("{\"p\":[30,0],\"uc\":[30,0]}")};
      Check(MutantSkills.Blocker(state,eq,world2,"grappling-hook")=="bekleme","Bekleme sürerken kanca kapalı");
      state=Open(state,15,id,id,out o);Check(state["yerel"]["grappling-hook"]["kalan"].N()==0,"Bekleme sürerken basış bağlamaz");
      for(int i=0;i<(int)(15/dt)+2;i++)state=Open(state,15,none,none,out o);
      Check(MutantSkills.Blocker(state,eq,world2,"grappling-hook")==null,"Bekleme bitince kanca hazır");
      // Rakip hedefi ilk sürümde yok.
      var opp=new MutantSkillWorld{Player=CatalogNode.Parse("{\"x\":0,\"y\":0,\"z\":0,\"vx\":0,\"vy\":0,\"vz\":15,\"h\":0}"),Targets=CatalogNode.Parse("[{\"id\":\"rakip\",\"x\":0,\"z\":20,\"vx\":0,\"vz\":15}]")};
      Check(MutantSkills.InspectHook(hook,MutantSkills.Parameters("grappling-hook",hook),opp).Kind!="rakip","Dilimde rakip hedeflenmez");
    }
    finally{MutantSlice.Enabled=false;}
    {
      var opp=new MutantSkillWorld{Player=CatalogNode.Parse("{\"x\":0,\"y\":0,\"z\":0,\"vx\":0,\"vy\":0,\"vz\":15,\"h\":0}"),Targets=CatalogNode.Parse("[{\"id\":\"rakip\",\"x\":0,\"z\":20,\"vx\":0,\"vz\":15}]")};
      Check(MutantSkills.InspectHook(hook,MutantSkills.Parameters("grappling-hook",hook),opp).Kind=="rakip","Bayrak kapalıyken rakip hedefi aynı");
    }
    Console.WriteLine($"Kanca gerilimi: {checks} kontrol geçti.");
  }
}
