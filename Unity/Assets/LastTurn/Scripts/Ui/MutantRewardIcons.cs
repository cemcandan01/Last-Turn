using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // Salt görsel kaynak eşlemesi: katalog/teklif protokolü veya ödül kuralı okumaz.
  public static class MutantRewardIcons
  {
    [Serializable] private sealed class Map {public int schema;public Entry[] entries;public Asset[] assets;}
    [Serializable] private sealed class Asset {public string path;public int width,height;}
    [Serializable] private sealed class Entry {public string key,path;public int x,y,width,height;[NonSerialized]public int sourceWidth,sourceHeight;}
    private static Dictionary<string,Entry> entries;
    private static readonly Dictionary<string,Sprite> sprites=new Dictionary<string,Sprite>();
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void Reset(){foreach(var s in sprites.Values)if(s)UnityEngine.Object.Destroy(s);sprites.Clear();entries=null;}
    public static bool TryGet(string key,out Sprite sprite)
    {
      sprite=null;if(string.IsNullOrEmpty(key))return false;
      if(sprites.TryGetValue(key,out sprite))return sprite;
      if(entries==null){
        entries=new Dictionary<string,Entry>();var text=Resources.Load<TextAsset>("UI/MutantB/reward-icons");
        if(!text)return false;var map=JsonUtility.FromJson<Map>(text.text);if(map==null||map.schema!=1||map.entries==null||map.assets==null)return false;
        foreach(var e in map.entries){foreach(var a in map.assets)if(a.path==e.path){e.sourceWidth=a.width;e.sourceHeight=a.height;break;}if(!entries.ContainsKey(e.key))entries.Add(e.key,e);}
      }
      if(!entries.TryGetValue(key,out var item))return false;var texture=Resources.Load<Texture2D>(item.path);
      if(!texture||item.sourceWidth<=0||item.sourceHeight<=0||item.width<=0||item.height<=0||item.x<0||item.y<0||item.x+item.width>item.sourceWidth||item.y+item.height>item.sourceHeight)return false;
      // Manifest koordinatı üst soldan; Unity Sprite rect'i alt soldan başlar. PNG değiştirilmez.
      // İçe aktarıcı dokuyu küçültse de aynı normalize UV bölgesi korunur.
      float sx=(float)texture.width/item.sourceWidth,sy=(float)texture.height/item.sourceHeight;
      sprite=Sprite.Create(texture,new Rect(item.x*sx,(item.sourceHeight-item.y-item.height)*sy,item.width*sx,item.height*sy),new Vector2(.5f,.5f),100,0,SpriteMeshType.FullRect);
      sprite.name=key;sprites.Add(key,sprite);return true;
    }
    public static VisualElement Create(string key)
    {
      var icon=new VisualElement{name="reward-icon-"+key,pickingMode=PickingMode.Ignore};icon.AddToClassList("mc-icon");
      if(TryGet(key,out var sprite))icon.style.backgroundImage=new StyleBackground(sprite);
      else{icon.AddToClassList("mc-icon-fallback");icon.Add(Ui.Text("?","baslik"));}
      return icon;
    }
  }
}
