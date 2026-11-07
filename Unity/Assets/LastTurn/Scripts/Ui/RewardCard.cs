using LastTurn.Core;
using UnityEngine;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // Yeniden kullanılabilir salt kart. Ödül alma/seçim/RNG kuralı veya katalog JSON erişimi yok.
  public sealed class RewardCard:VisualElement
  {
    public MutantRewardCard Model {get;}
    public ScrollView Details {get;}
    public RewardCard(MutantRewardCard model,bool compact=false)
    {
      Model=model;name="reward-"+model.Offer;focusable=true;tabIndex=0;AddToClassList("reward-card");
      if(compact)AddToClassList("reward-card--compact");
      var sheet=Resources.Load<StyleSheet>("UI/reward-card");if(sheet)styleSheets.Add(sheet);
      if(ColorUtility.TryParseHtmlString(model.RarityColor,out var color)){style.borderLeftColor=color;style.borderRightColor=color;style.borderTopColor=color;style.borderBottomColor=color;}
      var top=new VisualElement();top.AddToClassList("rc-top");top.Add(Ui.Text(model.RaritySymbol+" "+model.RarityText,"rc-rarity"));top.Add(Ui.Text(model.SourceText,"rc-source"));Add(top);
      Add(Ui.Text(model.Name,"rc-title"));Add(Ui.Text(model.KindText+" · "+model.LevelText,"rc-level"));
      Details=new ScrollView(ScrollViewMode.Vertical){horizontalScrollerVisibility=ScrollerVisibility.Hidden};Details.AddToClassList("rc-details");Add(Details);
      if(compact){Details.Add(Ui.Text(model.EffectText,"rc-effect"));Details.Add(Ui.Text(model.VehicleText,"rc-vehicle"));if(model.Description!=model.EffectText)Details.Add(Ui.Text(model.Description,"rc-description"));}
      else {Details.Add(Ui.Text(model.Description,"rc-description"));Add(Ui.Text("KATALOG ETKİSİ","rc-caption"));Add(Ui.Text(model.EffectText,"rc-effect"));Add(Ui.Text("MEVCUT ARAÇ / KOŞUL","rc-caption"));Add(Ui.Text(model.VehicleText,"rc-vehicle"));}
      var foot=new VisualElement();foot.AddToClassList("rc-foot");foot.Add(Ui.Text(model.Compatibility,"rc-compatibility"));
      if(model.Cursed)foot.Add(Ui.Text(model.CurseText,"rc-curse"));Add(foot);tooltip=model.Compatibility;
      RegisterCallback<KeyDownEvent>(e=>{if(e.keyCode==KeyCode.PageDown||e.keyCode==KeyCode.PageUp){Details.scrollOffset+=new Vector2(0,e.keyCode==KeyCode.PageDown?100:-100);e.StopPropagation();}},TrickleDown.TrickleDown);
    }
  }
}
