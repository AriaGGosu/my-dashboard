"use client";

import { cn } from "@/lib/utils";

/**
 * "The Computer Chip" pattern — Brand Book: structural element, texture, depth.
 * Abstract geometric outlined shapes, rounded corners, circuit-board feel.
 */
export function ComputerChipPattern({
  className = "",
  opacity = 0.15,
  color = "currentColor",
}: {
  className?: string;
  opacity?: number;
  color?: string;
}) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
      aria-hidden
    >
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity }}
      >
        <defs>
          <pattern
            id="computer-chip-pattern"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            {/* Rounded rects / L-shapes */}
            <rect
              x="10"
              y="10"
              width="24"
              height="12"
              rx="3"
              fill="none"
              stroke={color}
              strokeWidth="1"
            />
            <rect
              x="50"
              y="40"
              width="20"
              height="28"
              rx="3"
              fill="none"
              stroke={color}
              strokeWidth="1"
            />
            <rect
              x="80"
              y="70"
              width="30"
              height="10"
              rx="2"
              fill="none"
              stroke={color}
              strokeWidth="1"
            />
            <rect
              x="20"
              y="80"
              width="16"
              height="24"
              rx="2"
              fill="none"
              stroke={color}
              strokeWidth="1"
            />
            <rect
              x="70"
              y="15"
              width="22"
              height="18"
              rx="3"
              fill="none"
              stroke={color}
              strokeWidth="1"
            />
            <path
              d="M 95 55 L 95 75 L 115 75 L 115 65"
              fill="none"
              stroke={color}
              strokeWidth="1"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#computer-chip-pattern)" />
      </svg>
    </div>
  );
}
