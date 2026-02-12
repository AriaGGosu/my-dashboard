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
import { BackfaceMaterial } from "./BackfaceMaterial";
import { RefractionMaterial } from "./RefractionMaterial";

const DIAMOND_GLB = "/diamond.glb";
const dummy = new Object3D();

/** Plano con la imagen que llena toda la card (muy grande para cubrir todo el viewport) */
function SingleImagePlane({ texture }: { texture: Texture }) {
  return (
    <group layers={0}>
      <mesh position={[0, 0, -15]} layers={0}>
        <planeGeometry args={[40, 50]} />
        <meshBasicMaterial map={texture} depthWrite />
      </mesh>
    </group>
  );
}

function DiamondInstanced() {
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
    const s = 1.2;
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(t, t, t);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    model.current.setMatrixAt(0, dummy.matrix);
    model.current.instanceMatrix.needsUpdate = true;

    gl.autoClear = false;
    camera.layers.set(0);
    gl.setRenderTarget(envFbo);
    gl.setClearColor(new Color(0, 0, 0), 1);
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
    gl.setClearColor(new Color(0, 0, 0), 1);
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

function SectionSceneContent({ imageSrc }: { imageSrc: string }) {
  const [texture] = useLoader(TextureLoader, [imageSrc]);
  useMemo(() => {
    texture.minFilter = LinearFilter;
  }, [texture]);
  return (
    <>
      <SingleImagePlane texture={texture} />
      <Suspense fallback={null}>
        <DiamondInstanced />
      </Suspense>
    </>
  );
}

/** Una sola imagen = plano 3D + diamante (landing About, columna derecha). */
export function DiamondSectionOverlay({ imageSrc }: { imageSrc: string }) {
  return (
    <div
      className="absolute inset-0 w-full h-full min-w-0 min-h-[280px] pointer-events-none bg-[#000]"
      aria-hidden
    >
      <Canvas
        linear
        dpr={[1, 2]}
        orthographic
        camera={{ zoom: 14, position: [0, 0, 12] }}
        gl={{ alpha: false, antialias: true }}
        style={{ display: "block", width: "100%", height: "100%", background: "#000" }}
      >
        <Suspense fallback={null}>
          <SectionSceneContent imageSrc={imageSrc} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(DIAMOND_GLB);
