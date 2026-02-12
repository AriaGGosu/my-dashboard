"use client";

import { useRef, useMemo, useLayoutEffect, Suspense } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  TextureLoader,
  LinearFilter,
  WebGLRenderTarget,
  Object3D,
  Color,
  InstancedMesh,
  type BufferGeometry,
  type Texture,
  type Material,
} from "three";
import { TechCard } from "@/components/ui/tech-card";
import { BackfaceMaterial } from "./BackfaceMaterial";
import { RefractionMaterial } from "./RefractionMaterial";
import { VISUAL_CARD_SIZE } from "@/lib/design-tokens";

const DIAMOND_GLB = "/diamond.glb";
const DIAMOND_IMAGES = [
  "/ph1.jpg",
  "/ph3.jpg",
  "/building.jpeg",
  "/photo-1519608487953-e999c86e7455.jpeg",
  "/photo-1533577116850-9cc66cad8a9b.jpeg",
];

const dummy = new Object3D();

/** Planos con imágenes que el diamante refracta (layer 0) */
function ImagePlanes({ textures }: { textures: Texture[] }) {
  const positions: [number, number, number][] = [
    [-2.5, 1.2, -12],
    [2.5, 1.2, -12],
    [-2.5, -1.2, -12],
    [2.5, -1.2, -12],
    [0, 0, -14],
  ];
  return (
    <group layers={0}>
      {textures.map((tex, i) => (
        <mesh key={i} position={positions[i]} layers={0}>
          <planeGeometry args={[3.5, 2.2]} />
          <meshBasicMaterial map={tex} depthWrite />
        </mesh>
      ))}
    </group>
  );
}

/** Diamante instanciado: rotación continua, multi-pass refracción */
function DiamondsInstanced() {
  const gltf = useGLTF(DIAMOND_GLB) as unknown as { nodes: Record<string, { geometry: BufferGeometry }> };
  const nodes = gltf.nodes;
  const nodeKey = "pCone1_lambert1_0" in nodes ? "pCone1_lambert1_0" : Object.keys(nodes)[0];
  const geometry = (nodes[nodeKey] ?? Object.values(nodes)[0])?.geometry;

  useLayoutEffect(() => {
    if (geometry?.center) geometry.center();
  }, [geometry]);

  if (!geometry) return null;

  const { size, gl, scene, camera, clock } = useThree();
  const model = useRef<InstancedMesh>(null);
  const ratio = Math.min(2, gl.getPixelRatio());

  const [envFbo, backfaceFbo, backfaceMaterial, refractionMaterial] = useMemo(() => {
    const w = size.width * ratio;
    const h = size.height * ratio;
    const envFbo = new WebGLRenderTarget(w, h);
    const backfaceFbo = new WebGLRenderTarget(w, h);
    const backfaceMat = new BackfaceMaterial();
    const refractionMat = new RefractionMaterial({
      envMap: envFbo.texture,
      backfaceMap: backfaceFbo.texture,
      resolution: [w, h],
    });
    return [envFbo, backfaceFbo, backfaceMat, refractionMat];
  }, [size.width, size.height, ratio]);

  useFrame(() => {
    if (!model.current || !geometry) return;
    const t = clock.getElapsedTime() / 2;
    const s = 2.2;
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(t, t, t);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    model.current.setMatrixAt(0, dummy.matrix);
    model.current.instanceMatrix.needsUpdate = true;

    gl.autoClear = false;
    camera.layers.set(0);
    gl.setRenderTarget(envFbo);
    gl.setClearColor(new Color(0.07, 0.07, 0.07), 1);
    gl.clear();
    gl.clearDepth();
    gl.render(scene, camera);

    camera.layers.set(1);
    model.current.material = backfaceMaterial;
    gl.setRenderTarget(backfaceFbo);
    gl.clearDepth();
    gl.render(scene, camera);

    camera.layers.set(0);
    gl.setRenderTarget(null);
    gl.setClearColor(new Color(0.07, 0.07, 0.07), 1);
    gl.clear();
    gl.clearDepth();
    gl.render(scene, camera);

    camera.layers.set(1);
    model.current.material = refractionMaterial;
    gl.clearDepth();
    gl.render(scene, camera);
  }, 1);

  return (
    <instancedMesh
      ref={model}
      layers={1}
      args={[geometry, refractionMaterial as unknown as Material, 1]}
      position={[0, 0, 0]}
    />
  );
}

function SceneContent() {
  const textures = useLoader(TextureLoader, DIAMOND_IMAGES);
  useMemo(() => textures.forEach((t) => (t.minFilter = LinearFilter)), [textures]);
  return (
    <>
      <ImagePlanes textures={textures} />
      <Suspense fallback={null}>
        <DiamondsInstanced />
      </Suspense>
    </>
  );
}

export function DiamondScene() {
  return (
    <TechCard className={`${VISUAL_CARD_SIZE} p-0 overflow-hidden`}>
      <div className="absolute top-2 left-3 z-10 text-[10px] uppercase tracking-[0.2em] text-[#EAEAEA]/50">
        Visual / 3D
      </div>
      <Canvas
        linear
        dpr={[1, 2]}
        orthographic
        camera={{ zoom: 45, position: [0, 0, 8] }}
        gl={{ alpha: false, antialias: true }}
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </TechCard>
  );
}

useGLTF.preload(DIAMOND_GLB);
