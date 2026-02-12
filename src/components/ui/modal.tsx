"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CornerPlus } from "@/components/ui/tech-card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-[#070707]/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-6"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "relative border border-[#EAEAEA]/20 bg-[#070707] p-6 sm:p-8 max-h-[85vh] overflow-y-auto",
                className
              )}
            >
              <CornerPlus className="-top-px -left-px -translate-x-1/2 -translate-y-1/2" />
              <CornerPlus className="-top-px -right-px translate-x-1/2 -translate-y-1/2" />
              <CornerPlus className="-bottom-px -left-px -translate-x-1/2 translate-y-1/2" />
              <CornerPlus className="-bottom-px -right-px translate-x-1/2 translate-y-1/2" />
              <div className="flex items-center justify-between gap-4 mb-5">
                {title ? <h2 className="body-font text-lg font-medium text-[#EAEAEA]">{title}</h2> : <span />}
                <Button
                  variant="ghost"
                  size="icon"
                  className="body-font shrink-0 rounded-md border border-[#EAEAEA]/20 text-[#EAEAEA]/70 hover:bg-[#EAEAEA]/10 hover:text-[#EAEAEA]"
                  onClick={onClose}
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </Button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
