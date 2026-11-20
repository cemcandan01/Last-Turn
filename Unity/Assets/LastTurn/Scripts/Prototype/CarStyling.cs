using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Prototype
{
  public sealed class CarStyling : MonoBehaviour
  {
    private SourceScene scene;
    private CarAppearance current;
    private readonly Dictionary<MeshRenderer,Material> originals=new Dictionary<MeshRenderer,Material>();
    private readonly List<Material> owned=new List<Material>();
    private GameObject wing;
    private Mesh wingMesh;
    private Material wingMaterial;

    public static void Show(SourceVehicleView view,CarAppearance style)
    {
      if(!view || !view.Scene.BodyShell)return;
      var kit=view.GetComponent<CarStyling>();
      if(!kit && style.IsStock)return;
      if(!kit){kit=view.gameObject.AddComponent<CarStyling>();kit.scene=view.Scene;}
      if(!kit.current.Equals(style))kit.Apply(style);
    }
    private static Color ColorOf(int code,Color fallback)
    {
      if(code==0)return fallback;
      int rgb=code-1;return new Color32((byte)(rgb>>16),(byte)(rgb>>8),(byte)rgb,255);
    }
    private void Apply(CarAppearance style)
    {
      foreach(var pair in originals)pair.Key.sharedMaterial=pair.Value;
      originals.Clear();
      foreach(var m in owned)Destroy(m);owned.Clear();
      var body=scene.BodyShell;
      var mesh=body.GetComponent<MeshFilter>().sharedMesh;
      var bounds=mesh.bounds;
      var front=scene.Tags["wheel-pivot-0"].localPosition;
      var rear=scene.Tags["wheel-pivot-2"].localPosition;
      if(style.Paint!=0 || style.Fender!=0 || style.Graphic!=0)
      {
        var shader=Resources.Load<Shader>("SourcePresentation/CarLivery");
        foreach(var surface in scene.PaintSurfaces)
        {
          var original=surface.sharedMaterial;
          var paint=new Material(shader);owned.Add(paint);originals[surface]=original;
          paint.color=ColorOf(style.Paint,original.color);
          paint.SetColor("_Fender",ColorOf(style.Fender,Color.clear));
          paint.SetColor("_Ink",ColorOf(style.Ink,Color.white));
          paint.SetVector("_Wheels",new Vector4(front.z,rear.z,front.y,bounds.extents.x));
          paint.SetVector("_Fit",new Vector4(style.Shift*.32f,style.Shift*.14f,1+style.Scale*.18f,0));
          paint.SetFloat("_Pattern",style.Graphic);
          paint.SetFloat("_Showroom",gameObject.layer==31?1:0);
          paint.SetMatrix("_MeshToCar",transform.worldToLocalMatrix*surface.localToWorldMatrix);
          surface.sharedMaterial=paint;
        }
      }
      if(current.Wing!=style.Wing)
      {
        if(wing){wing.SetActive(false);Destroy(wing);Destroy(wingMesh);Destroy(wingMaterial);}
        foreach(var original in scene.FactoryWing)original.enabled=style.Wing==0;
        if(style.Wing!=0)BuildWing(mesh,style.Wing);
      }
      if(wing && style.Wing!=0)wingMaterial.color=ColorOf(style.Paint,new Color(.11f,.13f,.15f));
      current=style;
    }
    // Düşey ışını karoser üçgenleriyle kesiştirerek her siluetin bagaj yüksekliğini bulur.
    private static float Deck(Mesh mesh,float z)
    {
      var v=mesh.vertices;var t=mesh.triangles;float top=float.NegativeInfinity;
      var p=new Vector2(.01f,z);
      for(int i=0;i<t.Length;i+=3)
      {
        var a=v[t[i]];var b=v[t[i+1]];var c=v[t[i+2]];
        float den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
        if(Mathf.Abs(den)<.00001f)continue;
        float u=((b.z-c.z)*(p.x-c.x)+(c.x-b.x)*(p.y-c.z))/den;
        float w=((c.z-a.z)*(p.x-c.x)+(a.x-c.x)*(p.y-c.z))/den;
        if(u>=0 && w>=0 && u+w<=1)top=Mathf.Max(top,u*a.y+w*b.y+(1-u-w)*c.y);
      }
      return float.IsNegativeInfinity(top)?mesh.bounds.center.y:top;
    }
    private void BuildWing(Mesh body,int type)
    {
      var b=body.bounds;float z=Mathf.Lerp(b.min.z,b.max.z,.10f), deck=Deck(body,z);
      float half=b.extents.x*(type==1?.82f:type==2?.98f:1.08f);
      float height=type==1?.08f:type==2?.28f:.46f;
      var vertices=new List<Vector3>();var indices=new List<int>();
      // Dört noktalı kesiti iki uç arasında uzatır. Üst yüzü geriye doğru yükselir.
      void Blade(float x1,float x2,float y,float depth,float thickness,float rise)
      {
        int start=vertices.Count;
        foreach(float x in new[]{x1,x2}) {
          vertices.Add(new Vector3(x,y,-depth/2));vertices.Add(new Vector3(x,y+thickness+rise,-depth/2));
          vertices.Add(new Vector3(x,y+thickness,depth/2));vertices.Add(new Vector3(x,y,depth/2));
        }
        foreach(int k in new[]{0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7})indices.Add(start+k);
      }
      Blade(-half,half,height,type==1?.20f:.32f,.045f,type==1?.085f:.045f);
      foreach(float side in new[]{-1f,1f}){
        float x=half*.6f*side;Blade(x-.027f,x+.027f,-.025f,.15f,height+.045f,0);
        if(type==3){x=half*side;Blade(x-.018f,x+.018f,height-.075f,.39f,.17f,.035f);}
      }
      wing=new GameObject("Atölye · spoiler",typeof(MeshFilter),typeof(MeshRenderer));wing.layer=gameObject.layer;
      wing.transform.SetParent(scene.BodyShell.transform,false);wing.transform.localPosition=new Vector3(0,deck,z);
      wingMesh=new Mesh{name="Spoiler"};wingMesh.SetVertices(vertices);wingMesh.SetTriangles(indices,0);wingMesh.RecalculateNormals();
      var colors=new Color[vertices.Count];for(int i=0;i<colors.Length;i++)colors[i]=i<8?Color.white:new Color(.18f,.22f,.25f);wingMesh.colors=colors;
      wing.GetComponent<MeshFilter>().sharedMesh=wingMesh;
      wingMaterial=new Material(Resources.Load<Shader>("SourcePresentation/SourceLambert"));wingMaterial.SetFloat("_Cull",0);
      wing.GetComponent<MeshRenderer>().sharedMaterial=wingMaterial;
    }
    private void OnDestroy(){foreach(var m in owned)if(m)Destroy(m);if(wingMesh)Destroy(wingMesh);if(wingMaterial)Destroy(wingMaterial);}
  }
}
