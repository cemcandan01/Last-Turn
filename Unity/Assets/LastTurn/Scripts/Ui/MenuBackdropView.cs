using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;

namespace LastTurn.Ui
{
  // TS arayuz/arka-gorsel.ts + stil.css #arka: oyunun kendi sahnelerinden çekilmiş dokuz menü görseli (export-menu-
  // backgrounds.mjs ile sabit SHA'dan PNG). Rastgele torba, art arda aynı görsel yok; 6 sn'de bir değişir, 1,4 sn
  // çapraz geçiş (CSS ease), öne çıkan 8 sn doğrusal yavaş kayma. Yalnız menü görünürken akar; oyun durumuna yazmaz.
  public sealed class MenuBackdropView : MonoBehaviour
  {
    public const float Stay = 6, Fade = 1.4f, Pan = 8;
    private sealed class Layer { public VisualElement E; public float Shown = -99, Hidden = -99, Started = -99, Kx, Ky, Ks = 1.08f; public bool On; }
    private VisualElement root; private readonly Layer[] layers = { new Layer(), new Layer() };
    private Texture2D[] images = Array.Empty<Texture2D>(); private readonly List<int> bag = new List<int>();
    private readonly System.Random random = new System.Random(); private int front, last = -1; private float next; private bool visible;
    private MainMenuView menu;
    public int Images => images.Length;
    public bool Playing => visible && images.Length > 0;
    public int Current => last;
    public int Switches { get; private set; }

    private void Start()
    {
      var list = new List<Texture2D>();
      for (int i = 0; ; i++) { var t = Resources.Load<Texture2D>("UI/MenuBackground/menu-" + i.ToString("00")); if (!t) break; list.Add(t); }
      images = list.ToArray(); menu = GetComponent<MainMenuView>();
      root = new VisualElement { name = "menu-arka", pickingMode = PickingMode.Ignore }; root.AddToClassList("katman"); root.style.backgroundColor = Color.black; root.style.overflow = Overflow.Hidden;
      foreach (var l in layers)
      {
        l.E = new VisualElement { pickingMode = PickingMode.Ignore }; Ui.Absolute(l.E, left: 0, top: 0, right: 0, bottom: 0);
        l.E.style.backgroundSize = new BackgroundSize(BackgroundSizeType.Cover); l.E.style.opacity = 0; root.Add(l.E);
      }
      UiRoot.Instance.Screen.Insert(0, root); Ui.Show(root, false);
    }

    /// Karışık torbadan sıradaki; art arda aynı görsel gelmez.
    private int Next()
    {
      if (bag.Count == 0)
      {
        bag.AddRange(Enumerable.Range(0, images.Length).OrderBy(_ => random.NextDouble()));
        if (bag[0] == last && bag.Count > 1) { bag.Add(bag[0]); bag.RemoveAt(0); }
      }
      last = bag[0]; bag.RemoveAt(0); return last;
    }

    private void Switch(float now)
    {
      var e = layers[front ^ 1]; var old = layers[front];
      e.E.style.backgroundImage = new StyleBackground(images[Next()]);
      // her görsel farklı yöne ve farklı oranda yavaşça kayar
      e.Kx = (float)(random.NextDouble() * 2 - 1) * 3; e.Ky = (float)(random.NextDouble() * 2 - 1) * 2; e.Ks = 1.06f + (float)random.NextDouble() * .06f;
      e.Started = now; e.On = true; e.Shown = now; old.On = false; old.Hidden = now; front ^= 1; next = now + Stay; Switches++;
    }

    private void Update()
    {
      if (root == null || images.Length == 0) return;
      bool want = menu && menu.Visible;
      if (want != visible) { visible = want; Ui.Show(root, want); if (want) Switch(Time.unscaledTime); }
      if (!visible) return;
      float now = Time.unscaledTime; if (now >= next) Switch(now);
      foreach (var l in layers)
      {
        float k = Ease(Mathf.Clamp01((now - (l.On ? l.Shown : l.Hidden)) / Fade)), o = l.On ? k : 1 - k;
        l.E.style.opacity = l.Started < 0 ? 0 : o;
        // CSS scale(s) translate(x%, y%): öteleme ölçekli eksende; UI Toolkit'te ölçek uygulanmış değer verilir.
        float p = Mathf.Clamp01((now - l.Started) / Pan), s = Mathf.Lerp(1, l.Ks, p);
        l.E.style.scale = new Scale(new Vector3(s, s, 1));
        l.E.style.translate = new Translate(Length.Percent(s * l.Kx * p), Length.Percent(s * l.Ky * p));
      }
    }

    /// CSS "ease" = cubic-bezier(.25,.1,.25,1).
    private static float Ease(float x)
    {
      float t = x;
      for (int i = 0; i < 8; i++) { float bx = Bezier(t, .25f, .25f) - x, d = Derivative(t, .25f, .25f); if (Mathf.Abs(d) < 1e-5f) break; t = Mathf.Clamp01(t - bx / d); }
      return Bezier(t, .1f, 1);
    }
    private static float Bezier(float t, float a, float b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
    private static float Derivative(float t, float a, float b) => 3 * (1 - t) * (1 - t) * a + 6 * (1 - t) * t * (b - a) + 3 * t * t * (1 - b);
  }
}
