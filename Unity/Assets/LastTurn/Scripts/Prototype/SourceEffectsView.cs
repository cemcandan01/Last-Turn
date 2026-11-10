using System;
using System.Collections.Generic;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;

namespace LastTurn.Prototype
{
  // TS cizim/parcaciklar.ts + beceri-efekt.ts + sokak-kapilari.ts: kaynağın kendi Three kurucularından dışa aktarılan
  // efekt grafiği (effects-source). Yalnız çizer; fizik, oyun RNG'si, kayıt veya skill kuralına yazmaz. Rastgelelik TS
  // Math.random gibi yereldir. Toz/duman/su/çalı koşulları ortak.ts tozVeDuman ve model.ts carpismalar dallarından okunur.
  public sealed class SourceEffectsView:MonoBehaviour
  {
    private sealed class Puff{public Transform T;public Material M;public double L,B;public Vector3 V;}
    private GtPrototype owner;private SourceScene scene;
    private readonly List<Puff> puffs=new List<Puff>();private int next;
    private readonly List<Transform> embers=new List<Transform>();
    private Transform rope,tip,ring,targetRing,targetColumn,exhaust,gates;
    private Material ropeMat,ringMat,targetMat,columnMat;
    private readonly System.Random cosmetic=new System.Random(11);
    private int observedSteps=-1,flameCounter,counter;private double t,ringLeft;
    private bool onceHook,onceGhost,onceTransform;private string gateKey="";
    public int Emitted{get;private set;}
    public int VisiblePuffs{get{int n=0;foreach(var p in puffs)if(p.T.gameObject.activeSelf)n++;return n;}}
    public bool RopeVisible=>rope&&rope.gameObject.activeSelf;
    public bool TargetVisible=>targetRing&&targetRing.gameObject.activeSelf;
    public bool ExhaustVisible=>exhaust&&exhaust.gameObject.activeSelf;
    public int VisibleEmbers{get{int n=0;foreach(var e in embers)if(e.gameObject.activeSelf)n++;return n;}}
    public int GateObjects=>gates?gates.childCount:0;
    public bool Ready=>scene;

    private void Awake()
    {
      owner=GetComponent<GtPrototype>();scene=SourceScene.Create("effects-source",transform);if(!scene)return;
      // Three Mesh varsayılanı castShadow=false; efekt/işaret/kapı kurucuları gölge açmaz.
      foreach(var r in scene.GetComponentsInChildren<Renderer>(true)){r.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;r.receiveShadows=false;}
      foreach(var (tag,node) in scene.Tagged)
      {
        if(tag=="puff")puffs.Add(new Puff{T=node,M=node.GetComponent<Renderer>().sharedMaterial});
        else if(tag=="ember")embers.Add(node);
      }
      rope=Tag("hook-rope");tip=Tag("hook-tip");ring=Tag("pulse-ring");targetRing=Tag("hook-target-ring");targetColumn=Tag("hook-target-column");exhaust=Tag("exhaust");
      ropeMat=rope.GetComponent<Renderer>().sharedMaterial;ringMat=ring.GetComponent<Renderer>().sharedMaterial;targetMat=targetRing.GetComponent<Renderer>().sharedMaterial;columnMat=targetColumn.GetComponent<Renderer>().sharedMaterial;
      // Kapı/işaret ilk örnekleri yalnız kopyalama kaynağıdır.
      foreach(var (tag,node) in scene.Tagged)if(tag.StartsWith("gate-",StringComparison.Ordinal)||tag.StartsWith("marker-",StringComparison.Ordinal)||tag.StartsWith("chest-",StringComparison.Ordinal))node.gameObject.SetActive(false);
    }
    private Transform Tag(string tag)=>scene.Tags.TryGetValue(tag,out var t)?t:throw new InvalidOperationException("Efekt bağı eksik: "+tag);
    public Transform Prototype(string tag)=>scene&&scene.Tags.TryGetValue(tag,out var t)?t:null;
    private static Vector3 U(double x,double y,double z)=>GtPresentation.Position(new BodyVector(x,y,z));
    private static Color Hex(int n,float a)=>new Color(((n>>16)&255)/255f,((n>>8)&255)/255f,(n&255)/255f,a);
    private static Quaternion Yaw(double h)=>Quaternion.Euler(0,-(float)(h*180/Math.PI),0);

    /// TS puff: bir toz bulutu.
    public void Emit(double x,double y,double z,double vx,double vz,int color,double b=1)
    {
      if(puffs.Count==0)return;var p=puffs[next++%puffs.Count];Emitted++;
      p.T.position=U(x,y+.3,z);p.M.color=Hex(color,0);p.L=1;p.B=b;
      p.V=GtPresentation.Position(new BodyVector(vx*.2,(1.2+cosmetic.NextDouble())*b,vz*.2));p.T.gameObject.SetActive(true);
    }

    private void LateUpdate()
    {
      if(!scene||owner==null)return;float dt=Mathf.Min(Time.deltaTime,.1f);t+=dt;
      var sim=owner.Simulation;var root=owner.SourceVehicle?owner.SourceVehicle.transform:owner.VehicleRoot;
      bool paused=GameFlow.Paused||MutantRuntime.Blocked||SettingsScreen.Open;
      if(sim!=null)ObservePhysics(sim);
      // Çizilen araç konumu/yönü (TS px/py/pz/ph); Unity sunumu x eksenini aynalar.
      Vector3 o=root?root.position:Vector3.zero;Vector3 f=root?root.forward:Vector3.forward;
      double x=-o.x,y=o.y,z=o.z,h=Math.Atan2(-f.x,f.z),vx=sim?.Body.Velocity.X??0,vz=sim?.Body.Velocity.Z??0;
      bool driving=sim!=null&&root;
      var effect=driving&&MutantRuntime.Active?MutantSkillEffectModel.Read(MutantRuntime.Run):null;
      if(driving&&!paused&&effect!=null&&effect.Nitro&&flameCounter++%3==0)
      {double gx=-Math.Sin(h),gz=-Math.Cos(h);Emit(x+gx*2.3,y-.1,z+gz*2.3,vx+gx*12,vz+gz*12,flameCounter%2!=0?0xff7a3c:0x5ab4ff,.35);}
      Skills(dt,effect,x,y,z,h,vx,vz);
      TickPuffs(dt);
      Gates();
    }

    // TS tozVeDuman (ortak.ts) + carpismalar çalı/su dalları: her yeni sabit adımda bir kez, son fizik durumundan.
    private void ObservePhysics(PowertrainVehicle sim)
    {
      var b=sim.Body;int steps=b.Steps;if(observedSteps<0||steps<observedSteps){observedSteps=steps;return;}
      int n=Math.Min(8,steps-observedSteps);observedSteps=steps;
      var p=sim.ReferencePoint;double h=Heading(b),v=JsMath.Hypot(b.Velocity.X,b.Velocity.Z);
      double fx=Math.Sin(h),fz=Math.Cos(h),vl=b.Velocity.X*fx+b.Velocity.Z*fz,vt=b.Velocity.X*fz-b.Velocity.Z*fx;
      double kappa=0,alpha=0;for(int i=2;i<4;i++){kappa=Math.Max(kappa,Math.Abs(b.Wheels[i].Kappa));alpha=Math.Max(alpha,Math.Abs(b.Wheels[i].TanAlpha));}
      bool driftRace=owner.Race?.Event.Type=="dp";double beta=Math.Atan2(vt,Math.Max(Math.Abs(vl),1));
      bool drift=!b.Airborne&&v>(driftRace?7:10)&&(driftRace?sim.Assist.On:sim.Assist.On||Math.Abs(beta)>.5);
      int si=b.CenterSurface;bool dust=!b.Airborne&&(si==0||si==3||si>=4)&&v>6,smoke=!b.Airborne&&v>5&&(kappa>.25||alpha>.3||drift);
      var env=owner.SourceEnvironment?owner.SourceEnvironment.Current:null;bool snowy=env!=null&&env.theme=="snow";int bush=env!=null?env.bush:0x3f7d33;
      for(int k=0;k<n;k++)
      {
        if((smoke||dust)&&cosmetic.NextDouble()<.85)foreach(double s in new[]{-.9,.9})if(cosmetic.NextDouble()<.6)
          Emit(p.X-fx*1.6+Math.Cos(h)*s,p.Y,p.Z-fz*1.6-Math.Sin(h)*s,b.Velocity.X,b.Velocity.Z,Ground(si));
        if(owner.World is IVehicleCollisionWorld collisions)foreach(var ob in collisions.Near(p.X,p.Z,b.Position.Y))
        {
          double dd=JsMath.Hypot(p.X-ob.X,p.Z-ob.Z);
          if(ob.Type=="bush"){if(dd<ob.Radius+1&&!snowy&&cosmetic.NextDouble()<.4)Emit(p.X,p.Y,p.Z,b.Velocity.X,b.Velocity.Z,bush);}
          else if(ob.Type!="box"&&ob.Type!="solid"&&dd<ob.Radius)Splash(p,h,v,b);
        }
        if(owner.World is IVehicleWaterWorld water&&water.WaterCount(p.X,p.Z)>0)Splash(p,h,v,b);
      }
    }
    private void Splash(BodyVector p,double h,double v,VehicleState b)
    {if(v>4)foreach(double s in new[]{-1.0,1.0})if(cosmetic.NextDouble()<.7)Emit(p.X+Math.Cos(h)*s,p.Y,p.Z-Math.Sin(h)*s,b.Velocity.X*.5,b.Velocity.Z*.5,0xcfe3f0);}
    private static double Heading(VehicleState b){var f=b.Orientation.Rotate(new BodyVector(0,0,1));return Math.Atan2(f.X,f.Z);}
    /// TS zeminRengi.
    public static int Ground(int si)=>si>=4?0xf2f6f8:si==3?0x4a3524:si==1?0xe6e6e6:si==2?0x9a8f6a:0xbfa07a;

    private void TickPuffs(float dt)
    {
      var cam=owner.FollowCamera?owner.FollowCamera.transform:null;bool cockpit=PlayerPreferences.Current.Camera==3;
      foreach(var p in puffs)
      {
        if(p.L<=0)continue;p.L-=dt*1.1;p.T.position+=p.V*dt;float s=(float)(p.B*(1+(1-p.L)*3));p.T.localScale=new Vector3(s,s,s);
        var c=p.M.color;c.a=(float)Math.Max(0,p.L*.45);if(cockpit&&cam&&(p.T.position-cam.position).sqrMagnitude<25)c.a=0;p.M.color=c;
        if(p.L<=0)p.T.gameObject.SetActive(false);
      }
    }

    // TS beceriEfektleri: kanca halatı/ucu, hedef halkası/sütunu, hayalet gövde, Risk Taker alev/kor, rüzgâr, açılış halkası.
    private void Skills(float dt,MutantSkillEffectModel e,double x,double y,double z,double h,double vx,double vz)
    {
      Vector3? hook=null;
      if(e!=null)
      {
        if(e.HookOpponent){var u=owner.OpponentVisual;if(u)hook=u.position+Vector3.up*.8f;}
        else if(e.HookPoint!=null){var k=e.HookPoint;hook=U(k[0],k.Length>2?k[2]:owner.World.Height(k[0],k[1])+.5,k[1]);}
      }
      if(hook.HasValue)
      {
        double fx=Math.Sin(h),fz=Math.Cos(h);Vector3 A=U(x+fx*1.6,y+.7,z+fz*1.6),B=hook.Value;
        rope.position=(A+B)*.5f;rope.localScale=new Vector3(1,(B-A).magnitude,1);rope.rotation=Quaternion.FromToRotation(Vector3.up,(B-A).normalized);
        tip.position=B;tip.rotation*=Quaternion.Euler(0,-dt*9*Mathf.Rad2Deg,0);
        ropeMat.color=Hsl(.53f,1,.6f+.12f*Mathf.Sin((float)t*40));
        if(!onceHook)Pulse(0x40e0ff);
      }
      rope.gameObject.SetActive(hook.HasValue);tip.gameObject.SetActive(hook.HasValue);
      var hd=!hook.HasValue?e?.HookTarget:null;targetRing.gameObject.SetActive(hd!=null);targetColumn.gameObject.SetActive(hd!=null);
      if(hd!=null)
      {
        float n=.5f+.5f*Mathf.Sin((float)t*9);targetRing.position=U(hd[0],hd[1],hd[2]);targetRing.rotation*=Quaternion.Euler(0,-dt*3*Mathf.Rad2Deg,0);
        targetRing.localScale=Vector3.one*(.9f+.35f*n);var c=targetMat.color;c.a=.55f+.4f*n;targetMat.color=c;
        double zy=owner.World.Height(hd[0],hd[2]),tall=Math.Max(2,hd[1]-zy+6);targetColumn.position=U(hd[0],zy+tall/2,hd[2]);targetColumn.localScale=new Vector3(1,(float)tall,1);
        c=columnMat.color;c.a=.15f+.2f*n;columnMat.color=c;
      }
      onceHook=hook.HasValue;
      bool ghost=e!=null&&e.Ghost;var body=owner.SourceVehicle?owner.SourceVehicle.Scene:null;
      if(ghost!=onceGhost){if(body)body.SetGhost(ghost);Pulse(0x9fe8ff);}
      if(ghost&&body)body.SetGhostOpacity(.26f+.1f*Mathf.Sin((float)t*12));
      onceGhost=ghost;
      bool on=e!=null&&e.Transform;if(on&&!onceTransform)Pulse(0xff7a1f);onceTransform=on;
      counter++;
      if(e!=null&&on&&counter%2==0)
      {double gx=-Math.Sin(h),gz=-Math.Cos(h),yx=Math.Cos(h),yz=-Math.Sin(h),side=counter%4!=0?.8:-.8;Emit(x+gx*2+yx*side,y-.2,z+gz*2+yz*side,vx*.6,vz*.6,counter%6!=0?0xff6a1f:0xffc23c,.5);}
      if(e!=null&&ghost&&counter%5==0)Emit(x+(cosmetic.NextDouble()-.5)*2,y,z+(cosmetic.NextDouble()-.5)*3,vx*.8,vz*.8,0xcfefff,.6);
      if(e!=null&&e.Wind&&counter%3==0)
      {double yx=Math.Cos(h),yz=-Math.Sin(h),side=counter%2!=0?1.3:-1.3;Emit(x+yx*side,y+.4,z+yz*side,-vx*.5,-vz*.5,0x8fd0ff,.3);}
      exhaust.gameObject.SetActive(e!=null&&on);
      if(e!=null&&on)
      {
        exhaust.position=U(x,y,z);exhaust.rotation=Yaw(h);
        for(int i=0;i<exhaust.childCount;i++){float s=1+.35f*Mathf.Sin((float)t*37+i*2.1f);exhaust.GetChild(i).localScale=new Vector3(s*.9f,s*1.8f,s*.9f);}
      }
      var trail=e?.Trail??Array.Empty<double[]>();
      for(int i=0;i<embers.Count;i++)
      {
        var m=embers[i];double[] p=i<trail.Length?trail[trail.Length-1-i]:null;m.gameObject.SetActive(p!=null&&e!=null);if(p==null||e==null)continue;
        float s=(float)Math.Min(1,p[2]/.6)*(.85f+.25f*Mathf.Sin((float)t*30+i));
        m.position=U(p[0],owner.World.Height(p[0],p[1])+.6*s,p[1]);m.localScale=new Vector3(s,s*(1+.3f*Mathf.Sin((float)t*22+i*1.7f)),s);
      }
      if(ringLeft>0&&e!=null)
      {
        ringLeft-=dt;float k=(float)(1-ringLeft/.45);ring.gameObject.SetActive(true);ring.position=U(x,y-.3,z);ring.localScale=Vector3.one*(1+k*3);
        var c=ringMat.color;c.a=.85f*(1-k);ringMat.color=c;
      }
      else ring.gameObject.SetActive(false);
    }
    private void Pulse(int color){ringMat.color=Hex(color,ringMat.color.a);ringLeft=.45;}
    private static Color Hsl(float hue,float s,float l)
    {
      float q=l<.5f?l*(1+s):l+s-l*s,p=2*l-q;
      float C(float k){k=(k%1+1)%1;return k<1/6f?p+(q-p)*6*k:k<.5f?q:k<2/3f?p+(q-p)*(2/3f-k)*6:p;}
      return new Color(C(hue+1/3f),C(hue),C(hue-1/3f));
    }

    // TS sokakKapilariKur: sokak yarışında ~250 m'de bir kapı, bitişte beyaz bant; yalnız yarış sürerken.
    public const double GateSpacing=250;
    private void Gates()
    {
      var track=owner.Race!=null?owner.RaceDefinition:null;string key=track!=null&&track.IsStreet?track.Key:"";
      if(key==gateKey)return;gateKey=key;
      if(gates){Destroy(gates.gameObject);gates=null;}
      if(key=="")return;
      gates=new GameObject("TS sokak kapıları").transform;gates.SetParent(transform,false);
      var g=track.Geometry;double last=0;
      for(int i=1;i<g.N;i++)if(g.S[i]-last>=GateSpacing){last=g.S[i];Gate(g,i,false);}
      Gate(g,g.Open?g.N-1:0,true);
    }
    private void Gate(TrackGeometry g,int i,bool finish)
    {
      double x=g.X[i],z=g.Z[i],tx=g.Tx[i],tz=g.Tz[i],nx=tz,nz=-tx,w=g.HalfWidth+1;
      foreach(int s in new[]{-1,1}){var post=Instantiate(Prototype("gate-post").gameObject,gates);post.SetActive(true);post.transform.position=U(x+nx*w*s,3,z+nz*w*s);post.transform.rotation=Quaternion.identity;}
      // Kaynak örneğinde bant 2·10 m; aynı kutu bu rotanın 2w genişliğine ölçeklenir.
      var band=Instantiate(Prototype(finish?"gate-finish":"gate-band").gameObject,gates);band.SetActive(true);
      band.transform.position=U(x,6,z);band.transform.rotation=Yaw(Math.Atan2(tx,tz));band.transform.localScale=new Vector3((float)(w/10),1,1);
    }
  }
}
