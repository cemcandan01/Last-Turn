using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Prototype
{
  // Sandık gizli küçük modeldir; etkinlik/atölye/boss işaretleri konumdan okunur. Collider üretmez.
  public sealed class MutantWorldMarkers:MonoBehaviour
  {
    private readonly Dictionary<string,GameObject> objects=new Dictionary<string,GameObject>();
    private GtPrototype driver;
    private void Awake(){driver=GetComponent<GtPrototype>();}
    private void LateUpdate()
    {
      if(!MutantRuntime.Active||driver.OpenTerrain==null)return;
      foreach(var m in MutantWorldMarkerModel.Read(MutantRuntime.Run))
      {
        if(!objects.TryGetValue(m.Key,out var obj))
        {
          obj=GameObject.CreatePrimitive(m.Kind=="chest"?PrimitiveType.Cube:PrimitiveType.Cylinder);obj.name=m.Name;
          var col=obj.GetComponent<Collider>();col.enabled=false;Destroy(col);
          obj.transform.SetParent(transform,false);bool chest=m.Kind=="chest";float height=chest?1.2f:m.Kind=="boss"?12:6;
          obj.transform.localScale=chest?new Vector3(1.5f,height,1.5f):new Vector3(1.5f,height/2,1.5f);
          obj.transform.position=GtPresentation.Position(new BodyVector(m.X,driver.OpenTerrain.Height(m.X,m.Z)+height/2,m.Z));
          obj.GetComponent<Renderer>().material.color=chest?new Color(.45f,.28f,.1f):m.Kind=="boss"?new Color(.85f,.15f,.1f):m.Kind=="shop"?new Color(.2f,.8f,.35f):new Color(.2f,.55f,1);
          objects[m.Key]=obj;
        }
        obj.SetActive(!m.Used);
      }
    }
  }
}
