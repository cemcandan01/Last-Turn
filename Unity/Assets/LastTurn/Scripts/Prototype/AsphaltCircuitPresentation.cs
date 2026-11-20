using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;
using UnityEngine.Rendering;

namespace LastTurn.Prototype
{
  // Yeşil Vadi için yüzey kalite örneği. Bütün yükseklikler mevcut pist dünyasından.
  public sealed class AsphaltCircuitPresentation:MonoBehaviour
  {
    private readonly List<UnityEngine.Object> owned=new List<UnityEngine.Object>();
    public int ShoulderVertices {get;private set;}
    public static void Apply(SourceScene source,TrackDefinition track)
    {
      if(track.Key!="gp_1")return;
      var view=source.gameObject.AddComponent<AsphaltCircuitPresentation>();
      var shader=Resources.Load<Shader>("SourcePresentation/CircuitSurface");
      source.RefineSurface(0,shader,0);source.RefineSurface(1,shader,1);
      for(int i=0;i<source.Data.materials.Length;i++)
        if(source.Data.materials[i].name=="leaf" || source.Data.materials[i].name=="trunk" || source.Data.materials[i].name=="rock")
          source.RefineSurface(i,shader,3);
      view.Shoulders(track,shader);view.Trees(track,shader);
      foreach(var renderer in source.GetComponentsInChildren<Renderer>()){
        renderer.receiveShadows=true;
        if(renderer.bounds.size.y>1 && renderer.bounds.size.x<100)renderer.shadowCastingMode=ShadowCastingMode.On;
      }
    }
    private void Shoulders(TrackDefinition track,Shader shader)
    {
      var world=new TrackWorld(track);var g=track.Geometry;
      var vertices=new List<Vector3>();var uv=new List<Vector2>();var indices=new List<int>();
      for(int i=0;i<g.N;i++)foreach(int side in new[]{-1,1}){
        int j=(i+1)%g.N,start=vertices.Count;
        foreach(var point in new[]{(i,0f),(i,1f),(j,0f),(j,1f)}){
          var at=g.AtTrack(point.Item1,side*(g.HalfWidth+.07+point.Item2*1.6));
          world.Hint=g.Nearest(at.X,at.Z,point.Item1).Index;
          vertices.Add(GtPresentation.Position(new BodyVector(at.X,world.Height(at.X,at.Z)+.018,at.Z)));
          uv.Add(new Vector2(point.Item2,0));
        }
        void Tri(int a,int b,int c){
          if(Vector3.Cross(vertices[start+b]-vertices[start+a],vertices[start+c]-vertices[start+a]).y<0){int t=b;b=c;c=t;}
          indices.Add(start+a);indices.Add(start+b);indices.Add(start+c);
        }
        Tri(0,1,2);Tri(1,3,2);
      }
      var mesh=new Mesh{name="Yeşil Vadi toprak omuz"};mesh.SetVertices(vertices);mesh.SetUVs(0,uv);mesh.SetTriangles(indices,0);mesh.RecalculateNormals();mesh.RecalculateBounds();owned.Add(mesh);
      var material=new Material(shader);material.SetFloat("_Mode",2);owned.Add(material);
      var root=new GameObject("Asfalt kenarı geçişi",typeof(MeshFilter),typeof(MeshRenderer));root.transform.SetParent(transform,false);
      root.GetComponent<MeshFilter>().sharedMesh=mesh;root.GetComponent<MeshRenderer>().sharedMaterial=material;
      root.GetComponent<MeshRenderer>().shadowCastingMode=ShadowCastingMode.Off;ShoulderVertices=vertices.Count;
    }
    private void Trees(TrackDefinition track,Shader shader)
    {
      var world=new TrackWorld(track){Environment=WorldData.Catalog.Activate(track.Key)};var g=track.Geometry;
      var leaves=new List<Vector3>();var bark=new List<Vector3>();var leafTriangles=new List<int>();var barkTriangles=new List<int>();
      var random=new System.Random(711);
      void Crown(Vector3 center,Vector3 scale)
      {
        int start=leaves.Count;
        for(int y=0;y<=5;y++)for(int x=0;x<=9;x++){
          float latitude=Mathf.PI*y/5,longitude=2*Mathf.PI*x/9;
          leaves.Add(center+Vector3.Scale(new Vector3(Mathf.Sin(latitude)*Mathf.Cos(longitude),Mathf.Cos(latitude),Mathf.Sin(latitude)*Mathf.Sin(longitude)),scale));
        }
        for(int y=0;y<5;y++)for(int x=0;x<9;x++){
          int a=start+y*10+x,b=a+10;leafTriangles.AddRange(new[]{a,a+1,b,a+1,b+1,b});
        }
      }
      for(int i=0;i<40;i++){
        int index=g.IndexAt((i+.35)/40);
        double offset=(g.HalfWidth+10+random.NextDouble()*7)*(i%2==0?1:-1);
        var point=g.AtTrack(index,offset);
        if(!RoadsideMarkers.Clear(world,point.X,point.Z,g.HalfWidth,2.7))continue;
        world.Hint=index;
        var root=GtPresentation.Position(new BodyVector(point.X,world.Height(point.X,point.Z),point.Z));
        float height=4.8f+(float)random.NextDouble()*2.5f;
        int start=bark.Count;
        for(int level=0;level<2;level++)for(int side=0;side<8;side++){
          float angle=2*Mathf.PI*side/8,radius=level==0?.25f:.13f;
          bark.Add(root+new Vector3(Mathf.Cos(angle)*radius,level*height*.8f,Mathf.Sin(angle)*radius));
        }
        for(int side=0;side<8;side++){int a=start+side,b=start+(side+1)%8;barkTriangles.AddRange(new[]{a,a+8,b,b,a+8,b+8});}
        Crown(root+Vector3.up*height,new Vector3(2.7f,2.4f,2.4f));
        Crown(root+new Vector3(-1.7f,height-.7f,.5f),new Vector3(2.1f,1.7f,1.9f));
        Crown(root+new Vector3(1.5f,height-.4f,-.8f),new Vector3(2,1.9f,2.1f));
      }
      void Part(string name,List<Vector3> vertices,List<int> triangles,Color color)
      {
        var mesh=new Mesh{name=name};mesh.SetVertices(vertices);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();owned.Add(mesh);
        var mat=new Material(shader){name=name,color=color};mat.SetFloat("_Mode",3);owned.Add(mat);
        var go=new GameObject(name,typeof(MeshFilter),typeof(MeshRenderer));go.transform.SetParent(transform,false);
        go.GetComponent<MeshFilter>().sharedMesh=mesh;go.GetComponent<MeshRenderer>().sharedMaterial=mat;
      }
      Part("leaf",leaves,leafTriangles,new Color(.19f,.3f,.12f));
      Part("trunk",bark,barkTriangles,new Color(.23f,.16f,.1f));
    }
    private void OnDestroy(){foreach(var value in owned)if(value)Destroy(value);}
  }
}
