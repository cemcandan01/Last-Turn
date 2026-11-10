using System;
using System.Linq;
using LastTurn.Core;
using LastTurn.Garage;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;

namespace LastTurn.Prototype
{
  // Geçici görünüm: yalnız görünüm modelini çizer ve komut gönderir.
  public sealed class MutantScreen:MonoBehaviour
  {
    private GUIStyle text,title,button,small;private string lastMessage="";private Vector2 scroll;private string replacing="";
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Install(){SceneManager.sceneLoaded-=Loaded;SceneManager.sceneLoaded+=Loaded;Loaded(SceneManager.GetActiveScene(),LoadSceneMode.Single);}
    private static void Loaded(Scene s,LoadSceneMode m){new GameObject("Mutant arayüzü").AddComponent<MutantScreen>();}
    private void Update()
    {
      if(!MutantRuntime.Active)return;
      if(LastTurn.Ui.MutantBossView.HandledFrame==Time.frameCount)return;
      if(LastTurn.Ui.MutantEventView.HandledFrame==Time.frameCount)return;
      if(LastTurn.Ui.MutantWorkshopView.HandledFrame==Time.frameCount)return;
      if(LastTurn.Ui.MutantChestView.HandledFrame==Time.frameCount)return;
      if(LastTurn.Ui.MutantStartView.CoversCurrentScreen)return;
      // Ödül görünümü Esc'i değiştirme iptali/duraklatma olarak kendisi işler.
      if(LastTurn.Ui.MutantChoiceView.OwnsChoice)return;
      if(LastTurn.Ui.MutantBossView.OwnsBoss)return;
      if(!SettingsScreen.Open&&Time.frameCount!=SettingsScreen.ClosedFrame&&Keyboard.current!=null&&Keyboard.current.escapeKey.wasPressedThisFrame)GameFlow.Pause(!GameFlow.Paused);
    }
    private bool Button(string name)=>GUILayout.Button(name,button,GUILayout.MinHeight(44));
    private void OnGUI()
    {
      if(!MutantRuntime.Active)return;
      if(LastTurn.Ui.MutantStartView.CoversCurrentScreen||LastTurn.Ui.SettingsView.CoversCurrentScreen||LastTurn.Ui.PauseView.CoversCurrentScreen)return;
      if(LastTurn.Ui.MutantChoiceView.CoversCurrentScreen)return;
      if(LastTurn.Ui.MutantBossView.CoversCurrentScreen)return;
      if(LastTurn.Ui.MutantEventView.CoversCurrentScreen)return;
      if(LastTurn.Ui.MutantWorkshopView.CoversCurrentScreen)return;
      if(LastTurn.Ui.MutantChestView.CoversCurrentScreen)return;
      if(LastTurn.Ui.MutantSummaryView.CoversCurrentScreen)return;
      if(LastTurn.Ui.MutantResultView.CoversCurrentScreen)return;
      if(text==null){text=new GUIStyle(GUI.skin.label){fontSize=17,wordWrap=true};text.normal.textColor=Color.white;title=new GUIStyle(text){fontSize=25,fontStyle=FontStyle.Bold};small=new GUIStyle(text){fontSize=14};button=new GUIStyle(GUI.skin.button){fontSize=17,wordWrap=true};}
      var m=MutantRuntime.Model;
      var p=FindFirstObjectByType<GtPrototype>();bool drive=p&&p.Simulation!=null&&MutantRuntime.Panel==""&&!GameFlow.Paused;
      // sürüşte: ortak HUD yerleşimindeki tek satırlık durum çubuğu (dokunmatik düğmelere ve miniharitaya değmez)
      // TS #mutantDevPanel ve #mutantDriftTani: yalnız geliştirme yapısındaki test koşusu.
      if(drive){MutantDevLab.Button(button);MutantDevLab.DrawDiagnosis(p,text,small);}
      if(drive&&Hud.TryGet(p,"MutantBar",out var bar))
      {
        if(LastTurn.Ui.MutantHudView.OwnsDrive){lastMessage=MutantRuntime.Message;return;}
        GUILayout.BeginArea(bar,GUI.skin.box);
        GUILayout.Label("Bölge "+m.Region+" • Boss "+m.Timer+" • Gövde "+m.Body.ToString("0")+" • "+m.Money.ToString("0")+" para • Sv "+m.Level,small);GUILayout.EndArea();
        if(MutantRuntime.Message!=""&&MutantRuntime.Message!=lastMessage){TouchDrivingOverlay.Note(MutantRuntime.Message,2.2f);}lastMessage=MutantRuntime.Message;
        if(p.Race==null&&Hud.TryGet(p,"Hint",out var hint))GUI.Label(hint,"WASD/oklar sürüş • Boşluk/C el freni • N nitro • 1/2/3 skill • havada sol fare sürükle: burun • işaretin içinde dur",small);
        return;
      }
      if(MutantRuntime.Panel==""&&!GameFlow.Paused)return;
      GUILayout.BeginArea(new Rect(12,12,Mathf.Min(Screen.width-24,780),84),GUI.skin.box);
      GUILayout.Label("MUTANT  •  Bölge "+m.Region+"  •  Boss "+m.Timer+"  •  Gövde "+m.Body.ToString("0")+"  •  "+m.Money.ToString("0")+" para",text);
      GUILayout.Label(m.BossName+"  •  "+m.CarName+"  •  Seviye "+m.Level,text);GUILayout.EndArea();
      float width=Mathf.Min(800,Screen.width-24);var area=new Rect((Screen.width-width)/2,132,width,Mathf.Max(90,Screen.height-144));
      var color=GUI.color;GUI.color=new Color(.035f,.045f,.06f);GUI.DrawTexture(area,Texture2D.whiteTexture);GUI.color=color;
      GUILayout.BeginArea(area,GUI.skin.box);scroll=GUILayout.BeginScrollView(scroll);
      if(GameFlow.Paused)
      {GUILayout.Label("DURAKLATILDI",title);if(Button("Devam et"))GameFlow.Pause(false);if(Button("Ayarlar")){GameFlow.Pause(false);SettingsScreen.Show();}if(Button("Koşudan çık"))MutantRuntime.Exit();}
      else switch(MutantRuntime.Panel)
      {
        case "start":
          GUILayout.Label("MUTANT",title);GUILayout.Label(m.BossName+" — "+m.BossDescription,text);
          GUILayout.Label("Başlangıç aracını seç.",text);
          foreach(var c in m.StartingCarsCards)
          {if(Button(c.Name+" • "+c.Hp.ToString("0")+" HP"))MutantRuntime.SelectCar(c.Id);}
          break;
        case "choice":
          GUILayout.Label("Yetenek seç",title);
          if(replacing=="")foreach(var c in m.Choices){if(Button(c.Name+"\n"+c.Description)&&!MutantRuntime.Choose(c.Id))replacing=c.Id;}
          else
          {GUILayout.Label("Yerine bırakılacak skill'i seç.",text);foreach(var skill in m.OwnedSkills){if(Button(skill.Name)&&MutantRuntime.Choose(replacing,skill.Id))replacing="";}if(Button("Geri"))replacing="";}
          break;
        case "event":
          var e=m.Events.FirstOrDefault(x=>x.Id==MutantRuntime.MarkerId);if(e!=null)
          {GUILayout.Label(e.Name,title);GUILayout.Label(e.Title,text);foreach(var r in e.Risks)if(Button(r.Name+" • Hedef "+r.Target.ToString("0.0")+" • "+r.Money.ToString("0")+" para"))MutantRuntime.StartRace(e.Id,r.Risk);}
          if(Button("Geri"))MutantRuntime.ClosePanel();break;
        case "shop":
          GUILayout.Label("ATÖLYE",title);GUILayout.Label("Güç kaybı %"+m.PowerLossPercent.ToString("0"),text);
          GUI.enabled=m.CanRepair;if(Button("Tamir • "+m.RepairCost.ToString("0")+" para"))MutantRuntime.Repair();GUI.enabled=true;
          foreach(var s in m.Stock){GUI.enabled=s.CanBuy;if(Button(s.Name+" • "+s.Price.ToString("0")+" para\n"+s.Description))MutantRuntime.Buy(s.Id);GUI.enabled=true;}
          GUI.enabled=m.CanRefresh;if(Button("Stoğu yenile • "+m.RefreshCost.ToString("0")+" para"))MutantRuntime.RefreshStock();GUI.enabled=true;
          if(Button("Geri"))MutantRuntime.ClosePanel();break;
        case "chest":
          var chest=m.Chests.First(x=>x.Id==MutantRuntime.MarkerId);GUILayout.Label(chest.Title,title);GUILayout.Label(chest.Name+"\n"+chest.Description,text);
          if(chest.Cursed)GUILayout.Label(chest.CurseName+" • "+chest.CurseDescription,text);
          if(Button("Al"))MutantRuntime.Chest(true);if(Button("Reddet"))MutantRuntime.Chest(false);break;
        case "boss":
          GUILayout.Label(m.BossName,title);GUILayout.Label(m.BossDescription+"\n"+m.BossWeakness,text);
          foreach(string ability in m.BossAbilities)GUILayout.Label(ability,text);
          if(Button("Boss'a meydan oku"))MutantRuntime.StartRace(-1,0,true);
          if(m.Remaining>0&&Button("Geri"))MutantRuntime.ClosePanel();break;
        case "result":
          GUILayout.Label("YARIŞ SONUCU",title);GUILayout.Label(MutantRuntime.Message,text);
          if(Button("Devam"))MutantRuntime.Continue();break;
        case "lab":
          MutantDevLab.Draw(title,text,button);break;
        case "summary":
          GUILayout.Label("KOŞU BİTTİ",title);GUILayout.Label("Bölge "+m.Region+" • "+m.DefeatedBosses+" boss",text);
          GUILayout.Label(MutantRuntime.Message,text);if(Button("Ana menü"))MutantRuntime.Exit();break;
      }
      if(MutantRuntime.Panel!="result"&&MutantRuntime.Panel!="summary"&&MutantRuntime.Message!="")GUILayout.Label(MutantRuntime.Message,text);
      GUILayout.EndScrollView();GUILayout.EndArea();
    }
  }
}
