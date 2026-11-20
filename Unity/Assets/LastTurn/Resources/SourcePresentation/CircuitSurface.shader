Shader "LastTurn/CircuitSurface"
{
 Properties {
   _Color("Renk",Color)=(1,1,1,1)
   _MainTex("Doku",2D)="white" {}
   _Mode("Yüzey",Float)=0
   _Cull("Yüz",Float)=2
 }
 SubShader {
 Tags {"RenderType"="Opaque"}
 Cull [_Cull]
 LOD 200
 CGPROGRAM
 #pragma surface surf Standard fullforwardshadows addshadow vertex:vert
 #pragma target 3.0
 float4 _Color;float _Mode;
 struct Input {float3 worldPos;float4 color:COLOR;float2 uv_MainTex;};
 float hash(float2 p){return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453);}
 float noise(float2 p){float2 a=floor(p),f=frac(p);f=f*f*(3-2*f);return lerp(lerp(hash(a),hash(a+float2(1,0)),f.x),lerp(hash(a+float2(0,1)),hash(a+1),f.x),f.y);}
 void vert(inout appdata_full v){if(_Mode>.5 && _Mode<1.5 && v.normal.y<0)v.normal=-v.normal;}
 void surf(Input i,inout SurfaceOutputStandard o){
   float2 p=i.worldPos.xz;float broad=noise(p*.14),grain=noise(p*15);
   float distanceFade=1-saturate(length(_WorldSpaceCameraPos-i.worldPos)/100);
   float3 albedo;
   if(_Mode<.5){
     albedo=lerp(float3(.15,.20,.075),float3(.27,.34,.13),broad);
     albedo*=.9+.18*noise(p*1.8)+.08*(grain-.5)*distanceFade;
   }else if(_Mode<1.5){
     albedo=float3(.16,.17,.18)*(.82+.24*noise(p*.8)+.12*grain*distanceFade);
     albedo*=1-.18*pow(saturate(noise(p*.22)),7);
   }else if(_Mode<2.5){
     clip((1-i.uv_MainTex.x)*.95-noise(p*3));
     albedo=lerp(float3(.16,.13,.09),float3(.31,.27,.18),broad)*(.9+.15*grain);
   }else{
     albedo=i.color.rgb*_Color.rgb*(.8+.3*noise(p*.9));
   }
   o.Albedo=albedo;o.Metallic=0;o.Smoothness=_Mode>.5 && _Mode<1.5?.19:.06;o.Occlusion=1;o.Alpha=1;
 }
 ENDCG
 }
 FallBack "Diffuse"
}
