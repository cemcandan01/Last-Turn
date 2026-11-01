using LastTurn.Prototype;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;

namespace LastTurn.Garage
{
  // Geçici okunabilir menü; bütün veri ve eylemler GameFlow/görünüm modellerinden gelir.
  public sealed class MainMenuScreen:MonoBehaviour
  {
    private GUIStyle text,title,button;private Vector2 scroll;private string name="";private bool editing;
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Install(){SceneManager.sceneLoaded-=Loaded;SceneManager.sceneLoaded+=Loaded;Loaded(SceneManager.GetActiveScene(),LoadSceneMode.Single);}
    private static void Loaded(Scene scene,LoadSceneMode mode)
    {if(scene.name=="Garage"||scene.name=="RaceTest"||scene.name=="GTTest"||scene.name=="TerrainTest")new GameObject("Oyun akışı").AddComponent<MainMenuScreen>();}
    private void Update()
    {
      if(SceneManager.GetActiveScene().name!="Garage" && Keyboard.current!=null && Keyboard.current.escapeKey.wasPressedThisFrame)GameFlow.Pause(!GameFlow.Paused);
    }
    private bool Button(string label)=>GUILayout.Button(label,button,GUILayout.MinHeight(48));
    private void OnGUI()
    {
      if(text==null)
      {text=new GUIStyle(GUI.skin.label){fontSize=18,wordWrap=true};text.normal.textColor=Color.white;title=new GUIStyle(text){fontSize=26,fontStyle=FontStyle.Bold};button=new GUIStyle(GUI.skin.button){fontSize=18,wordWrap=true,padding=new RectOffset(12,12,10,10)};}
      bool garage=SceneManager.GetActiveScene().name=="Garage";
      if(!garage && !GameFlow.Paused)
      {if(GUI.Button(new Rect(Screen.width-152,58,140,44),"Duraklat / Esc",button))GameFlow.Pause(true);return;}
      if(garage && !GameFlow.Home && !GameFlow.Profile){editing=false;return;}
      float width=Mathf.Min(820,Screen.width-24);
      GUILayout.BeginArea(new Rect((Screen.width-width)/2,12,width,Screen.height-24),GUI.skin.box);
      scroll=GUILayout.BeginScrollView(scroll);
      if(!garage)
      {
        GUILayout.Label("DURAKLATILDI",title);GUILayout.Label("Yarış süresi ve sürüş durdu.",text);
        if(Button("Devam et"))GameFlow.Pause(false);
        if(Button("Yeniden başlat")){var p=FindFirstObjectByType<GtPrototype>();if(p){if(p.Race!=null)p.RestartRace();else p.ResetVehicle();}GameFlow.Pause(false);}
        if(Button("Kariyere dön"))GameFlow.LeaveDrive();
        if(Button("Garaja dön"))GameFlow.LeaveDrive(0);
        if(Button("Ana menüye dön"))GameFlow.LeaveDrive(0,true);
      }
      else
      {
        if(!GameFlow.Profile)editing=false;
        var m=GameFlow.Menu();
        GUILayout.Label(GameFlow.Profile?"SÜRÜCÜ PROFİLİ":"LAST TURN",title);
        GUILayout.Label(m.Name+"  •  Seviye "+m.Level+"  •  "+m.Money.ToString("N0")+" para",text);
        GUILayout.Label("XP "+m.Xp.ToString("0")+" / "+m.NextLevelXp.ToString("0")+"   •   Kariyer yıldızları "+m.Stars+" / "+m.MaxStars,text);
        if(GameFlow.Profile)
        {
          if(!editing){name=m.Name;editing=true;}
          GUILayout.Label("Sürücü adı (20 karakter)",text);name=GUILayout.TextField(name,20,new GUIStyle(GUI.skin.textField){fontSize=20},GUILayout.Height(44));
          if(Button("Adı kaydet"))GameFlow.SaveName(name);
          GUILayout.Label("Yarış: "+m.Races+"   •   Hedef geçildi: "+m.Wins,text);
          GUILayout.Label("Toplam yol: "+m.Km.ToString("0.0")+" km",text);GUILayout.Label("En çok kullanılan: "+m.Favorite,text);
          if(Button("Ana menü"))GameFlow.MainMenu();
        }
        else
        {
          if(Button("Kariyer / Yarışlar"))GameFlow.Browse(2);
          if(Button("Garaj / Mağaza"))GameFlow.Browse(0);
          if(Button("Profil"))GameFlow.OpenProfile();
          if(Button("Ayarlar"))GameFlow.Browse(4);
          if(Button("Test / Geliştirici"))GameFlow.Browse(3);
          if(Button("Kaydet"))GarageSession.Save();
          if(Button("Kayıtları yeniden yükle"))GarageSession.Reload();
          if(Button("Oyundan çık")){if(GarageSession.Save())Application.Quit();}
        }
        GUILayout.Label(GarageSession.Message,text);
      }
      if(GameFlow.Message!="")GUILayout.Label(GameFlow.Message,text);
      GUILayout.EndScrollView();GUILayout.EndArea();
    }
  }
}
