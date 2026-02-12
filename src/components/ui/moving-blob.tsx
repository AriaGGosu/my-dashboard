"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Forma que se mueve hacia un lado con animación caricaturesca:
 * translate + blur suave (blur fade out). Refuerza la historia.
 */
export function MovingBlob({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={cn("relative w-24 h-24 sm:w-32 sm:h-32", className)}
      initial={{ opacity: 0.4, x: -24, filter: "blur(6px)" }}
      animate={{
        opacity: [0.4, 0.7, 0.5],
        x: [0, 12, 0],
        filter: ["blur(4px)", "blur(0px)", "blur(2px)"],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full border border-[#EAEAEA]/20 bg-[#070707]" />
      <div className="absolute inset-2 rounded-full border border-[#EAEAEA]/10" />
    </motion.div>
  );
}
