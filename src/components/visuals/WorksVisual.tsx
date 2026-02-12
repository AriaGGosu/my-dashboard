"use client";

import { motion } from "framer-motion";
import { TechCard } from "@/components/ui/tech-card";
import { VISUAL_CARD_SIZE } from "@/lib/design-tokens";

/** Works: grid que pulsa. */
export function WorksVisual() {
  const cells = Array.from({ length: 9 }, (_, i) => i);
  return (
    <TechCard className={`${VISUAL_CARD_SIZE} p-0 overflow-visible bg-[#070707] border border-[#EAEAEA]/20`}>
      <div className="absolute inset-0 overflow-hidden grid grid-cols-3 grid-rows-3 gap-px p-2">
        {cells.map((i) => (
          <motion.div
            key={i}
            className="border border-[#EAEAEA]/20 bg-[#070707]"
            animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.02, 1] }}
            transition={{ duration: 2.2, delay: i * 0.1, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    </TechCard>
  );
}
