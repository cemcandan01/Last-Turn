using LastTurn.Garage;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;
namespace LastTurn.Ui
{
  public sealed class GarageTestView:MonoBehaviour
  {
    private VisualElement page;private Label text;private GtPrototype driver;
    private void Start()
    {
      page=new VisualElement{name="garage-test-panel"};page.AddToClassList("g-panel");Ui.Absolute(page,right:45,top:100);page.style.width=490;page.style.paddingLeft=22;page.style.paddingRight=22;page.style.paddingBottom=20;
      page.Add(Ui.Text("KURULUM TEST ALANI","style-title"));text=Ui.Text("","g-copy");page.Add(text);
      var toggle=Ui.Button("A / B KURULUMU DEĞİŞTİR","Y",()=>GarageTestSession.Toggle(driver),true);toggle.name="garage-test-toggle";page.Add(toggle);
      page.Add(Ui.Button("GARAJA DÖN","",()=>GameFlow.LeaveDrive(0),small:true));
      UiRoot.Instance.Hud.Add(page);
    }
    private void Update()
    {
      if(!driver)driver=FindFirstObjectByType<GtPrototype>();
      bool active=GarageTestSession.Active && driver && driver.Race!=null && !GameFlow.Paused;
      Ui.Show(page,active);if(!active)return;
      text.text=(GarageTestSession.Preview?"B · DENEME KURULUMU":"A · TAKILI KURULUM")+"\n\nA\n"+GarageTestSession.BeforeResult.Text+"\n\nB\n"+GarageTestSession.AfterResult.Text+"\n\nAynı asfalt, aynı girdilerle ölçüm. Daha küçük kayma açısı tek başına daha iyi tur süresi anlamına gelmez.";
      if(Keyboard.current?.yKey.wasPressedThisFrame==true)GarageTestSession.Toggle(driver);
    }
    private void OnDestroy(){page?.RemoveFromHierarchy();}
  }
}
