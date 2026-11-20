using System;
using LastTurn.Core;
using UnityEngine;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  internal static class GarageAppearanceEditor
  {
    private static readonly string[] Wings={"Fabrika","Dudak","Sokak","Pist"};
    private static readonly string[] Graphics={"Yok","İkiz şerit","Kıvılcım","Dama"};
    private static readonly string[] Layers={"Kaporta","Çamurluk","Çıkartma"};
    private static readonly string[] Palette={"E8E5DC","252C34","C62835","F16930","E6BA47","209C8B","2863BF","854AC4"};

    internal static void Draw(VisualElement container,GarageVehiclePreview preview,string name,CarAppearance style,
      Action<CarAppearance> previewStyle,Action save,Action cancel,bool writable)
    {
      var layout=new VisualElement();layout.AddToClassList("style-layout");container.Add(layout);
      var stage=new VisualElement();stage.AddToClassList("style-stage");layout.Add(stage);
      stage.Add(Ui.Text(name,"style-title"));stage.Add(preview.Image);
      var turn=new VisualElement();turn.AddToClassList("style-row");stage.Add(turn);
      Button ActionButton(VisualElement parent,string text,Action click,string id="")
      {
        var button=new Button(click){text=text,name=id};button.AddToClassList("style-button");parent.Add(button);return button;
      }
      ActionButton(turn,"◀  DÖNDÜR",()=>preview.RotateBy(-35));ActionButton(turn,"DÖNDÜR  ▶",()=>preview.RotateBy(35));
      var menu=new ScrollView(ScrollViewMode.Vertical);menu.AddToClassList("style-menu");layout.Add(menu);
      menu.Add(Ui.Text("GÖRSEL ATÖLYE","style-title"));
      Action refresh=()=>{};
      void Changed(){previewStyle(style);refresh();}
      VisualElement Row(string heading)
      {
        menu.Add(Ui.Text(heading,"style-caption"));var row=new VisualElement();row.AddToClassList("style-row");menu.Add(row);return row;
      }
      Button[] Choices(string heading,string[] values,Action<int> choose,string prefix)
      {
        var row=Row(heading);var result=new Button[values.Length];
        for(int i=0;i<values.Length;i++){int n=i;result[i]=ActionButton(row,values[i],()=>choose(n),prefix+i);}
        return result;
      }
      var wings=Choices("SPOILER",Wings,i=>{style.Wing=i;Changed();},"wing-");
      var graphics=Choices("ÇIKARTMA",Graphics,i=>{style.Graphic=i;Changed();},"graphic-");
      int layer=0;
      var layers=Choices("BOYANACAK YÜZEY",Layers,i=>{layer=i;refresh();},"paint-layer-");
      int CurrentColor()=>layer==0?style.Paint:layer==1?style.Fender:style.Ink;
      void Tint(int rgb){if(layer==0)style.Paint=rgb;else if(layer==1)style.Fender=rgb;else style.Ink=rgb;Changed();}
      var palette=Row("RENK");var swatches=new Button[Palette.Length];
      for(int i=0;i<Palette.Length;i++)
      {
        string hex=Palette[i];CarAppearance.TryColor(hex,out int rgb);
        var swatch=ActionButton(palette,"",()=>Tint(rgb),"swatch-"+hex);swatch.AddToClassList("style-swatch");swatch.tooltip="#"+hex;
        ColorUtility.TryParseHtmlString("#"+hex,out var paint);swatch.style.backgroundColor=paint;swatches[i]=swatch;
      }
      var custom=Row("ÖZEL RENK · HEX");
      var hexInput=new TextField{maxLength=7,name="style-hex"};hexInput.style.width=108;custom.Add(hexInput);
      var applyHex=ActionButton(custom,"Rengi uygula",()=>{if(CarAppearance.TryColor(hexInput.value,out int color))Tint(color);});
      hexInput.RegisterValueChangedCallback(e=>applyHex.SetEnabled(CarAppearance.TryColor(e.newValue,out _)));
      ActionButton(custom,"Sıfırla",()=>Tint(0));
      var fit=Row("ÇIKARTMA YERLEŞİMİ");var offset=new SliderInt("Konum",-2,2){name="style-position"};fit.Add(offset);
      var scale=new SliderInt("Boyut",-2,2){name="style-scale"};fit.Add(scale);fit.AddToClassList("style-sliders");
      offset.RegisterValueChangedCallback(e=>{style.Shift=e.newValue;Changed();});
      scale.RegisterValueChangedCallback(e=>{style.Scale=e.newValue;Changed();});
      var actions=Row("GÖRÜNÜM");ActionButton(actions,"Fabrika görünümü",()=>{style=default;Changed();},"style-reset");
      ActionButton(actions,"Vazgeç",cancel,"style-cancel");
      var commit=ActionButton(actions,"Kaydet",save,"style-save");commit.AddToClassList("style-commit");commit.SetEnabled(writable);
      void Select(Button[] buttons,int index){for(int i=0;i<buttons.Length;i++)buttons[i].EnableInClassList("style-selected",index==i);}
      refresh=()=>{
        Select(wings,style.Wing);Select(graphics,style.Graphic);Select(layers,layer);
        string hex=CurrentColor()==0?"":(CurrentColor()-1).ToString("X6");
        Select(swatches,Array.IndexOf(Palette,hex));hexInput.SetValueWithoutNotify(hex);
        applyHex.SetEnabled(hex.Length==6);offset.SetValueWithoutNotify(style.Shift);scale.SetValueWithoutNotify(style.Scale);
        fit.SetEnabled(style.Graphic!=0);
      };
      refresh();
    }
  }
}
