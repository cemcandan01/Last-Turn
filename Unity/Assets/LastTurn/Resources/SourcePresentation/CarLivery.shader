Shader "LastTurn/CarLivery"
{
    Properties {
        _Color ("Boya", Color) = (1,1,1,1)
        _Fender ("Çamurluk", Color) = (0,0,0,0)
        _Ink ("Çıkartma", Color) = (1,1,1,1)
        _Pattern ("Desen", Float) = 0
        _Showroom ("Vitrin dolgusu", Float) = 0
        _Fit ("Yerleşim", Vector) = (0,0,1,0)
        _Wheels ("Teker merkezleri", Vector) = (1,-1,.35,.9)
    }
    SubShader {
        Tags { "RenderType"="Opaque" }
        Cull Off
        Pass {
        Tags { "LightMode"="ForwardBase" }
        CGPROGRAM
        #pragma vertex vert
        #pragma fragment frag
        #pragma multi_compile_fog
        #pragma multi_compile_fwdbase
        #include "UnityCG.cginc"
        #include "Lighting.cginc"
        #include "AutoLight.cginc"
        float4x4 _MeshToCar;
        float4 _Color,_Fender,_Ink,_Fit,_Wheels;
        float _Pattern,_Showroom;
        struct Varying {
            float4 pos:SV_POSITION;
            float3 carPos:TEXCOORD0;
            float3 normal:TEXCOORD1;
            float3 world:TEXCOORD2;
            SHADOW_COORDS(3)
            UNITY_FOG_COORDS(4)
        };
        Varying vert(appdata_base v) {
            Varying o; o.pos=UnityObjectToClipPos(v.vertex);
            o.carPos=mul(_MeshToCar,v.vertex).xyz;
            o.world=mul(unity_ObjectToWorld,v.vertex).xyz;
            o.normal=UnityObjectToWorldNormal(v.normal);
            TRANSFER_SHADOW(o);
            UNITY_TRANSFER_FOG(o,o.pos);
            return o;
        }
        float insideBand(float x,float halfWidth) {
            float edge=max(.002,fwidth(x));
            return 1-smoothstep(halfWidth-edge,halfWidth+edge,abs(x));
        }
        fixed4 frag(Varying i):SV_Target {
            float3 p=i.carPos;
            float wheelZ=min(abs(p.z-_Wheels.x),abs(p.z-_Wheels.y));
            float arch=length(float2(wheelZ,(p.y-_Wheels.z)*.94));
            float outer=smoothstep(.58,.8,abs(p.x)/_Wheels.w);
            float fender=(1-smoothstep(_Wheels.z*1.9,_Wheels.z*1.93,arch))*outer*_Fender.a;
            float3 base=lerp(_Color.rgb,_Fender.rgb,fender);
            float decal=0;
            float z=(p.z-_Fit.x)/_Fit.z, y=(p.y-_Wheels.z-.24)/_Fit.z;
            if(_Pattern==1) { // İkiz boyuna şerit
                decal=insideBand(abs(p.x-_Fit.y)-.18*_Fit.z,.077*_Fit.z)*step(.35,p.y);
            } else if(_Pattern==2) { // İki yana doğru incelen kıvılcım
                float ridge=y-.11*z-.13*saturate((z+.2)*7);
                decal=insideBand(ridge,.105*saturate(1-abs(z)*.52))*insideBand(z,1.72)*outer;
            } else if(_Pattern==3) { // Kapıdaki damalı yarış bandı
                float cells=fmod(floor((z+2)*5)+floor((y+1)*5),2);
                decal=insideBand(z,.85)*insideBand(y,.20)*cells*outer;
            }
            float3 pigment=lerp(base,_Ink.rgb,saturate(decal));
            float3 n=normalize(i.normal), light=normalize(UnityWorldSpaceLightDir(i.world));
            float3 view=normalize(UnityWorldSpaceViewDir(i.world));
            float shade=SHADOW_ATTENUATION(i);
            float3 lit=max(.06,ShadeSH9(float4(n,1)))+_LightColor0.rgb*saturate(dot(n,light))*shade;
            lit=max(lit,_Showroom*(.48+.22*abs(n.x)+.14*saturate(n.y)));
            float gloss=pow(saturate(dot(reflect(-light,n),view)),28)*shade;
            float rim=pow(1-saturate(dot(n,view)),3);
            fixed4 color=fixed4(pigment*min(lit,1.12)+min(_LightColor0.rgb,1)*.13*gloss+unity_FogColor.rgb*.055*rim,1);
            UNITY_APPLY_FOG(i.fogCoord,color);
            return color;
        }
        ENDCG
        }
        UsePass "Legacy Shaders/VertexLit/SHADOWCASTER"
    }
    FallBack "Diffuse"
}
