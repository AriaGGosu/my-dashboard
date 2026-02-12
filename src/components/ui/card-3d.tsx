"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useRef, useState, useCallback } from "react";
import { CornerPlus } from "@/components/ui/tech-card";

export function CardContainer({
  children,
  className,
  containerClassName,
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMouse({ x, y });
  }, []);
  const handleMouseEnter = useCallback(() => setIsMouseEntered(true), []);
  const handleMouseLeave = useCallback(() => setIsMouseEntered(false), []);

  return (
    <div
      ref={containerRef}
      className={cn("relative size-full", containerClassName)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardBody className={className} isMouseEntered={isMouseEntered} mouse={mouse}>
        {children}
      </CardBody>
    </div>
  );
}

function CardBody({
  children,
  className,
  isMouseEntered,
  mouse,
}: {
  children: ReactNode;
  className?: string;
  isMouseEntered: boolean;
  mouse: { x: number; y: number };
}) {
  const rotateX = (mouse.y - 0.5) * 14;
  const rotateY = (mouse.x - 0.5) * -14;

  return (
    <div
      className={cn(
        "relative size-full rounded-xl border border-[#EAEAEA]/20 bg-[#070707] transition duration-150 ease-out",
        className
      )}
      style={{
        transform: isMouseEntered
          ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
        transformStyle: "preserve-3d",
      }}
    >
      <CornerPlus className="-top-px -left-px -translate-x-1/2 -translate-y-1/2" />
      <CornerPlus className="-top-px -right-px translate-x-1/2 -translate-y-1/2" />
      <CornerPlus className="-bottom-px -left-px -translate-x-1/2 translate-y-1/2" />
      <CornerPlus className="-bottom-px -right-px translate-x-1/2 translate-y-1/2" />
      {children}
    </div>
  );
}

export function CardItem({
  children,
  className,
  translateZ = 0,
}: {
  children: ReactNode;
  className?: string;
  translateZ?: number;
}) {
  return (
    <div
      className={cn("relative", className)}
      style={{
        transform: `translateZ(${translateZ}px)`,
      }}
    >
      {children}
    </div>
  );
}
