"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF, Clone, Environment, MeshReflectorMaterial, OrbitControls } from "@react-three/drei";
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { unstable_batchedUpdates } from "react-dom";
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
import {
  type QuestionNode,
  type ConnectionData,
  QUESTIONS,
  TIEBREAKER,
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
  NODE_COLOR_MAP,
  getNodeGlb,
  getConnections,
} from "./data";
// Lazy-load concert — only fetched when the user actually reaches it
const PentakillConcert = lazy(() =>
  import("./concert").then(m => ({ default: m.PentakillConcert }))
);
import {
  cleanAnimations,
  useIsMobile,
  getHiddenTowerMeshes,
  useTowerMeshUpdates,
  PresenterReflectiveFloor,
  QuestionOverlay,
  Minimap,
  AnimDebugPanel,
  TowerDebugPanel,
  TogetherModal,
  AloneModal,
} from "./helpers";

export function NodeModel({ position, isActive, isEnd, glbPath, crabHere, destroyed, answered }: {
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
/** Nexus model for end node  plays idle animation, reacts to result choice */
export function NexusModel({ position, isActive, showResults = false, choseTogether = false }: {
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

  // React to result choice  or restore initial state when results are dismissed
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

/** Loot Goblin  fades in when node is answered.
 *  NOTE: Animations are disabled for this model because the GLB's bone hierarchy
 *  (Root, Stick, Body, Head, Hat, Weapon, Feathers, Buffbone_*) doesn't match the
 *  exported mesh scene graph, causing massive PropertyBinding warning spam. */
export function LootGoblinModel({ position, show }: { position: [number, number, number]; show: boolean }) {
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
 *  This prevents the crab from overlapping the tower model  it "enters"
 *  from behind and "exits" in front, like walking around the structure. */
const NODE_APPROACH_OFFSET = 2.2;

/** Scuttle Crab companion  walks from node to node with idle/run animations.
 *  Orientation follows the curve tangent in full 3D (roller-coaster style):
 *  the crab pitches up on ascents, pitches down on descents, and always
 *  faces along the direction of travel. */
export function ScuttleCrabCompanion({ activeNodeId, onNodeReached, glbPath }: { activeNodeId: string; onNodeReached: (nodeId: string) => void; glbPath: string }) {
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

  // â”€â”€ Orientation: when moving → lookAt along tangent; when stopped → slerp to level â”€â”€
  const isMovingRef = useRef(false);
  const idleQuatTarget = useRef(new Quaternion());

  // â”€â”€ Opacity system â”€â”€
  const crabOpacity = useRef(1);
  const applyCrabOpacity = useCallback((op: number) => {
    crabOpacity.current = op;
    scene.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.opacity = op;
      }
    });
  }, [scene]);

  // Scale only  lookAt handles orientation, no manual rotation needed
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

  // â”€â”€ Helper: orient the group so its -Z faces `lookPoint` (full 3D, roller-coaster) â”€â”€
  const orientAlongCurve = useCallback((grp: Group, curvePoint: Vector3, tangent: Vector3) => {
    // lookAt a point slightly ahead along the tangent
    const lookTarget = curvePoint.clone().add(tangent);
    grp.lookAt(lookTarget);
  }, []);

  // â”€â”€ Move to active node â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Curve trimming â”€â”€
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

    // â”€â”€ GSAP timeline â”€â”€
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

    // Phase 4: Run along the curve  full 3D orientation via lookAt
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

/** Connection tube  starts dark, lights up with path color when traversed */
export const ConnectionTube = memo(function ConnectionTube({ from, to, color, traversed }: { from: [number, number, number]; to: [number, number, number]; color: string; traversed: boolean }) {
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
export function BackgroundParticles({ count = 300 }: { count?: number }) {
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

/** Pulse rings  color follows winning side */
export function PulseRings({ position, winningColor }: { position: [number, number, number]; winningColor: string }) {
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

// 
//  Shared 3D helpers
// 

// PresenterReflectiveFloor is in helpers.tsx (shared with PresenterScreen)


/** Smooth fade for neural network group */
export function NeuralNetworkFade({ visible, children }: { visible: boolean; children: ReactNode }) {
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
export function NeuralNetworkScene({
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

  // Reusable vector for lookAt  avoids GC pressure from allocating every frame
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
    return "#b070d0"; // tied  purple mix
  }, [togetherScore, step]);

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 15, 80]} />
      <Environment preset="apartment" />
      <ambientLight intensity={0.3} color="#ff6b9d" />
      <pointLight position={[0, 10, 5]} intensity={20} color="#ff6b9d" distance={50} />
      <pointLight position={[-10, -5, -20]} intensity={12} color="#ff3366" distance={50} />

      {/* Neural network elements  fade out at the end (except Nexus which stays) */}
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

      {/* End node  Nexus stays visible even during results, reacts to result choice */}
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


// 

export function ValentineGame({ crabGlb, crabMinimapImg }: { crabGlb: string; crabMinimapImg: string }) {
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
        // Tied  show tiebreaker
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
            console.warn("WebGL context lost  will attempt restore");
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

      {/* Debug Panels  only in development. D: animations, T: tower meshes */}
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

      {/* Pentakill Concert experience — lazy-loaded only when needed */}
      {showConcert && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100 }}>
          <Suspense fallback={null}>
            <PentakillConcert onBack={handleLeaveConcert} />
          </Suspense>
        </div>
      )}

      {/* Black overlay for transitions  always mounted, opacity animated */}
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

