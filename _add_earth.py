import os

path = os.path.join(os.getcwd(), "opening.html")
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# ============================================================
# 1) Insert Earth + atmosphere + ring after scene.add(stars)
# ============================================================
earth_code = """
      // ============================================================
      //  2b) \u5730\u7403 + \u661f\u73af
      // ============================================================
      var sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
      sunLight.position.set(5, 3, 5);
      scene.add(sunLight);
      scene.add(new THREE.AmbientLight(0x222244, 0.3));

      var earthGroup = new THREE.Group();
      scene.add(earthGroup);

      var earthGeom = new THREE.SphereGeometry(3, 64, 64);
      var earthMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          uniform float uTime;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vWorldPos;

          vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
          vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
          vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
          vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

          float snoise(vec3 v){
            const vec2 C=vec2(1.0/6.0,1.0/3.0);
            const vec4 D=vec4(0.0,0.5,1.0,2.0);
            vec3 i=floor(v+dot(v,C.yyy));
            vec3 x0=v-i+dot(i,C.xxx);
            vec3 g=step(x0.yzx,x0.xyz);
            vec3 l=1.0-g;
            vec3 i1=min(g.xyz,l.zxy);
            vec3 i2=max(g.xyz,l.zxy);
            vec3 x1=x0-i1+C.xxx;
            vec3 x2=x0-i2+C.yyy;
            vec3 x3=x0-D.yyy;
            i=mod289(i);
            vec4 p=permute(permute(permute(
              i.z+vec4(0.0,i1.z,i2.z,1.0))
              +i.y+vec4(0.0,i1.y,i2.y,1.0))
              +i.x+vec4(0.0,i1.x,i2.x,1.0));
            float n_=0.142857142857;
            vec3 ns=n_*D.wyz-D.xzx;
            vec4 j=p-49.0*floor(p*ns.z*ns.z);
            vec4 x_=floor(j*ns.z);
            vec4 y_=floor(j-7.0*x_);
            vec4 x=x_*ns.x+ns.yyyy;
            vec4 y=y_*ns.x+ns.yyyy;
            vec4 h=1.0-abs(x)-abs(y);
            vec4 b0=vec4(x.xy,y.xy);
            vec4 b1=vec4(x.zw,y.zw);
            vec4 s0=floor(b0)*2.0+1.0;
            vec4 s1=floor(b1)*2.0+1.0;
            vec4 sh=-step(h,vec4(0.0));
            vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
            vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
            vec3 p0=vec3(a0.xy,h.x);
            vec3 p1=vec3(a0.zw,h.y);
            vec3 p2=vec3(a1.xy,h.z);
            vec3 p3=vec3(a1.zw,h.w);
            vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
            p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
            vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
            m=m*m;
            return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
          }

          float fbm(vec3 p){
            float v=0.0,a=0.5;
            v+=a*snoise(p);p*=2.0;a*=0.5;
            v+=a*snoise(p);p*=2.0;a*=0.5;
            v+=a*snoise(p);p*=2.0;a*=0.5;
            v+=a*snoise(p);p*=2.0;a*=0.5;
            v+=a*snoise(p);p*=2.0;a*=0.5;
            v+=a*snoise(p);
            return v;
          }

          void main(){
            vec3 pos=normalize(vWorldPos);
            float continent=fbm(pos*1.8+vec3(5.3,7.1,2.4));
            float landMask=smoothstep(-0.05,0.15,continent);
            float lat=abs(pos.y);
            vec3 deepOcean=vec3(0.01,0.04,0.18);
            vec3 shallowOcean=vec3(0.02,0.12,0.35);
            vec3 ocean=mix(deepOcean,shallowOcean,smoothstep(-0.5,0.5,continent));
            vec3 grass=vec3(0.06,0.28,0.04);
            vec3 savanna=vec3(0.35,0.30,0.08);
            vec3 desert=vec3(0.50,0.40,0.20);
            vec3 tundra=vec3(0.30,0.32,0.28);
            vec3 ice=vec3(0.85,0.88,0.92);
            vec3 land=mix(grass,savanna,smoothstep(0.1,0.3,continent));
            land=mix(land,desert,smoothstep(0.3,0.5,continent)*smoothstep(0.1,0.4,lat));
            land=mix(land,tundra,smoothstep(0.5,0.7,lat));
            land=mix(land,ice,smoothstep(0.75,0.9,lat));
            vec3 color=mix(ocean,land,landMask);
            vec3 lightDir=normalize(vec3(1.0,0.5,0.8));
            float diff=max(dot(vNormal,lightDir),0.0);
            float amb=0.12;
            vec3 viewDir=normalize(cameraPosition-vWorldPos);
            vec3 halfDir=normalize(lightDir+viewDir);
            float spec=pow(max(dot(vNormal,halfDir),0.0),80.0)*(1.0-landMask)*0.4;
            color=color*(amb+diff*0.88)+vec3(0.8,0.9,1.0)*spec;
            gl_FragColor=vec4(color,1.0);
          }
        `
      });
      earthGroup.add(new THREE.Mesh(earthGeom, earthMat));

      // Atmosphere glow
      var atmosGeom = new THREE.SphereGeometry(3.08, 64, 64);
      var atmosMat = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          void main() {
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
            rim = pow(rim, 3.0);
            vec3 color = mix(vec3(0.3, 0.6, 1.0), vec3(0.1, 0.2, 0.8), rim);
            gl_FragColor = vec4(color, rim * 0.7);
          }
        `,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      earthGroup.add(new THREE.Mesh(atmosGeom, atmosMat));

      // Sparkling ring
      var RING_COUNT = 1500;
      var ringGeom = new THREE.BufferGeometry();
      var ringPos = new Float32Array(RING_COUNT * 3);
      var ringSizes = new Float32Array(RING_COUNT);
      var ringBright = new Float32Array(RING_COUNT);
      for (var ri = 0; ri < RING_COUNT; ri++) {
        var angle = Math.random() * Math.PI * 2;
        var radius = 4.2 + Math.random() * 1.8;
        var height = (Math.random() - 0.5) * 0.25;
        ringPos[ri*3] = Math.cos(angle) * radius;
        ringPos[ri*3+1] = height;
        ringPos[ri*3+2] = Math.sin(angle) * radius;
        ringSizes[ri] = 0.3 + Math.random() * 1.5;
        ringBright[ri] = Math.random();
      }
      ringGeom.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
      ringGeom.setAttribute('size', new THREE.BufferAttribute(ringSizes, 1));
      ringGeom.setAttribute('bright', new THREE.BufferAttribute(ringBright, 1));
      var ringMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() } },
        vertexShader: `
          attribute float size;
          attribute float bright;
          uniform float uPixelRatio;
          uniform float uTime;
          varying float vBright;
          void main() {
            vBright = bright;
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            float twinkle = 0.4 + 0.6 * sin(uTime * 3.0 + bright * 50.0);
            gl_PointSize = max(size * uPixelRatio * (60.0 / -mvPos.z) * twinkle, 0.0);
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          precision highp float;
          varying float vBright;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;
            float a = (1.0 - d * d) * 0.8;
            vec3 c = mix(vec3(0.5, 0.7, 1.0), vec3(1.0, 0.9, 0.6), vBright);
            gl_FragColor = vec4(c, a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      var ring = new THREE.Points(ringGeom, ringMat);
      ring.rotation.x = 0.35;
      earthGroup.add(ring);
"""

text = text.replace(
    "      scene.add(stars);\n\n",
    "      scene.add(stars);\n" + earth_code + "\n"
)
print("1. Earth inserted:", "earthGroup" in text)

# 2) Gather target Z offset (airplane forms in front of Earth)
text = text.replace(
    "gatherTarget[gi*3+2] = pt[2] * AIRPLANE_SCALE;",
    "gatherTarget[gi*3+2] = pt[2] * AIRPLANE_SCALE + 5.0;"
)
print("2. Gather Z offset:", "+ 5.0" in text)

# 3) FlyPath Z offset
text = text.replace(
    "start: new THREE.Vector3(0, 0, 0),\n        cp1: new THREE.Vector3(3.0, 3.0, 2.0),\n        cp2: new THREE.Vector3(7.0, 5.0, 4.0),\n        end: new THREE.Vector3(15, 8, 6)",
    "start: new THREE.Vector3(0, 0, 5),\n        cp1: new THREE.Vector3(3.0, 3.0, 7.0),\n        cp2: new THREE.Vector3(7.0, 5.0, 9.0),\n        end: new THREE.Vector3(15, 8, 11)"
)
print("3. FlyPath updated:", "new THREE.Vector3(0, 0, 5)" in text)

# 4) Animate loop: add Earth + ring rotation
text = text.replace(
    "        // \u661f\u661f\u65cb\u8f6c\n        stars.rotation.y = elapsed * 0.006;\n        stars.rotation.x = Math.sin(elapsed * 0.004) * 0.04;",
    "        // \u661f\u661f\u65cb\u8f6c\n        stars.rotation.y = elapsed * 0.006;\n        stars.rotation.x = Math.sin(elapsed * 0.004) * 0.04;\n\n        // \u5730\u7403\u65cb\u8f6c\n        earthGroup.rotation.y += dt * 0.08;\n        earthMat.uniforms.uTime.value = elapsed;\n        ringMat.uniforms.uTime.value = elapsed;"
)
print("4. Animate updated:", "earthGroup.rotation" in text)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("All done!")
