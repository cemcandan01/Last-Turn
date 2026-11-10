using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Prototype
{
  // TS cizim/isaretler.ts + mutant-ui isaretleriGuncelle: kaynak grafiğinden yarı saydam ışık sütunu, yerde halka ve tür
  // tabelası; sandık ışıksız küçük 3B model. Konum/kullanım saf modelden okunur; collider üretmez.
  public sealed class MutantWorldMarkers:MonoBehaviour
  {
    private readonly Dictionary<string,GameObject> objects=new Dictionary<string,GameObject>();
    private readonly List<Transform> labels=new List<Transform>();
    private GtPrototype driver;private SourceEffectsView effects;private Transform root;
    public int Built=>objects.Count;
    public int Labels=>labels.Count;
    private void Awake(){driver=GetComponent<GtPrototype>();root=new GameObject("TS Mutant işaretleri").transform;root.SetParent(transform,false);}
    private void LateUpdate()
    {
      if(!MutantRuntime.Active||driver.OpenTerrain==null)return;
      if(!effects)effects=GetComponent<SourceEffectsView>();if(!effects||!effects.Ready)return;
      // TS isaretlerGorunur: yarışta gizli, haritada görünür.
      root.gameObject.SetActive(driver.Race==null);
      foreach(var m in MutantWorldMarkerModel.Read(MutantRuntime.Run))
      {
        if(!objects.TryGetValue(m.Key,out var obj)){obj=Build(m);objects[m.Key]=obj;}
        obj.SetActive(!m.Used);
      }
      var cam=driver.FollowCamera?driver.FollowCamera.transform:null;
      if(cam)foreach(var l in labels)l.rotation=cam.rotation;
    }
    private GameObject Build(MutantWorldMarkerModel m)
    {
      string hex=m.Color.ToString("x6");double y=driver.OpenTerrain.Height(m.X,m.Z);
      var obj=new GameObject(m.Name);obj.transform.SetParent(root,false);
      GameObject Copy(string tag){var p=effects.Prototype(tag);if(!p)return null;var c=Instantiate(p.gameObject,obj.transform);c.SetActive(true);return c;}
      if(m.Kind=="chest"){var chest=Copy("chest-"+hex);if(chest)chest.transform.position=GtPresentation.Position(new BodyVector(m.X,y+.05,m.Z));return obj;}
      double tall=m.Height;
      var column=Copy("marker-column-"+hex);if(column){column.transform.position=GtPresentation.Position(new BodyVector(m.X,y+tall/2,m.Z));column.transform.localScale=new Vector3(1,(float)tall,1);}
      var ring=Copy("marker-ring-"+hex);if(ring)ring.transform.position=GtPresentation.Position(new BodyVector(m.X,y+.15,m.Z));
      string text=m.Label;
      if(text!=null){var label=Copy("marker-label-"+text);if(label){label.transform.position=GtPresentation.Position(new BodyVector(m.X,y+15,m.Z));labels.Add(label.transform);}}
      return obj;
    }
  }
}
