import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CornerPlus } from "@/components/ui/tech-card";
import { BackgroundDots } from "@/components/ui/background-dots";
import { CONTAINER_MAX_CLASS, SECTION_PADDING_X } from "@/lib/design-tokens";

/** Altura fija de la fila del título para que la card visual quede siempre en la misma posición (About, Works, Contact). */
const TITLE_ROW_MIN_H = "min-h-[28vh]";
/** Padding por sección: mismo que Hero (bordes en divs, no en motion). */
const SECTION_BLOCK_PADDING = "py-20 px-10";

/**
 * Mismo patrón que Hero: bordes continuos (border-y en título, border-b/border-r en celdas),
 * padding por sección, dots con animación de entrada. Bordes en contenedores, no en motion.
 */
export function SectionLayout({
  label,
  title,
  children,
  visual,
  className = "",
}: {
  label: ReactNode;
  title: ReactNode;
  children: ReactNode;
  visual: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative w-full h-screen min-h-[100dvh] overflow-hidden bg-[#070707] flex items-center",
        className
      )}
    >
      <CornerPlus className="top-6 left-6 sm:top-8 sm:left-8 -translate-x-1/2 -translate-y-1/2" />
      <CornerPlus className="top-6 right-6 sm:top-8 sm:right-8 translate-x-1/2 -translate-y-1/2" />
      <CornerPlus className="bottom-6 left-6 sm:bottom-8 sm:left-8 -translate-x-1/2 translate-y-1/2" />
      <CornerPlus className="bottom-6 right-6 sm:bottom-8 sm:right-8 translate-x-1/2 translate-y-1/2" />

      <div className={cn("w-full mx-auto", CONTAINER_MAX_CLASS, SECTION_PADDING_X)}>
        <div className="grid grid-cols-12 items-start content-center min-h-[75vh]">
          {/* Row 1: Título — bordes en el div */}
          <div className={cn("col-span-12 border-y", SECTION_BLOCK_PADDING, TITLE_ROW_MIN_H)}>
            {label}
            {title}
          </div>

          {/* Row 2: Descripción — bordes en el div; dots con animación de entrada */}
          <div className={cn("col-span-12 lg:col-span-6 relative min-h-[280px] flex flex-col justify-center border-b border-r", SECTION_BLOCK_PADDING)}>
            <BackgroundDots dotColor="#EAEAEA" dotOpacity={0.2} className="rounded-none" animateIn />
            <div className="relative z-10">{children}</div>
          </div>
          {/* Card visual — bordes en el div contenedor */}
          <div className={cn("col-span-12 lg:col-span-6 border-b flex items-center justify-center min-h-[280px]", SECTION_BLOCK_PADDING)}>
            {visual}
          </div>
        </div>
      </div>
    </section>
  );
}
