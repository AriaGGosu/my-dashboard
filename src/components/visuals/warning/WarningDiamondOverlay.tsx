"use client";

import { Canvas, useFrame, useThree, createPortal } from "@react-three/fiber";
import { Float, Grid, Html, Line, OrbitControls, useAnimations, useGLTF, useTexture, useFBO, useEnvironment } from "@react-three/drei";
import {
  CuboidCollider,
  TrimeshCollider,
  Physics,
  type RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
} from "@react-three/rapier";
import gsap from "gsap";
import { forwardRef, Suspense, useEffect, useMemo, useRef, useState } from "react";
import DecryptedText from "@/components/ui/DecryptedText";
import type { Group, Texture } from "three";
import {
  AdditiveBlending,
  BackSide,
  FrontSide,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CubeCamera,
  DataTexture,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  FloatType,

  LinearFilter,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NearestFilter,
  NormalBlending,
  Object3D,
  OrthographicCamera,
  Points,
  Quaternion,
  RepeatWrapping,
  RGBAFormat,
  Scene as ThreeScene,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  AlwaysStencilFunc,
  EqualStencilFunc,
  ReplaceStencilOp,
  KeepStencilOp,
  Plane,
  Vector2,
  Vector3,
  WebGLCubeRenderTarget,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const MECH_LAYER = 1;
const _cubeTarget = new WebGLCubeRenderTarget(256, {
  generateMipmaps: true,
  minFilter: LinearFilter,
});
const _cubeCamera = new CubeCamera(0.1, 1000, _cubeTarget);
const _modelWorldPos = new Vector3();

const MECH_GLB = "/glb/military_mech.glb";
const TERRAIN_GLB = "/glb/terrain/snowy_mountain_v2_-_terrain.glb";
const POD_GLB = "/glb/nier_automata_pod_042.glb";
const BMO_GLB = "/glb/bmo_realistic.glb";
const NOTEBOOK_GLB = "/glb/notebook_and_pen.glb";

const WARNING_ORANGE = "#F97D02";
const WARNING_YELLOW = "#FEB308";
const BORDER_PX = 20;
const FONT_SIZE = 220;
const ICON_SIZE = 300;
/** Ajuste vertical para que el padding arriba/abajo se vea igual (fuente suele pesar más abajo). */
const CONTENT_V_OFFSET = 6;
const GLOW_BLUR = 24;
const ALERT_OSCILLATE_SPEED = 2.2;

/**
 * Dibuja el icono de warning: triángulo naranja y el signo "!" (palo + punto)
 * en color rgba(0,0,0,0.8).
 */
const EXCLAMATION_COLOR = "rgba(0,0,0,0.8)";

function drawWarningIcon(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string
) {
  const half = size / 2;
  const stroke = Math.max(2, size / 14);
  const top = -half * 1;
  const bottom = half * 0.72;
  const left = -half * 2;
  const right = half * 2;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = stroke;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 1. Triángulo naranja (relleno + borde)
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(right, bottom);
  ctx.lineTo(left, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Signo "!" (palo + punto) en color rgba(0,0,0,0.8)
  ctx.fillStyle = EXCLAMATION_COLOR;
  ctx.strokeStyle = EXCLAMATION_COLOR;

  const stickY0 = -size * 0.24;
  const stickY1 = size * 0.06;
  ctx.fillRect(-stroke / 2, stickY0, stroke, stickY1 - stickY0);

  const dotY = size * 0.26;
  ctx.beginPath();
  ctx.arc(0, dotY, stroke * 1.1, 0, Math.PI * 2);
  ctx.fill();
}

const SEGMENT_WIDTH_DENOM = 12;
const SEGMENTS = 14;

/**
 * Dibuja la textura UNA VEZ: fondo oscuro y texto/icono/borde en blanco.
 * El parpadeo se hace con material.color (sin redibujar el canvas).
 */
function drawWarningCanvas(canvas: HTMLCanvasElement) {
  const circumference = 2 * Math.PI * 1.6;
  const bandHeight = 0.14;
  const ratio = circumference / bandHeight;
  const h = 320;
  const w = Math.round(h * ratio);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const segmentWidth = w / SEGMENT_WIDTH_DENOM;
  const iconSize = Math.min(ICON_SIZE, h * 0.5);

  // Centro vertical de la zona entre bordes; offset para que el padding se vea igual arriba y abajo
  const contentTop = BORDER_PX;
  const contentBottom = h - BORDER_PX;
  const contentCenterY = (contentTop + contentBottom) / 2 + CONTENT_V_OFFSET;

  // Background: no cambiar — siempre rgba(0,0,0,0.8)
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor = "rgba(255,255,255,0.8)";
  ctx.shadowBlur = GLOW_BLUR;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";

  ctx.fillRect(0, 0, w, BORDER_PX);
  ctx.fillRect(0, h - BORDER_PX, w, BORDER_PX);

  for (let i = 0; i < SEGMENTS; i++) {
    const x = i * segmentWidth + segmentWidth * 0.5;

    ctx.save();
    ctx.translate(x - segmentWidth * 0.28, contentCenterY );
    drawWarningIcon(ctx, iconSize, "#ffffff");
    ctx.restore();

    ctx.save();
    ctx.translate(x + segmentWidth * 0.22, contentCenterY );
    ctx.font = `900 ${FONT_SIZE}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillText("WARNING", 0, 0);
    ctx.restore();
  }

  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  for (let i = 0; i < SEGMENTS; i++) {
    const x = i * segmentWidth + segmentWidth * 0.5;

    ctx.save();
    ctx.translate(x - segmentWidth * 0.28, contentCenterY);
    drawWarningIcon(ctx, iconSize, "#ffffff");
    ctx.restore();

    ctx.save();
    ctx.translate(x + segmentWidth * 0.22, contentCenterY);
    ctx.font = `900 ${FONT_SIZE}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillText("WARNING", 0, 0);
    ctx.restore();
  }
}

function makeWarningTexture() {
  const canvas = document.createElement("canvas");
  drawWarningCanvas(canvas);
  const tex = new CanvasTexture(canvas);
  tex.format = RGBAFormat;
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

/** Oscilación suave entre naranja y amarillo (efecto alerta). */
function lerpAlertColor(t: number): string {
  const a = Math.sin(t * ALERT_OSCILLATE_SPEED) * 0.5 + 0.5;
  const from = WARNING_ORANGE;
  const to = WARNING_YELLOW;
  const r = Math.round(parseInt(from.slice(1, 3), 16) + (parseInt(to.slice(1, 3), 16) - parseInt(from.slice(1, 3), 16)) * a);
  const g = Math.round(parseInt(from.slice(3, 5), 16) + (parseInt(to.slice(3, 5), 16) - parseInt(from.slice(3, 5), 16)) * a);
  const b = Math.round(parseInt(from.slice(5, 7), 16) + (parseInt(to.slice(5, 7), 16) - parseInt(from.slice(5, 7), 16)) * a);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Cilindro: textura estática (blanco sobre oscuro). Parpadeo = solo material.color (sin lag). */
function WarningRing({
  scale = 1,
  position: ringPosition,
  opacityRef,
}: {
  scale?: number;
  position?: [number, number, number];
  opacityRef?: React.MutableRefObject<{ value: number }>;
}) {
  const bandRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);
  const tex = useMemo(() => makeWarningTexture(), []);
  const pos = ringPosition ?? [0.2, 0, -0.3];

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (bandRef.current) bandRef.current.rotation.y = t * 0.5;
    const mat = bandRef.current?.material as MeshBasicMaterial | undefined;
    if (mat?.color) mat.color.setStyle(lerpAlertColor(t));
    
    // Aplicar fade si hay opacityRef
    if (opacityRef && mat && groupRef.current) {
      const op = opacityRef.current.value;
      groupRef.current.visible = op >= 0.01;
      mat.opacity = op;
    }
  });

  return (
    <group ref={groupRef} position={pos} scale={scale} rotation={[0.22, 0, 0]}>
      <mesh ref={bandRef}>
        <cylinderGeometry args={[1.6, 1.6, 0.4, 128, 1, true]} />
        <meshBasicMaterial
          map={tex ?? undefined}
          color={WARNING_ORANGE}
          transparent={true}
          opacity={1}
          depthWrite={true}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ——— ERROR RING ———

const ERROR_RED_DIM = "#8B0000";
const ERROR_RED_BRIGHT = "#FF1A1A";

/**
 * Dibuja el icono de error: círculo con X adentro.
 */
function drawErrorIcon(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string
) {
  const half = size / 2;
  const radiusY = half * 0.85;
  // Escalar X ~2x para compensar el aspect ratio del canvas (igual que el warning icon)
  const radiusX = radiusY * 2;
  const stroke = Math.max(2, size / 12);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = stroke;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Elipse (se ve como círculo al envolver el cilindro)
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // X dentro — misma proporción estirada
  const crossX = radiusX * 0.55;
  const crossY = radiusY * 0.55;
  ctx.beginPath();
  ctx.moveTo(-crossX, -crossY);
  ctx.lineTo(crossX, crossY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(crossX, -crossY);
  ctx.lineTo(-crossX, crossY);
  ctx.stroke();
}

function drawErrorCanvas(canvas: HTMLCanvasElement) {
  const circumference = 2 * Math.PI * 1.6;
  const bandHeight = 0.14;
  const ratio = circumference / bandHeight;
  const h = 320;
  const w = Math.round(h * ratio);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const iconSize = Math.min(ICON_SIZE, h * 0.5);

  const contentTop = BORDER_PX;
  const contentBottom = h - BORDER_PX;
  const contentCenterY = (contentTop + contentBottom) / 2 + CONTENT_V_OFFSET;
  const iconCenterY = (contentTop + contentBottom) / 2 - 2;

  // Elementos alternados uniformemente: icono - texto - icono - texto...
  const elementCount = 28;
  const slotWidth = w / elementCount;

  // Background oscuro
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const drawPass = () => {
    ctx.fillRect(0, 0, w, BORDER_PX);
    ctx.fillRect(0, h - BORDER_PX, w, BORDER_PX);

    for (let i = 0; i < elementCount; i++) {
      const x = i * slotWidth + slotWidth * 0.5;
      if (i % 2 === 0) {
        ctx.save();
        ctx.translate(x, iconCenterY);
        drawErrorIcon(ctx, iconSize, "#ffffff");
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(x, contentCenterY +7);
        ctx.font = `900 ${FONT_SIZE}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
        ctx.fillText("ERROR", 0, 0);
        ctx.restore();
      }
    }
  };

  // Primera pasada: con glow
  ctx.shadowColor = "rgba(255,255,255,0.8)";
  ctx.shadowBlur = GLOW_BLUR;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  drawPass();

  // Segunda pasada: sin glow (nítido)
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  drawPass();
}

function makeErrorTexture() {
  const canvas = document.createElement("canvas");
  drawErrorCanvas(canvas);
  const tex = new CanvasTexture(canvas);
  tex.format = RGBAFormat;
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

/** Oscilación de brillo en rojo puro: rojo oscuro ↔ rojo brillante. */
function lerpErrorColor(t: number): string {
  const a = Math.sin(t * ALERT_OSCILLATE_SPEED) * 0.5 + 0.5;
  const from = ERROR_RED_DIM;
  const to = ERROR_RED_BRIGHT;
  const r = Math.round(parseInt(from.slice(1, 3), 16) + (parseInt(to.slice(1, 3), 16) - parseInt(from.slice(1, 3), 16)) * a);
  const g = Math.round(parseInt(from.slice(3, 5), 16) + (parseInt(to.slice(3, 5), 16) - parseInt(from.slice(3, 5), 16)) * a);
  const b = Math.round(parseInt(from.slice(5, 7), 16) + (parseInt(to.slice(5, 7), 16) - parseInt(from.slice(5, 7), 16)) * a);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Anillo de error rojo: mismo estilo que WarningRing pero con texto ERROR, icono ⊗ y color rojo. */
function ErrorRing({
  scale = 1,
  position: ringPosition,
  opacityRef,
}: {
  scale?: number;
  position?: [number, number, number];
  opacityRef?: React.MutableRefObject<{ value: number }>;
}) {
  const bandRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);
  const tex = useMemo(() => makeErrorTexture(), []);
  const pos = ringPosition ?? [0.2, 0, -0.3];

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (bandRef.current) bandRef.current.rotation.y = t * 0.5;
    const mat = bandRef.current?.material as MeshBasicMaterial | undefined;
    if (mat?.color) mat.color.setStyle(lerpErrorColor(t));

    if (opacityRef && mat && groupRef.current) {
      const op = opacityRef.current.value;
      groupRef.current.visible = op >= 0.01;
      mat.opacity = op;
    }
  });

  return (
    <group ref={groupRef} position={pos} scale={scale} rotation={[0.22, 0, 0]}>
      <mesh ref={bandRef}>
        <cylinderGeometry args={[1.6, 1.6, 0.4, 128, 1, true]} />
        <meshBasicMaterial
          map={tex ?? undefined}
          color={ERROR_RED_BRIGHT}
          transparent={true}
          opacity={1}
          depthWrite={true}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** Nombres que identifican suelo/plano/sombra: no aplicar cristal, ocultar (no colisionan, los pies tocan el terreno). */
const FLOOR_NAMES = /floor|ground|suelo|plane|piso|terrain|base|floor_|shadow|sombra|plano/i;

type MechWrapperMode = "warning" | "error" | "fire" | "shield" | "details";

/** Shader GLSL del fuego morado — reutilizado para esfera, anillo y material del mech */
const FIRE_VERTEX = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vDisplacement;
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1); p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
          mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
          mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p, float t) {
    float v = 0.0, a = 0.5;
    for(int i=0;i<3;i++){v+=a*noise(p+t*0.3);p*=2.0;a*=0.5;}
    return v;
  }
  void main() {
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    float t = uTime * 0.5;
    float displacement = fbm(position*3.0+vec3(t*0.2,t*0.3,t*0.1),t)*0.05;
    vDisplacement = displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal*displacement, 1.0);
  }
`;
const FIRE_FRAGMENT = `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uClipY;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vDisplacement;
  #define TAU 6.28318530718
  #define TILING_FACTOR 3.0
  #define MAX_ITER 6
  float waterHighlight(vec2 p, float time, float foaminess) {
    vec2 i = vec2(p); float c = 0.0;
    float ff = mix(1.0,6.0,foaminess); float inten = 0.005*ff;
    for(int n=0;n<MAX_ITER;n++){
      float t=time*(1.0-(3.5/float(n+1)));
      i=p+vec2(cos(t-i.x)+sin(t+i.y),sin(t-i.y)+cos(t+i.x));
      c+=1.0/length(vec2(p.x/(sin(i.x+t)+0.001),p.y/(cos(i.y+t)+0.001)));
    }
    c=0.2+c/(inten*float(MAX_ITER)); c=1.17-pow(c,1.4); c=pow(abs(c),8.0);
    return c/sqrt(ff);
  }
  void main() {
    if (vWorldPos.y < uClipY) discard;
    float time = uTime*0.15+23.0;
    // Usar posición del mundo para patrón uniforme, tiling alto = cortes más pequeños
    vec2 p = mod(vWorldPos.xz * TILING_FACTOR * 1.5 + vWorldPos.y * 0.8, TAU) - 250.0;
    float c = waterHighlight(p, time, 0.4);

    // Cortes más pequeños: umbral más alto = menos área descartada
    if(c < 0.4) discard;
    float intensity = (c - 0.4) / 0.6;
    intensity *= 1.0 + vDisplacement * 2.0;
    if(intensity < 0.1) discard;

    // Color negro sólido
    gl_FragColor = vec4(vec3(0.0, 0.0, 0.0), 1.0);
  }
`;

/** Material tipo diamante: transparente, refleja el entorno (warning). */
function useGlassMaterial(envMap: Texture | null) {
  return useMemo(() => {
    if (!envMap) return null;
    return new MeshPhysicalMaterial({
      color: "#ffffff",
      transmission: 1,
      thickness: 1.2,
      roughness: 0.05,
      metalness: 0,
      ior: 2.35,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMap,
      envMapIntensity: 2.2,
      transparent: true,
      opacity: 0.98,
    });
  }, [envMap]);
}

/** Material tipo diamante con borde luminoso (emissive) estilo Ori. 
 * El efecto glow se logra con emissive + sheen para simular el fresnel edge glow.
 */
function useGlowGlassMaterial(envMap: Texture | null) {
  return useMemo(() => {
    if (!envMap) return null;
    return new MeshPhysicalMaterial({
      color: "#e0f7ff",
      transmission: 0.85,
      thickness: 0.5,
      roughness: 0.1,
      metalness: 0.1,
      ior: 1.8,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMap,
      envMapIntensity: 2.0,
      transparent: true,
      opacity: 0.85,
      // Glow/emissive para efecto borde luminoso
      emissive: new Color("#00d4ff"),
      emissiveIntensity: 0.6,
      // Sheen para efecto fresnel en bordes
      sheen: 1,
      sheenColor: new Color("#00ffff"),
      sheenRoughness: 0.2,
    });
  }, [envMap]);
}

/** Modelo military_mech.glb: texturas normales, cristal, o fuego según wrapperMode. */
function MechModel({
  useGlassMaterial: useGlass,
  envMap,
  meshRef,
  wrapperMode = "warning",
}: {
  useGlassMaterial: boolean;
  envMap: Texture | null;
  meshRef: React.RefObject<Object3D | null>;
  wrapperMode?: MechWrapperMode;
}) {
  const { scene } = useGLTF(MECH_GLB);
  const glassMat = useGlassMaterial(envMap);

  // Material de fuego para el mech (sin opacidad extra)
  const mechFireMat = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uClipY: { value: -9999 },
      },
      vertexShader: FIRE_VERTEX,
      fragmentShader: FIRE_FRAGMENT,
      transparent: true, depthWrite: true, side: DoubleSide,
    });
  }, []);

  useFrame((state) => {
    mechFireMat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  const useFireMat = wrapperMode === "fire";

  const clonedScene = useMemo(
    () => ((useGlass || useFireMat) && scene ? scene.clone(true) : null),
    [useGlass, useFireMat, scene]
  );

  // Guardar materiales originales para restaurar
  const originalMatsRef = useRef<Map<number, unknown>>(new Map());

  useEffect(() => {
    if (!clonedScene) return;
    // Guardar originales
    clonedScene.traverse((o) => {
      if (o instanceof Mesh && !FLOOR_NAMES.test(o.name || "")) {
        if (!originalMatsRef.current.has(o.id)) {
          originalMatsRef.current.set(o.id, o.material);
        }
      }
    });

    if (useFireMat) {
      clonedScene.traverse((o) => {
        if (o instanceof Mesh && !FLOOR_NAMES.test(o.name || "")) {
          o.material = mechFireMat;
        }
      });
    } else if (useGlass && glassMat) {
      clonedScene.traverse((o) => {
        if (o instanceof Mesh && !FLOOR_NAMES.test(o.name || "")) {
        o.material = glassMat;
      }
    });
    }
  }, [useFireMat, useGlass, clonedScene, glassMat, mechFireMat]);

  /** Oculta el plano de sombra/suelo del modelo y habilita castShadow en los meshes visibles. */
  useEffect(() => {
    const setupMeshes = (obj: Object3D) => {
      obj.traverse((o) => {
        if (o instanceof Mesh) {
          if (FLOOR_NAMES.test(o.name || "")) {
            o.visible = false;
          } else {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        }
      });
    };
    setupMeshes(scene);
    if (clonedScene) setupMeshes(clonedScene);
  }, [scene, clonedScene]);

  useEffect(() => {
    if (meshRef.current) meshRef.current.layers.set(MECH_LAYER);
  }, [meshRef]);

  if ((useGlass || useFireMat) && clonedScene) return <primitive object={clonedScene} />;
  return <primitive object={scene} />;
}

/**
 * Extrae vértices e índices de todos los meshes de un Object3D (en espacio del objeto).
 * Aplica la matriz local de cada mesh para unificar en un solo trimesh.
 */
function extractTrimeshFromScene(scene: Object3D): { vertices: Float32Array; indices: Uint32Array } | null {
  const vertices: number[] = [];
  const indices: number[] = [];
  const _v = new Vector3();
  const _m = new Matrix4();

  scene.updateMatrixWorld(true);
  scene.traverse((obj) => {
    if (!(obj instanceof Mesh) || !obj.geometry) return;
    const geom = obj.geometry;
    const pos = geom.attributes.position as BufferAttribute | undefined;
    if (!pos) return;
    const idx = geom.index;
    const base = vertices.length / 3;
    _m.copy(obj.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(_m);
      vertices.push(_v.x, _v.y, _v.z);
    }
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices.push(base + idx.getX(i));
    } else {
      for (let i = 0; i < pos.count; i++) indices.push(base + i);
    }
  });

  if (vertices.length === 0) return null;
  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
  };
}

/** Distancia del centro del RigidBody a los pies (eje Y local). Colocamos el cuerpo para que los pies toquen el terreno. */
const FEET_OFFSET_FROM_BODY = 1.62;
/** Collider del mech: centro un poco por encima del plano de sombra para que los pies toquen el terreno. */
const MECH_COLLIDER_CENTER_Y = -1.0;
const MECH_COLLIDER_HALF_Y = 0.5;

/** Misma posición/escala/rotación que TerrainModel pero dentro del grupo rotado. */
const TERRAIN_POS: [number, number, number] = [-20, -3.53, -30];
const TERRAIN_SCALE = 10;
const GROUP_ROT_Y = Math.PI / -6;

/** Suelo de colisión = grilla (plano fijo, fallback). */
const GRID_FLOOR_POS: [number, number, number] = [0, -1.6, 0];
const GRID_FLOOR_HALF = 25;
/** Mech posición fija: pies a nivel del grid (y=-1.6). El grupo interno baja -1.74, así que compensamos. */
const MECH_INITIAL_POSITION: [number, number, number] = [0, 0.14, 0];

/** Collider basado en la geometría real del terreno. Solo activo en escena 2. */
function TerrainFloorCollider({ enabled }: { enabled: boolean }) {
  const { scene } = useGLTF(TERRAIN_GLB);
  const trimesh = useMemo(() => {
    const clone = scene.clone(true);
    const group = new Object3D();
    group.rotation.set(0, GROUP_ROT_Y, 0);
    group.updateMatrixWorld(true);
    clone.position.set(...TERRAIN_POS);
    clone.scale.set(TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
    clone.rotation.set(0, 0, 0);
    group.add(clone);
    group.updateMatrixWorld(true);
    return extractTrimeshFromScene(group);
  }, [scene]);

  if (!enabled || !trimesh) return null;
  return (
    <RigidBody type="fixed" friction={0.8}>
      <TrimeshCollider args={[trimesh.vertices, trimesh.indices]} />
    </RigidBody>
  );
}

/** Collider plano al nivel del grid. Activo en escena 1. */
function GridFloorCollider({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <RigidBody type="fixed" position={GRID_FLOOR_POS} rotation={[0, GROUP_ROT_Y, 0]} friction={0.8}>
      <CuboidCollider args={[GRID_FLOOR_HALF, 0.1, GRID_FLOOR_HALF]} />
    </RigidBody>
  );
}

/** Terreno nevado: colocado como suelo bajo el mech (donde está el grid). */
function TerrainModel() {
  const { scene } = useGLTF(TERRAIN_GLB);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o instanceof Mesh) {
        o.receiveShadow = true;
        o.castShadow = true;
      }
    });
    return c;
  }, [scene]);
  return (
    <primitive
      object={cloned}
      position={TERRAIN_POS}
      scale={[TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE]}
      rotation={[0, 0, 0]}
    />
  );
}

/** Pod 042 (Nier Automata): a la derecha del mech, levitando en el sitio (Float de drei). */
function PodModel() {
  const { scene } = useGLTF(POD_GLB);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  return (
    <Float
      speed={4}
      floatIntensity={0.2}
      floatingRange={[-0.25, 0.25]}
      rotationIntensity={0.2}
    >
      <primitive
        object={cloned}
        position={[2.8, 1.4, 0]}
        scale={[0.1, 0.1, 0.1]}
        rotation={[0, Math.PI / -1.6, 0]}
      />
    </Float>
  );
}

/** Tamaño objetivo para BMO (misma escala visual que personajes pequeños en la escena). */
const BMO_TARGET_SIZE = 0.5;

/** Posición del grupo BMO (objeto + anillo). Cambia solo este array para recolocar BMO; el anillo queda centrado en el objeto. */
const BMO_GROUP_POSITION: [number, number, number] = [1.1, 0.1, 1.5];

const BMO_WARNING_ORANGE = "#F97D02";
const BMO_WARNING_YELLOW = "#FEB308";
const BMO_ALERT_OSCILLATE_SPEED = 2.2;
function lerpBmoAlertColor(t: number): string {
  const a = Math.sin(t * BMO_ALERT_OSCILLATE_SPEED) * 0.5 + 0.5;
  const from = BMO_WARNING_ORANGE;
  const to = BMO_WARNING_YELLOW;
  const r = Math.round(parseInt(from.slice(1, 3), 16) + (parseInt(to.slice(1, 3), 16) - parseInt(from.slice(1, 3), 16)) * a);
  const g = Math.round(parseInt(from.slice(3, 5), 16) + (parseInt(to.slice(3, 5), 16) - parseInt(from.slice(3, 5), 16)) * a);
  const b = Math.round(parseInt(from.slice(5, 7), 16) + (parseInt(to.slice(5, 7), 16) - parseInt(from.slice(5, 7), 16)) * a);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Anillo warning solo para BMO (instancia propia; mismo estilo que el del mech). */
function BmoWarningRing({ position, scale: ringScale }: { position: [number, number, number]; scale: number }) {
  const bandRef = useRef<Mesh>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (bandRef.current) bandRef.current.rotation.y = t * 0.5;
    const mat = bandRef.current?.material as MeshBasicMaterial | undefined;
    if (mat?.color) mat.color.setStyle(lerpBmoAlertColor(t));
  });
  return (
    <group position={position} scale={ringScale} rotation={[0.22, 0, 0]}>
      <mesh ref={bandRef}>
        <cylinderGeometry args={[1.6, 1.6, 0.4, 64, 1, true]} />
        <meshBasicMaterial
          color={BMO_WARNING_ORANGE}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** BMO (Adventure Time): en el suelo, con anillo warning (mismo wrapper que el mech). */
function BmoModel({
  renderRing,
}: {
  renderRing: (position: [number, number, number]) => React.ReactNode;
}) {
  const { scene, animations } = useGLTF(BMO_GLB);
  const { cloned, scale, positionY } = useMemo(() => {
    const c = cloneSkeleton(scene);
    c.updateMatrixWorld(true);
    const box = new Box3().setFromObject(c);
    const size = new Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const s = BMO_TARGET_SIZE / maxDim;
    const posY = -box.min.y * s;
    return { cloned: c, scale: s, positionY: posY };
  }, [scene]);

  const { actions, names } = useAnimations(animations, cloned);

  useEffect(() => {
    if (names?.length && actions) {
      const first = actions[names[0]];
      if (first) first.reset().fadeIn(0.3).play();
    }
  }, [actions, names]);

  useEffect(() => {
    cloned.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.visible = true;
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [cloned]);

  const bmoCenter: [number, number, number] = [-2, positionY - 1.7, 0];
  return (
    <group position={BMO_GROUP_POSITION}>
      <primitive
        object={cloned}
        position={bmoCenter}
        scale={[scale, scale, scale]}
        rotation={[0, Math.PI / 6, 0]}
      />
      {renderRing([-2.35, -1.45, -0.75])}
    </group>
  );
}

const _up = new Vector3(0, 1, 0);
const _normalVec = new Vector3();
const _quatAlign = new Quaternion();

/**
 * Mantiene el mech "pegado" al terreno: raycast hacia abajo, coloca los pies en el hit
 * y alinea el cuerpo a la normal del terreno (queda parado sobre pendientes).
 * Usa cuerpo cinemático (kinematicPosition) en lugar de dinámico.
 */
function MechTerrainStick({ bodyRef }: { bodyRef: React.RefObject<RapierRigidBody | null> }) {
  const { world, rapier } = useRapier();

  useBeforePhysicsStep(() => {
    const body = bodyRef.current;
    if (!body) return;
    const pos = body.translation();
    // Raycast desde arriba hacia abajo, manteniendo X/Z fijos
    const rayOrigin = new rapier.Vector3(pos.x, pos.y + 2, pos.z);
    const rayDir = new rapier.Vector3(0, -1, 0);
    const ray = new rapier.Ray(rayOrigin, rayDir);
    const maxToi = 10;
    const hit = world.castRayAndGetNormal(ray, maxToi, true, undefined, undefined, undefined, body);
    if (!hit) return;
    const hitPoint = ray.pointAt(hit.timeOfImpact);
    // Solo ajustar Y (altura del terreno), X/Z se mantienen fijos para no deslizar
    const nextPos = new rapier.Vector3(
      pos.x,
      hitPoint.y + FEET_OFFSET_FROM_BODY,
      pos.z
    );
    body.setNextKinematicTranslation(nextPos);
    // Alinear rotación a la normal del terreno
    const nx = hit.normal.x;
    const ny = hit.normal.y;
    const nz = hit.normal.z;
    _normalVec.set(nx, ny, nz);
    _quatAlign.setFromUnitVectors(_up, _normalVec);
    body.setNextKinematicRotation({ x: _quatAlign.x, y: _quatAlign.y, z: _quatAlign.z, w: _quatAlign.w });
  });

  return null;
}

/** Actualiza el CubeCamera desde el mech para que el cristal refleje el cilindro warning. */
function ReflectionSync({
  mechRef,
  active,
}: {
  mechRef: React.RefObject<Object3D | null>;
  active: boolean;
}) {
  const { gl, scene } = useThree();
  useFrame(() => {
    if (!active || !mechRef.current) return;
    mechRef.current.visible = false;
    mechRef.current.getWorldPosition(_modelWorldPos);
    _cubeCamera.position.copy(_modelWorldPos);
    _cubeCamera.update(gl, scene);
    mechRef.current.visible = true;
  });
  return null;
}

/** Actualiza el CubeCamera para escena 2: captura reflejos del entorno (grid, terreno, etc). */
function Scene2ReflectionSync({
  modelRef,
  active,
}: {
  modelRef: React.RefObject<Group | null>;
  active: boolean;
}) {
  const { gl, scene } = useThree();
  useFrame(() => {
    if (!active) return;
    // Posición del modelo o centro de la escena
    if (modelRef.current) {
      modelRef.current.visible = false;
      modelRef.current.getWorldPosition(_modelWorldPos);
    } else {
      _modelWorldPos.set(0, 0, 0);
    }
    _cubeCamera.position.copy(_modelWorldPos);
    _cubeCamera.update(gl, scene);
    if (modelRef.current) {
      modelRef.current.visible = true;
    }
  });
  return null;
}

/** Centro de la vista: ambos (anillo + mech) van aquí para quedar en el centro de pantalla. */
const CENTER: [number, number, number] = [0, 0, 0];

/** Color de la grilla: visible pero sutil (mismo tono que líneas). */
const GRID_CELL_COLOR = "#000";
const GRID_SECTION_COLOR = "#F97D02";

/** Color de las líneas que unen las cards con el mech. */
const CARD_LINE_COLOR = "#EAEAEA";
const CARD_LINE_OPACITY = 0.6;
/** Offset en X desde el centro de la card hasta la esquina de donde sale la línea (en unidades 3D). */
const CARD_CORNER_OFFSET = 0.11;
/** Radio exterior del anillo del marcador (la línea termina en este borde, no en el centro). */
const MARKER_RING_OUTER_RADIUS = 0.022;
/** Pulso compartido borde card + línea + círculo: mismo periodo y fase que la animación CSS (2.86s). */
const PULSE_PERIOD = 2.86;
const PULSE_OPACITY_MIN = 0.35;
const PULSE_OPACITY_AMP = 0.35;

/** Esquina de la card desde la que nace la línea hacia el mech. */
type LineFromCorner = "top-left" | "top-right" | "bottom-right";

type CardStat = { label: string; value: string };

type CardConfig = {
  position: [number, number, number];
  lineFrom: LineFromCorner;
  mechTarget: [number, number, number];
  title: string;
  description: string;
  stats?: CardStat[];
};

/** Posiciones en forma de Y griega. Stats tipo RPG/juego por card. */
const MECH_TECH_CARDS: CardConfig[] = [
  {
    position: [0, 2, 0],
    lineFrom: "bottom-right",
    mechTarget: [0.3, 0.5, 1],
    title: "Sensors",
    description: "Real-time data recognition and link head.",
    stats: [
      { label: "Proximidad", value: "98%" },
      { label: "Rango", value: "450m" },
      { label: "Detección", value: "360°" },
    ],
  },
  {
    position: [-2.2, 0, 0.6],
    lineFrom: "top-right",
    mechTarget: [-1.2, 0.55, 0.2],
    title: "Armament",
    description: "Dual weapon systems, high precision, and tactical response.",
    stats: [
      { label: "ATK", value: "85" },
      { label: "DEF", value: "40" },
      { label: "Precisión", value: "92%" },
    ],
  },
  {
    position: [2.5, -.5, 1],
    lineFrom: "top-left",
    mechTarget: [1, -0.5, 0.4],
    title: "Propulsion",
    description: "Reinforced legs and stabilizers for uneven terrain.",
    stats: [
      { label: "Velocidad", value: "78" },
      { label: "Estabilidad", value: "90" },
      { label: "Terreno", value: "A+" },
    ],
  },
];

/** Línea 3D desde un punto hasta otro (card → mech), más gruesa. Ref para animar opacidad en sync con el círculo. */
const ConnectorLine = forwardRef(function ConnectorLine(
  { start, end }: { start: [number, number, number]; end: [number, number, number] },
  ref: React.Ref<object>
) {
  const points = useMemo(
    () => [start, end],
    [start[0], start[1], start[2], end[0], end[1], end[2]]
  );
  return (
    <Line
      ref={ref as React.Ref<import("three-stdlib").Line2>}
      points={points}
      color={CARD_LINE_COLOR}
      lineWidth={2.5}
      transparent
      opacity={CARD_LINE_OPACITY}
    />
  );
});

/** Punto de referencia en el mech target: círculo pulsante del mismo color que la línea. */
function MechTargetMarker({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<MeshBasicMaterial>(null);
  const { camera } = useThree();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const phase = (t % PULSE_PERIOD) / PULSE_PERIOD;
    const pulseOpacity = PULSE_OPACITY_MIN + PULSE_OPACITY_AMP * Math.sin(Math.PI * phase);
    const pulseScale = 0.85 + 0.15 * Math.sin(Math.PI * phase);
    if (meshRef.current) meshRef.current.scale.setScalar(pulseScale);
    if (matRef.current) matRef.current.opacity = pulseOpacity;
    if (meshRef.current) meshRef.current.lookAt(camera.position);
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <ringGeometry args={[0.012, MARKER_RING_OUTER_RADIUS, 32]} />
        <meshBasicMaterial
          ref={matRef}
          color={CARD_LINE_COLOR}
          transparent
          opacity={0.75}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Hace que sus hijos (solo la card Html) miren siempre a la cámara, independiente de la rotación del modelo. */
function Billboard({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (ref.current) ref.current.lookAt(camera.position);
  });
  return <group ref={ref}>{children}</group>;
}

/** Origen de la línea según esquina: top = +Y, bottom = -Y, left = -X, right = +X. */
function lineStartFromCorner(corner: LineFromCorner): [number, number, number] {
  switch (corner) {
    case "top-left":
      return [-CARD_CORNER_OFFSET, CARD_CORNER_OFFSET, 0];
    case "top-right":
      return [CARD_CORNER_OFFSET, CARD_CORNER_OFFSET, 0];
    case "bottom-right":
      return [CARD_CORNER_OFFSET, -CARD_CORNER_OFFSET, 0];
    default:
      return [CARD_CORNER_OFFSET, 0, 0];
  }
}

/** Título de la card con efecto DecryptedText (animación al entrar en vista). */
function MechCardTitle({ title }: { title: string }) {
  return (
    <div
      className="test-font"
      style={{
        fontSize: 20,
        textTransform: "uppercase",
        letterSpacing: "0.2em",
        color: "rgba(234,234,234,0.7)",
        marginBottom: 6,
        fontFamily: "T012Regular, monospace",
      }}
    >
      <DecryptedText
        text={title}
        speed={60}
        maxIterations={10}
        animateOn="view"
        revealDirection="start"
        sequential
        useOriginalCharsOnly={false}
        className="revealed"
        parentClassName="all-letters"
        encryptedClassName="encrypted"
      />
    </div>
  );
}

/** Duración de la animación de entrada de las cards (segundos). */
const CARD_ANIM_DURATION = 1.2;
/** Stagger entre cards (segundos). */
const CARD_ANIM_STAGGER = 0.25;

/** Card flotante en 3D con estilo TechCard y línea diagonal hacia un punto del mech. Siempre mira a la cámara. 
 *  Cuando `animate=true`, la card arranca en mechTarget y viaja suavemente a su posición final. */
function MechTechCard({ config, opacity = 1, animate = false, delay = 0 }: { config: CardConfig; opacity?: number; animate?: boolean; delay?: number }) {
  const groupRef = useRef<Group>(null);
  const lineRef = useRef<{ material?: { opacity: number } } | null>(null);
  const htmlWrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(animate ? 0 : 1);
  const startTimeRef = useRef<number | null>(null);

  const lineStartLocal: [number, number, number] = lineStartFromCorner(config.lineFrom);
  const lineEndLocal: [number, number, number] = [
    config.mechTarget[0] - config.position[0],
    config.mechTarget[1] - config.position[1],
    config.mechTarget[2] - config.position[2],
  ];

  const lineEndAtRingEdge = useMemo(() => {
    const start = new Vector3(...lineStartLocal);
    const end = new Vector3(...lineEndLocal);
    const dir = end.clone().sub(start).normalize();
    const shortenedEnd = end.clone().sub(dir.multiplyScalar(MARKER_RING_OUTER_RADIUS));
    return [shortenedEnd.x, shortenedEnd.y, shortenedEnd.z] as [number, number, number];
  }, [lineStartLocal[0], lineStartLocal[1], lineStartLocal[2], lineEndLocal[0], lineEndLocal[1], lineEndLocal[2]]);

  // Reset animation when animate changes
  useEffect(() => {
    if (animate) {
      progressRef.current = 0;
      startTimeRef.current = null;
    } else {
      progressRef.current = 1;
    }
  }, [animate]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const phase = (t % PULSE_PERIOD) / PULSE_PERIOD;
    const pulseOpacity = PULSE_OPACITY_MIN + PULSE_OPACITY_AMP * Math.sin(Math.PI * phase);

    // Animate position from mechTarget to final position
    if (animate && progressRef.current < 1) {
      if (startTimeRef.current === null) startTimeRef.current = t;
      const elapsed = t - startTimeRef.current - delay;
      if (elapsed > 0) {
        // easeOutCubic
        const raw = Math.min(1, elapsed / CARD_ANIM_DURATION);
        const eased = 1 - Math.pow(1 - raw, 3);
        progressRef.current = eased;
      }
    }

    const p = progressRef.current;
    if (groupRef.current) {
      // Interpolate from mechTarget to final position
      groupRef.current.position.set(
        config.mechTarget[0] + (config.position[0] - config.mechTarget[0]) * p,
        config.mechTarget[1] + (config.position[1] - config.mechTarget[1]) * p,
        config.mechTarget[2] + (config.position[2] - config.mechTarget[2]) * p,
      );
    }

    const effectiveOpacity = opacity * p;
    if (lineRef.current?.material) lineRef.current.material.opacity = pulseOpacity * effectiveOpacity;

    // Update HTML opacity in the DOM directly for smooth animation
    if (htmlWrapRef.current) {
      htmlWrapRef.current.style.opacity = String(effectiveOpacity);
    }
  });

  return (
    <group ref={groupRef} position={animate ? config.mechTarget : config.position}>
      <Billboard>
        <Html
          transform
          center
          distanceFactor={4.5}
          style={{ width: "max-content", maxWidth: 200, pointerEvents: "none" }}
          wrapperClass="mech-tech-card-wrapper"
        >
          <div ref={htmlWrapRef} style={{ transform: "scale(0.55)", transformOrigin: "center center", opacity: animate ? 0 : opacity, transition: "none" }}>
            <div
              className="mech-tech-card-pulse-border"
              style={{
                position: "relative",
                overflow: "visible",
                border: "1px solid rgba(234, 234, 234, 0.5)",
                background: "rgba(7, 7, 7, 0.92)",
                padding: "12px 14px",
                borderRadius: 0,
                minWidth: 160,
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                fontFamily: "var(--font-mono-kpr), ui-monospace, monospace",
              }}
            >
              <MechCardTitle title={config.title} />
              <p
                style={{
                  margin: 0,
                  fontSize: 6,
                  lineHeight: 1.4,
                  color: "rgba(234,234,234,0.9)",
                  marginBottom: config.stats?.length ? 8 : 0,
                }}
              >
                {config.description}
              </p>
              {config.stats && config.stats.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px 12px",
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "1px solid rgba(234,234,234,0.2)",
                  }}
                >
                  {config.stats.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        width: "100%",
                        display: "flex",
                        gap: 4,
                        fontSize: 5,
                        color: "rgba(234,234,234,0.75)",
                        fontFamily: "var(--font-mono-kpr), ui-monospace, monospace",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ textTransform: "uppercase", letterSpacing: "0.1em", width: "50%" }}>{s.label}</span>
                      <div style={{
                        borderBottom: "1px solid rgba(234,234,234,0.2)", width: "100%", height: 0,
                        borderStyle: "dotted"
                      }}></div>
                      <span style={{ fontWeight: 600, color: "rgba(234,234,234,0.95)" }}>{s.value}</span>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Html>
      </Billboard>
      <ConnectorLine ref={lineRef} start={lineStartLocal} end={lineEndAtRingEdge} />
      <MechTargetMarker position={lineEndLocal} />
    </group>
  );
}

function MechTechCards({ opacity = 1, animate = false }: { opacity?: number; animate?: boolean }) {
  return (
    <>
      {MECH_TECH_CARDS.map((config, i) => (
        <MechTechCard key={i} config={config} opacity={opacity} animate={animate} delay={i * CARD_ANIM_STAGGER} />
      ))}
    </>
  );
}

/** Grilla de suelo + paredes (cubo): planos grandes, visibles desde dentro. */
function GridRoom({ opacityRef }: { opacityRef?: React.MutableRefObject<{ value: number }> }) {
  const gridRef = useRef<Group>(null);
  
  useFrame(() => {
    if (!gridRef.current || !opacityRef) return;
    const op = opacityRef.current.value;
    // Solo controlar visibilidad
    gridRef.current.visible = op >= 0.01;
  });
  
  const gridProps = {
    infiniteGrid: true as const,
    cellSize: 1,
    cellThickness: 1,
    sectionSize: 4,
    sectionThickness: 1.4,
    cellColor: GRID_CELL_COLOR,
    sectionColor: GRID_SECTION_COLOR,
    fadeDistance: 30,
    fadeStrength: 1,
    renderOrder: -1,
    side: DoubleSide,
    args: [40, 40] as [number, number],
  };
  return (
    <group ref={gridRef}>
      <Grid
        position={[0, -1.6, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        {...gridProps}
      />
    </group>
  );
}

/** Posición por defecto de la cámara en escena 1 (vuelta desde escena 2). */
const SCENE1_CAMERA = { x: 0, y: 0, z: 6.8 };
/** Toma de cámara escena 2: posición idéntica al proyecto particulasblancas */
const SCENE2_CAMERA_FINAL = { x: 0, y: 0, z: 5 };
const SCENE2_CAMERA_DURATION = 2.2;
const SCENE2_CAMERA_EASE = "power2.inOut";
/** Duración del fade in/out (mínimo 1 s para salida suave del mech). */
const FADE_DURATION = 1.2;
const FADE_EASE = "power2.inOut";

/** Aplica opacity a todos los materiales de los hijos; oculta el grupo cuando opacity < 0.01. */
function FadeGroup({
  opacityRef,
  children,
}: {
  opacityRef: React.MutableRefObject<{ value: number }>;
  children: React.ReactNode;
}) {
  const groupRef = useRef<Group>(null);
  useFrame(() => {
    const op = opacityRef.current.value;
    const g = groupRef.current;
    if (!g) return;
    g.visible = op >= 0.01;
    g.traverse((obj) => {
      if (obj instanceof Mesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m && "opacity" in m) {
            (m as MeshBasicMaterial).transparent = true;
            (m as MeshBasicMaterial).opacity = op;
          }
        }
      }
    });
  });
  return <group ref={groupRef}>{children}</group>;
}

/** Aplica opacity y ligera escala (efecto blur/suavidad) al mech según scene1OpacityRef. */
function MechFade({
  mechRef,
  mechFadeRef,
  scene1OpacityRef,
  active,
}: {
  mechRef: React.RefObject<Object3D | null>;
  mechFadeRef: React.RefObject<Group | null>;
  scene1OpacityRef: React.MutableRefObject<{ value: number }>;
  active: boolean;
}) {
  useFrame(() => {
    if (!active) return;
    const op = scene1OpacityRef.current.value;
    const mech = mechRef.current;
    if (mech) {
      mech.traverse((obj) => {
        if (obj instanceof Mesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (m && "opacity" in m) {
              (m as MeshBasicMaterial).transparent = true;
              (m as MeshBasicMaterial).opacity = op;
            }
          }
        }
      });
    }
    const fadeGroup = mechFadeRef.current;
    if (fadeGroup) {
      const s = 0.97 + 0.03 * op;
      fadeGroup.scale.setScalar(s);
    }
  });
  return null;
}

/** Shield NieR Automata: esfera de vidrio con triángulos facetados alrededor del mech */
function MechShield({ 
  position = [0, -1.0, 0] as [number, number, number],
  scale = 1.0,
  opacityRef,
}: {
  position?: [number, number, number];
  scale?: number;
  opacityRef?: React.MutableRefObject<{ value: number }>;
}) {
  type V3 = [number, number, number];

  // ---- Geometría: bandas horizontales NieR + subdivisión esférica ----
  const shieldGeo = useMemo(() => {
    const latBands = 10;
    const lonSegs  = 16;
    const radius   = 1;
    const subdiv   = 5;

    const rings: V3[][] = [];
    for (let i = 0; i <= latBands; i++) {
      const theta = (i / latBands) * Math.PI;
      const sinT = Math.sin(theta), cosT = Math.cos(theta);
      const r = radius * sinT, y = radius * cosT;
      const off = (i % 2 === 0) ? 0.0 : 0.5;
      const ring: V3[] = [];
      for (let j = 0; j < lonSegs; j++) {
        const phi = ((j + off) / lonSegs) * Math.PI * 2;
        ring.push([r * Math.cos(phi), y, r * Math.sin(phi)]);
      }
      rings.push(ring);
    }

    // Patrón de colores por banda + dirección (como en NieR Automata)
    // 3 tintes: 0 = claro/crema, 1 = gris, 2 = negro
    // Cada banda asigna un tinte a triángulos "down" y otro a "up"
    const TINT = [0.0, 0.5, 1.0]; // claro, gris, negro
    const bandPattern: Array<{ down: number; up: number }> = [
      { down: TINT[2], up: TINT[0] }, // banda 0: down=negro, up=claro
      { down: TINT[0], up: TINT[2] }, // banda 1: down=claro, up=negro
      { down: TINT[1], up: TINT[2] }, // banda 2: down=gris,  up=negro
      { down: TINT[2], up: TINT[0] }, // banda 3: down=negro, up=claro
      { down: TINT[0], up: TINT[1] }, // banda 4: down=claro, up=gris
      { down: TINT[2], up: TINT[1] }, // banda 5: down=negro, up=gris
      { down: TINT[1], up: TINT[0] }, // banda 6: down=gris,  up=claro
      { down: TINT[0], up: TINT[2] }, // banda 7: down=claro, up=negro
      { down: TINT[2], up: TINT[0] }, // banda 8: down=negro, up=claro
      { down: TINT[1], up: TINT[2] }, // banda 9: down=gris,  up=negro
    ];

    type OrigTri = { verts: [V3, V3, V3]; tint: number };
    const origTris: OrigTri[] = [];
    for (let i = 0; i < latBands; i++) {
      const top = rings[i], bot = rings[i + 1];
      const topOff = (i % 2 === 0) ? 0.0 : 0.5;
      const botOff = ((i + 1) % 2 === 0) ? 0.0 : 0.5;
      const pat = bandPattern[i % bandPattern.length];
      for (let j = 0; j < lonSegs; j++) {
        const j1 = (j + 1) % lonSegs;
        // 20% de probabilidad de color aleatorio, 80% sigue el patrón
        const rndTint = () => Math.random() < 0.2 ? TINT[Math.floor(Math.random() * 3)] : -1;
        const d = rndTint(), u = rndTint();
        const tDown = d >= 0 ? d : pat.down;
        const tUp   = u >= 0 ? u : pat.up;
        if (topOff < botOff) {
          origTris.push({ verts: [top[j], top[j1], bot[j]],  tint: tDown });
          origTris.push({ verts: [bot[j], top[j1], bot[j1]], tint: tUp });
        } else {
          origTris.push({ verts: [bot[j], top[j], bot[j1]],  tint: tUp });
          origTris.push({ verts: [top[j], top[j1], bot[j1]], tint: tDown });
        }
      }
    }

    const verts: number[] = [];
    const norms: number[] = [];
    const barys: number[] = [];
    const flatNorms: number[] = [];
    const tints: number[] = []; // tinte por triángulo: 0=claro, 0.5=gris, 1.0=negro
    const N = subdiv;

    for (const { verts: [A, B, C], tint: triTint } of origTris) {
      const ab: V3 = [B[0]-A[0], B[1]-A[1], B[2]-A[2]];
      const ac: V3 = [C[0]-A[0], C[1]-A[1], C[2]-A[2]];
      const fn: V3 = [
        ab[1]*ac[2] - ab[2]*ac[1],
        ab[2]*ac[0] - ab[0]*ac[2],
        ab[0]*ac[1] - ab[1]*ac[0],
      ];
      const fnLen = Math.sqrt(fn[0]*fn[0] + fn[1]*fn[1] + fn[2]*fn[2]);
      if (fnLen > 0) { fn[0] /= fnLen; fn[1] /= fnLen; fn[2] /= fnLen; }

      const subVert = (si: number, sj: number) => {
        const u = (N - si - sj) / N, v = si / N, w = sj / N;
        const px = A[0]*u + B[0]*v + C[0]*w;
        const py = A[1]*u + B[1]*v + C[1]*w;
        const pz = A[2]*u + B[2]*v + C[2]*w;
        const len = Math.sqrt(px*px + py*py + pz*pz);
        const s = len > 0 ? radius / len : 0;
        return { pos: [px*s, py*s, pz*s] as V3, bary: [u, v, w] as V3 };
      };

      const pushSub = (
        p0: { pos: V3; bary: V3 },
        p1: { pos: V3; bary: V3 },
        p2: { pos: V3; bary: V3 },
      ) => {
        for (const p of [p0, p1, p2]) {
          verts.push(p.pos[0], p.pos[1], p.pos[2]);
          const nl = Math.sqrt(p.pos[0]**2 + p.pos[1]**2 + p.pos[2]**2);
          const ns = nl > 0 ? 1/nl : 0;
          norms.push(p.pos[0]*ns, p.pos[1]*ns, p.pos[2]*ns);
          barys.push(p.bary[0], p.bary[1], p.bary[2]);
          flatNorms.push(fn[0], fn[1], fn[2]);
          tints.push(triTint); // mismo tinte para todos los sub-vértices del triángulo original
        }
      };

      for (let si = 0; si < N; si++) {
        for (let sj = 0; sj < N - si; sj++) {
          pushSub(subVert(si, sj), subVert(si+1, sj), subVert(si, sj+1));
          if (si + sj + 1 < N) {
            pushSub(subVert(si+1, sj), subVert(si+1, sj+1), subVert(si, sj+1));
          }
        }
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(verts), 3));
    geo.setAttribute('normal', new Float32BufferAttribute(new Float32Array(norms), 3));
    geo.setAttribute('aBarycentric', new Float32BufferAttribute(new Float32Array(barys), 3));
    geo.setAttribute('aFlatNormal', new Float32BufferAttribute(new Float32Array(flatNorms), 3));
    geo.setAttribute('aTriDarkness', new Float32BufferAttribute(new Float32Array(tints), 1));
    return geo;
  }, []);

  // ---- Material: vidrio transparente ----
  const bgTexture = useTexture("/images/nier/shield.jpg");
  const envMap = useEnvironment({ preset: "studio" });

  // Plano de corte del suelo (clips below Y = -1.6 en world space)
  const groundClipY = GRID_FLOOR_POS[1];

  const shieldMat = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBgTex: { value: bgTexture },
        uEnvMap: { value: envMap },
        uPlaneZ: { value: -3.0 },
        uPlaneSize: { value: new Vector2(16.0, 10.0) },
        uEnvIntensity: { value: 1.0 },
        uClipY: { value: groundClipY },
      },
      vertexShader: `
        attribute vec3 aBarycentric;
        attribute vec3 aFlatNormal;
        attribute float aTriDarkness;
        varying vec3 vBarycentric;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vFlatNormal;
        varying vec3 vViewDir;
        varying float vDarkness;
        void main() {
          vBarycentric = aBarycentric;
          vDarkness = aTriDarkness;
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vFlatNormal = normalize(mat3(modelMatrix) * aFlatNormal);
          vViewDir = normalize(vWorldPos - cameraPosition);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform sampler2D uBgTex;
        uniform sampler2D uEnvMap;
        uniform float uPlaneZ;
        uniform vec2 uPlaneSize;
        uniform float uEnvIntensity;
        uniform float uClipY;
        varying vec3 vBarycentric;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vFlatNormal;
        varying vec3 vViewDir;
        varying float vDarkness;
        #define PI 3.14159265359
        vec2 dirToEquirect(vec3 dir) {
          float phi = atan(dir.z, dir.x);
          float theta = asin(clamp(dir.y, -1.0, 1.0));
          return vec2(phi / (2.0 * PI) + 0.5, theta / PI + 0.5);
        }
        float edgeFactor(vec3 bary, float width) {
          vec3 d = fwidth(bary);
          vec3 a3 = smoothstep(vec3(0.0), d * width, bary);
          return min(min(a3.x, a3.y), a3.z);
        }
        vec3 sampleEnv(vec3 origin, vec3 dir) {
          vec3 d = normalize(dir);
          vec2 envUV = dirToEquirect(d);
          vec3 envColor = texture2D(uEnvMap, envUV).rgb * uEnvIntensity;
          return envColor;
        }
        void main() {
          // Clip: descartar todo por debajo del suelo
          if (vWorldPos.y < uClipY) discard;

          float wireWidth = 4.0;
          float edge = 1.0 - edgeFactor(vBarycentric, wireWidth);
          vec3 n = normalize(vFlatNormal);
          vec3 V = normalize(vViewDir);
          float glassIOR = 1.5;
          float eta = 1.0 / glassIOR;
          float cosI = max(dot(-V, n), 0.0);
          float F0 = pow((1.0 - glassIOR) / (1.0 + glassIOR), 2.0);
          float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosI, 5.0);
          vec3 reflDir = reflect(V, n);
          vec3 reflColor = sampleEnv(vWorldPos, reflDir);
          vec3 refrR = refract(V, n, eta * 0.996);
          vec3 refrG = refract(V, n, eta);
          vec3 refrB = refract(V, n, eta * 1.004);
          float isTIR = step(length(refrG), 0.001);
          vec3 refrColor;
          refrColor.r = sampleEnv(vWorldPos, length(refrR) > 0.001 ? refrR : reflDir).r;
          refrColor.g = sampleEnv(vWorldPos, length(refrG) > 0.001 ? refrG : reflDir).g;
          refrColor.b = sampleEnv(vWorldPos, length(refrB) > 0.001 ? refrB : reflDir).b;
          vec3 glassColor = mix(refrColor, reflColor, clamp(fresnel + isTIR, 0.0, 1.0));
          glassColor *= vec3(0.97, 0.98, 1.0);
          // Tinte por triángulo según patrón NieR (3 niveles)
          // vDarkness: 0.0=crema/claro, 0.5=gris, 1.0=negro
          vec3 tintCrema = vec3(0.88, 0.85, 0.78); // blanco cálido (color texto)
          vec3 tintGris  = vec3(0.35, 0.35, 0.38);
          vec3 tintNegro = vec3(0.03, 0.03, 0.05);
          // Interpolar entre los 3 colores
          float t = vDarkness * 2.0; // 0→0, 0.5→1, 1.0→2
          vec3 tintColor = t < 1.0
            ? mix(tintCrema, tintGris, t)
            : mix(tintGris, tintNegro, t - 1.0);
          // Intensidad del overlay según nivel
          float tintStr = vDarkness < 0.25 ? 0.2   // crema: overlay sutil
                        : vDarkness < 0.75 ? 0.5    // gris: overlay medio
                        : 0.7;                       // negro: overlay fuerte
          glassColor = mix(glassColor, tintColor, tintStr);
          // Líneas: mismo reflejo de vidrio con highlight
          vec3 edgeColor = glassColor * 1.4 + vec3(0.08);
          vec3 color = mix(glassColor, edgeColor, edge);
          color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));

          // Borde luminoso cerca del corte del suelo
          float distToClip = vWorldPos.y - uClipY;
          float clipEdge = 1.0 - smoothstep(0.0, 0.08, distToClip);
          vec3 clipGlow = vec3(0.85, 0.85, 0.9); // brillo sutil blanco-frío
          color = mix(color, clipGlow, clipEdge * 0.7);

          // Alpha según tinte
          float faceAlpha = 0.3 + tintStr * 0.35;
          float edgeAlpha = 0.3 + tintStr * 0.3;
          float alpha = mix(faceAlpha, edgeAlpha, edge);
          // Aumentar alpha cerca del corte para que se vea el borde
          alpha = max(alpha, clipEdge * 0.85);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: FrontSide,
      blending: NormalBlending,
    });
  }, [bgTexture, envMap, groundClipY]);

  // Material de la cara interna (BackSide) para grosor
  const shieldMatInner = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBgTex: { value: bgTexture },
        uEnvMap: { value: envMap },
        uPlaneZ: { value: -3.0 },
        uPlaneSize: { value: new Vector2(16.0, 10.0) },
        uEnvIntensity: { value: 1.0 },
        uClipY: { value: groundClipY },
      },
      vertexShader: shieldMat.vertexShader,
      fragmentShader: shieldMat.fragmentShader.replace(
        'vec3 n = normalize(vFlatNormal);',
        'vec3 n = -normalize(vFlatNormal);' // Normal invertida para cara interna
      ),
      transparent: true,
      depthWrite: false,
      side: BackSide,
      blending: NormalBlending,
    });
  }, [bgTexture, envMap, groundClipY, shieldMat.vertexShader, shieldMat.fragmentShader]);

  // Esfera invisible para stencil mask (confina al mech dentro del shield)
  // Clip plane para que el stencil también se corte en el suelo
  const groundClipPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), -groundClipY), [groundClipY]);
  const stencilMaskMat = useMemo(() => {
    const mat = new MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
    });
    mat.clippingPlanes = [groundClipPlane];
    mat.stencilWrite = true;
    mat.stencilRef = 1;
    mat.stencilFunc = AlwaysStencilFunc;
    mat.stencilZPass = ReplaceStencilOp;
    mat.stencilFail = KeepStencilOp;
    mat.stencilZFail = KeepStencilOp;
    return mat;
  }, [groundClipPlane]);

  const stencilSphereGeo = useMemo(() => new SphereGeometry(1, 32, 32), []);

  // Ref para rotación continua del shield
  const shieldRotRef = useRef<Group>(null);

  // Actualizar tiempo + rotación
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    shieldMat.uniforms.uTime.value = t;
    shieldMatInner.uniforms.uTime.value = t;
    if (opacityRef) {
      shieldMat.uniforms.uEnvIntensity.value = opacityRef.current.value;
      shieldMatInner.uniforms.uEnvIntensity.value = opacityRef.current.value;
    }
    // Rotación lenta en eje Y (propio de la esfera)
    if (shieldRotRef.current) {
      shieldRotRef.current.rotation.y = t * 0.2;
    }
  });

  // Anillo del corte en el suelo: dinámico según position/scale del shield
  // shieldWorldY: centro del shield en world space
  const shieldWorldY = MECH_INITIAL_POSITION[1] + position[1];
  // localClipY: donde el suelo corta la esfera unitaria en local space
  const localClipY = (groundClipY - shieldWorldY) / scale;
  // Si el corte está fuera de la esfera (|localClipY| >= 1), no hay intersección
  const hasGroundCut = Math.abs(localClipY) < 1;
  // Radio de intersección esfera-suelo en local space, ajustado por teselación
  const ringRadius = hasGroundCut
    ? Math.sqrt(1 - localClipY * localClipY) * 0.92
    : 0;
  // Grosor del anillo en local space
  const ringHalf = 0.006;

  const groundRingGeo = useMemo(() => {
    if (ringRadius <= 0) return null;
    return new RingGeometry(ringRadius - ringHalf, ringRadius + ringHalf, 128);
  }, [ringRadius, ringHalf]);

  const groundRingMat = useMemo(() => {
    return new MeshBasicMaterial({
      color: new Color(1, 1, 1),
      transparent: true,
      opacity: 0.7,
      side: DoubleSide,
      depthWrite: false,
    });
  }, []);

  // Offset proporcional para alinear visualmente con el corte del shader
  const ringYOffset = -0.02;

  return (
    <group position={position} scale={scale}>
      {/* Iluminación de ambiente para el shield */}
      <ambientLight intensity={0.6} color="#c8d8e8" />
      <pointLight position={[2, 2, 2]} intensity={8} color="#e0eaff" distance={10} />
      <pointLight position={[-2, -1, -2]} intensity={4} color="#d0d8f0" distance={10} />
      {/* Grupo rotante: shield gira en su propio eje Y */}
      <group ref={shieldRotRef}>
        {/* 1) Stencil mask: esfera invisible que escribe stencil=1 */}
        <mesh geometry={stencilSphereGeo} material={stencilMaskMat} renderOrder={0} />
        {/* 2) Shield exterior: FrontSide */}
        <mesh geometry={shieldGeo} material={shieldMat} renderOrder={2} />
        {/* 3) Shield interior: BackSide (grosor visible) */}
        <group scale={0.98}>
          <mesh geometry={shieldGeo} material={shieldMatInner} renderOrder={2} />
        </group>
      </group>
      {/* 4) Anillo plano en el corte del suelo (NO rota, queda fijo en el piso) */}
      {hasGroundCut && groundRingGeo && (
        <mesh
          geometry={groundRingGeo}
          material={groundRingMat}
          position={[0, localClipY + ringYOffset - 0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={3}
        />
      )}
    </group>
  );
}

/** Partículas brillantes que salen de los cortes del fuego, simulando disolución */
function FireDissolveParticles({
  position = [0, 0, 0] as [number, number, number],
  count = 1000,
}: {
  position?: [number, number, number];
  count?: number;
}) {
  const particlesGeo = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 3); // velocidad/offset aleatorio por partícula
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Distribuir en un volumen alrededor del mech (cilindro)
      const angle = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 0.6; // radio
      const y = -1.5 + Math.random() * 3.0; // altura
      positions[i * 3]     = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      randoms[i * 3]     = Math.random(); // seed x
      randoms[i * 3 + 1] = Math.random(); // seed y (velocidad subida)
      randoms[i * 3 + 2] = Math.random(); // seed z
      sizes[i] = 0.5 + Math.random() * 1.5;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('aRandom', new Float32BufferAttribute(randoms, 3));
    geo.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    return geo;
  }, [count]);

  const particlesMat = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute vec3 aRandom;
        attribute float aSize;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          // Cada partícula sube cíclicamente
          float life = fract(uTime * (0.04 + aRandom.y * 0.06) + aRandom.x);
          // Subir desde la posición base (más lento)
          pos.y += life * 2.5;
          // Leve movimiento lateral
          pos.x += sin(uTime * 0.25 + aRandom.z * 6.28) * 0.05 * life;
          pos.z += cos(uTime * 0.2 + aRandom.x * 6.28) * 0.05 * life;
          // Alpha: aparece, brilla, se desvanece
          vAlpha = sin(life * 3.14159) * (0.6 + aRandom.z * 0.4);
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (40.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          // Punto circular suave
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float soft = 1.0 - smoothstep(0.2, 0.5, d);
          // Color: negro como el modelo
          vec3 color = vec3(0.0, 0.0, 0.0);
          gl_FragColor = vec4(color, vAlpha * soft);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
  }, []);

  useFrame((state) => {
    particlesMat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points geometry={particlesGeo} material={particlesMat} position={position} />
  );
}

/** Esfera de fuego envolviendo al mech — con corte de suelo y anillo */
function MechFireWrap({
  position = [0, -1.0, 0] as [number, number, number],
  scale = 2.2,
}: {
  position?: [number, number, number];
  scale?: number;
}) {
  const groundClipY = GRID_FLOOR_POS[1];

  const fireMatFront = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.9 },
        uClipY: { value: groundClipY },
      },
      vertexShader: FIRE_VERTEX,
      fragmentShader: FIRE_FRAGMENT,
      transparent: true, depthWrite: false, depthTest: true, side: FrontSide, blending: NormalBlending,
    });
  }, [groundClipY]);

  const fireMatBack = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.9 },
        uClipY: { value: groundClipY },
      },
      vertexShader: FIRE_VERTEX,
      fragmentShader: FIRE_FRAGMENT,
      transparent: true, depthWrite: false, depthTest: true, side: BackSide, blending: NormalBlending,
    });
  }, [groundClipY]);


  useFrame((state) => {
    const t = state.clock.elapsedTime;
    fireMatFront.uniforms.uTime.value = t;
    fireMatBack.uniforms.uTime.value = t;
  });

  // Anillo de fuego en el suelo
  const shieldWorldY = MECH_INITIAL_POSITION[1] + position[1];
  const localClipY = (groundClipY - shieldWorldY) / scale;
  const hasGroundCut = Math.abs(localClipY) < 1;
  const ringRadius = hasGroundCut
    ? Math.sqrt(1 - localClipY * localClipY) * 0.92
    : 0;
  const ringHalf = 0.006;

  const fireRingGeo = useMemo(() => {
    if (ringRadius <= 0) return null;
    return new RingGeometry(ringRadius - ringHalf, ringRadius + ringHalf, 128);
  }, [ringRadius, ringHalf]);

  // Material del anillo: negro, igual que el modelo
  const fireRingMat = useMemo(() => {
    return new MeshBasicMaterial({
      color: new Color(0, 0, 0),
      transparent: true,
      opacity: 0.9,
      side: DoubleSide,
      depthWrite: false,
    });
  }, []);

  const ringYOffset = -0.02;

  return (
    <group position={position} scale={scale}>
      {/* Anillo blanco en el suelo (igual que shield) */}
      {hasGroundCut && fireRingGeo && (
        <mesh
          geometry={fireRingGeo}
          material={fireRingMat}
          position={[0, localClipY + ringYOffset - 0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={3}
        />
      )}
    </group>
  );
}

/** Una sola escena: terreno + grid siempre montados; según sceneId se muestran u ocultan mech/pod/BMO/cards. */
function Scene({
  sceneId,
  isGlassView,
  mechRef,
  mechBodyRef,
  wrapperMode = "warning",
}: {
  sceneId: 1 | 2;
  isGlassView: boolean;
  mechRef: React.RefObject<Object3D | null>;
  mechBodyRef: React.RefObject<RapierRigidBody | null>;
  wrapperMode?: MechWrapperMode;
}) {
  const { camera } = useThree();
  const [scene2CameraDone, setScene2CameraDone] = useState(false);
  const [scene1Opacity, setScene1Opacity] = useState(() => (sceneId === 1 ? 1 : 0));
  const isScene2 = sceneId === 2;

  const scene1OpacityRef = useRef({ value: sceneId === 1 ? 1 : 0 });
  const gridOpacityRef = useRef({ value: isScene2 ? 0 : 1 });
  const terrainOpacityRef = useRef({ value: isScene2 ? 1 : 0 });
  const mechFadeRef = useRef<Group>(null);

  useEffect(() => {
    // Mech visible en ambas escenas ahora (scene2 = solo cambio de cámara)
    camera.layers.enable(MECH_LAYER);
    return () => {
      camera.layers.disable(MECH_LAYER);
    };
  }, [camera]);

  /* Animación de cámara: ir a escena 2 o volver a escena 1 con el mismo ease suave. */
  useEffect(() => {
    if (isScene2) {
      setScene2CameraDone(false);
    } else {
      setScene2CameraDone(true);
    }
    const target = isScene2 ? SCENE2_CAMERA_FINAL : SCENE1_CAMERA;
    const tween = gsap.to(camera.position, {
      ...target,
      duration: SCENE2_CAMERA_DURATION,
      ease: SCENE2_CAMERA_EASE,
      onUpdate: () => camera.lookAt(0, 0, 0),
      onComplete: () => setScene2CameraDone(true),
    });
    return () => {
      tween.kill();
    };
  }, [camera, isScene2]);

  /* Fade in/out de elementos al cambiar de escena. */
  useEffect(() => {
    const t1 = gsap.to(scene1OpacityRef.current, {
      value: 1,
      duration: FADE_DURATION,
      ease: FADE_EASE,
      onUpdate: () => setScene1Opacity(scene1OpacityRef.current.value),
    });
    // Grid visible en escena 1, oculto en escena 2
    const tGrid = gsap.to(gridOpacityRef.current, {
      value: isScene2 ? 0 : 1,
      duration: FADE_DURATION,
      ease: FADE_EASE,
    });
    // Terreno oculto en escena 1, visible en escena 2
    const tTerrain = gsap.to(terrainOpacityRef.current, {
      value: isScene2 ? 1 : 0,
      duration: FADE_DURATION,
      ease: FADE_EASE,
    });
    return () => {
      t1.kill();
      tGrid.kill();
      tTerrain.kill();
    };
  }, [isScene2]);

  const showOrbitControls = !isScene2 || scene2CameraDone;
  const showScene1Content = true;

  return (
    <>
      {/* Iluminación de estudio enfocada en el mech */}
      <ambientLight intensity={0.35} color="#d0dae8" />
      <hemisphereLight
        color="#e0e8f5"
        groundColor="#1a2a45"
        intensity={0.5}
      />
      {/* Luz blanca principal para iluminar el mech — con sombras */}
      <directionalLight
        position={[2, 6, 5]}
        intensity={2.5}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-bias={-0.002}
      />
      {/* Key light: frontal-derecha, enfocada — con sombras */}
      <spotLight position={[3, 4, 5]} intensity={40} color="#f0f4ff" angle={0.5} penumbra={0.8} distance={15} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.002} />
      {/* Fill light: izquierda */}
      <spotLight position={[-3, 2, 4]} intensity={20} color="#d8e4f8" angle={0.6} penumbra={0.9} distance={12} />
      {/* Rim light: trasera */}
      <pointLight position={[0, 2, -4]} intensity={15} color="#c0d0f0" distance={8} />
      <MechFade
        mechRef={mechRef}
        mechFadeRef={mechFadeRef}
        scene1OpacityRef={scene1OpacityRef}
        active={showScene1Content}
      />
      {showScene1Content && <ReflectionSync mechRef={mechRef} active={isGlassView} />}
      {showScene1Content && (
        <group position={MECH_INITIAL_POSITION}>
          <group ref={mechRef} position={[0, -1.74, 0]} scale={0.02} rotation={[0, Math.PI / -6, 0]}>
            <group ref={mechFadeRef}>
              <MechModel
                useGlassMaterial={isGlassView}
                envMap={_cubeTarget.texture}
                meshRef={mechRef}
                wrapperMode={wrapperMode}
              />
            </group>
          </group>
          {/* Wrapper del mech según modo seleccionado */}
          {wrapperMode === "warning" && (
            <WarningRing scale={0.8} opacityRef={scene1OpacityRef} />
          )}
          {wrapperMode === "error" && (
            <ErrorRing scale={0.8} opacityRef={scene1OpacityRef} />
          )}
          {wrapperMode === "fire" && (
            <>
              <MechFireWrap position={[0, -0.2, -0.1]} scale={2.3} />
              <FireDissolveParticles position={[0, -1.0, 0]} count={200} />
            </>
          )}
          {wrapperMode === "shield" && (
            <MechShield position={[0, -0.2, -0.1]} scale={2.3} opacityRef={scene1OpacityRef} />
          )}
        </group>
      )}
      {/* Grid + terreno: grid solo en escena 1, terreno solo en escena 2 */}
      <group position={CENTER} rotation={[0, Math.PI / -6, 0]}>
        {/* Grid: visible en escena 1, se desvanece en escena 2 */}
        <GridRoom opacityRef={gridOpacityRef} />
        {/* Terreno: oculto en escena 1, aparece en escena 2 */}
        <FadeGroup opacityRef={terrainOpacityRef}>
          <TerrainModel />
        </FadeGroup>
        {/* Pod y BMO solo visibles en escena 1 */}
        {!isScene2 && (
        <FadeGroup opacityRef={scene1OpacityRef}>
          <PodModel />
          <BmoModel
            renderRing={(pos) => <WarningRing position={pos} scale={0.12} />}
          />
        </FadeGroup>
        )}
        {wrapperMode === "details" && (
          <FadeGroup opacityRef={scene1OpacityRef}>
            <MechTechCards opacity={scene1Opacity} animate={isScene2} />
        </FadeGroup>
        )}
      </group>
      {showOrbitControls && (
        <OrbitControls
          target={[0, 0, 0]}
          enablePan={true}
          minDistance={3}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2 + 0.2}
        />
      )}
    </>
  );
}

/*******************************************************************************
 * SCENE 2 TIMELINE SEQUENCE
 * Define los modelos que aparecen en secuencia con sus tiempos.
 * Cada item tiene: glb, startTime (segundos), duration (segundos), size, position.
 * fadeIn/fadeOut se aplican automáticamente (1s blur + opacity).
 ******************************************************************************/
type Scene2TimelineItem = {
  id: string;
  glb: string;
  startTime: number;
  duration: number;
  size?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

const SCENE2_TIMELINE: Scene2TimelineItem[] = [
  {
    id: "notebook",
    glb: NOTEBOOK_GLB,
    startTime: 0,
    duration: Infinity, // Se queda visible, no desaparece
    size: 2,
    position: [1, 0, -1],
    rotation: [Math.PI / 0, 0.1, Math.PI / 0],
  },
  // Añade más modelos aquí (startTime = cuando aparece, duration = Infinity para que se quede):
  // { id: "model2", glb: "/glb/otro.glb", startTime: 3, duration: Infinity, size: 2 },
];

const SEQUENCE_FADE_DURATION = 1;

/*******************************************************************************
 * VOLUMETRIC SMOKE/WATER SHADER - Efecto de humo/agua volumétrico estilo Ori
 * Usa la misma lógica que funciona en la esfera
 ******************************************************************************/
const waterGlowVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vNormal = normal;
    vPosition = position;
    
    // Expandir vértices hacia afuera para crear el borde (GRANDE)
    vec3 newPosition = position + normal * 0.8;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const waterGlowFragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  #define TAU 6.28318530718
  #define TILING_FACTOR 2.0
  #define MAX_ITER 8
  
  float waterHighlight(vec2 p, float time, float foaminess) {
    vec2 i = vec2(p);
    float c = 0.0;
    float foaminess_factor = mix(1.0, 6.0, foaminess);
    float inten = 0.005 * foaminess_factor;
    
    for (int n = 0; n < MAX_ITER; n++) {
      float t = time * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + t) + 0.001), p.y / (cos(i.y + t) + 0.001)));
    }
    c = 0.2 + c / (inten * float(MAX_ITER));
    c = 1.17 - pow(c, 1.4);
    c = pow(abs(c), 8.0);
    return c / sqrt(foaminess_factor);
  }
  
  void main() {
    float time = uTime * 0.1 + 23.0;
    
    // Usar las UVs del modelo (igual que la esfera)
    vec2 uv = vUv;
    
    // Foaminess uniforme
    float foaminess = 0.5;
    
    vec2 p = mod(uv * TAU * TILING_FACTOR, TAU) - 250.0;
    float c = waterHighlight(p, time, foaminess);
    
    // Umbral ALTO para mostrar SOLO las líneas más brillantes (igual que esfera)
    float threshold = 0.4;
    if (c < threshold) discard;
    
    // Normalizar intensidad
    float intensity = (c - threshold) / (1.0 - threshold);
    
    // Segundo umbral (igual que esfera)
    if (intensity < 0.3) discard;
    
    // Color morado
    vec3 lineColor = vec3(0.2, 0.2, 0.2);
    
    float alpha = intensity * uOpacity;
    
    gl_FragColor = vec4(lineColor * intensity * 2.0, alpha);
  }
`;

/** Crea el shader material para el efecto de agua/glow envolvente. */
function useWaterGlowMaterial(color: string = "#00d4ff") {
  const materialRef = useRef<ShaderMaterial | null>(null);
  
  const material = useMemo(() => {
    const mat = new ShaderMaterial({
      vertexShader: waterGlowVertexShader,
      fragmentShader: waterGlowFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uColor: { value: new Color(color) },
      },
      transparent: true,
      side: BackSide,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    materialRef.current = mat;
    return mat;
  }, [color]);
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });
  
  return material;
}

/** Clon del modelo escalado con shader de agua animado */
function WaterModelClone({
  scene,
  opacity,
  scale = 1,
}: {
  scene: Group;
  opacity: number;
  scale?: number;
}) {
  const groupRef = useRef<Group>(null);
  
  // Crear material con useRef para mantener referencia estable
  const waterMaterial = useRef(new ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      #define TAU 6.28318530718
      #define TILING_FACTOR 2.0
      #define MAX_ITER 8
      
      float waterHighlight(vec2 p, float time, float foaminess) {
        vec2 i = vec2(p);
        float c = 0.0;
        float foaminess_factor = mix(1.0, 6.0, foaminess);
        float inten = 0.005 * foaminess_factor;
        
        for (int n = 0; n < MAX_ITER; n++) {
          float t = time * (1.0 - (3.5 / float(n + 1)));
          i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
          c += 1.0 / length(vec2(p.x / (sin(i.x + t) + 0.001), p.y / (cos(i.y + t) + 0.001)));
        }
        c = 0.2 + c / (inten * float(MAX_ITER));
        c = 1.17 - pow(c, 1.4);
        c = pow(abs(c), 8.0);
        return c / sqrt(foaminess_factor);
      }
      
      void main() {
        float time = uTime * 0.1 + 23.0;
        
        // Usar las UVs del modelo
        vec2 uv = vUv;
        
        // Foaminess uniforme
        float foaminess = 0.5;
        
        vec2 p = mod(uv * TAU * TILING_FACTOR, TAU) - 250.0;
        float c = waterHighlight(p, time, foaminess);
        
        // Umbral ALTO para mostrar SOLO las líneas más brillantes
        float threshold = 0.4;
        if (c < threshold) discard;
        
        // Normalizar intensidad
        float intensity = (c - threshold) / (1.0 - threshold);
        
        // Segundo umbral
        if (intensity < 0.01) discard;
        
        // Color morado
        vec3 lineColor = vec3(0.2, 0.2, 0.2);
        
        float alpha = intensity * uOpacity;
        
        gl_FragColor = vec4(lineColor * intensity * 2.0, alpha);
      }
    `,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    },
    transparent: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    depthWrite: false,
  })).current;
  
  // Clonar la escena y aplicar el material de agua
  const waterScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.material = waterMaterial;
      }
    });
    return clone;
  }, [scene, waterMaterial]);
  
  // Actualizar tiempo y opacidad cada frame
  useFrame((state) => {
    waterMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
    waterMaterial.uniforms.uOpacity.value = opacity;
  });
  
  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={waterScene} />
    </group>
  );
}

/** Uniforms compartidos que se actualizan cada frame */
const waterUniforms = { uTime: { value: 0 } };
const smokeUniforms = { uTime: { value: 0 } };

/** Componente que actualiza los uniforms de tiempo */
function ShaderTimeUpdater() {
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    waterUniforms.uTime.value = t;
    smokeUniforms.uTime.value = t;
  });
  return null;
}

/** Shader 1: Líneas de agua que nacen desde el centro hacia afuera */
function WaterShaderPlane({ position }: { position: [number, number, number] }) {
  const materialRef = useRef<ShaderMaterial>(null);
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);
  
  return (
    <mesh position={position}>
      <planeGeometry args={[3.4, 3.4]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          varying vec2 vUv;
          
          #define TAU 6.28318530718
          #define TILING_FACTOR 1.5
          #define MAX_ITER 8
          
          float waterHighlight(vec2 p, float time, float foaminess) {
            vec2 i = vec2(p);
            float c = 0.0;
            float foaminess_factor = mix(1.0, 6.0, foaminess);
            float inten = 0.005 * foaminess_factor;
            
            for (int n = 0; n < MAX_ITER; n++) {
              float t = time * (1.0 - (3.5 / float(n + 1)));
              i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
              c += 1.0 / length(vec2(p.x / (sin(i.x + t) + 0.001), p.y / (cos(i.y + t) + 0.001)));
            }
            c = 0.2 + c / (inten * float(MAX_ITER));
            c = 1.17 - pow(c, 1.4);
            c = pow(abs(c), 8.0);
            return c / sqrt(foaminess_factor);
          }
          
          void main() {
            float time = uTime * 0.1 + 23.0;
            vec2 uv = vUv;
            
            // Centro del plano
            vec2 center = uv - 0.5;
            float dist_center = length(center);
            
            // Foaminess uniforme para líneas consistentes
            float foaminess = 0.5;
            
            vec2 p = mod(uv * TAU * TILING_FACTOR, TAU) - 250.0;
            float c = waterHighlight(p, time, foaminess);
            
            // Fade circular hacia el borde
            float circleFade = 1.0 - smoothstep(0.3, 0.5, dist_center);
            
            // Color morado
            vec3 lineColor = vec3(1, 0, 0.2);
            
            // Umbral para mostrar SOLO las líneas gruesas/brillantes
            // c alto = línea gruesa visible, c bajo = humo fino invisible
            float threshold = 0.25;
            if (c < threshold) discard;
            
            // Las líneas que pasan el umbral se muestran con fade circular
            float intensity = (c - threshold) / (1.0 - threshold); // normalizar 0-1
            intensity *= circleFade;
            
            if (intensity < 0.25) discard;
            
            float alpha = intensity;
            
            gl_FragColor = vec4(lineColor * intensity * 2.0, alpha);
          }
        `}
      />
    </mesh>
  );
}

/** Shader 2: Humo con líneas visibles (corregido) */
function SmokeShaderPlane({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <planeGeometry args={[6, 6]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={smokeUniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          varying vec2 vUv;
          
          float hash(vec3 p) {
            p = fract(p * 0.3183099 + 0.1);
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
          }
          
          float noise(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                  mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
              mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                  mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
          }
          
          float fbm(vec3 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 5; i++) {
              value += amplitude * noise(p);
              p *= 2.0;
              amplitude *= 0.5;
            }
            return value;
          }
          
          void main() {
            float t = uTime;
            vec2 uv = vUv * 2.0 - 1.0;
            
            // Camera movement
            uv += vec2(cos(t * 0.1) * 0.3, cos(t * 0.3) * 0.1);
            
            // 3D position with time
            vec3 p = vec3(uv * 3.0, t * 0.5);
            
            // Add turbulence
            p += cos(0.7 * t + p.yzx) * 0.3;
            
            // Calculate smoke tendrils using FBM
            float smoke = fbm(p);
            float smoke2 = fbm(p * 2.0 + t * 0.3);
            
            // Create line-like patterns
            float lines = pow(smoke, 2.0) * pow(smoke2, 2.0) * 8.0;
            
            // Color
            vec3 color = vec3(0.2, 0.6, 1.0) * lines;
            color += vec3(0.0, 0.3, 0.6) * smoke * 0.5;
            
            // Alpha only for the bright parts
            float alpha = lines * 1.5;
            
            // Discard dark pixels
            if (alpha < 0.05) discard;
            
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  );
}

/** Planos de prueba con los 2 shaders diferentes */
function ShaderTestPlanes() {
  return (
    <>
      {/* Shader de agua - líneas nacen del centro hacia afuera, justo detrás del modelo */}
      <WaterShaderPlane position={[0, 0, 0]} />
    </>
  );
}

/** Modelo de Aura animado desde Blender */
const AURA_GLB = "/aura 2.0/FINAL_01.glb";

function AuraModel({
  position = [0, 0, 0] as [number, number, number],
  scale = 1,
  rotation = [0, 0, 0] as [number, number, number],
}: {
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
}) {
  const groupRef = useRef<Group>(null);
  // Usar Draco decoder de Google CDN
  const { scene, animations } = useGLTF(AURA_GLB, "https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
  const { actions, names, mixer } = useAnimations(animations, groupRef);
  
  // Clonar la escena y filtrar solo los meshes de AURA
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    // Ocultar todo excepto los meshes de AURA
    clone.traverse((obj) => {
      if (obj instanceof Mesh) {
        const name = obj.name.toUpperCase();
        // Solo mostrar AURA_BLACK, AURA_GLOW, Icosphere
        if (!name.includes("AURA") && !name.includes("ICOSPHERE")) {
          obj.visible = false;
        }
      }
    });
    return clone;
  }, [scene]);
  
  // Debug: Ver qué tiene el archivo
  useEffect(() => {
    console.log("=== AURA GLB DEBUG ===");
    console.log("Animations found:", animations.length);
    console.log("Animation names:", names);
    console.log("Actions:", Object.keys(actions));
    
    // Ver estructura de la escena
    scene.traverse((obj) => {
      console.log("Object:", obj.name, obj.type);
    });
  }, [scene, animations, names, actions]);
  
  // Reproducir todas las animaciones al montar
  useEffect(() => {
    if (names.length > 0) {
      console.log("Playing animations:", names);
      names.forEach((name) => {
        const action = actions[name];
        if (action) {
          action.reset().setLoop(2200, Infinity).play(); // LoopRepeat
        }
      });
    } else {
      console.log("No animations to play");
    }
    
    return () => {
      names.forEach((name) => {
        actions[name]?.stop();
      });
    };
  }, [actions, names]);
  
  return (
    <group ref={groupRef} position={position} scale={scale} rotation={rotation}>
      <primitive object={clonedScene} />
    </group>
  );
}

/** 
 * FireLinesAura - Fuego hecho con LÍNEAS desde toda la SUPERFICIE del modelo
 * Detecta CARAS (triángulos) y crea puntos distribuidos en toda la superficie
 */
function FireAuraWrapper({
  scene,
  pointsPerFace = 3,          // Puntos por cada cara/triángulo
  lineHeight = 1.2,           // Altura de cada línea
  speed = 1.0,                // Velocidad de animación
}: {
  scene: Group;
  pointsPerFace?: number;
  lineHeight?: number;
  speed?: number;
}) {
  // Extraer puntos de toda la SUPERFICIE del modelo (caras/triángulos)
  const spawnPoints = useMemo(() => {
    const surfacePoints: Vector3[] = [];
    
    scene.traverse((obj) => {
      if (obj instanceof Mesh && obj.geometry) {
        const geo = obj.geometry;
        const posAttr = geo.getAttribute("position");
        const indexAttr = geo.index;
        
        if (!posAttr) return;
        
        obj.updateMatrixWorld();
        const matrix = obj.matrixWorld;
        
        // Función para obtener un punto del triángulo usando coordenadas baricéntricas
        const getTrianglePoint = (v0: Vector3, v1: Vector3, v2: Vector3): Vector3 => {
          // Coordenadas baricéntricas aleatorias
          let r1 = Math.random();
          let r2 = Math.random();
          if (r1 + r2 > 1) {
            r1 = 1 - r1;
            r2 = 1 - r2;
          }
          const r3 = 1 - r1 - r2;
          
          return new Vector3(
            v0.x * r1 + v1.x * r2 + v2.x * r3,
            v0.y * r1 + v1.y * r2 + v2.y * r3,
            v0.z * r1 + v1.z * r2 + v2.z * r3
          );
        };
        
        // Obtener vértice transformado
        const getVertex = (index: number): Vector3 => {
          const v = new Vector3(
            posAttr.getX(index),
            posAttr.getY(index),
            posAttr.getZ(index)
          );
          v.applyMatrix4(matrix);
          return v;
        };
        
        // Iterar sobre CARAS (triángulos)
        if (indexAttr) {
          // Geometría indexada
          const indices = indexAttr.array;
          for (let i = 0; i < indices.length; i += 3) {
            const v0 = getVertex(indices[i]);
            const v1 = getVertex(indices[i + 1]);
            const v2 = getVertex(indices[i + 2]);
            
            // Crear múltiples puntos en esta cara
            for (let p = 0; p < pointsPerFace; p++) {
              surfacePoints.push(getTrianglePoint(v0, v1, v2));
            }
          }
        } else {
          // Geometría no indexada (cada 3 vértices = 1 triángulo)
          for (let i = 0; i < posAttr.count; i += 3) {
            const v0 = getVertex(i);
            const v1 = getVertex(i + 1);
            const v2 = getVertex(i + 2);
            
            for (let p = 0; p < pointsPerFace; p++) {
              surfacePoints.push(getTrianglePoint(v0, v1, v2));
            }
          }
        }
      }
    });
    
    console.log("FireLines: Generated", surfacePoints.length, "raw surface points");
    
    // === CALCULAR BOUNDING BOX PARA DETECTAR EXTERIOR ===
    const bbox = new Box3();
    scene.traverse((obj) => {
      if (obj instanceof Mesh) {
        bbox.expandByObject(obj);
      }
    });
    
    const center = new Vector3();
    const size = new Vector3();
    bbox.getCenter(center);
    bbox.getSize(size);
    
    // === FILTRAR PUNTOS INTERIORES ===
    // Solo mantener puntos que están cerca del EXTERIOR del bounding box
    const exteriorThreshold = 0.65; // Solo puntos en el 35% exterior
    
    const exteriorPoints = surfacePoints.filter((point) => {
      // Calcular qué tan "exterior" está este punto
      // Normalizar posición relativa al bounding box (0 = centro, 1 = borde)
      const relX = Math.abs(point.x - center.x) / (size.x / 2);
      const relY = Math.abs(point.y - center.y) / (size.y / 2);
      const relZ = Math.abs(point.z - center.z) / (size.z / 2);
      
      // El punto es "exterior" si está cerca del borde en CUALQUIER eje
      const maxRel = Math.max(relX, relY, relZ);
      
      return maxRel > exteriorThreshold;
    });
    
    console.log("FireLines: Exterior points:", exteriorPoints.length, "of", surfacePoints.length);
    
    // === NORMALIZAR POR ZONAS (GRID 3D) ===
    const gridResolution = 12; // Más celdas para detectar zonas pequeñas
    const cellSizeX = size.x / gridResolution;
    const cellSizeY = size.y / gridResolution;
    const cellSizeZ = size.z / gridResolution;
    
    const minPointsPerZone = 5; // Mínimo más alto para eliminar zonas escasas
    const maxPointsPerZone = 10; // Máximo por zona
    
    // Agrupar puntos por celda
    const grid: Map<string, Vector3[]> = new Map();
    
    for (const point of exteriorPoints) {
      const cellX = Math.floor((point.x - bbox.min.x) / cellSizeX);
      const cellY = Math.floor((point.y - bbox.min.y) / cellSizeY);
      const cellZ = Math.floor((point.z - bbox.min.z) / cellSizeZ);
      const key = `${cellX},${cellY},${cellZ}`;
      
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(point);
    }
    
    // Primero: identificar celdas válidas (con suficientes puntos)
    const validCells = new Set<string>();
    grid.forEach((cellPoints, key) => {
      if (cellPoints.length >= minPointsPerZone) {
        validCells.add(key);
      }
    });
    
    // Segundo: verificar que cada celda tenga vecinos activos
    // Eliminar celdas aisladas
    const minNeighbors = 1; // Al menos 1 vecino activo
    const connectedCells = new Set<string>();
    
    validCells.forEach((key) => {
      const [cx, cy, cz] = key.split(",").map(Number);
      let neighborCount = 0;
      
      // Revisar 26 vecinos (3x3x3 - 1)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            const neighborKey = `${cx + dx},${cy + dy},${cz + dz}`;
            if (validCells.has(neighborKey)) {
              neighborCount++;
            }
          }
        }
      }
      
      if (neighborCount >= minNeighbors) {
        connectedCells.add(key);
      }
    });
    
    // Filtrar zonas y normalizar cantidad
    const normalizedPoints: Vector3[] = [];
    
    connectedCells.forEach((key) => {
      const cellPoints = grid.get(key)!;
      
      // Mezclar y limitar al máximo
      const shuffled = [...cellPoints].sort(() => Math.random() - 0.5);
      const limited = shuffled.slice(0, maxPointsPerZone);
      
      normalizedPoints.push(...limited);
    });
    
    console.log("FireLines: Valid cells:", validCells.size, "Connected cells:", connectedCells.size);
    
    console.log("FireLines: Grid zones:", grid.size, "Connected zones:", connectedCells.size);
    
    // Filtro final de distancia mínima - más separación
    const minDistance = 0.035;
    const filteredPoints: Vector3[] = [];
    const shuffledFinal = [...normalizedPoints].sort(() => Math.random() - 0.5);
    
    for (const point of shuffledFinal) {
      let tooClose = false;
      for (const accepted of filteredPoints) {
        if (point.distanceTo(accepted) < minDistance) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        filteredPoints.push(point);
      }
    }
    
    console.log("FireLines: Final normalized to", filteredPoints.length, "points");
    return filteredPoints;
  }, [scene, pointsPerFace]);
  
  const actualLineCount = spawnPoints.length;
  
  // Crear geometría de PARTÍCULAS - ALEATORIO como fuego real
  const geometry = useMemo(() => {
    const particlesPerPoint = 18; // Reducido para menos densidad
    const spreadRadius = 0.06; // Radio de dispersión horizontal
    
    const totalParticles = actualLineCount * particlesPerPoint;
    
    if (totalParticles === 0) return new BufferGeometry();
    
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const progress = new Float32Array(totalParticles);
    const lineIndex = new Float32Array(totalParticles);
    const heightMult = new Float32Array(totalParticles);
    const sizes = new Float32Array(totalParticles);
    
    let particleIdx = 0;
    
    for (let l = 0; l < actualLineCount; l++) {
      const basePoint = spawnPoints[l];
      
      // Altura aleatoria para este grupo de llamas
      const baseHeightMult = 0.3 + Math.random() * 1.8;
      const maxHeight = lineHeight * baseHeightMult;
      
      for (let p = 0; p < particlesPerPoint; p++) {
        // Posición ALEATORIA en altura (no ordenada)
        const t = Math.random(); // Altura aleatoria 0-1
        const actualHeight = t * maxHeight;
        
        // Dispersión horizontal ALEATORIA (más dispersión arriba)
        const dispersion = spreadRadius * (0.3 + t * 0.7);
        const randAngle = Math.random() * Math.PI * 2;
        const randRadius = Math.random() * dispersion;
        const offsetX = Math.cos(randAngle) * randRadius;
        const offsetY = Math.sin(randAngle) * randRadius;
        
        // Posición final con ruido adicional
        positions[particleIdx * 3] = basePoint.x + offsetX + (Math.random() - 0.5) * 0.02;
        positions[particleIdx * 3 + 1] = basePoint.y + offsetY + (Math.random() - 0.5) * 0.02;
        positions[particleIdx * 3 + 2] = basePoint.z + actualHeight;
        
        // Color morado OSCURO con variación
        const brightness = 0.2 + Math.random() * 0.3;
        colors[particleIdx * 3] = brightness * (0.15 + Math.random() * 0.1);
        colors[particleIdx * 3 + 1] = 0.0;
        colors[particleIdx * 3 + 2] = brightness * (0.2 + Math.random() * 0.15);
        
        progress[particleIdx] = t;
        lineIndex[particleIdx] = l + Math.random() * 100; // Índice con variación
        heightMult[particleIdx] = baseHeightMult * (0.5 + Math.random());
        
        // Tamaño PEQUEÑO y aleatorio (no depende de la altura)
        sizes[particleIdx] = 0.015 + Math.random() * 0.025;
        
        particleIdx++;
      }
    }
    
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    geo.setAttribute("progress", new BufferAttribute(progress, 1));
    geo.setAttribute("lineIdx", new BufferAttribute(lineIndex, 1));
    geo.setAttribute("heightMult", new BufferAttribute(heightMult, 1));
    geo.setAttribute("size", new BufferAttribute(sizes, 1));
    
    return geo;
  }, [actualLineCount, lineHeight, spawnPoints]);
  
  // Material con shader de fuego - PARTÍCULAS con altura reactiva
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: speed },
        uLineHeight: { value: lineHeight },
      },
      vertexShader: `
        attribute float progress;
        attribute float lineIdx;
        attribute float heightMult;
        attribute float size;
        
        uniform float uTime;
        uniform float uSpeed;
        uniform float uLineHeight;
        
        varying float vProgress;
        varying float vLineIdx;
        varying vec3 vColor;
        varying float vHeightMult;
        
        // Noise simple
        float hash(float n) { return fract(sin(n) * 43758.5453); }
        
        void main() {
          vProgress = progress;
          vLineIdx = lineIdx;
          vHeightMult = heightMult;
          
          float t = uTime * uSpeed;
          
          // Offset único por línea
          float lineOffset = hash(lineIdx * 12.9898);
          
          // === ANIMACIÓN DE ALTURA REACTIVA - REDUCIDA ===
          float heightPulse = sin(t * 2.5 + lineOffset * 20.0) * 0.2 + 0.7;
          float heightFlicker = sin(t * 8.0 + lineIdx * 5.0) * 0.08;
          float dynamicHeight = heightMult * (heightPulse + heightFlicker);
          
          // Desplazamiento vertical - altura reducida
          float zOffset = progress * dynamicHeight * 0.08;
          
          // === OLEAJE EN X - movimiento de brisa/fuego ===
          // Onda principal que se mueve con el tiempo
          float breezePhase = t * 2.0 + lineOffset * 15.0;
          float breezeWave = sin(breezePhase + progress * 4.0) * 0.15;
          
          // Segunda onda más rápida para variación
          float breezeWave2 = sin(t * 3.5 + progress * 6.0 + lineIdx * 0.5) * 0.08;
          
          // Intensidad aumenta con la altura (más arriba = más movimiento)
          float breezeIntensity = progress * progress * 1.5;
          
          // Ondulación lateral Y (menor)
          float waveY = cos(progress * 5.0 + t * 1.5 + lineOffset * 8.0) * 0.04;
          
          vec3 pos = position;
          pos.x += (breezeWave + breezeWave2) * breezeIntensity;
          pos.y += waveY * breezeIntensity;
          pos.z += zOffset;
          
          // Color OSCURO
          float darkness = 0.15 + progress * 0.25;
          float heightFactor = dynamicHeight * 0.3 + 0.2;
          
          vColor = vec3(
            darkness * heightFactor * 0.8,
            0.0,
            darkness * heightFactor * 1.2
          );
          
          // Flickering
          float flicker = 0.7 + 0.3 * sin(t * 8.0 + lineOffset * 40.0);
          vColor *= flicker;
          
          // Posición y tamaño de partícula
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // Tamaño dinámico pequeño con variación
          float dynamicSize = size * (0.8 + sin(t * 6.0 + lineIdx * 3.0) * 0.4);
          // Partículas más pequeñas
          gl_PointSize = dynamicSize * (400.0 / -mvPosition.z);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vProgress;
        varying float vLineIdx;
        varying vec3 vColor;
        varying float vHeightMult;
        
        uniform float uTime;
        
        #define TAU 6.28318530718
        #define TILING_FACTOR 2.0
        #define MAX_ITER 5
        
        float waterHighlight(vec2 p, float time, float foaminess) {
          vec2 i = vec2(p);
          float c = 0.0;
          float foaminess_factor = mix(1.0, 6.0, foaminess);
          float inten = 0.005 * foaminess_factor;
          
          for (int n = 0; n < MAX_ITER; n++) {
            float t = time * (1.0 - (3.5 / float(n + 1)));
            i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
            c += 1.0 / length(vec2(p.x / (sin(i.x + t) + 0.001), p.y / (cos(i.y + t) + 0.001)));
          }
          c = 0.2 + c / (inten * float(MAX_ITER));
          c = 1.17 - pow(c, 1.4);
          c = pow(abs(c), 8.0);
          return c / sqrt(foaminess_factor);
        }
        
        void main() {
          vec2 uv = gl_PointCoord;
          float time = uTime * 0.2 + vLineIdx * 0.1;
          
          // Patrón de agua en la partícula
          vec2 p = mod(uv * TAU * TILING_FACTOR, TAU) - 250.0;
          float c = waterHighlight(p, time, 0.5);
          
          // Umbral para transparencia
          float threshold = 0.25;
          if (c < threshold) discard;
          
          float intensity = (c - threshold) / (1.0 - threshold);
          
          // Forma circular suave para las partículas
          float dist = length(uv - 0.5);
          if (dist > 0.5) discard;
          
          float edge = 1.0 - smoothstep(0.3, 0.5, dist);
          intensity *= edge;
          
          if (intensity < 0.1) discard;
          
          // Color morado brillante
          vec3 baseColor = vec3(.1, .1, .1);
          vec3 brightColor = vec3(1, 1, 1);
          vec3 color = mix(baseColor, brightColor, intensity);
          
          // Fade por altura
          float heightFade = 1.0 - vProgress * 0.4;
          
          // Oscilación de opacidad
          float oscillation = 0.5 + 0.5 * sin(uTime * 4.0 + vLineIdx * 3.0 + vProgress * 5.0);
          
          // Alpha con máximo 0.5 y oscilación
          float baseAlpha = intensity * heightFade;
          float alpha = min(baseAlpha * (0.4 + oscillation * 0.4), 0.1);
          
          gl_FragColor = vec4(color * 1.5, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
  }, [speed, lineHeight]);
  
  // === GEOMETRÍA DE LÍNEAS SIMPLES ===
  const lineGeometry = useMemo(() => {
    const segmentsPerLine = 8;
    const linesPerPoint = 4;
    
    const totalLines = actualLineCount * linesPerPoint;
    const totalVertices = totalLines * segmentsPerLine * 2;
    
    if (totalVertices === 0) return new BufferGeometry();
    
    const positions = new Float32Array(totalVertices * 3);
    const colors = new Float32Array(totalVertices * 3);
    
    let vertexOffset = 0;
    
    for (let l = 0; l < actualLineCount; l++) {
      const basePoint = spawnPoints[l];
      const baseHeightMult = 0.4 + Math.random() * 1.4;
      
      for (let p = 0; p < linesPerPoint; p++) {
        const actualHeight = lineHeight * baseHeightMult * (0.6 + Math.random() * 0.6);
        
        const angle = (p / linesPerPoint) * Math.PI * 2 + Math.random() * 0.5;
        const offsetX = Math.cos(angle) * 0.02;
        const offsetY = Math.sin(angle) * 0.02;
        
        for (let s = 0; s < segmentsPerLine; s++) {
          const t0 = s / segmentsPerLine;
          const t1 = (s + 1) / segmentsPerLine;
          
          const vertIdx = vertexOffset;
          vertexOffset += 2;
          
          positions[vertIdx * 3] = basePoint.x + offsetX * (1 - t0 * 0.5);
          positions[vertIdx * 3 + 1] = basePoint.y + offsetY * (1 - t0 * 0.5);
          positions[vertIdx * 3 + 2] = basePoint.z + t0 * actualHeight;
          
          positions[(vertIdx + 1) * 3] = basePoint.x + offsetX * (1 - t1 * 0.5);
          positions[(vertIdx + 1) * 3 + 1] = basePoint.y + offsetY * (1 - t1 * 0.5);
          positions[(vertIdx + 1) * 3 + 2] = basePoint.z + t1 * actualHeight;
          
          // Color morado
          const brightness = 0.4 + t0 * 0.3;
          colors[vertIdx * 3] = 0.25 * brightness;
          colors[vertIdx * 3 + 1] = 0.0;
          colors[vertIdx * 3 + 2] = 0.35 * brightness;
          colors[(vertIdx + 1) * 3] = 0.2 * (0.4 + t1 * 0.3);
          colors[(vertIdx + 1) * 3 + 1] = 0.0;
          colors[(vertIdx + 1) * 3 + 2] = 0.3 * (0.4 + t1 * 0.3);
        }
      }
    }
    
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    
    return geo;
  }, [actualLineCount, lineHeight, spawnPoints]);
  
  // Material con shader de agua para líneas
  const lineMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute vec3 color;
        uniform float uTime;
        varying vec3 vColor;
        varying vec3 vPosition;
        
        void main() {
          vColor = color;
          vPosition = position;
          
          vec3 pos = position;
          // Pequeña ondulación
          float wave = sin(pos.z * 10.0 + uTime * 2.0) * 0.01;
          pos.x += wave;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying vec3 vPosition;
        uniform float uTime;
        
        #define TAU 6.28318530718
        #define TILING_FACTOR 4.0
        #define MAX_ITER 4
        
        float waterHighlight(vec2 p, float time, float foaminess) {
          vec2 i = vec2(p);
          float c = 0.0;
          float foaminess_factor = mix(1.0, 6.0, foaminess);
          float inten = 0.005 * foaminess_factor;
          
          for (int n = 0; n < MAX_ITER; n++) {
            float t = time * (1.0 - (3.5 / float(n + 1)));
            i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
            c += 1.0 / length(vec2(p.x / (sin(i.x + t) + 0.001), p.y / (cos(i.y + t) + 0.001)));
          }
          c = 0.2 + c / (inten * float(MAX_ITER));
          c = 1.17 - pow(c, 1.4);
          c = pow(abs(c), 8.0);
          return c / sqrt(foaminess_factor);
        }
        
        void main() {
          float time = uTime * 0.15 + 23.0;
          
          // Usar posición para el patrón
          vec2 uv = vec2(vPosition.x * 5.0, vPosition.z * 2.0);
          vec2 p = mod(uv * TAU * TILING_FACTOR, TAU) - 250.0;
          float c = waterHighlight(p, time, 0.4);
          
          // Umbral para transparencia
          float threshold = 0.2;
          if (c < threshold) discard;
          
          float intensity = (c - threshold) / (1.0 - threshold);
          
          if (intensity < 0.1) discard;
          
          // Color morado brillante
          vec3 baseColor = vec3(0.35, 0.0, 0.5);
          vec3 brightColor = vec3(0.55, 0.0, 0.75);
          vec3 color = mix(baseColor, brightColor, intensity);
          
          float alpha = intensity * 0.9;
          
          gl_FragColor = vec4(color * 1.5, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      vertexColors: true,
    });
  }, []);
  
  const linesRef = useRef<LineSegments>(null);
  
  // Animar líneas
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (lineMaterial.uniforms) {
      lineMaterial.uniforms.uTime.value = time;
    }
  });
  
  if (spawnPoints.length === 0) return null;
  
  return (
    <group>
      {/* Líneas de fuego */}
      <lineSegments ref={linesRef} geometry={lineGeometry} material={lineMaterial} />
    </group>
  );
}

/** Esfera con el shader de agua animado - envuelve el modelo */
function WaterSphere({ 
  position = [0, 0, 0] as [number, number, number],
  scale = 1.35,
  overflow = 0.2
}: { 
  position?: [number, number, number];
  scale?: number;
  overflow?: number;
}) {
  const materialRef = useRef<ShaderMaterial>(null);
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOverflow: { value: overflow }
  }), [overflow]);
  
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        side={DoubleSide}
        blending={AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform float uOverflow;
          
          varying vec2 vUv;
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying float vDisplacement;
          
          // Función de ruido simple
          float hash(vec3 p) {
            p = fract(p * 0.3183099 + 0.1);
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
          }
          
          float noise(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            
            return mix(
              mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                  mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
              mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                  mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
          }
          
          // FBM para ondulaciones más orgánicas
          float fbm(vec3 p, float t) {
            float value = 0.0;
            float amplitude = 0.5;
            
            for (int i = 0; i < 4; i++) {
              value += amplitude * noise(p + t * 0.3);
              p *= 2.0;
              amplitude *= 0.5;
            }
            return value;
          }
          
          void main() {
            vUv = uv;
            vPosition = position;
            vNormal = normal;
            
            // Calcular desplazamiento basado en ruido animado
            float t = uTime * 0.5;
            vec3 noisePos = position * 3.0 + vec3(t * 0.2, t * 0.3, t * 0.1);
            
            // Ruido para el overflow (ondulación hacia afuera)
            float displacement = fbm(noisePos, t) * uOverflow;
            
            // Añadir ondas adicionales
            displacement += sin(position.y * 5.0 + t * 2.0) * 0.03 * uOverflow;
            displacement += cos(position.x * 4.0 + t * 1.5) * 0.02 * uOverflow;
            
            vDisplacement = displacement;
            
            // Expandir vértices hacia afuera con el desplazamiento
            vec3 newPosition = position + normal * displacement;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uOverflow;
          
          varying vec2 vUv;
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying float vDisplacement;
          
          #define TAU 6.28318530718
          #define TILING_FACTOR 2.0
          #define MAX_ITER 8
          
          float waterHighlight(vec2 p, float time, float foaminess) {
            vec2 i = vec2(p);
            float c = 0.0;
            float foaminess_factor = mix(1.0, 6.0, foaminess);
            float inten = 0.005 * foaminess_factor;
            
            for (int n = 0; n < MAX_ITER; n++) {
              float t = time * (1.0 - (3.5 / float(n + 1)));
              i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
              c += 1.0 / length(vec2(p.x / (sin(i.x + t) + 0.001), p.y / (cos(i.y + t) + 0.001)));
            }
            c = 0.2 + c / (inten * float(MAX_ITER));
            c = 1.17 - pow(c, 1.4);
            c = pow(abs(c), 8.0);
            return c / sqrt(foaminess_factor);
          }
          
          void main() {
            float time = uTime * 0.1 + 23.0;
            
            // Usar las UVs de la esfera para el patrón
            vec2 uv = vUv;
            
            // Foaminess uniforme
            float foaminess = 0.5;
            
            vec2 p = mod(uv * TAU * TILING_FACTOR, TAU) - 250.0;
            float c = waterHighlight(p, time, foaminess);
            
            // Umbral para mostrar las líneas brillantes
            float threshold = 0.4;
            if (c < threshold) discard;
            
            // Normalizar intensidad
            float intensity = (c - threshold) / (1.0 - threshold);
            
            // Intensificar en las zonas de overflow (donde hay más desplazamiento)
            float overflowBoost = 1.0 + vDisplacement * 2.0;
            intensity *= overflowBoost;
            
            // Segundo umbral
            if (intensity < 0.2) discard;
            
            // Color morado
            vec3 lineColor = vec3(0.5, 0.0, 0.5);
            
            float alpha = intensity;
            
            gl_FragColor = vec4(lineColor * intensity * 2.0, alpha);
          }
        `}
      />
    </mesh>
  );
}

/** Modelo individual en la secuencia con fade in y efecto diamante + borde glow estilo Ori. */
function SequencedModel({
  item,
  elapsedTime,
  reflectionRef,
}: {
  item: Scene2TimelineItem;
  elapsedTime: number;
  reflectionRef?: React.RefObject<Group | null>;
}) {
  const { scene, animations } = useGLTF(item.glb);
  const groupRef = useRef<Group>(null);
  
  // Clonar la escena como hace el mech
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  
  const { actions, names } = useAnimations(animations, groupRef);

  const localTime = elapsedTime - item.startTime;
  // Solo fade in, sin fade out - el modelo se queda visible
  const fadeIn = Math.min(1, Math.max(0, localTime / SEQUENCE_FADE_DURATION));
  const opacity = fadeIn;
  const blurScale = 0.95 + 0.05 * opacity;
  const isVisible = localTime >= 0;

  const modelScale = useMemo(() => {
    const c = clonedScene.clone(true);
    c.updateMatrixWorld(true);
    const box = new Box3().setFromObject(c);
    const size = new Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    return (item.size ?? 2) / maxDim;
  }, [clonedScene, item.size]);

  // Sincronizar reflectionRef con groupRef para que el cubeCamera capture reflejos
  useEffect(() => {
    if (reflectionRef && groupRef.current) {
      (reflectionRef as React.MutableRefObject<Group | null>).current = groupRef.current;
    }
  }, [reflectionRef]);

  // Material con shader de agua pero color morado oscuro para transparencia
  const waterFireMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.9 },
      },
      vertexShader: `
        uniform float uTime;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDisplacement;
        
        // Función de ruido simple
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        
        float noise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          return mix(
            mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        
        float fbm(vec3 p, float t) {
          float value = 0.0;
          float amplitude = 0.5;
          
          for (int i = 0; i < 3; i++) {
            value += amplitude * noise(p + t * 0.3);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        void main() {
          vUv = uv;
          vPosition = position;
          vNormal = normal;
          
          float t = uTime * 0.5;
          vec3 noisePos = position * 3.0 + vec3(t * 0.2, t * 0.3, t * 0.1);
          
          // Pequeño desplazamiento para efecto orgánico
          float displacement = fbm(noisePos, t) * 0.05;
          vDisplacement = displacement;
          
          vec3 newPosition = position + normal * displacement;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDisplacement;
        
        #define TAU 6.28318530718
        #define TILING_FACTOR 3.0
        #define MAX_ITER 6
        
        float waterHighlight(vec2 p, float time, float foaminess) {
          vec2 i = vec2(p);
          float c = 0.0;
          float foaminess_factor = mix(1.0, 6.0, foaminess);
          float inten = 0.005 * foaminess_factor;
          
          for (int n = 0; n < MAX_ITER; n++) {
            float t = time * (1.0 - (3.5 / float(n + 1)));
            i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
            c += 1.0 / length(vec2(p.x / (sin(i.x + t) + 0.001), p.y / (cos(i.y + t) + 0.001)));
          }
          c = 0.2 + c / (inten * float(MAX_ITER));
          c = 1.17 - pow(c, 1.4);
          c = pow(abs(c), 8.0);
          return c / sqrt(foaminess_factor);
        }
        
        void main() {
          float time = uTime * 0.15 + 23.0;
          
          vec2 uv = vUv;
          float foaminess = 0.4;
          
          vec2 p = mod(uv * TAU * TILING_FACTOR, TAU) - 250.0;
          float c = waterHighlight(p, time, foaminess);
          
          // Umbral para transparencia - partes claras visibles, oscuras transparentes
          float threshold = 0.3;
          if (c < threshold) discard;
          
          float intensity = (c - threshold) / (1.0 - threshold);
          intensity *= 1.0 + vDisplacement * 3.0;
          
          if (intensity < 0.15) discard;
          
          // Color morado oscuro
          vec3 baseColor = vec3(0, 0, 0);
          vec3 brightColor = vec3(0.3, 0, 0.5);
          vec3 color = mix(baseColor, brightColor, intensity);
          
          float alpha = intensity * uOpacity;
          
          gl_FragColor = vec4(color * 1.5, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: NormalBlending,
    });
  }, []);
  
  // Aplicar material con shader de agua a la escena clonada
  useEffect(() => {
    if (!clonedScene) return;
    clonedScene.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.material = waterFireMaterial;
      }
    });
  }, [clonedScene, waterFireMaterial]);

  useEffect(() => {
    if (names.length > 0 && actions[names[0]]) {
      actions[names[0]]?.reset().fadeIn(0.5).play();
    }
    return () => {
      names.forEach((name) => actions[name]?.fadeOut(0.5));
    };
  }, [actions, names]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    g.visible = isVisible && opacity > 0.01;
    g.scale.setScalar(modelScale * blurScale);
    // Animar shader de agua y actualizar opacidad
    if (waterFireMaterial.uniforms) {
      waterFireMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
      waterFireMaterial.uniforms.uOpacity.value = 0.7 * opacity;
    }
  });

  if (!isVisible) return null;

  return (
    <group
      ref={groupRef}
      position={item.position ?? [0, -1.4, 0]}
      rotation={item.rotation ?? [0, 0, 0]}
    >
      <primitive object={clonedScene} />
      {/* Aura de fuego - líneas desde toda la SUPERFICIE EXTERIOR */}
      <FireAuraWrapper 
        scene={clonedScene} 
        pointsPerFace={20}
        lineHeight={0.7}
        speed={1.5}
      />
    </group>
  );
}

/** Plano de fondo con imagen para reflejos en escena 2. Posicionado en coordenadas globales. */
function BackgroundImagePlane({ visible }: { visible: boolean }) {
  const texture = useTexture("/images/animal crossing/classroom.webp");
  if (!visible) return null;
  return (
    <mesh position={[0, 0, -4]}>
      <planeGeometry args={[10, 6]} />
      <meshBasicMaterial map={texture} side={DoubleSide} />
    </mesh>
  );
}

/*******************************************************************************
 * MORPHING PARTICLES SYSTEM - Copia exacta del proyecto original
 * Usa el archivo models.glb que contiene 4 modelos en un solo archivo
 ******************************************************************************/
const MORPH_MODELS_GLB = "/glb/morph_models.glb";

// Simplex Noise 3D GLSL - Exacto del proyecto original
const simplexNoise3dGLSL = `
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float simplexNoise3d(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

// ============================================================================
// CURL NOISE GLSL - Implementación completa del glsl-curl-noise2
// ============================================================================
const curlNoiseGLSL = `
// Simplex 3D Noise
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

vec3 snoiseVec3( vec3 x ){
  float s  = snoise(vec3( x ));
  float s1 = snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
  float s2 = snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
  vec3 c = vec3( s , s1 , s2 );
  return c;
}

vec3 curl( vec3 p ){
  const float e = .1;
  vec3 dx = vec3( e   , 0.0 , 0.0 );
  vec3 dy = vec3( 0.0 , e   , 0.0 );
  vec3 dz = vec3( 0.0 , 0.0 , e   );

  vec3 p_x0 = snoiseVec3( p - dx );
  vec3 p_x1 = snoiseVec3( p + dx );
  vec3 p_y0 = snoiseVec3( p - dy );
  vec3 p_y1 = snoiseVec3( p + dy );
  vec3 p_z0 = snoiseVec3( p - dz );
  vec3 p_z1 = snoiseVec3( p + dz );

  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

  const float divisor = 1.0 / ( 2.0 * e );
  return normalize( vec3( x , y , z ) * divisor );
}
`;

// ============================================================================
// SIMULATION MATERIAL - Con morphing entre modelos
// ============================================================================
const simulationVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const simulationFragmentShader = `
uniform sampler2D positionsA;
uniform sampler2D positionsB;
uniform float uProgress;
uniform float uTime;
uniform float uCurlFreq;
varying vec2 vUv;

${curlNoiseGLSL}

void main() {
  float t = uTime * 0.015;
  
  // Obtener posiciones de ambos modelos
  vec3 posA = texture2D(positionsA, vUv).rgb;
  vec3 posB = texture2D(positionsB, vUv).rgb;
  
  // Interpolar entre las dos posiciones según el progreso del morph
  vec3 pos = mix(posA, posB, uProgress);
  
  // Añadir un poco de curl noise para dar vida (pero mantener la forma)
  vec3 curlOffset = curl(pos * uCurlFreq + t) * 0.3;
  
  gl_FragColor = vec4(pos + curlOffset, 1.0);
}
`;

// ============================================================================
// DOF POINTS MATERIAL - EXACTO del proyecto original
// ============================================================================
const dofPointsVertexShader = `
uniform sampler2D positions;
uniform float uTime;
uniform float uFocus;
uniform float uFov;
uniform float uBlur;
uniform float uBaseSize;
varying float vDistance;

void main() { 
  vec3 pos = texture2D(positions, position.xy).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vDistance = abs(uFocus - -mvPosition.z);
  
  // Tamaño base para todas las partículas + bokeh para algunas
  float bokeh = step(1.0 - (1.0 / uFov), position.x);
  float bokehSize = bokeh * vDistance * uBlur * 0.5;
  gl_PointSize = uBaseSize + bokehSize;
}
`;

const dofPointsFragmentShader = `
varying float vDistance;

void main() {
  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  if (dot(cxy, cxy) > 1.0) discard;
  // Partículas negras para fondo claro
  gl_FragColor = vec4(vec3(0.0), (1.04 - clamp(vDistance * 1.5, 0.0, 1.0)));
}
`;

/** Extrae todas las posiciones de vértices de una escena GLB */
function extractAllPositions(scene: Group): Float32Array {
  const allPositions: number[] = [];
  scene.traverse((obj) => {
    if (obj instanceof Mesh && obj.geometry) {
      const posAttr = obj.geometry.getAttribute("position");
      if (!posAttr) return;
      obj.updateMatrixWorld(true);
      for (let i = 0; i < posAttr.count; i++) {
        const v = new Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        v.applyMatrix4(obj.matrixWorld);
        allPositions.push(v.x, v.y, v.z);
      }
    }
  });
  return new Float32Array(allPositions);
}

// Rutas de los modelos GLB y sus offsets Y para centrar
const MORPH_GLB_PATHS = [
  "/glb/military_mech.glb",          // 0: Mech (primero)
  "/glb/notebook_and_pen.glb",       // 1: Notebook
  "/glb/genshin_impact__paimon.glb", // 2: Paimon
];

// AJUSTA AQUÍ EL OFFSET Y DE CADA MODELO PARA CENTRARLO
// Valores negativos mueven hacia abajo, positivos hacia arriba
const MORPH_MODEL_Y_OFFSETS = [
  0,     // Mech - está bien centrado
  0,     // Notebook - ajustar si es necesario
  -1.5,  // Paimon - bajar porque está muy arriba
];

/** Componente de Morphing de Partículas - Carga GLBs */
// Configuración de las partículas
const PARTICLE_SIZE = 724;       // 724x724 = 524176 partículas (100% más)
const PARTICLE_SPEED = 5;        // Velocidad del curl noise
const PARTICLE_FOV = 36;         // fov para bokeh
const PARTICLE_APERTURE = 5.6;   // apertura
const PARTICLE_FOCUS = 6.48;     // foco
const PARTICLE_CURL = 0.01;      // curl frequency muy bajo para mantener forma estable

/** Convierte posiciones de modelo a DataTexture del tamaño correcto */
function createPositionsTexture(positions: Float32Array, textureSize: number): DataTexture {
  const count = textureSize * textureSize;
  const data = new Float32Array(count * 4);
  const numPositions = positions.length / 3;
  
  for (let i = 0; i < count; i++) {
    const srcIdx = (i % numPositions) * 3;
    const dstIdx = i * 4;
    data[dstIdx] = positions[srcIdx];
    data[dstIdx + 1] = positions[srcIdx + 1];
    data[dstIdx + 2] = positions[srcIdx + 2];
    data[dstIdx + 3] = 1;
  }
  
  const texture = new DataTexture(data, textureSize, textureSize, RGBAFormat, FloatType);
  texture.needsUpdate = true;
  return texture;
}

/** Componente de Partículas con Morphing entre modelos GLB */
function MorphingParticles({ 
  morphIndex,
  controls,
}: { 
  morphIndex: number;
  controls: ParticleControls;
}) {
  const size = PARTICLE_SIZE;
  const { speed, fov, aperture, focus, curl, baseSize, modelOffsets } = controls;
  
  // Cargar todos los modelos GLB
  const notebook = useGLTF(MORPH_GLB_PATHS[0]);
  const paimon = useGLTF(MORPH_GLB_PATHS[1]);
  const mech = useGLTF(MORPH_GLB_PATHS[2]);
  
  // Extraer posiciones de cada modelo y crear texturas (con offsets dinámicos)
  const modelTextures = useMemo(() => {
    const models = [notebook.scene, paimon.scene, mech.scene];
    
    return models.map((scene, idx) => {
      const offset = modelOffsets[idx];
      
      // Clonar la escena para no modificar el original
      const clonedScene = scene.clone(true);
      
      // Aplicar offset
      clonedScene.position.set(offset.x, offset.y, offset.z);
      clonedScene.updateMatrixWorld(true);
      
      // Extraer posiciones
      const positions = extractAllPositions(clonedScene);
      
      // Escalar posiciones según el scale del modelo
      const scaledPositions = new Float32Array(positions.length);
      let maxDist = 0;
      for (let i = 0; i < positions.length; i += 3) {
        const dist = Math.sqrt(
          positions[i] ** 2 + positions[i + 1] ** 2 + positions[i + 2] ** 2
        );
        if (dist > maxDist) maxDist = dist;
      }
      const scale = offset.scale / Math.max(maxDist, 0.001);
      for (let i = 0; i < positions.length; i++) {
        scaledPositions[i] = positions[i] * scale;
      }
      
      return createPositionsTexture(scaledPositions, size);
    });
  }, [notebook.scene, paimon.scene, mech.scene, size, modelOffsets]);
  
  // Estado del morph
  const [currentIdx, setCurrentIdx] = useState(0);
  const [targetIdx, setTargetIdx] = useState(0);
  const progressRef = useRef({ value: 0 });
  
  // Cuando cambia morphIndex, iniciar animación
  useEffect(() => {
    if (morphIndex !== targetIdx) {
      setCurrentIdx(targetIdx);
      setTargetIdx(morphIndex);
      progressRef.current.value = 0;
      
      gsap.to(progressRef.current, {
        value: 1,
        duration: 1.5,
        ease: "power2.inOut"
      });
    }
  }, [morphIndex, targetIdx]);
  
  // Set up FBO scene
  const [fboScene] = useState(() => new ThreeScene());
  const [fboCamera] = useState(() => new OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1));
  
  // FBO target
  const target = useFBO(size, size, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    format: RGBAFormat,
    type: FloatType
  });
  
  // Materiales como refs mutables
  const simMaterialRef = useRef<ShaderMaterial | null>(null);
  const renderMaterialRef = useRef<ShaderMaterial | null>(null);
  
  // Crear materiales una sola vez
  if (!simMaterialRef.current) {
    simMaterialRef.current = new ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: simulationFragmentShader,
      uniforms: {
        positionsA: { value: modelTextures[0] },
        positionsB: { value: modelTextures[0] },
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uCurlFreq: { value: curl }
      }
    });
  }
  
  if (!renderMaterialRef.current) {
    renderMaterialRef.current = new ShaderMaterial({
      vertexShader: dofPointsVertexShader,
      fragmentShader: dofPointsFragmentShader,
      uniforms: {
        positions: { value: null },
        uTime: { value: 0 },
        uFocus: { value: focus },
        uFov: { value: fov },
        uBlur: { value: (5.6 - aperture) * 9 },
        uBaseSize: { value: baseSize }
      },
      transparent: true,
      blending: NormalBlending,
      depthWrite: false
    });
  }
  
  // Geometría del quad para simulación
  const simGeometry = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]);
    const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]);
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('uv', new BufferAttribute(uvs, 2));
    return geo;
  }, []);
  
  // Geometría de partículas (coordenadas UV normalizadas)
  const pointsGeometry = useMemo(() => {
    const geo = new BufferGeometry();
    const length = size * size;
    const particlePositions = new Float32Array(length * 3);
    for (let i = 0; i < length; i++) {
      const i3 = i * 3;
      particlePositions[i3 + 0] = (i % size) / size;
      particlePositions[i3 + 1] = i / size / size;
      particlePositions[i3 + 2] = 0;
    }
    geo.setAttribute('position', new BufferAttribute(particlePositions, 3));
    return geo;
  }, [size]);
  
  // Mesh para la escena FBO
  const simMesh = useMemo(() => {
    const mesh = new Mesh(simGeometry, simMaterialRef.current!);
    return mesh;
  }, [simGeometry]);
  
  // Agregar mesh a la escena FBO
  useEffect(() => {
    fboScene.add(simMesh);
    return () => {
      fboScene.remove(simMesh);
    };
  }, [fboScene, simMesh]);
  
  // Update FBO and pointcloud every frame
  useFrame((state) => {
    const simMat = simMaterialRef.current;
    const renderMat = renderMaterialRef.current;
    if (!simMat || !renderMat) return;
    
    // Actualizar texturas de morph
    simMat.uniforms.positionsA.value = modelTextures[currentIdx];
    simMat.uniforms.positionsB.value = modelTextures[targetIdx];
    simMat.uniforms.uProgress.value = progressRef.current.value;
    simMat.uniforms.uTime.value = state.clock.elapsedTime * speed;
    simMat.uniforms.uCurlFreq.value = curl;
    
    // Render simulation to FBO
    state.gl.setRenderTarget(target);
    state.gl.clear();
    state.gl.render(fboScene, fboCamera);
    state.gl.setRenderTarget(null);
    
    // Update render material uniforms
    renderMat.uniforms.positions.value = target.texture;
    renderMat.uniforms.uTime.value = state.clock.elapsedTime;
    renderMat.uniforms.uFocus.value += (focus - renderMat.uniforms.uFocus.value) * 0.1;
    renderMat.uniforms.uFov.value += (fov - renderMat.uniforms.uFov.value) * 0.1;
    renderMat.uniforms.uBlur.value += ((5.6 - aperture) * 9 - renderMat.uniforms.uBlur.value) * 0.1;
    renderMat.uniforms.uBaseSize.value += (baseSize - renderMat.uniforms.uBaseSize.value) * 0.1;
  });
  
  // Crear wireframe geometry para cada modelo
  const wireframeData = useMemo(() => {
    const models = [notebook.scene, paimon.scene, mech.scene];
    
    return models.map((scene, idx) => {
      const offset = modelOffsets[idx];
      const allEdges: number[] = [];
      
      scene.traverse((obj) => {
        if (obj instanceof Mesh && obj.geometry) {
          // Crear EdgesGeometry para obtener solo los bordes visibles
          const edges = new EdgesGeometry(obj.geometry, 15); // 15 grados de umbral
          const edgePositions = edges.getAttribute('position');
          
          if (edgePositions) {
            obj.updateMatrixWorld(true);
            for (let i = 0; i < edgePositions.count; i++) {
              const v = new Vector3(
                edgePositions.getX(i),
                edgePositions.getY(i),
                edgePositions.getZ(i)
              );
              v.applyMatrix4(obj.matrixWorld);
              // Aplicar offset
              v.x += offset.x;
              v.y += offset.y;
              v.z += offset.z;
              allEdges.push(v.x, v.y, v.z);
            }
          }
        }
      });
      
      // Escalar igual que las partículas
      let maxDist = 0;
      for (let i = 0; i < allEdges.length; i += 3) {
        const dist = Math.sqrt(allEdges[i] ** 2 + allEdges[i + 1] ** 2 + allEdges[i + 2] ** 2);
        if (dist > maxDist) maxDist = dist;
      }
      const scale = offset.scale / Math.max(maxDist, 0.001);
      
      const scaledEdges = new Float32Array(allEdges.length);
      for (let i = 0; i < allEdges.length; i++) {
        scaledEdges[i] = allEdges[i] * scale;
      }
      
      const geo = new BufferGeometry();
      geo.setAttribute('position', new BufferAttribute(scaledEdges, 3));
      
      return geo;
    });
  }, [notebook.scene, paimon.scene, mech.scene, modelOffsets]);
  
  // Material para las líneas
  const lineMaterial = useMemo(() => new LineBasicMaterial({ 
    color: 0x000000, 
    transparent: true, 
    opacity: 0.3 
  }), []);
  
  // Geometría de líneas actual (interpolada)
  const currentWireframe = wireframeData[targetIdx];
  
  return (
    <group>
      <points geometry={pointsGeometry} material={renderMaterialRef.current!} frustumCulled={false} />
      <lineSegments geometry={currentWireframe} material={lineMaterial} frustumCulled={false} />
    </group>
  );
}

type NotebookMaterialMode = "wireframe" | "fire" | "triangles";

/** Plano con imagen de NieR shield detrás de la esfera para test de reflejos */
function BackgroundTestImage() {
  const texture = useTexture("/images/nier/shield.jpg");
  return (
    <mesh position={[0, 0, -3]}>
      <planeGeometry args={[16, 10]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

/** Mech simple para escena 2 (sin glass, sin physics).
 *  Stencil test: solo se dibuja donde el shield escribió stencil=1,
 *  así el mech nunca se ve fuera del shield. */
function MechModelScene2() {
  const { scene } = useGLTF(MECH_GLB);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    cloned.traverse((o) => {
      if (o instanceof Mesh) {
        // Ocultar suelo
        if (FLOOR_NAMES.test(o.name || "")) { o.visible = false; return; }
        // Stencil test: solo dibujar donde stencil === 1 (dentro del shield)
        const mat = o.material as MeshBasicMaterial | MeshPhysicalMaterial;
        if (mat) {
          mat.stencilWrite = false;
          mat.stencilRef = 1;
          mat.stencilFunc = EqualStencilFunc;
          mat.stencilFail = KeepStencilOp;
          mat.stencilZFail = KeepStencilOp;
          mat.stencilZPass = KeepStencilOp;
        }
      }
    });
  }, [cloned]);

  return (
    <group ref={groupRef} renderOrder={1}>
      <primitive object={cloned} />
    </group>
  );
}

/** 
 * Notebook con wireframe, material de fuego morado, o patrón de triángulos
 */
function NotebookDisplay({ 
  materialMode 
}: { 
  materialMode: NotebookMaterialMode;
}) {
  const { scene } = useGLTF("/glb/notebook_and_pen.glb");
  
  // Clonar escenas separadas para fire y triangles
  const fireScene = useMemo(() => scene.clone(true), [scene]);
  const triScene = useMemo(() => scene.clone(true), [scene]);
  
  // ===================== MATERIAL: FUEGO MORADO =====================
  const fireMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.9 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDisplacement;
        
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float noise(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
        }
        float fbm(vec3 p, float t) {
          float v = 0.0, a = 0.5;
          for(int i=0;i<3;i++){v+=a*noise(p+t*0.3);p*=2.0;a*=0.5;}
          return v;
        }
        void main() {
          vUv = uv; vPosition = position; vNormal = normal;
          float t = uTime * 0.5;
          float displacement = fbm(position*3.0+vec3(t*0.2,t*0.3,t*0.1),t)*0.05;
          vDisplacement = displacement;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal*displacement, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime; uniform float uOpacity;
        varying vec2 vUv; varying vec3 vPosition; varying vec3 vNormal; varying float vDisplacement;
        #define TAU 6.28318530718
        #define TILING_FACTOR 3.0
        #define MAX_ITER 6
        float waterHighlight(vec2 p, float time, float foaminess) {
          vec2 i = vec2(p); float c = 0.0;
          float ff = mix(1.0,6.0,foaminess); float inten = 0.005*ff;
          for(int n=0;n<MAX_ITER;n++){
            float t=time*(1.0-(3.5/float(n+1)));
            i=p+vec2(cos(t-i.x)+sin(t+i.y),sin(t-i.y)+cos(t+i.x));
            c+=1.0/length(vec2(p.x/(sin(i.x+t)+0.001),p.y/(cos(i.y+t)+0.001)));
          }
          c=0.2+c/(inten*float(MAX_ITER)); c=1.17-pow(c,1.4); c=pow(abs(c),8.0);
          return c/sqrt(ff);
        }
        void main() {
          float time = uTime*0.15+23.0;
          vec2 p = mod(vUv*TAU*TILING_FACTOR,TAU)-250.0;
          float c = waterHighlight(p,time,0.4);
          if(c<0.3) discard;
          float intensity = (c-0.3)/0.7;
          intensity *= 1.0+vDisplacement*3.0;
          if(intensity<0.15) discard;
          vec3 color = mix(vec3(0),vec3(0.3,0,0.5),intensity);
          gl_FragColor = vec4(color*1.5, intensity*uOpacity);
        }
      `,
      transparent: true, depthWrite: false, side: DoubleSide, blending: NormalBlending,
    });
  }, []);
  
  // ===================== MATERIAL: TRIÁNGULOS - Raymarching completo del shader original =====================
  const triangleMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.9 },
        uResolution: { value: new Vector3(window.innerWidth, window.innerHeight, 1) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uResolution;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        
        // ======== Raymarch settings ========
        #define MIN_DIST 0.001
        #define MAX_DIST 12.0
        #define MAX_STEPS 96
        #define STEP_MULT 0.5
        #define NORMAL_OFFS 0.002
        
        // ======== Scene settings ========
        #define QUADS_PER_UNIT 8.0
        #define HAZE_COLOR vec3(0.15, 0.00, 0.10)
        #define GRID_LINE_RADIUS 2.0
        #define QUAD_SIZE (1.0 / QUADS_PER_UNIT)
        
        float pi = atan(1.0) * 4.0;
        float tau = atan(1.0) * 8.0;
        
        // ======== Noise (reemplaza iChannel0) ========
        float hash2D(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }
        float noise2D(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash2D(i),hash2D(i+vec2(1,0)),f.x),
                     mix(hash2D(i+vec2(0,1)),hash2D(i+vec2(1,1)),f.x),f.y);
        }
        
        // ======== Height (original) ========
        float Height(vec2 p) {
          p *= QUAD_SIZE;
          float h = noise2D(p * 0.1 + uTime * 0.01) * 0.5;
          h += sin(length(p) * 2.0 + uTime) * 0.25;
          return h;
        }
        
        // ======== Rotation (original) ========
        mat3 Rotate(vec3 angles) {
          vec3 c = cos(angles); vec3 s = sin(angles);
          mat3 rotX = mat3(1,0,0, 0,c.x,s.x, 0,-s.x,c.x);
          mat3 rotY = mat3(c.y,0,-s.y, 0,1,0, s.y,0,c.y);
          mat3 rotZ = mat3(c.z,s.z,0, -s.z,c.z,0, 0,0,1);
          return rotX * rotY * rotZ;
        }
        
        // ======== Distance field (original) ========
        float opU(float d1, float d2) { return min(d1,d2); }
        float opS(float d1, float d2) { return max(-d1,d2); }
        float sdSphere(vec3 p, float s) { return length(p)-s; }
        float sdPlane(vec3 p, vec3 p0, vec3 p1, vec3 p2) {
          return dot(p-p0, normalize(cross(p0-p1, p0-p2)));
        }
        
        // ======== sdVQuad (original) ========
        float sdVQuad(vec3 p, float h0, float h1, float h2, float h3) {
          float s = QUAD_SIZE;
          float diag = sdPlane(p, vec3(0,0,0), vec3(s,s,0), vec3(0,0,s));
          float tri0 = sdPlane(p, vec3(0,0,-h0), vec3(0,s,-h1), vec3(s,s,-h2));
          tri0 = opS(-diag, tri0);
          float tri1 = sdPlane(p, vec3(0,0,-h0), vec3(s,s,-h2), vec3(s,0,-h3));
          tri1 = opS(diag, tri1);
          return min(tri0, tri1);
        }
        
        // ======== Scene (sin esfera de límite) ========
        float Scene(vec3 p) {
          vec3 pm = vec3(mod(p.xy, vec2(QUAD_SIZE)), p.z);
          vec2 uv = floor(p.xy / QUAD_SIZE);
          float v0 = Height(uv + vec2(0,0));
          float v1 = Height(uv + vec2(0,1));
          float v2 = Height(uv + vec2(1,1));
          float v3 = Height(uv + vec2(1,0));
          return sdVQuad(pm, v0, v1, v2, v3);
        }
        
        // ======== Normal (original) ========
        vec3 SceneNormal(vec3 p) {
          vec3 off = vec3(NORMAL_OFFS, 0, 0);
          return normalize(vec3(
            Scene(p+off.xyz)-Scene(p-off.xyz),
            Scene(p+off.zxy)-Scene(p-off.zxy),
            Scene(p+off.yzx)-Scene(p-off.yzx)
          ));
        }
        
        // ======== MarchRay (original) ========
        // Returns: vec4(steps, dist, 0, 0) - we store in vec4 instead of struct
        vec4 MarchRay(vec3 orig, vec3 dir) {
          float steps = 0.0;
          float dist = 0.0;
          for (int i = 0; i < MAX_STEPS; i++) {
            float sceneDist = Scene(orig + dir * dist);
            dist += sceneDist * STEP_MULT;
            steps += 1.0;
            if (abs(sceneDist) < MIN_DIST) break;
          }
          return vec4(steps, dist, 0.0, 0.0);
        }
        
        // ======== Shade ========
        vec3 Shade(vec3 hitPos, vec3 hitNormal, float hitDist, float hitSteps, vec3 direction) {
          vec3 color = vec3(1.0);
          
          // Triangle grid pattern (original)
          vec2 gridRep = mod(hitPos.xy, vec2(QUAD_SIZE)) / float(QUAD_SIZE) - 0.5;
          float grid = 0.5 - max(abs(gridRep.x), abs(gridRep.y));
          grid = min(grid, abs(dot(gridRep.xy, normalize(vec2(-1.0, 1.0)))));
          float lineSize = GRID_LINE_RADIUS * hitDist / uResolution.y / float(QUAD_SIZE);
          color *= 1.0 - smoothstep(lineSize, lineSize * 0.25, grid);
          color = color * .25 + 0.25;
          
          // Lighting
          float ambient = 0.1;
          float diffuse = 0.1 * -dot(hitNormal, direction);
          float specular = 0.8 * max(0.0, -dot(direction, reflect(direction, hitNormal)));
          color *= vec3(ambient + diffuse + pow(specular, 5.0));
          
          // Fog / haze
          float sky = smoothstep(MAX_DIST - 1.0, 0.0, length(hitPos));
          float haze = 1.0 - (hitSteps / float(MAX_STEPS));
          vec3 skycol = mix(HAZE_COLOR, vec3(0), clamp(-hitPos.z * 0.2, 0.0, 1.0));
          color = mix(skycol, color, sky * haze);
          
          return color;
        }
        
        void main() {
          // Rotar las UVs 90° para alinear el patrón
          vec2 uv = vec2(vUv.y, 1.0 - vUv.x);
          
          // Cámara fija mirando hacia abajo
          vec3 orig = vec3(uv.x, uv.y, -1.5);
          vec2 centered = uv - 0.5;
          vec3 dir = normalize(vec3(centered * 0.3, 1.0));
          
          // Raymarch
          vec4 marchResult = MarchRay(orig, dir);
          float hitSteps = marchResult.x;
          float hitDist = marchResult.y;
          vec3 hitPos = orig + dir * hitDist;
          vec3 hitNormal = SceneNormal(hitPos);
          
          // Descartar donde el ray no pegó
          if (hitSteps >= float(MAX_STEPS) - 1.0) discard;
          
          // Shade (ya incluye el patrón de triángulos, iluminación y haze)
          vec3 color = Shade(hitPos, hitNormal, hitDist, hitSteps, dir);
          
          gl_FragColor = vec4(color, uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: FrontSide,
      blending: NormalBlending,
    });
  }, []);


    // ===================== ESCUDO NieR: Icosphere geodésica + barycentric wireframe + glow =====================
  
  // Crear esfera con triángulos horizontales estilo NieR Automata
  // Subdivididos y proyectados sobre la esfera para forma redonda,
  // pero cada triángulo original conserva su normal plana para refracción facetada
  const shieldGeo = useMemo(() => {
    const latBands = 10;  // 10 líneas horizontales + 2 tapas (polos)
    const lonSegs  = 16;  // segmentos alrededor
    const radius   = 1;
    const subdiv   = 5;   // subdivisiones por triángulo original (curva suave)

    type V3 = [number, number, number];

    // ---- Paso 1: Pre-computar anillos de vértices ----
    const rings: V3[][] = [];
    for (let i = 0; i <= latBands; i++) {
      const theta = (i / latBands) * Math.PI;
      const sinT = Math.sin(theta), cosT = Math.cos(theta);
      const r = radius * sinT, y = radius * cosT;
      const off = (i % 2 === 0) ? 0.0 : 0.5;

      const ring: V3[] = [];
      for (let j = 0; j < lonSegs; j++) {
        const phi = ((j + off) / lonSegs) * Math.PI * 2;
        ring.push([r * Math.cos(phi), y, r * Math.sin(phi)]);
      }
      rings.push(ring);
    }

    // ---- Paso 2: Recopilar triángulos originales ----
    const origTris: [V3, V3, V3][] = [];
    for (let i = 0; i < latBands; i++) {
      const top = rings[i];
      const bot = rings[i + 1];
      const topOff = (i % 2 === 0) ? 0.0 : 0.5;
      const botOff = ((i + 1) % 2 === 0) ? 0.0 : 0.5;

      for (let j = 0; j < lonSegs; j++) {
        const j1 = (j + 1) % lonSegs;
        if (topOff < botOff) {
          origTris.push([top[j], top[j1], bot[j]]);
          origTris.push([bot[j], top[j1], bot[j1]]);
        } else {
          origTris.push([bot[j], top[j], bot[j1]]);
          origTris.push([top[j], top[j1], bot[j1]]);
        }
      }
    }

    // ---- Paso 3: Subdividir cada triángulo y proyectar sobre la esfera ----
    const verts: number[] = [];
    const norms: number[] = [];
    const barys: number[] = [];
    const flatNorms: number[] = [];
    const N = subdiv;

    for (const [A, B, C] of origTris) {
      // Normal plana del triángulo original
      const ab: V3 = [B[0]-A[0], B[1]-A[1], B[2]-A[2]];
      const ac: V3 = [C[0]-A[0], C[1]-A[1], C[2]-A[2]];
      const fn: V3 = [
        ab[1]*ac[2] - ab[2]*ac[1],
        ab[2]*ac[0] - ab[0]*ac[2],
        ab[0]*ac[1] - ab[1]*ac[0],
      ];
      const fnLen = Math.sqrt(fn[0]*fn[0] + fn[1]*fn[1] + fn[2]*fn[2]);
      if (fnLen > 0) { fn[0] /= fnLen; fn[1] /= fnLen; fn[2] /= fnLen; }

      // Sub-vértice en coordenada (i,j) del triángulo → bary (u,v,w)
      const subVert = (si: number, sj: number) => {
        const u = (N - si - sj) / N;
        const v = si / N;
        const w = sj / N;
        // Interpolar posición y proyectar sobre la esfera
        const px = A[0]*u + B[0]*v + C[0]*w;
        const py = A[1]*u + B[1]*v + C[1]*w;
        const pz = A[2]*u + B[2]*v + C[2]*w;
        const len = Math.sqrt(px*px + py*py + pz*pz);
        const s = len > 0 ? radius / len : 0;
        return { pos: [px*s, py*s, pz*s] as V3, bary: [u, v, w] as V3 };
      };

      // Emitir un sub-triángulo
      const pushSub = (
        p0: { pos: V3; bary: V3 },
        p1: { pos: V3; bary: V3 },
        p2: { pos: V3; bary: V3 },
      ) => {
        for (const p of [p0, p1, p2]) {
          verts.push(p.pos[0], p.pos[1], p.pos[2]);
          // Normal suave = dirección radial (esfera)
          const nl = Math.sqrt(p.pos[0]**2 + p.pos[1]**2 + p.pos[2]**2);
          const ns = nl > 0 ? 1/nl : 0;
          norms.push(p.pos[0]*ns, p.pos[1]*ns, p.pos[2]*ns);
          // Barycentric del triángulo ORIGINAL (wireframe solo en bordes originales)
          barys.push(p.bary[0], p.bary[1], p.bary[2]);
          // Normal plana del triángulo original (refracción facetada)
          flatNorms.push(fn[0], fn[1], fn[2]);
        }
      };

      // Generar sub-triángulos: N² por triángulo original
      for (let si = 0; si < N; si++) {
        for (let sj = 0; sj < N - si; sj++) {
          // Triángulo "up"
          pushSub(subVert(si, sj), subVert(si+1, sj), subVert(si, sj+1));
          // Triángulo "down" (si existe)
          if (si + sj + 1 < N) {
            pushSub(subVert(si+1, sj), subVert(si+1, sj+1), subVert(si, sj+1));
          }
        }
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(verts), 3));
    geo.setAttribute('normal', new Float32BufferAttribute(new Float32Array(norms), 3));
    geo.setAttribute('aBarycentric', new Float32BufferAttribute(new Float32Array(barys), 3));
    geo.setAttribute('aFlatNormal', new Float32BufferAttribute(new Float32Array(flatNorms), 3));

    return geo;
  }, []);
  
  // Cargar textura de fondo para reflejos reales
  const bgTexture = useTexture("/images/nier/shield.jpg");
  
  // Cargar environment map HDRI real
  const envMap = useEnvironment({ preset: "forest" });

  // Shield material - Vidrio transparente (como vaso de vidrio)
  const shieldMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBgTex: { value: bgTexture },
        uEnvMap: { value: envMap },
        uPlaneZ: { value: -3.0 },
        uPlaneSize: { value: new Vector2(16.0, 10.0) },
        uEnvIntensity: { value: 1.0 },
      },
      vertexShader: `
        attribute vec3 aBarycentric;
        attribute vec3 aFlatNormal;
        
        varying vec3 vBarycentric;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vFlatNormal;
        varying vec3 vViewDir;
        
        void main() {
          vBarycentric = aBarycentric;
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          // Normal plana del triángulo original (para refracción facetada)
          vFlatNormal = normalize(mat3(modelMatrix) * aFlatNormal);
          vViewDir = normalize(vWorldPos - cameraPosition);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        uniform float uTime;
        uniform sampler2D uBgTex;
        uniform sampler2D uEnvMap;
        uniform float uPlaneZ;
        uniform vec2 uPlaneSize;
        uniform float uEnvIntensity;
        
        varying vec3 vBarycentric;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vFlatNormal;
        varying vec3 vViewDir;
        
        #define PI 3.14159265359
        
        // Convertir dirección 3D a UV equirectangular
        vec2 dirToEquirect(vec3 dir) {
          float phi = atan(dir.z, dir.x);
          float theta = asin(clamp(dir.y, -1.0, 1.0));
          return vec2(phi / (2.0 * PI) + 0.5, theta / PI + 0.5);
        }
        
        // Wireframe edge detection
        float edgeFactor(vec3 bary, float width) {
          vec3 d = fwidth(bary);
          vec3 a3 = smoothstep(vec3(0.0), d * width, bary);
          return min(min(a3.x, a3.y), a3.z);
        }
        
        // Muestrear environment (HDRI equirect + plano de fondo)
        vec3 sampleEnv(vec3 origin, vec3 dir) {
          vec3 d = normalize(dir);
          vec2 envUV = dirToEquirect(d);
          vec3 envColor = texture2D(uEnvMap, envUV).rgb * uEnvIntensity;
          
          if (abs(d.z) > 0.001) {
            float t = (uPlaneZ - origin.z) / d.z;
            if (t > 0.0) {
              vec3 hit = origin + d * t;
              vec2 uv = hit.xy / uPlaneSize + 0.5;
              if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
                vec3 bgColor = texture2D(uBgTex, uv).rgb;
                envColor = mix(envColor, bgColor, 0.6);
              }
            }
          }
          return envColor;
        }
        
        void main() {
          // ======== WIREFRAME (solo bordes de triángulos originales) ========
          float wireWidth = 1.5;
          float edge = 1.0 - edgeFactor(vBarycentric, wireWidth);
          
          // Normal plana del triángulo ORIGINAL (cada triángulo refracta diferente)
          vec3 n = normalize(vFlatNormal);
          vec3 V = normalize(vViewDir);
          
          // ======== PROPIEDADES DEL VIDRIO ========
          float glassIOR = 1.5;            // IOR real del vidrio
          float eta = 1.0 / glassIOR;      // ratio aire -> vidrio
          
          // ======== FRESNEL (Schlick) ========
          float cosI = max(dot(-V, n), 0.0);
          float F0 = pow((1.0 - glassIOR) / (1.0 + glassIOR), 2.0); // ~0.04
          float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosI, 5.0);
          
          // ======== REFLEJO ========
          vec3 reflDir = reflect(V, n);
          vec3 reflColor = sampleEnv(vWorldPos, reflDir);
          
          // ======== REFRACCIÓN con aberración cromática sutil ========
          vec3 refrR = refract(V, n, eta * 0.996);
          vec3 refrG = refract(V, n, eta);
          vec3 refrB = refract(V, n, eta * 1.004);
          
          // Check reflexión total interna
          float isTIR = step(length(refrG), 0.001);
          
          vec3 refrColor;
          refrColor.r = sampleEnv(vWorldPos, length(refrR) > 0.001 ? refrR : reflDir).r;
          refrColor.g = sampleEnv(vWorldPos, length(refrG) > 0.001 ? refrG : reflDir).g;
          refrColor.b = sampleEnv(vWorldPos, length(refrB) > 0.001 ? refrB : reflDir).b;
          
          // ======== MEZCLA: refracción domina, reflejo solo en bordes (fresnel) ========
          vec3 glassColor = mix(refrColor, reflColor, clamp(fresnel + isTIR, 0.0, 1.0));
          
          // Tinte de vidrio muy sutil (ligeramente azulado)
          glassColor *= vec3(0.97, 0.98, 1.0);
          
          // ======== WIREFRAME: líneas oscuras ========
          vec3 edgeColor = glassColor * 0.15;
          vec3 color = mix(glassColor, edgeColor, edge);
          
          // ======== GAMMA (linear -> sRGB) ========
          color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));
          
          // ======== ALPHA: vidrio transparente ========
          float faceAlpha = 0.75;
          float edgeAlpha = 0.95;
          float alpha = mix(faceAlpha, edgeAlpha, edge);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: true,
      side: FrontSide,
      blending: NormalBlending,
    });
  }, [bgTexture, envMap]);

  const shieldMaterialMirror = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBgTex: { value: bgTexture },
        uEnvMap: { value: envMap },
        uPlaneZ: { value: -3.0 },
        uPlaneSize: { value: new Vector2(16.0, 10.0) },
        uEnvIntensity: { value: 1.0 },
      },
      vertexShader: `
        attribute vec3 aBarycentric;
        
        varying vec3 vBarycentric;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        
        void main() {
          vBarycentric = aBarycentric;
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(vWorldPos - cameraPosition);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        uniform float uTime;
        uniform sampler2D uBgTex;
        uniform sampler2D uEnvMap;
        uniform float uPlaneZ;
        uniform vec2 uPlaneSize;
        uniform float uEnvIntensity;
        
        varying vec3 vBarycentric;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        
        #define PI 3.14159265359
        
        // Convertir dirección 3D a UV equirectangular
        vec2 dirToEquirect(vec3 dir) {
          float phi = atan(dir.z, dir.x);       // -PI a PI
          float theta = asin(clamp(dir.y, -1.0, 1.0)); // -PI/2 a PI/2
          return vec2(phi / (2.0 * PI) + 0.5, theta / PI + 0.5);
        }
        
        // Wireframe edge detection
        float edgeFactor(vec3 bary, float width) {
          vec3 d = fwidth(bary);
          vec3 a3 = smoothstep(vec3(0.0), d * width, bary);
          return min(min(a3.x, a3.y), a3.z);
        }
        
        // Muestrear environment map HDRI equirectangular + plano de fondo
        vec3 sampleEnv(vec3 origin, vec3 dir) {
          // Muestrear HDRI equirectangular
          vec2 envUV = dirToEquirect(normalize(dir));
          vec3 envColor = texture2D(uEnvMap, envUV).rgb * uEnvIntensity;
          
          // También verificar plano de fondo (imagen AC)
          if (abs(dir.z) > 0.001) {
            float t = (uPlaneZ - origin.z) / dir.z;
            if (t > 0.0) {
              vec3 hit = origin + dir * t;
              vec2 uv = hit.xy / uPlaneSize + 0.5;
              if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
                vec3 bgColor = texture2D(uBgTex, uv).rgb;
                envColor = mix(envColor, bgColor, 0.5);
              }
            }
          }
          return envColor;
        }
        
        // Blur: 9 muestras en cono (frosted glass)
        vec3 sampleEnvBlur(vec3 origin, vec3 dir, float blur) {
          vec3 up = abs(dir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
          vec3 right = normalize(cross(dir, up));
          up = normalize(cross(right, dir));
          
          vec3 col = sampleEnv(origin, normalize(dir));
          col += sampleEnv(origin, normalize(dir + right * blur));
          col += sampleEnv(origin, normalize(dir - right * blur));
          col += sampleEnv(origin, normalize(dir + up * blur));
          col += sampleEnv(origin, normalize(dir - up * blur));
          col += sampleEnv(origin, normalize(dir + (right + up) * blur * 0.707));
          col += sampleEnv(origin, normalize(dir - (right + up) * blur * 0.707));
          col += sampleEnv(origin, normalize(dir + (right - up) * blur * 0.707));
          col += sampleEnv(origin, normalize(dir - (right - up) * blur * 0.707));
          return col / 9.0;
        }
        
        void main() {
          // ======== WIREFRAME ========
          float wireWidth = 1.2;
          float edge = 1.0 - edgeFactor(vBarycentric, wireWidth);
          
          // Normal PLANA del triángulo
          vec3 n = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
          vec3 dir = normalize(vViewDir);
          
          // Blur amount (frosted glass)
          float blurAmt = 0.12;
          
          // ======== IOR ========
          float ior = 0.8;
          
          // ======== FRESNEL 1 ========
          float fresnel1 = clamp(dot(-dir, n), 0.0, 1.0);
          
          // ======== REFLEJO EXTERIOR (con blur) ========
          vec3 drefl = reflect(dir, n);
          vec3 reflColor = sampleEnvBlur(vWorldPos, drefl, blurAmt);
          
          // ======== PRIMERA REFRACCIÓN: aire -> vidrio ========
          vec3 drefr = refract(dir, n, ior);
          float isTotalRefl = step(length(drefr), 0.001);
          
          // ======== SEGUNDA REFRACCIÓN: vidrio -> aire (salida) ========
          vec3 n2 = -n;
          float invIor = 1.0 / ior;
          float fresnel2 = clamp(dot(-drefr, n2), 0.0, 1.0);
          
          // Reflejo interno (con blur)
          vec3 drefl2 = reflect(drefr, -n2);
          vec3 reflInternal = sampleEnvBlur(vWorldPos, drefl2, blurAmt);
          
          // Aberración cromática en la salida (con blur)
          vec3 drefr2_r = refract(drefr, n2, invIor * 0.99);
          vec3 drefr2_g = refract(drefr, n2, invIor * 1.00);
          vec3 drefr2_b = refract(drefr, n2, invIor * 1.01);
          
          float cr = sampleEnvBlur(vWorldPos, drefr2_r, blurAmt).r * 0.7;
          float cg = sampleEnvBlur(vWorldPos, drefr2_g, blurAmt).g * 0.7;
          float cb = sampleEnvBlur(vWorldPos, drefr2_b, blurAmt).b * 0.7;
          vec3 refrColor = vec3(cr, cg, cb);
          
          // ======== MEZCLA MULTI-CAPA ========
          vec3 insideColor = mix(reflInternal, refrColor, pow(fresnel2, 0.2));
          vec3 glassColor = mix(reflColor, insideColor * 0.7, pow(fresnel1, 0.5));
          glassColor = mix(glassColor, reflColor, isTotalRefl);
          
          // Tinte vidrio
          glassColor *= vec3(0.92, 0.94, 1.0);
          glassColor += vec3(0.01);
          
          // ======== LÍNEAS: marco oscuro ========
          vec3 frameColor = glassColor * 0.08;
          vec3 color = mix(glassColor, frameColor, edge);
          
          // ======== GAMMA ========
          color = pow(max(color, vec3(0.0)), vec3(0.5));
          
          // ======== ALPHA: casi opaco (el vidrio NO es transparente por alpha) ========
          // El vaso es alpha=1.0. Nosotros usamos 0.95 para que haya un hint
          // de lo que hay detrás pero dominado por la refracción
          float faceAlpha = 0.95;
          float frameAlpha = 1.0;
          float alpha = mix(faceAlpha, frameAlpha, edge);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: true,
      side: FrontSide,
      blending: NormalBlending,
    });
  }, [bgTexture, envMap]);
  
  // ===================== WIREFRAME GEOMETRY =====================
  const wireframeGeometry = useMemo(() => {
    const allEdges: number[] = [];
    scene.traverse((obj) => {
      if (obj instanceof Mesh && obj.geometry) {
        const edges = new EdgesGeometry(obj.geometry, 15);
        const edgePositions = edges.getAttribute('position');
        if (edgePositions) {
          obj.updateMatrixWorld(true);
          for (let i = 0; i < edgePositions.count; i++) {
            const v = new Vector3(edgePositions.getX(i), edgePositions.getY(i), edgePositions.getZ(i));
            v.applyMatrix4(obj.matrixWorld);
            allEdges.push(v.x, v.y, v.z);
          }
        }
      }
    });
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(allEdges), 3));
    return geo;
  }, [scene]);
  
  const wireframeMaterial = useMemo(() => new LineBasicMaterial({ color: 0x000000, transparent: false }), []);
  
  // Aplicar materiales según el modo
  useEffect(() => {
    fireScene.traverse((obj) => {
      if (obj instanceof Mesh) obj.material = fireMaterial;
    });
  }, [fireScene, fireMaterial]);
  
  useEffect(() => {
    triScene.traverse((obj) => {
      if (obj instanceof Mesh) obj.material = triangleMaterial;
    });
  }, [triScene, triangleMaterial]);
  
  // Actualizar tiempo de todos los shaders
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    fireMaterial.uniforms.uTime.value = t;
    triangleMaterial.uniforms.uTime.value = t;
    triangleMaterial.uniforms.uResolution.value.set(
      state.gl.domElement.width, state.gl.domElement.height, 1
    );
    shieldMaterial.uniforms.uTime.value = t;
  });
  
  // Esfera de preview con el mismo material
  const sphereWireframeGeo = useMemo(() => {
    // Crear wireframe de esfera manualmente
    const segments = 32;
    const positions: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const phi = (i / segments) * Math.PI;
      for (let j = 0; j <= segments; j++) {
        const theta = (j / segments) * Math.PI * 2;
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.sin(theta);
        positions.push(x, y, z);
      }
    }
    // Edges for wireframe
    const edgePositions: number[] = [];
    const w = segments + 1;
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * w + j;
        const b = a + 1;
        const c = a + w;
        // Horizontal
        edgePositions.push(positions[a*3], positions[a*3+1], positions[a*3+2]);
        edgePositions.push(positions[b*3], positions[b*3+1], positions[b*3+2]);
        // Vertical
        edgePositions.push(positions[a*3], positions[a*3+1], positions[a*3+2]);
        edgePositions.push(positions[c*3], positions[c*3+1], positions[c*3+2]);
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(edgePositions), 3));
    return geo;
  }, []);

  return (
    <group scale={0.8}>
      {/* Notebook */}
      {/* {materialMode === "wireframe" && (
        <lineSegments geometry={wireframeGeometry} material={wireframeMaterial} />
      )}
      {materialMode === "fire" && (
        <primitive object={fireScene} />
      )}
      {materialMode === "triangles" && (
        <primitive object={triScene} />
      )} */}
      
      {/* Imagen de fondo para test de reflejos */}
      {materialMode === "triangles" && <BackgroundTestImage />}

      {/* Mech + Shield NieR */}
      {materialMode === "triangles" && (
        <group position={[0, 0, 0]}>
          {/* Mech dentro del shield */}
          <group position={[0, -1.74, 0]} scale={0.02} rotation={[0, Math.PI / -6, 0]}>
            <MechModelScene2 />
          </group>
          {/* Shield alrededor del mech */}
          <MechShield position={[0, -0.1, -0.1]} scale={2.3} />
        </group>
      )}

      {/* Otros modos de material */}
        {materialMode === "wireframe" && (
        <group position={[0, 0, 0]} rotation={[0, 0, 0]} scale={2}>
          <lineSegments geometry={sphereWireframeGeo} material={wireframeMaterial} />
        </group>
        )}
        {materialMode === "fire" && (
        <group position={[0, 0, 0]} rotation={[0, 0, 0]} scale={2}>
          <mesh material={fireMaterial}>
            <sphereGeometry args={[1, 64, 64]} />
          </mesh>
        </group>
        )}
    </group>
  );
}

/** 
 * Orquestador de la secuencia de modelos de la escena 2.
 */
function Scene2Sequence({ active, materialMode }: { 
  active: boolean; 
  materialMode: NotebookMaterialMode;
}) {
  if (!active) return null;

  return (
    <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
      <NotebookDisplay materialMode={materialMode} />
    </group>
  );
}

const SCENE_LOAD_DELAY_MS = 1400;
const FADE_IN_DURATION_MS = 900;

// Estado global para los controles de partículas
interface ParticleControls {
  speed: number;
  fov: number;
  aperture: number;
  focus: number;
  curl: number;
  baseSize: number;
  modelOffsets: { x: number; y: number; z: number; scale: number }[];
}

const DEFAULT_PARTICLE_CONTROLS: ParticleControls = {
  speed: 5,
  fov: 36,
  aperture: 5.6,
  focus: 6.48,
  curl: 0.01,
  baseSize: 1.5,
  modelOffsets: [
    { x: 0, y: 0, z: 0, scale: 3 },      // Notebook
    { x: 0, y: -1.5, z: 0, scale: 3 },   // Paimon
    { x: 0, y: 0, z: 0, scale: 3 },      // Mech
  ]
};

/** Panel de control para ajustar partículas en tiempo real */
function ParticleControlPanel({ 
  controls, 
  setControls,
  currentModel 
}: { 
  controls: ParticleControls; 
  setControls: React.Dispatch<React.SetStateAction<ParticleControls>>;
  currentModel: number;
}) {
  const modelNames = ["Notebook", "Paimon", "Mech"];
  
  return (
    <div style={{
      position: "fixed",
      top: 10,
      right: 10,
      zIndex: 10000,
      background: "rgba(0,0,0,0.85)",
      padding: 15,
      borderRadius: 8,
      color: "white",
      fontSize: 12,
      fontFamily: "monospace",
      maxHeight: "90vh",
      overflowY: "auto",
      minWidth: 280
    }}>
      <h3 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #444", paddingBottom: 5 }}>
        Controles de Partículas
      </h3>
      
      {/* Controles generales */}
      <div style={{ marginBottom: 15 }}>
        <label style={{ display: "block", marginBottom: 5 }}>
          Speed: {controls.speed.toFixed(2)}
          <input type="range" min="0" max="50" step="0.1" value={controls.speed}
            onChange={(e) => setControls(c => ({ ...c, speed: parseFloat(e.target.value) }))}
            style={{ width: "100%", marginTop: 3 }} />
        </label>
        
        <label style={{ display: "block", marginBottom: 5 }}>
          FOV: {controls.fov.toFixed(0)}
          <input type="range" min="1" max="200" step="1" value={controls.fov}
            onChange={(e) => setControls(c => ({ ...c, fov: parseFloat(e.target.value) }))}
            style={{ width: "100%", marginTop: 3 }} />
        </label>
        
        <label style={{ display: "block", marginBottom: 5 }}>
          Aperture: {controls.aperture.toFixed(2)}
          <input type="range" min="1" max="5.6" step="0.1" value={controls.aperture}
            onChange={(e) => setControls(c => ({ ...c, aperture: parseFloat(e.target.value) }))}
            style={{ width: "100%", marginTop: 3 }} />
        </label>
        
        <label style={{ display: "block", marginBottom: 5 }}>
          Focus: {controls.focus.toFixed(2)}
          <input type="range" min="1" max="20" step="0.1" value={controls.focus}
            onChange={(e) => setControls(c => ({ ...c, focus: parseFloat(e.target.value) }))}
            style={{ width: "100%", marginTop: 3 }} />
        </label>
        
        <label style={{ display: "block", marginBottom: 5 }}>
          Curl: {controls.curl.toFixed(3)}
          <input type="range" min="0" max="1" step="0.001" value={controls.curl}
            onChange={(e) => setControls(c => ({ ...c, curl: parseFloat(e.target.value) }))}
            style={{ width: "100%", marginTop: 3 }} />
        </label>
        
        <label style={{ display: "block", marginBottom: 5 }}>
          Base Size: {controls.baseSize.toFixed(2)}
          <input type="range" min="0.1" max="10" step="0.1" value={controls.baseSize}
            onChange={(e) => setControls(c => ({ ...c, baseSize: parseFloat(e.target.value) }))}
            style={{ width: "100%", marginTop: 3 }} />
        </label>
      </div>
      
      {/* Controles por modelo */}
      <h4 style={{ margin: "10px 0 5px 0", borderBottom: "1px solid #444", paddingBottom: 3 }}>
        Modelo: {modelNames[currentModel]} (actual)
      </h4>
      
      {controls.modelOffsets.map((offset, idx) => (
        <div key={idx} style={{ 
          marginBottom: 10, 
          padding: 8, 
          background: idx === currentModel ? "rgba(100,100,255,0.2)" : "rgba(50,50,50,0.5)",
          borderRadius: 5
        }}>
          <strong>{modelNames[idx]}</strong>
          
          <label style={{ display: "block", marginTop: 5 }}>
            X: {offset.x.toFixed(2)}
            <input type="range" min="-10" max="10" step="0.1" value={offset.x}
              onChange={(e) => {
                const newOffsets = [...controls.modelOffsets];
                newOffsets[idx] = { ...newOffsets[idx], x: parseFloat(e.target.value) };
                setControls(c => ({ ...c, modelOffsets: newOffsets }));
              }}
              style={{ width: "100%", marginTop: 2 }} />
          </label>
          
          <label style={{ display: "block" }}>
            Y: {offset.y.toFixed(2)}
            <input type="range" min="-10" max="10" step="0.1" value={offset.y}
              onChange={(e) => {
                const newOffsets = [...controls.modelOffsets];
                newOffsets[idx] = { ...newOffsets[idx], y: parseFloat(e.target.value) };
                setControls(c => ({ ...c, modelOffsets: newOffsets }));
              }}
              style={{ width: "100%", marginTop: 2 }} />
          </label>
          
          <label style={{ display: "block" }}>
            Z: {offset.z.toFixed(2)}
            <input type="range" min="-10" max="10" step="0.1" value={offset.z}
              onChange={(e) => {
                const newOffsets = [...controls.modelOffsets];
                newOffsets[idx] = { ...newOffsets[idx], z: parseFloat(e.target.value) };
                setControls(c => ({ ...c, modelOffsets: newOffsets }));
              }}
              style={{ width: "100%", marginTop: 2 }} />
          </label>
          
          <label style={{ display: "block" }}>
            Scale: {offset.scale.toFixed(2)}
            <input type="range" min="0.1" max="10" step="0.1" value={offset.scale}
              onChange={(e) => {
                const newOffsets = [...controls.modelOffsets];
                newOffsets[idx] = { ...newOffsets[idx], scale: parseFloat(e.target.value) };
                setControls(c => ({ ...c, modelOffsets: newOffsets }));
              }}
              style={{ width: "100%", marginTop: 2 }} />
          </label>
        </div>
      ))}
      
      {/* Botón para copiar configuración */}
      <button
        onClick={() => {
          const config = JSON.stringify(controls, null, 2);
          navigator.clipboard.writeText(config);
          alert("Configuración copiada al portapapeles:\n" + config);
        }}
        style={{
          width: "100%",
          padding: 8,
          marginTop: 10,
          background: "#4a4a8a",
          border: "none",
          borderRadius: 5,
          color: "white",
          cursor: "pointer"
        }}
      >
        Copiar Configuración
      </button>
    </div>
  );
}

export function WarningDiamondOverlay({ sceneId = 1 }: { sceneId?: 1 | 2 }) {
  const [isGlassView, setIsGlassView] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [wrapperMode, setWrapperMode] = useState<MechWrapperMode>("warning");
  const mechRef = useRef<Group>(null);
  const mechBodyRef = useRef<RapierRigidBody>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSceneReady(true), SCENE_LOAD_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!sceneReady) return;
    const id = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return () => cancelAnimationFrame(id);
  }, [sceneReady]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      window.dispatchEvent(new Event("resize"));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isScene2 = sceneId === 2;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ width: "100%", height: "100%", minWidth: "100%", minHeight: "100%", cursor: "default" }}
      aria-hidden
    >
      {!isScene2 && (
        <button
          type="button"
          onClick={() => setIsGlassView((v) => !v)}
          className="absolute bottom-6 left-6 z-10 px-4 py-2 rounded-md bg-black/70 text-white text-sm font-medium border border-white/20 hover:bg-black/90 transition-colors"
          aria-pressed={isGlassView}
        >
          {isGlassView ? "Cristal (refleja warning)" : "Texturas"}
        </button>
      )}
      <div
        className="absolute inset-0"
        style={{
          width: "100%",
          height: "100%",
          minWidth: "100%",
          minHeight: "100%",
          opacity: sceneReady ? 1 : 0,
          transition: `opacity ${FADE_IN_DURATION_MS}ms ease-out`,
          pointerEvents: sceneReady ? "auto" : "none",
          zIndex: 1,
        }}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0, 12], fov: 44 }}
          gl={{ alpha: true, antialias: true, premultipliedAlpha: true, localClippingEnabled: true }}
          style={{ width: "100%", height: "100%", minWidth: "100%", minHeight: "100%", display: "block", background: "transparent" }}
        >
          <Suspense fallback={null}>
            <Scene
              sceneId={sceneId}
              isGlassView={isGlassView}
              mechRef={mechRef}
              mechBodyRef={mechBodyRef}
              wrapperMode={wrapperMode}
            />
          </Suspense>
        </Canvas>
      </div>
      
      {/* Panel de configuración del mech — solo visible en escena 2 */}
      {isScene2 && (
        <div 
          style={{
            position: "absolute",
            right: 24,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 999999,
            pointerEvents: "auto",
            animation: "mechPanelFadeIn 0.6s ease-out both",
          }}
        >
          <style>{`
            @keyframes mechPanelFadeIn {
              from { opacity: 0; transform: translateY(-50%) translateX(20px); }
              to   { opacity: 1; transform: translateY(-50%) translateX(0); }
            }
          `}</style>
          <div 
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              background: "rgba(0, 0, 0, 0.55)",
              backdropFilter: "blur(16px)",
              borderRadius: 10,
              padding: "12px 8px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              minWidth: 130,
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.35)",
                padding: "2px 10px 6px",
                fontFamily: "var(--font-mono-kpr), ui-monospace, monospace",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 2,
              }}
            >
              Config
            </div>
            {(
              [
                { key: "details", label: "Details", icon: "◈" },
                { key: "warning", label: "Warning", icon: "⚠" },
                { key: "error", label: "Error", icon: "✕" },
                { key: "fire", label: "Fire", icon: "◉" },
                { key: "shield", label: "Shield", icon: "◇" },
              ] as const
            ).map((item) => {
              const isActive = wrapperMode === item.key;
              return (
              <button
                key={item.key}
                type="button"
                  onClick={() => setWrapperMode(item.key)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                    fontSize: 12,
                  fontWeight: 500,
                    fontFamily: "var(--font-mono-kpr), ui-monospace, monospace",
                    transition: "all 0.25s ease",
                    background: isActive
                      ? "rgba(234, 234, 234, 0.12)"
                    : "transparent",
                    color: isActive
                      ? "rgba(234, 234, 234, 0.95)"
                      : "rgba(255, 255, 255, 0.45)",
                    textAlign: "left",
                    letterSpacing: "0.05em",
                    position: "relative",
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1, opacity: isActive ? 1 : 0.5 }}>
                    {item.icon}
                  </span>
                {item.label}
                  {isActive && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 2,
                        height: 16,
                        borderRadius: 1,
                        background: "rgba(234, 234, 234, 0.7)",
                      }}
                    />
                  )}
              </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

useGLTF.preload(MECH_GLB);
useGLTF.preload(TERRAIN_GLB);
useGLTF.preload(POD_GLB);
useGLTF.preload(BMO_GLB);
// Preload all Scene 2 timeline models
SCENE2_TIMELINE.forEach((item) => useGLTF.preload(item.glb));
// Preload notebook for Scene 2
useGLTF.preload("/glb/notebook_and_pen.glb");

