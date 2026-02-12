"use client";

import { cn } from "@/lib/utils";

/**
 * Keep Symbol — Brand Book: abstract mark for "The Keep", sign of power, portal.
 * Cyborg version: central plus with horizontal/vertical rounded bars, notched.
 */
export function KeepSymbol({ className = "", size = 32 }: { className?: string; size?: number }) {
  const s = size;
  const stroke = Math.max(2, Math.floor(size / 8));
  const r = stroke * 1.5;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
      aria-hidden
    >
      {/* Central vertical bar (rounded rect) */}
      <rect
        x={16 - stroke / 2}
        y={4}
        width={stroke}
        height={24}
        rx={r}
        fill="currentColor"
      />
      {/* Central horizontal bar */}
      <rect
        x={4}
        y={16 - stroke / 2}
        width={24}
        height={stroke}
        rx={r}
        fill="currentColor"
      />
      {/* Top notch / short vertical */}
      <rect
        x={16 - stroke / 2}
        y={2}
        width={stroke}
        height={6}
        rx={r}
        fill="currentColor"
      />
      {/* Bottom notch */}
      <rect
        x={16 - stroke / 2}
        y={24}
        width={stroke}
        height={6}
        rx={r}
        fill="currentColor"
      />
      {/* Left horizontal notch */}
      <rect x={2} y={16 - stroke / 2} width={6} height={stroke} rx={r} fill="currentColor" />
      {/* Right horizontal notch */}
      <rect x={24} y={16 - stroke / 2} width={6} height={stroke} rx={r} fill="currentColor" />
    </svg>
  );
}

/** Tall version for hero */
export function KeepSymbolFull({ className = "" }: { className?: string }) {
  return (
    <svg
      width="28"
      height="56"
      viewBox="0 0 28 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
      aria-hidden
    >
      <rect x="11" y="0" width="6" height="56" rx="3" fill="currentColor" />
      <rect x="0" y="23" width="28" height="10" rx="3" fill="currentColor" />
      <rect x="11" y="4" width="6" height="12" rx="3" fill="currentColor" />
      <rect x="11" y="40" width="6" height="12" rx="3" fill="currentColor" />
      <rect x="2" y="23" width="10" height="10" rx="3" fill="currentColor" />
      <rect x="16" y="23" width="10" height="10" rx="3" fill="currentColor" />
    </svg>
  );
}
