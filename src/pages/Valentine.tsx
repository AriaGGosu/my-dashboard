"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF, Clone, Environment, MeshReflectorMaterial, OrbitControls, SpotLight, useTexture, MeshPortalMaterial } from "@react-three/drei";
import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { unstable_batchedUpdates } from "react-dom";
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
  Vector4,
  Matrix4,
  CanvasTexture,
  LinearFilter,
  ClampToEdgeWrapping,
  DoubleSide,
  AnimationMixer,
} from "three";
// import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
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

const TURRET_GLB = "/glb/lol/turrets_(48).glb";
const TURRET_RED_GLB = "/glb/lol/turrets_(12)red.glb";
const TURRET_BLUE_GLB = "/glb/lol/turrets_(11)blue.glb";
const SCUTTLE_CRAB_PURPLE_GLB = "/glb/lol/scuttle_crab_(6).glb";
const SCUTTLE_CRAB_GREEN_GLB = "/glb/lol/scuttle_crab.glb";
const NEXUS_GLB = "/glb/lol/poro.glb";
const LOOT_GOBLIN_GLB = "/glb/lol/nexusblitz_lootgoblin_(9).glb";
const PRESENTER_GLB = "/glb/presentador/custom_tftcafecutiesmaid_(nan).glb";

// Pentakill concert models
const PENTAKILL_KARTHUS = "/glb/lol/pentakill/pentakill_karthus.glb";
const PENTAKILL_MORDEKAISER = "/glb/lol/pentakill/pentakill_mordekaiser.glb";
const PENTAKILL_OLAF = "/glb/lol/pentakill/pentakill_olaf.glb";
const PENTAKILL_SONA = "/glb/lol/pentakill/pentakill_sona.glb";
const PENTAKILL_YORICK = "/glb/lol/pentakill/pentakill_yorick.glb";
const COVEN_NAMI = "/glb/lol/pentakill/coven_nami.glb";
const CONCERT_STAGE_GLB = "/glb/stage/Concert Stage 2.glb";
const DRUM_SET_GLB = "/glb/band/Drum Set.glb";
const GUITAR_AMP_GLB = "/glb/band/Guitar Amp.glb";
const SPOT_LIGHT_GLB = "/glb/light/Spot Light.glb";
const CONCERT_MUSIC_SRC = "/audio/valentin/Feliz Valentín 2.mp3";

// Portal screen GLBs (extras)
const BARON_GLB = "/glb/lol/extras/baron.glb";
const DRAGON_ELDER_GLB = "/glb/lol/extras/dragon_(elder).glb";

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




  { text: "Regálame una noche, una noche regaaaaaaalaaaameeeeeee 🎶", animation: "sweep", duration: 5000, autoAdvance: true },

  { text: "¡Hey!", animation: "jumping", duration: 3000, buttonText: "!" },

  { text: "No le digas a nadie de esa canción...", animation: "turn_idle", duration: 3000, buttonText: "¿Qué canción?" },

  { text: "¡Correcto!", animation: "jumping", duration: 1000, autoAdvance: true },

  { text: "Mil disculpas, señorita T_T", animation: "intro_bow_02", duration: 3500, buttonText: "Hehe", holdLastFrame: true },

  { text: "Permíteme presentarme...", animation: "jumping", duration: 3500, autoAdvance: true },

  { text: "Mi nombre es 🐰 Le Bunny Bonbon y soy maid café presenter.", animation: "idle2", duration: 3500, buttonText: "¡Qué linda!" },

  { text: "Gracias, tú también eres muy linda.", animation: "celebrate", duration: 3500, buttonText: "Aww" },

  { text: "Bueno, bueno… vengo a contarte que tu enamorado te preparó algunas preguntas para este día tan especial.", animation: "trafficcontrol", duration: 3500, buttonText: "Ahh, ¿sí?" },

  { text: "¡Claro! Ahora elige tu personaje favorito y vamos allá.", animation: "click", duration: 3500, buttonText: "¡Vamos!" },









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

  // Apply hidden tower meshes once on mount + when toggle changes
  const hiddenAppliedRef = useRef(false);
  useEffect(() => {
    if (!groupRef.current) return;
    const hidden = getHiddenTowerMeshes();
    groupRef.current.traverse((o) => {
      if (o.name && hidden.has(o.name)) o.visible = false;
      else if (o.name) o.visible = true;
    });
    hiddenAppliedRef.current = true;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const spd = 3.0 * delta;

    // Early exit when already converged (within epsilon)
    const scaleDiff = Math.abs(scaleTarget.current - currentScale.current);
    const opacityDiff = Math.abs(targetOpacity.current - currentOpacity.current);
    const isConverged = scaleDiff < 0.0001 && opacityDiff < 0.001;

    if (!isConverged) {
      currentScale.current += (scaleTarget.current - currentScale.current) * Math.min(spd, 1);
      groupRef.current.scale.setScalar(currentScale.current);
      currentOpacity.current += (targetOpacity.current - currentOpacity.current) * Math.min(spd, 1);
    }

    // Collect materials once
    if (!matsCollected.current) {
      const mats: MeshStandardMaterial[] = [];
      groupRef.current.traverse((o) => {
        if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
          const mat = o.material;
          mat.transparent = true;
          mat.depthWrite = true;
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

    if (!isConverged) {
      for (const mat of cachedMats.current) {
        mat.opacity = currentOpacity.current;
        mat.emissiveIntensity += (targetEmissiveIntensity.current - mat.emissiveIntensity) * Math.min(spd, 1);
        mat.emissive.lerp(targetEmissiveColor.current, Math.min(spd, 1));
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Clone object={scene} />
    </group>
  );
}

/** Strip animation tracks whose target node doesn't exist in the root, silencing
 *  THREE.PropertyBinding "No target node found" warnings that spam the console. */
function cleanAnimations(clips: AnimationClip[], root: Object3D): AnimationClip[] {
  // Build a Set of all node names once — O(n) instead of O(n*m) traversals
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

/** Nexus model for end node — plays idle animation, reacts to result choice */
function NexusModel({ position, isActive, showResults = false, choseTogether = false }: {
  position: [number, number, number]; isActive: boolean; showResults?: boolean; choseTogether?: boolean;
}) {
  const { scene, animations } = useGLTF(NEXUS_GLB);
  const groupRef = useRef<Group>(null);
  const safeAnims = useMemo(() => cleanAnimations(animations, scene), [animations, scene]);
  const { actions, names } = useAnimations(safeAnims, groupRef);
  const started = useRef(false);
  const resultApplied = useRef(false);

  // 50% bigger scale
  useEffect(() => {
    scene.scale.setScalar(0.0375);
  }, [scene]);

  // Play Idle_Base as the default animation
  useEffect(() => {
    if (started.current || names.length === 0) return;
    started.current = true;
    const idleName = "Idle_Base";
    if (actions[idleName]) {
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

  // React to result choice — or restore initial state when results are dismissed
  useEffect(() => {
    if (!showResults) {
      // Restore initial state: Idle_Base animation + original emissive color
      if (resultApplied.current) {
        resultApplied.current = false;

        // Restore original emissive
        scene.traverse((o) => {
          if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
            o.material.emissive = new Color("#ff4081");
            o.material.emissiveIntensity = isActive ? 1.5 : 0.6;
          }
        });

        // Fade back to Idle_Base
        Object.values(actions).forEach((a) => a?.fadeOut(0.4));
        if (actions["Idle_Base"]) {
          actions["Idle_Base"]!.reset().fadeIn(0.4).play();
          actions["Idle_Base"]!.setLoop(2201, Infinity);
        }

        // Reset scale in case the pulse was mid-animation
        if (groupRef.current) {
          gsap.to(groupRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "power2.out" });
        }
      }
      return;
    }
    if (resultApplied.current) return;
    resultApplied.current = true;

    const resultColor = choseTogether ? new Color("#ff6b9d") : new Color("#4fc3f7");
    scene.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.emissive = resultColor;
        o.material.emissiveIntensity = 2.5;
      }
    });

    // Play result animation: Dance_Loop for together, Death for alone
    if (names.length > 0 && actions) {
      const animName = choseTogether ? "Dance_Loop" : "Death";
      Object.values(actions).forEach((a) => a?.fadeOut(0.4));
      if (actions[animName]) {
        const a = actions[animName]!;
        a.reset().fadeIn(0.4).play();
        a.clampWhenFinished = true;
        a.setLoop(choseTogether ? 2201 : 2200, choseTogether ? Infinity : 1);
      }
    }

    // Gentle scale pulse with gsap
    if (groupRef.current) {
      gsap.to(groupRef.current.scale, {
        x: 1.15, y: 1.15, z: 1.15,
        duration: 0.6,
        ease: "back.out(2)",
        yoyo: true,
        repeat: 1,
      });
    }
  }, [showResults, choseTogether, scene, names, actions, isActive]);

  return (
    <>
      <group ref={groupRef} position={position}>
        <primitive object={scene} />
      </group>
      {/* Extra lighting when results are showing */}
      {showResults && (
        <>
          <pointLight
            position={[position[0] - 3, position[1] + 4, position[2] + 3]}
            intensity={18}
            color={choseTogether ? "#ff6b9d" : "#4fc3f7"}
            distance={20}
          />
          <pointLight
            position={[position[0] + 3, position[1] + 4, position[2] + 3]}
            intensity={18}
            color={choseTogether ? "#ff3366" : "#2196f3"}
            distance={20}
          />
        </>
      )}
    </>
  );
}

/** Loot Goblin — fades in when node is answered.
 *  NOTE: Animations are disabled for this model because the GLB's bone hierarchy
 *  (Root, Stick, Body, Head, Hat, Weapon, Feathers, Buffbone_*) doesn't match the
 *  exported mesh scene graph, causing massive PropertyBinding warning spam. */
function LootGoblinModel({ position, show }: { position: [number, number, number]; show: boolean }) {
  const { scene } = useGLTF(LOOT_GOBLIN_GLB);
  const groupRef = useRef<Group>(null);
  const cachedMats = useRef<MeshStandardMaterial[]>([]);
  const matsCollected = useRef(false);
  const currentOpacity = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetOp = show ? 1 : 0;
    // Early exit when converged (nothing to animate)
    if (Math.abs(targetOp - currentOpacity.current) < 0.001) return;
    currentOpacity.current += (targetOp - currentOpacity.current) * Math.min(3 * delta, 1);
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
      <Clone object={scene} />
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
  const safeAnims = useMemo(() => cleanAnimations(animations, scene), [animations, scene]);
  const { actions, names } = useAnimations(safeAnims, groupRef);
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

  // Scale only — lookAt handles orientation, no manual rotation needed
  useEffect(() => {
    scene.scale.setScalar(0.006);
    scene.rotation.set(0, 0, 0); // ensure no leftover rotation
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
    // Skip when already converged
    const angleDiff = groupRef.current.quaternion.angleTo(idleQuatTarget.current);
    if (angleDiff < 0.001) return;
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
const ConnectionTube = memo(function ConnectionTube({ from, to, color, traversed }: { from: [number, number, number]; to: [number, number, number]; color: string; traversed: boolean }) {
  const meshRef = useRef<Mesh>(null);
  const geo = useMemo(() => {
    const curve = buildConnectionCurve(from, to);
    return new TubeGeometry(curve, 20, 0.04, 6, false);
  }, [from, to]);

  const targetColor = useRef(new Color("#111111"));
  const targetOpacity = useRef(0.35);
  const convergedRef = useRef(true);

  useEffect(() => {
    if (traversed) {
      targetColor.current.setStyle(color);
      targetOpacity.current = 0.55;
    } else {
      targetColor.current.setStyle("#111111");
      targetOpacity.current = 0.35;
    }
    convergedRef.current = false; // mark dirty when props change
  }, [traversed, color]);

  useFrame((_, delta) => {
    if (!meshRef.current || convergedRef.current) return;
    const mat = meshRef.current.material as MeshBasicMaterial;
    const spd = Math.min(3 * delta, 1);
    mat.color.lerp(targetColor.current, spd);
    mat.opacity += (targetOpacity.current - mat.opacity) * spd;
    // Check convergence
    const colorDist = mat.color.r - targetColor.current.r + mat.color.g - targetColor.current.g + mat.color.b - targetColor.current.b;
    if (Math.abs(colorDist) < 0.01 && Math.abs(mat.opacity - targetOpacity.current) < 0.01) {
      convergedRef.current = true;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geo}>
      <meshBasicMaterial color="#111111" transparent opacity={0.35} toneMapped={false} />
    </mesh>
  );
});

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

// ——————————————————————————————————————————————
//  Shared 3D helpers
// ——————————————————————————————————————————————

/** Black reflective floor with real reflections */
function PresenterReflectiveFloor({ yPos, xPos = 0, zPos = 0 }: { yPos: number; xPos?: number; zPos?: number }) {
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

  // Cache the fadeable materials to avoid traversing the entire scene graph every frame
  const fadeableMatsRef = useRef<Array<{ mat: MeshBasicMaterial; baseOpacity: number }>>([]);
  const matsCollectedRef = useRef(false);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const diff = targetOpacity - opacityRef.current;
    // Skip when opacity is already at target (within epsilon)
    if (Math.abs(diff) < 0.001) {
      if (opacityRef.current < 0.01 && !visible) groupRef.current.visible = false;
      return;
    }
    const speed = 1.5 * delta;
    opacityRef.current += diff * Math.min(speed, 1);

    // Collect fadeable materials once instead of traversing every frame
    if (!matsCollectedRef.current) {
      const mats: Array<{ mat: MeshBasicMaterial; baseOpacity: number }> = [];
      groupRef.current.traverse((o) => {
        if (o instanceof Mesh) {
          const mat = o.material as MeshBasicMaterial;
          if (mat && mat.opacity !== undefined && !mat.userData._nodeManaged) {
            mat.transparent = true;
            const baseOp = mat.userData.baseOpacity ?? mat.opacity;
            mat.userData.baseOpacity = baseOp;
            mats.push({ mat, baseOpacity: baseOp });
          }
        }
      });
      fadeableMatsRef.current = mats;
      if (mats.length > 0) matsCollectedRef.current = true;
    }

    // Apply opacity only to cached list
    for (const { mat, baseOpacity } of fadeableMatsRef.current) {
      mat.opacity = baseOpacity * opacityRef.current;
    }

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
  isMobile = false,
  showResults = false,
  choseTogether = false,
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
  isMobile?: boolean;
  showResults?: boolean;
  choseTogether?: boolean;
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
    // On mobile, pull camera further back for a more panoramic view
    const mobileZoomFactor = isMobile ? 1.4 : 1;
    const camOffset = isEndNode
      ? new Vector3(0, 3.5 * mobileZoomFactor, 10 * mobileZoomFactor)
      : isStart
        ? new Vector3(0, 4 * mobileZoomFactor, 6 * mobileZoomFactor)
        : new Vector3(0, 1.5 * mobileZoomFactor, 6 * mobileZoomFactor);
    const camTarget = newTarget.clone().add(camOffset);

    const startPos = camera.position.clone();
    const startLookAt = lookAtRef.current.clone();

    if (isStart) {
      // Cinematic landing: start camera high above the map, sweep down to the start node
      const highPos = isInitial
        ? new Vector3(newTarget.x, newTarget.y + 20, newTarget.z)
        : camera.position.clone().setY(Math.max(camera.position.y, newTarget.y + 25));
      camera.position.copy(highPos);
      lookAtRef.current.copy(newTarget);
      camera.lookAt(newTarget);

      const camCurveIntro = new CatmullRomCurve3([
        highPos,
        new Vector3(newTarget.x, newTarget.y + 15, newTarget.z + 14),
        new Vector3(newTarget.x, newTarget.y + 6, newTarget.z + 8),
        camTarget,
      ]);
      const introObj = { t: 0 };
      const tween = gsap.to(introObj, {
        t: 1,
        duration: 3.5,
        ease: "power3.inOut",
        onUpdate: () => {
          const p = camCurveIntro.getPointAt(introObj.t);
          camera.position.copy(p);
          lookAtRef.current.lerpVectors(newTarget, newTarget, 1);
          camera.lookAt(newTarget);
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
    }

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
  }, [activeNodeId, camera, isMobile]);

  // Reusable vector for lookAt — avoids GC pressure from allocating every frame
  const _lookAtVec = useMemo(() => new Vector3(), []);
  const resultCamLookAt = useRef(new Vector3());
  const resultCamActive = useRef(false);

  useFrame(() => {
    // While results are active, use the result camera lookAt instead
    if (resultCamActive.current) {
      camera.lookAt(resultCamLookAt.current);
      return;
    }
    if (arrivedAtNodeRef.current !== activeNodeId) return;
    const node = ALL_NODES[activeNodeId];
    if (!node) return;
    _lookAtVec.set(node.position[0], node.position[1], node.position[2]);
    camera.lookAt(_lookAtVec);
  });

  // Secondary camera animation when results are shown
  const resultCamTween = useRef<gsap.core.Tween | null>(null);
  useEffect(() => {
    if (resultCamTween.current) { resultCamTween.current.kill(); resultCamTween.current = null; }
    const endNode = ALL_NODES["end"];
    if (!endNode) return;
    const endP = endNode.position;

    if (showResults) {
      resultCamActive.current = true;

      // Center camera on the model
      const lookTarget = new Vector3(endP[0], endP[1] + 1, endP[2]);
      resultCamLookAt.current.copy(lookTarget);
      resultCamTween.current = gsap.to(camera.position, {
        x: endP[0],
        y: endP[1] + 3,
        z: endP[2] + 9,
        duration: 2,
        ease: "power2.inOut",
      });
    } else {
      resultCamActive.current = false;
    }

    return () => { if (resultCamTween.current) resultCamTween.current.kill(); };
  }, [showResults, isMobile, camera]);

  const activeNode = ALL_NODES[activeNodeId];

  // Determine pulse ring color based on who's winning
  const winningColor = useMemo(() => {
    if (step === 0) return "#b3b3b3";
    const aloneScore = step - togetherScore;
    if (togetherScore > aloneScore) return "#ff6b9d";
    if (aloneScore > togetherScore) return "#4a6fa5";
    return "#b070d0"; // tied — purple mix
  }, [togetherScore, step]);

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 15, 80]} />
      <Environment preset="apartment" />
      <ambientLight intensity={0.3} color="#ff6b9d" />
      <pointLight position={[0, 10, 5]} intensity={20} color="#ff6b9d" distance={50} />
      <pointLight position={[-10, -5, -20]} intensity={12} color="#ff3366" distance={50} />

      {/* Neural network elements — fade out at the end (except Nexus which stays) */}
      <NeuralNetworkFade visible={!showAshe}>
        <BackgroundParticles count={isMobile ? 100 : 300} />
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
            <group key={node.id}>
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
        {activeNode && <PulseRings position={activeNode.position} winningColor={winningColor} />}
        <ScuttleCrabCompanion activeNodeId={activeNodeId} onNodeReached={handleCrabNodeReached} glbPath={crabGlb} />
      </NeuralNetworkFade>

      {/* End node — Nexus stays visible even during results, reacts to result choice */}
      {ALL_NODES["end"] && (
        <NexusModel
          position={ALL_NODES["end"].position}
          isActive={activeNodeId === "end"}
          showResults={showResults}
          choseTogether={choseTogether}
        />
      )}

    </>
  );
}


// ——————————————————————————————————————————————
//  UI: Question overlay
// ——————————————————————————————————————————————

const QuestionOverlay = memo(function QuestionOverlay({
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
});

// ——————————————————————————————————————————————
//  UI: Minimap — bird's-eye view of node network
// ——————————————————————————————————————————————

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

const Minimap = memo(function Minimap({
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

      {/* Label — hidden on mobile */}
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
//  PENTAKILL CONCERT EXPERIENCE
// ——————————————————————————————————————————————

/** Band member positions arranged in a semicircle facing camera.
 *  `anims` is optional — if a single string, loops it; if an array, cycles randomly between them.
 *  If omitted, plays the first available animation in loop.
 *  `timeScale` controls playback speed (default 1). e.g. 0.5 = half speed, 2 = double speed. */
const BAND_MEMBERS: { glb: string; pos: [number, number, number]; rot: [number, number, number]; scale: number; name: string; anims?: string | string[]; timeScale?: number; floats?: boolean }[] = [
  { glb: PENTAKILL_KARTHUS, pos: [0, -4, 8], rot: [0, 0, 0], scale: 0.018, name: "Karthus", anims: ["Idle2_Base"], timeScale: 0.1, floats: true },
  { glb: PENTAKILL_SONA, pos: [-10, -3, -10], rot: [0, 0.3, 0], scale: 0.018, name: "Sona", anims: ["Sona_Idle_Base"], timeScale: 0.1, floats: true },
  { glb: PENTAKILL_MORDEKAISER, pos: [5, -4, -2], rot: [0, -0.3, 0], scale: 0.018, name: "Mordekaiser", anims: ["recall.anm"], timeScale: 0.1 },
  { glb: PENTAKILL_YORICK, pos: [-5, -4, -2], rot: [0, 0.5, 0], scale: 0.018, name: "Yorick", anims: ["DanceLoop"], timeScale: 0.1 },
  { glb: PENTAKILL_OLAF, pos: [11.5, -2.6, -12], rot: [0, -0.5, 0], scale: 0.018, name: "Olaf", anims: ["Channel"], timeScale: 0.1 },
  { glb: COVEN_NAMI, pos: [0, -5, -10], rot: [0, 0, 0], scale: 0.068, name: "Nami", anims: ["Run_Haste"], timeScale: 0.1, floats: true },
];

/** Camera shots — coreografía basada en las posiciones REALES de cada elemento:
 *  Karthus [0,-5,8]  Sona [-10,-3,-10]  Mordekaiser [5,0,-2]
 *  Yorick [-5,-4,-2]  Olaf [10,0,-10]  Nami [0,-5,-10]
 *  Stage [0,-6,-5]  Portal Baron [-21.6,0.5,4.4]  Portal Dragon [21.6,0.5,4.4]
 *  Drum Set [10,-1,-9.5]  Guitar Amp [-5,-3,-1] */
const CONCERT_SHOTS: { pos: [number, number, number]; lookAt: [number, number, number]; dur: number; ease?: string; cut?: boolean }[] = [
  // 1. Gran panorámica — se ve todo el escenario completo con las pantallas a los lados
  { pos: [0, 5, 25], lookAt: [0, -2, -2], dur: 6, ease: "power2.inOut" },
  // 2. Dolly hacia Karthus 

  // 3. Close-up Karthus — ángulo bajo heroico
  { pos: [3, 0, 11], lookAt: [0, 0, 8], dur: 4, ease: "power2.inOut" },
  // 4. Cut — Portal Baron izquierdo [-21.6, 0.5, 4.4] — el público ve qué hay dentro
  { pos: [20, 4, 18], lookAt: [0, -2, -2], dur: 5, ease: "power1.inOut" },
  // 5. Cut — Portal Dragon derecho [21.6, 0.5, 4.4]
  { pos: [-20, 4, 18], lookAt: [0, -2, -2], dur: 5, ease: "power1.inOut" },



  // 8. Yorick [-5,-4,-2] — izquierda, mira derecha (rot 0.5)
  { pos: [-2, -2, 4], lookAt: [-5, -3, -2], dur: 4, ease: "power2.inOut" },
  // 9. Close Yorick — ángulo medio
  { pos: [-3, -2.5, 1], lookAt: [-5, -2.5, -2], dur: 3.5, ease: "power2.inOut" },

  // 6. Mordekaiser [5,0,-2] — viene desde la derecha, mira izquierda (rot -0.3)
  { pos: [2, 1, 4], lookAt: [5, 0.5, -2], dur: 4, ease: "power2.inOut" },


  // 11. Sona [-10,-3,-10] — dolly lateral izquierda atrás
  { pos: [-5, -1, -3], lookAt: [-10, -2, -10], dur: 4.5, ease: "power1.inOut" },
  // 12. Close Sona — ángulo frontal-derecho (mira derecha rot 0.3)
  { pos: [-7, -2, -6], lookAt: [-10, -1.5, -10], dur: 3.5, ease: "power2.inOut" },
  // 13. Cut — Olaf [10,0,-10] — derecha atrás, mira izquierda (rot -0.5)
  { pos: [6, 1, -3], lookAt: [10, 0.5, -10], dur: 4 },
  // 14. Close Olaf — ángulo bajo agresivo
  { pos: [8, -0.5, -6], lookAt: [10, 1, -10], dur: 3.5, ease: "power2.inOut" },

  // 19. Gran panorámica lateral derecha — todo el escenario + portales
  { pos: [20, 4, 18], lookAt: [0, -2, -2], dur: 5, ease: "power1.inOut" },
  // 20. Gran panorámica lateral izquierda
  { pos: [-20, 4, 18], lookAt: [0, -2, -2], dur: 5, ease: "power1.inOut" },
  // 21. Vuelta a Karthus — ángulo dramático bajo mirando arriba
  { pos: [0, 0, 11], lookAt: [0, 0, 8], dur: 4, ease: "power2.inOut" },
  // 22. Pullback épico — escenario completo con pantallas, fuego y luces
  { pos: [0, 6, 30], lookAt: [0, -2, -2], dur: 6, ease: "power2.inOut" },
];

/** Reusable band member model — loads GLB, plays animations.
 *  `anims` — single string: loop that animation. Array: cycle randomly between them.
 *  If omitted or names don't match, falls back to first available animation.
 *  `timeScale` controls playback speed (default 1). */
function PentakillModel({ glbPath, position, rotation, scale, anims, timeScale = 1 }: {
  glbPath: string; position: [number, number, number]; rotation: [number, number, number]; scale: number;
  anims?: string | string[]; timeScale?: number;
}) {
  const { scene, animations } = useGLTF(glbPath);
  const groupRef = useRef<Group>(null);
  const safeAnims = useMemo(() => cleanAnimations(animations, scene), [animations, scene]);
  const { actions, names } = useAnimations(safeAnims, groupRef);
  const started = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { scene.scale.setScalar(scale); }, [scene, scale]);

  // Material setup + sombras
  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material instanceof MeshStandardMaterial) {
          o.material.envMapIntensity = 1.5;
        }
      }
    });
  }, [scene]);

  // Animation logic
  useEffect(() => {
    if (started.current || names.length === 0) return;
    started.current = true;

    // Log animaciones disponibles para debug
    console.log(`[PentakillModel] ${glbPath} — animaciones:`, names);

    // Resolve which animation names to use
    const animList: string[] = anims
      ? (typeof anims === "string" ? [anims] : anims).filter((a) => names.includes(a))
      : [];

    // Fallback: if none matched, use first available
    if (animList.length === 0) animList.push(names[0]);

    if (animList.length === 1) {
      // Single animation — loop forever
      const a = actions[animList[0]];
      if (a) { a.timeScale = timeScale; a.reset().play(); a.setLoop(2201, Infinity); }
    } else {
      // Multiple animations — play one at random, when it ends pick another
      let cancelled = false;

      const playRandom = () => {
        if (cancelled) return;
        Object.values(actions).forEach((a) => a?.fadeOut(0.4));
        const pick = animList[Math.floor(Math.random() * animList.length)];
        const a = actions[pick];
        if (a) {
          a.timeScale = timeScale;
          a.reset().fadeIn(0.4).play();
          a.clampWhenFinished = true;
          a.setLoop(2200, 1); // play once
          // Account for timeScale in the timeout duration
          const dur = (a.getClip().duration / timeScale) * 1000;
          timerRef.current = setTimeout(playRandom, dur + 100);
        }
      };

      playRandom();

      return () => {
        cancelled = true;
        started.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        Object.values(actions).forEach((a) => a?.stop());
      };
    }

    return () => {
      started.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [actions, names, anims, timeScale]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={scene} />
    </group>
  );
}

// ——— Procedural volumetric fire ———

/** Generate a high-res fire gradient texture (radial × height lookup).
 *  Uses smooth hermite interpolation to avoid banding/pixelation. */
function createFireGradient(): HTMLCanvasElement {
  const w = 512, h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const data = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);          // radial: 0=center 1=edge
      const v = y / (h - 1);          // 0=top(fire tip) 1=bottom(fire base)
      // Smooth radial falloff (hermite)
      const radial = 1 - u * u * (3 - 2 * u);
      // Smooth vertical intensity — base is bright, tip fades out
      const height = v * v * (3 - 2 * v);
      const intensity = radial * height;
      // Color ramp: white-hot → yellow → orange → red → transparent
      const r = Math.min(255, (intensity * 1.2 * 255) | 0);
      const g = Math.min(255, (intensity * v * 0.85 * 255) | 0);
      const b = Math.min(255, (intensity * v * v * 0.35 * 255) | 0);
      const a = Math.min(255, (intensity * 255) | 0);
      const i = (y * w + x) * 4;
      data.data[i] = r;
      data.data[i + 1] = g;
      data.data[i + 2] = b;
      data.data[i + 3] = a;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

let _cachedFireTex: CanvasTexture | null = null;
function getFireTexture(): CanvasTexture {
  if (!_cachedFireTex) {
    _cachedFireTex = new CanvasTexture(createFireGradient());
    _cachedFireTex.magFilter = LinearFilter;
    _cachedFireTex.minFilter = LinearFilter;
    _cachedFireTex.wrapS = ClampToEdgeWrapping;
    _cachedFireTex.wrapT = ClampToEdgeWrapping;
  }
  return _cachedFireTex;
}

/* Simplex 3D noise — Ashima Arts / Stefan Gustavson (MIT) */
const SIMPLEX_NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.0,i1.z,i2.z,1.0))
    +i.y+vec4(0.0,i1.y,i2.y,1.0))
    +i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/** Volumetric fire shader material.
 *  40 ray-march iterations + 4 noise octaves for smooth, large-scale fire. */
class FireMaterial extends ShaderMaterial {
  constructor() {
    super({
      defines: { ITERATIONS: "40", OCTIVES: "4" },
      uniforms: {
        fireTex: { value: null },
        color: { value: new Color(0xeeeeee) },
        time: { value: 0.0 },
        seed: { value: 0.0 },
        invModelMatrix: { value: new Matrix4() },
        scale: { value: new Vector3(1, 1, 1) },
        noiseScale: { value: new Vector4(1, 2, 1, 0.3) },
        magnitude: { value: 1.8 },
        lacunarity: { value: 3.0 },
        gain: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        }`,
      fragmentShader: `
        ${SIMPLEX_NOISE_GLSL}
        uniform vec3 color;
        uniform float time;
        uniform float seed;
        uniform mat4 invModelMatrix;
        uniform vec3 scale;
        uniform vec4 noiseScale;
        uniform float magnitude;
        uniform float lacunarity;
        uniform float gain;
        uniform sampler2D fireTex;
        varying vec3 vWorldPos;

        float turbulence(vec3 p) {
          float sum = 0.0;
          float freq = 1.0;
          float amp = 1.0;
          for(int i = 0; i < OCTIVES; i++) {
            sum += abs(snoise(p * freq)) * amp;
            freq *= lacunarity;
            amp *= gain;
          }
          return sum;
        }

        vec4 samplerFire(vec3 p, vec4 sc) {
          vec2 st = vec2(sqrt(dot(p.xz, p.xz)), p.y);
          if(st.x <= 0.0 || st.x >= 1.0 || st.y <= 0.0 || st.y >= 1.0) return vec4(0.0);
          p.y -= (seed + time) * sc.w;
          p *= sc.xyz;
          st.y += sqrt(st.y) * magnitude * turbulence(p);
          if(st.y <= 0.0 || st.y >= 1.0) return vec4(0.0);
          return texture2D(fireTex, st);
        }

        vec3 localize(vec3 p) {
          return (invModelMatrix * vec4(p, 1.0)).xyz;
        }

        void main() {
          vec3 rayPos = vWorldPos;
          vec3 rayDir = normalize(rayPos - cameraPosition);
          float rayLen = 0.012 * length(scale);
          vec4 col = vec4(0.0);
          for(int i = 0; i < ITERATIONS; i++) {
            rayPos += rayDir * rayLen;
            vec3 lp = localize(rayPos);
            lp.y += 0.5;
            lp.xz *= 2.0;
            col += samplerFire(lp, noiseScale);
          }
          col.a = col.r;
          gl_FragColor = col;
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
  }
}

/** Volumetric fire column — procedural shader, no texture file needed.
 *  Billboard mode: siempre mira hacia la cámara para que no parezca que se mueve. */
function Fire({ color, billboard = false, ...props }: { color?: Color; billboard?: boolean; position?: [number, number, number]; scale?: number | [number, number, number] }) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<FireMaterial | null>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const mat = new FireMaterial();
    mesh.material = mat;
    matRef.current = mat;

    mat.uniforms.fireTex.value = getFireTexture();
    mat.uniforms.color.value = color || new Color(0xeeeeee);
    mat.uniforms.seed.value = Math.random() * 19.19;
  }, [color]);

  useFrame((state) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    // Billboard: rotar el mesh para que siempre mire a la cámara (solo en Y)
    if (billboard) {
      mesh.rotation.y = Math.atan2(
        state.camera.position.x - mesh.position.x,
        state.camera.position.z - mesh.position.z,
      );
    }
    mesh.updateMatrixWorld();
    mat.uniforms.invModelMatrix.value.copy(mesh.matrixWorld).invert();
    mat.uniforms.time.value = state.clock.elapsedTime;
    mat.uniforms.scale.value = mesh.scale;
  });

  return (
    <mesh ref={meshRef} {...props}>
      <boxGeometry />
    </mesh>
  );
}

/** Fire anchored to the camera — always visible on screen regardless of camera movement.
 *  `offset` is in camera-local space: x=left/right, y=up/down, z=forward(negative)/back(positive).
 *  Each frame the group is repositioned & reoriented to follow the camera. */
function CameraFire({ offset = [0, -3, -6] as [number, number, number], scale = 5, color }: {
  offset?: [number, number, number]; scale?: number | [number, number, number]; color?: Color;
}) {
  const groupRef = useRef<Group>(null);
  const _off = useMemo(() => new Vector3(...offset), [offset[0], offset[1], offset[2]]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ camera }) => {
    const g = groupRef.current;
    if (!g) return;
    // Transform offset from camera-local space into world space
    const worldPos = _off.clone().applyMatrix4(camera.matrixWorld);
    g.position.copy(worldPos);
    // Match camera orientation so fire always faces the same screen direction
    g.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={groupRef}>
      <Fire scale={scale} color={color} />
    </group>
  );
}

/** Fixed spotlight aimed at a target position (for corner concert lights) */
function FixedSpot({ position, target, color, intensity = 15, angle = 0.4, penumbra = 0.6 }: {
  position: [number, number, number]; target: [number, number, number]; color: string;
  intensity?: number; angle?: number; penumbra?: number;
}) {
  const lightRef = useRef<any>(null);
  const targetObj = useMemo(() => {
    const obj = new Object3D();
    obj.position.set(...target);
    return obj;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[1], target[2]]);

  useEffect(() => {
    if (lightRef.current) lightRef.current.target = targetObj;
  }, [targetObj]);

  return (
    <group>
      <spotLight ref={lightRef} position={position} color={color} intensity={intensity} angle={angle} penumbra={penumbra} distance={25} />
      <primitive object={targetObj} />
    </group>
  );
}

/** Mouse-following spotlight — follows pointer via lerp */
function MovingSpot({ vec = new Vector3(), ...props }: { vec?: Vector3;[key: string]: unknown }) {
  const light = useRef<any>(null);
  const viewport = useThree((state) => state.viewport);
  useFrame((state) => {
    if (!light.current) return;
    light.current.target.position.lerp(
      vec.set((state.pointer.x * viewport.width) / 2, (state.pointer.y * viewport.height) / 2, 0),
      0.1,
    );
    light.current.target.updateMatrixWorld();
  });
  return (
    <SpotLight
      castShadow
      ref={light}
      penumbra={1}
      distance={6}
      angle={0.35}
      attenuation={5}
      anglePower={4}
      intensity={2}
      {...props}
    />
  );
}

/** Reflective ground plane with texture */
function ConcertGround() {
  const [floor, normal] = useTexture([
    "public/images/surface/SurfaceImperfections003_1K_Normal.jpg",
    "public/images/Surface/SurfaceImperfections003_1K_Normal.jpg",
  ]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 2]}>
      <planeGeometry args={[20, 20]} />
      <MeshReflectorMaterial
        resolution={512}
        blur={[400, 100]}
        mixBlur={6}
        mixStrength={1.5}
        mirror={0.5}
        color="#00000020"
        metalness={0.4}
        roughnessMap={floor}
        normalMap={normal}
        normalScale={[2, 2]}
      />
    </mesh>
  );
}

/** Lámpara 3D con SpotLight VOLUMÉTRICO de drei (haz visible, consume 1 texture unit).
 *  Sigue el mouse — la lámpara rota apuntando al target. */
function SpotLampMovingVolumetric({ position, color = "#ffffff", intensity = 2, lampScale = 1 }: {
  position: [number, number, number]; color?: string; intensity?: number;
  lampScale?: number;
}) {
  const { scene } = useGLTF(SPOT_LIGHT_GLB);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const light = useRef<any>(null);
  const lampRef = useRef<Group>(null);
  const viewport = useThree((state) => state.viewport);
  const _targetWorld = useMemo(() => new Vector3(), []);

  useEffect(() => {
    cloned.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.envMapIntensity = 1.5;
      }
    });
  }, [cloned]);

  useFrame((state) => {
    if (!light.current) return;
    _targetWorld.set(
      (state.pointer.x * viewport.width) / 2,
      (state.pointer.y * viewport.height) / 2,
      0,
    );
    light.current.target.position.lerp(_targetWorld, 0.1);
    light.current.target.updateMatrixWorld();

    if (lampRef.current) {
      const targetPos = light.current.target.position.clone();
      lampRef.current.parent?.worldToLocal(targetPos);
      lampRef.current.lookAt(targetPos);
    }
  });

  return (
    <group position={position}>
      <group ref={lampRef}>
        <primitive object={cloned} scale={lampScale} />
        {/* SpotLight DENTRO del grupo lampRef — rota con la lámpara.
            Posicionado en el vidrio/lente del modelo de lámpara. */}
        <SpotLight
          ref={light}
          position={[0, -0.45, 0.01]}
          penumbra={1}
          distance={15}
          angle={0.35}
          attenuation={5}
          anglePower={4}
          intensity={intensity}
          color={color}
        />
      </group>
    </group>
  );
}

/** Lámpara 3D con spotLight NATIVO (sin haz visible, no consume texture units).
 *  Sigue el mouse — solo ilumina, sin efecto visual del cono. */
function SpotLampMovingNative({ position, color = "#ffffff", intensity = 80, lampScale = 1 }: {
  position: [number, number, number]; color?: string; intensity?: number;
  lampScale?: number;
}) {
  const { scene } = useGLTF(SPOT_LIGHT_GLB);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const light = useRef<any>(null);
  const lampRef = useRef<Group>(null);
  const viewport = useThree((state) => state.viewport);
  const _targetWorld = useMemo(() => new Vector3(), []);
  const targetObj = useMemo(() => new Object3D(), []);

  useEffect(() => {
    cloned.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.envMapIntensity = 1.5;
      }
    });
  }, [cloned]);

  useEffect(() => {
    if (light.current) light.current.target = targetObj;
  }, [targetObj]);

  useFrame((state) => {
    if (!light.current) return;
    _targetWorld.set(
      (state.pointer.x * viewport.width) / 2,
      (state.pointer.y * viewport.height) / 2,
      0,
    );
    targetObj.position.lerp(_targetWorld, 0.1);
    targetObj.updateMatrixWorld();

    if (lampRef.current) {
      const targetPos = targetObj.position.clone();
      lampRef.current.parent?.worldToLocal(targetPos);
      lampRef.current.lookAt(targetPos);
    }
  });

  return (
    <group position={position}>
      <group ref={lampRef}>
        <primitive object={cloned} scale={lampScale} />
        {/* spotLight nativo DENTRO del grupo — rota con la lámpara, sale del vidrio */}
        <spotLight
          ref={light}
          position={[0, -0.45, 0.01]}
          color={color}
          intensity={intensity}
          distance={50}
          angle={0.5}
          penumbra={0.8}
          decay={1}
        />
      </group>
      <primitive object={targetObj} />
    </group>
  );
}

/** Lámpara 3D con modelo GLB + SpotLight fijo apuntando a un target */
function SpotLampFixed({ position, target, color = "#ffffff", intensity = 15, angle = 0.4, penumbra = 0.6, lampScale = 1, lampRotation = [0, 0, 0] as [number, number, number] }: {
  position: [number, number, number]; target: [number, number, number]; color?: string;
  intensity?: number; angle?: number; penumbra?: number;
  lampScale?: number; lampRotation?: [number, number, number];
}) {
  const { scene } = useGLTF(SPOT_LIGHT_GLB);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const lightRef = useRef<any>(null);
  const targetObj = useMemo(() => {
    const obj = new Object3D();
    obj.position.set(...target);
    return obj;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[1], target[2]]);

  useEffect(() => {
    if (lightRef.current) lightRef.current.target = targetObj;
  }, [targetObj]);

  useEffect(() => {
    cloned.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.envMapIntensity = 1.5;
      }
    });
  }, [cloned]);

  return (
    <group position={position}>
      {/* Modelo de la lámpara */}
      <primitive object={cloned} scale={lampScale} rotation={lampRotation} />
      {/* Luz fija */}
      <spotLight ref={lightRef} color={color} intensity={intensity} angle={angle} penumbra={penumbra} distance={25} />
      <primitive object={targetObj} />
    </group>
  );
}

/** Concert lighting — lámparas con modelo 3D + luces que nacen de ellas */
function ConcertLights() {
  return (
    <>
      {/* Fila frontal — volumétricas con haz visible (4 = 4 texture units) */}
      <SpotLampMovingVolumetric position={[14, 7.5, 3.7]} color="#00ff00" intensity={2} lampScale={0.5} />
      <SpotLampMovingVolumetric position={[5, 7.5, 3.7]} color="#00ff00" intensity={2} lampScale={0.5} />
      <SpotLampMovingVolumetric position={[-5, 7.5, 3.7]} color="#00ff00" intensity={2} lampScale={0.5} />
      <SpotLampMovingVolumetric position={[-14, 7.5, 3.7]} color="#00ff00" intensity={2} lampScale={0.5} />

      {/* Fila trasera — nativas sin haz visible (0 texture units extra) */}
      <SpotLampMovingNative position={[14, 7.5, -13.5]} color="#00ff00" intensity={80} lampScale={0.5} />
      <SpotLampMovingNative position={[5, 7.5, -13.5]} color="#00ff00" intensity={80} lampScale={0.5} />
      <SpotLampMovingNative position={[-5, 7.5, -13.5]} color="#00ff00" intensity={80} lampScale={0.5} />
      <SpotLampMovingNative position={[-14, 7.5, -13.5]} color="#00ff00" intensity={80} lampScale={0.5} />

      {/* Lámparas fijas en esquinas inferiores — apuntando al centro */}


      {/* Ambient base */}
      <ambientLight intensity={1} color="#1a0030" />
      <hemisphereLight color="#2a0845" groundColor="#0a0010" intensity={0.12} />

      {/* Stage under-lights */}

    </>
  );
}

/** Professional concert camera — smooth dolly/crane moves, always in front of performers.
 *  Uses CatmullRomCurve3 for buttery transitions and very subtle handheld micro-sway. */
function ConcertCameraChoreography() {
  const { camera } = useThree();
  const shotIndex = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const lookAtTarget = useRef(new Vector3(0, 1.5, 2));
  const lookAtSmooth = useRef(new Vector3(0, 1.5, 2));

  const playNextShot = useCallback(() => {
    const idx = shotIndex.current % CONCERT_SHOTS.length;
    const shot = CONCERT_SHOTS[idx];
    const nextIdx = (idx + 1) % CONCERT_SHOTS.length;
    const nextShot = CONCERT_SHOTS[nextIdx];

    const startPos = camera.position.clone();
    const targetPos = new Vector3(...shot.pos);
    const nextPos = new Vector3(...nextShot.pos);

    const startLookAt = lookAtTarget.current.clone();
    const targetLookAt = new Vector3(...shot.lookAt);

    if (shot.cut) {
      // Hard cut — fast direct transition, no curve
      const prog = { t: 0 };
      tweenRef.current = gsap.to(prog, {
        t: 1,
        duration: 0.3,
        ease: "power3.out",
        onUpdate: () => {
          camera.position.lerpVectors(startPos, targetPos, prog.t);
          lookAtTarget.current.lerpVectors(startLookAt, targetLookAt, prog.t);
        },
        onComplete: () => {
          // Hold the shot for its full duration after the cut
          tweenRef.current = gsap.delayedCall(shot.dur, () => {
            shotIndex.current++;
            playNextShot();
          });
        },
      });
    } else {
      // Smooth dolly/crane — clean curve with gentle arc, no random offsets
      const mid = startPos.clone().lerp(targetPos, 0.5);
      mid.y += 0.6; // subtle arc for crane feel

      const overshoot = targetPos.clone().lerp(nextPos, 0.1);
      const curve = new CatmullRomCurve3([startPos, mid, targetPos, overshoot]);

      const prog = { t: 0 };
      tweenRef.current = gsap.to(prog, {
        t: 1,
        duration: shot.dur,
        ease: shot.ease ?? "power2.inOut",
        onUpdate: () => {
          const p = curve.getPointAt(Math.min(prog.t, 1));
          camera.position.copy(p);
          lookAtTarget.current.lerpVectors(startLookAt, targetLookAt, prog.t);
        },
        onComplete: () => {
          shotIndex.current++;
          playNextShot();
        },
      });
    }
  }, [camera]);

  // Start
  useEffect(() => {
    camera.position.set(0, 3, 20);
    lookAtTarget.current.set(0, 1.5, 2);
    lookAtSmooth.current.set(0, 1.5, 2);
    camera.lookAt(lookAtTarget.current);

    const startDelay = gsap.delayedCall(1, () => playNextShot());
    return () => {
      startDelay.kill();
      if (tweenRef.current) tweenRef.current.kill();
    };
  }, [camera, playNextShot]);

  // Every frame: smooth lookAt + very subtle micro-sway (professional handheld feel)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Very subtle sway — just enough to feel alive, not distracting
    const swayX = Math.sin(t * 0.8) * 0.008 + Math.sin(t * 2.1) * 0.004;
    const swayY = Math.cos(t * 0.7) * 0.006 + Math.sin(t * 1.9) * 0.003;
    camera.position.x += swayX;
    camera.position.y += swayY;

    // Smooth lookAt interpolation
    lookAtSmooth.current.lerp(lookAtTarget.current, 0.06);
    camera.lookAt(lookAtSmooth.current);
  });

  return null;
}

/** Static GLB prop — loads model, applies scale, no animations */
function StaticProp({ glbPath, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: {
  glbPath: string; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number;
}) {
  const { scene } = useGLTF(glbPath);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    cloned.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material instanceof MeshStandardMaterial) {
          o.material.envMapIntensity = 1.5;
        }
      }
    });
  }, [cloned]);

  return (
    <primitive object={cloned} position={position} rotation={rotation} scale={scale} />
  );
}

/** Modelo animado dentro de un portal — usa AnimationMixer manual en vez de useAnimations
 *  para funcionar dentro del createPortal de MeshPortalMaterial. */
function PortalModel({ glb, scale: s = 1, position: p = [0, 0, 0] as [number, number, number], anim, timeScale = 1 }: {
  glb: string; scale?: number; position?: [number, number, number];
  anim?: string; timeScale?: number;
}) {
  const { scene, animations } = useGLTF(glb);
  const mixerRef = useRef<AnimationMixer | null>(null);

  // Mejorar materiales
  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.envMapIntensity = 1.5;
      }
    });
  }, [scene]);

  // Crear mixer y reproducir animación directamente sobre la escena original
  useEffect(() => {
    if (animations.length === 0) return;
    const mixer = new AnimationMixer(scene);
    mixerRef.current = mixer;

    const clipNames = animations.map((c) => c.name);
    const target = anim && clipNames.includes(anim) ? anim : clipNames[0];
    const clip = animations.find((c) => c.name === target);
    if (clip) {
      const action = mixer.clipAction(clip);
      action.timeScale = timeScale;
      action.play();
    }

    return () => { mixer.stopAllAction(); mixerRef.current = null; };
  }, [scene, animations, anim, timeScale]);

  // Actualizar mixer cada frame (funciona dentro del portal de RenderTexture)
  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return (
    <primitive object={scene} scale={s} position={p} />
  );
}

/** Portal card — un plano con MeshPortalMaterial que muestra un mundo 3D dentro. */
function PortalCard({ glb, bgColor, width = 2.8, height = 1.6, modelScale = 1, modelPos = [0, 0, -2] as [number, number, number], anim, timeScale = 1, ...props }: {
  glb: string; bgColor: string; width?: number; height?: number;
  modelScale?: number; modelPos?: [number, number, number];
  anim?: string; timeScale?: number;
  position?: [number, number, number]; rotation?: [number, number, number];
}) {
  return (
    <group {...props}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <MeshPortalMaterial side={DoubleSide} blur={0} resolution={256} worldUnits>
          <color attach="background" args={[bgColor]} />
          <ambientLight intensity={1.5} />
          <directionalLight position={[3, 5, 4]} intensity={2.5} />
          <hemisphereLight color="#ffffff" groundColor="#333344" intensity={0.8} />
          <PortalModel glb={glb} scale={modelScale} position={modelPos} anim={anim} timeScale={timeScale} />
        </MeshPortalMaterial>
      </mesh>
    </group>
  );
}

/** Full song lyrics */
const SONG_LYRICS = `[Intro]
Feliz Valentín
Feliz Valentín
Tin tin tinnnnn
Tin tin tinnnnn

[Verse]
Cada día contigo
Es un regalo sin fin
Jugando Lolcito
Mi Valentínnnnn
pedimos algo de comer watonaaaaaaa
si waton, si watonnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn

[Pre-Chorus]
Felizzzzzz
Felizzzzzz
asi me teniiiiiiiii
asi me teniiiiiiiiiiiiiiiiii

[Chorus]
Feliz Valentín,
Eres todo para mí
Tin tin tinnnnn suena el corazón
Feliz 14 amor
Felizzzzzz
Tú eres mi Valentín
Felizzzzzz
No quiero otro fin

[Breakdown]
Tú, eres, mi, Valentín
Tú, eres, mi, Valentín
Tin tin tinnnnn
Feliz 14

[Verse 2]
Cada día contigo
Es un regalo sin fin
Jugando Lolcito
Mi Valentínnnnn
pedimos algo de comer watonaaaaaaa
si waton, si watonnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn

[Pre-Chorus]
Felizzzzzz
Felizzzzzz
asi me teniiiiiiiii
asi me teniiiiiiiiiiiiiiiiii

[Chorus]
Feliz Valentín,
Eres todo para mí
Tin tin tinnnnn suena el corazón
Feliz 14 amor,
Felizzzzzz
Tú eres mi Valentín
Felizzzzzz
No quiero otro fin

[Bridge]
Si dudas, mírame aquí
Si temes, te hago sentir
Que cada día es 14
Porque tú, eres mi Valentín

[Chorus]
Feliz Valentín,
Eres todo para mí
Tin tin tinnnnn suena el corazón
Feliz 14, mi amor, mi obsesión
Felizzzzzz
Siempre serás
Mi Valentínnnnn
Mi Valentínnnnn

[Outro]
Tin tin tinnnnn
Feliz Valentín
Tú eres mi Valentín
Felizzzzzz`;

/** Toggleable lyrics panel — slides from right, scrollable, with blur background */
function ConcertLyricsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="lyrics-panel"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(380px, 85vw)",
            zIndex: 20,
            background: "rgba(5, 0, 15, 0.75)",
            backdropFilter: "blur(24px)",
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "20px 24px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <span style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>
              Letra
            </span>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1, color: "rgba(255,255,255,0.9)" }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                fontSize: 20,
                lineHeight: 1,
                padding: "4px 8px",
              }}
            >
              ✕
            </motion.button>
          </div>

          {/* Scrollable lyrics */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px 40px",
            WebkitOverflowScrolling: "touch",
          }}>
            {SONG_LYRICS.split("\n").map((line, i) => {
              const isSection = line.startsWith("[") && line.endsWith("]");
              const isEmpty = line.trim() === "";
              if (isEmpty) return <div key={i} style={{ height: 16 }} />;
              return (
                <p
                  key={i}
                  style={{
                    margin: isSection ? "20px 0 8px" : "4px 0",
                    color: isSection ? "rgba(200, 150, 255, 0.6)" : "rgba(255, 255, 255, 0.85)",
                    fontSize: isSection ? 11 : 15,
                    fontWeight: isSection ? 700 : 400,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: isSection ? "0.15em" : "0.01em",
                    textTransform: isSection ? "uppercase" : "none",
                    lineHeight: 1.6,
                    textShadow: isSection ? "none" : "0 0 20px rgba(255,100,200,0.15)",
                  }}
                >
                  {line}
                </p>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ——— Audio-reactive system (Web Audio API) ———

/** Audio analyser data type */
type AnalyserData = { analyser: AnalyserNode; dataArray: Uint8Array<ArrayBuffer> };

/** Creates an AnalyserNode connected to an HTMLAudioElement.
 *  Returns the analyser and a Uint8Array for frequency data. */
function createAudioAnalyser(audio: HTMLAudioElement): AnalyserData & { ctx: AudioContext } {
  const ctx = new AudioContext();
  const src = ctx.createMediaElementSource(audio);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  src.connect(analyser);
  analyser.connect(ctx.destination);
  const dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
  return { analyser, dataArray, ctx };
}

/** Audio-reactive shader sphere — vertex displacement + color shift driven by frequency data */
const AUDIO_SPHERE_VERT = /* glsl */ `
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uTime;
varying vec3 vNormal;
varying float vDisplacement;

// Simplex-like noise for organic deformation
vec3 mod289v(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289v4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permutev(vec4 x){return mod289v4(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrtv(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise3(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289v(i);
  vec4 p=permutev(permutev(permutev(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrtv(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main() {
  vNormal = normal;
  float noise = snoise3(normal * 2.0 + uTime * 0.4);
  float disp = noise * (0.1 + uBass * 0.5) + uMid * 0.2 * sin(position.y * 4.0 + uTime) + uTreble * 0.15 * cos(position.x * 6.0 + uTime * 1.5);
  vDisplacement = disp;
  vec3 newPos = position + normal * disp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}`;

const AUDIO_SPHERE_FRAG = /* glsl */ `
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uTime;
varying vec3 vNormal;
varying float vDisplacement;

void main() {
  // Color shifts based on audio bands
  vec3 baseColor = vec3(0.3, 0.05, 0.5);
  vec3 bassColor = vec3(1.0, 0.1, 0.3) * uBass;
  vec3 midColor = vec3(0.2, 0.4, 1.0) * uMid;
  vec3 trebleColor = vec3(0.8, 0.2, 1.0) * uTreble;
  vec3 col = baseColor + bassColor + midColor + trebleColor;
  // Fresnel glow
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
  col += fresnel * vec3(0.4, 0.1, 0.8) * (0.5 + uBass * 0.5);
  // Displacement brightness
  col += vDisplacement * 0.3;
  float alpha = 0.7 + fresnel * 0.3;
  gl_FragColor = vec4(col, alpha);
}`;

/** Audio-reactive sphere placed in the 3D scene.
 *  Reads frequency data from a shared Uint8Array ref each frame. */
function AudioReactiveSphere({ analyserData, position = [0, 4, -6] as [number, number, number], radius = 1.5 }: {
  analyserData: React.RefObject<AnalyserData | null>;
  position?: [number, number, number];
  radius?: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);

  useFrame(({ clock }) => {
    const mat = matRef.current;
    const data = analyserData.current;
    if (!mat) return;

    mat.uniforms.uTime.value = clock.getElapsedTime();

    if (data) {
      data.analyser.getByteFrequencyData(data.dataArray);
      const len = data.dataArray.length;
      // Split into 3 bands: bass (0-15%), mid (15-50%), treble (50-100%)
      const bassEnd = Math.floor(len * 0.15);
      const midEnd = Math.floor(len * 0.5);
      let bass = 0, mid = 0, treble = 0;
      for (let i = 0; i < bassEnd; i++) bass += data.dataArray[i];
      for (let i = bassEnd; i < midEnd; i++) mid += data.dataArray[i];
      for (let i = midEnd; i < len; i++) treble += data.dataArray[i];
      bass = bass / (bassEnd * 255);
      mid = mid / ((midEnd - bassEnd) * 255);
      treble = treble / ((len - midEnd) * 255);
      // Smooth lerp
      mat.uniforms.uBass.value += (bass - mat.uniforms.uBass.value) * 0.15;
      mat.uniforms.uMid.value += (mid - mat.uniforms.uMid.value) * 0.12;
      mat.uniforms.uTreble.value += (treble - mat.uniforms.uTreble.value) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[radius, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={AUDIO_SPHERE_VERT}
        fragmentShader={AUDIO_SPHERE_FRAG}
        uniforms={{
          uBass: { value: 0 },
          uMid: { value: 0 },
          uTreble: { value: 0 },
          uTime: { value: 0 },
        }}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

/** Full concert 3D scene with band, stage, instruments, lights, fire, and choreographed camera */
function PentakillConcertScene({ analyserData }: { analyserData: React.RefObject<AnalyserData | null> }) {
  return (
    <>
      <color attach="background" args={["#050008"]} />
      <fog attach="fog" args={["#0a0010", 8, 40]} />
      <Environment preset="night" />
      {/* Luz principal con sombras */}
      <directionalLight
        castShadow
        position={[5, 15, 10]}
        intensity={1.2}
        color="#ccbbff"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.001}
      />

      {/* Concert stage */}
      <StaticProp glbPath={CONCERT_STAGE_GLB} position={[0, -6, -5]} scale={1} />

      {/* Todos los band members — sin física, directo en su posición */}
      {BAND_MEMBERS.map((m) => (
        <PentakillModel
          key={m.name}
          glbPath={m.glb}
          position={m.pos}
          rotation={m.rot}
          scale={m.scale}
          anims={m.anims}
          timeScale={m.timeScale}
        />
      ))}

      {/* Portal cards — pantallas grandes detrás de los músicos */}
      <PortalCard
        glb={BARON_GLB}
        bgColor="#000000"
        position={[-21.6, 0.5, 4.4]}
        rotation={[0, 0, 0]}
        width={11}
        height={13}
        modelScale={0.015}
        modelPos={[-22, -5, 0]}
        anim="Dance_Loop"
        timeScale={0.1}
      />
      <PortalCard
        glb={DRAGON_ELDER_GLB}
        bgColor="#000000"
        position={[21.6, 0.5, 4.4]}
        rotation={[0, 0, 0]}
        width={11}
        height={13}
        modelScale={0.05}
        modelPos={[22, -9, 0]}
        anim="Run"
        timeScale={0.1}
      />

      {/* Instruments — static, placed on the stage */}
      <StaticProp glbPath={DRUM_SET_GLB} position={[10, -1.45, -9.5]} rotation={[0, -0.4, 0]} scale={2} />
      <StaticProp glbPath={GUITAR_AMP_GLB} position={[-5, -3, -1]} rotation={[0, 0.4, 0]} scale={4} />

      {/* Fire anchored to camera — always visible from below in every shot */}
      {/* <CameraFire offset={[0, -10, -20]} scale={10} /> */}

      {/* <Fire position={[0, 0, 0]} scale={10} billboard /> */}
      {/* Concert lighting */}
      <ConcertLights />

      {/* Camera choreography */}
      <ConcertCameraChoreography />
    </>
  );
}

/** Pentakill Concert wrapper — manages Canvas, audio analyser, lyrics panel, and back button */
const PentakillConcert = memo(function PentakillConcert({ onBack }: { onBack: () => void }) {
  const isMobile = useIsMobile();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserData = useRef<AnalyserData | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);

  // Audio lifecycle + Web Audio analyser
  useEffect(() => {
    const audio = new Audio(CONCERT_MUSIC_SRC);
    audio.crossOrigin = "anonymous";
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
    audio.play().catch(() => { /* autoplay blocked */ });
    gsap.to(audio, { volume: 0.5, duration: 2, ease: "power2.out" });

    // Create analyser once audio is playing
    const setupAnalyser = () => {
      try {
        const { analyser, dataArray } = createAudioAnalyser(audio);
        analyserData.current = { analyser, dataArray };
      } catch { /* AudioContext may fail in some environments */ }
    };
    audio.addEventListener("playing", setupAnalyser, { once: true });

    return () => {
      audio.removeEventListener("playing", setupAnalyser);
      gsap.to(audio, {
        volume: 0, duration: 0.8, ease: "power2.in",
        onComplete: () => { audio.pause(); audio.src = ""; },
      });
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#000" }}>
      <Canvas
        shadows
        camera={{ position: [0, 3, 30], fov: isMobile ? 75 : 60, near: 0.1, far: 100 }}
        style={{ width: "100%", height: "100%" }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        gl={{ antialias: !isMobile, alpha: false, powerPreference: "high-performance" }}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <PentakillConcertScene analyserData={analyserData} />
        </Suspense>

        <OrbitControls enableZoom enablePan />
        {/* <ambientLight intensity={100} /> */}
      </Canvas>

      {/* Lyrics panel (slides from right) */}
      <ConcertLyricsPanel open={showLyrics} onClose={() => setShowLyrics(false)} />

      {/* Top-left: Back button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
        whileHover={{ scale: 1.05, background: "rgba(255,255,255,0.1)" }}
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        style={{
          position: "absolute",
          top: isMobile ? 16 : 24,
          left: isMobile ? 16 : 24,
          zIndex: 10,
          padding: "8px 20px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 8,
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: "0.05em",
          backdropFilter: "blur(12px)",
          transition: "background 0.2s",
        }}
      >
        ← Volver
      </motion.button>

      {/* Top-right: Lyrics toggle button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 0.8 }}
        whileHover={{ scale: 1.05, background: "rgba(160,32,240,0.15)" }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowLyrics((v) => !v)}
        style={{
          position: "absolute",
          top: isMobile ? 16 : 24,
          right: isMobile ? 16 : 24,
          zIndex: 25,
          padding: "8px 20px",
          background: showLyrics ? "rgba(160,32,240,0.2)" : "rgba(255,255,255,0.06)",
          border: showLyrics ? "1px solid rgba(160,32,240,0.4)" : "1px solid rgba(255,255,255,0.15)",
          borderRadius: 8,
          color: showLyrics ? "rgba(200,150,255,0.9)" : "rgba(255,255,255,0.6)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: "0.05em",
          backdropFilter: "blur(12px)",
          transition: "all 0.3s",
        }}
      >
        {showLyrics ? "Ocultar Letra" : "Ver Letra"}
      </motion.button>
    </div>
  );
});

// ——————————————————————————————————————————————
//  UI: Together Modal — "Me elegiste"
// ——————————————————————————————————————————————

const TogetherModal = memo(function TogetherModal({ onRestart, onStartConcert }: { onRestart: () => void; onStartConcert?: () => void }) {
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

// ——————————————————————————————————————————————
//  UI: Alone Modal — "Caminos diferentes"
// ——————————————————————————————————————————————

const AloneModal = memo(function AloneModal({ onRestart }: { onRestart: () => void }) {
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

function PresenterScreen({ onComplete, onConcert }: { onComplete: (selectedCrab: "purple" | "green") => void; onConcert?: () => void }) {
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
          {/* Concert shortcut */}
          {onConcert && (
            <motion.button
              onClick={onConcert}
              style={{
                padding: "6px 18px",
                background: "rgba(160, 32, 240, 0.1)",
                border: "1px solid rgba(160, 32, 240, 0.25)",
                borderRadius: 8,
                color: "rgba(200, 150, 255, 0.6)",
                cursor: "pointer", fontSize: 12, fontWeight: 500,
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: "0.08em",
                transition: "all 0.3s",
              }}
              whileHover={{ backgroundColor: "rgba(160,32,240,0.2)", color: "rgba(200,150,255,0.9)" }}
              whileTap={{ scale: 0.95 }}
            >
              Concierto
            </motion.button>
          )}

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
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: isMobile ? "end" : "center",
              justifyContent: isMobile ? "center" : "center",
              pointerEvents: "none",
              zIndex: 10,
              paddingBottom: isMobile ? "20px" : "0",
              paddingTop: isMobile ? "0" : "15vh",
              paddingRight: isMobile ? "0" : "0",
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
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: isMobile ? "end" : "center",
              justifyContent: isMobile ? "center" : "center",
              pointerEvents: "none",
              zIndex: 10,
              paddingBottom: isMobile ? "20px" : "0",
              paddingTop: isMobile ? "0" : "15vh",
              paddingRight: isMobile ? "0" : "0",
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

      {/* Debug panel for presenter — press P */}
      <PresenterDebugPanel />
    </div>
  );
}

// ——————————————————————————————————————————————
//  PAGE: Valentine
// ——————————————————————————————————————————————

const TOTAL_STEPS = 4;

type GamePhase = "loading" | "audioConsent" | "presenter" | "transition" | "game" | "concert";

export default function Valentine() {
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [selectedCrab, setSelectedCrab] = useState<"purple" | "green">("purple");
  const [fadeOut, setFadeOut] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [prevPhase, setPrevPhase] = useState<GamePhase>("loading");

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
      audioRef.current.play().catch(() => { });
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
      gsap.to(audioRef.current, {
        volume: 0, duration: 1.5, ease: "power2.in", onComplete: () => {
          audioRef.current?.pause();
        }
      });
    }
    setTimeout(() => {
      setPhase("transition");
      setFadeOut(false);
    }, 800);
  }, [audioEnabled]);

  // Go directly to concert from presenter
  const handleDirectConcert = useCallback(() => {
    // Fade out presenter music
    if (audioRef.current && audioEnabled) {
      gsap.to(audioRef.current, { volume: 0, duration: 0.8, ease: "power2.in", onComplete: () => { audioRef.current?.pause(); } });
    }
    setFadeOut(true);
    setTimeout(() => {
      setPrevPhase(phase);
      setPhase("concert");
      setFadeOut(false);
    }, 800);
  }, [audioEnabled, phase]);

  // Leave concert, go back to presenter
  const handleLeaveConcertDirect = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => {
      setPhase(prevPhase === "presenter" ? "presenter" : "presenter");
      setFadeOut(false);
      // Resume presenter music
      if (audioRef.current && audioEnabled) {
        audioRef.current.play().catch(() => { });
        gsap.to(audioRef.current, { volume: 0.35, duration: 1.5, ease: "power2.out" });
      }
    }, 800);
  }, [prevPhase, audioEnabled]);

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
          <PresenterScreen onComplete={handlePresenterComplete} onConcert={handleDirectConcert} />
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

      {/* Concert — direct access from presenter */}
      {phase === "concert" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: fadeOut ? 0 : 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0, zIndex: 200 }}
        >
          <PentakillConcert onBack={handleLeaveConcertDirect} />
        </motion.div>
      )}
    </div>
  );
}

function ValentineGame({ crabGlb, crabMinimapImg }: { crabGlb: string; crabMinimapImg: string }) {
  const isMobile = useIsMobile();
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
  const [blackOverlay, setBlackOverlay] = useState(false);
  const [showConcert, setShowConcert] = useState(false);

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
    const edgeColor = choice === "A" ? "#ff6b9d" : "#4a6fa5";

    // Batch all state updates into ONE React render pass
    unstable_batchedUpdates(() => {
      if (option.together) setTogetherScore((prev) => prev + 1);
      setShowQuestion(false);
      setStep((s) => s + 1);
      setStepColors((prev) => [...prev, edgeColor]);
      setVisitedNodes((prev) => new Set(prev).add(nextId));
      setAnsweredNodes((prev) => { const n = new Map(prev); n.set(currentNodeId, edgeColor); return n; });
      setTraversedEdges((prev) => { const next = new Map(prev); next.set(`${currentNodeId}->${nextId}`, edgeColor); return next; });
      const otherOption = choice === "A" ? node.optionB : node.optionA;
      if (otherOption.next !== nextId) setDestroyedNodes((prev) => new Set(prev).add(otherOption.next));
    });

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
    // Phase 1: Fade to black (covers everything)
    setBlackOverlay(true);

    // Phase 2: After screen is fully black, reset all game state
    setTimeout(() => {
      unstable_batchedUpdates(() => {
        setShowResults(false);
        setShowAshe(false);
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
      });

      // Phase 3: Wait for modal exit animation (0.8s) to fully complete,
      // then fade from black so the card is no longer visible behind the overlay
      setTimeout(() => {
        setBlackOverlay(false);
      }, 1000);
    }, 900);
  }, []);

  const handleStartConcert = useCallback(() => {
    setBlackOverlay(true);
    setTimeout(() => {
      setShowResults(false);
      setShowConcert(true);
      setTimeout(() => { setBlackOverlay(false); }, 400);
    }, 900);
  }, []);

  const handleLeaveConcert = useCallback(() => {
    setBlackOverlay(true);
    setTimeout(() => {
      setShowConcert(false);
      setShowResults(true);
      setTimeout(() => { setBlackOverlay(false); }, 400);
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
        camera={{ position: [0, 1.5, 6], fov: isMobile ? 70 : 60, near: 0.1, far: 150 }}
        style={{ width: "100%", height: "100%" }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        gl={{ antialias: !isMobile, alpha: false, powerPreference: "high-performance" }}
        performance={{ min: 0.5 }}
        onCreated={({ gl }) => {
          // Handle WebGL context loss gracefully
          const canvas = gl.domElement;
          canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault(); // Allow automatic recovery
            console.warn("WebGL context lost — will attempt restore");
          });
          canvas.addEventListener("webglcontextrestored", () => {
            console.info("WebGL context restored");
          });
        }}
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
            isMobile={isMobile}
            showResults={showResults}
            choseTogether={choseTogether}
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

      {/* Debug Panels — only in development. D: animations, T: tower meshes */}
      {import.meta.env.DEV && <AnimDebugPanel />}
      {import.meta.env.DEV && <TowerDebugPanel />}

      {/* Result modals */}
      <AnimatePresence>
        {showResults && choseTogether && (
          <TogetherModal key="together" onRestart={handleRestart} onStartConcert={handleStartConcert} />
        )}
        {showResults && !choseTogether && (
          <AloneModal
            key="alone"
            onRestart={handleRestart}
          />
        )}
      </AnimatePresence>

      {/* Pentakill Concert experience */}
      {showConcert && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100 }}>
          <PentakillConcert onBack={handleLeaveConcert} />
        </div>
      )}

      {/* Black overlay for transitions — always mounted, opacity animated */}
      <motion.div
        animate={{ opacity: blackOverlay ? 1 : 0 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: 0,
          background: "#000000",
          zIndex: 200,
          pointerEvents: blackOverlay ? "all" : "none",
        }}
      />

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
useGLTF.preload(PENTAKILL_KARTHUS);
useGLTF.preload(PENTAKILL_MORDEKAISER);
useGLTF.preload(PENTAKILL_OLAF);
useGLTF.preload(PENTAKILL_SONA);
useGLTF.preload(PENTAKILL_YORICK);
useGLTF.preload(COVEN_NAMI);
useGLTF.preload(CONCERT_STAGE_GLB);
useGLTF.preload(DRUM_SET_GLB);
useGLTF.preload(GUITAR_AMP_GLB);
useGLTF.preload(BARON_GLB);
useGLTF.preload(DRAGON_ELDER_GLB);
useGLTF.preload(SPOT_LIGHT_GLB);