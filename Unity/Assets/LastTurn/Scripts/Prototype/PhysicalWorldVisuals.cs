using System.Collections.Generic;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.Rendering;

namespace LastTurn.Prototype
{
  // Yalnız görsel temas hacimleri. Unity collider/Rigidbody eklenmez; gerçek çözüm Core'dadır.
  public sealed class PhysicalWorldVisuals:MonoBehaviour
  {
    public int ObstacleCount{get;private set;}
    private Transform content;private readonly List<Material> materials=new();
    public void Build(IVehicleWorld world,EnvironmentRegion region,bool terrain)
    {
      if(content){content.gameObject.SetActive(false);Destroy(content.gameObject);}content=new GameObject("TS fiziksel çevre · "+region.Key).transform;content.SetParent(transform,false);ObstacleCount=region.Objects.Length;
      Material Mat(Color c){var m=new Material(Shader.Find("Standard")){color=c};materials.Add(m);return m;}
      Mesh Primitive(PrimitiveType type){var o=GameObject.CreatePrimitive(type);o.GetComponent<Collider>().enabled=false;var mesh=o.GetComponent<MeshFilter>().sharedMesh;o.SetActive(false);Destroy(o);return mesh;}
      var cube=Primitive(PrimitiveType.Cube);var cylinder=Primitive(PrimitiveType.Cylinder);var sphere=Primitive(PrimitiveType.Sphere);
      var groups=new Dictionary<string,List<CombineInstance>>();
      void Add(string type,Mesh mesh,double x,double y,double z,double sx,double sy,double sz)
      {if(!groups.TryGetValue(type,out var list))groups[type]=list=new List<CombineInstance>();list.Add(new CombineInstance{mesh=mesh,transform=Matrix4x4.TRS(GtPresentation.Position(new BodyVector(x,y,z)),Quaternion.identity,new Vector3((float)sx,(float)sy,(float)sz))});}
      foreach(var o in region.Objects)
      {
        double ground=o.Top>0?0:world.Height(o.X,o.Z);
        if(o.Type=="box"){double h=o.Top>0?o.Top:1.6;Add("box",cube,o.X,ground+h/2,o.Z,o.HalfX*2,h,o.HalfZ*2);}
        else if(o.Type=="water")Add("water",cylinder,o.X,ground+.03,o.Z,o.Radius*2,.025,o.Radius*2);
        else if(o.Type=="bush")Add("bush",sphere,o.X,ground+.7,o.Z,o.Radius*2,1.4,o.Radius*2);
        else Add("solid",cylinder,o.X,ground+1.5,o.Z,o.Radius*2,1.5,o.Radius*2);
      }
      foreach(var c in region.Cones)Add("cone",cylinder,c.X,world.Height(c.X,c.Z)+.6,c.Z,.55,.6,.55);
      var b=region.Bounds;double centerX=(b[0]+b[1])/2,centerZ=(b[2]+b[3])/2;
      foreach(double x in new[]{b[0]+5,b[1]-5})Add("boundary",cube,x,world.Height(x,centerZ)+1,centerZ,.3,2,b[3]-b[2]-10);
      foreach(double z in new[]{b[2]+5,b[3]-5})Add("boundary",cube,centerX,world.Height(centerX,z)+1,z,b[1]-b[0]-10,2,.3);
      foreach(var group in groups)
      {
        var mesh=new Mesh{indexFormat=IndexFormat.UInt32,name="TS "+group.Key};mesh.CombineMeshes(group.Value.ToArray());
        var o=new GameObject(group.Key,typeof(MeshFilter),typeof(MeshRenderer));o.transform.SetParent(content,false);o.GetComponent<MeshFilter>().sharedMesh=mesh;
        var color=group.Key=="water"?new Color(.12f,.35f,.6f):group.Key=="bush"?new Color(.18f,.35f,.1f):group.Key=="cone"?new Color(1,.35f,.05f):group.Key=="boundary"?new Color(.7f,.15f,.1f):new Color(.4f,.4f,.37f);
        o.GetComponent<MeshRenderer>().sharedMaterial=Mat(color);
      }
      if(terrain)
      {
        const int n=160;var vertices=new List<Vector3>();var colors=new List<Color>();var indices=new List<int>();
        for(int z=0;z<=n;z++)for(int x=0;x<=n;x++)
        {double px=b[0]+(b[1]-b[0])*x/n,pz=b[2]+(b[3]-b[2])*z/n;vertices.Add(GtPresentation.Position(new BodyVector(px,world.Height(px,pz),pz)));int s=world.Surface(px,pz);colors.Add(s==1?new Color(.2f,.22f,.25f):s==3?new Color(.2f,.3f,.4f):s==0?new Color(.4f,.3f,.19f):new Color(.27f,.4f,.18f));
          if(x<n&&z<n){int a=z*(n+1)+x;indices.AddRange(new[]{a,a+1,a+n+1,a+1,a+n+2,a+n+1});}}
        var mesh=new Mesh{indexFormat=IndexFormat.UInt32,name="TS açık dünya zemini"};mesh.SetVertices(vertices);mesh.SetColors(colors);mesh.SetTriangles(indices,0);mesh.RecalculateNormals();
        var floor=new GameObject("Zemin",typeof(MeshFilter),typeof(MeshRenderer));floor.transform.SetParent(content,false);floor.GetComponent<MeshFilter>().sharedMesh=mesh;
        var m=new Material(Shader.Find("Sprites/Default"));materials.Add(m);floor.GetComponent<MeshRenderer>().sharedMaterial=m;
      }
    }
    private void OnDestroy(){foreach(var m in materials)if(m)Destroy(m);}
  }
}
