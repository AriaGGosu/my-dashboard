import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Mesh } from "three";

function TransparentBg() {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = null;
  }, [scene]);
  return null;
}

function RotatingOctahedron() {
  const meshRef = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.6;
      meshRef.current.rotation.z += delta * 0.5;
    }
  });
  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[0.85, 0]} />
      <meshBasicMaterial color="#EAEAEA" wireframe transparent opacity={0.4} />
    </mesh>
  );
}

export default function WireframeOctIcon() {
  return (
    <div className="w-[6rem] h-[6rem] sm:w-[8rem] sm:h-[8rem] md:w-[10rem] md:h-[10rem] lg:w-[12rem] lg:h-[12rem]">
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        <TransparentBg />
        <RotatingOctahedron />
      </Canvas>
    </div>
  );
}
