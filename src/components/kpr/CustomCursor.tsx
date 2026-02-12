"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { KPR_ACCENT } from "@/lib/kpr-design-tokens";

const CURSOR_SIZE = 10;
const RING_SIZE = 40;
const RING_SIZE_HOVER = 56;
const RING_LERP = 0.08;

/** Cursor personalizado KPR: cross (corner plus) + anillo que hace match con el sistema de diseño. */
export function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0 });
  const ringPosRef = useRef({ x: 0, y: 0 });
  const tipEl = useRef<HTMLDivElement>(null);
  const ringEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isFine = window.matchMedia("(pointer: fine)").matches;
    setIsPointer(isFine);
    if (!isFine) return;

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      setVisible(true);
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("a") ||
        target.closest("button") ||
        target.closest("[data-cursor-hover]")
      ) {
        setHover(true);
      }
    };
    const onOut = () => setHover(false);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, []);

  useEffect(() => {
    if (!isPointer) return;

    let raf = 0;
    const tick = () => {
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      ringPosRef.current.x += (mx - ringPosRef.current.x) * RING_LERP;
      ringPosRef.current.y += (my - ringPosRef.current.y) * RING_LERP;

      if (tipEl.current) {
        tipEl.current.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      }
      const size = hover ? RING_SIZE_HOVER : RING_SIZE;
      const off = size / 2;
      if (ringEl.current) {
        ringEl.current.style.transform = `translate(${ringPosRef.current.x - off}px, ${ringPosRef.current.y - off}px)`;
        ringEl.current.style.width = `${size}px`;
        ringEl.current.style.height = `${size}px`;
        ringEl.current.style.borderColor = hover ? KPR_ACCENT.magenta : "rgba(234, 234, 234, 0.35)";
        ringEl.current.style.borderWidth = hover ? "2px" : "1px";
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPointer, hover]);

  useEffect(() => {
    if (!isPointer) return;
    document.body.classList.add("cursor-none-kpr");
    return () => document.body.classList.remove("cursor-none-kpr");
  }, [isPointer]);

  if (!isPointer) return null;

  return (
    <>
      {/* Punto + cross (corner plus) — mismo lenguaje que TechCard y Brand Book */}
      <div
        ref={tipEl}
        className="fixed top-0 left-0 z-[9999] pointer-events-none will-change-transform"
        style={{ transform: "translate(0, 0) translate(-50%, -50%)" }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.5 }}
          transition={{ duration: 0.12 }}
          className="relative"
        >
          <div className="absolute w-1 h-1 rounded-full bg-[#EAEAEA]" style={{ left: 0, top: 0, transform: "translate(-50%, -50%)" }} />
          <div
            className="absolute"
            style={{ left: 0, top: 0, width: CURSOR_SIZE, height: CURSOR_SIZE, transform: "translate(-50%, -50%)" }}
          >
            <span className="absolute inset-y-1/2 left-0 right-0 h-px bg-[#EAEAEA]/90 -translate-y-1/2" />
            <span className="absolute inset-x-1/2 top-0 bottom-0 w-px bg-[#EAEAEA]/90 -translate-x-1/2" />
          </div>
        </motion.div>
      </div>

      {/* Anillo que sigue con delay — refuerza “sistema”, “precisión” */}
      <motion.div
        ref={ringEl}
        className="fixed top-0 left-0 z-[9998] pointer-events-none will-change-transform rounded-full border"
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          transform: "translate(0, 0)",
          borderColor: "rgba(234, 234, 234, 0.35)",
          borderWidth: 1,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
        transition={{ duration: 0.12 }}
      />
    </>
  );
}
