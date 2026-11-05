using System;
using LastTurn.Core;
using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // F §5c–d: koşu ve RNG yalnız MutantRuntime/Core'da; burada odak ve adım görünümü tutulur.
  public sealed class MutantStartView:MonoBehaviour
  {
    public static MutantStartView Instance {get;private set;}
    public static bool CoversCurrentScreen=>MutantRuntime.Starting&&(MutantRuntime.Panel=="start"||MutantRuntime.Panel=="choice");
    public bool Visible {get;private set;}
    public int Focused=>choice?skillFocus:carFocus;
    public bool ChoosingSkill=>choice;
    private VisualElement page,content;private bool choice;private int carFocus,skillFocus;private string shown="";private MutantRun run;
    private void Start()
    {
      Instance=this;page=new VisualElement{name="f-mutant-start"};page.AddToClassList("katman");page.AddToClassList("mut-ton");page.Add(Ui.Shade());
      var bar=new VisualElement();bar.AddToClassList("ustbar");bar.Add(Ui.Logo());var badge=new VisualElement();badge.AddToClassList("mut-ad");badge.Add(new Skew());badge.Add(Ui.Text("MUTANT"));bar.Add(badge);page.Add(bar);
      content=new VisualElement();content.AddToClassList("m-content");page.Add(content);UiRoot.Instance.Screen.Add(page);Ui.Show(page,false);
    }
    private void Update()
    {
      bool active=CoversCurrentScreen,changed=active!=Visible;Visible=active;Ui.Show(page,active);if(!active){shown="";return;}
      if(run!=MutantRuntime.Run){run=MutantRuntime.Run;carFocus=skillFocus=0;shown="";}
      if(shown!=MutantRuntime.Panel){shown=MutantRuntime.Panel;choice=shown=="choice";Rebuild();changed=true;}
      if(changed)return;
      var k=Keyboard.current;if(k==null)return;
      if(k.escapeKey.wasPressedThisFrame){Back();return;}
      if(choice&&k.leftArrowKey.wasPressedThisFrame){ChangeCar();return;}
      int count=choice?MutantRuntime.Model.Choices.Length:MutantRuntime.Model.StartingCarsCards.Length;
      for(int i=0;i<Math.Min(3,count);i++)if(k[Key.Digit1+i].wasPressedThisFrame){Focus(i);return;}
      if(k.rightArrowKey.wasPressedThisFrame||k.downArrowKey.wasPressedThisFrame)Focus((Focused+1)%count);
      else if(k.upArrowKey.wasPressedThisFrame||(!choice&&k.leftArrowKey.wasPressedThisFrame))Focus((Focused+count-1)%count);
      else if(k.enterKey.wasPressedThisFrame)Continue();
    }
    public void Focus(int index)
    {
      int count=choice?MutantRuntime.Model.Choices.Length:MutantRuntime.Model.StartingCarsCards.Length;if(index<0||index>=count)return;
      if(choice)skillFocus=index;else carFocus=index;GameAudio.Click();Rebuild();
    }
    public void Continue()
    {
      var m=MutantRuntime.Model;
      if(choice){if(skillFocus<m.Choices.Length)MutantRuntime.Choose(m.Choices[skillFocus].Id);}
      else if(carFocus<m.StartingCarsCards.Length)MutantRuntime.SelectCar(m.StartingCarsCards[carFocus].Id);
    }
    public void ChangeCar(){MutantRuntime.BackToStartingCars();}
    public void Back(){if(choice)ChangeCar();else MutantRuntime.Exit();}
    private static VisualElement Box(string cls){var e=new VisualElement();e.AddToClassList(cls);return e;}
    private void Rebuild()
    {
      content.Clear();var m=MutantRuntime.Model;
      var steps=Box("m-steps");steps.Add(Ui.Text("1 ARAÇ",!choice?"g-price":"g-copy"));steps.Add(Ui.Text("  /  "));steps.Add(Ui.Text("2 YETENEK",choice?"g-price":"g-copy"));content.Add(steps);
      var boss=new ScrollView(ScrollViewMode.Vertical){horizontalScrollerVisibility=ScrollerVisibility.Hidden,verticalScrollerVisibility=ScrollerVisibility.Auto};boss.AddToClassList("g-panel");boss.AddToClassList("m-boss");boss.Add(Ui.Section("İLK BOSS  •  "+m.Timer));boss.Add(Ui.Text(Ui.Upper(m.BossName),"baslik","g-name"));boss.Add(Ui.Text(m.BossDescription,"g-copy"));
      foreach(var ability in m.BossAbilities)boss.Add(Ui.Text("+ "+ability,"g-copy"));boss.Add(Ui.Section("ZAYIF YANI"));boss.Add(Ui.Text(m.BossWeakness,"g-copy"));content.Add(boss);
      if(choice)
      {
        var car=Array.Find(m.StartingCarsCards,c=>c.Id==m.SelectedCar);var selected=Box("g-panel");selected.AddToClassList("m-selected");selected.Add(Ui.Section("ARACIN"));selected.Add(Ui.Text(m.CarName,"baslik","g-name"));
        if(car!=null)selected.Add(Ui.Text(car.Hp.ToString("0")+" HP  •  "+car.Mass.ToString("0")+" KG  •  "+car.Drive,"g-copy"));selected.Add(Ui.Button("ARACI DEĞİŞTİR","←",ChangeCar,small:true));content.Add(selected);
      }
      else
      {
        var car=m.StartingCarsCards[carFocus];var selected=Box("m-car-title");selected.Add(Ui.Text(Ui.Upper(car.Name),"baslik"));selected.Add(Ui.Text(car.Hp.ToString("0")+" HP  •  "+car.Mass.ToString("0")+" KG  •  "+car.Drive,"g-class"));selected.Add(Ui.Text("3 araç her koşuda rastgele; garajdaki parçalar bu koşuya taşınmaz.","g-copy"));content.Add(selected);
      }
      var lower=Box("m-lower");lower.Add(Ui.Section(choice?"BAŞLANGIÇ YETENEĞİ SEÇ":"ARACINI SEÇ  •  KOŞUDA GÜÇLENECEK"));var cards=Box("m-cards");lower.Add(cards);
      int count=choice?m.Choices.Length:m.StartingCarsCards.Length;
      for(int i=0;i<count;i++)
      {
        int n=i;var card=Box("kart");card.name="mutant-option-"+i;card.AddToClassList("m-card");card.EnableInClassList("sec",Focused==i);
        card.Add(Ui.Text(choice?Ui.Upper(m.Choices[i].Type):TypeName(m.StartingCarsCards[i].Type),"ust"));card.Add(Ui.Text(choice?m.Choices[i].Name:m.StartingCarsCards[i].Name,"ad"));
        card.Add(Ui.Text(choice?m.Choices[i].Description:m.StartingCarsCards[i].Hp.ToString("0")+" HP  •  "+m.StartingCarsCards[i].Mass.ToString("0")+" KG  •  "+m.StartingCarsCards[i].Drive,"g-copy"));card.Add(Ui.Key((i+1).ToString()));card.AddManipulator(new Clickable(()=>Focus(n)));cards.Add(card);
      }
      var go=Ui.Button(choice?"SÜRÜŞE BAŞLA":"DEVAM","Enter",Continue,true);go.name="mutant-continue";go.AddToClassList("m-go");cards.Add(go);content.Add(lower);
      var back=Ui.Button(choice?"ARACA DÖN":"MUTANT MENÜSÜ","Esc",Back,small:true);Ui.Absolute(back,left:0,bottom:-70);content.Add(back);
      content.Add(Ui.Hints(("1|2|3","Seç"),("↑|↓","Seç"),("Enter",choice?"Sürüşe başla":"Devam"),("Esc",choice?"Araca dön":"Mutant menüsü")));
    }
    private static string TypeName(string type)
    {switch(type){case "gp":return "ASFALT";case "rx":return "RALLİKROS";case "rl":return "RALLİ";case "dp":return "DRİFT";case "dg":return "DRAG";default:return "ARAÇ";}}
    private void OnDestroy(){if(Instance==this)Instance=null;page?.RemoveFromHierarchy();}
  }
}
