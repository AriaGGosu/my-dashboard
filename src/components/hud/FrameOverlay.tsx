import { useState } from "react";
import { motion } from "framer-motion";
import Hero from "../hero/Hero";

type ScreenId = "home" | "about" | "works" | "contact";

const BAR_TOP = 64;
const BAR_BOTTOM = 52;
const BAR_SIDE = 64;
const CHIP_GAP = 8;

const SCREENS: { id: ScreenId; label: string; component: React.ReactNode }[] = [
  { id: "home", label: "HOME", component: <Hero /> },
  { id: "about", label: "ABOUT", component: <PlaceholderScreen title="About" /> },
  { id: "works", label: "WORKS", component: <PlaceholderScreen title="Works" /> },
  { id: "contact", label: "CONTACT", component: <PlaceholderScreen title="Contact" /> },
];

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-[#070707] min-h-0">
      <span className="test-font text-[#EAEAEA] text-4xl sm:text-6xl opacity-60 tracking-[0.3em]">
        {title}
      </span>
    </div>
  );
}

// Chip con esquina angular (estilo videojuego - Valorant/Apex)
const Chip = ({
  children,
  className = "",
  active,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <div
    role={onClick ? "button" : undefined}
    onClick={onClick}
    className={`
      relative flex items-center justify-center
      border
      shadow-[0_0_0_1px_rgba(234,234,234,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]
      before:absolute before:inset-0 before:pointer-events-none
      before:bg-gradient-to-b before:from-white/5 before:to-transparent
      transition-all duration-200
      ${active ? "ring-1 ring-[#EAEAEA] ring-offset-2 ring-offset-[#070707] shadow-[0_0_12px_rgba(234,234,234,0.25)]" : ""}
      ${onClick ? "cursor-pointer hover:shadow-[0_0_12px_rgba(234,234,234,0.15)]" : ""}
      ${className}
    `}
    style={{
      clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
    }}
  >
    {children}
  </div>
);

// Chip pequeño para status
const StatusChip = ({ label, value }: { label: string; value: string }) => (
  <div
    className="flex items-center gap-2 px-3 py-1.5 bg-[#070707]/80 border border-[#EAEAEA40] shrink-0"
    style={{
      clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
    }}
  >
    <span className="test-font text-[8px] text-[#EAEAEA60] tracking-widest">{label}</span>
    <span className="test-font text-[9px] text-[#EAEAEA] tracking-wider">{value}</span>
  </div>
);

// Barra de segmentos (estilo health/ammo bar)
const SegmentBar = ({
  segments,
  activeIndex,
  onSegmentClick,
}: {
  segments: number;
  activeIndex: number;
  onSegmentClick: (i: number) => void;
}) => (
  <div className="flex gap-0.5 shrink-0">
    {Array.from({ length: segments }).map((_, i) => (
      <button
        key={i}
        onClick={() => onSegmentClick(i)}
        className="w-2 h-3 transition-all duration-200 relative overflow-hidden
          border border-[#EAEAEA40]
          hover:border-[#EAEAEA60]"
        style={{
          clipPath: "polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))",
          backgroundColor: i === activeIndex ? "#EAEAEA" : "rgba(7,7,7,0.6)",
        }}
      />
    ))}
  </div>
);

// Panel lateral con forma angular
const SidePanel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`flex-shrink-0 flex items-center justify-center bg-[#070707]/90 backdrop-blur-sm border-y border-[#EAEAEA30] ${className}`}
    style={{
      width: BAR_SIDE,
      boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
    }}
  >
    {children}
  </div>
);

// Botón de navegación lateral (chip angular)
const NavButton = ({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-12 h-12 flex items-center justify-center
      border border-[#EAEAEA50] bg-[#070707]/70
      disabled:opacity-30 disabled:cursor-not-allowed
      hover:bg-[#EAEAEA15] hover:border-[#EAEAEA] hover:shadow-[0_0_12px_rgba(234,234,234,0.15)]
      transition-all duration-200 relative overflow-hidden"
    style={{
      clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
    }}
  >
    <svg
      width="14"
      height="20"
      viewBox="0 0 14 20"
      fill="none"
      className="text-[#EAEAEA] relative z-10"
    >
      {direction === "prev" ? (
        <path d="M10 2L3 10L10 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M4 2L11 10L4 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  </button>
);

// Esquina decorativa estilo HUD
const HudCorner = ({ position }: { position: "tl" | "tr" | "bl" | "br" }) => {
  const base = "absolute w-16 h-16 pointer-events-none";
  const pos =
    position === "tl"
      ? "top-0 left-0"
      : position === "tr"
        ? "top-0 right-0"
        : position === "bl"
          ? "bottom-0 left-0"
          : "bottom-0 right-0";
  const rot = position === "tl" ? "rotate-0" : position === "tr" ? "rotate-90" : position === "bl" ? "-rotate-90" : "rotate-180";

  return (
    <svg
      className={`${base} ${pos} ${rot} opacity-90`}
      viewBox="0 0 64 64"
      fill="none"
    >
      <path
        d="M0 0H56L64 8V64H8L0 56V0Z"
        fill="none"
        stroke="#EAEAEA"
        strokeWidth="2"
      />
      <path
        d="M0 0H48L56 8V56H8L0 48V0Z"
        fill="none"
        stroke="#EAEAEA"
        strokeWidth="1"
        opacity="0.4"
      />
    </svg>
  );
};

const NavHex = ({ className = "" }: { className?: string }) => (
  <svg width="16" height="18" viewBox="0 0 24 28" fill="none" className={className || "text-[#EAEAEA]"}>
    <path
      d="M12 0L24 7V21L12 28L0 21V7L12 0Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

export default function FrameOverlay() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentScreen = SCREENS[currentIndex];

  const goTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, SCREENS.length - 1)));
  };

  const goPrev = () => goTo(currentIndex - 1);
  const goNext = () => goTo(currentIndex + 1);

  return (
    <>
      <div className="fixed inset-0 z-0 flex flex-col">
        {/* Top bar - chips estilo videojuego */}
        <div
          className="flex-shrink-0 flex items-center justify-between gap-4"
          style={{
            height: BAR_TOP,
            paddingLeft: BAR_SIDE,
            paddingRight: BAR_SIDE,
            paddingTop: CHIP_GAP,
            paddingBottom: CHIP_GAP,
            background: "linear-gradient(180deg, rgba(7,7,7,0.95) 0%, rgba(7,7,7,0.8) 100%)",
            borderBottom: "1px solid rgba(234,234,234,0.2)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          {/* Logo chip */}
          <Chip className="h-full px-4 flex items-center gap-3 min-w-0 shrink-0 bg-[#070707]/80 border-[#EAEAEA50]">
            <div className="w-9 h-9 flex items-center justify-center border border-[#EAEAEA40] bg-[#070707]/40">
              <NavHex />
            </div>
            <div className="flex flex-col">
              <span className="test-font text-[10px] text-[#EAEAEA] tracking-[0.4em] leading-tight">
                PORTFOLIO
              </span>
              <span className="test-font text-[8px] text-[#EAEAEA50] tracking-[0.2em]">v1.0</span>
            </div>
          </Chip>

          {/* Nav chips */}
          <div className="flex items-center gap-1 shrink-0">
            {SCREENS.map((s, i) => (
              <Chip
                key={s.id}
                active={i === currentIndex}
                onClick={() => goTo(i)}
                className={`h-full px-4 border-[#EAEAEA40]
                  ${i === currentIndex
                    ? "bg-[#EAEAEA] text-[#070707]"
                    : "bg-[#070707]/70 text-[#EAEAEA] hover:bg-[#070707]/90 hover:border-[#EAEAEA60]"
                  }
                `}
              >
                <span className="test-font text-[9px] sm:text-[10px] tracking-[0.2em]">
                  {s.label}
                </span>
              </Chip>
            ))}
          </div>
        </div>

        {/* Middle */}
        <div className="flex-1 flex min-h-0">
          <SidePanel>
            <NavButton direction="prev" disabled={currentIndex === 0} onClick={goPrev} />
          </SidePanel>

          <div className="flex-1 min-w-0 overflow-hidden relative">
            {SCREENS.map((s, i) => (
              <motion.div
                key={s.id}
                className="absolute inset-0 h-full w-full overflow-hidden"
                initial={false}
                animate={{
                  opacity: i === currentIndex ? 1 : 0,
                  pointerEvents: i === currentIndex ? "auto" : "none",
                  zIndex: i === currentIndex ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="h-full w-full">{s.component}</div>
              </motion.div>
            ))}
          </div>

          <SidePanel>
            <NavButton direction="next" disabled={currentIndex === SCREENS.length - 1} onClick={goNext} />
          </SidePanel>
        </div>

        {/* Bottom bar - status chips */}
        <div
          className="flex-shrink-0 flex items-center justify-between gap-4"
          style={{
            height: BAR_BOTTOM,
            paddingLeft: BAR_SIDE,
            paddingRight: BAR_SIDE,
            paddingTop: CHIP_GAP,
            paddingBottom: CHIP_GAP,
            background: "linear-gradient(0deg, rgba(7,7,7,0.95) 0%, rgba(7,7,7,0.8) 100%)",
            borderTop: "1px solid rgba(234,234,234,0.2)",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0 overflow-x-auto">
            <StatusChip label="SECTION" value={currentScreen.label} />
            <StatusChip label="PAGE" value={`${currentIndex + 1}/${SCREENS.length}`} />
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 bg-[#070707]/80 border border-[#EAEAEA40] shrink-0"
              style={{
                clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
              }}
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <span className="test-font text-[8px] text-[#EAEAEA60] tracking-widest">ONLINE</span>
            </motion.div>
          </div>

          <SegmentBar segments={SCREENS.length} activeIndex={currentIndex} onSegmentClick={goTo} />
        </div>
      </div>

      {/* Esquinas HUD decorativas */}
      <div className="fixed inset-0 z-[40] pointer-events-none">
        <HudCorner position="tl" />
        <HudCorner position="tr" />
        <HudCorner position="bl" />
        <HudCorner position="br" />
      </div>
    </>
  );
}
