"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF, Clone, Environment, MeshReflectorMaterial, OrbitControls, SpotLight, useTexture } from "@react-three/drei";
import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AnimationClip,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Euler,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PropertyBinding,
  Quaternion,
  ShaderMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import gsap from "gsap";
import { motion, AnimatePresence } from "framer-motion";
import {
  type QuestionNode,
  type ConnectionData,
  QUESTIONS,
  TIEBREAKER,
  ENDINGS,
  ALL_NODES,
  TOTAL_STEPS,
  TURRET_GLB,
  TURRET_RED_GLB,
  TURRET_BLUE_GLB,
  SCUTTLE_CRAB_PURPLE_GLB,
  SCUTTLE_CRAB_GREEN_GLB,
  NEXUS_GLB,
  LOOT_GOBLIN_GLB,
  PRESENTER_GLB,
  CRAB_MINIMAP_IMAGES,
  PRESENTER_SCRIPT,
  NODE_COLOR_MAP,
  getNodeGlb,
  getConnections,
} from "./data";

//  Shared utility functions

/** Strip animation tracks whose target node doesn't exist in the root, silencing
 *  THREE.PropertyBinding "No target node found" warnings that spam the console. */
export function cleanAnimations(clips: AnimationClip[], root: Object3D): AnimationClip[] {
  const nodeNames = new Set<string>();
  root.traverse((child) => { if (child.name) nodeNames.add(child.name); });

  return clips.map((clip) => {
    const validTracks = clip.tracks.filter((track) => {
      const parsedPath = PropertyBinding.parseTrackName(track.name);
      if (!parsedPath.nodeName || parsedPath.nodeName === "") return true;
      return nodeNames.has(parsedPath.nodeName);
    });
    return new AnimationClip(clip.name, clip.duration, validTracks, clip.blendMode);
  });
}

/** Responsive hook */
export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return mobile;
}

//  Tower mesh debug state (shared between debug panel & NodeModel)

/** Global set of hidden mesh names  shared across all tower instances */
export const _hiddenTowerMeshes = new Set<string>(["mesh_0_4"]);
export const _towerMeshListeners: Array<() => void> = [];
export function getHiddenTowerMeshes() { return _hiddenTowerMeshes; }
export function toggleTowerMesh(name: string) {
  if (_hiddenTowerMeshes.has(name)) _hiddenTowerMeshes.delete(name);
  else _hiddenTowerMeshes.add(name);
  _towerMeshListeners.forEach((fn) => fn());
}
export function useTowerMeshUpdates() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    _towerMeshListeners.push(fn);
    return () => { const idx = _towerMeshListeners.indexOf(fn); if (idx >= 0) _towerMeshListeners.splice(idx, 1); };
  }, []);
}

//  Components extracted from Valentine.tsx


/** Black reflective floor with real reflections */
export function PresenterReflectiveFloor({ yPos, xPos = 0, zPos = 0 }: { yPos: number; xPos?: number; zPos?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[xPos, yPos, zPos]}>
      <planeGeometry args={[80, 80]} />
      <MeshReflectorMaterial
        resolution={1024}
        mixBlur={0.3}
        mixStrength={80}
        roughness={1}
        depthScale={0}
        minDepthThreshold={0.9}
        maxDepthThreshold={1}
        color="#111111"
        metalness={0.75}
        mirror={0.9}
      />
    </mesh>
  );
}

//  UI: Question overlay

export const QuestionOverlay = memo(function QuestionOverlay({
  node,
  onChoose,
  visible,
  step,
  totalSteps,
  stepColors = [],
}: {
  node: QuestionNode;
  onChoose: (choice: "A" | "B") => void;
  visible: boolean;
  step: number;
  totalSteps: number;
  stepColors?: string[];
}) {
  return (
    <AnimatePresence>
      {visible && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: "6vh",
            zIndex: 10,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              pointerEvents: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              width: "min(92vw, 500px)",
            }}
          >
            {/* Step indicator  colored by decision */}
            <div style={{ display: "flex", gap: 6, marginBottom: -4 }}>
              {Array.from({ length: totalSteps }).map((_, i) => {
                const answered = i < step;
                const isCurrent = i === step;
                const color = answered && stepColors[i] ? stepColors[i] : undefined;
                return (
                  <div
                    key={i}
                    style={{
                      width: isCurrent ? 18 : answered ? 14 : 8,
                      height: 3,
                      borderRadius: 2,
                      background: answered && color
                        ? color
                        : isCurrent
                          ? "rgba(255, 255, 255, 0.7)"
                          : "rgba(20, 20, 20, 0.8)",
                      transition: "all 0.4s ease",
                    }}
                  />
                );
              })}
            </div>

            {/* Context + Question */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.88)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 14,
                padding: "18px 24px",
                textAlign: "center",
                width: "100%",
              }}
            >
              <p style={{
                color: "rgba(255, 255, 255, 0.4)",
                fontSize: 12.5,
                fontWeight: 400,
                lineHeight: 1.4,
                margin: "0 0 6px",
                fontStyle: "italic",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                {node.context}
              </p>
              <p style={{
                color: "rgba(255, 255, 255, 0.92)",
                fontSize: 16,
                fontWeight: 500,
                lineHeight: 1.4,
                margin: 0,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                {node.question}
              </p>
            </div>

            {/* 2 Options side by side */}
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              {[
                { choice: "A" as const, opt: node.optionA, color: "#ff6b9d" },
                { choice: "B" as const, opt: node.optionB, color: "#4a6fa5" },
              ].map(({ choice, opt, color }) => (
                <motion.button
                  key={choice}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: choice === "A" ? 0.1 : 0.2, duration: 0.4 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onChoose(choice)}
                  style={{
                    flex: 1,
                    padding: "14px 16px",
                    background: "rgba(0, 0, 0, 0.85)",
                    border: `1px solid ${color}30`,
                    borderRadius: 10,
                    cursor: "pointer",
                    color: "rgba(255, 255, 255, 0.88)",
                    fontSize: 13,
                    fontWeight: 400,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    transition: "border-color 0.3s, box-shadow 0.3s",
                    boxShadow: `0 0 15px ${color}08`,
                    textAlign: "center",
                    lineHeight: 1.4,
                    backdropFilter: "blur(12px)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${color}70`;
                    e.currentTarget.style.boxShadow = `0 0 25px ${color}18`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${color}30`;
                    e.currentTarget.style.boxShadow = `0 0 15px ${color}08`;
                  }}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

// 
//  UI: Minimap  bird's-eye view of node network
// 

const MINIMAP_SIZE_DESKTOP = 360;
const MINIMAP_SIZE_MOBILE = 140;

/** Convert 3D node position (X, Z) to 2D minimap coords with given size */
function toMinimap(pos: [number, number, number], size: number, pad: number): { x: number; y: number } {
  const minX = -16, maxX = 14, minZ = -64, maxZ = 4;
  const x = ((pos[0] - minX) / (maxX - minX)) * (size - pad * 2) + pad;
  const y = ((pos[2] - maxZ) / (minZ - maxZ)) * (size - pad * 2) + pad;
  return { x, y };
}

/** Hook to get responsive minimap size */
function useMinimapSize(): number {
  const [size, setSize] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? MINIMAP_SIZE_MOBILE : MINIMAP_SIZE_DESKTOP
  );
  useEffect(() => {
    const update = () => setSize(window.innerWidth < 768 ? MINIMAP_SIZE_MOBILE : MINIMAP_SIZE_DESKTOP);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

export const Minimap = memo(function Minimap({
  activeNodeId,
  crabNodeId,
  traversedEdges,
  answeredNodes,
  winningColor,
  crabImage,
}: {
  activeNodeId: string;
  crabNodeId: string;
  traversedEdges: Map<string, string>;
  answeredNodes: Map<string, string>;
  winningColor: string;
  crabImage: string;
}) {
  const mapSize = useMinimapSize();
  const isMini = mapSize <= MINIMAP_SIZE_MOBILE;
  const pad = isMini ? 12 : 26;
  const connections = useMemo(() => getConnections(), []);

  // Crab position interpolates smoothly
  const crabNode = ALL_NODES[crabNodeId] ?? ALL_NODES["start"];
  const crabPos = crabNode ? toMinimap(crabNode.position, mapSize, pad) : { x: 0, y: 0 };

  // Responsive sizing
  const crabIconSize = isMini ? 24 : 42;
  const lineWidthActive = isMini ? 1.5 : 2;
  const lineWidthDefault = isMini ? 1 : 1.5;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      style={{
        position: "absolute",
        top: isMini ? 10 : 50,
        right: isMini ? 10 : 50,
        width: mapSize,
        height: mapSize,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(10px)",
        border: `1px solid ${winningColor}30`,
        borderRadius: isMini ? 8 : 12,
        zIndex: 20,
        pointerEvents: "none",
        overflow: "hidden",
        transition: "border-color 0.8s ease",
      }}
    >
      {/* Pulse keyframe for minimap */}
      <style>{`@keyframes minimapPulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.7);opacity:0} }`}</style>

      {/* Connection lines */}
      <svg
        width={mapSize}
        height={mapSize}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {connections.map((c, i) => {
          const from = toMinimap(c.from, mapSize, pad);
          const to = toMinimap(c.to, mapSize, pad);
          const edgeKey = `${c.fromId}->${c.toId}`;
          const chosenColor = traversedEdges.get(edgeKey);
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={chosenColor ?? "rgba(255,255,255,0.25)"}
              strokeOpacity={chosenColor ? 0.8 : 0.45}
              strokeWidth={chosenColor ? lineWidthActive : lineWidthDefault}
              style={{ transition: "stroke 0.8s, stroke-opacity 0.8s" }}
            />
          );
        })}
      </svg>

      {/* Node dots */}
      {Object.values(ALL_NODES).map((node) => {
        const pos = toMinimap(node.position, mapSize, pad);
        const isActive = node.id === activeNodeId;
        const answeredColor = answeredNodes.get(node.id);
        const isEnd = node.id === "end";
        const dotSize = isMini ? (isEnd ? 12 : 6) : (isEnd ? 28 : 18);
        const dotBg = answeredColor
          ? answeredColor
          : isActive
            ? "#ffffff"
            : "rgba(255, 255, 255, 0.15)";
        const dotShadow = isActive
          ? `0 0 6px ${winningColor}99`
          : answeredColor
            ? `0 0 4px ${answeredColor}88`
            : "none";
        return (
          <div key={node.id} style={{ position: "absolute", left: pos.x - dotSize / 2, top: pos.y - dotSize / 2, width: dotSize, height: dotSize }}>
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  inset: isMini ? -2 : -4,
                  borderRadius: "50%",
                  border: `${isMini ? 1 : 1.5}px solid ${winningColor}`,
                  opacity: 0.7,
                  animation: "minimapPulse 1.8s ease-in-out infinite",
                }}
              />
            )}
            <div
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: "50%",
                background: dotBg,
                boxShadow: dotShadow,
                transition: "all 0.6s ease",
              }}
            />
          </div>
        );
      })}

      {/* Crab marker */}
      <motion.img
        src={crabImage}
        alt=""
        animate={{ x: crabPos.x - crabIconSize / 2, y: crabPos.y - crabIconSize / 2 }}
        transition={{ duration: 2, ease: "linear" }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: crabIconSize,
          height: crabIconSize,
          objectFit: "contain",
          filter: `drop-shadow(0 0 ${isMini ? 6 : 12}px ${winningColor}cc)`,
        }}
      />

      {/* Label  hidden on mobile */}
      {!isMini && <div style={{
        position: "absolute",
        bottom: 10,
        left: 10,
        textAlign: "center",
        fontSize: 14,
        color: "rgba(255, 107, 157, 0.4)",
        fontFamily: "'Inter', system-ui, sans-serif",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}>
        Map
      </div>}
    </motion.div>
  );
});

// 
//  Debug: Animation panel  press D to toggle
// 

export function AnimDebugPanel() {
  const [open, setOpen] = useState(false);
  const [glbUrl, setGlbUrl] = useState(TURRET_RED_GLB);
  const [activeAnim, setActiveAnim] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "d" || e.key === "D") setOpen((p) => !p); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  return (
    <div style={{
      position: "absolute", bottom: 16, left: 16, zIndex: 100, background: "rgba(0,0,0,0.9)",
      border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: 12, minWidth: 220,
      fontFamily: "'Inter', monospace", fontSize: 11, color: "#fff",
    }}>
      <div style={{ marginBottom: 8, fontWeight: 600, color: "rgba(255,107,157,0.8)" }}>Anim Debug (D to close)</div>
      <select
        value={glbUrl}
        onChange={(e) => { setGlbUrl(e.target.value); setActiveAnim(null); }}
        style={{ width: "100%", marginBottom: 8, padding: 4, background: "#222", color: "#fff", border: "1px solid #444", borderRadius: 4, fontSize: 10 }}
      >
        <option value={TURRET_RED_GLB}>turrets_red</option>
        <option value={TURRET_BLUE_GLB}>turrets_blue</option>
        <option value={TURRET_GLB}>turrets_(48)</option>
        <option value={SCUTTLE_CRAB_PURPLE_GLB}>scuttle_crab_purple</option>
        <option value={SCUTTLE_CRAB_GREEN_GLB}>scuttle_crab_green</option>
        <option value={NEXUS_GLB}>nexus (end)</option>
        <option value={LOOT_GOBLIN_GLB}>loot_goblin</option>
      </select>
      <AnimDebugList glbUrl={glbUrl} activeAnim={activeAnim} setActiveAnim={setActiveAnim} />
    </div>
  );
}

function AnimDebugList({ glbUrl, activeAnim, setActiveAnim }: {
  glbUrl: string; activeAnim: string | null; setActiveAnim: (n: string | null) => void;
}) {
  const { animations } = useGLTF(glbUrl);
  const names = useMemo(() => animations.map((a) => a.name), [animations]);

  return (
    <div>
      <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{names.length} animations:</div>
      {names.map((name) => (
        <button
          key={name}
          onClick={() => setActiveAnim(name)}
          style={{
            display: "block", width: "100%", textAlign: "left", padding: "3px 6px", marginBottom: 2,
            background: activeAnim === name ? "rgba(255,107,157,0.3)" : "rgba(255,255,255,0.05)",
            border: activeAnim === name ? "1px solid rgba(255,107,157,0.5)" : "1px solid transparent",
            borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: 10,
          }}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

// 

/** 3D preview model inside the debug panel canvas */
function TowerPreviewModel({ glbUrl }: { glbUrl: string }) {
  const { scene } = useGLTF(glbUrl);
  const groupRef = useRef<Group>(null);
  useTowerMeshUpdates();

  useFrame(() => {
    if (!groupRef.current) return;
    const hidden = getHiddenTowerMeshes();
    if (hidden.size > 0) {
      groupRef.current.traverse((o) => {
        if (o.name && hidden.has(o.name)) o.visible = false;
        else if (o.name) o.visible = true;
      });
    }
  });

  // Auto-rotate slowly for inspection
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.4;
  });

  return (
    <group ref={groupRef} scale={0.01}>
      <Clone object={scene} deep />
    </group>
  );
}

export function TowerDebugPanel() {
  const [open, setOpen] = useState(false);
  const [selectedGlb, setSelectedGlb] = useState(TURRET_RED_GLB);
  useTowerMeshUpdates();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "t" || e.key === "T") setOpen((p) => !p); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  return (
    <div style={{
      position: "absolute", bottom: 16, right: 16, zIndex: 100, background: "rgba(0,0,0,0.92)",
      border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: 12, minWidth: 280, maxHeight: "85vh", overflowY: "auto",
      fontFamily: "'Inter', monospace", fontSize: 11, color: "#fff",
    }}>
      <div style={{ marginBottom: 8, fontWeight: 600, color: "rgba(255,107,157,0.8)" }}>Tower Mesh Debug (T to close)</div>
      <select
        value={selectedGlb}
        onChange={(e) => setSelectedGlb(e.target.value)}
        style={{ width: "100%", marginBottom: 8, padding: 4, background: "#222", color: "#fff", border: "1px solid #444", borderRadius: 4, fontSize: 10 }}
      >
        <option value={TURRET_RED_GLB}>turrets_red</option>
        <option value={TURRET_BLUE_GLB}>turrets_blue</option>
        <option value={TURRET_GLB}>turrets_(48)</option>
        <option value={NEXUS_GLB}>nexus (end)</option>
        <option value={LOOT_GOBLIN_GLB}>loot_goblin (answered)</option>
      </select>

      {/* 3D Preview */}
      <div style={{
        width: "100%", height: 200, borderRadius: 8, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)", marginBottom: 8, background: "#111",
      }}>
        <Canvas
          camera={{ position: [0, 2, 5], fov: 40, near: 0.01, far: 100 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={["#111111"]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 3]} intensity={1.2} />
          <Suspense fallback={null}>
            <TowerPreviewModel glbUrl={selectedGlb} />
            <Environment preset="night" />
          </Suspense>
          <OrbitControls enableZoom enablePan={false} />
        </Canvas>
      </div>

      <TowerMeshList glbUrl={selectedGlb} />
    </div>
  );
}

function TowerMeshList({ glbUrl }: { glbUrl: string }) {
  const { scene } = useGLTF(glbUrl);
  useTowerMeshUpdates();

  // Collect all named children recursively
  const meshNames = useMemo(() => {
    const names: { name: string; depth: number }[] = [];
    const walk = (obj: import("three").Object3D, depth: number) => {
      if (obj.name) names.push({ name: obj.name, depth });
      obj.children.forEach((c) => walk(c, depth + 1));
    };
    scene.children.forEach((c) => walk(c, 0));
    return names;
  }, [scene]);

  const hidden = getHiddenTowerMeshes();

  return (
    <div>
      <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{meshNames.length} objects:</div>
      {meshNames.map(({ name, depth }, i) => {
        const isHidden = hidden.has(name);
        return (
          <button
            key={`${name}-${i}`}
            onClick={() => toggleTowerMesh(name)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "3px 6px", paddingLeft: 6 + depth * 10,
              marginBottom: 1,
              background: isHidden ? "rgba(255,50,50,0.2)" : "rgba(255,255,255,0.05)",
              border: isHidden ? "1px solid rgba(255,50,50,0.4)" : "1px solid transparent",
              borderRadius: 3, color: isHidden ? "rgba(255,100,100,0.8)" : "#fff",
              cursor: "pointer", fontSize: 10,
              textDecoration: isHidden ? "line-through" : "none",
            }}
          >
            {isHidden ? "✗ " : "✓ "}{name}
          </button>
        );
      })}
    </div>
  );
}

// 
// 
//  UI: Together Modal  "Me elegiste"
// 

export const TogetherModal = memo(function TogetherModal({ onRestart, onStartConcert }: { onRestart: () => void; onStartConcert?: () => void }) {
  const isMobile = useIsMobile();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
      transition={{ duration: 1.2, delay: 0.3 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          width: "min(92vw, 500px)",
          maxHeight: isMobile ? "60vh" : "85vh",
          background: "rgba(0, 0, 0, 0.82)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 107, 157, 0.15)",
          borderRadius: isMobile ? 16 : 22,
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        <div style={{
          width: "100%",
          height: "100%",
          padding: isMobile ? "20px 20px" : "32px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          overflowY: "auto",
        }}>
          {/* Cuporo sticker */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.6, ease: "backOut" }}
            style={{ marginBottom: isMobile ? 6 : 10, flexShrink: 0 }}
          >
            <motion.img
              src="/images/lol/cuporo.webp"
              alt="cuporo"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: isMobile ? 48 : 120, height: isMobile ? 48 : 120, objectFit: "contain", display: "inline-block" }}
            />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            style={{ fontSize: isMobile ? 18 : 22, fontWeight: 600, color: "rgba(255,255,255,0.95)", margin: "0 0 4px", fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            Yo También Te Elijo
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.5 }}
            style={{ fontSize: isMobile ? 11 : 14, color: "rgba(255,107,157,0.75)", margin: "0 0 10px", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500 }}>
            Amor De Mi Vida
          </motion.p>

          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.5, duration: 0.6 }}
            style={{ height: 1, margin: "0 auto 16px", width: 80, background: "linear-gradient(90deg, transparent, rgba(255,107,157,0.5), transparent)", flexShrink: 0 }} />

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.75)", fontSize: isMobile ? 12 : 14, lineHeight: 1.7, margin: "0 0 12px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            En cada decisión, en cada camino, en cada universo posible... siempre serías tú.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.75)", fontSize: isMobile ? 12 : 14, lineHeight: 1.7, margin: "0 0 16px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            Gracias por elegirme, por quedarte, por apostar por nosotros. Eres mi persona favorita, mi paz en el caos, mi hogar cuando todo se siente lejos.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3, duration: 0.8 }}
            style={{ color: "rgba(255,107,157,0.9)", fontSize: isMobile ? 12 : 14, lineHeight: 1.7, margin: "0 0 20px", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500, fontStyle: "italic" }}>
            Te amo con cada parte de mí, con todo lo que soy y todo lo que seré. Este es solo el comienzo de nuestra historia juntos.
          </motion.p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }} style={{ flexShrink: 0, paddingBottom: 8, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRestart}
              style={{ padding: "10px 28px", background: "linear-gradient(135deg, rgba(255,107,157,0.12), rgba(255,50,80,0.12))", border: "1px solid rgba(255,107,157,0.3)", borderRadius: 8, color: "rgba(255,107,157,0.8)", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.05em" }}>
              Volver a recorrer
            </motion.button>
            {onStartConcert && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onStartConcert}
                style={{ padding: "10px 28px", background: "linear-gradient(135deg, rgba(120,50,200,0.15), rgba(80,20,160,0.15))", border: "1px solid rgba(160,80,255,0.3)", borderRadius: 8, color: "rgba(180,130,255,0.9)", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.05em" }}>
                Regalo Secreto
              </motion.button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
});

// 
//  UI: Alone Modal  "Caminos diferentes"
// 

export const AloneModal = memo(function AloneModal({ onRestart }: { onRestart: () => void }) {
  const isMobile = useIsMobile();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
      transition={{ duration: 1.2, delay: 0.3 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          width: "min(92vw, 500px)",
          maxHeight: isMobile ? "60vh" : "85vh",
          background: "rgba(0, 0, 0, 0.82)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: isMobile ? 16 : 22,
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        <div style={{
          width: "100%",
          height: "100%",
          padding: isMobile ? "20px 20px" : "32px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          overflowY: "auto",
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.6, ease: "backOut" }}
            style={{ marginBottom: isMobile ? 6 : 10, flexShrink: 0 }}
          >
            <motion.img
              src="/images/lol/cumpleporo.webp"
              alt="cumpleporo"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: isMobile ? 48 : 120, height: isMobile ? 48 : 120, objectFit: "contain", display: "inline-block" }}
            />
          </motion.div>

          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.6 }}
            style={{ fontSize: isMobile ? 18 : 24, fontWeight: 600, color: "rgba(255,255,255,0.9)", margin: "0 0 4px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            Caminos Que Se Encuentran
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.5 }}
            style={{ fontSize: isMobile ? 9 : 10, color: "rgba(255,255,255,0.3)", margin: "0 0 10px", fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Sobre el amor, el respeto y los caminos propios
          </motion.p>

          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.5, duration: 0.6 }}
            style={{ height: 1, margin: "0 auto 16px", width: 80, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)", flexShrink: 0 }} />

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.65)", fontSize: isMobile ? 12 : 14, lineHeight: 1.7, margin: "0 0 12px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            Gracias por ser honesta, y por tomarte el tiempo de reflexionar. El amor verdadero también sabe respetar las decisiones del corazón.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.65)", fontSize: isMobile ? 12 : 14, lineHeight: 1.7, margin: "0 0 12px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            A veces los caminos se separan no porque el amor se acabe, sino porque cada alma necesita su propio viaje. Y eso está bien.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.55)", fontSize: isMobile ? 12 : 14, lineHeight: 1.7, margin: "0 0 12px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            Te deseo toda la felicidad del mundo, toda la paz que tu corazón merece. Que encuentres en tu camino todo aquello que buscas.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.75)", fontSize: isMobile ? 12 : 14, lineHeight: 1.7, margin: "0 0 20px", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500, fontStyle: "italic" }}>
            Si algún día nuestros caminos se vuelven a cruzar, será porque así tenía que ser. Siempre tendrás mi respeto, mi cariño y mi admiración.
          </motion.p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} style={{ flexShrink: 0, paddingBottom: 8 }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRestart}
              style={{ padding: "10px 28px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.05em" }}>
              Volver a recorrer
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
});

// 
//  PRESENTER: 3D Scene & Dialogue Overlay
// 

export function PresenterModel({ animName, holdLastFrame = false }: { animName: string; holdLastFrame?: boolean }) {
  const { scene, animations } = useGLTF(PRESENTER_GLB);
  const groupRef = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, groupRef);
  const playingAnim = useRef("");
  const requestedAnim = useRef(animName);
  const holdRef = useRef(holdLastFrame);
  requestedAnim.current = animName;
  holdRef.current = holdLastFrame;

  // Material setup (idempotent)
  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        if (!o.material.userData._presenterSetup) {
          o.material = o.material.clone();
          o.material.userData._presenterSetup = true;
        }
        o.material.envMapIntensity = 2.5;
        o.material.emissive = new Color("#ffaacc");
        o.material.emissiveIntensity = 0.3;
        o.material.transparent = false;
        o.material.opacity = 1;
      }
    });
  }, [scene]);

  // Track which animName we already processed so we don't re-trigger after idle fallback
  const processedAnim = useRef("");

  // Animation switching via useFrame  reliable inside R3F, no effect timing issues
  useFrame(() => {
    if (names.length === 0 || Object.keys(actions).length === 0) return;

    const desired = requestedAnim.current;

    // Don't re-process the same animName we already handled
    if (processedAnim.current === desired) return;

    const target = names.find((n) => n.toLowerCase().includes(desired.toLowerCase()))
      ?? names.find((n) => /defalt_idle/i.test(n))
      ?? names[0];
    if (!target || !actions[target]) return;

    // Mark as processed immediately
    processedAnim.current = desired;

    const idleName = names.find((n) => /defalt_idle/i.test(n)) ?? names.find((n) => /idle/i.test(n)) ?? names[0];

    // Crossfade from previous
    if (playingAnim.current && actions[playingAnim.current]) {
      actions[playingAnim.current]!.fadeOut(0.4);
    }
    actions[target]!.reset().fadeIn(0.4).play();

    // Only defalt_idle loops; everything else plays once
    const isLoop = /defalt_idle/i.test(target);
    if (isLoop) {
      actions[target]!.setLoop(2201, Infinity);
    } else {
      actions[target]!.clampWhenFinished = true;
      actions[target]!.setLoop(2200, 1);

      // If holdLastFrame → stay frozen on last frame; otherwise → fade back to idle
      if (!holdRef.current) {
        const mixer = actions[target]!.getMixer();
        const onFinish = () => {
          if (idleName && actions[idleName]) {
            actions[target]!.fadeOut(0.5);
            actions[idleName]!.reset().fadeIn(0.5).play();
            actions[idleName]!.setLoop(2201, Infinity);
            playingAnim.current = idleName;
          }
          mixer.removeEventListener("finished", onFinish);
        };
        mixer.addEventListener("finished", onFinish);
      }
      // else: clampWhenFinished keeps the model at the last frame
    }

    playingAnim.current = target;
  });

  return (
    <group ref={groupRef} position={[0, -0.7, 0]} scale={1.3}>
      <primitive object={scene} />
    </group>
  );
}

/** 3D preview model inside debug panel Canvas  R3F hooks are safe here */
export function PresenterDebugPreview({ scale, posY, activeAnim, onAnimNames }: {
  scale: number; posY: number; activeAnim: string | null;
  onAnimNames: (names: string[]) => void;
}) {
  const { scene, animations } = useGLTF(PRESENTER_GLB);
  const groupRef = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, groupRef);
  const reportedRef = useRef(false);

  // Report animation names to parent (once)
  useEffect(() => {
    if (names.length > 0 && !reportedRef.current) {
      reportedRef.current = true;
      onAnimNames(names);
    }
  }, [names, onAnimNames]);

  // Play selected animation
  const prevPlaying = useRef<string | null>(null);
  useEffect(() => {
    if (activeAnim === prevPlaying.current) return;
    prevPlaying.current = activeAnim;
    Object.values(actions).forEach((a) => a?.stop());
    if (activeAnim && actions[activeAnim]) {
      actions[activeAnim]!.reset().play();
      actions[activeAnim]!.setLoop(2201, Infinity);
    }
  }, [activeAnim, actions]);

  return (
    <group ref={groupRef} position={[0, posY, 0]} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

/** Debug panel for presenter  press P to toggle */
export function PresenterDebugPanel() {
  const [open, setOpen] = useState(false);
  const [activeAnim, setActiveAnim] = useState<string | null>(null);
  const [scale, setScale] = useState(1.3);
  const [posY, setPosY] = useState(-1.5);
  const [animNames, setAnimNames] = useState<string[]>([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "p" || e.key === "P") setOpen((p) => !p); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleAnimNames = useCallback((names: string[]) => setAnimNames(names), []);

  if (!open) return null;

  return (
    <div style={{
      position: "absolute", top: 16, left: 16, zIndex: 200, background: "rgba(0,0,0,0.95)",
      border: "1px solid rgba(255,170,204,0.2)", borderRadius: 12, padding: 14, minWidth: 280,
      maxHeight: "85vh", overflowY: "auto",
      fontFamily: "'Inter', monospace", fontSize: 11, color: "#fff",
    }}>
      <div style={{ marginBottom: 10, fontWeight: 600, color: "rgba(255,170,204,0.8)" }}>Presenter Debug (P to close)</div>

      {/* Scale slider */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>Scale: {scale.toFixed(2)}</label>
        <input type="range" min="0.1" max="5" step="0.05" value={scale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: "#ffaacc" }}
        />
      </div>

      {/* Position Y slider */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>Y Position: {posY.toFixed(1)}</label>
        <input type="range" min="-5" max="3" step="0.1" value={posY}
          onChange={(e) => setPosY(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: "#ffaacc" }}
        />
      </div>

      {/* 3D Preview  Canvas is inside this div, so R3F hooks work */}
      <div style={{
        width: "100%", height: 220, borderRadius: 8, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)", marginBottom: 10, background: "#111",
      }}>
        <Canvas
          camera={{ position: [0, 0.5, 3.5], fov: 45, near: 0.001, far: 200 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={["#111111"]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 3]} intensity={1.5} />
          <pointLight position={[-2, 3, 2]} intensity={0.8} color="#ff88aa" />
          <Suspense fallback={null}>
            <PresenterDebugPreview
              scale={scale}
              posY={posY}
              activeAnim={activeAnim}
              onAnimNames={handleAnimNames}
            />
            <Environment preset="night" />
          </Suspense>
          <OrbitControls enableZoom enablePan />
          <gridHelper args={[10, 10, "#333", "#222"]} />
          <axesHelper args={[2]} />
        </Canvas>
      </div>

      {/* Animations list */}
      <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: 4, fontSize: 10 }}>Animations ({animNames.length}):</div>
      {animNames.map((name, i) => {
        const isPlaying = activeAnim === name;
        return (
          <button
            key={`${name}-${i}`}
            onClick={() => setActiveAnim(isPlaying ? null : name)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "4px 8px", marginBottom: 2,
              background: isPlaying ? "rgba(255,170,204,0.2)" : "rgba(255,255,255,0.05)",
              border: isPlaying ? "1px solid rgba(255,170,204,0.4)" : "1px solid transparent",
              borderRadius: 4, color: isPlaying ? "#ffaacc" : "rgba(255,255,255,0.7)",
              cursor: "pointer", fontSize: 10,
              fontWeight: isPlaying ? 600 : 400,
            }}
          >
            {isPlaying ? "▶ " : "○ "}{name.replace(/tft_cafecuties_props_skin2_/i, "").replace(/\.tft_arenaskin_cafecuties\.anm/i, "")}
          </button>
        );
      })}
    </div>
  );
}

export function PresenterScreen({ onComplete }: { onComplete: (selectedCrab: "purple" | "green") => void }) {
  const isMobile = useIsMobile();
  const [lineIndex, setLineIndex] = useState(0);
  const [showCharSelect, setShowCharSelect] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentLine = PRESENTER_SCRIPT[lineIndex];
  const isLastDialogueLine = lineIndex >= PRESENTER_SCRIPT.length - 1;

  // Typewriter effect
  useEffect(() => {
    if (!currentLine) return;
    setDisplayedText("");
    let idx = 0;
    const text = currentLine.text;
    typingRef.current = setInterval(() => {
      idx++;
      setDisplayedText(text.slice(0, idx));
      if (idx >= text.length) {
        if (typingRef.current) clearInterval(typingRef.current);
      }
    }, 30);
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [lineIndex, currentLine]);

  const handleContinue = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (typingRef.current) clearInterval(typingRef.current);

    if (isLastDialogueLine) {
      setShowCharSelect(true);
    } else {
      setLineIndex((i) => i + 1);
    }
  }, [isLastDialogueLine]);

  // Auto-advance: when autoAdvance is true, advance after duration ms
  useEffect(() => {
    if (!currentLine?.autoAdvance) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (isLastDialogueLine) {
        setShowCharSelect(true);
      } else {
        setLineIndex((i) => i + 1);
      }
    }, currentLine.duration);
    return () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };
  }, [lineIndex, currentLine, isLastDialogueLine]);

  const handleSelectCrab = useCallback((crab: "purple" | "green") => {
    onComplete(crab);
  }, [onComplete]);

  return (
    <div style={{ width: "100%", height: "100%", background: "#000", position: "relative", overflow: "hidden" }}>
      {/* 3D Presenter */}
      <Canvas
        camera={{ position: [0, 0.5, isMobile ? 4.5 : 3.5], fov: isMobile ? 55 : 45 }}
        style={{ width: "100%", height: "100%" }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        gl={{ antialias: !isMobile, alpha: false, powerPreference: "high-performance" }}
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 5, 3]} intensity={1.2} color="#ffeedd" />
        <pointLight position={[-2, 3, 2]} intensity={0.6} color="#ff88aa" />
        <Suspense fallback={null}>
          <PresenterModel
            animName={currentLine?.animation ?? "defalt_idle"}
            holdLastFrame={currentLine?.holdLastFrame}
          />

          <PresenterReflectiveFloor yPos={-0.7} />
        </Suspense>
      </Canvas>

      {/* Top-right buttons */}
      {!showCharSelect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          style={{ position: "absolute", top: 20, right: 20, zIndex: 20, display: "flex", gap: 8 }}
        >
          {/* Skip button */}
          <motion.button
            onClick={() => {
              if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
              if (typingRef.current) clearInterval(typingRef.current);
              setShowCharSelect(true);
            }}
            style={{
              padding: "6px 18px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 8,
              color: "rgba(255, 255, 255, 0.45)",
              cursor: "pointer", fontSize: 12, fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: "0.08em",
              transition: "all 0.3s",
            }}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}
          >
            Skip &raquo;
          </motion.button>
        </motion.div>
      )}

      {/* Dialogue Box */}
      <AnimatePresence mode="wait">
        {!showCharSelect ? (
          <motion.div
            key={`line-${lineIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: isMobile ? 20 : "auto",
              top: isMobile ? "auto" : 0,
              ...(isMobile ? {} : { height: "100%" }),
              display: "flex",
              alignItems: isMobile ? "flex-end" : "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 10,
              paddingTop: isMobile ? 0 : "15vh",
            }}
          >
            <div style={{
              width: "min(90vw, 420px)",
              pointerEvents: "auto",
            }}>
              <div style={{
                background: "rgba(0, 0, 0, 0.88)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 170, 204, 0.2)", borderRadius: 16,
                padding: isMobile ? "16px 20px" : "20px 28px", textAlign: "center",
              }}>
                {/* Step dots */}
                <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 12 }}>
                  {PRESENTER_SCRIPT.map((_, i) => (
                    <div key={i} style={{
                      width: i === lineIndex ? 18 : 6, height: 4, borderRadius: 2,
                      background: i < lineIndex ? "rgba(255, 170, 204, 0.6)" : i === lineIndex ? "rgba(255, 170, 204, 0.9)" : "rgba(255,255,255,0.12)",
                      transition: "all 0.3s",
                    }} />
                  ))}
                </div>

                <p style={{
                  color: "rgba(255, 255, 255, 0.9)", fontSize: 16, fontWeight: 500,
                  lineHeight: 1.5, margin: currentLine?.buttonText ? "0 0 16px" : "0 0 0", fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  {displayedText}
                  <span style={{ opacity: 0.4, animation: "blink 1s infinite" }}>|</span>
                </p>

                {!currentLine?.autoAdvance && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleContinue}
                    style={{
                      padding: "10px 32px", background: "rgba(255, 170, 204, 0.12)",
                      border: "1px solid rgba(255, 170, 204, 0.25)", borderRadius: 10,
                      color: "rgba(255, 255, 255, 0.85)", cursor: "pointer", fontSize: 13,
                      fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {isLastDialogueLine ? "¡Vamos!" : (currentLine?.buttonText ?? "Continuar →")}
                  </motion.button>
                )}

              </div>
            </div>
          </motion.div>
        ) : (
          /* Character Selection */
          <motion.div
            key="char-select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: isMobile ? 20 : "auto",
              top: isMobile ? "auto" : 0,
              ...(isMobile ? {} : { height: "100%" }),
              display: "flex",
              alignItems: isMobile ? "flex-end" : "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 10,
              paddingTop: isMobile ? 0 : "15vh",
            }}
          >
            <div style={{
              width: "min(90vw, 420px)",
              pointerEvents: "auto",
            }}>
              <div style={{
                background: "rgba(0, 0, 0, 0.88)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 170, 204, 0.2)", borderRadius: 16,
                padding: isMobile ? "18px 20px" : "24px 28px", textAlign: "center",
              }}>
                <p style={{
                  color: "rgba(255, 255, 255, 0.7)", fontSize: 13, fontWeight: 400,
                  margin: "0 0 6px", fontFamily: "'Inter', system-ui, sans-serif",
                  fontStyle: "italic",
                }}>
                  Elige a tu compañero de aventura
                </p>
                <p style={{
                  color: "rgba(255, 255, 255, 0.9)", fontSize: 17, fontWeight: 600,
                  margin: "0 0 20px", fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  ¿Quién te acompañará en este camino?
                </p>

                <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
                  {/* Purple Crab */}
                  <motion.button
                    whileHover={{ scale: 1.06, borderColor: "rgba(180, 112, 208, 0.6)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectCrab("purple")}
                    style={{
                      flex: 1, maxWidth: 200, padding: "16px 12px",
                      background: "rgba(180, 112, 208, 0.08)",
                      border: "1px solid rgba(180, 112, 208, 0.2)", borderRadius: 14,
                      cursor: "pointer", display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 10, transition: "border-color 0.3s",
                    }}
                  >
                    <img src={CRAB_MINIMAP_IMAGES.purple} alt="Purple Crab" style={{ width: 64, height: 64, objectFit: "contain" }} />
                    <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif" }}>
                      Cangrejo Púrpura
                    </span>
                  </motion.button>

                  {/* Green Crab */}
                  <motion.button
                    whileHover={{ scale: 1.06, borderColor: "rgba(100, 200, 150, 0.6)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectCrab("green")}
                    style={{
                      flex: 1, maxWidth: 200, padding: "16px 12px",
                      background: "rgba(100, 200, 150, 0.08)",
                      border: "1px solid rgba(100, 200, 150, 0.2)", borderRadius: 14,
                      cursor: "pointer", display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 10, transition: "border-color 0.3s",
                    }}
                  >
                    <img src={CRAB_MINIMAP_IMAGES.green} alt="Green Crab" style={{ width: 64, height: 64, objectFit: "contain" }} />
                    <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif" }}>
                      Cangrejo Verde
                    </span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blink cursor style */}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      {/* Debug panel for presenter  press P */}
      <PresenterDebugPanel />
    </div>
  );
}



