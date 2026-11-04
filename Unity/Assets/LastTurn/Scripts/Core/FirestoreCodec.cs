#nullable enable
using System;
using System.Globalization;
using System.Linq;

namespace LastTurn.Core
{
  // Firestore REST değer biçimi ↔ düz JSON. Firebase JS SDK gibi güvenli tamsayıyı integerValue, kesirliyi doubleValue
  // yazar: firestore.rules `is int` denetimi (xp, kazanilan, updatedAt, surum) bu ayrıma bağlıdır.
  public static class FirestoreCodec
  {
    public const double MaxSafeInteger = 9007199254740991d;

    public static bool IsInteger(double n) => n % 1 == 0 && Math.Abs(n) <= MaxSafeInteger && !(n == 0 && double.IsNegative(n));

    /// Belge gövdesi: {"fields":{...}} (PATCH /documents/users/{uid}).
    public static CatalogNode EncodeDocument(CatalogNode data)
    {
      var doc = CatalogNode.Obj();
      doc.Set("fields", Fields(data));
      return doc;
    }

    private static CatalogNode Fields(CatalogNode obj)
    {
      var f = CatalogNode.Obj();
      foreach (var p in obj.Fields) f.Set(p.Key, Encode(p.Value));
      return f;
    }

    public static CatalogNode Encode(CatalogNode v)
    {
      var o = CatalogNode.Obj();
      if (v.IsNull) o.Set("nullValue", CatalogNode.Null());
      else if (v.IsBool) o.Set("booleanValue", CatalogNode.Bool(v.B()));
      else if (v.IsNumber)
      {
        double n = v.N();
        if (IsInteger(n)) o.Set("integerValue", CatalogNode.Str(((long)n).ToString(CultureInfo.InvariantCulture)));
        else o.Set("doubleValue", CatalogNode.Num(n));
      }
      else if (v.IsString) o.Set("stringValue", CatalogNode.Str(v.S()));
      else if (v.IsArray)
      {
        var a = CatalogNode.Obj();
        if (v.Items.Any()) a.Set("values", CatalogNode.Arr(v.Items.Select(Encode)));
        o.Set("arrayValue", a);
      }
      else
      {
        var m = CatalogNode.Obj();
        if (v.Fields.Any()) m.Set("fields", Fields(v));
        o.Set("mapValue", m);
      }
      return o;
    }

    /// GET yanıtındaki belge → düz nesne (bilinmeyen tür null olur).
    public static CatalogNode DecodeDocument(CatalogNode doc)
    {
      var o = CatalogNode.Obj();
      foreach (var p in doc["fields"].Fields) o.Set(p.Key, Decode(p.Value));
      return o;
    }

    public static CatalogNode Decode(CatalogNode v)
    {
      if (v.Has("integerValue"))
      {
        var i = v["integerValue"];
        if (i.IsNumber) return CatalogNode.Num(i.N());
        return double.TryParse(i.S(), NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var n) ? CatalogNode.Num(n) : CatalogNode.Null();
      }
      if (v.Has("doubleValue"))
      {
        var d = v["doubleValue"];
        return d.IsNumber ? CatalogNode.Num(d.N()) : CatalogNode.Null(); // "NaN"/"Infinity" metinleri bozuk değer sayılır
      }
      if (v.Has("booleanValue")) return CatalogNode.Bool(v["booleanValue"].B());
      if (v.Has("stringValue")) return CatalogNode.Str(v["stringValue"].S());
      if (v.Has("timestampValue")) return CatalogNode.Str(v["timestampValue"].S());
      if (v.Has("arrayValue")) return CatalogNode.Arr(v["arrayValue"]["values"].Items.Select(Decode));
      if (v.Has("mapValue"))
      {
        var m = CatalogNode.Obj();
        foreach (var p in v["mapValue"]["fields"].Fields) m.Set(p.Key, Decode(p.Value));
        return m;
      }
      return CatalogNode.Null();
    }
  }
}
