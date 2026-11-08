using System.Text.Json;
using System.Security.Cryptography;
using LastTurn.Core;

internal static class MutantHudValidation
{
  public static void Run()
  {
    var root=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../.."));
    string Read(string name)=>File.ReadAllText(Path.Combine(root,"Unity/Assets/LastTurn/Resources",name));
    var catalog=CatalogNode.Parse(Read("mutant-catalog.json"));var vehicles=new VehicleCatalog(Read("vehicle-catalog.json"));var worlds=new MutantSkillWorldFactory(Read("mutant-skill-world.json"));int checks=0;
    void Check(bool ok,string label){checks++;if(!ok)throw new Exception("B HUD: "+label);}
    MutantRun New(){var r=new MutantRun(53,catalog);r.State.Set("faz",CatalogNode.Str("surus"));r.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"grappling-hook\",\"seviye\":3,\"evrim\":\"ters-kanca\",\"eklentiler\":[\"sok-bobini\"]},{\"id\":\"flying-dutchman\",\"seviye\":1,\"evrim\":null,\"eklentiler\":[]},{\"id\":\"slipstream-engine\",\"seviye\":2,\"evrim\":null,\"eklentiler\":[]}]"));return r;}
    Check(MutantHudModel.Read(null,null,null,null,0,0,false).Slots.Length==0,"Null koşu güvenli");
    var run=New();var driver=new MutantAbilityDriver(run,worlds);var session=new MutantGameSession(run,vehicles,0,0,0);
    MutantHudModel Model(bool racing=false)=>MutantHudModel.Read(run,MutantMenuModel.Read(run,vehicles,0),driver,session,0,0,racing);
    string before=run.State.ToString();var m=Model();Check(run.State.ToString()==before,"HUD model okuması salt");
    Check(m.Slots.Length==3&&m.Slots[0].IconKey=="evolution/ters-kanca"&&m.Slots[0].Detail.Contains("Ters Kanca"),"Evrim ikon adı ve seviye");
    Check(m.Slots[2].Detail.Contains("kendiliğinden")&&m.Slots[0].Detail.Contains("Sv 3"),"Aktif tetikli ve seviye");
    for(int i=0;i<3;i++){var s=driver.Skills()[i];var p=MutantSkillSlot.Read(s);Check(m.Slots[i].Fill==p.Fill&&m.Slots[i].Text==p.Text&&m.Slots[i].State==p.State,"Slot üreticisi aynı "+i);}
    var nitro=driver.Nitro();Check(m.EnergyFill==nitro.Energy/nitro.Capacity&&m.NitroReady==nitro.Ready,"Nitro üreticisi aynı");
    Check(m.Mission!=""&&Model(true).Mission=="","Yakın işaret yalnız dünyada");
    session.Missions.Active=new MutantRoadMission{Kind="drift",Target=40,Progress=12,Remaining=17};Check(Model().Mission.Contains("12 / 40")&&Model().Mission.Contains("17 sn"),"Gerçek görev önceliği ve ilerlemesi");
    run.State["mek"].Set("kapasite",CatalogNode.Num(0));Check(Model().EnergyFill==0,"Sıfır kapasite güvenli");run.State["mek"].Set("kapasite",CatalogNode.Num(100));run.State["mek"].Set("enerji",CatalogNode.Num(200));Check(Model().EnergyFill==1,"Gösterim sınırı");
    run.State.Set("beceriler",CatalogNode.Arr(Array.Empty<CatalogNode>()));Check(Model().Slots.Length==0,"Boş yuvalar güvenli");
    string reference="";double referenceGain=-1;long referenceSeq=-1;
    foreach(int fps in new[]{30,60,120})
    {
      var r=New();var d=new MutantAbilityDriver(r,worlds);var control=New();var dc=new MutantAbilityDriver(control,worlds);var f=new MutantHudFeedback();f.Observe(r,d);int step=0;double acc=0;
      for(int frame=0;frame<fps*4;frame++)
      {
        acc+=1d/fps;while(acc+1e-12>=1d/60){acc-=1d/60;step++;
          foreach(var a in new[]{d,dc}){if(step==30)a.PressNitro();a.BeginStep(new MutantAbilityContext{HasBody=true,X=0,Z=0,Vx=35,Vz=0,Ground=0,Racing=false,DriftOn=true,DriftDirection=1,Beta=.5,Steering=1});a.Step(new MutantGameSession(a.Run,vehicles,0,0,0),new MutantSessionInput(),1d/60,false);}
          f.Observe(r,d);
        }
        var state=r.State.ToString();MutantHudModel.Read(r,MutantMenuModel.Read(r,vehicles,0),d,null,0,0,false);Check(state==r.State.ToString(),"Render salt "+fps+"/"+frame);
      }
      Check(step==240&&r.State.ToString()==control.State.ToString(),"HUD oyun sonucunu değiştirmez "+fps);
      Check(f.TotalGain>0&&f.Sequence>3,"Gerçek enerji tetik geri bildirimi gözlendi "+fps);
      Check(f.ReadSince(f.Sequence,f.TotalGain)=="","Render aynı bildirimi tekrar almaz "+fps);
      var seq=f.Sequence;f.Observe(r,d);Check(f.Sequence==seq,"Aynı snapshot tekrar bildirilmez "+fps);
      if(reference==""){reference=r.State.ToString();referenceGain=f.TotalGain;referenceSeq=f.Sequence;}else Check(reference==r.State.ToString()&&referenceGain==f.TotalGain&&referenceSeq==f.Sequence,"30/60/120 sabit adım ve bildirim aynı "+fps);
      var fresh=New();var fd=new MutantAbilityDriver(fresh,worlds);f.Observe(fresh,fd);Check(f.Text=="","Yeni koşu eski bildirimi göstermez "+fps);
    }
    var proof=new{result="mutant-hud-passed",checks,utc=DateTime.UtcNow.ToString("O"),fps=new[]{30,60,120},steps=240,referenceGain,referenceSeq,sources=Directory.GetFiles(Path.Combine(root,"Unity/Assets/LastTurn/Scripts/Core"),"*.cs").Order().Select(p=>new{path=Path.GetRelativePath(root,p).Replace('\\','/'),hash=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(p)))}).ToArray()};
    Directory.CreateDirectory(Path.Combine(root,"tests/cikti"));File.WriteAllText(Path.Combine(root,"tests/cikti/mutant-hud-proof.json"),JsonSerializer.Serialize(proof,new JsonSerializerOptions{WriteIndented=true}));Console.WriteLine($"B HUD: {checks} dar kontrol;30/60/120 FPS,240 sabit adım, oyun durumu ve bildirim aynı.");
  }
}
