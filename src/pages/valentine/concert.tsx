"use client";

// ——————————————————————————————————————————————
//  PENTAKILL CONCERT EXPERIENCE — extracted from Valentine.tsx
// ——————————————————————————————————————————————

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF, Environment, MeshReflectorMaterial, OrbitControls, SpotLight, useTexture, MeshPortalMaterial } from "@react-three/drei";
import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AnimationMixer,
  CanvasTexture,
  CatmullRomCurve3,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  Group,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
  Vector3,
  Vector4,
} from "three";
import gsap from "gsap";
import { motion, AnimatePresence } from "framer-motion";

import { cleanAnimations, useIsMobile } from "./helpers";
import {
  PENTAKILL_KARTHUS,
  PENTAKILL_MORDEKAISER,
  PENTAKILL_OLAF,
  PENTAKILL_SONA,
  PENTAKILL_YORICK,
  COVEN_NAMI,
  CONCERT_STAGE_GLB,
  DRUM_SET_GLB,
  GUITAR_AMP_GLB,
  SPOT_LIGHT_GLB,
  CONCERT_MUSIC_SRC,
  BARON_GLB,
  DRAGON_ELDER_GLB,
} from "./data";

// ——————————————————————————————————————————————
//  Band members & camera choreography
// ——————————————————————————————————————————————

const BAND_MEMBERS: { glb: string; pos: [number, number, number]; rot: [number, number, number]; scale: number; name: string; anims?: string | string[]; timeScale?: number; floats?: boolean }[] = [
  { glb: PENTAKILL_KARTHUS, pos: [0, -4, 8], rot: [0, 0, 0], scale: 0.018, name: "Karthus", anims: ["Idle2_Base"], timeScale: 0.1, floats: true },
  { glb: PENTAKILL_SONA, pos: [-10, -3, -10], rot: [0, 0.3, 0], scale: 0.018, name: "Sona", anims: ["Sona_Idle_Base"], timeScale: 0.1, floats: true },
  { glb: PENTAKILL_MORDEKAISER, pos: [5, -4, -2], rot: [0, -0.3, 0], scale: 0.018, name: "Mordekaiser", anims: ["recall.anm"], timeScale: 0.1 },
  { glb: PENTAKILL_YORICK, pos: [-5, -4, -2], rot: [0, 0.5, 0], scale: 0.018, name: "Yorick", anims: ["DanceLoop"], timeScale: 0.1 },
  { glb: PENTAKILL_OLAF, pos: [11.5, -2.6, -12], rot: [0, -0.5, 0], scale: 0.018, name: "Olaf", anims: ["Channel"], timeScale: 0.1 },
  { glb: COVEN_NAMI, pos: [0, -5, -10], rot: [0, 0, 0], scale: 0.068, name: "Nami", anims: ["Run_Haste"], timeScale: 0.1, floats: true },
];

const CONCERT_SHOTS: { pos: [number, number, number]; lookAt: [number, number, number]; dur: number; ease?: string; cut?: boolean }[] = [
  { pos: [0, 5, 25], lookAt: [0, -2, -2], dur: 6, ease: "power2.inOut" },
  { pos: [3, 0, 11], lookAt: [0, 0, 8], dur: 4, ease: "power2.inOut" },
  { pos: [20, 4, 18], lookAt: [0, -2, -2], dur: 5, ease: "power1.inOut" },
  { pos: [-20, 4, 18], lookAt: [0, -2, -2], dur: 5, ease: "power1.inOut" },
  { pos: [-2, -2, 4], lookAt: [-5, -3, -2], dur: 4, ease: "power2.inOut" },
  { pos: [-3, -2.5, 1], lookAt: [-5, -2.5, -2], dur: 3.5, ease: "power2.inOut" },
  { pos: [2, 1, 4], lookAt: [5, 0.5, -2], dur: 4, ease: "power2.inOut" },
  { pos: [-5, -1, -3], lookAt: [-10, -2, -10], dur: 4.5, ease: "power1.inOut" },
  { pos: [-7, -2, -6], lookAt: [-10, -1.5, -10], dur: 3.5, ease: "power2.inOut" },
  { pos: [6, 1, -3], lookAt: [10, 0.5, -10], dur: 4 },
  { pos: [8, -0.5, -6], lookAt: [10, 1, -10], dur: 3.5, ease: "power2.inOut" },
  { pos: [20, 4, 18], lookAt: [0, -2, -2], dur: 5, ease: "power1.inOut" },
  { pos: [-20, 4, 18], lookAt: [0, -2, -2], dur: 5, ease: "power1.inOut" },
  { pos: [0, 0, 11], lookAt: [0, 0, 8], dur: 4, ease: "power2.inOut" },
  { pos: [0, 6, 30], lookAt: [0, -2, -2], dur: 6, ease: "power2.inOut" },
];

// ——————————————————————————————————————————————
//  Band member model
// ——————————————————————————————————————————————

function PentakillModel({ glbPath, position, rotation, scale, anims, timeScale = 1 }: {
  glbPath: string; position: [number, number, number]; rotation: [number, number, number]; scale: number;
  anims?: string | string[]; timeScale?: number;
}) {
  const { scene, animations } = useGLTF(glbPath);
  const groupRef = useRef<Group>(null);
  const safeAnims = useMemo(() => cleanAnimations(animations, scene), [animations, scene]);
  const { actions, names } = useAnimations(safeAnims, groupRef);
  const started = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { scene.scale.setScalar(scale); }, [scene, scale]);

  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material instanceof MeshStandardMaterial) {
          o.material.envMapIntensity = 1.5;
        }
      }
    });
  }, [scene]);

  useEffect(() => {
    if (started.current || names.length === 0) return;
    started.current = true;

    console.log(`[PentakillModel] ${glbPath} — animaciones:`, names);

    const animList: string[] = anims
      ? (typeof anims === "string" ? [anims] : anims).filter((a) => names.includes(a))
      : [];

    if (animList.length === 0) animList.push(names[0]);

    if (animList.length === 1) {
      const a = actions[animList[0]];
      if (a) { a.timeScale = timeScale; a.reset().play(); a.setLoop(2201, Infinity); }
    } else {
      let cancelled = false;

      const playRandom = () => {
        if (cancelled) return;
        Object.values(actions).forEach((a) => a?.fadeOut(0.4));
        const pick = animList[Math.floor(Math.random() * animList.length)];
        const a = actions[pick];
        if (a) {
          a.timeScale = timeScale;
          a.reset().fadeIn(0.4).play();
          a.clampWhenFinished = true;
          a.setLoop(2200, 1);
          const dur = (a.getClip().duration / timeScale) * 1000;
          timerRef.current = setTimeout(playRandom, dur + 100);
        }
      };

      playRandom();

      return () => {
        cancelled = true;
        started.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        Object.values(actions).forEach((a) => a?.stop());
      };
    }

    return () => {
      started.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [actions, names, anims, timeScale, glbPath]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={scene} />
    </group>
  );
}

// ——————————————————————————————————————————————
//  Procedural volumetric fire
// ——————————————————————————————————————————————

function createFireGradient(): HTMLCanvasElement {
  const w = 512, h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const data = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      const v = y / (h - 1);
      const radial = 1 - u * u * (3 - 2 * u);
      const height = v * v * (3 - 2 * v);
      const intensity = radial * height;
      const r = Math.min(255, (intensity * 1.2 * 255) | 0);
      const g = Math.min(255, (intensity * v * 0.85 * 255) | 0);
      const b = Math.min(255, (intensity * v * v * 0.35 * 255) | 0);
      const a = Math.min(255, (intensity * 255) | 0);
      const i = (y * w + x) * 4;
      data.data[i] = r;
      data.data[i + 1] = g;
      data.data[i + 2] = b;
      data.data[i + 3] = a;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

let _cachedFireTex: CanvasTexture | null = null;
function getFireTexture(): CanvasTexture {
  if (!_cachedFireTex) {
    _cachedFireTex = new CanvasTexture(createFireGradient());
    _cachedFireTex.magFilter = LinearFilter;
    _cachedFireTex.minFilter = LinearFilter;
    _cachedFireTex.wrapS = ClampToEdgeWrapping;
    _cachedFireTex.wrapT = ClampToEdgeWrapping;
  }
  return _cachedFireTex;
}

const SIMPLEX_NOISE_GLSL = /* glsl */ `
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
}`;

class FireMaterial extends ShaderMaterial {
  constructor() {
    super({
      defines: { ITERATIONS: "40", OCTIVES: "4" },
      uniforms: {
        fireTex: { value: null },
        color: { value: new Color(0xeeeeee) },
        time: { value: 0.0 },
        seed: { value: 0.0 },
        invModelMatrix: { value: new Matrix4() },
        scale: { value: new Vector3(1, 1, 1) },
        noiseScale: { value: new Vector4(1, 2, 1, 0.3) },
        magnitude: { value: 1.8 },
        lacunarity: { value: 3.0 },
        gain: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        }`,
      fragmentShader: `
        ${SIMPLEX_NOISE_GLSL}
        uniform vec3 color;
        uniform float time;
        uniform float seed;
        uniform mat4 invModelMatrix;
        uniform vec3 scale;
        uniform vec4 noiseScale;
        uniform float magnitude;
        uniform float lacunarity;
        uniform float gain;
        uniform sampler2D fireTex;
        varying vec3 vWorldPos;

        float turbulence(vec3 p) {
          float sum = 0.0;
          float freq = 1.0;
          float amp = 1.0;
          for(int i = 0; i < OCTIVES; i++) {
            sum += abs(snoise(p * freq)) * amp;
            freq *= lacunarity;
            amp *= gain;
          }
          return sum;
        }

        vec4 samplerFire(vec3 p, vec4 sc) {
          vec2 st = vec2(sqrt(dot(p.xz, p.xz)), p.y);
          if(st.x <= 0.0 || st.x >= 1.0 || st.y <= 0.0 || st.y >= 1.0) return vec4(0.0);
          p.y -= (seed + time) * sc.w;
          p *= sc.xyz;
          st.y += sqrt(st.y) * magnitude * turbulence(p);
          if(st.y <= 0.0 || st.y >= 1.0) return vec4(0.0);
          return texture2D(fireTex, st);
        }

        vec3 localize(vec3 p) {
          return (invModelMatrix * vec4(p, 1.0)).xyz;
        }

        void main() {
          vec3 rayPos = vWorldPos;
          vec3 rayDir = normalize(rayPos - cameraPosition);
          float rayLen = 0.012 * length(scale);
          vec4 col = vec4(0.0);
          for(int i = 0; i < ITERATIONS; i++) {
            rayPos += rayDir * rayLen;
            vec3 lp = localize(rayPos);
            lp.y += 0.5;
            lp.xz *= 2.0;
            col += samplerFire(lp, noiseScale);
          }
          col.a = col.r;
          gl_FragColor = col;
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
  }
}

function Fire({ color, ...props }: { color?: Color; billboard?: boolean; position?: [number, number, number]; scale?: number | [number, number, number] }) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<FireMaterial | null>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const mat = new FireMaterial();
    mesh.material = mat;
    matRef.current = mat;

    mat.uniforms.fireTex.value = getFireTexture();
    mat.uniforms.color.value = color || new Color(0xeeeeee);
    mat.uniforms.seed.value = Math.random() * 19.19;
  }, [color]);

  useFrame((state) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    mesh.updateMatrixWorld();
    mat.uniforms.invModelMatrix.value.copy(mesh.matrixWorld).invert();
    mat.uniforms.time.value = state.clock.elapsedTime;
    mat.uniforms.scale.value = mesh.scale;
  });

  return (
    <mesh ref={meshRef} {...props}>
      <boxGeometry />
    </mesh>
  );
}

// ——————————————————————————————————————————————
//  Lights
// ——————————————————————————————————————————————

function FixedSpot({ position, target, color, intensity = 15, angle = 0.4, penumbra = 0.6 }: {
  position: [number, number, number]; target: [number, number, number]; color: string;
  intensity?: number; angle?: number; penumbra?: number;
}) {
  const lightRef = useRef<any>(null);
  const targetObj = useMemo(() => {
    const obj = new Object3D();
    obj.position.set(...target);
    return obj;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[1], target[2]]);

  useEffect(() => {
    if (lightRef.current) lightRef.current.target = targetObj;
  }, [targetObj]);

  return (
    <group>
      <spotLight ref={lightRef} position={position} color={color} intensity={intensity} angle={angle} penumbra={penumbra} distance={25} />
      <primitive object={targetObj} />
    </group>
  );
}

function MovingSpot({ vec = new Vector3(), ...props }: { vec?: Vector3;[key: string]: unknown }) {
  const light = useRef<any>(null);
  const viewport = useThree((state) => state.viewport);
  useFrame((state) => {
    if (!light.current) return;
    light.current.target.position.lerp(
      vec.set((state.pointer.x * viewport.width) / 2, (state.pointer.y * viewport.height) / 2, 0),
      0.1,
    );
    light.current.target.updateMatrixWorld();
  });
  return (
    <SpotLight
      castShadow
      ref={light}
      penumbra={1}
      distance={6}
      angle={0.35}
      attenuation={5}
      anglePower={4}
      intensity={2}
      {...props}
    />
  );
}

function ConcertGround() {
  const [floor, normal] = useTexture([
    "public/images/surface/SurfaceImperfections003_1K_Normal.jpg",
    "public/images/Surface/SurfaceImperfections003_1K_Normal.jpg",
  ]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 2]}>
      <planeGeometry args={[20, 20]} />
      <MeshReflectorMaterial
        resolution={512}
        blur={[400, 100]}
        mixBlur={6}
        mixStrength={1.5}
        mirror={0.5}
        color="#00000020"
        metalness={0.4}
        roughnessMap={floor}
        normalMap={normal}
        normalScale={[2, 2]}
      />
    </mesh>
  );
}

function SpotLampMovingVolumetric({ position, color = "#ffffff", intensity = 2, lampScale = 1 }: {
  position: [number, number, number]; color?: string; intensity?: number;
  lampScale?: number;
}) {
  const { scene } = useGLTF(SPOT_LIGHT_GLB);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const light = useRef<any>(null);
  const lampRef = useRef<Group>(null);
  const viewport = useThree((state) => state.viewport);
  const _targetWorld = useMemo(() => new Vector3(), []);

  useEffect(() => {
    cloned.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.envMapIntensity = 1.5;
      }
    });
  }, [cloned]);

  useFrame((state) => {
    if (!light.current) return;
    _targetWorld.set(
      (state.pointer.x * viewport.width) / 2,
      (state.pointer.y * viewport.height) / 2,
      0,
    );
    light.current.target.position.lerp(_targetWorld, 0.1);
    light.current.target.updateMatrixWorld();

    if (lampRef.current) {
      const targetPos = light.current.target.position.clone();
      lampRef.current.parent?.worldToLocal(targetPos);
      lampRef.current.lookAt(targetPos);
    }
  });

  return (
    <group position={position}>
      <group ref={lampRef}>
        <primitive object={cloned} scale={lampScale} />
        <SpotLight
          ref={light}
          position={[0, -0.45, 0.01]}
          penumbra={1}
          distance={15}
          angle={0.35}
          attenuation={5}
          anglePower={4}
          intensity={intensity}
          color={color}
        />
      </group>
    </group>
  );
}

function SpotLampMovingNative({ position, color = "#ffffff", intensity = 80, lampScale = 1 }: {
  position: [number, number, number]; color?: string; intensity?: number;
  lampScale?: number;
}) {
  const { scene } = useGLTF(SPOT_LIGHT_GLB);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const light = useRef<any>(null);
  const lampRef = useRef<Group>(null);
  const viewport = useThree((state) => state.viewport);
  const _targetWorld = useMemo(() => new Vector3(), []);
  const targetObj = useMemo(() => new Object3D(), []);

  useEffect(() => {
    cloned.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.envMapIntensity = 1.5;
      }
    });
  }, [cloned]);

  useEffect(() => {
    if (light.current) light.current.target = targetObj;
  }, [targetObj]);

  useFrame((state) => {
    if (!light.current) return;
    _targetWorld.set(
      (state.pointer.x * viewport.width) / 2,
      (state.pointer.y * viewport.height) / 2,
      0,
    );
    targetObj.position.lerp(_targetWorld, 0.1);
    targetObj.updateMatrixWorld();

    if (lampRef.current) {
      const targetPos = targetObj.position.clone();
      lampRef.current.parent?.worldToLocal(targetPos);
      lampRef.current.lookAt(targetPos);
    }
  });

  return (
    <group position={position}>
      <group ref={lampRef}>
        <primitive object={cloned} scale={lampScale} />
        <spotLight
          ref={light}
          position={[0, -0.45, 0.01]}
          color={color}
          intensity={intensity}
          distance={50}
          angle={0.5}
          penumbra={0.8}
          decay={1}
        />
      </group>
      <primitive object={targetObj} />
    </group>
  );
}

function SpotLampFixed({ position, target, color = "#ffffff", intensity = 15, angle = 0.4, penumbra = 0.6, lampScale = 1, lampRotation = [0, 0, 0] as [number, number, number] }: {
  position: [number, number, number]; target: [number, number, number]; color?: string;
  intensity?: number; angle?: number; penumbra?: number;
  lampScale?: number; lampRotation?: [number, number, number];
}) {
  const { scene } = useGLTF(SPOT_LIGHT_GLB);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const lightRef = useRef<any>(null);
  const targetObj = useMemo(() => {
    const obj = new Object3D();
    obj.position.set(...target);
    return obj;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[1], target[2]]);

  useEffect(() => {
    if (lightRef.current) lightRef.current.target = targetObj;
  }, [targetObj]);

  useEffect(() => {
    cloned.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.envMapIntensity = 1.5;
      }
    });
  }, [cloned]);

  return (
    <group position={position}>
      <primitive object={cloned} scale={lampScale} rotation={lampRotation} />
      <spotLight ref={lightRef} color={color} intensity={intensity} angle={angle} penumbra={penumbra} distance={25} />
      <primitive object={targetObj} />
    </group>
  );
}

function ConcertLights() {
  return (
    <>
      <SpotLampMovingVolumetric position={[14, 7.5, 3.7]} color="#00ff00" intensity={2} lampScale={0.5} />
      <SpotLampMovingVolumetric position={[5, 7.5, 3.7]} color="#00ff00" intensity={2} lampScale={0.5} />
      <SpotLampMovingVolumetric position={[-5, 7.5, 3.7]} color="#00ff00" intensity={2} lampScale={0.5} />
      <SpotLampMovingVolumetric position={[-14, 7.5, 3.7]} color="#00ff00" intensity={2} lampScale={0.5} />
      <SpotLampMovingNative position={[14, 7.5, -13.5]} color="#00ff00" intensity={80} lampScale={0.5} />
      <SpotLampMovingNative position={[5, 7.5, -13.5]} color="#00ff00" intensity={80} lampScale={0.5} />
      <SpotLampMovingNative position={[-5, 7.5, -13.5]} color="#00ff00" intensity={80} lampScale={0.5} />
      <SpotLampMovingNative position={[-14, 7.5, -13.5]} color="#00ff00" intensity={80} lampScale={0.5} />
      <ambientLight intensity={1} color="#1a0030" />
      <hemisphereLight color="#2a0845" groundColor="#0a0010" intensity={0.12} />
    </>
  );
}

// ——————————————————————————————————————————————
//  Camera choreography
// ——————————————————————————————————————————————

function ConcertCameraChoreography() {
  const { camera } = useThree();
  const shotIndex = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const lookAtTarget = useRef(new Vector3(0, 1.5, 2));
  const lookAtSmooth = useRef(new Vector3(0, 1.5, 2));

  const playNextShot = useCallback(() => {
    const idx = shotIndex.current % CONCERT_SHOTS.length;
    const shot = CONCERT_SHOTS[idx];
    const nextIdx = (idx + 1) % CONCERT_SHOTS.length;
    const nextShot = CONCERT_SHOTS[nextIdx];

    const startPos = camera.position.clone();
    const targetPos = new Vector3(...shot.pos);
    const nextPos = new Vector3(...nextShot.pos);

    const startLookAt = lookAtTarget.current.clone();
    const targetLookAt = new Vector3(...shot.lookAt);

    if (shot.cut) {
      const prog = { t: 0 };
      tweenRef.current = gsap.to(prog, {
        t: 1,
        duration: 0.3,
        ease: "power3.out",
        onUpdate: () => {
          camera.position.lerpVectors(startPos, targetPos, prog.t);
          lookAtTarget.current.lerpVectors(startLookAt, targetLookAt, prog.t);
        },
        onComplete: () => {
          tweenRef.current = gsap.delayedCall(shot.dur, () => {
            shotIndex.current++;
            playNextShot();
          });
        },
      });
    } else {
      const mid = startPos.clone().lerp(targetPos, 0.5);
      mid.y += 0.6;

      const overshoot = targetPos.clone().lerp(nextPos, 0.1);
      const curve = new CatmullRomCurve3([startPos, mid, targetPos, overshoot]);

      const prog = { t: 0 };
      tweenRef.current = gsap.to(prog, {
        t: 1,
        duration: shot.dur,
        ease: shot.ease ?? "power2.inOut",
        onUpdate: () => {
          const p = curve.getPointAt(Math.min(prog.t, 1));
          camera.position.copy(p);
          lookAtTarget.current.lerpVectors(startLookAt, targetLookAt, prog.t);
        },
        onComplete: () => {
          shotIndex.current++;
          playNextShot();
        },
      });
    }
  }, [camera]);

  useEffect(() => {
    camera.position.set(0, 3, 20);
    lookAtTarget.current.set(0, 1.5, 2);
    lookAtSmooth.current.set(0, 1.5, 2);
    camera.lookAt(lookAtTarget.current);

    const startDelay = gsap.delayedCall(1, () => playNextShot());
    return () => {
      startDelay.kill();
      if (tweenRef.current) tweenRef.current.kill();
    };
  }, [camera, playNextShot]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const swayX = Math.sin(t * 0.8) * 0.008 + Math.sin(t * 2.1) * 0.004;
    const swayY = Math.cos(t * 0.7) * 0.006 + Math.sin(t * 1.9) * 0.003;
    camera.position.x += swayX;
    camera.position.y += swayY;

    lookAtSmooth.current.lerp(lookAtTarget.current, 0.06);
    camera.lookAt(lookAtSmooth.current);
  });

  return null;
}

// ——————————————————————————————————————————————
//  Static props & portal cards
// ——————————————————————————————————————————————

function StaticProp({ glbPath, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: {
  glbPath: string; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number;
}) {
  const { scene } = useGLTF(glbPath);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    cloned.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material instanceof MeshStandardMaterial) {
          o.material.envMapIntensity = 1.5;
        }
      }
    });
  }, [cloned]);

  return (
    <primitive object={cloned} position={position} rotation={rotation} scale={scale} />
  );
}

function PortalModel({ glb, scale: s = 1, position: p = [0, 0, 0] as [number, number, number], anim, timeScale = 1 }: {
  glb: string; scale?: number; position?: [number, number, number];
  anim?: string; timeScale?: number;
}) {
  const { scene, animations } = useGLTF(glb);
  const mixerRef = useRef<AnimationMixer | null>(null);

  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.envMapIntensity = 1.5;
      }
    });
  }, [scene]);

  useEffect(() => {
    if (animations.length === 0) return;
    const mixer = new AnimationMixer(scene);
    mixerRef.current = mixer;

    const clipNames = animations.map((c) => c.name);
    const target = anim && clipNames.includes(anim) ? anim : clipNames[0];
    const clip = animations.find((c) => c.name === target);
    if (clip) {
      const action = mixer.clipAction(clip);
      action.timeScale = timeScale;
      action.play();
    }

    return () => { mixer.stopAllAction(); mixerRef.current = null; };
  }, [scene, animations, anim, timeScale]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return (
    <primitive object={scene} scale={s} position={p} />
  );
}

function PortalCard({ glb, bgColor, width = 2.8, height = 1.6, modelScale = 1, modelPos = [0, 0, -2] as [number, number, number], anim, timeScale = 1, ...props }: {
  glb: string; bgColor: string; width?: number; height?: number;
  modelScale?: number; modelPos?: [number, number, number];
  anim?: string; timeScale?: number;
  position?: [number, number, number]; rotation?: [number, number, number];
}) {
  return (
    <group {...props}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <MeshPortalMaterial side={DoubleSide} blur={0} resolution={256} worldUnits>
          <color attach="background" args={[bgColor]} />
          <ambientLight intensity={1.5} />
          <directionalLight position={[3, 5, 4]} intensity={2.5} />
          <hemisphereLight color="#ffffff" groundColor="#333344" intensity={0.8} />
          <PortalModel glb={glb} scale={modelScale} position={modelPos} anim={anim} timeScale={timeScale} />
        </MeshPortalMaterial>
      </mesh>
    </group>
  );
}

// ——————————————————————————————————————————————
//  Song lyrics
// ——————————————————————————————————————————————

const SONG_LYRICS = `[Intro]
Feliz Valentín
Feliz Valentín
Tin tin tinnnnn
Tin tin tinnnnn

[Verse]
Cada día contigo
Es un regalo sin fin
Jugando Lolcito
Mi Valentínnnnn
pedimos algo de comer watonaaaaaaa
si waton, si watonnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn

[Pre-Chorus]
Felizzzzzz
Felizzzzzz
asi me teniiiiiiiii
asi me teniiiiiiiiiiiiiiiiii

[Chorus]
Feliz Valentín,
Eres todo para mí
Tin tin tinnnnn suena el corazón
Feliz 14 amor
Felizzzzzz
Tú eres mi Valentín
Felizzzzzz
No quiero otro fin

[Breakdown]
Tú, eres, mi, Valentín
Tú, eres, mi, Valentín
Tin tin tinnnnn
Feliz 14

[Verse 2]
Cada día contigo
Es un regalo sin fin
Jugando Lolcito
Mi Valentínnnnn
pedimos algo de comer watonaaaaaaa
si waton, si watonnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn

[Pre-Chorus]
Felizzzzzz
Felizzzzzz
asi me teniiiiiiiii
asi me teniiiiiiiiiiiiiiiiii

[Chorus]
Feliz Valentín,
Eres todo para mí
Tin tin tinnnnn suena el corazón
Feliz 14 amor,
Felizzzzzz
Tú eres mi Valentín
Felizzzzzz
No quiero otro fin

[Bridge]
Si dudas, mírame aquí
Si temes, te hago sentir
Que cada día es 14
Porque tú, eres mi Valentín

[Chorus]
Feliz Valentín,
Eres todo para mí
Tin tin tinnnnn suena el corazón
Feliz 14, mi amor, mi obsesión
Felizzzzzz
Siempre serás
Mi Valentínnnnn
Mi Valentínnnnn

[Outro]
Tin tin tinnnnn
Feliz Valentín
Tú eres mi Valentín
Felizzzzzz`;

function ConcertLyricsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="lyrics-panel"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(380px, 85vw)",
            zIndex: 20,
            background: "rgba(5, 0, 15, 0.75)",
            backdropFilter: "blur(24px)",
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{
            padding: "20px 24px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <span style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>
              Letra
            </span>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1, color: "rgba(255,255,255,0.9)" }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                fontSize: 20,
                lineHeight: 1,
                padding: "4px 8px",
              }}
            >
              ✕
            </motion.button>
          </div>

          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px 40px",
            WebkitOverflowScrolling: "touch",
          }}>
            {SONG_LYRICS.split("\n").map((line, i) => {
              const isSection = line.startsWith("[") && line.endsWith("]");
              const isEmpty = line.trim() === "";
              if (isEmpty) return <div key={i} style={{ height: 16 }} />;
              return (
                <p
                  key={i}
                  style={{
                    margin: isSection ? "20px 0 8px" : "4px 0",
                    color: isSection ? "rgba(200, 150, 255, 0.6)" : "rgba(255, 255, 255, 0.85)",
                    fontSize: isSection ? 11 : 15,
                    fontWeight: isSection ? 700 : 400,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: isSection ? "0.15em" : "0.01em",
                    textTransform: isSection ? "uppercase" : "none",
                    lineHeight: 1.6,
                    textShadow: isSection ? "none" : "0 0 20px rgba(255,100,200,0.15)",
                  }}
                >
                  {line}
                </p>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ——————————————————————————————————————————————
//  Audio-reactive system (Web Audio API)
// ——————————————————————————————————————————————

export type AnalyserData = { analyser: AnalyserNode; dataArray: Uint8Array<ArrayBuffer> };

function createAudioAnalyser(audio: HTMLAudioElement): AnalyserData & { ctx: AudioContext } {
  const ctx = new AudioContext();
  const src = ctx.createMediaElementSource(audio);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  src.connect(analyser);
  analyser.connect(ctx.destination);
  const dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
  return { analyser, dataArray, ctx };
}

const AUDIO_SPHERE_VERT = /* glsl */ `
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uTime;
varying vec3 vNormal;
varying float vDisplacement;

vec3 mod289v(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289v4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permutev(vec4 x){return mod289v4(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrtv(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise3(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289v(i);
  vec4 p=permutev(permutev(permutev(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrtv(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main() {
  vNormal = normal;
  float noise = snoise3(normal * 2.0 + uTime * 0.4);
  float disp = noise * (0.1 + uBass * 0.5) + uMid * 0.2 * sin(position.y * 4.0 + uTime) + uTreble * 0.15 * cos(position.x * 6.0 + uTime * 1.5);
  vDisplacement = disp;
  vec3 newPos = position + normal * disp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}`;

const AUDIO_SPHERE_FRAG = /* glsl */ `
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uTime;
varying vec3 vNormal;
varying float vDisplacement;

void main() {
  vec3 baseColor = vec3(0.3, 0.05, 0.5);
  vec3 bassColor = vec3(1.0, 0.1, 0.3) * uBass;
  vec3 midColor = vec3(0.2, 0.4, 1.0) * uMid;
  vec3 trebleColor = vec3(0.8, 0.2, 1.0) * uTreble;
  vec3 col = baseColor + bassColor + midColor + trebleColor;
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
  col += fresnel * vec3(0.4, 0.1, 0.8) * (0.5 + uBass * 0.5);
  col += vDisplacement * 0.3;
  float alpha = 0.7 + fresnel * 0.3;
  gl_FragColor = vec4(col, alpha);
}`;

function AudioReactiveSphere({ analyserData, position = [0, 4, -6] as [number, number, number], radius = 1.5 }: {
  analyserData: React.RefObject<AnalyserData | null>;
  position?: [number, number, number];
  radius?: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);

  useFrame(({ clock }) => {
    const mat = matRef.current;
    const data = analyserData.current;
    if (!mat) return;

    mat.uniforms.uTime.value = clock.getElapsedTime();

    if (data) {
      data.analyser.getByteFrequencyData(data.dataArray);
      const len = data.dataArray.length;
      const bassEnd = Math.floor(len * 0.15);
      const midEnd = Math.floor(len * 0.5);
      let bass = 0, mid = 0, treble = 0;
      for (let i = 0; i < bassEnd; i++) bass += data.dataArray[i];
      for (let i = bassEnd; i < midEnd; i++) mid += data.dataArray[i];
      for (let i = midEnd; i < len; i++) treble += data.dataArray[i];
      bass = bass / (bassEnd * 255);
      mid = mid / ((midEnd - bassEnd) * 255);
      treble = treble / ((len - midEnd) * 255);
      mat.uniforms.uBass.value += (bass - mat.uniforms.uBass.value) * 0.15;
      mat.uniforms.uMid.value += (mid - mat.uniforms.uMid.value) * 0.12;
      mat.uniforms.uTreble.value += (treble - mat.uniforms.uTreble.value) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[radius, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={AUDIO_SPHERE_VERT}
        fragmentShader={AUDIO_SPHERE_FRAG}
        uniforms={{
          uBass: { value: 0 },
          uMid: { value: 0 },
          uTreble: { value: 0 },
          uTime: { value: 0 },
        }}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ——————————————————————————————————————————————
//  Full concert scene
// ——————————————————————————————————————————————

function PentakillConcertScene({ analyserData }: { analyserData: React.RefObject<AnalyserData | null> }) {
  return (
    <>
      <color attach="background" args={["#050008"]} />
      <fog attach="fog" args={["#0a0010", 8, 40]} />
      <Environment preset="night" />
      <directionalLight
        castShadow
        position={[5, 15, 10]}
        intensity={1.2}
        color="#ccbbff"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.001}
      />

      <StaticProp glbPath={CONCERT_STAGE_GLB} position={[0, -6, -5]} scale={1} />

      {BAND_MEMBERS.map((m) => (
        <PentakillModel
          key={m.name}
          glbPath={m.glb}
          position={m.pos}
          rotation={m.rot}
          scale={m.scale}
          anims={m.anims}
          timeScale={m.timeScale}
        />
      ))}

      <PortalCard
        glb={BARON_GLB}
        bgColor="#000000"
        position={[-21.6, 0.5, 4.4]}
        rotation={[0, 0, 0]}
        width={11}
        height={13}
        modelScale={0.015}
        modelPos={[-22, -5, 0]}
        anim="Dance_Loop"
        timeScale={0.1}
      />
      <PortalCard
        glb={DRAGON_ELDER_GLB}
        bgColor="#000000"
        position={[21.6, 0.5, 4.4]}
        rotation={[0, 0, 0]}
        width={11}
        height={13}
        modelScale={0.05}
        modelPos={[22, -9, 0]}
        anim="Run"
        timeScale={0.1}
      />

      <StaticProp glbPath={DRUM_SET_GLB} position={[10, -1.45, -9.5]} rotation={[0, -0.4, 0]} scale={2} />
      <StaticProp glbPath={GUITAR_AMP_GLB} position={[-5, -3, -1]} rotation={[0, 0.4, 0]} scale={4} />

      <ConcertLights />
      <ConcertCameraChoreography />
    </>
  );
}

// ——————————————————————————————————————————————
//  Concert wrapper (exported)
// ——————————————————————————————————————————————

export const PentakillConcert = memo(function PentakillConcert({ onBack }: { onBack: () => void }) {
  const isMobile = useIsMobile();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserData = useRef<AnalyserData | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);

  useEffect(() => {
    const audio = new Audio(CONCERT_MUSIC_SRC);
    audio.crossOrigin = "anonymous";
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
    audio.play().catch(() => { /* autoplay blocked */ });
    gsap.to(audio, { volume: 0.5, duration: 2, ease: "power2.out" });

    const setupAnalyser = () => {
      try {
        const { analyser, dataArray } = createAudioAnalyser(audio);
        analyserData.current = { analyser, dataArray };
      } catch { /* AudioContext may fail in some environments */ }
    };
    audio.addEventListener("playing", setupAnalyser, { once: true });

    return () => {
      audio.removeEventListener("playing", setupAnalyser);
      gsap.to(audio, {
        volume: 0, duration: 0.8, ease: "power2.in",
        onComplete: () => { audio.pause(); audio.src = ""; },
      });
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#000" }}>
      <Canvas
        shadows
        camera={{ position: [0, 3, 30], fov: isMobile ? 75 : 60, near: 0.1, far: 100 }}
        style={{ width: "100%", height: "100%" }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        gl={{ antialias: !isMobile, alpha: false, powerPreference: "high-performance" }}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <PentakillConcertScene analyserData={analyserData} />
        </Suspense>

        <OrbitControls enableZoom enablePan />
      </Canvas>

      <ConcertLyricsPanel open={showLyrics} onClose={() => setShowLyrics(false)} />

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
        whileHover={{ scale: 1.05, background: "rgba(255,255,255,0.1)" }}
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        style={{
          position: "absolute",
          top: isMobile ? 16 : 24,
          left: isMobile ? 16 : 24,
          zIndex: 10,
          padding: "8px 20px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 8,
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: "0.05em",
          backdropFilter: "blur(12px)",
          transition: "background 0.2s",
        }}
      >
        ← Volver
      </motion.button>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 0.8 }}
        whileHover={{ scale: 1.05, background: "rgba(160,32,240,0.15)" }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowLyrics((v) => !v)}
        style={{
          position: "absolute",
          top: isMobile ? 16 : 24,
          right: isMobile ? 16 : 24,
          zIndex: 25,
          padding: "8px 20px",
          background: showLyrics ? "rgba(160,32,240,0.2)" : "rgba(255,255,255,0.06)",
          border: showLyrics ? "1px solid rgba(160,32,240,0.4)" : "1px solid rgba(255,255,255,0.15)",
          borderRadius: 8,
          color: showLyrics ? "rgba(200,150,255,0.9)" : "rgba(255,255,255,0.6)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: "0.05em",
          backdropFilter: "blur(12px)",
          transition: "all 0.3s",
        }}
      >
        {showLyrics ? "Ocultar Letra" : "Ver Letra"}
      </motion.button>
    </div>
  );
});
