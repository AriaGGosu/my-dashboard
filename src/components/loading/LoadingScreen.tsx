import { useEffect, useState, useRef, Suspense } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { LoadingManager, TextureLoader } from "three";
import WireframeIcon from "./WireframeIcon";
import WireframeGlowIcon from "./WireframeGlowIcon";
import WireframeIcoIcon from "./WireframeIcoIcon";
import WireframeOctIcon from "./WireframeOctIcon";
import ScrambleText from "./ScrambleText";

/** Recursos que usa la landing "/" — la barra refleja la carga real de estos. */
const LANDING_ASSETS = {
  kamdo: "/s2wt_kamdo_industrial_divinities-transformed.glb",
  diamond: "/diamond.glb",
  aboutImage: "/building.jpeg",
};

type LoadingScreenProps = {
  onComplete: () => void;
};

const CornerPlus = ({ className = "" }: { className?: string }) => (
  <span className={`absolute w-[10px] h-[10px] z-20 pointer-events-none ${className}`}>
    <span className="absolute inset-y-1/2 left-0 right-0 h-[1px] bg-[#EAEAEA] -translate-y-1/2" />
    <span className="absolute inset-x-1/2 top-0 bottom-0 w-[1px] bg-[#EAEAEA] -translate-x-1/2" />
  </span>
);

const COLS = 12;
const ROWS = 5;
const STEP = 2;
const MAX_COL = COLS - STEP;  // 10 - posición máxima para caja 2x2
const MAX_ROW = ROWS - STEP;  // 3
const COL_PCT = 100 / COLS;
const ROW_PCT = 100 / ROWS;
const BOX_WIDTH = COL_PCT * STEP;
const BOX_HEIGHT = ROW_PCT * STEP;
const STEP_DURATION = 0.48;
const PAUSE_BETWEEN_MOVES = 350;
const GAP_PCT = 0.8; // espacio entre cards

type Direction = "right" | "left" | "down" | "up";

type CardZone = { minCol: number; maxCol: number; minRow: number; maxRow: number };

const CARD_CONFIGS = [
  { id: 0, startCol: 0, startRow: 0, zone: { minCol: 0, maxCol: 4, minRow: 0, maxRow: 1 }, label: "INIT MODULE" },
  { id: 1, startCol: 10, startRow: 0, zone: { minCol: 6, maxCol: 10, minRow: 0, maxRow: 1 }, label: "TORUS KNOT v2" },
  { id: 2, startCol: 0, startRow: 3, zone: { minCol: 0, maxCol: 4, minRow: 2, maxRow: 3 }, label: "ICOSPHERE MESH" },
  { id: 3, startCol: 10, startRow: 3, zone: { minCol: 6, maxCol: 10, minRow: 2, maxRow: 3 }, label: "OCTAHEDRON" },
] as const;

function wouldOverlap(
  col: number,
  row: number,
  excludeId: number,
  allPos: { col: number; row: number }[]
): boolean {
  const half = GAP_PCT / 2;
  const ax1 = col * COL_PCT + half;
  const ay1 = row * ROW_PCT + half;
  const ax2 = (col + STEP) * COL_PCT - half;
  const ay2 = (row + STEP) * ROW_PCT - half;
  for (let i = 0; i < allPos.length; i++) {
    if (i === excludeId) continue;
    const { col: oc, row: or } = allPos[i];
    const bx1 = oc * COL_PCT + half;
    const by1 = or * ROW_PCT + half;
    const bx2 = (oc + STEP) * COL_PCT - half;
    const by2 = (or + STEP) * ROW_PCT - half;
    if (ax2 > bx1 && ax1 < bx2 && ay2 > by1 && ay1 < by2) return true;
  }
  return false;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const hasCalledComplete = useRef(false);
  const boxRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const tlRefs = useRef<(gsap.core.Timeline | null)[]>([null, null, null, null]);
  const posRefs = useRef([
    { col: 0, row: 0 },
    { col: MAX_COL, row: 0 },
    { col: 0, row: MAX_ROW },
    { col: MAX_COL, row: MAX_ROW },
  ]);
  const pauseTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>([null, null, null, null]);
  const startTimeRef = useRef(Date.now());
  const isExitingRef = useRef(false);
  const MIN_DISPLAY_MS = 1800;

  // Sincronizar con progreso real al cargar
  useEffect(() => {
    if (modelLoaded) setProgress(100);
  }, [modelLoaded]);

  isExitingRef.current = isExiting;

  // Carga real de los recursos de la landing "/" — progress 0→100 según lo cargado
  useEffect(() => {
    const manager = new LoadingManager();
    manager.onProgress = (_url, loaded, total) => {
      if (total > 0) {
        const pct = Math.min(100, Math.floor((loaded / total) * 100));
        setProgress(pct);
      }
    };
    manager.onLoad = () => {
      setProgress(100);
      setModelLoaded(true);
    };

    const gltfLoader = new GLTFLoader(manager);
    const textureLoader = new TextureLoader(manager);

    gltfLoader.load(LANDING_ASSETS.kamdo, () => {});
    gltfLoader.load(LANDING_ASSETS.diamond, () => {});
    textureLoader.load(LANDING_ASSETS.aboutImage, () => {});
  }, []);

  useEffect(() => {
    if (!modelLoaded) return;
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    const timer = setTimeout(() => {
      pauseTimers.current.forEach((t) => t && clearTimeout(t));
      tlRefs.current.forEach((tl) => tl?.kill());
      setIsExiting(true);
    }, remaining + 600);
    return () => clearTimeout(timer);
  }, [modelLoaded]);

  // 4 cards: esquinas tipo Tetris (no se tocan). Blink blanco entre movimientos.
  useEffect(() => {
    const boxes = boxRefs.current;
    if (boxes.some((b) => !b)) return;

    const half = GAP_PCT / 2;
    CARD_CONFIGS.forEach((cfg, i) => {
      gsap.set(boxes[i]!, {
        left: `${cfg.startCol * COL_PCT + half}%`,
        top: `${cfg.startRow * ROW_PCT + half}%`,
        width: `${BOX_WIDTH - GAP_PCT}%`,
        height: `${BOX_HEIGHT - GAP_PCT}%`,
      });
    });

    const getNewPos = (col: number, row: number, dir: Direction, zone: CardZone): { col: number; row: number } => {
      switch (dir) {
        case "right": return { col: Math.min(col + STEP, zone.maxCol), row };
        case "left": return { col: Math.max(col - STEP, zone.minCol), row };
        case "down": return { col, row: Math.min(row + STEP, zone.maxRow) };
        case "up": return { col, row: Math.max(row - STEP, zone.minRow) };
      }
    };

    const getDirsInZone = (col: number, row: number, zone: CardZone): Direction[] => {
      const dirs: Direction[] = [];
      if (col + STEP <= zone.maxCol) dirs.push("right");
      if (col - STEP >= zone.minCol) dirs.push("left");
      if (row + STEP <= zone.maxRow) dirs.push("down");
      if (row - STEP >= zone.minRow) dirs.push("up");
      return dirs;
    };

    const getDirsWithoutCollision = (cardId: number): Direction[] => {
      const cfg = CARD_CONFIGS[cardId];
      const { col, row } = posRefs.current[cardId];
      const zoneDirs = getDirsInZone(col, row, cfg.zone);
      const safe: Direction[] = [];
      for (const dir of zoneDirs) {
        const { col: nc, row: nr } = getNewPos(col, row, dir, cfg.zone);
        if (!wouldOverlap(nc, nr, cardId, posRefs.current)) safe.push(dir);
      }
      return safe;
    };

    const scheduleNext = (cardId: number) => {
      if (isExitingRef.current) return;
      const dirs = getDirsWithoutCollision(cardId);
      const next = dirs.length > 0 ? dirs[Math.floor(Math.random() * dirs.length)] : "right";
      const doCrawl = () => crawl(next, cardId);

      const box = boxes[cardId]!;
      const overlay = box.querySelector<HTMLElement>("[data-blink]");
      if (overlay) {
        overlay.style.opacity = "0";
        gsap.to(overlay, {
          opacity: 0.35,
          duration: 0.06,
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            pauseTimers.current[cardId] = setTimeout(doCrawl, PAUSE_BETWEEN_MOVES);
          },
        });
      } else {
        pauseTimers.current[cardId] = setTimeout(doCrawl, PAUSE_BETWEEN_MOVES);
      }
    };

    const crawl = (direction: Direction, cardId: number) => {
      if (isExitingRef.current) return;
      const cfg = CARD_CONFIGS[cardId];
      const targetBox = boxes[cardId]!;
      let { col, row } = posRefs.current[cardId];
      col = Math.max(cfg.zone.minCol, Math.min(cfg.zone.maxCol, col));
      row = Math.max(cfg.zone.minRow, Math.min(cfg.zone.maxRow, row));
      posRefs.current[cardId] = { col, row };

      const ease = "power1.out";
      const tl = gsap.timeline({ onComplete: () => scheduleNext(cardId) });

      const half = GAP_PCT / 2;
      switch (direction) {
        case "right": {
          const newCol = Math.min(col + STEP, cfg.zone.maxCol);
          tl.to(targetBox, { width: `${(BOX_WIDTH * 2) - GAP_PCT}%`, duration: STEP_DURATION, ease });
          tl.to(targetBox, { left: `${newCol * COL_PCT + half}%`, width: `${BOX_WIDTH - GAP_PCT}%`, duration: STEP_DURATION, ease });
          posRefs.current[cardId] = { col: newCol, row };
          break;
        }
        case "left": {
          const newCol = Math.max(col - STEP, cfg.zone.minCol);
          tl.to(targetBox, { left: `${newCol * COL_PCT + half}%`, width: `${(BOX_WIDTH * 2) - GAP_PCT}%`, duration: STEP_DURATION, ease });
          tl.to(targetBox, { width: `${BOX_WIDTH - GAP_PCT}%`, duration: STEP_DURATION, ease });
          posRefs.current[cardId] = { col: newCol, row };
          break;
        }
        case "down": {
          const newRow = Math.min(row + STEP, cfg.zone.maxRow);
          tl.to(targetBox, { height: `${(BOX_HEIGHT * 2) - GAP_PCT}%`, duration: STEP_DURATION, ease });
          tl.to(targetBox, { top: `${newRow * ROW_PCT + half}%`, height: `${BOX_HEIGHT - GAP_PCT}%`, duration: STEP_DURATION, ease });
          posRefs.current[cardId] = { col, row: newRow };
          break;
        }
        case "up": {
          const newRow = Math.max(row - STEP, cfg.zone.minRow);
          tl.to(targetBox, { top: `${newRow * ROW_PCT + half}%`, height: `${(BOX_HEIGHT * 2) - GAP_PCT}%`, duration: STEP_DURATION, ease });
          tl.to(targetBox, { height: `${BOX_HEIGHT - GAP_PCT}%`, duration: STEP_DURATION, ease });
          posRefs.current[cardId] = { col, row: newRow };
          break;
        }
      }
      tlRefs.current[cardId] = tl;
    };

    const startDelays = [400, 800, 600, 1000];
    const startDirs: [Direction, Direction][] = [
      ["right", "down"],
      ["left", "down"],
      ["right", "up"],
      ["left", "up"],
    ];
    const timers = startDelays.map((delay, i) =>
      setTimeout(() => {
        const dirs = startDirs[i];
        crawl(dirs[Math.floor(Math.random() * 2)], i);
      }, delay)
    );

    return () => {
      timers.forEach(clearTimeout);
      pauseTimers.current.forEach((t) => t && clearTimeout(t));
      tlRefs.current.forEach((tl) => tl?.kill());
    };
  }, []);

  const handleExitComplete = () => {
    if (!hasCalledComplete.current) {
      hasCalledComplete.current = true;
      onComplete();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#070707]"
      initial={{ opacity: 1 }}
      animate={isExiting ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      onAnimationComplete={isExiting ? handleExitComplete : undefined}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute inset-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
            <defs>
              <pattern id="loading-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EAEAEA12" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#loading-grid)" />
          </svg>
        </div>

        <div className="relative h-[90vh] w-full max-w-[2229px] mx-auto overflow-hidden">
          <div
            ref={(el) => { boxRefs.current[0] = el; }}
            className="absolute flex items-center justify-center border border-[#EAEAEA20] bg-[#070707]/95 overflow-visible min-h-0"
          >
            <div data-blink className="absolute inset-0 bg-white pointer-events-none opacity-0 z-10" />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20 pointer-events-none">
              <span className="w-1.5 h-1.5 border border-[#EAEAEA60]" />
              <ScrambleText text={CARD_CONFIGS[0].label} className="test-font text-[8px] sm:text-[9px] text-[#EAEAEA80] tracking-widest" speed={0.09} repeat />
            </div>
            <CornerPlus className="-top-[0.5px] -left-[0.5px] -translate-x-1/2 -translate-y-1/2" />
            <CornerPlus className="-top-[0.5px] -right-[0.5px] translate-x-1/2 -translate-y-1/2" />
            <CornerPlus className="-bottom-[0.5px] -left-[0.5px] -translate-x-1/2 translate-y-1/2" />
            <CornerPlus className="-bottom-[0.5px] -right-[0.5px] translate-x-1/2 translate-y-1/2" />
            <div className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center">
              <motion.div
                className="absolute left-0 right-0 h-[1px] bg-[#EAEAEA30]"
                style={{ top: 0 }}
                animate={{ top: ["0%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8">
                <div className="relative flex flex-1 items-center justify-center min-h-[5rem] sm:min-h-[7rem] md:min-h-[9rem] w-full shrink-0">
                  {progress < 100 ? (
                    <>
                      <span className="absolute -left-2 top-0 bottom-0 w-px bg-[#EAEAEA40]" />
                      <span className="absolute -right-2 top-0 bottom-0 w-px bg-[#EAEAEA40]" />
                      <motion.span
                        key={progress}
                        className="test-font text-[#EAEAEA] text-3xl sm:text-5xl md:text-6xl lg:text-8xl tabular-nums font-medium"
                        initial={{ opacity: 0.9 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.08 }}
                      >
                        {progress}%
                      </motion.span>
                    </>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Suspense fallback={<span className="test-font text-[#EAEAEA]">...</span>}>
                        <WireframeIcon />
                      </Suspense>
                    </div>
                  )}
                </div>
                <div className="w-28 sm:w-36 h-[3px] border border-[#EAEAEA30] overflow-hidden bg-[#070707]">
                  <motion.div
                    className="h-full bg-[#EAEAEA]"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.12 }}
                  />
                </div>
                <span className="test-font text-[#EAEAEA] text-[10px] sm:text-xs opacity-70 tracking-[0.25em]">
                  INITIALIZING
                </span>
              </div>
            </div>
            <div className="absolute -inset-px border border-[#EAEAEA08] rounded-sm pointer-events-none" />
          </div>

          {/* Card 2 - top-right, torus wireframe */}
          <div
            ref={(el) => { boxRefs.current[1] = el; }}
            className="absolute flex items-center justify-center border border-[#EAEAEA20] bg-[#070707]/95 overflow-visible min-h-0"
          >
            <div data-blink className="absolute inset-0 bg-white pointer-events-none opacity-0 z-10" />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20 pointer-events-none">
              <span className="w-1.5 h-1.5 border border-[#EAEAEA60]" />
              <ScrambleText text={CARD_CONFIGS[1].label} className="test-font text-[8px] sm:text-[9px] text-[#EAEAEA80] tracking-widest" speed={0.09} repeat />
            </div>
            <CornerPlus className="-top-[0.5px] -left-[0.5px] -translate-x-1/2 -translate-y-1/2" />
            <CornerPlus className="-top-[0.5px] -right-[0.5px] translate-x-1/2 -translate-y-1/2" />
            <CornerPlus className="-bottom-[0.5px] -left-[0.5px] -translate-x-1/2 translate-y-1/2" />
            <CornerPlus className="-bottom-[0.5px] -right-[0.5px] translate-x-1/2 translate-y-1/2" />
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute left-0 right-0 h-[1px] bg-[#EAEAEA30]"
                style={{ top: 0 }}
                animate={{ top: ["0%", "100%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center gap-2 px-4 sm:px-6 w-full h-full">
                <Suspense fallback={<span className="test-font text-[#EAEAEA]">...</span>}>
                  <WireframeGlowIcon />
                </Suspense>
              </div>
            </div>
            <div className="absolute -inset-px border border-[#EAEAEA08] rounded-sm pointer-events-none" />
          </div>

          {/* Card 3 - bottom-left, icosahedron */}
          <div
            ref={(el) => { boxRefs.current[2] = el; }}
            className="absolute flex items-center justify-center border border-[#EAEAEA20] bg-[#070707]/95 overflow-visible min-h-0"
          >
            <div data-blink className="absolute inset-0 bg-white pointer-events-none opacity-0 z-10" />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20 pointer-events-none">
              <span className="w-1.5 h-1.5 border border-[#EAEAEA60]" />
              <ScrambleText text={CARD_CONFIGS[2].label} className="test-font text-[8px] sm:text-[9px] text-[#EAEAEA80] tracking-widest" speed={0.09} repeat />
            </div>
            <CornerPlus className="-top-[0.5px] -left-[0.5px] -translate-x-1/2 -translate-y-1/2" />
            <CornerPlus className="-top-[0.5px] -right-[0.5px] translate-x-1/2 -translate-y-1/2" />
            <CornerPlus className="-bottom-[0.5px] -left-[0.5px] -translate-x-1/2 translate-y-1/2" />
            <CornerPlus className="-bottom-[0.5px] -right-[0.5px] translate-x-1/2 translate-y-1/2" />
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute left-0 right-0 h-[1px] bg-[#EAEAEA30]"
                style={{ top: 0 }}
                animate={{ top: ["0%", "100%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center gap-2 px-4 sm:px-6 w-full h-full">
                <Suspense fallback={<span className="test-font text-[#EAEAEA]">...</span>}>
                  <WireframeIcoIcon />
                </Suspense>
              </div>
            </div>
            <div className="absolute -inset-px border border-[#EAEAEA08] rounded-sm pointer-events-none" />
          </div>

          {/* Card 4 - bottom-right, octahedron */}
          <div
            ref={(el) => { boxRefs.current[3] = el; }}
            className="absolute flex items-center justify-center border border-[#EAEAEA20] bg-[#070707]/95 overflow-visible min-h-0"
          >
            <div data-blink className="absolute inset-0 bg-white pointer-events-none opacity-0 z-10" />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20 pointer-events-none">
              <span className="w-1.5 h-1.5 border border-[#EAEAEA60]" />
              <ScrambleText text={CARD_CONFIGS[3].label} className="test-font text-[8px] sm:text-[9px] text-[#EAEAEA80] tracking-widest" speed={0.09} repeat />
            </div>
            <CornerPlus className="-top-[0.5px] -left-[0.5px] -translate-x-1/2 -translate-y-1/2" />
            <CornerPlus className="-top-[0.5px] -right-[0.5px] translate-x-1/2 -translate-y-1/2" />
            <CornerPlus className="-bottom-[0.5px] -left-[0.5px] -translate-x-1/2 translate-y-1/2" />
            <CornerPlus className="-bottom-[0.5px] -right-[0.5px] translate-x-1/2 translate-y-1/2" />
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute left-0 right-0 h-[1px] bg-[#EAEAEA30]"
                style={{ top: 0 }}
                animate={{ top: ["0%", "100%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center gap-2 px-4 sm:px-6 w-full h-full">
                <Suspense fallback={<span className="test-font text-[#EAEAEA]">...</span>}>
                  <WireframeOctIcon />
                </Suspense>
              </div>
            </div>
            <div className="absolute -inset-px border border-[#EAEAEA08] rounded-sm pointer-events-none" />
          </div>
        </div>

        {/* Footer: LOADING + barra animada, centro abajo de la pantalla */}
        <div className="fixed bottom-8 left-0 right-0 flex flex-col items-center justify-center gap-4 z-30 pointer-events-none">
          <span className="test-font text-[#EAEAEA] text-xs sm:text-sm tracking-[0.4em] opacity-90">
            LOADING
          </span>
          <div className="relative w-48 sm:w-56 h-1 border border-[#EAEAEA30] overflow-hidden bg-[#070707]/80 rounded-full">
            <motion.div
              className="absolute inset-y-0 left-0 bg-[#EAEAEA] rounded-full origin-left"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
