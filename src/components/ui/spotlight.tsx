import { cn } from "@/lib/utils";

export function Spotlight({
  className,
  fill = "#EAEAEA",
  opacity = 0.07,
}: {
  className?: string;
  fill?: string;
  opacity?: number;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,var(--spotlight),transparent)]",
        className
      )}
      style={
        {
          "--spotlight": `${fill}${Math.round(opacity * 255)
            .toString(16)
            .padStart(2, "0")}`,
        } as React.CSSProperties
      }
      aria-hidden
    />
  );
}
