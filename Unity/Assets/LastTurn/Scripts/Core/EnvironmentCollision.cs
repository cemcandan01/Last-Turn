using System;
using System.Collections.Generic;

namespace LastTurn.Core
{
  public sealed class WorldObstacle
  {
    public string Type="";public double X,Z,Radius,HalfX,HalfZ,Top;
    public static WorldObstacle Read(CatalogNode n)=>new WorldObstacle{Type=n["t"].S(),X=n["x"].N(),Z=n["z"].N(),Radius=n["r"].N(),HalfX=n["hx"].N(),HalfZ=n["hz"].N(),Top=n["y"].N()};
  }
  // TS 16 m ızgara: hücre aralığı ve nesne sırası kaynakla aynı; nesne bir kez döner.
  public sealed class ObstacleGrid
  {
    private readonly Dictionary<(int,int),List<WorldObstacle>> cells=new();
    public void Add(WorldObstacle o)
    {
      for(int i=(int)Math.Floor((o.X-o.HalfX)/16);i<=(int)Math.Floor((o.X+o.HalfX)/16);i++)
        for(int j=(int)Math.Floor((o.Z-o.HalfZ)/16);j<=(int)Math.Floor((o.Z+o.HalfZ)/16);j++)
        {if(!cells.TryGetValue((i,j),out var list))cells[(i,j)]=list=new List<WorldObstacle>();list.Add(o);}
    }
    public IEnumerable<WorldObstacle> Near(double x,double z)
    {
      int cx=(int)Math.Floor(x/16),cz=(int)Math.Floor(z/16);var seen=new HashSet<WorldObstacle>();
      for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)if(cells.TryGetValue((cx+i,cz+j),out var list))foreach(var o in list)if(seen.Add(o))yield return o;
    }
  }
  public interface IVehicleCollisionWorld
  {
    bool CollisionEnabled{get;}
    IEnumerable<WorldObstacle> Near(double x,double z,double vehicleY);
    (double MinX,double MaxX,double MinZ,double MaxZ) CollisionBounds{get;}
  }
  public static class EnvironmentCollision
  {
    // TS model.ts carpismalar, sekiz fizik alt adımından sonra; Unity collider/ikinci fizik yok.
    public static void Apply(VehicleState s,VehicleParameters p,IVehicleCollisionWorld world,double dt,double startSpeed)
    {
      var origin=s.Orientation.Rotate(new BodyVector(0,-p.CgY,-p.CgZ))+s.Position;double ox=origin.X,oz=origin.Z;
      void Impulse(double nx,double nz,double pen,double cx,double cz)
      {
        s.Position+=new BodyVector(nx*pen,0,nz*pen);
        double rx=cx-s.Position.X,rz=cz-s.Position.Z,pvx=s.Velocity.X+s.AngularVelocity.Y*rz,pvz=s.Velocity.Z-s.AngularVelocity.Y*rx,vn=pvx*nx+pvz*nz;
        if(vn>=0)return;
        double rn=rz*nx-rx*nz,j=-(1+.3)*vn/(1/p.Mass+rn*rn/p.Inertia.Y);
        s.Velocity+=new BodyVector(j*nx/p.Mass,0,j*nz/p.Mass);s.AngularVelocity+=new BodyVector(0,j*rn/p.Inertia.Y,0);
        double tx=-nz,tz=nx,vtn=pvx*tx+pvz*tz,rt=rz*tx-rx*tz,jt=TrackGeometry.Clamp(-vtn/(1/p.Mass+rt*rt/p.Inertia.Y)*.6,-.5*j,.5*j);
        s.Velocity+=new BodyVector(jt*tx/p.Mass,0,jt*tz/p.Mass);s.AngularVelocity+=new BodyVector(0,jt*rt/p.Inertia.Y,0);
        s.CollisionCount++;s.LastImpactSpeed=-vn;if(-vn>3)s.LastHitTime=s.Steps*dt;
      }
      foreach(var o in world.Near(ox,oz,s.Position.Y))
      {
        double dx=ox-o.X,dz=oz-o.Z,dd=JsMath.Hypot(dx,dz);if(dd==0)dd=.01;
        if(o.Type=="box")
        {
          double px=o.HalfX+1.4-Math.Abs(dx),pz=o.HalfZ+1.4-Math.Abs(dz);
          if(px>0 && pz>0){if(px<pz){double n=Math.Sign(dx);if(n==0)n=1;Impulse(n,0,px,ox-n*1.4,oz);}else{double n=Math.Sign(dz);if(n==0)n=1;Impulse(0,n,pz,ox,oz-n*1.4);}}
        }
        else if(o.Type=="solid")
        {double rr=o.Radius+1.5;if(dd<rr){double nx=dx/dd,nz=dz/dd;Impulse(nx,nz,rr-dd,ox-nx*1.5,oz-nz*1.5);}}
        else if(o.Type=="bush")
        {if(dd<o.Radius+1){double k=Math.Exp(-2.2*dt);s.Velocity=new BodyVector(s.Velocity.X*k,s.Velocity.Y,s.Velocity.Z*k);}}
        else if(dd<o.Radius)
        {s.Wet=1;double k=Math.Exp(-1.2*dt*Math.Min(1,startSpeed/10));s.Velocity=new BodyVector(s.Velocity.X*k,s.Velocity.Y,s.Velocity.Z*k);}
      }
      var b=world.CollisionBounds;
      if(ox<b.MinX+5 || ox>b.MaxX-5){s.Position+=new BodyVector(TrackGeometry.Clamp(ox,b.MinX+5,b.MaxX-5)-ox,0,0);s.Velocity=new BodyVector(s.Velocity.X*-.3,s.Velocity.Y,s.Velocity.Z);}
      if(oz<b.MinZ+5 || oz>b.MaxZ-5){s.Position+=new BodyVector(0,0,TrackGeometry.Clamp(oz,b.MinZ+5,b.MaxZ-5)-oz);s.Velocity=new BodyVector(s.Velocity.X,s.Velocity.Y,s.Velocity.Z*-.3);}
    }
  }
}
