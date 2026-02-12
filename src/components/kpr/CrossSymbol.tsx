"use client";

import { cn } from "@/lib/utils";

/**
 * KPR recurring brand symbol: vertical line with four short horizontal branches at mid-point.
 */
export function CrossSymbol({ className = "", size = 24 }: { className?: string; size?: number }) {
  const s = size;
  const stroke = Math.max(2, Math.floor(size / 12));
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
      aria-hidden
    >
      <path
        d="M12 2v20M8 12h8M12 8v8"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="square"
      />
      <path d="M10 12h4M12 10v4" stroke="currentColor" strokeWidth={stroke} strokeLinecap="square" />
    </svg>
  );
}

/** Full KPR cross: vertical + 4 horizontals (as in hero) */
export function CrossSymbolFull({ className = "" }: { className?: string }) {
  return (
    <svg
      width="24"
      height="48"
      viewBox="0 0 24 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
      aria-hidden
    >
      <line x1="12" y1="0" x2="12" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <line x1="4" y1="24" x2="20" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <line x1="8" y1="20" x2="8" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <line x1="16" y1="20" x2="16" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <line x1="12" y1="16" x2="12" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}
