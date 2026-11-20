using System;
using System.Globalization;

namespace LastTurn.Core
{
  public struct DecalLayer
  {
    // 0 boş, 1 çift şerit, 2 kapı numarası, 3 kanat amblemi. Yüzey 0 üst, 1 sol, 2 sağ.
    public int Shape,Surface,X,Y,Size,Angle,Color,Number;
    public bool Mirror;
    public bool Valid=>Shape>=0 && Shape<=3 && Surface>=0 && Surface<=2 && X>=-10 && X<=10 && Y>=-10 && Y<=10 &&
      Size>=-4 && Size<=6 && Angle>=-180 && Angle<=180 && Color>=0 && Color<=0x1000000 && Number>=0 && Number<=99;
    public CatalogNode Save(){
      var n=CatalogNode.Obj();n.Set("shape",CatalogNode.Num(Shape));n.Set("surface",CatalogNode.Num(Surface));
      n.Set("x",CatalogNode.Num(X));n.Set("y",CatalogNode.Num(Y));n.Set("size",CatalogNode.Num(Size));n.Set("angle",CatalogNode.Num(Angle));
      n.Set("color",CatalogNode.Num(Color));n.Set("number",CatalogNode.Num(Number));n.Set("mirror",CatalogNode.Bool(Mirror));return n;
    }
    public static DecalLayer Load(CatalogNode n){
      int I(string key)=>(int)n[key].N();
      var layer=new DecalLayer{Shape=I("shape"),Surface=I("surface"),X=I("x"),Y=I("y"),Size=I("size"),
        Angle=I("angle"),Color=I("color"),Number=I("number"),Mirror=n["mirror"].B()};
      return layer.Valid?layer:default;
    }
  }
  public struct CarAppearance
  {
    // 0 fabrika rengi; diğer değerler 24 bit RGB + 1 (siyah da seçilebilir).
    public int Paint, Fender, Ink, Wing, Graphic, Shift, Scale;
    public DecalLayer Bottom,Middle,Top;
    public DecalLayer Layer(int index)=>index==0?Bottom:index==1?Middle:Top;
    public void SetLayer(int index,DecalLayer value){if(index==0)Bottom=value;else if(index==1)Middle=value;else if(index==2)Top=value;}
    public bool IsStock => Equals(default(CarAppearance));
    public bool Valid => ColorValid(Paint) && ColorValid(Fender) && ColorValid(Ink) && Bottom.Valid && Middle.Valid && Top.Valid &&
      Wing>=0 && Wing<=3 && Graphic>=0 && Graphic<=3 && Math.Abs((long)Shift)<=2 && Math.Abs((long)Scale)<=2;
    private static bool ColorValid(int value)=>value>=0 && value<=0x1000000;
    public static bool TryColor(string hex,out int value)
    {
      value=0;
      if(string.IsNullOrWhiteSpace(hex))return false;
      string digits=hex.Trim();if(digits.StartsWith("#",StringComparison.Ordinal))digits=digits.Substring(1);
      if(digits.Length!=6 || !int.TryParse(digits,NumberStyles.AllowHexSpecifier,CultureInfo.InvariantCulture,out int rgb))return false;
      value=rgb+1;return true;
    }
    public CatalogNode Save()
    {
      var n=CatalogNode.Obj();
      n.Set("paint",CatalogNode.Num(Paint)); n.Set("fender",CatalogNode.Num(Fender)); n.Set("ink",CatalogNode.Num(Ink));
      n.Set("wing",CatalogNode.Num(Wing)); n.Set("graphic",CatalogNode.Num(Graphic));
      n.Set("shift",CatalogNode.Num(Shift)); n.Set("scale",CatalogNode.Num(Scale));
      if(!Bottom.Equals(default(DecalLayer)) || !Middle.Equals(default(DecalLayer)) || !Top.Equals(default(DecalLayer)))
        n.Set("layers",CatalogNode.Arr(new[]{Bottom.Save(),Middle.Save(),Top.Save()}));
      return n;
    }
    public static CarAppearance Load(CatalogNode n)
    {
      int Read(string k)=>(int)n[k].N();
      var style=new CarAppearance{Paint=Read("paint"),Fender=Read("fender"),Ink=Read("ink"),Wing=Read("wing"),
        Graphic=Read("graphic"),Shift=Read("shift"),Scale=Read("scale")};
      for(int i=0;i<3;i++)style.SetLayer(i,DecalLayer.Load(n["layers"][i]));
      return style.Valid?style:default;
    }
  }
}
