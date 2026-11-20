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
        #pragma target 3.0
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
        float4 _Layer0,_Layer1,_Layer2,_Pose0,_Pose1,_Pose2,_Tint0,_Tint1,_Tint2;
        float _Size0,_Size1,_Size2;
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
        float segment(float2 p,float2 halfSize) {
            float2 d=abs(p)-halfSize;return 1-smoothstep(-.012,.012,max(d.x,d.y));
        }
        float numeral(float2 p,float value) {
            int d=(int)value;float s=0;
            if(d!=1 && d!=4)s=max(s,segment(p-float2(0,.37),float2(.155,.035)));
            if(d!=1 && d!=4 && d!=7)s=max(s,segment(p+float2(0,.37),float2(.155,.035)));
            if(d!=0 && d!=1 && d!=7)s=max(s,segment(p,float2(.15,.034)));
            if(d!=5 && d!=6)s=max(s,segment(p-float2(.15,.18),float2(.034,.16)));
            if(d!=2)s=max(s,segment(p-float2(.15,-.18),float2(.034,.16)));
            if(d==0 || d==2 || d==6 || d==8)s=max(s,segment(p-float2(-.15,-.18),float2(.034,.16)));
            if(d!=1 && d!=2 && d!=3 && d!=7)s=max(s,segment(p-float2(-.15,.18),float2(.034,.16)));
            return s;
        }
        float layerMask(float3 p,float4 layer,float4 pose,float size,float edge) {
            if(layer.x<.5)return 0;
            float top=layer.y<.5;
            float side=layer.y<1.5?-1:1;
            float front=max(abs(_Wheels.x),abs(_Wheels.y));
            float2 q;
            if(top)q=float2(p.x-pose.x*_Wheels.w,p.z-pose.y*(front+.55));
            else q=float2((p.z-pose.x*(front+.55))*(layer.z>.5?sign(p.x):side),p.y-_Wheels.z-.45-pose.y*.42);
            q=float2(q.x*pose.z+q.y*pose.w,-q.x*pose.w+q.y*pose.z)/max(size,.2);
            float area=top?(1-smoothstep(.78,1.0,edge))*step(_Wheels.z+.16,p.y):
                           smoothstep(.72,.91,edge)*(layer.z>.5?1:step(0,p.x*side));
            float ink;
            if(layer.x<1.5)ink=insideBand(abs(q.x)-.13,.058)*insideBand(q.y,.57);
            else if(layer.x<2.5){
                q/=.53;
                ink=max(numeral(q+float2(.23,0),floor(layer.w/10)),numeral(q-float2(.23,0),fmod(layer.w,10)));
            }else{
                float diamond=abs(q.x)*.70+abs(q.y);
                ink=max(insideBand(diamond-.17,.022),insideBand(q.y+.38*abs(q.x)-.025,.022)*insideBand(q.x,.16));
            }
            return saturate(ink*area);
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
            if(_Pattern==4)decal=insideBand(abs(p.x-_Fit.y)-.23*_Fit.z,.045*_Fit.z)*step(.35,p.y)+insideBand(y+.17*z,.045)*outer;
            if(_Pattern==5)decal=insideBand(y,.28)*insideBand(z,1.35)*step(.5,fmod(floor((z+2)*8)+floor((y+1)*8),2))*outer;
            if(_Pattern==6){float bolt=y-.22*z-.09*sin(z*8);decal=insideBand(bolt,.06)*insideBand(z,1.6)*outer+insideBand(abs(p.x-_Fit.y)-.32*_Fit.z,.045*_Fit.z)*step(.35,p.y);}
            float3 pigment=lerp(base,_Ink.rgb,saturate(decal));
            float edge=abs(p.x)/_Wheels.w;
            pigment=lerp(pigment,_Tint0.rgb,layerMask(p,_Layer0,_Pose0,_Size0,edge));
            pigment=lerp(pigment,_Tint1.rgb,layerMask(p,_Layer1,_Pose1,_Size1,edge));
            pigment=lerp(pigment,_Tint2.rgb,layerMask(p,_Layer2,_Pose2,_Size2,edge));
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
