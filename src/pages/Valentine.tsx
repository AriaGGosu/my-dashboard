"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF, Clone, Environment, MeshReflectorMaterial, OrbitControls } from "@react-three/drei";
import { EffectComposer, Outline } from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Euler,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  ShaderMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import gsap from "gsap";
import { motion, AnimatePresence } from "framer-motion";
import presenterMusicSrc from "../audio/Starry Latte Hour.mp3";

// ——————————————————————————————————————————————
//  QUESTION SYSTEM — Two paths: "Contigo" or "Sola"
// ——————————————————————————————————————————————

interface QuestionNode {
  id: string;
  context: string;
  question: string;
  optionA: { label: string; next: string; together: boolean };
  optionB: { label: string; next: string; together: boolean };
  position: [number, number, number];
}

interface EndNode {
  id: string;
  position: [number, number, number];
}

// ——————————————————————————————————————————————
//  DATA: Preguntas románticas — dos caminos
// ——————————————————————————————————————————————

const QUESTIONS: Record<string, QuestionNode> = {
  start: {
    id: "start",
    context: "Cierra los ojos. Imagina un camino que se divide en dos...",
    question: "Si pudieras elegir a alguien para recorrer la vida, ¿me elegirías a mí?",
    optionA: {
      label: "Te elegiría sin pensarlo.",
      next: "q2a",
      together: true,
    },
    optionB: {
      label: "Necesito caminar sola primero.",
      next: "q2b",
      together: false,
    },
    position: [0, -3, 0],
  },
  q2a: {
    id: "q2a",
    context: "Los años pasan, las estaciones cambian, pero algunos sentimientos permanecen...",
    question: "¿Te imaginas conmigo cuando tengamos canas y arrugas?",
    optionA: {
      label: "Envejecer contigo sería mi mayor aventura.",
      next: "q3a",
      together: true,
    },
    optionB: {
      label: "El futuro me da vértigo, no puedo prometer tanto.",
      next: "q3b",
      together: false,
    },
    position: [-8, 4, -15],
  },
  q2b: {
    id: "q2b",
    context: "Dicen que el amor verdadero no encadena, sino que libera...",
    question: "¿Crees que podríamos construir algo hermoso juntos?",
    optionA: {
      label: "Creo que juntos podemos con todo.",
      next: "q3b",
      together: true,
    },
    optionB: {
      label: "Algunos caminos son más bonitos en soledad.",
      next: "q3c",
      together: false,
    },
    position: [8, -2, -15],
  },
  q3a: {
    id: "q3a",
    context: "Habrá días de lluvia, de dudas, de silencios incómodos...",
    question: "¿Elegirías crecer conmigo, incluso en los días difíciles?",
    optionA: {
      label: "Especialmente en esos días, ahí quiero estar.",
      next: "q4a",
      together: true,
    },
    optionB: {
      label: "No quiero ser la razón de tu dolor.",
      next: "q4b",
      together: false,
    },
    position: [-14, 8, -30],
  },
  q3b: {
    id: "q3b",
    context: "La vida nos pone frente a decisiones que definen todo...",
    question: "Si tuvieras que apostar por alguien, ¿apostarías por nosotros?",
    optionA: {
      label: "Apostaría todo por nosotros.",
      next: "q4a",
      together: true,
    },
    optionB: {
      label: "Prefiero no apostar con los sentimientos.",
      next: "q4b",
      together: false,
    },
    position: [0, 1, -30],
  },
  q3c: {
    id: "q3c",
    context: "Cada corazón tiene su propio ritmo y su propio tiempo...",
    question: "¿Guardarías un lugar para mí en tu historia?",
    optionA: {
      label: "Siempre habrá un capítulo con tu nombre.",
      next: "q4a",
      together: true,
    },
    optionB: {
      label: "Mi historia necesita páginas solo mías.",
      next: "q4b",
      together: false,
    },
    position: [12, -4, -30],
  },
  q4a: {
    id: "q4a",
    context: "Este es el momento. No hay vuelta atrás...",
    question: "Aquí y ahora, con todo lo que somos... ¿me eliges?",
    optionA: {
      label: "Te elijo. Hoy, mañana y siempre.",
      next: "end",
      together: true,
    },
    optionB: {
      label: "Te quiero, pero necesito elegirme a mí.",
      next: "end",
      together: false,
    },
    position: [-8, 12, -45],
  },
  q4b: {
    id: "q4b",
    context: "A veces las decisiones más difíciles son las más honestas...",
    question: "¿Qué camino llama más fuerte a tu corazón?",
    optionA: {
      label: "El camino donde estés tú esperándome.",
      next: "end",
      together: true,
    },
    optionB: {
      label: "El camino donde aprenda a ser yo misma.",
      next: "end",
      together: false,
    },
    position: [8, -1, -45],
  },
};

const TIEBREAKER: QuestionNode = {
  id: "tiebreaker",
  context: "El destino nos trajo hasta aquí empatados... El universo pide una última señal.",
  question: "Con total honestidad, ¿qué dice tu corazón en este momento?",
  optionA: {
    label: "Dice que quiere intentarlo contigo.",
    next: "end",
    together: true,
  },
  optionB: {
    label: "Dice que necesita más tiempo a solas.",
    next: "end",
    together: false,
  },
  position: [0, 2, -60],
};

const ENDINGS: Record<string, EndNode> = {
  end: { id: "end", position: [0, 2, -60] },
};

const ALL_NODES: Record<string, { id: string; position: [number, number, number] }> = {
  ...Object.fromEntries(Object.values(QUESTIONS).map(q => [q.id, { id: q.id, position: q.position }])),
  ...ENDINGS,
};

// ——————————————————————————————————————————————
//  3D: Neural network visuals
// ——————————————————————————————————————————————

const ASHE_GLB = "/glb/lol/ashe_crystalis_motus.glb";
const BLUE_SENTINEL_GLB = "/glb/lol/blue_sentinel.glb";
const TURRET_GLB = "/glb/lol/turrets_(48).glb";
const TURRET_RED_GLB = "/glb/lol/turrets_(12)red.glb";
const TURRET_BLUE_GLB = "/glb/lol/turrets_(11)blue.glb";
const SCUTTLE_CRAB_PURPLE_GLB = "/glb/lol/scuttle_crab_(6).glb";
const SCUTTLE_CRAB_GREEN_GLB = "/glb/lol/scuttle_crab.glb";
const NEXUS_GLB = "/glb/lol/poro.glb";
const LOOT_GOBLIN_GLB = "/glb/lol/nexusblitz_lootgoblin_(9).glb";
const PRESENTER_GLB = "/glb/presentador/custom_tftcafecutiesmaid_(nan).glb";

const CRAB_MINIMAP_IMAGES: Record<string, string> = {
  purple: "/images/lol/Scuttle-crub-purple.png",
  green: "/images/lol/Scuttle-crub-green.png",
};

// ——————————————————————————————————————————————
//  PRESENTER: Intro dialogue system
// ——————————————————————————————————————————————

interface PresenterLine {
  text: string;
  animation: string;       // animation name (partial match)
  duration: number;        // how long to show this line (ms)
  buttonText?: string;     // custom button label (default: "Continuar →")
  holdLastFrame?: boolean; // if true, freeze on last frame instead of returning to idle
  autoAdvance?: boolean;   // if true, no button shown — auto-advance after duration ms
}

// #	Nombre completo	Keyword para animation:
// 0	tft_cafecuties_props_skin2_bow	"bow"
// 1	tft_cafecuties_props_skin2_celebrate	"celebrate"
// 2	tft_cafecuties_props_skin2_click	"click"
// 3	tft_cafecuties_props_skin2_defalt_idle	"defalt_idle" (idle loop)
// 4	tft_cafecuties_props_skin2_idle2	"idle2"
// 5	tft_cafecuties_props_skin2_idle2_in	"idle2_in"
// 6	tft_cafecuties_props_skin2_intro	"intro"
// 7	tft_cafecuties_props_skin2_intro_bow	"intro_bow"
// 8	tft_cafecuties_props_skin2_intro_bow_02	"intro_bow_02"
// 9	tft_cafecuties_props_skin2_intro_bow_03	"intro_bow_03"
// 10	tft_cafecuties_props_skin2_jumping	"jumping"
// 11	tft_cafecuties_props_skin2_sweep	"sweep"
// 12	tft_cafecuties_props_skin2_swerve	"swerve"
// 13	tft_cafecuties_props_skin2_trafficcontrol	"trafficcontrol"
// 14	tft_cafecuties_props_skin2_turn_idle	"turn_idle"
// 15	tft_cafecuties_props_skin2_win1	"win1"
// 16	tft_cafecuties_props_skin2_win2	"win2"
// 17	tft_cafecuties_props_skin2_win3	"win3"
// 18	tft_cafecuties_props_skin2_win4	"win4"

const PRESENTER_SCRIPT: PresenterLine[] = [
  // { text: "bow", animation: "bow", duration: 3500, buttonText: "→" },
  // { text: "celebrate", animation: "celebrate", duration: 3500, buttonText: "→" },
  // { text: "click", animation: "click", duration: 3500, buttonText: "→" },
  // { text: "defalt_idle", animation: "defalt_idle", duration: 3500, buttonText: "→" },
  // { text: "idle2", animation: "idle2", duration: 3500, buttonText: "→" },
  // { text: "idle2_in", animation: "idle2_in", duration: 3500, buttonText: "→" },
  // { text: "intro", animation: "intro", duration: 3500, buttonText: "→" },
  // { text: "intro_bow", animation: "intro_bow", duration: 3500, buttonText: "→" },
  // { text: "intro_bow_02", animation: "intro_bow_02", duration: 3500, buttonText: "→" },
  // { text: "intro_bow_03", animation: "intro_bow_03", duration: 3500, buttonText: "→" },
  // { text: "jumping", animation: "jumping", duration: 3500, buttonText: "→" },
  // { text: "sweep", animation: "sweep", duration: 3500, buttonText: "→" },
  // { text: "swerve", animation: "swerve", duration: 3500, buttonText: "→" },
  // { text: "trafficcontrol", animation: "trafficcontrol", duration: 3500, buttonText: "→" },
  // { text: "turn_idle", animation: "turn_idle", duration: 3500, buttonText: "→" },
  // { text: "win1", animation: "win1", duration: 3500, buttonText: "→" },
  // { text: "win2", animation: "win2", duration: 3500, buttonText: "→" },
  // { text: "win3", animation: "win3", duration: 3500, buttonText: "→" },
  // { text: "win4", animation: "win4", duration: 3500, buttonText: "→" },


  { text: "Regalame una noche, una noche regaaaaaaalaaaameeeeeee 🎶", animation: "sweep", duration: 5000, autoAdvance: true },
  { text: "Hey!", animation: "jumping", duration: 3000, buttonText: "!" },
  { text: "No le digas a nadie de esa cancion...", animation: "turn_idle", duration: 3000, holdLastFrame: true, buttonText: "Que cancion?" },
  { text: "Nooo!", animation: "jumping", duration: 1000, autoAdvance: true },
  { text: "Mil disculpas señorita T_T", animation: "intro_bow_02", duration: 3500, buttonText: "hehe" },
  
  { text: "Permiteme presentarme...", animation: "jumping", duration: 3500, autoAdvance: true },
  { text: "Mi nombre es '🐰 Le Bunny Bonbon' y soy Maid café presenter", animation: "idle2", duration: 3500, buttonText: "Hola!! 🐰 Le Bunny Bonbon!" },

  
  

  
  
  
  
  
  { text: "¡Hola! Bienvenida a esta experiencia especial de San Valentín...", animation: "defalt_idle", duration: 3500, buttonText: "Continuar →" },
  { text: "Antes de empezar, cuéntame... ¿cómo te llamas?", animation: "idle2", duration: 3500, buttonText: "Me llamo..." },
  { text: "Antes de empezar, cuéntame... ¿cómo te llamas?", animation: "idle2_in", duration: 3500, buttonText: "Me llamo..." },
  { text: "¡Así que vienes a por San Valentín! ¿Estás lista?", animation: "celebrate", duration: 3500, buttonText: "¡Lista!" },
  { text: "Dime... ¿estás enamorada?", animation: "click", duration: 3500, buttonText: "Quizás..." },
  { text: "¡Bueno, basta de mí! Vamos a lo que vinimos!!", animation: "win1", duration: 3500, buttonText: "¡Vamos!" },
  { text: "¡Bueno, basta de mí! Vamos a lo que vinimos!!", animation: "win2", duration: 3500, buttonText: "¡Vamos!" },
  { text: "¡Bueno, basta de mí! Vamos a lo que vinimos!!", animation: "win3", duration: 3500, buttonText: "¡Vamos!" },
  { text: "¡Bueno, basta de mí! Vamos a lo que vinimos!!", animation: "win4", duration: 3500, buttonText: "¡Vamos!" },
  { text: "Primero, elige a tu compañero para esta aventura...", animation: "trafficcontrol", duration: 3500, holdLastFrame: true },
  { text: "Primero, elige a tu compañero para esta aventura...", animation: "turn_idle", duration: 3500, holdLastFrame: true },
];

/** Determine which color turret each node gets based on incoming optionA (red) vs optionB (blue) */
function buildNodeColorMap(): Record<string, "red" | "blue" | "neutral"> {
  const map: Record<string, "red" | "blue" | "neutral"> = { start: "neutral", end: "neutral" };
  for (const q of Object.values(QUESTIONS)) {
    if (!map[q.optionA.next]) map[q.optionA.next] = "red";
    if (!map[q.optionB.next]) map[q.optionB.next] = "blue";
  }
  return map;
}
const NODE_COLOR_MAP = buildNodeColorMap();

function getNodeGlb(nodeId: string): string | null {
  if (nodeId === "start") return null; // no tower on start node
  if (nodeId === "end") return null;   // end uses NexusModel separately
  const color = NODE_COLOR_MAP[nodeId];
  if (color === "red") return TURRET_RED_GLB;
  if (color === "blue") return TURRET_BLUE_GLB;
  return TURRET_GLB;
}

interface ConnectionData {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  fromId: string;
  toId: string;
}

function getConnections(): ConnectionData[] {
  const conns: ConnectionData[] = [];
  const seen = new Set<string>();
  for (const q of Object.values(QUESTIONS)) {
    const addConn = (next: string, color: string) => {
      const n = ALL_NODES[next];
      if (!n) return;
      const key = `${q.id}->${next}`;
      if (seen.has(key)) return;
      seen.add(key);
      conns.push({ from: q.position, to: n.position, color, fromId: q.id, toId: next });
    };
    addConn(q.optionA.next, "#ff6b9d");
    addConn(q.optionB.next, "#4a6fa5");
  }
  return conns;
}

/** GLB node — static tower model, NO animations, NO rotation (perf) */
function NodeModel({ position, isActive, isEnd, glbPath, crabHere, destroyed, answered }: {
  position: [number, number, number]; isActive: boolean; isEnd: boolean;
  glbPath: string; crabHere: boolean; destroyed: boolean; answered: boolean;
}) {
  const { scene } = useGLTF(glbPath);
  const groupRef = useRef<Group>(null);

  const baseScale = isEnd ? 0.006 : 0.008;
  const defaultEmissive = glbPath === TURRET_BLUE_GLB ? "#4a6fa5" : isEnd ? "#ff4081" : "#ff6b9d";
  const cachedMats = useRef<MeshStandardMaterial[]>([]);
  const matsCollected = useRef(false);
  const currentScale = useRef(baseScale);
  const currentOpacity = useRef(1);
  const scaleTarget = useRef(baseScale);
  const targetOpacity = useRef(1);
  const targetEmissiveColor = useRef(new Color(defaultEmissive));
  const targetEmissiveIntensity = useRef(isEnd ? 1.0 : 0.6);

  useEffect(() => {
    if (answered) {
      targetOpacity.current = 0;
      targetEmissiveColor.current.setStyle("#111111");
      targetEmissiveIntensity.current = 0;
      scaleTarget.current = baseScale * 0.5;
    } else if (destroyed) {
      targetOpacity.current = 0.3;
      targetEmissiveColor.current.setStyle("#111111");
      targetEmissiveIntensity.current = 0.05;
      scaleTarget.current = baseScale * 0.8;
    } else if (crabHere) {
      targetOpacity.current = 0.6;
      targetEmissiveColor.current.setStyle("#1a1a2e");
      targetEmissiveIntensity.current = 0.15;
      scaleTarget.current = baseScale;
    } else if (isActive) {
      targetOpacity.current = 0.85;
      scaleTarget.current = baseScale * 1.5;
      targetEmissiveColor.current.setStyle("#ffffff");
      targetEmissiveIntensity.current = 2.0;
    } else {
      targetOpacity.current = 0.7;
      scaleTarget.current = baseScale;
      targetEmissiveColor.current.setStyle(defaultEmissive);
      targetEmissiveIntensity.current = isEnd ? 1.0 : 0.6;
    }
  }, [isActive, isEnd, baseScale, crabHere, destroyed, answered, defaultEmissive]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const spd = 3.0 * delta;

    currentScale.current += (scaleTarget.current - currentScale.current) * Math.min(spd, 1);
    groupRef.current.scale.setScalar(currentScale.current);

    currentOpacity.current += (targetOpacity.current - currentOpacity.current) * Math.min(spd, 1);

    // Collect materials once
    if (!matsCollected.current) {
      const mats: MeshStandardMaterial[] = [];
      groupRef.current.traverse((o) => {
        if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
          const mat = o.material;
          mat.transparent = true;
          mat.depthWrite = true;   // Write depth so towers occlude the crab behind them
          mat.envMapIntensity = 2.0;
          mat.metalness = Math.min(mat.metalness, 0.6);
          mat.roughness = Math.max(mat.roughness, 0.3);
          mat.emissive = new Color(defaultEmissive);
          mat.emissiveIntensity = 0.6;
          mat.userData._nodeManaged = true;
          mats.push(mat);
        }
      });
      if (mats.length > 0) {
        cachedMats.current = mats;
        matsCollected.current = true;
      }
    }

    // Apply hidden tower meshes from debug panel
    const hidden = getHiddenTowerMeshes();
    if (hidden.size > 0) {
      groupRef.current.traverse((o) => {
        if (o.name && hidden.has(o.name)) o.visible = false;
        else if (o.name) o.visible = true;
      });
    }

    for (const mat of cachedMats.current) {
      mat.opacity = currentOpacity.current;
      mat.emissiveIntensity += (targetEmissiveIntensity.current - mat.emissiveIntensity) * Math.min(spd, 1);
      mat.emissive.lerp(targetEmissiveColor.current, Math.min(spd, 1));
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Clone object={scene} deep />
    </group>
  );
}

/** Nexus model for end node — plays idle animation */
function NexusModel({ position, isActive }: { position: [number, number, number]; isActive: boolean }) {
  const { scene, animations } = useGLTF(NEXUS_GLB);
  const groupRef = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, groupRef);
  const started = useRef(false);

  useEffect(() => {
    scene.scale.setScalar(0.025);
  }, [scene]);

  // Play first idle-like animation
  useEffect(() => {
    if (started.current || names.length === 0) return;
    started.current = true;
    const idleName = names.find((n) => /idle/i.test(n)) ?? names[0];
    if (idleName && actions[idleName]) {
      actions[idleName]!.reset().play();
      actions[idleName]!.setLoop(2201, Infinity);
    }
    return () => {
      started.current = false;
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [actions, names]);

  // Material setup (once)
  const matsSetup = useRef(false);
  useEffect(() => {
    if (matsSetup.current) return;
    scene.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.transparent = true;
        o.material.envMapIntensity = 2.0;
        o.material.emissive = new Color("#ff4081");
        o.material.emissiveIntensity = isActive ? 1.5 : 0.6;
        o.material.userData._nodeManaged = true;
      }
    });
    matsSetup.current = true;
  }, [scene, isActive]);

  return (
    <group ref={groupRef} position={position}>
      <primitive object={scene} />
    </group>
  );
}

/** Loot Goblin — fades in with Spawn animation when node is answered */
function LootGoblinModel({ position, show }: { position: [number, number, number]; show: boolean }) {
  const { scene, animations } = useGLTF(LOOT_GOBLIN_GLB);
  const groupRef = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, groupRef);
  const spawnPlayed = useRef(false);
  const cachedMats = useRef<MeshStandardMaterial[]>([]);
  const matsCollected = useRef(false);
  const currentOpacity = useRef(0);

  // Play Spawn animation once when show becomes true
  useEffect(() => {
    if (!show || spawnPlayed.current || names.length === 0) return;
    spawnPlayed.current = true;
    const spawnName = names.find((n) => /spawn/i.test(n)) ?? names[0];
    if (spawnName && actions[spawnName]) {
      const anim = actions[spawnName]!;
      anim.reset().play();
      anim.clampWhenFinished = true;
      anim.setLoop(2200, 1);
    }
  }, [show, names, actions]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetOp = show ? 1 : 0;
    currentOpacity.current += (targetOp - currentOpacity.current) * Math.min(3 * delta, 1);
    // Hide completely when invisible
    groupRef.current.visible = currentOpacity.current > 0.01;

    if (!matsCollected.current) {
      const mats: MeshStandardMaterial[] = [];
      groupRef.current.traverse((o) => {
        if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
          o.material.transparent = true;
          o.material.envMapIntensity = 2.0;
          o.material.emissive = new Color("#ff6b9d");
          o.material.emissiveIntensity = 0.8;
          o.material.userData._nodeManaged = true;
          mats.push(o.material);
        }
      });
      if (mats.length > 0) { cachedMats.current = mats; matsCollected.current = true; }
    }

    for (const mat of cachedMats.current) mat.opacity = currentOpacity.current;
  });

  return (
    <group ref={groupRef} position={position} scale={0.004} visible={false}>
      <Clone object={scene} deep />
    </group>
  );
}

/** How far (world units) the crab stops before / starts past a tower node.
 *  This prevents the crab from overlapping the tower model — it "enters"
 *  from behind and "exits" in front, like walking around the structure. */
const NODE_APPROACH_OFFSET = 2.2;

/** Scuttle Crab companion — walks from node to node with idle/run animations.
 *  Orientation follows the curve tangent in full 3D (roller-coaster style):
 *  the crab pitches up on ascents, pitches down on descents, and always
 *  faces along the direction of travel. */
function ScuttleCrabCompanion({ activeNodeId, onNodeReached, glbPath }: { activeNodeId: string; onNodeReached: (nodeId: string) => void; glbPath: string }) {
  const { scene, animations } = useGLTF(glbPath);
  const groupRef = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, groupRef);
  const startNodePos = ALL_NODES["start"]?.position ?? [0, -3, 0];
  const currentPos = useRef(new Vector3(...startNodePos));
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const lastNodeIdRef = useRef("start");
  const actionsRef = useRef(actions);
  const namesRef = useRef(names);
  const onNodeReachedRef = useRef(onNodeReached);
  actionsRef.current = actions;
  namesRef.current = names;
  onNodeReachedRef.current = onNodeReached;

  // ── Orientation: when moving → lookAt along tangent; when stopped → slerp to level ──
  const isMovingRef = useRef(false);
  const idleQuatTarget = useRef(new Quaternion());

  // ── Opacity system ──
  const crabOpacity = useRef(1);
  const applyCrabOpacity = useCallback((op: number) => {
    crabOpacity.current = op;
    scene.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.opacity = op;
      }
    });
  }, [scene]);

  // Scale + default rotation (model faces backward, PI flips it so lookAt works)
  useEffect(() => {
    scene.scale.setScalar(0.006);
    scene.rotation.y = Math.PI;
  }, [scene]);

  // Material setup
  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        if (!o.material.userData._crabSetup) {
          o.material = o.material.clone();
          o.material.userData._crabSetup = true;
        }
        o.material.transparent = true;
        o.material.depthTest = true;
        o.material.envMapIntensity = 3.0;
        o.material.emissive = new Color("#ffa0c0");
        o.material.emissiveIntensity = 1.2;
        o.material.userData._nodeManaged = true;
        o.renderOrder = 100;
      }
    });
  }, [scene]);

  // Play idle when animations ready
  const idleStarted = useRef(false);
  useEffect(() => {
    if (names.length === 0 || idleStarted.current) return;
    idleStarted.current = true;
    const idleName = names.find((n) => /idle|stand/i.test(n));
    if (idleName && actions[idleName]) {
      actions[idleName]!.reset().play();
      actions[idleName]!.setLoop(2201, Infinity);
    }
    return () => {
      idleStarted.current = false;
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [names, actions]);

  // Set initial position
  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(...startNodePos);
  }, [startNodePos]);

  // ── Helper: orient the group so its -Z faces `lookPoint` (full 3D, roller-coaster) ──
  const orientAlongCurve = useCallback((grp: Group, curvePoint: Vector3, tangent: Vector3) => {
    // lookAt a point slightly ahead along the tangent
    const lookTarget = curvePoint.clone().add(tangent);
    grp.lookAt(lookTarget);
  }, []);

  // ── Move to active node ──────────────────────────────────────
  useEffect(() => {
    const node = ALL_NODES[activeNodeId];
    if (!node || !groupRef.current) return;

    const targetPos = new Vector3(...node.position);
    const startPos = currentPos.current.clone();
    const dist = startPos.distanceTo(targetPos);

    if (timelineRef.current) timelineRef.current.kill();

    const acts = actionsRef.current;
    const nms = namesRef.current;
    const idleName = nms.find((n) => /idle|stand/i.test(n));
    const runName = nms.find((n) => /run|walk/i.test(n));

    // Restart / already there → teleport + idle
    if (activeNodeId === "start" || dist < 0.1) {
      groupRef.current.position.copy(targetPos);
      groupRef.current.quaternion.identity(); // level orientation
      currentPos.current.copy(targetPos);
      lastNodeIdRef.current = activeNodeId;
      isMovingRef.current = false;
      applyCrabOpacity(1);
      onNodeReachedRef.current(activeNodeId);
      if (idleName && acts[idleName]) {
        Object.values(acts).forEach((a) => a?.fadeOut(0.3));
        acts[idleName]!.reset().fadeIn(0.3).play();
        acts[idleName]!.setLoop(2201, Infinity);
      }
      return;
    }

    onNodeReachedRef.current("");

    // Build curved path
    const fromArr: [number, number, number] = [startPos.x, startPos.y, startPos.z];
    const toArr: [number, number, number] = [targetPos.x, targetPos.y, targetPos.z];
    const curve = buildConnectionCurve(fromArr, toArr);
    const curveLength = curve.getLength();

    // ── Curve trimming ──
    const hasDepartureTower = lastNodeIdRef.current !== "start";
    const startT = hasDepartureTower
      ? Math.min(NODE_APPROACH_OFFSET / curveLength, 0.18)
      : 0;
    const arrivalOffset = activeNodeId === "end"
      ? NODE_APPROACH_OFFSET * 0.5
      : NODE_APPROACH_OFFSET;
    const endT = 1 - Math.min(arrivalOffset / curveLength, 0.18);

    const initialPos = curve.getPointAt(startT);
    const initialTangent = curve.getTangentAt(startT);

    const speed = 4;
    const travelDuration = Math.max((curveLength * (endT - startT)) / speed, 1.5);

    // ── GSAP timeline ──
    const tl = gsap.timeline();
    timelineRef.current = tl;
    const FADE_DUR = 0.45;
    const opObj = { v: crabOpacity.current };

    // Phase 1: Fade-out at the old position
    if (hasDepartureTower) {
      tl.to(opObj, {
        v: 0,
        duration: FADE_DUR,
        ease: "power2.in",
        onUpdate: () => applyCrabOpacity(opObj.v),
        onComplete: () => applyCrabOpacity(0),
      });
    }

    // Phase 2: Teleport (invisible) to departure position + orient along curve
    tl.call(() => {
      if (!groupRef.current) return;
      applyCrabOpacity(0);
      groupRef.current.position.copy(initialPos);
      orientAlongCurve(groupRef.current, initialPos, initialTangent);
      isMovingRef.current = true;
      if (runName && acts[runName]) {
        Object.values(acts).forEach((a) => a?.fadeOut(0.2));
        acts[runName]!.reset().fadeIn(0.2).play();
        acts[runName]!.setLoop(2201, Infinity);
      }
    });

    // Phase 3: Fade-in at the new departure position
    if (hasDepartureTower) {
      tl.to(opObj, {
        v: 1,
        duration: FADE_DUR,
        ease: "power2.out",
        onUpdate: () => applyCrabOpacity(opObj.v),
        onComplete: () => applyCrabOpacity(1),
      });
    }

    // Phase 4: Run along the curve — full 3D orientation via lookAt
    const prog = { t: startT };
    tl.to(prog, {
      t: endT,
      duration: travelDuration,
      ease: "none",
      onUpdate: () => {
        if (!groupRef.current) return;
        const p = curve.getPointAt(prog.t);
        groupRef.current.position.copy(p);

        // Full 3D roller-coaster orientation: look along curve tangent
        const tangent = curve.getTangentAt(prog.t);
        orientAlongCurve(groupRef.current, p, tangent);
      },
      onComplete: () => {
        if (!groupRef.current) return;
        const finalPos = curve.getPointAt(endT);
        groupRef.current.position.copy(finalPos);
        currentPos.current.copy(targetPos);
        lastNodeIdRef.current = activeNodeId;

        // Compute idle quaternion: keep the current yaw but remove pitch/roll
        const e = new Euler().setFromQuaternion(groupRef.current.quaternion, "YXZ");
        idleQuatTarget.current.setFromEuler(new Euler(0, e.y, 0));
        isMovingRef.current = false;

        applyCrabOpacity(1);
        onNodeReachedRef.current(activeNodeId);
        if (idleName && acts[idleName]) {
          Object.values(acts).forEach((a) => a?.fadeOut(0.3));
          acts[idleName]!.reset().fadeIn(0.3).play();
          acts[idleName]!.setLoop(2201, Infinity);
        }
      },
    });

    return () => {
      if (timelineRef.current) timelineRef.current.kill();
    };
  }, [activeNodeId, applyCrabOpacity, orientAlongCurve]);

  // When stopped: smoothly slerp from tilted arrival orientation → level idle pose
  useFrame((_, delta) => {
    if (!groupRef.current || isMovingRef.current) return;
    groupRef.current.quaternion.slerp(idleQuatTarget.current, Math.min(5 * delta, 1));
  });

  return (
    <group ref={groupRef}>
      {/* Tiny Y lift so the crab rides right on the tube, not clipping through */}
      <group position={[0, 0.08, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

/** Deterministic pseudo-random from two positions (for consistent curves) */
function seedFromPositions(a: [number, number, number], b: [number, number, number]): number {
  const v = a[0] * 73856093 + a[1] * 19349663 + a[2] * 83492791 + b[0] * 48611 + b[1] * 97813 + b[2] * 65537;
  return ((Math.sin(v) * 43758.5453) % 1 + 1) % 1; // 0-1
}

/** Build a CatmullRomCurve3 between two points (deterministic, reusable for crab path) */
function buildConnectionCurve(from: [number, number, number], to: [number, number, number]): CatmullRomCurve3 {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const mid = start.clone().lerp(end, 0.5);
  const seed = seedFromPositions(from, to);
  const seed2 = seedFromPositions(to, from);
  mid.y += (seed - 0.5) * 2;
  mid.x += (seed2 - 0.5) * 1;
  return new CatmullRomCurve3([start, mid, end]);
}

/** Connection tube — starts dark, lights up with path color when traversed */
function ConnectionTube({ from, to, color, traversed }: { from: [number, number, number]; to: [number, number, number]; color: string; traversed: boolean }) {
  const meshRef = useRef<Mesh>(null);
  const geo = useMemo(() => {
    const curve = buildConnectionCurve(from, to);
    return new TubeGeometry(curve, 20, 0.04, 6, false);
  }, [from, to]);

  const targetColor = useRef(new Color("#111111"));
  const targetOpacity = useRef(0.35);

  useEffect(() => {
    if (traversed) {
      targetColor.current.setStyle(color);
      targetOpacity.current = 0.55;
    } else {
      targetColor.current.setStyle("#111111");
      targetOpacity.current = 0.35;
    }
  }, [traversed, color]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as MeshBasicMaterial;
    mat.color.lerp(targetColor.current, Math.min(3 * delta, 1));
    mat.opacity += (targetOpacity.current - mat.opacity) * Math.min(3 * delta, 1);
  });

  return (
    <mesh ref={meshRef} geometry={geo}>
      <meshBasicMaterial color="#111111" transparent opacity={0.35} toneMapped={false} />
    </mesh>
  );
}

/** Floating particles */
function BackgroundParticles({ count = 300 }: { count?: number }) {
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100 - 30;
      const c = new Color().setHSL(0.95 + Math.random() * 0.1, 0.5, 0.3 + Math.random() * 0.25);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      sizes[i] = 0.05 + Math.random() * 0.12;
    }
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    g.setAttribute("aSize", new Float32BufferAttribute(sizes, 1));
    return g;
  }, [count]);

  const mat = useMemo(() => new ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aSize;
      varying vec3 vColor;
      uniform float uTime;
      void main() {
        vColor = color;
        vec3 p = position;
        p.y += sin(uTime * 0.3 + position.x * 0.5) * 0.4;
        p.x += cos(uTime * 0.2 + position.z * 0.3) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * 120.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.1, d);
        gl_FragColor = vec4(vColor, a * 0.6);
      }
    `,
    transparent: true, depthWrite: false, vertexColors: true,
  }), []);

  useFrame((state) => { mat.uniforms.uTime.value = state.clock.elapsedTime; });

  return <points geometry={geo} material={mat} />;
}

/** Pulse rings — color follows winning side */
function PulseRings({ position, winningColor }: { position: [number, number, number]; winningColor: string }) {
  const ringsRef = useRef<Mesh[]>([]);
  const targetCol = useRef(new Color(winningColor));

  useEffect(() => {
    targetCol.current.setStyle(winningColor);
  }, [winningColor]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    ringsRef.current.forEach((ring, i) => {
      if (!ring) return;
      const phase = ((t * 0.5 + i * 0.33) % 1);
      ring.scale.setScalar(0.5 + phase * 3);
      const mat = ring.material as MeshBasicMaterial;
      mat.opacity = (1 - phase) * 0.3;
      mat.color.lerp(targetCol.current, Math.min(4 * delta, 1));
    });
  });

  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => { if (el) ringsRef.current[i] = el; }} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 0.85, 32]} />
          <meshBasicMaterial color={winningColor} transparent opacity={0.3} side={2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Ashe model — handles its own animation phases */
// ——————————————————————————————————————————————
//  Card-embedded 3D scenes (rendered inside modal Canvas)
// ——————————————————————————————————————————————

/** Suelo negro reflectivo para las escenas de los modals */
function ReflectiveFloor({ yPos }: { yPos: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yPos, 0]}>
      <planeGeometry args={[150, 150]} />
      <MeshReflectorMaterial
        resolution={2048}
        mixBlur={1}
        mixStrength={80}              // Ajusta entre 40-80
        roughness={2}
        depthScale={0.2}
        minDepthThreshold={0.1}
        maxDepthThreshold={2.4}
        color="#404030"
        metalness={1}
        mirror={1}
      />
    </mesh>
  );
}

/** Ashe scene for the "Together" card — Spell2 / Idle alternation */
function CardAsheScene() {
  const { scene, animations } = useGLTF(ASHE_GLB);
  const groupRef = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, groupRef);
  const phaseRef = useRef<"spell" | "stopped">("stopped");

  useEffect(() => { scene.scale.setScalar(0.028); }, [scene]);

  // Material setup (idempotent)
  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        if (!o.material.userData._cardSetup) {
          o.material = o.material.clone();
          o.material.userData._cardSetup = true;
        }
        o.material.envMapIntensity = 2.0;
        o.material.metalness = Math.min(o.material.metalness, 0.4);
        o.material.roughness = Math.max(o.material.roughness, 0.35);
        o.material.transparent = false;
        o.material.opacity = 1;
      }
    });
  }, [scene]);

  // Alternate Spell2 ↔ random Idle
  useEffect(() => {
    if (!actions || names.length === 0) return;
    phaseRef.current = "spell";

    const spellAction = actions["Spell2"];
    const idleNames = names.filter((n) => /idle/i.test(n));

    if (!spellAction) {
      if (idleNames.length > 0) { actions[idleNames[0]]?.reset().play(); }
      return;
    }

    let isSpell = true;
    let tid: ReturnType<typeof setTimeout>;

    const playNext = () => {
      if (phaseRef.current !== "spell") return;
      Object.values(actions).forEach((a) => a?.fadeOut(0.5));
      if (isSpell) {
        spellAction.reset().fadeIn(0.5).play();
        spellAction.clampWhenFinished = true;
        spellAction.setLoop(2200, 1);
        const dur = spellAction.getClip().duration * 1000;
        tid = setTimeout(() => { isSpell = false; playNext(); }, dur + 200);
      } else {
        const randomIdle = idleNames[Math.floor(Math.random() * idleNames.length)];
        const idleA = actions[randomIdle];
        if (idleA) { idleA.reset().fadeIn(0.5).play(); idleA.setLoop(2201, Infinity); }
        tid = setTimeout(() => { isSpell = true; playNext(); }, 4000);
      }
    };

    playNext();
    return () => { phaseRef.current = "stopped"; clearTimeout(tid); };
  }, [actions, names]);

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 5, 3]} intensity={3} color="#ffffff" />
      <pointLight position={[-3, 1, 3]} intensity={18} color="#ff6b9d" distance={20} />
      <pointLight position={[3, 1, 3]} intensity={18} color="#ff3366" distance={20} />
      <group ref={groupRef} position={[0, -3, -1]}>
        <primitive object={scene} />
      </group>
      <ReflectiveFloor yPos={-3} />
    </>
  );
}

/** Blue Sentinel scene for the "Alone" card */
function CardBlueSentinelScene() {
  const { scene, animations } = useGLTF(BLUE_SENTINEL_GLB);
  const groupRef = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, groupRef);

  useEffect(() => { scene.scale.setScalar(0.016); }, [scene]);

  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        if (!o.material.userData._cardSetup) {
          o.material = o.material.clone();
          o.material.userData._cardSetup = true;
        }
        o.material.envMapIntensity = 2.0;
        o.material.metalness = Math.min(o.material.metalness, 0.5);
        o.material.roughness = Math.max(o.material.roughness, 0.3);
        o.material.transparent = false;
        o.material.opacity = 1;
      }
    });
  }, [scene]);

  // Intro: Spawn una vez, luego Run en loop
  const started = useRef(false);
  const actionsReady = names.length > 0 && Object.keys(actions).length > 0;

  useEffect(() => {
    if (!actionsReady || started.current) return;
    started.current = true;

    const spawnName = names.find((n) => /spawn/i.test(n));
    const runName = names.find((n) => /run/i.test(n));

    // Detener todo primero
    Object.values(actions).forEach((a) => a?.stop());

    let tid: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    if (spawnName && actions[spawnName]) {
      const spawn = actions[spawnName]!;
      spawn.reset().play();
      spawn.clampWhenFinished = true;
      spawn.setLoop(2200, 1);

      const dur = spawn.getClip().duration * 1000;
      tid = setTimeout(() => {
        if (cancelled) return;
        spawn.fadeOut(0.5);
        if (runName && actions[runName]) {
          actions[runName]!.reset().fadeIn(0.5).play();
          actions[runName]!.setLoop(2201, Infinity);
        }
      }, dur);
    } else if (runName && actions[runName]) {
      actions[runName]!.reset().play();
      actions[runName]!.setLoop(2201, Infinity);
    }

    return () => {
      cancelled = true;
      if (tid) clearTimeout(tid);
      Object.values(actions).forEach((a) => a?.stop());
      started.current = false;
    };
  }, [actionsReady, actions, names]);

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 5, 3]} intensity={3} color="#ffffff" />
      <pointLight position={[-3, 1, 3]} intensity={18} color="#4fc3f7" distance={20} />
      <pointLight position={[3, 1, 3]} intensity={18} color="#2196f3" distance={20} />
      <group ref={groupRef} position={[0, -2.4, 0]}>
        <primitive object={scene} />
      </group>
      <ReflectiveFloor yPos={-2.4} />
      
    </>
  );
}

/** Smooth fade for neural network group */
function NeuralNetworkFade({ visible, children }: { visible: boolean; children: ReactNode }) {
  const groupRef = useRef<Group>(null);
  const opacityRef = useRef(1);
  const targetOpacity = visible ? 1 : 0;

  // When visibility restores, snap opacity back immediately
  useEffect(() => {
    if (visible) {
      opacityRef.current = 1;
      if (!groupRef.current) return;
      groupRef.current.visible = true;
      groupRef.current.traverse((o) => {
        if (o instanceof Mesh) {
          const mat = o.material as MeshBasicMaterial;
          if (mat && mat.opacity !== undefined && !mat.userData._nodeManaged) {
            mat.transparent = true;
            mat.opacity = mat.userData.baseOpacity ?? 1;
          }
        }
      });
    }
  }, [visible]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const diff = targetOpacity - opacityRef.current;
    // Skip traversal when opacity is already at target (within epsilon)
    if (Math.abs(diff) < 0.001) {
      if (opacityRef.current < 0.01 && !visible) groupRef.current.visible = false;
      return;
    }
    const speed = 1.5 * delta;
    opacityRef.current += diff * Math.min(speed, 1);

    // Fade all materials (skip node-managed ones)
    groupRef.current.traverse((o) => {
      if (o instanceof Mesh) {
        const mat = o.material as MeshBasicMaterial;
        if (mat && mat.opacity !== undefined && !mat.userData._nodeManaged) {
          mat.transparent = true;
          mat.opacity = mat.userData.baseOpacity !== undefined
            ? mat.userData.baseOpacity * opacityRef.current
            : opacityRef.current;
        }
      }
    });

    // Hide group when fully faded (but don't unmount)
    if (opacityRef.current < 0.01 && !visible) {
      groupRef.current.visible = false;
    }
  });

  // Store base opacity on first render
  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.traverse((o) => {
      if (o instanceof Mesh) {
        const mat = o.material as MeshBasicMaterial;
        if (mat && mat.opacity !== undefined && !mat.userData._nodeManaged && mat.userData.baseOpacity === undefined) {
          mat.userData.baseOpacity = mat.opacity;
        }
      }
    });
  }, []);

  return <group ref={groupRef}>{children}</group>;
}

/** Neural network scene */
function NeuralNetworkScene({
  activeNodeId,
  onArrived,
  showAshe,
  traversedEdges,
  destroyedNodes,
  answeredNodes,
  togetherScore,
  step,
  crabGlb,
}: {
  activeNodeId: string;
  onArrived: () => void;
  showAshe: boolean;
  traversedEdges: Map<string, string>;
  destroyedNodes: Set<string>;
  answeredNodes: Map<string, string>;
  togetherScore: number;
  step: number;
  crabGlb: string;
}) {
  const { camera } = useThree();
  const connections = useMemo(() => getConnections(), []);
  const arrivedAtNodeRef = useRef<string | null>(null);
  const prevNodeRef = useRef(activeNodeId);
  const lookAtRef = useRef(new Vector3(0, 0, 0));
  const onArrivedRef = useRef(onArrived);
  onArrivedRef.current = onArrived;
  const [crabAtNode, setCrabAtNode] = useState<string>("start");
  const handleCrabNodeReached = useCallback((nodeId: string) => setCrabAtNode(nodeId), []);

  // Stable ref objects for each node group (used by Outline selection — avoids Selection/Select re-render loop)
  const nodeOutlineRefs = useMemo(() => {
    const refs: Record<string, { current: Group | null }> = {};
    for (const nodeId of Object.keys(ALL_NODES)) {
      refs[nodeId] = { current: null };
    }
    return refs;
  }, []);

  // Build the selection array: the actual Object3D for the node where the crab sits
  const outlineSelection = useMemo(() => {
    if (!crabAtNode || crabAtNode === "start") return [];
    const ref = nodeOutlineRefs[crabAtNode];
    return ref?.current ? [ref.current] : [];
  }, [crabAtNode, nodeOutlineRefs]);

  useEffect(() => {
    const startNode = ALL_NODES["start"];
    if (startNode) lookAtRef.current.set(...startNode.position);
  }, []);

  useEffect(() => {
    const node = ALL_NODES[activeNodeId];
    if (!node) return;
    arrivedAtNodeRef.current = null;

    const newTarget = new Vector3(...node.position);
    const isInitial = prevNodeRef.current === activeNodeId;
    const isEndNode = activeNodeId === "end";

    const isStart = activeNodeId === "start";
    const camOffset = isEndNode
      ? new Vector3(0, 3.5, 10)
      : isStart
        ? new Vector3(0, 4, 6)
        : new Vector3(0, 1.5, 6);
    const camTarget = newTarget.clone().add(camOffset);

    const startPos = camera.position.clone();
    const startLookAt = lookAtRef.current.clone();

    if (isInitial) {
      camera.position.copy(camTarget);
      lookAtRef.current.copy(newTarget);
      camera.lookAt(newTarget);
      arrivedAtNodeRef.current = activeNodeId;
      onArrivedRef.current();
      prevNodeRef.current = activeNodeId;
      return;
    }

    const mid1 = startPos.clone().lerp(camTarget, 0.33);
    const mid2 = startPos.clone().lerp(camTarget, 0.66);
    const curveStrength = isEndNode ? 6 : 2;
    mid1.y += curveStrength * 0.5;
    mid1.x += (Math.random() - 0.5) * curveStrength * 0.3;
    mid2.y += curveStrength * 0.3;
    mid2.x -= (Math.random() - 0.5) * curveStrength * 0.3;

    const camCurve = new CatmullRomCurve3([startPos, mid1, mid2, camTarget]);
    const duration = isEndNode ? 3.5 : 2.4;

    const prog = { t: 0 };
    const tween = gsap.to(prog, {
      t: 1,
      duration,
      ease: isEndNode ? "power3.inOut" : "power2.inOut",
      onUpdate: () => {
        const t = prog.t;
        const p = camCurve.getPointAt(t);
        camera.position.copy(p);
        lookAtRef.current.lerpVectors(startLookAt, newTarget, t);
        camera.lookAt(lookAtRef.current);
      },
      onComplete: () => {
        camera.position.copy(camTarget);
        lookAtRef.current.copy(newTarget);
        camera.lookAt(newTarget);
        arrivedAtNodeRef.current = activeNodeId;
        onArrivedRef.current();
      },
    });

    prevNodeRef.current = activeNodeId;
    return () => { tween.kill(); };
  }, [activeNodeId, camera]);

  useFrame(() => {
    if (arrivedAtNodeRef.current !== activeNodeId) return;
    const node = ALL_NODES[activeNodeId];
    if (!node) return;
    camera.lookAt(new Vector3(...node.position));
  });

  const activeNode = ALL_NODES[activeNodeId];

  // Determine pulse ring color based on who's winning
  const winningColor = useMemo(() => {
    if (step === 0) return "rgba(255,255,255,0.7)";
    const aloneScore = step - togetherScore;
    if (togetherScore > aloneScore) return "#ff6b9d";
    if (aloneScore > togetherScore) return "#4a6fa5";
    return "#b070d0"; // tied — purple mix
  }, [togetherScore, step]);

  // Outline color follows winning side
  const outlineColor = useMemo(() => {
    if (step === 0) return 0xffffff;
    const aloneScore = step - togetherScore;
    if (togetherScore > aloneScore) return 0xff6b9d;
    if (aloneScore > togetherScore) return 0x4a6fa5;
    return 0xb070d0;
  }, [togetherScore, step]);

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 15, 80]} />
      <Environment preset="city" />
      <ambientLight intensity={0.3} color="#ff6b9d" />
      <pointLight position={[0, 10, 5]} intensity={20} color="#ff6b9d" distance={50} />
      <pointLight position={[-10, -5, -20]} intensity={12} color="#ff3366" distance={50} />

      {/* Neural network elements — fade out at the end */}
      <NeuralNetworkFade visible={!showAshe}>
        <BackgroundParticles />
        {connections.map((c, i) => {
          const edgeKey = `${c.fromId}->${c.toId}`;
          const chosenColor = traversedEdges.get(edgeKey);
          return (
            <ConnectionTube
              key={i}
              from={c.from}
              to={c.to}
              color={chosenColor ?? c.color}
              traversed={!!chosenColor}
            />
          );
        })}
        {Object.values(ALL_NODES).map((node) => {
          const glb = getNodeGlb(node.id);
          if (!glb) return null; // skip start & end nodes
          const isAnswered = answeredNodes.has(node.id);
          return (
            <group key={node.id} ref={nodeOutlineRefs[node.id]}>
              <NodeModel
                position={node.position}
                isActive={node.id === activeNodeId}
                isEnd={false}
                glbPath={glb}
                crabHere={crabAtNode === node.id}
                destroyed={destroyedNodes.has(node.id)}
                answered={isAnswered}
              />
              <LootGoblinModel position={node.position} show={isAnswered} />
            </group>
          );
        })}
        {/* End node — Nexus model */}
        {ALL_NODES["end"] && (
          <group ref={nodeOutlineRefs["end"]}>
            <NexusModel position={ALL_NODES["end"].position} isActive={activeNodeId === "end"} />
          </group>
        )}
        {activeNode && <PulseRings position={activeNode.position} winningColor={winningColor} />}
        <ScuttleCrabCompanion activeNodeId={activeNodeId} onNodeReached={handleCrabNodeReached} glbPath={crabGlb} />
      </NeuralNetworkFade>

      {/* Post-processing: PlayStation-style selection outline (ref-based, no Selection/Select context) */}
      <EffectComposer autoClear={false}>
        <Outline
          selection={outlineSelection}
          blendFunction={BlendFunction.SCREEN}
          visibleEdgeColor={outlineColor}
          hiddenEdgeColor={outlineColor}
          edgeStrength={10}
          pulseSpeed={0.4}
          blur
          kernelSize={KernelSize.MEDIUM}
          xRay
        />
      </EffectComposer>
    </>
  );
}

// ——————————————————————————————————————————————
//  UI: Question overlay
// ——————————————————————————————————————————————

function QuestionOverlay({
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
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
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
          {/* Step indicator — colored by decision */}
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
}

// ——————————————————————————————————————————————
//  UI: Minimap — bird's-eye view of node network
// ——————————————————————————————————————————————

const MINIMAP_SIZE = 360;
const MINIMAP_PAD = 26;

/** Convert 3D node position (X, Z) to 2D minimap coords */
function toMinimap(pos: [number, number, number]): { x: number; y: number } {
  // Node X range: -14 to 12, Z range: 0 to -60
  const minX = -16, maxX = 14, minZ = -64, maxZ = 4;
  const x = ((pos[0] - minX) / (maxX - minX)) * (MINIMAP_SIZE - MINIMAP_PAD * 2) + MINIMAP_PAD;
  const y = ((pos[2] - maxZ) / (minZ - maxZ)) * (MINIMAP_SIZE - MINIMAP_PAD * 2) + MINIMAP_PAD;
  return { x, y };
}

function Minimap({
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
  const connections = useMemo(() => getConnections(), []);

  // Crab position interpolates smoothly
  const crabNode = ALL_NODES[crabNodeId] ?? ALL_NODES["start"];
  const crabPos = crabNode ? toMinimap(crabNode.position) : { x: 0, y: 0 };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      style={{
        position: "absolute",
        top: 50,
        right: 50,
        width: MINIMAP_SIZE,
        height: MINIMAP_SIZE,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(10px)",
        border: `1px solid ${winningColor}30`,
        borderRadius: 12,
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
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {connections.map((c, i) => {
          const from = toMinimap(c.from);
          const to = toMinimap(c.to);
          const edgeKey = `${c.fromId}->${c.toId}`;
          const chosenColor = traversedEdges.get(edgeKey);
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={chosenColor ?? "#111111"}
              strokeOpacity={chosenColor ? 0.7 : 0.3}
              strokeWidth={chosenColor ? 1.5 : 1.2}
              style={{ transition: "stroke 0.8s, stroke-opacity 0.8s" }}
            />
          );
        })}
      </svg>

      {/* Node dots */}
      {Object.values(ALL_NODES).map((node) => {
        const pos = toMinimap(node.position);
        const isActive = node.id === activeNodeId;
        const answeredColor = answeredNodes.get(node.id);
        const isEnd = node.id === "end";
        const dotSize = isEnd ? 28 : 18;
        // Determine dot color: answered → decision color, active → white, default → dark
        const dotBg = answeredColor
          ? answeredColor
          : isActive
            ? "#ffffff"
            : "rgba(17, 17, 17, 0.55)";
        const dotShadow = isActive
          ? `0 0 6px ${winningColor}99`
          : answeredColor
            ? `0 0 4px ${answeredColor}88`
            : "none";
        return (
          <div key={node.id} style={{ position: "absolute", left: pos.x - dotSize / 2, top: pos.y - dotSize / 2, width: dotSize, height: dotSize }}>
            {/* Pulse ring on active node */}
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  inset: -4,
                  borderRadius: "50%",
                  border: `1.5px solid ${winningColor}`,
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
        animate={{ x: crabPos.x - 18, y: crabPos.y - 18 }}
        transition={{ duration: 2, ease: "linear" }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 36,
          height: 36,
          objectFit: "contain",
          filter: `drop-shadow(0 0 12px ${winningColor}cc)`,
        }}
      />

      {/* Label */}
      <div style={{
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
      </div>
    </motion.div>
  );
}

// ——————————————————————————————————————————————
//  Debug: Animation panel — press D to toggle
// ——————————————————————————————————————————————

function AnimDebugPanel() {
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

// ——————————————————————————————————————————————
//  Debug: Tower mesh toggle panel — press T to open
// ——————————————————————————————————————————————

/** Global set of hidden mesh names — shared across all tower instances */
const _hiddenTowerMeshes = new Set<string>(["mesh_0_4"]);
const _towerMeshListeners: Array<() => void> = [];
function getHiddenTowerMeshes() { return _hiddenTowerMeshes; }
function toggleTowerMesh(name: string) {
  if (_hiddenTowerMeshes.has(name)) _hiddenTowerMeshes.delete(name);
  else _hiddenTowerMeshes.add(name);
  _towerMeshListeners.forEach((fn) => fn());
}
function useTowerMeshUpdates() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    _towerMeshListeners.push(fn);
    return () => { const idx = _towerMeshListeners.indexOf(fn); if (idx >= 0) _towerMeshListeners.splice(idx, 1); };
  }, []);
}

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

function TowerDebugPanel() {
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

// ——————————————————————————————————————————————
//  Responsive helper
// ——————————————————————————————————————————————

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return mobile;
}


// ——————————————————————————————————————————————
//  UI: Together Modal — "Me elegiste"
// ——————————————————————————————————————————————

function TogetherModal({ onRestart }: { onRestart: () => void }) {
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
        pointerEvents: "auto",
        background: "rgba(0, 0, 0, 0.55)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          width: isMobile ? "98vw" : "94vw",
          maxWidth: isMobile ? undefined : 1400,
          height: isMobile ? "94vh" : "90vh",
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 107, 157, 0.15)",
          borderRadius: isMobile ? 16 : 22,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: "hidden",
        }}
      >
        {/* 3D Model — 50% */}
        <div style={{
          width: isMobile ? "100%" : "50%",
          height: isMobile ? "45%" : "100%",
          borderRight: isMobile ? "none" : "1px solid rgba(255,107,157,0.08)",
          borderBottom: isMobile ? "1px solid rgba(255,107,157,0.08)" : "none",
        }}>
          <Canvas
            resize={{ offsetSize: true }}
            camera={{ position: [0, 0.8, 5], fov: isMobile ? 48 : 70 }}
            gl={{ alpha: true, antialias: true }}
          >
            <Suspense fallback={null}>
              <CardAsheScene />
            </Suspense>
          </Canvas>
        </div>

        {/* Text — 50% */}
        <div style={{
          width: isMobile ? "100%" : "50%",
          height: isMobile ? "55%" : "100%",
          padding: isMobile ? "20px 24px" : "36px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          textAlign: "center",
          overflowY: "auto",
        }}>
          {/* Cuporo sticker */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.6, ease: "backOut" }}
            style={{ marginBottom: isMobile ? 6 : 10 }}
          >
            <motion.img
              src="/images/lol/cuporo.webp"
              alt="cuporo"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: isMobile ? 56 : 200, height: isMobile ? 56 : 200, objectFit: "contain", display: "inline-block" }}
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
            style={{ fontSize: isMobile ? 12 : 14, color: "rgba(255,107,157,0.75)", margin: "0 0 12px", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500 }}>
            Amor De Mi Vida
          </motion.p>

          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.5, duration: 0.6 }}
            style={{ height: 1, margin: "0 auto 40px", width: 100, background: "linear-gradient(90deg, transparent, rgba(255,107,157,0.5), transparent)" }} />

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.75)", fontSize: isMobile ? 12 : 14, lineHeight: 1.8, margin: "0 0 16px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            En cada decisión, en cada camino, en cada universo posible... siempre serías tú.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.75)", fontSize: isMobile ? 12 : 14, lineHeight: 1.8, margin: "0 0 24px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            Gracias por elegirme, por quedarte, por apostar por nosotros. Eres mi persona favorita, mi paz en el caos, mi hogar cuando todo se siente lejos.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3, duration: 0.8 }}
            style={{ color: "rgba(255,107,157,0.9)", fontSize: isMobile ? 12.5 : 14.5, lineHeight: 1.8, margin: "0 0 40px", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500, fontStyle: "italic" }}>
            Te amo con cada parte de mí, con todo lo que soy y todo lo que seré. Este es solo el comienzo de nuestra historia juntos.
          </motion.p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRestart}
              style={{ padding: "10px 28px", background: "linear-gradient(135deg, rgba(255,107,157,0.12), rgba(255,50,80,0.12))", border: "1px solid rgba(255,107,157,0.3)", borderRadius: 8, color: "rgba(255,107,157,0.8)", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.05em" }}>
              Volver a recorrer
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ——————————————————————————————————————————————
//  UI: Alone Modal — "Caminos diferentes"
// ——————————————————————————————————————————————

function AloneModal({ onRestart }: { onRestart: () => void }) {
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
        pointerEvents: "auto",
        background: "rgba(0, 0, 0, 0.55)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          width: isMobile ? "98vw" : "94vw",
          maxWidth: isMobile ? undefined : 1400,
          height: isMobile ? "94vh" : "90vh",
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: isMobile ? 16 : 22,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: "hidden",
        }}
      >
        {/* 3D Model — 50% */}
        <div style={{
          width: isMobile ? "100%" : "50%",
          height: isMobile ? "45%" : "100%",
          borderRight: isMobile ? "none" : "1px solid rgba(255,255,255,0.06)",
          borderBottom: isMobile ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
          <Canvas
            resize={{ offsetSize: true }}
            camera={{ position: [0, 0.8, 4], fov: isMobile ? 48 : 70 }}
            gl={{ alpha: true, antialias: true }}
          >
            <Suspense fallback={null}>
              <CardBlueSentinelScene />
            </Suspense>
          </Canvas>
        </div>

        {/* Text — 50% */}
        <div style={{
          width: isMobile ? "100%" : "50%",
          height: isMobile ? "55%" : "100%",
          padding: isMobile ? "20px 24px" : "36px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          textAlign: "center",
          overflowY: "auto",
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.6, ease: "backOut" }}
            style={{ marginBottom: isMobile ? 6 : 10 }}
          >
            <motion.img
              src="/images/lol/cumpleporo.webp"
              alt="cumpleporo"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: isMobile ? 50 : 200, height: isMobile ? 50 : 200, objectFit: "contain", display: "inline-block" }}
            />
          </motion.div>

          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.6 }}
            style={{ fontSize: isMobile ? 18 : 28, fontWeight: 600, color: "rgba(255,255,255,0.9)", margin: "0 0 4px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            Caminos Que Se Encuentran
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.5 }}
            style={{ fontSize: isMobile ? 9 : 10, color: "rgba(255,255,255,0.3)", margin: "0 0 12px", fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Sobre el amor, el respeto y los caminos propios
          </motion.p>

          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.5, duration: 0.6 }}
            style={{ height: 1, margin: "0 auto 40px", width: 100, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }} />

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.65)", fontSize: isMobile ? 12 : 14, lineHeight: 1.8, margin: "0 0 16px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            Gracias por ser honesta, y por tomarte el tiempo de reflexionar. El amor verdadero también sabe respetar las decisiones del corazón.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.65)", fontSize: isMobile ? 12 : 14, lineHeight: 1.8, margin: "0 0 16px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            A veces los caminos se separan no porque el amor se acabe, sino porque cada alma necesita su propio viaje. Y eso está bien.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.55)", fontSize: isMobile ? 12 : 14, lineHeight: 1.8, margin: "0 0 16px", fontFamily: "'Inter', system-ui, sans-serif" }}>
            Te deseo toda la felicidad del mundo, toda la paz que tu corazón merece. Que encuentres en tu camino todo aquello que buscas.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6, duration: 0.8 }}
            style={{ color: "rgba(255,255,255,0.75)", fontSize: isMobile ? 12 : 14, lineHeight: 1.8, margin: "0 0 40px", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500, fontStyle: "italic" }}>
            Si algún día nuestros caminos se vuelven a cruzar, será porque así tenía que ser. Siempre tendrás mi respeto, mi cariño y mi admiración.
          </motion.p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRestart}
              style={{ padding: "10px 28px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.05em" }}>
              Volver a recorrer
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ——————————————————————————————————————————————
//  PRESENTER: 3D Scene & Dialogue Overlay
// ——————————————————————————————————————————————

function PresenterModel({ animName, holdLastFrame = false }: { animName: string; holdLastFrame?: boolean }) {
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

  // Animation switching via useFrame — reliable inside R3F, no effect timing issues
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

/** 3D preview model inside debug panel Canvas — R3F hooks are safe here */
function PresenterDebugPreview({ scale, posY, activeAnim, onAnimNames }: {
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

/** Debug panel for presenter — press P to toggle */
function PresenterDebugPanel() {
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

      {/* 3D Preview — Canvas is inside this div, so R3F hooks work */}
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

function PresenterScreen({ onComplete }: { onComplete: (selectedCrab: "purple" | "green") => void }) {
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
        camera={{ position: [0, 0.5, 3.5], fov: 45 }}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: false }}
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
          {/* Dark floor — reflects the model cleanly */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
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
        </Suspense>
      </Canvas>

      {/* Skip button — top-right */}
      {!showCharSelect && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          onClick={() => {
            if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
            if (typingRef.current) clearInterval(typingRef.current);
            setShowCharSelect(true);
          }}
          style={{
            position: "absolute", top: 20, right: 20, zIndex: 20,
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
              position: "absolute", top: "50%", left: "55%", transform: "translate(-50%, -50%)",
              width: "min(90vw, 420px)", zIndex: 10,
            }}
          >
            <div style={{
              background: "rgba(0, 0, 0, 0.88)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 170, 204, 0.2)", borderRadius: 16,
              padding: "20px 28px", textAlign: "center",
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
                lineHeight: 1.5, margin: "0 0 16px", fontFamily: "'Inter', system-ui, sans-serif",
                minHeight: 48,
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
              position: "absolute", top: "50%", left: "55%", transform: "translate(-50%, -50%)",
              width: "min(90vw, 420px)", zIndex: 10,
            }}
          >
            <div style={{
              background: "rgba(0, 0, 0, 0.88)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 170, 204, 0.2)", borderRadius: 16,
              padding: "24px 28px", textAlign: "center",
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blink cursor style */}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      {/* Debug panel for presenter — press P */}
      <PresenterDebugPanel />
    </div>
  );
}

// ——————————————————————————————————————————————
//  PAGE: Valentine
// ——————————————————————————————————————————————

const TOTAL_STEPS = 4;

type GamePhase = "loading" | "audioConsent" | "presenter" | "transition" | "game";

export default function Valentine() {
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [selectedCrab, setSelectedCrab] = useState<"purple" | "green">("purple");
  const [fadeOut, setFadeOut] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const crabGlb = selectedCrab === "purple" ? SCUTTLE_CRAB_PURPLE_GLB : SCUTTLE_CRAB_GREEN_GLB;
  const crabMinimapImg = CRAB_MINIMAP_IMAGES[selectedCrab];

  // Create audio element once
  useEffect(() => {
    const audio = new Audio(presenterMusicSrc);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  // Phase 1: Loading → audioConsent
  useEffect(() => {
    if (phase !== "loading") return;
    const t = setTimeout(() => {
      setPhase("audioConsent");
    }, 1500);
    return () => clearTimeout(t);
  }, [phase]);

  // Handle audio consent choice
  const handleAudioChoice = useCallback((enabled: boolean) => {
    setAudioEnabled(enabled);
    if (enabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
      // Fade volume in
      gsap.to(audioRef.current, { volume: 0.35, duration: 2, ease: "power2.out" });
    }
    setPhase("presenter");
  }, []);

  // Presenter complete → transition → game
  const handlePresenterComplete = useCallback((crab: "purple" | "green") => {
    setSelectedCrab(crab);
    setFadeOut(true);
    // Fade out music during transition
    if (audioRef.current && audioEnabled) {
      gsap.to(audioRef.current, { volume: 0, duration: 1.5, ease: "power2.in", onComplete: () => {
        audioRef.current?.pause();
      }});
    }
    setTimeout(() => {
      setPhase("transition");
      setFadeOut(false);
    }, 800);
  }, [audioEnabled]);

  // Transition phase: preload game assets then reveal
  useEffect(() => {
    if (phase !== "transition") return;
    const t = setTimeout(() => {
      setPhase("game");
    }, 2000);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative", overflow: "hidden" }}>
      {/* Loading screen */}
      <AnimatePresence>
        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: 0, zIndex: 200, background: "#000",
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ width: 32, height: 32, border: "2px solid rgba(255,170,204,0.15)", borderTopColor: "rgba(255,170,204,0.6)", borderRadius: "50%" }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.15em", textTransform: "uppercase" }}
            >
              Preparando algo especial...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio consent modal */}
      <AnimatePresence>
        {phase === "audioConsent" && (
          <motion.div
            key="audio-consent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: 0, zIndex: 200, background: "#000",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: "rgba(10, 10, 10, 0.95)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 170, 204, 0.15)", borderRadius: 20,
                padding: "32px 40px", textAlign: "center", maxWidth: 380, width: "90vw",
              }}
            >
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                style={{
                  color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 400,
                  margin: "0 0 8px", fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: "0.15em", textTransform: "uppercase",
                }}
              >
                Antes de empezar
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                style={{
                  color: "rgba(255,255,255,0.85)", fontSize: 17, fontWeight: 600,
                  margin: "0 0 28px", fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                ¿Te gustaría disfrutar con música?
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.5 }}
                style={{ display: "flex", gap: 16, justifyContent: "center" }}
              >
                {/* Sound ON */}
                <motion.button
                  whileHover={{ scale: 1.06, borderColor: "rgba(255, 170, 204, 0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAudioChoice(true)}
                  style={{
                    flex: 1, maxWidth: 150, padding: "18px 16px",
                    background: "rgba(255, 170, 204, 0.08)",
                    border: "1px solid rgba(255, 170, 204, 0.2)", borderRadius: 14,
                    cursor: "pointer", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 10, transition: "border-color 0.3s",
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,170,204,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Con música
                  </span>
                </motion.button>

                {/* Sound OFF */}
                <motion.button
                  whileHover={{ scale: 1.06, borderColor: "rgba(255, 255, 255, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAudioChoice(false)}
                  style={{
                    flex: 1, maxWidth: 150, padding: "18px 16px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 14,
                    cursor: "pointer", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 10, transition: "border-color 0.3s",
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Sin música
                  </span>
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Presenter screen */}
      {(phase === "presenter" || (phase === "transition" && fadeOut)) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: fadeOut ? 0 : 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0, zIndex: 100 }}
        >
          <PresenterScreen onComplete={handlePresenterComplete} />
        </motion.div>
      )}

      {/* Transition overlay: black curtain that lifts when game is ready */}
      <AnimatePresence>
        {phase === "transition" && (
          <motion.div
            key="transition"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute", inset: 0, zIndex: 150, background: "#000",
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
            }}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: 80, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,170,204,0.4), transparent)" }}
            />
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.2em", textTransform: "uppercase" }}
            >
              Tu aventura comienza...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game — mount early during transition so assets start loading */}
      {(phase === "transition" || phase === "game") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "game" ? 1 : 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0, zIndex: 50 }}
        >
          <ValentineGame crabGlb={crabGlb} crabMinimapImg={crabMinimapImg} />
        </motion.div>
      )}
    </div>
  );
}

function ValentineGame({ crabGlb, crabMinimapImg }: { crabGlb: string; crabMinimapImg: string }) {
  const [currentNodeId, setCurrentNodeId] = useState("start");
  const [showQuestion, setShowQuestion] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAshe, setShowAshe] = useState(false);
  const [togetherScore, setTogetherScore] = useState(0);
  const [step, setStep] = useState(0);
  const [choseTogether, setChoseTogether] = useState(false);
  const [, setVisitedNodes] = useState<Set<string>>(new Set(["start"]));
  const [traversedEdges, setTraversedEdges] = useState<Map<string, string>>(new Map());
  const [destroyedNodes, setDestroyedNodes] = useState<Set<string>>(new Set());
  const [answeredNodes, setAnsweredNodes] = useState<Map<string, string>>(new Map());
  const [showTiebreaker, setShowTiebreaker] = useState(false);
  const [stepColors, setStepColors] = useState<string[]>([]);

  const handleArrived = useCallback(() => {
    if (currentNodeId === "end") {
      const aloneScore = step - togetherScore;
      if (togetherScore === aloneScore) {
        // Tied — show tiebreaker
        setShowTiebreaker(true);
      } else {
        const together = togetherScore > aloneScore;
        setChoseTogether(together);
        setShowAshe(true);
        setShowResults(true);
      }
    } else {
      setShowQuestion(true);
    }
  }, [currentNodeId, togetherScore, step]);

  const choosingRef = useRef(false);
  const handleChoose = useCallback((choice: "A" | "B") => {
    if (choosingRef.current) return; // prevent double-click
    const node = QUESTIONS[currentNodeId];
    if (!node) return;
    choosingRef.current = true;

    const option = choice === "A" ? node.optionA : node.optionB;
    const nextId = option.next;

    if (option.together) {
      setTogetherScore((prev) => prev + 1);
    }

    const edgeColor = choice === "A" ? "#ff6b9d" : "#4a6fa5";

    setShowQuestion(false);
    setStep((s) => s + 1);
    setStepColors((prev) => [...prev, edgeColor]);
    setVisitedNodes((prev) => new Set(prev).add(nextId));
    setAnsweredNodes((prev) => { const n = new Map(prev); n.set(currentNodeId, edgeColor); return n; });

    // Mark the chosen edge as traversed with the decision color
    setTraversedEdges((prev) => {
      const next = new Map(prev);
      next.set(`${currentNodeId}->${nextId}`, edgeColor);
      return next;
    });

    // Destroy the non-chosen path's target node
    const otherOption = choice === "A" ? node.optionB : node.optionA;
    const otherNodeId = otherOption.next;
    if (otherNodeId !== nextId) {
      setDestroyedNodes((prev) => new Set(prev).add(otherNodeId));
    }

    setTimeout(() => {
      setCurrentNodeId(nextId);
      choosingRef.current = false;
    }, 400);
  }, [currentNodeId]);

  const handleTiebreakerChoose = useCallback((choice: "A" | "B") => {
    const option = choice === "A" ? TIEBREAKER.optionA : TIEBREAKER.optionB;
    const newTogether = togetherScore + (option.together ? 1 : 0);
    const newStep = step + 1;
    const aloneScore = newStep - newTogether;
    setTogetherScore(newTogether);
    setStep(newStep);
    setShowTiebreaker(false);
    setChoseTogether(newTogether > aloneScore);
    setTimeout(() => {
      setShowAshe(true);
      setShowResults(true);
    }, 300);
  }, [togetherScore, step]);

  const handleRestart = useCallback(() => {
    setShowResults(false);
    setShowAshe(false);

    setTimeout(() => {
      setShowQuestion(false);
      setShowTiebreaker(false);
      setCurrentNodeId("start");
      setTogetherScore(0);
      setStep(0);
      setChoseTogether(false);
      setVisitedNodes(new Set(["start"]));
      setTraversedEdges(new Map());
      setDestroyedNodes(new Set());
      setAnsweredNodes(new Map());
      setStepColors([]);
    }, 900);
  }, []);

  const currentQuestion = QUESTIONS[currentNodeId];

  // Compute winning color for minimap border
  const winningColor = useMemo(() => {
    if (step === 0) return "#aaaaaa";
    const aloneScore = step - togetherScore;
    if (togetherScore > aloneScore) return "#ff6b9d";
    if (aloneScore > togetherScore) return "#4a6fa5";
    return "#b070d0";
  }, [togetherScore, step]);

  return (
    <div style={{ width: "100%", height: "100%", background: "#000000", position: "relative", overflow: "hidden" }}>
      <Canvas
        camera={{ position: [0, 1.5, 6], fov: 60, near: 0.1, far: 150 }}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <NeuralNetworkScene
            activeNodeId={currentNodeId}
            onArrived={handleArrived}
            showAshe={showAshe}
            traversedEdges={traversedEdges}
            destroyedNodes={destroyedNodes}
            answeredNodes={answeredNodes}
            togetherScore={togetherScore}
            step={step}
            crabGlb={crabGlb}
          />
        </Suspense>
      </Canvas>

      {/* Title */}
      <AnimatePresence>
        {currentNodeId === "start" && !showQuestion && !showResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{
              position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)",
              textAlign: "center", zIndex: 10, pointerEvents: "none",
            }}
          >
            <h1 style={{
              fontSize: 13, fontWeight: 400, letterSpacing: "0.25em", textTransform: "uppercase",
              color: "rgba(255, 107, 157, 0.6)", margin: 0, fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              Happy Valentine's Day
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimap */}
      {!showResults && (
        <Minimap
          activeNodeId={currentNodeId}
          crabNodeId={currentNodeId}
          traversedEdges={traversedEdges}
          answeredNodes={answeredNodes}
          winningColor={winningColor}
          crabImage={crabMinimapImg}
        />
      )}

      {/* Question UI */}
      {currentQuestion && (
        <QuestionOverlay
          node={currentQuestion}
          onChoose={handleChoose}
          visible={showQuestion}
          step={step}
          totalSteps={TOTAL_STEPS}
          stepColors={stepColors}
        />
      )}

      {/* Tiebreaker question */}
      <QuestionOverlay
        node={TIEBREAKER}
        onChoose={handleTiebreakerChoose}
        visible={showTiebreaker}
        step={step}
        totalSteps={TOTAL_STEPS + 1}
        stepColors={stepColors}
      />

      {/* Debug Panels — D: animations, T: tower meshes */}
      <AnimDebugPanel />
      <TowerDebugPanel />

      {/* Result modals */}
      <AnimatePresence>
        {showResults && choseTogether && (
          <TogetherModal key="together" onRestart={handleRestart} />
        )}
        {showResults && !choseTogether && (
          <AloneModal
            key="alone"
            onRestart={handleRestart}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// Preload all GLB models
useGLTF.preload(TURRET_GLB);
useGLTF.preload(TURRET_RED_GLB);
useGLTF.preload(TURRET_BLUE_GLB);
useGLTF.preload(SCUTTLE_CRAB_PURPLE_GLB);
useGLTF.preload(SCUTTLE_CRAB_GREEN_GLB);
useGLTF.preload(PRESENTER_GLB);
useGLTF.preload(NEXUS_GLB);
useGLTF.preload(LOOT_GOBLIN_GLB);
useGLTF.preload(ASHE_GLB);
useGLTF.preload(BLUE_SENTINEL_GLB);
