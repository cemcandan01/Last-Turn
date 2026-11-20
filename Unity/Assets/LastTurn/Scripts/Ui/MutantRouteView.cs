using LastTurn.Core;
using LastTurn.Prototype;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  public sealed class MutantRouteView:MonoBehaviour
  {
    public static int HandledFrame {get;private set;}=-1;
    private VisualElement panel,button;
    private Label state;
    private MutantRun seen;private int region;
    private void Start()
    {
      button=Ui.Button("ROTA SEÇ · M","",MutantRuntime.OpenRoutes,small:true);button.name="route-open";
      Ui.Absolute(button,right:58,bottom:160);UiRoot.Instance.Hud.Add(button);
      panel=new VisualElement{name="route-panel"};panel.AddToClassList("katman");panel.style.backgroundColor=new Color(.06f,.1f,.09f,.98f);
      var box=new VisualElement();Ui.Absolute(box,left:120,right:120,top:160,bottom:120);
      box.Add(Ui.Text("ROTANI SEÇ","baslik"));
      box.Add(Ui.Text("İki etkinliği sırayla kazan. Başarısızlık veya gerekli riskin altında seçim bonusu bitirir. Bölge başına tek rota.","g-copy"));
      state=Ui.Text("","g-copy");state.style.marginTop=22;box.Add(state);
      panel.Add(box);UiRoot.Instance.Screen.Add(panel);Ui.Show(panel,false);Ui.Show(button,false);
    }
    private void Rebuild()
    {
      var box=state.parent;
      while(box.childCount>3)box.RemoveAt(3);
      var current=MutantRoute.Read(MutantRuntime.Run);
      state.text=current.Chosen?current.Status:"Boss sayacı seçim sırasında durur.";
      foreach(int risk in new[]{0,2}){
        var offer=MutantRoute.Offer(MutantRuntime.Run,risk);int choice=risk;
        var card=Ui.Button(offer.Name+" · Risk "+risk+" · +"+offer.Bonus+" para","",()=>MutantRuntime.ChooseRoute(choice),risk==0);
        card.name="route-choice-"+risk;card.style.marginTop=20;card.SetEnabled(!current.Chosen && offer.Ids.Length==2);
        box.Add(card);box.Add(Ui.Text(offer.Detail,"g-copy"));
      }
      box.Add(Ui.Button("DÜNYAYA DÖN","Esc",Back,small:true));
    }
    private void Update()
    {
      if(panel==null)return;
      bool world=MutantRuntime.Active && !MutantRuntime.InRace && !GameFlow.Paused && !SettingsScreen.Open;
      Ui.Show(button,world && !MutantRuntime.Blocked);
      bool open=world && MutantRuntime.Panel=="route";bool was=!panel.ClassListContains("gizli");Ui.Show(panel,open);
      if(open && (!was || seen!=MutantRuntime.Run || region!=MutantRuntime.Run.Region)){seen=MutantRuntime.Run;region=seen.Region;Rebuild();}
      var k=Keyboard.current;if(k==null)return;
      if(open && k.escapeKey.wasPressedThisFrame)Back();
      else if(world && !MutantRuntime.Blocked && k.mKey.wasPressedThisFrame)MutantRuntime.OpenRoutes();
    }
    private static void Back(){HandledFrame=Time.frameCount;MutantRuntime.ClosePanel();}
    private void OnDestroy(){panel?.RemoveFromHierarchy();button?.RemoveFromHierarchy();}
  }
}
