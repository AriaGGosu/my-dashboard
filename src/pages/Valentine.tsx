"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion, AnimatePresence } from "framer-motion";
import presenterMusicSrc from "../audio/Starry Latte Hour.mp3";
import {
  SCUTTLE_CRAB_PURPLE_GLB,
  SCUTTLE_CRAB_GREEN_GLB,
  CRAB_MINIMAP_IMAGES,
  PRESENTER_GLB,
} from "./valentine/data";

// Lazy-load heavy 3D scenes — each one only loads when its phase is active
const PresenterScreen = lazy(() =>
  import("./valentine/helpers").then(m => ({ default: m.PresenterScreen }))
);
const ValentineGame = lazy(() =>
  import("./valentine/scene").then(m => ({ default: m.ValentineGame }))
);

// Cache the preload promise so it only runs once
let _preloadPromise: Promise<void> | null = null;
function preloadPresenter(): Promise<void> {
  if (!_preloadPromise) {
    _preloadPromise = Promise.all([
      import("./valentine/helpers"),          // preload the JS module
      fetch(PRESENTER_GLB).catch(() => {}),   // preload the GLB into browser cache
    ]).then(() => {});
  }
  return _preloadPromise;
}

// ——————————————————————————————————————————————
//  PAGE: Valentine
// ——————————————————————————————————————————————

type GamePhase = "loading" | "audioConsent" | "presenter" | "transition" | "game";

export default function Valentine() {
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [selectedCrab, setSelectedCrab] = useState<"purple" | "green">("purple");
  const [fadeOut, setFadeOut] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [presenterReady, setPresenterReady] = useState(false);

  const crabGlb = selectedCrab === "purple" ? SCUTTLE_CRAB_PURPLE_GLB : SCUTTLE_CRAB_GREEN_GLB;
  const crabMinimapImg = CRAB_MINIMAP_IMAGES[selectedCrab];

  // Create audio element once
  useEffect(() => {
    const audio = new Audio(presenterMusicSrc);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  // Start preloading the presenter module + GLB immediately
  useEffect(() => {
    preloadPresenter().then(() => setPresenterReady(true));
  }, []);

  // Phase 1: Loading → audioConsent (only when presenter assets are ready)
  useEffect(() => {
    if (phase !== "loading" || !presenterReady) return;
    // Small extra delay so the transition feels smooth
    const t = setTimeout(() => setPhase("audioConsent"), 400);
    return () => clearTimeout(t);
  }, [phase, presenterReady]);

  // Handle audio consent choice
  const handleAudioChoice = useCallback((enabled: boolean) => {
    setAudioEnabled(enabled);
    if (enabled && audioRef.current) {
      audioRef.current.play().catch(() => { });
      // Fade volume in
      gsap.to(audioRef.current, { volume: 0.35, duration: 2, ease: "power2.out" });
    }
    setPhase("presenter");
  }, []);

  // Presenter complete → transition → game
  const handlePresenterComplete = useCallback((crab: "purple" | "green") => {
    setSelectedCrab(crab);
    setFadeOut(true);
    // Fade out music during transition
    if (audioRef.current && audioEnabled) {
      gsap.to(audioRef.current, {
        volume: 0, duration: 1.5, ease: "power2.in", onComplete: () => {
          audioRef.current?.pause();
        }
      });
    }
    setTimeout(() => {
      setPhase("transition");
      setFadeOut(false);
    }, 800);
  }, [audioEnabled]);

  // Transition phase: preload game assets then reveal
  useEffect(() => {
    if (phase !== "transition") return;
    const t = setTimeout(() => {
      setPhase("game");
    }, 2000);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative", overflow: "hidden" }}>
      {/* Loading screen */}
      <AnimatePresence>
        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: 0, zIndex: 200, background: "#000",
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ width: 32, height: 32, border: "2px solid rgba(255,170,204,0.15)", borderTopColor: "rgba(255,170,204,0.6)", borderRadius: "50%" }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.15em", textTransform: "uppercase" }}
            >
              Preparando algo especial...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio consent modal */}
      <AnimatePresence>
        {phase === "audioConsent" && (
          <motion.div
            key="audio-consent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: 0, zIndex: 200, background: "#000",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: "rgba(10, 10, 10, 0.95)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 170, 204, 0.15)", borderRadius: 20,
                padding: "32px 40px", textAlign: "center", maxWidth: 380, width: "90vw",
              }}
            >
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                style={{
                  color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 400,
                  margin: "0 0 8px", fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: "0.15em", textTransform: "uppercase",
                }}
              >
                Antes de empezar
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                style={{
                  color: "rgba(255,255,255,0.85)", fontSize: 17, fontWeight: 600,
                  margin: "0 0 28px", fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                ¿Te gustaría disfrutar con música?
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.5 }}
                style={{ display: "flex", gap: 16, justifyContent: "center" }}
              >
                {/* Sound ON */}
                <motion.button
                  whileHover={{ scale: 1.06, borderColor: "rgba(255, 170, 204, 0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAudioChoice(true)}
                  style={{
                    flex: 1, maxWidth: 150, padding: "18px 16px",
                    background: "rgba(255, 170, 204, 0.08)",
                    border: "1px solid rgba(255, 170, 204, 0.2)", borderRadius: 14,
                    cursor: "pointer", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 10, transition: "border-color 0.3s",
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,170,204,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Con música
                  </span>
                </motion.button>

                {/* Sound OFF */}
                <motion.button
                  whileHover={{ scale: 1.06, borderColor: "rgba(255, 255, 255, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAudioChoice(false)}
                  style={{
                    flex: 1, maxWidth: 150, padding: "18px 16px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 14,
                    cursor: "pointer", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 10, transition: "border-color 0.3s",
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Sin música
                  </span>
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Presenter screen (lazy-loaded) */}
      {(phase === "presenter" || (phase === "transition" && fadeOut)) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: fadeOut ? 0 : 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0, zIndex: 100 }}
        >
          <Suspense fallback={null}>
            <PresenterScreen onComplete={handlePresenterComplete} />
          </Suspense>
        </motion.div>
      )}

      {/* Transition overlay: black curtain that lifts when game is ready */}
      <AnimatePresence>
        {phase === "transition" && (
          <motion.div
            key="transition"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute", inset: 0, zIndex: 150, background: "#000",
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
            }}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: 80, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,170,204,0.4), transparent)" }}
            />
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.2em", textTransform: "uppercase" }}
            >
              Tu aventura comienza...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game — lazy-loaded when transition starts */}
      {(phase === "transition" || phase === "game") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "game" ? 1 : 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0, zIndex: 50 }}
        >
          <Suspense fallback={null}>
            <ValentineGame crabGlb={crabGlb} crabMinimapImg={crabMinimapImg} />
          </Suspense>
        </motion.div>
      )}

    </div>
  );
}
