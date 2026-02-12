import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function BentoGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoCard({
  children,
  className,
  colSpan = 1,
  rowSpan = 1,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-[#EAEAEA]/20 bg-[#0a0a0a] p-6 transition duration-200",
        "hover:border-[#EAEAEA]/40 hover:shadow-[0_0_40px_-12px_rgba(234,234,234,0.15)]",
        colSpan === 2 && "sm:col-span-2",
        colSpan === 3 && "sm:col-span-3",
        colSpan === 4 && "sm:col-span-4",
        rowSpan === 2 && "sm:row-span-2",
        rowSpan === 3 && "sm:row-span-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoCardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "test-font text-lg font-medium text-[#EAEAEA] tracking-tight sm:text-xl",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function BentoCardDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("test-font mt-2 text-sm text-[#EAEAEA]/70 leading-relaxed", className)}>
      {children}
    </p>
  );
}
