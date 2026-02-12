"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Grid, OrbitControls } from "@react-three/drei";
import { KamdoSceneContent } from "@/components/hero/KamdoScene";

const KAMDO_GLB = "/s2wt_kamdo_industrial_divinities-transformed.glb";
useGLTF.preload(KAMDO_GLB);

/** Escena de respaldo: grid + caja wireframe, sin GLB. Se muestra si Kamdo no carga a tiempo. */
function FallbackTrainingScene() {
  return (
    <>
      <fog attach="fog" args={["#000", 12, 22]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color="#333" wireframe />
      </mesh>
      <Grid
        renderOrder={-1}
        position={[0, -2, 0]}
        infiniteGrid
        cellSize={0.6}
        cellThickness={0.6}
        sectionSize={3.3}
        sectionThickness={1.5}
        sectionColor={[0.3, 0.3, 0.6]}
        fadeDistance={30}
      />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.1}
        enableZoom={false}
        makeDefault
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

/** Sección 3 landing: escena Kamdo + Grid; mientras carga se muestra grid + caja wireframe. */
export function TrainingRoom3D() {
  return (
    <div
      className="absolute inset-0 w-full h-full bg-[#000]"
      style={{ minHeight: "100vh", height: "100%", width: "100%" }}
    >
      <Canvas
        flat
        shadows
        frameloop="always"
        camera={{ position: [-15, 0, 10], fov: 25 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ display: "block", width: "100%", height: "100%", minHeight: "100vh" }}
      >
        <Suspense fallback={<FallbackTrainingScene />}>
          <KamdoSceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
