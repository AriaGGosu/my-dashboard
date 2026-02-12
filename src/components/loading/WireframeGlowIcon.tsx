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

function TorusWireframeWithGlow() {
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);

  useFrame((state) => {
    const delta = state.clock.getDelta();
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.6;
      meshRef.current.rotation.y += delta * 0.4;
    }
    if (glowRef.current) {
      glowRef.current.rotation.x = meshRef.current?.rotation.x ?? 0;
      glowRef.current.rotation.y = meshRef.current?.rotation.y ?? 0;
    }
  });

  return (
    <group>
      {/* Capa glow - torus más grande detrás, opacidad baja (efecto blur/glow) */}
      <mesh ref={glowRef} scale={1.2} position={[0, 0, -0.1]}>
        <torusKnotGeometry args={[0.5, 0.18, 48, 10, 2, 3]} />
        <meshBasicMaterial
          color="#EAEAEA"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
      {/* Wireframe principal */}
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[0.5, 0.18, 48, 10, 2, 3]} />
        <meshBasicMaterial
          color="#EAEAEA"
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}

export default function WireframeGlowIcon() {
  return (
    <div className="w-[6rem] h-[6rem] sm:w-[8rem] sm:h-[8rem] md:w-[10rem] md:h-[10rem] lg:w-[12rem] lg:h-[12rem]">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <TransparentBg />
        <TorusWireframeWithGlow />
      </Canvas>
    </div>
  );
}
