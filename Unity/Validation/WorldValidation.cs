using LastTurn.Core;
internal static class WorldValidation
{
  public static void Run()
  {
    string unity=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../.."));
    string Resource(string n)=>File.ReadAllText(Path.Combine(unity,"Assets/LastTurn/Resources",n));
    var vehicles=new VehicleCatalog(Resource("vehicle-catalog.json"));var tracks=new TrackCatalog(Resource("track-catalog.json"));var worlds=new WorldCatalog(Resource("world-catalog.json"),tracks);
    int checks=0;double error=0;void Check(bool ok,string label){checks++;if(!ok)throw new Exception("Dünya: "+label);}
    void Near(double a,double b,string label){error=Math.Max(error,Math.Abs(a-b));Check(Math.Abs(a-b)<1e-9,label+" TS "+a.ToString("R")+" C# "+b.ToString("R"));}
    var oracle=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/world-0.8.18.json")));
    foreach(var r in oracle["samples"].Items)foreach(var point in r["points"].Items){double x=point[0].N(),z=point[1].N();Near(point[2].N(),worlds.Height(x,z),r["key"].S()+" yükseklik");Check(point[3].N()==worlds.Surface(x,z),r["key"].S()+" yüzey");}
    Check(worlds.Regions.Length==43 && worlds.Regions.Sum(r=>r.Objects.Length)==19578,"43 bölge/19578 nesne");
    Check(worlds.Streets.Length==9&&worlds.Streets.Select(r=>r.Key).Distinct().Count()==9,"Dokuz kaynak şehir rotası");
    foreach(var r in worlds.Streets){Check(r.Geometry.N>2&&r.Geometry.Length>0&&r.Stars.Length==3,"Kaynak rota geometrisi "+r.Key);Check(r.Geometry.Open==(r.Kind=="ab")&&(r.Geometry.Open?r.Laps==0:r.Laps>0),"Kaynak açık/kapalı rota "+r.Key);}
    foreach(var q in oracle["queries"].Items){var r=worlds.Region(q["key"].S());foreach(var point in q["points"].Items){var indices=r.Grid.Near(point["x"].N(),point["z"].N()).Select(o=>Array.IndexOf(r.Objects,o));Check(indices.SequenceEqual(point["indices"].Items.Select(n=>(int)n.N())),"TS ızgara sorgusu/kimlik/sıra "+r.Key);}}
    var collisions=CatalogNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Reference/collisions-0.8.18.json")));
    var parameters=vehicles.CreatePhysics(vehicles.Setup(0,Array.Empty<string>(),"real")).Chassis;
    Near(parameters.Mass,collisions["physics"]["mass"].N(),"kütle");Near(parameters.Inertia.Y,collisions["physics"]["iy"].N(),"atalet");
    foreach(var c in collisions["cases"].Items)
    {
      var n=c["initial"];var state=new VehicleState(new BodyVector(n["px"].N(),n["py"].N(),n["pz"].N()),new BodyRotation(0,n["qy"].N(),0,n["qw"].N()),new BodyVector(n["vx"].N(),0,n["vz"].N()),new BodyVector(0,n["oy"].N(),0),new VehicleWheelState[4]);
      var world=new TestWorld(c);foreach(var row in c["rows"].Items)
      {
        state.Position+=new BodyVector(state.Velocity.X/60,0,state.Velocity.Z/60);EnvironmentCollision.Apply(state,parameters,world,1.0/60,JsMath.Hypot(state.Velocity.X,state.Velocity.Z));
        double[] values={state.Position.X,state.Position.Z,state.Velocity.X,state.Velocity.Z,state.AngularVelocity.Y,state.LastHitTime,state.Wet};for(int j=0;j<values.Length;j++)Near(row[j].N(),values[j],"temas "+j);state.Steps++;
      }
    }
    // Izgara kimliği/sırası ve geniş kutu tekilleştirmesi.
    var grid=new ObstacleGrid();var a=new WorldObstacle{Type="box",HalfX=80,HalfZ=80};var b=new WorldObstacle{Type="solid",X=-1,Radius=1};grid.Add(a);grid.Add(b);
    Check(grid.Near(0,0).Distinct().Count()==2 && grid.Near(0,0).First()==a,"16m hücre, tekilleştirme ve sıra");
    Console.WriteLine($"Dünya/çarpışma: {checks} koşul; 43 bölge, 2580 yüzey/yükseklik örneği, 12×35 darbe adımı; en büyük fark {error:G3}.");
  }
  private sealed class TestWorld:IVehicleCollisionWorld
  {
    private readonly WorldObstacle[] objects;private readonly double[] bounds;
    public TestWorld(CatalogNode n){objects=n["objects"].Items.Select(WorldObstacle.Read).ToArray();bounds=n["bounds"].Items.Select(v=>v.N()).ToArray();}
    public bool CollisionEnabled=>true;public (double MinX,double MaxX,double MinZ,double MaxZ) CollisionBounds=>(bounds[0],bounds[1],bounds[2],bounds[3]);
    public IEnumerable<WorldObstacle> Near(double x,double z,double y)=>objects;
  }
}
