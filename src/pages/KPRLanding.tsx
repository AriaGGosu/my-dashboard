"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { StaggeredMenu } from "@/components/kpr/StaggeredMenu";
import { KeepSymbol } from "@/components/kpr/KeepSymbol";
import { ComputerChipPattern } from "@/components/kpr/ComputerChipPattern";
import { TrainingRoom3D } from "@/components/kpr/TrainingRoom3D";
import { DiamondSectionOverlay } from "@/components/visuals/diamond-refraction/DiamondSectionOverlay";
import { WarningDiamondOverlay } from "@/components/visuals/warning/WarningDiamondOverlay";
import { TechCard } from "@/components/ui/tech-card";
import {
  KPR_DISPLAY,
  KPR_HEADLINE,
  KPR_BODY,
  KPR_LABEL,
  KPR_MONO,
  KPR_SPACING,
  KPR_SECTION_TITLE,
  KPR_INTRO_STATEMENT,
  KPR_ACCENT,
} from "@/lib/kpr-design-tokens";
import { cn } from "@/lib/utils";
import { useExperience } from "@/contexts/ExperienceContext";
import { useAudioVolume } from "@/contexts/AudioVolumeContext";
import { VolumeControl } from "@/components/kpr/VolumeControl";

const STAGGERED_MENU_ITEMS = [
  { label: "Overview", ariaLabel: "Go to overview", link: "#hero" },
  { label: "About", ariaLabel: "Learn about", link: "#about" },
  { label: "Applications", ariaLabel: "View applications", link: "#works" },
  { label: "Skills", ariaLabel: "Stack & tools", link: "#skills" },
  { label: "Contact", ariaLabel: "Get in touch", link: "#contact" },
];

const STAGGERED_SOCIAL_ITEMS = [
  { label: "Twitter", link: "https://twitter.com" },
  { label: "GitHub", link: "https://github.com" },
  { label: "LinkedIn", link: "https://linkedin.com" },
];

const fadeInUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
};

/** Clips de audio para SectionOverview: orden = secuencia de aparición. La duración se obtiene del MP3 al cargar. */
const OVERVIEW_AUDIO_CLIPS = [
  { id: "1", src: "/audio/overview/Overview.mp3" },
  { id: "2", src: "/audio/overview/Having_a_portfolio_that_produces_high_quality.mp3" },
  { id: "3", src: "/audio/overview/what_i_do.mp3" },
  { id: "4", src: "/audio/overview/I_craft_interfaces_and_experiences_that_blend.mp3" },
  { id: "5", src: "/audio/overview/What_I_offer.mp3" },
  { id: "6", src: "/audio/overview/Brand_aligned_digital_products__from_concept.mp3" },
] as const;

/** Left sidebar label (Brand Book style). Use dark for black backgrounds. */
function SidebarLabel({
  section,
  version = "PORTFOLIO",
  page,
  dark = false,
}: {
  section: string;
  version?: string;
  page?: string;
  dark?: boolean;
}) {
  const text = dark ? "text-white/40" : "text-black/50";
  const textMuted = dark ? "text-white/30" : "text-black/40";
  return (
    <div
      className="hidden lg:flex flex-col items-center justify-end absolute left-4 lg:left-6 bottom-14 lg:bottom-16 top-auto z-10"
      style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
    >
      <span className={cn(KPR_MONO, "text-[10px] uppercase tracking-[0.3em] rotate-180", text)}>
        {section}
      </span>
      <span className={cn(KPR_MONO, "text-[9px] uppercase tracking-widest mt-4 rotate-180", textMuted)}>
        {version}
      </span>
      {page != null && (
        <span className={cn(KPR_MONO, "text-xs mt-2 rotate-180", textMuted)}>{page}</span>
      )}
    </div>
  );
}

/** Número de página estilo Brand Book — esquina inferior izquierda, solo el número. */
function PageNumber({ number, dark = false }: { number: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-4 lg:left-6 bottom-5 lg:bottom-6 z-10",
        dark ? "text-white/50" : "text-black/50"
      )}
      aria-hidden
    >
      <span className={cn(KPR_MONO, "text-base lg:text-lg tracking-[0.4em]")}>{number}</span>
    </div>
  );
}

// ——— HERO: Overview style ———
// Con modo "audio": reproduce los audios en secuencia y muestra cada bloque cuando empieza su clip.
// Con modo "plain": todo el texto visible desde el inicio, sin audio ni animaciones escalonadas.
/** Escena 3D a mostrar cuando no hay audio (plain): 1 = mech+pod+bmo+cards, 2 = solo grid+terreno (para debug / Brand-aligned). */
type OverviewStaticSceneId = 1 | 2;

function SectionOverview() {
  const { mode } = useExperience();
  const { volume } = useAudioVolume();
  const [visibleUpTo, setVisibleUpTo] = useState(-1);
  const [hasStarted, setHasStarted] = useState(false);
  const [overviewStaticScene, setOverviewStaticScene] = useState<OverviewStaticSceneId>(2);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const clipIndexRef = useRef(0);

  const isPlain = mode === "plain";
  const effectiveVisibleUpTo = isPlain ? 5 : visibleUpTo;
  const sceneId = isPlain ? overviewStaticScene : (effectiveVisibleUpTo >= 5 ? 2 : 1);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume / 100;
  }, [volume]);

  const playNextClip = useCallback(() => {
    const idx = clipIndexRef.current;
    if (idx >= OVERVIEW_AUDIO_CLIPS.length) return;
    const clip = OVERVIEW_AUDIO_CLIPS[idx];
    setVisibleUpTo(idx);
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = clip.src;
    audio.play().catch(() => {});
    clipIndexRef.current = idx + 1;
  }, []);

  const onEndedRef = useRef(playNextClip);
  onEndedRef.current = playNextClip;

  useEffect(() => {
    if (isPlain) return;
    const audio = new Audio();
    audio.volume = volume / 100;
    audioRef.current = audio;
    const handleEnded = () => {
      if (clipIndexRef.current < OVERVIEW_AUDIO_CLIPS.length) onEndedRef.current();
    };
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audioRef.current = null;
    };
  }, [isPlain]);

  useEffect(() => {
    if (isPlain || !sectionRef.current) return;
    const el = sectionRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (!e?.isIntersecting || hasStarted) return;
        setHasStarted(true);
        clipIndexRef.current = 0;
        playNextClip();
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isPlain, hasStarted, playNextClip]);

  const blockVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  };
  const blockTransition = { duration: 0.5, ease: "easeOut" as const };

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative h-[100vh] min-h-[100vh] flex flex-col lg:flex-row bg-white text-black overflow-hidden"
    >
      <SidebarLabel section="00 OVERVIEW" page="01" />
      <PageNumber number="01" />
      <div className="absolute top-6 left-6 lg:left-14 z-10">
        <KeepSymbol size={24} className="text-black" />
      </div>
      <div className={cn("flex-1 flex flex-col justify-center px-6 sm:px-10 lg:pl-24 lg:pr-16 pt-20 pb-14", KPR_SPACING.container)}>
        <div className="max-w-2xl">
          <motion.div
            initial="hidden"
            animate={effectiveVisibleUpTo >= 0 ? "visible" : "hidden"}
            variants={blockVariants}
            transition={blockTransition}
          >
            <p className={cn(KPR_MONO, KPR_LABEL, "text-black/50 mb-6")}>OVERVIEW</p>
          </motion.div>
          <motion.div
            initial="hidden"
            animate={effectiveVisibleUpTo >= 1 ? "visible" : "hidden"}
            variants={blockVariants}
            transition={blockTransition}
          >
            <h1
              className={cn(
                KPR_HEADLINE,
                KPR_INTRO_STATEMENT,
                "text-black font-bold mb-12 leading-[1.12]"
              )}
            >
              Having a portfolio that produces high quality, consistent & instantly recognizable work
              across web, mobile and beyond will contribute towards building an identity that does not
              become diluted or old.
            </h1>
          </motion.div>
        </div>
      </div>
      <div className="flex-1 relative min-w-0 min-h-0 h-full w-full self-stretch border-t lg:border-t-0 lg:border-l border-black/10 overflow-hidden">
        {/* 3D: mismo render en ambos modos; solo cambian opacidad y blur (sin scale para que el canvas tenga siempre el mismo tamaño) */}
        <motion.div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ width: "100%", height: "100%" }}
          initial={false}
          animate={{
            opacity: effectiveVisibleUpTo >= 3 ? 1 : 0,
            filter: effectiveVisibleUpTo >= 3 ? "blur(0px)" : "blur(24px)",
          }}
          transition={{
            duration: 1,
            ease: [0.25, 0.46, 0.45, 0.94],
            opacity: { duration: 0.9 },
            filter: { duration: 1.1 },
          }}
        >
          <div className="absolute inset-0 w-full h-full bg-black/[0.02]" />
          <WarningDiamondOverlay sceneId={sceneId} />
          {isPlain && effectiveVisibleUpTo >= 3 && (
            <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2 pointer-events-auto">
              <span className="text-xs text-black/50 font-medium">Escena 3D:</span>
              <button
                type="button"
                onClick={() => setOverviewStaticScene(1)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                  overviewStaticScene === 1 ? "bg-black text-white" : "bg-black/10 text-black/70 hover:bg-black/20"
                )}
              >
                1 (mech)
              </button>
              <button
                type="button"
                onClick={() => setOverviewStaticScene(2)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                  overviewStaticScene === 2 ? "bg-black text-white" : "bg-black/10 text-black/70 hover:bg-black/20"
                )}
              >
                2 (grid+terreno)
              </button>
            </div>
          )}
        </motion.div>

        {/* Texto (panel editorial): oculto hasta que empiece el primer diálogo "What I do" (clip 2) */}
        <div className="relative z-10 h-full flex flex-col justify-end px-6 sm:px-10 lg:px-16 py-10 lg:py-16">
          <motion.div
            className="max-w-lg bg-white/75 backdrop-blur-[2px] rounded-md border border-black/10 p-6"
            initial={false}
            style={{ pointerEvents: effectiveVisibleUpTo >= 2 ? "auto" : "none" }}
            animate={{
              opacity: effectiveVisibleUpTo >= 2 ? 1 : 0,
              filter: effectiveVisibleUpTo >= 2 ? "blur(0px)" : "blur(12px)",
              y: effectiveVisibleUpTo >= 2 ? 0 : 20,
            }}
            transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <motion.div
              initial="hidden"
              animate={effectiveVisibleUpTo >= 2 ? "visible" : "hidden"}
              variants={blockVariants}
              transition={blockTransition}
            >
              <h2 className={cn(KPR_HEADLINE, "text-lg uppercase tracking-wide text-black mb-4")}>
                What I do
              </h2>
            </motion.div>
            <motion.div
              initial="hidden"
              animate={effectiveVisibleUpTo >= 3 ? "visible" : "hidden"}
              variants={blockVariants}
              transition={blockTransition}
            >
              <p className={cn(KPR_BODY, "text-black/80 mb-10")}>
                I craft interfaces and experiences that blend design and technology. From motion and 3D
                to clean, scalable front-end—my work lives where automation leaves a gap: in emotion,
                clarity, and memorable interaction.
              </p>
            </motion.div>
            <motion.div
              initial="hidden"
              animate={effectiveVisibleUpTo >= 4 ? "visible" : "hidden"}
              variants={blockVariants}
              transition={blockTransition}
            >
              <h2 className={cn(KPR_HEADLINE, "text-lg uppercase tracking-wide text-black mb-4")}>
                What I offer
              </h2>
            </motion.div>
            <motion.div
              initial="hidden"
              animate={effectiveVisibleUpTo >= 5 ? "visible" : "hidden"}
              variants={blockVariants}
              transition={blockTransition}
            >
              <p className={cn(KPR_BODY, "text-black/80")}>
                Brand-aligned digital products, from concept to code. Clear typography, thoughtful
                animation, and systems that stay consistent across touchpoints. This portfolio is the
                living document of that approach.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** Imagen de la card diamante. Si añades public/tech-circuit.jpg puedes usar "/tech-circuit.jpg" */
const LANDING_ABOUT_IMAGE = "/building.jpeg";

// ——— ABOUT (sección 2): una sola imagen = canvas 3D (plano + diamante) en la columna derecha ———
function SectionAbout() {
  return (
    <section id="about" className={cn("relative flex flex-col lg:flex-row min-h-[100vh] max-h-[100vh] bg-[#000] text-white overflow-hidden")}>
      <SidebarLabel section="01 INTRODUCTION" page="02" dark />
      <PageNumber number="02" dark />

      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:pl-24 lg:pr-12 order-2 lg:order-1 relative z-10">
        <motion.div {...fadeInUp}>
          <p className={cn(KPR_MONO, KPR_LABEL, "text-white/50 mb-4")}>ABOUT</p>
          <h2 className={cn(KPR_DISPLAY, "text-4xl sm:text-5xl lg:text-6xl text-white mb-4")}>
            Creative Web Developer
          </h2>
          <p className={cn(KPR_MONO, "text-sm text-white/50 mb-6")}>Craft · Motion · Systems</p>
          <p className={cn(KPR_BODY, "text-white/80 max-w-xl text-lg")}>
            A creative web developer focused on collective narrative: building digital experiences
            that gamify clarity across both physical and virtual touchpoints. The future runs on
            automation; what it will lack is emotion. I build interfaces that feel.
          </p>
        </motion.div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-24 order-1 lg:order-2 relative z-10 min-h-0">
        <motion.div
          className="w-full max-w-lg aspect-[4/5] min-h-[280px]"
          {...fadeInUp}
        >
          <TechCard className="w-full h-full min-h-[280px] p-0 overflow-visible border-[#EAEAEA]/20 bg-[#000]">
            <div className="absolute inset-0 z-0 overflow-hidden">
              <DiamondSectionOverlay imageSrc={LANDING_ABOUT_IMAGE} />
            </div>
          </TechCard>
        </motion.div>
      </div>
    </section>
  );
}

// ——— TRAINING ROOM: 3D fondo (wireframe + grid), ScrollVelocity detrás del contenido ———
function SectionTrainingRoom() {
  return (
    <section
      id="works"
      className="relative min-h-[100vh] max-h-[100vh] overflow-hidden"
    >
      <TrainingRoom3D />

      {/* Overlay tipo Brand Book: sidebar + número de página */}
      <SidebarLabel section="08 APPLICATIONS" version="PORTFOLIO" page="03" dark />
      <PageNumber number="03" dark />
      <div className="absolute top-6 right-6 lg:right-10 z-10 text-right">
        <p className={cn(KPR_MONO, KPR_LABEL, "text-white/50")}>APPLICATIONS</p>
        <p className={cn(KPR_BODY, "text-white/80 text-sm max-w-[200px] mt-1")}>
          WebGL · Scroll para ver velocidad
        </p>
      </div>
    </section>
  );
}

// ——— SKILLS: Typography / editorial feel ———
function SectionSkills() {
  return (
    <section id="skills" className={cn("relative flex flex-col justify-center bg-[#f8f8f8] text-black py-16 lg:py-24")}>
      <SidebarLabel section="04 TYPOGRAPHY" page="04" />
      <PageNumber number="04" />
      <div className={cn(KPR_SPACING.containerWide, "px-6 sm:px-10")}>
        <motion.div className="flex items-center gap-4 mb-8" {...fadeInUp}>
          <KeepSymbol size={28} className="text-black" />
          <div>
            <p className={cn(KPR_MONO, KPR_LABEL, "text-black/50")}>SECONDARY</p>
            <h2 className={cn(KPR_DISPLAY, KPR_SECTION_TITLE, "text-black")}>Stack & Tools</h2>
          </div>
        </motion.div>
        <motion.p className={cn(KPR_BODY, "text-black/70 max-w-2xl mb-12")} {...fadeInUp}>
          IBM Plex Mono is used for labels and technical tone. The display typeface is reserved for
          headlines. Clean, minimal and modern—consistent across the portfolio.
        </motion.p>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {["React", "TypeScript", "Three.js", "Framer Motion", "Tailwind", "Node.js", "WebGL", "GSAP", "Figma", "Vite", "Git", "Vercel"].map((item) => (
            <motion.div
              key={item}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0 },
              }}
              className={cn(
                KPR_MONO,
                "text-sm uppercase tracking-wider py-3 px-4 border border-black/10 rounded bg-black/[0.02] hover:border-black/20 transition-colors"
              )}
            >
              {item}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ——— CONTACT / FOOTER ———
function SectionContact() {
  return (
    <footer id="contact" className="relative min-h-[100vh] max-h-[100vh] flex flex-col bg-black text-white overflow-hidden">
      <section className="relative flex-1 flex flex-col justify-center px-6 py-16 lg:py-24">
        <ComputerChipPattern color="#ffffff" opacity={0.06} />
        <PageNumber number="05" dark />
        <div className={cn("relative z-10", KPR_SPACING.containerWide)}>
          <motion.h2
            className={cn(KPR_DISPLAY, "text-2xl sm:text-3xl lg:text-4xl max-w-3xl mb-16")}
            {...fadeInUp}
          >
            The portfolio is ever evolving. Let's build something that feels.
          </motion.h2>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
            {...fadeInUp}
          >
            <div>
              <p className={cn(KPR_MONO, KPR_LABEL, "text-white/50 mb-2")}>Contact</p>
              <a
                href="mailto:hello@example.com"
                className={cn(KPR_BODY, "text-white hover:text-[#00E578] transition-colors")}
              >
                hello@example.com
              </a>
            </div>
            <div>
              <p className={cn(KPR_MONO, KPR_LABEL, "text-white/50 mb-2")}>Connect</p>
              <div className="flex gap-4">
                <a href="#" className="text-white/70 hover:text-white transition-colors">
                  Twitter
                </a>
                <a href="#" className="text-white/70 hover:text-white transition-colors">
                  LinkedIn
                </a>
                <a href="#" className="text-white/70 hover:text-white transition-colors">
                  GitHub
                </a>
              </div>
            </div>
            <div>
              <p className={cn(KPR_MONO, KPR_LABEL, "text-white/50 mb-2")}>Portfolio</p>
              <a href="/" className={cn(KPR_BODY, "text-white/70 hover:text-white transition-colors")}>
                Back to main site
              </a>
            </div>
          </motion.div>
          <motion.div
            className={cn(KPR_DISPLAY, "text-5xl sm:text-6xl lg:text-7xl font-bold pt-8 border-t border-white/10")}
            {...fadeInUp}
          >
            Creative Web Developer
          </motion.div>
        </div>
      </section>
    </footer>
  );
}

const SECTION_IDS = ["hero", "about", "works", "skills", "contact"];
const DARK_SECTIONS = new Set(["about", "works", "contact"]);

export default function KPRLanding() {
  const [menuButtonColor, setMenuButtonColor] = useState("#111");
  const [headerHidden, setHeaderHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y <= 0) {
        setHeaderHidden(false);
      } else if (y > lastScrollY.current) {
        setHeaderHidden(true);
      } else {
        setHeaderHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const byRatio = [...visible].sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));
        const topId = byRatio[0]?.target.id;
        if (topId) {
          setMenuButtonColor(DARK_SECTIONS.has(topId) ? "#eaeaea" : "#111");
        }
      },
      { threshold: [0.2, 0.5, 0.8], rootMargin: "-10% 0px -10% 0px" }
    );

    sections.forEach((el) => observer.observe(el));
    const hero = document.getElementById("hero");
    if (hero) setMenuButtonColor(DARK_SECTIONS.has("hero") ? "#eaeaea" : "#111");
    return () => sections.forEach((el) => observer.unobserve(el));
  }, []);

  return (
    <div className="bg-white min-h-screen scroll-smooth">
      <VolumeControl side="left" />
      <div className="fixed top-0 left-0 right-0 z-50">
        <StaggeredMenu
          position="right"
          items={STAGGERED_MENU_ITEMS}
          socialItems={STAGGERED_SOCIAL_ITEMS}
          displaySocials
          displayItemNumbering
          menuButtonColor={menuButtonColor}
          openMenuButtonColor="#eaeaea"
          changeMenuColorOnOpen
          isFixed={false}
          colors={["#000000", "#0a0a0a"]}
          accentColor={KPR_ACCENT.magenta}
          closeOnClickAway
          headerHidden={menuOpen ? false : headerHidden}
          onMenuOpen={() => setMenuOpen(true)}
          onMenuClose={() => setMenuOpen(false)}
        />
      </div>
      <main>
        <SectionOverview />
        <div className="h-[100vh] w-full bg-[#000] flex items-center justify-between test-font">
          <span className="text-white text-[40vh] ">About</span>
          <div className="flex items-center gap-2 flex-col text-[80vh]">
            <span className="text-white/20">01</span>
            <span className="text-white">01</span>
            <span className="text-white/20">01</span>

          </div>
        </div>
        <SectionAbout />
        <SectionTrainingRoom />
        <SectionSkills />
        <SectionContact />
      </main>
    </div>
  );
}
