using System;
using System.Collections.Generic;
using LastTurn.Core;
using UnityEngine;

namespace LastTurn.Prototype
{
  public static class TerrainCourseMesh
  {
    public static Mesh Build()
    {
      var world=new TerrainTestWorld();var vertices=new List<Vector3>();var asphalt=new List<int>();var dirt=new List<int>();
      for(int iz=0;iz<750;iz++)
      {
        double z0=-15+iz*.5,z1=z0+.5;
        // Rampa dudağı: sol limitte üst yüzey; sonraki şerit alttan başlar.
        double h0=world.Height(0,z0),h1=world.Height(0,z1==120?z1-1e-9:z1);
        for(int ix=0;ix<20;ix++)
        {
          double x0=-40+ix*4,x1=x0+4;int n=vertices.Count;
          vertices.Add(GtPresentation.Position(new BodyVector(x0,h0,z0)));vertices.Add(GtPresentation.Position(new BodyVector(x1,h0,z0)));
          vertices.Add(GtPresentation.Position(new BodyVector(x0,h1,z1)));vertices.Add(GtPresentation.Position(new BodyVector(x1,h1,z1)));
          var triangles=world.Surface((x0+x1)/2,z0)==0?dirt:asphalt;
          triangles.AddRange(new[]{n,n+1,n+2,n+1,n+3,n+2});
        }
      }
      var mesh=new Mesh{name="Arazi test zemini"};mesh.SetVertices(vertices);mesh.subMeshCount=2;
      mesh.SetTriangles(asphalt,0);mesh.SetTriangles(dirt,1);mesh.RecalculateNormals();mesh.RecalculateBounds();return mesh;
    }
  }
}
