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
    private Camera camera;private GameObject rig,car;private RenderTexture target;private readonly List<Object> resources=new List<Object>();private int shown=-1;private float angle=-35;private bool visible,drag;
    private void Awake()
    {
      Image=new Image{scaleMode=ScaleMode.ScaleToFit};Image.style.flexGrow=1;Image.name="garage-car-preview";
      Image.RegisterCallback<PointerDownEvent>(e=>{if(e.button==0){drag=true;Image.CapturePointer(e.pointerId);}});
      Image.RegisterCallback<PointerMoveEvent>(e=>{if(drag)angle+=e.deltaPosition.x*.45f;});
      Image.RegisterCallback<PointerUpEvent>(e=>{drag=false;Image.ReleasePointer(e.pointerId);});Image.RegisterCallback<PointerCaptureOutEvent>(_=>drag=false);
      rig=new GameObject("Garaj vitrin render");DontDestroyOnLoad(rig);rig.transform.position=new Vector3(10000,10000,10000);
      var cg=new GameObject("Vitrin kamera");cg.transform.SetParent(rig.transform,false);camera=cg.AddComponent<Camera>();camera.enabled=false;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.05f,.07f,.09f,0);camera.cullingMask=1<<31;camera.nearClipPlane=.1f;camera.farClipPlane=30;camera.fieldOfView=30;
      target=new RenderTexture(1000,650,24);target.Create();camera.targetTexture=target;Image.image=target;
      var light=new GameObject("Vitrin ışığı").AddComponent<Light>();light.transform.SetParent(rig.transform,false);light.type=LightType.Directional;light.intensity=1.8f;light.transform.rotation=Quaternion.Euler(40,-30,0);light.cullingMask=1<<31;
    }
    public void SetVisible(bool value){visible=value;if(rig)rig.SetActive(value);}
    public void Build(GarageCarDetail d,int id)
    {
      if(id==shown&&car)return;shown=id;if(car)Destroy(car);foreach(var item in resources)if(item)Destroy(item);resources.Clear();
      car=new GameObject("Katalog aracı");car.transform.SetParent(rig.transform,false);
      var model=LastTurn.Prototype.SourceVehicleView.Create(d.ModelKey,car.transform,31);if(model){model.SetCockpit(false);return;}
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
    {if(!visible||!camera||!car)return;car.transform.localRotation=Quaternion.Euler(0,angle,0);camera.transform.localPosition=new Vector3(0,2.4f,8.8f);camera.transform.LookAt(rig.transform.position+new Vector3(0,.65f,0));camera.Render();}
    private void OnDestroy(){foreach(var item in resources)if(item)Destroy(item);if(target){target.Release();Destroy(target);}if(rig)Destroy(rig);}
  }
}
