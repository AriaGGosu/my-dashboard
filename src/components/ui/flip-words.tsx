"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function FlipWords({
  words,
  className = "",
}: {
  words: string[];
  className?: string;
}) {
  return (
    <span className={cn("inline-block overflow-hidden align-bottom", className)}>
      <AnimatePresence mode="wait">
        {words.map((word) => (
          <motion.span
            key={word}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="inline-block"
          >
            {word}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

/** Emoción por palabra: clarity = nítido, experiences = expansivo, motion = dinámico, emotion = cálido/pulso */
const WORD_EMOTIONS: Record<
  string,
  { initial: object; animate: object; exit: object; transition: object }
> = {
  clarity: {
    initial: { y: "100%", opacity: 0, filter: "blur(4px)" },
    animate: { y: 0, opacity: 1, filter: "blur(0px)" },
    exit: { y: "-100%", opacity: 0, filter: "blur(4px)" },
    transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  experiences: {
    initial: { scale: 0.92, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.96, opacity: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  motion: {
    initial: { y: 12, opacity: 0, rotateX: -8 },
    animate: { y: 0, opacity: 1, rotateX: 0 },
    exit: { y: -12, opacity: 0, rotateX: 8 },
    transition: { duration: 0.4, type: "spring", stiffness: 300, damping: 24 },
  },
  emotion: {
    initial: { scale: 0.94, opacity: 0 },
    animate: { scale: [0.94, 1.02, 1], opacity: 1 },
    exit: { scale: 0.96, opacity: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  emotions: {
    initial: { scale: 0.94, opacity: 0 },
    animate: { scale: [0.94, 1.02, 1], opacity: 1 },
    exit: { scale: 0.96, opacity: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const defaultEmotion = {
  initial: { y: "100%", opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: "-100%", opacity: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

/** Rotates through words with a distinct emotion per word (Framer Motion). */
export function FlipWordsRotating({
  words,
  intervalMs = 3000,
  initialDelayMs = 0,
  className = "",
}: {
  words: string[];
  intervalMs?: number;
  initialDelayMs?: number;
  className?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const [started, setStarted] = React.useState(initialDelayMs === 0);
  React.useEffect(() => {
    if (initialDelayMs === 0) {
      setStarted(true);
      return;
    }
    const t = setTimeout(() => setStarted(true), initialDelayMs);
    return () => clearTimeout(t);
  }, [initialDelayMs]);
  React.useEffect(() => {
    if (!started) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs, started]);

  const word = started ? words[index] : "";
  const emotion = word ? (WORD_EMOTIONS[word] ?? defaultEmotion) : defaultEmotion;

  return (
    <span className={cn("inline-block overflow-hidden align-bottom", className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={word || "wait"}
          initial={emotion.initial}
          animate={emotion.animate}
          exit={emotion.exit}
          transition={emotion.transition}
          className="inline-block"
        >
          {word || "\u00A0"}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
