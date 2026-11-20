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
    private static readonly string[] Layers={"Kaporta","Çamurluk","Ana desen","Seçili katman"};
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
      var tools=new VisualElement();tools.AddToClassList("style-menu");layout.Add(tools);
      var menu=new ScrollView(ScrollViewMode.Vertical);menu.style.flexGrow=1;menu.style.minHeight=0;tools.Add(menu);
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
      var graphics=Choices("ANA DESEN",Graphics,i=>{style.Graphic=i;Changed();},"graphic-");
      int layer=0,slot=0;
      var extra=new Foldout{text="Çıkartma katmanları",value=false,name="decal-foldout"};menu.Add(extra);
      var slots=new Button[3];var shapes=new Button[4];var surfaces=new Button[3];
      VisualElement Line(string title){
        extra.Add(Ui.Text(title,"style-caption"));var row=new VisualElement();row.AddToClassList("style-row");extra.Add(row);return row;
      }
      void ChangeDecal(Func<DecalLayer,DecalLayer> change){
        style.SetLayer(slot,change(style.Layer(slot)));Changed();
      }
      var slotRow=Line("KATMAN · ALTTAN ÜSTE");
      for(int i=0;i<3;i++){int n=i;slots[i]=ActionButton(slotRow,(n+1).ToString(),()=>{slot=n;layer=3;refresh();},"decal-slot-"+n);}
      var shapeRow=Line("ÇIKARTMA");
      string[] shapeNames={"Boş","Çift şerit","Numara","Arma"};
      for(int i=0;i<shapes.Length;i++){
        int n=i;shapes[i]=ActionButton(shapeRow,shapeNames[n],()=>{
          layer=3;ChangeDecal(d=>{
            if(n==0)return default;
            if(d.Shape==0){d.Surface=n==1?0:1;d.X=n==3?-6:0;d.Y=n==1?6:0;d.Number=27;}
            d.Shape=n;return d;
          });
        },"decal-shape-"+n);
      }
      var faceRow=Line("YÜZEY");string[] faceNames={"Üst","Sol yan","Sağ yan"};
      for(int i=0;i<3;i++){int n=i;surfaces[i]=ActionButton(faceRow,faceNames[n],()=>ChangeDecal(d=>{d.Surface=n;return d;}),"decal-face-"+n);}
      var mirror=ActionButton(faceRow,"Karşı yana aynala",()=>ChangeDecal(d=>{d.Mirror=!d.Mirror;return d;}),"decal-mirror");
      SliderInt Slider(string title,string name,int min,int max,Func<DecalLayer,int,DecalLayer> change){
        var slider=new SliderInt(title,min,max){name=name};extra.Add(slider);
        slider.AddToClassList("decal-slider");
        slider.RegisterValueChangedCallback(e=>ChangeDecal(d=>change(d,e.newValue)));return slider;
      }
      var across=Slider("Yatay","decal-x",-10,10,(d,v)=>{d.X=v;return d;});
      var height=Slider("Dikey","decal-y",-10,10,(d,v)=>{d.Y=v;return d;});
      var degrees=Slider("Dönüş (°)","decal-angle",-180,180,(d,v)=>{d.Angle=v;return d;});
      var size=Slider("Boyut","decal-size",-4,6,(d,v)=>{d.Size=v;return d;});
      var number=Slider("Numara","decal-number",0,99,(d,v)=>{d.Number=v;return d;});number.showInputField=true;
      var layers=Choices("BOYANACAK YÜZEY",Layers,i=>{layer=i;refresh();},"paint-layer-");
      int CurrentColor()=>layer==0?style.Paint:layer==1?style.Fender:layer==2?style.Ink:style.Layer(slot).Color;
      void Tint(int rgb){if(layer==0)style.Paint=rgb;else if(layer==1)style.Fender=rgb;else if(layer==2)style.Ink=rgb;else{var d=style.Layer(slot);d.Color=rgb;style.SetLayer(slot,d);}Changed();}
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
      var actions=new VisualElement();actions.AddToClassList("style-row");actions.AddToClassList("style-footer");tools.Add(actions);
      ActionButton(actions,"Fabrika görünümü",()=>{style=default;Changed();},"style-reset");
      ActionButton(actions,"Vazgeç",cancel,"style-cancel");
      var commit=ActionButton(actions,"Kaydet",save,"style-save");commit.AddToClassList("style-commit");commit.SetEnabled(writable);
      void Select(Button[] buttons,int index){for(int i=0;i<buttons.Length;i++)buttons[i].EnableInClassList("style-selected",index==i);}
      refresh=()=>{
        var decal=style.Layer(slot);
        Select(slots,slot);Select(shapes,decal.Shape);Select(surfaces,decal.Surface);
        for(int i=0;i<slots.Length;i++)slots[i].text=(i+1)+" · "+shapeNames[style.Layer(i).Shape];
        bool used=decal.Shape!=0;faceRow.SetEnabled(used);mirror.SetEnabled(used && decal.Surface!=0);
        mirror.EnableInClassList("style-selected",decal.Mirror && decal.Surface!=0);
        across.SetEnabled(used);height.SetEnabled(used);degrees.SetEnabled(used);size.SetEnabled(used);
        number.style.display=decal.Shape==2?DisplayStyle.Flex:DisplayStyle.None;
        number.SetValueWithoutNotify(decal.Number);across.SetValueWithoutNotify(decal.X);height.SetValueWithoutNotify(decal.Y);
        degrees.SetValueWithoutNotify(decal.Angle);size.SetValueWithoutNotify(decal.Size);
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
