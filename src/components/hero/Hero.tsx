import { useRef } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { FlipWordsRotating } from "@/components/ui/flip-words";
import { CornerPlus } from "@/components/ui/tech-card";
import { BackgroundDots } from "@/components/ui/background-dots";
import { HeroVisual } from "@/components/visuals/HeroVisual";
import {
  TITLE_HUGE,
  BODY_CLASS,
  CONTAINER_MAX_CLASS,
  SECTION_PADDING_X,
} from "@/lib/design-tokens";

type AnimatedTextProps = {
  children: ReactNode;
  size?: string;
  className?: string;
  direction?: "fromLeft" | "fromRight";
  staggerDelay?: number;
  delay?: number;
};

const AnimatedText = ({
  children,
  size = "text-[10rem]",
  className = "",
  direction = "fromLeft",
  staggerDelay = 0.02,
  delay = 0,
}: AnimatedTextProps) => {
  const text = String(children);
  const words = text.split(/(\s+)/);
  const xOffset = direction === "fromLeft" ? "-8%" : "8%";
  let letterCount = 0;
  const getStartIndex = () => letterCount;
  const addLetterCount = (n: number) => { letterCount += n; };

  return (
    <span className={`text-[#EAEAEA] test-font ${size} ${className} block max-w-full overflow-visible`}>
      {words.map((word, wordIdx) => {
        if (/^\s+$/.test(word)) return <span key={wordIdx} className="inline-block whitespace-pre">{word}</span>;
        const letters = word.split("");
        const startIndex = getStartIndex();
        addLetterCount(letters.length);
        const getDelay = (i: number) => delay + (startIndex + i) * staggerDelay;
        return (
          <span key={wordIdx} className="inline-block whitespace-nowrap">
            {letters.map((letter, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, x: xOffset, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.45, delay: getDelay(i), ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {letter}
              </motion.span>
            ))}
          </span>
        );
      })}
    </span>
  );
};

const T0 = 0;
const T1 = 0.5;
const T2 = 1;
const T3 = 1.5;
const T4 = 2;

/** Altura fija del título para que el grid no crezca al renderizar el tercer texto. */
const TITLE_ROW_MIN_H = "min-h-[clamp(6rem,18vh,10rem)]";
/** Ancho mínimo del slot de la palabra rotatoria (la más larga es "experiences"). */
const ROTATING_WORD_MIN_W = "min-w-[11ch]";

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <section
      ref={heroRef}
      className="relative w-full h-screen min-h-[100dvh] flex items-center overflow-hidden bg-[#070707]"
    >
      <CornerPlus className="top-6 left-6 sm:top-8 sm:left-8 -translate-x-1/2 -translate-y-1/2" />
      <CornerPlus className="top-6 right-6 sm:top-8 sm:right-8 translate-x-1/2 -translate-y-1/2" />
      <CornerPlus className="bottom-6 left-6 sm:bottom-8 sm:left-8 -translate-x-1/2 translate-y-1/2" />
      <CornerPlus className="bottom-6 right-6 sm:bottom-8 sm:right-8 translate-x-1/2 translate-y-1/2" />

      <div className={["relative z-10 w-full mx-auto", CONTAINER_MAX_CLASS, SECTION_PADDING_X].join(" ")}>
        <div className="grid grid-cols-12 items-start content-center min-h-[75vh]">
          {/* Row 1: Título — bordes en el div, tamaño fijo para que no crezca el grid */}
          <div className={`col-span-12 border-y py-20 px-10 ${TITLE_ROW_MIN_H} flex items-end`}>
            <p className={`text-[#EAEAEA] test-font ${TITLE_HUGE} font-medium flex flex-wrap items-baseline gap-x-1 gap-y-0`}>
              <AnimatedText size={TITLE_HUGE} className="!leading-[0.5] font-medium inline" direction="fromLeft" staggerDelay={0.02} delay={T0}>
                I craft{" "}
              </AnimatedText>
              <FlipWordsRotating
                words={["experiences", "emotions", "motion", "clarity"]}
                intervalMs={2800}
                initialDelayMs={T1 * 1000}
                className={`text-[#EAEAEA] test-font ${TITLE_HUGE} font-medium !leading-[0.88] ${ROTATING_WORD_MIN_W} inline-block text-left`}
              />
              <AnimatedText size={TITLE_HUGE} className="!leading-[0.5] font-medium text-[#EAEAEA]/90 inline" direction="fromLeft" staggerDelay={0.02} delay={T2}>
                {" "}for the web
              </AnimatedText>
            </p>
          </div>

          {/* Row 2: Descripción — bordes en el div; dots con animación de entrada */}
          <div className="col-span-12 lg:col-span-6 relative min-h-[280px] flex flex-col justify-center py-20 px-10 border-b border-r">
            <BackgroundDots dotColor="#EAEAEA" dotOpacity={0.1} className="rounded-none" animateIn />
            <div className="relative z-10">
              <p className={BODY_CLASS}>
                <motion.span
                  className="block"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: T3, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  The future runs on automation. What it will lack is emotion.
                </motion.span>
                <motion.span
                  className="block mt-2 text-[#EAEAEA]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: T3 + 0.35, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  I build interfaces that feel.
                </motion.span>
              </p>
            </div>
          </div>
          {/* Card visual — bordes en el div contenedor, no en motion */}
          <div className="col-span-12 lg:col-span-6 border-b py-20 px-10 flex items-center justify-center">
            <motion.div
              className="flex items-center justify-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: T4, duration: 0.5 }}
            >
              <HeroVisual />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
