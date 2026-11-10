using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // Mevcut katalog siluetinin 3B vitrini; yeni araç varlığı veya fizik/collider üretmez.
  public sealed class GarageVehiclePreview:MonoBehaviour
  {
    public Image Image {get;private set;}
    private Camera camera;private GameObject rig,car;private LastTurn.Prototype.SourceScene garage;private Light keyLight;
    /// TS garaj sahnesi kurulduysa (beton otopark, kolonlar, halka, hüzme; garajIsigi ortamı).
    public bool SourceGarage=>garage;
    /// Tam ekran arka plan (F tasarımındaki arka-garaj): görüntü ekranı kaplar, araç ortadaki boşlukta durur.
    public bool FullScreen{get;private set;}private RenderTexture target;private readonly List<Object> resources=new List<Object>();private int shown=-1;private float angle=-35;private bool visible,drag;
    private void Awake()
    {
      Image=new Image{scaleMode=ScaleMode.ScaleToFit};Image.style.flexGrow=1;Image.name="garage-car-preview";
      Image.RegisterCallback<PointerDownEvent>(e=>{if(e.button==0){drag=true;Image.CapturePointer(e.pointerId);}});
      Image.RegisterCallback<PointerMoveEvent>(e=>{if(drag)angle+=e.deltaPosition.x*.45f;});
      Image.RegisterCallback<PointerUpEvent>(e=>{drag=false;Image.ReleasePointer(e.pointerId);});Image.RegisterCallback<PointerCaptureOutEvent>(_=>drag=false);
      rig=new GameObject("Garaj vitrin render");DontDestroyOnLoad(rig);rig.transform.position=new Vector3(10000,10000,10000);
      var cg=new GameObject("Vitrin kamera");cg.transform.SetParent(rig.transform,false);camera=cg.AddComponent<Camera>();camera.enabled=false;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.05f,.07f,.09f,0);camera.cullingMask=1<<31;camera.nearClipPlane=.1f;camera.farClipPlane=30;camera.fieldOfView=30;
      target=new RenderTexture(1000,650,24);target.Create();camera.targetTexture=target;Image.image=target;
      garage=LastTurn.Prototype.SourceScene.Create("garage-scene",rig.transform,31);
      if(garage)
      {
        // TS garajIsigi: tepede gölgeli tek yönlü ışık + platform köşelerinde dört gölgesiz projektör.
        foreach(var l in garage.Data.lights)
        {
          var go=new GameObject("TS garaj ışığı · "+l.type);go.transform.SetParent(rig.transform,false);var light=go.AddComponent<Light>();light.cullingMask=1<<31;
          light.color=new Color(l.color[0],l.color[1],l.color[2]);light.intensity=l.intensity;var from=LastTurn.Prototype.SourceScene.Point(l.position);var to=LastTurn.Prototype.SourceScene.Point(l.target);
          go.transform.localPosition=from;go.transform.localRotation=Quaternion.LookRotation(to-from,Vector3.up);
          if(l.type=="spot"){light.type=LightType.Spot;light.spotAngle=l.angle*2*Mathf.Rad2Deg;light.innerSpotAngle=light.spotAngle*(1-l.penumbra);light.range=40;light.shadows=LightShadows.None;}
          else{light.type=LightType.Directional;light.shadows=l.shadow?LightShadows.Soft:LightShadows.None;keyLight=light;}
        }
        foreach(var r in garage.GetComponentsInChildren<Renderer>(true))r.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;
        var c=garage.Data.background;camera.backgroundColor=new Color(c[0],c[1],c[2],1);camera.farClipPlane=60;
      }
      else
      {
        var light=new GameObject("Vitrin ışığı").AddComponent<Light>();light.transform.SetParent(rig.transform,false);light.type=LightType.Directional;light.intensity=1.8f;light.transform.rotation=Quaternion.Euler(40,-30,0);light.cullingMask=1<<31;
      }
    }
    /// Garaj/Modifiye: TS sahnesi tam ekran arka plan; Mağaza kutusunda aynı sahne kutuya sığar.
    public void SetFullScreen(bool value)
    {
      if(FullScreen==value)return;FullScreen=value;Image.scaleMode=value?ScaleMode.ScaleAndCrop:ScaleMode.ScaleToFit;
      target.Release();Destroy(target);target=value?new RenderTexture(1920,1080,24):new RenderTexture(1000,650,24);target.Create();camera.targetTexture=target;Image.image=target;
      if(value){Image.style.position=Position.Absolute;Image.style.left=Image.style.top=Image.style.right=Image.style.bottom=0;}else{Image.style.position=Position.Relative;}
    }
    public void SetVisible(bool value){visible=value;if(rig)rig.SetActive(value);}
    public void Build(GarageCarDetail d,int id)
    {
      if(id==shown&&car)return;shown=id;if(car)Destroy(car);foreach(var item in resources)if(item)Destroy(item);resources.Clear();
      car=new GameObject("Katalog aracı");car.transform.SetParent(rig.transform,false);
      var model=LastTurn.Prototype.SourceVehicleView.Create(d.ModelKey,car.transform,31);
      // TS garaj modu: araç platformda (S.y = 0,12).
      if(model){model.SetCockpit(false);if(garage)model.transform.localPosition=new Vector3(0,.12f,0);return;}
      Color color=new Color(((d.BodyColor>>16)&255)/255f,((d.BodyColor>>8)&255)/255f,(d.BodyColor&255)/255f);
      Extrude(d.Outline,(float)d.Width,color);Extrude(d.Windows,(float)d.Width+.012f,new Color(.08f,.13f,.18f));
      foreach(double x in new[]{-d.WheelX,d.WheelX})foreach(double z in new[]{d.WheelFront,d.WheelRear})
      {var wheel=GameObject.CreatePrimitive(PrimitiveType.Cylinder);wheel.name="Teker";wheel.layer=31;wheel.transform.SetParent(car.transform,false);wheel.transform.localPosition=new Vector3((float)x,(float)d.WheelRadius,(float)z);wheel.transform.localRotation=Quaternion.Euler(0,0,90);wheel.transform.localScale=new Vector3((float)d.WheelRadius*2,.12f,(float)d.WheelRadius*2);var collider=wheel.GetComponent<Collider>();collider.enabled=false;Destroy(collider);var mat=Material(new Color(.08f,.09f,.1f));wheel.GetComponent<Renderer>().sharedMaterial=mat;}
    }
    private Material Material(Color color){var shader=Shader.Find("Universal Render Pipeline/Lit");if(!shader)shader=Shader.Find("Standard");var mat=new Material(shader);mat.color=color;resources.Add(mat);return mat;}
    private void Extrude(double[][] outline,float width,Color color)
    {
      if(outline.Length<3)return;var v=new List<Vector3>();var t=new List<int>();int n=outline.Length;
      for(int side=0;side<2;side++)foreach(var p in outline)v.Add(new Vector3((side==0?-1:1)*width/2,(float)p[1],(float)p[0]));
      for(int i=1;i<n-1;i++){t.AddRange(new[]{0,i+1,i,n,n+i,n+i+1});}
      for(int i=0;i<n;i++){int j=(i+1)%n;t.AddRange(new[]{i,j,n+j,i,n+j,n+i});}
      var mesh=new Mesh{name="Katalog silueti"};mesh.SetVertices(v);mesh.SetTriangles(t,0);mesh.RecalculateNormals();mesh.RecalculateBounds();resources.Add(mesh);
      var go=new GameObject("Gövde",typeof(MeshFilter),typeof(MeshRenderer));go.layer=31;go.transform.SetParent(car.transform,false);go.GetComponent<MeshFilter>().sharedMesh=mesh;go.GetComponent<MeshRenderer>().sharedMaterial=Material(color);
    }
    private void LateUpdate()
    {
      if(!visible||!camera||!car)return;car.transform.localRotation=Quaternion.Euler(0,angle,0);
      // Tam ekranda araç F yerleşimindeki orta boşlukta kalsın: aynı piksel ölçeği (dikey FOV), bakış biraz aşağıda.
      camera.fieldOfView=FullScreen?45.6f:30;camera.transform.localPosition=new Vector3(0,2.4f,8.8f);camera.transform.LookAt(rig.transform.position+new Vector3(0,FullScreen?-.15f:.65f,0));
      if(!garage){camera.Render();return;}
      // TS garajIsigi sisi/yarım küre ışığı yalnız bu çizimde; oyunun ortam ayarı geri yüklenir.
      bool fog=RenderSettings.fog;var mode=RenderSettings.fogMode;var fc=RenderSettings.fogColor;float fs=RenderSettings.fogStartDistance,fe=RenderSettings.fogEndDistance;
      var am=RenderSettings.ambientMode;Color sky=RenderSettings.ambientSkyColor,eq=RenderSettings.ambientEquatorColor,gr=RenderSettings.ambientGroundColor;var d=garage.Data;
      RenderSettings.fog=true;RenderSettings.fogMode=FogMode.Linear;RenderSettings.fogColor=new Color(d.fogColor[0],d.fogColor[1],d.fogColor[2]);RenderSettings.fogStartDistance=d.fogRange[0];RenderSettings.fogEndDistance=d.fogRange[1];
      RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Trilight;var hs=new Color(d.hemiSky[0],d.hemiSky[1],d.hemiSky[2])*d.hemiIntensity;var hg=new Color(d.hemiGround[0],d.hemiGround[1],d.hemiGround[2])*d.hemiIntensity;
      RenderSettings.ambientSkyColor=hs;RenderSettings.ambientGroundColor=hg;RenderSettings.ambientEquatorColor=Color.Lerp(hs,hg,.5f);
      try{camera.Render();}
      finally{RenderSettings.fog=fog;RenderSettings.fogMode=mode;RenderSettings.fogColor=fc;RenderSettings.fogStartDistance=fs;RenderSettings.fogEndDistance=fe;RenderSettings.ambientMode=am;RenderSettings.ambientSkyColor=sky;RenderSettings.ambientEquatorColor=eq;RenderSettings.ambientGroundColor=gr;}
    }
    private void OnDestroy(){foreach(var item in resources)if(item)Destroy(item);if(target){target.Release();Destroy(target);}if(rig)Destroy(rig);}
  }
}
