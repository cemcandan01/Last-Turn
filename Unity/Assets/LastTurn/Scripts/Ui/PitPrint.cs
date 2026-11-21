using UnityEngine;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // Yarış afişinin baskı işaretleri. Dekoratif; oyun/veri/kayıt bağımlılığı yok.
  public sealed class PitPrint : VisualElement
  {
    public PitPrint(bool barcode = false)
    {
      pickingMode = PickingMode.Ignore;
      generateVisualContent += context =>
      {
        var p = context.painter2D; float w = contentRect.width, h = contentRect.height;
        p.fillColor = new Color(.867f, .847f, .788f, barcode ? 1 : .13f);
        if (barcode)
        {
          for (float x = 0; x < w; x += 9)
          {
            float b = ((int)x % 3 == 0) ? 4 : 2;
            p.BeginPath(); p.MoveTo(new Vector2(x, 0)); p.LineTo(new Vector2(x + b, 0));
            p.LineTo(new Vector2(x + b, h)); p.LineTo(new Vector2(x, h)); p.ClosePath(); p.Fill();
          }
        }
        else
        {
          for (float y = 0; y < h; y += 9)
            for (float x = 0; x < w; x += 9)
            {
              p.BeginPath(); p.MoveTo(new Vector2(x, y)); p.LineTo(new Vector2(x + 1, y));
              p.LineTo(new Vector2(x + 1, y + 1)); p.LineTo(new Vector2(x, y + 1)); p.ClosePath(); p.Fill();
            }
        }
      };
    }
  }
}
