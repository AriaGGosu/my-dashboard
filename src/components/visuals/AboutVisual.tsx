"use client";

import { motion } from "framer-motion";
import { TechCard } from "@/components/ui/tech-card";
import { VISUAL_CARD_SIZE } from "@/lib/design-tokens";

/** About: línea que se traza (tracing beam). */
export function AboutVisual() {
  return (
    <TechCard className={`${VISUAL_CARD_SIZE} p-0 overflow-visible bg-[#070707] border border-[#EAEAEA]/20`}>
      <div className="absolute inset-0 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
          <motion.path
            d="M 20 20 L 50 20 L 50 50 L 80 50 L 80 80"
            fill="none"
            stroke="rgba(234,234,234,0.5)"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 0.5 }}
          />
        </svg>
      </div>
    </TechCard>
  );
}
