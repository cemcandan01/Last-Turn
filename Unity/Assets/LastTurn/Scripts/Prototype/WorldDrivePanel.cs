using LastTurn.Garage;
using UnityEngine;
namespace LastTurn.Prototype
{
  public sealed class WorldDrivePanel:MonoBehaviour
  {
    private GtPrototype p;private Vector2 scroll;private GUIStyle text,button;
    private void Awake(){p=GetComponent<GtPrototype>();}
    private void OnGUI()
    {
      if(!p||p.OpenTerrain==null||GameFlow.Paused)return;
      if(text==null){text=new GUIStyle(GUI.skin.label){fontSize=18,wordWrap=true};button=new GUIStyle(GUI.skin.button){fontSize=17,wordWrap=true};}
      float width=Mathf.Min(400,Screen.width-24),height=Mathf.Max(100,Screen.height-280);GUILayout.BeginArea(new Rect(12,230,width,height),GUI.skin.box);scroll=GUILayout.BeginScrollView(scroll);
      GUILayout.Label(p.OpenTerrain.Region.Name,text);GUILayout.Label("TS nesne: "+p.EnvironmentVisuals.ObstacleCount+" • darbeler "+p.Simulation.Body.CollisionCount,text);
      GUILayout.Label("Son darbe "+p.Simulation.Body.LastImpactSpeed.ToString("0.0")+" m/sn • Kariyer gövde puanı yok",text);
      var places=p.OpenTerrain.Region.Teleports;for(int i=0;i<places.Length;i++)if(GUILayout.Button(places[i].Name,button,GUILayout.Height(44)))p.TeleportWorld(i);
      GUILayout.EndScrollView();GUILayout.EndArea();
    }
  }
}
