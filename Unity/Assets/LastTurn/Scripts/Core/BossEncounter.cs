using System;
namespace LastTurn.Core
{
  public sealed class BossEncounter
  {
    public string Phase="",Hint="";
    public double Left;
    public bool Window;
    public RivalDrivingStyle Style=null!;
    public static string Description(string id)=>id switch {
      "gece-sahini"=>"Atağını bekle. Gaz kestiği dört saniyelik aralıkta viraj çıkışından geç.",
      "toprak-kurdu"=>"Düzlük hamlesinden sonra toparlanırken temiz çizgiyi koru ve yaklaş.",
      "camur-baronu"=>"Ağır girişten sonra gazını toplarken boşalan koridoru kullan.",
      "drag-canavari"=>"Dört saniyelik hamleden sonra gazını kısa keser. Kalkış ve vites zamanını buna göre hazırla.",
      _=>"İki farklı şov penceresinde puan bankala. Toplam puan hedefini de geç."
    };
    private static readonly RivalDrivingStyle Attack=new RivalDrivingStyle("BOSS","Atak",.3,.4,1.5,.008,.8,.95,1.03,1);
    private static readonly RivalDrivingStyle Recover=new RivalDrivingStyle("BOSS","Toparlanma",.65,.8,.9,.005,1.4,1.15,.92,.62);
    private static readonly RivalDrivingStyle EarthAttack=new RivalDrivingStyle("BOSS","Düzlük hamlesi",.42,.7,1.2,.005,1.15,1.05,1.06,1);
    private static readonly RivalDrivingStyle MudAttack=new RivalDrivingStyle("BOSS","Ağır giriş",.75,1,.9,.004,1.4,1.1,.95,.9);
    private static readonly RivalDrivingStyle DragRecover=new RivalDrivingStyle("BOSS","Gaz kesme",.5,.5,1,.006,1,1,.85,.5);
    public static BossEncounter Read(string id,double time)
    {
      bool drag=id=="drag-canavari";double prepare=drag?1:id=="toprak-kurdu"?4:id=="camur-baronu"?2:3,attack=drag?4:id=="toprak-kurdu"?6:id=="camur-baronu"?4:5,recover=drag?1.5:id=="toprak-kurdu"?3:id=="camur-baronu"?5:4;
      double cycle=prepare+attack+recover,t=Math.Max(0,time)%cycle;
      var m=new BossEncounter{Hint=Description(id)};
      if(t<prepare){m.Phase=id=="drift-kralicesi"?"ŞOV HAZIRLIĞI":"ATAK HAZIRLIĞI";m.Left=prepare-t;m.Style=RivalDrivingStyle.Bora;}
      else if(t<prepare+attack){
        m.Phase=id=="drift-kralicesi"?"ŞOV PENCERESİ":id=="toprak-kurdu"?"DÜZLÜK HAMLESİ":id=="camur-baronu"?"AĞIR GİRİŞ":"ATAK";
        m.Left=prepare+attack-t;m.Window=true;m.Style=id=="toprak-kurdu"?EarthAttack:id=="camur-baronu"?MudAttack:Attack;
      }else{m.Phase=id=="drift-kralicesi"?"YENİ ŞOVA HAZIRLAN":"TOPARLANIYOR · FIRSAT";m.Left=cycle-t;m.Style=drag?DragRecover:Recover;}
      return m;
    }
  }
  public sealed class BossShowProgress
  {
    private double score;private int lastCycle=-1;
    public int Windows {get;private set;}
    public void Observe(double time,double banked)
    {
      int cycle=(int)(time/12);
      if(banked>score && BossEncounter.Read("drift-kralicesi",time).Window && cycle!=lastCycle){Windows++;lastCycle=cycle;}
      score=banked;
    }
  }
}
