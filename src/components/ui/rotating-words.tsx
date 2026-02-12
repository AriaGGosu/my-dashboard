"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/** Palabras que rotan (decorativo, ej. alentadoras/simpáticas). */
export function RotatingWords({
  words,
  intervalMs = 4000,
  className = "",
}: {
  words: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <span className={cn("inline-block overflow-hidden align-middle", className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="inline-block test-font text-sm text-[#EAEAEA]/50 tracking-wider"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
