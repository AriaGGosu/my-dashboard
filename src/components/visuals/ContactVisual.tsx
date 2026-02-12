"use client";

import { motion } from "framer-motion";
import { TechCard } from "@/components/ui/tech-card";
import { VISUAL_CARD_SIZE } from "@/lib/design-tokens";

/** Contact: círculo que expande (ripple). */
export function ContactVisual() {
  return (
    <TechCard className={`${VISUAL_CARD_SIZE} p-0 overflow-visible bg-[#070707] border border-[#EAEAEA]/20`}>
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute border border-[#EAEAEA]/30 bg-transparent"
            style={{ borderRadius: "50%" }}
            initial={{ width: 20, height: 20, opacity: 0.8 }}
            animate={{
              width: [20, 120, 120],
              height: [20, 120, 120],
              opacity: [0.8, 0.2, 0],
            }}
            transition={{
              duration: 2.5,
              delay: i * 0.6,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    </TechCard>
  );
}
