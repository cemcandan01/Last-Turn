using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LastTurn.Prototype
{
  // Kaynaktaki gecikmeli geliştirici hayaleti. Rekor hayaleti varken öncelik ondadır.
  [DefaultExecutionOrder(-200)]
  public sealed class DeveloperGhostView : MonoBehaviour
  {
    private GtPrototype prototype;private PowertrainVehicle observed;private Transform visual;
    private DelayedGhostFeed feed=new DelayedGhostFeed();private long lastStep=-1;
    public bool Visible=>visual&&visual.gameObject.activeSelf;
    public double DisplayTime=>feed.Remote.Show[0];
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]private static void Install(){SceneManager.sceneLoaded-=Loaded;SceneManager.sceneLoaded+=Loaded;Loaded(default,default);}
    private static void Loaded(Scene s,LoadSceneMode m){if(Debug.isDebugBuild)new GameObject("Geliştirici gecikmeli hayaleti").AddComponent<DeveloperGhostView>();}
    private bool Enabled=>Debug.isDebugBuild&&PlayerPreferences.Current.On("hayalet")&&prototype&&prototype.Race?.Ghost==null;
    private void Observe(PowertrainVehicle v)
    {
      if(v.Body.Steps<=lastStep)feed.Clear();lastStep=v.Body.Steps;
      if(!Enabled){feed.Clear();return;}feed.Observe(RemoteSnapshots.Capture(v));
    }
    private void Update()
    {
      if(!prototype)prototype=FindFirstObjectByType<GtPrototype>();
      if(prototype&&observed!=prototype.Simulation){if(observed!=null)observed.Stepped-=Observe;observed=prototype.Simulation;feed=new DelayedGhostFeed();lastStep=-1;if(observed!=null)observed.Stepped+=Observe;}
      if(!Enabled||!feed.Remote.Ready){if(visual)visual.gameObject.SetActive(false);return;}
      if(!GameFlow.Paused&&!MutantRuntime.Blocked&&!SettingsScreen.Open)feed.Remote.Step(Time.deltaTime);
      if(!visual){var go=GameObject.CreatePrimitive(PrimitiveType.Cube);go.name="2 sn gecikmeli geliştirici hayaleti";Destroy(go.GetComponent<Collider>());go.transform.SetParent(transform);go.transform.localScale=new Vector3(1.8f,1.1f,4.3f);visual=go.transform;var r=go.GetComponent<Renderer>();var material=new Material(r.sharedMaterial);material.color=new Color(.3f,.8f,.9f);r.material=material;}
      visual.gameObject.SetActive(true);var a=feed.Remote.Show;var q=new BodyRotation(a[5],a[6],a[7],a[8]);
      // Anlık görüntünün konumu yer noktasıdır; primitive merkezine yalnız gösterim yüksekliği eklenir.
      visual.SetPositionAndRotation(GtPresentation.Position(new BodyVector(a[1],a[2]+.55,a[3])),GtPresentation.Rotation(q));
    }
    private void OnDestroy(){if(observed!=null)observed.Stepped-=Observe;if(visual){var r=visual.GetComponent<Renderer>();if(r)Destroy(r.sharedMaterial);}}
  }
}
