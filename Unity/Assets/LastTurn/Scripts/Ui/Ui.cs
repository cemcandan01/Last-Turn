using System;
using UnityEngine;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // F bileşenleri: eğik tuş, sekme, klavye tuşu, bölüm başlığı, tuş ipuçları, kart, karartma. Kural içermez.
  public static class Ui
  {
    public static readonly Color Accent = new Color(1, .478f, .235f);

    public static Label Text(string text, params string[] classes)
    {
      var l = new Label(text) { pickingMode = PickingMode.Ignore }; foreach (var c in classes) l.AddToClassList(c); return l;
    }

    public static Label Key(string key) => Text(key, "t");

    /// Eğik tuş. ana: turuncu birincil işlem (ekranda tek). key: sağdaki klavye tuşu ("" yoksa).
    public static VisualElement Button(string text, string key, Action click, bool primary = false, bool small = false)
    {
      var b = new VisualElement(); b.AddToClassList("ltb"); if (primary) b.AddToClassList("ana"); if (small) b.AddToClassList("kucuk");
      b.Add(new Skew()); b.Add(Text(text, "yazi")); if (!string.IsNullOrEmpty(key)) b.Add(Key(key));
      if (click != null) b.AddManipulator(new Clickable(click));
      return b;
    }

    public static VisualElement Tab(string text, Action click)
    {
      var b = new VisualElement(); b.AddToClassList("sekme"); b.Add(new Skew()); b.Add(Text(text, "yazi"));
      b.AddManipulator(new Clickable(click)); return b;
    }

    public static VisualElement Section(string text)
    {
      var e = new VisualElement { pickingMode = PickingMode.Ignore }; e.AddToClassList("bb");
      var line = new VisualElement { pickingMode = PickingMode.Ignore }; line.AddToClassList("cizgi"); e.Add(line); e.Add(Text(text)); return e;
    }

    /// Sağ alt tuş ipuçları: ("←|→", "Seç") gibi; birden çok tuş | ile ayrılır.
    public static VisualElement Hints(params (string Keys, string Text)[] hints)
    {
      var row = new VisualElement { pickingMode = PickingMode.Ignore }; row.AddToClassList("ipuclari");
      foreach (var (keys, text) in hints)
      {
        var h = new VisualElement { pickingMode = PickingMode.Ignore }; h.AddToClassList("ipucu");
        foreach (var k in keys.Split('|')) h.Add(Key(k));
        h.Add(Text(text, "yazi")); row.Add(h);
      }
      return row;
    }

    public static VisualElement Logo()
    {
      var e = new VisualElement { pickingMode = PickingMode.Ignore }; e.AddToClassList("logo");
      e.Add(Text("LAST")); e.Add(Text("TURN", "turn")); return e;
    }

    public static void Absolute(VisualElement e, float? left = null, float? top = null, float? right = null, float? bottom = null)
    {
      e.style.position = Position.Absolute;
      if (left.HasValue) e.style.left = left.Value; if (top.HasValue) e.style.top = top.Value;
      if (right.HasValue) e.style.right = right.Value; if (bottom.HasValue) e.style.bottom = bottom.Value;
    }

    public static void Show(VisualElement e, bool on) => e.EnableInClassList("gizli", !on);

    private static Texture2D fade;
    /// Üstte ve altta koyulaşan karartma (F menüsü): sahne ortada görünür kalır.
    public static VisualElement Shade(float top = .72f, float bottom = .82f)
    {
      var e = new VisualElement { pickingMode = PickingMode.Ignore };
      e.style.position = Position.Absolute; e.style.left = 0; e.style.right = 0; e.style.top = 0; e.style.bottom = 0;
      if (!fade)
      {
        fade = new Texture2D(1, 256, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, name = "F karartma" };
        for (int y = 0; y < 256; y++)
        {
          float v = y / 255f; // 0 alt, 1 üst (doku ekseni)
          float a = Mathf.Max(Mathf.Clamp01((v - .8f) / .2f) * top, Mathf.Clamp01((.45f - v) / .45f) * bottom);
          fade.SetPixel(0, y, new Color(0, 0, 0, a * a * (3 - 2 * a) * .5f + a * .5f));
        }
        fade.Apply();
      }
      e.style.backgroundImage = new StyleBackground(fade);
      e.style.backgroundSize = new BackgroundSize(Length.Percent(100), Length.Percent(100));
      return e;
    }

    /// Türkçe büyük harf (i → İ): pist ve araç adları başlıkta büyük yazılır.
    public static string Upper(string s) => s.Replace('i', 'İ').Replace('ı', 'I').ToUpperInvariant();
  }
}
