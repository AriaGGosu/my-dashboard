"use client";

import { motion } from "framer-motion";
import type { ExperienceMode } from "@/contexts/ExperienceContext";

type ExperienceChoiceDialogProps = {
  onChoose: (mode: ExperienceMode) => void;
};

const CornerPlus = ({ className = "" }: { className?: string }) => (
  <span className={`absolute w-[10px] h-[10px] z-20 pointer-events-none ${className}`}>
    <span className="absolute inset-y-1/2 left-0 right-0 h-[1px] bg-[#EAEAEA] -translate-y-1/2" />
    <span className="absolute inset-x-1/2 top-0 bottom-0 w-[1px] bg-[#EAEAEA] -translate-x-1/2" />
  </span>
);

export default function ExperienceChoiceDialog({ onChoose }: ExperienceChoiceDialogProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-[#070707]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
    >
      {/* Grid de fondo (mismo que LoadingScreen) */}
      <div className="absolute inset-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="choice-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EAEAEA12" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#choice-grid)" />
        </svg>
      </div>

      {/* Card central tipo loading */}
      <div className="relative w-full max-w-md mx-auto px-6 flex flex-col items-center justify-center gap-8">
        <motion.div
          className="relative w-full border border-[#EAEAEA20] bg-[#070707]/95 overflow-visible rounded-sm px-8 py-10 sm:px-10 sm:py-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <CornerPlus className="-top-[0.5px] -left-[0.5px] -translate-x-1/2 -translate-y-1/2" />
          <CornerPlus className="-top-[0.5px] -right-[0.5px] translate-x-1/2 -translate-y-1/2" />
          <CornerPlus className="-bottom-[0.5px] -left-[0.5px] -translate-x-1/2 translate-y-1/2" />
          <CornerPlus className="-bottom-[0.5px] -right-[0.5px] translate-x-1/2 translate-y-1/2" />
          <div className="absolute -inset-px border border-[#EAEAEA08] rounded-sm pointer-events-none" />

          <div className="flex flex-col items-center gap-6">
            <p className="test-font text-[#EAEAEA] text-center text-sm sm:text-base tracking-[0.2em] uppercase">
              Choose experience
            </p>
            <p className="text-[#EAEAEA99] text-center text-sm max-w-xs">
              View the overview with narrated audio and staggered animations, or read the text only.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onChoose("audio")}
                className="flex-1 min-w-[180px] py-3 px-6 border border-[#EAEAEA40] bg-[#070707] text-[#EAEAEA] test-font text-xs tracking-[0.2em] uppercase hover:bg-[#EAEAEA15] hover:border-[#EAEAEA60] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#EAEAEA40] focus:ring-offset-2 focus:ring-offset-[#070707]"
              >
                With audio &amp; animations
              </button>
              <button
                type="button"
                onClick={() => onChoose("plain")}
                className="flex-1 min-w-[180px] py-3 px-6 border border-[#EAEAEA40] bg-[#070707] text-[#EAEAEA] test-font text-xs tracking-[0.2em] uppercase hover:bg-[#EAEAEA15] hover:border-[#EAEAEA60] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#EAEAEA40] focus:ring-offset-2 focus:ring-offset-[#070707]"
              >
                Plain text only
              </button>
            </div>
          </div>
        </motion.div>

        <motion.span
          className="test-font text-[#EAEAEA50] text-[10px] sm:text-xs tracking-[0.25em]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Select an option to continue
        </motion.span>
      </div>
    </motion.div>
  );
}
