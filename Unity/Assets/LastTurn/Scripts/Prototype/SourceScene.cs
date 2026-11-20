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
      /// Garaj sahnesi (TS garaj-sahnesi.ts garajIsigi): ışıklar, arka plan, sis ve yarım küre ışığı.
      public GraphLight[] lights; public float[] background,fogColor,fogRange,hemiSky,hemiGround; public float hemiIntensity;
    }
    [Serializable] public sealed class GraphLight { public string type; public float[] color,position,target; public float intensity,angle,penumbra; public bool shadow; }
    [Serializable] public sealed class Node
    {
      public string name,tag; public int parent,geometry; public bool visible,sprite;
      public float[] position,rotation,scale,instances; public int[] materials;
    }
    [Serializable] public sealed class Geometry { public float[] positions,normals,uv,colors; public int[] indices; public Group[] groups; }
    [Serializable] public sealed class Group { public int start,count,material; }
    [Serializable] public sealed class Surface
    {
      public string name; public float[] color,repeat,offset; public float opacity;
      public bool transparent,doubleSided,basic,glass,mirror,repeatWrap,additive,overlay; public int texture;
    }
    [Serializable] public sealed class TextureFile { public string file; }
    private sealed class Shared { public Graph graph; public Mesh[] meshes; public Material[] materials; }
    private static readonly Dictionary<string,Shared> cache=new Dictionary<string,Shared>();
    private readonly List<UnityEngine.Object> owned=new List<UnityEngine.Object>();
    public readonly Dictionary<string,Transform> Tags=new Dictionary<string,Transform>();
    /// Aynı etiketli havuzlar (60 toz, 26 kor) için sıralı liste.
    public readonly List<(string Tag,Transform Node)> Tagged=new List<(string,Transform)>();
    public readonly List<Renderer> MirrorFaces=new List<Renderer>();
    public readonly List<Material> Glass=new List<Material>();
    public Material TailLamp {get; private set;}
    public MeshRenderer BodyShell {get; private set;}
    public readonly List<MeshRenderer> PaintSurfaces=new List<MeshRenderer>();
    public readonly List<Renderer> FactoryWing=new List<Renderer>();
    // TS malzemeler.ts içindeki yüzey renkleri kaynak pakette RGB olarak saklanır.
    private static bool HasPigment(Surface surface, byte red, byte green, byte blue)
    {
      var rgb = surface.color;
      return rgb != null && rgb.Length == 3 && Mathf.RoundToInt(rgb[0]*255)==red
        && Mathf.RoundToInt(rgb[1]*255)==green && Mathf.RoundToInt(rgb[2]*255)==blue;
    }
    private Material[] surfaces;
    public Graph Data {get;private set;}
    public int RendererCount {get;private set;}
    private readonly Dictionary<Renderer,Material[]> ghostOriginal=new Dictionary<Renderer,Material[]>();private Material ghostMaterial;private bool ghost;
    public bool GhostMode=>ghost;
    /// TS uzak-arac-modeli kur(saydam): malzemeler kopyalanır, opaklık 0,45 × özgün (saydamsa), derinlik yazılmaz, gölge yok.
    public bool Translucent{get;private set;}
    public void SetTranslucent()
    {
      if(Translucent)return;Translucent=true;var copies=new Dictionary<Material,Material>();
      foreach(var renderer in GetComponentsInChildren<Renderer>(true))
      {
        var mats=renderer.sharedMaterials;
        for(int i=0;i<mats.Length;i++){var m=mats[i];if(!m)continue;if(!copies.TryGetValue(m,out var k)){k=new Material(m);var c=k.color;c.a=.45f*(m.renderQueue>=3000?c.a:1);k.color=c;k.SetFloat("_ZWrite",0);k.renderQueue=3000;owned.Add(k);copies[m]=k;}mats[i]=k;}
        renderer.sharedMaterials=mats;renderer.shadowCastingMode=ShadowCastingMode.Off;
      }
      Glass.Clear();
    }
    /// TS beceri-efekt hayaletMat nabzı: yalnız saydamlık değişir.
    public void SetGhostOpacity(float opacity){if(!ghostMaterial)return;var c=ghostMaterial.color;c.a=opacity;ghostMaterial.color=c;}
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
        if (g.kind=="car") ConfigureFinish(g, materials);
        data=new Shared{graph=g,meshes=meshes,materials=materials};cache.Add(key,data);
      }
      var root=new GameObject("TS sunum · "+data.graph.label);root.transform.SetParent(parent,false);root.layer=layer;
      var view=root.AddComponent<SourceScene>();view.Data=data.graph;var transforms=new Transform[data.graph.nodes.Length];
      var localMaterials=(Material[])data.materials.Clone();view.surfaces=localMaterials;
      for(int i=0;i<localMaterials.Length;i++)if(data.graph.materials[i].glass||data.graph.materials[i].mirror)
      {var m=new Material(localMaterials[i]);view.owned.Add(m);localMaterials[i]=m;if(data.graph.materials[i].glass)view.Glass.Add(m);}
      if (data.graph.kind=="car")
      {
        int lamp=Array.FindIndex(data.graph.materials,s=>s.basic && HasPigment(s,200,30,40));
        if (lamp>=0)
        {
          view.TailLamp=new Material(localMaterials[lamp]);
          view.owned.Add(view.TailLamp);
          localMaterials[lamp]=view.TailLamp;
        }
      }
      var window=data.graph.kind=="car"?Array.Find(data.graph.nodes,n=>Array.Exists(n.materials,j=>data.graph.materials[j].glass)):null;
      var shell=window==null?null:Array.Find(data.graph.nodes,n=>n.parent==window.parent && n.geometry>=0 && n.materials.Length>0);
      int wingStart=-1;
      var wing=FactoryWingSpec(data.graph.key);
      for(int i=0;i<transforms.Length;i++)
      {
        var n=data.graph.nodes[i];var node=new GameObject(n.name);node.layer=layer;var t=node.transform;transforms[i]=t;t.SetParent(n.parent<0?root.transform:transforms[n.parent],false);
        t.localPosition=Point(n.position);t.localRotation=Rotation(n.rotation);t.localScale=new Vector3(n.scale[0],n.scale[1],n.scale[2]);
        if(!string.IsNullOrEmpty(n.tag)){if(n.tag=="panel")view.Tags["panel-"+i]=t;else view.Tags[n.tag]=t;view.Tagged.Add((n.tag,t));}
        node.SetActive(n.visible);
        // Three Sprite: 1×1 merkezli dörtgen; kameraya dönüşü kullanan görünüm yapar.
        if(n.sprite){node.AddComponent<MeshFilter>().sharedMesh=SpriteQuad();node.AddComponent<MeshRenderer>().sharedMaterial=localMaterials[n.materials[0]];view.RendererCount++;continue;}
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
          if(shell!=null && n.parent==shell.parent)
          {
            if(n==shell)view.BodyShell=renderer;
            if(n.materials.Length==1 && (n.materials[0]==shell.materials[0] ||
              (n.tag=="panel" && !HasPigment(data.graph.materials[n.materials[0]],24,35,45))))
              view.PaintSurfaces.Add(renderer);
            if(wing.count>0 && wingStart<0 && Mathf.Abs(n.position[0])<.001f && Mathf.Abs(n.position[2]-wing.z)<.001f && n.position[1]>.8f)
              wingStart=i;
            if(wingStart>=0 && i<wingStart+wing.count)view.FactoryWing.Add(renderer);
          }
        }
      }
      return view;
    }
    public void RefineSurface(int index,Shader shader,float mode)
    {
      if(!shader || index<0 || index>=surfaces.Length)return;
      var original=surfaces[index];var replacement=new Material(original){shader=shader};
      replacement.SetFloat("_Mode",mode);owned.Add(replacement);
      foreach(var renderer in GetComponentsInChildren<Renderer>()){
        var materials=renderer.sharedMaterials;bool changed=false;
        for(int i=0;i<materials.Length;i++)if(materials[i]==original){materials[i]=replacement;changed=true;}
        if(changed)renderer.sharedMaterials=materials;
      }
      surfaces[index]=replacement;
    }
    private static void ConfigureFinish(Graph graph, Material[] materials)
    {
      // Karoser, ön ve arka camla aynı grubun ilk ağıdır.
      var window = Array.Find(graph.nodes, n => Array.Exists(n.materials, i => graph.materials[i].glass));
      if (window == null) return;
      var body = Array.Find(graph.nodes, n => n.parent == window.parent && n.geometry >= 0 && n.materials.Length > 0);
      if (body != null) Finish(materials[body.materials[0]], .32f);
      for (int i = 0; i < materials.Length; i++)
      {
        var s = graph.materials[i];
        if (s.glass || (!s.basic && HasPigment(s,24,35,45))) Finish(materials[i], .66f);
      }
    }
    // Kaynak arac-modeli.ts içindeki kanat plakası ve hemen sonraki ayak/yan plakalar.
    private static (float z,int count) FactoryWingSpec(string key)
    {
      switch(key){
        case "gt": return (-2.1f,1); case "rx": return (-1.78f,5);
        case "dr": return (-1.98f,5); case "rl": return (-1.98f,3);
        case "gt3": return (-2.06f,5); case "t16": return (-1.8f,5);
        case "int": return (-1.32f,5); case "ae86": return (-1.98f,1);
        case "supra": return (-2.1f,6); case "golf": return (-1.62f,5);
        case "c33": return (-2.18f,1); default:return (0,0);
      }
    }

    private static void Finish(Material mat, float amount)
    {
      mat.EnableKeyword("VEHICLE_FINISH");
      mat.SetFloat("_Finish",amount);
    }
    private static Mesh quad;
    private static Mesh SpriteQuad()
    {
      if(quad)return quad;quad=new Mesh{name="TS sprite"};quad.vertices=new[]{new Vector3(-.5f,-.5f,0),new Vector3(.5f,-.5f,0),new Vector3(.5f,.5f,0),new Vector3(-.5f,.5f,0)};
      quad.uv=new[]{new Vector2(0,0),new Vector2(1,0),new Vector2(1,1),new Vector2(0,1)};quad.normals=new[]{Vector3.back,Vector3.back,Vector3.back,Vector3.back};quad.colors=new[]{Color.white,Color.white,Color.white,Color.white};quad.triangles=new[]{0,2,1,0,3,2};quad.RecalculateBounds();return quad;
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
      // Efekt grafiği: AdditiveBlending ve depthTest=false (Sprite etiketleri renderOrder10 ile en üstte).
      if(s.additive)m.SetFloat("_DstBlend",1);if(s.overlay){m.SetFloat("_ZTest",8);m.SetFloat("_Cull",0);m.renderQueue=3100;}
      if(s.texture>=0){string path="SourcePresentation/"+Path.GetFileNameWithoutExtension(g.textures[s.texture].file);var texture=Resources.Load<Texture2D>(path);if(!texture)throw new InvalidDataException("Kaynak doku eksik: "+g.key+"/"+s.name+"/"+path);texture.wrapMode=s.repeatWrap?TextureWrapMode.Repeat:TextureWrapMode.Clamp;m.mainTexture=texture;m.mainTextureScale=new Vector2(s.repeat[0],s.repeat[1]);m.mainTextureOffset=new Vector2(s.offset[0],s.offset[1]);}
      return m;
    }
    private void OnDestroy(){foreach(var o in owned)if(o)Destroy(o);}
  }
}
