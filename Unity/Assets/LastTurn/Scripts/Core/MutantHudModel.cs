#nullable enable
using System;
using System.Linq;
using System.Collections.Generic;
using System.Globalization;

namespace LastTurn.Core
{
  public sealed class MutantHudSlot
  {
    public string Id="", IconKey="", Name="", Detail="", Text="", State="";
    public double Fill;
  }
  // Salt sunum: fizik/ödül/giriş işlemi çağırmaz, koşuya yazmaz.
  public sealed class MutantHudModel
  {
    public string Region="", Boss="", Resources="", Progress="", Mission="", NitroText="";
    public double EnergyFill;public bool NitroReady,NitroOpen;
    public MutantHudSlot[] Slots=Array.Empty<MutantHudSlot>();
    private static string N(double n)=>n.ToString("0.#",CultureInfo.InvariantCulture);
    public static MutantHudModel Read(MutantRun? run,MutantMenuModel? menu,MutantAbilityDriver? abilities,MutantGameSession? session,double x,double z,bool racing)
    {
      var m=new MutantHudModel();if(run==null||menu==null||abilities==null)return m;
      m.Region="BÖLGE "+menu.Region;m.Boss=menu.BossName+" · BOSS "+menu.Timer+(session?.PendingBoss==true?" · BEKLİYOR":"");
      m.Resources="Gövde "+N(menu.Body)+" / 100 · "+N(menu.Money)+" para · Sv "+menu.Level;
      m.Progress=N(menu.Xp)+" / "+N(menu.NextLevelXp)+" XP";
      var n=abilities.Nitro();m.EnergyFill=n.Capacity>0?Math.Max(0,Math.Min(1,n.Energy/n.Capacity)):0;m.NitroReady=n.Ready;m.NitroOpen=n.Open;
      m.NitroText=N(n.Energy)+" / "+N(n.Capacity)+" · "+(n.Open?N(n.Left)+" sn":n.Ready?"HAZIR":"HAZIR DEĞİL")+" · maliyet "+N(n.Cost);
      m.Slots=abilities.Skills().Take(3).Select(s=>{var p=MutantSkillSlot.Read(s);var definition=run.Catalog["skills"].Items.FirstOrDefault(d=>d["id"].S()==s.Id);var evo=definition?["evrimler"].Items.FirstOrDefault(e=>e["id"].S()==s.Evolution);
        return new MutantHudSlot{Id=s.Id,IconKey=s.Evolution!=null?"evolution/"+s.Evolution:"skill/"+s.Id,Name=s.Name,Detail=s.Hook!=null?"Sv "+s.Level+(evo!=null?" · "+evo["ad"].S():"")+" · Hak "+N(s.Charges)+"/"+N(s.MaxCharges)+(s.Hook.Available&&!s.Open?" · "+N(s.Hook.Distance)+" m":""):"Sv "+s.Level+(evo!=null?" · "+evo["ad"].S():"")+(s.Kind=="aktif"?"":" · kendiliğinden"),Text=p.Text,State=p.State,Fill=p.Fill};}).ToArray();
      if(!racing){var mission=session?.Missions.Active;if(mission!=null)m.Mission=MutantRoadMissions.Name(mission)+" · "+N(mission.Progress)+" / "+N(mission.Target)+" · "+N(mission.Remaining)+" sn";
        else {var nearest=MutantWorldMarkerModel.Read(run).Where(p=>!p.Used).OrderBy(p=>JsMath.Hypot(p.X-x,p.Z-z)).FirstOrDefault();if(nearest!=null)m.Mission=nearest.Name+" · "+N(JsMath.Hypot(nearest.X-x,nearest.Z-z))+" m";}}
      return m;
    }
  }
  // Sunuma ait gözlem; birikimli telemetriyi okur, oyun olaylarını tüketmez.
  public sealed class MutantHudFeedback
  {
    private MutantRun? seen;private int region,refusal;private long hookAttempt;private bool gainNote;private Dictionary<string,MechanicTelemetry> baseline=new Dictionary<string,MechanicTelemetry>();
    public long Sequence {get;private set;}public double TotalGain {get;private set;}
    public string Text {get;private set;}="";
    public void Note(string text){if(string.IsNullOrEmpty(text))return;gainNote=false;Text=text;Sequence++;}
    private static string GainText(double n)=>"Mekanik tetiklendi · +"+n.ToString("0.##",CultureInfo.InvariantCulture)+" enerji";
    public string ReadSince(long sequence,double gain)=>sequence==Sequence?"":gainNote&&TotalGain>gain?GainText(TotalGain-gain):Text;
    public void Observe(MutantRun run,MutantAbilityDriver? driver)
    {
      var now=MechanicState.FromNode(run.State["mek"]).Telemetry;
      if(seen!=run||region!=run.Region){seen=run;region=run.Region;baseline=now;refusal=driver?.Refusal.Count??0;hookAttempt=driver?.LastHookAttempt?.Sequence??0;Text="";gainNote=false;Sequence++;return;}
      double gain=0,spent=0,triggers=0;
      foreach(var p in now){baseline.TryGetValue(p.Key,out var old);gain+=Math.Max(0,p.Value.Gain-(old?.Gain??0));spent+=Math.Max(0,p.Value.Spent-(old?.Spent??0));triggers+=Math.Max(0,p.Value.Triggers-(old?.Triggers??0));}
      baseline=now;TotalGain+=gain;
      if(gain>0){Note(GainText(gain));gainNote=true;}
      else if(spent>0||triggers>0)Note("Mekanik etkinleşti");
      if(driver!=null&&driver.Refusal.Count!=refusal){refusal=driver.Refusal.Count;var reason=driver.Refusal.Reason;if(driver.Refusal.Id!="grappling-hook")Note(reason=="basla"?"Skill · BAŞLANGIÇ":reason=="hedef"?"Skill · HEDEF YOK":reason=="rakip"?"Skill · RAKİP YOK":reason=="bekleme"?"Skill · BEKLEME":"Skill · "+reason);}
      var h=driver?.LastHookAttempt;if(h!=null&&h.Sequence!=hookAttempt){hookAttempt=h.Sequence;Note(h.Blocker!=null?"Kanca isteği reddedildi · "+(h.Blocker=="hedef"?"HEDEF YOK":h.Blocker=="bekleme"?"HAK YOK / BEKLEME":h.Blocker=="basla"?"BAŞLANGIÇ":h.Blocker=="faz"?"FAZDA":h.Blocker):h.Linked?"Kanca bağlandı · "+MutantHookQuery.KindName(h.Query.Kind):"Kanca bırakıldı");}
    }
  }
}
