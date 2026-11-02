using System;
using System.Linq;

namespace LastTurn.Core
{
  // mutantYarisAyari/mutantRakibi: süre/tur ve rakip kararı görünümden bağımsızdır.
  public sealed class MutantRacePlan
  {
    public readonly RaceEventInfo Event;
    public readonly TrackDefinition Track;
    public readonly TrackWorld World;
    public readonly CatalogNode Opponent;
    public readonly bool Boss, Duel;
    public readonly int EventId, Risk;
    private MutantRacePlan(RaceEventInfo info,TrackDefinition track,TrackWorld world,CatalogNode opponent,bool boss,int eventId,int risk)
    {Event=info;Track=track;World=world;Opponent=opponent;Boss=boss;EventId=eventId;Risk=risk;Duel=opponent!=null&&opponent["duello"].B();}
    public static MutantRacePlan Create(MutantRun run,int selectedCar,int eventId,int risk,bool boss,
      RaceEventCatalog events,TrackCatalog tracks,WorldCatalog worlds)
    {
      if(selectedCar<0)throw new ArgumentOutOfRangeException(nameof(selectedCar));
      var entry=boss?null:run.State["etkinlikler"].Items.First(e=>e["id"].N()==eventId&&!e["yapildi"].B());
      var candidate=boss?run.BossTrack():run.Catalog["tracks"].Items.First(p=>p["i"].N()==entry!["i"].N());
      int index=(int)candidate["i"].N();bool street=index>=tracks.Tracks.Length;
      var track=street?TrackDefinition.FromStreet(worlds.Streets[index-tracks.Tracks.Length],index):tracks.Tracks[index];
      var opponent=boss?run.BossOpponent():run.OpponentSpec(eventId,risk,selectedCar);
      if(boss&&opponent!=null)opponent.Set("duello",CatalogNode.Parse("true"));
      bool duel=opponent!=null&&opponent["duello"].B();
      var target=boss?null:MutantRun.EventTarget(candidate,risk);
      int laps=boss?(int)candidate["laps"].N():duel&&!street?2:(int)target!["laps"].N();
      double limit=boss?(opponent==null?run.BossTarget(candidate):0):duel?0:target!["limit"].N();
      var original=street?null:events.Events[index];var start=track.Layout;
      var info=new RaceEventInfo{Index=index,Key=original?.Key??track.Key,Type=track.Type,Level=track.Level,Difficulty=track.Difficulty,
        Name=original?.Name??track.Name,Description=original?.Description??track.Description,Region=original?.Region??41,
        Preset=original?.Preset??"ar",Laps=laps,Limit=limit,Stars=candidate["ys"].Items.Select(x=>x.N()).ToArray(),
        StartX=original?.StartX??start.StartX,StartZ=original?.StartZ??start.StartZ,StartHeading=original?.StartHeading??start.StartHeading};
      return new MutantRacePlan(info,track,street?new TrackWorld(track,worlds):new TrackWorld(track){Environment=worlds.Activate(track.Key)},opponent!,boss,eventId,risk);
    }
    public bool Passed(RaceSession race,OpponentRacer opponent)
      =>Duel?opponent==null||opponent.PlayerWon(race.Time):race.IsDrift?race.Drift.Score>0&&race.Drift.Score>=Event.Limit:race.Time<=Event.Limit;
    public bool? BeatOpponent(RaceSession race,OpponentRacer opponent)
      =>Opponent!=null&&!Duel?opponent==null||opponent.PlayerWon(race.Time):(bool?)null;
    public (double X,double Z,double Heading) OpponentStart()
    {
      var g=Track.Geometry;int i=g.Nearest(Event.StartX,Event.StartZ,0,true).Index;
      double lead=Opponent["onde"].N(),distance=0;int steps=0;
      while(distance<lead&&steps++<g.N){int next=(i+1)%g.N;distance+=JsMath.Hypot(g.X[next]-g.X[i],g.Z[next]-g.Z[i]);i=next;}
      double side=lead>0?0:OpponentRacer.GridOffset;
      return ((lead>0?g.X[i]:Event.StartX)+g.Tz[i]*side,(lead>0?g.Z[i]:Event.StartZ)-g.Tx[i]*side,lead>0?Math.Atan2(g.Tx[i],g.Tz[i]):Event.StartHeading);
    }
  }
}
