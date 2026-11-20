using System;
using System.Collections.Generic;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.Rendering;

namespace LastTurn.Prototype
{
  // Yalnız görsel ve yerel ses. Toplu mesh, çarpışmasız seyirci alanları.
  public sealed class TracksideLife:MonoBehaviour
  {
    private readonly List<UnityEngine.Object> owned=new List<UnityEngine.Object>();
    private readonly List<AudioSource> sources=new List<AudioSource>();
    private readonly List<Transform> flags=new List<Transform>();
    public int Camps {get;private set;}
    public int Spectators {get;private set;}
    public int DrawParts {get;private set;}
    private GtPrototype driver;
    private sealed class Batch
    {
      public readonly List<Vector3> V=new List<Vector3>();
      public readonly List<int> T=new List<int>();
      public void Box(Matrix4x4 frame,Vector3 center,Vector3 size)
      {
        int start=V.Count;
        var local=Matrix4x4.TRS(center,Quaternion.identity,size);
        Vector3[] corners={new Vector3(-.5f,-.5f,-.5f),new Vector3(.5f,-.5f,-.5f),new Vector3(.5f,.5f,-.5f),new Vector3(-.5f,.5f,-.5f),
          new Vector3(-.5f,-.5f,.5f),new Vector3(.5f,-.5f,.5f),new Vector3(.5f,.5f,.5f),new Vector3(-.5f,.5f,.5f)};
        int[] faces={0,3,2,0,2,1,5,6,7,5,7,4,4,7,3,4,3,0,1,2,6,1,6,5,3,7,6,3,6,2,4,0,1,4,1,5};
        // Her üçgenin kendi normali: basamak ve kumaş köşeleri yuvarlanmaz.
        for(int i=0;i<faces.Length;i++){V.Add(frame.MultiplyPoint3x4(local.MultiplyPoint3x4(corners[faces[i]])));T.Add(start+i);}
      }
      public Mesh Mesh()
      {
        var m=new Mesh();m.SetVertices(V);m.SetTriangles(T,0);m.RecalculateNormals();m.RecalculateBounds();return m;
      }
    }
    public static TracksideLife Build(Transform parent,TrackWorld world)
    {
      var root=new GameObject("Seyirci ve servis alanları");root.transform.SetParent(parent,false);
      var life=root.AddComponent<TracksideLife>();life.driver=parent.GetComponent<GtPrototype>();life.Create(world);return life;
    }
    private T Own<T>(T value) where T:UnityEngine.Object {owned.Add(value);return value;}
    private Material Material(Color color)
    {
      var m=Own(new Material(Resources.Load<Shader>("SourcePresentation/SourceLambert")??Shader.Find("Standard")){color=color});
      if(m.HasProperty("_Lit"))m.SetFloat("_Lit",1);return m;
    }
    private void Part(string name,Batch batch,Material material,Transform parent=null)
    {
      if(batch.V.Count==0)return;
      var part=new GameObject(name,typeof(MeshFilter),typeof(MeshRenderer));part.transform.SetParent(parent?parent:transform,false);
      part.GetComponent<MeshFilter>().sharedMesh=Own(batch.Mesh());part.GetComponent<MeshRenderer>().sharedMaterial=material;
      part.GetComponent<MeshRenderer>().shadowCastingMode=ShadowCastingMode.Off;DrawParts++;
    }
    private void Create(TrackWorld world)
    {
      var steel=new Batch();var white=new Batch();var skin=new Batch();var dark=new Batch();var orange=new Batch();var blue=new Batch();
      var batches=new[]{steel,white,skin,dark,orange,blue};
      var colors=new[]{new Color(.22f,.27f,.3f),new Color(.9f,.87f,.77f),new Color(.64f,.43f,.3f),new Color(.08f,.1f,.13f),new Color(.91f,.26f,.08f),new Color(.12f,.43f,.63f)};
      var materials=new Material[6];for(int i=0;i<6;i++)materials[i]=Material(colors[i]);
      int hint=world.Hint;var g=world.Geometry;
      try {
        foreach(double fraction in new[]{.025,.36,.72}){
          var at=g.At(g.Length*fraction);
          bool placed=false;
          foreach(int side in new[]{1,-1,2,-2,3,-3}){
            double offset=g.HalfWidth+12*Math.Abs(side),direction=Math.Sign(side),x=at.X+Math.Cos(at.Heading)*offset*direction,z=at.Z-Math.Sin(at.Heading)*offset*direction;
            if(!RoadsideMarkers.Clear(world,x,z,g.HalfWidth,7) || !g.ClearOf(x,z,g.HalfWidth+7))continue;
            world.Hint=g.Nearest(x,z,hint).Index;
            double y=world.Height(x,z);
            if(world.WaterCount(x,z)>0)continue;
            var origin=GtPresentation.Position(new BodyVector(x,y,z));
            var inward=new Vector3((float)(x-at.X),0,(float)(at.Z-z)).normalized;
            var frame=Matrix4x4.TRS(origin,Quaternion.LookRotation(inward),Vector3.one);
            bool clear=true;double minX=double.PositiveInfinity,maxX=double.NegativeInfinity,minZ=double.PositiveInfinity,maxZ=double.NegativeInfinity;
            foreach(float px in new[]{-5f,4f,12f})foreach(float pz in new[]{-8f,-3f,1f}){
              var corner=frame.MultiplyPoint3x4(new Vector3(px,0,pz));double sx=-corner.x,sz=corner.z;
              minX=Math.Min(minX,sx);maxX=Math.Max(maxX,sx);minZ=Math.Min(minZ,sz);maxZ=Math.Max(maxZ,sz);
              if(!RoadsideMarkers.Clear(world,sx,sz,g.HalfWidth,.7) || world.WaterCount(sx,sz)>0 || Math.Abs(world.Height(sx,sz)-y)>1.5)clear=false;
            }
            if(world.Environment!=null)foreach(var obstacle in world.Environment.Objects){
              if(obstacle.Type=="box"){
                if(maxX>=obstacle.X-obstacle.HalfX && minX<=obstacle.X+obstacle.HalfX && maxZ>=obstacle.Z-obstacle.HalfZ && minZ<=obstacle.Z+obstacle.HalfZ)clear=false;
              } else {
                double dx=obstacle.X-Math.Max(minX,Math.Min(maxX,obstacle.X));
                double dz=obstacle.Z-Math.Max(minZ,Math.Min(maxZ,obstacle.Z));
                if(dx*dx+dz*dz<obstacle.Radius*obstacle.Radius)clear=false;
              }
            }
            if(!clear)continue;
            float lift=world.Track.Type=="dg"?4f:0;
            if(lift>0)for(int support=0;support<4;support++)
              steel.Box(frame,new Vector3(support%2==0?-3:3,lift*.5f,-(support/2)*2),new Vector3(.2f,lift,.2f));
            for(int row=0;row<3;row++){
              steel.Box(frame,new Vector3(0,lift+row*.4f-.05f,-row*1.1f),new Vector3(7,.3f,1));
              for(int person=0;person<7;person++){
                float px=(person-3)*.88f,py=lift+row*.4f,pz=-row*1.1f;
                var shirt=(person+row)%3==0?orange:(person+row)%3==1?blue:white;
                dark.Box(frame,new Vector3(px,py+.42f,pz),new Vector3(.33f,.7f,.28f));
                shirt.Box(frame,new Vector3(px,py+1,pz),new Vector3(.46f,.58f,.3f));
                skin.Box(frame,new Vector3(px,py+1.48f,pz),new Vector3(.29f,.34f,.28f));
                shirt.Box(frame,new Vector3(px-.3f,py+((person%3==0)?1.4f:.95f),pz),new Vector3(.16f,.65f,.18f));
                shirt.Box(frame,new Vector3(px+.3f,py+((person%3==0)?1.4f:.95f),pz),new Vector3(.16f,.65f,.18f));
                Spectators++;
              }
            }
            // Çadır, çalışma masası, takım arabası ve lastik rafı.
            for(int post=0;post<4;post++)steel.Box(frame,new Vector3(8+(post%2)*3,1.4f,-1-(post/2)*3),new Vector3(.08f,2.8f,.08f));
            orange.Box(frame,new Vector3(9.5f,2.85f,-2.5f),new Vector3(3.5f,.18f,3.6f));
            steel.Box(frame,new Vector3(9.5f,.8f,-3),new Vector3(2,.15f,.8f));
            white.Box(frame,new Vector3(8.2f,.4f,-2.5f),new Vector3(.65f,.8f,.65f));
            for(int tire=0;tire<4;tire++)dark.Box(frame,new Vector3(10.8f,.22f+tire*.35f,-3.2f),new Vector3(.7f,.3f,.7f));
            white.Box(frame,new Vector3(9.5f,.75f,-6.8f),new Vector3(2,1.3f,3.6f));
            blue.Box(frame,new Vector3(9.5f,1.5f,-6.7f),new Vector3(1.85f,.35f,2));
            for(int wheel=0;wheel<4;wheel++)dark.Box(frame,new Vector3(8.5f+wheel%2*2,.35f,-7.7f+wheel/2*2),new Vector3(.25f,.65f,.65f));
            var flagRoot=new GameObject("Dalgalanan bayrak");flagRoot.transform.SetParent(transform,false);
            flagRoot.transform.SetPositionAndRotation(frame.MultiplyPoint3x4(new Vector3(-4,3+lift,-1)),Quaternion.LookRotation(inward));
            var flag=new Batch();flag.Box(Matrix4x4.identity,new Vector3(.8f,0,0),new Vector3(1.6f,.8f,.04f));
            Part("Kumaş",flag,materials[Camps%2==0?4:5],flagRoot.transform);flags.Add(flagRoot.transform);
            steel.Box(frame,new Vector3(-4,(3+lift)*.5f,-1),new Vector3(.07f,3+lift,.07f));
            foreach(string clipName in new[]{"seyirci",world.Track.Type=="rl" || world.Track.Type=="rx"?"orman":"servis"}){
              var sound=new GameObject(clipName);sound.transform.SetParent(transform,false);sound.transform.position=origin+Vector3.up;
              var source=sound.AddComponent<AudioSource>();source.clip=Resources.Load<AudioClip>("Audio/"+clipName);
              source.loop=true;source.playOnAwake=false;source.volume=0;source.spatialBlend=1;source.dopplerLevel=0;
              source.minDistance=8;source.maxDistance=clipName=="seyirci"?75:40;source.rolloffMode=AudioRolloffMode.Linear;
              if(source.clip){source.Play();source.time=(Camps*1.7f)%source.clip.length;}sources.Add(source);
            }
            Camps++;placed=true;break;
          }
          if(!placed)continue;
        }
        for(int i=0;i<6;i++)Part("Tribün ve servis "+i,batches[i],materials[i]);
      } finally {world.Hint=hint;}
    }
    private void Update()
    {
      bool active=driver && driver.Race!=null && driver.Race.Session.State!=RaceState.Finished && !GameFlow.Paused && !SettingsScreen.Open && !MutantRuntime.Blocked;
      float gain=active?(float)AudioDirector.Level(PlayerPreferences.Current["ses"])*.18f:0;
      foreach(var source in sources)source.volume=gain*(source.gameObject.name=="seyirci"?(driver && driver.Feedback.Current!=""?1.4f:1):.5f);
      for(int i=0;i<flags.Count;i++)flags[i].localRotation=Quaternion.Euler(0,flags[i].localEulerAngles.y,Mathf.Sin(Time.time*2.4f+i)*8);
    }
    private void OnDestroy(){foreach(var o in owned)if(o)Destroy(o);}
  }
}
