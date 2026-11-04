using System;
using System.Collections.Generic;
using System.Linq;

namespace LastTurn.Core
{
  public sealed class EnvironmentRegion
  {
    public readonly string Key,Name;public readonly double[] Bounds;
    public readonly WorldObstacle[] Objects;public readonly (double X,double Z)[] Cones;
    public readonly (string Name,double X,double Z,double Heading)[] Teleports;
    public readonly ObstacleGrid Grid=new();
    internal ObstacleGrid ActiveGrid=null!;public ObstacleGrid QueryGrid=>ActiveGrid??Grid;
    public EnvironmentRegion(CatalogNode n)
    {
      Key=n["key"].S();Name=n["name"].S();Bounds=n["bounds"].Items.Select(x=>x.N()).ToArray();
      Objects=n["objects"].Items.Select(WorldObstacle.Read).ToArray();foreach(var o in Objects)Grid.Add(o);
      Cones=n["cones"].Items.Select(c=>(c["x"].N(),c["z"].N())).ToArray();
      Teleports=n["teleports"].Items.Select(t=>(t[0].S(),t[1].N(),t[2].N(),t[3].N())).ToArray();
    }
    public bool Contains(double x,double z)=>x>Bounds[0]&&x<Bounds[1]&&z>Bounds[2]&&z<Bounds[3];
    public (double,double,double,double) Box=>(Bounds[0],Bounds[1],Bounds[2],Bounds[3]);
  }
  public sealed class WorldCatalog
  {
    public readonly CatalogNode Data;public readonly EnvironmentRegion[] Regions;
    public readonly StreetRoute[] Streets;
    private readonly Dictionary<string,TrackWorld> tracks=new();private readonly Dictionary<int,CatalogNode[]> cityCells=new();
    private readonly ObstacleGrid activeGrid=new();private readonly HashSet<string> activated=new();
    public WorldCatalog(string json,TrackCatalog trackCatalog)
    {
      Data=CatalogNode.Parse(json);if(Data["baseline"].S()!=TrackCatalog.Baseline)throw new FormatException("Dünya kaynağı uyuşmuyor.");
      Regions=Data["regions"].Items.Select(r=>new EnvironmentRegion(r)).ToArray();
      Streets=Data["city"]["routes"].Items.Select(r=>new StreetRoute(r)).ToArray();
      if(Regions.Length!=43)throw new FormatException("Dünya bölge kapsamı eksik.");
      foreach(var t in trackCatalog.Tracks)tracks[t.Key]=new TrackWorld(t);
      foreach(var c in Data["city"]["heightCells"].Items)cityCells[(int)c[0].N()]=c[1].Items.ToArray();
      Activate("hub");
    }
    public EnvironmentRegion Region(string key)=>Regions.FirstOrDefault(r=>r.Key==key)??throw new ArgumentException("Dünya yok: "+key);
    public EnvironmentRegion Activate(string key){var r=Region(key);if(activated.Add(key))foreach(var o in r.Objects)activeGrid.Add(o);r.ActiveGrid=activeGrid;return r;}
    private EnvironmentRegion At(double x,double z)=>Regions.Skip(1).FirstOrDefault(r=>r.Contains(x,z))!;
    public double Height(double x,double z)
    {
      var r=At(x,z);if(r==null)return Math.Abs(x)<900&&Math.Abs(z)<900?HubHeight(x,z):0;
      if(tracks.TryGetValue(r.Key,out var t))return t.Height(x,z);
      return r.Key=="city"?CityHeight(x-Data["city"]["x"].N(),z-Data["city"]["z"].N()):0;
    }
    public int Surface(double x,double z)
    {
      var r=At(x,z);if(r==null)return Math.Abs(x)<900&&Math.Abs(z)<900?HubSurface(x,z):2;
      if(tracks.TryGetValue(r.Key,out var t))return t.Surface(x,z);
      if(r.Key=="city")return CitySurface(x-Data["city"]["x"].N(),z-Data["city"]["z"].N());
      return x>-260&&x<260&&z>-3570&&z<-3235?1:2;
    }
    public double HubHeight(double x,double z)
    {
      double h=0,w=TrackGeometry.Clamp((11-Math.Abs(x+250))/3,0,1),t=(z+130)/30;
      if(t>=0&&t<=1)h+=4.5*t*w;
      w=TrackGeometry.Clamp((19-Math.Abs(x+40))/8,0,1);double y=0;
      if(z>130&&z<=400)y=30*(z-130)/270;else if(z>400&&z<=440)y=30;else if(z>440&&z<480)y=30*(1-TrackGeometry.Smooth(440,480,z));h+=y*w;
      foreach(var b in Data["hills"].Items)h+=b[3].N()*Math.Exp(-((x-b[0].N())*(x-b[0].N())+(z-b[1].N())*(z-b[1].N()))/(b[2].N()*b[2].N()));
      return h;
    }
    public int HubSurface(double x,double z)
    {
      double q=JsMath.Hypot(x/140,z/90);if(q>0){double g=JsMath.Hypot(x/(140*140),z/(90*90))/q;if(Math.Abs(q-1)/g<11)return 1;}
      if(Math.Abs(x-210)<11&&Math.Abs(z)<800)return 1;
      foreach(var road in Data["roads"].Items)
      {var a=road.Items.ToArray();for(int i=0;i+1<a.Length;i++){double ax=a[i][0].N(),az=a[i][1].N(),dx=a[i+1][0].N()-ax,dz=a[i+1][1].N()-az,t=TrackGeometry.Clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1);if(JsMath.Hypot(x-ax-t*dx,z-az-t*dz)<Data["roadHalf"].N())return 1;}}
      return 0;
    }
    private double CityHeight(double x,double z)
    {
      var c=Data["city"];if(Math.Abs(x)>c["half"].N()||Math.Abs(z)>c["half"].N())return 0;
      int cell=(int)Math.Floor((x-c["avenues"][0].N())/c["avenueSpacing"].N())*100+(int)Math.Floor((z-c["streets"][0].N())/c["streetSpacing"].N());
      if(cityCells.TryGetValue(cell,out var list))foreach(var b in list)
        if(Math.Abs(x-b["x"].N())<b["hx"].N()-1.5&&Math.Abs(z-b["z"].N())<b["hz"].N()-1.5)
          return b.Has("ust")&&Math.Abs(x-b["x"].N())<b["ust"]["hx"].N()-1.5&&Math.Abs(z-b["z"].N())<b["ust"]["hz"].N()-1.5?b["ust"]["y"].N():b["y"].N();
      return 0;
    }
    private int CitySurface(double x,double z)
    {
      var c=Data["city"];if(Math.Abs(x)>c["half"].N()||Math.Abs(z)>c["half"].N())return 3;
      var park=c["park"];if(!(x>park["x0"].N()&&x<park["x1"].N()&&z>park["z0"].N()&&z<park["z1"].N()))return 1;
      var path=c["path"];double r=path["kose"].N(),qx=Math.Abs(x)-(path["x"].N()-r),qz=Math.Abs(z)-(path["z"].N()-r),d=JsMath.Hypot(Math.Max(qx,0),Math.Max(qz,0))+Math.Min(Math.Max(qx,qz),0);
      if(Math.Abs(d-r)<path["yari"].N())return 1;
      var lake=c["lake"];double gx=(x-lake["x"].N())/lake["rx"].N(),gz=(z-lake["z"].N())/lake["rz"].N();if(gx*gx+gz*gz<1)return 3;
      return Math.Abs(x)<2.5||Math.Abs(z)<2.5||Math.Abs(Math.Abs(x)*1.9-Math.Abs(z))<3?0:2;
    }
  }
  // Şehir etkinlik yürütücüsüne hazır kaynak rota; giriş/ödül/kovalama sözleşmesi P3'te bağlanır.
  public sealed class StreetRoute
  {
    public readonly string Key,Name,Kind;public readonly int Difficulty,Laps;public readonly double[] Stars;public readonly TrackGeometry Geometry;
    public StreetRoute(CatalogNode n)
    {var d=n["def"];Key=d["id"].S();Name=d["n"].S();Kind=d["tur"].S();Difficulty=(int)d["sev"].N();Laps=(int)n["laps"].N();Stars=n["stars"].Items.Select(s=>s.N()).ToArray();var g=n["geometry"];double[] A(string k)=>g[k].Items.Select(v=>v.N()).ToArray();Geometry=new TrackGeometry(A("P"),A("T"),A("S"),g["len"].N(),g["hw"].N(),n["open"].B());}
  }
  public sealed class OpenWorld:IVehicleWorld,IVehicleCollisionWorld
  {
    public readonly WorldCatalog Catalog;public EnvironmentRegion Region{get;private set;}
    public OpenWorld(WorldCatalog catalog,string key){Catalog=catalog;Region=catalog.Activate(key);}
    public double Height(double x,double z)=>Catalog.Height(x,z);
    public int Surface(double x,double z)=>Catalog.Surface(x,z);
    public double GripMultiplier{get;set;}=1;public bool CollisionEnabled=>true;
    public (double MinX,double MaxX,double MinZ,double MaxZ) CollisionBounds=>Region.Box;
    public IEnumerable<WorldObstacle> Near(double x,double z,double y)=>Region.QueryGrid.Near(x,z).Where(o=>o.Top==0||y-.6<o.Top);
  }
}
