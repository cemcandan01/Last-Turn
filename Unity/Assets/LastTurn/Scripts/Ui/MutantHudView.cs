using LastTurn.Core;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // B sürüş göstergeleri: salt tipli model; klavye/fare sürüş girdi yolu değişmez.
  public sealed class MutantHudView:MonoBehaviour
  {
    public static MutantHudView Instance {get;private set;}
    public bool Visible {get;private set;}
    public static bool OwnsDrive=>Instance&&Instance.Visible&&CanShow;
    private static bool CanShow=>MutantRuntime.Active&&!MutantRuntime.Blocked&&!SettingsScreen.Open&&Touchscreen.current==null;
    private VisualElement root,summary,nitro,nitroFill,hints;private Label region,boss,resources,progress,mission,nitroText,notice;
    private readonly VisualElement[] slots=new VisualElement[3],fills=new VisualElement[3],icons=new VisualElement[3];
    private readonly Label[] names=new Label[3],details=new Label[3],states=new Label[3];private readonly string[] keys=new string[3];
    private GtPrototype p;private long sequence=-1;private double gain;private float noteUntil,shownAt;private bool wasVisible;
    private void Start()
    {
      Instance=this;root=new VisualElement{name="b-mutant-hud",pickingMode=PickingMode.Ignore};root.AddToClassList("katman");root.AddToClassList("mh-root");root.styleSheets.Add(Resources.Load<StyleSheet>("UI/mutant-hud"));
      summary=Box("mh-summary");region=Text(summary,"mh-region");boss=Text(summary,"mh-boss");resources=Text(summary,"mh-resources");progress=Text(summary,"mh-progress");mission=Text(summary,"mh-mission");
      nitro=Box("mh-nitro");Text(nitro,"mh-nitro-title").text="N   NİTRO";nitroText=Text(nitro,"mh-nitro-text");nitroFill=Bar(nitro);
      for(int i=0;i<3;i++){slots[i]=Box("mh-slot-"+i);slots[i].AddToClassList("mh-slot");names[i]=Text(slots[i],"mh-name");details[i]=Text(slots[i],"mh-detail");states[i]=Text(slots[i],"mh-state");fills[i]=Bar(slots[i]);}
      notice=Text(root,"mh-notice");hints=Box("mh-hints");Text(hints,"mh-hint-text").text="WASD / oklar · N nitro · 1/2/3 skill · V kamera · Esc duraklat";
      UiRoot.Instance.Hud.Add(root);
    }
    private VisualElement Box(string name){var b=new VisualElement{name=name,pickingMode=PickingMode.Ignore};b.AddToClassList("mh-box");b.AddToClassList(name);root.Add(b);return b;}
    private static Label Text(VisualElement parent,string name){var l=Ui.Text("");l.name=name;l.AddToClassList(name.StartsWith("mh-slot")?"mh-state":name);parent.Add(l);return l;}
    private static VisualElement Bar(VisualElement parent){var b=new VisualElement{pickingMode=PickingMode.Ignore};b.AddToClassList("mh-bar");var f=new VisualElement{pickingMode=PickingMode.Ignore};f.AddToClassList("mh-fill");b.Add(f);parent.Add(b);return f;}
    private static void Place(VisualElement e,System.Collections.Generic.Dictionary<string,HudRect> rects,string key,float k){if(!rects.TryGetValue(key,out var r)){Ui.Show(e,false);return;}Ui.Show(e,true);e.style.left=(float)r.X*k;e.style.top=(float)r.Y*k;e.style.width=(float)r.W*k;e.style.height=(float)r.H*k;}
    private void Update()
    {
      if(root==null)return;if(!p)p=FindFirstObjectByType<GtPrototype>();Visible=CanShow&&p&&p.Simulation!=null;Ui.Show(root,Visible);
      if(!Visible){wasVisible=false;sequence=MutantRuntime.HudFeedback.Sequence;gain=MutantRuntime.HudFeedback.TotalGain;notice.text="";return;}
      if(!wasVisible){wasVisible=true;shownAt=Time.unscaledTime;sequence=MutantRuntime.HudFeedback.Sequence;gain=MutantRuntime.HudFeedback.TotalGain;notice.text="";}
      var point=p.Simulation.ReferencePoint;var m=MutantRuntime.HudModel(point.X,point.Z);var r=Hud.Rects(p);float k=UiRoot.Instance.PixelToPanel;
      Place(summary,r,"MutantBar",k);Place(nitro,r,"Nitro",k);Place(hints,r,"Hint",k);Ui.Show(hints,!MutantRuntime.InRace&&Time.unscaledTime-shownAt<6);
      region.text=m.Region;boss.text=m.Boss;resources.text=m.Resources;progress.text=m.Progress;mission.text=m.Mission;nitroText.text=m.NitroText;nitroFill.style.width=Length.Percent((float)m.EnergyFill*100);nitro.EnableInClassList("mh-on",m.NitroOpen);nitro.EnableInClassList("mh-ready",m.NitroReady);
      for(int i=0;i<3;i++){var s=i<m.Slots.Length?m.Slots[i]:null;string rect=r.ContainsKey("Skill"+i)?"Skill"+i:"Passive"+i;Place(slots[i],r,rect,k);Ui.Show(slots[i],s!=null);if(s==null)continue;
        names[i].text=(i+1)+"  "+s.Name;details[i].text=s.Detail;states[i].text=s.Text;fills[i].style.width=Length.Percent((float)s.Fill*100);slots[i].EnableInClassList("mh-on",s.State=="on");slots[i].EnableInClassList("mh-ready",s.State=="hazir");
        if(keys[i]!=s.IconKey){keys[i]=s.IconKey;icons[i]?.RemoveFromHierarchy();icons[i]=MutantRewardIcons.Create(s.IconKey);icons[i].AddToClassList("mh-icon");slots[i].Add(icons[i]);}}
      var f=MutantRuntime.HudFeedback;if(sequence!=f.Sequence){notice.text=f.ReadSince(sequence,gain);sequence=f.Sequence;gain=f.TotalGain;noteUntil=Time.unscaledTime+2.2f;}if(Time.unscaledTime>noteUntil)notice.text="";
    }
    private void OnDestroy(){root?.RemoveFromHierarchy();if(Instance==this)Instance=null;}
  }
}
