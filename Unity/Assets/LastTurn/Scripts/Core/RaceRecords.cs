#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace LastTurn.Core
{
  /// Yarış profili ve hayaletlerinin yerel kaydı: dizinde races.json + ghost-<anahtar>.json; geçici dosyaya yazılıp
  /// yerine konur (yarım dosya kalmaz). Bozuk dosya oyunu durdurmaz: profil boş başlar, hayalet yok sayılır.
  public sealed class RaceProfileStore
  {
    public readonly string Directory;
    public string Message { get; private set; } = "";
    public bool ReadOnly { get; private set; }
    public RaceProfileStore(string directory) { Directory = directory; }
    private string ProfilePath => System.IO.Path.Combine(Directory, "races.json");
    private string GhostPath(string key) => System.IO.Path.Combine(Directory, "ghost-" + string.Concat(key.Select(c => char.IsLetterOrDigit(c) || c == '_' ? c : '-')) + ".json");

    public RaceProfile Load()
    {
      try { return System.IO.File.Exists(ProfilePath) ? RaceProfile.Restore(CatalogNode.Parse(System.IO.File.ReadAllText(ProfilePath))) : new RaceProfile(); }
      catch (Exception e) when (e is FormatException || e is System.IO.IOException || e is ArgumentException || e is UnauthorizedAccessException) { ReadOnly = true; Message = "Profil okunamadı; dosya korunuyor, yazma kapalı: " + e.Message; return new RaceProfile(); }
    }
    public void Save(RaceProfile profile) { if(ReadOnly)throw new System.IO.IOException(Message); Write(ProfilePath, profile.Snapshot().ToString()); }

    public GhostRecord? LoadGhost(string key)
    {
      try { return System.IO.File.Exists(GhostPath(key)) ? GhostRecord.Restore(CatalogNode.Parse(System.IO.File.ReadAllText(GhostPath(key))), key) : null; }
      catch (Exception e) when (e is FormatException || e is System.IO.IOException) { Message = "Hayalet okunamadı: " + e.Message; return null; }
    }
    public void SaveGhost(GhostRecord ghost) => Write(GhostPath(ghost.Key), ghost.Snapshot().ToString());

    private void Write(string path, string text)
    {
      System.IO.Directory.CreateDirectory(Directory);
      string tmp = path + ".tmp"; System.IO.File.WriteAllText(tmp, text);
      if (System.IO.File.Exists(path)) System.IO.File.Replace(tmp, path, null); else System.IO.File.Move(tmp, path);
    }
  }

  // TS 0.8.18 rekor ve profil: src/oyun/profil.ts (sv_<anahtar> metin rekoru, lt_prof yarış/galibiyet/km/araç kullanımı),
  // src/arayuz/sonuc.ts sonucGoster rekor kuralı, yarislar.ts startEvent/endEvent sayaçları. Saf veri + kural.
  public sealed class RaceProfile
  {
    public const int Version = 1;
    public string Name = "Sürücü";
    // TS menu.ts: trim().slice(0,20) || "Sürücü" (UTF-16 kod birimleri).
    public void Rename(string value)
    {
      string s=(value??"").Trim(' ','\t','\n','\r','\v','\f','\u00a0','\u1680','\u2000','\u2001','\u2002','\u2003','\u2004','\u2005','\u2006','\u2007','\u2008','\u2009','\u200a','\u2028','\u2029','\u202f','\u205f','\u3000','\ufeff');
      Name=s.Length==0?"Sürücü":s.Substring(0,Math.Min(20,s.Length));
    }
    /// TS sv_<k>: rekor metin olarak (zamanlı: toFixed(2|3), drift: puan).
    public readonly Dictionary<string, string> Records = new(StringComparer.Ordinal);
    public int Races, Wins;
    public double Km;
    public readonly Dictionary<int, int> Use = new();

    /// TS best(k): +(metin || 0) || 0.
    public double Best(string key) => Records.TryGetValue(key, out var s) && double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out double v) && double.IsFinite(v) ? v : 0;

    /// TS startEvent (MUTANT dışı): seçilen aracın kullanım sayacı.
    public void Started(int car) => Use[car] = (Use.TryGetValue(car, out int n) ? n : 0) + 1;

    /// TS surusAdimi: PROF.km += hız × adım / 1000.
    public void Drove(double vx, double vz, double dt) => Km += JsMath.Hypot(vx, vz) * dt / 1000;

    /// TS endEvent + sonucGoster: yarış sayısı, kariyerde hedefi tutturunca galibiyet, rekor (zamanlıda yalnız hedef içinde
    /// ve daha hızlıysa; driftte daha yüksek puanda). Dönen: yeni rekor mu.
    public bool Finished(RaceSession s) => Finished(s, out _);
    /// previous: TS sonucGoster'in rekor satırı için güncellemeden önceki rekor (best(k)).
    public bool Finished(RaceSession s, out double previous)
    {
      Races++;
      if (s.Won) Wins++;
      var e = s.Event; double b = Best(s.RecordKey); previous = b;
      if (e.Type == "dp")
      {
        bool nb = s.Drift.Score > b;
        if (nb) Records[s.RecordKey] = s.Drift.Score.ToString(CultureInfo.InvariantCulture);
        return nb;
      }
      bool ok = s.Time <= e.Limit, newBest = ok && (b == 0 || s.Time < b);
      if (newBest) Records[s.RecordKey] = s.Time.ToString(e.Type == "dg" ? "F3" : "F2", CultureInfo.InvariantCulture);
      return newBest;
    }

    public CatalogNode Snapshot()
    {
      var n = CatalogNode.Obj(); n.Set("surum", CatalogNode.Num(Version));
      var rec = CatalogNode.Obj(); foreach (var p in Records.OrderBy(p => p.Key, StringComparer.Ordinal)) rec.Set(p.Key, CatalogNode.Str(p.Value)); n.Set("sv", rec);
      var prof = CatalogNode.Obj(); prof.Set("name", CatalogNode.Str(Name)); prof.Set("races", CatalogNode.Num(Races)); prof.Set("wins", CatalogNode.Num(Wins)); prof.Set("km", CatalogNode.Num(Km));
      var use = CatalogNode.Obj(); foreach (var p in Use.OrderBy(p => p.Key)) use.Set(p.Key.ToString(CultureInfo.InvariantCulture), CatalogNode.Num(p.Value)); prof.Set("use", use);
      n.Set("prof", prof); return n;
    }

    public static RaceProfile Restore(CatalogNode n)
    {
      if ((int)n["surum"].N(-1) != Version) throw new FormatException("Yarış profili sürümü desteklenmiyor.");
      var p = new RaceProfile();
      foreach (var r in n["sv"].Fields) p.Records[r.Key] = r.Value.S();
      var prof = n["prof"]; p.Races = (int)prof["races"].N(); p.Wins = (int)prof["wins"].N(); p.Km = prof["km"].N();
      p.Name=prof["name"].S("Sürücü");
      foreach (var u in prof["use"].Fields) p.Use[int.Parse(u.Key, CultureInfo.InvariantCulture)] = (int)u.Value.N();
      if (p.Races < 0 || p.Wins < 0 || p.Wins > p.Races || !(p.Km >= 0)) throw new FormatException("Yarış profili sayaçları bozuk.");
      return p;
    }
  }

  // TS src/fizik/girdi-kaydi.ts: adım başına 4 × int16 (direksiyon, gaz, fren, bayrak: 1 analog direksiyon, 2 analog gaz,
  // 4 el freni); -1..1 → ×32767, JS Math.round. Fiziğe nicemlenmiş girdi verilir: kayıt oynatılınca aynı sürüş.
  public sealed class InputRecording
  {
    public const int Scale = 32767, Fields = 4, MaxSteps = 60 * 60 * 60, FormatVersion = 2;
    private short[] data = new short[Fields * 1024];
    public int Count { get; private set; }
    /// TS kesik: kayıt sırasında araç dışarıdan taşındı (piste dönüş, yeniden doğ) → hayalet güvenilmez.
    public bool Cut;
    /// TS tasti: 60 dakikayı aştı.
    public bool Full { get; internal set; }

    public void Clear() { Count = 0; Cut = false; Full = false; }

    private static short Quantize(double v) => (short)JsMath.Round(Math.Max(-1, Math.Min(1, v)) * Scale);

    /// TS girdiyiKaydet: kaydeder, fiziğe verilecek nicemlenmiş girdiyi döndürür.
    public DrivingInput Record(DrivingInput input)
    {
      short a = Quantize(input.Steering), g = Quantize(input.Throttle), b = Quantize(input.Brake);
      var output = new DrivingInput(g / (double)Scale, b / (double)Scale, a / (double)Scale, input.AnalogThrottle, input.AnalogSteering, input.Handbrake, input.Shift);
      if (Count >= MaxSteps) { Full = true; return output; }
      if ((Count + 1) * Fields > data.Length) Array.Resize(ref data, Math.Min(MaxSteps * Fields, data.Length * 2));
      int o = Count * Fields;
      data[o] = a; data[o + 1] = g; data[o + 2] = b; data[o + 3] = (short)((input.AnalogSteering ? 1 : 0) | (input.AnalogThrottle ? 2 : 0) | (input.Handbrake ? 4 : 0) | (input.Shift > 0 ? 8 : 0) | (input.Shift < 0 ? 16 : 0));
      Count++;
      return output;
    }

    /// TS kayitGirdisi.
    public DrivingInput At(int i)
    {
      if (i < 0 || i >= Count) throw new ArgumentOutOfRangeException(nameof(i));
      int o = i * Fields;
      return new DrivingInput(data[o + 1] / (double)Scale, data[o + 2] / (double)Scale, data[o] / (double)Scale, (data[o + 3] & 2) != 0, (data[o + 3] & 1) != 0, (data[o + 3] & 4) != 0, (data[o + 3] & 8) != 0 ? 1 : (data[o + 3] & 16) != 0 ? -1 : 0);
    }

    /// TS kaydiSerilestir'in veri kısmı: küçük-sonlu int16, base64.
    public string Base64()
    {
      var bytes = new byte[Count * Fields * 2];
      for (int i = 0; i < Count * Fields; i++) { bytes[2 * i] = (byte)(data[i] & 255); bytes[2 * i + 1] = (byte)((data[i] >> 8) & 255); }
      return Convert.ToBase64String(bytes);
    }

    public static InputRecording FromBase64(string text, int count)
    {
      var bytes = Convert.FromBase64String(text);
      if (count <= 0 || count > MaxSteps || bytes.Length != count * Fields * 2) throw new FormatException("Girdi kaydı boyu bozuk.");
      var r = new InputRecording { data = new short[count * Fields], Count = count };
      for (int i = 0; i < count * Fields; i++) r.data[i] = (short)(bytes[2 * i] | (bytes[2 * i + 1] << 8));
      for (int i = 0; i < count; i++)
      {
        int o = i * Fields;
        if (r.data[o] < -Scale || r.data[o + 1] < 0 || r.data[o + 2] < 0 || (r.data[o + 3] & ~31) != 0 || (r.data[o + 3] & 24) == 24) throw new FormatException("Girdi kaydı değeri bozuk.");
      }
      return r;
    }
  }

  /// TS HayaletKaydiVerisi (surum 3): anahtar, araç, süre/puan, başlangıç adımı, girdi; Unity'de kurulum araç + takılı parça +
  /// yarış lastiği türü olarak saklanır (katalogdan yeniden kurulur).
  public sealed class GhostRecord
  {
    public const int Version = 3;
    public string Key = "", RaceType = "", AssistLevel = "norm"; public int Car, StartStep; public double Result; public string[] Parts = Array.Empty<string>();
    /// Drag manuel: kayıt başındaki motor durumu (geri sayım kalkış hazırlığı) ve şanzıman kipi.
    public bool Manual; public double StartGas, StartRpm = 900, StartHold;
    public InputRecording Inputs = new();
    /// TS hava {tutus, karli}: kaydın yapıldığı hava; eski kayıtta yok.
    public GhostWeather? Weather;

    /// TS hayaletKaydet koşulları: sonlu, negatif değil, kayıt kesik/taşmış/boş değil; var olanı (sürüm 3) iyileştirir
    /// (driftte büyük, diğerlerinde küçük).
    public static bool ShouldSave(GhostRecord? existing, double result, InputRecording inputs, bool drift, int startStep = 0)
    {
      if (!double.IsFinite(result) || result < 0 || startStep < 0 || startStep >= inputs.Count) return false;
      if (inputs.Cut || inputs.Full || inputs.Count <= 0) return false;
      if (existing != null) { bool better = drift ? result > existing.Result : result < existing.Result; if (!better) return false; }
      return true;
    }

    public CatalogNode Snapshot()
    {
      var n = CatalogNode.Obj();
      n.Set("k", CatalogNode.Str(Key)); n.Set("arac", CatalogNode.Num(Car)); n.Set("surum", CatalogNode.Num(Version)); n.Set("baslangicAdimi", CatalogNode.Num(StartStep));
      n.Set("sure", CatalogNode.Num(Result)); n.Set("tur", CatalogNode.Str(RaceType)); n.Set("yardim", CatalogNode.Str(AssistLevel));
      n.Set("parcalar", CatalogNode.Arr(Parts.Select(CatalogNode.Str)));
      n.Set("manuel", CatalogNode.Num(Manual ? 1 : 0)); n.Set("basGaz", CatalogNode.Num(StartGas)); n.Set("basDevir", CatalogNode.Num(StartRpm)); n.Set("basTutma", CatalogNode.Num(StartHold));
      if (Weather.HasValue) { var h = CatalogNode.Obj(); h.Set("tutus", CatalogNode.Num(Weather.Value.Grip)); h.Set("karli", CatalogNode.Parse(Weather.Value.Snowy ? "true" : "false")); n.Set("hava", h); }
      n.Set("girdiSurum", CatalogNode.Num(InputRecording.FormatVersion)); n.Set("n", CatalogNode.Num(Inputs.Count)); n.Set("veri", CatalogNode.Str(Inputs.Base64()));
      return n;
    }

    /// TS hayaletGirdiKaydiOku: geçersiz/bozuk kayıt null.
    public static GhostRecord? Restore(CatalogNode n, string key)
    {
      try
      {
        if ((int)n["surum"].N(-1) != Version || n["k"].S() != key || ((int)n["girdiSurum"].N(-1) is not 1 and not InputRecording.FormatVersion)) return null;
        var g = new GhostRecord
        {
          Key = key, Car = (int)n["arac"].N(-1), StartStep = (int)n["baslangicAdimi"].N(-1), Result = n["sure"].N(double.NaN), RaceType = n["tur"].S(),
          AssistLevel = n["yardim"].S("norm"), Parts = n["parcalar"].Items.Select(p => p.S()).ToArray(),
          Manual = n["manuel"].N() == 1, StartGas = n["basGaz"].N(), StartRpm = n["basDevir"].N(900), StartHold = n["basTutma"].N(),
        };
        if (n["hava"]["tutus"].IsNumber && double.IsFinite(n["hava"]["tutus"].N()) && n["hava"]["tutus"].N() > 0) g.Weather = new GhostWeather(n["hava"]["tutus"].N(), n["hava"]["karli"].B());
        g.Inputs = InputRecording.FromBase64(n["veri"].S(), (int)n["n"].N(-1));
        if (g.Car < 0 || !double.IsFinite(g.Result) || g.StartStep < 0 || g.StartStep >= g.Inputs.Count) return null;
        return g;
      }
      catch (FormatException) { return null; }
      catch (ArgumentException) { return null; }
    }
  }

  /// TS rekorHayaletiBaslat/uzakAdimi: oyuncu fiziğinden ayrı araç + ayrı pist dünyası; oyuncunun her fizik adımında bir
  /// kayıtlı girdi. Başlangıç TS reset ile aynı noktadan; belirlenimci (aynı girdi → aynı yol).
  public sealed class GhostPlayer
  {
    public readonly GhostRecord Record;
    public readonly PowertrainVehicle Vehicle;
    public readonly TrackWorld World;
    public int Index { get; private set; }
    public bool Done => Index >= Record.Inputs.Count;

    /// currentGrip: kayıtta hava yoksa güncel hava tutuşu (TS veri.hava?.tutus ?? dunyaSorgusu.havaTutusu()).
    public GhostPlayer(GhostRecord record, PowertrainParameters parameters, TrackDefinition track, RaceEventInfo info, double currentGrip = 1)
    {
      Record = record; World = new TrackWorld(track) { GripMultiplier = record.Weather?.Grip ?? currentGrip }; Vehicle = new PowertrainVehicle(parameters, world: World);
      Vehicle.Place(info.StartX, info.StartZ, info.StartHeading); World.ResetHint(info.StartX, info.StartZ);
      if (record.Manual) Vehicle.SetStartEngine(record.StartGas, record.StartRpm, record.StartHold);
      for (int n = 0; n < record.StartStep; n++) Vehicle.Step(record.Inputs.At(n));
      Index = record.StartStep;
    }

    public void Step() { if (!Done) Vehicle.Step(Record.Inputs.At(Index++)); }
  }
}
