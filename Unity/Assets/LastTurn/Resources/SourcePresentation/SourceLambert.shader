Shader "LastTurn/SourceLambert"
{
  Properties { _Color("Renk",Color)=(1,1,1,1) _MainTex("Doku",2D)="white" {} _Lit("Lambert",Float)=1 _Cull("Yüz",Float)=2 _ZWrite("Derinlik",Float)=1 _DstBlend("Karışım",Float)=10 _ZTest("Derinlik sınaması",Float)=4 }
  SubShader
  {
    Tags { "RenderType"="Opaque" }
    Pass
    {
      Tags { "LightMode"="ForwardBase" }
      Cull [_Cull] ZWrite [_ZWrite] ZTest [_ZTest] Blend SrcAlpha [_DstBlend]
      CGPROGRAM
      #pragma vertex vert
      #pragma fragment frag
      #pragma multi_compile_fog
      #pragma multi_compile_fwdbase
      #include "UnityCG.cginc"
      #include "Lighting.cginc"
      #include "AutoLight.cginc"
      sampler2D _MainTex; float4 _MainTex_ST,_Color; float _Lit;
      struct input { float4 vertex:POSITION; float3 normal:NORMAL; float2 uv:TEXCOORD0; float4 color:COLOR; };
      struct output { float4 pos:SV_POSITION; float2 uv:TEXCOORD0; float4 color:COLOR; UNITY_FOG_COORDS(1) SHADOW_COORDS(2) float3 normal:TEXCOORD3; };
      output vert(input v) { output o;o.pos=UnityObjectToClipPos(v.vertex);o.uv=TRANSFORM_TEX(v.uv,_MainTex);o.normal=UnityObjectToWorldNormal(v.normal);o.color=v.color*_Color;UNITY_TRANSFER_FOG(o,o.pos);TRANSFER_SHADOW(o);return o; }
      fixed4 frag(output i):SV_Target { fixed4 c=tex2D(_MainTex,i.uv)*i.color;float3 n=normalize(i.normal);float3 light=ShadeSH9(float4(n,1))+_LightColor0.rgb*max(0,dot(n,_WorldSpaceLightPos0.xyz))*SHADOW_ATTENUATION(i);c.rgb*=lerp(float3(1,1,1),light,_Lit);UNITY_APPLY_FOG(i.fogCoord,c);return c; }
      ENDCG
    }
    Pass
    {
      Tags { "LightMode"="ForwardAdd" }
      Cull [_Cull] ZWrite Off Blend One One
      CGPROGRAM
      #pragma vertex vert
      #pragma fragment frag
      #pragma multi_compile_fwdadd_fullshadows
      #pragma multi_compile_fog
      #include "UnityCG.cginc"
      #include "Lighting.cginc"
      #include "AutoLight.cginc"
      sampler2D _MainTex;float4 _MainTex_ST,_Color;float _Lit;
      struct input {float4 vertex:POSITION;float3 normal:NORMAL;float2 uv:TEXCOORD0;float4 color:COLOR;};
      struct output {float4 pos:SV_POSITION;float2 uv:TEXCOORD0;float3 normal:TEXCOORD1;float3 world:TEXCOORD2;float4 color:COLOR;LIGHTING_COORDS(3,4) UNITY_FOG_COORDS(5)};
      output vert(input v){output o;o.pos=UnityObjectToClipPos(v.vertex);o.world=mul(unity_ObjectToWorld,v.vertex).xyz;o.normal=UnityObjectToWorldNormal(v.normal);o.uv=TRANSFORM_TEX(v.uv,_MainTex);o.color=v.color*_Color;TRANSFER_VERTEX_TO_FRAGMENT(o);UNITY_TRANSFER_FOG(o,o.pos);return o;}
      fixed4 frag(output i):SV_Target {UNITY_LIGHT_ATTENUATION(a,i,i.world);fixed4 c=tex2D(_MainTex,i.uv)*i.color;c.rgb*=_Lit*_LightColor0.rgb*max(0,dot(normalize(i.normal),normalize(UnityWorldSpaceLightDir(i.world))))*a*c.a;UNITY_APPLY_FOG_COLOR(i.fogCoord,c,fixed4(0,0,0,0));return c;}
      ENDCG
    }
    UsePass "Legacy Shaders/VertexLit/SHADOWCASTER"
  }
}
