"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/**
 * Fondo de puntos (grid). Color = mismo que borde de cards.
 * Opacidad en 0–1; radial-gradient usa círculos de 2px.
 * animateIn: aparece con fade (no visible al inicio).
 */
export function BackgroundDots({
  className,
  dotColor = "#EAEAEA",
  dotOpacity = 0.2,
  animateIn = false,
}: {
  className?: string;
  dotColor?: string;
  dotOpacity?: number;
  animateIn?: boolean;
}) {
  const hex = (dotColor ?? "#EAEAEA").replace(/^#/, "");
  const r = hex.length === 6 ? parseInt(hex.slice(0, 2), 16) : 234;
  const g = hex.length === 6 ? parseInt(hex.slice(2, 4), 16) : 234;
  const b = hex.length === 6 ? parseInt(hex.slice(4, 6), 16) : 234;
  const opacity = Math.max(0, Math.min(1, dotOpacity ?? 0.2));

  const content = (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", !animateIn && className)}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle 2px at 1px 1px, rgba(${r},${g},${b},${opacity}), transparent)`,
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0",
        }}
      />
    </div>
  );

  if (animateIn) {
    return (
      <motion.div
        className={cn("absolute inset-0 pointer-events-none", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        aria-hidden
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle 2px at 1px 1px, rgba(${r},${g},${b},${opacity}), transparent)`,
              backgroundSize: "24px 24px",
              backgroundPosition: "0 0",
            }}
          />
        </div>
      </motion.div>
    );
  }

  return content;
}
