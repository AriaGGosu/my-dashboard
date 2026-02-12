import { useRef, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { motion } from "framer-motion";
import {
  useGLTF,
  Stage,
  Grid,
  OrbitControls,
} from "@react-three/drei";
import { easing } from "maath";
import type {
  Group,
  MeshBasicMaterial,
  PointLight,
  BufferGeometry,
  Material,
} from "three";

const GLB_URL = "/s2wt_kamdo_industrial_divinities-transformed.glb";

type KamdoGLTF = {
  nodes: {
    body001: { geometry: BufferGeometry };
    head001: { geometry: BufferGeometry };
    stripe001: { geometry: BufferGeometry };
  };
  materials: {
    Body: Material;
    Head: Material;
  };
};

function Kamdo(props: { rotation: [number, number, number] }) {
  const head = useRef<Group>(null);
  const stripe = useRef<MeshBasicMaterial>(null);
  const light = useRef<PointLight>(null);
  const { nodes, materials } = useGLTF(GLB_URL) as unknown as KamdoGLTF;

  useFrame((state, delta) => {
    if (!head.current || !stripe.current || !light.current) return;
    const t = (1 + Math.sin(state.clock.elapsedTime * 2)) / 2;
    stripe.current.color.setRGB(2 + t * 20, 2, 20 + t * 50);
    easing.dampE(
      head.current.rotation,
      [
        0,
        state.pointer.x * (state.camera.position.z > 1 ? 1 : -1),
        0,
      ],
      0.4,
      delta
    );
    light.current.intensity = 1 + t * 4;
  });

  return (
    <group {...props}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.body001.geometry}
        material={materials.Body}
      />
      <group ref={head}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.head001.geometry}
          material={materials.Head}
        />
        <mesh castShadow receiveShadow geometry={nodes.stripe001.geometry}>
          <meshBasicMaterial ref={stripe} toneMapped={false} />
          <pointLight
            ref={light}
            intensity={1}
            color="#0a0205"
            distance={2.5}
          />
        </mesh>
      </group>
    </group>
  );
}

// Preload the model
useGLTF.preload(GLB_URL);

/** Escena idéntica a sandbox-extracted: fog, Stage, Kamdo, Grid, OrbitControls. */
export function KamdoSceneContent() {
  return (
    <>
      <fog attach="fog" args={["black", 15, 22.5]} />
      <Stage
        intensity={0.5}
        environment="city"
        shadows={{
          type: "accumulative",
          bias: -0.001,
          intensity: Math.PI,
        }}
        adjustCamera={false}
      >
        <Suspense fallback={null}>
          <Kamdo rotation={[0, Math.PI, 0]} />
        </Suspense>
      </Stage>
      <Grid
        renderOrder={-1}
        position={[0, -1.85, 0]}
        infiniteGrid
        cellSize={0.6}
        cellThickness={0.6}
        sectionSize={3.3}
        sectionThickness={1.5}
        sectionColor={[0.5, 0.5, 10]}
        fadeDistance={30}
      />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.05}
        enableZoom={false}
        makeDefault
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

export default function KamdoScene() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Canvas
        flat
        shadows
        camera={{ position: [-15, 0, 10], fov: 25 }}
        gl={{ alpha: true }}
      >
        <KamdoSceneContent />
      </Canvas>
    </motion.div>
  );
}
