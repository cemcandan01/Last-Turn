#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  /// F §7 Ayarlar satırı: seçenekli (Choices) ya da sürgülü (Slider; Min..Max, Step).
  public sealed class SettingsRow
  {
    public string Key="",Name="",Description="";
    public string[] Choices=Array.Empty<string>();public int Selected=-1;
    public bool Slider;public double Value,Min,Max=100,Step=5;
  }

  /// F §7 Ayarlar görünüm modeli: bölümler ve satırlar mevcut PlayerSettings / sürüş yardımı tablolarından üretilir.
  /// Değer yazımı yalnız burada; sürüş yardımı kariyer kaydında olduğu için GarageCommand olarak döner (görünüm yürütür).
  public static class SettingsViewModel
  {
    public static readonly string[] Sections={"SÜRÜŞ","KAMERA","GÖSTERGELER","SES","GRAFİK","KONTROLLER"};
    public const int Controls=5;
    private static readonly string[] OnOff={"KAPALI","AÇIK"};
    private static readonly string[] DriveToggles={"inv","ss","sm","rh"},CameraToggles={"fov","shk"},GraphicToggles={"shd","perf"};

    /// touch: dokunmatik ekran var mı (Windows'ta yok: yalnız etkili gösterge biçimi gösterilir). developer: geliştirici hayaleti.
    public static List<SettingsRow> Rows(int section,PlayerSettings s,GarageState? state,bool touch,bool developer)
    {
      var rows=new List<SettingsRow>();
      switch(section)
      {
        case 0:
          if(state!=null)
          {
            var levels=GarageViewModel.AssistLevels(state);int at=Array.FindIndex(levels,l=>l.Selected);
            rows.Add(new SettingsRow{Key="assist",Name="Sürüş yardımı",Choices=levels.Select(l=>l.Name).ToArray(),Selected=at,Description=at<0?"":levels[at].Description});
          }
          foreach(var k in DriveToggles)rows.Add(Toggle(s,k));
          if(developer)rows.Add(Toggle(s,PlayerSettings.DeveloperGhost));
          break;
        case 1:
          rows.Add(new SettingsRow{Key="cam",Name="Kamera",Choices=PlayerSettings.CameraNames,Selected=s.Camera,Description="Sürüşte V tuşu da kamerayı sırayla değiştirir."});
          foreach(var k in CameraToggles)rows.Add(Toggle(s,k));
          break;
        case 2:
          if(touch)
          {
            string layout=s.HudLayout;
            rows.Add(new SettingsRow{Key="hud",Name="Gösterge düzeni",Choices=PlayerSettings.HudPresetNames.Select(p=>p.Name).ToArray(),Selected=Array.FindIndex(PlayerSettings.HudPresetNames,p=>p.Key==layout),
              Description=layout=="ozel"?"Özel: parçalar tek tek seçildi.":PlayerSettings.HudPresetNames.First(p=>p.Key==layout).Description});
            foreach(var (part,_) in PlayerSettings.HudParts)rows.Add(Part(s,part,""));
          }
          else rows.Add(Part(s,"harita","Sağ üstteki mini harita. Windows'ta süre, hız ve pist adı F yerleşiminde sabittir; hız/sayaç/tuş biçimleri dokunmatik sürümdedir."));
          break;
        case 3:
          foreach(var v in PlayerSettings.Volumes)rows.Add(new SettingsRow{Key=v.Key,Name=v.Name,Description=v.Description,Slider=true,Value=s[v.Key],Min=0,Max=100,Step=5});
          break;
        case 4:
          foreach(var k in GraphicToggles)rows.Add(Toggle(s,k));
          break;
        case Controls:
          string note=touch?"":" Windows klavyesinde Tuşlar / Gaz tuşu kullanılır; diğerleri dokunmatik içindir.";
          int steer=Array.FindIndex(PlayerSettings.SteerNames,m=>m.Key==s.Steer),gas=Array.FindIndex(PlayerSettings.GasNames,m=>m.Key==s.Gas);
          rows.Add(new SettingsRow{Key="steer",Name="Direksiyon girişi",Choices=PlayerSettings.SteerNames.Select(m=>m.Name).ToArray(),Selected=steer,Description=(steer<0?"":PlayerSettings.SteerNames[steer].Description+".")+note});
          if(touch&&s.Steer=="tilt")rows.Add(new SettingsRow{Key="tlt",Name="Çevirme açısı",Description="Tam direksiyon için telefonu ne kadar yatırman gerektiği (derece).",Slider=true,Value=s["tlt"],Min=15,Max=60,Step=1});
          rows.Add(new SettingsRow{Key="gas",Name="Gaz girişi",Choices=PlayerSettings.GasNames.Select(m=>m.Name).ToArray(),Selected=gas,Description=(gas<0?"":PlayerSettings.GasNames[gas].Description+".")+note});
          break;
      }
      return rows;
    }

    private static SettingsRow Toggle(PlayerSettings s,string key)=>Toggle(s,PlayerSettings.Toggles.First(t=>t.Key==key));
    private static SettingsRow Toggle(PlayerSettings s,(string Key,string Name,string Description) t)=>new SettingsRow{Key=t.Key,Name=t.Name,Description=t.Description,Choices=OnOff,Selected=s.On(t.Key)?1:0};
    private static SettingsRow Part(PlayerSettings s,string part,string description)
    {
      var values=PlayerSettings.HudParts.First(p=>p.Part==part).Values;var names=PlayerSettings.HudNames[part];
      return new SettingsRow{Key="hud:"+part,Name=names.Name,Choices=values.Select(v=>names.Values[v]).ToArray(),Selected=Array.IndexOf(values,s.Hud[part]),Description=description};
    }

    /// Seçenek satırında index'i uygular. Sürüş yardımı için yürütülecek komutu döner (değişmediyse null).
    public static GarageCommand? Choose(SettingsRow row,int index,PlayerSettings s,GarageState? state)
    {
      if(row.Slider||index<0||index>=row.Choices.Length)return null;
      switch(row.Key)
      {
        case "assist":if(state==null)return null;var l=GarageViewModel.AssistLevels(state)[index];return l.Selected?null:GarageCommand.SetAssistLevel(l.Key);
        case "cam":s.Camera=index;break;
        case "steer":s.Steer=PlayerSettings.SteerNames[index].Key;break;
        case "gas":s.Gas=PlayerSettings.GasNames[index].Key;break;
        case "hud":s.ApplyPreset(PlayerSettings.HudPresetNames[index].Key);break;
        default:
          if(row.Key.StartsWith("hud:",StringComparison.Ordinal)){string part=row.Key.Substring(4);s.Hud[part]=PlayerSettings.HudParts.First(p=>p.Part==part).Values[index];}
          else s.Set[row.Key]=index;
          break;
      }
      return null;
    }

    /// Sürgü değeri: sınırda kalır ve adıma yuvarlanır (ses %5, çevirme açısı 1°).
    public static void SetValue(SettingsRow row,double value,PlayerSettings s)
    {if(!row.Slider)return;s.Set[row.Key]=Math.Min(row.Max,Math.Max(row.Min,Math.Round(value/row.Step)*row.Step));}

    /// ←/→: seçenekte bir yana kayar (uçta durur), sürgüde bir adım.
    public static GarageCommand? Step(SettingsRow row,int delta,PlayerSettings s,GarageState? state)
    {
      if(row.Slider){SetValue(row,row.Value+delta*row.Step,s);return null;}
      int next=Math.Min(row.Choices.Length-1,Math.Max(0,(row.Selected<0?0:row.Selected)+delta));return next==row.Selected?null:Choose(row,next,s,state);
    }

    /// Enter: açık/kapalıyı çevirir, seçenekte sıradakine geçer (sonda başa döner).
    public static GarageCommand? Activate(SettingsRow row,PlayerSettings s,GarageState? state)
      =>row.Slider||row.Choices.Length==0?null:Choose(row,(row.Selected+1)%row.Choices.Length,s,state);
  }
}
