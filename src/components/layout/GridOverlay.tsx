import { cn } from "@/lib/utils";
import { CONTAINER_MAX_CLASS } from "@/lib/design-tokens";

/**
 * Solo las líneas exteriores que delimitan el espacio del grid.
 * Sin líneas internas (cuadrícula). 1px, color texto suave.
 */
export function GridOverlay({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-0 pointer-events-none z-40 overflow-hidden flex justify-center",
        className
      )}
      aria-hidden
    >
      <div className={cn("relative w-full h-full", CONTAINER_MAX_CLASS)}>
        <div className="absolute top-0 left-0 right-0 h-px bg-[#EAEAEA]/25" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-[#EAEAEA]/25" />
        <div className="absolute top-0 bottom-0 left-0 w-px bg-[#EAEAEA]/25" />
        <div className="absolute top-0 bottom-0 right-0 w-px bg-[#EAEAEA]/25" />
      </div>
    </div>
  );
}
