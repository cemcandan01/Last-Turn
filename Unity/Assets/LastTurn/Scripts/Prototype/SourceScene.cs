using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using UnityEngine;
using UnityEngine.Rendering;

namespace LastTurn.Prototype
{
  // Sabit TS kurucularından çıkarılan sunum grafiği. Fizik/katalog/kayıt kuralı içermez.
  public sealed class SourceScene : MonoBehaviour
  {
    [Serializable] public sealed class Graph
    {
      public int version,id; public string key,label,kind;
      public float[] eye,mirrorPosition,mirrorRotation; public float gaugeRpm,rearCameraFov;
      public Node[] nodes; public Geometry[] geometries; public Surface[] materials; public TextureFile[] textures;
    }
    [Serializable] public sealed class Node
    {
      public string name,tag; public int parent,geometry; public bool visible;
      public float[] position,rotation,scale,instances; public int[] materials;
    }
    [Serializable] public sealed class Geometry { public float[] positions,normals,uv,colors; public int[] indices; public Group[] groups; }
    [Serializable] public sealed class Group { public int start,count,material; }
    [Serializable] public sealed class Surface
    {
      public string name; public float[] color,repeat,offset; public float opacity;
      public bool transparent,doubleSided,basic,glass,mirror,repeatWrap; public int texture;
    }
    [Serializable] public sealed class TextureFile { public string file; }
    private sealed class Shared { public Graph graph; public Mesh[] meshes; public Material[] materials; }
    private static readonly Dictionary<string,Shared> cache=new Dictionary<string,Shared>();
    private readonly List<UnityEngine.Object> owned=new List<UnityEngine.Object>();
    public readonly Dictionary<string,Transform> Tags=new Dictionary<string,Transform>();
    public readonly List<Renderer> MirrorFaces=new List<Renderer>();
    public readonly List<Material> Glass=new List<Material>();
    public Graph Data {get;private set;}
    public int RendererCount {get;private set;}
    private readonly Dictionary<Renderer,Material[]> ghostOriginal=new Dictionary<Renderer,Material[]>();private Material ghostMaterial;private bool ghost;
    public bool GhostMode=>ghost;
    public void SetGhost(bool enabled)
    {
      if(ghost==enabled)return;ghost=enabled;
      if(enabled){if(!ghostMaterial){ghostMaterial=new Material(Resources.Load<Shader>("SourcePresentation/SourceLambert"));ghostMaterial.color=new Color(184/255f,236/255f,1,.32f);ghostMaterial.SetFloat("_Lit",0);ghostMaterial.SetFloat("_ZWrite",0);ghostMaterial.renderQueue=3000;owned.Add(ghostMaterial);}foreach(var renderer in GetComponentsInChildren<Renderer>(true)){ghostOriginal[renderer]=renderer.sharedMaterials;var mats=new Material[renderer.sharedMaterials.Length];for(int i=0;i<mats.Length;i++)mats[i]=ghostMaterial;renderer.sharedMaterials=mats;renderer.shadowCastingMode=ShadowCastingMode.Off;}}
      else{foreach(var pair in ghostOriginal)if(pair.Key){pair.Key.sharedMaterials=pair.Value;pair.Key.shadowCastingMode=ShadowCastingMode.On;}ghostOriginal.Clear();}
    }
    public static Vector3 Point(float[] p)=>new Vector3(-p[0],p[1],p[2]);
    public static Quaternion Rotation(float[] q)=>new Quaternion(q[0],-q[1],-q[2],q[3]);
    public static SourceScene Create(string key,Transform parent,int layer=0)
    {
      if(!cache.TryGetValue(key,out var data))
      {
        var file=Resources.Load<TextAsset>("SourcePresentation/"+key);if(!file)return null;
        Graph g;using(var input=new GZipStream(new MemoryStream(file.bytes),CompressionMode.Decompress))using(var reader=new StreamReader(input))g=JsonUtility.FromJson<Graph>(reader.ReadToEnd());
        if(g==null||g.version!=1||g.nodes==null||g.geometries==null)throw new InvalidDataException("Kaynak sunum grafiği geçersiz: "+key);
        var meshes=new Mesh[g.geometries.Length];for(int i=0;i<meshes.Length;i++)meshes[i]=MakeMesh(g.geometries[i]);
        var materials=new Material[g.materials.Length];for(int i=0;i<materials.Length;i++)materials[i]=MakeMaterial(g,g.materials[i]);
        data=new Shared{graph=g,meshes=meshes,materials=materials};cache.Add(key,data);
      }
      var root=new GameObject("TS sunum · "+data.graph.label);root.transform.SetParent(parent,false);root.layer=layer;
      var view=root.AddComponent<SourceScene>();view.Data=data.graph;var transforms=new Transform[data.graph.nodes.Length];
      var localMaterials=(Material[])data.materials.Clone();
      for(int i=0;i<localMaterials.Length;i++)if(data.graph.materials[i].glass||data.graph.materials[i].mirror)
      {var m=new Material(localMaterials[i]);view.owned.Add(m);localMaterials[i]=m;if(data.graph.materials[i].glass)view.Glass.Add(m);}
      for(int i=0;i<transforms.Length;i++)
      {
        var n=data.graph.nodes[i];var node=new GameObject(n.name);node.layer=layer;var t=node.transform;transforms[i]=t;t.SetParent(n.parent<0?root.transform:transforms[n.parent],false);
        t.localPosition=Point(n.position);t.localRotation=Rotation(n.rotation);t.localScale=new Vector3(n.scale[0],n.scale[1],n.scale[2]);
        if(!string.IsNullOrEmpty(n.tag)){if(n.tag=="panel")view.Tags["panel-"+i]=t;else view.Tags[n.tag]=t;}
        node.SetActive(n.visible);
        if(n.geometry<0)continue;
        var mats=new Material[data.meshes[n.geometry].subMeshCount];for(int j=0;j<mats.Length;j++)mats[j]=localMaterials[n.materials[n.materials.Length==1?0:Math.Min(j,n.materials.Length-1)]];
        bool mirror=Array.Exists(n.materials,j=>data.graph.materials[j].mirror);
        if(n.instances!=null&&n.instances.Length>0)
        {
          // Three InstancedMesh → sınırlı boyutlu birleşik çizim; binlerce nesne/collider oluşturulmaz.
          var mesh=data.meshes[n.geometry];int perBatch=Math.Max(1,60000/mesh.vertexCount),count=n.instances.Length/16;
          for(int first=0;first<count;first+=perBatch)
          {
            int size=Math.Min(perBatch,count-first);var parts=new CombineInstance[size];
            for(int j=0;j<size;j++){var a=new Matrix4x4();for(int c=0;c<4;c++)for(int r=0;r<4;r++)a[r,c]=n.instances[(first+j)*16+c*4+r]*((r==0?-1:1)*(c==0?-1:1));parts[j]=new CombineInstance{mesh=mesh,transform=a};}
            for(int sub=0;sub<mesh.subMeshCount;sub++){
              for(int j=0;j<parts.Length;j++){var part=parts[j];part.subMeshIndex=sub;parts[j]=part;}
              var combined=new Mesh{indexFormat=IndexFormat.UInt32,name="TS örnek grubu"};combined.CombineMeshes(parts,true,true);view.owned.Add(combined);
              var batch=new GameObject("Örnekler",typeof(MeshFilter),typeof(MeshRenderer));batch.layer=layer;batch.transform.SetParent(t,false);batch.GetComponent<MeshFilter>().sharedMesh=combined;batch.GetComponent<MeshRenderer>().sharedMaterial=mats[sub];view.RendererCount++;
            }
          }
        }
        else
        {
          node.AddComponent<MeshFilter>().sharedMesh=data.meshes[n.geometry];var renderer=node.AddComponent<MeshRenderer>();renderer.sharedMaterials=mats;view.RendererCount++;if(mirror)view.MirrorFaces.Add(renderer);
        }
      }
      return view;
    }
    private static Mesh MakeMesh(Geometry g)
    {
      var m=new Mesh{name="TS kaynak geometri",indexFormat=IndexFormat.UInt32};var v=new Vector3[g.positions.Length/3];for(int i=0;i<v.Length;i++)v[i]=new Vector3(-g.positions[i*3],g.positions[i*3+1],g.positions[i*3+2]);m.vertices=v;
      if(g.normals.Length==g.positions.Length){var normals=new Vector3[v.Length];for(int i=0;i<v.Length;i++)normals[i]=new Vector3(-g.normals[i*3],g.normals[i*3+1],g.normals[i*3+2]);m.normals=normals;}
      if(g.uv.Length==v.Length*2){var uv=new Vector2[v.Length];for(int i=0;i<v.Length;i++)uv[i]=new Vector2(g.uv[i*2],g.uv[i*2+1]);m.uv=uv;}
      var colors=new Color[v.Length];for(int i=0;i<colors.Length;i++)colors[i]=g.colors.Length==v.Length*3?new Color(g.colors[i*3],g.colors[i*3+1],g.colors[i*3+2]):Color.white;m.colors=colors;
      // x yansıması yönü ters çevirir; Unity yüz sırası da buna göre çevrilir.
      int[] Flip(int[] indices){var result=(int[])indices.Clone();for(int i=0;i+2<result.Length;i+=3){int a=result[i];result[i]=result[i+2];result[i+2]=a;}return result;}
      if(g.groups.Length==0)m.SetTriangles(Flip(g.indices),0);else
      {
        int count=0;foreach(var group in g.groups)count=Math.Max(count,group.material+1);m.subMeshCount=count;
        for(int i=0;i<count;i++){var indices=new List<int>();foreach(var group in g.groups)if(group.material==i)for(int j=group.start;j<group.start+group.count;j++)indices.Add(g.indices[j]);m.SetTriangles(Flip(indices.ToArray()),i);}
      }
      if(g.normals.Length!=g.positions.Length)m.RecalculateNormals();m.RecalculateBounds();return m;
    }
    private static Material MakeMaterial(Graph g,Surface s)
    {
      var shader=Resources.Load<Shader>("SourcePresentation/SourceLambert");if(!shader)throw new InvalidOperationException("Kaynak sunum shader'ı bulunamadı");
      var m=new Material(shader){name=s.name,color=new Color(s.color[0],s.color[1],s.color[2],s.opacity)};m.SetFloat("_Lit",s.basic?0:1);m.SetFloat("_Cull",s.doubleSided?0:2);m.SetFloat("_ZWrite",s.transparent?0:1);m.renderQueue=s.transparent?3000:2000;
      if(s.texture>=0){string path="SourcePresentation/"+Path.GetFileNameWithoutExtension(g.textures[s.texture].file);var texture=Resources.Load<Texture2D>(path);if(!texture)throw new InvalidDataException("Kaynak doku eksik: "+g.key+"/"+s.name+"/"+path);texture.wrapMode=s.repeatWrap?TextureWrapMode.Repeat:TextureWrapMode.Clamp;m.mainTexture=texture;m.mainTextureScale=new Vector2(s.repeat[0],s.repeat[1]);m.mainTextureOffset=new Vector2(s.offset[0],s.offset[1]);}
      return m;
    }
    private void OnDestroy(){foreach(var o in owned)if(o)Destroy(o);}
  }
}
