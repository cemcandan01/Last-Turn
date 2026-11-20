using System;
using System.Globalization;

namespace LastTurn.Core
{
  public struct CarAppearance
  {
    // 0 fabrika rengi; diğer değerler 24 bit RGB + 1 (siyah da seçilebilir).
    public int Paint, Fender, Ink, Wing, Graphic, Shift, Scale;
    public bool IsStock => Equals(default(CarAppearance));
    public bool Valid => ColorValid(Paint) && ColorValid(Fender) && ColorValid(Ink) &&
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
      n.Set("shift",CatalogNode.Num(Shift)); n.Set("scale",CatalogNode.Num(Scale));return n;
    }
    public static CarAppearance Load(CatalogNode n)
    {
      int Read(string k)=>(int)n[k].N();
      var style=new CarAppearance{Paint=Read("paint"),Fender=Read("fender"),Ink=Read("ink"),Wing=Read("wing"),
        Graphic=Read("graphic"),Shift=Read("shift"),Scale=Read("scale")};
      return style.Valid?style:default;
    }
  }
}
