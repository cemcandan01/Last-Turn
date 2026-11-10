using System;
using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;
using UnityEngine.Rendering;

namespace LastTurn.Prototype
{
  // applyEnv/precipTick'in platform sunumu. Hava tutuşuna ve fizik RNG'sine yazmaz.
  public sealed class SourceEnvironmentView:MonoBehaviour
  {
    [Serializable]public sealed class Entry{public string theme,time,weather,texture;public float[] sky,fog,skyLight,groundLight,sun,repeat;public float ambient,sunIntensity;public int leaf,trunk,rock,bush;public bool night;}
    [Serializable]private sealed class Table{public Entry[] entries;}
    private static Table table;private Entry entry;private Camera camera;private GtPrototype owner;private Light sun,headlight;private GameObject floor;private Material floorMat,precipMat;private Mesh precipMesh;private Transform cloud;private readonly Vector3[] points=new Vector3[1600];private readonly Vector3[] vertices=new Vector3[6400];private readonly System.Random random=new System.Random(7);
    public string Key{get;private set;}="";
    public Entry Current=>entry;
    public string ConditionsKey=>entry==null?"":entry.time+"/"+entry.weather;
    private static Color C(float[] a)=>new Color(a[0],a[1],a[2]);
    private static Color Hex(int n)=>new Color(((n>>16)&255)/255f,((n>>8)&255)/255f,(n&255)/255f);
    public void Configure(GtPrototype prototype,string key,RaceConditions conditions)
    {
      owner=prototype;camera=prototype.FollowCamera.GetComponent<Camera>();if(table==null){var data=Resources.Load<TextAsset>("SourcePresentation/environments");if(!data)return;table=JsonUtility.FromJson<Table>(data.text);}
      string theme=RaceConditions.ThemeOf(key),time=conditions.Night?"night":conditions.TimeOfDay;entry=Array.Find(table.entries,e=>e.theme==theme&&e.time==time&&e.weather==conditions.Weather);if(entry==null)throw new InvalidOperationException("Kaynak ortam koşulu eksik: "+theme+"/"+time+"/"+conditions.Weather);Key=key;
      camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=C(entry.sky);camera.farClipPlane=1500;RenderSettings.fog=true;RenderSettings.fogMode=FogMode.Linear;RenderSettings.fogColor=camera.backgroundColor;RenderSettings.fogStartDistance=entry.fog[0];RenderSettings.fogEndDistance=entry.fog[1];
      RenderSettings.ambientMode=AmbientMode.Trilight;RenderSettings.ambientSkyColor=C(entry.skyLight)*entry.ambient;RenderSettings.ambientGroundColor=C(entry.groundLight)*entry.ambient;RenderSettings.ambientEquatorColor=Color.Lerp(C(entry.skyLight),C(entry.groundLight),.5f)*entry.ambient;
      if(!sun){foreach(var light in FindObjectsByType<Light>(FindObjectsSortMode.None))if(light.type==LightType.Directional&&light.gameObject.layer!=31){sun=light;break;}if(!sun)sun=new GameObject("TS güneş").AddComponent<Light>();}
      sun.type=LightType.Directional;sun.color=C(entry.sun);sun.intensity=entry.sunIntensity;Vector3 direction=time=="morning"?new Vector3(80,45,60):time=="evening"&&!entry.night?new Vector3(-85,28,-40):new Vector3(-60,120,40);sun.transform.rotation=Quaternion.LookRotation(-direction);sun.shadows=PlayerPreferences.Current.On("shd")?LightShadows.Soft:LightShadows.None;QualitySettings.shadowDistance=90;
      if(!floor){floor=GameObject.CreatePrimitive(PrimitiveType.Quad);floor.name="TS kayan zemin";var col=floor.GetComponent<Collider>();col.enabled=false;Destroy(col);floor.transform.SetParent(transform,false);floor.transform.localRotation=Quaternion.Euler(90,0,0);floor.transform.localScale=new Vector3(3000,3000,1);floorMat=new Material(Resources.Load<Shader>("SourcePresentation/SourceLambert"));floor.GetComponent<Renderer>().sharedMaterial=floorMat;}
      floorMat.mainTexture=Resources.Load<Texture2D>("SourcePresentation/"+System.IO.Path.GetFileNameWithoutExtension(entry.texture));floorMat.mainTexture.wrapMode=TextureWrapMode.Repeat;floorMat.mainTextureScale=new Vector2(entry.repeat[0],entry.repeat[1]);
      // TS oyun/bolge.ts: ralli çukurlarını y=−0,2 düzlemi örtmemeli.
      floor.SetActive(!key.StartsWith("rl_",StringComparison.Ordinal));
      foreach(var scene in GetComponentsInChildren<SourceScene>())foreach(var renderer in scene.GetComponentsInChildren<Renderer>())foreach(var material in renderer.sharedMaterials){if(material.name=="leaf")material.color=Hex(entry.leaf);else if(material.name=="trunk")material.color=Hex(entry.trunk);else if(material.name=="rock")material.color=Hex(entry.rock);else if(material.name=="bush")material.color=Hex(entry.bush);}
      if(!cloud)BuildPrecip();cloud.gameObject.SetActive(entry.weather!="sun");precipMat.color=entry.weather=="snow"?new Color(1,1,1,.85f):new Color(169/255f,184/255f,200/255f,.85f);
    }
    private void BuildPrecip()
    {
      cloud=new GameObject("TS yağış · 1600 nokta",typeof(MeshFilter),typeof(MeshRenderer)).transform;cloud.SetParent(transform,false);precipMesh=new Mesh{name="TS yağış"};precipMesh.MarkDynamic();var triangles=new int[1600*6];
      for(int i=0;i<1600;i++){points[i]=new Vector3((float)(random.NextDouble()-.5)*70,(float)random.NextDouble()*30,(float)(random.NextDouble()-.5)*70);int n=i*4,k=i*6;triangles[k]=n;triangles[k+1]=n+1;triangles[k+2]=n+2;triangles[k+3]=n;triangles[k+4]=n+2;triangles[k+5]=n+3;}
      precipMesh.vertices=vertices;precipMesh.triangles=triangles;cloud.GetComponent<MeshFilter>().sharedMesh=precipMesh;precipMat=new Material(Resources.Load<Shader>("SourcePresentation/SourceLambert"));precipMat.SetFloat("_Lit",0);precipMat.SetFloat("_Cull",0);precipMat.SetFloat("_ZWrite",0);precipMat.renderQueue=3000;cloud.GetComponent<Renderer>().sharedMaterial=precipMat;
    }
    private void LateUpdate()
    {
      if(entry==null||!camera||owner.Simulation==null)return;var body=owner.Simulation.ReferencePoint;floor.transform.position=new Vector3(-Mathf.Round((float)body.X/12.5f)*12.5f,-.2f,Mathf.Round((float)body.Z/12.5f)*12.5f);
      if(owner.SourceVehicle){if(!headlight){headlight=new GameObject("TS far").AddComponent<Light>();headlight.transform.SetParent(owner.SourceVehicle.transform,false);headlight.type=LightType.Spot;headlight.color=Hex(0xfff2d0);headlight.range=90;headlight.spotAngle=.55f*2*Mathf.Rad2Deg;headlight.innerSpotAngle=headlight.spotAngle*.55f;headlight.transform.localPosition=new Vector3(0,1.1f,1.8f);}headlight.intensity=entry.night?2.4f:0;}
      if(entry.weather=="sun")return;float dt=Time.deltaTime,t=Time.time;bool snow=entry.weather=="snow";float half=(snow?.22f:.09f)/2;var right=camera.transform.right*half;var up=camera.transform.up*half;
      cloud.position=camera.transform.position-Vector3.up*12;
      for(int i=0;i<points.Length;i++){var p=points[i];p.y-=(snow?2.2f:26)*dt;if(snow)p.x-=Mathf.Sin(t*1.3f+i)*dt*.8f;if(p.y<0){p.y+=30;p.x=(float)(random.NextDouble()-.5)*70;p.z=(float)(random.NextDouble()-.5)*70;}points[i]=p;int j=i*4;vertices[j]=p-right-up;vertices[j+1]=p+right-up;vertices[j+2]=p+right+up;vertices[j+3]=p-right+up;}precipMesh.vertices=vertices;precipMesh.RecalculateBounds();
    }
    private void OnDestroy(){if(floorMat)Destroy(floorMat);if(precipMat)Destroy(precipMat);if(precipMesh)Destroy(precipMesh);}
  }
}
