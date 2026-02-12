import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import type { Mesh } from "three";

function TransparentBg() {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = null;
  }, [scene]);
  return null;
}

function RotatingWireframe() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.8;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshBasicMaterial color="#EAEAEA" wireframe transparent opacity={0.4} />
      </mesh>
      <Grid
        position={[0, -1.0, 0]}
        infiniteGrid
        cellSize={0.3}
        cellThickness={0.35}
        sectionSize={0.9}
        sectionThickness={0.55}
        cellColor="#EAEAEA"
        sectionColor="#EAEAEA"
        fadeDistance={3}
        fadeStrength={1.2}
      />
    </group>
  );
}

export default function WireframeIcon() {
  return (
    <div className="w-[6rem] h-[6rem] sm:w-[8rem] sm:h-[8rem] md:w-[10rem] md:h-[10rem] lg:w-[12rem] lg:h-[12rem] flex items-center justify-center self-center">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ display: "block" }}
      >
        <TransparentBg />
        <RotatingWireframe />
      </Canvas>
    </div>
  );
}
