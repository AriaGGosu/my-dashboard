"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TechCard } from "@/components/ui/tech-card";
import { VISUAL_CARD_SIZE } from "@/lib/design-tokens";

const SHOW_STATIC_MS = 2800;
const SHOW_CREATIVE_MS = 3200;
const CROSSFADE_MS = 600;

/**
 * Secuencia en el cuadradito: primero "Static website" + X, luego "Creative website" + good.
 * Sin carita: dos estados de una app — estática vs con animaciones — para que se entienda
 * por qué el desarrollo creativo es mejor.
 */
export function HeroVisual() {
  const [phase, setPhase] = useState<"static" | "creative">("static");

  // Loop: static ↔ creative
  useEffect(() => {
    const id = setTimeout(
      () => setPhase((p) => (p === "static" ? "creative" : "static")),
      phase === "static" ? SHOW_STATIC_MS : SHOW_CREATIVE_MS
    );
    return () => clearTimeout(id);
  }, [phase]);

  return (
    <TechCard className={`${VISUAL_CARD_SIZE} p-0 bg-[#070707] border border-[#EAEAEA]/20 overflow-visible`}>
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(234,234,234,0.2) 2px, rgba(234,234,234,0.2) 3px)",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center p-3">
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "static" ? (
              <motion.div
                key="static"
                className="flex flex-col items-center justify-center gap-3 flex-1 min-h-0 w-full"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: CROSSFADE_MS / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <span className="text-[#EAEAEA]/70 text-[10px] sm:text-xs uppercase tracking-wider font-medium">
                  Static website
                </span>
                <StaticMiniApp />
                <motion.span
                  className="text-[#EAEAEA] font-medium text-lg sm:text-xl"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.35 }}
                >
                  ✕
                </motion.span>
              </motion.div>
            ) : (
              <motion.div
                key="creative"
                className="flex flex-col items-center justify-center gap-3 flex-1 min-h-0 w-full"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: CROSSFADE_MS / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <span className="text-[#EAEAEA]/70 text-[10px] sm:text-xs uppercase tracking-wider font-medium">
                  Creative website
                </span>
                <CreativeMiniApp />
                <motion.span
                  className="text-[#7DD87D] font-medium text-lg sm:text-xl"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.35 }}
                >
                  good
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TechCard>
  );
}

/** Mini UI estático: barras y caja sin movimiento. */
function StaticMiniApp() {
  return (
    <div className="w-[72%] max-w-[140px] rounded border border-[#EAEAEA]/25 bg-[#0a0a0a]/80 p-2 space-y-2">
      <div className="flex gap-1.5">
        <div className="h-1.5 w-4 rounded-sm bg-[#EAEAEA]/20" />
        <div className="h-1.5 w-8 rounded-sm bg-[#EAEAEA]/15" />
        <div className="h-1.5 w-6 rounded-sm bg-[#EAEAEA]/15" />
      </div>
      <div className="h-8 rounded-sm bg-[#EAEAEA]/10 border border-[#EAEAEA]/10" />
      <div className="grid grid-cols-2 gap-1.5">
        <div className="h-6 rounded-sm bg-[#EAEAEA]/10" />
        <div className="h-6 rounded-sm bg-[#EAEAEA]/10" />
      </div>
    </div>
  );
}

/** Mini UI creativo: mismo layout pero con animaciones sutiles. */
function CreativeMiniApp() {
  return (
    <div className="w-[72%] max-w-[140px] rounded border border-[#EAEAEA]/25 bg-[#0a0a0a]/80 p-2 space-y-2">
      <div className="flex gap-1.5">
        <motion.div
          className="h-1.5 w-4 rounded-sm bg-[#EAEAEA]/25"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="h-1.5 w-8 rounded-sm bg-[#EAEAEA]/20"
          initial={{ width: 0 }}
          animate={{ width: 32 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
        <motion.div
          className="h-1.5 w-6 rounded-sm bg-[#EAEAEA]/20"
          initial={{ width: 0 }}
          animate={{ width: 24 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
      <motion.div
        className="h-8 rounded-sm bg-[#EAEAEA]/15 border border-[#EAEAEA]/15"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 32 }}
        transition={{ duration: 0.4, ease: [0.34, 1.2, 0.64, 1] }}
      />
      <div className="grid grid-cols-2 gap-1.5">
        <motion.div
          className="h-6 rounded-sm bg-[#7DD87D]/20 border border-[#7DD87D]/30"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0.34, 1.2, 0.64, 1] }}
        />
        <motion.div
          className="h-6 rounded-sm bg-[#EAEAEA]/15"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.35, ease: [0.34, 1.2, 0.64, 1] }}
        />
      </div>
    </div>
  );
}
