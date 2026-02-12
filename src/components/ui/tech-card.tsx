import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Corner plus decorator — design system. Use on sections and cards. */
export function CornerPlus({ className = "" }: { className?: string }) {
  return (
    <span className={cn("absolute w-3 h-3", className)} aria-hidden>
      <span className="absolute inset-y-1/2 left-0 right-0 h-px bg-[#EAEAEA]/60 -translate-y-1/2" />
      <span className="absolute inset-x-1/2 top-0 bottom-0 w-px bg-[#EAEAEA]/60 -translate-x-1/2" />
    </span>
  );
}

/** Tech card: dark bg, border, four corner pluses. Use for all cards/sections. */
export function TechCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative border border-[#EAEAEA]/20 bg-[#070707]",
        className
      )}
    >
      <CornerPlus className="z-10 -top-px -left-px -translate-x-1/2 -translate-y-1/2" />
      <CornerPlus className="z-10 -top-px -right-px translate-x-1/2 -translate-y-1/2" />
      <CornerPlus className="z-10 -bottom-px -left-px -translate-x-1/2 translate-y-1/2" />
      <CornerPlus className="z-10 -bottom-px -right-px translate-x-1/2 translate-y-1/2" />
      {children}
    </div>
  );
}
