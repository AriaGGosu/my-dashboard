"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const stagger = 0.32;
const duration = 0.5;
const ease = [0.25, 0.46, 0.45, 0.94] as const;

/**
 * Párrafo con animación narrativa: cada línea/frase aparece en secuencia.
 */
export function NarrativeParagraph({
  lines,
  className = "",
  bodyClass = "body-font text-base text-[#EAEAEA]/80 leading-relaxed",
}: {
  lines: string[];
  className?: string;
  bodyClass?: string;
}) {
  return (
    <p className={cn(bodyClass, className)}>
      {lines.map((line, i) => (
        <motion.span
          key={i}
          className={i > 0 ? "block mt-2" : "block"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * stagger, duration, ease }}
        >
          {line}
        </motion.span>
      ))}
    </p>
  );
}
