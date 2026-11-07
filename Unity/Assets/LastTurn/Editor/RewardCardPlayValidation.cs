using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using LastTurn.Core;
using LastTurn.Garage;
using LastTurn.Prototype;
using LastTurn.Ui;
using FUi = LastTurn.Ui.Ui;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace LastTurn.EditorValidation
{
  // Sadece ayrı test Editor'ında katalog önizlemesi. Ürün menüsüne yeni ekran eklemez.
  [InitializeOnLoad]
  public static class RewardCardPlayValidation
  {
    private const string Active="LastTurn.M2.Card",PathKey="LastTurn.M2.Path";
    [Serializable]private sealed class Source{public string path,hash;}
    [Serializable]private sealed class Proof{public string result,error,utc;public List<string> checks=new List<string>(),images=new List<string>(),runtimeErrors=new List<string>(),editorDiagnostics=new List<string>();public Source[] sources;}
    private static Proof proof;private static int stage;private static double began,at;private static string career,profile,runBefore;
    private static Dictionary<string,string> files;private static VisualElement page,grid;private static RewardCard[] cards;
    private static EditorWindow game;private static object group;private static int originalSize;private static readonly List<int> sizes=new List<int>();
    private static string shot;private static int shotW,shotH;private static DateTime requested;private static bool queued;
    private static string Project=>Path.GetDirectoryName(Application.dataPath);
    static RewardCardPlayValidation(){EditorApplication.playModeStateChanged+=Changed;}
    public static void StartGameView()
    {
      if(Application.isBatchMode||Application.companyName!="LastTurnProfileUiValidation"||Application.productName!="LastTurnUiValidation"||!Environment.GetCommandLineArgs().Contains("-lastTurnUiValidation"))throw new InvalidOperationException("Ayrı grafik test ürünü gerekir.");
      if(EditorApplication.isPlayingOrWillChangePlaymode)throw new InvalidOperationException("Önce test Play durmalı.");
      GarageSceneBuilder.Open();SessionState.SetString(PathKey,Path.Combine(Project,"Logs/M2Card/"+Guid.NewGuid().ToString("N")+"/garage.json"));SessionState.SetBool(Active,true);EditorApplication.EnterPlaymode();
    }
    private static void Changed(PlayModeStateChange s)
    {
      if(s==PlayModeStateChange.EnteredPlayMode&&SessionState.GetBool(Active,false)){proof=new Proof();stage=0;began=at=EditorApplication.timeSinceStartup;Application.logMessageReceived+=Logged;EditorApplication.update+=Tick;}
      if(s==PlayModeStateChange.ExitingPlayMode){Application.logMessageReceived-=Logged;EditorApplication.update-=Tick;}
    }
    private static void Logged(string m,string stack,LogType t){if(t!=LogType.Error&&t!=LogType.Exception&&t!=LogType.Assert)return;if(stack.Contains("UnityEditor.Search.")&&!stack.Contains("LastTurn."))proof.editorDiagnostics.Add(m);else proof.runtimeErrors.Add(m+"\n"+stack);}
    private static void Check(bool ok,string name){if(!ok)throw new InvalidOperationException(name);proof.checks.Add(name);}
    private static string Hash(string p){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(File.ReadAllBytes(p))).Replace("-","").ToLowerInvariant();}
    private static Dictionary<string,string> Files()=>new[]{"LastTurnGarage","LastTurnMutant","LastTurnSettings"}.Select(n=>Path.Combine(Application.persistentDataPath,n)).Where(Directory.Exists).SelectMany(p=>Directory.GetFiles(p,"*.json",SearchOption.AllDirectories)).ToDictionary(p=>p,Hash);
    private static void Setup()
    {
      GarageSession.Open(SessionState.GetString(PathKey,""),true);career=GarageSession.State.Snapshot().ToString();profile=GarageRace.ProfileStore().Load().Snapshot().ToString();files=Files();
      MutantRuntime.Start(53);MutantRuntime.SelectCar(MutantRuntime.Model.StartingCarsCards[0].Id);
      var run=MutantRuntime.Run;run.State.Set("pasifler",CatalogNode.Parse("[\"guc\",\"guc\"]"));
      run.State.Set("beceriler",CatalogNode.Parse("[{\"id\":\"slipstream-engine\",\"seviye\":2,\"eklentiler\":[],\"evrim\":null},{\"id\":\"grappling-hook\",\"seviye\":1,\"eklentiler\":[],\"evrim\":null},{\"id\":\"flying-dutchman\",\"seviye\":1,\"eklentiler\":[],\"evrim\":null}]"));
      runBefore=run.State.ToString();
      var models=new[]{MutantRuntime.Reward("guc",RewardSource.Level),MutantRuntime.Reward("y:slipstream-engine",RewardSource.Level),MutantRuntime.Reward("ek-hasar-donusturucu",RewardSource.Chest,true,"govde"),MutantRuntime.Reward("b:volt-kanat",RewardSource.Level)};
      Check(models.Select(m=>m.Rarity).SequenceEqual(new[]{RewardRarity.Common,RewardRarity.Uncommon,RewardRarity.Rare,RewardRarity.Legendary}),"Dört nadirlik gerçek metadata'dan");
      Check(models[0].Level==3&&models[3].Level==1&&models[3].NeedsReplacement,"Yaygın3 / Efsanevi1 ve dolu yuva bilgisi");
      Check(models[0].VehicleEffects.Any(e=>e.After>e.Before)&&models[1].EffectText.Contains("1,25 → 1,3"),"Sayısal bilgi gerçek araç ve skill parametresi");
      Check(models[2].Cursed&&models[2].CurseText.Contains("25"),"Lanet ayrı kırmızı bedel bilgisi");
      page=new VisualElement{name="m2-card-preview"};FUi.Absolute(page,0,0,0,0);page.style.backgroundColor=new Color(.035f,.045f,.065f);page.style.paddingLeft=60;page.style.paddingRight=60;page.style.paddingTop=30;page.style.paddingBottom=30;
      var title=FUi.Text("MUTANT  /  ÖDÜL KARTI","bb");title.style.fontSize=34;title.style.color=FUi.Accent;page.Add(title);
      var note=FUi.Text("KATALOG ÖNİZLEMESİ · Alma işlemi yok · Tab odak · PgUp/PgDn veya fare tekerleği ayrıntılar");note.style.fontSize=19;page.Add(note);
      grid=new VisualElement();grid.style.flexGrow=1;grid.style.flexDirection=FlexDirection.Row;grid.style.flexWrap=Wrap.Wrap;grid.style.justifyContent=Justify.SpaceBetween;grid.style.alignContent=Align.FlexStart;grid.style.marginTop=22;
      page.Add(grid);cards=models.Select(m=>new RewardCard(m)).ToArray();foreach(var card in cards){card.style.width=new Length(49,LengthUnit.Percent);card.style.height=new Length(47,LengthUnit.Percent);card.style.marginBottom=18;grid.Add(card);}UiRoot.Instance.Top.Add(page);
      Check(run.State.ToString()==runBefore,"Kart okuması gerçek koşuyu/RNG'yi değiştirmez");
    }
    private static void Size(int w,int h)
    {
      var a=typeof(EditorWindow).Assembly;var t=a.GetType("UnityEditor.GameView");if(!game){game=EditorWindow.GetWindow(t);originalSize=(int)t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).GetValue(game);}
      var st=a.GetType("UnityEditor.GameViewSizes");var singleton=typeof(ScriptableSingleton<>).MakeGenericType(st).GetProperty("instance").GetValue(null);group=st.GetMethod("GetGroup").Invoke(singleton,new object[]{GameViewSizeGroupType.Standalone});
      int n=(int)group.GetType().GetMethod("GetTotalCount").Invoke(group,null);var size=Activator.CreateInstance(a.GetType("UnityEditor.GameViewSize"),new object[]{Enum.Parse(a.GetType("UnityEditor.GameViewSizeType"),"FixedResolution"),w,h,"M2 kart"});group.GetType().GetMethod("AddCustomSize").Invoke(group,new[]{size});sizes.Add(n);
      t.GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,n);game.Show();game.Focus();game.Repaint();
    }
    private static void Shot(string label,int w,int h){shot=label;shotW=w;shotH=h;queued=false;Size(w,h);}
    private static void Capture()
    {
      string path=Path.Combine(Project,"Logs/m2-reward-"+shot+"-"+shotW+".png");
      if(!queued){Check(Screen.width==shotW&&Screen.height==shotH,"Gerçek Game View "+shotW);requested=DateTime.UtcNow;ScreenCapture.CaptureScreenshot(path);queued=true;return;}
      if(!File.Exists(path)||File.GetLastWriteTimeUtc(path)<requested)return;
      var png=new Texture2D(2,2);try{png.LoadImage(File.ReadAllBytes(path));Check(png.width==shotW&&png.height==shotH,"PNG piksel boyutu");}finally{UnityEngine.Object.DestroyImmediate(png);}
      var bounds=page.worldBound;
      foreach(var card in cards){
        Check(card.worldBound.xMin>=bounds.xMin&&card.worldBound.yMin>=bounds.yMin&&card.worldBound.xMax<=bounds.xMax&&card.worldBound.yMax<=bounds.yMax,"Kart ekran sınırında "+card.Model.Name);
        Check(card.Q<Label>(className:"rc-title").text==card.Model.Name&&card.Q<Label>(className:"rc-effect").text==card.Model.EffectText&&card.Q<Label>(className:"rc-level").text.Contains(card.Model.LevelText),"UI verisi gerçek modelle aynı "+card.Model.Name);
        Check(card.Details.contentViewport.worldBound.height>50&&card.Q(className:"rc-foot").worldBound.yMax<=card.worldBound.yMax-8,"Ayrıntı kaydırma ve alt bilgi sığar "+card.Model.Name);
      }
      Check(!cards[0].worldBound.Overlaps(cards[1].worldBound)&&!cards[0].worldBound.Overlaps(cards[2].worldBound),"Kartlar çakışmaz");proof.images.Add(Path.GetFileName(path));shot=null;
    }
    private static void Tick()
    {
      try{
        if(proof.runtimeErrors.Count>0)throw new Exception(proof.runtimeErrors[0]);if(EditorApplication.timeSinceStartup-began>150)throw new TimeoutException("M2 kart Play sınırı");
        if(EditorApplication.timeSinceStartup-at<.5)return;at=EditorApplication.timeSinceStartup;
        if(shot!=null){Capture();return;}
        if(stage==0){if(!UiRoot.Instance||!UnityEngine.Object.FindFirstObjectByType<GarageScreen>())return;Setup();stage++;return;}
        if(stage==1){Shot("cards",1920,1080);stage++;return;}
        if(stage==2){Shot("cards",1280,720);stage++;return;}
        if(stage==3){cards[3].RemoveFromHierarchy();cards[3]=new RewardCard(MutantRuntime.Reward("b:grappling-hook",RewardSource.Level));cards[3].style.width=new Length(49,LengthUnit.Percent);cards[3].style.height=new Length(47,LengthUnit.Percent);cards[3].style.marginBottom=18;grid.Add(cards[3]);stage++;return;}
        if(stage==4){cards[3].Focus();using(var e=KeyDownEvent.GetPooled(new Event{type=EventType.KeyDown,keyCode=KeyCode.PageDown}))cards[3].SendEvent(e);stage++;return;}
        if(stage==5){Check(cards[3].focusController.focusedElement==cards[3],"Kart klavye odağı alır");Check(cards[3].Details.scrollOffset.y>0,"PgDn uzun skill ayrıntılarını kaydırır");Shot("details",1280,720);stage++;return;}
        if(stage==6){
          Check(MutantRuntime.Run.State.ToString()==runBefore,"Odak/kaydırma ödül ve koşuyu değiştirmez");
          Check(GarageSession.State.Snapshot().ToString()==career&&GarageRace.ProfileStore().Load().Snapshot().ToString()==profile,"Kariyer/para/profil korunur");var now=Files();Check(now.Count==files.Count&&files.All(f=>now.TryGetValue(f.Key,out var h)&&h==f.Value),"Kalıcı JSON hash'leri aynı");
          page.RemoveFromHierarchy();MutantRuntime.Exit();Finish(null);
        }
      }catch(Exception e){Finish(e);}
    }
    private static void Finish(Exception e)
    {
      SessionState.SetBool(Active,false);EditorApplication.update-=Tick;Application.logMessageReceived-=Logged;
      if(game&&group!=null){game.GetType().GetProperty("selectedSizeIndex",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).SetValue(game,originalSize);foreach(int n in sizes.AsEnumerable().Reverse())group.GetType().GetMethod("RemoveCustomSize").Invoke(group,new object[]{n});}
      proof.result=e==null?"m2-reward-card-passed":"failed";proof.error=e?.ToString()??"";proof.utc=DateTime.UtcNow.ToString("O");
      proof.sources=Directory.GetFiles(Path.Combine(Application.dataPath,"LastTurn"),"*",SearchOption.AllDirectories).Where(p=>new[]{".cs",".uss",".json"}.Contains(Path.GetExtension(p))).OrderBy(p=>p,StringComparer.Ordinal).Select(p=>new Source{path=p.Substring(Project.Length+1).Replace('\\','/'),hash=Hash(p)}).ToArray();Directory.CreateDirectory(Path.Combine(Project,"Logs"));File.WriteAllText(Path.Combine(Project,"Logs/m2-reward-card-play.json"),JsonUtility.ToJson(proof,true));EditorApplication.Exit(e==null?0:1);
    }
  }
}
