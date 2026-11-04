using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;

namespace LastTurn.Core
{
  // Unity ve .NET aynı JSON okuyucusunu kullanır; ek paket veya UnityEngine bağımlılığı yoktur.
  public sealed class CatalogNode
  {
    private readonly object value;
    private CatalogNode(object value) { this.value = value; }
    public static CatalogNode Obj() => new CatalogNode(new Dictionary<string, CatalogNode>(StringComparer.Ordinal));
    public static CatalogNode Num(double n) { Numeric.Finite(n); return new CatalogNode(n); }
    public static CatalogNode Str(string s) => new CatalogNode(s);
    public static CatalogNode Arr(IEnumerable<CatalogNode> nodes) => new CatalogNode(nodes.ToList());
    public CatalogNode this[string key] => value is Dictionary<string,CatalogNode> d && d.TryGetValue(key,out var n) ? n : new CatalogNode(null!);
    public CatalogNode this[int i] => value is List<CatalogNode> a && i>=0 && i<a.Count ? a[i] : new CatalogNode(null!);
    public bool Has(string key) => value is Dictionary<string,CatalogNode> d && d.ContainsKey(key);
    public double N(double fallback=0) => value is double n ? n : fallback;
    public string S(string fallback="") => value is string s ? s : fallback;
    public bool B() => value is bool b && b;
    public bool IsNumber => value is double;
    public static CatalogNode Bool(bool b) => new CatalogNode(b);
    public static CatalogNode Null() => new CatalogNode(null!);
    public bool IsBool => value is bool;
    public bool IsString => value is string;
    public bool IsNull => value == null;
    public bool IsObject => value is Dictionary<string,CatalogNode>;
    public bool IsArray => value is List<CatalogNode>;
    public IEnumerable<CatalogNode> Items => value is List<CatalogNode> a ? a : Enumerable.Empty<CatalogNode>();
    public IEnumerable<KeyValuePair<string,CatalogNode>> Fields => value is Dictionary<string,CatalogNode> d ? d : Enumerable.Empty<KeyValuePair<string,CatalogNode>>();
    public void Set(string key,CatalogNode n) { ((Dictionary<string,CatalogNode>)value)[key]=n; }
    public void Remove(string key) { ((Dictionary<string,CatalogNode>)value).Remove(key); }
    public CatalogNode Clone() => Parse(ToString());
    public override string ToString()
    {
      if(value==null) return "null";
      if(value is double n) return n.ToString("R",CultureInfo.InvariantCulture);
      if(value is bool b) return b?"true":"false";
      if(value is string s) return "\""+s.Replace("\\","\\\\").Replace("\"","\\\"").Replace("\n","\\n").Replace("\r","\\r").Replace("\t","\\t")+"\"";
      if(value is List<CatalogNode> a) return "["+string.Join(",",a)+"]";
      return "{"+string.Join(",",Fields.Select(p=>Str(p.Key)+":"+p.Value))+"}";
    }
    public static CatalogNode Parse(string json)
    {
      int i=0,depth=0;
      void White(){while(i<json.Length && char.IsWhiteSpace(json[i]))i++;}
      void Need(char c){White();if(i>=json.Length || json[i++]!=c)throw new FormatException("Katalog JSON: "+c);}
      string String()
      {
        Need('"');var s=new StringBuilder();bool ended=false;
        while(i<json.Length){char c=json[i++];if(c=='"'){ended=true;break;}if(c<' ')throw new FormatException("JSON kontrol karakteri");
          if(c=='\\'){if(i>=json.Length)throw new FormatException("JSON kaçış");c=json[i++];switch(c){case '"':case '\\':case '/':break;case 'b':c='\b';break;case 'f':c='\f';break;case 'n':c='\n';break;case 'r':c='\r';break;case 't':c='\t';break;case 'u':if(i+4>json.Length)throw new FormatException();c=(char)int.Parse(json.Substring(i,4),NumberStyles.HexNumber,CultureInfo.InvariantCulture);i+=4;break;default:throw new FormatException("JSON kaçış");}}s.Append(c);}
        if(!ended)throw new FormatException("JSON metin kapanmadı");return s.ToString();
      }
      CatalogNode Read()
      {
        White();if(++depth>128 || i>=json.Length)throw new FormatException("JSON derinlik/son");CatalogNode n;
        char c=json[i];
        if(c=='{'){i++;n=Obj();White();if(i<json.Length && json[i]=='}')i++;else while(true){string k=String();if(n.Has(k))throw new FormatException("Tekrarlı JSON anahtarı");Need(':');n.Set(k,Read());White();if(i<json.Length && json[i]=='}'){i++;break;}Need(',');}}
        else if(c=='['){i++;var a=new List<CatalogNode>();White();if(i<json.Length && json[i]==']')i++;else while(true){a.Add(Read());White();if(i<json.Length && json[i]==']'){i++;break;}Need(',');}n=Arr(a);}
        else if(c=='"')n=Str(String());
        else if(i+4<=json.Length && string.CompareOrdinal(json,i,"true",0,4)==0){i+=4;n=new CatalogNode(true);}
        else if(i+5<=json.Length && string.CompareOrdinal(json,i,"false",0,5)==0){i+=5;n=new CatalogNode(false);}
        else if(i+4<=json.Length && string.CompareOrdinal(json,i,"null",0,4)==0){i+=4;n=new CatalogNode(null!);}
        else {int start=i;while(i<json.Length && "-+0123456789.eE".IndexOf(json[i])>=0)i++;if(i==start)throw new FormatException("JSON sayı");string token=json.Substring(start,i-start);if(!System.Text.RegularExpressions.Regex.IsMatch(token,@"^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$"))throw new FormatException("JSON sayı");n=Num(double.Parse(token,CultureInfo.InvariantCulture));}
        depth--;return n;
      }
      var result=Read();White();if(i!=json.Length)throw new FormatException("JSON fazla veri");return result;
    }
  }
}
