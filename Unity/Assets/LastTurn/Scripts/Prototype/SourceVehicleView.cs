using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Prototype
{
  // Kaynak araç/kokpit animasyonu; simülasyon yalnız okunur.
  public sealed class SourceVehicleView:MonoBehaviour
  {
    public SourceScene Scene {get;private set;}
    public int MirrorFrames {get;private set;}
    private Transform steering,speedNeedle,rpmNeedle,interior;
    private readonly Transform[] wheels=new Transform[4],spins=new Transform[4];
    private readonly float[] wheelY=new float[4];
    private Camera rear;private RenderTexture target;private Material mirror;private int frames;
    public Vector3 Eye=>SourceScene.Point(Scene.Data.eye);
    public static SourceVehicleView Create(string key,Transform parent,int layer=0)
    {
      var scene=SourceScene.Create("car-"+key,parent,layer);if(!scene)return null;var view=scene.gameObject.AddComponent<SourceVehicleView>();view.Scene=scene;
      scene.Tags.TryGetValue("steering",out view.steering);scene.Tags.TryGetValue("speed-needle",out view.speedNeedle);scene.Tags.TryGetValue("rpm-needle",out view.rpmNeedle);scene.Tags.TryGetValue("interior",out view.interior);
      for(int i=0;i<4;i++){scene.Tags.TryGetValue("wheel-pivot-"+i,out view.wheels[i]);scene.Tags.TryGetValue("wheel-spin-"+i,out view.spins[i]);if(view.wheels[i])view.wheelY[i]=view.wheels[i].localPosition.y;}
      return view;
    }
    public void Pose(Vector3 origin,Quaternion rotation,PowertrainVehicle simulation,VehicleState previous,VehicleState current,float alpha,bool cockpit)
    {
      transform.SetPositionAndRotation(origin,rotation);SetCockpit(cockpit);
      if(steering)steering.localRotation=Quaternion.AngleAxis((float)(simulation.Engine.SteeringAngle*2.5*Mathf.Rad2Deg),Vector3.forward);
      if(speedNeedle)speedNeedle.localRotation=Quaternion.AngleAxis(135+Mathf.Clamp01((float)current.Velocity.Length*3.6f/320)*270,Vector3.forward);
      if(rpmNeedle)rpmNeedle.localRotation=Quaternion.AngleAxis(135+Mathf.Clamp01((float)simulation.Engine.Rpm/1000/Scene.Data.gaugeRpm)*270,Vector3.forward);
      for(int i=0;i<4;i++)
      {
        if(wheels[i]){var p=wheels[i].localPosition;var w=simulation.Parameters.Chassis.Wheels[i];p.y=wheelY[i]+Mathf.Clamp((float)GtPresentation.Blend(previous.Wheels[i].Compression,current.Wheels[i].Compression,alpha)-(float)w.StaticCompression,-.12f,.16f);wheels[i].localPosition=p;wheels[i].localRotation=Quaternion.AngleAxis(-GtPresentation.Degrees(GtPresentation.Steering(w,simulation.Parameters.Chassis.Wheelbase,simulation.Engine.SteeringAngle)),Vector3.up);}
        if(spins[i])spins[i].localRotation=Quaternion.AngleAxis(GtPresentation.Degrees(GtPresentation.Blend(previous.Wheels[i].Angle,current.Wheels[i].Angle,alpha)),Vector3.right);
      }
      if(cockpit&&++frames%2==0)RenderMirror();
    }
    /// TS uzak-arac-modeli uzakAraclariCiz: anlık görüntüden konum/yönelim, süspansiyon (s0–s3), teker dönüşü ve ön
    /// tekerde ham direksiyon açısı (delta); iç mekân çizilmez.
    public void PoseRemote(Vector3 origin,Quaternion rotation,double[] show,double[] wheelAngles,PowertrainParameters parameters)
    {
      transform.SetPositionAndRotation(origin,rotation);SetCockpit(false);
      for(int i=0;i<4;i++)
      {
        if(wheels[i]){var p=wheels[i].localPosition;p.y=wheelY[i]+(float)show[21+i];wheels[i].localPosition=p;wheels[i].localRotation=parameters.Chassis.Wheels[i].Front?Quaternion.AngleAxis(-(float)(show[12]*Mathf.Rad2Deg),Vector3.up):Quaternion.identity;}
        if(spins[i])spins[i].localRotation=Quaternion.AngleAxis(GtPresentation.Degrees(wheelAngles[i]),Vector3.right);
      }
    }
    public void SetCockpit(bool cockpit)
    {
      if(interior)interior.gameObject.SetActive(cockpit);foreach(var tag in Scene.Tags)if(tag.Key.StartsWith("panel-"))tag.Value.gameObject.SetActive(!cockpit);
      foreach(var m in Scene.Glass){var color=m.color;color.a=cockpit?.12f:1;m.color=color;m.SetFloat("_ZWrite",cockpit?0:1);m.renderQueue=cockpit?3000:2000;}
      if(!Scene.GhostMode)foreach(var face in Scene.MirrorFaces){if(cockpit){EnsureMirror();face.sharedMaterial=mirror;}else {var m=face.sharedMaterial;if(m==mirror)face.sharedMaterial=ClosedMirror();}}
    }
    private Material closed;
    private Material ClosedMirror(){if(!closed){closed=new Material(Resources.Load<Shader>("SourcePresentation/SourceLambert"));closed.color=new Color(42/255f,53/255f,64/255f);}return closed;}
    private void EnsureMirror()
    {
      if(rear)return;var go=new GameObject("TS arka ayna kamera");go.transform.SetParent(transform,false);rear=go.AddComponent<Camera>();rear.enabled=false;rear.fieldOfView=42;rear.aspect=3;rear.nearClipPlane=.5f;rear.farClipPlane=400;
      go.transform.localPosition=SourceScene.Point(Scene.Data.mirrorPosition);go.transform.localRotation=SourceScene.Rotation(Scene.Data.mirrorRotation)*Quaternion.Euler(0,180,0);
      target=new RenderTexture(384,128,16);target.Create();rear.targetTexture=target;rear.backgroundColor=Camera.main?Camera.main.backgroundColor:new Color(.45f,.6f,.7f);rear.clearFlags=CameraClearFlags.SolidColor;
      mirror=new Material(Resources.Load<Shader>("SourcePresentation/SourceLambert"));mirror.SetFloat("_Lit",0);mirror.mainTexture=target;
    }
    private void RenderMirror(){EnsureMirror();foreach(var face in Scene.MirrorFaces)face.enabled=false;rear.Render();MirrorFrames++;foreach(var face in Scene.MirrorFaces)face.enabled=true;}
    private void OnDestroy(){if(target){target.Release();Destroy(target);}if(mirror)Destroy(mirror);if(closed)Destroy(closed);}
  }
}
