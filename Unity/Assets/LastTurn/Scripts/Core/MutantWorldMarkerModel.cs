#nullable enable
using System.Linq;

namespace LastTurn.Core
{
  public sealed class MutantWorldMarkerModel
  {
    public string Key="",Name="",Kind="";
    /// Etkinlik türü (gp/rx/rl/dp/dg) ve sokak türü; sandığın lanetli olması. TS isaretleriGuncelle renk/boy seçimi bunlardan.
    public string Type="",Street="";
    public bool Cursed;
    /// TS mutant-ui TUR/SOKAK/ATOLYE/BOSS/SANDIK/LANET renkleri (isaretleriGuncelle, i=1).
    public int Color=>Kind=="chest"?(Cursed?0xff3cc8:0xfff0a8):Kind=="shop"?0x3cc8ff:Kind=="boss"?0xff2a2a:
      Street!=""?0xff8fd8:Type=="gp"?0xff5a3c:Type=="rx"?0xd08a48:Type=="rl"?0x4fbf74:Type=="dp"?0xb67cff:0xffd23c;
    /// Işık sütunu boyu (m): atölye 40, boss 140, diğerleri 70; sandıkta sütun yoktur.
    public double Height=>Kind=="shop"?40:Kind=="boss"?140:70;
    /// TS isaretler.ts renkYazisi: sokak ve sandık tabelasızdır.
    public string? Label=>Kind=="chest"?null:Color switch{0xff5a3c=>"ASFALT",0xd08a48=>"RALLİKROS",0x4fbf74=>"RALLİ",0xb67cff=>"DRİFT",0xffd23c=>"DRAG",0x3cc8ff=>"ATÖLYE",0xff2a2a=>"BOSS",_=>null};
    public double X,Z;
    public bool Used;
    public static MutantWorldMarkerModel[] Read(MutantRun run)
    {
      var menu=run.State;bool city=run.Region>=2;var shop=run.Catalog[city?"cityWorkshop":"workshop"];var boss=run.Catalog[city?"cityBoss":"bossPlace"];
      return menu["etkinlikler"].Items.Select(e=>new MutantWorldMarkerModel{Key="e"+e["id"].N(),Kind="event",Type=e["ty"].S(),Street=e["sokak"].S(),Name=run.Catalog["trackNames"][(int)e["i"].N()].S(),X=e["x"].N(),Z=e["z"].N(),Used=e["yapildi"].B()})
        .Concat(menu["sandiklar"].Items.Select(c=>new MutantWorldMarkerModel{Key="s"+c["id"].N(),Kind="chest",Cursed=c["lanetli"].B(),Name="Sandık",X=c["x"].N(),Z=c["z"].N(),Used=c["acildi"].B()}))
        .Concat(new[]{new MutantWorldMarkerModel{Key="a",Kind="shop",Name="Atölye",X=shop[0].N(),Z=shop[1].N()},new MutantWorldMarkerModel{Key="b",Kind="boss",Name=menu["boss"]["ad"].S(),X=boss[0].N(),Z=boss[1].N()}}).ToArray();
    }
  }
}
