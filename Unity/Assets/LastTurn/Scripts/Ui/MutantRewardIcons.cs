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
    private static IconSet current;
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void Reset(){current?.Dispose();current=null;}
    // Bağımsız görsel küme, hata fixture'larının canlı tabloyu değiştirmeden sınanmasını sağlar.
    public sealed class IconSet:IDisposable
    {
      private readonly Dictionary<string,Entry> entries=new Dictionary<string,Entry>(StringComparer.Ordinal);
      private readonly Dictionary<string,Sprite> sprites=new Dictionary<string,Sprite>(StringComparer.Ordinal);
      private readonly Func<string,Texture2D> load;
      private bool disposed;
      public IconSet(string json,Func<string,Texture2D> textures)
      {
        load=textures;if(string.IsNullOrWhiteSpace(json))return;Map map;
        try{map=JsonUtility.FromJson<Map>(json);}catch(Exception){return;}
        if(map==null||map.schema!=1||map.entries==null||map.assets==null)return;
        var assets=new Dictionary<string,Asset>(StringComparer.Ordinal);var badAssets=new HashSet<string>(StringComparer.Ordinal);
        foreach(var a in map.assets){if(a==null||!SafePath(a.path)||a.width<=0||a.height<=0||badAssets.Contains(a.path))continue;if(assets.ContainsKey(a.path)){assets.Remove(a.path);badAssets.Add(a.path);}else assets.Add(a.path,a);}
        var badKeys=new HashSet<string>(StringComparer.Ordinal);var seenKeys=new HashSet<string>(StringComparer.Ordinal);
        foreach(var e in map.entries){
          if(e==null||string.IsNullOrWhiteSpace(e.key)||badKeys.Contains(e.key))continue;
          if(!seenKeys.Add(e.key)){entries.Remove(e.key);badKeys.Add(e.key);continue;}
          if(!SafePath(e.path)||!assets.TryGetValue(e.path,out var a)||!RectFits(e,a.width,a.height))continue;
          e.sourceWidth=a.width;e.sourceHeight=a.height;entries.Add(e.key,e);
        }
      }
      private static bool SafePath(string path)=>!string.IsNullOrWhiteSpace(path)&&path.StartsWith("UI/MutantB/",StringComparison.Ordinal)&&!path.EndsWith("/",StringComparison.Ordinal)&&!path.Contains("..")&&!path.Contains("//")&&!path.Contains("/./")&&path.IndexOfAny(new[]{'\\',':','\0'})<0;
      private static bool RectFits(Entry e,int width,int height)=>e.width>0&&e.height>0&&e.x>=0&&e.y>=0&&(long)e.x+e.width<=width&&(long)e.y+e.height<=height;
      public bool TryGet(string key,out Sprite sprite)
      {
        sprite=null;if(disposed||string.IsNullOrWhiteSpace(key)||load==null)return false;
        if(sprites.TryGetValue(key,out sprite)&&sprite)return true;
        sprites.Remove(key);sprite=null;if(!entries.TryGetValue(key,out var item))return false;
        try{
          var texture=load(item.path);if(!texture)return false;
          // Üst sol kaynak rect'i, küçültülmüş importta da aynı normalize UV'ye taşınır.
          float sx=(float)texture.width/item.sourceWidth,sy=(float)texture.height/item.sourceHeight;
          if(item.width*sx<1||item.height*sy<1)return false;
          sprite=Sprite.Create(texture,new Rect(item.x*sx,(item.sourceHeight-item.y-item.height)*sy,item.width*sx,item.height*sy),new Vector2(.5f,.5f),100,0,SpriteMeshType.FullRect);
          if(!sprite)return false;sprite.name=key;sprites.Add(key,sprite);return true;
        }catch(Exception){if(sprite)UnityEngine.Object.Destroy(sprite);sprite=null;return false;}
      }
      public void Dispose(){if(disposed)return;disposed=true;foreach(var s in sprites.Values)if(s)UnityEngine.Object.Destroy(s);sprites.Clear();}
    }
    public static bool TryGet(string key,out Sprite sprite)
    {
      if(current==null){var text=Resources.Load<TextAsset>("UI/MutantB/reward-icons");current=new IconSet(text?text.text:null,Resources.Load<Texture2D>);}
      return current.TryGet(key,out sprite);
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
