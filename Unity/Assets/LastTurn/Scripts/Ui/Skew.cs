using UnityEngine;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // Eğik (paralelkenar) zemin: eski web arayüzünün skewX(-14deg) tuşu. USS'te skew olmadığı için Painter2D ile çizilir;
  // renkler --fill / --edge özel özelliklerinden gelir, böylece :hover ve .sec durumları stil dosyasında kalır.
  public sealed class Skew : VisualElement
  {
    private static readonly CustomStyleProperty<Color> FillProperty = new CustomStyleProperty<Color>("--fill");
    private static readonly CustomStyleProperty<Color> EdgeProperty = new CustomStyleProperty<Color>("--edge");
    public const float Tan14 = .2493f;
    private Color fill = new Color(.043f, .078f, .094f, .86f), edge = new Color(1, 1, 1, .13f);

    public Skew()
    {
      AddToClassList("skew");
      pickingMode = PickingMode.Ignore;
      style.position = Position.Absolute; style.left = 0; style.top = 0; style.right = 0; style.bottom = 0;
      generateVisualContent += Draw;
      RegisterCallback<CustomStyleResolvedEvent>(e =>
      {
        if (e.customStyle.TryGetValue(FillProperty, out var f)) fill = f;
        if (e.customStyle.TryGetValue(EdgeProperty, out var g)) edge = g;
        MarkDirtyRepaint();
      });
    }

    private void Draw(MeshGenerationContext context)
    {
      float w = contentRect.width, h = contentRect.height; if (w <= 0 || h <= 0) return;
      float o = h * Tan14 / 2, r = Mathf.Min(6, h * .12f);
      var p = context.painter2D;
      p.BeginPath();
      p.MoveTo(new Vector2(o + r, 0)); p.LineTo(new Vector2(w + o - r, 0)); p.ArcTo(new Vector2(w + o, 0), new Vector2(w - o, h), r);
      p.LineTo(new Vector2(w - o, h)); p.LineTo(new Vector2(-o + r, h)); p.ArcTo(new Vector2(-o, h), new Vector2(o, 0), r);
      p.LineTo(new Vector2(o, 0)); p.ClosePath();
      if (fill.a > 0) { p.fillColor = fill; p.Fill(); }
      if (edge.a > 0) { p.strokeColor = edge; p.lineWidth = 1.5f; p.Stroke(); }
    }
  }

  // Yıldız (kariyer en iyi yıldızı): dolu turuncu, boş soluk.
  public sealed class Star : VisualElement
  {
    private bool on;
    public Star(bool earned) { on = earned; AddToClassList("yildiz"); pickingMode = PickingMode.Ignore; generateVisualContent += Draw; }
    private void Draw(MeshGenerationContext context)
    {
      float w = contentRect.width, h = contentRect.height; if (w <= 0) return;
      var p = context.painter2D; p.BeginPath();
      for (int i = 0; i < 10; i++)
      {
        float a = -Mathf.PI / 2 + i * Mathf.PI / 5, k = i % 2 == 0 ? .5f : .21f;
        var v = new Vector2(w / 2 + Mathf.Cos(a) * w * k, h * .54f + Mathf.Sin(a) * h * k);
        if (i == 0) p.MoveTo(v); else p.LineTo(v);
      }
      p.ClosePath(); p.fillColor = on ? new Color(1, .478f, .235f) : new Color(1, 1, 1, .22f); p.Fill();
    }
  }
}
